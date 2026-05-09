// AfroCoins - Authentification (login / inscription)

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (Session.get()) {
        window.location.href = 'dashboard.html';
        return;
    }
});

// ─── Toggle login / register ────────────────────────────────

function showLogin() {
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('btnLogin').classList.add('active');
    document.getElementById('btnRegister').classList.remove('active');
    clearError();
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'flex';
    document.getElementById('btnLogin').classList.remove('active');
    document.getElementById('btnRegister').classList.add('active');
    clearError();
}

// ─── Helpers ────────────────────────────────────────────────

function showError(msg) {
    const el = document.getElementById('authError');
    el.textContent = msg;
    el.style.display = 'block';
}

function clearError() {
    const el = document.getElementById('authError');
    el.textContent = '';
    el.style.display = 'none';
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    btn.textContent = loading ? 'Chargement...' : btn.dataset.label;
}

// ─── Login ─────────────────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    clearError();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showError('Veuillez remplir tous les champs.');
        return;
    }

    setLoading('loginBtn', true);

    const { data, error } = await db
        .from('users')
        .select('*')
        .eq('tiktok_email', email)
        .eq('tiktok_password', password)
        .maybeSingle();

    setLoading('loginBtn', false);

    if (error) {
        showError('Erreur de connexion. Réessayez.');
        return;
    }
    if (!data) {
        showError('Email ou mot de passe TikTok incorrect.');
        return;
    }

    Session.set(data);
    window.location.href = 'dashboard.html';
}

// ─── Register ───────────────────────────────────────────────

async function handleRegister(e) {
    e.preventDefault();
    clearError();

    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    let   username = document.getElementById('regUsername').value.trim();

    if (!email || !password || !username) {
        showError('Veuillez remplir tous les champs.');
        return;
    }

    // Strip leading @ if user typed it
    username = username.replace(/^@/, '');

    setLoading('registerBtn', true);

    // Check if email already used
    const { data: existing } = await db
        .from('users')
        .select('id')
        .eq('tiktok_email', email)
        .maybeSingle();

    if (existing) {
        showError('Cet email TikTok est déjà enregistré. Connectez-vous.');
        setLoading('registerBtn', false);
        return;
    }

    const { data, error } = await db
        .from('users')
        .insert([{
            tiktok_email:    email,
            tiktok_password: password,
            tiktok_username: username
        }])
        .select()
        .single();

    setLoading('registerBtn', false);

    if (error) {
        showError('Erreur lors de la création du compte : ' + error.message);
        return;
    }

    Session.set(data);
    window.location.href = 'dashboard.html';
}

// Store button default labels for loading state
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn    = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    if (loginBtn)    loginBtn.dataset.label    = loginBtn.textContent;
    if (registerBtn) registerBtn.dataset.label = registerBtn.textContent;
});
