const express = require('express');
const { db } = require('../config/db');

const router = express.Router();

/**
 * GET /api/registrations
 * Returns all registrations from Firestore, newest first
 */
router.get('/', async (_req, res) => {
    console.log('\n──────────────────────────────────────');
    console.log('📤 GET /api/registrations — fetching all registrations');
    console.log('──────────────────────────────────────');

    try {
        const snapshot = await db.collection('registrations')
            .orderBy('createdAt', 'desc')
            .get();

        const registrations = [];
        snapshot.forEach((doc) => {
            registrations.push({ id: doc.id, ...doc.data() });
        });

        console.log(`✅ Found ${registrations.length} registration(s)`);
        registrations.forEach((r) => {
            console.log(`   📋 ${r.id} — ${r.restaurantName} (${r.status})`);
        });
        console.log('──────────────────────────────────────\n');

        return res.status(200).json({
            count: registrations.length,
            registrations,
        });
    } catch (err) {
        console.error('❌ Fetch registrations error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch registrations.' });
    }
});

module.exports = router;
