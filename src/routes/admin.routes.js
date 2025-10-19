const express = require("express");
const { check } = require("express-validator");
const Admin = require("../models/admin.model.js");
const { verify } = require("crypto");
const router = express.Router();
const {
  createAdmin,
  loginAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  getAllUsers,
  getAdminProfile,
} = require("../controllers/admin.controller.js");
const {
  passwordReset,
  passwordResetRequest,
  verifyEmail,
  verifyPassword,
} = require("../controllers/auth.controller.js");
const {
  authenticate,
  cloudinaryMiddleware,
  verifyAdmin,
} = require("../middleware/auth.middleware.js");

// ---------- Admin Routes ----------
// Admin registration
router.post(
  "/sign-up",
  [
    check("firstName")
      .notEmpty()
      .escape()
      .withMessage("First name is required"),
    check("lastName").notEmpty().escape().withMessage("Last name is required"),
    check("taxId")
      .notEmpty()
      .withMessage("Valid TaxID is required")
      .isLength({ min: 16, max: 16 })
      .withMessage("TaxID must be exactly 16 characters")
      .isAlphanumeric()
      .withMessage("TaxID must contain only alphanumeric characters")
      .escape(),
    check("email")
      .notEmpty()
      .isEmail()
      .escape()
      .withMessage("Valid email is required"),
    check("phoneNumber").notEmpty().withMessage("Phone number is required"),
    check("specialization")
      .notEmpty()
      .escape()
      .withMessage("Specialization is required"),
    check("city").notEmpty().escape().withMessage("City is required"),
  ],
  createAdmin
);

// Admin login
router.post(
  "/login",
  [
    check("email").notEmpty().isEmail().withMessage("Valid email is required"),
    check("password").notEmpty().withMessage("Password is required"),
  ],
  loginAdmin
);

// User verification
router.post("/verify-email/:token", (req, res, next) =>
  verifyEmail(req, res, next, Admin)
);
router.post("/verify-password", authenticate, (req, res, next) =>
  verifyPassword(req, res, next, Admin)
);
router.post("/password-reset-request", (req, res, next) =>
  passwordResetRequest(req, res, next, Admin)
);
router.post("/password-reset/:token", (req, res, next) =>
  passwordReset(req, res, next, Admin)
);

