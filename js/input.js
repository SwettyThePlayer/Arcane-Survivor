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

    function onKeyDown(event) {
        const key = event.key.toLowerCase();
        const direction = KEY_MAP[key];
        if (!direction) {
            return;
        }
        if (key.startsWith("arrow")) {
            event.preventDefault();
        }
        state.keys[direction] = true;
    }

    function onKeyUp(event) {
        const key = event.key.toLowerCase();
        const direction = KEY_MAP[key];
        if (!direction) {
            return;
        }
        state.keys[direction] = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    window.addEventListener("blur", () => {
        resetKeys(state);
    });
}