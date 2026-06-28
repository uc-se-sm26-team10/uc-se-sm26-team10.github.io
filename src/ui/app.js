const socket = io();

// DOM section
const loginSection = document.getElementById('login-section');
const chatSection = document.getElementById('chat-section');
const submitBtn = document.getElementById('Submit-button');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

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
const onlineUsersList = document.getElementById('online-users');


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

// Online users section
socket.on('user_list_update', (users) => {
    // Clear the current HTML list
    onlineUsersList.innerHTML = '';
    
    users.forEach((user) => {
        const li = document.createElement('li');
        li.style.cssText = "padding: 5px 0; border-bottom: 1px solid #ddd; color: #333;";
        
        const safeUser = DOMPurify.sanitize(user);
        li.innerHTML = `<span style="color: green;">●</span> ${safeUser}`;
        
        onlineUsersList.appendChild(li);
    });
});