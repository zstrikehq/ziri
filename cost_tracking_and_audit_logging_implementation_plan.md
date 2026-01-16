# ZS AI Gateway - Audit Logging & Cost Tracking Execution Plan V2

## Document Purpose
This execution plan is for a **coding agent** that has functional understanding of the ZS AI Gateway project. The agent will implement audit logging and cost tracking features, including database migrations, services, API endpoints, and UI updates.

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Database Schema](#database-schema)
3. [Model Pricing Data](#model-pricing-data)
4. [Spend Reset Logic](#spend-reset-logic)
5. [Spend Update Logic](#spend-update-logic)
6. [Service Layer Implementation](#service-layer-implementation)
7. [API Integration](#api-integration)
8. [UI Updates](#ui-updates)
9. [Implementation Phases](#implementation-phases)

---

## Overview & Architecture

### Problem
- No audit trail for authorization requests
- No cost tracking for LLM API usage
- No budget enforcement capabilities
- Dashboard, Logs, and Analytics pages show dummy data

### Solution
Implement comprehensive audit logging and cost tracking that:
1. Logs ALL authorization requests (permit and forbid)
2. Calculates costs based on token usage and model pricing
3. Updates UserKey entity spend values after each request
4. Resets daily/monthly spend at appropriate boundaries
5. Provides live data in UI pages

### Key Insight
**Neither OpenAI nor Anthropic returns cost in API responses** - only token counts.
Cost must be calculated: `cost = (input_tokens × input_cost_per_token) + (output_tokens × output_cost_per_token)`

### Request Flow (Updated)
```
1. Request arrives at /api/llm/chat
2. Validate API key
3. Load UserKey entity from database
4. **CHECK SPEND RESET** ← NEW (before Cedar auth)
   - If midnight crossed since last_daily_reset → reset daily spend
   - If month boundary crossed since last_monthly_reset → reset monthly spend
   - Update database if reset occurred
5. Build Cedar authorization context (with updated spend values)
6. Perform Cedar authorization (measure timing)
7. **LOG AUDIT ENTRY** (ALWAYS - regardless of decision)
8. If denied → return 403 with request_id
9. If permitted → make LLM request
10. Extract token usage from provider response
11. Calculate cost using PricingService
12. **UPDATE USERKEY SPEND** ← NEW (add to daily/monthly)
13. **LOG COST TRACKING ENTRY**
14. Update audit log with provider_request_id and cost_tracking_id
15. Return response with _meta.requestId and _meta.cost
```

---

## Database Schema

### Migration File: `packages/proxy/src/db/migrations/003_audit_cost_tracking.ts`

```typescript
import { Database } from 'better-sqlite3';

export function up(db: Database): void {
  // 1. model_pricing table
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_cost_per_token REAL NOT NULL,
      output_cost_per_token REAL NOT NULL,
      cache_write_cost_per_token REAL,
      cache_read_cost_per_token REAL,
      max_input_tokens INTEGER,
      max_output_tokens INTEGER,
      supports_vision INTEGER DEFAULT 0,
      supports_function_calling INTEGER DEFAULT 0,
      supports_streaming INTEGER DEFAULT 1,
      effective_from TEXT NOT NULL DEFAULT (datetime('now')),
      effective_until TEXT,
      source_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(provider, model, effective_from)
    )
  `);

  // 2. model_aliases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alias TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      canonical_model TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 3. audit_logs table - comprehensive authorization logging
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      
      -- Principal info
      principal TEXT NOT NULL,
      principal_type TEXT NOT NULL,
      auth_id TEXT,
      api_key_id TEXT,
      
      -- Request details
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      
      -- Decision
      decision TEXT NOT NULL CHECK (decision IN ('permit', 'forbid')),
      decision_reason TEXT,
      policies_evaluated TEXT,
      determining_policies TEXT,
      
      -- Request metadata
      request_ip TEXT,
      user_agent TEXT,
      request_method TEXT,
      request_path TEXT,
      request_body_hash TEXT,
      
      -- Cedar context
      cedar_context TEXT,
      entity_snapshot TEXT,
      
      -- Timing
      request_timestamp TEXT NOT NULL,
      auth_start_time TEXT,
      auth_end_time TEXT,
      auth_duration_ms INTEGER,
      
      -- Provider response (updated after LLM call)
      provider_request_id TEXT,
      cost_tracking_id INTEGER,
      
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 4. cost_tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cost_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      execution_key TEXT NOT NULL,
      audit_log_id INTEGER,
      
      -- Provider info
      provider TEXT NOT NULL,
      provider_request_id TEXT,
      
      -- Model info
      model_requested TEXT NOT NULL,
      model_used TEXT,
      
      -- Token counts
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      cached_tokens INTEGER DEFAULT 0,
      
      -- Costs (USD)
      input_cost REAL NOT NULL,
      output_cost REAL NOT NULL,
      cache_savings REAL DEFAULT 0,
      total_cost REAL NOT NULL,
      
      -- Pricing reference
      pricing_id INTEGER,
      pricing_source TEXT DEFAULT 'database',
      input_rate_used REAL,
      output_rate_used REAL,
      
      -- Timing
      request_timestamp TEXT NOT NULL,
      response_timestamp TEXT,
      latency_ms INTEGER,
      
      -- Status
      status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial', 'streaming')),
      error_code TEXT,
      error_message TEXT,
      
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      
      FOREIGN KEY (execution_key) REFERENCES user_agent_keys(id) ON DELETE CASCADE,
      FOREIGN KEY (audit_log_id) REFERENCES audit_logs(id) ON DELETE SET NULL,
      FOREIGN KEY (pricing_id) REFERENCES model_pricing(id) ON DELETE SET NULL
    )
  `);

  // Create indexes
  db.exec(`
    -- model_pricing indexes
    CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON model_pricing(provider);
    CREATE INDEX IF NOT EXISTS idx_model_pricing_provider_model ON model_pricing(provider, model);
    CREATE INDEX IF NOT EXISTS idx_model_pricing_effective ON model_pricing(effective_from, effective_until);

    -- audit_logs indexes
    CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_id ON audit_logs(auth_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_api_key_id ON audit_logs(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_decision ON audit_logs(decision);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_provider ON audit_logs(provider);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_model ON audit_logs(model);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(request_timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_decision_time ON audit_logs(auth_id, decision, request_timestamp);

    -- cost_tracking indexes
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_request_id ON cost_tracking(request_id);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_execution_key ON cost_tracking(execution_key);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_provider ON cost_tracking(provider);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_model ON cost_tracking(model_used);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp ON cost_tracking(request_timestamp);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_status ON cost_tracking(status);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_key_time ON cost_tracking(execution_key, request_timestamp);
  `);
}

export function down(db: Database): void {
  db.exec(`
    DROP TABLE IF EXISTS cost_tracking;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS model_aliases;
    DROP TABLE IF EXISTS model_pricing;
  `);
}
```

---

## Model Pricing Data

### Source
Pricing sourced from LiteLLM's `model_prices_and_context_window.json` (January 2026)

### Pricing Format
All costs are in **USD per token** (not per 1M tokens).

### OpenAI Models Pricing

Include ALL models from the provided OpenAI models list:

```typescript
// packages/proxy/src/db/seed-pricing.ts

interface ModelPricing {
  provider: string;
  model: string;
  input_cost_per_token: number;
  output_cost_per_token: number;
  cache_read_cost_per_token?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  supports_vision?: boolean;
  supports_function_calling?: boolean;
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
];
```

### Anthropic Models Pricing

```typescript
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
];
```

### Model Aliases

```typescript
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
];
```

### Fallback Pricing (for unknown models)

```typescript
export const FALLBACK_PRICING = {
  openai: {
    input_cost_per_token: 0.00001,   // GPT-4 Turbo tier
    output_cost_per_token: 0.00003,
  },
  anthropic: {
    input_cost_per_token: 0.000015,  // Claude Opus tier
    output_cost_per_token: 0.000075,
  },
};
```

---

## Spend Reset Logic

### Location: Before Cedar Authorization

The spend reset check MUST happen before Cedar authorization because:
1. Cedar policies may check `current_daily_spend` and `current_monthly_spend`
2. These values must be accurate at the time of authorization
3. If a reset is needed, the entity must be updated before the auth check

### Implementation

```typescript
// packages/proxy/src/services/spend-reset-service.ts

interface SpendResetResult {
  dailyReset: boolean;
  monthlyReset: boolean;
  updatedEntity: UserKeyEntity | null;
}

export class SpendResetService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Check if spend needs to be reset and perform reset if necessary.
   * This should be called BEFORE Cedar authorization.
   */
  async checkAndResetSpend(userKeyEntity: UserKeyEntity): Promise<SpendResetResult> {
    const now = new Date();
    const result: SpendResetResult = {
      dailyReset: false,
      monthlyReset: false,
      updatedEntity: null,
    };

    const lastDailyReset = new Date(userKeyEntity.attrs.last_daily_reset);
    const lastMonthlyReset = new Date(userKeyEntity.attrs.last_monthly_reset);

    // Check daily reset: has midnight (UTC) passed since last reset?
    const needsDailyReset = this.hasMidnightPassed(lastDailyReset, now);

    // Check monthly reset: has month boundary passed since last reset?
    const needsMonthlyReset = this.hasMonthBoundaryPassed(lastMonthlyReset, now);

    if (needsDailyReset || needsMonthlyReset) {
      const updatedAttrs = { ...userKeyEntity.attrs };
      const currentTimestamp = now.toISOString();

      if (needsDailyReset) {
        updatedAttrs.current_daily_spend = this.createDecimalValue('0.0000');
        updatedAttrs.last_daily_reset = currentTimestamp;
        result.dailyReset = true;
      }

      if (needsMonthlyReset) {
        updatedAttrs.current_monthly_spend = this.createDecimalValue('0.0000');
        updatedAttrs.last_monthly_reset = currentTimestamp;
        result.monthlyReset = true;
      }

      // Update entity in database
      const updatedEntity = {
        ...userKeyEntity,
        attrs: updatedAttrs,
      };

      await this.updateEntityInDatabase(updatedEntity);
      result.updatedEntity = updatedEntity;
    }

    return result;
  }

  /**
   * Check if midnight (UTC) has passed between two dates.
   * 
   * Example:
   * - last_daily_reset: 2026-01-16T13:28:22.565Z (Jan 16, 1:28 PM)
   * - now: 2026-01-17T01:30:00.000Z (Jan 17, 1:30 AM)
   * - Result: TRUE (midnight Jan 17 00:00:00 has passed)
   */
  private hasMidnightPassed(lastReset: Date, now: Date): boolean {
    // Get the date portion only (in UTC)
    const lastResetDate = new Date(Date.UTC(
      lastReset.getUTCFullYear(),
      lastReset.getUTCMonth(),
      lastReset.getUTCDate()
    ));
    
    const nowDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    // If now's date is greater than last reset's date, midnight has passed
    return nowDate.getTime() > lastResetDate.getTime();
  }

  /**
   * Check if month boundary has passed between two dates.
   * 
   * Example:
   * - last_monthly_reset: 2026-01-16T13:28:22.565Z (Jan 16)
   * - now: 2026-02-01T00:30:00.000Z (Feb 1)
   * - Result: TRUE (month changed from January to February)
   */
  private hasMonthBoundaryPassed(lastReset: Date, now: Date): boolean {
    const lastResetYear = lastReset.getUTCFullYear();
    const lastResetMonth = lastReset.getUTCMonth();
    
    const nowYear = now.getUTCFullYear();
    const nowMonth = now.getUTCMonth();

    // If year is greater, or same year but month is greater
    if (nowYear > lastResetYear) {
      return true;
    }
    if (nowYear === lastResetYear && nowMonth > lastResetMonth) {
      return true;
    }
    return false;
  }

  /**
   * Create Cedar decimal extension format with 4 decimal places.
   */
  private createDecimalValue(value: string): CedarDecimalValue {
    return {
      __extn: {
        fn: 'decimal',
        arg: value,
      },
    };
  }

  /**
   * Update the UserKey entity in the entities table.
   */
  private async updateEntityInDatabase(entity: UserKeyEntity): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE entities 
      SET ejson = ?, updated_at = datetime('now')
      WHERE etype = 'UserKey' AND eid = ?
    `);

    stmt.run(JSON.stringify(entity), entity.uid.id);
  }
}

// Type definitions
interface CedarDecimalValue {
  __extn: {
    fn: 'decimal';
    arg: string;
  };
}

interface UserKeyEntity {
  uid: {
    type: 'UserKey';
    id: string;
  };
  attrs: {
    current_daily_spend: CedarDecimalValue;
    current_monthly_spend: CedarDecimalValue;
    last_daily_reset: string;
    last_monthly_reset: string;
    status: string;
    user: {
      __entity: {
        type: 'User';
        id: string;
      };
    };
  };
  parents: any[];
  apiKey?: string;
  keyHash?: string;
  userKeyId?: string;
}
```

---

## Spend Update Logic

### Location: After Successful LLM Request

After a successful LLM request, we need to:
1. Calculate the cost based on token usage
2. Add the cost to `current_daily_spend`
3. Add the cost to `current_monthly_spend`
4. Update the UserKey entity in the database

### Implementation

```typescript
// packages/proxy/src/services/spend-update-service.ts

export class SpendUpdateService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Update the UserKey entity's spend values after a successful request.
   * 
   * @param userKeyId - The UserKey entity ID (e.g., "uk-c07c98871ecfe27f")
   * @param cost - The calculated cost in USD
   */
  async addSpend(userKeyId: string, cost: number): Promise<void> {
    // Fetch current entity
    const stmt = this.db.prepare(`
      SELECT ejson FROM entities 
      WHERE etype = 'UserKey' AND eid = ?
    `);
    const row = stmt.get(userKeyId) as { ejson: string } | undefined;

    if (!row) {
      throw new Error(`UserKey entity not found: ${userKeyId}`);
    }

    const entity: UserKeyEntity = JSON.parse(row.ejson);

    // Parse current spend values
    const currentDailySpend = parseFloat(entity.attrs.current_daily_spend.__extn.arg);
    const currentMonthlySpend = parseFloat(entity.attrs.current_monthly_spend.__extn.arg);

    // Add cost to both
    const newDailySpend = currentDailySpend + cost;
    const newMonthlySpend = currentMonthlySpend + cost;

    // Update with 4 decimal places
    entity.attrs.current_daily_spend = this.createDecimalValue(newDailySpend.toFixed(4));
    entity.attrs.current_monthly_spend = this.createDecimalValue(newMonthlySpend.toFixed(4));

    // Save back to database
    const updateStmt = this.db.prepare(`
      UPDATE entities 
      SET ejson = ?, updated_at = datetime('now')
      WHERE etype = 'UserKey' AND eid = ?
    `);

    updateStmt.run(JSON.stringify(entity), userKeyId);
  }

  private createDecimalValue(value: string): CedarDecimalValue {
    return {
      __extn: {
        fn: 'decimal',
        arg: value,
      },
    };
  }
}
```

---

## Service Layer Implementation

### PricingService

```typescript
// packages/proxy/src/services/pricing-service.ts

interface CostCalculation {
  inputCost: number;
  outputCost: number;
  cacheSavings: number;
  totalCost: number;
  pricingSource: 'database' | 'fallback';
  inputRateUsed: number;
  outputRateUsed: number;
  pricingId?: number;
}

export class PricingService {
  private db: Database;
  private cache: Map<string, ModelPricing> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(db: Database) {
    this.db = db;
  }

  async getPricing(provider: string, model: string): Promise<ModelPricing | null> {
    // Check cache freshness
    if (Date.now() - this.cacheTimestamp > this.CACHE_TTL_MS) {
      this.cache.clear();
      this.cacheTimestamp = Date.now();
    }

    const cacheKey = `${provider}:${model}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 1. Try exact match
    let pricing = await this.findPricing(provider, model);

    // 2. Try alias resolution
    if (!pricing) {
      const alias = this.db.prepare(
        'SELECT canonical_model FROM model_aliases WHERE alias = ? AND provider = ?'
      ).get(model, provider) as { canonical_model: string } | undefined;

      if (alias) {
        pricing = await this.findPricing(provider, alias.canonical_model);
      }
    }

    // 3. Try partial matching (for date-suffixed models)
    if (!pricing) {
      pricing = await this.findPartialMatch(provider, model);
    }

    if (pricing) {
      this.cache.set(cacheKey, pricing);
    }

    return pricing;
  }

  async calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number = 0
  ): Promise<CostCalculation> {
    const pricing = await this.getPricing(provider, model);

    if (pricing) {
      const inputCost = inputTokens * pricing.input_cost_per_token;
      const outputCost = outputTokens * pricing.output_cost_per_token;
      
      let cacheSavings = 0;
      if (cachedTokens > 0 && pricing.cache_read_cost_per_token) {
        const fullInputCost = cachedTokens * pricing.input_cost_per_token;
        const cachedCost = cachedTokens * pricing.cache_read_cost_per_token;
        cacheSavings = fullInputCost - cachedCost;
      }

      return {
        inputCost,
        outputCost,
        cacheSavings,
        totalCost: inputCost + outputCost - cacheSavings,
        pricingSource: 'database',
        inputRateUsed: pricing.input_cost_per_token,
        outputRateUsed: pricing.output_cost_per_token,
        pricingId: pricing.id,
      };
    }

    // Fallback pricing
    const fallback = FALLBACK_PRICING[provider as keyof typeof FALLBACK_PRICING] 
      || FALLBACK_PRICING.openai;

    return {
      inputCost: inputTokens * fallback.input_cost_per_token,
      outputCost: outputTokens * fallback.output_cost_per_token,
      cacheSavings: 0,
      totalCost: (inputTokens * fallback.input_cost_per_token) + (outputTokens * fallback.output_cost_per_token),
      pricingSource: 'fallback',
      inputRateUsed: fallback.input_cost_per_token,
      outputRateUsed: fallback.output_cost_per_token,
    };
  }

  private async findPricing(provider: string, model: string): Promise<ModelPricing | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM model_pricing 
      WHERE provider = ? AND model = ? 
      AND effective_from <= datetime('now')
      AND (effective_until IS NULL OR effective_until > datetime('now'))
      ORDER BY effective_from DESC
      LIMIT 1
    `);
    return stmt.get(provider, model) as ModelPricing | null;
  }

  private async findPartialMatch(provider: string, model: string): Promise<ModelPricing | null> {
    // Try to match without date suffix (e.g., gpt-4o-2024-08-06 -> gpt-4o)
    const baseModel = model.replace(/-\d{4}-\d{2}-\d{2}$/, '');
    if (baseModel !== model) {
      return this.findPricing(provider, baseModel);
    }
    return null;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp = 0;
  }
}
```

### AuditLogService

```typescript
// packages/proxy/src/services/audit-log-service.ts

import crypto from 'crypto';

interface AuditLogEntry {
  requestId: string;
  principal: string;
  principalType: string;
  authId?: string;
  apiKeyId?: string;
  action: string;
  resource: string;
  provider?: string;
  model?: string;
  decision: 'permit' | 'forbid';
  decisionReason?: string;
  policiesEvaluated?: string[];
  determiningPolicies?: string[];
  requestIp?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  requestBodyHash?: string;
  cedarContext?: object;
  entitySnapshot?: object;
  requestTimestamp: string;
  authStartTime?: string;
  authEndTime?: string;
  authDurationMs?: number;
}

export class AuditLogService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `req_${timestamp}_${random}`;
  }

  hashRequestBody(body: any): string {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHash('sha256').update(bodyString).digest('hex');
  }

  async log(entry: AuditLogEntry): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        request_id, principal, principal_type, auth_id, api_key_id,
        action, resource, provider, model,
        decision, decision_reason, policies_evaluated, determining_policies,
        request_ip, user_agent, request_method, request_path, request_body_hash,
        cedar_context, entity_snapshot,
        request_timestamp, auth_start_time, auth_end_time, auth_duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.requestId,
      entry.principal,
      entry.principalType,
      entry.authId || null,
      entry.apiKeyId || null,
      entry.action,
      entry.resource,
      entry.provider || null,
      entry.model || null,
      entry.decision,
      entry.decisionReason || null,
      entry.policiesEvaluated ? JSON.stringify(entry.policiesEvaluated) : null,
      entry.determiningPolicies ? JSON.stringify(entry.determiningPolicies) : null,
      entry.requestIp || null,
      entry.userAgent || null,
      entry.requestMethod || null,
      entry.requestPath || null,
      entry.requestBodyHash || null,
      entry.cedarContext ? JSON.stringify(entry.cedarContext) : null,
      entry.entitySnapshot ? JSON.stringify(entry.entitySnapshot) : null,
      entry.requestTimestamp,
      entry.authStartTime || null,
      entry.authEndTime || null,
      entry.authDurationMs || null
    );

    return result.lastInsertRowid as number;
  }

  async updateWithProviderResponse(
    requestId: string,
    providerRequestId: string,
    costTrackingId: number
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE audit_logs 
      SET provider_request_id = ?, cost_tracking_id = ?
      WHERE request_id = ?
    `);
    stmt.run(providerRequestId, costTrackingId, requestId);
  }

  async query(params: {
    authId?: string;
    apiKeyId?: string;
    provider?: string;
    model?: string;
    decision?: 'permit' | 'forbid';
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const args: any[] = [];

    if (params.authId) {
      sql += ' AND auth_id = ?';
      args.push(params.authId);
    }
    if (params.apiKeyId) {
      sql += ' AND api_key_id = ?';
      args.push(params.apiKeyId);
    }
    if (params.provider) {
      sql += ' AND provider = ?';
      args.push(params.provider);
    }
    if (params.model) {
      sql += ' AND model = ?';
      args.push(params.model);
    }
    if (params.decision) {
      sql += ' AND decision = ?';
      args.push(params.decision);
    }
    if (params.startDate) {
      sql += ' AND request_timestamp >= ?';
      args.push(params.startDate);
    }
    if (params.endDate) {
      sql += ' AND request_timestamp <= ?';
      args.push(params.endDate);
    }

    sql += ' ORDER BY request_timestamp DESC';
    sql += ` LIMIT ${params.limit || 100} OFFSET ${params.offset || 0}`;

    return this.db.prepare(sql).all(...args) as AuditLogEntry[];
  }

  async getStatistics(startDate?: string, endDate?: string): Promise<object> {
    let whereClause = '1=1';
    const args: any[] = [];

    if (startDate) {
      whereClause += ' AND request_timestamp >= ?';
      args.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND request_timestamp <= ?';
      args.push(endDate);
    }

    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN decision = 'permit' THEN 1 ELSE 0 END) as permit_count,
        SUM(CASE WHEN decision = 'forbid' THEN 1 ELSE 0 END) as forbid_count,
        AVG(auth_duration_ms) as avg_auth_duration_ms,
        provider,
        model
      FROM audit_logs
      WHERE ${whereClause}
      GROUP BY provider, model
    `).all(...args);

    return stats;
  }
}
```

### CostTrackingService

```typescript
// packages/proxy/src/services/cost-tracking-service.ts

