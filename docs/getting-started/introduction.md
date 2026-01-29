# Introduction

ZIRI is a proxy server that sits between your applications and LLM providers. Instead of calling OpenAI or Anthropic directly, your apps call ZIRI, which decides whether to allow the request based on policies you define.

## What Problem Does ZIRI Solve?

When you integrate LLM APIs directly into your application, you face several challenges:

- **No access control** - Anyone with an API key can use any model, regardless of cost or appropriateness
- **Cost overruns** - Hard to track spending per user or team, leading to surprise bills
- **Rate limiting** - No built-in way to limit how many requests each user can make
- **Audit trails** - No record of who used what model when, making compliance difficult
- **Policy management** - Can't enforce rules like "only use GPT-4 during business hours" or "research team can't use expensive models"

ZIRI solves these by acting as a gateway. Every request goes through ZIRI first, where it's checked against your policies, tracked for cost, rate-limited, and logged. Only authorized requests reach the actual LLM provider.

## How It Works

Here's the flow when your application makes a request:

1. Your app sends a request to ZIRI with an API key
2. ZIRI validates the API key and extracts user information
3. ZIRI estimates the cost of the request
4. ZIRI checks rate limits (requests per minute)
5. ZIRI checks if the user has available queue slots (concurrent requests)
6. ZIRI evaluates Cedar policies to decide if the request is allowed
7. If authorized, ZIRI forwards the request to the LLM provider
8. ZIRI tracks the actual cost and updates spending
9. ZIRI logs the entire decision process
10. Your app receives the response

All of this happens transparently. Your application code doesn't change—you just point it at ZIRI instead of the provider directly.

## Key Concepts

Before diving in, here are the main concepts you'll work with:

**Users** - People or services that make requests. Each user has attributes like department, email, and rate limits.

**API Keys** - Keys that identify users. Format: `sk-zs-{userId}-{hash}`. Each user gets an API key automatically.

**Policies** - Cedar policies that define what's allowed. Examples: "Engineering can use any model", "Research can only use embeddings", "Block requests outside business hours".


**Providers** - LLM providers like OpenAI and Anthropic. You configure their API keys in ZIRI, encrypted and stored securely.

**Rate Limits** - How many requests per minute each user or key can make. Enforced with sliding windows.

**Spend Limits** - Daily and monthly spending caps. Policies can check these before allowing requests.

## What You'll Learn

This documentation covers:

- **Getting Started** - Install ZIRI and make your first request
- **API Reference** - Complete documentation for all endpoints
- **SDK** - Use the client library in your applications
- **Configuration** - Set up providers, email, and other settings
- **Deployment** - Run ZIRI in production with Docker
- **Guides** - Step-by-step instructions for common tasks

## Next Steps

Ready to get started? Head to [Quick Start](/getting-started/quickstart) to install ZIRI and make your first request.
