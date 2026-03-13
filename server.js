require('dotenv').config();

const express = require('express');
const cors = require('cors');

const registerRoute = require('./routes/register');
const registrationsRoute = require('./routes/registrations');
const authProxyRoute = require('./routes/auth-proxy');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
app.use('/api/register', registerRoute);
app.use('/api/registrations', registrationsRoute);
app.use('/api/auth', authProxyRoute);

// ── Health check ──
app.get('/', (_req, res) => {
    res.json({ status: 'Registration backend is running' });
});

// ── Start ──
app.listen(PORT, () => {
    console.log(`Registration server running on http://localhost:${PORT}`);
});
