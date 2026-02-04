export const internalPolicies: string[] = [

  `@id("admin-full-access")
permit (
    principal,
    action,
    resource
)
when {
    principal.role == "admin" &&
    principal.status == "active"
};`,


  `@id("viewer-read-only")
permit (
    principal,
    action in [
        Action::"list_dashboard_users",
        Action::"get_dashboard_user",
        Action::"list_users",
        Action::"get_user",
        Action::"list_keys",
        Action::"get_key",
        Action::"get_keys_by_user",
        Action::"list_policies",
        Action::"get_policy_templates",
        Action::"view_schema",
        Action::"get_config",
        Action::"list_providers",
        Action::"get_provider",
        Action::"view_audit",
        Action::"view_stats",
        Action::"view_costs",
        Action::"view_events",
        Action::"view_dashboard",
        Action::"view_analytics",
        Action::"view_logs",
        Action::"list_entities"
    ],
    resource
)
when {
    principal.role == "viewer" &&
    principal.status == "active"
};`,


  `@id("user-admin-access")
permit (
    principal,
    action in [
        Action::"list_users",
        Action::"get_user",
        Action::"create_user",
        Action::"update_user",
        Action::"delete_user",
        Action::"reset_user_password",
        Action::"list_keys",
        Action::"get_key",
        Action::"get_keys_by_user",
        Action::"create_key",
        Action::"update_key_status",
        Action::"rotate_key",
        Action::"delete_keys_by_user",
        Action::"delete_key_by_id"
    ],
    resource
)
when {
    principal.role == "user_admin" &&
    principal.status == "active" &&
    (context.resourceType == "users" || context.resourceType == "keys")
};`,

  `@id("user-admin-viewer-permissions")
permit (
    principal,
    action in [
        Action::"list_dashboard_users",
        Action::"get_dashboard_user",
        Action::"list_policies",
        Action::"get_policy_templates",
        Action::"view_schema",
        Action::"get_config",
        Action::"list_providers",
        Action::"get_provider",
        Action::"view_audit",
        Action::"view_stats",
        Action::"view_costs",
        Action::"view_events",
        Action::"view_dashboard",
        Action::"view_analytics",
        Action::"view_logs",
        Action::"list_entities"
    ],
    resource
)
when {
    principal.role == "user_admin" &&
    principal.status == "active"
};`,


  `@id("policy-admin-access")
permit (
    principal,
    action in [
        Action::"list_policies",
        Action::"create_policy",
        Action::"update_policy",
        Action::"delete_policy",
        Action::"patch_policy_status",
        Action::"get_policy_templates",
        Action::"generate_policy_with_ai"
    ],
    resource
)
when {
    principal.role == "policy_admin" &&
    principal.status == "active" &&
    context.resourceType == "policies"
};`,

  `@id("policy-admin-viewer-permissions")
permit (
    principal,
    action in [
        Action::"list_dashboard_users",
        Action::"get_dashboard_user",
        Action::"list_users",
        Action::"get_user",
        Action::"list_keys",
        Action::"get_key",
        Action::"get_keys_by_user",
        Action::"view_schema",
        Action::"get_config",
        Action::"list_providers",
        Action::"get_provider",
        Action::"view_audit",
        Action::"view_stats",
        Action::"view_costs",
        Action::"view_events",
        Action::"view_dashboard",
        Action::"view_analytics",
        Action::"view_logs",
        Action::"list_entities"
    ],
    resource
)
when {
    principal.role == "policy_admin" &&
    principal.status == "active"
};`,


  `@id("forbid-disabled-users")
forbid (
    principal,
    action,
    resource
)
when {
    principal.status != "active"
};`,


  `@id("forbid-non-ziri-admin-actions")
forbid (
    principal,
    action in [
        Action::"create_admin_dashboard_user",
        Action::"update_admin_dashboard_user",
        Action::"delete_admin_dashboard_user"
    ],
    resource
)
when {
    principal.role == "admin" &&
    principal.user_id != "ziri"
};`
]
