require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// Import modul buatan sendiri
const { DATA_KULIAH, JADWAL_KULIAH } = require('./data');
const { tanyaGemini } = require('./ai');

const app = express();
const port = process.env.PORT || 3000;

// SERVER WEB MINI (Untuk Keep-Alive di Render)
app.get('/', (req, res) => {
    res.send('Bot Presensi + AI Aktif dan Berjalan Mulus! 🚀');
});
app.listen(port, () => console.log(`Server web bot menyala di port ${port}`));

// KONFIGURASI UTAMA
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ETHOL_TOKEN = process.env.ETHOL_TOKEN;
const MAHASISWA_ID = 26680;

const HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "token": ETHOL_TOKEN, 
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "referer": "https://ethol.pens.ac.id/mahasiswa/kuliah/detail"
};

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});
let cacheHarian = {};

console.log("🤖 Bot sedang berjalan di komputer lokal...");

// ==========================================
// MENANGANI PERINTAH TELEGRAM
// ==========================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text ? msg.text : "";

    // Kunci Keamanan: Hanya merespons dari ID kamu
    if (chatId !== TELEGRAM_CHAT_ID) return;

    // Abaikan jika pesan bukan teks (misal: stiker, foto, dokumen)
    if (!text) return; 

    // 1. Cek apakah ini perintah sistem (pakai garis miring)
    if (text.toLowerCase().startsWith('/start') || text.toLowerCase().startsWith('/help')) {
        const helpText = "🤖 <b>Bot Asisten Kuliah & AI Aktif!</b>\n\n" +
                         "Perintah Sistem:\n" +
                         "📅 /jadwal - Cek jadwal kuliah hari ini\n" +
                         "🔑 /cek_token - Cek apakah token ETHOL valid\n\n" +
                         "💡 <i>Tip: Kamu bisa langsung ketik pesan apa saja (tanpa garis miring) untuk ngobrol sama AI Botol!</i>";
        bot.sendMessage(chatId, helpText, {parse_mode: "HTML"});
    } 
    else if (text.toLowerCase().startsWith('/jadwal')) {
        kirimJadwalHariIni(chatId);
    } 
    else if (text.toLowerCase().startsWith('/cek_token')) {
        cekValiditasToken(chatId);
    } 
    // 2. Jika bukan perintah sistem, anggap ini ajakan ngobrol ke AI!
    else {
        // Mengirim status "typing..." agar bot terlihat natural
        bot.sendChatAction(chatId, 'typing');
        
        // Langsung lempar teks utuh ke Gemini
        const jawabanAI = await tanyaGemini(text);
        bot.sendMessage(chatId, jawabanAI, {parse_mode: "Markdown"});
    }
});

// ==========================================
// LOGIKA AKADEMIK & ETHOL
// ==========================================
function getNamaMatkul(idKuliah) {
    const matkul = DATA_KULIAH.find(m => m.nomor == idKuliah);
    return matkul ? matkul.matakuliah.nama : `Mata Kuliah ${idKuliah}`;
}

function kirimJadwalHariIni(chatId) {
    const now = new Date();
    const currentHariIni = now.getDay() === 0 ? 7 : now.getDay(); 
    const hariStr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][now.getDay()];
    
    let pesan = `📅 <b>Jadwal Kuliah Hari Ini (${hariStr}):</b>\n\n`;
    let adaJadwal = false;

    JADWAL_KULIAH.forEach(jadwal => {
        if (jadwal.nomor_hari === currentHariIni) {
            adaJadwal = true;
            const ruang = jadwal.ruang ? jadwal.ruang : "Online / TBD";
            pesan += `📚 <b>${getNamaMatkul(jadwal.kuliah)}</b>\n⏰ ${jadwal.jam_awal} - ${jadwal.jam_akhir}\n🚪 Ruang: ${ruang}\n\n`;
        }
    });
    
    if (!adaJadwal) pesan += "<i>Tidak ada jadwal kuliah hari ini. Waktunya ngerjain project! 🚀</i>";
    bot.sendMessage(chatId, pesan, {parse_mode: "HTML"});
}

