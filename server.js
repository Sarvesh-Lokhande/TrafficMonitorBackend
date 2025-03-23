const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const admin = require("firebase-admin");

// 🔹 Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-key.json"); // 🔥 Replace with your Firebase key
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors({ origin: "*" }));
app.use(express.json());

// 🔥 Store Active Users
let activeUsers = new Map();
let requestCount = 0;

// Middleware to count requests and check blacklisted IPs
app.use(async (req, res, next) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // 🔴 Check if IP is blacklisted
    const blacklistedDoc = await db.collection("blacklist").doc(clientIp).get();
    if (blacklistedDoc.exists) {
        return res.status(403).json({ message: "❌ Access Denied. Your IP is blacklisted." });
    }

    // 🟢 Log the request
    requestCount++;
    await db.collection("visitors").add({
        ip: clientIp,
        userAgent: req.headers["user-agent"],
        timestamp: admin.firestore.Timestamp.now(),
    });

    next();
});

// WebSocket connection for real-time monitoring
io.on("connection", async (socket) => {
    const clientIp = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
    const userAgent = socket.handshake.headers["user-agent"];

    // Add user to activeUsers Map
    activeUsers.set(socket.id, { ip: clientIp, userAgent });

    // Emit updated user count
    io.emit("activeUsers", Array.from(activeUsers.values()));

    console.log(`🟢 New Visitor: ${clientIp} (User-Agent: ${userAgent})`);

    socket.on("disconnect", () => {
        activeUsers.delete(socket.id);
        io.emit("activeUsers", Array.from(activeUsers.values()));
        console.log(`🔴 Visitor Left: ${clientIp}`);
    });
});

// ✅ API: Fetch Recent Visitors
app.get("/visitors", async (req, res) => {
    try {
        const visitorsSnapshot = await db.collection("visitors").orderBy("timestamp", "desc").limit(50).get();
        const visitors = visitorsSnapshot.docs.map(doc => doc.data());
        res.json({ success: true, data: visitors });
    } catch (error) {
        console.error("Error fetching visitors:", error);
        res.status(500).json({ success: false, message: "Error retrieving visit logs" });
    }
});

// ✅ API: Whitelist an IP
app.post("/whitelist", async (req, res) => {
    const { ip } = req.body;
    await db.collection("whitelist").doc(ip).set({ status: "whitelisted" });
    res.json({ message: `✅ IP ${ip} has been whitelisted.` });
});

// ✅ API: Blacklist an IP
app.post("/blacklist", async (req, res) => {
    const { ip } = req.body;
    await db.collection("blacklist").doc(ip).set({ status: "blacklisted" });
    res.json({ message: `❌ IP ${ip} has been blacklisted.` });
});

// ✅ API: Get Blacklisted & Whitelisted IPs
app.get("/ips", async (req, res) => {
    const whitelistedSnapshot = await db.collection("whitelist").get();
    const blacklistedSnapshot = await db.collection("blacklist").get();

    const whitelisted = whitelistedSnapshot.docs.map(doc => doc.id);
    const blacklisted = blacklistedSnapshot.docs.map(doc => doc.id);

    res.json({ whitelisted, blacklisted });
});

// ✅ Root Route for Testing
app.get("/", (req, res) => {
    res.send("🔥 Real-Time Traffic Monitor with Firebase is Running! 🔥");
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
