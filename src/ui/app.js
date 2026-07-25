const socket = io();

// DOM section
const loginSection = document.getElementById('login-section');
const chatSection = document.getElementById('chat-section');
const submitBtn = document.getElementById('Submit-button');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const friendsListContainer = document.getElementById('friends-list');

// Private chat DOM section
const publicChat = document.getElementById('public-chat');
const privateChat = document.getElementById('private-chat');
const closePrivateBtn = document.getElementById('close-private-btn');
const privateChatTitle = document.getElementById('private-chat-title');


// For Registation Section -----------------------------------------
const regSection = document.getElementById('registation-section');
const loginToRegBtn = document.getElementById('Login-to-Reg-page');
const RegToLoginBtn = document.getElementById('back-to-login-from-register-button');
const regBtn = document.getElementById('register-button');
const regUsername = document.getElementById('reg-username');
const regPassword = document.getElementById('reg-password');

loginToRegBtn.addEventListener('click', () => {
    regSection.style.display = 'block';
    loginSection.style.display = 'none';
});

RegToLoginBtn.addEventListener('click', () => {
    regSection.style.display = 'none';
    loginSection.style.display = 'block';
});

regBtn.addEventListener('click', () => {
    const username = regUsername.value;
    const password = regPassword.value;
    
    const pattern = /^\w{3,20}$/;
    if (!username || !pattern.test(username)) {
        alert("Username cannot be empty and must be between 3–20 characters!");
        return;
    }

    socket.emit('Register_attempt', username, password);
});

// End Registation Section -----------------------------------------

// For the "About" section --------------
const aboutSection = document.getElementById('about-section');
const aboutBtn = document.getElementById('about-button');
const backToLoginBtn = document.getElementById('back-to-login-button');

// Toggle to About Screen
aboutBtn.addEventListener('click', () => {
    loginSection.style.display = 'none';
    aboutSection.style.display = 'block';
});

// Toggle back to Login Screen
backToLoginBtn.addEventListener('click', () => {
    aboutSection.style.display = 'none';
    loginSection.style.display = 'block';
});

// End of About --------------------------- 

const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages-container');
const privateChatInput = document.getElementById('private-chat-input');
const privateSendBtn = document.getElementById('private-send-button');
const privateMessageContainer = document.getElementById('private-messages-container');
const onlineUsersList = document.getElementById('online-users');

// Keep track of identities globally inside the client app state
let myIdentity = { username: '', nickname: '', friends: []};
let activeChatTarget = ''; // the username we are talking to privately
let currentRoomId = ''; // the current room the user is in for private messaging

// Login section
submitBtn.addEventListener('click', () => {
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    const pattern = /^\w{3,20}$/;
    if (!username || !pattern.test(username)) {
        alert("Username cannot be empty and must be between 3–20 characters!");
        return;
    }

    socket.emit('login_attempt', username, password);
});

socket.on('Login_Validation', (data) => {
    if (!data.success) {
        alert("Error: Login Failed! Check your username.");
        return;
    }
    // Save our runtime profile details
    myIdentity.username = data.username;
    myIdentity.nickname = data.nickname;
    myIdentity.friends = data.friends || [];
    // SPA Pivot: Hide login div, show chat div
    loginSection.style.display = 'none';
    chatSection.style.display = 'block';
});

// Public chat section
function sendPublicMessage() {
    const message = chatInput.value.trim();
    if (!message) return; 

    // Emit to server
    socket.emit('public_message', message);
    chatInput.value = ''; 
    chatInput.focus();
}

sendBtn.addEventListener('click', sendPublicMessage);
chatInput.addEventListener('keypress', (e) => {
    socket.emit("typing"); //telling server user is typing
    if (e.key === 'Enter') sendPublicMessage();
});

socket.on('receive_public_message', (data) => {
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = "margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eee;";
    
    const timestamp = new Date().toLocaleTimeString();
    
    // Always sanitize incoming data to prevent XSS attacks
    const safeSender = DOMPurify.sanitize(data.sender);
    const safeText = DOMPurify.sanitize(data.text);
    
    msgDiv.innerHTML = `<strong>${safeSender}</strong> <span style="font-size: 0.8em; color: gray;">[${timestamp}]</span><br>${safeText}`;
    
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll to bottom
});

// Private chat section

// SPA Toggling: Close private panel, show public
closePrivateBtn.addEventListener('click', () => {
    privateChat.style.display = 'none';
    publicChat.style.display = 'block';
    activeChatTarget = ''; // Clear target tracking
});

