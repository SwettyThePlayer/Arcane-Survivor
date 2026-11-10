import { CONFIG } from "./config.js";
import { distanceSquared } from "./utils.js";

function getPulseRadius(stacks) {
    return CONFIG.upgrades.pulse.radius +
        (stacks - 1) * CONFIG.upgrades.pulse.radiusPerStack;
}

function damageEnemiesInPulse(state, radius, damage) {
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
        }
    }

    const killedEnemies = state.enemies.filter(enemy => enemy.hp <= 0);
    state.enemies = state.enemies.filter(enemy => enemy.hp > 0);
    return killedEnemies;
}

export function updatePulse(state, dt) {
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
        damage
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