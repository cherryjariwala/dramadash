window.addEventListener('DOMContentLoaded', () => {
    loadDramasForSelect();
    loadDashboardStats();

    // Auto-increment episode number when drama is selected
    const select = document.getElementById("drama-select");
    if (select) {
        select.addEventListener('change', async () => {
            const dramaId = select.value;
            if (dramaId) {
                await suggestNextEpisode(dramaId);
            }
        });
    }
});

// --- NAVIGATION ---
function switchSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(`'${sectionId}'`)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (sectionId === 'manage-dramas') loadDramasTable();
    if (sectionId === 'manage-episodes') loadDramasForMgmtSelect();
    if (sectionId === 'dashboard') loadDashboardStats();
}

async function loadDashboardStats() {
    const { count: dCount } = await supabase.from('dramas').select('*', { count: 'exact', head: true });
    const { count: eCount } = await supabase.from('episodes').select('*', { count: 'exact', head: true });

    document.getElementById('stat-dramas').textContent = dCount || 0;
    document.getElementById('stat-episodes').textContent = eCount || 0;
}

// --- DRAMA CRUD ---
async function loadDramasForSelect() {
    const { data } = await supabase.from("dramas").select("id, title").order("title");
    const select = document.getElementById("drama-select");
    if (select) {
        select.innerHTML = '<option value="">-- Choose Drama --</option>';
        data?.forEach(d => {
            const title = d.title || "Untitled Drama";
            select.innerHTML += `<option value="${d.id}">${title}</option>`;
        });
    }
}

async function loadDramasForMgmtSelect() {
    const { data } = await supabase.from("dramas").select("id, title").order("title");
    const mgmtSelect = document.getElementById("episode-mgmt-select");
    if (mgmtSelect) {
        mgmtSelect.innerHTML = '<option value="">Choose a drama...</option>';
        data?.forEach(d => {
            const title = d.title || "Untitled Drama";
            mgmtSelect.innerHTML += `<option value="${d.id}">${title}</option>`;
        });
    }
}

async function loadDramasTable() {
    const { data } = await supabase.from("dramas").select("*").order("created_at", { ascending: false });
    const tbody = document.getElementById("dramas-tbody");
    tbody.innerHTML = "";

    data?.forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${d.poster_url}" style="width: 40px; height: 50px; border-radius: 4px; object-fit: cover;">
                        <div style="font-weight: 600;">${d.title}</div>
                    </div>
                </td>
                <td>${d.genre}</td>
                <td>⭐ ${d.rating}</td>
                <td><span class="badge free">Active</span></td>
                <td>
                    <button class="nav-item" style="padding: 8px; display: inline-flex; background: rgba(255,255,255,0.05);" onclick="openEditDrama('${d.id}')">
                        <i data-lucide="edit-2" style="width: 14px;"></i>
                    </button>
                    <button class="nav-item" style="padding: 8px; display: inline-flex; background: rgba(255,77,77,0.1); color: #ff4d4d;" onclick="deleteDrama('${d.id}', '${d.title.replace(/'/g, "\\'")}')">
                        <i data-lucide="trash-2" style="width: 14px;"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

async function createDrama() {
    const vals = {
        title: document.getElementById("title").value,
        poster_url: document.getElementById("poster").value,
        description: document.getElementById("description").value,
        genre: document.getElementById("genre").value,
        rating: parseFloat(document.getElementById("rating").value) || 0,
        watchmode_id: currentWatchmodeId
    };
    if (!vals.title || !vals.poster_url) return alert("Missing fields");
    const { error } = await supabase.from("dramas").insert(vals);
    if (error) return alert(error.message);
    alert("Drama Created!");
    switchSection('manage-dramas');
}

async function openEditDrama(id) {
    const { data } = await supabase.from("dramas").select("*").eq("id", id).single();
    document.getElementById("edit-drama-id").value = data.id;
    document.getElementById("edit-title").value = data.title;
    document.getElementById("edit-genre").value = data.genre;
    document.getElementById("edit-rating").value = data.rating;
    document.getElementById("edit-description").value = data.description;
    document.getElementById("edit-drama-modal").style.display = "flex";
}

async function updateDrama() {
    const id = document.getElementById("edit-drama-id").value;
    const upd = {
        title: document.getElementById("edit-title").value,
        genre: document.getElementById("edit-genre").value,
        rating: parseFloat(document.getElementById("edit-rating").value),
        description: document.getElementById("edit-description").value
    };
    const { error } = await supabase.from("dramas").update(upd).eq("id", id);
    if (error) return alert(error.message);
    alert("Updated!");
    closeModal('edit-drama-modal');
    loadDramasTable();
}

