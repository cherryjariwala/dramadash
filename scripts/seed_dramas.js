import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = "https://encmikppjbyyyydmkonk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY21pa3BwamJ5eXl5ZG1rb25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODg3MDIsImV4cCI6MjA4MjY2NDcwMn0.VITt6UoFGDUOUEMMLQ43mKSBvRXSeG9JIZObJeaU3W0";
const WATCHMODE_KEY = process.env.WATCHMODE_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const keywords = ["CEO", "Revenge", "Love", "Hidden", "Legacy"];
const placeholderVideo = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

async function seed() {
    console.log("🚀 Starting Drama Seeding...");

    for (const q of keywords) {
        console.log(`\n🔍 Searching for: "${q}"...`);
        const searchUrl = `https://api.watchmode.com/v1/autocomplete-search/?apiKey=${WATCHMODE_KEY}&search_value=${encodeURIComponent(q)}&search_type=2`;

        try {
            const res = await fetch(searchUrl);
            const searchData = await res.json();
            const candidate = (searchData.results || []).find(d => d.type === "tv_series");

            if (!candidate) {
                console.log(`❌ No TV series found for "${q}"`);
                continue;
            }

            console.log(`✅ Found: ${candidate.name} (ID: ${candidate.id})`);

            // Check if already exists
            const { data: exists } = await supabase.from('dramas').select('id').eq('watchmode_id', candidate.id.toString()).maybeSingle();
            if (exists) {
                console.log(`⏭️ Already imported: ${candidate.name}`);
                continue;
            }

            // Get Details
            const detailsUrl = `https://api.watchmode.com/v1/title/${candidate.id}/details/?apiKey=${WATCHMODE_KEY}`;
            const detailsRes = await fetch(detailsUrl);
            const d = await detailsRes.json();

            // Insert Drama
            const { data: drama, error: dErr } = await supabase.from('dramas').insert({
                title: d.title,
                poster_url: d.poster,
                description: d.plot_overview || "No description available.",
                genre: d.genre_names?.join(", ") || "Drama",
                rating: d.user_rating || 0,
                watchmode_id: d.id.toString()
            }).select().single();

            if (dErr) throw dErr;
            console.log(`📥 Imported Drama: ${drama.title}`);

            // Fetch Episodes
            const epUrl = `https://api.watchmode.com/v1/title/${candidate.id}/episodes/?apiKey=${WATCHMODE_KEY}`;
            const epRes = await fetch(epUrl);
            const epData = await epRes.json();

            if (Array.isArray(epData)) {
                const epUpload = epData.slice(0, 30).map(ep => ({
                    drama_id: drama.id,
                    episode_number: ep.episode_number,
                    video_url: placeholderVideo,
                    price: ep.episode_number > 10 ? 5 : 0
                }));

                const { error: epErr } = await supabase.from('episodes').insert(epUpload);
                if (epErr) console.error(`⚠️ Episode error for ${drama.title}:`, epErr.message);
                else console.log(`🎬 Added ${epUpload.length} episodes for ${drama.title}`);
            }

        } catch (err) {
            console.error(`❌ Error seeding "${q}":`, err.message);
        }
    }

    console.log("\n✨ Seeding Complete!");
}

seed();
