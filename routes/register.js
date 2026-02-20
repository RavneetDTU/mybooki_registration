const express = require('express');
const multer = require('multer');
const { db } = require('../config/db');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

// Multer — keep file in memory buffer, accept only JPG and PDF, max 10 MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG and PDF files are allowed.'));
        }
    },
});

/**
 * POST /api/register
 *
 * Body (multipart/form-data):
 *   - name, email, password
 *   - restaurantName, restaurantEmail, restaurantPhone, restaurantAddress
 *   - contactName, contactPhone, contactEmail
 *   - verificationDoc (file — JPG or PDF, max 10 MB)
 */
router.post('/', upload.single('verificationDoc'), async (req, res) => {
    console.log('\n──────────────────────────────────────');
    console.log('📥 POST /api/register — request received');
    console.log('──────────────────────────────────────');

    try {
        const {
            name, email, password,
            restaurantName, restaurantEmail, restaurantPhone, restaurantAddress,
            contactName, contactPhone, contactEmail,
        } = req.body;

        console.log('📝 Form data received:');
        console.log(`   Name: ${name}`);
        console.log(`   Email: ${email}`);
        console.log(`   Restaurant: ${restaurantName}`);
        console.log(`   Restaurant Email: ${restaurantEmail}`);
        console.log(`   Restaurant Phone: ${restaurantPhone}`);
        console.log(`   Address: ${restaurantAddress}`);
        console.log(`   Contact: ${contactName} | ${contactPhone} | ${contactEmail}`);
        console.log(`   File attached: ${req.file ? req.file.originalname + ' (' + (req.file.size / 1024).toFixed(1) + ' KB)' : 'None'}`);

        // ── Basic validation ──
        if (!name || !email || !password) {
            console.log('❌ Validation failed — missing account details');
            return res.status(400).json({ error: 'Account details (name, email, password) are required.' });
        }
        if (!restaurantName || !restaurantEmail || !restaurantPhone || !restaurantAddress) {
            console.log('❌ Validation failed — missing restaurant details');
            return res.status(400).json({ error: 'All restaurant details are required.' });
        }
        if (!contactName || !contactPhone || !contactEmail) {
            console.log('❌ Validation failed — missing contact details');
            return res.status(400).json({ error: 'Contact person details are required.' });
        }
        console.log('✅ Validation passed');

        // ── Upload verification doc to Cloudinary (if provided) ──
        let verificationDocUrl = null;
        let verificationDocName = null;

        if (req.file) {
            console.log('☁️  Uploading document to Cloudinary...');
            verificationDocName = req.file.originalname;

            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'mybooki-registrations',
                        resource_type: 'auto',
                        allowed_formats: ['jpg', 'pdf'],
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });

            verificationDocUrl = uploadResult.secure_url;
            console.log(`✅ Document uploaded to Cloudinary`);
            console.log(`   URL: ${verificationDocUrl}`);
        } else {
            console.log('ℹ️  No document attached — skipping Cloudinary upload');
        }

        // ── Store in Firestore ──
        console.log('💾 Saving registration to Firestore...');

        const registrationData = {
            name,
            email,
            password, // TODO: hash this before storing in production

            restaurantName,
            restaurantEmail,
            restaurantPhone,
            restaurantAddress,

            contactName,
            contactPhone,
            contactEmail,

            verificationDocUrl,
            verificationDocName,

            status: 'pending_approval',
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('registrations').add(registrationData);

        console.log(`✅ Registration saved to Firestore`);
        console.log(`   Document ID: ${docRef.id}`);
        console.log(`   Collection: registrations`);
        console.log(`   Status: pending_approval`);
        console.log('──────────────────────────────────────\n');

        return res.status(201).json({
            message: 'Registration submitted successfully. We will review and approve within 24 working hours.',
            registrationId: docRef.id,
        });
    } catch (err) {
        console.error('❌ Registration error:', err.message);
        console.error('   Stack:', err.stack);

        if (err.message === 'Only JPG and PDF files are allowed.') {
            return res.status(400).json({ error: err.message });
        }

        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

module.exports = router;
