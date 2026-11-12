import { CONFIG } from "./config.js";

const elements = {
    menuScreen: document.getElementById("menu-screen"),
    gameHud: document.getElementById("game-hud"),
    pauseScreen: document.getElementById("pause-screen"),
    touchControls: document.getElementById("touch-controls"),
    gameOverScreen: document.getElementById("game-over-screen"),
    levelUpScreen: document.getElementById("level-up-screen"),
    startButton: document.getElementById("start-button"),
    pauseButton: document.getElementById("pause-button"),
    resumeButton: document.getElementById("resume-button"),
    restartButton: document.getElementById("restart-button"),
    hpFill: document.getElementById("hp-fill"),
    hpText: document.getElementById("hp-text"),
    levelText: document.getElementById("level-text"),
    xpText: document.getElementById("xp-text"),
    xpFill: document.getElementById("xp-fill"),
    buffStatus: document.getElementById("buff-status"),
    bestScore: document.getElementById("best-score"),
    highScore: document.getElementById("high-score"),
    storageWarning: document.getElementById("storage-warning"),
    finalTime: document.getElementById("final-time"),
    finalKills: document.getElementById("final-kills"),
    newRecord: document.getElementById("new-record"),
    levelUpMessage: document.getElementById("level-up-message"),
    upgradeCards: document.getElementById("upgrade-cards"),
    timeText: document.getElementById("time-text"),
    killsText: document.getElementById("kills-text"),
    bossWarning: document.getElementById("boss-warning"),
    bossHud: document.getElementById("boss-hud"),
    bossHpFill: document.getElementById("boss-hp-fill"),
    bossHpBar: document.getElementById("boss-hp-bar"),
    bossHpText: document.getElementById("boss-hp-text"),
    muteButton: document.getElementById("mute-button"),
    audioWarning: document.getElementById("audio-warning")
};

let activeChoices = [];
let onChoiceSelected = null;
let levelUpVisible = false;
let storageWarning = false;

const RECORDS_STORAGE_KEY = "arcane-survivor-records";

function loadRecords() {
    try {
        const savedRecords = localStorage.getItem(RECORDS_STORAGE_KEY);
        if (savedRecords === null) {
            return { bestTime: 0, bestKills: 0 };
        }

        const records = JSON.parse(savedRecords);
        if (
            !Number.isFinite(records.bestTime) ||
            records.bestTime < 0 ||
            !Number.isInteger(records.bestKills) ||
            records.bestKills < 0
        ) {
            storageWarning = true;
            return { bestTime: 0, bestKills: 0 };
        }
        return records;
    } catch {
        storageWarning = true;
        return { bestTime: 0, bestKills: 0 };
    }
}

const records = loadRecords();

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");
    return `${formattedMinutes}:${formattedSeconds}`;
}

function clearLevelUpSelection() {
    activeChoices = [];
    onChoiceSelected = null;
    levelUpVisible = false;

    elements.upgradeCards.replaceChildren();
}

function selectLevelUpChoice(choice) {
    if (!levelUpVisible || !onChoiceSelected) {
        return;
    }
    const callback = onChoiceSelected;
    clearLevelUpSelection();
    callback(choice);
}

function handleLevelUpKeyDown(event) {
    if (!levelUpVisible || event.repeat) {
        return;
    }
    const choiceNumber = Number(event.key);
    if (
        !Number.isInteger(choiceNumber) ||
        choiceNumber < 1 ||
        choiceNumber > activeChoices.length
    ) {
        return;
    }
    event.preventDefault();
    const selectedChoice = activeChoices[choiceNumber - 1];
    selectLevelUpChoice(selectedChoice);
}

