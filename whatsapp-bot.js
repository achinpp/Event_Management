const http = require("http");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

console.log("Initializing WhatsApp Bot Client...");

// Configure Client with local authentication storage and a stable remote web cache
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./.wwebjs_auth"
  }),
  webVersionCache: {
    type: "remote",
    remotePath: "https://raw.githubusercontent.com/AshleyB-C/AshBot/refs/heads/main/web-version-cache/2.3000.10173612353.html"
  },
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

// Generate QR Code in the terminal console when needed
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("\n==================================================");
  console.log("Scan the QR code above with your WhatsApp Business app!");
  console.log("Go to Linked Devices -> Link a Device.");
  console.log("==================================================\n");
});

// Triggered when successfully connected
client.on("ready", () => {
  console.log("WhatsApp Bot is ready and authenticated!");
});

// Triggered on authentication failure
client.on("auth_failure", (msg) => {
  console.error("WhatsApp Authentication failed:", msg);
});

// Listen for incoming messages and forward to Next.js
client.on("message", async (msg) => {
  // msg.from looks like "94771234567@c.us" -> convert to "+94771234567"
  const phone = "+" + msg.from.split("@")[0];
  const text = msg.body;

  // Ignore empty messages (e.g. stickers, images without caption, status updates)
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return;
  }

  console.log(`\n[Incoming Message] Phone: ${phone} | Content: "${text}"`);

  // Forward the message to the Next.js API Webhook
  const postData = JSON.stringify({ phone, message: text });
  
  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/api/whatsapp/webhook",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = http.request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });

    res.on("end", async () => {
      try {
        if (res.statusCode === 200) {
          const json = JSON.parse(body);
          if (json.reply) {
            console.log(`[AI Response Generated] sending back to ${phone}: "${json.reply}"`);
            await client.sendMessage(msg.from, json.reply);
          }
        } else {
          console.error(`Next.js webhook returned status ${res.statusCode}:`, body);
        }
      } catch (err) {
        console.error("Error parsing Next.js webhook response:", err.message);
      }
    });
  });

  req.on("error", (err) => {
    console.error("Failed to forward incoming WhatsApp message to Next.js webhook:", err.message);
  });

  req.write(postData);
  req.end();
});

// --- Rate-limited Message Queue ---
const messageQueue = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const task = messageQueue.shift();
    if (!task) continue;
    const { phone, message, recipient } = task;

    // Clean and normalize phone number (e.g. 0771234567 -> 94771234567)
    let digitsOnly = String(phone).replace(/\D/g, "");
    if (digitsOnly.startsWith("0")) {
      digitsOnly = "94" + digitsOnly.slice(1);
    }

    try {
      console.log(`\n[Queue Processor] Processing invite for: ${recipient ?? digitsOnly}`);
      
      // Check if number is registered on WhatsApp
      let numberId = null;
      try {
        numberId = await client.getNumberId(digitsOnly);
      } catch (checkErr) {
        console.warn(`[Queue Processor] Could not verify registration for ${digitsOnly}: ${checkErr.message}`);
      }

      if (!numberId) {
        console.warn(`[Queue Processor] Skipped ${digitsOnly} (${recipient ?? "Unknown"}): Phone number is not registered on WhatsApp.`);
        if (messageQueue.length > 0) {
          const waitTime = Math.floor(Math.random() * 2000) + 2000;
          console.log(`[Queue Processor] Waiting ${waitTime / 1000}s before next dispatch...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        continue;
      }

      // Use phone number directly with @c.us (not the LID from getNumberId which doesn't deliver)
      const chatId = digitsOnly + "@c.us";

      // 1. Human-like pause before sending (3-6 seconds)
      const pauseTime = Math.floor(Math.random() * 3000) + 3000;
      console.log(`[Queue Processor] Pausing ${pauseTime / 1000}s before sending to ${chatId}...`);
      await new Promise((resolve) => setTimeout(resolve, pauseTime));

      // 2. Send the message directly (works even for new contacts)
      console.log(`[Queue Processor] Sending message to ${chatId}...`);
      await client.sendMessage(chatId, message);
      console.log(`[Queue Processor] Sent successfully to ${chatId}.`);
    } catch (err) {
      console.error(`[Queue Processor] Failed to send message to ${digitsOnly}:`, err.message);
    }

    // 3. Human-like delay before sending next message: random 5 to 12 seconds
    if (messageQueue.length > 0) {
      const waitTime = Math.floor(Math.random() * 7000) + 5000;
      console.log(`[Queue Processor] Waiting ${waitTime / 1000}s before next dispatch to mimic human behavior...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  isProcessingQueue = false;
}

// REST HTTP Server for Next.js to send outbound invites
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/send") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const { phone, message, recipient } = payload;

        if (!phone || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Missing 'phone' or 'message' parameters." }));
        }

        // Add to background processor queue
        messageQueue.push({ phone, message, recipient });
        processQueue(); // Fire background processor (non-blocking)

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, status: "Queued" }));
      } catch (err) {
        console.error("Failed to queue WhatsApp message:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Start the HTTP listener
server.listen(5001, () => {
  console.log("WhatsApp HTTP Outbox server listening on port 5001");
});

// Initialize client
client.initialize();
