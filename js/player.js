import { CONFIG } from "./config.js";
import { clamp, normalizeVector, distanceSquared } from "./utils.js";

export function createPlayer(canvas) {
    const player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: CONFIG.player.radius,
        hp: CONFIG.player.maxHp,
        maxHp: CONFIG.player.maxHp,
        speed: CONFIG.player.speed,
        pickupRange: CONFIG.player.pickupRange,
        level: 1,
        xp: 0,
        pulseTimer: 0,
        pulseEffectTimer: 0,
        damageFlash: 0,
        fireTimer: 0,
        invulnTimer: 0,
        stats: {
            damage: CONFIG.weapon.damage,
            fireRate: CONFIG.weapon.fireRate,
            projectileSpeed: CONFIG.weapon.projectileSpeed,
            projectileRadius: CONFIG.weapon.projectileRadius,
            projectileLifetime: CONFIG.weapon.lifetime,
            projectileCount: CONFIG.weapon.projectileCount,
            pierce: CONFIG.weapon.pierce,
            orbs: 0,
            pulse: 0
        }
    };
    return player;
}

export function updatePlayer(player, keys, dt, canvas) {
    let moveX = 0;
    let moveY = 0;
    if (keys.left) moveX -= 1;
    if (keys.right) moveX += 1;
    if (keys.up) moveY -= 1;
    if (keys.down) moveY += 1;
    const direction = normalizeVector(moveX, moveY);
    player.x += direction.x * player.speed * dt;
    player.y += direction.y * player.speed * dt;
    player.x = clamp(
        player.x,
        player.radius,
        canvas.width - player.radius
    );
    player.y = clamp(
        player.y,
        player.radius,
        canvas.height - player.radius
    );
    if (player.invulnTimer > 0) {
        player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    }
}

export function findNearestEnemy(player, enemies) {
    let nearestEnemy = null;
    let nearestDistance = Infinity;

    for (const enemy of enemies) {
        if (enemy.hp <= 0) {
            continue;
        }
        const distance = distanceSquared(
            player.x,
            player.y,
            enemy.x,
            enemy.y
        );
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEnemy = enemy;
        }
    }
    return nearestEnemy;
}

export function updateAutoFire(player, enemies, dt) {
    player.fireTimer -= dt;
    if (player.fireTimer > 0) {
        return null;
    }
    const target = findNearestEnemy(player, enemies);
    if (!target) {
        return null;
    }
    player.fireTimer = 1 / player.stats.fireRate;
    return target;
}