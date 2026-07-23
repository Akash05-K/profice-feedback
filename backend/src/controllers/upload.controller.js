import * as uploadService from "../services/upload.service.js";

export const uploadFile = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await uploadService.processUploadedFile(req.file, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const data = await uploadService.getUploadSessions();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
