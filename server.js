const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
const axios = require('axios'); // <-- Add axios for location lookup

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

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// 🔥 Firestore DB Reference
const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingInterval: 5000,
    pingTimeout: 10000
});

app.use(cors({ origin: "*" }));

// ✅ Store Active Users
let activeUsers = new Map();

io.on('connection', async (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];
    const timestamp = new Date();

    // 📍 Get location info using ipapi with default values
    let locationData = {
        city: "Unknown",
        region: "Unknown",
        country: "Unknown",
        org: "Unknown"
    };

    try {
        const response = await axios.get(`https://ipapi.co/${clientIp}/json/`);
        locationData = {
            city: response.data.city || "Unknown",
            region: response.data.region || "Unknown",
            country: response.data.country_name || "Unknown",
            org: response.data.org || "Unknown"
        };
    } catch (error) {
        console.warn("🌐 Could not fetch location:", error.message);
    }

    // 📝 Log to Firestore
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

// ✅ Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
