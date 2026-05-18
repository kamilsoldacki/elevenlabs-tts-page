const VOICES = [
  { id: "8PFKHwg70zjSRTfDg4hk", label: "Głos 1" },
  { id: "7hDCGMwLtzZG6Zh6ZUVC", label: "Głos 2" },
];

const MAX_CHARS = 5000;
const MODEL_ID = "eleven_v4";
const API_KEY = "__ELEVENLABS_API_KEY__";
const hasBuiltInKey = API_KEY !== "__ELEVENLABS_API_KEY__";

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

if (!hasBuiltInKey && apiKeySection) {
  apiKeySection.hidden = false;
}

function getApiKey() {
  if (hasBuiltInKey) return API_KEY;
  return apiKeyInput?.value.trim() || "";
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
    showError("Brak klucza API.");
    if (apiKeySection) apiKeySection.open = true;
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
        body: JSON.stringify({ text, model_id: MODEL_ID }),
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
    showError(error instanceof Error ? error.message : String(error));
    setStatus("");
  } finally {
    generateBtn.disabled = false;
  }
}

ttsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generateSpeech();
});
