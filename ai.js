require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function tanyaGemini(pertanyaan) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: pertanyaan,
            config: {
                systemInstruction: "Kamu adalah 'Botol', asisten AI pribadi untuk mahasiswa Teknik Komputer PENS bernama Afandi. Jawablah setiap pertanyaan dengan gaya bahasa sehari-hari yang santai, gaul, agak sedikit sarkas tapi tetap sangat membantu. Gunakan emoji yang sesuai."
            }
        });
        
        return response.text;
    } catch (error) {
        console.error("Error dari Gemini API:", error);
        return "⚠️ Waduh, otak AI-ku lagi nge-blank nih (Error API). Coba lagi nanti ya!";
    }
}

module.exports = { tanyaGemini };