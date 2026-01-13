import express from "express";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Razorpay from "razorpay";

dotenv.config();

// Configure ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, "..");
const tempDir = path.join(rootPath, "temp");

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Supabase Setup
const SUPABASE_URL = "https://encmikppjbyyyydmkonk.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY21pa3BwamJ5eXl5ZG1rb25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODg3MDIsImV4cCI6MjA4MjY2NDcwMn0.VITt6UoFGDUOUEMMLQ43mKSBvRXSeG9JIZObJeaU3W0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Multer Setup
const upload = multer({ dest: "temp/" });

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

// 3. Razorpay Integration
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

// 4. AUTO-SPLIT LOGIC
app.post("/api/auto-split", upload.single("video"), async (req, res) => {
    const file = req.file;
    const dramaId = req.body.dramaId;

    if (!file || !dramaId) {
        return res.status(400).json({ error: "Missing video or dramaId" });
    }

    const inputPath = file.path;
    const durationFile = path.join(tempDir, `${file.filename}_meta.json`);

    try {
        // Probe Duration
        ffmpeg.ffprobe(inputPath, async (err, metadata) => {
            if (err) throw err;
            const duration = metadata.format.duration;
            const segmentSeconds = 120; // 2 minutes
            const totalSegments = Math.ceil(duration / segmentSeconds);

            console.log(`🎬 Splitting ${duration}s video into ${totalSegments} segments...`);

            const episodeEntries = [];

            for (let i = 0; i < totalSegments; i++) {
                const startTime = i * segmentSeconds;
                const outputFileName = `ep_${dramaId}_${i + 1}.mp4`;
                const outputPath = path.join(tempDir, outputFileName);

                console.log(`⏳ Processing segment ${i + 1}/${totalSegments}...`);

                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .setStartTime(startTime)
                        .setDuration(segmentSeconds)
                        .output(outputPath)
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });

                // Upload to Supabase Storage
                const fileBuffer = fs.readFileSync(outputPath);
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from("episodes")
                    .upload(`drama_${dramaId}/${outputFileName}`, fileBuffer, {
                        contentType: "video/mp4",
                        upsert: true
                    });

                if (uploadErr) {
                    console.error("Upload Error:", uploadErr);
                    continue;
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from("episodes")
                    .getPublicUrl(`drama_${dramaId}/${outputFileName}`);

                episodeEntries.push({
                    drama_id: dramaId,
                    episode_number: i + 1,
                    video_url: publicUrl,
                    price: (i + 1) > 5 ? 10 : 0 // First 5 free, rest 10
                });

                // Clean up segment
                fs.unlinkSync(outputPath);
            }

            // Insert into Database
            const { error: dbErr } = await supabase.from("episodes").insert(episodeEntries);
            if (dbErr) throw dbErr;

            // Clean up original upload
            fs.unlinkSync(inputPath);

            res.json({ success: true, count: episodeEntries.length });
        });
    } catch (err) {
        console.error("Auto-split failed:", err);
        res.status(500).json({ error: err.message });
    }
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
