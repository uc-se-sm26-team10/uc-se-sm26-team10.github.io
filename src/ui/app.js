const socket = io();

// DOM section
const loginSection = document.getElementById('login-section');
const chatSection = document.getElementById('chat-section');
const submitBtn = document.getElementById('Submit-button');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Private chat DOM section
const publicChat = document.getElementById('public-chat');
const privateChat = document.getElementById('private-chat');
const closePrivateBtn = document.getElementById('close-private-btn');
const privateChatTitle = document.getElementById('private-chat-title');


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
let myIdentity = { username: '', nickname: '' };
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

// Online users section
socket.on('user_list_update', (users) => {
    // Clear the current HTML list
    onlineUsersList.innerHTML = '';
    
    users.forEach((userObj) => {
        // Skip adding ourselves to our own DM selection list 
        if(userObj.username === myIdentity.username) return;

        const li = document.createElement('li');
        li.style.cssText = "padding: 5px 0; border-bottom: 1px solid #ddd; color: #333; cursor: pointer;";
        
        const safeNickname = DOMPurify.sanitize(userObj.nickname);
        li.innerHTML = `<span style="color: green;">●</span> ${safeNickname}`;

        // CLICK EVENT: Toggles panel visibility state just like Login/About shifts
        li.addEventListener('click', () => {
            const newRoomId = [myIdentity.username, userObj.username].sort().join('_');
            // If shifting rooms, leave the old one
            if (currentRoomId && currentRoomId !== newRoomId) {
                socket.emit('leave_private_room', currentRoomId);
            }
            // Set current room ID, chat target and change title
            currentRoomId = newRoomId;
            activeChatTarget = userObj.username;
            privateChatTitle.innerText = `Chatting with ${userObj.nickname}`;
            
            // Clear prior history from shared window container before loading new room
            privateMessagesContainer.innerHTML = '';
            // Hide public panel, show private panel
            publicChat.style.display = 'none';
            privateChat.style.display = 'block';
            
            // Register room connection inside server engine
            socket.emit('join_private_room', { 
                myUsername: myIdentity.username, 
                targetUsername: activeChatTarget 
            });
        });

        onlineUsersList.appendChild(li);
    });
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
});