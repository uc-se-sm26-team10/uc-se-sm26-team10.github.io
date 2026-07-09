const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
const fs = require('fs');

// CSP setup
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' https://cdnjs.cloudflare.com https://code.jquery.com https://cdn.socket.io; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://cdnjs.cloudflare.com ws: wss:;"
  );
  next();
});

app.use(express.static('ui')); 


const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log('Server running on port ' + PORT));

// Track active users: socket.id -> {username, nickname}
const userlist = new Map();

io.on('connection', (socket) => {

  // Login section
  socket.on('login_attempt', function(Username_Client, Password_Client){
    // Read fresh file contents synchronously to match existing flow
    const usersData = fs.readFileSync(path.join(__dirname, 'ui', 'users.json'), 'utf8');
    const users = JSON.parse(usersData);

    const user = users.find(u => u.username === Username_Client);

    if(!user){
      socket.emit("Login_Validation", {success: false});
      return;
    }

    // Add username and their nickname to tracking map
    userlist.set(socket.id, { username: user.username, nickname: user.nickname });

    socket.emit("Login_Validation", {
        success: true, 
        nickname: user.nickname, 
        friends: user.friends,
        username: user.username // pass back client's identity
    });
  
    // F1.6: An online user list is displayed and updated in real time
    io.emit('user_list_update', Array.from(userlist.values()));
  });

  // Private chat section
  // Creates private room for private messaging between two users; 
  // room ID is a combination of both usernames, sorted alphabetically to ensure uniqueness
  socket.on('join_private_room', ({ myUsername, targetUsername }) => {
    // Alphabetically sorting creates an identical, unique room ID for both users
    const roomId = [myUsername, targetUsername].sort().join('_');
    socket.join(roomId);
  });
  // Private Chat: Passing messages
  socket.on('private_message', ({ myUsername, targetUsername, message }) => {
    const senderData = userlist.get(socket.id) || { nickname: "Unknown User" };
    const roomId = [myUsername, targetUsername].sort().join('_');
    
    // Send to everyone inside that explicit room ID
    io.to(roomId).emit('receive_private_message', { 
      sender: senderData.nickname, 
      text: message,
      room: roomId // roomId to ensure correct routing on client side
    });
  });

  // Public chat section
  //  F1.4: Logged-in users can send and reci eve public messages in real time.
  socket.on('public_message', (message) => {
    // Look up the sender's nickname. Fallback to "Unknown User" if not found.
    const senderData = userlist.get(socket.id);
    const senderNickname = senderData ? senderData.nickname : "Unknown User";

    // Broadcast the message back to everyone
    io.emit('receive_public_message', { sender: senderNickname, text: message });
  });

  // Disconnect section
  socket.on('disconnect', () => {
    // If a logged-in user closes the tab, remove them and update the list
    if (userlist.has(socket.id)) {
      userlist.delete(socket.id);
      io.emit('user_list_update', Array.from(userlist.values()));
    }
  });

  //Leave private room section
  socket.on('leave_private_room', (roomId) => {
    socket.leave(roomId);
  });
  
// Typing event (rate-limited to once every 3 seconds)
let lastTypingLog = 0;

socket.on('typing', () => {
  const now = Date.now();
  const userData = userlist.get(socket.id);

  if (now - lastTypingLog >= 3000) {
    console.log(userData + ' is typing ...');
    lastTypingLog = now;
  }

  socket.broadcast.emit('typing');
});

});