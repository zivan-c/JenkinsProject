function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: Object.values(error.errors).map((item) => item.message)
    });
  }

  console.error(error);
  return res.status(500).json({ message: 'Server error.' });
}

module.exports = errorHandler;
