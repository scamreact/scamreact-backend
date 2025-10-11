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

// const jwt = require("jsonwebtoken");
// const cloudinary = require("../utils/cloudinary/cloudinary.js");
// const Host = require("../models/host.model.js");
// const User = require("../models/user.model.js");

// // ==================== UTILITY FUNCTIONS ====================

// /**
//  * Crea un errore standardizzato con status code e messaggio
//  */
// const createError = (statusCode, message) => {
//   const error = new Error(message);
//   error.statusCode = statusCode;
//   return error;
// };

// /**
//  * Estrae il token JWT dalla richiesta (cookie o header Authorization)
//  */
// const extractToken = (req) => {
//   // Priorità al cookie per sicurezza, fallback all'header
//   if (req.cookies?.access_token) {
//     return req.cookies.access_token;
//   }

//   const authHeader = req.headers.authorization;
//   if (authHeader?.startsWith("Bearer ")) {
//     return authHeader.substring(7); // Rimuove "Bearer "
//   }

//   return null;
// };

// /**
//  * Verifica e decodifica il token JWT
//  */
// const verifyJWT = (token) => {
//   return new Promise((resolve, reject) => {
//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//       if (err) {
//         if (err.name === "TokenExpiredError") {
//           reject(
//             createError(401, "Token scaduto. Effettua nuovamente il login.")
//           );
//         } else if (err.name === "JsonWebTokenError") {
//           reject(createError(401, "Token non valido."));
//         } else {
//           reject(createError(401, "Errore nella verifica del token."));
//         }
//       } else {
//         resolve(decoded);
//       }
//     });
//   });
// };

// // ==================== AUTHENTICATION MIDDLEWARE ====================

// /**
//  * Middleware principale di autenticazione
//  * Verifica il token JWT e carica l'utente dal database
//  */
// const authenticate = async (req, res, next) => {
//   try {
//     const token = extractToken(req);

//     if (!token) {
//       return next(
//         createError(401, "Token di autenticazione mancante. Effettua il login.")
//       );
//     }

//     // Verifica il token
//     const decoded = await verifyJWT(token);

//     // Carica l'utente dal database con solo i campi necessari
//     const user = await User.findById(decoded._id)
//       .select("-password -__v")
//       .lean();

//     if (!user) {
//       return next(
//         createError(401, "Utente non trovato o account disattivato.")
//       );
//     }

//     // Verifica che l'account sia attivo (se hai un campo status)
//     if (user.status && user.status !== "active") {
//       return next(
//         createError(403, `Account non attivo. Status: ${user.status}`)
//       );
//     }

//     // Attacca l'utente alla richiesta per i middleware successivi
//     req.user = user;
//     req.userId = user._id.toString();

//     next();
//   } catch (error) {
//     // Gestisce errori già formattati da verifyJWT
//     if (error.statusCode) {
//       return next(error);
//     }

//     // Gestisce errori del database o altri errori imprevisti
//     console.error("Error in authenticate middleware:", error);
//     next(createError(500, "Errore interno durante l'autenticazione."));
//   }
// };

// /**
//  * Middleware leggero per verificare solo il token senza query al DB
//  * Utile per endpoint che non richiedono dati utente aggiornati
//  */
// const verifyTokenOnly = async (req, res, next) => {
//   try {
//     const token = extractToken(req);

//     if (!token) {
//       return next(createError(401, "Token di autenticazione mancante."));
//     }

//     const decoded = await verifyJWT(token);

//     req.user = {
//       _id: decoded._id,
//       email: decoded.email,
//       role: decoded.role,
//     };
//     req.userId = decoded._id;

//     next();
//   } catch (error) {
//     if (error.statusCode) {
//       return next(error);
//     }
//     console.error("Error in verifyTokenOnly middleware:", error);
//     next(createError(500, "Errore interno durante la verifica del token."));
//   }
// };

// // ==================== AUTHORIZATION MIDDLEWARE ====================

// /**
//  * Verifica che l'utente abbia il ruolo di admin
//  * IMPORTANTE: Richiede che authenticate sia eseguito prima
//  */
// const requireAdmin = async (req, res, next) => {
//   try {
//     if (!req.user) {
//       return next(
//         createError(
//           401,
//           "Autenticazione richiesta. Usa il middleware authenticate prima di requireAdmin."
//         )
//       );
//     }

