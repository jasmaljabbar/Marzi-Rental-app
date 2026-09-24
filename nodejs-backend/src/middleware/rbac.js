const { forbidden } = require("../lib/errors");

// Gate an action to tenant roles. Runs after authenticate/requireTenant.
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

const adminOnly = authorize("owner", "admin");

module.exports = { authorize, adminOnly };
