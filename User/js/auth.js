async function getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

async function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email, password
    });

    if (error) return alert(error.message);

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (profile.role === "admin") {
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

    if (error) return alert(error.message);

    if (data.user) {
        await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            coins: 10,
            role: "user"
        });
    }

    alert("Account created!");
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
