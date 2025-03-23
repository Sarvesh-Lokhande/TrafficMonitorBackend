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
    }
});

// ✅ CORS Middleware
app.use(cors({ origin: "*" })); // Change * to specific frontend URL for production

// 🔥 Store Active Users
let activeUsers = new Set();

io.on('connection', async (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];

    activeUsers.add(clientIp);
    io.emit('updateCount', activeUsers.size); // Broadcast updated active users count

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
        activeUsers.delete(clientIp);
        io.emit('updateCount', activeUsers.size);
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

// ✅ Root Route for Testing
app.get('/', (req, res) => {
    res.send('🔥 Traffic Monitor Backend is Running! 🔥');
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
