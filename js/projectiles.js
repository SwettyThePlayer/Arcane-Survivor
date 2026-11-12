import { circlesCollide, distanceSquared } from "./utils.js";
import { CONFIG } from "./config.js";
import { recordDamage } from "./effects.js";

export function fireProjectiles(player, target, projectiles) {
    const count = player.stats.projectileCount;
    const baseAngle = Math.atan2(
        target.y - player.y,
        target.x - player.x
    );
    const spreadAngle = CONFIG.weapon.spreadAngle;
    for (let i = 0; i < count; i++) {
        let angle = baseAngle;
        if (count > 1) {
            const spreadPosition = i / (count - 1) - 0.5;
            angle += spreadPosition * spreadAngle;
        }
        const projectile = {
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * player.stats.projectileSpeed,
            vy: Math.sin(angle) * player.stats.projectileSpeed,
            radius: player.stats.projectileRadius,
            damage: player.stats.damage,
            life: player.stats.projectileLifetime,
            pierceLeft: player.stats.pierce,
            hitIds: new Set()
        };
        projectiles.push(projectile);
    }
}

export function getOrbPositions(player, time) {
    const count = player.stats.orbs;
    if (player.characterId === "wispkeeper") {
        return player.spiritOrbs.map(orb => ({
            x: orb.x,
            y: orb.y,
            radius: CONFIG.upgrades.orbs.radius,
            phase: orb.phase
        }));
    }
    const positions = [];
    for (let i = 0; i < count; i++) {
        const angle =
            time * CONFIG.upgrades.orbs.orbitSpeed +
            (i / count) * Math.PI * 2;
        positions.push({
            x: player.x +
                Math.cos(angle) * CONFIG.upgrades.orbs.orbitRadius,
            y: player.y +
                Math.sin(angle) * CONFIG.upgrades.orbs.orbitRadius,
            radius: CONFIG.upgrades.orbs.radius
        });
    }
    return positions;
}

function getOrbitPosition(player, index, count, time) {
    const angle =
        time * CONFIG.upgrades.orbs.orbitSpeed +
        (index / count) * Math.PI * 2;
    return {
        x: player.x +
            Math.cos(angle) * CONFIG.upgrades.orbs.orbitRadius,
        y: player.y +
            Math.sin(angle) * CONFIG.upgrades.orbs.orbitRadius
    };
}

function findSpiritTarget(origin, enemies, hitTargets = null, range = null) {
    let nearestEnemy = null;
    let nearestDistance = Infinity;
    const targetRange = range || CONFIG.upgrades.orbs.spiritDashRange;
    const rangeSquared = targetRange * targetRange;
    for (const enemy of enemies) {
        if (
            enemy.hp <= 0 ||
            (hitTargets && hitTargets.has(enemy))
        ) {
            continue;
        }
        const distance = distanceSquared(
            origin.x,
            origin.y,
            enemy.x,
            enemy.y
        );
        if (distance > rangeSquared || distance >= nearestDistance) {
            continue;
        }
        nearestEnemy = enemy;
        nearestDistance = distance;
    }
    return nearestEnemy;
}

function getSpiritDamage(player) {
    return CONFIG.upgrades.orbs.damage *
        (player.stats.damage / CONFIG.weapon.damage);
}

function damageSpiritTarget(state, enemy, onHit) {
    const damage = getSpiritDamage(state.player);
    enemy.hp -= damage;
    recordDamage(state, enemy, damage);
    if (onHit) {
        onHit();
    }
}

function moveOrbToward(orb, destination, player, dt) {
    const directionX = destination.x - orb.x;
    const directionY = destination.y - orb.y;
    const distance = Math.hypot(directionX, directionY);
    const speedMultiplier =
        player.stats.projectileSpeed / CONFIG.weapon.projectileSpeed;
    const movement =
        CONFIG.upgrades.orbs.spiritDashSpeed * speedMultiplier * dt;
    if (distance <= movement || distance === 0) {
        orb.x = destination.x;
        orb.y = destination.y;
        return true;
    }
    orb.x += directionX / distance * movement;
    orb.y += directionY / distance * movement;
    return false;
}

function getSpiritDashInterval(player) {
    const fireRateMultiplier =
        player.stats.fireRate / CONFIG.weapon.fireRate;
    return CONFIG.upgrades.orbs.spiritDashInterval /
        fireRateMultiplier;
}

function syncSpiritOrbs(player) {
    while (player.spiritOrbs.length < player.stats.orbs) {
        player.spiritOrbs.push({
            x: player.x,
            y: player.y,
            radius: CONFIG.upgrades.orbs.radius,
            phase: "orbit",
            cooldown: getSpiritDashInterval(player) *
                (player.spiritOrbs.length / player.stats.orbs),
            target: null,
            hitTargets: null,
            remainingBounces: 0
        });
    }
}

