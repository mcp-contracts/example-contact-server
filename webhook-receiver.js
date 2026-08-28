#!/usr/bin/env node

// Tiny webhook receiver for testing mcpdiff --webhook.
// Zero dependencies — just node:http.
//
// Usage:
//   node webhook-receiver.js
//
// Then in another terminal:
//   npx mcpdiff diff --webhook http://localhost:8080/webhook <before> <after>
//   npx mcpdiff check --watch --webhook http://localhost:8080/webhook

import { createServer } from "node:http";

const PORT = process.env.PORT || 8080;

const server = createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const timestamp = new Date().toISOString();
      console.log(`\n── Webhook received ${timestamp} ──`);
      console.log(`  ${req.method} ${req.url}`);
      try {
        const payload = JSON.parse(body);
        const summary = payload.report?.summary;
        console.log(`  Event:    ${payload.event ?? "?"}`);
        console.log(`  Breaking: ${summary?.breaking ?? "?"}`);
        console.log(`  Warnings: ${summary?.warning ?? "?"}`);
        console.log(`  Safe:     ${summary?.safe ?? "?"}`);
        console.log(`  Payload:  ${JSON.stringify(payload, null, 2)}`);
      } catch {
        console.log(`  Raw body: ${body}`);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true }));
    });
  } else {
    res.writeHead(405);
    res.end("Method not allowed");
  }
});

server.listen(PORT, () => {
  console.log(`Webhook receiver listening on http://localhost:${PORT}`);
  console.log("Waiting for POST requests...\n");
});
