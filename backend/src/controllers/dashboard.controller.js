import * as dashboardService from "../services/dashboard.service.js";
import { resolveUserScope } from "../services/auth.service.js";

export const getStats = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await dashboardService.getDashboardStats(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTrends = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await dashboardService.getDashboardTrends(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSentiment = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await dashboardService.getSentimentDistribution(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTopics = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await dashboardService.getTopTopics(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getRecent = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await dashboardService.getRecentFeedback(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTrainerAlert = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await dashboardService.getMostNegativeTrainerAlert(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
