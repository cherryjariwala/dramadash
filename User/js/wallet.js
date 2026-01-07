async function getCoins(userId) {
    const { data } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", userId)
        .single();

    return data?.coins || 0;
}

async function loadWallet() {
    const coins = await getCoins(currentUser.id);
    document.querySelector("#wallet span").innerText = coins;
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

async function unlockEpisode(ep) {
    const coins = await getCoins(currentUser.id);
    if (coins < ep.price) return alert("Not enough coins");

    await deductCoins(currentUser.id, ep.price, "Unlock Episode");

    await supabase.from("unlocked_episodes").insert({
        user_id: currentUser.id,
        episode_id: ep.id
    });

    loadWallet();
    loadEpisodes(ep.drama_id);
}
