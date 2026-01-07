async function getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

async function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) return alert("Please fill in all fields");

    const { data, error } = await supabase.auth.signInWithPassword({
        email, password
    });

    if (error) return alert(error.message);

    // Fetch user profile to check role
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (profileError) {
        console.error("Profile fetch error:", profileError);
        // If profile doesn't exist, try to create one (fallback)
        if (profileError.code === "PGRST116" || profileError.message.includes("0 rows")) {
            console.log("Profile not found, creating default profile...");
            await supabase.from("profiles").upsert({
                id: data.user.id,
                email: data.user.email,
                coins: 10,
                role: "user"
            });
            window.location.href = "index.html";
            return;
        }

        alert("Server error during login. Please contact support. (Code: " + profileError.code + ")");
        window.location.href = "index.html";
        return;
    }

    console.log("User profile found:", profile);
    if (profile && profile.role === "admin") {
        window.location.href = "../admin/dashboard.html";
    } else {
        window.location.href = "index.html";
    }
}


async function signupUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error("Signup error:", error);
        return alert(error.message);
    }

    if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            coins: 10,
            role: "user"
        });
        if (profileError) console.error("Error creating profile on signup:", profileError);
    }

    alert("Account created successfully!");
    window.location.href = "login.html";
}

async function logoutUser() {
    await supabase.auth.signOut();
    window.location.href = "login.html";
}

async function protectPage() {
    const user = await getUser();
    if (!user) window.location.href = "login.html";
    return user;
}
