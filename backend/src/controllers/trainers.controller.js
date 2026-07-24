import * as trainersService from "../services/trainers.service.js";
import { resolveTrainerScope } from "../services/auth.service.js";

export const getFilterOptions = async (req, res, next) => {
  try {
    const data = await trainersService.getTrainerFilterOptions(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getList = async (req, res, next) => {
  try {
    const data = await trainersService.getTrainersList(req.query.college, req.query.course);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    // A trainer can only view their own metrics — force the id to their own.
    const scopeTrainerId = await resolveTrainerScope(req.user);
    const targetId = scopeTrainerId ? String(scopeTrainerId) : req.params.id;
    const data = await trainersService.getTrainerMetrics(targetId, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
