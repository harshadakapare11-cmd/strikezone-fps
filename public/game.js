// ==========================================
// STRIKEZONE - MULTIPLAYER FPS
// PC + MOBILE
// ==========================================

const scene = new THREE.Scene();

scene.add(
    new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    )
);
scene.background = new THREE.Color(0x101010);

scene.fog = new THREE.Fog(
    0x101010,
    20,
    100
);


// ==========================================
// CAMERA
// ==========================================

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 1.6, 0);

camera.position.z = 8;
// ==========================================
// RENDERER
// ==========================================

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


// ==========================================
// LIGHTING
// ==========================================

const ambient = new THREE.HemisphereLight(
    0xffffff,
    0x333333,
    2
);

scene.add(ambient);

const sun = new THREE.DirectionalLight(
    0xffffff,
    2
);

sun.position.set(20, 30, 10);

scene.add(sun);


// ==========================================
// FLOOR
// ==========================================

const floorGeometry =
    new THREE.PlaneGeometry(100, 100);

const floorMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x303030
    });

const floor =
    new THREE.Mesh(
        floorGeometry,
        floorMaterial
    );

floor.rotation.x = -Math.PI / 2;

scene.add(floor);


// ==========================================
// ARENA WALLS
// ==========================================

function wall(x, y, z, w, h, d) {

    const geometry =
        new THREE.BoxGeometry(w, h, d);

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x555555
        });

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(x, y, z);

    scene.add(mesh);
}

wall(0, 3, -25, 50, 6, 1);
wall(0, 3, 25, 50, 6, 1);
wall(-25, 3, 0, 1, 6, 50);
wall(25, 3, 0, 1, 6, 50);

wall(-8, 2, -6, 7, 4, 2);
wall(8, 2, 6, 7, 4, 2);
wall(0, 2, -13, 6, 4, 2);
wall(0, 2, 13, 6, 4, 2);


// ==========================================
// MULTIPLAYER
// ==========================================

let socket;
let myId = null;

const remotePlayers = new Map();

const socketProtocol =
    location.protocol === "https:"
        ? "wss:"
        : "ws:";

const socketURL =
    `${socketProtocol}//${location.host}`;


function connectToServer() {

    console.log("Connecting to:", socketURL);

    socket = new WebSocket(socketURL);

    socket.onopen = () => {
        console.log(
            "🔥 CONNECTED TO STRIKEZONE SERVER"
        );
    };

    socket.onclose = () => {

        console.log(
            "❌ Disconnected from server"
        );

        setTimeout(
            connectToServer,
            2000
        );
    };

    socket.onerror = error => {
        console.log(
            "WebSocket error:",
            error
        );
    };

    socket.onmessage = event => {

        try {

            const data =
                JSON.parse(event.data);

            handleServerMessage(data);

        } catch (error) {

            console.log(
                "Invalid server message",
                error
            );
        }
    };
}

connectToServer();


// ==========================================
// SERVER MESSAGES
// ==========================================

function handleServerMessage(data) {

    if (data.type === "welcome") {

        myId = data.id;

        if (data.players) {

            data.players.forEach(
                createOrUpdatePlayer
            );
        }

        return;
    }

    if (data.type === "state") {

        if (!data.players) return;

        data.players.forEach(
            createOrUpdatePlayer
        );

        return;
    }

    if (data.type === "shot") {

        if (data.id !== myId) {

            showRemoteShot(data.id);
        }

        return;
    }

    if (data.type === "kill") {

        if (data.killer === myId) {

            showKillMessage();
        }

        return;
    }
}


// ==========================================
// PLAYERS
// ==========================================

function createOrUpdatePlayer(player) {

    if (player.id === myId) {

        updateLocalPlayer(player);

        return;
    }

    let mesh =
        remotePlayers.get(player.id);

    if (!mesh) {

        mesh =
            createPlayerMesh(
                player.team
            );

        mesh.userData.playerId =
            player.id;

        scene.add(mesh);

        remotePlayers.set(
            player.id,
            mesh
        );
    }

    mesh.position.set(
        player.x,
        1,
        player.z
    );

    mesh.userData.health =
        player.health;
}


function createPlayerMesh(team) {

    const group =
        new THREE.Group();

    const color =
        team === "blue"
            ? 0x2277ff
            : 0xff3333;

    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.8,
                1.4,
                0.5
            ),
            new THREE.MeshStandardMaterial({
                color: color
            })
        );

    group.add(body);

    const head =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.3,
                16,
                16
            ),
            new THREE.MeshStandardMaterial({
                color: 0xffc7a0
            })
        );

    head.position.y = 1;

    group.add(head);

    return group;
}


// ==========================================
// LOCAL PLAYER
// ==========================================

function updateLocalPlayer(player) {

    camera.position.x =
        player.x;

    camera.position.y =
        player.y;

    camera.position.z =
        player.z;

    const health =
        document.querySelector(".health");

    if (health) {

        health.textContent =
            `Health: ${Math.round(player.health)}`;
    }

    const score =
        document.getElementById("score");

    if (score) {

        score.textContent =
            `Kills: ${player.kills}`;
    }
}


// ==========================================
// PC MOVEMENT
// ==========================================

const keys = {};

document.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;
    }
);

document.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;
    }
);


// ==========================================
// MOBILE INPUT
// ==========================================

let mobileForward = 0;
let mobileRight = 0;

let mobileSprint = false;

let mobileLookActive = false;

let lastTouchX = 0;
let lastTouchY = 0;


// ==========================================
// CAMERA ROTATION
// ==========================================