function createUpgradeCard(choice, index) {
    const isHeal = choice === null;
    const cardData = isHeal
        ? {
            icon: "💚",
            name: "Arcane Renewal",
            description: `Restore ${
                Math.round(CONFIG.upgrades.fallbackHealPercent * 100)
            }% of your maximum HP.`
        }
        : choice;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "upgrade-card";

    const key = document.createElement("span");
    key.className = "upgrade-key";
    key.textContent = String(index + 1);

    const icon = document.createElement("span");
    icon.className = "upgrade-icon";
    icon.textContent = cardData.icon;

    const name = document.createElement("span");
    name.className = "upgrade-name";
    name.textContent = cardData.name;

    const description = document.createElement("span");
    description.className = "upgrade-description";
    description.textContent = cardData.description;
    
    card.append(
        key,
        icon,
        name,
        description
    );
    card.addEventListener("click", () => {
        selectLevelUpChoice(choice);
    });
    return card;
}

export function updateAudioStatus(muted, warning = "") {
    elements.muteButton.setAttribute("aria-pressed", String(muted));
    const label = muted ? "Turn sound on" : "Turn sound off";
    elements.muteButton.setAttribute("aria-label", label);
    elements.muteButton.title = label;
    elements.audioWarning.hidden = !warning;
    elements.audioWarning.textContent = warning;
}

export function setupUI(
    onStart,
    onReturnToMenu,
    onTogglePause,
    onToggleMute,
    muted,
    audioWarning
) {
    elements.startButton.addEventListener("click", () => {
        onStart();
    });
    elements.restartButton.addEventListener("click", () => {
        onReturnToMenu();
    });
    elements.pauseButton.addEventListener("click", onTogglePause);
    elements.resumeButton.addEventListener("click", onTogglePause);
    elements.muteButton.addEventListener("click", () => {
        onToggleMute();
    });
    window.addEventListener(
        "keydown",
        handleLevelUpKeyDown
    );
    updateAudioStatus(muted, audioWarning);
}

function updateRecordsDisplay() {
    elements.bestScore.textContent = records.bestTime > 0
        ? formatTime(records.bestTime)
        : "--:--";
    elements.highScore.textContent = records.bestKills > 0
        ? String(records.bestKills)
        : "--";
    elements.storageWarning.hidden = !storageWarning;
    if (storageWarning) {
        elements.storageWarning.textContent =
            "Records could not be loaded or saved in this browser.";
    }
}

export function showMenu() {
    clearLevelUpSelection();
    elements.menuScreen.hidden = false;
    elements.gameHud.hidden = true;
    elements.pauseButton.hidden = true;
    elements.touchControls.hidden = true;
    elements.pauseScreen.hidden = true;
    elements.gameOverScreen.hidden = true;
    elements.levelUpScreen.hidden = true;
    updateRecordsDisplay();
}

export function showHUD(restorePauseFocus = false) {
    clearLevelUpSelection();
    elements.menuScreen.hidden = true;
    elements.gameHud.hidden = false;
    elements.pauseButton.hidden = false;
    elements.touchControls.hidden = false;
    elements.pauseScreen.hidden = true;
    elements.gameOverScreen.hidden = true;
    elements.levelUpScreen.hidden = true;
    if (restorePauseFocus) {
        elements.pauseButton.focus();
    }
}

export function showPaused() {
    elements.pauseButton.hidden = true;
    elements.touchControls.hidden = true;
    elements.pauseScreen.hidden = false;
    elements.resumeButton.focus();
}

