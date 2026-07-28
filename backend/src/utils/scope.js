/**
 * Single source of truth for data-scope filters.
 *
 * Every query that can expose trainer, course, batch, feedback or action data
 * must pass through one of these helpers. Previously the same filter was
 * copy-pasted across seven services with subtle differences, which is how
 * cross-program leaks crept in.
 *
 * Scope shapes are produced by `resolveUserScope()` in services/auth.service.js:
 *   { isUnrestricted: true }                      -> super_admin, ace_lead, management
 *   { isProgramManager: true, trainerIds, ... }   -> program_manager
 *   { isTrainer: true, trainerIds, courseIds }    -> trainer
 *
 * Isolation rule for Program Managers: feedback is scoped by `trainerId`, not by
 * a trainer-OR-course match. Every FeedbackRecord has a non-null trainerId and
 * trainers are partitioned by program, so this is exact — a manager can never
 * observe a record belonging to another team's trainer, whatever course it is
 * filed under.
 *
 * All helpers compose with `AND` so they can never clobber a caller's own
 * `OR` clause (search filters build one).
 */

/** Prisma matches nothing for this id — used when a scope resolves to empty. */
const NO_MATCH = -1;

const idFilter = (ids) => ({ in: Array.isArray(ids) ? ids : [] });

/** Append a condition to `where.AND` without disturbing existing keys. */
const addAnd = (where, condition) => {
  const existing = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  where.AND = [...existing, condition];
  return where;
};

/** True when the scope imposes no restriction at all. */
export const isUnrestricted = (userScope) => !userScope || userScope.isUnrestricted === true;

/**
 * Restrict a FeedbackRecord `where` clause to the caller's own data.
 */
export const applyFeedbackScope = (where = {}, userScope = null) => {
  if (isUnrestricted(userScope)) return where;

  if (userScope.isProgramManager || userScope.isTrainer) {
    return addAnd(where, { trainerId: idFilter(userScope.trainerIds) });
  }

  // Unknown scope shape — fail closed rather than leaking everything.
  return addAnd(where, { trainerId: NO_MATCH });
};

/**
 * Restrict a Trainer `where` clause.
 */
export const applyTrainerScope = (where = {}, userScope = null) => {
  if (isUnrestricted(userScope)) return where;

  if (userScope.isProgramManager || userScope.isTrainer) {
    return addAnd(where, { id: idFilter(userScope.trainerIds) });
  }

  return addAnd(where, { id: NO_MATCH });
};

/**
 * Restrict a Course `where` clause.
 *
 * A trainer with no batches yet has an empty courseIds list; that legitimately
 * means "no courses", so it is not special-cased into an open scope.
 */
export const applyCourseScope = (where = {}, userScope = null) => {
  if (isUnrestricted(userScope)) return where;

  if (userScope.isProgramManager || userScope.isTrainer) {
    return addAnd(where, { id: idFilter(userScope.courseIds) });
  }

  return addAnd(where, { id: NO_MATCH });
};

/**
 * Restrict a Batch `where` clause. Batches are reachable through their trainer,
 * so trainer scope is the authority here too.
 */
export const applyBatchScope = (where = {}, userScope = null) => {
  if (isUnrestricted(userScope)) return where;

  if (userScope.isProgramManager || userScope.isTrainer) {
    return addAnd(where, { trainerId: idFilter(userScope.trainerIds) });
  }

  return addAnd(where, { trainerId: NO_MATCH });
};

/**
 * Restrict an ActionItem `where` clause via its assigned trainer.
 */
export const applyActionScope = (where = {}, userScope = null) => {
  if (isUnrestricted(userScope)) return where;

  if (userScope.isProgramManager || userScope.isTrainer) {
    return addAnd(where, { assignedToTrainerId: idFilter(userScope.trainerIds) });
  }

  return addAnd(where, { assignedToTrainerId: NO_MATCH });
};

/**
 * Is this trainer id inside the caller's scope? Used before returning
 * single-trainer detail so we can answer 403 rather than an empty result.
 */
export const isTrainerInScope = (trainerId, userScope) => {
  if (isUnrestricted(userScope)) return true;
  return (userScope.trainerIds || []).includes(Number(trainerId));
};

/** Is this course id inside the caller's scope? */
export const isCourseInScope = (courseId, userScope) => {
  if (isUnrestricted(userScope)) return true;
  return (userScope.courseIds || []).includes(Number(courseId));
};

/**
 * Narrow a list of trainer ids to those inside the caller's scope. Used where a
 * lookup legitimately expands to several trainer rows (e.g. the same trainer
 * name existing at more than one college).
 */
export const intersectTrainerIds = (trainerIds = [], userScope = null) => {
  if (isUnrestricted(userScope)) return trainerIds;
  const allowed = new Set(userScope.trainerIds || []);
  return trainerIds.filter((id) => allowed.has(id));
};
