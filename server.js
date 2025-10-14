//---------------section One---------------------------------
const http = require("http"); // require is used to import a module
// http -> built in Node.js module for creating web servers
const fs = require("fs"); // lets us read/write files
const path = require("path"); // Helps build file paths correctly
const crypto = require("crypto");

const PORT = 3000;
const WEBHOOKS_DIR = path.join(__dirname, "webhooks");
const LOGS_DIR = path.join(__dirname, "logs");

// Create directories if they don't exist
// Sync = Do it now, wait for it to finish (synchronous)
if (!fs.existsSync(WEBHOOKS_DIR)) fs.mkdirSync(WEBHOOKS_DIR);
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);
//-----------------------Section End------------------------------

// ----------------------section Two------------------------------
// Logging utility

//What Does This Function Do?
// Simple answer: Saves messages to both:

// Console (so you can see them in terminal)
// Log file (so you have a permanent record)
function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}\n`;
  console.log(logMessage.trim());

  // result : C:\Users\chava\Desktop\webhook-logger\logs\2025-10-11.log
  // Want to see what happened on October 11? Open 2025-10-11.log
  const logFile = path.join(
    LOGS_DIR,
    `${new Date().toISOString().split("T")[0]}.log`
  );
  // log file just give us the path and the file name that we want
  // .appendFileSync() actually takes the path as first parameter
  // second parameter as the actual data !!
  //Adds to end of file (keeps old content)
  fs.appendFileSync(logFile, logMessage);
}
// ------------------------Section End--------------------------------

//-----------------------section Three-------------------------------
// Parse request body
// Reads data from POST requests

//Data doesn't arrive all at once - it comes in pieces (chunks).
// We need to collect all pieces before using it.
function parseBody(req) {
  // req = The request object (contains incoming data from GitHub/etc)
  return new Promise((resolve, reject) => {
    // promise ->When I'm done, I'll call you back.
    // Because reading data takes time (it's asynchronous). We can't return the data immediately.
    let body = ""; // we'll sstore everything in here
    //---------------1 Event Listerner----------
    req.on("data", (chunk) => (body += chunk.toString()));
    // Data arrives as raw bytes (Buffer). We convert it to readable text (String).
    // ---------------2 Event Listerner----------
    req.on("end", () => {
      // this event is for ->  "When all data has arrived, do this"
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        //What if JSON.parse() fails?
        // Example: Body is not valid JSON
        //body = "This is not JSON!"
        // JSON.parse(body);  // ERROR!
        resolve({ raw: body });
      }
    });
    req.on("error", reject);
  });
}
// ---------------------------Section end---------------------------------

//-------------------------section four-----------------------------------
// Verify GitHub signature

// What Does This Function Do?
// Simple answer: Proves that a webhook really came from GitHub
// (not a hacker pretending to be GitHub).

// Like verifying someone's ID before letting them in.
function verifyGitHubSignature(payload, signature, secret) {
  // payload = The webhook data (JavaScript object)
  // signature = Signature GitHub sent (from header)
  //secret = Your secret password
  if (!signature) return false;

  //HMAC = Hash-based Message Authentication Code
  // HMAC - Special algorithm that creates signatures
  const hmac = crypto.createHmac("sha256", secret);

  //hmac.update(...) = Feed the string into the HMAC calculator
  // Like putting ingredients into a blender!
  hmac.update(JSON.stringify(payload));

  const calculatedSignature = "sha256=" + hmac.digest("hex");
  // .digest() -> Blend it and give me the result
  // Calculate the signature

  //Always takes the same time regardless of where the difference is!
  //Regular comparison (===) compares character by character and stops at the first difference

  // Why use timingSafeEqual instead of ===?
  // Prevents timing attacks
  return crypto.timingSafeEqual(
    //Converts strings to Buffers (raw bytes) for secure comparison
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
  // syntax -> crypto.timingSafeEqual(signature1, signature2)
}

//------------------------Example for Hmac signature creation-----------
/*
// Step 1: Create HMAC with algorithm + secret
const hmac = crypto.createHmac('sha256', 'my_secret_123');

// Step 2: Add the message/data
hmac.update('This is the message');  // ← Message goes here!

// Step 3: Generate signature
const signature = hmac.digest('hex');
*/

// ------------------------Section End------------------------------------

// -------------------------section five ---------------------------------

// Save webhook to file

/*
What Does This Function Do?
Simple answer: Saves webhook data as a JSON file on your computer.
Think of it as: Taking a photo (webhook)
and saving it to your photo album (webhooks folder).
*/

// this function specific saves in log dir and then parllel calls the
// log function to also save the data in logs dir (message,status/type)
function saveWebhook(webhookData) {
  //webhookData = An object containing all the webhook information
  const timestamp = Date.now();
  const filename = `webhook_${timestamp}.json`;
  //Combines folder + filename:
  const filepath = path.join(WEBHOOKS_DIR, filename);

  /*
  fs.writeFileSync(
  filepath,    // WHERE to save
  data         // WHAT to save
  );
  */
  //Sync = Synchronous
  // Waits until file is saved before continuing
  fs.writeFileSync(filepath, JSON.stringify(webhookData, null, 2));
  /*
  Parameter 1: webhookData = The object to convert
  Parameter 2: null = Replacer function (we don't need it, so null)
  Parameter 3: 2 = Number of spaces for indentation (makes it pretty!)
 */

  log(`Webhook saved: ${filename}`, "SUCCESS");
  //Uses our log function from earlier to record
  return filename;

  //Returns the filename so other parts of the code know what file was created.
  // Example usage:
  // const savedFile = saveWebhook(data);
  // console.log('Saved as:', savedFile);
}
// ---------------------------Section end-------------------------------

//-------------------------section six---------------------------------

//What Does This Function Do?
// Simple answer: Reads all webhook files from the webhooks/
// folder and returns them as an array.

// Get all webhooks
function getAllWebhooks() {
  //Result: Array of JSON filenames, newest first!
  const files = fs // Each method operates on result of previous(method chaining)
    .readdirSync(WEBHOOKS_DIR) // Get all files names in array format
    .filter((f) => f.endsWith(".json")) // Keep only JSON
    .sort() // Sort oldest→newest
    .reverse(); // Flip to newest→oldest

  // .map() -> transforms each item in an array.

  /*
    Complete flow:
    filename 
      → build path 
        → read file (get text) 
          → parse JSON (get object)
            → store in `data`
    */
  return files.map((file) => {
    const data = JSON.parse(fs.readFileSync(path.join(WEBHOOKS_DIR, file)));
    return {
      id: file,
      ...data, //The ... is called the spread operator.
      //  It "spreads out" all properties from an object
    };
  });
}
/*
 With spread
{
  id: "webhook_123.json",
  ...data     // Spreads properties 
}
 Result: { id: "...", timestamp: "...", source: "..." }
 */
//-------------------------------Section end--------------------------

// Serve static files
function serveStaticFile(res, filepath, contentType) {
  fs.readFile(filepath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

// Main server
const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  log(`${method} ${url}`);

  // Serve frontend
  if (url === "/" || url === "/index.html") {
    serveStaticFile(
      res,
      path.join(__dirname, "public", "index.html"),
      "text/html"
    );
  } else if (url === "/style.css") {
    serveStaticFile(
      res,
      path.join(__dirname, "public", "style.css"),
      "text/css"
    );
  } else if (url === "/app.js") {
    serveStaticFile(
      res,
      path.join(__dirname, "public", "app.js"),
      "application/javascript"
    );
  }

  // API: Get all webhooks
  else if (url === "/api/webhooks" && method === "GET") {
    try {
      const webhooks = getAllWebhooks();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(webhooks));
    } catch (error) {
      log(`Error fetching webhooks: ${error.message}`, "ERROR");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }

  // Webhook receiver endpoint
  else if (url.startsWith("/webhook/") && method === "POST") {
    try {
      const body = await parseBody(req);
      const source = url.split("/webhook/")[1];

      const webhookData = {
        timestamp: new Date().toISOString(),
        source: source,
        headers: req.headers,
        payload: body,
        processed: false,
        status: "received",
      };

      // GitHub signature verification (optional - set GITHUB_SECRET env variable)
      if (source === "github" && process.env.GITHUB_SECRET) {
        const signature = req.headers["x-hub-signature-256"];
        const isValid = verifyGitHubSignature(
          body,
          signature,
          process.env.GITHUB_SECRET
        );

        webhookData.signatureValid = isValid;

        if (!isValid) {
          log("Invalid GitHub signature!", "WARNING");
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid signature" }));
          return;
        }
      }

      // Save webhook
      const filename = saveWebhook(webhookData);

      // Process webhook (you'll add logic here later)
      processWebhook(webhookData);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: "Webhook received",
          id: filename,
        })
      );

      log(`Webhook received from ${source}`, "SUCCESS");
    } catch (error) {
      log(`Error processing webhook: ${error.message}`, "ERROR");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to process webhook" }));
    }
  }

  // 404 for unknown routes
  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
});

// Process webhook (placeholder for your logic)
function processWebhook(webhookData) {
  // This is where you'll add your processing logic
  // Examples:
  // - Send notifications
  // - Trigger deployments
  // - Update databases
  // - Call other APIs

  log(`Processing webhook from ${webhookData.source}...`, "INFO");

  // For GitHub webhooks, you can check the event type
  if (webhookData.source === "github") {
    const event = webhookData.headers["x-github-event"];
    log(`GitHub event: ${event}`, "INFO");

    // Example: Handle push event
    if (event === "push") {
      const commits = webhookData.payload.commits?.length || 0;
      const branch = webhookData.payload.ref?.split("/").pop();
      log(`Received ${commits} commits to branch ${branch}`, "INFO");
    }
  }
}

server.listen(PORT, () => {
  log(`Webhook server running on http://localhost:${PORT}`, "SUCCESS");
  log(`Webhook endpoint: http://localhost:${PORT}/webhook/{source}`, "INFO");
  log(`Example: http://localhost:${PORT}/webhook/github`, "INFO");
});
