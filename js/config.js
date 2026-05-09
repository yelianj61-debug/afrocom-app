// AfroCoins - Configuration Supabase & Session

const SUPABASE_URL = 'https://osgdzllrwvjxkjaagwtg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_A3qyBPM64bwVx8f-do7lHg_B-cAtLsE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Session (localStorage) ────────────────────────────────

const Session = {
    set(user) {
        localStorage.setItem('afrocom_user', JSON.stringify(user));
    },
    get() {
        try {
            return JSON.parse(localStorage.getItem('afrocom_user'));
        } catch {
            return null;
        }
    },
    clear() {
        localStorage.removeItem('afrocom_user');
    },
    require() {
        if (!Session.get()) {
            window.location.href = 'auth.html';
            return false;
        }
        return true;
    }
};

// ─── Toast notifications ────────────────────────────────────

function showToast(message, type = 'info', duration = 3000) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast show toast-' + type;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.className = 'toast';
    }, duration);
}

// ─── Pricing ────────────────────────────────────────────────

const PRICING_TIERS = [
    { coins: 5000, price: 80000 },
    { coins: 1000, price: 17000 },
    { coins: 500,  price: 9000  },
    { coins: 200,  price: 3800  },
    { coins: 100,  price: 2000  },
];
const PRICE_PER_COIN = 20;

function calculatePrice(coins) {
    const tier = PRICING_TIERS.find(t => t.coins === coins);
    return tier ? tier.price : Math.round(coins * PRICE_PER_COIN);
}

function formatPrice(fcfa) {
    return Number(fcfa).toLocaleString('fr-FR') + ' FCFA';
}
