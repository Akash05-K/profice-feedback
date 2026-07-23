import * as trainersService from "../services/trainers.service.js";

export const getList = async (req, res, next) => {
  try {
    const data = await trainersService.getTrainersList(req.query.college);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    const data = await trainersService.getTrainerMetrics(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
