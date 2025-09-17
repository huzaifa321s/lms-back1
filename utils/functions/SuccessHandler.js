const SuccessHandler = (data, statusCode, res, message = "") => {
  return res.status(statusCode).json({
    success: true,
    message: message,
    data: data,
  });
};

export default SuccessHandler;