import { CONFIG } from "./config.js";

export const UPGRADES = [
    {
        id: "damage",
        name: "Arcane Power",
        icon: "💥",
        description: `Increase damage by ${
            Math.round(
                (CONFIG.upgrades.damage.multiplier - 1) * 100
            )
        }%.`,
        maxStacks: CONFIG.upgrades.damage.maxStacks,
        apply(player) {
            player.stats.damage *=
                CONFIG.upgrades.damage.multiplier;
        }
    },
    {
        id: "fireRate",
        name: "Rapid Casting",
        icon: "⚡",
        description: `Increase fire rate by ${
            Math.round(
                (CONFIG.upgrades.fireRate.multiplier - 1) * 100
            )
        }%.`,
        maxStacks: CONFIG.upgrades.fireRate.maxStacks,
        apply(player) {
            player.stats.fireRate *=
                CONFIG.upgrades.fireRate.multiplier;
        }
    },
    {
        id: "speed",
        name: "Swift Steps",
        icon: "💨",
        description: `Increase movement speed by ${
            Math.round(
                (CONFIG.upgrades.speed.multiplier - 1) * 100
            )
        }%.`,
        maxStacks: CONFIG.upgrades.speed.maxStacks,
        apply(player) {
            player.speed *= CONFIG.upgrades.speed.multiplier;
        }
    },
    {
        id: "maxHp",
        name: "Vitality",
        icon: "❤️",
        description: `Increase maximum HP by ${
            CONFIG.upgrades.maxHp.increase
        } and heal ${
            CONFIG.upgrades.maxHp.heal
        } HP.`,
        maxStacks: CONFIG.upgrades.maxHp.maxStacks,
        apply(player) {
            player.maxHp += CONFIG.upgrades.maxHp.increase;
            player.hp = Math.min(
                player.maxHp,
                player.hp + CONFIG.upgrades.maxHp.heal
            );
        }
    },
    {
        id: "pickup",
        name: "Magnetic Aura",
        icon: "🧲",
        description: `Increase pickup range by ${
            Math.round(
                (CONFIG.upgrades.pickup.multiplier - 1) * 100
            )
        }%.`,
        maxStacks: CONFIG.upgrades.pickup.maxStacks,
        apply(player) {
            player.pickupRange *=
                CONFIG.upgrades.pickup.multiplier;
        }
    },
    {
        id: "multishot",
        name: "Double Trouble",
        icon: "🔮",
        description: `Fire ${
            CONFIG.upgrades.multishot.increase
        } additional projectile per shot.`,
        maxStacks: CONFIG.upgrades.multishot.maxStacks,
        apply(player) {
            player.stats.projectileCount +=
                CONFIG.upgrades.multishot.increase;
        }
    }
];

export function getAvailableUpgrades(state) {
    return UPGRADES.filter(upgrade => {
        const currentStacks =
            state.upgradeStacks[upgrade.id] || 0;
        return currentStacks < upgrade.maxStacks;
    });
}

export function getRandomUpgrades(state) {
    const available = getAvailableUpgrades(state);
    const selected = [];
    const choiceCount = Math.min(
        CONFIG.upgrades.choicesPerLevel,
        available.length
    );
    for (let i = 0; i < choiceCount; i++) {
        const randomIndex = Math.floor(
            Math.random() * available.length
        );
        const upgrade = available.splice(randomIndex, 1)[0];
        selected.push(upgrade);
    }
    return selected;
}

export function applyUpgrade(state, selectedUpgrade) {
    const upgrade = UPGRADES.find(item => {
        return item.id === selectedUpgrade.id;
    });
    if (!upgrade) {
        return false;
    }
    const currentStacks =
        state.upgradeStacks[upgrade.id] || 0;
    if (currentStacks >= upgrade.maxStacks) {
        return false;
    }
    upgrade.apply(state.player);
    state.upgradeStacks[upgrade.id] = currentStacks + 1;
    return true;
}

export function healPlayer(state) {
    const healAmount =
        state.player.maxHp *
        CONFIG.upgrades.fallbackHealPercent;
    state.player.hp = Math.min(
        state.player.maxHp,
        state.player.hp + healAmount
    );
}