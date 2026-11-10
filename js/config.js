export const CONFIG = {
    player: {
        emoji: "🧙",
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
            emoji: "🦇",
            hp: 8,
            speed: 130,
            damage: 5,
            radius: 12,
            xp: 1,
            minTime: 0
        },

        skeleton: {
            emoji: "💀",
            hp: 20,
            speed: 80,
            damage: 8,
            radius: 14,
            xp: 2,
            minTime: 0
        },

        ghost: {
            emoji: "👻",
            hp: 35,
            speed: 60,
            damage: 12,
            radius: 16,
            xp: 4,
            minTime: 90
        },

        boss: {
            emoji: "👹",
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
        hpScalePerMinute: 0.25,
        maxEnemies: 250,
        bossEveryMinutes: 3
    },

    xp: {
        gemRadius: 6,
        xpNeeded: (level) => {
            return 5 + level * 5;
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

        pickup: {
            multiplier: 1.30,
            maxStacks: 5
        },

        multishot: {
            increase: 1,
            maxStacks: 4
        }
    }
};
