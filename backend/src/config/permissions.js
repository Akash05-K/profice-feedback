/**
 * Role-Based Access Control capability map.
 *
 * Roles come from the Prisma `UserRole` enum. Capabilities are derived from the
 * product requirements:
 *   Super Admin      -> Full access
 *   Management       -> Manage feedback, users, reports
 *   Program Manager  -> View dashboards and reports
 *   Trainer          -> View own feedback and recommendations
 *   ACE Lead         -> Manage course & batch feedback
 */

export const CAPABILITIES = {
  VIEW_DASHBOARD: "view:dashboard",
  VIEW_REPORTS: "view:reports",
  VIEW_INSIGHTS: "view:insights", // trainer/course/batch insights (all trainers)
  VIEW_OWN_INSIGHTS: "view:own_insights", // trainer viewing their own insights
  VIEW_OWN_FEEDBACK: "view:own_feedback",
  MANAGE_FEEDBACK: "manage:feedback",
  MANAGE_USERS: "manage:users",
  MANAGE_COURSE_BATCH: "manage:course_batch",
  USE_AI: "use:ai",
  USE_AI_CHAT: "use:ai_chat",
};

const ALL = Object.values(CAPABILITIES);

export const ROLE_CAPABILITIES = {
  super_admin: ALL,
  management: [
    CAPABILITIES.VIEW_DASHBOARD,
    CAPABILITIES.VIEW_REPORTS,
    CAPABILITIES.VIEW_INSIGHTS,
    CAPABILITIES.MANAGE_FEEDBACK,
    CAPABILITIES.MANAGE_USERS,
    CAPABILITIES.USE_AI,
    CAPABILITIES.USE_AI_CHAT,
  ],
  program_manager: [
    CAPABILITIES.VIEW_DASHBOARD,
    CAPABILITIES.VIEW_REPORTS,
    CAPABILITIES.VIEW_INSIGHTS,
    CAPABILITIES.MANAGE_FEEDBACK,
    CAPABILITIES.MANAGE_COURSE_BATCH,
    CAPABILITIES.USE_AI,
    CAPABILITIES.USE_AI_CHAT,
  ],
  trainer: [
    CAPABILITIES.VIEW_OWN_FEEDBACK,
    CAPABILITIES.VIEW_OWN_INSIGHTS,
    CAPABILITIES.USE_AI_CHAT,
  ],
  ace_lead: [
    CAPABILITIES.VIEW_DASHBOARD,
    CAPABILITIES.VIEW_INSIGHTS,
    CAPABILITIES.MANAGE_COURSE_BATCH,
    CAPABILITIES.USE_AI,
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

/** Does this role have the given capability? */
export const roleHasCapability = (role, capability) => {
  const caps = ROLE_CAPABILITIES[role] || [];
  return caps.includes(capability);
};

/** Does this role have ANY of the given capabilities? */
export const roleHasAnyCapability = (role, capabilities = []) =>
  capabilities.some((cap) => roleHasCapability(role, cap));
