export const defaultCedarTextSchema = `
type RequestContext = {
  "day_of_week": __cedar::String,
  "hour": __cedar::Long,
  "ip_address": __cedar::ipaddr,
  "is_emergency": __cedar::Bool,
  "model_name": __cedar::String,
  "model_provider": __cedar::String,
  "request_time": __cedar::String,
};

entity Resource;

entity Role;

entity User in [Role] = {
  "user_id": __cedar::String,
  "email": __cedar::String,
  "tenant": __cedar::String,
  "is_agent": __cedar::Bool,
  "limit_requests_per_minute": __cedar::Long,
};

entity UserKey = {
  "current_daily_spend": __cedar::decimal,
  "current_monthly_spend": __cedar::decimal,
  "last_daily_reset": __cedar::String,
  "last_monthly_reset": __cedar::String,
  "status": __cedar::String,
  "user": User,
};

action "completion" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext,
};

action "fine_tuning" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext,
};

action "image_generation" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext,
};

action "embedding" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext,
};

action "moderation" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext,
};
`
