// File: docs.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { authenticate } = require('@google-cloud/local-auth');

const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Scopes untuk Google Docs & Drive
const SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
];

async function loadSavedCredentialIfExist() {
    try {
        const content = fs.readFileSync(TOKEN_PATH, 'utf8');
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

async function saveCredential(client) {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = {
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(payload));
}

async function authorize() {
    let client = await loadSavedCredentialIfExist();
    if (client) {
        return client;
    }

    try {
        // PERHATIAN: Ini akan membuka browser di laptopmu untuk minta izin
        client = await authenticate({
            scopes: SCOPES,
            keyfilePath: CREDENTIALS_PATH,
        });
        if (client.credentials) {
            await saveCredential(client);
        }
        return client;
    } catch (err) {
        console.error('⚠️ Autentikasi gagal. Pastikan credentials.json format OAuth2 Desktop (bukan service account)');
        throw err;
    }
}

async function buatTugasDiDocs(judul, konten) {
    try {
        const auth = await authorize();
        const docs = google.docs({ version: 'v1', auth });
        const drive = google.drive({ version: 'v3', auth });

        // Buat dokumen
        const doc = await docs.documents.create({
            requestBody: { title: judul }
        });
        
        const documentId = doc.data.documentId;
        console.log(`📄 Dokumen dibuat: ${documentId}`);

        // Insert konten
        await docs.documents.batchUpdate({
            documentId: documentId,
            requestBody: {
                requests: [{
                    insertText: {
                        location: { index: 1 },
                        text: konten
                    }
                }]
            }
        });

        // Set permission public (Akan aman karena errornya di-catch kalau kampus memblokir)
        try {
            await drive.permissions.create({
                fileId: documentId,
                requestBody: {
                    role: 'writer',
                    type: 'anyone'
                }
            });
        } catch (permError) {
            console.warn('⚠️ Info: Gagal set link ke public (mungkin diblokir admin kampus), tapi file tetap berhasil dibuat di Google Drive kamu.');
        }

        const docLink = `https://docs.google.com/document/d/${documentId}/edit`;
        console.log(`✅ Dokumen siap: ${docLink}`);
        return docLink;

    } catch (error) {
        console.error("Gagal membuat Google Docs:", error.message);
        throw error; // Lempar error ke bot.js agar dikirim ke Telegram
    }
}

module.exports = { buatTugasDiDocs };