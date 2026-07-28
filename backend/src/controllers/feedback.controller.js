import * as feedbackService from "../services/feedback.service.js";
import { resolveUserScope } from "../services/auth.service.js";

export const getList = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const result = await feedbackService.getFeedbackRecords(req.query, userScope);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await feedbackService.getFeedbackStats(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getFilterOptions = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await feedbackService.getFeedbackFilterOptions(req.query, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await feedbackService.getFeedbackById(req.params.id, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await feedbackService.toggleFeedbackStatus(req.params.id, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await feedbackService.deleteFeedbackRecord(req.params.id, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const bulkAction = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await feedbackService.bulkActionFeedback(req.body, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const exportRecords = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const { buffer, filename, contentType } = await feedbackService.exportFeedbackRecords(req.body, userScope);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};
