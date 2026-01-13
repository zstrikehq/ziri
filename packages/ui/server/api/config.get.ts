import { readConfig } from '@zs-ai/config'

import { readConfig, getConfigPath } from '@zs-ai/config'
import { readFileSync, existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  try {
    const config = readConfig()
    
    // If readConfig returns null (validation failed), try to read raw file
    if (!config) {
      const configPath = getConfigPath()
      if (existsSync(configPath)) {
        try {
          const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
          // Return raw config even if validation failed (might be missing backendUrl)
          return {
            backendUrl: rawConfig.backendUrl || 'https://api-dev.authzebra.com',
            orgId: rawConfig.orgId || '',
            projectId: rawConfig.projectId || '',
            clientId: rawConfig.clientId || '',
            clientSecret: rawConfig.clientSecret || '',
            pdpUrl: rawConfig.pdpUrl || '',
            refreshInterval: rawConfig.refreshInterval || 300000,
            refreshFailRetry: rawConfig.refreshFailRetry || 3,
            refreshFailRetryDelay: rawConfig.refreshFailRetryDelay || 5000,
            maxStaleTime: rawConfig.maxStaleTime || 3600000,
            providers: rawConfig.providers || {}
          }
        } catch (e) {
          // File exists but can't parse, return empty config
        }
      }
      
      // Return empty config object if file doesn't exist
      return {
        backendUrl: 'https://api-dev.authzebra.com',
        orgId: '',
        projectId: '',
        clientId: '',
        clientSecret: '',
        pdpUrl: '',
        refreshInterval: 300000,
        refreshFailRetry: 3,
        refreshFailRetryDelay: 5000,
        maxStaleTime: 3600000,
        providers: {}
      }
    }
    
    return config
  } catch (error: any) {
    console.error('[API] Error reading config:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to read config: ${error.message}`
    })
  }
})
