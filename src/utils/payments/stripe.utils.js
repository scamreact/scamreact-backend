const nodemailer = require("nodemailer");

/**
 * Calcola commissioni piattaforma
 */
const calculateFees = (totalAmount, platformFeePercentage = 10) => {
  const platformFee = Math.round((totalAmount * platformFeePercentage) / 100);
  const hostAmount = totalAmount - platformFee;

  return {
    totalAmount,
    platformFee,
    hostAmount,
    platformFeePercentage,
  };
};

/**
 * Crea metadata completi per Payment Intent
 */
const createPaymentMetadata = (
  listing_id,
  host_id,
  booking_data,
  customer_email,
  fees
) => {
  return {
    listing_id,
    host_id,
    booking_id: booking_data.booking_id || `BKG-${Date.now()}`,
    customer_email,
    customer_name:
      booking_data.customer_name || booking_data.guest_name || "Cliente",
    property_name:
      booking_data.property_name || booking_data.listing_name || "Struttura",
    check_in: booking_data.checkin,
    check_out: booking_data.checkout,
    checkin: booking_data.checkin, // mantieni anche questi
    checkout: booking_data.checkout,
    guests: booking_data.guests?.toString() || "1",
    platform_fee: fees.platformFee.toString(),
    host_amount: fees.hostAmount.toString(),
  };
};

/* Invia email di conferma prenotazione */
const sendConfirmationEmail = async (metadata, amount) => {
  console.log("📧 Invio email di conferma a:", metadata.customer_email);
  console.log("💰 Importo pagato:", (amount / 100).toFixed(2), "EUR");

  try {
    const transporter = nodemailer.createTransporter({
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
        : "https://vicus.netlify.app";

    const mailOptions = {
      from: process.env.GMAIL,
      to: metadata.customer_email,
      subject: "✅ Conferma Prenotazione - Vicus",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #667eea; }
            .total { font-size: 24px; color: #667eea; font-weight: bold; text-align: center; margin: 20px 0; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Prenotazione Confermata!</h1>
              <p>Grazie per aver scelto Vicus</p>
            </div>
            <div class="content">
              <p>Ciao <strong>${
                metadata.customer_name || "Cliente"
              }</strong>,</p>
              <p>La tua prenotazione è stata confermata con successo. Ecco i dettagli:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Struttura:</span>
                  <span>${metadata.property_name || "N/A"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Check-in:</span>
                  <span>${metadata.check_in || "N/A"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Check-out:</span>
                  <span>${metadata.check_out || "N/A"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Ospiti:</span>
                  <span>${metadata.guests || "N/A"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Codice Prenotazione:</span>
                  <span>${metadata.booking_id || "N/A"}</span>
                </div>
              </div>

              <div class="total">
                Totale Pagato: €${(amount / 100).toFixed(2)}
              </div>

              <center>
                <a href="${baseURL}/bookings/${
        metadata.booking_id
      }" class="button">
                  Visualizza Prenotazione
                </a>
              </center>

              <p style="margin-top: 30px;">
                <strong>Cosa fare ora:</strong><br>
                • Riceverai ulteriori dettagli dall'host<br>
                • Conserva questa email come ricevuta<br>
                • Per qualsiasi domanda, contatta il supporto
              </p>

              <div class="footer">
                <p>Questa è una conferma automatica. Per assistenza scrivi a ${
                  process.env.GMAIL
                }</p>
                <p>&copy; ${new Date().getFullYear()} Vicus. Tutti i diritti riservati.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email di conferma inviata:", info.response);

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("❌ Errore invio email conferma:", err);
    throw err;
  }
};

/* Invia email per pagamento fallito */
const sendPaymentFailureEmail = async (customer_email, booking_data, error) => {
  console.log("📧 Invio email pagamento fallito a:", customer_email);

  try {
    const transporter = nodemailer.createTransporter({
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
        : "https://vicus.netlify.app";

    const mailOptions = {
      from: process.env.GMAIL,
      to: customer_email,
      subject: "⚠️ Problema con il Pagamento - Vicus",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e53e3e; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .error-box { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Pagamento Non Riuscito</h1>
            </div>
            <div class="content">
              <p>Ciao,</p>
              <p>Purtroppo il pagamento per la tua prenotazione non è andato a buon fine.</p>
              
              <div class="error-box">
                <strong>Motivo:</strong> ${error || "Errore generico"}
              </div>

              <p><strong>Cosa puoi fare:</strong></p>
              <ul>
                <li>Verifica i dati della carta di credito</li>
                <li>Controlla il saldo disponibile</li>
                <li>Prova con un metodo di pagamento diverso</li>
                <li>Contatta la tua banca se il problema persiste</li>
              </ul>

              <center>
                <a href="${baseURL}/checkout?retry=true" class="button">
                  Riprova il Pagamento
                </a>
              </center>

              <div class="footer">
                <p>Per assistenza scrivi a ${process.env.GMAIL}</p>
                <p>&copy; ${new Date().getFullYear()} Vicus. Tutti i diritti riservati.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email pagamento fallito inviata:", info.response);

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("❌ Errore invio email pagamento fallito:", err);
    throw err;
  }
};

module.exports = {
  calculateFees,
  createPaymentMetadata,
  sendConfirmationEmail,
  sendPaymentFailureEmail,
};
