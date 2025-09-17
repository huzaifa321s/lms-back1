const ErrorHandler = (message, statusCode, res, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message: message,
    metadata: data
  });
};

export default ErrorHandler;