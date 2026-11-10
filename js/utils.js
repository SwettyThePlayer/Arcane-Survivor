export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function normalizeVector(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) {
        return { x: 0, y: 0 };
    }
    return {
        x: x / length,
        y: y / length
    };
}

export function distanceSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

export function circlesCollide(a, b) {
    const distance = distanceSquared(a.x, a.y, b.x, b.y);
    const combinedRadius = a.radius + b.radius;
    return distance < combinedRadius * combinedRadius;
}

export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}