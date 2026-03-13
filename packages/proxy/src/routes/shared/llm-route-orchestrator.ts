import type { Request, Response } from 'express'
import { serviceFactory } from '../../services/service-factory.js'
import { auditLogService } from '../../services/audit-log-service.js'
import { costTrackingService } from '../../services/cost-tracking-service.js'
import { spendResetService } from '../../services/spend-reset-service.js'
import { spendReservationService } from '../../services/spend-reservation-service.js'
import { queueManagerService } from '../../services/queue-manager-service.js'
import { eventEmitterService } from '../../services/event-emitter-service.js'
import { enforceUserRateLimit, runLlmPreflight } from './llm-preflight.js'
import {
  buildAuthorizationContext,
  releaseQueueSlotOrLog,
  releaseReservedSpendOrLog
} from './llm-route-helpers.js'

export interface LlmUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedTokens: number
}

export interface LlmCostEstimation {
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCost: number
  confidence: 'high' | 'medium' | 'low'
}

export interface LlmPreparedRequest {
  provider: string
  model: string
  estimatedCost: number
  isEmergency?: boolean
  estimation?: LlmCostEstimation
}

interface LlmValidationFailure {
  status: number
  body: Record<string, any>
}

interface LlmValidationSuccess<TPrepared extends LlmPreparedRequest> {
  prepared: TPrepared
}

type LlmValidationResult<TPrepared extends LlmPreparedRequest> =
  | LlmValidationFailure
  | LlmValidationSuccess<TPrepared>

interface LlmRouteErrorMap {
  status: number
  code: string
}

export interface LlmRouteSpec<TPrepared extends LlmPreparedRequest, TResponse = any> {
  action: 'completion' | 'embedding' | 'image_generation'
  validate: (req: Request, requestId: string) => Promise<LlmValidationResult<TPrepared>> | LlmValidationResult<TPrepared>
  invokeProvider: (prepared: TPrepared) => Promise<TResponse>
  getUsage: (response: TResponse, prepared: TPrepared) => LlmUsage
  getProviderRequestId?: (response: TResponse, prepared: TPrepared) => string
  getModelUsed?: (response: TResponse, prepared: TPrepared) => string
  computeActualCost: (args: {
    prepared: TPrepared
    response: TResponse
    usage: LlmUsage
    modelUsed: string
  }) => Promise<number>
  mapError: (message: string | undefined) => LlmRouteErrorMap | null
}

