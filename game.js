const game = document.getElementById("game");
const crosshair = document.getElementById("crosshair");
const scoreText = document.getElementById("score");
const healthText = document.querySelector(".health");
const ammoText = document.querySelector(".ammo");
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");

let gameStarted = false;

let player = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    speed: 4,
    sprintSpeed: 7,
    health: 100,
    ammo: 30,
    maxAmmo: 30,
    score: 0
};

let keys = {};
let enemies = [];
let mouseX = 0;
let mouseY = 0;
let lastShot = 0;
let reloadTime = false;

// =========================
// START GAME
// =========================

startButton?.addEventListener("click", () => {
    gameStarted = true;
    startScreen.style.display = "none";

    document.body.requestPointerLock?.();

    player.health = 100;
    player.ammo = 30;
    player.score = 0;

    enemies.forEach(enemy => enemy.remove());
    enemies = [];

    updateHUD();

    for (let i = 0; i < 5; i++) {
        spawnEnemy();
    }
});

// =========================
// KEYBOARD
// =========================

document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    // Reload
    if (e.key.toLowerCase() === "r") {
        reload();
    }
});

document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

// =========================
// MOUSE LOOK
// =========================

document.addEventListener("mousemove", e => {
    if (!gameStarted) return;
    if (document.pointerLockElement !== document.body) return;

    mouseX += e.movementX;
    mouseY += e.movementY;

    // Keep the mouse movement from becoming ridiculous
    mouseX = Math.max(-500, Math.min(500, mouseX));
    mouseY = Math.max(-300, Math.min(300, mouseY));

    updateCamera();
});

function updateCamera() {
    if (!crosshair) return;

    crosshair.style.transform =
        `translate(-50%, -50%)`;
}

// =========================
// PLAYER MOVEMENT
// =========================

function updatePlayer() {
    if (!gameStarted) return;

    let speed = keys["shift"]
        ? player.sprintSpeed
        : player.speed;

    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy -= speed;
    if (keys["s"]) dy += speed;
    if (keys["a"]) dx -= speed;
    if (keys["d"]) dx += speed;

    // Diagonal movement normalization
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    player.x += dx;
    player.y += dy;

    // Keep player inside the map
    player.x = Math.max(0, Math.min(window.innerWidth, player.x));
    player.y = Math.max(0, Math.min(window.innerHeight, player.y));

    // Move the camera/world slightly
    game.style.transform =
        `translate(${-dx * 0.25}px, ${-dy * 0.25}px)`;

    updateEnemies();
}

// =========================
// SHOOTING
// =========================

document.addEventListener("mousedown", e => {
    if (!gameStarted) return;

    if (e.button === 0) {
        shoot();
    }
});

function shoot() {
    if (reloadTime) return;

    const now = Date.now();

    // Fire rate
    if (now - lastShot < 150) return;

    lastShot = now;

    if (player.ammo <= 0) {
        reload();
        return;
    }

    player.ammo--;

    createMuzzleFlash();

    // Find closest enemy to crosshair
    const target = findTarget();

    if (target) {
        killEnemy(target);
    }

    updateHUD();
}

// =========================
// TARGET DETECTION
// =========================

function findTarget() {
    if (enemies.length === 0) return null;

    let bestTarget = null;
    let bestDistance = Infinity;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    enemies.forEach(enemy => {
        const rect = enemy.getBoundingClientRect();

        const enemyX = rect.left + rect.width / 2;
        const enemyY = rect.top + rect.height / 2;

        const distance = Math.hypot(
            enemyX - centerX,
            enemyY - centerY
        );

        // Enemy must be reasonably close to crosshair
        if (distance < 100 && distance < bestDistance) {
            bestDistance = distance;
            bestTarget = enemy;
        }
    });

    return bestTarget;
}

// =========================
// MUZZLE FLASH
// =========================

function createMuzzleFlash() {
    const flash = document.createElement("div");

    flash.style.position = "fixed";
    flash.style.left = "50%";
    flash.style.top = "50%";
    flash.style.width = "40px";
    flash.style.height = "40px";
    flash.style.transform = "translate(-50%, -50%)";
    flash.style.background = "white";
    flash.style.borderRadius = "50%";
    flash.style.opacity = "0.8";
    flash.style.zIndex = "999";

    document.body.appendChild(flash);

    setTimeout(() => {
        flash.remove();
    }, 50);
}

// =========================
// ENEMIES
// =========================

function spawnEnemy() {
    const enemy = document.createElement("div");

    enemy.className = "enemy";

    enemy.style.position = "absolute";
    enemy.style.width = "50px";
    enemy.style.height = "70px";
    enemy.style.background = "#e00000";
    enemy.style.borderRadius = "8px";
    enemy.style.boxShadow = "0 0 15px rgba(255,0,0,.5)";

    enemy.style.left =
        Math.random() * (window.innerWidth - 80) + "px";

    enemy.style.top =
        Math.random() * (window.innerHeight - 150) + "px";

    game.appendChild(enemy);
    enemies.push(enemy);
}

// =========================
// ENEMY AI
// =========================

function updateEnemies() {
    enemies.forEach(enemy => {
        const rect = enemy.getBoundingClientRect();

        const enemyX = rect.left + rect.width / 2;
        const enemyY = rect.top + rect.height / 2;

        const dx = window.innerWidth / 2 - enemyX;
        const dy = window.innerHeight / 2 - enemyY;

        const distance = Math.hypot(dx, dy);

        // Enemy slowly moves toward player
        if (distance > 100) {
            const speed = 0.4;

            enemy.style.left =
                rect.left + (dx / distance) * speed + "px";

            enemy.style.top =
                rect.top + (dy / distance) * speed + "px";
        }

        // Enemy attacks when close
        if (distance < 100) {
            takeDamage(0.15);
        }
    });
}

// =========================
// KILL ENEMY
// =========================

function killEnemy(enemy) {
    enemy.remove();

    enemies = enemies.filter(e => e !== enemy);

    player.score += 100;

    updateHUD();

    // Spawn replacement
    setTimeout(() => {
        if (gameStarted) {
            spawnEnemy();
        }
    }, 1000);
}

// =========================
// DAMAGE
// =========================

function takeDamage(amount) {
    player.health -= amount;

    if (player.health <= 0) {
        player.health = 0;
        gameOver();
    }

    updateHUD();
}

// =========================
// RELOAD
// =========================

function reload() {
    if (reloadTime) return;
    if (player.ammo === player.maxAmmo) return;

    reloadTime = true;

    if (ammoText) {
        ammoText.textContent = "RELOADING...";
    }

    setTimeout(() => {
        player.ammo = player.maxAmmo;
        reloadTime = false;

        updateHUD();
    }, 1200);
}

// =========================
// HUD
// =========================

function updateHUD() {
    if (healthText) {
        healthText.textContent =
            `Health: ${Math.round(player.health)}`;
    }

    if (ammoText) {
        ammoText.textContent =
            `Ammo: ${player.ammo}/${player.maxAmmo}`;
    }

    if (scoreText) {
        scoreText.textContent =
            `Score: ${player.score}`;
    }
}

// =========================
// GAME OVER
// =========================

function gameOver() {
    gameStarted = false;

    document.exitPointerLock?.();

    startScreen.style.display = "flex";

    const title = startScreen.querySelector("h1");

    if (title) {
        title.textContent =
            `GAME OVER — ${player.score}`;
    }
}

// =========================
// GAME LOOP
// =========================

function gameLoop() {
    updatePlayer();
    requestAnimationFrame(gameLoop);
}

gameLoop();
updateHUD();
