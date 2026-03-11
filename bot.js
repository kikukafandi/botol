// File: bot.js
require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { catatKeNotion, lihatTugasDariNotion } = require('./notion');
// Import modul buatan sendiri
const { DATA_KULIAH, JADWAL_KULIAH } = require('./data');
const { tanyaGemini } = require('./ai');
const { buatTugasDiDocs } = require('./docs');

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

// Konfigurasi bot untuk menggunakan IPv4 agar stabil
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: true,
    request: {
        agentOptions: { family: 4 }
    }
});
let cacheHarian = {};

console.log("🤖 Bot sedang berjalan di komputer lokal...");

// ==========================================
// MENANGANI PERINTAH TELEGRAM
// ==========================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text ? msg.text : "";

    if (chatId !== TELEGRAM_CHAT_ID) return;
    if (!text) return;

    // 1. Cek apakah ini perintah sistem (pakai garis miring)
    if (text.toLowerCase().startsWith('/start') || text.toLowerCase().startsWith('/help')) {
        const helpText = "🤖 <b>Bot Asisten Kuliah & AI Aktif!</b>\n\n" +
            "Perintah Sistem:\n" +
            "📅 /jadwal - Cek jadwal kuliah hari ini\n" +
            "🗓️ /jadwal_semua - Cek jadwal full 1 minggu\n" +
            "🔑 /cek_token - Cek apakah token ETHOL valid\n" +
            "📝 /kerjakan [soal] - Suruh AI ngerjain tugas di Docs\n" +
            "📌 /catat [tugas] - Catat tugas ke To-Do List Notion\n\n" +
            "💡 <i>Tip: Kamu bisa langsung ketik pesan apa saja untuk ngobrol sama AI Botol!</i>";
        bot.sendMessage(chatId, helpText, { parse_mode: "HTML" });
    }
    else if (text.toLowerCase().startsWith('/jadwal_semua')) {
        kirimJadwalKeseluruhan(chatId);
    }
    else if (text.toLowerCase().startsWith('/jadwal')) {
        kirimJadwalHariIni(chatId);
    }
    else if (text.toLowerCase().startsWith('/cek_token')) {
        cekValiditasToken(chatId);
    }

    // ---> FITUR TASK MANAGER: MURNI CATAT TUGAS KE NOTION <---
    else if (text.toLowerCase().startsWith('/catat ')) {
        const isiPesan = text.substring(7).trim(); // Ambil pesan setelah kata "/catat "

        bot.sendMessage(chatId, "⏳ Siap Bos! Sedang mencatat tugas ini ke kalender Notion-mu...");

        try {
            // Ambil baris pertama sebagai "Judul Tugas"
            const barisPertama = isiPesan.split('\n')[0].trim();
            const namaTugas = barisPertama ? barisPertama : "Tugas Baru";

            // Eksekusi API Notion (tanpa AI & Docs)
            await catatKeNotion(namaTugas, isiPesan);

            bot.sendMessage(chatId, `✅ <b>Tugas Berhasil Masuk Notion!</b>\n\n📌 <b>Judul:</b> ${namaTugas}\n\n<i>*Cek tabel Notion-mu sekarang!</i>`, { parse_mode: "HTML" });
        } catch (error) {
            bot.sendMessage(chatId, "⚠️ Gagal nyatet ke Notion. Cek log terminal ya Bos!\n" + error.message);
        }
    }

    // ---> FITUR AUTO-STUDENT: MURNI BIKIN TUGAS DI DOCS <---
    else if (text.toLowerCase().startsWith('/kerjakan ')) {
        const soalTugas = text.substring(10);

        bot.sendMessage(chatId, "⏳ Siap Bos! Otak AI sedang mikir dan tangan robot lagi ngetik di Google Docs...");

        try {
            const promptTugas = `Tolong kerjakan tugas ini dengan bahasa akademis mahasiswa yang rapi, lengkap dengan poin-poin dan buatkan daftar pustaka yang relevan di akhir. Ini tugasnya:\n\n${soalTugas}`;
            const jawabanAI = await tanyaGemini(promptTugas, chatId);

            const judulFile = "Tugas_Otomatis_Afandi_" + new Date().getTime();
            const linkDocs = await buatTugasDiDocs(judulFile, jawabanAI);

            bot.sendMessage(chatId, `✅ <b>Tugas Beres Bos!</b>\n\nLangsung cek dan rapihin dikit di sini:\n${linkDocs}`, { parse_mode: "HTML" });
        } catch (error) {
            bot.sendMessage(chatId, "⚠️ Waduh, ada error pas bikin Docs: " + error.message);
        }
    }
    // ---> FITUR TASK MANAGER: LIHAT TUGAS DARI NOTION <---
    else if (text.toLowerCase().startsWith('/lihat_tugas')) {
        bot.sendMessage(chatId, "⏳ Siap Bos! Botol lagi ngebuka buku catatan Notion-mu...");

        try {
            const daftarTugas = await lihatTugasDariNotion();
            bot.sendMessage(chatId, daftarTugas, { parse_mode: "Markdown" });
        } catch (error) {
            bot.sendMessage(chatId, "⚠️ Waduh, bot gagal baca Notion. Coba cek lagi permission (Connections) Notion-nya ya Bos!\nError: " + error.message);
        }
    }
    // 2. Jika bukan perintah sistem, anggap ini ajakan ngobrol ke AI!
    else {
        bot.sendChatAction(chatId, 'typing');
        const jawabanAI = await tanyaGemini(text, chatId);
        bot.sendMessage(chatId, jawabanAI, { parse_mode: "Markdown" });
    }
});

