# Policy Examples

Real-world Cedar policy examples you can use as starting points.

## Basic Access Policies

### Allow All Actions for Active Keys

Allow any action for keys with active status:

```cedar
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

## Department-Based Policies

### Full Access for Engineering

Give engineering department full access:

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.user.department == "engineering" &&
    principal.status == "active"
};
```

**Use case**: Engineering team needs access to all features.

### Limited Access for Research

Restrict research to completions and embeddings:

```cedar
permit (
    principal,
    action in [Action::"completion", Action::"embedding"],
    resource
)
when {
    principal.user.department == "research" &&
    principal.status == "active"
};
```

**Use case**: Research team doesn't need image generation or fine-tuning.

## IP Address Restrictions

### Corporate Network Only

Allow access only from corporate network:

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

Allow access from multiple office locations:

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

Allow access during business hours (9 AM - 6 PM):

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

Combine business hours with weekday restriction:

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

Restrict to OpenAI provider:

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

Allow multiple approved providers:

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

Allow only specific GPT models:

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

Block expensive models for most departments:

```cedar
forbid (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.user.department != "executive" &&
    principal.user.department != "ml_engineering" &&
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

Allow requests only if daily spend is under $100:

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

Enforce both daily and monthly limits:

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

Allow agents with high rate limits:

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

Restrict agents to specific actions:

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

Comprehensive policy combining multiple conditions:

```cedar
permit (
    principal,
    action,
    resource
)
when {
    principal.user.department == "engineering" &&
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

Limited access for development:

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

ZIRI includes policy templates you can use:

1. Go to Rules page in the UI
2. Click "Templates" button
3. Browse available templates
4. Click "Use this template"
5. Modify as needed
6. Save

Templates are pre-written policies you can customize.

## Policy Best Practices

1. **Start simple** - Begin with basic policies, add restrictions gradually
2. **Test policies** - Test policies before deploying
3. **Use forbid for exceptions** - Use permit for general rules, forbid for specific blocks
4. **Document policies** - Always add descriptions explaining what each policy does
5. **Review regularly** - Check audit logs to see which policies are used
6. **Combine conditions** - Use multiple conditions for fine-grained control

## Next Steps

- [First Policy Guide](/guides/first-policy) - Step-by-step policy creation
- [Policy API](/api-reference/admin-endpoints/policies) - Manage policies via API