function updateSpiritOrb(state, orb, index, dt, onHit) {
    const player = state.player;
    const home = getOrbitPosition(
        player,
        index,
        player.spiritOrbs.length,
        state.time
    );
    if (orb.phase === "orbit") {
        orb.x = home.x;
        orb.y = home.y;
        orb.cooldown = Math.max(0, orb.cooldown - dt);
        if (orb.cooldown === 0) {
            orb.target = findSpiritTarget(orb, state.enemies);
            orb.phase = orb.target ? "charge" : "orbit";
            if (!orb.target) {
                orb.cooldown = CONFIG.upgrades.orbs.hitInterval;
            } else {
                orb.hitTargets = new Set([orb.target]);
                orb.remainingBounces =
                    player.stats.orbChain *
                    CONFIG.upgrades.spiritChain.targetsPerStack;
            }
        }
        return;
    }
    if (orb.phase === "charge") {
        updateChargingSpirit(state, orb, dt, onHit);
        return;
    }
    if (moveOrbToward(orb, home, player, dt)) {
        orb.phase = "orbit";
        orb.cooldown = getSpiritDashInterval(player);
        orb.hitTargets = null;
    }
}

function updateChargingSpirit(state, orb, dt, onHit) {
    if (!orb.target || orb.target.hp <= 0) {
        orb.target = null;
        orb.phase = "return";
        return;
    }
    moveOrbToward(orb, orb.target, state.player, dt);
    if (!circlesCollide(orb, orb.target)) {
        return;
    }
    const hitEnemy = orb.target;
    damageSpiritTarget(state, hitEnemy, onHit);
    if (orb.remainingBounces > 0) {
        const nextTarget = findSpiritTarget(
            hitEnemy,
            state.enemies,
            orb.hitTargets,
            CONFIG.upgrades.spiritChain.range
        );
        if (nextTarget) {
            orb.target = nextTarget;
            orb.hitTargets.add(nextTarget);
            orb.remainingBounces--;
            return;
        }
    }
    orb.target = null;
    orb.phase = "return";
}

function damageWispkeeperOrbContacts(state, dt, onHit) {
    const orbs = getOrbPositions(state.player, state.time);
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0) {
            continue;
        }
        enemy.orbHitTimer = Math.max(0, enemy.orbHitTimer - dt);
        if (enemy.orbHitTimer > 0) {
            continue;
        }
        if (!orbs.some(orb => circlesCollide(orb, enemy))) {
            continue;
        }
        damageSpiritTarget(state, enemy, onHit);
        enemy.orbHitTimer = CONFIG.upgrades.orbs.hitInterval;
    }
}

function updateSpiritOrbs(state, dt, onHit) {
    const player = state.player;
    syncSpiritOrbs(player);
    for (let i = 0; i < player.spiritOrbs.length; i++) {
        updateSpiritOrb(state, player.spiritOrbs[i], i, dt, onHit);
    }
    damageWispkeeperOrbContacts(state, dt, onHit);
}

export function updateOrbs(state, dt, onHit = null) {
    if (state.player.characterId === "wispkeeper") {
        updateSpiritOrbs(state, dt, onHit);
    }
    const orbs = getOrbPositions(state.player, state.time);
    if (state.player.characterId === "wispkeeper") {
        return removeKilledEnemies(state);
    }
    if (orbs.length === 0) {
        return [];
    }

    for (const enemy of state.enemies) {
        if (enemy.hp <= 0) {
            continue;
        }
        enemy.orbHitTimer = Math.max(0, enemy.orbHitTimer - dt);
        if (enemy.orbHitTimer > 0) {
            continue;
        }
        for (const orb of orbs) {
            if (!circlesCollide(orb, enemy)) {
                continue;
            }
            enemy.hp -= CONFIG.upgrades.orbs.damage;
            recordDamage(state, enemy, CONFIG.upgrades.orbs.damage);
            if (onHit) {
                onHit();
            }
            enemy.orbHitTimer = CONFIG.upgrades.orbs.hitInterval;
            break;
        }
    }

    return removeKilledEnemies(state);
}

function removeKilledEnemies(state) {
    const killedEnemies = state.enemies.filter(enemy => enemy.hp <= 0);
    state.enemies = state.enemies.filter(enemy => enemy.hp > 0);
    return killedEnemies;
}

export function updateProjectiles(state, dt, onHit = null) {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const projectile = state.projectiles[i];
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.life -= dt;
        if (projectile.life <= 0) {
            state.projectiles.splice(i, 1);
            continue;
        }
        let removeProjectile = false;
        for (const enemy of state.enemies) {
            if (enemy.hp <= 0) {
                continue;
            }
            if (projectile.hitIds.has(enemy)) {
                continue;
            }
            if (!circlesCollide(projectile, enemy)) {
                continue;
            }
            enemy.hp -= projectile.damage;
            recordDamage(state, enemy, projectile.damage);
            if (onHit) {
                onHit();
            }
            projectile.hitIds.add(enemy);
            if (projectile.pierceLeft <= 0) {
                removeProjectile = true;
                break;
            }
            projectile.pierceLeft--;
        }
        if (removeProjectile) {
            state.projectiles.splice(i, 1);
        }
    }
    
    const killedEnemies = state.enemies.filter(enemy => enemy.hp <= 0);
    state.enemies = state.enemies.filter(enemy => enemy.hp > 0);
    return killedEnemies;
}