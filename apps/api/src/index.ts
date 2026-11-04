// Ward API — OPTIONAL (Could): AI receipt check + 1Click dry-run quote (ARCHITECTURE §9).
// The core product works without this service.
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { receipts } from "./routes/receipts.js";
import { ai } from "./routes/ai.js";
import { quote } from "./routes/quote.js";

const app = new Hono();
app.get("/health", (c) => c.json({ ok: true }));
app.route("/receipts", receipts);
app.route("/ai", ai);
app.route("/quote", quote);
serve({ fetch: app.fetch, port: Number(process.env.API_PORT ?? 8787) });
