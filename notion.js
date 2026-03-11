// File: notion.js
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Header sakti buat nembus pintu Notion
const HEADERS = {
    "Authorization": `Bearer ${NOTION_TOKEN}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
};

// ==========================================
// FITUR 1: MENCATAT TUGAS KE NOTION
// ==========================================
async function catatKeNotion(namaTugas, isiDetailTugas) {
    try {
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 7);
        const formatDeadline = deadlineDate.toISOString().split('T')[0];

        const payload = {
            parent: { database_id: DATABASE_ID },
            properties: {
                "Name": { title: [{ text: { content: namaTugas } }] },
                "Date": { date: { start: formatDeadline } }
            },
            children: [
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ text: { content: isiDetailTugas.substring(0, 2000) } }]
                    }
                }
            ]
        };

        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Notion API Error: ${errText}`);
        }
        
        console.log("✅ Berhasil mencatat tugas ke Notion!");
        return await response.json();
    } catch (error) {
        console.error("❌ Gagal mencatat:", error.message);
        throw error;
    }
}

// ==========================================
// FITUR 2: BACA TUGAS DARI NOTION
// ==========================================
async function lihatTugasDariNotion() {
    try {
        const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({}) // Kirim body kosong untuk ambil semua data
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Notion API Error: ${errText}`);
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return "🎉 Yeay! Nggak ada tugas di Notion-mu (atau database masih kosong). Waktunya rebahan!";
        }

        let pesan = "📋 *DAFTAR TUGAS DI NOTION:*\n\n";
        
        data.results.forEach((page, index) => {
            // 1. Ambil Nama Tugas
            const namaProps = page.properties['Name'];
            let namaTugas = "Tugas Tanpa Nama";
            if (namaProps && namaProps.title && namaProps.title.length > 0) {
                namaTugas = namaProps.title[0].plain_text;
            }

            // 2. Ambil Tanggal Deadline
            const dateProps = page.properties['Date'];
            let tenggatWaktu = "Tidak ada deadline";
            if (dateProps && dateProps.date && dateProps.date.start) {
                tenggatWaktu = dateProps.date.start;
            }

            // 3. Ambil Status
            const statusProps = page.properties['Status'];
            let statusTugas = "Belum Diset";
            if (statusProps) {
                if (statusProps.select) statusTugas = statusProps.select.name;
                else if (statusProps.status) statusTugas = statusProps.status.name;
            }

            pesan += `${index + 1}. *${namaTugas}*\n   📌 Status: ${statusTugas}\n   📅 Deadline: ${tenggatWaktu}\n\n`;
        });

        return pesan;
    } catch (error) {
        console.error("❌ Gagal mengambil tugas:", error.message);
        throw error;
    }
}

module.exports = { catatKeNotion, lihatTugasDariNotion };