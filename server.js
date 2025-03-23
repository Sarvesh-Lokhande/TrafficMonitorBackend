const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');

// ✅ Ensure Firebase Credentials Exist
if (!process.env.FIREBASE_CREDENTIALS) {
    console.error("Error: FIREBASE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} catch (error) {
    console.error("Error parsing FIREBASE_CREDENTIALS:", error);
    process.exit(1);
}

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins for now, update with frontend URL in production
        methods: ["GET", "POST"]
    },
    pingInterval: 5000,  // Check for active connections every 5s
    pingTimeout: 10000   // Disconnect if no response in 10s
});

// ✅ CORS Middleware
app.use(cors({ origin: "*" })); // Change * to specific frontend URL for production

// 🔥 Store Active Users
let activeUsers = new Map();

io.on('connection', async (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];

    activeUsers.set(socket.id, { ip: clientIp, userAgent });
    io.emit('updateCount', activeUsers.size); // Broadcast updated active users count

    console.log(`🟢 New Visitor: ${clientIp} (User-Agent: ${userAgent})`);

    try {
        // ✅ Log Visit to Firestore
        await db.collection('visits').add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ip: clientIp,
            userAgent: userAgent
        });
    } catch (error) {
        console.error("Error logging visit:", error);
    }

    socket.on('disconnect', () => {
        activeUsers.delete(socket.id);
        io.emit('updateCount', activeUsers.size);
        console.log(`🔴 Visitor Left: ${clientIp}`);
    });
});

// ✅ API Endpoint to Fetch Visit Logs
app.get('/visits', async (req, res) => {
    try {
        const snapshot = await db.collection('visits').orderBy('timestamp', 'desc').limit(50).get();
        const visits = snapshot.docs.map(doc => doc.data());
        res.json({ success: true, data: visits });
    } catch (error) {
        console.error("Error fetching visits:", error);
        res.status(500).json({ success: false, message: "Error retrieving visit logs" });
    }
});

// ✅ API to Clean Old Database Entries (Older than 24 Hours)
app.get('/clean-database', async (req, res) => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1); // 24 hours ago

        const snapshot = await db.collection('visits')
            .where('timestamp', '<', yesterday)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        res.json({ success: true, message: `${snapshot.docs.length} old records deleted` });
    } catch (error) {
        console.error("Error cleaning database:", error);
        res.status(500).json({ success: false, message: "Error cleaning database" });
    }
});

// ✅ Root Route for Testing
app.get('/', (req, res) => {
    res.send('🔥 Traffic Monitor Backend is Running! 🔥');
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
