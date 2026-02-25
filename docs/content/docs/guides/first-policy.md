---
title: Creating Your First Policy
weight: 30
---

Step-by-step guide to creating your first Cedar policy.

## Why Policies Matter

By default, ZIRI denies all requests. You need at least one policy that permits requests, otherwise users can't make any LLM calls.

## Step 1: Understand What You Need

Before creating a policy, decide:

-   Who should have access? (all users, specific departments, etc.)
-   What actions? (completion, embedding, image_generation)
-   Any restrictions? (time, IP, spend limits, models)

## Step 2: Start Simple

Begin with a simple policy that allows completions for active keys:

```cedar {filename="policy.cedar"}
@id("allow-completion-active-keys")
permit (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.status == "active"
};
```

This allows any active user key to make completion requests.

## Step 3: Create the Policy

### Via UI

1. Go to **Rules** page
2. Click **Create Rule**
3. Paste the policy text
4. Add description: "Allow completions for active keys"
5. Click **Create**

### Via API

```bash
curl -X POST http://localhost:3100/api/policies \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "@id(\"allow-completion-active-keys\") permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };",
    "description": "Allow completions for active keys"
  }'
```

## Step 4: Test the Policy

Make a test request:

```bash
curl -X POST http://localhost:3100/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-zs-user-123-abc456" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

If authorized, you'll get a response. If denied, check the error message.

## Step 5: Check Audit Logs

1. Go to **Logs** page
2. Find your request
3. Check the decision and diagnostics

## Step 6: Refine the Policy

Add restrictions as needed:

### Add Tenant Restriction

```cedar
permit (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.status == "active" &&
    principal.user.tenant == "engineering"
};
```

### Add Spend Limit

```cedar
permit (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.status == "active" &&
    principal.current_daily_spend.lessThan(decimal("100.0"))
};
```

### Add Time Restriction

```cedar
permit (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.status == "active" &&
    context.hour >= 9 &&
    context.hour < 18
};
```

## Common Mistakes

### Forgetting Status Check

Always check `principal.status == "active"`:

```cedar
// Bad - allows revoked keys
permit (principal, action, resource);

// Good - only active keys
permit (principal, action, resource)
when { principal.status == "active" };
```

### Wrong Action Name

```cedar
// Bad
action == "chat"

// Good
action == Action::"completion"
```

### Wrong Decimal Format

```cedar
// Bad
principal.current_daily_spend < 100.0

// Good
principal.current_daily_spend.lessThan(decimal("100.0"))
```

### Missing Quotes

```cedar
// Bad
principal.user.tenant == engineering

// Good
principal.user.tenant == "engineering"
```

## Using Templates

1. Go to **Rules** page
2. Click **Templates**
3. Browse templates
4. Click **Use this template**
5. Modify as needed
6. Save

Templates are pre-written policies you can customize.

## Testing Policies

1. Create the policy
2. Make a test request
3. Check audit logs
4. Verify the decision matches expectations
5. Adjust policy if needed

## Next Steps

-   [Policy Examples](/docs/guides/policy-examples)
-   [Policy API](/docs/api-reference/admin-endpoints/policies)
