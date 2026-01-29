# Real-World Scenarios

Example setups for common use cases.

## Multi-Tenant SaaS Application

You're building a SaaS app where each tenant has their own API key and spending limits.

### Setup

1. **Create users per tenant**:
   ```bash
   POST /api/users
   {
     "email": "tenant1@example.com",
     "name": "Tenant 1",
     "department": "tenant1",
     "limitRequestsPerMinute": 100
   }
   ```

2. **Create tenant-specific policy**:
   ```cedar
   permit (
       principal,
       action,
       resource
   )
   when {
       principal.status == "active" &&
       principal.user.department == "tenant1" &&
       principal.current_daily_spend.lessThan(decimal("50.0")) &&
       principal.current_monthly_spend.lessThan(decimal("500.0"))
   };
   ```

3. **Use tenant's API key** in your application

### Benefits

- Separate spending per tenant
- Rate limits per tenant
- Audit trail per tenant
- Easy to add/remove tenants

## Enterprise Gateway

You're running a centralized LLM gateway for your organization.

### Setup

1. **Create users by department**:
   - Engineering: Full access
   - Research: Limited access
   - Sales: Read-only access

2. **Create department policies**:
   ```cedar
   // Engineering - full access
   permit (principal, action, resource)
   when {
       principal.user.department == "engineering" &&
       principal.status == "active"
   };

   // Research - completions and embeddings only
   permit (principal, action in [Action::"completion", Action::"embedding"], resource)
   when {
       principal.user.department == "research" &&
       principal.status == "active"
   };
   ```

3. **Set spend limits**:
   - Daily limits per department
   - Monthly limits per department
   - Model restrictions for cost control

### Benefits

- Centralized authorization
- Department-based access control
- Cost control per department
- Compliance-ready audit logs

## Development Team

You're managing LLM usage for a development team.

### Setup

1. **Create team users**:
   ```bash
   POST /api/users
   {
     "email": "dev@team.com",
     "name": "Dev Team",
     "department": "engineering",
     "limitRequestsPerMinute": 200
   }
   ```

2. **Create development policy**:
   ```cedar
   permit (
       principal,
       action in [Action::"completion", Action::"embedding"],
       resource
   )
   when {
       principal.status == "active" &&
       principal.current_daily_spend.lessThan(decimal("100.0")) &&
       (
           context.model_name == "gpt-4o-mini" ||
           context.model_name == "claude-3-haiku-20240307"
       )
   };
   ```

3. **Monitor usage**:
   - Check daily spending
   - Review audit logs
   - Adjust limits as needed

### Benefits

- Prevents budget overruns
- Limits to cost-effective models
- Easy to monitor team usage
- Simple to add/remove team members

## Production Application

You're running a production app that needs reliable LLM access.

### Setup

1. **Create service account**:
   ```bash
   POST /api/users
   {
     "email": "app@example.com",
     "name": "Production App",
     "department": "production",
     "isAgent": true,
     "limitRequestsPerMinute": 1000
   }
   ```

2. **Create production policy**:
   ```cedar
   permit (
       principal,
       action,
       resource
   )
   when {
       principal.user.is_agent == true &&
       principal.status == "active" &&
       context.ip_address.isInRange(ip("10.0.0.0/8")) &&
       principal.current_daily_spend.lessThan(decimal("1000.0")) &&
       principal.current_monthly_spend.lessThan(decimal("10000.0"))
   };
   ```

3. **Set up monitoring**:
   - Monitor request rates
   - Track costs
   - Set up alerts
   - Review logs regularly

### Benefits

- Reliable access for production
- Cost controls prevent overruns
- IP restrictions for security
- Comprehensive monitoring

## Next Steps

- [Integration Examples](/examples/integration-examples) - Code integration examples
- [Policy Examples](/guides/policy-examples) - More policy examples
- [Monitoring Guide](/guides/monitoring) - Set up monitoring
