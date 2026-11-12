import { CONFIG } from "./config.js";
import {
    createAudioState,
    initializeAudio,
    playSound,
    setMuted
} from "./audio.js";

import { setupInput } from "./input.js";

import {
    dropGem,
    dropPowerup,
    updateGems,
    updatePowerups,
    POWERUP_COLORS,
    POWERUP_ICONS
} from "./pickups.js";

import {
    createPlayer,
    updatePlayer,
    updateAutoFire
} from "./player.js";

import { updateEnemies } from "./enemies.js";
import {
    drawPulse,
    drawParticles,
    updatePulse,
    recordPlayerDamage,
    recordEnemyDefeat,
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
    showPaused,
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
const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;
const audio = createAudioState();
audio.onWarning = warning => {
    updateAudioStatus(audio.muted, warning);
};
const state = {
    mode: "MENU",
    selectedCharacter: "warden",
    player: null,
    enemies: [],
    projectiles: [],
    gems: [],
    powerups: [],
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
    state.player = createPlayer(canvas, state.selectedCharacter);
    state.enemies = [];
    state.projectiles = [];
    state.gems = [];
    state.powerups = [];
    state.particles = [];
    state.texts = [];
    state.time = 0;
    state.kills = 0;
    state.spawnTimer = CONFIG.spawn.startInterval;
    state.nextBossTime = CONFIG.spawn.bossEveryMinutes * 60;
    state.bossWarningSeconds = 0;
    state.shake = 0;
    state.upgradeStacks = {
        orbs: state.player.stats.orbs
    };
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

function togglePause() {
    if (state.mode === "PLAYING") {
        state.mode = "PAUSED";
        clearMovementKeys();
        showPaused();
        return;
    }
    if (state.mode === "PAUSED") {
        state.mode = "PLAYING";
        clearMovementKeys();
        showHUD(true);
        updateRunHUD();
    }
}

function returnToMenu() {
    state.mode = "MENU";

    state.player = null;

    state.enemies = [];
    state.projectiles = [];
    state.gems = [];
    state.powerups = [];
    state.particles = [];
    state.texts = [];

    clearMovementKeys();

    showMenu();
}

function handlePlayerCollision() {
    const player = state.player;
    if (player.invulnTimer > 0 || player.immunityTimer > 0) {
        return;
    }
    for (const enemy of state.enemies) {
        if (!circlesCollide(player, enemy)) {
            continue;
        }
        const damageMultiplier = player.damageReductionTimer > 0
            ? CONFIG.powerups.damageReductionMultiplier
            : 1;
        const damageTaken = Math.min(
            player.hp,
            enemy.damage * damageMultiplier
        );
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
    const collectedPowerups = updatePowerups(state);
    for (const result of collectedPowerups) {
        killedEnemies.push(...result.killedEnemies);
        state.texts.push({
            x: state.player.x,
            y: state.player.y - state.player.radius - 24,
            value: result.notice,
            color: POWERUP_COLORS[result.type],
            life: CONFIG.powerups.noticeDuration
        });
    }
    if (collectedPowerups.length > 0) {
        playSound(audio, "pickup");
    }
    for (const enemy of killedEnemies) {
        state.kills++;
        recordEnemyDefeat(state, enemy);
        dropGem(state, enemy);
        dropPowerup(state, enemy);
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

function drawPowerups() {
    const radius = CONFIG.powerups.radius;
    for (const powerup of state.powerups) {
        const color = POWERUP_COLORS[powerup.type];
        ctx.save();
        ctx.translate(powerup.x, powerup.y);
        ctx.rotate(Math.PI / 4);
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = color;
        ctx.fillRect(-radius * 0.78, -radius * 0.78, radius * 1.56, radius * 1.56);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-radius * 0.78, -radius * 0.78, radius * 1.56, radius * 1.56);
        ctx.restore();

        ctx.fillStyle = color;
        ctx.font = "bold 15px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillText(POWERUP_ICONS[powerup.type], powerup.x, powerup.y);
        ctx.shadowBlur = 0;
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
    ctx.fillStyle = state.player.characterId === "wispkeeper"
        ? "#b8f4ff"
        : "#72e5ff";
    for (const orb of getOrbPositions(state.player, state.time)) {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawEnemies() {
    for (const enemy of state.enemies) {
        ctx.save();
        if (enemy.hitFlash > 0) {
            ctx.shadowColor = "#fff2c2";
            ctx.shadowBlur = 18;
        }
        if (enemy.type === "bat") {
            drawBatSprite(enemy);
        }
        else if (enemy.type === "skeleton") {
            drawSkeletonSprite(enemy);
        }
        else if (enemy.type === "ghost") {
            drawGhostSprite(enemy);
        }
        else if (enemy.type === "boss") {
            drawBossSprite(enemy);
        }
        ctx.restore();
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
    drawWizardSprite(player);
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

function drawWizardSprite(player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    const r = player.radius;
    const palette = player.characterId === "wispkeeper"
        ? {
            robeStart: "#367b91",
            robeMid: "#234c67",
            robeEnd: "#192d49",
            outline: "#a6f0ff",
            hat: "#1d455c",
            staff: "#8cc9d7",
            staffOrb: "#b8f4ff",
            staffGlow: "#b8f4ff"
        }
        : {
            robeStart: "#614293",
            robeMid: "#382859",
            robeEnd: "#241b3d",
            outline: "#b695f0",
            hat: "#35244f",
            staff: "#d2ad78",
            staffOrb: "#9ce9f5",
            staffGlow: "#6bd9f1"
        };
    const robe = ctx.createLinearGradient(-r, 0, r, r);
    robe.addColorStop(0, palette.robeStart);
    robe.addColorStop(0.55, palette.robeMid);
    robe.addColorStop(1, palette.robeEnd);

    ctx.fillStyle = robe;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, r * 0.92);
    ctx.lineTo(-r * 0.48, -r * 0.05);
    ctx.quadraticCurveTo(0, -r * 0.42, r * 0.48, -r * 0.05);
    ctx.lineTo(r * 0.78, r * 0.92);
    ctx.quadraticCurveTo(0, r * 1.2, -r * 0.72, r * 0.92);
    ctx.fill();
    ctx.stroke();
    drawWizardFace(r);
    drawWizardHat(r, palette);
    drawWizardStaff(r, palette);
    ctx.restore();
}

function drawWizardFace(radius) {
    ctx.fillStyle = "#f3c9a7";
    ctx.beginPath();
    ctx.arc(0, -radius * 0.22, radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#30243e";
    ctx.beginPath();
    ctx.arc(-radius * 0.12, -radius * 0.22, radius * 0.045, 0, Math.PI * 2);
    ctx.arc(radius * 0.12, -radius * 0.22, radius * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e7c77f";
    ctx.beginPath();
    ctx.arc(0, radius * 0.48, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
}

function drawWizardHat(radius, palette) {
    ctx.fillStyle = palette.hat;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.56, -radius * 0.43);
    ctx.lineTo(radius * 0.08, -radius * 1.38);
    ctx.lineTo(radius * 0.58, -radius * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.38, radius * 0.68, radius * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawWizardStaff(radius, palette) {
    ctx.strokeStyle = palette.staff;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(radius * 0.78, radius * 0.86);
    ctx.lineTo(radius * 0.94, -radius * 0.9);
    ctx.stroke();
    ctx.fillStyle = palette.staffOrb;
    ctx.shadowColor = palette.staffGlow;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(radius * 0.94, -radius, radius * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawBatSprite(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const r = enemy.radius;
    ctx.fillStyle = "#4a2946";
    ctx.strokeStyle = "#d278a4";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.18);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.85, -r, -r * 0.06);
    ctx.lineTo(-r * 0.52, r * 0.34);
    ctx.lineTo(-r * 0.12, r * 0.15);
    ctx.moveTo(r * 0.2, -r * 0.18);
    ctx.quadraticCurveTo(r * 0.85, -r * 0.85, r, -r * 0.06);
    ctx.lineTo(r * 0.52, r * 0.34);
    ctx.lineTo(r * 0.12, r * 0.15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#24192f";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.34, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8ba4";
    ctx.beginPath();
    ctx.arc(-r * 0.13, -r * 0.08, r * 0.055, 0, Math.PI * 2);
    ctx.arc(r * 0.13, -r * 0.08, r * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSkeletonSprite(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const r = enemy.radius;
    ctx.fillStyle = "#d7d0bc";
    ctx.strokeStyle = "#f4e7c9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -r * 0.16, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#302735";
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, -r * 0.18, r * 0.13, r * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.22, -r * 0.18, r * 0.13, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b7ad99";
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.57);
    ctx.lineTo(r * 0.3, r * 0.57);
    ctx.moveTo(-r * 0.22, r * 0.76);
    ctx.lineTo(r * 0.22, r * 0.76);
    ctx.stroke();
    ctx.restore();
}

function drawGhostSprite(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const r = enemy.radius;
    ctx.fillStyle = "#a9e8ef";
    ctx.strokeStyle = "#d7fbff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, r * 0.62);
    ctx.lineTo(-r * 0.62, -r * 0.05);
    ctx.quadraticCurveTo(-r * 0.62, -r * 0.78, 0, -r * 0.78);
    ctx.quadraticCurveTo(r * 0.62, -r * 0.78, r * 0.62, -r * 0.05);
    ctx.lineTo(r * 0.62, r * 0.62);
    ctx.lineTo(r * 0.3, r * 0.38);
    ctx.lineTo(0, r * 0.66);
    ctx.lineTo(-r * 0.3, r * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#294054";
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.1, r * 0.07, r * 0.13, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.2, -r * 0.1, r * 0.07, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawBossSprite(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const r = enemy.radius;
    ctx.fillStyle = "#5f263e";
    ctx.strokeStyle = "#ff8796";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.56, -r * 0.42);
    ctx.lineTo(-r * 0.82, -r * 1.08);
    ctx.lineTo(-r * 0.12, -r * 0.68);
    ctx.lineTo(r * 0.12, -r * 0.68);
    ctx.lineTo(r * 0.82, -r * 1.08);
    ctx.lineTo(r * 0.56, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.82, r * 0.84, 0, r * 0.82);
    ctx.quadraticCurveTo(-r * 0.82, r * 0.84, -r * 0.56, -r * 0.42);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffcf87";
    ctx.shadowColor = "#ff546f";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(-r * 0.23, -r * 0.12, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.23, -r * 0.12, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawArenaBackground() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const background = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(canvas.width, canvas.height) * 0.75
    );
    background.addColorStop(0, "#171326");
    background.addColorStop(0.55, "#100e1a");
    background.addColorStop(1, "#090812");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(190, 160, 255, 0.035)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const tileWidth = 112;
    const tileHeight = 88;
    for (
        let row = 0, y = 0;
        y < canvas.height + tileHeight;
        row++, y += tileHeight
    ) {
        const offset = row % 2 === 0 ? 0 : tileWidth / 2;
        for (
            let x = -tileWidth + offset;
            x < canvas.width + tileWidth;
            x += tileWidth
        ) {
            ctx.moveTo(x + 5, y);
            ctx.lineTo(x + tileWidth - 7, y);
            ctx.lineTo(x + tileWidth, y + tileHeight * 0.22);
            ctx.moveTo(x, y + tileHeight * 0.18);
            ctx.lineTo(x, y + tileHeight - 8);
        }
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(201, 168, 255, 0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 132, -0.15, 1.18);
    ctx.arc(centerX, centerY, 132, 2.1, 3.2);
    ctx.arc(centerX, centerY, 132, 4.1, 5.35);
    ctx.arc(centerX, centerY, 208, 0.15, 1.05);
    ctx.arc(centerX, centerY, 208, 2.2, 3.0);
    ctx.arc(centerX, centerY, 208, 4.2, 5.25);
    for (let index = 0; index < 8; index++) {
        const angle = index * Math.PI / 4;
        const innerRadius = 143;
        const outerRadius = 157;
        ctx.moveTo(
            centerX + Math.cos(angle) * innerRadius,
            centerY + Math.sin(angle) * innerRadius
        );
        ctx.lineTo(
            centerX + Math.cos(angle) * outerRadius,
            centerY + Math.sin(angle) * outerRadius
        );
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(212, 187, 255, 0.13)";
    for (let index = 0; index < 8; index++) {
        const angle = index * Math.PI / 4;
        ctx.beginPath();
        ctx.arc(
            centerX + Math.cos(angle) * 132,
            centerY + Math.sin(angle) * 132,
            2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

function drawEnemyAura(enemy) {
    const colors = {
        bat: "rgba(226, 95, 140, 0.18)",
        skeleton: "rgba(236, 201, 140, 0.16)",
        ghost: "rgba(118, 221, 242, 0.2)",
        boss: "rgba(240, 65, 107, 0.28)"
    };
    const radius = enemy.radius * (enemy.type === "boss" ? 2 : 1.65);
    const glow = ctx.createRadialGradient(
        enemy.x,
        enemy.y,
        0,
        enemy.x,
        enemy.y,
        radius
    );
    glow.addColorStop(0, colors[enemy.type]);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayerAura(player) {
    const aura = ctx.createRadialGradient(
        player.x,
        player.y,
        0,
        player.x,
        player.y,
        player.radius * 3.2
    );
    aura.addColorStop(0, "rgba(180, 139, 255, 0.24)");
    aura.addColorStop(0.45, "rgba(112, 77, 185, 0.1)");
    aura.addColorStop(1, "rgba(112, 77, 185, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 3.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawArenaMotes(time) {
    for (let index = 0; index < 34; index++) {
        const seed = index * 97.31;
        const drift = time * (8 + index % 5);
        const x = (seed * 7.3 + drift) % canvas.width;
        const y = (
            (seed * 13.7 - drift * 0.45) % canvas.height +
            canvas.height
        ) % canvas.height;
        const pulse = 0.35 + (Math.sin(time * 1.4 + seed) + 1) * 0.25;
        const radius = index % 7 === 0 ? 1.8 : 1.1;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = index % 5 === 0 ? "#b9a2ff" : "#8a789e";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawGame() {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
    ctx.save();
    if (state.shake > 0 && !reduceMotion) {
        const shakeProgress = state.shake /
            CONFIG.effects.screenShakeDuration;
        const intensity =
            CONFIG.effects.screenShakeIntensity * shakeProgress;
        ctx.translate(
            (Math.random() * 2 - 1) * intensity,
            (Math.random() * 2 - 1) * intensity
        );
    }
    drawArenaBackground();
    drawArenaMotes(state.time);
    drawGems();
    drawPowerups();
    drawProjectiles();
    drawOrbs();
    drawPulse(ctx, state.player);
    if (state.player) {
        drawPlayerAura(state.player);
    }
    for (const enemy of state.enemies) {
        drawEnemyAura(enemy);
    }
    drawEnemies();
    drawPlayer();
    drawParticles(ctx, state.particles);
    drawDamageNumbers(ctx, state.texts);
    ctx.restore();
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
    if (
        key === "escape" &&
        (state.mode === "PLAYING" || state.mode === "PAUSED")
    ) {
        event.preventDefault();
        togglePause();
        return;
    }
    if (
        key === "enter" &&
        state.mode === "MENU" &&
        !(event.target instanceof HTMLButtonElement)
    ) {
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
    togglePause,
    () => {
        setMuted(audio, !audio.muted);
        state.muted = audio.muted;
        updateAudioStatus(audio.muted, audio.warning);
        if (!audio.muted) {
            initializeAudio(audio);
        }
    },
    audio.muted,
    audio.warning,
    characterId => {
        state.selectedCharacter = characterId;
    }
);

window.addEventListener(
    "keydown",
    handleGlobalKeyDown
);

showMenu();
requestAnimationFrame(gameLoop);