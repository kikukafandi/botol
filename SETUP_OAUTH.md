# Setup OAuth2 untuk Google Docs API

## Langkah 1: Login ke Google Cloud Console
- Buka: https://console.cloud.google.com/
- Pilih project existing atau buat baru
- **Nama project**: `Botol-Docs` (sesuai keinginan)

## Langkah 2: Enable APIs
1. Di sidebar, klik **APIs & Services** → **Library**
2. Cari dan enable:
   - ✅ **Google Docs API**
   - ✅ **Google Drive API**

## Langkah 3: Setup OAuth2 Consent Screen
1. Di sidebar, klik **APIs & Services** → **OAuth consent screen**
2. Pilih **External** → **Create**
3. Isi form:
   - **App name**: `Botol`
   - **User support email**: `tirta.afandi24@gmail.com`
   - **Developer contact**: `tirta.afandi24@gmail.com`
4. Klik **Save and Continue**
5. Di "Scopes" → **Add or Remove Scopes**
6. Cari dan pilih:
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/drive`
7. Klik **Update** → **Save and Continue**
8. Di "Test users" → **Add Users** → masukkan `tirta.afandi24@gmail.com`
9. **Save and Continue** → **Back to Dashboard**

## Langkah 4: Create OAuth2 Credentials
1. Di sidebar, klik **APIs & Services** → **Credentials**
2. Klik **+ Create Credentials** → **OAuth client ID**
3. Pilih **Desktop application**
4. Klik **Create**
5. **Download JSON** (tombol download di kanan)
6. Rename file menjadi `credentials.json`
7. Replace file lama di folder `/home/kikuk/Documents/coding/botol/`

## Langkah 5: Jalankan Bot
```bash
npm start
```

Bot akan membuka browser untuk login pertama kali. Setelah login, token akan disimpan di `token.json`.

## Troubleshooting

**Error: "The redirect_uri does not match"**
- Pastikan di OAuth2 settings sudah ada `http://localhost:3000` atau `urn:ietf:wg:oauth:2.0:oob`

**Error: "Credentials not found"**
- Pastikan `credentials.json` ada di folder yang sama dengan `bot.js`

**"This app isn't verified"**
- Normal untuk development. Klik **Continue** → **Allow**
