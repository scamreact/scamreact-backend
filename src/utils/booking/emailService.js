// services/emailService.js
const nodemailer = require("nodemailer");

// Configurazione del trasportatore email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true per 465, false per altre porte
  auth: {
    user: process.env.GMAIL,
    pass: process.env.GMAIL_PSW,
  },
});

// Verifica la configurazione
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Errore configurazione email:", error);
  } else {
    console.log("✅ Server email pronto");
  }
});

/**
 * Template email di conferma booking per il cliente
 */
const getBookingConfirmationEmailHTML = (booking, listing) => {
  const checkinDate = new Date(booking.checkin).toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const checkoutDate = new Date(booking.checkout).toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
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
          <h1>🎉 Prenotazione Confermata!</h1>
          <p>Grazie per aver scelto ${listing.title || "il nostro servizio"}</p>
        </div>
        
        <div class="content">
          <p>Ciao ${booking.customer_name},</p>
          <p>La tua prenotazione è stata ricevuta con successo e è ora in stato: <span class="status-badge">${booking.status.toUpperCase()}</span></p>
          
          <div class="booking-card">
            <h2 style="margin-top: 0; color: #111827;">📋 Dettagli Prenotazione</h2>
            
            <div class="detail-row">
              <span class="detail-label">Codice Prenotazione:</span>
              <span class="detail-value">#${booking._id
                .toString()
                .slice(-8)
                .toUpperCase()}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Tipo:</span>
              <span class="detail-value">${booking.listingType}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Check-in:</span>
              <span class="detail-value">${checkinDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Check-out:</span>
              <span class="detail-value">${checkoutDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Ospiti:</span>
              <span class="detail-value">${booking.numberOfGuests}</span>
            </div>
            
            <div class="price">
              Totale: €${booking.totalPrice.toFixed(2)}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/bookings/${
    booking._id
  }" class="button">
              Visualizza Prenotazione
            </a>
          </div>
          
          <div class="booking-card">
            <h3 style="margin-top: 0;">ℹ️ Prossimi Passi</h3>
            <ul>
              <li>Riceverai una conferma definitiva entro 24 ore</li>
              <li>L'host ti contatterà per i dettagli del check-in</li>
              <li>Puoi gestire la prenotazione dal tuo account</li>
            </ul>
          </div>
          
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
    </html>
  `;
};

/**
 * Template email notifica per l'host
 */
const getHostNotificationEmailHTML = (booking, listing, customer) => {
  const checkinDate = new Date(booking.checkin).toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const checkoutDate = new Date(booking.checkout).toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .button-secondary { background: #6b7280; }
        .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Nuova Prenotazione!</h1>
          <p>Hai ricevuto una nuova richiesta di prenotazione</p>
        </div>
        
        <div class="content">
          <div class="alert">
            ⏰ <strong>Azione richiesta:</strong> Conferma o rifiuta la prenotazione entro 24 ore
          </div>
          
          <div class="booking-card">
            <h2 style="margin-top: 0;">📋 Dettagli Prenotazione</h2>
            
            <div class="detail-row">
              <span class="detail-label">Codice:</span>
              <span class="detail-value">#${booking._id
                .toString()
                .slice(-8)
                .toUpperCase()}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Listing:</span>
              <span class="detail-value">${listing.title}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Check-in:</span>
              <span class="detail-value">${checkinDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Check-out:</span>
              <span class="detail-value">${checkoutDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Ospiti:</span>
              <span class="detail-value">${booking.numberOfGuests}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Guadagno:</span>
              <span class="detail-value" style="color: #059669; font-weight: bold;">€${booking.totalPrice.toFixed(
                2
              )}</span>
            </div>
          </div>
          
          <div class="booking-card">
            <h3 style="margin-top: 0;">👤 Informazioni Cliente</h3>
            <p><strong>Nome:</strong> ${
              customer.name || booking.customer_name
            }</p>
            <p><strong>Email:</strong> ${
              customer.email || booking.customer_email
            }</p>
            ${
              customer.phone
                ? `<p><strong>Telefono:</strong> ${customer.phone}</p>`
                : ""
            }
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/host/bookings/${
    booking._id
  }/accept" class="button">
              ✅ Accetta Prenotazione
            </a>
            <a href="${process.env.FRONTEND_URL}/host/bookings/${
    booking._id
  }" class="button button-secondary">
              📄 Visualizza Dettagli
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Puoi gestire questa prenotazione dal tuo pannello host o rispondendo a questa email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Invia email di conferma al cliente
 */
const sendBookingConfirmationEmail = async (booking, listing) => {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME || "Booking Platform"}" <${
        process.env.EMAIL_USER
      }>`,
      to: booking.customer_email,
      subject: `Conferma Prenotazione - ${listing.title || ""}`,
      html: getBookingConfirmationEmailHTML(booking, listing),
      text: `Ciao ${booking.customer_name},\n\nLa tua prenotazione per ${listing.title} è stata confermata!\n\nDettagli:\n- Check-in: ${booking.checkin}\n- Check-out: ${booking.checkout}\n- Ospiti: ${booking.numberOfGuests}\n- Totale: €${booking.totalPrice}\n\nCodice prenotazione: ${booking._id}\n\nGrazie!`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email inviata al cliente:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Errore invio email al cliente:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Invia email di notifica all'host
 */
const sendHostNotificationEmail = async (booking, listing, host, customer) => {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME || "Booking Platform"}" <${
        process.env.EMAIL_USER
      }>`,
      to: host.email || listing.contactEmail,
      subject: `🔔 Nuova Prenotazione - ${listing.title || ""}`,
      html: getHostNotificationEmailHTML(booking, listing, customer),
      text: `Hai ricevuto una nuova prenotazione!\n\nListing: ${listing.title}\nCliente: ${customer.name}\nCheck-in: ${booking.checkin}\nCheck-out: ${booking.checkout}\nOspiti: ${booking.numberOfGuests}\nTotale: €${booking.totalPrice}\n\nConferma o rifiuta la prenotazione dal tuo pannello host.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email inviata all'host:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Errore invio email all'host:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Invia email di cambio stato booking
 */
const sendBookingStatusUpdateEmail = async (booking, listing, newStatus) => {
  const statusMessages = {
    confirmed: {
      subject: "✅ Prenotazione Confermata!",
      message:
        "La tua prenotazione è stata confermata dall'host. Preparati per un'esperienza fantastica!",
      emoji: "🎉",
    },
    cancelled: {
      subject: "❌ Prenotazione Cancellata",
      message:
        "La tua prenotazione è stata cancellata. Se hai domande, contattaci.",
      emoji: "😔",
    },
    completed: {
      subject: "✨ Grazie per il tuo soggiorno!",
      message:
        "Speriamo tu abbia avuto un'esperienza fantastica! Lascia una recensione per aiutare altri viaggiatori.",
      emoji: "⭐",
    },
  };

  const statusInfo = statusMessages[newStatus] || {
    subject: "Aggiornamento Prenotazione",
    message: `Lo stato della tua prenotazione è stato aggiornato a: ${newStatus}`,
    emoji: "📋",
  };

  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME || "Booking Platform"}" <${
        process.env.EMAIL_USER
      }>`,
      to: booking.customer_email,
      subject: statusInfo.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 30px; border-radius: 8px;">
            <h1 style="text-align: center;">${statusInfo.emoji} ${
        statusInfo.subject
      }</h1>
            <p>Ciao ${booking.customer_name},</p>
            <p>${statusInfo.message}</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Listing:</strong> ${listing.title}</p>
              <p><strong>Codice:</strong> #${booking._id
                .toString()
                .slice(-8)
                .toUpperCase()}</p>
              <p><strong>Nuovo stato:</strong> ${newStatus.toUpperCase()}</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}/bookings/${
        booking._id
      }" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                Visualizza Prenotazione
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Email cambio stato (${newStatus}) inviata:`,
      info.messageId
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Errore invio email cambio stato:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendBookingConfirmationEmail,
  sendHostNotificationEmail,
  sendBookingStatusUpdateEmail,
  transporter,
};
