const projectService = require('../services/projectService');
const { HttpError } = require('../middleware/errorMiddleware');
const { sendResponse } = require('../utils/responseHandler');
const { MESSAGES } = require('../utils/constants');

const save = async (req, res, next) => {
  try {
    const { features } = req.body;
    if (!Array.isArray(features)) {
      throw new HttpError(400, MESSAGES.PROJECTS.INVALID_FEATURES);
    }
    const result = await projectService.saveProject(req.user.id, req.body);
    sendResponse(res, 200, { message: req.t(MESSAGES.PROJECTS.SAVE_SUCCESS), ...result });
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const projects = await projectService.listUserProjects(req.user.id);
    sendResponse(res, 200, { projects });
  } catch (err) {
    next(err);
  }
};

const loadLatest = async (req, res, next) => {
  try {
    const project = await projectService.loadLatestProject(req.user.id);
    sendResponse(res, 200, { project });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new HttpError(400, MESSAGES.PROJECTS.INVALID_ID);
    const project = await projectService.loadProjectById(id, req.user.id);
    sendResponse(res, 200, { project });
  } catch (err) {
    next(err);
  }
};

const audit = async (req, res, next) => {
  try {
    const { action_type, details, projectId } = req.body;
    if (!action_type) throw new HttpError(400, MESSAGES.PROJECTS.MISSING_ACTION_TYPE);
    await projectService.addAuditLog(req.user.id, projectId, action_type, details);
    sendResponse(res, 200, { message: req.t(MESSAGES.PROJECTS.AUDIT_SUCCESS) });
  } catch (err) {
    next(err);
  }
};

module.exports = { save, getAll, loadLatest, getById, audit };
