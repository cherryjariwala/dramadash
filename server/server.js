import crypto from "crypto";

app.post("/verify-payment", (req, res) => {
    const { order_id, payment_id, signature } = req.body;

    const body = order_id + "|" + payment_id;
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body)
        .digest("hex");

    if (expected === signature) {
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
});
