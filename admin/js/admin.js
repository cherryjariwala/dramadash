async function createDrama() {
    const title = document.getElementById("title").value;
    const poster_url = document.getElementById("poster").value;

    await supabase.from("dramas").insert({ title, poster_url });
    alert("Drama created");
}

async function uploadEpisode() {
    const drama_id = document.getElementById("drama").value;
    const episode_number = document.getElementById("episode").value;
    const video_url = document.getElementById("video").value;
    const price = document.getElementById("price").value;

    await supabase.from("episodes").insert({
        drama_id,
        episode_number,
        video_url,
        price
    });

    alert("Episode uploaded");
}
