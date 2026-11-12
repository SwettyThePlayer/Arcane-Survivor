export const CONFIG = {
    player: {
        radius: 16,
        speed: 200,
        maxHp: 100,
        pickupRange: 60,
        invulnTime: 0.5
    },

    weapon: {
        damage: 10,
        fireRate: 1.5,
        projectileSpeed: 500,
        projectileRadius: 6,
        lifetime: 1.5,
        projectileCount: 1,
        spreadAngle: 0.35,
        pierce: 0
    },

    enemies: {
        bat: {
            hp: 8,
            speed: 130,
            damage: 5,
            radius: 12,
            xp: 1,
            minTime: 0
        },

        skeleton: {
            hp: 20,
            speed: 80,
            damage: 8,
            radius: 14,
            xp: 2,
            minTime: 0
        },

        ghost: {
            hp: 35,
            speed: 60,
            damage: 12,
            radius: 16,
            xp: 4,
            minTime: 90
        },

        boss: {
            hp: 600,
            speed: 55,
            damage: 20,
            radius: 34,
            xp: 40,
            minTime: 180
        }
    },

    spawn: {
        startInterval: 1.2,
        minInterval: 0.25,
        intervalDecayPerSec: 0.004,
        hpScalePerMinute: 0.3,
        maxEnemies: 250,
        bossEveryMinutes: 3,
        bossWarningDuration: 10,
        narrowArenaDimension: 640,
        narrowArenaIntervalMultiplier: 1.25
    },

    xp: {
        gemRadius: 6,
        xpNeeded: (level) => {
            return 5 + level * 5;
        }
    },
    powerups: {
        dropChance: 0.03,
        bossReward: "levelUp",
        weights: {
            heal: 30,
            nuke: 5,
            levelUp: 15,
            speed: 20,
            immunity: 15,
            damageReduction: 15
        },
        radius: 11,
        healPercent: 0.30,
        nukeRadius: 900,
        nukeBossDamagePercent: 0.50,
        speedMultiplier: 1.5,
        damageReductionMultiplier: 0.5,
        buffDurationMin: 10,
        buffDurationMax: 15,
        noticeDuration: 0.8
    },
    effects: {
        hitFlashDuration: 0.12,
        damageTextDuration: 0.55,
        damageTextRiseSpeed: 35,
        playerDamageFlashDuration: 0.2,
        lowHealthThreshold: 0.25,
        hitParticleCount: 3,
        killParticleCount: 12,
        particleSpeedMin: 35,
        particleSpeedMax: 115,
        particleLife: 0.42,
        particleRadius: 2.5,
        particleGravity: 24,
        screenShakeDuration: 0.18,
        screenShakeIntensity: 4
    },
    audio: {
        volume: 0.08,
        sounds: {
            shoot: { frequency: 660, duration: 0.06, wave: "triangle" },
            hit: { frequency: 210, duration: 0.08, wave: "square" },
            pickup: { frequency: 880, duration: 0.12, wave: "sine" },
            levelUp: { frequency: 1040, duration: 0.24, wave: "sine" },
            death: { frequency: 140, duration: 0.42, wave: "triangle" }
        },
        cooldowns: {
            shoot: 0.05,
            hit: 0.08,
            pickup: 0.08,
            levelUp: 0.2,
            death: 0.5
        }
    },
    upgrades: {
        choicesPerLevel: 3,
        fallbackHealPercent: 0.30,

        damage: {
            multiplier: 1.20,
            maxStacks: 8
        },

        fireRate: {
            multiplier: 1.15,
            maxStacks: 8
        },

        speed: {
            multiplier: 1.10,
            maxStacks: 5
        },

        maxHp: {
            increase: 20,
            heal: 20,
            maxStacks: 8
        },

        regen: {
            hpPerSecond: 0.5,
            maxStacks: 5
        },

        pickup: {
            multiplier: 1.30,
            maxStacks: 5
        },

        multishot: {
            increase: 1,
            maxStacks: 4
        },

        pierce: {
            increase: 1,
            maxStacks: 3
        },

        projSpeed: {
            multiplier: 1.15,
            maxStacks: 4
        },

        orbs: {
            damage: 10,
            hitInterval: 0.6,
            radius: 6,
            orbitRadius: 52,
            orbitSpeed: 3,
            maxStacks: 4
        },

        pulse: {
            damagePerStack: 25,
            radius: 110,
            radiusPerStack: 15,
            interval: 8,
            effectDuration: 0.35,
            maxStacks: 4
        }
    }
};
