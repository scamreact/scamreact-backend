const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");
const { getDB } = require("../connection/db.js");
const router = express.Router();

// Inizializzazione Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configurazione API esterne
const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

// Sistema di cache
const cache = new Map();
const CACHE_TTL = 300000; // 5 minuti

router.post("/nonna", async (req, res) => {
  try {
    console.log("📥 Richiesta ricevuta:", {
      messagesCount: req.body.messages?.length,
      hasContext: !!req.body.context,
    });

    const { messages, context } = req.body;

    // Validazione input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messaggio non valido. Invia almeno un messaggio.",
      });
    }

    const userLastMessage = messages[messages.length - 1].content;

    // 1. Recupera dati dal database (con cache e supporto località dinamica)
    const borgoData = await getCachedBorgoData(context, userLastMessage);

    // 2. Analizza se serve ricerca web
    const needsWebSearch = analyzeNeedsWebSearch(userLastMessage);

    // 3. Eventuale ricerca web
    let webSearchResults = null;
    if (needsWebSearch) {
      webSearchResults = await performWebSearch(userLastMessage, context);
    }

    // 4. Costruisci prompt sistema
    const systemPrompt = buildSystemPrompt(borgoData, webSearchResults);

    // 5. Prepara messaggi per Claude
    const claudeMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 6. Chiamata API Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const assistantMessage = response.content[0].text;
    console.log("✅ Risposta Claude ricevuta");

    // 7. Parse risposta e estrai dati strutturati
    const structuredResponse = parseAssistantResponse(
      assistantMessage,
      borgoData
    );

    // 8. Invia risposta al frontend
    res.json({
      message: structuredResponse.cleanMessage,
      suggestions: structuredResponse.suggestions,
      structuredData: structuredResponse.structuredData,
    });
  } catch (error) {
    console.error("❌ Errore nel processamento:", error);

    // Gestione errori specifici
    if (error.status === 401) {
      return res.status(500).json({
        error: "Errore di autenticazione API. Contatta l'amministratore.",
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: "Troppi messaggi inviati. Attendi qualche secondo e riprova.",
      });
    }

    res.status(500).json({
      error: "Mi dispiace, ho avuto un problema tecnico. Riprova tra poco.",
    });
  }
});

// ====================================
// SISTEMA DI CACHE CON SUPPORTO LOCALITÀ DINAMICA
// ====================================
async function getCachedBorgoData(context, userMessage = null) {
  // Se c'è una richiesta meteo specifica, non usare cache
  const requestedLocation = userMessage
    ? extractLocationFromMessage(userMessage)
    : null;

  if (requestedLocation) {
    console.log(
      `🔄 Richiesta meteo per località specifica: ${requestedLocation}`
    );
    return await getBorgoData(context, requestedLocation);
  }

  // Altrimenti usa cache normale
  const cacheKey = `borgo_data_${new Date().toDateString()}`;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("📦 Dati recuperati dalla cache");
      return cached.data;
    }
  }

  console.log("🔄 Recupero nuovi dati dal database");
  const data = await getBorgoData(context, null);

  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });

  return data;
}

// ====================================
// ESTRAZIONE LOCALITÀ DAL MESSAGGIO
// ====================================
function extractLocationFromMessage(message) {
  const messageLower = message.toLowerCase();

  // Pattern per località italiane
  const locationPatterns = [
    /meteo (?:a|di|per|in|ad) ([a-zàèéìòùA-ZÀÈÉÌÒÙ\s]+?)(?:\?|$|,|\.|!)/i,
    /tempo (?:a|di|per|in|ad) ([a-zàèéìòùA-ZÀÈÉÌÒÙ\s]+?)(?:\?|$|,|\.|!)/i,
    /temperature (?:a|di|per|in|ad) ([a-zàèéìòùA-ZÀÈÉÌÒÙ\s]+?)(?:\?|$|,|\.|!)/i,
    /(?:com'è|come è|che tempo fa) (?:a|di|per|in|ad) ([a-zàèéìòùA-ZÀÈÉÌÒÙ\s]+?)(?:\?|$|,|\.|!)/i,
    /previsioni (?:a|di|per|in|ad) ([a-zàèéìòùA-ZÀÈÉÌÒÙ\s]+?)(?:\?|$|,|\.|!)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let location = match[1].trim();

      // Rimuovi parole comuni di troppo
      location = location.replace(/\b(oggi|domani|adesso|ora)\b/gi, "").trim();

      // Aggiungi ",IT" se non presente e non è una città con paese già specificato
      if (!location.includes(",")) {
        location = `${location},IT`;
      }

      console.log(`📍 Località estratta: ${location}`);
      return location;
    }
  }

  return null;
}

