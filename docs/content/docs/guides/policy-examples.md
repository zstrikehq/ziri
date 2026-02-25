---
title: Policy Examples
weight: 10
---

Real-world Cedar policy examples you can use as starting points.

## Basic Access Policies

### Allow All Actions for Active Keys

Allow any action for keys with active status:

```cedar {filename="policy.cedar"}
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active"
};
```

**Use case**: Default policy for most users.

### Allow Completion for Active Keys

Allow only completion action:

```cedar
permit (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.status == "active"
};
```

**Use case**: Restrict users to chat completions only.

## Tenant-Based Policies

### Full Access for Engineering

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.user.tenant == "engineering" &&
    principal.status == "active"
};
```

**Use case**: Engineering tenant needs access to all features.

### Limited Access for Research

```cedar
permit (
    principal,
    action in [Action::"completion", Action::"embedding"],
    resource
)
when {
    principal.user.tenant == "research" &&
    principal.status == "active"
};
```

**Use case**: Research tenant doesn't need image generation or fine-tuning.

## Role-Based Policies

### Full Access for Admin Role

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.user in Role::"admin" &&
    principal.status == "active"
};
```

**Use case**: Grant complete access to users assigned the `admin` role.

### Analysts Can Only Run Completions and Embeddings

```cedar
permit (
    principal,
    action in [Action::"completion", Action::"embedding"],
    resource
)
when {
    principal.user in Role::"analyst" &&
    principal.status == "active"
};
```

**Use case**: Restrict an analyst role to lower-risk actions.

## IP Address Restrictions

### Corporate Network Only

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active" &&
    context.ip_address.isInRange(ip("10.0.0.0/8"))
};
```

**Use case**: Block external IPs for security.

### Multiple Office Networks

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active" &&
    (
        context.ip_address.isInRange(ip("10.0.0.0/8")) ||
        context.ip_address.isInRange(ip("172.16.0.0/12")) ||
        context.ip_address.isInRange(ip("192.168.0.0/16"))
    )
};
```

**Use case**: Multiple office locations with different IP ranges.

## Time-Based Policies

### Business Hours Only

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active" &&
    context.hour >= 9 &&
    context.hour < 18
};
```

**Use case**: Prevent usage outside business hours.

### Business Hours on Weekdays

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active" &&
    context.hour >= 9 &&
    context.hour < 18 &&
    context.day_of_week != "Saturday" &&
    context.day_of_week != "Sunday"
};
```

**Use case**: Prevent weekend usage.

## Model Provider Restrictions

### OpenAI Only

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active" &&
    context.model_provider == "openai"
};
```

**Use case**: Standardize on a single provider.

### Approved Providers

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active" &&
    (
        context.model_provider == "openai" ||
        context.model_provider == "anthropic" ||
        context.model_provider == "google"
    )
};
```

**Use case**: Allow flexibility while maintaining control.

## Model-Specific Restrictions

### Specific GPT Models Only

```cedar
permit (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.status == "active" &&
    (
        context.model_name == "gpt-4" ||
        context.model_name == "gpt-4-turbo" ||
        context.model_name == "gpt-4o" ||
        context.model_name == "gpt-4o-mini"
    )
};
```

**Use case**: Prevent usage of older or experimental models.

### Forbid Premium Models

```cedar
forbid (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.user.tenant != "executive" &&
    principal.user.tenant != "ml_engineering" &&
    (
        context.model_name == "gpt-4" ||
        context.model_name == "gpt-4-32k" ||
        context.model_name == "claude-3-opus-20240229" ||
        context.model_name == "o1-preview"
    )
};
```

**Use case**: Control costs by blocking expensive models.

## Spend Limit Policies

### Daily Spend Limit

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active" &&
    principal.current_daily_spend.lessThan(decimal("100.0"))
};
```

**Use case**: Prevent daily budget overruns.

### Combined Daily and Monthly Limits

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.status == "active" &&
    principal.current_daily_spend.lessThan(decimal("100.0")) &&
    principal.current_monthly_spend.lessThan(decimal("1000.0"))
};
```

**Use case**: Comprehensive budget control.

## Agent/Service Account Policies

### High Rate Limit Agents

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.user.is_agent == true &&
    principal.status == "active" &&
    principal.user.limit_requests_per_minute >= 100
};
```

**Use case**: Automated systems and integrations.

### Limited Actions for Agents

```cedar
permit (
    principal,
    action in [Action::"completion", Action::"embedding"],
    resource
)
when {
    principal.user.is_agent == true &&
    principal.status == "active"
};
```

**Use case**: Prevent agents from using expensive operations.

## Complex Combined Policies

### Production Full Access

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.user.tenant == "engineering" &&
    principal.status == "active" &&
    context.hour >= 9 &&
    context.hour < 18 &&
    context.day_of_week != "Saturday" &&
    context.day_of_week != "Sunday" &&
    context.ip_address.isInRange(ip("10.0.0.0/8")) &&
    principal.current_daily_spend.lessThan(decimal("500.0")) &&
    principal.current_monthly_spend.lessThan(decimal("5000.0"))
};
```

**Use case**: Production environment with multiple restrictions.

### Developer Sandbox

```cedar
permit (
    principal,
    action in [Action::"completion", Action::"embedding"],
    resource == Resource::"sandbox"
)
when {
    principal.status == "active" &&
    context.ip_address.isInRange(ip("10.0.0.0/8")) &&
    principal.current_daily_spend.lessThan(decimal("50.0")) &&
    (
        context.model_name == "gpt-4o-mini" ||
        context.model_name == "claude-3-haiku-20240307" ||
        context.model_name == "text-embedding-3-small"
    )
};
```

**Use case**: Development and testing with cost controls.

## Using Templates

1. Go to Rules page in the UI
2. Click **Templates**
3. Browse available templates
4. Click **Use this template**
5. Modify as needed
6. Save

Templates are pre-written policies you can customize.

## Policy Best Practices

1. **Start simple** - Begin with basic policies, add restrictions gradually.
2. **Test policies** - Test policies before deploying.
3. **Use forbid for exceptions** - Use permit for general rules, forbid for specific blocks.
4. **Document policies** - Always add descriptions explaining what each policy does.
5. **Review regularly** - Check audit logs to see which policies are used.
6. **Combine conditions** - Use multiple conditions for fine-grained control.

## Next Steps

-   [First Policy Guide](/docs/guides/first-policy)
-   [Policy API](/docs/api-reference/admin-endpoints/policies)