export function updateHUD(
    player,
    time = 0,
    kills = 0,
    bossWarningSeconds = 0,
    boss = null
) {
    const hpPercentage = Math.max(
        0,
        Math.min(100, (player.hp / player.maxHp) * 100)
    );
    elements.hpFill.style.width = `${hpPercentage}%`;
    elements.gameHud.classList.toggle(
        "low-health",
        hpPercentage <= CONFIG.effects.lowHealthThreshold * 100
    );
    elements.hpText.textContent =
        `${Math.ceil(player.hp)} / ${player.maxHp}`;
    const xpNeeded = CONFIG.xp.xpNeeded(player.level);
    const xpPercentage = Math.max(
        0,
        Math.min(100, (player.xp / xpNeeded) * 100)
    );
    elements.levelText.textContent =
        `LEVEL ${player.level}`;
    elements.xpText.textContent =
        `${player.xp} / ${xpNeeded} XP`;
    elements.xpFill.style.width =
        `${xpPercentage}%`;
    elements.timeText.textContent = formatTime(time);
    elements.killsText.textContent = String(kills);
    const activeBuffs = [];
    if (player.speedBoostTimer > 0) {
        activeBuffs.push(`SPEED ${Math.ceil(player.speedBoostTimer)}s`);
    }
    if (player.immunityTimer > 0) {
        activeBuffs.push(`WARD ${Math.ceil(player.immunityTimer)}s`);
    }
    if (player.damageReductionTimer > 0) {
        activeBuffs.push(`STONE SKIN ${Math.ceil(player.damageReductionTimer)}s`);
    }
    elements.buffStatus.textContent = activeBuffs.join("  ·  ");
    elements.buffStatus.hidden = activeBuffs.length === 0;
    elements.bossWarning.hidden = bossWarningSeconds <= 0;
    if (bossWarningSeconds > 0) {
        elements.bossWarning.textContent =
            `BOSS APPROACHING — ${Math.ceil(bossWarningSeconds)}s`;
    }
    elements.bossHud.hidden = !boss;
    if (boss) {
        const bossHp = Math.max(0, boss.hp);
        const bossHpPercentage = Math.max(
            0,
            Math.min(100, (bossHp / boss.maxHp) * 100)
        );
        elements.bossHpFill.style.width = `${bossHpPercentage}%`;
        elements.bossHpText.textContent =
            `${Math.ceil(bossHp)} / ${Math.ceil(boss.maxHp)}`;
        elements.bossHpBar.setAttribute(
            "aria-valuenow",
            String(Math.ceil(bossHp))
        );
        elements.bossHpBar.setAttribute(
            "aria-valuemax",
            String(Math.ceil(boss.maxHp))
        );
    }
}

export function showLevelUp(upgrades, onSelect) {
    clearLevelUpSelection();
    levelUpVisible = true;
    onChoiceSelected = onSelect;
    if (upgrades.length === 0) {
        activeChoices = [null];
        elements.levelUpMessage.textContent =
            "All upgrades mastered. Choose a healing reward.";
    } else {
        activeChoices = [...upgrades];
        elements.levelUpMessage.textContent =
            "Choose an upgrade to continue.";
    }
    elements.upgradeCards.replaceChildren();
    for (let i = 0; i < activeChoices.length; i++) {
        const card = createUpgradeCard(
            activeChoices[i],
            i
        );
        elements.upgradeCards.appendChild(card);
    }
    elements.menuScreen.hidden = true;
    elements.gameHud.hidden = true;
    elements.pauseButton.hidden = true;
    elements.touchControls.hidden = true;
    elements.pauseScreen.hidden = true;
    elements.gameOverScreen.hidden = true;
    elements.levelUpScreen.hidden = false;
}

export function showGameOver(time, kills) {
    const newBestTime = time > records.bestTime;
    const newHighScore = kills > records.bestKills;
    if (newBestTime) {
        records.bestTime = time;
    }
    if (newHighScore) {
        records.bestKills = kills;
    }

    try {
        localStorage.setItem(
            RECORDS_STORAGE_KEY,
            JSON.stringify(records)
        );
        storageWarning = false;
    } catch {
        storageWarning = true;
    }

    clearLevelUpSelection();
    elements.menuScreen.hidden = true;
    elements.gameHud.hidden = true;
    elements.pauseButton.hidden = true;
    elements.touchControls.hidden = true;
    elements.pauseScreen.hidden = true;
    elements.gameOverScreen.hidden = false;
    elements.levelUpScreen.hidden = true;
    elements.finalTime.textContent =
        `Time survived: ${formatTime(time)}`;
    elements.finalKills.textContent =
        `Enemies defeated: ${kills}`;
    const recordMessages = [];
    if (newBestTime) {
        recordMessages.push("NEW BEST TIME!");
    }
    if (newHighScore) {
        recordMessages.push("NEW HIGH SCORE!");
    }
    if (storageWarning) {
        recordMessages.push(
            "Records could not be saved in this browser."
        );
    }
    elements.newRecord.textContent = recordMessages.join(" ");
}