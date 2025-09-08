const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const fs = require('fs');
const path = require('path');

// Session directory path
const SESSION_DIR = '.wwebjs_auth';
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

// Check if session exists
function sessionExists() {
    return fs.existsSync(SESSION_FILE);
}

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: SESSION_DIR,
        clientId: "github-actions-bot"
    }),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ],
    },
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 30000
});

// QR code event - only show if no session
client.on("qr", (qr) => {
    console.log("📱 QR Code generate hua, phone se scan karo:");
    qrcode.generate(qr, { small: true });
    console.log("⚠️ Yeh QR code sirf 60 seconds ke liye valid hai!");
    console.log("✅ Scan karne ke baad session save ho jayega");
});

// Authentication event
client.on("authenticated", () => {
    console.log("✅ Authentication successful! Session saved.");
});

// Bot ready
client.on("ready", () => {
    console.log("✅ WhatsApp bot ready hai!");
    console.log("🤖 Bot ab automatically messages process karega");
});

// Function to send message to n8n cloud webhook
async function sendToN8N(message, from) {
    try {
        console.log('📤 Sending to n8n webhook...');
        console.log('🔗 Webhook URL: https://muradanjum.app.n8n.cloud/webhook-test/cd60a282-5296-497a-bde3-932edccaf3f2');
        console.log('💬 Message:', message);
        console.log('👤 From:', from);

        const res = await axios.post(
            'https://muradanjum.app.n8n.cloud/webhook-test/cd60a282-5296-497a-bde3-932edccaf3f2',
            { 
                from: from,
                message: message,
                timestamp: new Date().toISOString()
            },
            { 
                timeout: 15000,  // 15 second timeout
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WhatsApp-Bot/1.0'
                }
            }
        );

        console.log('✅ n8n response status:', res.status);
        console.log('✅ n8n response data:', JSON.stringify(res.data));
        
        if (res.data && res.data.reply) {
            await client.sendMessage(from, res.data.reply);
            console.log('📩 Reply sent to user');
        } else {
            console.log('ℹ️ No reply from n8n');
        }
        
    } catch (err) {
        console.error('❌ n8n error:', err.message);
        if (err.response) {
            console.error('❌ HTTP status:', err.response.status);
            console.error('❌ Response data:', JSON.stringify(err.response.data));
        } else if (err.request) {
            console.error('❌ No response received from n8n');
            console.error('❌ Request details:', err.request);
        }
    }
}

// Message event
client.on("message", async (message) => {
    // Ignore status updates and group messages
    if (message.from === 'status@broadcast' || message.from.includes('@g.us')) {
        console.log('⏩ Ignoring group/status message');
        return;
    }
    
    console.log(`📩 New message from ${message.from}: ${message.body}`);
    console.log(`🔄 Processing message...`);
    
    await sendToN8N(message.body, message.from);
});

// Handle errors
client.on("auth_failure", (msg) => {
    console.log("❌ Authentication failed:", msg);
    if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
        console.log("🗑️ Corrupted session deleted. New QR code needed.");
    }
});

client.on("disconnected", (reason) => {
    console.log(`🔌 Bot disconnected: ${reason}`);
    console.log("🔄 Restarting in 10 seconds...");
    setTimeout(() => client.initialize(), 10000);
});

// Initialize the bot
console.log(sessionExists() ? "🔑 Existing session found, restoring..." : "🆕 New session needed, QR code will generate");
client.initialize();

// Graceful shutdown for GitHub Actions
process.on('SIGTERM', async () => {
    console.log('🔄 GitHub Actions is stopping the bot...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 Bot shutting down gracefully...');
    await client.destroy();
    process.exit(0);
});
