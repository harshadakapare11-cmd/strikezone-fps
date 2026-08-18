const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const players = new Map();

wss.on("connection", (ws) => {
  const id = Math.random().toString(36).slice(2, 10);

  players.set(id, {
    id,
    x: 0,
    y: 1.6,
    z: 0,
    health: 100,
    kills: 0,
    team: Math.random() < 0.5 ? "blue" : "red"
  });

  ws.send(JSON.stringify({
    type: "welcome",
    id,
    players: [...players.values()]
  }));

  broadcast();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const player = players.get(id);

      if (!player) return;

      if (data.type === "move") {
        player.x = Number(data.x) || 0;
        player.y = Number(data.y) || 1.6;
        player.z = Number(data.z) || 0;
      }

      if (data.type === "shoot") {
        broadcast({
          type: "shot",
          id
        });
      }

      if (data.type === "damage") {
        const target = players.get(data.target);

        if (target && target.team !== player.team) {
          target.health -= 25;

          if (target.health <= 0) {
            player.kills++;
            target.health = 100;

            target.x = Math.random() * 40 - 20;
            target.z = Math.random() * 40 - 20;

            broadcast({
              type: "kill",
              killer: player.id,
              victim: target.id
            });
          }
        }
      }

      broadcast();
    } catch (err) {
      console.log("Invalid message");
    }
  });

  ws.on("close", () => {
    players.delete(id);
    broadcast();
  });
});

function broadcast(extra = null) {
  const packet = {
    type: "state",
    players: [...players.values()],
    extra
  };

  const message = JSON.stringify(packet);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Strikezone server running on port ${PORT}`);
});
