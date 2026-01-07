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
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Watching Ad...';
    if (window.lucide) lucide.createIcons();

    // Simulate ad watching (3 seconds)
    setTimeout(async () => {
        await addCoins(currentUser.id, 10, "Watched Ad");
        alert("Success! You earned 10 coins.");

        btn.disabled = false;
        btn.innerHTML = originalContent;
        if (window.lucide) lucide.createIcons();

        loadWallet();
    }, 3000);
}