async function deleteDrama(id, title) {
    if (!confirm(`Delete "${title}"?`)) return;
    await supabase.from("episodes").delete().eq("drama_id", id);
    await supabase.from("dramas").delete().eq("id", id);
    loadDramasTable();
}

// --- EPISODE CRUD ---
async function loadEpisodesForMgmt(dramaId) {
    if (!dramaId) return;
    const { data } = await supabase.from("episodes").select("*").eq("drama_id", dramaId).order("episode_number");
    const tbody = document.getElementById("episodes-tbody");
    tbody.innerHTML = "";
    data?.forEach(e => {
        tbody.innerHTML += `
            <tr>
                <td>Ep ${e.episode_number}</td>
                <td><span class="badge ${e.price > 0 ? 'paid' : 'free'}">${e.price} Coins</span></td>
                <td><div style="max-width: 200px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${e.video_url}</div></td>
                <td>
                    <button class="nav-item" style="padding: 8px; display: inline-flex; background: rgba(255,255,255,0.05);" onclick="openEditEpisode('${e.id}')">
                        <i data-lucide="edit-2" style="width: 14px;"></i>
                    </button>
                    <button class="nav-item" style="padding: 8px; display: inline-flex; background: rgba(255,77,77,0.1); color: #ff4d4d;" onclick="deleteEpisode('${e.id}', '${dramaId}')">
                        <i data-lucide="trash-2" style="width: 14px;"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

async function openEditEpisode(id) {
    const { data } = await supabase.from("episodes").select("*").eq("id", id).single();
    document.getElementById("edit-episode-id").value = data.id;
    document.getElementById("edit-episode-drama-id").value = data.drama_id;
    document.getElementById("edit-ep-no").value = data.episode_number;
    document.getElementById("edit-ep-price").value = data.price;
    document.getElementById("edit-ep-video").value = data.video_url;

    document.getElementById("edit-episode-modal").style.display = "flex";
}

async function updateEpisode() {
    const id = document.getElementById("edit-episode-id").value;
    const dramaId = document.getElementById("edit-episode-drama-id").value;
    const upd = {
        episode_number: parseInt(document.getElementById("edit-ep-no").value),
        price: parseInt(document.getElementById("edit-ep-price").value),
        video_url: document.getElementById("edit-ep-video").value
    };

    const { error } = await supabase.from("episodes").update(upd).eq("id", id);
    if (error) return alert(error.message);

    alert("Episode Updated!");
    closeModal('edit-episode-modal');
    loadEpisodesForMgmt(dramaId);
}

async function uploadEpisode() {
    const drama_id = document.getElementById("drama-select").value;
    const ep_no = parseInt(document.getElementById("episode-no").value);
    const video = document.getElementById("video-url").value;
    const price = parseInt(document.getElementById("episode-price").value) || 0;
    if (!drama_id || !ep_no || !video) return alert("Missing fields");
    const { error } = await supabase.from("episodes").insert({ drama_id, episode_number: ep_no, video_url: video, price });
    if (error) return alert(error.message);
    alert("Episode Added!");
    document.getElementById("episode-no").value = ep_no + 1;
    document.getElementById("video-url").value = "";
}

async function deleteEpisode(id, dramaId) {
    if (!confirm("Delete episode?")) return;
    await supabase.from("episodes").delete().eq("id", id);
    loadEpisodesForMgmt(dramaId);
}

// --- SEARCH & IMPORT ---
const BACKEND_URL = "http://localhost:4000";
let currentWatchmodeId = null;

async function searchWatchmode() {
    const q = document.getElementById("watchmode-search").value;
    if (!q) return;
    const res = await fetch(`${BACKEND_URL}/api/watchmode/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const div = document.getElementById("search-results");
    div.innerHTML = "";
    div.style.display = "block";
    data.results.slice(0, 5).forEach(i => {
        div.innerHTML += `<div onclick="fillFromWatchmode('${i.id}')" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #333;">${i.name} (${i.year})</div>`;
    });
}

async function fillFromWatchmode(id) {
    currentWatchmodeId = id;
    const res = await fetch(`${BACKEND_URL}/api/watchmode/details/${id}`);
    const data = await res.json();
    document.getElementById("title").value = data.title;
    document.getElementById("poster").value = data.poster;
    document.getElementById("description").value = data.plot_overview;
    document.getElementById("genre").value = data.genre_names?.join(", ");
    document.getElementById("rating").value = data.user_rating;
    document.getElementById("search-results").style.display = "none";
}

async function smartImport() {
    alert("Smart Import is being upgraded for automated indexing. Please use Watchmode Sync for now.");
}

function setSearchQuery(q) {
    document.getElementById("watchmode-search").value = q;
    searchWatchmode();
}

async function syncWatchmodeEpisodes() {
    const dramaId = document.getElementById("drama-select").value;
    if (!dramaId) return alert("Please select a drama first.");

    const { data: drama, error: dramaErr } = await supabase
        .from("dramas")
        .select("watchmode_id, title")
        .eq("id", dramaId)
        .single();

    if (dramaErr || !drama?.watchmode_id) {
        return alert("This drama doesn't have a Watchmode ID. Please search and import it first.");
    }

    if (!confirm(`Deep Sync episodes for "${drama.title}"? This will fetch unique sources for EVERY episode.`)) return;

    const overlay = document.createElement("div");
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999; font-family: 'Outfit', sans-serif;";
    overlay.innerHTML = `<h2 style="margin-bottom:10px;">Syncing "${drama.title}"</h2><p id="sync-progress" style="color:var(--accent); font-weight:bold;">Starting...</p>`;
    document.body.appendChild(overlay);

    try {
        const epRes = await fetch(`${BACKEND_URL}/api/watchmode/episodes/${drama.watchmode_id}`);
        const episodes = await epRes.json();

        if (!Array.isArray(episodes)) throw new Error("Could not find episode list.");

        const syncedData = [];
        const OFFICIAL_PLATFORMS = ["netflix.com", "mxplayer.in", "primevideo.com", "hotstar.com", "viki.com", "zee5.com", "jiocinema.com"];

        for (let i = 0; i < episodes.length; i++) {
            const ep = episodes[i];
            const prog = document.getElementById("sync-progress");
            prog.innerHTML = `Fetching Episode ${ep.episode_number} (${i + 1}/${episodes.length})...<br><small id="source-found" style="color:#666;">Searching...</small>`;

            try {
                // Fetch sources for this specific episode ID
                const titleId = ep.id || drama.watchmode_id;
                const srcRes = await fetch(`${BACKEND_URL}/api/watchmode/sources/${titleId}`);
                const sources = await srcRes.json();

                let bestUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // Fallback
                let sourceName = "Fallback YouTube";

                if (Array.isArray(sources) && sources.length > 0) {
                    // 1. Try to find an official platform first
                    const official = sources.find(s => OFFICIAL_PLATFORMS.some(p => s.web_url.includes(p)));

                    if (official) {
                        bestUrl = official.web_url;
                        sourceName = "Official: " + official.name;
                    } else {
                        // 2. Try any free source
                        const free = sources.find(s => s.type === "free");
                        if (free) {
                            bestUrl = free.web_url;
                            sourceName = "Free: " + free.name;
                        } else {
                            // 3. Just take the first one
                            bestUrl = sources[0].web_url;
                            sourceName = "Other: " + sources[0].name;
                        }
                    }
                }

                const srcDisplay = document.getElementById("source-found");
                if (srcDisplay) srcDisplay.innerText = `Found on ${sourceName}`;

                syncedData.push({
                    drama_id: dramaId,
                    episode_number: ep.episode_number,
                    video_url: bestUrl,
                    price: ep.episode_number > 5 ? 5 : 0 // First 5 free
                });
            } catch (innerErr) {
                console.warn(`Failed for episode ${ep.episode_number}`, innerErr);
            }
        }

        const { error: upsertErr } = await supabase
            .from("episodes")
            .upsert(syncedData, { onConflict: 'drama_id, episode_number' });

        if (upsertErr) throw upsertErr;

        alert(`Sync Complete! ${syncedData.length} episodes updated.`);
    } catch (err) {
        alert("Sync error: " + err.message);
    } finally {
        document.body.removeChild(overlay);
        loadEpisodes();
    }
}


function closeModal(id) { document.getElementById(id).style.display = "none"; }

async function suggestNextEpisode(dramaId) {
    const { data } = await supabase.from("episodes").select("episode_number").eq("drama_id", dramaId).order("episode_number", { ascending: false }).limit(1);
    document.getElementById("episode-no").value = (data?.[0]?.episode_number + 1) || 1;
}
