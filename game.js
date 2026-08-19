// ======================================
// FPS ARENA - 3D CLIENT
// ======================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x101010);

scene.fog = new THREE.Fog(
    0x101010,
    20,
    100
);


// ======================================
// CAMERA
// ======================================

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 2, 5);


// ======================================
// RENDERER
// ======================================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

document
    .getElementById("game")
    .appendChild(renderer.domElement);


// ======================================
// LIGHTING
// ======================================

const ambientLight = new THREE.HemisphereLight(
    0xffffff,
    0x333333,
    2
);

scene.add(ambientLight);

const sun = new THREE.DirectionalLight(
    0xffffff,
    2
);

sun.position.set(10, 20, 10);

scene.add(sun);


// ======================================
// FLOOR
// ======================================

const floorGeometry =
    new THREE.PlaneGeometry(100, 100);

const floorMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x333333
    });

const floor =
    new THREE.Mesh(
        floorGeometry,
        floorMaterial
    );

floor.rotation.x = -Math.PI / 2;

scene.add(floor);


// ======================================
// WALL FUNCTION
// ======================================

function createWall(
    x,
    y,
    z,
    width,
    height,
    depth
) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            depth
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x555555
        });

    const wall =
        new THREE.Mesh(
            geometry,
            material
        );

    wall.position.set(x, y, z);

    scene.add(wall);

    return wall;
}


// ======================================
// ARENA WALLS
// ======================================

createWall(
    0,
    3,
    -25,
    50,
    6,
    1
);

createWall(
    0,
    3,
    25,
    50,
    6,
    1
);

createWall(
    -25,
    3,
    0,
    1,
    6,
    50
);

createWall(
    25,
    3,
    0,
    1,
    6,
    50
);


// ======================================
// COVER
// ======================================

createWall(
    -8,
    2,
    -5,
    8,
    4,
    2
);

createWall(
    8,
    2,
    5,
    8,
    4,
    2
);

createWall(
    0,
    2,
    -12,
    5,
    4,
    2
);


// ======================================
// PLAYER
// ======================================

const player = {

    height: 1.8,

    speed: 5,

    sprintSpeed: 9,

    jumpPower: 7,

    velocityY: 0,

    health: 100,

    ammo: 30,

    maxAmmo: 30,

    score: 0
};


// ======================================
// KEYBOARD
// ======================================

const keys = {};

document.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code === "Space" &&
            camera.position.y <= player.height + 0.05
        ) {

            player.velocityY =
                player.jumpPower;
        }

        if (event.code === "KeyR") {

            reload();
        }
    }
);


document.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;
    }
);


// ======================================
// MOUSE LOOK
// ======================================

let yaw = 0;
let pitch = 0;

document.addEventListener(
    "mousemove",
    event => {

        if (
            document.pointerLockElement !==
            renderer.domElement
        ) return;

        yaw -= event.movementX * 0.002;

        pitch -= event.movementY * 0.002;

        pitch = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, pitch)
        );

        camera.rotation.order = "YXZ";

        camera.rotation.y = yaw;

        camera.rotation.x = pitch;
    }
);


// ======================================
// START GAME
// ======================================

const startButton =
    document.getElementById("start-button");

const startScreen =
    document.getElementById("start-screen");


startButton.addEventListener(
    "click",
    () => {

        startScreen.style.display = "none";

        renderer.domElement.requestPointerLock();

    }
);


// ======================================
// MOVEMENT
// ======================================