// Online users section --------------------------------------
// Opens a private chat window with the target user
function openPrivateChat(targetUsername, targetNickname) {
    const newRoomId = [myIdentity.username, targetUsername].sort().join('_');
    
    // If shifting rooms, leave the old one
    if (currentRoomId && currentRoomId !== newRoomId) {
        socket.emit('leave_private_room', currentRoomId);
    }
    
    // Set current room ID, chat target and change title
    currentRoomId = newRoomId;
    activeChatTarget = targetUsername;
    privateChatTitle.innerText = `Chatting with ${targetNickname}`;
    
    // Clear prior history and swap UI panels
    privateMessageContainer.innerHTML = '';
    publicChat.style.display = 'none';
    privateChat.style.display = 'block';
    
    // Register room connection inside server engine
    socket.emit('join_private_room', { 
        myUsername: myIdentity.username, 
        targetUsername: activeChatTarget 
    });
}

// Updates whenever anyone logs in or out
socket.on('user_list_update', (users) => {
    // Clear both HTML lists
    onlineUsersList.innerHTML = '';
    if(friendsListContainer) friendsListContainer.innerHTML = '';
    
    // Build the "Currently Online Users" List
    users.forEach((userObj) => {
        if(userObj.username === myIdentity.username) return; // Skip ourselves

        const li = document.createElement('li');
        li.style.cssText = "padding: 5px 0; border-bottom: 1px solid #ddd; color: #333; cursor: pointer;";
        const safeNickname = DOMPurify.sanitize(userObj.nickname);
        li.innerHTML = `<span style="color: green;">●</span> ${safeNickname}`;

        // Make clickable for DMs
        li.addEventListener('click', () => {
            openPrivateChat(userObj.username, userObj.nickname);
        });

        onlineUsersList.appendChild(li);
    });

    // Build the Dynamic "My Friends" List
    if (friendsListContainer && myIdentity.friends && myIdentity.friends.length > 0) {
        myIdentity.friends.forEach(friendUsername => {
            // Check if this friend is currently in the 'users' online array
            const onlineFriend = users.find(u => u.username === friendUsername);
            
            const li = document.createElement('li');
            li.style.cssText = "padding: 5px 0; border-bottom: 1px solid #ddd; color: #333;";
            
            if (onlineFriend) {
                // Friend is ONLINE: Green dot, real nickname, and clickable
                li.innerHTML = `<span style="color: green;">●</span> ${DOMPurify.sanitize(onlineFriend.nickname)} <span style="font-size: 0.8em; color: gray;">(Online)</span>`;
                li.style.cursor = "pointer";
                li.addEventListener('click', () => {
                    openPrivateChat(onlineFriend.username, onlineFriend.nickname);
                });
            } else {
                // Friend is OFFLINE: Gray dot, username only, non-clickable
                li.innerHTML = `<span style="color: gray;">○</span> ${DOMPurify.sanitize(friendUsername)} <span style="font-size: 0.8em; color: gray;">(Offline)</span>`;
            }
            
            friendsListContainer.appendChild(li);
        });
    }
});

// Handles sending private messages
function sendPrivateMessage() {
    const message = privateChatInput.value.trim();
    if (!message || !activeChatTarget) return;

    // Emit to server
    socket.emit('private_message', { 
        myUsername: myIdentity.username, 
        targetUsername: activeChatTarget, 
        message 
    });
    // Resets chat input field and focuses for next message
    privateChatInput.value = ''; 
    privateChatInput.focus();
}
// Event listeners for private chat finish (Enter key)
privateSendBtn.addEventListener('click', sendPrivateMessage);
privateChatInput.addEventListener('keypress', (e) => {
    socket.emit("typing"); // tell server user is typing in private chat
    if (e.key === 'Enter') sendPrivateMessage();
});

// Handling receiving incoming private messages
socket.on('receive_private_message', (data) => {
    // Sets up expected room ID to check whether private message belongs to the current active room
    const expectedRoomId = [myIdentity.username, activeChatTarget].sort().join('_');
    if(data.room === expectedRoomId) { // Only display incoming private message if it matches the current active room
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = "margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eee;";
        
        const timestamp = new Date().toLocaleTimeString();
        const safeSender = DOMPurify.sanitize(data.sender);
        const safeText = DOMPurify.sanitize(data.text);
        
        msgDiv.innerHTML = `<strong>${safeSender} (Private)</strong> <span style="font-size: 0.8em; color: gray;">[${timestamp}]</span>: ${safeText}`;
        
        privateMessageContainer.appendChild(msgDiv);
        privateMessageContainer.scrollTop = privateMessageContainer.scrollHeight;
    }else{ //If message from another room, log it
        console.log("Background message received from another room: ", data.room);
    }
}); // Properly closed the message listener

// typing status indicator listener
socket.on('typing', function(){
    console.log("Typing event detected.");
    
    // Show the typing indicator on whichever chat panel is currently visible
    if (publicChat.style.display !== 'none') {
        $(".public-ticontainer").show();
        setTimeout(() => { $(".public-ticontainer").hide() }, 2000);
    } else if (privateChat.style.display !== 'none') {
        $(".private-ticontainer").show();
        setTimeout(() => { $(".private-ticontainer").hide() }, 2000);
    }
});