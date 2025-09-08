const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const fs = require('fs');
const path = require('path');

// Session directory path
const SESSION_DIR = '.wwebjs_auth';
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

// NEW WEBHOOK URL - Updated with your new URL
const WEBHOOK_URL = 'https://muradanjum.app.n8n.cloud/webhook-test/b579e8e2-3e0b-4dee-9f53-1f9b30f96ff5';

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

// QR code event
client.on("qr", (qr) => {
    console.log("📱 QR Code generate hua, phone se scan karo:");
    qrcode.generate(qr, { small: true });
});

// Authentication event
client.on("authenticated", () => {
    console.log("✅ Authentication successful! Session saved.");
});

// Bot ready
client.on("ready", () => {
    console.log("✅ WhatsApp bot ready hai!");
    console.log("🤖 Webhook URL:", WEBHOOK_URL);
    console.log("🚀 Bot ab messages process karega");
});

// Function to send message to n8n cloud webhook
async function sendToN8N(message, from) {
    try {
        console.log('📤 Sending to n8n webhook...');
        console.log('🔗 URL:', WEBHOOK_URL);
        console.log('💬 Message:', message);
        console.log('👤 From:', from);

        const res = await axios.post(
            WEBHOOK_URL,  // NEW URL HERE
            { 
                from: from,
                message: message,
                timestamp: new Date().toISOString()
            },
            { 
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WhatsApp-Bot/1.0'
                }
            }
        );

        console.log('✅ n8n response status:', res.status);
        
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
