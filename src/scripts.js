document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Check if user is logged in on page load
    checkAuthStatus();

    // Add event listeners
    loginBtn.addEventListener('click', login);
    logoutBtn.addEventListener('click', logout);

    // Check auth status with the server
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'include' // Needed to include the cookie
            });
            
            if (response.ok) {
                const userData = await response.json();
                showUserInfo(userData);
            } else {
                showLoginButton();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            showLoginButton();
        }
    }

    // Show user info when logged in
    function showUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        
        userAvatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        userName.textContent = user.username;
        
        userInfo.style.display = 'flex';
        loginBtn.style.display = 'none';
    }

    // Show login button when not logged in
    function showLoginButton() {
        document.getElementById('user-info').style.display = 'none';
        loginBtn.style.display = 'flex';
    }

    // Login function
    function login() {
        window.location.href = '/api/auth/discord';
    }

    // Logout function
    function logout() {
        fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include' // Needed to include the cookie
        }).then(() => {
            window.location.reload();
        });
    }
});