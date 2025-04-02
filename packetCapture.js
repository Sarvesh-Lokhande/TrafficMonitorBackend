const pcap = require('pcap');
const networkInterface = 'eth0'; // Change based on your system
const pcapSession = pcap.createSession(networkInterface, 'ip');

console.log(`[Packet Sniffer] Listening on ${networkInterface}...`);

pcapSession.on('packet', function (rawPacket) {
    let packet = pcap.decode.packet(rawPacket);

    if (packet.link && packet.link.ip) {
        let ipPacket = packet.link.ip;
        let protocol = ipPacket.protocol_name || "Unknown";
        console.log(`Captured Packet - Protocol: ${protocol}`);
    }
});

module.exports = pcapSession;
