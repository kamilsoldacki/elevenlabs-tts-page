import { VOICES, MAX_CHARS, MODEL_ID } from "./voices.js";

const API_KEY_STORAGE = "elevenlabs_tts_api_key";
const builtInApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY?.trim() || "";
const modelId = import.meta.env.VITE_TTS_MODEL_ID?.trim() || MODEL_ID;

const ttsForm = document.getElementById("ttsForm");
const voiceSelect = document.getElementById("voiceSelect");
const textInput = document.getElementById("textInput");
const generateBtn = document.getElementById("generateBtn");
const audioPlayer = document.getElementById("audioPlayer");
const playerWrap = document.getElementById("playerWrap");
const statusText = document.getElementById("statusText");
const errorBox = document.getElementById("errorBox");
const apiKeySection = document.getElementById("apiKeySection");
const apiKeyInput = document.getElementById("apiKeyInput");

let lastBlobUrl = null;

for (const voice of VOICES) {
  const option = document.createElement("option");
  option.value = voice.id;
  option.textContent = voice.label;
  voiceSelect.appendChild(option);
}

if (!builtInApiKey) {
  apiKeySection.hidden = false;
  const saved = sessionStorage.getItem(API_KEY_STORAGE);
  if (saved) apiKeyInput.value = saved;
  apiKeyInput.addEventListener("change", () => {
    const key = apiKeyInput.value.trim();
    if (key) sessionStorage.setItem(API_KEY_STORAGE, key);
    else sessionStorage.removeItem(API_KEY_STORAGE);
  });
}

function getApiKey() {
  if (builtInApiKey) return builtInApiKey;
  const fromInput = apiKeyInput.value.trim();
  const fromStorage = sessionStorage.getItem(API_KEY_STORAGE)?.trim();
  return fromInput || fromStorage || "";
}

function showError(message) {
  if (!message) {
    errorBox.hidden = true;
    errorBox.textContent = "";
    return;
  }
  errorBox.hidden = false;
  errorBox.textContent = message;
}

function setStatus(message) {
  statusText.textContent = message || "";
}

function revokeBlobUrl() {
  if (lastBlobUrl) {
    URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = null;
  }
}

async function generateSpeech() {
  showError(null);
  setStatus("");

  const text = textInput.value.trim();
  if (!text) {
    showError("Wpisz tekst do wygenerowania.");
    return;
  }
  if (text.length > MAX_CHARS) {
    showError(`Tekst jest za długi (max ${MAX_CHARS} znaków).`);
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    showError(
      "Brak klucza API. Ustaw VITE_ELEVENLABS_API_KEY przy buildzie albo wklej klucz w polu poniżej.",
    );
    apiKeySection.open = true;
    return;
  }

  const voiceId = voiceSelect.value;
  generateBtn.disabled = true;
  setStatus("Generuję audio…");

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
        }),
      },
    );

    if (!response.ok) {
      let detail = `Błąd API (${response.status})`;
      try {
        const errJson = await response.json();
        detail =
          errJson.detail?.message ||
          errJson.detail ||
          errJson.message ||
          JSON.stringify(errJson);
      } catch {
        const errText = await response.text();
        if (errText) detail = errText.slice(0, 300);
      }
      throw new Error(detail);
    }

    const blob = await response.blob();
    revokeBlobUrl();
    lastBlobUrl = URL.createObjectURL(blob);
    audioPlayer.src = lastBlobUrl;
    playerWrap.hidden = false;
    setStatus("Gotowe — możesz odsłuchać nagranie.");
    await audioPlayer.play().catch(() => {});
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      showError(
        "Nie udało się połączyć z API (sieć lub CORS). Spróbuj lokalnie: npm run dev",
      );
    } else {
      showError(msg);
    }
    setStatus("");
  } finally {
    generateBtn.disabled = false;
  }
}

ttsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generateSpeech();
});
