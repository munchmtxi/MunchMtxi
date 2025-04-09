// Save as testSocket.js in C:\Users\munch\Desktop\MunchMtxi\
const { io } = require("socket.io-client");

// Use your JWT token from the browser logs
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDgsInJvbGUiOjQsImlhdCI6MTc0NDEwNjE5NSwiZXhwIjoxNzQ0NzEwOTk1fQ.JZAOi71dDrrrRwpc5tl43dTEVmYiOuOsafDrX-PGyGE";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],
  auth: { token: TOKEN }, // Match your server's auth middleware
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("🔥 Connected to server! Socket ID:", socket.id);
  socket.emit("join", { user: "El Jefe Master and Commander" });
  console.log("📤 Emitted join event");
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
  console.error("Error details:", JSON.stringify(err, null, 2));
});

socket.on("message", (msg) => {
  console.log("📥 Message from server:", msg);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Disconnected from server. Reason:", reason);
});

socket.on("reconnect_attempt", (attempt) => {
  console.log("🔄 Reconnect attempt #", attempt);
});

socket.on("reconnect_failed", () => {
  console.error("🚫 Reconnection failed after all attempts");
});

// Handle server authentication errors (if any)
socket.on("error", (error) => {
  console.error("⚠️ Server error:", error);
});

// Start connection
console.log("🚀 Attempting to connect...");
socket.connect();