interface CostTrackingEntry {
  requestId: string;
  executionKey: string;
  auditLogId?: number;
  provider: string;
  providerRequestId?: string;
  modelRequested: string;
  modelUsed?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
  inputCost: number;
  outputCost: number;
  cacheSavings?: number;
  totalCost: number;
  pricingId?: number;
  pricingSource: string;
  inputRateUsed: number;
  outputRateUsed: number;
  requestTimestamp: string;
  responseTimestamp?: string;
  latencyMs?: number;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
}

export class CostTrackingService {
  private db: Database;
  private pricingService: PricingService;
  private spendUpdateService: SpendUpdateService;

  constructor(db: Database, pricingService: PricingService, spendUpdateService: SpendUpdateService) {
    this.db = db;
    this.pricingService = pricingService;
    this.spendUpdateService = spendUpdateService;
  }

  async trackCost(entry: Omit<CostTrackingEntry, 'inputCost' | 'outputCost' | 'cacheSavings' | 'totalCost' | 'pricingId' | 'pricingSource' | 'inputRateUsed' | 'outputRateUsed'>): Promise<number> {
    // Calculate cost
    const costCalc = await this.pricingService.calculateCost(
      entry.provider,
      entry.modelUsed || entry.modelRequested,
      entry.inputTokens,
      entry.outputTokens,
      entry.cachedTokens || 0
    );

    // Insert into cost_tracking table
    const stmt = this.db.prepare(`
      INSERT INTO cost_tracking (
        request_id, execution_key, audit_log_id,
        provider, provider_request_id,
        model_requested, model_used,
        input_tokens, output_tokens, total_tokens, cached_tokens,
        input_cost, output_cost, cache_savings, total_cost,
        pricing_id, pricing_source, input_rate_used, output_rate_used,
        request_timestamp, response_timestamp, latency_ms,
        status, error_code, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.requestId,
      entry.executionKey,
      entry.auditLogId || null,
      entry.provider,
      entry.providerRequestId || null,
      entry.modelRequested,
      entry.modelUsed || null,
      entry.inputTokens,
      entry.outputTokens,
      entry.totalTokens,
      entry.cachedTokens || 0,
      costCalc.inputCost,
      costCalc.outputCost,
      costCalc.cacheSavings,
      costCalc.totalCost,
      costCalc.pricingId || null,
      costCalc.pricingSource,
      costCalc.inputRateUsed,
      costCalc.outputRateUsed,
      entry.requestTimestamp,
      entry.responseTimestamp || null,
      entry.latencyMs || null,
      entry.status || 'completed',
      entry.errorCode || null,
      entry.errorMessage || null
    );

    // Update UserKey entity spend
    // Extract userKeyId from executionKey (the API key record has userKeyId)
    const keyRecord = this.db.prepare(
      'SELECT id FROM user_agent_keys WHERE id = ?'
    ).get(entry.executionKey);

    if (keyRecord) {
      // Get the UserKey ID from the entities table by looking up via the key
      const entityStmt = this.db.prepare(`
        SELECT eid FROM entities 
        WHERE etype = 'UserKey' 
        AND ejson LIKE ?
      `);
      const entityRow = entityStmt.get(`%"apiKey"%${entry.executionKey}%`) as { eid: string } | undefined;
      
      if (entityRow) {
        await this.spendUpdateService.addSpend(entityRow.eid, costCalc.totalCost);
      }
    }

    return result.lastInsertRowid as number;
  }

  async getCostSummary(query: {
    executionKey?: string;
    provider?: string;
    model?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'provider' | 'model' | 'user';
  }): Promise<object[]> {
    // Implementation for cost summary queries
    let sql = `
      SELECT 
        COUNT(*) as request_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost_per_request
    `;

    const args: any[] = [];
    let whereClause = '1=1';

    if (query.executionKey) {
      whereClause += ' AND execution_key = ?';
      args.push(query.executionKey);
    }
    if (query.provider) {
      whereClause += ' AND provider = ?';
      args.push(query.provider);
    }
    if (query.model) {
      whereClause += ' AND model_used = ?';
      args.push(query.model);
    }
    if (query.startDate) {
      whereClause += ' AND request_timestamp >= ?';
      args.push(query.startDate);
    }
    if (query.endDate) {
      whereClause += ' AND request_timestamp <= ?';
      args.push(query.endDate);
    }

    let groupByClause = '';
    if (query.groupBy === 'day') {
      sql += `, date(request_timestamp) as period`;
      groupByClause = 'GROUP BY date(request_timestamp)';
    } else if (query.groupBy === 'provider') {
      sql += `, provider`;
      groupByClause = 'GROUP BY provider';
    } else if (query.groupBy === 'model') {
      sql += `, model_used`;
      groupByClause = 'GROUP BY model_used';
    }

    sql += ` FROM cost_tracking WHERE ${whereClause} ${groupByClause}`;

    return this.db.prepare(sql).all(...args);
  }
}
```

---

## API Integration

### Updated Chat Route

Location: `packages/proxy/src/routes/chat.ts`

```typescript
// Key changes to the chat route handler:

export async function handleChatRequest(req: Request, res: Response) {
  const requestStartTime = Date.now();
  
  // 1. Generate request ID
  const requestId = auditLogService.generateRequestId();
  
  // 2. Extract and validate API key
  const apiKey = req.headers['x-api-key'];
  // ... existing validation ...
  
  // 3. Load UserKey entity
  const userKeyEntity = await loadUserKeyEntity(apiKeyRecord.userKeyId);
  
  // 4. **CHECK SPEND RESET** (BEFORE Cedar auth)
  const spendResetResult = await spendResetService.checkAndResetSpend(userKeyEntity);
  const activeEntity = spendResetResult.updatedEntity || userKeyEntity;
  
  // 5. Build Cedar authorization context (use activeEntity with reset values)
  const cedarContext = buildCedarContext(req, activeEntity);
  
  // 6. Perform Cedar authorization
  const authStartTime = Date.now();
  const authResult = await cedarService.authorize(cedarRequest);
  const authEndTime = Date.now();
  const authDurationMs = authEndTime - authStartTime;
  
  // 7. **LOG AUDIT ENTRY** (ALWAYS - regardless of decision)
  const auditLogId = await auditLogService.log({
    requestId,
    principal: `UserKey::"${activeEntity.uid.id}"`,
    principalType: 'UserKey',
    authId: apiKeyRecord.authId,
    apiKeyId: apiKeyRecord.id,
    action: 'completion',
    resource: `Resource::"${model}"`,
    provider,
    model,
    decision: authResult.decision,
    decisionReason: authResult.reason,
    policiesEvaluated: authResult.policiesEvaluated,
    determiningPolicies: authResult.determiningPolicies,
    requestIp: req.ip,
    userAgent: req.headers['user-agent'],
    requestMethod: req.method,
    requestPath: req.path,
    requestBodyHash: auditLogService.hashRequestBody(req.body),
    cedarContext,
    entitySnapshot: activeEntity.attrs,
    requestTimestamp: new Date().toISOString(),
    authStartTime: new Date(authStartTime).toISOString(),
    authEndTime: new Date(authEndTime).toISOString(),
    authDurationMs,
  });
  
  // 8. If denied, return 403
  if (authResult.decision === 'forbid') {
    return res.status(403).json({
      error: 'Authorization denied',
      requestId,
      reason: authResult.reason,
    });
  }
  
  // 9. Make LLM request
  const llmRequestStartTime = Date.now();
  const llmResponse = await llmService.chat(provider, model, messages);
  const llmResponseTime = Date.now();
  
  // 10. Extract token usage
  const usage = extractUsage(llmResponse, provider);
  // OpenAI: response.usage.{prompt_tokens, completion_tokens, total_tokens, prompt_tokens_details.cached_tokens}
  // Anthropic: response.usage.{input_tokens, output_tokens, cache_read_input_tokens}
  
  // 11. **TRACK COST** (calculates cost, saves entry, updates UserKey spend)
  const costTrackingId = await costTrackingService.trackCost({
    requestId,
    executionKey: apiKeyRecord.id,
    auditLogId,
    provider,
    providerRequestId: llmResponse.id, // chatcmpl-xxx or msg_xxx
    modelRequested: model,
    modelUsed: llmResponse.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    cachedTokens: usage.cachedTokens,
    requestTimestamp: new Date(llmRequestStartTime).toISOString(),
    responseTimestamp: new Date(llmResponseTime).toISOString(),
    latencyMs: llmResponseTime - llmRequestStartTime,
    status: 'completed',
  });
  
  // 12. Update audit log with provider response info
  await auditLogService.updateWithProviderResponse(requestId, llmResponse.id, costTrackingId);
  
  // 13. Return response with metadata
  return res.json({
    ...llmResponse,
    _meta: {
      requestId,
      cost: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens,
        totalCost: costCalc.totalCost,
      },
    },
  });
}

// Token extraction helper
function extractUsage(response: any, provider: string): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens: number;
} {
  if (provider === 'openai') {
    return {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      cachedTokens: response.usage?.prompt_tokens_details?.cached_tokens || 0,
    };
  } else if (provider === 'anthropic') {
    return {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      cachedTokens: response.usage?.cache_read_input_tokens || 0,
    };
  }
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedTokens: 0 };
}
```

---

## UI Updates

### IMPORTANT: Replace Dummy Data with Live Data

The Dashboard, Logs, and Analytics pages currently show **dummy/mock data**. These must be updated to show **live data** from the new tables.

### Files to Update

1. **`packages/ui/pages/index.vue`** (Dashboard)
2. **`packages/ui/pages/logs.vue`** (Logs)
3. **`packages/ui/pages/analytics.vue`** (Analytics)

### Dashboard Page Updates (`packages/ui/pages/index.vue`)

**Current State:** Shows dummy metrics like "1,234 requests", "$123.45 cost", etc.

**Required Changes:**

1. **Remove all dummy/mock data**
2. **Add API calls to fetch live data:**

```typescript
// In <script setup>
const { data: stats } = await useFetch('/api/stats/overview');
const { data: recentLogs } = await useFetch('/api/audit?limit=10');
const { data: costSummary } = await useFetch('/api/costs/summary?groupBy=day&startDate=' + last7Days);
```

3. **Display live metrics:**
   - Total requests (from audit_logs count)
   - Permit/Forbid ratio
   - Total cost (from cost_tracking sum)
   - Recent activity (from audit_logs)
   - Cost trend chart (from cost_tracking grouped by day)

### Logs Page Updates (`packages/ui/pages/logs.vue`)

**Current State:** Shows hardcoded/dummy log entries.

**Required Changes:**

1. **Remove dummy log entries**
2. **Fetch from audit_logs table:**

```typescript
const { data: logs, refresh } = await useFetch('/api/audit', {
  query: {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    provider: filterProvider,
    decision: filterDecision,
    startDate: filterStartDate,
    endDate: filterEndDate,
  }
});
```

3. **Add filtering UI:**
   - Provider filter (OpenAI, Anthropic)
   - Decision filter (permit, forbid)
   - Date range picker
   - Search by request ID

4. **Display columns:**
   - Request ID (clickable for details)
   - Timestamp
   - Principal
   - Provider
   - Model
   - Decision (with color coding)
   - Duration
   - Cost (if permit)

5. **Add detail modal/drawer** showing:
   - Full Cedar context
   - Policies evaluated
   - Entity snapshot
   - Linked cost tracking entry

### Analytics Page Updates (`packages/ui/pages/analytics.vue`)

**Current State:** Shows dummy charts and statistics.

**Required Changes:**

1. **Remove dummy data**
2. **Fetch from cost_tracking and audit_logs:**

```typescript
// Cost by provider
const { data: costByProvider } = await useFetch('/api/costs/summary?groupBy=provider');

// Cost by model
const { data: costByModel } = await useFetch('/api/costs/summary?groupBy=model');

// Daily trend
const { data: dailyCost } = await useFetch('/api/costs/summary?groupBy=day&startDate=' + last30Days);

// Auth statistics
const { data: authStats } = await useFetch('/api/audit/statistics');
```

3. **Add charts:**
   - Cost over time (line chart)
   - Cost by provider (pie chart)
   - Cost by model (bar chart)
   - Requests over time (area chart)
   - Permit vs Forbid ratio (donut chart)
   - Average latency by provider (bar chart)

4. **Add summary cards:**
   - Total cost (period)
   - Total requests
   - Average cost per request
   - Top models by usage
   - Top users by spend

### New API Endpoints for UI

Create new routes for the UI:

```typescript
// packages/proxy/src/routes/stats.ts
router.get('/api/stats/overview', adminAuthMiddleware, async (req, res) => {
  const totalRequests = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();
  const permitCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE decision = ?').get('permit');
  const forbidCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE decision = ?').get('forbid');
  const totalCost = db.prepare('SELECT SUM(total_cost) as sum FROM cost_tracking').get();
  
  res.json({
    totalRequests: totalRequests.count,
    permitCount: permitCount.count,
    forbidCount: forbidCount.count,
    totalCost: totalCost.sum || 0,
  });
});
```

---

## Implementation Phases

### Phase 1: Database & Foundation (Week 1)
**Estimated Time: 24 hours**

- [ ] Create migration `003_audit_cost_tracking.ts`
- [ ] Create seed script with all pricing data
- [ ] Seed OpenAI models (100+ models)
- [ ] Seed Anthropic models (15+ models)
- [ ] Seed model aliases
- [ ] Test migration up/down
- [ ] Verify indexes

### Phase 2: Service Layer (Week 2)
**Estimated Time: 32 hours**

- [ ] Implement SpendResetService
- [ ] Implement SpendUpdateService
- [ ] Implement PricingService (with caching)
- [ ] Implement AuditLogService
- [ ] Implement CostTrackingService
- [ ] Write unit tests for all services
- [ ] Test spend reset logic edge cases

### Phase 3: Integration (Week 3)
**Estimated Time: 30 hours**

- [ ] Update chat route with audit logging
- [ ] Update chat route with cost tracking
- [ ] Add spend reset check before Cedar auth
- [ ] Add spend update after successful request
- [ ] Create admin API endpoints for pricing
- [ ] Create admin API endpoints for audit logs
- [ ] Create admin API endpoints for cost reports
- [ ] Integration tests

### Phase 4: UI Updates (Week 4)
**Estimated Time: 36 hours**

- [ ] Update Dashboard page (remove dummy data, add API calls)
- [ ] Update Logs page (remove dummy data, add filtering)
- [ ] Update Analytics page (remove dummy data, add charts)
- [ ] Add Pricing Management page
- [ ] End-to-end testing
- [ ] Documentation

---

## File Checklist

### New Files to Create:
- [ ] `packages/proxy/src/db/migrations/003_audit_cost_tracking.ts`
- [ ] `packages/proxy/src/db/seed-pricing.ts`
- [ ] `packages/proxy/src/services/pricing-service.ts`
- [ ] `packages/proxy/src/services/audit-log-service.ts`
- [ ] `packages/proxy/src/services/cost-tracking-service.ts`
- [ ] `packages/proxy/src/services/spend-reset-service.ts`
- [ ] `packages/proxy/src/services/spend-update-service.ts`
- [ ] `packages/proxy/src/routes/pricing.ts`
- [ ] `packages/proxy/src/routes/audit.ts`
- [ ] `packages/proxy/src/routes/costs.ts`
- [ ] `packages/proxy/src/routes/stats.ts`
- [ ] `packages/proxy/src/__tests__/pricing-service.test.ts`
- [ ] `packages/proxy/src/__tests__/spend-reset-service.test.ts`
- [ ] `packages/proxy/src/__tests__/audit-cost-tracking.integration.test.ts`

### Files to Modify:
- [ ] `packages/proxy/src/routes/chat.ts` (add audit & cost tracking)
- [ ] `packages/proxy/src/index.ts` (import new routes)
- [ ] `packages/proxy/src/server.ts` (register new routes)
- [ ] `packages/ui/pages/index.vue` (Dashboard - live data)
- [ ] `packages/ui/pages/logs.vue` (Logs - live data)
- [ ] `packages/ui/pages/analytics.vue` (Analytics - live data)

---

## Testing Checklist

### Unit Tests
- [ ] PricingService: Exact model match
- [ ] PricingService: Alias resolution
- [ ] PricingService: Partial match (date suffix)
- [ ] PricingService: Fallback pricing
- [ ] PricingService: Cache invalidation
- [ ] SpendResetService: Daily reset at midnight
- [ ] SpendResetService: Monthly reset at month boundary
- [ ] SpendResetService: No reset needed
- [ ] SpendResetService: Both resets needed
- [ ] SpendUpdateService: Add spend correctly
- [ ] SpendUpdateService: 4 decimal precision
- [ ] AuditLogService: Log creation
- [ ] CostTrackingService: Cost calculation accuracy

### Integration Tests
- [ ] Chat route: Successful request with audit + cost tracking
- [ ] Chat route: Denied request with audit but no cost tracking
- [ ] Chat route: Spend reset triggers before auth
- [ ] Chat route: Spend updated after request
- [ ] Request ID propagation through entire flow
- [ ] Provider request ID captured correctly

### E2E Tests
- [ ] Dashboard shows live statistics
- [ ] Logs page shows audit entries
- [ ] Analytics page shows cost charts
- [ ] Filters work correctly on all pages

---

## Verification Commands

After implementation, run these to verify:

```bash
# Check tables exist
sqlite3 data/database.sqlite ".tables"

# Check pricing seeded
sqlite3 data/database.sqlite "SELECT COUNT(*) FROM model_pricing"

# Check audit logs
sqlite3 data/database.sqlite "SELECT COUNT(*) FROM audit_logs"

# Check cost tracking
sqlite3 data/database.sqlite "SELECT SUM(total_cost) FROM cost_tracking"

# Run tests
npm run test
```

---

## Notes for Coding Agent

1. **Spend Reset**: This MUST happen BEFORE Cedar authorization. The Cedar policies check `current_daily_spend` and `current_monthly_spend`, so they must be accurate.

2. **Decimal Format**: Always use Cedar decimal extension format with 4 decimal places:
   ```json
   { "__extn": { "fn": "decimal", "arg": "0.0000" } }
   ```

3. **Reset Timestamps**: When a reset occurs, set `last_daily_reset` and `last_monthly_reset` to the **current timestamp**, NOT to midnight or first-of-month.

4. **UI Dummy Data**: Look for any hardcoded arrays, mock data, or placeholder values in the Vue components and replace them with API calls.

5. **Error Handling**: All services should have proper error handling and logging.

6. **Transaction Safety**: Consider using database transactions for operations that update multiple tables.

---

*Document Version: 2.0*
*Created: January 19, 2026*
*For: ZS AI Gateway Coding Agent*