//     // Verifica il ruolo direttamente dall'utente caricato
//     if (req.user.role !== "admin") {
//       return next(
//         createError(
//           403,
//           "Accesso negato. Sono richiesti privilegi di amministratore."
//         )
//       );
//     }

//     next();
//   } catch (error) {
//     console.error("Error in requireAdmin middleware:", error);
//     next(createError(500, "Errore nella verifica dei privilegi."));
//   }
// };

// /**
//  * Verifica che l'utente sia un host verificato e attivo
//  * IMPORTANTE: Richiede che authenticate sia eseguito prima
//  */
// const requireHost = async (req, res, next) => {
//   try {
//     if (!req.user) {
//       return next(
//         createError(
//           401,
//           "Autenticazione richiesta. Usa il middleware authenticate prima di requireHost."
//         )
//       );
//     }

//     // Carica i dati del host dal database
//     const host = await Host.findOne({ user: req.user._id })
//       .select("-__v")
//       .lean();

//     if (!host) {
//       return next(
//         createError(
//           403,
//           "Accesso negato. Devi essere registrato come host per accedere a questa risorsa."
//         )
//       );
//     }

//     // Verifica lo stato dell'account host
//     if (host.status !== "active") {
//       const statusMessages = {
//         pending: "Il tuo account host è in attesa di verifica.",
//         suspended: "Il tuo account host è stato sospeso. Contatta il supporto.",
//         rejected: "La tua richiesta di diventare host è stata rifiutata.",
//       };

//       const message =
//         statusMessages[host.status] ||
//         `Account host non attivo. Status: ${host.status}`;
//       return next(createError(403, message));
//     }

//     // Attacca i dati del host alla richiesta
//     req.host = host;
//     req.hostId = host._id.toString();

//     next();
//   } catch (error) {
//     console.error("Error in requireHost middleware:", error);
//     next(createError(500, "Errore nella verifica dello status host."));
//   }
// };

// /**
//  * Verifica che l'utente sia il proprietario della risorsa o un admin
//  * Usa req.params.userId o req.params.id per il confronto
//  */
// const requireOwnerOrAdmin = (paramName = "userId") => {
//   return (req, res, next) => {
//     try {
//       if (!req.user) {
//         return next(createError(401, "Autenticazione richiesta."));
//       }

//       const resourceUserId = req.params[paramName];
//       const isOwner = req.userId === resourceUserId;
//       const isAdmin = req.user.role === "admin";

//       if (!isOwner && !isAdmin) {
//         return next(
//           createError(
//             403,
//             "Accesso negato. Puoi modificare solo le tue risorse."
//           )
//         );
//       }

//       next();
//     } catch (error) {
//       console.error("Error in requireOwnerOrAdmin middleware:", error);
//       next(createError(500, "Errore nella verifica dei permessi."));
//     }
//   };
// };

// // ==================== CLOUDINARY MIDDLEWARE ====================

// /**
//  * Configurazione validazione immagini
//  */
// const IMAGE_VALIDATION = {
//   maxSize: 5 * 1024 * 1024, // 5MB in bytes
//   allowedFormats: ["png", "jpg", "jpeg", "webp", "avif"],
//   allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/avif"],
// };

// /**
//  * Valida che la stringa sia una data URI valida
//  */
// const isValidDataURI = (str) => {
//   const dataURIRegex = /^data:image\/(png|jpeg|jpg|webp|avif);base64,/;
//   return dataURIRegex.test(str);
// };

// /**
//  * Calcola la dimensione approssimativa di una stringa base64
//  */
// const getBase64Size = (base64String) => {
//   const base64Data = base64String.split(",")[1] || base64String;
//   const padding = (base64Data.match(/=/g) || []).length;
//   return base64Data.length * 0.75 - padding;
// };

// /**
//  * Middleware per l'upload di immagini profilo su Cloudinary
//  */
// const uploadProfilePicture = async (req, res, next) => {
//   try {
//     // Se non c'è immagine da caricare, passa avanti
//     if (!req.body.profilePicture) {
//       return next();
//     }

//     const imageData = req.body.profilePicture;

//     // Valida che sia una data URI valida
//     if (!isValidDataURI(imageData)) {
//       return next(
//         createError(
//           400,
//           "Formato immagine non valido. Usa una data URI base64."
//         )
//       );
//     }

