import { CONFIG } from "./config.js";
import { normalizeVector, randomRange } from "./utils.js";

export function createEnemy(type, x, y, time) {
    const enemyConfig = CONFIG.enemies[type];

    if (!enemyConfig) {
        return null;
    }
    const hpMultiplier = 1 +
        (time / 60) * CONFIG.spawn.hpScalePerMinute;

    const maxHp = enemyConfig.hp * hpMultiplier;

    return {
        x,
        y,
        vx: 0,
        vy: 0,
        type,
        radius: enemyConfig.radius,
        hp: maxHp,
        maxHp,
        speed: enemyConfig.speed,
        damage: enemyConfig.damage,
        xp: enemyConfig.xp,
        hitFlash: 0,
        orbHitTimer: 0
    };
}

function spawnEnemy(state, canvas) {
    const availableTypes = Object.entries(CONFIG.enemies)
        .filter(([type, config]) => {
            return type !== "boss" && config.minTime <= state.time;
        });
    if (availableTypes.length === 0) {
        return;
    }
    const randomIndex = Math.floor(
        Math.random() * availableTypes.length
    );

    const selectedType = availableTypes[randomIndex][0];
    const edge = Math.floor(Math.random() * 4);
    let x;
    let y;
    const radius = CONFIG.enemies[selectedType].radius;
    if (edge === 0) {
        x = randomRange(0, canvas.width);
        y = -radius;
    }
    else if (edge === 1) {
        x = randomRange(0, canvas.width);
        y = canvas.height + radius;
    }
    else if (edge === 2) {
        x = -radius;
        y = randomRange(0, canvas.height);
    }
    else {
        x = canvas.width + radius;
        y = randomRange(0, canvas.height);
    }
    const enemy = createEnemy(
        selectedType,
        x,
        y,
        state.time
    );

    state.enemies.push(enemy);
}

function spawnBoss(state, canvas) {
    const radius = CONFIG.enemies.boss.radius;
    const edge = Math.floor(Math.random() * 4);
    let x;
    let y;
    if (edge === 0) {
        x = randomRange(0, canvas.width);
        y = -radius;
    }
    else if (edge === 1) {
        x = randomRange(0, canvas.width);
        y = canvas.height + radius;
    }
    else if (edge === 2) {
        x = -radius;
        y = randomRange(0, canvas.height);
    }
    else {
        x = canvas.width + radius;
        y = randomRange(0, canvas.height);
    }
    state.enemies.push(createEnemy("boss", x, y, state.time));
}

export function updateBossSpawning(state, canvas) {
    const warningDuration = CONFIG.spawn.bossWarningDuration;
    if (state.time >= state.nextBossTime) {
        spawnBoss(state, canvas);
        state.nextBossTime += CONFIG.spawn.bossEveryMinutes * 60;
        state.bossWarningSeconds = 0;
        return;
    }
    const warningStartsAt = state.nextBossTime - warningDuration;
    state.bossWarningSeconds = state.time >= warningStartsAt
        ? state.nextBossTime - state.time
        : 0;
}

export function updateEnemies(state, dt, canvas) {
    updateBossSpawning(state, canvas);
    state.spawnTimer -= dt;

    if (state.spawnTimer <= 0) {
        const spawnInterval = Math.max(
            CONFIG.spawn.minInterval,
            CONFIG.spawn.startInterval -
                state.time * CONFIG.spawn.intervalDecayPerSec
        );
        if (state.enemies.length < CONFIG.spawn.maxEnemies) {
            spawnEnemy(state, canvas);
        }
        state.spawnTimer = spawnInterval;
    }

    for (const enemy of state.enemies) {

        const direction = normalizeVector(
            state.player.x - enemy.x,
            state.player.y - enemy.y
        );

        enemy.vx = direction.x * enemy.speed;
        enemy.vy = direction.y * enemy.speed;

        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
    }
}