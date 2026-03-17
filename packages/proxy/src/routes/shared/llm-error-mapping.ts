export interface LlmMappedError {
  status: number
  code: string
}

export function mapChatRouteError(message: string): LlmMappedError | null {
  if (message.includes('not configured')) {
    return { status: 404, code: 'PROVIDER_NOT_FOUND' }
  }

  if (message.includes('API key not found')) {
    return { status: 500, code: 'PROVIDER_KEY_MISSING' }
  }

  if (message.includes('LLM provider')) {
    return { status: 502, code: 'LLM_PROVIDER_ERROR' }
  }

  return null
}

export function mapStandardLlmRouteError(message: string | undefined): LlmMappedError | null {
  if (message?.includes('not configured')) {
    return { status: 404, code: 'PROVIDER_NOT_FOUND' }
  }

  if (message?.includes('API key not found')) {
    return { status: 500, code: 'PROVIDER_KEY_MISSING' }
  }

  if (message?.includes('LLM provider')) {
    return { status: 502, code: 'LLM_PROVIDER_ERROR' }
  }

  return null
}
