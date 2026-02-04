import type { Request, Response, NextFunction } from 'express'
import { type AdminRequest } from './auth.js'
import { internalAuthorizationService } from '../services/internal/internal-authorization-service.js'
import { internalEntityStore } from '../services/internal/internal-entity-store.js'
import { internalAuditLogService } from '../services/internal-audit-log-service.js'




const routeActionMap: Record<string, { action: string; resourceType: string }> = {

  'GET:/api/users': { action: 'list_users', resourceType: 'users' },
  'GET:/api/users/:userId': { action: 'get_user', resourceType: 'users' },
  'POST:/api/users': { action: 'create_user', resourceType: 'users' },
  'PUT:/api/users/:userId': { action: 'update_user', resourceType: 'users' },
  'DELETE:/api/users/:userId': { action: 'delete_user', resourceType: 'users' },
  'POST:/api/users/:userId/reset-password': { action: 'reset_user_password', resourceType: 'users' },
  

  'GET:/api/keys': { action: 'list_keys', resourceType: 'keys' },
  'GET:/api/keys/user/:userId': { action: 'get_keys_by_user', resourceType: 'keys' },
  'POST:/api/keys': { action: 'create_key', resourceType: 'keys' },
  'POST:/api/keys/:userId/rotate': { action: 'rotate_key', resourceType: 'keys' },
  'DELETE:/api/keys/:userId': { action: 'delete_keys_by_user', resourceType: 'keys' },
  'DELETE:/api/keys/id/:keyId': { action: 'delete_key_by_id', resourceType: 'keys' },
  

  'GET:/api/config': { action: 'get_config', resourceType: 'config' },
  'POST:/api/config': { action: 'update_config', resourceType: 'config' },
  

  'GET:/api/schema': { action: 'view_schema', resourceType: 'schema' },
  'POST:/api/schema': { action: 'update_schema', resourceType: 'schema' },
  

  'GET:/api/policies': { action: 'list_policies', resourceType: 'policies' },
  'GET:/api/policies/templates': { action: 'get_policy_templates', resourceType: 'policies' },
  'POST:/api/policies': { action: 'create_policy', resourceType: 'policies' },
  'PUT:/api/policies': { action: 'update_policy', resourceType: 'policies' },
  'PATCH:/api/policies/status': { action: 'patch_policy_status', resourceType: 'policies' },
  'DELETE:/api/policies': { action: 'delete_policy', resourceType: 'policies' },
  

  'GET:/api/entities': { action: 'list_entities', resourceType: 'entities' },
  'PUT:/api/entities': { action: 'update_entities', resourceType: 'entities' },
  

  'POST:/api/ai-policy/generate': { action: 'generate_policy_with_ai', resourceType: 'policies' },
  

  'GET:/api/providers': { action: 'list_providers', resourceType: 'providers' },
  'GET:/api/providers/:name': { action: 'get_provider', resourceType: 'providers' },
  'POST:/api/providers': { action: 'create_provider', resourceType: 'providers' },
  'DELETE:/api/providers/:name': { action: 'delete_provider', resourceType: 'providers' },
  'POST:/api/providers/:name/test': { action: 'test_provider', resourceType: 'providers' },
  

  'GET:/api/audit': { action: 'view_audit', resourceType: 'audit' },
  'GET:/api/audit/statistics': { action: 'view_audit', resourceType: 'audit' },
  

  'GET:/api/stats/overview': { action: 'view_stats', resourceType: 'dashboard' },
  

  'GET:/api/costs/summary': { action: 'view_costs', resourceType: 'analytics' },
  

  'GET:/api/events': { action: 'view_events', resourceType: 'dashboard' },
  

  'GET:/api/dashboard-users': { action: 'list_dashboard_users', resourceType: 'dashboard_users' },
  'GET:/api/dashboard-users/:userId': { action: 'get_dashboard_user', resourceType: 'dashboard_users' },
  'POST:/api/dashboard-users': { action: 'create_dashboard_user', resourceType: 'dashboard_users' },
  'PUT:/api/dashboard-users/:userId': { action: 'update_dashboard_user', resourceType: 'dashboard_users' },
  'DELETE:/api/dashboard-users/:userId': { action: 'delete_dashboard_user', resourceType: 'dashboard_users' },
  'POST:/api/dashboard-users/:userId/disable': { action: 'update_dashboard_user', resourceType: 'dashboard_users' },
  'POST:/api/dashboard-users/:userId/enable': { action: 'update_dashboard_user', resourceType: 'dashboard_users' },


  'GET:/api/internal-audit-logs': { action: 'view_internal_audit', resourceType: 'audit' }
}

function getActionForRoute(method: string, path: string): { action: string; resourceType: string } | null {

  const normalizedPath = path.replace(/\/$/, '')
  

  const exactKey = `${method}:${normalizedPath}`
  if (routeActionMap[exactKey]) {
    return routeActionMap[exactKey]
  }
  


  for (const [key, value] of Object.entries(routeActionMap)) {
    const [keyMethod, keyPath] = key.split(':', 2)
    if (keyMethod === method) {

      const keyPattern = keyPath.replace(/\/:[^/]+/g, '/[^/]+')
      const regex = new RegExp(`^${keyPattern}$`)
      if (regex.test(normalizedPath)) {
        return value
      }
    }
  }
  
  return null
}

