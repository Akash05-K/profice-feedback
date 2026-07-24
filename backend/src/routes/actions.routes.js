import { Router } from "express";
import * as actionsController from "../controllers/actions.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

router.use(authenticate);

// Action Tracker is an org-wide module — trainers (own-scope only) are excluded
// because the action list/detail is not trainer-scoped.
const canRead = requireCapability(
  CAPABILITIES.MANAGE_FEEDBACK,
  CAPABILITIES.MANAGE_COURSE_BATCH,
  CAPABILITIES.VIEW_INSIGHTS
);
const canManage = requireCapability(CAPABILITIES.MANAGE_FEEDBACK, CAPABILITIES.MANAGE_COURSE_BATCH);

router.get("/", canRead, actionsController.getList);
router.get("/stats", canRead, actionsController.getStats);
router.get("/:id", canRead, actionsController.getById);
router.post("/", canManage, actionsController.create);
router.put("/:id", canManage, actionsController.update);
router.delete("/:id", canManage, actionsController.remove);

export default router;
