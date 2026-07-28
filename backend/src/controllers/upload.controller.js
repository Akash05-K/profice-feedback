import * as uploadService from "../services/upload.service.js";
import { resolveUserScope } from "../services/auth.service.js";

export const uploadFile = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const result = await uploadService.processUploadedFile(req.file, req.user, userScope);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await uploadService.getUploadSessions(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSessionAnalysis = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await uploadService.getUploadSessionAnalysis(req.params.id, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await uploadService.deleteUploadSession(req.params.id, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
