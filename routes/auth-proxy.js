const express = require('express');
const axios = require('axios');
const router = express.Router();

// Define the internal URL for your 5016 app
// If they are on the same machine, localhost is perfect.
const AUTH_SERVICE_URL = 'http://localhost:6000';

// 1. Proxy Route for Initial Google Login
router.post('/google', async (req, res) => {
    try {
        // We forward the exact body we received from the frontend to the 5016 app
        const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/google`, req.body);
        
        // Return exactly what the 5016 app responded with back to the frontend
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error proxying to 5016 /api/auth/google:", error.message);
        
        // If the 5016 app returned an error, pass that exact error back to the frontend
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ error: 'Internal Server Error while communicating with Auth service' });
    }
});

// 2. Proxy Route for Refreshing Token
router.post('/refresh', async (req, res) => {
    try {
        // Forward the refresh request to 5016
        const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/refresh`, req.body);
        
        // Send the new access token back to the frontend
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error proxying to 5016 /api/auth/refresh:", error.message);
        
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ error: 'Internal Server Error while communicating with Auth service' });
    }
});

// 3. Proxy Route for Getting all User Calendars
router.get('/calendars/:userId', async (req, res) => {
    try {
        const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/calendars/${req.params.userId}`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error proxying to 5016 /api/auth/calendars:", error.message);
        if (error.response) return res.status(error.response.status).json(error.response.data);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. Proxy Route for Getting Calendar Events
router.get('/events/:calendarId', async (req, res) => {
    try {
        // Forward the query payload (like ?date=2026-03-20) if any
        const dateQuery = req.query.date ? `?date=${req.query.date}` : '';
        const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/events/${req.params.calendarId}${dateQuery}`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error proxying to 5016 /api/auth/events:", error.message);
        if (error.response) return res.status(error.response.status).json(error.response.data);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;
