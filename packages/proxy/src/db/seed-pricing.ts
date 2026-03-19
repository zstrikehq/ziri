import type Database from 'better-sqlite3'

interface ModelPricing {
  provider: string
  model: string
  input_cost_per_token: number
  output_cost_per_token: number
  cache_read_cost_per_token?: number
  max_input_tokens?: number
  max_output_tokens?: number
  supports_vision?: boolean
  supports_function_calling?: boolean
  supports_streaming?: boolean
  supported_actions?: string
}

export const OPENAI_PRICING: ModelPricing[] = [
  { provider: 'openai', model: 'gpt-3.5-turbo', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 16385, max_output_tokens: 4096, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-3.5-turbo-0125', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 16385, max_output_tokens: 4096, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-3.5-turbo-1106', input_cost_per_token: 0.000001, output_cost_per_token: 0.000002, max_input_tokens: 16385, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-3.5-turbo-16k', input_cost_per_token: 0.000003, output_cost_per_token: 0.000004, max_input_tokens: 16385, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-3.5-turbo-instruct', input_cost_per_token: 0.0000015, output_cost_per_token: 0.000002, max_input_tokens: 4097, max_output_tokens: 4097, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-3.5-turbo-instruct-0914', input_cost_per_token: 0.0000015, output_cost_per_token: 0.000002, max_input_tokens: 4097, max_output_tokens: 4097, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4', input_cost_per_token: 0.00003, output_cost_per_token: 0.00006, max_input_tokens: 8192, max_output_tokens: 4096, supports_function_calling: true, supports_streaming: true, supports_vision: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4-0613', input_cost_per_token: 0.00003, output_cost_per_token: 0.00006, max_input_tokens: 8192, max_output_tokens: 4096, supports_function_calling: true, supports_streaming: true, supports_vision: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4-turbo', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4-turbo-2024-04-09', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4-turbo-preview', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4-0125-preview', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4-1106-preview', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'gpt-4o', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.00000125, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-2024-05-13', input_cost_per_token: 0.000005, output_cost_per_token: 0.000015, max_input_tokens: 128000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-2024-08-06', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.00000125, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-2024-11-20', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.00000125, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'chatgpt-4o-latest', input_cost_per_token: 0.000005, output_cost_per_token: 0.000015, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'gpt-4o-mini', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, cache_read_cost_per_token: 0.000000075, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-2024-07-18', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, cache_read_cost_per_token: 0.000000075, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'gpt-4.1', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, cache_read_cost_per_token: 0.0000005, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4.1-2025-04-14', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, cache_read_cost_per_token: 0.0000005, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4.1-mini', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000016, cache_read_cost_per_token: 0.0000001, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4.1-mini-2025-04-14', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000016, cache_read_cost_per_token: 0.0000001, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4.1-nano', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, cache_read_cost_per_token: 0.000000025, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4.1-nano-2025-04-14', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, cache_read_cost_per_token: 0.000000025, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'gpt-5', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.000000125, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-2025-08-07', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.000000125, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-chat-latest', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-mini', input_cost_per_token: 0.00000025, output_cost_per_token: 0.000002, cache_read_cost_per_token: 0.000000025, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-mini-2025-08-07', input_cost_per_token: 0.00000025, output_cost_per_token: 0.000002, cache_read_cost_per_token: 0.000000025, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-nano', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000004, cache_read_cost_per_token: 0.000000005, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-nano-2025-08-07', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000004, cache_read_cost_per_token: 0.000000005, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-pro', input_cost_per_token: 0.000015, output_cost_per_token: 0.00012, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-pro-2025-10-06', input_cost_per_token: 0.000015, output_cost_per_token: 0.00012, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-codex', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 400000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'gpt-5.1', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.000000125, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.1-2025-11-13', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.000000125, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.1-chat-latest', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 128000, supports_vision: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.1-codex', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.1-codex-mini', input_cost_per_token: 0.00000025, output_cost_per_token: 0.000002, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.1-codex-max', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'gpt-5.2', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, cache_read_cost_per_token: 0.000000175, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.2-2025-12-11', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, cache_read_cost_per_token: 0.000000175, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.2-chat-latest', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.2-pro', input_cost_per_token: 0.000021, output_cost_per_token: 0.000168, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.2-pro-2025-12-11', input_cost_per_token: 0.000021, output_cost_per_token: 0.000168, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5.2-codex', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'o1', input_cost_per_token: 0.000015, output_cost_per_token: 0.00006, cache_read_cost_per_token: 0.0000075, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o1-2024-12-17', input_cost_per_token: 0.000015, output_cost_per_token: 0.00006, cache_read_cost_per_token: 0.0000075, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o1-mini', input_cost_per_token: 0.000003, output_cost_per_token: 0.000012, cache_read_cost_per_token: 0.0000015, max_input_tokens: 128000, max_output_tokens: 65536, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o1-pro', input_cost_per_token: 0.00015, output_cost_per_token: 0.0006, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o1-pro-2025-03-19', input_cost_per_token: 0.00015, output_cost_per_token: 0.0006, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o3', input_cost_per_token: 0.00001, output_cost_per_token: 0.00004, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o3-2025-04-16', input_cost_per_token: 0.00001, output_cost_per_token: 0.00004, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o3-mini', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, cache_read_cost_per_token: 0.00000055, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o3-mini-2025-01-31', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, cache_read_cost_per_token: 0.00000055, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'o4-mini', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o4-mini-2025-04-16', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o4-mini-deep-research', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, max_input_tokens: 200000, max_output_tokens: 100000, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'o4-mini-deep-research-2025-06-26', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, max_input_tokens: 200000, max_output_tokens: 100000, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-audio-preview', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-audio-preview-2024-12-17', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-realtime-preview', input_cost_per_token: 0.000005, output_cost_per_token: 0.00002, max_input_tokens: 128000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-realtime-preview-2024-12-17', input_cost_per_token: 0.000005, output_cost_per_token: 0.00002, max_input_tokens: 128000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-realtime-preview', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-realtime-preview-2024-12-17', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-audio-preview', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-audio-preview-2024-12-17', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-audio', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-audio-2025-08-28', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-audio-mini', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-audio-mini-2025-10-06', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-realtime', input_cost_per_token: 0.000004, output_cost_per_token: 0.000016, max_input_tokens: 32000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-realtime-2025-08-28', input_cost_per_token: 0.000004, output_cost_per_token: 0.000016, max_input_tokens: 32000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-realtime-mini', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 32000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-realtime-mini-2025-10-06', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 32000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-tts', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 16000, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-tts-2025-03-20', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 16000, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-tts-2025-12-15', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 16000, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-search-preview', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-search-preview-2025-03-11', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-search-preview', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-search-preview-2025-03-11', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 128000, max_output_tokens: 16384, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-search-api', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-5-search-api-2025-10-14', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'openai', model: 'gpt-4o-transcribe', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 2000, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-transcribe', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 16000, max_output_tokens: 2000, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-transcribe-2025-03-20', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 16000, max_output_tokens: 2000, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-mini-transcribe-2025-12-15', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 16000, max_output_tokens: 2000, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'gpt-4o-transcribe-diarize', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 2000, supports_streaming: false, supported_actions: 'completion' },
  { provider: 'openai', model: 'codex-mini-latest', input_cost_per_token: 0.0000015, output_cost_per_token: 0.000006, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'openai', model: 'text-embedding-3-small', input_cost_per_token: 0.00000002, output_cost_per_token: 0, max_input_tokens: 8191, max_output_tokens: 0, supports_streaming: false, supported_actions: 'embedding' },
  { provider: 'openai', model: 'text-embedding-3-large', input_cost_per_token: 0.00000013, output_cost_per_token: 0, max_input_tokens: 8191, max_output_tokens: 0, supports_streaming: false, supported_actions: 'embedding' },
  { provider: 'openai', model: 'text-embedding-ada-002', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 8191, max_output_tokens: 0, supports_streaming: false, supported_actions: 'embedding' },

  { provider: 'openai', model: 'davinci-002', input_cost_per_token: 0.000002, output_cost_per_token: 0.000002, max_input_tokens: 16384, max_output_tokens: 4096 },
  { provider: 'openai', model: 'babbage-002', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000004, max_input_tokens: 16384, max_output_tokens: 4096 },
]

