var socket = io(); //connect to the Socket.io Server
socket.on("connect", () => { //connected to the server
  console.log(`Connected to Socket.io server: 
    ${socket.io.opts.hostname}, port: ${socket.io.opts.port}`);
});

// varriable declaration 
//*********************************************************************************************************************/


// Declaring submit button element
var submitBtnElm = document.getElementById('Submit-button');
if (!submitBtnElm){  // Ensuring submit buttons found
    console.log("Error in getting 'Submit-button' button");
}



// Event Listeners
//*********************************************************************************************************************/

submitBtnElm.addEventListener('click', LoginAttempt);


// Functions 
//*********************************************************************************************************************/
function LoginAttempt() {
    //getting username value
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value; //to-do set up client side password pattern check

    //checking for valid username
    const pattern = /^\w{3,20}$/;
    if (!username || !pattern.test(username)) {
        alert("Username cannot be empty and must be between 3–20 characters!!!");
        return;
    }

    //sending to server
    socket.emit('login_attempt', username, password);
    console.log("Username sent to server.") 
}

// Server Monitoring
//*********************************************************************************************************************/
socket.on('Login_Validation', function(data){

    if(!data.success){
        console.log("Login failed:", data.message);
        alert("Error: Login Failed!");
        return;
    }

    sessionStorage.setItem("nickname", data.nickname);
    sessionStorage.setItem("friends", JSON.stringify(data.friends));

    window.location.href = "dummy_chat.html";
});