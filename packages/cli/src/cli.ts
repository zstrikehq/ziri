#!/usr/bin/env node

import { Command } from 'commander'
import * as readline from 'readline'
import { startProxyServer } from './proxy-server.js'
import {
  readConfig,
  writeConfig,
  setConfigValue,
  getConfigValue,
  validateConfig,
  setProviderMetadata,
  getProviderMetadata,
  removeProviderMetadata,
  listProviderMetadata,
  setProviderCredentials,
  getProviderCredentials,
  removeProviderCredentials,
  listProvidersWithCredentials,
  validateProviderApiKey,
  readCredentials,
  writeCredentials,
  type ProviderMetadata
} from '@zs-ai/config'

const program = new Command()

program
  .name('zs-ai')
  .description('ZS AI Gateway - Management and SDK')
  .version('1.0.0')

program
  .command('start')
  .description('Start proxy server with UI and API')
  .option('-p, --port <port>', 'Port to run on (auto-finds free port if in use)', '3100')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action((options) => {
    const port = parseInt(options.port, 10)
    startProxyServer(port, options.host)
  })

// Alias for backward compatibility
program
  .command('ui')
  .description('Start proxy server (alias for "start")')
  .option('-p, --port <port>', 'Port to run on (auto-finds free port if in use)', '3100')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action((options) => {
    const port = parseInt(options.port, 10)
    startProxyServer(port, options.host)
  })

program
  .command('config')
  .description('Manage configuration')
  .option('-s, --set <key=value>', 'Set a config value')
  .option('-g, --get <key>', 'Get a config value')
  .option('-l, --list', 'List all config values')
  .option('-i, --init', 'Initialize configuration interactively')
  .action((options) => {
    if (options.init) {
      // Interactive config setup
      console.log('🔧 Initializing ZS AI Gateway configuration...\n')
      console.log('Please provide the following information:')
      // TODO: Add interactive prompts using readline or inquirer
      console.log('Use: zs-ai config set <key>=<value> to set values')
      console.log('Required keys: backendUrl, orgId, projectId, clientId, clientSecret')
      console.log('Optional keys: pdpUrl (for live mode)')
      return
    }
    
    if (options.list) {
      const config = readConfig()
      if (!config) {
        console.log('No configuration found. Run "zs-ai config init" to set up.')
        return
      }
      console.log(JSON.stringify(config, null, 2))
      return
    }
    
    if (options.get) {
      const value = getConfigValue(options.get as any)
      if (value === undefined) {
        console.error(`Config key '${options.get}' not found`)
        process.exit(1)
      }
      console.log(value)
      return
    }
    
    if (options.set) {
      const [key, value] = options.set.split('=')
      if (!key || value === undefined) {
        console.error('Invalid format. Use: --set key=value')
        process.exit(1)
      }
      setConfigValue(key as any, value)
      console.log(`✅ Set ${key} = ${value}`)
      return
    }
    
    program.help()
  })

// Helper function to prompt for password (master key)
function promptPassword(message: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    // Hide password input
    const stdin = process.stdin
    const wasRaw = stdin.isRaw || false
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    
    let password = ''
    process.stdout.write(message)
    
    const onData = (char: Buffer) => {
      const charStr = char.toString('utf8')
      
      switch (charStr) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(wasRaw)
          stdin.pause()
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          rl.close()
          resolve(password)
          break
        case '\u0003':
          stdin.setRawMode(wasRaw)
          stdin.pause()
          stdin.removeListener('data', onData)
          rl.close()
          process.exit()
          break
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break
        default:
          if (charStr >= ' ') {
            password += charStr
            process.stdout.write('*')
          }
          break
      }
    }
    
    stdin.on('data', onData)
  })
}

// Helper function to get or prompt for master key
async function getMasterKey(): Promise<string> {
  // Try environment variable first
  const envKey = process.env.ZS_AI_MASTER_KEY
  if (envKey) {
    return envKey
  }
  
  // Prompt for password (master key)
  const password = await promptPassword('Enter master password for credentials (or set ZS_AI_MASTER_KEY env var): ')
  if (!password || password.trim().length === 0) {
    throw new Error('Master password cannot be empty')
  }
  
  return password.trim()
}

// Provider metadata definitions for supported providers
const PROVIDER_TEMPLATES: Record<string, Omit<ProviderMetadata, 'hasCredentials'>> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    defaultModel: 'gpt-4'
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    defaultModel: 'claude-3-opus'
  }
}

// Provider subcommands
const providersCmd = program
  .command('providers')
  .description('Manage LLM provider configurations and API keys')

