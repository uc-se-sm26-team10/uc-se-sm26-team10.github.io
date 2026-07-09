const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// CSP setup
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' https://cdnjs.cloudflare.com https://code.jquery.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "connect-src 'self' https://cdnjs.cloudflare.com ws: wss:;"
  );
  next();
});

app.use(express.static('ui')); 


const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log('Server running on port ' + PORT));

// Track active users: socket.id -> nickname
const userlist = new Map();

io.on('connection', (socket) => {

  // Login section
  socket.on('login_attempt', function(Username_Client, Password_Client){
    const users = require("./ui/users.json");
    const user = users.find(u => u.username === Username_Client);

    if(!user){
      socket.emit("Login_Validation", {success: false});
      return;
    }

    // Add user to tracking map
    userlist.set(socket.id, user.nickname);

    socket.emit("Login_Validation", {
        success: true, 
        nickname: user.nickname, 
        friends: user.friends
    });
  
    // F1.6: An online user list is displayed and updated in real time
    io.emit('user_list_update', Array.from(userlist.values()));
  });

  //  F1.4: Logged-in users can send and reci eve public messages in real time.
  socket.on('public_message', (message) => {
    // Look up the sender's nickname. Fallback to "Unknown" if not found.
    const senderNickname = userlist.get(socket.id) || "Unknown User";
    
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

// Typing event (rate-limited to once every 3 seconds)
let lastTypingLog = 0;

socket.on('typing', () => {
  const now = Date.now();
  const username = userlist.get(socket.id);

  if (now - lastTypingLog >= 3000) {
    console.log(username + ' is typing ...');
    lastTypingLog = now;
  }

  socket.broadcast.emit('typing');
});






});