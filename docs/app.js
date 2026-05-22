const VOICES = [
  { id: "8PFKHwg70zjSRTfDg4hk", label: "Tilly PVC1 2026-05-18" },
  { id: "7hDCGMwLtzZG6Zh6ZUVC", label: "Tilly PVC2 2026-05-18" },
  { id: "Sg8O60o1UrYZlIw1eYvE", label: "Tilly PVC3 2026-05-22" },
  { id: "vRtxFKWJzHlaYdQSyUqs", label: "Tilly PVC4 2026-05-22" },
];

const MAX_CHARS = 5000;
const MODEL_ID = "eleven_v4";
const API_KEY = "__INJECT_KEY__";

const ttsForm = document.getElementById("ttsForm");
const voiceSelect = document.getElementById("voiceSelect");
const textInput = document.getElementById("textInput");
const generateBtn = document.getElementById("generateBtn");
const audioPlayer = document.getElementById("audioPlayer");
const playerWrap = document.getElementById("playerWrap");
const statusText = document.getElementById("statusText");
const errorBox = document.getElementById("errorBox");

let lastBlobUrl = null;

for (const voice of VOICES) {
  const option = document.createElement("option");
  option.value = voice.id;
  option.textContent = voice.label;
  voiceSelect.appendChild(option);
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

  if (API_KEY === "__INJECT_KEY__") {
    showError("Missing API key — deploy with GitHub Actions.");
    return;
  }

  const text = textInput.value.trim();
  if (!text) {
    showError("Enter some text to generate.");
    return;
  }
  if (text.length > MAX_CHARS) {
    showError(`Text is too long (max ${MAX_CHARS} characters).`);
    return;
  }

  const voiceId = voiceSelect.value;
  generateBtn.disabled = true;
  setStatus("Generating audio…");

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text, model_id: MODEL_ID }),
      },
    );

    if (!response.ok) {
      let detail = `API error (${response.status})`;
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
    setStatus("Done — you can play the recording.");
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