function updateMovement(delta) {

    if (
        document.pointerLockElement !==
        renderer.domElement
    ) return;


    let speed = keys["ShiftLeft"] ||
                keys["ShiftRight"]

        ? player.sprintSpeed
        : player.speed;


    const direction =
        new THREE.Vector3();


    if (keys["KeyW"])
        direction.z -= 1;

    if (keys["KeyS"])
        direction.z += 1;

    if (keys["KeyA"])
        direction.x -= 1;

    if (keys["KeyD"])
        direction.x += 1;


    if (direction.length() > 0) {

        direction.normalize();

        direction.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            yaw
        );


        camera.position.x +=
            direction.x * speed * delta;

        camera.position.z +=
            direction.z * speed * delta;
    }


    // Gravity

    player.velocityY -=
        20 * delta;

    camera.position.y +=
        player.velocityY * delta;


    // Ground

    if (
        camera.position.y <
        player.height
    ) {

        camera.position.y =
            player.height;

        player.velocityY = 0;
    }


    // Arena boundaries

    camera.position.x =
        THREE.MathUtils.clamp(
            camera.position.x,
            -23,
            23
        );

    camera.position.z =
        THREE.MathUtils.clamp(
            camera.position.z,
            -23,
            23
        );
}


// ======================================
// SHOOTING
// ======================================

const raycaster =
    new THREE.Raycaster();

const mouse =
    new THREE.Vector2(0, 0);


document.addEventListener(
    "mousedown",
    event => {

        if (
            event.button !== 0 ||
            document.pointerLockElement !==
            renderer.domElement
        ) return;

        shoot();
    }
);


function shoot() {

    if (player.ammo <= 0) {

        reload();

        return;
    }


    player.ammo--;


    raycaster.setFromCamera(
        mouse,
        camera
    );


    const hits =
        raycaster.intersectObjects(
            enemies,
            true
        );


    if (hits.length > 0) {

        const enemy =
            hits[0].object;

        killEnemy(enemy);
    }


    updateHUD();
}


// ======================================
// RELOAD
// ======================================

let reloading = false;

function reload() {

    if (reloading) return;

    if (
        player.ammo ===
        player.maxAmmo
    ) return;


    reloading = true;


    setTimeout(
        () => {

            player.ammo =
                player.maxAmmo;

            reloading = false;

            updateHUD();

        },
        1200
    );
}


// ======================================
// ENEMIES
// ======================================

const enemies = [];


function createEnemy() {

    const geometry =
        new THREE.BoxGeometry(
            1,
            2,
            1
        );


    const material =
        new THREE.MeshStandardMaterial({
            color: 0xff2222
        });


    const enemy =
        new THREE.Mesh(
            geometry,
            material
        );


    enemy.position.set(
        Math.random() * 35 - 17.5,
        1,
        Math.random() * 35 - 17.5
    );


    scene.add(enemy);

    enemies.push(enemy);
}


// Spawn enemies

for (let i = 0; i < 8; i++) {

    createEnemy();
}


// ======================================
// ENEMY AI
// ======================================

function updateEnemies(delta) {

    enemies.forEach(enemy => {

        const direction =
            new THREE.Vector3();

        direction.subVectors(
            camera.position,
            enemy.position
        );

        direction.y = 0;


        if (
            direction.length() > 2
        ) {

            direction.normalize();

            enemy.position.add(
                direction.multiplyScalar(
                    delta * 1.5
                )
            );
        }

    });
}


// ======================================
// KILL ENEMY
// ======================================

function killEnemy(enemy) {

    const index =
        enemies.indexOf(enemy);

    if (index !== -1) {

        enemies.splice(index, 1);
    }


    scene.remove(enemy);


    player.score += 100;


    setTimeout(
        createEnemy,
        1000
    );


    updateHUD();
}


// ======================================
// HUD
// ======================================

function updateHUD() {

    document.querySelector(
        ".health"
    ).textContent =
        `Health: ${Math.round(player.health)}`;


    document.querySelector(
        ".ammo"
    ).textContent =
        `Ammo: ${player.ammo}/${player.maxAmmo}`;


    document.getElementById(
        "score"
    ).textContent =
        `Score: ${player.score}`;
}


// ======================================
// RESIZE
// ======================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
);


// ======================================
// GAME LOOP
// ======================================

const clock =
    new THREE.Clock();


function animate() {

    requestAnimationFrame(
        animate
    );


    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    updateMovement(delta);

    updateEnemies(delta);

    renderer.render(
        scene,
        camera
    );
}


updateHUD();

animate();
