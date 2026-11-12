const KEY_MAP = {
    w: "up",
    arrowup: "up",

    s: "down",
    arrowdown: "down",

    a: "left",
    arrowleft: "left",

    d: "right",
    arrowright: "right"
};

function resetKeys(state) {
    state.keys.up = false;
    state.keys.down = false;
    state.keys.left = false;
    state.keys.right = false;
}

export function setupInput(state) {
    state.keys = {
        up: false,
        down: false,
        left: false,
        right: false
    };
    const activePointers = new Map();
    const keyboardDirections = new Set();
    const touchButtons = document.querySelectorAll(
        "[data-move-direction]"
    );

    function updateDirection(direction) {
        const pointerHeld = [...activePointers.values()].includes(direction);
        state.keys[direction] =
            keyboardDirections.has(direction) || pointerHeld;
    }

    function releasePointer(pointerId) {
        const direction = activePointers.get(pointerId);
        if (!direction) {
            return;
        }
        activePointers.delete(pointerId);
        updateDirection(direction);
    }

    function onTouchButtonDown(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const direction = button.dataset.moveDirection;
        activePointers.set(event.pointerId, direction);
        updateDirection(direction);
        if (button.setPointerCapture) {
            button.setPointerCapture(event.pointerId);
        }
    }

    function onTouchButtonUp(event) {
        releasePointer(event.pointerId);
    }

    for (const button of touchButtons) {
        button.addEventListener("pointerdown", onTouchButtonDown);
        button.addEventListener("pointerup", onTouchButtonUp);
        button.addEventListener("pointercancel", onTouchButtonUp);
        button.addEventListener("lostpointercapture", onTouchButtonUp);
    }

    function onKeyDown(event) {
        const key = event.key.toLowerCase();
        const direction = KEY_MAP[key];
        if (!direction) {
            return;
        }
        if (key.startsWith("arrow")) {
            event.preventDefault();
        }
        keyboardDirections.add(direction);
        updateDirection(direction);
    }

    function onKeyUp(event) {
        const key = event.key.toLowerCase();
        const direction = KEY_MAP[key];
        if (!direction) {
            return;
        }
        keyboardDirections.delete(direction);
        updateDirection(direction);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    window.addEventListener("blur", () => {
        activePointers.clear();
        keyboardDirections.clear();
        resetKeys(state);
    });
}