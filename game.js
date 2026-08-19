// ==========================================
// STRIKEZONE - MULTIPLAYER FPS CLIENT
// Works with your existing server.js
// ==========================================

const scene = new THREE.Scene();

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


// Outer walls

wall(0, 3, -25, 50, 6, 1);
wall(0, 3, 25, 50, 6, 1);

wall(-25, 3, 0, 1, 6, 50);
wall(25, 3, 0, 1, 6, 50);


// Cover

wall(-8, 2, -6, 7, 4, 2);
wall(8, 2, 6, 7, 4, 2);
wall(0, 2, -13, 6, 4, 2);
wall(0, 2, 13, 6, 4, 2);


// ==========================================
// MULTIPLAYER CONNECTION
// ==========================================

let socket;

let myId = null;

const remotePlayers = new Map();


// Automatically use the same server
// that served the webpage.

const socketProtocol =
    location.protocol === "https:"
        ? "wss:"
        : "ws:";

const socketURL =
    `${socketProtocol}//${location.host}`;


function connectToServer() {

    console.log(
        "Connecting to:",
        socketURL
    );

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

    // -------------------------------
    // WELCOME
    // -------------------------------

    if (data.type === "welcome") {

        myId = data.id;

        console.log(
            "YOUR PLAYER ID:",
            myId
        );

        // Add players already online

        if (data.players) {

            data.players.forEach(
                createOrUpdatePlayer
            );
        }

        return;
    }


    // -------------------------------
    // STATE
    // -------------------------------

    if (data.type === "state") {

        if (!data.players) return;

        data.players.forEach(
            createOrUpdatePlayer
        );

        return;
    }


    // -------------------------------
    // SHOOT
    // -------------------------------

    if (data.type === "shot") {

        if (data.id !== myId) {

            showRemoteShot(data.id);
        }

        return;
    }


    // -------------------------------
    // KILL
    // -------------------------------

    if (data.type === "kill") {

        console.log(
            "KILL:",
            data.killer,
            "→",
            data.victim
        );

        if (data.killer === myId) {

            showKillMessage();
        }

        return;
    }
}


// ==========================================
// CREATE PLAYER
// ==========================================

function createOrUpdatePlayer(player) {

    // Don't create ourselves
    if (player.id === myId) {

        updateLocalPlayer(player);

        return;
    }


    let mesh =
        remotePlayers.get(player.id);


    // Create new player

    if (!mesh) {

        mesh = createPlayerMesh(
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


    // Update position

    mesh.position.set(
        player.x,
        1,
        player.z
    );


    // Health

    mesh.userData.health =
        player.health;

}


// ==========================================
// PLAYER MODEL
// ==========================================

function createPlayerMesh(team) {

    const group =
        new THREE.Group();


    const color =
        team === "blue"
            ? 0x2277ff
            : 0xff3333;


    // Body

    const bodyGeometry =
        new THREE.BoxGeometry(
            0.8,
            1.4,
            0.5
        );

    const bodyMaterial =
        new THREE.MeshStandardMaterial({
            color: color
        });

    const body =
        new THREE.Mesh(
            bodyGeometry,
            bodyMaterial
        );

    body.position.y = 0;

    group.add(body);


    // Head

    const headGeometry =
        new THREE.SphereGeometry(
            0.3,
            16,
            16
        );

    const headMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xffc7a0
        });

    const head =
        new THREE.Mesh(
            headGeometry,
            headMaterial
        );

    head.position.y = 1;

    group.add(head);


    return group;
}


// ==========================================
// LOCAL PLAYER
// ==========================================

function updateLocalPlayer(player) {

    // Server is authoritative

    camera.position.x =
        player.x;

    camera.position.y =
        player.y;

    camera.position.z =
        player.z;


    // Update health

    const health =
        document.querySelector(".health");

    if (health) {

        health.textContent =
            `Health: ${Math.round(player.health)}`;
    }


    // Score

    const score =
        document.getElementById("score");

    if (score) {

        score.textContent =
            `Kills: ${player.kills}`;
    }
}


// ==========================================
// MOVEMENT
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


let yaw = 0;
let pitch = 0;

let verticalVelocity = 0;

let onGround = true;