export function requireInternalAuthz(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void {

  if (!req.admin) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    })
    return
  }
  
  const method = req.method


  const fullPath = req.originalUrl?.split('?')[0] || req.baseUrl + req.path
  

  const routeMapping = getActionForRoute(method, fullPath)
  
  if (!routeMapping) {



    if (fullPath.startsWith('/api/authz/')) {
      next()
      return
    }
    console.log(`[INTERNAL AUTHZ] Route not in mapping (allowing): ${method} ${fullPath}`)
    next()
    return
  }
  
  const { action, resourceType } = routeMapping
  

  const userId = req.admin.userId
  

  const principalUserId = userId === 'ziri' ? 'ziri' : userId

  const authStartTime = Date.now()
  

  internalEntityStore.getEntity(principalUserId)
    .then(async (entity) => {
      if (!entity) {
        console.warn(`[INTERNAL AUTHZ] Entity not found for user: ${principalUserId}`)

        const authDurationMs = Date.now() - authStartTime
        const requestId = internalAuditLogService.generateRequestId()

        await internalAuditLogService.logAuthDecision({
          requestId,
          dashboardUserId: principalUserId,
          dashboardUserRole: undefined,
          action,
          resourceType,
          resourceId: extractResourceId(fullPath, req),
          decision: 'forbid',
          decisionReason: 'User entity not found',
          requestMethod: method,
          requestPath: fullPath,
          requestIp: req.ip,
          userAgent: req.headers['user-agent'],
          requestBodyHash: internalAuditLogService.hashRequestBody(req.body),
          authDurationMs,
          requestTimestamp: new Date().toISOString(),
          outcomeStatus: 'denied_before_action'
        })

        res.status(403).json({
          error: 'User entity not found',
          code: 'ENTITY_NOT_FOUND'
        })
        return
      }
      
      const dashboardUserRole = (entity.attrs as any)?.role
      


      const principal = `DashboardUser::"${principalUserId}"`
      const actionUid = `Action::"${action}"`
      

      const result = await internalAuthorizationService.authorize({
        principal,
        action: actionUid,
        resourceType,
        context: {}
      })

      const authDurationMs = Date.now() - authStartTime
      const requestId = internalAuditLogService.generateRequestId()

      const decision: 'permit' | 'forbid' = result.allowed ? 'permit' : 'forbid'

      // Skip logging for view_internal_audit action to prevent infinite loop
      // TODO: Re-enable when loop prevention is properly implemented
      if (action !== 'view_internal_audit') {
        await internalAuditLogService.logAuthDecision({
          requestId,
          dashboardUserId: principalUserId,
          dashboardUserRole: dashboardUserRole,
          action,
          resourceType,
          resourceId: extractResourceId(fullPath, req),
          decision,
          decisionReason: result.reason,
          requestMethod: method,
          requestPath: fullPath,
          requestIp: req.ip,
          userAgent: req.headers['user-agent'],
          requestBodyHash: internalAuditLogService.hashRequestBody(req.body),
          authDurationMs,
          requestTimestamp: new Date().toISOString(),
          outcomeStatus: result.allowed ? undefined : 'denied_before_action'
        })
      }
      // COMMENTED OUT - Skip logging for view_internal_audit to prevent infinite loop
      // if (action === 'view_internal_audit') {
      //   // Skip logging to prevent infinite loop
      // } else {
      //   await internalAuditLogService.logAuthDecision({
      //     requestId,
      //     dashboardUserId: principalUserId,
      //     dashboardUserRole: dashboardUserRole,
      //     action,
      //     resourceType,
      //     resourceId: extractResourceId(fullPath, req),
      //     decision,
      //     decisionReason: result.reason,
      //     requestMethod: method,
      //     requestPath: fullPath,
      //     requestIp: req.ip,
      //     userAgent: req.headers['user-agent'],
      //     requestBodyHash: internalAuditLogService.hashRequestBody(req.body),
      //     authDurationMs,
      //     requestTimestamp: new Date().toISOString(),
      //     outcomeStatus: result.allowed ? undefined : 'denied_before_action'
      //   })
      // }

      if (result.allowed) {
        ;(req as any).internalAudit = {
          requestId,
          action,
          resourceType,
          resourceId: extractResourceId(fullPath, req)
        }
      }
      
      if (!result.allowed) {
        console.log(`[INTERNAL AUTHZ] Denied: ${principalUserId} -> ${action} on ${resourceType}`)
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
          reason: result.reason
        })
        return
      }
      

      next()
    })
    .catch((error: any) => {
      console.error('[INTERNAL AUTHZ] Authorization check error:', error)
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    })
}

function extractResourceId(path: string, req: Request): string | null {

  const params: any = (req as any).params || {}
  if (params.userId) return params.userId
  if (params.keyId) return params.keyId
  if (params.name) return params.name
  if (params.id) return params.id
  return null
}
