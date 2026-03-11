require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Membuat halaman web sederhana
app.get('/', (req, res) => {
    res.send('Bot Presensi Aktif dan Berjalan Mulus! 🚀');
});

app.listen(port, () => {
    console.log(`Server web bot menyala di port ${port}`);
});



// ==========================================
// 1. KONFIGURASI UTAMA
// ==========================================
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

// Inisialisasi Bot dengan metode Polling
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});
let cacheHarian = {};

// ==========================================
// 2. DATA AKADEMIK
// ==========================================
const DATA_KULIAH = [
    {"nomor": 219233, "kuliah_asal": 219233, "jenisSchema": 4, "matakuliah": { "nama": "Praktikum Pengolahan Sinyal dan Citra" }},
    {"nomor": 219254, "kuliah_asal": 219254, "jenisSchema": 4, "matakuliah": { "nama": "Praktikum Sistem Cerdas" }},
    {"nomor": 219112, "kuliah_asal": 219112, "jenisSchema": 4, "matakuliah": { "nama": "K3L dan Standar Internasional" }},
    {"nomor": 219124, "kuliah_asal": 219124, "jenisSchema": 4, "matakuliah": { "nama": "Sistem Cerdas" }},
    {"nomor": 219121, "kuliah_asal": 219121, "jenisSchema": 4, "matakuliah": { "nama": "Pengolahan Sinyal dan Citra" }},
    {"nomor": 219187, "kuliah_asal": 219187, "jenisSchema": 4, "matakuliah": { "nama": "Praktikum Desain dan Organisasi Komputer" }},
    {"nomor": 219118, "kuliah_asal": 219118, "jenisSchema": 4, "matakuliah": { "nama": "Alat Pengembangan Perangkat Lunak" }},
    {"nomor": 219197, "kuliah_asal": 219197, "jenisSchema": 4, "matakuliah": { "nama": "Praktikum Alat Pengembangan Perangkat Lunak" }},
    {"nomor": 219115, "kuliah_asal": 219115, "jenisSchema": 4, "matakuliah": { "nama": "Desain dan Organisasi Komputer" }},
    {"nomor": 219037, "kuliah_asal": 219037, "jenisSchema": 4, "matakuliah": { "nama": "Jaringan Komputer" }},
    {"nomor": 219177, "kuliah_asal": 219177, "jenisSchema": 4, "matakuliah": { "nama": "Praktikum Jaringan Komputer" }},
    {"nomor": 219156, "kuliah_asal": 219156, "jenisSchema": 4, "matakuliah": { "nama": "Statistik & Probabilitas" }}
];

const JADWAL_KULIAH = [
    {"kuliah": 219037, "hari": "Selasa", "jam_awal": "10:30", "jam_akhir": "11:50", "nomor_hari": 2, "ruang": "A 303"},
    {"kuliah": 219233, "hari": "Rabu", "jam_awal": "08:50", "jam_akhir": "10:10", "nomor_hari": 3, "ruang": "HI-204"},
    {"kuliah": 219156, "hari": "Senin", "jam_awal": "08:50", "jam_akhir": "10:10", "nomor_hari": 1, "ruang": "B 203"},
    {"kuliah": 219118, "hari": "Selasa", "jam_awal": "08:00", "jam_akhir": "09:20", "nomor_hari": 2, "ruang": "A 302"},
    {"kuliah": 219115, "hari": "Kamis", "jam_awal": "08:50", "jam_akhir": "10:10", "nomor_hari": 4, "ruang": "A 304"},
    {"kuliah": 219177, "hari": "Senin", "jam_awal": "13:00", "jam_akhir": "14:20", "nomor_hari": 1, "ruang": "HI-202"},
    {"kuliah": 219197, "hari": "Senin", "jam_awal": "14:40", "jam_akhir": "16:00", "nomor_hari": 1, "ruang": "HI-202"},
    {"kuliah": 219187, "hari": "Kamis", "jam_awal": "10:30", "jam_akhir": "11:50", "nomor_hari": 4, "ruang": "HI-301"},
    {"kuliah": 219254, "hari": "Rabu", "jam_awal": "13:50", "jam_akhir": "15:10", "nomor_hari": 3, "ruang": "HI-303"},
    {"kuliah": 219112, "hari": "Selasa", "jam_awal": "14:40", "jam_akhir": "16:00", "nomor_hari": 2, "ruang": "HH-101"},
    {"kuliah": 219121, "hari": "Kamis", "jam_awal": "13:00", "jam_akhir": "14:20", "nomor_hari": 4, "ruang": null},
    {"kuliah": 219124, "hari": "Kamis", "jam_awal": "14:40", "jam_akhir": "16:00", "nomor_hari": 4, "ruang": null}
];

// ==========================================
// 3. MENANGANI PERINTAH TELEGRAM
// ==========================================
console.log("🤖 Bot sedang berjalan di komputer lokal...");

bot.on('message', (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text ? msg.text.toLowerCase() : "";

    if (chatId !== TELEGRAM_CHAT_ID) return;

    if (text.startsWith('/start') || text.startsWith('/help')) {
        const helpText = "🤖 <b>Bot Asisten Kuliah Aktif (Mode Lokal)!</b>\n\n" +
                         "Perintah yang tersedia:\n" +
                         "📅 /jadwal - Cek jadwal kuliah hari ini\n" +
                         "🔑 /cek_token - Cek apakah token ETHOL valid\n" +
                         "ℹ️ /help - Menampilkan pesan ini";
        // Mengubah parse_mode menjadi HTML
        bot.sendMessage(chatId, helpText, {parse_mode: "HTML"});
    } 
    else if (text.startsWith('/jadwal')) {
        kirimJadwalHariIni(chatId);
    } 
    else if (text.startsWith('/cek_token')) {
        cekValiditasToken(chatId);
    }
});

// ==========================================
// 4. LOGIKA PERINTAH
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
    
    if (!adaJadwal) pesan += "<i>Tidak ada jadwal kuliah hari ini.</i>";
    // Mengubah parse_mode menjadi HTML
    bot.sendMessage(chatId, pesan, {parse_mode: "HTML"});
}

async function cekValiditasToken(chatId) {
    const testUrl = "https://ethol.pens.ac.id/api/presensi/terakhir-kuliah?kuliah=219233&jenis_schema=4";
    try {
        const response = await fetch(testUrl, { method: "GET", headers: HEADERS });
        if (response.ok) {
            bot.sendMessage(chatId, "✅ <b>Token ETHOL Masih Valid!</b>\nBot siap melakukan presensi otomatis.", {parse_mode: "HTML"});
        } else if (response.status === 401) {
            bot.sendMessage(chatId, "❌ <b>Token Expired! (Status 401)</b>\nSilakan update token di script.", {parse_mode: "HTML"});
        } else {
            bot.sendMessage(chatId, `⚠️ Status: ${response.status}`, {parse_mode: "HTML"});
        }
    } catch (e) {
        bot.sendMessage(chatId, "⚠️ Error jaringan: " + e.message);
    }
}

// ==========================================
// 5. CORE OTOMATISASI (PRESENSI & REMINDER)
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
            console.error(`Error pada ${matkul.nomor}:`, e.message);
        }
        
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