async function cekValiditasToken(chatId) {
    const testUrl = "https://ethol.pens.ac.id/api/presensi/terakhir-kuliah?kuliah=219233&jenis_schema=4";
    try {
        const response = await fetch(testUrl, { method: "GET", headers: HEADERS });
        if (response.ok) {
            bot.sendMessage(chatId, "✅ <b>Token ETHOL Masih Valid!</b>\nBot siap melakukan presensi otomatis.", {parse_mode: "HTML"});
        } else if (response.status === 401) {
            bot.sendMessage(chatId, "❌ <b>Token Expired! (Status 401)</b>\nSilakan update token ETHOL kamu di .env / Render.", {parse_mode: "HTML"});
        } else {
            bot.sendMessage(chatId, `⚠️ Status: ${response.status}`, {parse_mode: "HTML"});
        }
    } catch (e) {
        bot.sendMessage(chatId, "⚠️ Error jaringan: " + e.message);
    }
}

// ==========================================
// CORE OTOMATISASI (PRESENSI & REMINDER)
// ==========================================
function timeToMinutes(timeStr) {
    const [hours, mins] = timeStr.split(":");
    return parseInt(hours, 10) * 60 + parseInt(mins, 10);
}

async function cekDanJalankanPresensi() {
    const tanggalHariIni = new Date().toISOString().split('T')[0];

    for (const matkul of DATA_KULIAH) {
        const cacheKey = `absen_${matkul.nomor}_${tanggalHariIni}`;
        if (cacheHarian[cacheKey]) continue;

        const urlGet = `https://ethol.pens.ac.id/api/presensi/terakhir-kuliah?kuliah=${matkul.nomor}&jenis_schema=${matkul.jenisSchema}`;
        
        try {
            const responseGet = await fetch(urlGet, { method: "GET", headers: HEADERS });
            if (!responseGet.ok) continue;
            
            const data = await responseGet.json();
            
            if (data.ditemukan && data.open) {
                const urlPost = "https://ethol.pens.ac.id/api/presensi/mahasiswa";
                const payload = {
                    kuliah: matkul.nomor,
                    mahasiswa: MAHASISWA_ID,
                    jenis_schema: matkul.jenisSchema,
                    kuliah_asal: matkul.kuliah_asal,
                    key: data.key
                };
                
                const responsePost = await fetch(urlPost, {
                    method: "POST",
                    headers: HEADERS,
                    body: JSON.stringify(payload)
                });
                
                if (responsePost.ok) {
                    cacheHarian[cacheKey] = true;
                    bot.sendMessage(TELEGRAM_CHAT_ID, `✅ <b>PRESENSI BERHASIL!</b>\n\nMata Kuliah: ${matkul.matakuliah.nama}\nWaktu: ${data.tanggal_format}`, {parse_mode: "HTML"});
                }
            }
        } catch (e) {
            console.error(`Error absen ${matkul.nomor}:`, e.message);
        }
        
        // Jeda 2 detik agar tidak kena blokir rate-limit
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function cekDanKirimReminderOtomatis() {
    const now = new Date();
    const currentHariIni = now.getDay() === 0 ? 7 : now.getDay();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const tanggalHariIni = now.toISOString().split('T')[0];

    for (const jadwal of JADWAL_KULIAH) {
        if (jadwal.nomor_hari === currentHariIni) {
            const selisihWaktu = timeToMinutes(jadwal.jam_awal) - currentMins;
            
            if (selisihWaktu >= 0 && selisihWaktu <= 15) {
                const cacheKey = `reminder_${jadwal.kuliah}_${tanggalHariIni}`;
                if (!cacheHarian[cacheKey]) {
                    const ruang = jadwal.ruang || "Online";
                    const pesan = `🔔 <b>REMINDER KULIAH!</b> 🔔\n\nSiap-siap, kelas akan mulai:\n📚 <b>${getNamaMatkul(jadwal.kuliah)}</b>\n🚪 Ruang: ${ruang}\n⏰ ${jadwal.jam_awal} - ${jadwal.jam_akhir}`;
                    
                    bot.sendMessage(TELEGRAM_CHAT_ID, pesan, {parse_mode: "HTML"});
                    cacheHarian[cacheKey] = true;
                }
            }
        }
    }
}

// Menjalankan fungsi otomatis setiap 10 menit (600.000 milidetik)
setInterval(() => {
    console.log(`[${new Date().toLocaleTimeString()}] Mengecek presensi & reminder...`);
    cekDanKirimReminderOtomatis();
    cekDanJalankanPresensi();
}, 600000);