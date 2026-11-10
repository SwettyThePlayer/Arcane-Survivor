import { CONFIG } from "./config.js";
import {
    createAudioState,
    initializeAudio,
    playSound,
    setMuted
} from "./audio.js";

import { setupInput } from "./input.js";

import { dropGem, updateGems } from "./pickups.js";

import {
    createPlayer,
    updatePlayer,
    updateAutoFire
} from "./player.js";

import { updateEnemies } from "./enemies.js";
import {
    drawPulse,
    updatePulse,
    recordPlayerDamage,
    updateCombatEffects,
    drawDamageNumbers
} from "./effects.js";

import {
    fireProjectiles,
    updateProjectiles,
    updateOrbs,
    getOrbPositions
} from "./projectiles.js";

import {
    setupUI,
    showMenu,
    showHUD,
    updateHUD,
    showGameOver,
    showLevelUp,
    updateAudioStatus
} from "./ui.js";

import {
    getRandomUpgrades,
    applyUpgrade,
    healPlayer
} from "./upgrades.js";

import { clamp, circlesCollide } from "./utils.js";
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const audio = createAudioState();
audio.onWarning = warning => {
    updateAudioStatus(audio.muted, warning);
};
const state = {
    mode: "MENU",
    player: null,
    enemies: [],
    projectiles: [],
    gems: [],
    particles: [],
    texts: [],
    time: 0,
    kills: 0,
    spawnTimer: 0,
    nextBossTime: 0,
    bossWarningSeconds: 0,
    shake: 0,
    pendingLevelUps: 0,
    upgradeStacks: {},
    muted: audio.muted,
    keys: null
};

let lastFrameTime = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (state.player) {
        const radius = state.player.radius;
        state.player.x = clamp(
            state.player.x,
            radius,
            Math.max(radius, canvas.width - radius)
        );

        state.player.y = clamp(
            state.player.y,
            radius,
            Math.max(radius, canvas.height - radius)
        );
    }
}

function clearMovementKeys() {
    state.keys.up = false;
    state.keys.down = false;
    state.keys.left = false;
    state.keys.right = false;
}

function resetRun() {
    state.player = createPlayer(canvas);
    state.enemies = [];
    state.projectiles = [];
    state.gems = [];
    state.particles = [];
    state.texts = [];
    state.time = 0;
    state.kills = 0;
    state.spawnTimer = CONFIG.spawn.startInterval;
    state.nextBossTime = CONFIG.spawn.bossEveryMinutes * 60;
    state.bossWarningSeconds = 0;
    state.shake = 0;
    state.upgradeStacks = {};
    state.pendingLevelUps = 0;
    clearMovementKeys();
}

function updateRunHUD() {
    const boss = state.enemies.find(enemy => enemy.type === "boss") || null;
    updateHUD(
        state.player,
        state.time,
        state.kills,
        state.bossWarningSeconds,
        boss
    );
}

function presentNextLevelUp() {
    const choices = getRandomUpgrades(state);
    playSound(audio, "levelUp");
    showLevelUp(choices, handleUpgradeSelection);
}

function handleUpgradeSelection(choice) {
    if (choice === null) {
        healPlayer(state);
    } else {
        applyUpgrade(state, choice);
    }
    state.pendingLevelUps--;
    updateRunHUD();
    if (state.pendingLevelUps > 0) {
        presentNextLevelUp();
        return;
    }
    state.mode = "PLAYING";
    showHUD();
    updateRunHUD();
}

function startGame() {
    initializeAudio(audio);
    state.muted = audio.muted;
    updateAudioStatus(audio.muted, audio.warning);
    resetRun();
    state.mode = "PLAYING";
    showHUD();
    updateRunHUD();
}

function returnToMenu() {
    state.mode = "MENU";

    state.player = null;

    state.enemies = [];
    state.projectiles = [];
    state.gems = [];
    state.particles = [];
    state.texts = [];

    clearMovementKeys();

    showMenu();
}

function handlePlayerCollision() {
    const player = state.player;
    if (player.invulnTimer > 0) {
        return;
    }
    for (const enemy of state.enemies) {
        if (!circlesCollide(player, enemy)) {
            continue;
        }
        const damageTaken = Math.min(player.hp, enemy.damage);
        player.hp = Math.max(0, player.hp - damageTaken);
        player.invulnTimer = CONFIG.player.invulnTime;
        recordPlayerDamage(state, player, damageTaken);
        playSound(audio, "hit");
        break;
    }
}

function processLevelUps() {
    const player = state.player;
    while (player.xp >= CONFIG.xp.xpNeeded(player.level)) {
        const requiredXP = CONFIG.xp.xpNeeded(player.level);
        player.xp -= requiredXP;
        player.level++;
        state.pendingLevelUps++;
    }
}

