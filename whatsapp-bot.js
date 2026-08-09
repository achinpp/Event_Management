const http = require("http");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

console.log("Initializing WhatsApp Bot Client...");

// Configure Client with local authentication storage
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./.wwebjs_auth"
  }),
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
        const { phone, message } = payload;

        if (!phone || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Missing 'phone' or 'message' parameters." }));
        }

        // Format to WhatsApp JID format (e.g. +94771234567 -> 94771234567@c.us)
        const cleanedPhone = phone.replace("+", "").replace(/\s+/g, "") + "@c.us";

        console.log(`[Outbox Outreach] Sending to ${cleanedPhone}: "${message}"`);
        await client.sendMessage(cleanedPhone, message);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, status: "Sent" }));
      } catch (err) {
        console.error("Failed to send WhatsApp message:", err.message);
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
