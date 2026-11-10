import { CONFIG } from "./config.js";

const MUTE_STORAGE_KEY = "arcane-survivor-muted";

function reportWarning(audio, warning) {
    audio.warning = warning;
    if (audio.onWarning) {
        audio.onWarning(warning);
    }
}

function resumeAudio(audio) {
    if (audio.context.state === "suspended") {
        audio.context.resume().catch(() => {
            reportWarning(
                audio,
                "Sound could not be started in this browser."
            );
        });
    }
}

export function createAudioState() {
    const audio = {
        context: null,
        muted: false,
        warning: "",
        lastPlayed: {},
        onWarning: null
    };

    try {
        audio.muted = localStorage.getItem(MUTE_STORAGE_KEY) === "true";
    } catch {
        reportWarning(
            audio,
            "Sound preference could not be loaded or saved."
        );
    }

    return audio;
}

export function initializeAudio(audio) {
    if (audio.muted) {
        return;
    }

    try {
        if (!audio.context) {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                reportWarning(
                    audio,
                    "Web Audio is not available in this browser."
                );
                return;
            }
            audio.context = new AudioContextClass();
        }
        resumeAudio(audio);
    } catch {
        reportWarning(audio, "Sound could not be started in this browser.");
    }
}

export function setMuted(audio, muted) {
    audio.muted = muted;
    try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
        if (!muted) {
            reportWarning(audio, "");
        }
    } catch {
        reportWarning(
            audio,
            "Sound preference could not be loaded or saved."
        );
    }
}

function playTone(audio, sound, now) {
    try {
        const oscillator = audio.context.createOscillator();
        const gain = audio.context.createGain();
        oscillator.type = sound.wave;
        oscillator.frequency.setValueAtTime(sound.frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(
            CONFIG.audio.volume,
            now + 0.01
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + sound.duration
        );
        oscillator.connect(gain);
        gain.connect(audio.context.destination);
        oscillator.start(now);
        oscillator.stop(now + sound.duration);
    } catch {
        reportWarning(audio, "A sound effect could not be played.");
    }
}

export function playSound(audio, soundName) {
    const sound = CONFIG.audio.sounds[soundName];
    if (!sound || audio.muted || !audio.context) {
        return;
    }

    const now = audio.context.currentTime;
    const cooldown = CONFIG.audio.cooldowns[soundName];
    const lastPlayed = audio.lastPlayed[soundName] ?? -Infinity;
    if (now - lastPlayed < cooldown) {
        return;
    }
    audio.lastPlayed[soundName] = now;
    playTone(audio, sound, now);
}
