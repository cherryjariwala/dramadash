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
    const selects = [document.getElementById("drama-select"), document.getElementById("auto-split-drama-select")];

    selects.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">-- Choose Drama --</option>';
            data?.forEach(d => {
                const title = d.title || "Untitled Drama";
                select.innerHTML += `<option value="${d.id}">${title}</option>`;
            });
        }
    });
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
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const genre = document.getElementById("genre").value;
    const rating = parseFloat(document.getElementById("rating").value) || 0;

    // Check for file upload first
    let poster_url = await uploadImage('poster-file');

    // If no file, use the URL field
    if (!poster_url) {
        poster_url = document.getElementById("poster").value;
    }

    if (!title || !poster_url) return alert("Title and Poster (URL or File) are required.");

    const vals = { title, poster_url, description, genre, rating };

    const { error } = await supabase.from("dramas").insert(vals);
    if (error) return alert(error.message);

    alert("Drama Created!");
    switchSection('manage-dramas');

    // Clear fields
    document.getElementById("title").value = "";
    document.getElementById("description").value = "";
    document.getElementById("genre").value = "";
    document.getElementById("rating").value = "";
    document.getElementById("poster").value = "";
    document.getElementById("poster-file").value = "";
}

async function openEditDrama(id) {
    const { data } = await supabase.from("dramas").select("*").eq("id", id).single();
    document.getElementById("edit-drama-id").value = data.id;
    document.getElementById("edit-title").value = data.title;
    document.getElementById("edit-genre").value = data.genre;
    document.getElementById("edit-rating").value = data.rating;
    document.getElementById("edit-poster").value = data.poster_url;
    document.getElementById("edit-description").value = data.description;
    document.getElementById("edit-drama-modal").style.display = "flex";
}

async function updateDrama() {
    const id = document.getElementById("edit-drama-id").value;

    let poster_url = await uploadImage('edit-poster-file');
    if (!poster_url) {
        poster_url = document.getElementById("edit-poster").value;
    }

    const upd = {
        title: document.getElementById("edit-title").value,
        genre: document.getElementById("edit-genre").value,
        rating: parseFloat(document.getElementById("edit-rating").value),
        description: document.getElementById("edit-description").value,
        poster_url: poster_url
    };
    const { error } = await supabase.from("dramas").update(upd).eq("id", id);
    if (error) return alert(error.message);
    alert("Updated!");
    closeModal('edit-drama-modal');
    loadDramasTable();
}

async function uploadImage(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return null;

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `posters/${fileName}`;

    try {
        const { data, error } = await supabase.storage
            .from('posters')
            .upload(filePath, file);

        if (error) {
            alert("Storage Error: " + error.message + ". Make sure you have a 'posters' bucket in Supabase storage.");
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('posters')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (err) {
        console.error("Upload failed", err);
        return null;
    }
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

function closeModal(id) { document.getElementById(id).style.display = "none"; }

async function suggestNextEpisode(dramaId) {
    const { data } = await supabase.from("episodes").select("episode_number").eq("drama_id", dramaId).order("episode_number", { ascending: false }).limit(1);
    document.getElementById("episode-no").value = (data?.[0]?.episode_number + 1) || 1;
}

const BACKEND_URL = "http://localhost:4005";

async function handleAutoSplit() {
    const dramaId = document.getElementById("auto-split-drama-select").value;
    const fileInput = document.getElementById("full-video-file");
    const file = fileInput.files[0];

    if (!dramaId || !file) return alert("Please select a drama and a video file.");

    const btn = document.getElementById("split-btn");
    const progressDiv = document.getElementById("split-progress");
    const bar = document.getElementById("split-bar");
    const status = document.getElementById("split-status");

    btn.disabled = true;
    progressDiv.style.display = "block";
    bar.style.width = "20%"; // Start progress
    status.innerText = "Uploading to server...";

    const formData = new FormData();
    formData.append("video", file);
    formData.append("dramaId", dramaId);

    try {
        const response = await fetch(`${BACKEND_URL}/api/auto-split`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error(await response.text());

        const result = await response.json();
        bar.style.width = "100%";
        status.innerText = `Success! ${result.count} episodes created.`;
        alert(`Successfully split into ${result.count} episodes!`);

        // Reset
        fileInput.value = "";
        btn.disabled = false;
        setTimeout(() => { progressDiv.style.display = "none"; }, 3000);
        loadDashboardStats();
    } catch (err) {
        console.error(err);
        alert("Split failed: " + err.message);
        btn.disabled = false;
        progressDiv.style.display = "none";
    }
}
