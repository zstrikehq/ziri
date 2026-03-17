export const internalCedarTextSchema = `
type InternalContext = {
  resourceType: __cedar::String
};

entity DashboardUser = {
  user_id: __cedar::String,
  role: __cedar::String,
  status: __cedar::String,
  email?: __cedar::String,
  name?: __cedar::String
};

entity Dashboard;

action "list_dashboard_users" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "get_dashboard_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "create_dashboard_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_dashboard_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "delete_dashboard_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "create_admin_dashboard_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_admin_dashboard_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "delete_admin_dashboard_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "reset_dashboard_user_password" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "reset_admin_dashboard_user_password" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "list_users" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "get_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "create_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "delete_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "reset_user_password" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "list_keys" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "get_key" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "get_keys_by_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "create_key" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_key_status" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "rotate_key" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "delete_keys_by_user" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "delete_key_by_id" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "list_policies" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "create_policy" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_policy" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "delete_policy" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "patch_policy_status" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "get_policy_templates" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "generate_policy_with_ai" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_schema" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_schema" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "refresh_schema" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "get_config" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_config" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "list_providers" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "get_provider" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "create_provider" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_provider" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "delete_provider" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "test_provider" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_audit" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_internal_audit" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_stats" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_costs" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_events" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_dashboard" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_analytics" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "view_logs" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "list_entities" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "update_entities" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "list_roles" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "create_role" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};

action "delete_role" appliesTo {
  principal: [DashboardUser],
  resource: [Dashboard],
  context: InternalContext
};
`
