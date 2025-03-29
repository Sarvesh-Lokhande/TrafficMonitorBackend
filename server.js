const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');

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

io.on("connection", (socket) => {
    const clientIp = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
    const userAgent = socket.handshake.headers["user-agent"];
    const origin = socket.handshake.headers["origin"]; // Get the origin of the request

    // ✅ Allow logging ONLY if the request comes from your frontend
    if (origin === "https://review-system-backend-topaz.vercel.app") {
        activeUsers.set(socket.id, { ip: clientIp, userAgent });

        io.emit("activeUsers", Array.from(activeUsers.values()));
        console.log(`🟢 New Visitor: ${clientIp} from ${origin}`);
    }

    socket.on("disconnect", () => {
        activeUsers.delete(socket.id);
        io.emit("activeUsers", Array.from(activeUsers.values()));
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
