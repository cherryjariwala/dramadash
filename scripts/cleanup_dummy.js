import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = "https://encmikppjbyyyydmkonk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY21pa3BwamJ5eXl5ZG1rb25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODg3MDIsImV4cCI6MjA4MjY2NDcwMn0.VITt6UoFGDUOUEMMLQ43mKSBvRXSeG9JIZObJeaU3W0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    console.log("🧹 Starting Database Cleanup...");

    // 1. Find dramas with "Sample" or "Imported Series" in title
    const { data: dummyDramas, error: fetchErr } = await supabase
        .from('dramas')
        .select('id, title')
        .or('title.ilike.%Sample%,title.ilike.%Imported Series%');

    if (fetchErr) {
        console.error("❌ Error fetching dummy dramas:", fetchErr.message);
        return;
    }

    if (!dummyDramas || dummyDramas.length === 0) {
        console.log("✅ No dummy dramas found.");
    } else {
        console.log(`🗑️ Found ${dummyDramas.length} dummy dramas to delete.`);
        for (const d of dummyDramas) {
            console.log(`   - Processing: ${d.title}`);

            // Delete episodes first
            console.log(`     - Deleting episodes for ${d.title}...`);
            const { error: epErr } = await supabase.from('episodes').delete().eq('drama_id', d.id);
            if (epErr) {
                console.error(`     ❌ Failed to delete episodes for ${d.title}:`, epErr.message);
                continue;
            }

            // Delete drama
            console.log(`     - Deleting drama ${d.title}...`);
            const { error: delErr } = await supabase.from('dramas').delete().eq('id', d.id);
            if (delErr) console.error(`     ❌ Failed to delete drama ${d.title}:`, delErr.message);
            else console.log(`     ✅ Deleted ${d.title}`);
        }
    }

    console.log("\n✨ Database Cleanup Complete!");
}

cleanup();