export async function handleLlmRequest<TPrepared extends LlmPreparedRequest, TResponse = any>(
  req: Request,
  res: Response,
  spec: LlmRouteSpec<TPrepared, TResponse>
): Promise<void> {
  const requestStartTime = Date.now()
  let requestId: string | null = null
  let auditLogId: number | null = null
  const resources = new RequestResourceTracker()

  try {
    const preflight = await runLlmPreflight(req, res)
    if (!preflight) return
    requestId = preflight.requestId

    const validation = await spec.validate(req, requestId)
    if ('status' in validation) {
      const body = { ...validation.body, requestId }
      res.status(validation.status).json(body)
      return
    }

    const prepared = validation.prepared
    const { provider, model } = prepared
    const { userId, apiKeyId, allEntities, userKeyEntity, userKeyId } = preflight

    const userEntity = await enforceUserRateLimit(res, { userId, apiKeyId, allEntities, requestId })
    if (!userEntity) return

    await acquireQueueSlot({
      requestId,
      userKeyId,
      userId,
      apiKeyId,
      provider,
      model,
      requestBody: req.body,
      estimatedCost: prepared.estimatedCost
    })
    resources.holdQueue(userKeyId, requestId)

    const activeEntity = await refreshUserKeyEntity(userKeyEntity)
    await spendReservationService.reserveEstimatedSpend(
      activeEntity as any,
      userKeyId,
      prepared.estimatedCost
    )
    resources.holdSpend(userKeyId, requestId, prepared.estimatedCost)

    const principal = `UserKey::"${userKeyId}"`
    const action = `Action::"${spec.action}"`
    const resource = `Resource::"${model}"`

    const { now, ipAddress, context } = buildAuthorizationContext(req, {
      model,
      provider,
      isEmergency: prepared.isEmergency || false
    })

    const authStartTime = Date.now()
    const authService = serviceFactory.getAuthorizationService()
    const authResult = await authService.authorize({
      principal,
      action,
      resource,
      context
    })
    const authEndTime = Date.now()
    const authDurationMs = authEndTime - authStartTime

    const decisionReason = authResult.diagnostics?.reason?.[0] || authResult.diagnostics?.errors?.[0] || undefined
    const policiesEvaluated = authResult.diagnostics?.reason || []
    const determiningPolicies = authResult.decision === 'Allow' ? policiesEvaluated : []

    auditLogId = await auditLogService.log({
      requestId,
      principal,
      principalType: 'UserKey',
      authId: userId,
      apiKeyId,
      action: spec.action,
      resource,
      provider,
      model,
      decision: authResult.decision === 'Allow' ? 'permit' : 'forbid',
      decisionReason,
      policiesEvaluated: policiesEvaluated as string[],
      determiningPolicies: determiningPolicies as string[],
      requestIp: ipAddress,
      userAgent: req.headers['user-agent'],
      requestMethod: req.method,
      requestPath: req.path,
      requestBodyHash: auditLogService.hashRequestBody(req.body),
      cedarContext: context,
      entitySnapshot: activeEntity.attrs,
      requestTimestamp: now.toISOString(),
      authStartTime: new Date(authStartTime).toISOString(),
      authEndTime: new Date(authEndTime).toISOString(),
      authDurationMs,
    })

    eventEmitterService.emitEvent('audit_log_created', {
      auditLogId,
      requestId,
      timestamp: new Date().toISOString(),
      decision: authResult.decision === 'Allow' ? 'permit' : 'forbid',
      provider,
      model
    })

    if (authResult.decision !== 'Allow') {
      await resources.releaseAll('authorization denied')
      res.status(403).json({
        error: `Authorization denied: ${decisionReason || 'Authorization denied'}`,
        code: 'AUTHORIZATION_DENIED',
        reason: decisionReason,
        requestId
      })
      return
    }

    const llmRequestStartTime = Date.now()
    let llmResponse: TResponse
    try {
      llmResponse = await spec.invokeProvider(prepared)
    } catch (error) {
      await resources.releaseAll('provider failure')
      throw error
    }
    const llmResponseTime = Date.now()

    const usage = spec.getUsage(llmResponse, prepared)
    const modelUsed = spec.getModelUsed?.(llmResponse, prepared) || (llmResponse as any).model || model
    const providerRequestId = spec.getProviderRequestId?.(llmResponse, prepared) || (llmResponse as any).id || ''

    let costTrackingId: number

    if (spec.action === 'image_generation') {
      const imgPrepared = prepared as any
      costTrackingId = await costTrackingService.trackImageCost({
        requestId,
        executionKey: apiKeyId,
        auditLogId,
        provider,
        providerRequestId,
        modelRequested: model,
        modelUsed,
        totalCost: imgPrepared.estimatedCost || 0,
        numImages: imgPrepared.n || 1,
        imageQuality: imgPrepared.imageQuality || 'standard',
        imageSize: imgPrepared.imageSize || '1024x1024',
        requestTimestamp: new Date(llmRequestStartTime).toISOString(),
        responseTimestamp: new Date(llmResponseTime).toISOString(),
        latencyMs: llmResponseTime - llmRequestStartTime,
        status: 'completed'
      })
    } else {
      costTrackingId = await costTrackingService.trackCost({
        requestId,
        executionKey: apiKeyId,
        auditLogId,
        provider,
        providerRequestId,
        modelRequested: model,
        modelUsed,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        cachedTokens: usage.cachedTokens,
        requestTimestamp: new Date(llmRequestStartTime).toISOString(),
        responseTimestamp: new Date(llmResponseTime).toISOString(),
        latencyMs: llmResponseTime - llmRequestStartTime,
        status: 'completed',
        action: spec.action
      })
    }

    eventEmitterService.emitEvent('cost_tracked', {
      costTrackingId,
      requestId,
      timestamp: new Date().toISOString(),
      provider,
      model: modelUsed
    })

    await auditLogService.updateWithProviderResponse(requestId, providerRequestId, costTrackingId)

    const actualCost = await spec.computeActualCost({
      prepared,
      response: llmResponse,
      usage,
      modelUsed
    })

    await resources.releaseQueue('response sent')

    const costMeta: Record<string, any> = {
      estimated: prepared.estimatedCost || 0,
      actual: actualCost,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedTokens,
      totalCost: actualCost
    }
    if (prepared.estimation) {
      costMeta.estimation = {
        estimatedInputTokens: prepared.estimation.estimatedInputTokens,
        estimatedOutputTokens: prepared.estimation.estimatedOutputTokens,
        confidence: prepared.estimation.confidence
      }
    }

    res.json({
      ...(llmResponse as any),
      _meta: {
        requestId,
        cost: costMeta,
        timing: {
          totalMs: Date.now() - requestStartTime,
          authMs: authDurationMs,
          llmMs: llmResponseTime - llmRequestStartTime,
        },
      },
    })
  } catch (error: any) {
    await resources.releaseAll('route error')

    if ((error as any)?.status) {
      res.status(error.status).json({
        error: error.message,
        code: error.code || 'REQUEST_FAILED',
        requestId: requestId || undefined
      })
      return
    }

    console.error(`${spec.action} error:`, error)

    if (requestId && auditLogId) {
      try {
        await auditLogService.updateWithProviderResponse(requestId, '', 0)
      } catch (updateError) {
        console.warn('failed to update audit log:', (updateError as Error).message)
      }
    }

    const mappedError = spec.mapError(error.message)
    if (mappedError) {
      res.status(mappedError.status).json({
        error: error.message,
        code: mappedError.code,
        requestId: requestId || undefined
      })
      return
    }

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: requestId || undefined
    })
  }
}

