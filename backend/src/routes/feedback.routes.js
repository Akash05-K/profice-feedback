import { Router } from "express";
import * as feedbackController from "../controllers/feedback.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

router.use(authenticate);

// Read access: managers, ACE leads, insight viewers, and trainers (own feedback).
const canRead = requireCapability(
  CAPABILITIES.MANAGE_FEEDBACK,
  CAPABILITIES.MANAGE_COURSE_BATCH,
  CAPABILITIES.VIEW_INSIGHTS,
  CAPABILITIES.VIEW_OWN_FEEDBACK
);
// Mutations: only feedback/course-batch managers.
const canManage = requireCapability(CAPABILITIES.MANAGE_FEEDBACK, CAPABILITIES.MANAGE_COURSE_BATCH);

router.get("/", canRead, feedbackController.getList);
router.get("/stats", canRead, feedbackController.getStats);
router.get("/filter-options", canRead, feedbackController.getFilterOptions);
router.get("/export", canRead, feedbackController.exportRecords);
router.post("/export", canRead, feedbackController.exportRecords);
router.get("/:id", canRead, feedbackController.getById);
router.patch("/:id/toggle-status", canManage, feedbackController.toggleStatus);
router.patch("/:id/status", canManage, feedbackController.toggleStatus);
router.delete("/:id", canManage, feedbackController.remove);
router.post("/bulk-action", canManage, feedbackController.bulkAction);
router.patch("/bulk", canManage, feedbackController.bulkAction);

export default router;
