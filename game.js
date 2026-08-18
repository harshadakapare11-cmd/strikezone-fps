const game = document.getElementById("game");
const crosshair = document.getElementById("crosshair");
const scoreText = document.getElementById("score");
const healthText = document.querySelector(".health");
const ammoText = document.querySelector(".ammo");
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");

let score = 0;
let health = 100;
let ammo = 30;
let gameStarted = false;

const enemies = [];

// Start game
startButton?.addEventListener("click", () => {
    gameStarted = true;
    startScreen.style.display = "none";

    document.body.requestPointerLock?.();

    spawnEnemy();
});

// Mouse aiming
document.addEventListener("mousemove", (event) => {
    if (!gameStarted) return;

    crosshair.style.transform =
        `translate(-50%, -50%) rotate(${event.movementX}deg)`;
});

// Shooting
document.addEventListener("click", () => {
    if (!gameStarted) return;
    shoot();
});

function shoot() {
    if (ammo <= 0) {
        reload();
        return;
    }

    ammo--;
    updateHUD();

    // Check if an enemy is near the crosshair
    const target = findTarget();

    if (target) {
        killEnemy(target);
    }
}

// Find enemy hit
function findTarget() {
    if (enemies.length === 0) return null;

    // Simple hit detection for now
    const randomChance = Math.random();

    if (randomChance > 0.55) {
        return enemies[Math.floor(Math.random() * enemies.length)];
    }

    return null;
}

// Spawn enemy
function spawnEnemy() {
    if (!gameStarted) return;

    const enemy = document.createElement("div");

    enemy.className = "enemy";

    enemy.style.position = "absolute";
    enemy.style.width = "50px";
    enemy.style.height = "70px";
    enemy.style.background = "red";
    enemy.style.borderRadius = "8px";

    enemy.style.left =
        Math.random() * (window.innerWidth - 60) + "px";

    enemy.style.top =
        Math.random() * (window.innerHeight - 150) + "px";

    game.appendChild(enemy);
    enemies.push(enemy);

    // Enemy attacks
    const attackTimer = setInterval(() => {
        if (!gameStarted || !enemy.parentElement) {
            clearInterval(attackTimer);
            return;
        }

        takeDamage(5);
    }, 2500);

    // Spawn another enemy
    setTimeout(spawnEnemy, 2000);
}

// Kill enemy
function killEnemy(enemy) {
    enemy.remove();

    const index = enemies.indexOf(enemy);

    if (index !== -1) {
        enemies.splice(index, 1);
    }

    score += 100;
    scoreText.textContent = `Score: ${score}`;
}

// Player takes damage
function takeDamage(amount) {
    health -= amount;

    if (health < 0) {
        health = 0;
    }

    updateHUD();

    if (health === 0) {
        gameOver();
    }
}

// Reload
function reload() {
    ammo = 30;
    updateHUD();
}

// Update HUD
function updateHUD() {
    if (healthText) {
        healthText.textContent = `Health: ${health}`;
    }

    if (ammoText) {
        ammoText.textContent = `Ammo: ${ammo}/30`;
    }

    if (scoreText) {
        scoreText.textContent = `Score: ${score}`;
    }
}

// Game over
function gameOver() {
    gameStarted = false;

    document.exitPointerLock?.();

    startScreen.style.display = "flex";

    const title = startScreen.querySelector("h1");

    if (title) {
        title.textContent = `GAME OVER - ${score}`;
    }
}

// Keyboard reload
document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r") {
        reload();
    }
});

// Initial HUD
updateHUD();