function updateMovement(delta) {

    if (
        document.pointerLockElement !==
        renderer.domElement
    ) return;


    let forward = 0;
    let right = 0;


    if (keys["KeyW"])
        forward += 1;

    if (keys["KeyS"])
        forward -= 1;

    if (keys["KeyD"])
        right += 1;

    if (keys["KeyA"])
        right -= 1;


    const length =
        Math.hypot(
            forward,
            right
        );


    if (length > 0) {

        forward /= length;
        right /= length;
    }


    let speed = 5;


    if (
        keys["ShiftLeft"] ||
        keys["ShiftRight"]
    ) {

        speed = 9;
    }


    // Forward direction

    const forwardX =
        -Math.sin(yaw);

    const forwardZ =
        -Math.cos(yaw);


    // Right direction

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


    // Jump

    if (
        keys["Space"] &&
        onGround
    ) {

        verticalVelocity = 7;

        onGround = false;
    }


    // Gravity

    verticalVelocity -=
        20 * delta;

    camera.position.y +=
        verticalVelocity * delta;


    // Ground

    if (
        camera.position.y <= 1.6
    ) {

        camera.position.y = 1.6;

        verticalVelocity = 0;

        onGround = true;
    }


    // Arena boundary

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


    // Send position to server

    sendMovement();
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


    const now = performance.now();


    // 20 updates per second

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
// MOUSE LOOK
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
// START GAME
// ==========================================

const startScreen =
    document.getElementById(
        "start-screen"
    );


const startButton =
    document.getElementById(
        "start-button"
    );


startButton.addEventListener(
    "click",
    () => {

        startScreen.style.display =
            "none";


        renderer.domElement
            .requestPointerLock();
    }
);


// ==========================================
// SHOOTING
// ==========================================

const raycaster =
    new THREE.Raycaster();


let lastShot = 0;


document.addEventListener(
    "mousedown",
    event => {

        if (event.button !== 0)
            return;


        if (
            document.pointerLockElement !==
            renderer.domElement
        )
            return;


        shoot();
    }
);


function shoot() {

    const now =
        performance.now();


    // Fire rate

    if (
        now - lastShot < 150
    )
        return;


    lastShot = now;


    // Tell server we fired

    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({

                type: "shoot"
            })
        );
    }


    // Raycast

    raycaster.setFromCamera(
        new THREE.Vector2(0, 0),
        camera
    );


    const targets =
        [];


    remotePlayers.forEach(
        player => {

            targets.push(player);
        }
    );


    const hits =
        raycaster.intersectObjects(
            targets,
            true
        );


    if (hits.length === 0)
        return;


    let target =
        hits[0].object;


    // Find player group

    while (
        target.parent &&
        !target.userData.playerId
    ) {

        target =
            target.parent;
    }


    const targetId =
        target.userData.playerId;


    if (!targetId)
        return;


    // Tell server who we hit

    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({

                type: "damage",

                target: targetId
            })
        );
    }
}


// ==========================================
// REMOTE SHOOT EFFECT
// ==========================================

function showRemoteShot(id) {

    const player =
        remotePlayers.get(id);


    if (!player)
        return;


    const flash =
        new THREE.PointLight(
            0xffffaa,
            5,
            5
        );


    flash.position.set(
        0,
        0.5,
        -0.7
    );


    player.add(flash);


    setTimeout(
        () => {

            player.remove(flash);

        },
        70
    );
}


// ==========================================
// KILL MESSAGE
// ==========================================

function showKillMessage() {

    const message =
        document.createElement("div");


    message.textContent =
        "🔥 ELIMINATION +1";


    message.style.position =
        "fixed";


    message.style.top =
        "45%";


    message.style.left =
        "50%";


    message.style.transform =
        "translate(-50%, -50%)";


    message.style.fontSize =
        "30px";


    message.style.fontWeight =
        "bold";


    message.style.color =
        "white";


    message.style.zIndex =
        "999";


    document.body.appendChild(
        message
    );


    setTimeout(
        () => {

            message.remove();

        },
        1000
    );
}


// ==========================================
// WINDOW RESIZE
// ==========================================

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


// ==========================================
// GAME LOOP
// ==========================================

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


    renderer.render(
        scene,
        camera
    );
}


animate();
