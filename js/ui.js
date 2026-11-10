import { CONFIG } from "./config.js";

const elements = {
    menuScreen: document.getElementById("menu-screen"),
    gameHud: document.getElementById("game-hud"),
    gameOverScreen: document.getElementById("game-over-screen"),
    levelUpScreen: document.getElementById("level-up-screen"),
    startButton: document.getElementById("start-button"),
    restartButton: document.getElementById("restart-button"),
    hpFill: document.getElementById("hp-fill"),
    hpText: document.getElementById("hp-text"),
    levelText: document.getElementById("level-text"),
    xpText: document.getElementById("xp-text"),
    xpFill: document.getElementById("xp-fill"),
    bestScore: document.getElementById("best-score"),
    finalTime: document.getElementById("final-time"),
    finalKills: document.getElementById("final-kills"),
    newRecord: document.getElementById("new-record"),
    levelUpMessage: document.getElementById("level-up-message"),
    upgradeCards: document.getElementById("upgrade-cards"),
    timeText: document.getElementById("time-text"),
    killsText: document.getElementById("kills-text")
};

let activeChoices = [];
let onChoiceSelected = null;
let levelUpVisible = false;

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

export function setupUI(onStart, onReturnToMenu) {
    elements.startButton.addEventListener("click", () => {
        onStart();
    });
    elements.restartButton.addEventListener("click", () => {
        onReturnToMenu();
    });
    window.addEventListener(
        "keydown",
        handleLevelUpKeyDown
    );
}

export function showMenu(bestTime = null) {
    clearLevelUpSelection();
    elements.menuScreen.hidden = false;
    elements.gameHud.hidden = true;
    elements.gameOverScreen.hidden = true;
    elements.levelUpScreen.hidden = true;
    if (bestTime !== null) {
        elements.bestScore.textContent =
            `Best time: ${formatTime(bestTime)}`;
    } else {
        elements.bestScore.textContent = "Best time: --";
    }
}

export function showHUD() {
    clearLevelUpSelection();
    elements.menuScreen.hidden = true;
    elements.gameHud.hidden = false;
    elements.gameOverScreen.hidden = true;
    elements.levelUpScreen.hidden = true;
}

export function updateHUD(player, time = 0, kills = 0) {
    const hpPercentage = Math.max(
        0,
        Math.min(100, (player.hp / player.maxHp) * 100)
    );
    elements.hpFill.style.width = `${hpPercentage}%`;
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
    elements.gameOverScreen.hidden = true;
    elements.levelUpScreen.hidden = false;
}

export function showGameOver(time, kills, isNewRecord = false) {
    clearLevelUpSelection();
    elements.menuScreen.hidden = true;
    elements.gameHud.hidden = true;
    elements.gameOverScreen.hidden = false;
    elements.levelUpScreen.hidden = true;
    elements.finalTime.textContent =
        `Time survived: ${formatTime(time)}`;
    elements.finalKills.textContent =
        `Enemies defeated: ${kills}`;
    if (isNewRecord) {
        elements.newRecord.textContent = "NEW RECORD!";
    } else {
        elements.newRecord.textContent = "";
    }
}