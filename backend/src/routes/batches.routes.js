import { Router } from "express";
import * as batchesController from "../controllers/batches.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

router.use(authenticate);
router.use(requireCapability(CAPABILITIES.VIEW_INSIGHTS, CAPABILITIES.MANAGE_COURSE_BATCH));

router.get("/", batchesController.getList);
router.get("/stats", batchesController.getStats);

export default router;
