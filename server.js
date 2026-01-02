const io = require("socket.io")(process.env.PORT || 3000, {
  cors: { origin: "*" }
});

let queue = [];
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User Connected: " + socket.id);

  // Status Online
  socket.on("join_lobby", (userData) => {
    onlineUsers[socket.id] = userData;
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });

  // Matchmaking
  socket.on("find_match", (playerData) => {
    playerData.socketId = socket.id;
    
    // Cek jika ada orang lain di antrean
    if (queue.length > 0) {
      let opponent = queue.pop();
      
      // Kirim pesan ke kedua pemain bahwa lawan ditemukan
      io.to(socket.id).emit("match_found", { opponent: opponent, role: "attacker" });
      io.to(opponent.socketId).emit("match_found", { opponent: playerData, role: "defender" });
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

console.log("Server running...");
