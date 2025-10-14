const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, "secret_this_should_be");
    // Check your authorization logic here
    if (decodedToken.someConditionForForbiddenAccess) {
      res.status(403).json({
        status: 403,
        message: "Access forbidden!",e
      });
    } else {
      req.companyData = {
        email_id: decodedToken.email_id,
        user_id: decodedToken.user_id,
      };
      next();
    }
  } catch (error) {
    res.status(401).json({
      status: 401,
      message: "Auth failed!",
      error: error,
    });
  }
};
