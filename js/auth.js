async function getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

async function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({
        email, password
    });

    if (error) return alert(error.message);
    window.location.href = "index.html";
}

async function signupUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin + "/login.html"
        }
    });

    if (error) return alert(error.message);
    alert("Check your email to confirm signup");
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

async function checkSession(isAuthPage) {
    const user = await getUser();
    if (isAuthPage && user) {
        window.location.href = "index.html";
    } else if (!isAuthPage && !user) {
        window.location.href = "login.html";
    }
}

async function handleAuthRedirect() {
    // Supabase handles the email confirmation link automatically
    // You can add logic here if you need to handle specific hash fragments
}
