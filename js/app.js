let currentUser;

window.onload = async () => {
    currentUser = await protectPage();
    loadWallet();
    loadDramas();
};

async function loadDramas() {
    const { data } = await supabase.from("dramas").select("*");
    const grid = document.getElementById("drama-grid");
    grid.innerHTML = "";

    if (data && data.length > 0) {
        // Update hero with first drama
        document.getElementById("hero-title").innerText = data[0].title;
    }

    data.forEach(d => {
        const div = document.createElement("div");
        div.className = "drama-card";
        div.onclick = () => loadEpisodes(d.id, d.title, d.poster_url);

        div.innerHTML = `
            <div class="card-poster" style="background-image: url('${d.poster_url || ''}')"></div>
            <div class="card-title">${d.title}</div>
        `;

        grid.appendChild(div);
    });
}

async function loadEpisodes(dramaId, title, poster) {
    if (title) document.getElementById("episode-drama-title").innerText = title;
    if (poster) document.getElementById("episode-poster-mini").style.backgroundImage = `url('${poster}')`;

    // Toggle views
    document.getElementById("main-view").classList.add("hidden");
    document.getElementById("episodes-view").classList.remove("hidden");

    const { data } = await supabase
        .from("episodes")
        .select("*")
        .eq("drama_id", dramaId)
        .order("episode_number");

    const list = document.getElementById("episodes-list");
    list.innerHTML = "";

    for (let ep of data) {
        const unlocked = await isUnlocked(ep.id);
        const btn = document.createElement("div");
        btn.className = `episode-pill ${unlocked ? 'unlocked' : 'locked'}`;

        btn.innerHTML = unlocked
            ? ep.episode_number
            : `<i data-lucide="lock" style="width: 16px;"></i>`;

        btn.title = unlocked
            ? `Episode ${ep.episode_number}`
            : `Unlock Episode ${ep.episode_number} (${ep.price} coins)`;

        btn.onclick = () =>
            unlocked ? playVideo(ep.video_url, `Episode ${ep.episode_number}`) : unlockEpisode(ep);

        list.appendChild(btn);
    }
    lucide.createIcons();
}

function playVideo(url, title) {
    const modal = document.getElementById("player-modal");
    const video = document.getElementById("video");
    const titleEl = document.getElementById("playing-title");

    titleEl.innerText = title || "Playing Episode";
    video.src = url;
    modal.classList.remove("hidden");
    video.play();
}

function closePlayer() {
    const modal = document.getElementById("player-modal");
    const video = document.getElementById("video");
    modal.classList.add("hidden");
    video.pause();
    video.src = "";
}

function backToDramas() {
    document.getElementById("main-view").classList.remove("hidden");
    document.getElementById("episodes-view").classList.add("hidden");
}
