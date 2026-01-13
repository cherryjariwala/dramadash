async function getCoins(userId) {
    if (!userId) return 0;
    const { data, error } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("Error fetching coins:", error);
        return 0;
    }

    return data?.coins || 0;
}

async function loadWallet() {
    if (!currentUser) return;
    const coins = await getCoins(currentUser.id);
    const walletSpan = document.querySelector("#wallet span");
    if (walletSpan) walletSpan.innerText = coins;
}

async function addCoins(userId, coins, reason) {
    await supabase.rpc("update_coins", {
        uid: userId,
        delta: coins
    });

    await supabase.from("coin_transactions").insert({
        user_id: userId,
        coins,
        type: "earn",
        reason
    });
}

async function deductCoins(userId, coins, reason) {
    await supabase.rpc("update_coins", {
        uid: userId,
        delta: -coins
    });

    await supabase.from("coin_transactions").insert({
        user_id: userId,
        coins,
        type: "spend",
        reason
    });
}

async function isUnlocked(episodeId) {
    const { data } = await supabase
        .from("unlocked_episodes")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("episode_id", episodeId)
        .maybeSingle();

    return !!data;
}

async function unlockEpisode(ep, event) {
    const coins = await getCoins(currentUser.id);
    if (coins < ep.price) return alert("Not enough coins");

    // Show loading state
    const originalContent = event.target.innerHTML;
    event.target.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
    if (window.lucide) lucide.createIcons();

    try {
        await deductCoins(currentUser.id, ep.price, "Unlock Episode");

        const { error } = await supabase.from("unlocked_episodes").insert({
            user_id: currentUser.id,
            episode_id: ep.id
        });

        if (error) throw error;

        console.log("Episode unlocked successfully");
        await loadWallet();
        await loadEpisodes(ep.drama_id);
    } catch (error) {
        console.error("Unlock error:", error);
        alert("Failed to unlock: " + (error.message || "Unknown error"));
        // Potentially refund coins here if insert failed but deduct succeeded
    }
}

async function watchAdAndEarn() {
    if (!currentUser) return alert("Please login to earn coins");

    const btn = document.querySelector(".earn-btn");
    const originalContent = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Loading Ad...';
    if (window.lucide) lucide.createIcons();

    try {
        const adFinished = await showRewardedAd();

        if (adFinished) {
            await addCoins(currentUser.id, 10, "Watched Rewarded Ad");
            alert("✨ Success! 10 coins added to your wallet.");
        }
    } catch (err) {
        console.error("Ad Error:", err);
        alert("Could not load ad at this moment.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        if (window.lucide) lucide.createIcons();
        loadWallet();
    }
}

function showRewardedAd() {
    return new Promise((resolve) => {
        const adOverlay = document.createElement("div");
        adOverlay.style = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Outfit', sans-serif;
            backdrop-filter: blur(10px);
        `;

        adOverlay.innerHTML = `
            <div style="text-align:center; background: var(--bg-card); padding: 40px; border-radius: 24px; border: 1px solid var(--border); box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 90%; width: 400px;">
                <div style="margin-bottom: 20px; color: var(--accent);">
                    <i data-lucide="play-circle" style="width: 48px; height: 48px;"></i>
                </div>
                <h2 style="margin-bottom: 10px;">Watching Rewarded Ad</h2>
                <p style="color: var(--text-secondary); margin-bottom: 30px;">Please wait for the ad to finish to claim your 10 coins.</p>
                
                <div id="ad-placeholder" style="width: 100%; height: 200px; background: #000; border-radius: 12px; margin-bottom: 25px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                    <div class="loader" style="border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--accent); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite;"></div>
                    <p style="position: absolute; bottom: 10px; font-size: 0.7rem; opacity: 0.5;">REAL-TIME AD LOADING...</p>
                </div>

                <div id="ad-timer-container" style="width: 100%; background: rgba(255,255,255,0.05); height: 6px; border-radius: 3px; margin-bottom: 15px; overflow: hidden;">
                    <div id="ad-progress" style="width: 0%; height: 100%; background: var(--accent); transition: width 1s linear;"></div>
                </div>

                <p id="ad-timer-text" style="font-weight: 600; color: var(--text-secondary);">15 seconds remaining</p>
                
                <button id="close-ad-btn" style="margin-top: 20px; background: none; border: none; color: #666; cursor: pointer; text-decoration: underline; font-size: 0.8rem;">Cancel & Skip Reward</button>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;

        document.body.appendChild(adOverlay);
        if (window.lucide) lucide.createIcons();

        let timeLeft = 15;
        const totalTime = 15;

        const timer = setInterval(() => {
            timeLeft--;
            const progress = ((totalTime - timeLeft) / totalTime) * 100;
            const progressEl = document.getElementById("ad-progress");
            const textEl = document.getElementById("ad-timer-text");

            if (progressEl) progressEl.style.width = `${progress}%`;
            if (textEl) textEl.innerText = `${timeLeft} seconds remaining`;

            if (timeLeft <= 0) {
                clearInterval(timer);
                textEl.innerHTML = `<span style="color: #4ade80;">✨ Ad Finished!</span>`;
                const btnContainer = document.getElementById("ad-timer-text").parentNode;

                // Replace text with Claim Button
                const claimBtn = document.createElement("button");
                claimBtn.innerHTML = "Claim 10 Coins";
                claimBtn.style = "width: 100%; padding: 15px; background: var(--accent); color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; margin-top: 10px; animation: pulse 1.5s infinite;";

                // Add pulse animation
                const style = document.createElement('style');
                style.innerHTML = `@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }`;
                document.head.appendChild(style);

                claimBtn.onclick = () => {
                    document.body.removeChild(adOverlay);
                    resolve(true);
                };
                textEl.parentNode.replaceChild(claimBtn, textEl);
                document.getElementById("close-ad-btn").style.display = "none";
            }
        }, 1000);

        document.getElementById("close-ad-btn").onclick = () => {
            clearInterval(timer);
            document.body.removeChild(adOverlay);
            resolve(false);
        };
    });
}
// --- STORE & PAYMENTS ---

function openStore() {
    document.getElementById("store-modal").classList.remove("hidden");
    if (window.lucide) lucide.createIcons();
}

function closeStore() {
    document.getElementById("store-modal").classList.add("hidden");
}

async function initiatePurchase(coins, amount) {
    if (!currentUser) return alert("Please login to purchase coins");

    try {
        // 1. Create Order on Backend
        const res = await fetch("http://localhost:4000/api/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, currency: "INR" })
        });
        const order = await res.json();

        // 2. Open Razorpay Checkout
        const options = {
            key: "rzp_test_placeholder", // Should match backend key_id or be passed from it
            amount: order.amount,
            currency: order.currency,
            name: "Dramadash",
            description: `Purchase ${coins} Coins`,
            order_id: order.id,
            handler: async function (response) {
                // 3. Verify Payment
                const verifyRes = await fetch("http://localhost:4000/api/verify-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    })
                });

                const result = await verifyRes.json();
                if (result.success) {
                    await addCoins(currentUser.id, coins, `Purchased ${coins} Coins`);
                    alert(`Success! ${coins} coins added to your wallet.`);
                    closeStore();
                    loadWallet();
                } else {
                    alert("Payment verification failed!");
                }
            },
            prefill: {
                email: currentUser.email || ""
            },
            theme: {
                color: "#ff2c55"
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (err) {
        console.error("Purchase error:", err);
        alert("Failed to initiate purchase. Is the backend running?");
    }
}
