const configService = require('../services/configService');
const { sendResponse } = require('../utils/responseHandler');
const { MESSAGES } = require('../utils/constants');

const getConfig = async (req, res, next) => {
  try {
    const config = await configService.getConfig();
    sendResponse(res, 200, { message: req.t(MESSAGES.CONFIG.FETCH_SUCCESS), ...config });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getConfig
};
