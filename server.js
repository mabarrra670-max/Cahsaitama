const io = require("socket.io")(process.env.PORT || 3000, {
  cors: { origin: "*" }
});

let queue = [];
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User Connected: " + socket.id);

  socket.on("update_my_status", (userData) => {
    onlineUsers[socket.id] = {
        name: userData.name || "PLAYER",
        hero: userData.hero || "None",
        pwr: userData.pwr || 0,
        coins: userData.coins || 0,
        img: userData.img || "",
        socketId: socket.id
    };
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });

  socket.on("get_leaderboard", () => {
    const leaderboard = Object.values(onlineUsers)
        .sort((a, b) => b.pwr - a.pwr)
        .slice(0, 10);
    socket.emit("leaderboard_data", leaderboard);
  });

  socket.on("find_match", (playerData) => {
    playerData.socketId = socket.id;
    queue = queue.filter(p => p.socketId !== socket.id);
    if (queue.length > 0) {
      let opponent = queue.pop();
      io.to(socket.id).emit("match_found", { opponent: opponent });
      io.to(opponent.socketId).emit("match_found", { opponent: playerData });
    } else {
      queue.push(playerData);
    }
  });

  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    queue = queue.filter(p => p.socketId !== socket.id);
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });
});
