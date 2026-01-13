let currentUser;
let currentDramaId;

window.onload = async () => {
    currentUser = await protectPage();
    loadWallet();
    loadDramas();
};

async function loadDramas() {
    const { data, error } = await supabase.from("dramas").select("*");

    if (error) {
        console.error("Error loading dramas:", error);
        return;
    }

    const grid = document.getElementById("drama-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (!data || data.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #666;'>No dramas available yet.</p>";
        return;
    }

    data.forEach(d => {
        const poster = d.poster_url || "https://via.placeholder.com/200x300?text=No+Poster";
        const title = d.title || "Untitled Drama";

        const div = document.createElement("div");
        div.className = "drama-card";
        div.onclick = () => loadEpisodes(d);

        div.innerHTML = `
      <div class="card-poster" style="background-image:url('${poster}')"></div>
      <div class="card-title">${title}</div>
    `;

        grid.appendChild(div);
    });
}

async function loadEpisodes(dramaOrId) {
    let drama;
    if (typeof dramaOrId === 'string') {
        const { data, error } = await supabase
            .from("dramas")
            .select("*")
            .eq("id", dramaOrId)
            .single();
        if (error) return console.error("Error fetching drama metadata:", error);
        drama = data;
    } else {
        drama = dramaOrId;
    }

    currentDramaId = drama.id;

    document.getElementById("main-view").classList.add("hidden");
    document.getElementById("episodes-view").classList.remove("hidden");

    document.getElementById("episode-drama-title").innerText = drama.title || "Untitled Drama";
    document.getElementById("episode-poster-mini").style.backgroundImage = `url('${drama.poster_url || ""}')`;

    // Display metadata
    const descEl = document.getElementById("episode-drama-desc");
    const genreEl = document.getElementById("episode-drama-genre");
    const ratingEl = document.getElementById("episode-drama-rating");

    if (descEl) descEl.innerText = drama.description || "No description available.";
    if (genreEl) genreEl.innerText = drama.genre || "";
    if (ratingEl) ratingEl.innerText = drama.rating ? `⭐ ${drama.rating}` : "";

    const { data: episodes, error: epError } = await supabase
        .from("episodes")
        .select("*")
        .eq("drama_id", drama.id)
        .order("episode_number");

    if (epError) return console.error("Error loading episodes:", epError);

    // Batch fetch unlocked episodes for this user
    const { data: unlocks } = await supabase
        .from("unlocked_episodes")
        .select("episode_id")
        .eq("user_id", currentUser.id);

    const unlockedSet = new Set(unlocks?.map(u => u.episode_id) || []);

    const list = document.getElementById("episodes-list");
    list.innerHTML = "";

    if (!episodes || episodes.length === 0) {
        list.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #666;'>No episodes found.</p>";
        return;
    }

    episodes.forEach(ep => {
        // First 10 episodes are free by default, otherwise check price and unlock status
        const isFreeTrial = ep.episode_number <= 10;
        const unlocked = isFreeTrial || ep.price === 0 || unlockedSet.has(ep.id);

        const btn = document.createElement("div");
        btn.className = `episode-pill ${unlocked ? "unlocked" : "locked"}`;
        btn.innerHTML = unlocked ? ep.episode_number : "🔒";
        btn.onclick = (e) =>
            unlocked ? playVideo(ep.video_url, ep.episode_number, ep.id) : unlockEpisode(ep, e);

        list.appendChild(btn);
    });
}

function backToDramas() {
    document.getElementById("episodes-view").classList.add("hidden");
    document.getElementById("main-view").classList.remove("hidden");
}

function playVideo(url, epNo, epId) {
    const modal = document.getElementById("player-modal");
    const video = document.getElementById("video");
    const videoContainer = document.querySelector(".video-container");

    modal.classList.remove("hidden");

    // Clear existing content
    videoContainer.innerHTML = "";

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = extractYouTubeId(url);
        videoContainer.innerHTML = `
            <iframe width="100%" height="100%" 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                frameborder="0" allow="autoplay; encrypted-media" 
                allowfullscreen referrerpolicy="strict-origin-when-cross-origin"
                style="aspect-ratio: 9/16; height: 100%;">
            </iframe>`;

        // Simulating end for coins
        setTimeout(async () => {
            await addCoins(currentUser.id, 2, "Watched YouTube Episode");
            loadWallet();
        }, 30000); // Reward after 30s
    } else if (url.match(/\.(mp4|webm|ogg)$/) || url.includes("storage.googleapis.com")) {
        videoContainer.innerHTML = `<video id="video" controls controlsList="nodownload" style="width: 100%; height: 100%;"></video>`;
        const newVideo = document.getElementById("video");
        newVideo.src = url;
        newVideo.play();
        newVideo.onended = async () => {
            await addCoins(currentUser.id, 2, "Watched Episode");
            loadWallet();
        };
    } else {
        // External Streaming Link (Netflix, Hulu, etc.)
        window.open(url, "_blank");
        closePlayer();
        alert("This drama is available on an external platform. Opening in a new tab...");
    }
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length == 11) ? match[2] : null;
}

function closePlayer() {
    document.getElementById("player-modal").classList.add("hidden");
    const videoContainer = document.querySelector(".video-container");
    videoContainer.innerHTML = ""; // Stop video/iframe
}
