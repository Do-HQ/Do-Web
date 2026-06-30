let audio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;
let unlocked = false;
const THROTTLE_MS = 600;

const getAudio = (): HTMLAudioElement => {
  if (!audio) {
    audio = new Audio("/sounds/notification.wav");
    audio.volume = 0.4;
    audio.preload = "auto";
  }
  return audio;
};

// Browsers block audio until the user interacts with the page.
// On the first interaction we play-then-immediately-pause to unlock audio,
// so subsequent programmatic calls work without a user gesture.
const unlockAudio = () => {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;

  const el = getAudio();
  el.play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
    })
    .catch(() => {});
};

const attachUnlockListeners = () => {
  if (typeof window === "undefined") return;
  const opts = { once: true, capture: true };
  window.addEventListener("click", unlockAudio, opts);
  window.addEventListener("keydown", unlockAudio, opts);
  window.addEventListener("touchstart", unlockAudio, opts);
};

attachUnlockListeners();

export const playNotificationSound = (): void => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastPlayedAt < THROTTLE_MS) return;
  lastPlayedAt = now;

  const el = getAudio();
  el.currentTime = 0;
  el.play().catch(() => {});
};
