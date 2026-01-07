async function protectAdminPage() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return location.href = "../User/login.html";

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        alert("Access denied");
        location.href = "../User/index.html";
    }
}

window.onload = protectAdminPage;
