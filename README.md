A real-time webhook monitoring and logging system built with Node.js. Receive, validate, and track incoming webhooks from external services like GitHub, Stripe, Shopify, and more.

## Project Structure
```
webhook-logger/
├── server.js           # Main Node.js server
├── public/
│   ├── index.html      # Dashboard UI
│   ├── style.css       # Dashboard styles
│   └── app.js          # Frontend JavaScript
├── webhooks/           # Stored webhook JSON files
├── logs/               # Daily application logs
└── README.md
```

## How It Works

1. External services (GitHub, Stripe, etc.) send webhook POST requests to your server
2. Server receives and validates the webhook using signature verification
3. Webhook data is saved to a JSON file with timestamp
4. Dashboard displays all received webhooks in real-time
5. Click on any webhook to inspect headers, payload, and metadata
