/**
 * Frontend mirror of the backend RBAC map (backend/src/config/permissions.js).
 * Used to gate routes and filter the sidebar so each role only sees what it can open.
 */

export const CAP = {
  VIEW_DASHBOARD: "view:dashboard",
  VIEW_REPORTS: "view:reports",
  VIEW_INSIGHTS: "view:insights",
  VIEW_OWN_INSIGHTS: "view:own_insights",
  VIEW_OWN_FEEDBACK: "view:own_feedback",
  MANAGE_FEEDBACK: "manage:feedback",
  MANAGE_USERS: "manage:users",
  MANAGE_COURSE_BATCH: "manage:course_batch",
  USE_AI: "use:ai",
  USE_AI_CHAT: "use:ai_chat",
};

const ALL = Object.values(CAP);

export const ROLE_CAPABILITIES = {
  super_admin: ALL,
  management: [
    CAP.VIEW_DASHBOARD,
    CAP.VIEW_REPORTS,
    CAP.VIEW_INSIGHTS,
    CAP.MANAGE_FEEDBACK,
    CAP.MANAGE_USERS,
    CAP.USE_AI,
    CAP.USE_AI_CHAT,
  ],
  program_manager: [CAP.VIEW_DASHBOARD, CAP.VIEW_REPORTS, CAP.VIEW_INSIGHTS],
  trainer: [CAP.VIEW_OWN_FEEDBACK, CAP.VIEW_OWN_INSIGHTS, CAP.USE_AI_CHAT],
  ace_lead: [
    CAP.VIEW_DASHBOARD,
    CAP.VIEW_INSIGHTS,
    CAP.MANAGE_COURSE_BATCH,
    CAP.USE_AI,
    CAP.USE_AI_CHAT,
  ],
};

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  management: "Management",
  program_manager: "Program Manager",
  trainer: "Trainer",
  ace_lead: "ACE Lead",
};

export const roleHasAnyCapability = (role, caps = []) => {
  const owned = ROLE_CAPABILITIES[role] || [];
  return caps.length === 0 || caps.some((c) => owned.includes(c));
};

/**
 * Required capabilities per route path (ANY-of). An empty array = any authenticated user.
 * Keep in sync with the backend route guards.
 */
export const ROUTE_CAPS = {
  "/": [CAP.VIEW_DASHBOARD, CAP.USE_AI],
  "/repository": [CAP.MANAGE_FEEDBACK, CAP.MANAGE_COURSE_BATCH, CAP.VIEW_INSIGHTS, CAP.VIEW_OWN_FEEDBACK],
  "/ai-analysis": [CAP.USE_AI],
  "/ai-recommendations": [CAP.USE_AI],
  "/ai-chat": [CAP.USE_AI, CAP.USE_AI_CHAT],
  "/collection": [CAP.MANAGE_FEEDBACK, CAP.MANAGE_COURSE_BATCH],
  "/trainer-insights": [CAP.VIEW_INSIGHTS, CAP.VIEW_OWN_INSIGHTS, CAP.MANAGE_COURSE_BATCH],
  "/course-insights": [CAP.VIEW_INSIGHTS, CAP.MANAGE_COURSE_BATCH],
  "/batch-insights": [CAP.VIEW_INSIGHTS, CAP.MANAGE_COURSE_BATCH],
  "/action-tracker": [CAP.MANAGE_FEEDBACK, CAP.MANAGE_COURSE_BATCH, CAP.VIEW_INSIGHTS],
  "/reports": [CAP.VIEW_REPORTS],
  "/integrations": [CAP.MANAGE_USERS],
  "/notifications": [],
};

export const canAccessPath = (role, path) => roleHasAnyCapability(role, ROUTE_CAPS[path] || []);

// Preference order for where a role should land after login. First accessible wins.
const LANDING_ORDER = [
  "/",
  "/trainer-insights",
  "/repository",
  "/reports",
  "/course-insights",
  "/ai-analysis",
  "/action-tracker",
  "/notifications",
];

export const firstAccessiblePath = (role) =>
  LANDING_ORDER.find((path) => canAccessPath(role, path)) || "/notifications";
