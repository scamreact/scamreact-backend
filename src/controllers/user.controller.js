const express = require("express");
const User = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
const Model = require("mongoose");
const error = require("console");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const sendUserAuthEmail = require("../utils/auth/sendUserAuthEmail.js");
const generateTokenPayload = require("../utils/auth/generateTokenPayload.js");
const errorHandler = require("../utils/error.js");
const { validationResult } = require("express-validator");
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// ---------- Create user ----------
const createUser = async (req, res, next) => {
  try {
    // Validazione dei campi in ingresso
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const {
      name,
      email,
      description,
      job,
      phoneNumber,
      profilePicture,
      password,
      confirmPassword,
    } = req.body;

    // Verifica campi obbligatori
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "I campi nome, email e password sono obbligatori",
      });
    }

    // Verifica se l'email esiste già
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User con la stessa email già esiste!" });
    }

    // Verifica corrispondenza password
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Le password non corrispondono" });
    }

    // Verifica complessità password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "La password deve contenere almeno una lettera minuscola, una maiuscola e un numero",
      });
    }

    // Crea lo user
    const newUser = await User.create({
      name,
      email,
      description,
      job,
      phoneNumber,
      profilePicture,
      password,
      isVerified: false, // Assicuriamoci che sia false per richiedere verifica
    });

    // Genera un token per la verifica dell'email e invia la mail
    try {
      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      await sendUserAuthEmail(newUser.email, token);
    } catch (emailError) {
      console.error("Errore invio email:", emailError);
      // Continuiamo comunque con la registrazione
    }

    // Risposta al client
    res.status(201).json({
      success: true,
      message:
        "Utente creato con successo! Controlla la tua email per la verifica.",
      user: newUser,
    });
  } catch (err) {
    console.error(err);
    next(errorHandler(500, "Internal Server Error"));
  }
};

// ---------- Login user profile ----------
const loginUser = async (req, res, next) => {
  dotenv.config();
  try {
    const { email, password } = req.body;

    // Log per debugging
    console.log(`Tentativo di login con email: ${email}`);

    // Verifica campi obbligatori
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email e password sono richiesti",
      });
    }

    // Verifica esistenza dell'utente
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User non trovato con email: ${email}`);
      return res
        .status(404)
        .json({ success: false, message: "User non trovato" });
    }

    // log per il debugging
    console.log(`User trovato: ${user._id}`);

    // Verifica password esistente
    if (!user.password) {
      console.error(`User ${user._id} non ha una password salvata!`);
      return res.status(500).json({
        success: false,
        message: "Errore nei dati dell'account",
      });
    }

    // Mostra i primi caratteri della password hashata per debug
    console.log(
      `Password hash nel DB (primi 10 caratteri): ${user.password.substring(
        0,
        10
      )}...`
    );

    // Confronto password
    let validPassword = false;

    try {
      // Più log per diagnostica
      console.log(`Lunghezza password fornita: ${password.length}`);
      validPassword = await bcrypt.compare(password, user.password);
      console.log(`Risultato verifica password: ${validPassword}`);
    } catch (bcryptError) {
      console.error("Errore bcrypt dettagliato:", bcryptError);
      return res.status(500).json({
        success: false,
        message: "Errore nella verifica delle credenziali",
        error: bcryptError.message,
      });
    }

    if (!validPassword) {
      // In sviluppo, potresti voler aggiungere più dettagli
      console.log(`Verifica password fallita per user con id: ${user._id}`);
      return res.status(401).json({
        success: false,
        message: "Credenziali errate",
      });
    }

    // aggiunta la verifica dell'email
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Email non verificata. Controlla la tua casella di posta.",
      });
    }

    // Generate JWT token for authentication
    const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
    const tokenPayload = generateTokenPayload(user);
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1h" });
    console.log("Token: ", token);

    // Prepara dati utente (escludi password)
    const { password: hashedPassword, ...rest } = user._doc;
    // Calcola la scadenza del token per il client
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

    // Opzionale: puoi includere più informazioni utente nella risposta
    const { password: removed, ...userData } = user._doc;

    res
      .cookie("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        expires: expiryDate,
      })
      .status(200)
      .json({
        success: true,
        message: "Login effettuato con successo",
        user: rest,
        token,
        expiration: expiryDate.getTime(),
      });
  } catch (err) {
    next(errorHandler(500, "Errore interno del server"));
    console.log(err);
    console.log("🔴 SERVER RESPONSE:", error.response?.status); // sarà 401
    console.log("📨 SERVER MESSAGE:", error.response?.data?.message); // importante!
  }
};

const getUserProfile = async (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return next(errorHandler(401, "You can see only your account"));
  }

  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "user not found." });
    }

    const { password, ...rest } = user._doc;

    res.status(200).json({ ...rest });
  } catch (err) {
    next(errorHandler(500, "Internal Server Error"));
  }
};

const updateUser = async (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return next(errorHandler(401, "You can update only your account"));
  }

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, firstName, lastName, email, phoneNumber, profilePicture } =
      req.body;

    const updateFields = {};

    if (name) updateFields.name = name;
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;

    if (email) {
      const existingEmail = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (existingEmail)
        return res.status(409).json({ message: "Email already exists" });
      updateFields.email = email;
    }

    if (phoneNumber) updateFields.phoneNumber = phoneNumber;
    if (profilePicture) updateFields.profilePicture = profilePicture;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password: userPassword, ...rest } = updatedUser._doc;
    res.status(200).json({ user: rest });
  } catch (err) {
    console.log(err);
    next(errorHandler(500, "Internal Server Error"));
  }
};

// Funzione dedicata per il cambio password
const changePassword = async (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return next(errorHandler(401, "You can change only your password"));
  }

  try {
    const { currentPassword, password, confirmPassword } = req.body;

    // Verifica campi obbligatori
    if (!currentPassword || !password || !confirmPassword) {
      return next(errorHandler(400, "All password fields are required"));
    }

    // Verifica corrispondenza password
    if (password !== confirmPassword) {
      return next(
        errorHandler(400, "New password and confirmation do not match")
      );
    }

    // Verifica requisiti password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      return next(
        errorHandler(
          400,
          "Password must contain at least one lowercase letter, one uppercase letter, and one number"
        )
      );
    }

    // Verifica password attuale
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    const isCorrectPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCorrectPassword) {
      return next(errorHandler(401, "Current password is incorrect"));
    }

    // Aggiorna password
    user.password = bcrypt.hashSync(password, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    next(errorHandler(500, "Error changing password"));
  }
};

const deleteUser = async (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return next(errorHandler(401, "You can delete only your account"));
  }
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User has been deleted" });
  } catch (err) {
    next(errorHandler(500, "Internal Server Error"));
  }
};

module.exports = {
  createUser,
  loginUser,
  getUserProfile,
  updateUser,
  changePassword,
  deleteUser,
};
