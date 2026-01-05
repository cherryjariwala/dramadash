const supabase = window.supabaseClient;

async function createDrama() {
    await supabase.from("dramas").insert({
        title: document.getElementById("title").value
    });
    alert("Drama created");
}

async function uploadEpisode() {
    await supabase.from("episodes").insert({
        drama_id: document.getElementById("drama").value,
        episode_number: document.getElementById("ep").value,
        video_url: document.getElementById("url").value,
        price: 5
    });
    alert("Episode uploaded");
}
