const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const sendWelcomeEmail = async (adminEmail, token) => {
  try {
    // Create a nodemailer transporter using Gmail service
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL,
        pass: process.env.GMAIL_PSW_APP,
      },
    });

    const baseURL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173"
        : "https://vicuss.netlify.app";
    const verifyEmailLink = `${baseURL}/admin/verify-email/${token}`;

    const mailOptions = {
      from: process.env.GMAIL,
      to: adminEmail,
      subject: "Vicus: Sei quasi un admin - Verifica la tua Email",
      html: `
            <p>Benvenuto in Vicus! Clicca <a href="${verifyEmailLink}">qui</a> per verificare la tua email e diventare un amministratore.</p>
        `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Welcome Email sent successfully:", info.response);
  } catch (err) {
    console.error("Error sending welcome email: ", err);
    throw err;
  }
};

module.exports = sendWelcomeEmail;
