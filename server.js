const io = require("socket.io")(process.env.PORT || 3000, {
  cors: { origin: "*" }
});

// Database sementara dalam memori server
let queue = [];
let onlineUsers = {};

console.log("--- One Punch Server Started ---");

io.on("connection", (socket) => {
  console.log("User Connected: " + socket.id);

  // 1. UPDATE STATUS & DATA PLAYER
  // Fungsi ini menangani data leaderboard, koin, dan hero aktif secara real-time
  socket.on("update_my_status", (userData) => {
    // Validasi sederhana agar Power tidak dimanipulasi secara ilegal (max 2 juta)
    const securePwr = (userData.pwr > 2000000) ? 1 : (userData.pwr || 0);

    onlineUsers[socket.id] = {
        name: userData.name || "PLAYER",
        hero: userData.hero || "None",
        pwr: securePwr,
        coins: userData.coins || 0,
        socketId: socket.id
    };
    
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });
    
    // Broadcast jumlah player online ke semua user
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });

  // 2. SISTEM LEADERBOARD
  // Mengirimkan Top 10 player berdasarkan Power (PWR)
  socket.on("get_leaderboard", () => {
    const leaderboard = Object.values(onlineUsers)
        .filter(p => p.pwr > 0) // Hanya tampilkan yang sudah punya hero
        .sort((a, b) => b.pwr - a.pwr) // Urutkan dari yang terkuat
        .slice(0, 10);
    
    socket.emit("leaderboard_data", leaderboard);
  });

  // 3. SISTEM MATCHMAKING (PvP Arena)
  socket.on("find_match", (playerData) => {
    playerData.socketId = socket.id;
    
    // Cegah pemain masuk antrean dua kali
    queue = queue.filter(p => p.socketId !== socket.id);

    if (queue.length > 0) {
      // Jika ada lawan di antrean, pasangkan mereka
      let opponent = queue.pop();
      
      console.log(`Match Found: ${playerData.name} VS ${opponent.name}`);

      // Kirim data lawan ke masing-masing pemain
      io.to(socket.id).emit("match_found", { opponent: opponent });
      io.to(opponent.socketId).emit("match_found", { opponent: playerData });
    } else {
      // Jika tidak ada lawan, masukkan ke antrean
      queue.push(playerData);
      console.log(`${playerData.name} sedang mencari lawan...`);
    }
  });

  // 4. HANDLING DISCONNECT
  socket.on("disconnect", () => {
    console.log("User Disconnected: " + socket.id);
    
    // Hapus data dari daftar online dan antrean pvp
    delete onlineUsers[socket.id];
    queue = queue.filter(p => p.socketId !== socket.id);
    
    // Update jumlah player online ke user yang tersisa
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });
});

// Log jika server berjalan
const PORT = process.env.PORT || 3000;
console.log(`Server running on port ${PORT}`);
