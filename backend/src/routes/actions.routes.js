import { Router } from "express";
import * as actionsController from "../controllers/actions.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

router.use(authenticate);

// Action Tracker. Trainers are excluded (the list is not trainer-scoped), and
// Management holds neither capability — "they dont use action tracker".
const canRead = requireCapability(CAPABILITIES.VIEW_ACTIONS);
const canManage = requireCapability(CAPABILITIES.MANAGE_ACTIONS);

router.get("/", canRead, actionsController.getList);
router.get("/stats", canRead, actionsController.getStats);
router.get("/:id", canRead, actionsController.getById);
router.post("/", canManage, actionsController.create);
router.put("/:id", canManage, actionsController.update);
router.delete("/:id", canManage, actionsController.remove);

export default router;
