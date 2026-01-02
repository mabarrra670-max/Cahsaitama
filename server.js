const io = require("socket.io")(process.env.PORT || 3000, {
  cors: { origin: "*" }
});

let queue = [];
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User Connected: " + socket.id);

  // Status Online & Update Leaderboard Data
  socket.on("update_my_status", (userData) => {
    // Simpan/Update data player untuk Leaderboard
    onlineUsers[socket.id] = {
        name: userData.name,
        hero: userData.hero,
        pwr: userData.pwr,
        socketId: socket.id
    };
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });

  // Kirim data leaderboard ke yang meminta
  socket.on("get_leaderboard", () => {
    const leaderboard = Object.values(onlineUsers)
        .sort((a, b) => b.pwr - a.pwr) // Urutkan dari PWR terbesar
        .slice(0, 10); // Ambil Top 10
    socket.emit("leaderboard_data", leaderboard);
  });

  // Matchmaking
  socket.on("find_match", (playerData) => {
    playerData.socketId = socket.id;
    
    // Pastikan tidak masuk antrean dua kali
    queue = queue.filter(p => p.socketId !== socket.id);

    if (queue.length > 0) {
      let opponent = queue.pop();
      
      // Kirim ke kedua pemain
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

console.log("Server running on port 3000...");
