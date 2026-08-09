const http = require("http");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

// Port the Next.js app is serving on. Next falls back to 3001+ when 3000 is
// taken, so this must match the port `npm run dev` actually reported.
const APP_PORT = Number(process.env.APP_PORT) || 3000;

console.log("Initializing WhatsApp Bot Client...");
console.log(`Will forward incoming messages to http://localhost:${APP_PORT}/api/whatsapp/webhook`);

// Configure Client with local authentication storage and a stable remote web cache
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./.wwebjs_auth"
  }),
  // No webVersionCache pin on purpose. whatsapp-web.js injects helpers that call
  // WhatsApp Web's internal modules by name (WAWebFindChatAction, etc.), so the
  // page bundle has to be the one this library version was built against —
  // Constants.js webVersion, currently 2.3000.1017054665. Pinning a third-party
  // snapshot made WWebJS.getChat() return nothing, and sendMessage() answers a
  // missing chat with a silent `undefined` rather than an error.
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

// The bot's own WhatsApp id, captured on ready. Used to detect self-sends,
// which WhatsApp routes to the "Message Yourself" chat instead of a normal one.
let selfWid = null;

// Triggered when successfully connected
client.on("ready", async () => {
  selfWid = client.info?.wid?._serialized ?? null;
  console.log("WhatsApp Bot is ready and authenticated!");
  console.log(`[Session] Linked account: ${selfWid ?? "unknown"}`);
  try {
    console.log(`[Session] WhatsApp Web version: ${await client.getWWebVersion()}`);
  } catch {
    console.warn("[Session] Could not read WhatsApp Web version.");
  }
});

// Guest phone numbers arrive unnormalized (CSV upload stores them verbatim):
// "0771234567", "+94711122334", "+940774505860" (both the country code AND the
// trunk 0 — malformed), and genuine foreign numbers like "+44791190056".
// A wrong id is not an error at send time: WhatsApp accepts it locally and
// silently drops it, so normalizing correctly here is what makes delivery work.
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, "");

  // "940774505860" -> "94774505860" (country code followed by a trunk 0)
  if (digits.startsWith("940") && digits.length === 12) {
    return "94" + digits.slice(3);
  }
  // "0771234567" -> "94771234567" (local Sri Lankan form)
  if (digits.startsWith("0") && digits.length === 10) {
    return "94" + digits.slice(1);
  }
  // "771234567" -> "94771234567" (subscriber number with nothing in front)
  if (digits.length === 9 && digits.startsWith("7")) {
    return "94" + digits;
  }
  // Anything else is assumed already international (+1, +44, ...) — leave it be.
  return digits;
}

// ACK codes reported by WhatsApp for a message we sent.
const ACK_LABELS = {
  "-1": "ERROR",
  0: "PENDING (never reached WhatsApp servers)",
  1: "SERVER (accepted by WhatsApp, not on device yet)",
  2: "DEVICE (delivered to recipient)",
  3: "READ",
  4: "PLAYED",
};

// sendMessage() resolves as soon as WhatsApp Web accepts the message into its
// local store — that is NOT delivery. Poll the ack so the log tells the truth.
async function reportDelivery(sentMessage, label) {
  const id = sentMessage?.id?._serialized;
  if (!id) {
    // WhatsApp Web returned nothing for the send — the message does not exist,
    // so this is a hard failure, not merely an unconfirmed delivery.
    throw new Error(
      "sendMessage returned no message object — nothing was sent (usually an unsupported or unresolvable chat id)"
    );
  }
  console.log(`[Delivery] ${label}: queued as ${id} to ${sentMessage.to}`);

  let ack = sentMessage.ack ?? 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      const fresh = await client.getMessageById(id);
      ack = fresh?.ack ?? ack;
    } catch (err) {
      console.warn(`[Delivery] ${label}: could not re-read message (${err.message}).`);
      break;
    }
    if (ack >= 2) break;
  }

  const description = ACK_LABELS[String(ack)] ?? `UNKNOWN (${ack})`;
  if (ack >= 2) {
    console.log(`[Delivery] ${label}: CONFIRMED — ack=${ack} ${description}`);
  } else {
    console.error(`[Delivery] ${label}: NOT DELIVERED — ack=${ack} ${description}`);
  }
}

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
    port: APP_PORT,
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

    const digitsOnly = normalizePhone(phone);
    const rawDigits = String(phone).replace(/\D/g, "");
    if (digitsOnly !== rawDigits) {
      console.log(`[Queue Processor] Normalized phone ${phone} -> ${digitsOnly}`);
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

      // getNumberId is only a registration check. On LID-migrated accounts it
      // returns a "<lid>@lid" id, and sendMessage to an @lid target resolves
      // without producing a message in whatsapp-web.js 1.34.7 — nothing is sent.
      // Always address the phone-number form; it is valid now that the number
      // itself is normalized correctly.
      const chatId = digitsOnly + "@c.us";
      if (numberId._serialized !== chatId) {
        console.log(`[Queue Processor] WhatsApp resolved ${digitsOnly} to ${numberId._serialized}; sending via ${chatId}.`);
      }

      if (selfWid && chatId === selfWid) {
        console.warn(
          `[Queue Processor] Target ${chatId} is the bot's own linked number. ` +
          `WhatsApp files self-sends under "Message Yourself" — check that chat, not a contact thread.`
        );
      }

      // 1. Human-like pause before sending (3-6 seconds)
      const pauseTime = Math.floor(Math.random() * 3000) + 3000;
      console.log(`[Queue Processor] Pausing ${pauseTime / 1000}s before sending to ${chatId}...`);
      await new Promise((resolve) => setTimeout(resolve, pauseTime));

      // 2. Resolve the chat first. sendMessage() reports an unresolvable chat as
      // a silent `undefined`, so surface it here where the cause is still clear.
      let chat = null;
      try {
        chat = await client.getChatById(chatId);
      } catch (chatErr) {
        throw new Error(
          `could not open a chat for ${chatId} (${chatErr.message}). ` +
          `This usually means the injected WhatsApp Web build does not match ` +
          `whatsapp-web.js — check for a webVersionCache pin.`
        );
      }
      if (!chat) {
        throw new Error(
          `WhatsApp returned no chat for ${chatId}; the message cannot be sent.`
        );
      }

      // 3. Send, then confirm it actually left for the recipient's device.
      console.log(`[Queue Processor] Sending message to ${chatId}...`);
      const sent = await client.sendMessage(chatId, message);
      await reportDelivery(sent, recipient ?? digitsOnly);
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
