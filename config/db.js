const admin = require('firebase-admin');

let db;

try {
    // Parse the JSON service account from .env
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Firebase service account JSON parsed successfully');
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    console.log(`   Client Email: ${serviceAccount.client_email}`);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');

    db = admin.firestore();
    console.log('✅ Firestore instance created');

    // Quick connectivity check — try listing collections
    db.listCollections()
        .then((collections) => {
            console.log(`✅ Firestore connection verified — found ${collections.length} collection(s)`);
            collections.forEach((col) => console.log(`   📂 ${col.id}`));
        })
        .catch((err) => {
            console.error('❌ Firestore connection check failed:', err.message);
        });

} catch (err) {
    console.error('❌ Firebase initialization FAILED:', err.message);
    process.exit(1);
}

module.exports = { db };
