import { circlesCollide } from "./utils.js";
import { CONFIG } from "./config.js";

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

export function updateProjectiles(state, dt) {
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