// ====================================
// RECUPERO DATI DA MONGODB
// ====================================
async function getBorgoData(context, locationOverride = null) {
  try {
    const db = getDB();

    // Chiamate parallele per ottimizzare performance
    const [attrazioni, ristoranti, eventi, trasporti, meteo] =
      await Promise.all([
        fetchAttrazioni(db),
        fetchRistoranti(db),
        fetchEventiSettimana(db),
        fetchInfoTrasporti(db),
        fetchMeteo(locationOverride),
      ]);

    return {
      attrazioni,
      ristoranti,
      eventi,
      trasporti,
      meteo,
    };
  } catch (error) {
    console.error("⚠️ Errore recupero dati, uso dati di fallback:", error);
    return getDefaultBorgoData();
  }
}

// ====================================
// QUERY MONGODB
// ====================================
async function fetchAttrazioni(db) {
  try {
    const attrazioni = await db
      .collection("attrazioni")
      .find({
        attivo: true,
      })
      .sort({ priorita: -1 })
      .limit(10)
      .toArray();

    return attrazioni.map((attr) => ({
      nome: attr.nome,
      descrizione: attr.descrizione,
      orari: attr.orari || "Orari non specificati",
      distanza: attr.distanza || "Distanza non disponibile",
      prezzoIngresso: attr.prezzoIngresso || attr.prezzo || "Gratuito",
    }));
  } catch (error) {
    console.error("❌ Errore fetch attrazioni:", error);
    return [];
  }
}

async function fetchRistoranti(db) {
  try {
    const ristoranti = await db
      .collection("ristoranti")
      .find({
        attivo: true,
      })
      .sort({ rating: -1 })
      .limit(10)
      .toArray();

    return ristoranti.map((rist) => ({
      nome: rist.nome,
      tipoCucina: rist.tipoCucina || rist.tipo || "Cucina locale",
      indirizzo: rist.indirizzo,
      orari: rist.orari || "Orari non disponibili",
      fasciaPrezzo: rist.fasciaPrezzo || rist.prezzo || "€€",
      specialita: rist.specialita || rist.piatti?.join(", ") || null,
    }));
  } catch (error) {
    console.error("❌ Errore fetch ristoranti:", error);
    return [];
  }
}

async function fetchEventiSettimana(db) {
  try {
    const oggi = new Date();
    const settimanaSuccessiva = new Date();
    settimanaSuccessiva.setDate(oggi.getDate() + 7);

    const eventi = await db
      .collection("eventi")
      .find({
        attivo: true,
        data: {
          $gte: oggi,
          $lte: settimanaSuccessiva,
        },
      })
      .sort({ data: 1 })
      .limit(5)
      .toArray();

    return eventi.map((evento) => ({
      titolo: evento.titolo || evento.nome,
      data: formatDate(evento.data),
      ora: evento.ora || evento.orario || "Orario da definire",
      luogo: evento.luogo || evento.location,
      descrizione: evento.descrizione || "",
      prezzo: evento.prezzo || null,
    }));
  } catch (error) {
    console.error("❌ Errore fetch eventi:", error);
    return [];
  }
}

