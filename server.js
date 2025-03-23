const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    },
    pingInterval: 5000,  // Check for active connections every 5s
    pingTimeout: 10000   // Disconnect if no response in 10s
});

app.use(cors({ origin: "*" })); // Allow all origins

// 🔥 Store Active Users
let activeUsers = new Map();

io.on('connection', (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];

    // Add user to activeUsers Map
    activeUsers.set(socket.id, { ip: clientIp, userAgent });

    // Emit updated list of active users to all clients
    io.emit('activeUsers', Array.from(activeUsers.values()));

    console.log(`🟢 New Visitor: ${clientIp} (User-Agent: ${userAgent})`);

    socket.on('disconnect', () => {
        // Remove user from activeUsers Map
        activeUsers.delete(socket.id);

        // Emit updated list of active users to all clients
        io.emit('activeUsers', Array.from(activeUsers.values()));

        console.log(`🔴 Visitor Left: ${clientIp}`);
    });
});

// ✅ Root Route for Testing
app.get('/', (req, res) => {
    res.send('🔥 Real-Time User Monitor Backend is Running! 🔥');
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