providersCmd
  .command('list')
  .description('List all configured providers')
  .action(async () => {
    try {
      const metadataList = listProviderMetadata()
      const masterKey = await getMasterKey()
      const credentialsList = listProvidersWithCredentials(masterKey)
      
      if (Object.keys(metadataList).length === 0) {
        console.log('No providers configured.')
        console.log('\nTo add a provider:')
        console.log('  zs-ai providers add <name>')
        console.log('\nSupported providers:')
        Object.keys(PROVIDER_TEMPLATES).forEach(name => {
          console.log(`  - ${name}`)
        })
        return
      }
      
      console.log('\nConfigured Providers:')
      console.log('='.repeat(60))
      Object.entries(metadataList).forEach(([name, metadata]) => {
        const hasCredentials = credentialsList.includes(name)
        console.log(`\n${metadata.displayName} (${name})`)
        console.log(`  Base URL: ${metadata.baseUrl}`)
        console.log(`  Models: ${metadata.models.join(', ')}`)
        console.log(`  Default Model: ${metadata.defaultModel || 'N/A'}`)
        console.log(`  API Key: ${hasCredentials ? '✅ Configured' : '❌ Not configured'}`)
      })
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`)
      process.exit(1)
    }
  })

providersCmd
  .command('remove <name>')
  .description('Remove a provider configuration')
  .action(async (providerName: string) => {
    try {
      const name = providerName.toLowerCase()
      const metadata = getProviderMetadata(name)
      
      if (!metadata) {
        console.error(`❌ Provider '${name}' not found`)
        process.exit(1)
      }
      
      const masterKey = await getMasterKey()
      removeProviderMetadata(name)
      removeProviderCredentials(name, masterKey)
      console.log(`✅ Removed provider '${name}'`)
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`)
      process.exit(1)
    }
  })

providersCmd
  .command('test <name>')
  .description('Test a provider connection')
  .action(async (providerName: string) => {
    try {
      const name = providerName.toLowerCase()
      const metadata = getProviderMetadata(name)
      
      if (!metadata) {
        console.error(`❌ Provider '${name}' not found`)
        console.error(`   Run: zs-ai providers add ${name}`)
        process.exit(1)
      }
      
      const masterKey = await getMasterKey()
      const credentials = getProviderCredentials(name, masterKey)
      
      if (!credentials) {
        console.error(`❌ API key for '${name}' not configured`)
        console.error(`   Run: zs-ai providers add ${name}`)
        process.exit(1)
      }
      
      console.log(`\n🧪 Testing connection to ${metadata.displayName}...`)
      
      // Test with a simple request (e.g., list models endpoint)
      const testUrl = `${metadata.baseUrl}/models`
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        console.log(`✅ Connection successful!`)
        const data = await response.json() as { data?: unknown[] }
        console.log(`   Available models: ${data.data?.length || 0} models`)
      } else {
        console.error(`❌ Connection failed: ${response.status} ${response.statusText}`)
        const error = await response.text()
        console.error(`   Error: ${error}`)
        process.exit(1)
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`)
      process.exit(1)
    }
  })

providersCmd
  .command('add <name>')
  .description('Add a provider configuration')
  .action(async (providerName: string) => {
    try {
      const name = providerName.toLowerCase()
      
      // Check if provider template exists
      if (!PROVIDER_TEMPLATES[name]) {
        console.error(`❌ Unknown provider '${name}'`)
        console.error('\nSupported providers:')
        Object.keys(PROVIDER_TEMPLATES).forEach(n => {
          console.log(`  - ${n}`)
        })
        process.exit(1)
      }
      
      // Check if already exists
      const existing = getProviderMetadata(name)
      if (existing) {
        console.log(`⚠️  Provider '${name}' already exists`)
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        })
        
        const answer = await new Promise<string>((resolve) => {
          rl.question('Do you want to update it? (y/N): ', resolve)
        })
        rl.close()
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('Cancelled.')
          return
        }
      }
      
      // Prompt for API key
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const apiKey = await new Promise<string>((resolve) => {
        rl.question(`Enter ${PROVIDER_TEMPLATES[name].displayName} API key: `, resolve)
      })
      rl.close()
      
      if (!apiKey || apiKey.trim().length === 0) {
        console.error('❌ API key cannot be empty')
        process.exit(1)
      }
      
      // Validate API key format
      const validation = validateProviderApiKey(name, apiKey.trim())
      if (!validation.valid) {
        console.error(`❌ ${validation.error}`)
        process.exit(1)
      }
      
      // Save metadata
      const metadata: ProviderMetadata = {
        ...PROVIDER_TEMPLATES[name],
        hasCredentials: true
      }
      setProviderMetadata(name, metadata)
      
      // Save credentials (encrypted)
      const masterKey = await getMasterKey()
      setProviderCredentials(name, apiKey.trim(), masterKey)
      
      console.log(`✅ Added provider '${name}'`)
      console.log(`   Display Name: ${metadata.displayName}`)
      console.log(`   Base URL: ${metadata.baseUrl}`)
      console.log(`   Models: ${metadata.models.join(', ')}`)
      console.log(`   Default Model: ${metadata.defaultModel}`)
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`)
      process.exit(1)
    }
  })

program.parse()
