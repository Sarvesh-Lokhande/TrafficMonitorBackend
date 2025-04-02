const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const admin = require("firebase-admin");
const cors = require("cors");
const axios = require("axios");
const rateLimit = require("express-rate-limit");

// ✅ Check for Firebase Credentials
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

// ✅ Rate Limiting (Blocks DDoS Attempts)
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: "⚠️ Too many requests, please try again later."
});
app.use(limiter);

// ✅ Store Active Users
let activeUsers = new Map();

// ✅ Function to Get Client IP Safely
const getClientIp = (socket) => {
    let ip = socket.handshake.headers["x-forwarded-for"]?.split(",")[0].trim();
    return ip || socket.handshake.address || "Unknown IP";
};

// ✅ Function to Get Location Data
const getLocationData = async (ip) => {
    try {
        const response = await axios.get(`https://ipinfo.io/${ip}?token=${process.env.IPINFO_TOKEN}`);
        return {
            city: response.data.city || "Unknown",
            region: response.data.region || "Unknown",
            country: response.data.country || "Unknown",
            org: response.data.org || "Unknown"
        };
    } catch (error) {
        console.warn("🌐 Could not fetch location:", error.message);
        return {};
    }
};

// ✅ Firestore Batch Logging
let logBuffer = [];
setInterval(async () => {
    if (logBuffer.length > 0) {
        const batch = db.batch();
        logBuffer.forEach((log) => {
            const ref = db.collection("visitors").doc();
            batch.set(ref, log);
        });
        await batch.commit();
        logBuffer = [];
        console.log("📤 Batched logs sent to Firestore.");
    }
}, 10000); // Every 10 seconds

// ✅ Middleware to Log Requests
app.use(async (req, res, next) => {
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const timestamp = new Date();

    const locationData = await getLocationData(clientIp);

    logBuffer.push({
        ip: clientIp,
        userAgent,
        timestamp,
        location: locationData
    });

    console.log(`🌐 Request from: ${clientIp}, User-Agent: ${userAgent}`);
    next();
});

// ✅ WebSocket for Real-Time Visitor Tracking
io.on("connection", async (socket) => {
    const clientIp = getClientIp(socket);
    const userAgent = socket.handshake.headers["user-agent"];
    const timestamp = new Date();

    const locationData = await getLocationData(clientIp);

    // 📝 Log visitor data in Firestore
    logBuffer.push({
        ip: clientIp,
        userAgent,
        timestamp,
        location: locationData,
        socketId: socket.id
    });

    activeUsers.set(socket.id, { ip: clientIp, userAgent });

    io.emit("activeUsers", Array.from(activeUsers.values()));
    console.log(`🟢 New Visitor: ${clientIp}`);

    socket.on("disconnect", () => {
        activeUsers.delete(socket.id);
        io.emit("activeUsers", Array.from(activeUsers.values()));
        console.log(`🔴 Visitor Left: ${clientIp}`);
    });
});

// ✅ Serve Frontend (If Using React/Vue/Next.js)
const path = require("path");
app.use(express.static(path.join(__dirname, "client", "build")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
