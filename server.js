const io = require("socket.io")(process.env.PORT || 3000, {
    cors: { origin: "*" }
});

let queue = [];
let onlineUsers = {};

console.log("--- One Punch Server Started ---");

io.on("connection", (socket) => {
    console.log("User Connected: " + socket.id);

    // Update status pemain saat login/perubahan hero
    socket.on("update_my_status", (userData) => {
        // Validasi agar pwr tidak dimanipulasi secara ilegal
        const validatedPwr = userData.pwr > 2000000 ? 1 : (userData.pwr || 0);

        onlineUsers[socket.id] = {
            name: userData.name || "PLAYER",
            hero: userData.hero || "None",
            pwr: validatedPwr,
            coins: userData.coins || 0,
            socketId: socket.id
        };
        io.emit("update_online_count", Object.keys(onlineUsers).length);
    });

    // Mengambil data peringkat pemain yang sedang online
    socket.on("get_leaderboard", () => {
        const leaderboard = Object.values(onlineUsers)
            .filter(p => p.pwr > 0)
            .sort((a, b) => b.pwr - a.pwr)
            .slice(0, 10);
        socket.emit("leaderboard_data", leaderboard);
    });

    // Logika Matchmaking (mencari lawan)
    socket.on("find_match", (playerData) => {
        playerData.socketId = socket.id;
        // Hapus jika user sudah ada di antrean sebelumnya
        queue = queue.filter(p => p.socketId !== socket.id);

        if (queue.length > 0) {
            // Jika ada lawan di antrean, hubungkan mereka
            let opponent = queue.pop();
            io.to(socket.id).emit("match_found", { opponent: opponent });
            io.to(opponent.socketId).emit("match_found", { opponent: playerData });
            console.log(`Match Found: ${playerData.name} VS ${opponent.name}`);
        } else {
            // Jika tidak ada lawan, masuk ke antrean
            queue.push(playerData);
            console.log(`${playerData.name} is waiting for match...`);
        }
    });

    // Hapus data saat user diskonek
    socket.on("disconnect", () => {
        console.log("User Disconnected: " + socket.id);
        delete onlineUsers[socket.id];
        queue = queue.filter(p => p.socketId !== socket.id);
        io.emit("update_online_count", Object.keys(onlineUsers).length);
    });
});

const PORT = process.env.PORT || 3000;
console.log(`Server running on port ${PORT}`);
