// client/src/App.js
import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const socket = io("https://trafficmonitorbackend.onrender.com");

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Simulate request per second (or per interval)
    let requestCount = 0;

    // Listen for active users
    socket.on("activeUsers", (users) => {
      requestCount++; // Each socket update is considered one "event/request"

      const timestamp = new Date().toLocaleTimeString();

      setData((prev) => {
        const newData = [...prev, { time: timestamp, requests: requestCount }];
        return newData.slice(-10); // Keep only latest 10 points
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>📊 Live Traffic Visualization</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="requests" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default App;