const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--disable-software-rasterizer',
        ],
    }
});

// QR code event
client.on("qr", (qr) => {
    console.log("QR Code generate hua, phone se scan karo 👇");
    qrcode.generate(qr, { small: true });
});

// Bot ready
client.on("ready", () => {
    console.log("WhatsApp bot ready hai ✅");
});

// Function to send message to n8n cloud webhook
async function sendToN8N(message, from) {
    try {
        const res = await axios.post(
            'https://muradanjum.app.n8n.cloud/webhook-test/cd60a282-5296-497a-bde3-932edccaf3f2',
            { from, message }
        );

        if (res.data.reply) {
            await client.sendMessage(from, res.data.reply);
        }
        console.log('Message sent to n8n cloud', res.data);
    } catch (err) {
        console.error('Error sending to n8n cloud', err.message);
    }
}

// Message event
client.on("message", async (message) => {
    console.log(`Message aaya: ${message.body}`);
    await sendToN8N(message.body, message.from);
});

// Initialize the bot
client.initialize();
