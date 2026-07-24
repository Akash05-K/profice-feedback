import * as coursesService from "../services/courses.service.js";

export const getFilterOptions = async (req, res, next) => {
  try {
    const data = await coursesService.getCourseFilterOptions(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getList = async (req, res, next) => {
  try {
    const data = await coursesService.getCoursesList(req.query.college);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    const data = await coursesService.getCourseMetrics(req.params.id, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
