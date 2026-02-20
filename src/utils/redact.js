/**
 * redact.js — Rimozione lato server di dati sensibili
 * Stessa logica del frontend, eseguita di nuovo come secondo layer di sicurezza.
 */

function luhnCheck(digits) {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function redactSensitive(text) {
  if (!text || typeof text !== "string") return "";
  let t = text;

  // Email
  t = t.replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, "[EMAIL]");

  // Telefoni italiani
  t = t.replace(/(?:\+39|0039)?\s?3\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, "[TEL]");
  t = t.replace(/(?:\+39|0039)?\s?0\d{1,4}[\s-]?\d{6,8}/g, "[TEL]");

  // Codice Fiscale
  t = t.replace(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi, "[CF]");

  // Carte di credito (con verifica Luhn)
  t = t.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, (match) => {
    const digits = match.replace(/\D/g, "");
    return luhnCheck(digits) ? "[CARTA]" : match;
  });

  // IBAN
  t = t.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/gi, "[IBAN]");

  // Indirizzi fisici
  t = t.replace(
    /\b(via|viale|piazza|corso|str\.|v\.)\s+[a-zA-Zàèéìòù\s]+\d{1,4}/gi,
    "[INDIRIZZO]"
  );

  // URL: mantieni solo hostname+path, rimuovi token/query sensibili
  t = t.replace(/https?:\/\/[^\s]+/g, (url) => {
    try {
      const u = new URL(url);
      if (/token|id|auth|key|session|pwd|pass/i.test(url)) {
        return `[LINK:${u.hostname}]`;
      }
      return `${u.origin}${u.pathname}`.slice(0, 100);
    } catch {
      return "[LINK]";
    }
  });

  // Nomi propri dopo saluto
  t = t.replace(
    /\b(gentile|egregio|caro|cara)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    "$1 [NOME]"
  );

  return t.trim().slice(0, 5000);
}

module.exports = { redactSensitive };
