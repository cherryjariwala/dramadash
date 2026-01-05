const SUPABASE_URL = "https://encmikppjbyyyydmkonk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY21pa3BwamJ5eXl5ZG1rb25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODg3MDIsImV4cCI6MjA4MjY2NDcwMn0.VITt6UoFGDUOUEMMLQ43mKSBvRXSeG9JIZObJeaU3W0";

const _supabase = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
window.supabase = _supabase;
