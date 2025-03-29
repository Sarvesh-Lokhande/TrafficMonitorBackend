import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://trafficmonitorbackend.onrender.com'); // your backend

const App = () => {
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    socket.on('activeUsers', (users) => {
      setActiveUsers(users);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 text-gray-800 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-blue-700">
          🚨 Real-Time DDoS Traffic Monitor
        </h1>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* Active Users Card */}
          <div className="bg-white shadow-lg p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">👥 Active Users</h2>
            <p className="text-4xl font-bold text-green-600">{activeUsers.length}</p>
          </div>

          {/* Visitor Details Card */}
          <div className="bg-white shadow-lg p-6 rounded-2xl h-[400px] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">🌐 Live Visitors</h2>
            <div className="space-y-4">
              {activeUsers.length === 0 ? (
                <p className="text-gray-400">No visitors connected.</p>
              ) : (
                activeUsers.map((user, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
                  >
                    <p className="text-sm font-medium text-gray-700">IP: <span className="text-blue-600">{user.ip}</span></p>
                    <p className="text-xs text-gray-600 break-words">UA: {user.userAgent}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Traffic Monitor • Built for DDoS Insight
        </footer>
      </div>
    </div>
  );
};

export default App;
