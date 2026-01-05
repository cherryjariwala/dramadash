async function loadWallet() {
    if (!currentUser) return;
    const { data, error } = await supabase
        .from("user_wallet")
        .select("coins")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error && error.code !== "PGRST116") {
        console.error("Error loading wallet:", error);
    }

    const coins = data ? data.coins : 0;
    document.getElementById("wallet").innerText = `Coins: ${coins}`;
}

async function isUnlocked(epId) {
    const { data } = await supabase
        .from("unlocked_episodes")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("episode_id", epId)
        .maybeSingle();

    return !!data;
}

async function unlockEpisode(ep) {
    if (!currentUser) return alert("Please login first");
    const { data: wallet, error } = await supabase
        .from("user_wallet")
        .select("coins")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    const coins = wallet ? wallet.coins : 0;

    if (coins < ep.price) {
        alert("Not enough coins");
        return;
    }

    await supabase
        .from("user_wallet")
        .update({ coins: coins - ep.price })
        .eq("user_id", currentUser.id);

    await supabase.from("unlocked_episodes").insert({
        user_id: currentUser.id,
        episode_id: ep.id
    });

    loadWallet();
    loadEpisodes(ep.drama_id, "");
}
