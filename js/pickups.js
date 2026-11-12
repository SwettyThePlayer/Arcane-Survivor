import { CONFIG } from "./config.js";
import { normalizeVector, distanceSquared } from "./utils.js";
import { recordDamage } from "./effects.js";

export const POWERUP_ICONS = {
    heal: "✚",
    nuke: "☄",
    levelUp: "✦",
    speed: "➤",
    immunity: "◇",
    damageReduction: "⬟"
};

export const POWERUP_COLORS = {
    heal: "#83e6ba",
    nuke: "#ff7189",
    levelUp: "#f5d485",
    speed: "#76ddf2",
    immunity: "#c5a5ff",
    damageReduction: "#88aaff"
};

const POWERUP_NOTICES = {
    heal: "HEALED",
    nuke: "ARCANE BLAST",
    levelUp: "LEVEL UP",
    speed: "SWIFTNESS",
    immunity: "WARDING",
    damageReduction: "STONE SKIN"
};

function choosePowerupType() {
    const weights = Object.entries(CONFIG.powerups.weights);
    const totalWeight = weights.reduce(
        (total, [, weight]) => total + weight,
        0
    );
    let roll = Math.random() * totalWeight;
    for (const [type, weight] of weights) {
        roll -= weight;
        if (roll < 0) {
            return type;
        }
    }
    return weights[weights.length - 1][0];
}

export function dropPowerup(state, enemy) {
    if (enemy.type === "boss") {
        state.powerups.push({
            x: enemy.x,
            y: enemy.y,
            type: CONFIG.powerups.bossReward
        });
        return true;
    }
    if (Math.random() >= CONFIG.powerups.dropChance) {
        return false;
    }
    state.powerups.push({
        x: enemy.x,
        y: enemy.y,
        type: choosePowerupType()
    });
    return true;
}

function randomBuffDuration() {
    return CONFIG.powerups.buffDurationMin + Math.random() * (
        CONFIG.powerups.buffDurationMax -
        CONFIG.powerups.buffDurationMin
    );
}

function damageWithNuke(state) {
    const killedEnemies = [];
    const remainingEnemies = [];
    const radiusSquared =
        CONFIG.powerups.nukeRadius * CONFIG.powerups.nukeRadius;
    for (const enemy of state.enemies) {
        const distance = distanceSquared(
            state.player.x,
            state.player.y,
            enemy.x,
            enemy.y
        );
        if (distance > radiusSquared) {
            remainingEnemies.push(enemy);
            continue;
        }
        if (enemy.type === "boss") {
            const damage =
                enemy.maxHp * CONFIG.powerups.nukeBossDamagePercent;
            enemy.hp = Math.max(1, enemy.hp - damage);
            recordDamage(state, enemy, damage);
            remainingEnemies.push(enemy);
            continue;
        }
        enemy.hp = 0;
        killedEnemies.push(enemy);
    }
    state.enemies = remainingEnemies;
    return killedEnemies;
}

function applyPowerup(state, powerup) {
    const player = state.player;
    if (powerup.type === "heal") {
        player.hp = Math.min(
            player.maxHp,
            player.hp + player.maxHp * CONFIG.powerups.healPercent
        );
    }
    else if (powerup.type === "nuke") {
        return damageWithNuke(state);
    }
    else if (powerup.type === "levelUp") {
        state.pendingLevelUps++;
    }
    else if (powerup.type === "speed") {
        player.speedBoostTimer = randomBuffDuration();
    }
    else if (powerup.type === "immunity") {
        player.immunityTimer = randomBuffDuration();
    }
    else if (powerup.type === "damageReduction") {
        player.damageReductionTimer = randomBuffDuration();
    }
    return [];
}

export function updatePowerups(state) {
    const collected = [];
    const remainingPowerups = [];
    const pickupRadius = state.player.radius + CONFIG.powerups.radius;
    const pickupRadiusSquared = pickupRadius * pickupRadius;
    for (const powerup of state.powerups) {
        const distance = distanceSquared(
            state.player.x,
            state.player.y,
            powerup.x,
            powerup.y
        );
        if (distance > pickupRadiusSquared) {
            remainingPowerups.push(powerup);
            continue;
        }
        collected.push({
            type: powerup.type,
            killedEnemies: applyPowerup(state, powerup),
            notice: POWERUP_NOTICES[powerup.type]
        });
    }
    state.powerups = remainingPowerups;
    return collected;
}

export function dropGem(state, enemy) {
    const gem = {
        x: enemy.x,
        y: enemy.y,
        value: enemy.xp
    };
    state.gems.push(gem);
}

export function updateGems(state, dt) {
    const player = state.player;
    const pickupRangeSquared =
        player.pickupRange * player.pickupRange;
    const collectionRadius =
        player.radius + CONFIG.xp.gemRadius;
    const collectionRadiusSquared =
        collectionRadius * collectionRadius;
    const remainingGems = [];
    let collectedCount = 0;
    for (const gem of state.gems) {
        let distance = distanceSquared(
            player.x,
            player.y,
            gem.x,
            gem.y
        );
        if (distance <= collectionRadiusSquared) {
            player.xp += gem.value;
            collectedCount++;
            continue;
        }
        if (distance <= pickupRangeSquared) {
            const direction = normalizeVector(
                player.x - gem.x,
                player.y - gem.y
            );
            gem.x += direction.x * player.speed * dt;
            gem.y += direction.y * player.speed * dt;
            distance = distanceSquared(
                player.x,
                player.y,
                gem.x,
                gem.y
            );

            if (distance <= collectionRadiusSquared) {
                player.xp += gem.value;
                collectedCount++;
                continue;
            }
        }
        remainingGems.push(gem);
    }
    state.gems = remainingGems;
    return collectedCount;
}
