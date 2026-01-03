const { Server } = require("socket.io");

const io = new Server(process.env.PORT || 3000, {
  cors: { origin: "*" }
});

const HERO_DB = {
  1: 999999,
  2: 850000,
  3: 95000,
  4: 90000,
  5: 85000,
  6: 80000,
  7: 45000,
  8: 42000,
  9: 38000,
  10: 35000,
  11: 33000,
  12: 30000,
  13: 15000,
  14: 12000,
  15: 10000,
  16: 5000,
  17: 1
};

let queue = [];
let onlineUsers = {};

console.log("=== One Punch Gacha Server Ready ===");

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("update_my_status", (data) => {
    onlineUsers[socket.id] = {
      name: data.name || "PLAYER",
      hero: data.hero || "None",
      pwr: data.pwr || 0,
      socketId: socket.id
    };
  });

  socket.on("get_leaderboard", () => {
    const lb = Object.values(onlineUsers)
      .filter(p => p.pwr > 0)
      .sort((a,b)=>b.pwr-a.pwr)
      .slice(0,10);
    socket.emit("leaderboard_data", lb);
  });

  socket.on("find_match", (player) => {
    const base = HERO_DB[player.heroId] || 1;
    const pwr = base * Math.min(player.lvl, 50); // limit lvl

    const playerData = {
      name: player.name,
      img: player.img,
      pwr,
      socketId: socket.id
    };

    queue = queue.filter(p => p.socketId !== socket.id);

    if(queue.length > 0){
      const opponent = queue.pop();
      io.to(socket.id).emit("match_found", { opponent });
      io.to(opponent.socketId).emit("match_found", { opponent: playerData });
    } else {
      queue.push(playerData);
    }
  });

  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    queue = queue.filter(p => p.socketId !== socket.id);
  });
});
