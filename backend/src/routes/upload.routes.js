import { Router } from "express";
import multer from "multer";
import * as uploadController from "../controllers/upload.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticate);
// Uploading / analyzing feedback files is a feedback-management action.
router.use(
  requireCapability(
    CAPABILITIES.MANAGE_FEEDBACK,
    CAPABILITIES.MANAGE_COURSE_BATCH,
    CAPABILITIES.USE_AI
  )
);

router.post("/analyze", upload.single("file"), uploadController.uploadFile);
router.get("/sessions", uploadController.getSessions);
router.get("/sessions/:id/analysis", uploadController.getSessionAnalysis);
router.delete("/sessions/:id", uploadController.deleteSession);

export default router;


