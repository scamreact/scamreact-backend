# ScamRadar — Backend API

Backend Express + MongoDB per raccogliere segnalazioni di truffe in forma anonima.

## Struttura

```
scam-radar-backend/
├── server.js              # Entry point
├── .env.example           # Template variabili d'ambiente
├── models/
│   └── Report.js          # Schema Mongoose
├── routes/
│   └── reports.js         # Endpoint API
└── utils/
    └── redact.js          # Redazione dati sensibili
```

## Setup rapido

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Configura le variabili d'ambiente
```bash
cp .env.example .env
# Apri .env e inserisci la tua MONGO_URI da MongoDB Atlas
```

### 3. Ottieni la MONGO_URI da Atlas
1. Vai su [mongodb.com/atlas](https://mongodb.com/atlas) → crea account gratuito
2. Crea un cluster (M0 free tier)
3. **Database Access** → crea utente con password
4. **Network Access** → aggiungi `0.0.0.0/0` (o il tuo IP)
5. **Connect** → "Connect your application" → copia la stringa

### 4. Avvia il server
```bash
# Sviluppo (auto-reload)
npm run dev

# Produzione
npm start
```

---

## Endpoint

### `POST /api/reports`
Crea una nuova segnalazione anonima.

**Body JSON:**
```json
{
  "message": "Testo del messaggio sospetto...",
  "scamType": "phishing_smishing",
  "channel": "sms",
  "consentPublic": true
}
```

**Risposta 201:**
```json
{ "success": true, "id": "664abc123..." }
```

---

### `GET /api/reports/stats`
Statistiche aggregate (pubbliche).

**Risposta:**
```json
{
  "total": 142,
  "byType": [{ "_id": "phishing_smishing", "count": 58 }, ...],
  "byChannel": [{ "_id": "sms", "count": 71 }, ...]
}
```

---

### `GET /api/reports/recent`
Ultimi 20 report pubblici (senza testo del messaggio).

---

### `GET /health`
Health check del server.

---

## Privacy by design
- ❌ Nessun IP salvato
- ❌ Nessun testo del messaggio nella risposta API
- ✅ Redazione automatica server-side (email, telefoni, CF, IBAN, carte)
- ✅ Solo metadati anonimi (lingua browser, famiglia browser)
- ✅ I report con `consentPublic: false` non compaiono mai nelle route pubbliche
