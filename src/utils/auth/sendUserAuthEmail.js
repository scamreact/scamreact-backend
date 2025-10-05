const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const sendUserAuthEmail = async (userEmail, token) => {
  try {
    // Create a nodemailer transporter using Gmail service
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL,
        pass: process.env.GMAIL_PSW,
      },
    });

    const baseURL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173"
        : "https://vicuss.netlify.app";

    const verifyEmailLink = `${baseURL}/user/verify-email/${token}`;

    const mailOptions = {
      from: process.env.GMAIL,
      to: userEmail,
      subject: "Vicus: Benvenuto! - Verifica la tua Email",
      html: `<p>Benvenuto in Vicus! Clicca <a href="${verifyEmailLink}">qui</a> per verificare la tua email ed entrare nella piattaforma! :)</p>`,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Verification email sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

module.exports = sendUserAuthEmail;