//     // Valida la dimensione
//     const imageSize = getBase64Size(imageData);
//     if (imageSize > IMAGE_VALIDATION.maxSize) {
//       const maxSizeMB = IMAGE_VALIDATION.maxSize / (1024 * 1024);
//       return next(
//         createError(
//           400,
//           `Immagine troppo grande. Dimensione massima: ${maxSizeMB}MB`
//         )
//       );
//     }

//     // Upload su Cloudinary con configurazione ottimizzata
//     const uploadResult = await cloudinary.uploader.upload(imageData, {
//       folder: "users/profile-pictures",
//       allowed_formats: IMAGE_VALIDATION.allowedFormats,
//       transformation: [
//         { width: 500, height: 500, crop: "fill", gravity: "face" },
//         { quality: "auto:good" },
//         { fetch_format: "auto" },
//       ],
//       resource_type: "image",
//     });

//     // Sostituisci la data URI con l'URL sicuro di Cloudinary
//     req.body.profilePicture = uploadResult.secure_url;
//     req.cloudinaryPublicId = uploadResult.public_id; // Salva per eventuale eliminazione

//     next();
//   } catch (error) {
//     console.error("Error in uploadProfilePicture middleware:", error);

//     // Gestisce errori specifici di Cloudinary
//     if (error.http_code === 400) {
//       return next(
//         createError(
//           400,
//           "Formato immagine non supportato. Usa PNG, JPG, WEBP o AVIF."
//         )
//       );
//     }

//     next(createError(500, "Errore durante l'upload dell'immagine. Riprova."));
//   }
// };

// /**
//  * Middleware generico per upload di immagini multiple (es. galleria proprietà)
//  */
// const uploadMultipleImages = (folderPath, maxImages = 10) => {
//   return async (req, res, next) => {
//     try {
//       const images = req.body.images;

//       if (!images || !Array.isArray(images)) {
//         return next();
//       }

//       if (images.length > maxImages) {
//         return next(
//           createError(400, `Puoi caricare massimo ${maxImages} immagini.`)
//         );
//       }

//       const uploadPromises = images.map(async (imageData, index) => {
//         if (!isValidDataURI(imageData)) {
//           throw createError(400, `Immagine ${index + 1} non valida.`);
//         }

//         const imageSize = getBase64Size(imageData);
//         if (imageSize > IMAGE_VALIDATION.maxSize) {
//           throw createError(400, `Immagine ${index + 1} troppo grande.`);
//         }

//         return cloudinary.uploader.upload(imageData, {
//           folder: folderPath,
//           allowed_formats: IMAGE_VALIDATION.allowedFormats,
//           transformation: [
//             { width: 1200, height: 800, crop: "limit" },
//             { quality: "auto:good" },
//             { fetch_format: "auto" },
//           ],
//           resource_type: "image",
//         });
//       });

//       const results = await Promise.all(uploadPromises);

//       req.body.images = results.map((result) => ({
//         url: result.secure_url,
//         publicId: result.public_id,
//       }));

//       next();
//     } catch (error) {
//       console.error("Error in uploadMultipleImages middleware:", error);

//       if (error.statusCode) {
//         return next(error);
//       }

//       next(createError(500, "Errore durante l'upload delle immagini."));
//     }
//   };
// };

// // ==================== RATE LIMITING HELPER ====================

// /**
//  * Middleware per limitare le richieste per utente autenticato
//  * Richiede un rate limiter configurato (es. express-rate-limit)
//  */
// const createUserRateLimiter = (windowMs, max) => {
//   return (req, res, next) => {
//     // Implementa rate limiting basato su userId invece che su IP
//     // Questo richiede express-rate-limit o simili
//     // Placeholder per implementazione futura
//     next();
//   };
// };

// // ==================== EXPORTS ====================

// module.exports = {
//   // Authentication
//   authenticate,
//   verifyTokenOnly,

//   // Authorization
//   requireAdmin,
//   requireHost,
//   requireOwnerOrAdmin,

//   // Cloudinary
//   uploadProfilePicture,
//   uploadMultipleImages,

//   // Utilities (export per testing o uso avanzato)
//   extractToken,
//   createError,
// };
