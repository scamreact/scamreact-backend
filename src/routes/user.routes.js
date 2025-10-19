const express = require("express");
const { verify } = require("crypto");
const { check } = require("express-validator");
const User = require("../models/user.model.js");
const router = express.Router();
const {
  createUser,
  loginUser,
  updateUser,
  deleteUser,
  getUserProfile,
} = require("../controllers/user.controller.js");
const {
  passwordReset,
  passwordResetRequest,
  requestNewVerificationEmail,
  verifyPassword,
  verifyEmail,
} = require("../controllers/auth.controller.js");
const {
  cloudinaryMiddleware,
  authenticate,
} = require("../middleware/auth.middleware.js");

// ---------- User Routes ----------
// User registration
router.post(
  "/sign-up",
  [
    check("name").notEmpty().escape().withMessage("First name is required"),

    check("email")
      .notEmpty()
      .isEmail()
      .escape()
      .withMessage("Valid email is required"),

    check("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  createUser
);

// User login
router.post(
  "/login",
  [
    check("email").notEmpty().isEmail().withMessage("Valid email is required"),
    check("password").notEmpty().withMessage("Password is required"),
  ],
  loginUser
);

// User verification
router.post("/verify-email/:token", (req, res, next) =>
  verifyEmail(req, res, next, User)
);

// User verification email resend
router.post("/resend-verification", (req, res, next) =>
  requestNewVerificationEmail(req, res, next, User)
);

// Password verification
router.post("/verify-password", authenticate, (req, res, next) =>
  verifyPassword(req, res, next, User)
);

router.post("/password-reset-request", (req, res, next) =>
  passwordResetRequest(req, res, next, User)
);
router.post("/password-reset/:token", (req, res, next) =>
  passwordReset(req, res, next, User)
);

router.put(
  "/update/:id",
  authenticate,
  cloudinaryMiddleware,
  [
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
  updateUser
);

router.delete("/delete/:id", authenticate, deleteUser);
router.get("/:id", authenticate, getUserProfile);

module.exports = router;

// const express = require("express");
// const { check, validationResult } = require("express-validator");
// const router = express.Router();

// // Import controllers
// const {
//   createUser,
//   loginUser,
//   updateUser,
//   deleteUser,
//   getUserProfile,
// } = require("../controllers/user.controller.js");

// const {
//   passwordReset,
//   passwordResetRequest,
//   requestNewVerificationEmail,
//   verifyPassword,
//   verifyEmail,
// } = require("../controllers/auth.controller.js");

// // Import middleware corretti dal file auth.middleware.js
// const {
//   authenticate,
//   requireOwnerOrAdmin,
//   uploadProfilePicture,
// } = require("../middleware/auth.middleware.js");

// const User = require("../models/user.model.js");

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

// const userValidationRules = {
//   registration: [
//     check("name")
//       .trim()
//       .notEmpty()
//       .withMessage("Il nome è obbligatorio")
//       .isLength({ min: 2, max: 100 })
//       .withMessage("Il nome deve essere tra 2 e 100 caratteri")
//       .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
//       .withMessage(
//         "Il nome può contenere solo lettere, spazi, apostrofi e trattini"
//       )
//       .escape(),

//     check("email")
//       .trim()
//       .notEmpty()
//       .withMessage("L'email è obbligatoria")
//       .isEmail()
//       .withMessage("Formato email non valido")
//       .normalizeEmail(),

//     check("password")
//       .notEmpty()
//       .withMessage("La password è obbligatoria")
//       .isLength({ min: 8 })
//       .withMessage("La password deve essere di almeno 8 caratteri")
//       .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
//       .withMessage(
//         "La password deve contenere almeno una maiuscola, una minuscola e un numero"
//       ),

//     check("phoneNumber")
//       .optional()
//       .trim()
//       .matches(/^[\d\s\+\-\(\)]+$/)
//       .withMessage("Formato numero di telefono non valido"),

//     check("dateOfBirth")
//       .optional()
//       .isISO8601()
//       .withMessage("Formato data non valido")
//       .custom((value) => {
//         const birthDate = new Date(value);
//         const today = new Date();
//         const age = today.getFullYear() - birthDate.getFullYear();
//         if (age < 18) {
//           throw new Error("Devi avere almeno 18 anni per registrarti");
//         }
//         return true;
//       }),
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
//     check("name")
//       .optional()
//       .trim()
//       .isLength({ min: 2, max: 100 })
//       .withMessage("Il nome deve essere tra 2 e 100 caratteri")
//       .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
//       .withMessage(
//         "Il nome può contenere solo lettere, spazi, apostrofi e trattini"
//       )
//       .escape(),

//     check("email")
//       .optional()
//       .trim()
//       .isEmail()
//       .withMessage("Formato email non valido")
//       .normalizeEmail(),

//     check("password")
//       .optional()
//       .isLength({ min: 8 })
//       .withMessage("La password deve essere di almeno 8 caratteri")
//       .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
//       .withMessage(
//         "La password deve contenere almeno una maiuscola, una minuscola e un numero"
//       ),

//     check("phoneNumber")
//       .optional()
//       .trim()
//       .matches(/^[\d\s\+\-\(\)]+$/)
//       .withMessage("Formato numero di telefono non valido"),

//     check("dateOfBirth")
//       .optional()
//       .isISO8601()
//       .withMessage("Formato data non valido")
//       .custom((value) => {
//         const birthDate = new Date(value);
//         const today = new Date();
//         const age = today.getFullYear() - birthDate.getFullYear();
//         if (age < 18) {
//           throw new Error("Devi avere almeno 18 anni");
//         }
//         return true;
//       }),

//     check("bio")
//       .optional()
//       .trim()
//       .isLength({ max: 500 })
//       .withMessage("La biografia non può superare 500 caratteri")
//       .escape(),

//     check("address")
//       .optional()
//       .trim()
//       .isLength({ max: 200 })
//       .withMessage("L'indirizzo non può superare 200 caratteri")
//       .escape(),

//     check("city")
//       .optional()
//       .trim()
//       .isLength({ max: 100 })
//       .withMessage("La città non può superare 100 caratteri")
//       .escape(),

//     check("country")
//       .optional()
//       .trim()
//       .isLength({ max: 100 })
//       .withMessage("Il paese non può superare 100 caratteri")
//       .escape(),

//     check("postalCode")
//       .optional()
//       .trim()
//       .matches(/^[A-Z0-9\s-]{3,10}$/i)
//       .withMessage("Formato codice postale non valido"),
//   ],

//   emailResend: [
//     check("email")
//       .trim()
//       .notEmpty()
//       .withMessage("L'email è obbligatoria")
//       .isEmail()
//       .withMessage("Formato email non valido")
//       .normalizeEmail(),
//   ],
// };

// // ==================== PUBLIC ROUTES ====================

// /**
//  * POST /api/user/sign-up
//  * Registrazione nuovo utente
//  */
// router.post(
//   "/sign-up",
//   userValidationRules.registration,
//   handleValidationErrors,
//   createUser
// );

// /**
//  * POST /api/user/login
//  * Login utente
//  */
// router.post(
//   "/login",
//   userValidationRules.login,
//   handleValidationErrors,
//   loginUser
// );

// // ==================== EMAIL & PASSWORD RECOVERY ====================

// /**
//  * POST /api/user/verify-email/:token
//  * Verifica email tramite token
//  */
// router.post("/verify-email/:token", (req, res, next) =>
//   verifyEmail(req, res, next, User)
// );

// /**
//  * POST /api/user/resend-verification
//  * Richiesta invio nuova email di verifica
//  */
// router.post(
//   "/resend-verification",
//   userValidationRules.emailResend,
//   handleValidationErrors,
//   (req, res, next) => requestNewVerificationEmail(req, res, next, User)
// );

// /**
//  * POST /api/user/password-reset-request
//  * Richiesta reset password (invia email)
//  */
// router.post("/password-reset-request", (req, res, next) =>
//   passwordResetRequest(req, res, next, User)
// );

// /**
//  * POST /api/user/password-reset/:token
//  * Reset password tramite token
//  */
// router.post("/password-reset/:token", (req, res, next) =>
//   passwordReset(req, res, next, User)
// );

// /**
//  * POST /api/user/verify-password
//  * Verifica password corrente (richiede autenticazione)
//  */
// router.post("/verify-password", authenticate, (req, res, next) =>
//   verifyPassword(req, res, next, User)
// );

// // ==================== PROTECTED ROUTES - AUTHENTICATED ====================

// /**
//  * GET /api/user/:id
//  * Ottiene profilo utente specifico
//  * Accessibile solo dal proprietario o da un amministratore
//  */
// router.get("/:id", authenticate, requireOwnerOrAdmin("id"), getUserProfile);

// /**
//  * PUT /api/user/update/:id
//  * Aggiorna dati utente
//  * Accessibile solo dal proprietario o da un amministratore
//  * Include upload immagine profilo tramite Cloudinary
//  */
// router.put(
//   "/update/:id",
//   authenticate,
//   requireOwnerOrAdmin("id"),
//   uploadProfilePicture,
//   userValidationRules.update,
//   handleValidationErrors,
//   updateUser
// );

// /**
//  * DELETE /api/user/delete/:id
//  * Elimina account utente
//  * Accessibile solo dal proprietario o da un amministratore
//  */
// router.delete(
//   "/delete/:id",
//   authenticate,
//   requireOwnerOrAdmin("id"),
//   deleteUser
// );

// module.exports = router;
