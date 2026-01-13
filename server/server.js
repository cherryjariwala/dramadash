import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Razorpay from "razorpay";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, "..");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Request Logging
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// 2. Debug Route
app.get("/api/debug", (req, res) => {
    res.json({
        status: "online",
        rootPath,
        files: fs.readdirSync(rootPath)
    });
});

// 3. Watchmode Proxies
app.get("/api/watchmode/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const url = `https://api.watchmode.com/v1/autocomplete-search/?apiKey=${process.env.WATCHMODE_API_KEY}&search_value=${encodeURIComponent(q)}&search_type=2`;
    try {
        const r = await fetch(url);
        res.json(await r.json());
    } catch (e) {
        res.status(500).json({ error: "Search failed" });
    }
});

app.get("/api/watchmode/details/:id", async (req, res) => {
    const url = `https://api.watchmode.com/v1/title/${req.params.id}/details/?apiKey=${process.env.WATCHMODE_API_KEY}`;
    try {
        const r = await fetch(url);
        res.json(await r.json());
    } catch (e) {
        res.status(500).json({ error: "Details failed" });
    }
});

app.get("/api/watchmode/episodes/:id", async (req, res) => {
    const url = `https://api.watchmode.com/v1/title/${req.params.id}/episodes/?apiKey=${process.env.WATCHMODE_API_KEY}`;
    try {
        const r = await fetch(url);
        res.json(await r.json());
    } catch (e) {
        res.status(500).json({ error: "Episodes failed" });
    }
});

app.get("/api/watchmode/sources/:id", async (req, res) => {
    const url = `https://api.watchmode.com/v1/title/${req.params.id}/sources/?apiKey=${process.env.WATCHMODE_API_KEY}`;
    try {
        const r = await fetch(url);
        res.json(await r.json());
    } catch (e) {
        res.status(500).json({ error: "Sources failed" });
    }
});

// 4. Razorpay Integration
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    key_secret: process.env.RAZORPAY_SECRET || "fallback_secret",
});

app.post("/api/create-order", async (req, res) => {
    const { amount } = req.body;
    try {
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        });
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: "Order creation failed" });
    }
});

app.post("/api/verify-payment", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET || "fallback_secret")
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
    res.json({ success: expected === razorpay_signature });
});

// 5. Static Files & Frontend Routing
app.use(express.static(rootPath));

app.get("/", (req, res) => {
    res.redirect("/User/index.html");
});

// Start Server
const PORT = 4005;
app.listen(PORT, () => {
    console.log(`\n🚀 DRAMADASH SERVER OPERATIONAL`);
    console.log(`📂 Root: ${rootPath}`);
    console.log(`👉 App URL: http://localhost:${PORT}/User/index.html`);
    console.log(`👉 Admin URL: http://localhost:${PORT}/admin/dashboard.html\n`);
});
