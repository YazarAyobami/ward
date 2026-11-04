// POST / — 1Click /v0/quote dry:true (W-8.2)
import { Hono } from "hono";

export const quote = new Hono();
quote.all("*", (c) => c.json({ error: "not implemented" }, 501));
