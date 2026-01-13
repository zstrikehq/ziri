// Proxy server starter - runs the proxy package

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function startProxyServer(port: number = 3100, host: string = 'localhost') {
  // Check if proxy package is built
  const proxyDistPath = join(__dirname, '../../proxy/dist/index.js')
  const proxySrcPath = join(__dirname, '../../proxy/src/index.ts')
  
  if (!existsSync(proxyDistPath) && !existsSync(proxySrcPath)) {
    console.error('❌ Proxy package not found. Please build it first:')
    console.error('   npm run build:proxy')
    process.exit(1)
  }
  
  // Set environment variables
  process.env.PORT = port.toString()
  process.env.HOST = host
  
  // Try to run built version first, fallback to dev mode
  const proxyPath = existsSync(proxyDistPath) ? proxyDistPath : proxySrcPath
  const useTsx = !existsSync(proxyDistPath)
  
  if (useTsx) {
    // Use tsx for dev mode
    const tsxPath = join(__dirname, '../../node_modules/.bin/tsx')
    if (!existsSync(tsxPath)) {
      console.error('❌ tsx not found. Please install dependencies:')
      console.error('   npm install')
      process.exit(1)
    }
    
    const proc = spawn('node', [tsxPath, proxySrcPath], {
      stdio: 'inherit',
      cwd: join(__dirname, '../..'),
      env: { ...process.env, PORT: port.toString(), HOST: host }
    })
    
    proc.on('error', (error) => {
      console.error('❌ Failed to start proxy server:', error)
      process.exit(1)
    })
  } else {
    // Use built version
    const proc = spawn('node', [proxyDistPath], {
      stdio: 'inherit',
      cwd: join(__dirname, '../..'),
      env: { ...process.env, PORT: port.toString(), HOST: host }
    })
    
    proc.on('error', (error) => {
      console.error('❌ Failed to start proxy server:', error)
      process.exit(1)
    })
  }
}
