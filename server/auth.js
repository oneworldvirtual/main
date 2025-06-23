const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Discord OAuth2 configuration
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const DISCORD_API = 'https://discord.com/api/v10';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '7d'; // 1 week

// Auth routes
router.get('/discord', (req, res) => {
    const authURL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify`;
    res.redirect(authURL);
});

router.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // Exchange auth code for token
        const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to get token');
        }

        const tokenData = await tokenResponse.json();
        
        // Get user data with the token
        const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        if (!userResponse.ok) {
            throw new Error('Failed to get user data');
        }

        const userData = await userResponse.json();

        // Create JWT token with user data
        const token = jwt.sign(
            { 
                id: userData.id,
                username: userData.username,
                avatar: userData.avatar,
                discord_token: tokenData.access_token
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // Send the token as a cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.redirect('/');
    } catch (error) {
        console.error('Auth error:', error);
        res.redirect('/?error=auth_error');
    }
});

router.get('/status', (req, res) => {
    const token = req.cookies.auth_token;
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Don't send the discord token back to the client
        const { discord_token, ...userData } = decoded;
        
        res.json(userData);
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

module.exports = router;