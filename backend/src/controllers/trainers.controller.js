import * as trainersService from "../services/trainers.service.js";
import { resolveUserScope } from "../services/auth.service.js";

export const getFilterOptions = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await trainersService.getTrainerFilterOptions(req.query, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getList = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await trainersService.getTrainersList(req.query.college, req.query.course, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    let targetId = req.params.id;

    if (userScope.isTrainer) {
      targetId = userScope.trainerId ? String(userScope.trainerId) : req.params.id;
    }

    const data = await trainersService.getTrainerMetrics(targetId, req.query, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