async function acquireQueueSlot(params: {
  requestId: string
  userKeyId: string
  userId: string
  apiKeyId: string
  provider: string
  model: string
  requestBody: Request['body']
  estimatedCost: number
}): Promise<void> {
  try {
    await queueManagerService.acquireSlot(
      params.userKeyId,
      params.requestId,
      {
        requestId: params.requestId,
        userKeyId: params.userKeyId,
        authId: params.userId,
        apiKeyId: params.apiKeyId,
        provider: params.provider,
        model: params.model,
        requestBody: params.requestBody,
        estimatedCost: params.estimatedCost,
      }
    )
  } catch (error: any) {
    if (error.message.includes('Queue full')) {
      throw Object.assign(new Error('Server busy - queue full'), {
        status: 503,
        code: 'QUEUE_FULL'
      })
    }
    throw error
  }
}

async function refreshUserKeyEntity(userKeyEntity: any) {
  const spendResetResult = await spendResetService.checkAndResetSpend(userKeyEntity as any)
  return spendResetResult.updatedEntity || userKeyEntity
}

class RequestResourceTracker {
  private queueHold: { userKeyId: string; requestId: string } | null = null
  private spendHold: { userKeyId: string; requestId: string; amount: number } | null = null

  holdQueue(userKeyId: string, requestId: string): void {
    if (!userKeyId || !requestId) return
    this.queueHold = { userKeyId, requestId }
  }

  holdSpend(userKeyId: string, requestId: string, amount: number): void {
    if (!userKeyId || !requestId || amount <= 0) return
    this.spendHold = { userKeyId, requestId, amount }
  }

  async releaseQueue(reason: string): Promise<void> {
    if (!this.queueHold) return
    releaseQueueSlotOrLog({
      requestId: this.queueHold.requestId,
      userKeyId: this.queueHold.userKeyId,
      queueManagerService,
      reason
    })
    this.queueHold = null
  }

  async releaseSpend(reason: string): Promise<void> {
    if (!this.spendHold) return
    await releaseReservedSpendOrLog({
      requestId: this.spendHold.requestId,
      userKeyId: this.spendHold.userKeyId,
      amount: this.spendHold.amount,
      spendReservationService,
      reason
    })
    this.spendHold = null
  }

  async releaseAll(reason: string): Promise<void> {
    await this.releaseSpend(reason)
    await this.releaseQueue(reason)
  }
}
