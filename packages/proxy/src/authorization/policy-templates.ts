export interface PolicyTemplate {
  id: string
  category: string
  title: string
  description: string
  policy: string
}

export const policyTemplates: PolicyTemplate[] = [
  {
    "id": "basic-allow-user",
    "category": "Basic Access",
    "title": "Allow all actions for a specific user key",
    "description": "Grants full access to all actions for a specific user key. Useful for testing or granting admin-level access to individual users.",
    "policy": "@id(\"basic-allow-user\")\npermit (\n    principal == UserKey::\"uk_alice_production\",\n    action,\n    resource\n);"
  },
  {
    "id": "allow-completion-active-keys",
    "category": "Basic Access",
    "title": "Allow completion for active user keys",
    "description": "Allows completion action for any user key with active status. This is a common default policy for production environments.",
    "policy": "@id(\"allow-completion-active-keys\")\npermit (\n    principal,\n    action == Action::\"completion\",\n    resource\n)\nwhen {\n    principal.status == \"active\"\n};"
  },
  {
    "id": "engineering-full-access",
    "category": "tenant-Based",
    "title": "Full access for Engineering tenant",
    "description": "Grants complete access to all actions for users in the Engineering tenant with active status.",
    "policy": "@id(\"engineering-full-access\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.user.tenant == \"engineering\" &&\n    principal.status == \"active\"\n};"
  },
  {
    "id": "research-limited-access",
    "category": "tenant-Based",
    "title": "Limited access for Research tenant",
    "description": "Restricts Research tenant to only completion and embedding actions. Prevents access to expensive operations like fine-tuning or image generation.",
    "policy": "@id(\"research-limited-access\")\npermit (\n    principal,\n    action in [Action::\"completion\", Action::\"embedding\"],\n    resource\n)\nwhen {\n    principal.user.tenant == \"research\" &&\n    principal.status == \"active\"\n};"
  },
  {
    "id": "corporate-network-access",
    "category": "IP Address Based",
    "title": "Allow access from corporate network",
    "description": "Restricts access to requests originating from the corporate network CIDR range (10.0.0.0/8). Enhances security by blocking external IPs.",
    "policy": "@id(\"corporate-network-access\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    context.ip_address.isInRange(ip(\"10.0.0.0/8\"))\n};"
  },
  {
    "id": "multi-office-network-access",
    "category": "IP Address Based",
    "title": "Allow access from multiple office networks",
    "description": "Allows access from multiple corporate office IP ranges. Useful for organizations with multiple office locations.",
    "policy": "@id(\"multi-office-network-access\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    (\n        context.ip_address.isInRange(ip(\"10.0.0.0/8\")) ||\n        context.ip_address.isInRange(ip(\"172.16.0.0/12\")) ||\n        context.ip_address.isInRange(ip(\"192.168.0.0/16\"))\n    )\n};"
  },
  {
    "id": "business-hours-only",
    "category": "Time-Based",
    "title": "Business hours only (9 AM - 6 PM)",
    "description": "Restricts access to business hours (9 AM to 6 PM). Useful for cost control and ensuring operations during standard working hours.",
    "policy": "@id(\"business-hours-only\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    context.hour >= 9 &&\n    context.hour < 18\n};"
  },
  {
    "id": "business-hours-weekdays",
    "category": "Time-Based",
    "title": "Business hours on weekdays only",
    "description": "Combines business hours restriction with weekday-only access. Prevents weekend usage while allowing full access during weekday business hours.",
    "policy": "@id(\"business-hours-weekdays\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    context.hour >= 9 &&\n    context.hour < 18 &&\n    context.day_of_week != \"Saturday\" &&\n    context.day_of_week != \"Sunday\"\n};"
  },
  {
    "id": "openai-only",
    "category": "Model Provider Based",
    "title": "Allow only OpenAI models",
    "description": "Restricts access to OpenAI provider only. Useful when you want to standardize on a single provider or have specific agreements.",
    "policy": "@id(\"openai-only\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    context.model_provider == \"openai\"\n};"
  },
  {
    "id": "approved-providers",
    "category": "Model Provider Based",
    "title": "Allow multiple approved providers",
    "description": "Allows access to multiple approved providers (OpenAI, Anthropic, Google). Provides flexibility while maintaining control over provider selection.",
    "policy": "@id(\"approved-providers\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    (\n        context.model_provider == \"openai\" ||\n        context.model_provider == \"anthropic\" ||\n        context.model_provider == \"google\"\n    )\n};"
  },
  {
    "id": "gpt-models-only",
    "category": "Model-Specific",
    "title": "Allow only specific GPT models",
    "description": "Restricts completion actions to specific GPT models (gpt-4, gpt-4-turbo, gpt-4o, gpt-4o-mini). Prevents usage of older or more expensive models.",
    "policy": "@id(\"gpt-models-only\")\npermit (\n    principal,\n    action == Action::\"completion\",\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    (\n        context.model_name == \"gpt-4\" ||\n        context.model_name == \"gpt-4-turbo\" ||\n        context.model_name == \"gpt-4o\" ||\n        context.model_name == \"gpt-4o-mini\"\n    )\n};"
  },
  {
    "id": "forbid-premium-models",
    "category": "Model-Specific",
    "title": "Forbid expensive premium models",
    "description": "Blocks access to expensive premium models for non-executive and non-ML engineering tenants. Helps control costs by preventing accidental usage of high-cost models.",
    "policy": "@id(\"forbid-premium-models\")\nforbid (\n    principal,\n    action == Action::\"completion\",\n    resource\n)\nwhen {\n    principal.user.tenant != \"executive\" &&\n    principal.user.tenant != \"ml_engineering\" &&\n    (\n        context.model_name == \"gpt-4\" ||\n        context.model_name == \"gpt-4-32k\" ||\n        context.model_name == \"claude-3-opus-20240229\" ||\n        context.model_name == \"o1-preview\"\n    )\n};"
  },
  {
    "id": "daily-spend-limit-100",
    "category": "Spend Limit",
    "title": "Daily spend limit - $100",
    "description": "Allows access only when daily spend is below $100. Prevents budget overruns by blocking requests once the daily limit is reached.",
    "policy": "@id(\"daily-spend-limit-100\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    principal.current_daily_spend.lessThan(decimal(\"100.0\"))\n};"
  },
  {
    "id": "combined-spend-limits",
    "category": "Spend Limit",
    "title": "Combined daily and monthly limits",
    "description": "Enforces both daily ($100) and monthly ($1000) spend limits. Provides comprehensive budget control at multiple time scales.",
    "policy": "@id(\"combined-spend-limits\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.status == \"active\" &&\n    principal.current_daily_spend.lessThan(decimal(\"100.0\")) &&\n    principal.current_monthly_spend.lessThan(decimal(\"1000.0\"))\n};"
  },
  {
    "id": "agent-high-rate",
    "category": "Agent/Service Account",
    "title": "Allow agents with high rate limits",
    "description": "Grants access to service accounts (agents) that have high rate limits (100+ requests per minute). Useful for automated systems and integrations.",
    "policy": "@id(\"agent-high-rate\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.user.is_agent == true &&\n    principal.status == \"active\" &&\n    principal.user.limit_requests_per_minute >= 100\n};"
  },
  {
    "id": "agent-limited-actions",
    "category": "Agent/Service Account",
    "title": "Restrict agents to specific actions",
    "description": "Allows service accounts to use only completion and embedding actions. Prevents agents from performing expensive operations like fine-tuning or image generation.",
    "policy": "@id(\"agent-limited-actions\")\npermit (\n    principal,\n    action in [Action::\"completion\", Action::\"embedding\"],\n    resource\n)\nwhen {\n    principal.user.is_agent == true &&\n    principal.status == \"active\"\n};"
  },
  {
    "id": "role-admin-full-access",
    "category": "Role-Based",
    "title": "Full access for admin role",
    "description": "Allows all actions for users that have the admin_llm Cedar role. Use when you assign the admin_llm role to privileged access users.",
    "policy": "@id(\"role-admin-full-access\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.user in Role::\"admin_llm\" &&\n    principal.status == \"active\"\n};"
  },
  {
    "id": "role-analyst-limited-actions",
    "category": "Role-Based",
    "title": "Completion and embedding only for analyst role",
    "description": "Restricts users with the analyst role to completion and embedding actions only.",
    "policy": "@id(\"role-analyst-limited-actions\")\npermit (\n    principal,\n    action in [Action::\"completion\", Action::\"embedding\"],\n    resource\n)\nwhen {\n    principal.user in Role::\"analyst\" &&\n    principal.status == \"active\"\n};"
  },
  {
    "id": "role-engineer-tenant-scoped",
    "category": "Role-Based",
    "title": "Engineer role with tenant restriction",
    "description": "Allows full access for users in the engineer role and engineering tenant.",
    "policy": "@id(\"role-engineer-tenant-scoped\")\npermit (\n    principal,\n    action,\n    resource\n)\nwhen {\n    principal.user in Role::\"engineer\" &&\n    principal.user.tenant == \"engineering\" &&\n    principal.status == \"active\"\n};"
  }
]
