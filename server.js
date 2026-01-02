const io = require("socket.io")(process.env.PORT || 3000, {
  cors: { origin: "*" }
});

let queue = [];
let onlineUsers = {};

console.log("One Punch Server is Starting...");

io.on("connection", (socket) => {
  console.log("New Connection: " + socket.id);

  // 1. UPDATE STATUS & LEADERBOARD DATA
  // Dipanggil setiap kali ada perubahan data (Gacha/Jual/Pilih Hero)
  socket.on("update_my_status", (userData) => {
    onlineUsers[socket.id] = {
        name: userData.name || "PLAYER",
        hero: userData.hero || "None",
        pwr: userData.pwr || 0,
        coins: userData.coins || 0,
        socketId: socket.id
    };
    
    // Broadcast jumlah user online ke semua orang
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });

  // 2. KIRIM DATA LEADERBOARD
  // Mengambil 10 player dengan Power tertinggi
  socket.on("get_leaderboard", () => {
    const leaderboard = Object.values(onlineUsers)
        .filter(p => p.pwr > 0) // Hanya tampilkan yang punya hero
        .sort((a, b) => b.pwr - a.pwr)
        .slice(0, 10);
    
    socket.emit("leaderboard_data", leaderboard);
  });

  // 3. MATCHMAKING SYSTEM
  socket.on("find_match", (playerData) => {
    playerData.socketId = socket.id;
    
    // Hapus dari antrean jika sebelumnya sudah masuk (mencegah double queue)
    queue = queue.filter(p => p.socketId !== socket.id);

    if (queue.length > 0) {
      // Jika ada lawan di antrean, ambil satu
      let opponent = queue.pop();
      
      console.log(`Match Found: ${playerData.name} vs ${opponent.name}`);

      // Kirim data lawan ke Player 1
      io.to(socket.id).emit("match_found", { 
        opponent: {
            name: opponent.name,
            img: opponent.img,
            pwr: opponent.pwr
        }
      });

      // Kirim data lawan ke Player 2
      io.to(opponent.socketId).emit("match_found", { 
        opponent: {
            name: playerData.name,
            img: playerData.img,
            pwr: playerData.pwr
        }
      });
    } else {
      // Jika belum ada lawan, masukkan ke antrean
      queue.push(playerData);
      console.log(`${playerData.name} entered matchmaking queue.`);
    }
  });

  // 4. DISCONNECT HANDLING
  socket.on("disconnect", () => {
    console.log("User Disconnected: " + socket.id);
    
    // Hapus dari daftar online dan antrean matchmaking
    delete onlineUsers[socket.id];
    queue = queue.filter(p => p.socketId !== socket.id);
    
    // Update jumlah user online ke yang lain
    io.emit("update_online_count", Object.keys(onlineUsers).length);
  });
});

console.log("Server is running perfectly on port " + (process.env.PORT || 3000));
