// POST / — store receipt, return sha256 (W-8.1)
import { Hono } from "hono";

export const receipts = new Hono();
receipts.all("*", (c) => c.json({ error: "not implemented" }, 501));
