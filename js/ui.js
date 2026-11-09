const elements = {
    menuScreen: document.getElementById("menu-screen"),
    gameHud: document.getElementById("game-hud"),
    gameOverScreen: document.getElementById("game-over-screen"),
    startButton: document.getElementById("start-button"),
    restartButton: document.getElementById("restart-button"),
    hpFill: document.getElementById("hp-fill"),
    hpText: document.getElementById("hp-text"),
    bestScore: document.getElementById("best-score"),
    finalTime: document.getElementById("final-time"),
    finalKills: document.getElementById("final-kills"),
    newRecord: document.getElementById("new-record")
};

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");
    return `${formattedMinutes}:${formattedSeconds}`;
}

export function setupUI(onStart, onReturnToMenu) {
    elements.startButton.addEventListener("click", () => {
        onStart();
    });
    elements.restartButton.addEventListener("click", () => {
        onReturnToMenu();
    });
}

export function showMenu(bestTime = null) {
    elements.menuScreen.hidden = false;
    elements.gameHud.hidden = true;
    elements.gameOverScreen.hidden = true;
    if (bestTime !== null) {
        elements.bestScore.textContent =
            `Best time: ${formatTime(bestTime)}`;
    } else {
        elements.bestScore.textContent = "Best time: --";
    }
}

export function showHUD() {
    elements.menuScreen.hidden = true;
    elements.gameHud.hidden = false;
    elements.gameOverScreen.hidden = true;
}

export function updateHUD(player) {
    const hpPercentage = Math.max(
        0,
        Math.min(100, (player.hp / player.maxHp) * 100)
    );
    elements.hpFill.style.width = `${hpPercentage}%`;
    elements.hpText.textContent =
        `${Math.ceil(player.hp)} / ${player.maxHp}`;
}

export function showGameOver(time, kills, isNewRecord = false) {
    elements.menuScreen.hidden = true;
    elements.gameHud.hidden = true;
    elements.gameOverScreen.hidden = false;
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