router.put(
  "/update/:id",
  authenticate,
  cloudinaryMiddleware,
  [
    check("taxId")
      .optional()
      .notEmpty()
      .withMessage("Valid TaxID is required")
      .isLength({ min: 16, max: 16 })
      .withMessage("TaxID must be exactly 16 characters")
      .isAlphanumeric()
      .withMessage("TaxID must contain only alphanumeric characters")
      .escape(),
    check("email")
      .optional()
      .isEmail()
      .escape()
      .withMessage("Valid email is required"),
    check("password")
      .optional()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  updateAdmin
);

// router.get("/users", verifyToken, verifyAdmin, getAllUsers); --> non funziona!
router.get("/users", getAllUsers);
router.get("/admins", getAllAdmins);
router.delete("/delete/:id", authenticate, deleteAdmin);
router.get("/:id", getAdminById);
router.get("/profile/:id", authenticate, getAdminProfile);

module.exports = router;

// const express = require("express");
// const { check, validationResult } = require("express-validator");
// const router = express.Router();

// // Import controllers
// const {
//   createAdmin,
//   loginAdmin,
//   getAllAdmins,
//   getAdminById,
//   updateAdmin,
//   deleteAdmin,
//   getAllUsers,
//   getAdminProfile,
// } = require("../controllers/admin.controller.js");

// const {
//   passwordReset,
//   passwordResetRequest,
//   verifyEmail,
//   verifyPassword,
// } = require("../controllers/auth.controller.js");

// // Import middleware corretti dal file auth.middleware.js
// const {
//   authenticate,
//   requireAdmin,
//   requireOwnerOrAdmin,
//   uploadProfilePicture,
// } = require("../middleware/auth.middleware.js");

// const Admin = require("../models/admin.model.js");

// // ==================== VALIDATION MIDDLEWARE ====================

// /**
//  * Middleware per gestire gli errori di validazione di express-validator
//  */
// const handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       success: false,
//       errors: errors.array().map((err) => ({
//         field: err.path || err.param,
//         message: err.msg,
//       })),
//     });
//   }
//   next();
// };

// // ==================== VALIDATION RULES ====================

// const adminValidationRules = {
//   registration: [
//     check("firstName")
//       .trim()
//       .notEmpty()
//       .withMessage("Il nome è obbligatorio")
//       .isLength({ min: 2, max: 50 })
//       .withMessage("Il nome deve essere tra 2 e 50 caratteri")
//       .escape(),

//     check("lastName")
//       .trim()
//       .notEmpty()
//       .withMessage("Il cognome è obbligatorio")
//       .isLength({ min: 2, max: 50 })
//       .withMessage("Il cognome deve essere tra 2 e 50 caratteri")
//       .escape(),

//     check("taxId")
//       .trim()
//       .notEmpty()
//       .withMessage("Il codice fiscale è obbligatorio")
//       .isLength({ min: 16, max: 16 })
//       .withMessage("Il codice fiscale deve essere di 16 caratteri")
//       .matches(/^[A-Z0-9]+$/i)
//       .withMessage("Il codice fiscale deve contenere solo lettere e numeri")
//       .toUpperCase(),

//     check("email")
//       .trim()
//       .notEmpty()
//       .withMessage("L'email è obbligatoria")
//       .isEmail()
//       .withMessage("Formato email non valido")
//       .normalizeEmail(),

//     check("phoneNumber")
//       .trim()
//       .notEmpty()
//       .withMessage("Il numero di telefono è obbligatorio")
//       .matches(/^[\d\s\+\-\(\)]+$/)
//       .withMessage("Formato numero di telefono non valido"),

//     check("specialization")
//       .trim()
//       .notEmpty()
//       .withMessage("La specializzazione è obbligatoria")
//       .isLength({ min: 3, max: 100 })
//       .withMessage("La specializzazione deve essere tra 3 e 100 caratteri")
//       .escape(),

//     check("city")
//       .trim()
//       .notEmpty()
//       .withMessage("La città è obbligatoria")
//       .isLength({ min: 2, max: 100 })
//       .withMessage("La città deve essere tra 2 e 100 caratteri")
//       .escape(),

//     check("password")
//       .notEmpty()
//       .withMessage("La password è obbligatoria")
//       .isLength({ min: 8 })
//       .withMessage("La password deve essere di almeno 8 caratteri")
//       .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
//       .withMessage(
//         "La password deve contenere almeno una maiuscola, una minuscola e un numero"
//       ),
//   ],

//   login: [
//     check("email")
//       .trim()
//       .notEmpty()
//       .withMessage("L'email è obbligatoria")
//       .isEmail()
//       .withMessage("Formato email non valido")
//       .normalizeEmail(),

//     check("password").notEmpty().withMessage("La password è obbligatoria"),
//   ],

//   update: [
//     check("firstName")
//       .optional()
//       .trim()
//       .isLength({ min: 2, max: 50 })
//       .withMessage("Il nome deve essere tra 2 e 50 caratteri")
//       .escape(),

//     check("lastName")
//       .optional()
//       .trim()
//       .isLength({ min: 2, max: 50 })
//       .withMessage("Il cognome deve essere tra 2 e 50 caratteri")
//       .escape(),

//     check("taxId")
//       .optional()
//       .trim()
//       .isLength({ min: 16, max: 16 })
//       .withMessage("Il codice fiscale deve essere di 16 caratteri")
//       .matches(/^[A-Z0-9]+$/i)
//       .withMessage("Il codice fiscale deve contenere solo lettere e numeri")
//       .toUpperCase(),

//     check("email")
//       .optional()
//       .trim()
//       .isEmail()
//       .withMessage("Formato email non valido")
//       .normalizeEmail(),

//     check("phoneNumber")
//       .optional()
//       .trim()
//       .matches(/^[\d\s\+\-\(\)]+$/)
//       .withMessage("Formato numero di telefono non valido"),

//     check("specialization")
//       .optional()
//       .trim()
//       .isLength({ min: 3, max: 100 })
//       .withMessage("La specializzazione deve essere tra 3 e 100 caratteri")
//       .escape(),

//     check("city")
//       .optional()
//       .trim()
//       .isLength({ min: 2, max: 100 })
//       .withMessage("La città deve essere tra 2 e 100 caratteri")
//       .escape(),

//     check("password")
//       .optional()
//       .isLength({ min: 8 })
//       .withMessage("La password deve essere di almeno 8 caratteri")
//       .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
//       .withMessage(
//         "La password deve contenere almeno una maiuscola, una minuscola e un numero"
//       ),
//   ],
// };

// // ==================== PUBLIC ROUTES ====================

// /*** POST /api/admin/sign-up
//  * Registrazione nuovo amministratore */
// router.post(
//   "/sign-up",
//   adminValidationRules.registration,
//   handleValidationErrors,
//   createAdmin
// );

// /*** POST /api/admin/login
//  * Login amministratore */
// router.post(
//   "/login",
//   adminValidationRules.login,
//   handleValidationErrors,
//   loginAdmin
// );

// // ==================== EMAIL & PASSWORD RECOVERY ====================

// /**
//  * POST /api/admin/verify-email/:token
//  * Verifica email tramite token
//  */
// router.post("/verify-email/:token", (req, res, next) =>
//   verifyEmail(req, res, next, Admin)
// );

// /**
//  * POST /api/admin/password-reset-request
//  * Richiesta reset password (invia email)
//  */
// router.post("/password-reset-request", (req, res, next) =>
//   passwordResetRequest(req, res, next, Admin)
// );

// /**
//  * POST /api/admin/password-reset/:token
//  * Reset password tramite token
//  */
// router.post("/password-reset/:token", (req, res, next) =>
//   passwordReset(req, res, next, Admin)
// );

// /**
//  * POST /api/admin/verify-password
//  * Verifica password corrente (richiede autenticazione)
//  */
// router.post("/verify-password", authenticate, (req, res, next) =>
//   verifyPassword(req, res, next, Admin)
// );

// // ==================== PROTECTED ROUTES - ADMIN ONLY ====================

// /**
//  * GET /api/admin/users
//  * Ottiene lista di tutti gli utenti (solo admin)
//  */
// router.get("/users", authenticate, requireAdmin, getAllUsers);

// /**
//  * GET /api/admin/admins
//  * Ottiene lista di tutti gli amministratori (solo admin)
//  */
// router.get("/admins", authenticate, requireAdmin, getAllAdmins);

// // ==================== PROTECTED ROUTES - AUTHENTICATED ====================

// /**
//  * GET /api/admin/profile/:id
//  * Ottiene profilo amministratore specifico
//  * Accessibile solo dal proprietario o da un admin
//  */
// router.get(
//   "/profile/:id",
//   authenticate,
//   requireOwnerOrAdmin("id"),
//   getAdminProfile
// );

// /**
//  * GET /api/admin/:id
//  * Ottiene dettagli amministratore per ID
//  * Accessibile solo da admin autenticati
//  */
// router.get("/:id", authenticate, requireAdmin, getAdminById);

// /**
//  * PUT /api/admin/update/:id
//  * Aggiorna dati amministratore
//  * Accessibile solo dal proprietario o da un admin superiore
//  */
// router.put(
//   "/update/:id",
//   authenticate,
//   requireOwnerOrAdmin("id"),
//   uploadProfilePicture,
//   adminValidationRules.update,
//   handleValidationErrors,
//   updateAdmin
// );

// /**
//  * DELETE /api/admin/delete/:id
//  * Elimina amministratore
//  * Accessibile solo da admin autenticati
//  */
// router.delete("/delete/:id", authenticate, requireAdmin, deleteAdmin);

// module.exports = router;
