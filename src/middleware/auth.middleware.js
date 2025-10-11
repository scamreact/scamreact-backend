const jwt = require("jsonwebtoken");
const errorHandler = require("../utils/error.js");
const cloudinary = require("../utils/cloudinary/cloudinary.js");
const Host = require("../models/host.model.js");
const User = require("../models/user.model.js");

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Token di autenticazione mancante" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ error: "Utente non trovato" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Non autorizzato" });
  }
};

const verifyToken = (req, res, next) => {
  // Extract token from either cookie or Authorization header
  const token =
    req.cookies.access_token || req.headers.authorization?.split(" ")[1];

  if (!token) return next(errorHandler(401, "You are not authenticated"));

  // Verify the token using JWT
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return next(errorHandler(403, "Token is not valid"));

    req.user = user;
    next();
  });
};

// Middleware to verify if the user is an admin
const verifyAdmin = (req, res, next) => {
  const role = req.user?.role;

  if (!role || role !== "admin") {
    return next(
      errorHandler(
        403,
        "Permission denied. Only admin users can access this resource."
      )
    );
  }
  next();
};

const cloudinaryMiddleware = async (req, res, next) => {
  try {
    if (req.body.profilePicture) {
      const profilePictureResult = await cloudinary.uploader.upload(
        req.body.profilePicture,
        {
          folder: "users",
          allowed_formats: ["png", "jpg", "jpeg", "avif"],
        }
      );

      req.body.profilePicture = profilePictureResult.secure_url;
    }

    next();
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Error uploading profile picture. Check the image format.",
    });
  }
};

// ==================== MIDDLEWARE: hostAuth.middleware.js ====================

// Verifica che l'utente sia un host verificato
const requireHost = async (req, res, next) => {
  try {
    const host = await Host.findOne({ user: req.user._id });

    if (!host) {
      return res.status(403).json({
        error: "Accesso negato. Devi essere registrato come host.",
      });
    }

    if (host.status !== "active") {
      return res.status(403).json({
        error: `Account host non attivo. Status: ${host.status}`,
      });
    }

    req.host = host;
    next();
  } catch (error) {
    console.error("Error in requireHost middleware:", error);
    res.status(500).json({ error: error.message });
  }
};

// Verifica che l'utente sia admin
const requireAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Accesso negato. Richiesti privilegi admin.",
      });
    }
    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  authenticate,
  verifyToken,
  verifyAdmin,
  cloudinaryMiddleware,
  requireHost,
  requireAdmin,
};