async function fetchInfoTrasporti(db) {
  try {
    const trasporti = await db
      .collection("trasporti")
      .findOne({ attivo: true });

    if (!trasporti) {
      return getDefaultTrasporti();
    }

    return {
      busLocali: trasporti.busLocali || "Informazioni non disponibili",
      parcheggi: trasporti.parcheggi || "Contattare info point",
      collegamentiExtraurbani:
        trasporti.collegamentiExtraurbani || "Consultare il sito del comune",
      taxi: trasporti.taxi || "Servizio disponibile su chiamata",
    };
  } catch (error) {
    console.error("❌ Errore fetch trasporti:", error);
    return getDefaultTrasporti();
  }
}

// ====================================
// METEO CON SUPPORTO LOCALITÀ DINAMICA
// ====================================
async function fetchMeteo(locationOverride = null) {
  try {
    if (!process.env.OPENWEATHER_API_KEY) {
      console.warn("⚠️ OpenWeather API Key non configurata");
      return {
        available: false,
        message: "Informazioni meteo non configurate",
      };
    }

    // Usa location richiesta o fallback al borgo principale
    const location = locationOverride || process.env.BORGO_NAME || "Roma,IT";

    console.log(`🌤️ Recupero meteo per: ${location}`);

    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: location,
          appid: process.env.OPENWEATHER_API_KEY,
          units: "metric",
          lang: "it",
        },
        timeout: 5000,
      }
    );

    const weather = response.data;

    // Formatta risposta completa
    return {
      available: true,
      location: weather.name,
      description: weather.weather[0].description,
      temp: Math.round(weather.main.temp),
      tempMin: Math.round(weather.main.temp_min),
      tempMax: Math.round(weather.main.temp_max),
      feelsLike: Math.round(weather.main.feels_like),
      humidity: weather.main.humidity,
      windSpeed: Math.round(weather.wind.speed * 3.6), // m/s to km/h
      formatted: `${weather.weather[0].description}, ${Math.round(
        weather.main.temp
      )}°C`,
      detailedFormatted: `📍 ${weather.name}
🌡️ Temperatura: ${Math.round(weather.main.temp)}°C (percepiti ${Math.round(
        weather.main.feels_like
      )}°C)
📊 Min/Max: ${Math.round(weather.main.temp_min)}°C / ${Math.round(
        weather.main.temp_max
      )}°C
🌤️ Condizioni: ${weather.weather[0].description}
💨 Vento: ${Math.round(weather.wind.speed * 3.6)} km/h
💧 Umidità: ${weather.main.humidity}%`,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`⚠️ Località non trovata: ${locationOverride}`);
      return {
        available: false,
        location: locationOverride,
        message: `Località "${locationOverride}" non trovata`,
      };
    }

    console.warn("⚠️ Errore recupero meteo:", error.message);
    return {
      available: false,
      message: "Informazioni meteo temporaneamente non disponibili",
    };
  }
}

// ====================================
// DATI DI FALLBACK
// ====================================
function getDefaultBorgoData() {
  return {
    attrazioni: [],
    ristoranti: [],
    eventi: [],
    trasporti: getDefaultTrasporti(),
    meteo: {
      available: false,
      message: "Informazioni non disponibili",
    },
  };
}

function getDefaultTrasporti() {
  return {
    busLocali: "Informazioni non disponibili",
    parcheggi: "Contattare info point",
    collegamentiExtraurbani: "Consultare il sito del comune",
    taxi: "Servizio disponibile su chiamata",
  };
}

// ====================================
// RICERCA WEB
// ====================================
function analyzeNeedsWebSearch(message) {
  const webSearchKeywords = [
    "collegamenti",
    "treno",
    "aereo",
    "come arrivare",
    "storia",
    "curiosità",
    "tradizioni",
    "festività",
    "santo patrono",
    "dintorni",
    "vicino",
    "zona",
    "ferry",
    "traghetto",
    "aliscafo",
  ];

  const messageLower = message.toLowerCase();
  return webSearchKeywords.some((keyword) => messageLower.includes(keyword));
}

