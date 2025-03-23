const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');

// Firebase Setup
const serviceAccount = require('./firebase-key.json'); // Download this from Firebase
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

server.listen(3000, () => console.log('Server running on port 3000'));
