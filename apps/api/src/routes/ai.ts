// POST /review/:requestId — NEAR AI Cloud check + attestation, post_ai_review (W-8.1)
import { Hono } from "hono";

export const ai = new Hono();
ai.all("*", (c) => c.json({ error: "not implemented" }, 501));
