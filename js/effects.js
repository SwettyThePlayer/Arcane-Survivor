import { CONFIG } from "./config.js";
import { distanceSquared, randomRange } from "./utils.js";

const ENEMY_COLORS = {
    bat: "#ff9ab9",
    skeleton: "#f4e7c9",
    ghost: "#a9e8ef",
    boss: "#ff6478"
};

function addParticles(state, x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = randomRange(
            CONFIG.effects.particleSpeedMin,
            CONFIG.effects.particleSpeedMax
        );
        state.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: randomRange(
                CONFIG.effects.particleRadius * 0.6,
                CONFIG.effects.particleRadius
            ),
            color,
            life: CONFIG.effects.particleLife,
            maxLife: CONFIG.effects.particleLife
        });
    }
}

export function recordDamage(state, enemy, damage) {
    enemy.hitFlash = CONFIG.effects.hitFlashDuration;
    addParticles(
        state,
        enemy.x,
        enemy.y,
        ENEMY_COLORS[enemy.type],
        CONFIG.effects.hitParticleCount
    );
    state.texts.push({
        x: enemy.x,
        y: enemy.y - enemy.radius,
        value: Math.round(damage),
        life: CONFIG.effects.damageTextDuration
    });
}

export function recordPlayerDamage(state, player, damage) {
    player.damageFlash = CONFIG.effects.playerDamageFlashDuration;
    state.shake = CONFIG.effects.screenShakeDuration;
    state.texts.push({
        x: player.x,
        y: player.y - player.radius,
        value: Math.round(damage),
        color: "#ff6478",
        life: CONFIG.effects.damageTextDuration
    });
}

export function recordEnemyDefeat(state, enemy) {
    addParticles(
        state,
        enemy.x,
        enemy.y,
        ENEMY_COLORS[enemy.type],
        CONFIG.effects.killParticleCount
    );
}

export function updateCombatEffects(state, dt) {
    if (state.player) {
        state.player.damageFlash = Math.max(
            0,
            state.player.damageFlash - dt
        );
    }
    for (const enemy of state.enemies) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    }
    for (const particle of state.particles) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += CONFIG.effects.particleGravity * dt;
    }
    state.particles = state.particles.filter(
        particle => particle.life > 0
    );
    state.shake = Math.max(0, state.shake - dt);
    for (const text of state.texts) {
        text.life -= dt;
        text.y -= CONFIG.effects.damageTextRiseSpeed * dt;
    }
    state.texts = state.texts.filter(text => text.life > 0);
}

export function drawParticles(ctx, particles) {
    for (const particle of particles) {
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(
            particle.x,
            particle.y,
            particle.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export function drawDamageNumbers(ctx, texts) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.lineWidth = 3;
    for (const text of texts) {
        ctx.globalAlpha = Math.min(
            1,
            text.life / CONFIG.effects.damageTextDuration
        );
        ctx.strokeStyle = "#24192f";
        ctx.fillStyle = text.color || "#ffe5a8";
        ctx.strokeText(String(text.value), text.x, text.y);
        ctx.fillText(String(text.value), text.x, text.y);
    }
    ctx.globalAlpha = 1;
}

function getPulseRadius(stacks) {
    return CONFIG.upgrades.pulse.radius +
        (stacks - 1) * CONFIG.upgrades.pulse.radiusPerStack;
}

function damageEnemiesInPulse(state, radius, damage, onHit = null) {
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0) {
            continue;
        }
        const distance = distanceSquared(
            state.player.x,
            state.player.y,
            enemy.x,
            enemy.y
        );
        const hitRadius = radius + enemy.radius;
        if (distance <= hitRadius * hitRadius) {
            enemy.hp -= damage;
            recordDamage(state, enemy, damage);
            if (onHit) {
                onHit();
            }
        }
    }

    const killedEnemies = state.enemies.filter(enemy => enemy.hp <= 0);
    state.enemies = state.enemies.filter(enemy => enemy.hp > 0);
    return killedEnemies;
}

export function updatePulse(state, dt, onHit = null) {
    const player = state.player;
    if (player.stats.pulse === 0) {
        return [];
    }

    player.pulseTimer = Math.max(0, player.pulseTimer - dt);
    player.pulseEffectTimer = Math.max(
        0,
        player.pulseEffectTimer - dt
    );
    if (player.pulseTimer > 0) {
        return [];
    }

    player.pulseTimer = CONFIG.upgrades.pulse.interval;
    player.pulseEffectTimer = CONFIG.upgrades.pulse.effectDuration;
    const damage = player.stats.pulse *
        CONFIG.upgrades.pulse.damagePerStack;
    return damageEnemiesInPulse(
        state,
        getPulseRadius(player.stats.pulse),
        damage,
        onHit
    );
}

function getPulseEffect(player) {
    if (
        !player ||
        player.stats.pulse === 0 ||
        player.pulseEffectTimer <= 0
    ) {
        return null;
    }
    const progress = 1 -
        player.pulseEffectTimer / CONFIG.upgrades.pulse.effectDuration;
    return {
        radius: getPulseRadius(player.stats.pulse) * progress,
        alpha: 1 - progress
    };
}

export function drawPulse(ctx, player) {
    const effect = getPulseEffect(player);
    if (!effect) {
        return;
    }

    ctx.globalAlpha = effect.alpha;
    ctx.strokeStyle = "#72e5ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}