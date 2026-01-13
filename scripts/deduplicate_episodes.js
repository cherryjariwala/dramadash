import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = "https://encmikppjbyyyydmkonk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY21pa3BwamJ5eXl5ZG1rb25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODg3MDIsImV4cCI6MjA4MjY2NDcwMn0.VITt6UoFGDUOUEMMLQ43mKSBvRXSeG9JIZObJeaU3W0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deduplicate() {
    console.log("🧹 Starting Episode Deduplication...");

    // 1. Fetch all episodes
    const { data: episodes, error: fetchErr } = await supabase
        .from('episodes')
        .select('id, drama_id, episode_number')
        .order('drama_id', { ascending: true })
        .order('episode_number', { ascending: true })
        .order('id', { ascending: true }); // Lower IDs first

    if (fetchErr) {
        console.error("❌ Error fetching episodes:", fetchErr.message);
        return;
    }

    if (!episodes || episodes.length === 0) {
        console.log("✅ No episodes found.");
        return;
    }

    const toDelete = [];
    const seen = new Set();

    for (const ep of episodes) {
        const key = `${ep.drama_id}-${ep.episode_number}`;
        if (seen.has(key)) {
            toDelete.push(ep.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length === 0) {
        console.log("✅ No duplicates found.");
    } else {
        console.log(`🗑️ Found ${toDelete.length} duplicate episodes to delete.`);
        // Delete in batches of 100
        for (let i = 0; i < toDelete.length; i += 100) {
            const batch = toDelete.slice(i, i + 100);
            const { error: delErr } = await supabase.from('episodes').delete().in('id', batch);
            if (delErr) {
                console.error(`   ❌ Failed to delete batch starting at index ${i}:`, delErr.message);
            } else {
                console.log(`   ✅ Deleted batch of ${batch.length} copies.`);
            }
        }
    }

    console.log("\n✨ Deduplication Complete!");
}

deduplicate();