async function performWebSearch(query, context) {
  try {
    if (!BRAVE_API_KEY) {
      console.warn("⚠️ Brave API key non configurata");
      return null;
    }

    const searchQuery = `${query} ${process.env.BORGO_NAME || "borgo"} Italia`;
    console.log("🔍 Ricerca web:", searchQuery);

    const response = await axios.get(BRAVE_SEARCH_URL, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
      params: {
        q: searchQuery,
        count: 5,
        country: "IT",
        search_lang: "it",
      },
      timeout: 5000,
    });

    const results = response.data.web?.results || [];

    if (results.length === 0) {
      console.log("ℹ️ Nessun risultato dalla ricerca web");
      return null;
    }

    return results
      .slice(0, 3)
      .map((result) => `${result.title}: ${result.description}`)
      .join("\n\n");
  } catch (error) {
    console.error("❌ Errore ricerca web:", error.message);
    return null;
  }
}

// ====================================
// COSTRUZIONE PROMPT
// ====================================
function buildSystemPrompt(borgoData, webSearchResults) {
  // Formatta informazioni meteo
  let meteoInfo = "Informazioni meteo non disponibili";

  if (borgoData.meteo.available) {
    meteoInfo = borgoData.meteo.detailedFormatted;
  } else {
    meteoInfo = borgoData.meteo.message;
  }

  let prompt = `Sei una nonna affettuosa che conosce perfettamente il borgo e aiuta i visitatori con consigli calorosi ma discreti.

Caratteristiche del tuo personaggio:
- Parli in modo affettuoso ma non eccessivo, usando raramente "caro/a" o "tesoro"
- Hai una conoscenza approfondita del borgo e delle sue attrazioni
- Fornisci informazioni pratiche e aggiornate
- Sei paziente e disponibile, rispondi a tutte le domande
- Non essere prolissa, mantieni le risposte concise e utili
- Usa un tono amichevole ma professionale e soprattutto con accento napoletano
- Usa anche emoji in modo moderato per rendere il tono più caldo e accogliente
- Sei disponibile e competente senza essere invadente
- Dai consigli pratici e specifici basandoti sui dati reali
- Non inventi informazioni, se non sai qualcosa lo ammetti onestamente
- Mantieni le risposte concise ma complete (massimo 3-4 frasi)
- Se suggerisci luoghi o attività, menziona dettagli pratici come orari e distanze
- Alla fine della risposta, puoi suggerire fino a 2 domande di follow-up pertinenti racchiuse tra [SUGGESTIONS] e [/SUGGESTIONS]
- IMPORTANTE: Se hai informazioni meteo disponibili, usale! Non dire che non le hai se sono presenti qui sotto.

Dati attuali del borgo (${new Date().toLocaleDateString("it-IT")}):

ATTRAZIONI:
${formatAttrazioni(borgoData.attrazioni)}

RISTORANTI E LOCALI:
${formatRistoranti(borgoData.ristoranti)}

EVENTI IN PROGRAMMA:
${formatEventi(borgoData.eventi)}

TRASPORTI:
${formatTrasporti(borgoData.trasporti)}

INFORMAZIONI METEO:
${meteoInfo}`;

  if (webSearchResults) {
    prompt += `\n\nINFORMAZIONI AGGIUNTIVE DA WEB:
${webSearchResults}

Usa queste informazioni per arricchire le tue risposte, ma mantieni sempre il focus sul borgo.`;
  }

  return prompt;
}

// ====================================
// FORMATTAZIONE DATI
// ====================================
function formatAttrazioni(attrazioni) {
  if (!attrazioni || attrazioni.length === 0) {
    return "Nessuna attrazione disponibile al momento";
  }

  return attrazioni
    .map(
      (attr) => `- ${attr.nome}: ${attr.descrizione}
   Orari: ${attr.orari}
   Distanza dal centro: ${attr.distanza}
   ${
     attr.prezzoIngresso
       ? `Prezzo: ${attr.prezzoIngresso}`
       : "Ingresso gratuito"
   }`
    )
    .join("\n\n");
}

