// File: ai.js
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Objek untuk menyimpan memori percakapan berdasarkan Chat ID
const userMemories = {};

async function tanyaGemini(pertanyaan, chatId) {
    try {
        // Jika belum ada memori untuk chatId ini, buat sesi chat baru
        if (!userMemories[chatId]) {
            userMemories[chatId] = await ai.chats.create({
                model: 'gemini-3.1-flash-lite-preview',
                config: {
                    systemInstruction: "Kamu adalah 'Botol', asisten AI pribadi untuk mahasiswa Teknik Komputer PENS bernama Afandi. Jawablah setiap pertanyaan dengan gaya bahasa sehari-hari yang santai, gaul, agak sedikit sarkas tapi tetap sangat membantu. Gunakan emoji yang sesuai."
                }
            });
        }

        // Kirim pesan ke sesi chat yang sudah menyimpan memori sebelumnya
        const response = await userMemories[chatId].sendMessage({ message: pertanyaan });
        return response.text;
        
    } catch (error) {
        console.error("Error dari Gemini API:", error);
        return "⚠️ Waduh, otak AI-ku lagi nge-blank nih (Error API). Coba lagi nanti ya!";
    }
}

module.exports = { tanyaGemini };