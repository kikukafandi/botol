// File: notion.js
require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function catatKeNotion(namaTugas, isiDetailTugas) {
    try {
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 7);
        const formatDeadline = deadlineDate.toISOString().split('T')[0];

        await notion.pages.create({
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
        });
        console.log("✅ Berhasil mencatat tugas ke Notion!");
    } catch (error) {
        console.error("❌ Gagal mencatat ke Notion:", error.body ? JSON.stringify(error.body) : error);
        throw error;
    }
}

// ---> FITUR BARU: BACA TUGAS DARI NOTION <---
async function lihatTugasDariNotion() {
    try {
        const response = await notion.databases.query({
            database_id: DATABASE_ID,
            // Opsional: Hanya ambil yang statusnya bukan "Done" (kalau error, bagian filter ini bisa dihapus)
        });

        if (response.results.length === 0) {
            return "🎉 Yeay! Nggak ada tugas di Notion-mu (atau database masih kosong). Waktunya rebahan!";
        }

        let pesan = "📋 *DAFTAR TUGAS DI NOTION:*\n\n";
        
        response.results.forEach((page, index) => {
            // Ambil Nama Tugas
            const namaProps = page.properties['Name'];
            let namaTugas = "Tugas Tanpa Nama";
            if (namaProps && namaProps.title && namaProps.title.length > 0) {
                namaTugas = namaProps.title[0].plain_text;
            }

            // Ambil Tanggal
            const dateProps = page.properties['Date'];
            let tenggatWaktu = "Tidak ada deadline";
            if (dateProps && dateProps.date && dateProps.date.start) {
                tenggatWaktu = dateProps.date.start;
            }

            // Ambil Status
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
        console.error("❌ Gagal mengambil tugas dari Notion:", error.body ? JSON.stringify(error.body) : error);
        throw error;
    }
}

module.exports = { catatKeNotion, lihatTugasDariNotion };