const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let adminChatId = null;

function sendTelegram(chatId, text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: text
    });

    const req = https.request(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => resolve(body));
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("E-KENZO Telegram Bot Server is running.");
  }

  if (req.method === "POST" && req.url === "/telegram/webhook") {
    try {
      const update = JSON.parse(await getBody(req));

      if (update.message && update.message.chat) {
        adminChatId = update.message.chat.id;

        if (update.message.text === "/start") {
          await sendTelegram(
            adminChatId,
            "✅ E-KENZO Order Bot is connected!\n\nអ្នកអាចទទួល Order ពី E-KENZO នៅទីនេះ។"
          );
        }
      }

      res.writeHead(200);
      return res.end("OK");
    } catch (error) {
      res.writeHead(400);
      return res.end("Bad Request");
    }
  }

  if (req.method === "POST" && req.url === "/send-order") {
    try {
      if (!adminChatId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          success: false,
          message: "Telegram Bot មិនទាន់បានចុច Start ទេ។"
        }));
      }

      const order = JSON.parse(await getBody(req));

      const message =
`🛒 NEW E-KENZO ORDER

🎮 Roblox: ${order.robloxUsername || "-"}
📦 Package: ${order.package || "-"}
💵 Price: ${order.price || "-"}
📱 Telegram: ${order.telegramUsername || "-"}
🆔 Order ID: ${order.orderId || "-"}
🔴 Status: ${order.status || "NOT PAID"}`;

      await sendTelegram(adminChatId, message);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        success: false,
        message: "Failed to send Telegram message."
      }));
    }
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`E-KENZO server running on port ${PORT}`);
});
