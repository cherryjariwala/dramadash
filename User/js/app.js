let currentUser;
let currentDramaId;

window.onload = async () => {
    currentUser = await protectPage();
    loadWallet();
    loadDramas();
};

async function loadDramas() {
    const { data } = await supabase.from("dramas").select("*");
    const grid = document.getElementById("drama-grid");
    grid.innerHTML = "";

    data.forEach(d => {
        const div = document.createElement("div");
        div.className = "drama-card";
        div.onclick = () => loadEpisodes(d.id, d.title, d.poster_url);

        div.innerHTML = `
      <div class="card-poster" style="background-image:url('${d.poster_url}')"></div>
      <div class="card-title">${d.title}</div>
    `;

        grid.appendChild(div);
    });
}

async function loadEpisodes(dramaId, title, poster) {
    currentDramaId = dramaId;

    document.getElementById("main-view").classList.add("hidden");
    document.getElementById("episodes-view").classList.remove("hidden");

    document.getElementById("episode-drama-title").innerText = title;
    document.getElementById("episode-poster-mini").style.backgroundImage = `url('${poster}')`;

    const { data } = await supabase
        .from("episodes")
        .select("*")
        .eq("drama_id", dramaId)
        .order("episode_number");

    const list = document.getElementById("episodes-list");
    list.innerHTML = "";

    for (const ep of data) {
        const unlocked = ep.price === 0 || await isUnlocked(ep.id);
        const btn = document.createElement("div");

        btn.className = `episode-pill ${unlocked ? "unlocked" : "locked"}`;
        btn.innerHTML = unlocked ? ep.episode_number : "🔒";
        btn.onclick = () =>
            unlocked ? playVideo(ep.video_url, ep.episode_number, ep.id) : unlockEpisode(ep);

        list.appendChild(btn);
    }
}

function playVideo(url, epNo, epId) {
    const modal = document.getElementById("player-modal");
    const video = document.getElementById("video");

    modal.classList.remove("hidden");
    video.src = url;
    video.play();

    video.onended = async () => {
        await addCoins(currentUser.id, 2, "Watched Episode");
        loadWallet();
    };
}

function closePlayer() {
    document.getElementById("player-modal").classList.add("hidden");
    document.getElementById("video").pause();
}
