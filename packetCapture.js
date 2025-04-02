const pcap = require('pcap');
const admin = require('firebase-admin');

// ✅ Firestore DB Reference
const db = admin.firestore();

const networkInterface = 'eth0'; // Change this based on your system
const pcapSession = pcap.createSession(networkInterface, 'ip');

console.log(`[Packet Sniffer] Listening on ${networkInterface}...`);

pcapSession.on('packet', async function (rawPacket) {
    let packet = pcap.decode.packet(rawPacket);

    if (packet.link && packet.link.ip) {
        let ipPacket = packet.link.ip;
        let protocol = ipPacket.protocol_name || "Unknown";
        console.log(`📡 Captured Packet - Protocol: ${protocol}`);

        // 📝 Store captured packets in Firestore
        try {
            await db.collection('packets').add({
                timestamp: new Date(),
                protocol
            });
            console.log("✅ Packet logged to Firebase:", protocol);
        } catch (error) {
            console.error("❌ Firestore packet log error:", error);
        }
    }
});

module.exports = pcapSession;