// ==========================================
// LOGIKA AKADEMIK & ETHOL
// ==========================================
function getNamaMatkul(idKuliah) {
    const matkul = DATA_KULIAH.find(m => m.nomor == idKuliah);
    return matkul ? matkul.matakuliah.nama : `Mata Kuliah ${idKuliah}`;
}

function kirimJadwalKeseluruhan(chatId) {
    const namaHari = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    let pesan = `🗓️ <b>JADWAL KULIAH KESELURUHAN</b> 🗓️\n\n`;
    let adaJadwal = false;

    for (let i = 1; i <= 7; i++) {
        const jadwalHariIni = JADWAL_KULIAH.filter(j => j.nomor_hari === i);

        if (jadwalHariIni.length > 0) {
            adaJadwal = true;
            pesan += `<b>-- ${namaHari[i]} --</b>\n`;
            jadwalHariIni.sort((a, b) => timeToMinutes(a.jam_awal) - timeToMinutes(b.jam_awal));

            jadwalHariIni.forEach(jadwal => {
                const ruang = jadwal.ruang ? jadwal.ruang : "Online / TBD";
                pesan += `📚 ${getNamaMatkul(jadwal.kuliah)}\n⏰ ${jadwal.jam_awal} - ${jadwal.jam_akhir} | 🚪 ${ruang}\n\n`;
            });
        }
    }

    if (!adaJadwal) pesan += "<i>Belum ada jadwal yang terdaftar di sistem.</i>";
    bot.sendMessage(chatId, pesan, { parse_mode: "HTML" });
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
    bot.sendMessage(chatId, pesan, { parse_mode: "HTML" });
}

async function cekValiditasToken(chatId) {
    const testUrl = "https://ethol.pens.ac.id/api/presensi/terakhir-kuliah?kuliah=219233&jenis_schema=4";
    try {
        const response = await fetch(testUrl, { method: "GET", headers: HEADERS });
        if (response.ok) {
            bot.sendMessage(chatId, "✅ <b>Token ETHOL Masih Valid!</b>\nBot siap melakukan presensi otomatis.", { parse_mode: "HTML" });
        } else if (response.status === 401) {
            bot.sendMessage(chatId, "❌ <b>Token Expired! (Status 401)</b>\nSilakan update token ETHOL kamu di .env / Render.", { parse_mode: "HTML" });
        } else {
            bot.sendMessage(chatId, `⚠️ Status: ${response.status}`, { parse_mode: "HTML" });
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
                    bot.sendMessage(TELEGRAM_CHAT_ID, `✅ <b>PRESENSI BERHASIL!</b>\n\nMata Kuliah: ${matkul.matakuliah.nama}\nWaktu: ${data.tanggal_format}`, { parse_mode: "HTML" });
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

                    bot.sendMessage(TELEGRAM_CHAT_ID, pesan, { parse_mode: "HTML" });
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