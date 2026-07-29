
export const CAPABILITIES = {
  VIEW_DASHBOARD: "view:dashboard",
  VIEW_REPORTS: "view:reports",
  VIEW_INSIGHTS: "view:insights", // trainer/course/batch insights across the user's scope
  VIEW_OWN_INSIGHTS: "view:own_insights", // trainer viewing their own insights
  VIEW_OWN_FEEDBACK: "view:own_feedback",
  VIEW_OWN_ACTIONS: "view:own_actions", // trainer viewing their assigned action alerts
  VIEW_FEEDBACK: "view:feedback", // read the feedback repository
  MANAGE_FEEDBACK: "manage:feedback", // archive / delete / bulk-edit feedback
  UPLOAD_FEEDBACK: "upload:feedback", // AI Analysis file upload
  VIEW_ACTIONS: "view:actions",
  MANAGE_ACTIONS: "manage:actions",
  MANAGE_USERS: "manage:users",
  MANAGE_COURSE_BATCH: "manage:course_batch",
  USE_AI: "use:ai",
  USE_AI_CHAT: "use:ai_chat",
};

const ALL = Object.values(CAPABILITIES);

export const ROLE_CAPABILITIES = {
  super_admin: ALL,
  ace_lead: ALL,
  program_manager: ALL.filter((cap) => cap !== CAPABILITIES.MANAGE_USERS),
  management: [
    CAPABILITIES.VIEW_DASHBOARD,
    CAPABILITIES.VIEW_REPORTS,
    CAPABILITIES.VIEW_INSIGHTS,
    CAPABILITIES.VIEW_FEEDBACK,
    CAPABILITIES.USE_AI,
    CAPABILITIES.USE_AI_CHAT,
  ],
  trainer: [
    CAPABILITIES.VIEW_OWN_FEEDBACK,
    CAPABILITIES.VIEW_OWN_INSIGHTS,
    CAPABILITIES.VIEW_OWN_ACTIONS,
    CAPABILITIES.USE_AI_CHAT,
  ],
};

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  management: "Management",
  program_manager: "Program Manager",
  trainer: "Trainer",
  ace_lead: "ACE Lead",
};

/** Roles an admin is allowed to assign from the User Management page. */
export const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS);

/** Roles whose data access is partitioned by `program`. */
export const PROGRAM_SCOPED_ROLES = ["program_manager", "trainer"];

/** Does this role have the given capability? */
export const roleHasCapability = (role, capability) => {
  const caps = ROLE_CAPABILITIES[role] || [];
  return caps.includes(capability);
};

/** Does this role have ANY of the given capabilities? */
export const roleHasAnyCapability = (role, capabilities = []) =>
  capabilities.some((cap) => roleHasCapability(role, cap));
