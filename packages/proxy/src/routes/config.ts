import { Router, type Request, type Response } from 'express'
import { loadConfig } from '../config.js'
import { getRootKey } from '../utils/root-key.js'
import { requireAdmin } from '../middleware/auth.js'
import { writeConfig } from '../config/index.js'
import { logInternalAction } from '../utils/internal-audit-helpers.js'
import { listEmailProviders } from '../email-providers/index.js'

const router: Router = Router()

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const config = loadConfig()

    res.json({
      server: {
        host: config.host,
        port: config.port
      },
      publicUrl: config.publicUrl,
      email: config.email,
      logLevel: config.logLevel
    })
  } catch (err: any) {
    console.error('config load failed:', err)
    res.status(500).json({ error: 'Failed to load config' })
  }
})

router.get('/email-providers', requireAdmin, async (_req: Request, res: Response) => {
  const providers = listEmailProviders().map(p => ({
    id: p.id,
    label: p.label,
    fields: p.fields,
    fromRequired: p.fromRequired ?? false
  }))
  res.json({ providers })
})

router.post('/', requireAdmin, (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { server, publicUrl, email, logLevel } = req.body

    const existing = loadConfig()

    let cleanedEmail = email
    if (email && typeof email === 'object' && email.provider) {
      const currentProvider = email.provider
      cleanedEmail = {
        enabled: email.enabled ?? false,
        provider: currentProvider,
        options: (email.options && email.options[currentProvider])
          ? { [currentProvider]: email.options[currentProvider] }
          : {},
        fromByProvider: (email.fromByProvider && email.fromByProvider[currentProvider])
          ? { [currentProvider]: email.fromByProvider[currentProvider] }
          : {}
      }
    }

    const updatedConfig: any = {
      server: server || {
        host: existing.host || '127.0.0.1',
        port: existing.port || 3100
      },
      publicUrl: publicUrl !== undefined ? publicUrl : existing.publicUrl,
      email: cleanedEmail !== undefined ? cleanedEmail : existing.email,
      logLevel: logLevel || existing.logLevel || 'info'
    }

    writeConfig(updatedConfig)

    res.json({
      success: true,
      message: 'Config saved. Restart the server for changes to take effect.',
      config: {
        server: updatedConfig.server,
        publicUrl: updatedConfig.publicUrl,
        email: updatedConfig.email,
        logLevel: updatedConfig.logLevel
      }
    })

    logInternalAction(req, {
      action: 'update_config',
      resourceType: 'config',
      resourceId: 'global',
      decisionReason: res.locals.decisionReason ?? null,
      actionDurationMs: Date.now() - actionStart
    })
  } catch (err: any) {
    console.error('config save failed:', err)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

export default router
