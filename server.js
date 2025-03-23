const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');

// Check if FIREBASE_CREDENTIALS environment variable exists
if (!process.env.FIREBASE_CREDENTIALS) {
    console.error("Error: FIREBASE_CREDENTIALS environment variable is missing.");
    process.exit(1); // Exit the process with an error code
}

let serviceAccount;

try {
    // Parse Firebase credentials from the environment variable
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
        origin: "*"
    }
});
app.use(cors());

let visitorCount = 0;

io.on('connection', async (socket) => {
    visitorCount++;
    io.emit('updateCount', visitorCount);

    const visitRef = db.collection('visits').doc();
    await visitRef.set({ timestamp: new Date() });

    socket.on('disconnect', () => {
        visitorCount--;
        io.emit('updateCount', visitorCount);
    });
});
app.get('/', (req, res) => {
    res.send('Traffic Monitor Backend is Running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
