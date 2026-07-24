import { Router } from "express";
import multer from "multer";
import * as uploadController from "../controllers/upload.controller.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/analyze", upload.single("file"), uploadController.uploadFile);
router.get("/sessions", uploadController.getSessions);
router.get("/sessions/:id/analysis", uploadController.getSessionAnalysis);
router.delete("/sessions/:id", uploadController.deleteSession);

export default router;


