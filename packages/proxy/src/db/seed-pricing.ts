// Seed model pricing data from LiteLLM's pricing database
// All costs are in USD per token (not per 1M tokens)

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
}

export const OPENAI_PRICING: ModelPricing[] = [
  // GPT-3.5 Series
  { provider: 'openai', model: 'gpt-3.5-turbo', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 16385, max_output_tokens: 4096, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-3.5-turbo-0125', input_cost_per_token: 0.0000005, output_cost_per_token: 0.0000015, max_input_tokens: 16385, max_output_tokens: 4096, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-3.5-turbo-1106', input_cost_per_token: 0.000001, output_cost_per_token: 0.000002, max_input_tokens: 16385, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-3.5-turbo-16k', input_cost_per_token: 0.000003, output_cost_per_token: 0.000004, max_input_tokens: 16385, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-3.5-turbo-instruct', input_cost_per_token: 0.0000015, output_cost_per_token: 0.000002, max_input_tokens: 4097, max_output_tokens: 4097 },
  { provider: 'openai', model: 'gpt-3.5-turbo-instruct-0914', input_cost_per_token: 0.0000015, output_cost_per_token: 0.000002, max_input_tokens: 4097, max_output_tokens: 4097 },

  // GPT-4 Series
  { provider: 'openai', model: 'gpt-4', input_cost_per_token: 0.00003, output_cost_per_token: 0.00006, max_input_tokens: 8192, max_output_tokens: 4096, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4-0613', input_cost_per_token: 0.00003, output_cost_per_token: 0.00006, max_input_tokens: 8192, max_output_tokens: 4096, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4-turbo', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4-turbo-2024-04-09', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4-turbo-preview', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-4-0125-preview', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-4-1106-preview', input_cost_per_token: 0.00001, output_cost_per_token: 0.00003, max_input_tokens: 128000, max_output_tokens: 4096 },

  // GPT-4o Series
  { provider: 'openai', model: 'gpt-4o', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.00000125, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4o-2024-05-13', input_cost_per_token: 0.000005, output_cost_per_token: 0.000015, max_input_tokens: 128000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4o-2024-08-06', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.00000125, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4o-2024-11-20', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.00000125, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'chatgpt-4o-latest', input_cost_per_token: 0.000005, output_cost_per_token: 0.000015, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true },

  // GPT-4o Mini Series
  { provider: 'openai', model: 'gpt-4o-mini', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, cache_read_cost_per_token: 0.000000075, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4o-mini-2024-07-18', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, cache_read_cost_per_token: 0.000000075, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true, supports_function_calling: true },

  // GPT-4.1 Series (April 2025)
  { provider: 'openai', model: 'gpt-4.1', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, cache_read_cost_per_token: 0.0000005, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4.1-2025-04-14', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, cache_read_cost_per_token: 0.0000005, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4.1-mini', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000016, cache_read_cost_per_token: 0.0000001, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4.1-mini-2025-04-14', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000016, cache_read_cost_per_token: 0.0000001, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4.1-nano', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, cache_read_cost_per_token: 0.000000025, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-4.1-nano-2025-04-14', input_cost_per_token: 0.0000001, output_cost_per_token: 0.0000004, cache_read_cost_per_token: 0.000000025, max_input_tokens: 1047576, max_output_tokens: 32768, supports_vision: true, supports_function_calling: true },

  // GPT-5 Series (August 2025)
  { provider: 'openai', model: 'gpt-5', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.000000125, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5-2025-08-07', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.000000125, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5-chat-latest', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true },
  { provider: 'openai', model: 'gpt-5-mini', input_cost_per_token: 0.00000025, output_cost_per_token: 0.000002, cache_read_cost_per_token: 0.000000025, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5-mini-2025-08-07', input_cost_per_token: 0.00000025, output_cost_per_token: 0.000002, cache_read_cost_per_token: 0.000000025, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5-nano', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000004, cache_read_cost_per_token: 0.000000005, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5-nano-2025-08-07', input_cost_per_token: 0.00000005, output_cost_per_token: 0.0000004, cache_read_cost_per_token: 0.000000005, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5-pro', input_cost_per_token: 0.000015, output_cost_per_token: 0.00012, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5-pro-2025-10-06', input_cost_per_token: 0.000015, output_cost_per_token: 0.00012, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5-codex', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 400000, max_output_tokens: 128000, supports_function_calling: true },

  // GPT-5.1 Series (November 2025)
  { provider: 'openai', model: 'gpt-5.1', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.000000125, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5.1-2025-11-13', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, cache_read_cost_per_token: 0.000000125, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5.1-chat-latest', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 128000, supports_vision: true },
  { provider: 'openai', model: 'gpt-5.1-codex', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5.1-codex-mini', input_cost_per_token: 0.00000025, output_cost_per_token: 0.000002, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5.1-codex-max', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true },

  // GPT-5.2 Series (December 2025)
  { provider: 'openai', model: 'gpt-5.2', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, cache_read_cost_per_token: 0.000000175, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5.2-2025-12-11', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, cache_read_cost_per_token: 0.000000175, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5.2-chat-latest', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, max_input_tokens: 128000, max_output_tokens: 16384, supports_vision: true },
  { provider: 'openai', model: 'gpt-5.2-pro', input_cost_per_token: 0.000021, output_cost_per_token: 0.000168, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5.2-pro-2025-12-11', input_cost_per_token: 0.000021, output_cost_per_token: 0.000168, max_input_tokens: 272000, max_output_tokens: 128000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'gpt-5.2-codex', input_cost_per_token: 0.00000175, output_cost_per_token: 0.000014, max_input_tokens: 272000, max_output_tokens: 128000, supports_function_calling: true },

  // O1 Series (Reasoning Models)
  { provider: 'openai', model: 'o1', input_cost_per_token: 0.000015, output_cost_per_token: 0.00006, cache_read_cost_per_token: 0.0000075, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'o1-2024-12-17', input_cost_per_token: 0.000015, output_cost_per_token: 0.00006, cache_read_cost_per_token: 0.0000075, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'o1-mini', input_cost_per_token: 0.000003, output_cost_per_token: 0.000012, cache_read_cost_per_token: 0.0000015, max_input_tokens: 128000, max_output_tokens: 65536, supports_function_calling: true },
  { provider: 'openai', model: 'o1-pro', input_cost_per_token: 0.00015, output_cost_per_token: 0.0006, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true },
  { provider: 'openai', model: 'o1-pro-2025-03-19', input_cost_per_token: 0.00015, output_cost_per_token: 0.0006, max_input_tokens: 200000, max_output_tokens: 100000, supports_vision: true, supports_function_calling: true },

  // O3 Series
  { provider: 'openai', model: 'o3', input_cost_per_token: 0.00001, output_cost_per_token: 0.00004, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true },
  { provider: 'openai', model: 'o3-2025-04-16', input_cost_per_token: 0.00001, output_cost_per_token: 0.00004, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true },
  { provider: 'openai', model: 'o3-mini', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, cache_read_cost_per_token: 0.00000055, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true },
  { provider: 'openai', model: 'o3-mini-2025-01-31', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, cache_read_cost_per_token: 0.00000055, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true },

  // O4 Series
  { provider: 'openai', model: 'o4-mini', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true },
  { provider: 'openai', model: 'o4-mini-2025-04-16', input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true },
  { provider: 'openai', model: 'o4-mini-deep-research', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, max_input_tokens: 200000, max_output_tokens: 100000 },
  { provider: 'openai', model: 'o4-mini-deep-research-2025-06-26', input_cost_per_token: 0.000002, output_cost_per_token: 0.000008, max_input_tokens: 200000, max_output_tokens: 100000 },

  // Audio/Realtime Models
  { provider: 'openai', model: 'gpt-4o-audio-preview', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-4o-audio-preview-2024-12-17', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-4o-realtime-preview', input_cost_per_token: 0.000005, output_cost_per_token: 0.00002, max_input_tokens: 128000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-4o-realtime-preview-2024-12-17', input_cost_per_token: 0.000005, output_cost_per_token: 0.00002, max_input_tokens: 128000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-4o-mini-realtime-preview', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-4o-mini-realtime-preview-2024-12-17', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-4o-mini-audio-preview', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-4o-mini-audio-preview-2024-12-17', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-audio', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-audio-2025-08-28', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-audio-mini', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-audio-mini-2025-10-06', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-realtime', input_cost_per_token: 0.000004, output_cost_per_token: 0.000016, max_input_tokens: 32000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-realtime-2025-08-28', input_cost_per_token: 0.000004, output_cost_per_token: 0.000016, max_input_tokens: 32000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-realtime-mini', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 32000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-realtime-mini-2025-10-06', input_cost_per_token: 0.0000006, output_cost_per_token: 0.0000024, max_input_tokens: 32000, max_output_tokens: 4096 },
  { provider: 'openai', model: 'gpt-4o-mini-tts', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 16000 },
  { provider: 'openai', model: 'gpt-4o-mini-tts-2025-03-20', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 16000 },
  { provider: 'openai', model: 'gpt-4o-mini-tts-2025-12-15', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 16000 },

  // Search Models
  { provider: 'openai', model: 'gpt-4o-search-preview', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-4o-search-preview-2025-03-11', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-4o-mini-search-preview', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-4o-mini-search-preview-2025-03-11', input_cost_per_token: 0.00000015, output_cost_per_token: 0.0000006, max_input_tokens: 128000, max_output_tokens: 16384 },
  { provider: 'openai', model: 'gpt-5-search-api', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000 },
  { provider: 'openai', model: 'gpt-5-search-api-2025-10-14', input_cost_per_token: 0.00000125, output_cost_per_token: 0.00001, max_input_tokens: 272000, max_output_tokens: 128000 },

  // Transcribe Models
  { provider: 'openai', model: 'gpt-4o-transcribe', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 2000 },
  { provider: 'openai', model: 'gpt-4o-mini-transcribe', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 16000, max_output_tokens: 2000 },
  { provider: 'openai', model: 'gpt-4o-mini-transcribe-2025-03-20', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 16000, max_output_tokens: 2000 },
  { provider: 'openai', model: 'gpt-4o-mini-transcribe-2025-12-15', input_cost_per_token: 0.00000125, output_cost_per_token: 0.000005, max_input_tokens: 16000, max_output_tokens: 2000 },
  { provider: 'openai', model: 'gpt-4o-transcribe-diarize', input_cost_per_token: 0.0000025, output_cost_per_token: 0.00001, max_input_tokens: 16000, max_output_tokens: 2000 },

  // Codex Models
  { provider: 'openai', model: 'codex-mini-latest', input_cost_per_token: 0.0000015, output_cost_per_token: 0.000006, max_input_tokens: 200000, max_output_tokens: 100000, supports_function_calling: true },

  // Embedding Models
  { provider: 'openai', model: 'text-embedding-3-small', input_cost_per_token: 0.00000002, output_cost_per_token: 0, max_input_tokens: 8191, max_output_tokens: 0 },
  { provider: 'openai', model: 'text-embedding-3-large', input_cost_per_token: 0.00000013, output_cost_per_token: 0, max_input_tokens: 8191, max_output_tokens: 0 },
  { provider: 'openai', model: 'text-embedding-ada-002', input_cost_per_token: 0.0000001, output_cost_per_token: 0, max_input_tokens: 8191, max_output_tokens: 0 },

  // Legacy/Completion Models
  { provider: 'openai', model: 'davinci-002', input_cost_per_token: 0.000002, output_cost_per_token: 0.000002, max_input_tokens: 16384, max_output_tokens: 4096 },
  { provider: 'openai', model: 'babbage-002', input_cost_per_token: 0.0000004, output_cost_per_token: 0.0000004, max_input_tokens: 16384, max_output_tokens: 4096 },
]

export const ANTHROPIC_PRICING: ModelPricing[] = [
  // Claude 3.5 Series
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20240620', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, cache_read_cost_per_token: 0.0000003, max_input_tokens: 200000, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', input_cost_per_token: 0.0000008, output_cost_per_token: 0.000004, cache_read_cost_per_token: 0.00000008, max_input_tokens: 200000, max_output_tokens: 8192, supports_function_calling: true },

  // Claude 3.7 Series
  { provider: 'anthropic', model: 'claude-3-7-sonnet-20250219', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, cache_read_cost_per_token: 0.0000003, max_input_tokens: 200000, max_output_tokens: 8192, supports_vision: true, supports_function_calling: true },

  // Claude 3 Series
  { provider: 'anthropic', model: 'claude-3-opus-20240229', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true },
  { provider: 'anthropic', model: 'claude-3-sonnet-20240229', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307', input_cost_per_token: 0.00000025, output_cost_per_token: 0.00000125, max_input_tokens: 200000, max_output_tokens: 4096, supports_vision: true, supports_function_calling: true },

  // Claude 4 Series (Sonnet)
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, cache_read_cost_per_token: 0.0000003, max_input_tokens: 200000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true },
  { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, cache_read_cost_per_token: 0.0000003, max_input_tokens: 200000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true },

  // Claude 4 Series (Opus)
  { provider: 'anthropic', model: 'claude-opus-4-20250514', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, cache_read_cost_per_token: 0.0000015, max_input_tokens: 200000, max_output_tokens: 32000, supports_vision: true, supports_function_calling: true },
  { provider: 'anthropic', model: 'claude-opus-4-1-20250805', input_cost_per_token: 0.000015, output_cost_per_token: 0.000075, cache_read_cost_per_token: 0.0000015, max_input_tokens: 200000, max_output_tokens: 32000, supports_vision: true, supports_function_calling: true },

  // Claude 4.5 Series
  { provider: 'anthropic', model: 'claude-opus-4-5-20251101', input_cost_per_token: 0.000005, output_cost_per_token: 0.000025, cache_read_cost_per_token: 0.0000005, max_input_tokens: 200000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', input_cost_per_token: 0.000001, output_cost_per_token: 0.000005, cache_read_cost_per_token: 0.0000001, max_input_tokens: 200000, max_output_tokens: 64000, supports_vision: true, supports_function_calling: true },

  // Legacy Models
  { provider: 'anthropic', model: 'claude-2.1', input_cost_per_token: 0.000008, output_cost_per_token: 0.000024, max_input_tokens: 100000, max_output_tokens: 4096 },
  { provider: 'anthropic', model: 'claude-2.0', input_cost_per_token: 0.000008, output_cost_per_token: 0.000024, max_input_tokens: 100000, max_output_tokens: 4096 },
  { provider: 'anthropic', model: 'claude-instant-1.2', input_cost_per_token: 0.0000008, output_cost_per_token: 0.0000024, max_input_tokens: 100000, max_output_tokens: 8191 },
]

export const MODEL_ALIASES: { alias: string; provider: string; canonical_model: string }[] = [
  // OpenAI Aliases
  { alias: 'gpt-4-latest', provider: 'openai', canonical_model: 'gpt-4o' },
  { alias: 'gpt-4o-latest', provider: 'openai', canonical_model: 'gpt-4o' },
  { alias: 'gpt-4o-mini-latest', provider: 'openai', canonical_model: 'gpt-4o-mini' },
  { alias: 'gpt-5-latest', provider: 'openai', canonical_model: 'gpt-5.2' },
  { alias: 'o1-latest', provider: 'openai', canonical_model: 'o1' },
  { alias: 'o3-latest', provider: 'openai', canonical_model: 'o3' },
  
  // Anthropic Aliases
  { alias: 'claude-3-sonnet', provider: 'anthropic', canonical_model: 'claude-3-sonnet-20240229' },
  { alias: 'claude-3-opus', provider: 'anthropic', canonical_model: 'claude-3-opus-20240229' },
  { alias: 'claude-3-haiku', provider: 'anthropic', canonical_model: 'claude-3-haiku-20240307' },
  { alias: 'claude-3.5-sonnet', provider: 'anthropic', canonical_model: 'claude-3-5-sonnet-20241022' },
  { alias: 'claude-3.5-haiku', provider: 'anthropic', canonical_model: 'claude-3-5-haiku-20241022' },
  { alias: 'claude-sonnet', provider: 'anthropic', canonical_model: 'claude-sonnet-4-5-20250929' },
  { alias: 'claude-opus', provider: 'anthropic', canonical_model: 'claude-opus-4-5-20251101' },
  { alias: 'claude-haiku', provider: 'anthropic', canonical_model: 'claude-haiku-4-5-20251001' },
]

export const FALLBACK_PRICING = {
  openai: {
    input_cost_per_token: 0.00001,   // GPT-4 Turbo tier
    output_cost_per_token: 0.00003,
  },
  anthropic: {
    input_cost_per_token: 0.000015,  // Claude Opus tier
    output_cost_per_token: 0.000075,
  },
}

export function seedPricing(db: Database.Database): void {
  console.log('[SEED] Seeding model pricing data...')
  
  const insertPricing = db.prepare(`
    INSERT OR IGNORE INTO model_pricing (
      provider, model, input_cost_per_token, output_cost_per_token,
      cache_read_cost_per_token, max_input_tokens, max_output_tokens,
      supports_vision, supports_function_calling, supports_streaming,
      effective_from
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const insertAlias = db.prepare(`
    INSERT OR IGNORE INTO model_aliases (alias, provider, canonical_model)
    VALUES (?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    // Seed OpenAI pricing
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
        1 // supports_streaming
      )
    }

    // Seed Anthropic pricing
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
        1 // supports_streaming
      )
    }

    // Seed aliases
    for (const alias of MODEL_ALIASES) {
      insertAlias.run(alias.alias, alias.provider, alias.canonical_model)
    }
  })

  transaction()
  
  const openaiCount = db.prepare('SELECT COUNT(*) as count FROM model_pricing WHERE provider = ?').get('openai') as { count: number }
  const anthropicCount = db.prepare('SELECT COUNT(*) as count FROM model_pricing WHERE provider = ?').get('anthropic') as { count: number }
  const aliasCount = db.prepare('SELECT COUNT(*) as count FROM model_aliases').get() as { count: number }
  
  console.log(`[SEED] ✅ Seeded ${openaiCount.count} OpenAI models, ${anthropicCount.count} Anthropic models, ${aliasCount.count} aliases`)
}
