const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const { SocketAddress } = require('net');
const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// content security policy setup to-do
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' https://cdnjs.cloudflare.com https://code.jquery.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "connect-src 'self' https://cdnjs.cloudflare.com;"
  );
  next();
});

app.use(express.static( 'ui'));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log('Server running on port ' + PORT));


// In-memory store: socketId → username
const userlist = new Map();

io.on('connection', (socket) => {

  socket.on('login_attempt', function(Username_Client, Password_Client){
    
    // grab all users
    const users = require("./ui/users.json");
    // search for username
    const user = users.find(u => u.username === Username_Client);

    if(!user){
      // User not found Validation error
      socket.emit("Login_Validation", {success: false});
      return;
    }

    // User is found
    socket.emit("Login_Validation", 
      {
        success: true, 
        nickname: user.nickname, 
        friends: user.friends
      });
  
  });




});