const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');

// Check if FIREBASE_CREDENTIALS environment variable exists
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

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://yourfrontend.com"], // Change this to your frontend URL
        methods: ["GET", "POST"]
    }
});
app.use(cors({ origin: ["http://yourfrontend.com"] }));

let visitorCount = 0;

io.on('connection', async (socket) => {
    visitorCount++;
    io.emit('updateCount', visitorCount);

    // Capture client details
    const clientIp = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];

    try {
        const visitRef = db.collection('visits').doc();
        await visitRef.set({
            timestamp: new Date(),
            ip: clientIp,
            userAgent: userAgent
        });
    } catch (error) {
        console.error("Error logging visit:", error);
    }

    socket.on('disconnect', () => {
        visitorCount = Math.max(0, visitorCount - 1); // Ensure visitor count doesn't go negative
        io.emit('updateCount', visitorCount);
    });
});

// API endpoint to fetch visit logs
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

app.get('/', (req, res) => {
    res.send('Traffic Monitor Backend is Running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
