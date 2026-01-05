import express from "express";
import Razorpay from "razorpay";

const app = express();
app.use(express.json());

const razorpay = new Razorpay({
    key_id: "RAZORPAY_KEY",
    key_secret: "RAZORPAY_SECRET"
});

app.post("/order", async (req, res) => {
    const order = await razorpay.orders.create({
        amount: req.body.amount * 100,
        currency: "INR"
    });
    res.json(order);
});

app.listen(4000);