export const ANTHROPIC_PRICING: ModelPricing[] = [
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20240620', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, cache_read_cost_per_token: 0.0000003, max_input_tokens: 200000, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', input_cost_per_token: 0.0000008, output_cost_per_token: 0.000004, cache_read_cost_per_token: 0.00000008, max_input_tokens: 200000, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'anthropic', model: 'claude-3-7-sonnet-20250219', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, cache_read_cost_per_token: 0.0000003, max_input_tokens: 200000, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'anthropic', model: 'claude-3-opus-20240229', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-3-sonnet-20240229', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307', input_cost_per_token: 0.00000025, output_cost_per_token: 0.00000125, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, cache_read_cost_per_token: 0.0000003, max_input_tokens: 200000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, cache_read_cost_per_token: 0.0000003, max_input_tokens: 200000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-opus-4-20250514', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, cache_read_cost_per_token: 0.0000015, max_input_tokens: 200000, max_output_tokens: 32000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-opus-4-1-20250805', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, cache_read_cost_per_token: 0.0000015, max_input_tokens: 200000, max_output_tokens: 32000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'anthropic', model: 'claude-opus-4-5-20251101', input_cost_per_token: 0.000005, output_cost_per_token: 0.000025, cache_read_cost_per_token: 0.0000005, max_input_tokens: 200000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', input_cost_per_token: 0.000001, output_cost_per_token: 0.000005, cache_read_cost_per_token: 0.0000001, max_input_tokens: 200000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },

  { provider: 'anthropic', model: 'claude-2.1', input_cost_per_token: 0.000008, output_cost_per_token: 0.000024, max_input_tokens: 100000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-2.0', input_cost_per_token: 0.000008, output_cost_per_token: 0.000024, max_input_tokens: 100000, max_output_tokens: 4096, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'anthropic', model: 'claude-instant-1.2', input_cost_per_token: 0.0000008, output_cost_per_token: 0.0000024, max_input_tokens: 100000, max_output_tokens: 8191, supports_streaming: true, supported_actions: 'completion' },
]


export const GOOGLE_PRICING: ModelPricing[] = [
  { provider: 'google', model: 'gemini-2.5-pro', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-pro-exp-03-25', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-pro-preview-03-25', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-pro-preview-05-06', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-pro-preview-06-05', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-pro-preview-tts', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash-lite', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash-lite-preview-06-17', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash-lite-preview-09-2025', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash-preview-04-17', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash-preview-05-20', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash-preview-09-2025', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash-preview-tts', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-computer-use-preview-10-2025', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash-001', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash-exp', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash-lite', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash-lite-preview-02-05', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash-live-001', input_cost_per_token: 0.00000035, output_cost_per_token: 0.0000015, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash-preview-image-generation', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash-thinking-exp', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 65536, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-flash-thinking-exp-01-21', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 65536, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.0-pro-exp-02-05', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-3-flash-preview', input_cost_per_token: 0.0000005, output_cost_per_token: 0.000003, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-3-pro-preview', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-flash-latest', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-flash-lite-latest', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-flash', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-flash-001', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-flash-002', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-flash-8b', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-flash-8b-exp-0827', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-flash-8b-exp-0924', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-flash-exp-0827', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-flash-latest', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-pro', input_cost_per_token: 0.0000035, output_cost_per_token: 0.0000105, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-pro-001', input_cost_per_token: 0.0000035, output_cost_per_token: 0.0000105, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-pro-002', input_cost_per_token: 0.0000035, output_cost_per_token: 0.0000105, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-pro-exp-0801', input_cost_per_token: 0.0000035, output_cost_per_token: 0.0000105, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-pro-exp-0827', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-1.5-pro-latest', input_cost_per_token: 0.0000035, output_cost_per_token: 0.00000105, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-pro', input_cost_per_token: 0.00000035, output_cost_per_token: 0.00000105, max_input_tokens: 32760, max_output_tokens: 8192, supports_vision: false, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-pro-vision', input_cost_per_token: 0.00000035, output_cost_per_token: 0.00000105, max_input_tokens: 30720, max_output_tokens: 2048, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'deep-research-pro-preview-12-2025', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 65536, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-2.5-flash-image', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 32768, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-exp-1114', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-exp-1206', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-gemma-2-27b-it', input_cost_per_token: 0.00000035, output_cost_per_token: 0.00000105, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-gemma-2-9b-it', input_cost_per_token: 0.00000035, output_cost_per_token: 0.00000105, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-live-2.5-flash-preview-native-audio-09-2025', input_cost_per_token: 0.0000003, output_cost_per_token: 0.000002, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-robotics-er-1.5-preview', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemma-3-27b-it', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 131072, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'learnlm-1.5-pro-experimental', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 32767, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-embedding-001', input_cost_per_token: 0.00000015, output_cost_per_token: 0, max_input_tokens: 2048, supported_actions: 'embedding' },
  { provider: 'google', model: 'gemini-2.5-flash-image-preview', input_cost_per_token: 0.0000003, output_cost_per_token: 0.00003, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'gemini-3-pro-image-preview', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 65536, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'google', model: 'imagen-3.0-fast-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'imagen-3.0-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'imagen-3.0-generate-002', input_cost_per_token: 0, output_cost_per_token: 0, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'imagen-4.0-fast-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'imagen-4.0-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'imagen-4.0-ultra-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'veo-2.0-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'veo-3.0-fast-generate-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'veo-3.0-generate-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'veo-3.1-fast-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'veo-3.1-fast-generate-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'veo-3.1-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supports_vision: true, supported_actions: 'completion' },
  { provider: 'google', model: 'veo-3.1-generate-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supports_vision: true, supported_actions: 'completion' },
]

export const XAI_PRICING: ModelPricing[] = [
  { provider: 'xai', model: 'grok-4', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-latest', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-0709', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-fast-reasoning', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000005, max_input_tokens: 2000000, max_output_tokens: 2000000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-fast-non-reasoning', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000005, max_input_tokens: 2000000, max_output_tokens: 2000000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-1-fast-reasoning', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000005, max_input_tokens: 2000000, max_output_tokens: 2000000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-1-fast-reasoning-latest', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000005, max_input_tokens: 2000000, max_output_tokens: 2000000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-1-fast-non-reasoning', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000005, max_input_tokens: 2000000, max_output_tokens: 2000000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-1-fast-non-reasoning-latest', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000005, max_input_tokens: 2000000, max_output_tokens: 2000000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-latest', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-beta', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-fast-latest', input_cost_per_token: 0.000005, output_cost_per_token: 0.000025, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-fast-beta', input_cost_per_token: 0.000005, output_cost_per_token: 0.000025, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-mini', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-mini-latest', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-mini-fast', input_cost_per_token: 0.0000006, output_cost_per_token: 0.000004, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-mini-fast-latest', input_cost_per_token: 0.0000006, output_cost_per_token: 0.000004, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-mini-fast-beta', input_cost_per_token: 0.0000006, output_cost_per_token: 0.000004, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-2', input_cost_per_token: 0.000002, output_cost_per_token: 0.00001, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-2-latest', input_cost_per_token: 0.000002, output_cost_per_token: 0.00001, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-2-1212', input_cost_per_token: 0.000002, output_cost_per_token: 0.00001, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-2-vision', input_cost_per_token: 0.000002, output_cost_per_token: 0.00001, max_input_tokens: 32768, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-2-vision-latest', input_cost_per_token: 0.000002, output_cost_per_token: 0.00001, max_input_tokens: 32768, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-2-vision-1212', input_cost_per_token: 0.000002, output_cost_per_token: 0.00001, max_input_tokens: 32768, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-code-fast', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000015, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-code-fast-1', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000015, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-code-fast-1-0825', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000015, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-4-1-fast', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000005, max_input_tokens: 2000000, max_output_tokens: 2000000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-3-mini-beta', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-vision-beta', input_cost_per_token: 0.000005, output_cost_per_token: 0.000015, max_input_tokens: 8192, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'xai', model: 'grok-beta', input_cost_per_token: 0.000005, output_cost_per_token: 0.000015, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
]

export const MISTRAL_PRICING: ModelPricing[] = [
  { provider: 'mistral', model: 'mistral-large-3', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 256000, max_output_tokens: 8191, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-small', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000003, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-small-latest', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000003, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-medium-2505', input_cost_per_token: 0.0000004, output_cost_per_token: 0.000002, max_input_tokens: 131072, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-medium-latest', input_cost_per_token: 0.0000004, output_cost_per_token: 0.000002, max_input_tokens: 131072, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-nemo', input_cost_per_token: 0.00000015, output_cost_per_token: 0.00000015, max_input_tokens: 131072, max_output_tokens: 4096, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-large-latest', input_cost_per_token: 0.000002, output_cost_per_token: 0.000006, max_input_tokens: 128000, max_output_tokens: 4096, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-large-2402', input_cost_per_token: 0.000004, output_cost_per_token: 0.000012, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-large-2407', input_cost_per_token: 0.000003, output_cost_per_token: 0.000009, max_input_tokens: 128000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-large-2411', input_cost_per_token: 0.000002, output_cost_per_token: 0.000006, max_input_tokens: 128000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-medium', input_cost_per_token: 0.0000027, output_cost_per_token: 0.0000081, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-tiny', input_cost_per_token: 0.00000025, output_cost_per_token: 0.00000025, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'codestral-2405', input_cost_per_token: 0.000001, output_cost_per_token: 0.000003, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'codestral-2508', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000009, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'codestral-latest', input_cost_per_token: 0.000001, output_cost_per_token: 0.000003, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'devstral-2512', input_cost_per_token: 0.0000004, output_cost_per_token: 0.000002, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'devstral-small-2505', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000003, max_input_tokens: 128000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'devstral-small-2507', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000003, max_input_tokens: 128000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'magistral-small-2506', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 40000, max_output_tokens: 40000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'magistral-small-latest', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 40000, max_output_tokens: 40000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'magistral-medium-2506', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 40000, max_output_tokens: 40000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'magistral-medium-2509', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 40000, max_output_tokens: 40000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'magistral-medium-latest', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 40000, max_output_tokens: 40000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'pixtral-12b-2409', input_cost_per_token: 0.00000015, output_cost_per_token: 0.00000015, max_input_tokens: 128000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'pixtral-large-2411', input_cost_per_token: 0.000002, output_cost_per_token: 0.000006, max_input_tokens: 128000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'pixtral-large-latest', input_cost_per_token: 0.000002, output_cost_per_token: 0.000006, max_input_tokens: 128000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'open-mixtral-8x7b', input_cost_per_token: 0.0000007, output_cost_per_token: 0.0000007, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'open-mixtral-8x22b', input_cost_per_token: 0.000002, output_cost_per_token: 0.000006, max_input_tokens: 65336, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'open-mistral-7b', input_cost_per_token: 0.00000025, output_cost_per_token: 0.00000025, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'open-mistral-nemo', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000003, max_input_tokens: 128000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'open-mistral-nemo-2407', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000003, max_input_tokens: 128000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-embed', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 8192, supported_actions: 'embedding' },
  { provider: 'mistral', model: 'codestral-embed', input_cost_per_token: 0.00000015, output_cost_per_token: 0, max_input_tokens: 8192, supported_actions: 'embedding' },
  { provider: 'mistral', model: 'codestral-embed-2505', input_cost_per_token: 0.00000015, output_cost_per_token: 0, max_input_tokens: 8192, supported_actions: 'embedding' },
  { provider: 'mistral', model: 'codestral-mamba-latest', input_cost_per_token: 0.00000025, output_cost_per_token: 0.00000025, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'devstral-medium-2507', input_cost_per_token: 0.0000004, output_cost_per_token: 0.000002, max_input_tokens: 128000, max_output_tokens: 128000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'labs-devstral-small-2512', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000003, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'mistral-medium-2312', input_cost_per_token: 0.0000027, output_cost_per_token: 0.0000081, max_input_tokens: 32000, max_output_tokens: 8191, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'mistral', model: 'open-codestral-mamba', input_cost_per_token: 0.00000025, output_cost_per_token: 0.00000025, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
]


export const MOONSHOT_PRICING: ModelPricing[] = [
  { provider: 'moonshot', model: 'kimi-k2.5', input_cost_per_token: 0.0000006, output_cost_per_token: 0.000003, max_input_tokens: 262144, max_output_tokens: 262144, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-k2-thinking', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000025, max_input_tokens: 262144, max_output_tokens: 262144, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-k2-0905-preview', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000025, max_input_tokens: 262144, max_output_tokens: 262144, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-k2-turbo-preview', input_cost_per_token: 0.00000115, output_cost_per_token: 0.000008, max_input_tokens: 262144, max_output_tokens: 262144, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-k2-thinking-turbo', input_cost_per_token: 0.00000115, output_cost_per_token: 0.000008, max_input_tokens: 262144, max_output_tokens: 262144, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-k2-0711-preview', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000025, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-latest', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-latest-128k', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-latest-32k', input_cost_per_token: 0.000001, output_cost_per_token: 0.000003, max_input_tokens: 32768, max_output_tokens: 32768, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-latest-8k', input_cost_per_token: 0.0000002, output_cost_per_token: 0.000002, max_input_tokens: 8192, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'kimi-thinking-preview', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000025, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-128k', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-32k', input_cost_per_token: 0.000001, output_cost_per_token: 0.000003, max_input_tokens: 32768, max_output_tokens: 32768, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-8k', input_cost_per_token: 0.0000002, output_cost_per_token: 0.000002, max_input_tokens: 8192, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-128k-0430', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-128k-vision-preview', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-32k-0430', input_cost_per_token: 0.000001, output_cost_per_token: 0.000003, max_input_tokens: 32768, max_output_tokens: 32768, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-32k-vision-preview', input_cost_per_token: 0.000001, output_cost_per_token: 0.000003, max_input_tokens: 32768, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-8k-0430', input_cost_per_token: 0.0000002, output_cost_per_token: 0.000002, max_input_tokens: 8192, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-8k-vision-preview', input_cost_per_token: 0.0000002, output_cost_per_token: 0.000002, max_input_tokens: 8192, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'moonshot', model: 'moonshot-v1-auto', input_cost_per_token: 0.000002, output_cost_per_token: 0.000005, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
]

export const DEEPSEEK_PRICING: ModelPricing[] = [
  { provider: 'deepseek', model: 'deepseek-chat', input_cost_per_token: 0.00000028, output_cost_per_token: 0.00000042, max_input_tokens: 131072, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'deepseek', model: 'deepseek-reasoner', input_cost_per_token: 0.00000028, output_cost_per_token: 0.00000042, max_input_tokens: 131072, max_output_tokens: 65536, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'deepseek', model: 'deepseek-coder', input_cost_per_token: 0.00000014, output_cost_per_token: 0.00000028, max_input_tokens: 128000, max_output_tokens: 4096, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'deepseek', model: 'deepseek-r1', input_cost_per_token: 0.00000055, output_cost_per_token: 0.00000219, max_input_tokens: 65536, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'deepseek', model: 'deepseek-v3', input_cost_per_token: 0.00000027, output_cost_per_token: 0.0000011, max_input_tokens: 65536, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'deepseek', model: 'deepseek-v3.2', input_cost_per_token: 0.00000028, output_cost_per_token: 0.0000004, max_input_tokens: 163840, max_output_tokens: 163840, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'deepseek', model: 'deepseek-r1-0528', input_cost_per_token: 0.0000005, output_cost_per_token: 0.00000215, max_input_tokens: 65336, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'deepseek', model: 'deepseek-v3.2-exp', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000004, max_input_tokens: 163840, max_output_tokens: 163840, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
]


export const VERTEX_AI_PRICING: ModelPricing[] = [

  { provider: 'vertex_ai', model: 'chat-bison', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 8192, max_output_tokens: 4096, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'chat-bison-32k', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 32000, max_output_tokens: 8192, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'chat-bison-32k@002', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 32000, max_output_tokens: 8192, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'chat-bison@001', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 8192, max_output_tokens: 4096, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'chat-bison@002', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 8192, max_output_tokens: 4096, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-bison', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-bison-32k@002', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-bison32k', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-bison@001', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-bison@002', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-gecko', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 2048, max_output_tokens: 64, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-gecko-latest', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 2048, max_output_tokens: 64, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-gecko@001', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 2048, max_output_tokens: 64, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'code-gecko@002', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 2048, max_output_tokens: 64, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'codechat-bison', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'codechat-bison-32k', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 32000, max_output_tokens: 8192, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'codechat-bison-32k@002', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 32000, max_output_tokens: 8192, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'codechat-bison@001', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'codechat-bison@002', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'codechat-bison@latest', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 6144, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'deep-research-pro-preview-12-2025', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 65536, max_output_tokens: 32768, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.0-pro', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 32760, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.0-pro-001', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 32760, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.0-pro-002', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 32760, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.0-pro-vision', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 16384, max_output_tokens: 2048, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.0-pro-vision-001', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 16384, max_output_tokens: 2048, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.0-ultra', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 8192, max_output_tokens: 2048, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.0-ultra-001', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 8192, max_output_tokens: 2048, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-flash', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-flash-001', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-flash-002', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-flash-exp-0827', input_cost_per_token: 0.0000000047, output_cost_per_token: 0.0000000047, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-flash-preview-0514', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000000047, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-pro', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-pro-001', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-pro-002', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-pro-preview-0215', input_cost_per_token: 0.0000000781, output_cost_per_token: 0.0000003125, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-pro-preview-0409', input_cost_per_token: 0.0000000781, output_cost_per_token: 0.0000003125, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-1.5-pro-preview-0514', input_cost_per_token: 0.0000000781, output_cost_per_token: 0.0000003125, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash-001', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash-exp', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash-lite', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash-lite-001', input_cost_per_token: 0.000000075, output_cost_per_token: 0.0000003, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash-live-preview-04-09', input_cost_per_token: 0.0000005, output_cost_per_token: 0.000002, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash-preview-image-generation', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash-thinking-exp', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 8192, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-flash-thinking-exp-01-21', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1048576, max_output_tokens: 65536, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.0-pro-exp-02-05', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 2097152, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-computer-use-preview-10-2025', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 64000, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash-image', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 32768, max_output_tokens: 32768, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash-image-preview', input_cost_per_token: 0.0000003, output_cost_per_token: 0.00003, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash-lite', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash-lite-preview-06-17', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash-lite-preview-09-2025', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash-preview-04-17', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash-preview-05-20', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-flash-preview-09-2025', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-pro', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-pro-exp-03-25', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-pro-preview-03-25', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-pro-preview-05-06', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-pro-preview-06-05', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-2.5-pro-preview-tts', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-3-flash-preview', input_cost_per_token: 0.0000005, output_cost_per_token: 0.000003, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-3-pro-image-preview', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 65536, max_output_tokens: 32768, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-3-pro-preview', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-embedding-001', input_cost_per_token: 0.00000015, output_cost_per_token: 0, max_input_tokens: 2048, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'gemini-flash-experimental', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1000000, max_output_tokens: 8192, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-live-2.5-flash-preview-native-audio-09-2025', input_cost_per_token: 0.0000003, output_cost_per_token: 0.000002, max_input_tokens: 1048576, max_output_tokens: 65535, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-pro', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 32760, max_output_tokens: 8192, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-pro-experimental', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1000000, max_output_tokens: 8192, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-pro-vision', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 16384, max_output_tokens: 2048, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'gemini-robotics-er-1.5-preview', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 65535, supported_actions: 'completion' },

  { provider: 'vertex_ai', model: 'gemini/gemini-2.5-flash-image', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 32768, max_output_tokens: 32768, supports_vision: true, supported_actions: 'completion' },

  { provider: 'vertex_ai', model: 'medlm-large', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 8192, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'medlm-medium', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 32768, max_output_tokens: 8192, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'multimodalembedding', input_cost_per_token: 0.0000008, output_cost_per_token: 0, max_input_tokens: 2048, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'multimodalembedding@001', input_cost_per_token: 0.0000008, output_cost_per_token: 0, max_input_tokens: 2048, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'text-bison', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 8192, max_output_tokens: 2048, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'text-bison32k', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 8192, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'text-bison32k@002', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000125, max_input_tokens: 8192, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'text-bison@001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 8192, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'text-bison@002', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 8192, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'text-embedding-004', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 2048, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'text-embedding-005', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 2048, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'text-embedding-large-exp-03-07', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 8192, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'text-embedding-preview-0409', input_cost_per_token: 0.0000000062, output_cost_per_token: 0, max_input_tokens: 3072, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'text-multilingual-embedding-002', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 2048, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'text-multilingual-embedding-preview-0409', input_cost_per_token: 0.0000000062, output_cost_per_token: 0, max_input_tokens: 3072, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'text-unicorn', input_cost_per_token: 0.00001, output_cost_per_token: 0.000028, max_input_tokens: 8192, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'text-unicorn@001', input_cost_per_token: 0.00001, output_cost_per_token: 0.000028, max_input_tokens: 8192, max_output_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'textembedding-gecko', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 3072, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'textembedding-gecko-multilingual', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 3072, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'textembedding-gecko-multilingual@001', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 3072, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'textembedding-gecko@001', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 3072, supported_actions: 'embedding' },
  { provider: 'vertex_ai', model: 'textembedding-gecko@003', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 3072, supported_actions: 'embedding' },

  { provider: 'vertex_ai', model: 'vertex_ai/chirp', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/deep-research-pro-preview-12-2025', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 65536, max_output_tokens: 32768, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/deepseek-ai/deepseek-ocr-maas', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000012, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/gemini-2.5-flash-image', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 32768, max_output_tokens: 32768, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/gemini-3-flash-preview', input_cost_per_token: 0.0000005, output_cost_per_token: 0.000003, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/gemini-3-pro-image-preview', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 65536, max_output_tokens: 32768, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/gemini-3-pro-preview', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/imagegeneration@006', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/imagen-3.0-capability-001', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/imagen-3.0-fast-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/imagen-3.0-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/imagen-3.0-generate-002', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/imagen-4.0-fast-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/imagen-4.0-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/imagen-4.0-ultra-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/mistral-ocr-2505', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/search_api', input_cost_per_token: 0, output_cost_per_token: 0, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-2.0-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-3.0-fast-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-3.0-fast-generate-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-3.0-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-3.0-generate-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-3.1-fast-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-3.1-fast-generate-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-3.1-generate-001', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
  { provider: 'vertex_ai', model: 'vertex_ai/veo-3.1-generate-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 1024, supported_actions: 'completion' },
]


export const DASHSCOPE_PRICING: ModelPricing[] = [
  { provider: 'dashscope', model: 'qwen-plus', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000012, max_input_tokens: 129024, max_output_tokens: 16384, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-plus-latest', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 32768, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-turbo', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000002, max_input_tokens: 129024, max_output_tokens: 16384, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-turbo-latest', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000002, max_input_tokens: 1000000, max_output_tokens: 16384, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-max', input_cost_per_token: 0.0000016, output_cost_per_token: 0.0000064, max_input_tokens: 30720, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-coder', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000015, max_input_tokens: 1000000, max_output_tokens: 16384, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-flash', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 32768, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-plus-2025-01-25', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000012, max_input_tokens: 129024, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-plus-2025-04-28', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000012, max_input_tokens: 129024, max_output_tokens: 16384, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-turbo-2024-11-01', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000002, max_input_tokens: 1000000, max_output_tokens: 8192, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-turbo-2025-04-28', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000002, max_input_tokens: 1000000, max_output_tokens: 16384, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen3-max', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 258048, max_output_tokens: 65536, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen3-coder-plus', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 65536, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen3-coder-flash', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 65536, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-plus-2025-07-14', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000012, max_input_tokens: 129024, max_output_tokens: 16384, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-plus-2025-07-28', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 32768, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-plus-2025-09-11', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 32768, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen-flash-2025-07-28', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 32768, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen3-30b-a3b', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 129024, max_output_tokens: 16384, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen3-coder-flash-2025-07-28', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 65536, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen3-coder-plus-2025-07-22', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 997952, max_output_tokens: 65536, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
  { provider: 'dashscope', model: 'qwen3-max-preview', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 258048, max_output_tokens: 65536, supports_function_calling: true, supports_streaming: true, supported_actions: 'completion' },
]


export const OPENROUTER_PRICING: ModelPricing[] = [

  { provider: 'openrouter', model: 'anthropic/claude-2', input_cost_per_token: 0.00001102, output_cost_per_token: 0.00003268, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3-5-haiku', input_cost_per_token: 0.000001, output_cost_per_token: 0.000005, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3-5-haiku-20241022', input_cost_per_token: 0.000001, output_cost_per_token: 0.000005, max_input_tokens: 200000, max_output_tokens: 8192, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3-haiku', input_cost_per_token: 0.00000025, output_cost_per_token: 0.00000125, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3-haiku-20240307', input_cost_per_token: 0.00000025, output_cost_per_token: 0.00000125, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3-opus', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3-sonnet', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 200000, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet:beta', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 200000, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3.7-sonnet', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 200000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-3.7-sonnet:beta', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 200000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-haiku-4.5', input_cost_per_token: 0.000001, output_cost_per_token: 0.000005, max_input_tokens: 200000, max_output_tokens: 200000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-instant-v1', input_cost_per_token: 0.00000163, output_cost_per_token: 0.00000551, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-opus-4', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, max_input_tokens: 200000, max_output_tokens: 32000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-opus-4.1', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, max_input_tokens: 200000, max_output_tokens: 32000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-opus-4.5', input_cost_per_token: 0.000005, output_cost_per_token: 0.000025, max_input_tokens: 200000, max_output_tokens: 32000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-sonnet-4', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 1000000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'anthropic/claude-sonnet-4.5', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 1000000, max_output_tokens: 1000000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'bytedance/ui-tars-1.5-7b', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000002, max_input_tokens: 131072, max_output_tokens: 2048, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'cognitivecomputations/dolphin-mixtral-8x7b', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000005, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'cohere/command-r-plus', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'databricks/dbrx-instruct', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000006, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'deepseek/deepseek-chat', input_cost_per_token: 0.00000014, output_cost_per_token: 0.00000028, max_input_tokens: 65536, max_output_tokens: 8192, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'deepseek/deepseek-chat-v3-0324', input_cost_per_token: 0.00000014, output_cost_per_token: 0.00000028, max_input_tokens: 65536, max_output_tokens: 8192, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'deepseek/deepseek-chat-v3.1', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000008, max_input_tokens: 163840, max_output_tokens: 163840, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'deepseek/deepseek-coder', input_cost_per_token: 0.00000014, output_cost_per_token: 0.00000028, max_input_tokens: 66000, max_output_tokens: 4096, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'deepseek/deepseek-r1', input_cost_per_token: 0.00000055, output_cost_per_token: 0.00000219, max_input_tokens: 65336, max_output_tokens: 8192, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'deepseek/deepseek-r1-0528', input_cost_per_token: 0.0000005, output_cost_per_token: 0.00000215, max_input_tokens: 65336, max_output_tokens: 8192, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'deepseek/deepseek-v3.2', input_cost_per_token: 0.00000028, output_cost_per_token: 0.0000004, max_input_tokens: 163840, max_output_tokens: 163840, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'deepseek/deepseek-v3.2-exp', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000004, max_input_tokens: 163840, max_output_tokens: 163840, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'fireworks/firellava-13b', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000002, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'google/gemini-2.0-flash-001', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'google/gemini-2.5-flash', input_cost_per_token: 0.0000003, output_cost_per_token: 0.0000025, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'google/gemini-2.5-pro', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 1048576, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'google/gemini-3-flash-preview', input_cost_per_token: 0.0000005, output_cost_per_token: 0.000003, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'google/gemini-3-pro-preview', input_cost_per_token: 0.000002, output_cost_per_token: 0.000012, max_input_tokens: 1048576, max_output_tokens: 65535, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'google/gemini-pro-1.5', input_cost_per_token: 0.0000025, output_cost_per_token: 0.0000075, max_input_tokens: 1000000, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'google/gemini-pro-vision', input_cost_per_token: 0.000000125, output_cost_per_token: 0.000000375, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'google/palm-2-chat-bison', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000005, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'google/palm-2-codechat-bison', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000005, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'gryphe/mythomax-l2-13b', input_cost_per_token: 0.000001875, output_cost_per_token: 0.000001875, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'jondurbin/airoboros-l2-70b-2.1', input_cost_per_token: 0.000013875, output_cost_per_token: 0.000013875, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'mancer/weaver', input_cost_per_token: 0.000005625, output_cost_per_token: 0.000005625, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'meta-llama/codellama-34b-instruct', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000005, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'meta-llama/llama-2-13b-chat', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000002, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'meta-llama/llama-2-70b-chat', input_cost_per_token: 0.0000015, output_cost_per_token: 0.0000015, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'meta-llama/llama-3-70b-instruct', input_cost_per_token: 0.00000059, output_cost_per_token: 0.00000079, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'meta-llama/llama-3-70b-instruct:nitro', input_cost_per_token: 0.0000009, output_cost_per_token: 0.0000009, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'meta-llama/llama-3-8b-instruct:extended', input_cost_per_token: 0.000000225, output_cost_per_token: 0.00000225, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'meta-llama/llama-3-8b-instruct:free', input_cost_per_token: 0, output_cost_per_token: 0, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'microsoft/wizardlm-2-8x22b:nitro', input_cost_per_token: 0.000001, output_cost_per_token: 0.000001, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'minimax/minimax-m2', input_cost_per_token: 0.000000255, output_cost_per_token: 0.00000102, max_input_tokens: 204800, max_output_tokens: 204800, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'minimax/minimax-m2.1', input_cost_per_token: 0.00000027, output_cost_per_token: 0.0000012, max_input_tokens: 204000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'mistralai/devstral-2512', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 262144, max_output_tokens: 65536, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/devstral-2512:free', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 262144, max_output_tokens: 262144, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/ministral-14b-2512', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000002, max_input_tokens: 262144, max_output_tokens: 262144, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/ministral-3b-2512', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000001, max_input_tokens: 131072, max_output_tokens: 131072, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/ministral-8b-2512', input_cost_per_token: 0.00000015, output_cost_per_token: 0.00000015, max_input_tokens: 262144, max_output_tokens: 262144, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct', input_cost_per_token: 0.00000013, output_cost_per_token: 0.00000013, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free', input_cost_per_token: 0, output_cost_per_token: 0, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/mistral-large', input_cost_per_token: 0.000008, output_cost_per_token: 0.000024, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/mistral-large-2512', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 262144, max_output_tokens: 262144, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/mistral-small-3.1-24b-instruct', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000003, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/mistral-small-3.2-24b-instruct', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000003, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'mistralai/mixtral-8x22b-instruct', input_cost_per_token: 0.00000065, output_cost_per_token: 0.00000065, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'moonshotai/kimi-k2.5', input_cost_per_token: 0.0000006, output_cost_per_token: 0.000003, max_input_tokens: 262144, max_output_tokens: 262144, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'nousresearch/nous-hermes-llama2-13b', input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000002, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'openai/gpt-3.5-turbo', input_cost_per_token: 0.0000015, output_cost_per_token: 0.000002, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-3.5-turbo-16k', input_cost_per_token: 0.000003, output_cost_per_token: 0.000004, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4', input_cost_per_token: 0.00003, output_cost_per_token: 0.00006, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4-vision-preview', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4.1', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4.1-2025-04-14', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4.1-mini', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000016, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4.1-mini-2025-04-14', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000016, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4.1-nano', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4.1-nano-2025-04-14', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4o', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-4o-2024-05-13', input_cost_per_token: 0.000005, output_cost_per_token: 0.000015, max_input_tokens: 128000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5-chat', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5-codex', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5-mini', input_cost_per_token: 0.00000025, output_cost_per_token: 0.000002, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5-nano', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000004, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5.2', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5.2-chat', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5.2-codex', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-5.2-pro', input_cost_per_token: 0.000021, output_cost_per_token: 0.000168, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-oss-120b', input_cost_per_token: 0.00000018, output_cost_per_token: 0.0000008, max_input_tokens: 131072, max_output_tokens: 32768, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/gpt-oss-20b', input_cost_per_token: 0.00000002, output_cost_per_token: 0.0000001, max_input_tokens: 131072, max_output_tokens: 32768, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/o1', input_cost_per_token: 0.000015, output_cost_per_token: 0.00006, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/o1-mini', input_cost_per_token: 0.000003, output_cost_per_token: 0.000012, max_input_tokens: 128000, max_output_tokens: 65536, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/o1-mini-2024-09-12', input_cost_per_token: 0.000003, output_cost_per_token: 0.000012, max_input_tokens: 128000, max_output_tokens: 65536, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/o1-preview', input_cost_per_token: 0.000015, output_cost_per_token: 0.00006, max_input_tokens: 128000, max_output_tokens: 32768, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/o1-preview-2024-09-12', input_cost_per_token: 0.000015, output_cost_per_token: 0.00006, max_input_tokens: 128000, max_output_tokens: 32768, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/o3-mini', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, max_input_tokens: 128000, max_output_tokens: 65536, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'openai/o3-mini-high', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, max_input_tokens: 128000, max_output_tokens: 65536, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'pygmalionai/mythalion-13b', input_cost_per_token: 0.000001875, output_cost_per_token: 0.000001875, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'qwen/qwen-2.5-coder-32b-instruct', input_cost_per_token: 0.00000018, output_cost_per_token: 0.00000018, max_input_tokens: 33792, max_output_tokens: 33792, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'qwen/qwen-vl-plus', input_cost_per_token: 0.00000021, output_cost_per_token: 0.00000063, max_input_tokens: 8192, max_output_tokens: 2048, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'qwen/qwen3-235b-a22b-2507', input_cost_per_token: 0.000000071, output_cost_per_token: 0.0000001, max_input_tokens: 262144, max_output_tokens: 262144, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'qwen/qwen3-235b-a22b-thinking-2507', input_cost_per_token: 0.00000011, output_cost_per_token: 0.0000006, max_input_tokens: 262144, max_output_tokens: 262144, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'qwen/qwen3-coder', input_cost_per_token: 0.00000022, output_cost_per_token: 0.00000095, max_input_tokens: 262100, max_output_tokens: 262100, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'switchpoint/router', input_cost_per_token: 0.00000085, output_cost_per_token: 0.0000034, max_input_tokens: 131072, max_output_tokens: 131072, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'undi95/remm-slerp-l2-13b', input_cost_per_token: 0.000001875, output_cost_per_token: 0.000001875, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'x-ai/grok-4', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 256000, max_output_tokens: 256000, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'x-ai/grok-4-fast:free', input_cost_per_token: 0, output_cost_per_token: 0, max_input_tokens: 2000000, max_output_tokens: 30000, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'xiaomi/mimo-v2-flash', input_cost_per_token: 0.00000009, output_cost_per_token: 0.00000029, max_input_tokens: 262144, max_output_tokens: 16384, supports_function_calling: true, supported_actions: 'completion' },

  { provider: 'openrouter', model: 'z-ai/glm-4.6', input_cost_per_token: 0.0000004, output_cost_per_token: 0.00000175, max_input_tokens: 202800, max_output_tokens: 131000, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'z-ai/glm-4.6:exacto', input_cost_per_token: 0.00000045, output_cost_per_token: 0.0000019, max_input_tokens: 202800, max_output_tokens: 131000, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'z-ai/glm-4.7', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000015, max_input_tokens: 202752, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
  { provider: 'openrouter', model: 'z-ai/glm-4.7-flash', input_cost_per_token: 0.00000007, output_cost_per_token: 0.0000004, max_input_tokens: 200000, max_output_tokens: 32000, supports_vision: true, supports_function_calling: true, supported_actions: 'completion' },
]

interface ImagePricingSeed {
  provider: string
  model: string
  quality: string
  size: string
  price_per_image: number
  max_images_per_request?: number
}

export const IMAGE_PRICING: ImagePricingSeed[] = [
  { provider: 'google', model: 'gemini-2.0-flash-exp-image-generation', quality: 'standard', size: 'default', price_per_image: 0.039000, max_images_per_request: 1 },
  { provider: 'google', model: 'gemini-2.5-flash-image', quality: 'standard', size: 'default', price_per_image: 0.039000, max_images_per_request: 1 },
  { provider: 'google', model: 'gemini-3-pro-image-preview', quality: 'standard', size: 'default', price_per_image: 0.134000, max_images_per_request: 1 },
  { provider: 'google', model: 'gemini-3.1-flash-image-preview', quality: 'standard', size: 'default', price_per_image: 0.045000, max_images_per_request: 1 },
  { provider: 'google', model: 'deep-research-pro-preview-12-2025', quality: 'standard', size: 'default', price_per_image: 0.134000, max_images_per_request: 1 },
  { provider: 'google', model: 'imagen-3.0-fast-generate-001', quality: 'standard', size: 'default', price_per_image: 0.020000, max_images_per_request: 1 },
  { provider: 'google', model: 'imagen-3.0-generate-001', quality: 'standard', size: 'default', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'google', model: 'imagen-3.0-generate-002', quality: 'standard', size: 'default', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'google', model: 'imagen-4.0-fast-generate-001', quality: 'standard', size: 'default', price_per_image: 0.020000, max_images_per_request: 1 },
  { provider: 'google', model: 'imagen-4.0-generate-001', quality: 'standard', size: 'default', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'google', model: 'imagen-4.0-ultra-generate-001', quality: 'standard', size: 'default', price_per_image: 0.060000, max_images_per_request: 1 },

  { provider: 'openai', model: 'dall-e-2', quality: 'standard', size: '1024x1024', price_per_image: 0.019923, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-2', quality: 'standard', size: '256x256', price_per_image: 0.016000, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-2', quality: 'standard', size: '512x512', price_per_image: 0.017983, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-2', quality: 'standard', size: 'default', price_per_image: 0.020000, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-3', quality: 'hd', size: '1024x1024', price_per_image: 0.079996, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-3', quality: 'hd', size: '1024x1792', price_per_image: 0.119991, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-3', quality: 'hd', size: '1792x1024', price_per_image: 0.119991, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-3', quality: 'standard', size: '1024x1024', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-3', quality: 'standard', size: '1024x1792', price_per_image: 0.079988, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-3', quality: 'standard', size: '1792x1024', price_per_image: 0.079988, max_images_per_request: 1 },
  { provider: 'openai', model: 'dall-e-3', quality: 'standard', size: 'default', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'high', size: '1024x1024', price_per_image: 0.167000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'high', size: '1024x1536', price_per_image: 0.250000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'high', size: '1536x1024', price_per_image: 0.250000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'low', size: '1024x1024', price_per_image: 0.011000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'low', size: '1024x1536', price_per_image: 0.016000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'low', size: '1536x1024', price_per_image: 0.016000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'medium', size: '1024x1024', price_per_image: 0.042000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'medium', size: '1024x1536', price_per_image: 0.063000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1', quality: 'medium', size: '1536x1024', price_per_image: 0.063000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1-mini', quality: 'low', size: '1024x1024', price_per_image: 0.005000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1-mini', quality: 'low', size: '1024x1536', price_per_image: 0.006000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1-mini', quality: 'low', size: '1536x1024', price_per_image: 0.006000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1-mini', quality: 'medium', size: '1024x1024', price_per_image: 0.011000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1-mini', quality: 'medium', size: '1024x1536', price_per_image: 0.015000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1-mini', quality: 'medium', size: '1536x1024', price_per_image: 0.015000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'high', size: '1024x1024', price_per_image: 0.133000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'high', size: '1024x1536', price_per_image: 0.200000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'high', size: '1536x1024', price_per_image: 0.200000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'low', size: '1024x1024', price_per_image: 0.009000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'low', size: '1024x1536', price_per_image: 0.013000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'low', size: '1536x1024', price_per_image: 0.013000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'medium', size: '1024x1024', price_per_image: 0.034000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'medium', size: '1024x1536', price_per_image: 0.050000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'medium', size: '1536x1024', price_per_image: 0.050000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'standard', size: '1024x1024', price_per_image: 0.009000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'standard', size: '1024x1536', price_per_image: 0.013000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5', quality: 'standard', size: '1536x1024', price_per_image: 0.013000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'high', size: '1024x1024', price_per_image: 0.133000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'high', size: '1024x1536', price_per_image: 0.200000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'high', size: '1536x1024', price_per_image: 0.200000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'low', size: '1024x1024', price_per_image: 0.009000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'low', size: '1024x1536', price_per_image: 0.013000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'low', size: '1536x1024', price_per_image: 0.013000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'medium', size: '1024x1024', price_per_image: 0.034000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'medium', size: '1024x1536', price_per_image: 0.050000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'medium', size: '1536x1024', price_per_image: 0.050000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'standard', size: '1024x1024', price_per_image: 0.009000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'standard', size: '1024x1536', price_per_image: 0.013000, max_images_per_request: 1 },
  { provider: 'openai', model: 'gpt-image-1.5-2025-12-16', quality: 'standard', size: '1536x1024', price_per_image: 0.013000, max_images_per_request: 1 },

  { provider: 'xai', model: 'grok-imagine-image', quality: 'standard', size: 'default', price_per_image: 0.020000, max_images_per_request: 10 },
  { provider: 'xai', model: 'grok-imagine-image-pro', quality: 'standard', size: 'default', price_per_image: 0.070000, max_images_per_request: 10 },

  { provider: 'vertex_ai', model: 'gemini-2.5-flash-image', quality: 'standard', size: 'default', price_per_image: 0.039000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'gemini-3-pro-image-preview', quality: 'standard', size: 'default', price_per_image: 0.134000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'gemini-3.1-flash-image-preview', quality: 'standard', size: 'default', price_per_image: 0.067200, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'deep-research-pro-preview-12-2025', quality: 'standard', size: 'default', price_per_image: 0.134000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'imagegeneration@006', quality: 'standard', size: 'default', price_per_image: 0.020000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'imagen-3.0-capability-001', quality: 'standard', size: 'default', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'imagen-3.0-fast-generate-001', quality: 'standard', size: 'default', price_per_image: 0.020000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'imagen-3.0-generate-001', quality: 'standard', size: 'default', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'imagen-3.0-generate-002', quality: 'standard', size: 'default', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'imagen-4.0-fast-generate-001', quality: 'standard', size: 'default', price_per_image: 0.020000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'imagen-4.0-generate-001', quality: 'standard', size: 'default', price_per_image: 0.040000, max_images_per_request: 1 },
  { provider: 'vertex_ai', model: 'imagen-4.0-ultra-generate-001', quality: 'standard', size: 'default', price_per_image: 0.060000, max_images_per_request: 1 },

  { provider: 'runwayml', model: 'gen4_image', quality: 'standard', size: 'default', price_per_image: 0.050000, max_images_per_request: 1 },
  { provider: 'runwayml', model: 'gen4_image_turbo', quality: 'standard', size: 'default', price_per_image: 0.020000, max_images_per_request: 1 },
]

export const MODEL_ALIASES: { alias: string; provider: string; canonical_model: string }[] = [
  { alias: 'gpt-4-latest', provider: 'openai', canonical_model: 'gpt-4o' },
  { alias: 'gpt-4o-latest', provider: 'openai', canonical_model: 'gpt-4o' },
  { alias: 'gpt-4o-mini-latest', provider: 'openai', canonical_model: 'gpt-4o-mini' },
  { alias: 'gpt-5-latest', provider: 'openai', canonical_model: 'gpt-5.2' },
  { alias: 'o1-latest', provider: 'openai', canonical_model: 'o1' },
  { alias: 'o3-latest', provider: 'openai', canonical_model: 'o3' },

  { alias: 'claude-3-sonnet', provider: 'anthropic', canonical_model: 'claude-3-sonnet-20240229' },
  { alias: 'claude-3-opus', provider: 'anthropic', canonical_model: 'claude-3-opus-20240229' },
  { alias: 'claude-3-haiku', provider: 'anthropic', canonical_model: 'claude-3-haiku-20240307' },
  { alias: 'claude-3.5-sonnet', provider: 'anthropic', canonical_model: 'claude-3-5-sonnet-20241022' },
  { alias: 'claude-3.5-haiku', provider: 'anthropic', canonical_model: 'claude-3-5-haiku-20241022' },
  { alias: 'claude-sonnet', provider: 'anthropic', canonical_model: 'claude-sonnet-4-5-20250929' },
  { alias: 'claude-opus', provider: 'anthropic', canonical_model: 'claude-opus-4-5-20251101' },
  { alias: 'claude-haiku', provider: 'anthropic', canonical_model: 'claude-haiku-4-5-20251001' },

  { alias: 'gemini-latest', provider: 'google', canonical_model: 'gemini-2.5-pro' },
  { alias: 'grok-latest', provider: 'xai', canonical_model: 'grok-4' },
  { alias: 'mistral-latest', provider: 'mistral', canonical_model: 'mistral-large-3' },
  { alias: 'kimi-latest', provider: 'moonshot', canonical_model: 'kimi-k2.5' },
  { alias: 'deepseek-latest', provider: 'deepseek', canonical_model: 'deepseek-chat' },
  { alias: 'qwen-latest', provider: 'dashscope', canonical_model: 'qwen-plus-latest' },
  { alias: 'openrouter-latest', provider: 'openrouter', canonical_model: 'anthropic/claude-sonnet-4.5' },
  { alias: 'vertex_ai-latest', provider: 'vertex_ai', canonical_model: 'gemini-2.5-pro' },
]

export const FALLBACK_PRICING = {
  openai: {
    input_cost_per_token: 0.00001,
    output_cost_per_token: 0.00003,
  },
  anthropic: {
    input_cost_per_token: 0.000015,
    output_cost_per_token: 0.000075,
  },
  google: {
    input_cost_per_token: 0.0000001,
    output_cost_per_token: 0.0000004,
  },
  xai: {
    input_cost_per_token: 0.000003,
    output_cost_per_token: 0.000015,
  },
  mistral: {
    input_cost_per_token: 0.0000005,
    output_cost_per_token: 0.0000015,
  },
  moonshot: {
    input_cost_per_token: 0.0000006,
    output_cost_per_token: 0.0000025,
  },
  deepseek: {
    input_cost_per_token: 0.00000028,
    output_cost_per_token: 0.0000004,
  },
  dashscope: {
    input_cost_per_token: 0.0000004,
    output_cost_per_token: 0.0000012,
  },
  openrouter: {
    input_cost_per_token: 0.000003,
    output_cost_per_token: 0.000015,
  },
  vertex_ai: {
    input_cost_per_token: 0.0000001,
    output_cost_per_token: 0.0000004,
  },
}

export function seedPricing(db: Database.Database): void {
  const insertPricing = db.prepare(`
    INSERT OR IGNORE INTO model_pricing (
      provider, model, input_cost_per_token, output_cost_per_token,
      cache_read_cost_per_token, max_input_tokens, max_output_tokens,
      supports_vision, supports_function_calling, supports_streaming,
      supported_actions,
      effective_from
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const insertImagePricing = db.prepare(`
    INSERT OR IGNORE INTO image_pricing (
      provider, model, quality, size,
      price_per_image, max_images_per_request,
      effective_from
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const insertAlias = db.prepare(`
    INSERT OR IGNORE INTO model_aliases (alias, provider, canonical_model)
    VALUES (?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    for (const pricing of OPENAI_PRICING) {
      insertPricing.run(
        pricing.provider,
        pricing.model,
        pricing.input_cost_per_token,
        pricing.output_cost_per_token,
        pricing.cache_read_cost_per_token || null,
        pricing.max_input_tokens || null,
        pricing.max_output_tokens || null,
        pricing.supports_vision ? 1 : 0,
        pricing.supports_function_calling ? 1 : 0,
        pricing.supports_streaming === false ? 0 : 1,
        pricing.supported_actions || 'completion'
      )
    }

    for (const pricing of ANTHROPIC_PRICING) {
      insertPricing.run(
        pricing.provider,
        pricing.model,
        pricing.input_cost_per_token,
        pricing.output_cost_per_token,
        pricing.cache_read_cost_per_token || null,
        pricing.max_input_tokens || null,
        pricing.max_output_tokens || null,
        pricing.supports_vision ? 1 : 0,
        pricing.supports_function_calling ? 1 : 0,
        pricing.supports_streaming === false ? 0 : 1,
        pricing.supported_actions || 'completion'
      )
    }

    for (const pricing of [...GOOGLE_PRICING, ...XAI_PRICING, ...MISTRAL_PRICING, ...MOONSHOT_PRICING, ...DEEPSEEK_PRICING, ...DASHSCOPE_PRICING, ...OPENROUTER_PRICING, ...VERTEX_AI_PRICING]) {
      insertPricing.run(
        pricing.provider,
        pricing.model,
        pricing.input_cost_per_token,
        pricing.output_cost_per_token,
        pricing.cache_read_cost_per_token || null,
        pricing.max_input_tokens || null,
        pricing.max_output_tokens || null,
        pricing.supports_vision ? 1 : 0,
        pricing.supports_function_calling ? 1 : 0,
        pricing.supports_streaming === false ? 0 : 1,
        pricing.supported_actions || 'completion'
      )
    }

    for (const alias of MODEL_ALIASES) {
      insertAlias.run(alias.alias, alias.provider, alias.canonical_model)
    }

    for (const imagePricing of IMAGE_PRICING) {
      insertImagePricing.run(
        imagePricing.provider,
        imagePricing.model,
        imagePricing.quality,
        imagePricing.size,
        imagePricing.price_per_image,
        imagePricing.max_images_per_request ?? 1
      )
    }
  })

  transaction()

}
