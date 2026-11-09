import { CONFIG } from "./config.js";

import { setupInput } from "./input.js";

import { dropGem, updateGems } from "./pickups.js";

import {
    createPlayer,
    updatePlayer,
    updateAutoFire
} from "./player.js";

import { updateEnemies } from "./enemies.js";

import {
    fireProjectiles,
    updateProjectiles
} from "./projectiles.js";

import {
    setupUI,
    showMenu,
    showHUD,
    updateHUD,
    showGameOver
} from "./ui.js";

import { clamp, circlesCollide } from "./utils.js";
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
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
    shake: 0,

    upgradeStacks: {},
    muted: false,

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
    state.shake = 0;

    state.upgradeStacks = {};

    clearMovementKeys();
}

function startGame() {
    resetRun();

    state.mode = "PLAYING";

    showHUD();
    updateHUD(state.player);
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
        player.hp = Math.max(0, player.hp - enemy.damage);
        player.invulnTimer = CONFIG.player.invulnTime;
        break;
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
    }
    const killedEnemies = updateProjectiles(state, dt);
    for (const enemy of killedEnemies) {
        state.kills++;

        dropGem(state, enemy);
    }
    updateGems(state, dt);
    handlePlayerCollision();
    updateHUD(state.player);
    if (state.player.hp <= 0) {
        state.mode = "GAME_OVER";

        showGameOver(
            state.time,
            state.kills
        );
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

function drawEnemies() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const enemy of state.enemies) {
        ctx.font = `${enemy.radius * 2}px serif`;
        ctx.fillText(
            enemy.emoji,
            enemy.x,
            enemy.y
        );
    }
}

function drawPlayer() {
    if (!state.player) {
        return;
    }
    const player = state.player;
    ctx.globalAlpha = player.invulnTimer > 0 ? 0.5 : 1;
    ctx.font = `${player.radius * 2}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        CONFIG.player.emoji,
        player.x,
        player.y
    );
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
    drawEnemies();
    drawPlayer();
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
    returnToMenu
);

window.addEventListener(
    "keydown",
    handleGlobalKeyDown
);

showMenu();

requestAnimationFrame(gameLoop);