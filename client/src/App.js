import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const socket = io('https://trafficmonitorbackend.onrender.com'); // your backend

const App = () => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [visitorHistory, setVisitorHistory] = useState([]);

  useEffect(() => {
    socket.on('activeUsers', (users) => {
      setActiveUsers(users);
    });

    socket.on('visitorHistory', (history) => {
      setVisitorHistory(history);
    });

    return () => socket.disconnect();
  }, []);

  // Graph Data for Visitor Trends
  const graphData = {
    labels: visitorHistory.map((v) => new Date(v.timestamp).toLocaleTimeString()),
    datasets: [{
      label: "Visitors Over Time",
      data: visitorHistory.map(() => 1),
      borderColor: "#007bff",
      backgroundColor: "rgba(0, 123, 255, 0.2)",
      fill: true,
    }],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white p-4 md:p-8 text-gray-800 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-8 text-center text-blue-700 tracking-tight">
          🚨 Real-Time DDoS Traffic Monitor
        </h1>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Active Users Card */}
          <div className="bg-white shadow-xl p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg md:text-xl font-semibold mb-3 text-gray-700">
              👥 Active Users
            </h2>
            <p className="text-5xl font-bold text-green-600">{activeUsers.length}</p>
          </div>

          {/* Visitor Trends Graph */}
          <div className="bg-white shadow-xl p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg md:text-xl font-semibold mb-3 text-gray-700">
              📈 Visitor Trends
            </h2>
            <Line data={graphData} />
          </div>
        </div>

        {/* Visitor Details Card */}
        <div className="bg-white shadow-xl p-6 rounded-2xl border border-gray-100 h-[400px] overflow-y-auto mt-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 text-gray-700">
            🌐 Live Visitors
          </h2>
          <div className="space-y-4">
            {activeUsers.length === 0 ? (
              <p className="text-gray-400">No visitors connected.</p>
            ) : (
              activeUsers.map((user, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <p className="text-sm font-medium text-gray-700">
                    IP: <span className="text-blue-600">{user.ip}</span>
                  </p>
                  <p className="text-xs text-gray-600 break-all">
                    UA: {user.userAgent}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Traffic Monitor • Built for DDoS Insight
        </footer>
      </div>
    </div>
  );
};

export default App;
