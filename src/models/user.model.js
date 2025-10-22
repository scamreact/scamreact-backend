const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const type = require("os");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Your name is required"],
    },
    email: {
      type: String,
      required: [true, "Your email address is required"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Your password is required"],
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    job: {
      type: String,
      required: [true, "Your job is required"],
    },
    description: {
      type: String,
      required: [true, "Your description is required"],
    },
    profilePicture: {
      type: String,
      default:
        "https://img.freepik.com/premium-vector/man-avatar-profile-picture-vector-illustration_268834-538.jpg",
    },
    createdAt: {
      type: Date,
      default: new Date(),
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      default: "user",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password prima di salvarla
UserSchema.pre("save", async function (next) {
  // Controlla se la password è stata modificata
  if (!this.isModified("password")) return next();

  try {
    // Hasha la password utilizzando il salt = 10
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error); // Passa tutti gli errori al prossimo middleware
  }
});

// // Metodo per comparare le password
UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