function updateGame(dt) {
    state.time += dt;
    updatePlayer(
        state.player,
        state.keys,
        dt,
        canvas
    );
    updateEnemies(state, dt, canvas);
    const target = updateAutoFire(
        state.player,
        state.enemies,
        dt
    );
    if (target) {
        fireProjectiles(
            state.player,
            target,
            state.projectiles
        );
        playSound(audio, "shoot");
    }
    let enemyHitThisFrame = false;
    const recordEnemyHit = () => {
        enemyHitThisFrame = true;
    };
    const killedEnemies = updateProjectiles(
        state,
        dt,
        recordEnemyHit
    );
    killedEnemies.push(...updateOrbs(state, dt, recordEnemyHit));
    killedEnemies.push(...updatePulse(state, dt, recordEnemyHit));
    if (enemyHitThisFrame) {
        playSound(audio, "hit");
    }
    updateCombatEffects(state, dt);
    for (const enemy of killedEnemies) {
        state.kills++;

        dropGem(state, enemy);
    }
    const collectedGems = updateGems(state, dt);
    if (collectedGems > 0) {
        playSound(audio, "pickup");
    }
    processLevelUps();
    handlePlayerCollision();
    updateRunHUD();
    if (state.player.hp <= 0) {
        state.mode = "GAME_OVER";
        playSound(audio, "death");
        showGameOver(
            state.time,
            state.kills
        );
        return;
    }
    if (state.pendingLevelUps > 0) {
        state.mode = "LEVEL_UP";
        clearMovementKeys();
        presentNextLevelUp();
    }
}

function drawGems() {
    const radius = CONFIG.xp.gemRadius;
    for (const gem of state.gems) {
        ctx.fillStyle = "#a970ff";
        ctx.beginPath();
        ctx.moveTo(gem.x, gem.y - radius);
        ctx.lineTo(gem.x + radius, gem.y);
        ctx.lineTo(gem.x, gem.y + radius);
        ctx.lineTo(gem.x - radius, gem.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#e5d2ff";
        ctx.beginPath();
        ctx.arc(
            gem.x - radius * 0.2,
            gem.y - radius * 0.2,
            radius * 0.18,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

function drawProjectiles() {
    ctx.fillStyle = "#bd9aff";

    for (const projectile of state.projectiles) {
        ctx.beginPath();

        ctx.arc(
            projectile.x,
            projectile.y,
            projectile.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

function drawOrbs() {
    if (!state.player) {
        return;
    }
    ctx.fillStyle = "#72e5ff";
    for (const orb of getOrbPositions(state.player, state.time)) {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawEnemies() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const enemy of state.enemies) {
        ctx.font = `${enemy.radius * 2}px serif`;
        if (enemy.hitFlash > 0) {
            ctx.shadowColor = "#fff2c2";
            ctx.shadowBlur = 18;
        }
        ctx.fillText(
            enemy.emoji,
            enemy.x,
            enemy.y
        );
        ctx.shadowBlur = 0;
    }
}

function drawPlayer() {
    if (!state.player) {
        return;
    }
    const player = state.player;
    ctx.globalAlpha = player.invulnTimer > 0 ? 0.5 : 1;
    if (player.damageFlash > 0) {
        ctx.shadowColor = "#ff344f";
        ctx.shadowBlur = 24;
    }
    ctx.font = `${player.radius * 2}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        CONFIG.player.emoji,
        player.x,
        player.y
    );
    if (player.damageFlash > 0) {
        ctx.globalAlpha = Math.min(
            1,
            player.damageFlash / CONFIG.effects.playerDamageFlashDuration
        );
        ctx.strokeStyle = "#ff344f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
            player.x,
            player.y,
            player.radius + 5,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}
function drawGame() {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
    ctx.fillStyle = "#0b0a12";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
    drawGems();
    drawProjectiles();
    drawOrbs();
    drawPulse(ctx, state.player);
    drawEnemies();
    drawPlayer();
    drawDamageNumbers(ctx, state.texts);
}

function gameLoop(now) {
    let dt = 0;
    if (lastFrameTime !== null) {
        dt = Math.min(
            (now - lastFrameTime) / 1000,
            0.05
        );
    }
    lastFrameTime = now;
    if (state.mode === "PLAYING") {
        updateGame(dt);
    }
    drawGame();
    requestAnimationFrame(gameLoop);
}

function handleGlobalKeyDown(event) {

    if (event.repeat) {
        return;
    }

    const key = event.key.toLowerCase();
    if (key === "enter" && state.mode === "MENU") {
        event.preventDefault();
        startGame();
    }
    if (key === "r" && state.mode === "GAME_OVER") {
        event.preventDefault();
        returnToMenu();
    }
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
setupInput(state);
setupUI(
    startGame,
    returnToMenu,
    () => {
        setMuted(audio, !audio.muted);
        state.muted = audio.muted;
        updateAudioStatus(audio.muted, audio.warning);
        if (!audio.muted) {
            initializeAudio(audio);
        }
    },
    audio.muted,
    audio.warning
);

window.addEventListener(
    "keydown",
    handleGlobalKeyDown
);

showMenu();
requestAnimationFrame(gameLoop);