
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs'
import { join } from 'path'
import { getConfigDir } from '../config/index.js'

const CONFIG_DIR = getConfigDir()
const ROOT_KEY_FILE = join(CONFIG_DIR, '.ziri-root-key')

let currentRootKey: string | null = null

function loadRootKeyWithRotation(): string {
  const raw = process.env.ROTATE_ROOT_KEY
  const rotate = raw && raw.toLowerCase() === 'true'

  const fileExists = existsSync(ROOT_KEY_FILE)

  if (!fileExists) {
    const key = generateRootKey()
    saveRootKey(key)
    currentRootKey = key
    return key
  }

  let fileKey: string | null = null

  try {
    const content = readFileSync(ROOT_KEY_FILE, 'utf-8').trim()
    if (content) {
      fileKey = content
    }
  } catch (error: any) {
    console.error(`[ROOT KEY] Failed to read root key file, regenerating: ${error.message}`)
  }

  if (rotate || !fileKey) {
    const key = generateRootKey()
    saveRootKey(key)
    currentRootKey = key
    return key
  }

  currentRootKey = fileKey
  return fileKey
}

export function generateRootKey(): string {
  const key = randomBytes(32).toString('hex')
  return key
}

export function getRootKey(): string {
  if (currentRootKey) {
    return currentRootKey
  }
  return loadRootKeyWithRotation()
}

export function saveRootKey(key: string): void {
  console.log(`[ROOT KEY] Config directory: ${CONFIG_DIR}`)
  console.log(`[ROOT KEY] Key file path: ${ROOT_KEY_FILE}`)
  
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  try {
    writeFileSync(ROOT_KEY_FILE, key, { mode: 0o600 })
    chmodSync(ROOT_KEY_FILE, 0o600)
    currentRootKey = key

    if (existsSync(ROOT_KEY_FILE)) {
      const verifyKey = readFileSync(ROOT_KEY_FILE, 'utf-8').trim()
      if (verifyKey !== key) {
        console.error('[ROOT KEY] Verification failed - written key does not match')
      }
    } else {
      console.error('[ROOT KEY] File does not exist after write')
    }
  } catch (error: any) {
    console.error(`[ROOT KEY] Failed to write key file: ${error.message}`)
    throw error
  }
}
