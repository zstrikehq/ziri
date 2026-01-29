 

import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getConfigDir } from '../config/index.js'

const CONFIG_DIR = getConfigDir()
const MASTER_KEY_FILE = join(CONFIG_DIR, 'master-key.txt')

 
let currentMasterKey: string | null = null

 
export function generateMasterKey(): string {
 
  const key = randomBytes(32).toString('hex')
  return key
}

 
export function getMasterKey(): string | null {
 
  const envKey = process.env.ZIRI_MASTER_KEY || process.env.ZS_AI_MASTER_KEY
  if (envKey) {
    return envKey
  }

 
  return currentMasterKey
}

 
export function saveMasterKey(key: string): void {
 
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

 
  writeFileSync(MASTER_KEY_FILE, key, { mode: 0o600 })
  console.log(`[MASTER KEY] Master key saved to: ${MASTER_KEY_FILE}`)
}

 
export function initializeMasterKey(): string {
  if (currentMasterKey) {
    return currentMasterKey
  }
 
  const envKey = process.env.ZIRI_MASTER_KEY || process.env.ZS_AI_MASTER_KEY
  if (envKey) {
    currentMasterKey = envKey
    console.log('[MASTER KEY] Using master key from ZIRI_MASTER_KEY environment variable')
    return envKey
  }

 
  const newKey = generateMasterKey()
  currentMasterKey = newKey
  
  console.log('='.repeat(70))
  console.log('🔑 MASTER KEY GENERATED (New on each restart)')
  console.log('='.repeat(70))
  console.log(`Master Key: ${newKey}`)
  console.log('')
  console.log('⚠️  This master key is valid for this session only.')
  console.log('⚠️  Admin can login with:')
  console.log('    - Username: admin or admin@ziri.local')
  console.log('    - Password: (the master key shown above)')
  console.log('⚠️  Or set ZIRI_MASTER_KEY env var for persistent key.')
  console.log('='.repeat(70))
  console.log('')
  
  return newKey
}
