// middleware/moduleAuth.js
const moduleAuth = (requiredModules) => {
  return (req, res, next) => {
    // Get the user from the request (assuming you set this in your authentication middleware)
    const user = req.user;

    if (!user) {
      return res.status(401).send({ message: "Authentication required" });
    }

    // If no specific modules are required or user is admin, allow access
    if (!requiredModules.length || user.role === "Admin") {
      return next();
    }

    // Check if the user has access to any of the required modules
    const hasAccess = requiredModules.some((module) =>
      user.modules.includes(module)
    );

    if (hasAccess) {
      next();
    } else {
      res.status(403).send({
        message:
          "Access denied. You don't have the required module permissions.",
      });
    }
  };
};

export default moduleAuth;
