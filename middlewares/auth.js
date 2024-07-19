const jwt = require("jsonwebtoken");

module.exports = async ({ req, res, io }) => {
  const authHeader = req.get("Authorization") || req.get("authorization");
  if (!authHeader) {
    req.isAuth = false;
    return { req, res };
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    // decode and verify the token
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    req.isAuth = false;
    return { req, res };
  }
  if (!decodedToken) {
    req.isAuth = false;
    return { req, res };
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  return { req, res, io };
};
