import { Router } from "express";
import multer from "multer";
import * as uploadController from "../controllers/upload.controller.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/analyze", upload.single("file"), uploadController.uploadFile);
router.get("/sessions", uploadController.getSessions);

export default router;
