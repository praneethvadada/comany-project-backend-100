const sendResponse = (res, statusCode, success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    data,
    meta
  };
  
  if (data === null) delete response.data;
  if (meta === null) delete response.meta;
  
  return res.status(statusCode).json(response);
};

const sendSuccess = (res, message, data = null, meta = null) => {
  return sendResponse(res, 200, true, message, data, meta);
};

const sendCreated = (res, message, data = null) => {
  return sendResponse(res, 201, true, message, data);
};

const sendError = (res, statusCode, message) => {
  return sendResponse(res, statusCode, false, message);
};

const sendBadRequest = (res, message = 'Bad Request') => {
  return sendError(res, 400, message);
};

const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, 401, message);
};

const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, 403, message);
};

const sendNotFound = (res, message = 'Not Found') => {
  return sendError(res, 404, message);
};

const sendServerError = (res, message = 'Internal Server Error') => {
  return sendError(res, 500, message);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendServerError
};
