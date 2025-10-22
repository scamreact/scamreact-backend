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
      html: `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .price { font-size: 24px; color: #4F46E5; font-weight: bold; text-align: center; margin: 20px 0; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        .status-badge { display: inline-block; background: #fbbf24; color: #78350f; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Ci siamo quasi</h1>
          <p>Benvenuto in Vicus!</p>
        </div>
        
        <div class="content">
          <p>Ciao ${booking.customer_name},</p>
          <p>Clicca <a href="${verifyEmailLink}">qui</a> per verificare la tua email ed entrare nella piattaforma! :)</p>        
          <p style="margin-top: 30px;">
            <strong>Hai domande?</strong><br>
            Rispondi a questa email o contattaci a ${
              process.env.SUPPORT_EMAIL || "support@example.com"
            }
          </p>
          
          <div class="footer">
            <p>Questa email è stata inviata da ${
              process.env.APP_NAME || "Your App"
            }</p>
            <p>© ${new Date().getFullYear()} Tutti i diritti riservati</p>
          </div>
        </div>
      </div>
    </body>
    </html>`,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Verification email sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

module.exports = sendUserAuthEmail;
