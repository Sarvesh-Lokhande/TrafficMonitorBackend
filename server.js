const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
const axios = require('axios');

if (!process.env.FIREBASE_CREDENTIALS) {
    console.error("❌ FIREBASE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} catch (error) {
    console.error("❌ Error parsing FIREBASE_CREDENTIALS:", error);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingInterval: 5000,
    pingTimeout: 10000
});

app.use(cors({ origin: "*" }));

let activeUsers = new Map();

// 🔍 Extract clean public IP
function extractIp(socket) {
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || "";
    if (ip.includes(',')) {
        ip = ip.split(',')[0];
    }
    return ip.trim();
}

io.on('connection', async (socket) => {
    const clientIp = extractIp(socket);
    const userAgent = socket.handshake.headers['user-agent'];
    const timestamp = new Date();

    let locationData = {};
    try {
        const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
        console.log("🌍 IP Lookup Response:", response.data);

        locationData = {
            city: response.data.city || "Unknown",
            region: response.data.regionName || "Unknown",
            country: response.data.country || "Unknown",
            org: response.data.org || "Unknown"
        };
    } catch (error) {
        console.warn("🌐 Could not fetch location:", error.message);
    }

    try {
        await db.collection('visitors').add({
            ip: clientIp,
            userAgent,
            timestamp,
            location: locationData,
            socketId: socket.id
        });
        console.log(`📝 Logged visitor: ${clientIp}`);
    } catch (err) {
        console.error("❌ Firestore log error:", err);
    }

    activeUsers.set(socket.id, { ip: clientIp, userAgent });
    io.emit('activeUsers', Array.from(activeUsers.values()));
    console.log(`🟢 New Visitor: ${clientIp}`);

    socket.on('disconnect', () => {
        activeUsers.delete(socket.id);
        io.emit('activeUsers', Array.from(activeUsers.values()));
        console.log(`🔴 Visitor Left: ${clientIp}`);
    });
});

const path = require("path");
app.use(express.static(path.join(__dirname, "client", "build")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
