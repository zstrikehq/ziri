 

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { serviceFactory } from '../services/service-factory.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

 
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const schemaStore = serviceFactory.getSchemaStore()
    const format = req.query.format as string | undefined
    
    if (format === 'cedar') {
 
      if (!schemaStore.getSchemaAsCedarText) {
        await logInternalOutcome(req, {
          status: 'failed',
          code: '500',
          message: 'Cedar text format not supported',
          actionDurationMs: Date.now() - actionStart
        })
        
        res.status(500).json({
          error: 'Cedar text format not supported by this schema store'
        })
        return
      }
      
 
      const cedarText = await schemaStore.getSchemaAsCedarText()
      
 
      const schema = await schemaStore.getSchema()
      
      await logInternalOutcome(req, {
        status: 'success',
        code: '200',
        message: 'Retrieved schema (cedar format)',
        actionDurationMs: Date.now() - actionStart
      })
      
      res.json({
        data: {
          schema: cedarText,
          schemaJson: schema.schema,
          version: schema.version,
          format: 'cedar'
        }
      })
    } else {
 
      const schema = await schemaStore.getSchema()
      
      await logInternalOutcome(req, {
        status: 'success',
        code: '200',
        message: 'Retrieved schema (json format)',
        actionDurationMs: Date.now() - actionStart
      })
      
      res.json({
        data: {
          schema: schema.schema,
          version: schema.version,
          format: 'json'
        }
      })
    }
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to get schema',
      actionDurationMs: Date.now() - actionStart
    })
    
    res.status(500).json({
      error: 'Failed to get schema',
      message: error.message
    })
  }
})

 
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { schema } = req.body
    const format = req.query.format as string | undefined
    
    if (!schema) {
      res.status(400).json({
        error: 'Schema is required'
      })
      return
    }
    
    const schemaStore = serviceFactory.getSchemaStore()
    
 
 
    const schemaInput = format === 'cedar' || typeof schema === 'string' 
      ? schema 
      : schema
    
    const updated = await schemaStore.updateSchema(schemaInput)
    
 
 
 
    let cedarText: string | undefined
    if (typeof schemaInput === 'string') {
 
      cedarText = schemaInput
    } else {
 
 
 
      if (schemaStore.getSchemaAsCedarText) {
        try {
          cedarText = await schemaStore.getSchemaAsCedarText()
        } catch (e) {
          console.warn('[SCHEMA ROUTE] Failed to get Cedar text, will use JSON:', e)
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        schema: cedarText || updated.schema,
        schemaJson: updated.schema,
        version: updated.version,
        format: cedarText ? 'cedar' : 'json'
      }
    })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'SCHEMA_UPDATED',
      resourceId: 'schema',
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update schema',
      message: error.message
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'SCHEMA_UPDATE_ERROR',
      message: error.message,
      resourceId: 'schema',
      actionDurationMs: Date.now() - actionStart
    })
  }
})

export default router
