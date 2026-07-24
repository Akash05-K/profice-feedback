import * as trainersService from "../services/trainers.service.js";

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
    const data = await trainersService.getTrainerMetrics(req.params.id, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