function formatRistoranti(ristoranti) {
  if (!ristoranti || ristoranti.length === 0) {
    return "Nessun ristorante disponibile al momento";
  }

  return ristoranti
    .map(
      (rist) => `- ${rist.nome} (${rist.tipoCucina})
   Indirizzo: ${rist.indirizzo}
   Orari: ${rist.orari}
   Fascia prezzo: ${rist.fasciaPrezzo}
   ${rist.specialita ? `Specialità: ${rist.specialita}` : ""}`
    )
    .join("\n\n");
}

function formatEventi(eventi) {
  if (!eventi || eventi.length === 0) {
    return "Nessun evento in programma al momento";
  }

  return eventi
    .map(
      (evento) => `- ${evento.titolo}
   Data: ${evento.data} alle ${evento.ora}
   Luogo: ${evento.luogo}
   ${evento.descrizione}
   ${evento.prezzo ? `Prezzo: ${evento.prezzo}` : "Ingresso gratuito"}`
    )
    .join("\n\n");
}

function formatTrasporti(trasporti) {
  if (!trasporti) {
    return "Informazioni trasporti non disponibili";
  }

  return `Bus locali: ${trasporti.busLocali}
Parcheggi: ${trasporti.parcheggi}
Collegamenti extraurbani: ${trasporti.collegamentiExtraurbani}
Info taxi: ${trasporti.taxi}`;
}

// ====================================
// PARSING RISPOSTA
// ====================================
function parseAssistantResponse(message, borgoData) {
  let cleanMessage = message;
  let suggestions = [];
  let structuredData = null;

  // 1. Estrai suggerimenti
  const suggestionsMatch = message.match(
    /\[SUGGESTIONS\](.*?)\[\/SUGGESTIONS\]/s
  );

  if (suggestionsMatch) {
    const suggestionsText = suggestionsMatch[1].trim();
    suggestions = suggestionsText
      .split("\n")
      .map((s) => s.replace(/^[-*]\d*\.?\s*/, "").trim())
      .filter((s) => s.length > 0 && s.length < 100)
      .slice(0, 2);

    cleanMessage = message
      .replace(/\[SUGGESTIONS\].*?\[\/SUGGESTIONS\]/s, "")
      .trim();
  }

  // 2. Identifica luoghi menzionati
  const mentionedPlaces = [];

  borgoData.attrazioni?.forEach((attr) => {
    if (cleanMessage.includes(attr.nome)) {
      mentionedPlaces.push({
        name: attr.nome,
        hours: attr.orari,
        distance: attr.distanza,
      });
    }
  });

  borgoData.ristoranti?.forEach((rist) => {
    if (cleanMessage.includes(rist.nome)) {
      mentionedPlaces.push({
        name: rist.nome,
        hours: rist.orari,
        distance: null,
      });
    }
  });

  if (mentionedPlaces.length > 0) {
    structuredData = {
      type: "places",
      items: mentionedPlaces,
    };
  }

  // 3. Identifica eventi menzionati
  const mentionedEvents = [];

  borgoData.eventi?.forEach((evento) => {
    if (cleanMessage.includes(evento.titolo)) {
      mentionedEvents.push({
        name: evento.titolo,
        date: evento.data,
        time: evento.ora,
      });
    }
  });

  if (mentionedEvents.length > 0 && !structuredData) {
    structuredData = {
      type: "events",
      items: mentionedEvents,
    };
  }

  return {
    cleanMessage,
    suggestions,
    structuredData,
  };
}

// ====================================
// UTILITY
// ====================================
function formatDate(date) {
  if (!date) return "Data non disponibile";

  const d = new Date(date);
  const giorni = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
  ];
  const mesi = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ];

  return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
}

module.exports = router;
