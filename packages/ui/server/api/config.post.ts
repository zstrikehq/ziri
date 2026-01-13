import { readConfig, writeConfig } from '@zs-ai/config'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Read existing config
    const existing = readConfig() || {}
    
    // Merge with new config, always include backendUrl
    const merged = {
      ...existing,
      ...body,
      backendUrl: 'https://api-dev.authzebra.com' // Always include fixed backend URL
    }
    
    // Write config
    writeConfig(merged)
    
    console.log('[API] Config saved:', {
      hasOrgId: !!merged.orgId,
      hasProjectId: !!merged.projectId,
      hasClientId: !!merged.clientId,
      hasClientSecret: !!merged.clientSecret,
      hasBackendUrl: !!merged.backendUrl
    })
    
    return { success: true, config: merged }
  } catch (error: any) {
    console.error('[API] Error writing config:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to write config: ${error.message}`
    })
  }
})