let yaw = 0;
let pitch = 0;

let verticalVelocity = 0;
let onGround = true;


// ==========================================
// MOVEMENT
// ==========================================

function updateMovement(delta) {

    let forward = 0;
    let right = 0;

    // PC

    if (keys["KeyW"])
        forward += 1;

    if (keys["KeyS"])
        forward -= 1;

    if (keys["KeyD"])
        right += 1;

    if (keys["KeyA"])
        right -= 1;


    // MOBILE

    forward += mobileForward;
    right += mobileRight;


    const length =
        Math.hypot(
            forward,
            right
        );

    if (length > 1) {

        forward /= length;
        right /= length;
    }


    let speed = 5;


    if (
        keys["ShiftLeft"] ||
        keys["ShiftRight"] ||
        mobileSprint
    ) {

        speed = 9;
    }


    const forwardX =
        -Math.sin(yaw);

    const forwardZ =
        -Math.cos(yaw);

    const rightX =
        Math.cos(yaw);

    const rightZ =
        -Math.sin(yaw);


    camera.position.x +=
        (
            forwardX * forward +
            rightX * right
        ) * speed * delta;


    camera.position.z +=
        (
            forwardZ * forward +
            rightZ * right
        ) * speed * delta;


    verticalVelocity -=
        20 * delta;

    camera.position.y +=
        verticalVelocity * delta;


    if (
        camera.position.y <= 1.6
    ) {

        camera.position.y = 1.6;

        verticalVelocity = 0;

        onGround = true;
    }


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


    sendMovement();
}


// ==========================================
// JUMP
// ==========================================

function jump() {

    if (!onGround) return;

    verticalVelocity = 7;

    onGround = false;
}


// ==========================================
// SEND MOVEMENT
// ==========================================

let lastMovementSend = 0;

function sendMovement() {

    if (!socket) return;

    if (
        socket.readyState !==
        WebSocket.OPEN
    ) return;

    const now =
        performance.now();

    if (
        now - lastMovementSend < 50
    ) return;

    lastMovementSend = now;

    socket.send(
        JSON.stringify({

            type: "move",

            x: camera.position.x,

            y: camera.position.y,

            z: camera.position.z
        })
    );
}


// ==========================================
// PC MOUSE LOOK
// ==========================================

document.addEventListener(
    "mousemove",
    event => {

        if (
            document.pointerLockElement !==
            renderer.domElement
        ) return;

        yaw -=
            event.movementX * 0.002;

        pitch -=
            event.movementY * 0.002;

        pitch =
            Math.max(
                -1.5,
                Math.min(
                    1.5,
                    pitch
                )
            );

        camera.rotation.order =
            "YXZ";

        camera.rotation.y =
            yaw;

        camera.rotation.x =
            pitch;
    }
);


// ==========================================
// MOBILE LOOK
// ==========================================

function mobileLookStart(event) {

    if (event.touches.length !== 1)
        return;

    mobileLookActive = true;

    lastTouchX =
        event.touches[0].clientX;

    lastTouchY =
        event.touches[0].clientY;
}


function mobileLookMove(event) {

    if (!mobileLookActive)
        return;

    if (event.touches.length !== 1)
        return;

    const touch =
        event.touches[0];

    const dx =
        touch.clientX - lastTouchX;

    const dy =
        touch.clientY - lastTouchY;

    lastTouchX =
        touch.clientX;

    lastTouchY =
        touch.clientY;

    yaw -= dx * 0.006;

    pitch -= dy * 0.006;

    pitch =
        Math.max(
            -1.5,
            Math.min(
                1.5,
                pitch
            )
        );

    camera.rotation.order =
        "YXZ";

    camera.rotation.y =
        yaw;

    camera.rotation.x =
        pitch;
}


function mobileLookEnd() {

    mobileLookActive = false;
}


// ==========================================
// MOBILE CONTROLS UI
// ==========================================

function createMobileControls() {

    const controls =
        document.createElement("div");

    controls.id =
        "mobile-controls";


    const lookArea =
        document.createElement("div");

    lookArea.id =
        "look-area";

    controls.appendChild(
        lookArea
    );


    const joystick =
        document.createElement("div");

    joystick.id =
        "joystick";


    const knob =
        document.createElement("div");

    knob.id =
        "joystick-knob";

    joystick.appendChild(
        knob
    );

    controls.appendChild(
        joystick
    );


    function button(
        id,
        text
    ) {

        const btn =
            document.createElement("button");

        btn.id = id;

        btn.className =
            "mobile-button";

        btn.textContent =
            text;

        controls.appendChild(
            btn
        );

        return btn;
    }


    const shootButton =
        button(
            "shoot-button",
            "SHOOT"
        );


    const jumpButton =
        button(
            "jump-button",
            "JUMP"
        );


    const sprintButton =
        button(
            "sprint-button",
            "RUN"
        );


    document.body.appendChild(
        controls
    );


    //
// ==========================================
// START GAME BUTTON
// ==========================================

const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");

function startGame() {
    if (!startScreen) return;

    startScreen.style.display = "none";

    // PC mouse control
    if (
        !("ontouchstart" in window) &&
        navigator.maxTouchPoints === 0
    ) {
        if (renderer.domElement.requestPointerLock) {
            renderer.domElement.requestPointerLock();
        }
    }

    console.log("🔥 STRIKEZONE STARTED");
}

if (startButton) {
    startButton.addEventListener("click", startGame);

    startButton.addEventListener(
        "touchend",
        function(event) {
            event.preventDefault();
            startGame();
        },
        { passive: false }
    );
}
