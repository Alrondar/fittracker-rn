import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

/**
 * Генерация звуков таймера «на лету» (без внешних mp3-файлов).
 * Создаёт валидный WAV (PCM 16-bit mono) и отдаёт его как base64 data-URI.
 */
const SAMPLE_RATE = 8000;

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function generateWavDataUri(freq: number, durationSec: number, volume = 0.4): string {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV-заголовок
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Синусоида с мягким затуханием на краях (без щелчков)
  const fadeSamples = Math.floor(SAMPLE_RATE * 0.01);
  for (let i = 0; i < numSamples; i++) {
    let envelope = 1;
    if (i < fadeSamples) envelope = i / fadeSamples;
    else if (i > numSamples - fadeSamples) envelope = (numSamples - i) / fadeSamples;
    const val = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * volume * envelope;
    view.setInt16(44 + i * 2, val * 32767, true);
  }

  // ArrayBuffer → base64 (чанками, чтобы не переполнить стек)
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

let beepPlayer: AudioPlayer | null = null;
let finishPlayer: AudioPlayer | null = null;
let initialized = false;

/** Предзагрузка плееров. Вызывать при старте таймера. */
export function initSounds() {
  if (initialized) return;
  initialized = true;
  try {
    // Играем даже при переключателе в беззвучном режиме (важно в зале)
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    beepPlayer = createAudioPlayer(generateWavDataUri(880, 0.15));   // короткий бип
    finishPlayer = createAudioPlayer(generateWavDataUri(1320, 0.6)); // финальный сигнал
  } catch (e) {
    console.error('Ошибка инициализации звуков:', e);
  }
}

export async function playBeep() {
  try {
    if (!beepPlayer) initSounds();
    await beepPlayer?.seekTo(0);
    beepPlayer?.play();
  } catch { /* звук не критичен — не роняем приложение */ }
}

export async function playFinishSound() {
  try {
    if (!finishPlayer) initSounds();
    await finishPlayer?.seekTo(0);
    finishPlayer?.play();
  } catch { /* ignore */ }
}