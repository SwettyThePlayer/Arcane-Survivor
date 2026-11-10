import { CONFIG } from "./config.js";
import { normalizeVector, distanceSquared } from "./utils.js";

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
    for (const gem of state.gems) {
        let distance = distanceSquared(
            player.x,
            player.y,
            gem.x,
            gem.y
        );
        if (distance <= collectionRadiusSquared) {
            player.xp += gem.value;
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
                continue;
            }
        }
        remainingGems.push(gem);
    }
    state.gems = remainingGems;
}
