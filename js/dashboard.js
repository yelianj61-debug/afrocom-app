// AfroCoins - Tableau de bord utilisateur

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!Session.require()) return;
    currentUser = Session.get();

    initTabs();
    loadBuyTab();
    loadHistoryTab();
    loadOrdersTab();
    loadProfileTab();
});

// ─── Tab navigation ─────────────────────────────────────────

function initTabs() {
    const tabs   = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(t   => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
        });
    });
}

// ─── Logout ────────────────────────────────────────────────

function logout() {
    Session.clear();
    window.location.href = 'index.html';
}

// ═══════════════════════════════════════════════════════════
// TAB 1 — ACHETER DES PIÈCES
// ═══════════════════════════════════════════════════════════

function loadBuyTab() {
    const coinInput    = document.getElementById('coinInput');
    const priceDisplay = document.getElementById('priceDisplay');
    const tierBtns     = document.querySelectorAll('.tier-btn');

    // Quick-select tier buttons
    tierBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const coins = parseInt(btn.dataset.coins);
            coinInput.value = coins;
            updatePrice(coins, true);
            tierBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Manual input
    coinInput.addEventListener('input', () => {
        const qty = parseInt(coinInput.value) || 0;
        updatePrice(qty, false);
        tierBtns.forEach(b => b.classList.remove('selected'));
        const match = document.querySelector(`.tier-btn[data-coins="${qty}"]`);
        if (match) match.classList.add('selected');
    });

    function updatePrice(qty, isTier) {
        if (qty <= 0) {
            priceDisplay.textContent = '—';
            priceDisplay.className   = 'price-amount';
            return;
        }
        const price = calculatePrice(qty);
        priceDisplay.textContent = formatPrice(price);
        priceDisplay.className   = 'price-amount' + (isTier ? ' tier-price' : '');
    }
}

async function handleBuy() {
    const coinInput = document.getElementById('coinInput');
    const coins     = parseInt(coinInput.value);
    const buyBtn    = document.getElementById('buyBtn');

    if (!coins || coins < 1) {
        showToast('Entrez un nombre de pièces valide.', 'error');
        return;
    }

    const price = calculatePrice(coins);

    buyBtn.disabled    = true;
    buyBtn.textContent = 'Création de la commande...';

    const { data: order, error } = await db
        .from('orders')
        .insert([{
            user_id:        currentUser.id,
            coin_amount:    coins,
            price:          price,
            payment_status: 'en_attente',
            order_status:   'en cours'
        }])
        .select()
        .single();

    buyBtn.disabled    = false;
    buyBtn.textContent = 'Payer maintenant';

    if (error) {
        showToast('Erreur : ' + error.message, 'error');
        return;
    }

    // Show payment modal
    document.getElementById('modalOrderId').textContent = '#' + order.id;
    document.getElementById('modalAmount').textContent  = formatPrice(price);
    document.getElementById('paymentModal').classList.add('visible');

    // Refresh other tabs
    loadHistoryTab();
    loadOrdersTab();
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('visible');
    // Reset input
    document.getElementById('coinInput').value = '';
    document.getElementById('priceDisplay').textContent = '—';
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('selected'));
}

// ═══════════════════════════════════════════════════════════
// TAB 2 — HISTORIQUE
// ═══════════════════════════════════════════════════════════

async function loadHistoryTab() {
    const list = document.getElementById('historyList');
    list.innerHTML = '<p class="loading">Chargement...</p>';

    const { data, error } = await db
        .from('orders')
        .select('coin_amount, price, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        list.innerHTML = '<p class="empty">Erreur de chargement.</p>';
        return;
    }
    if (!data || data.length === 0) {
        list.innerHTML = '<p class="empty">Aucun achat pour le moment.</p>';
        return;
    }

    list.innerHTML = data.map(o => {
        const date = new Date(o.created_at).toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        return `<div class="history-item">
            <span class="coin-icon">🪙</span>
            <span>Vous avez acheté <strong>${o.coin_amount} pièces</strong> le ${date}
            <br><small style="color:var(--color-accent)">${formatPrice(o.price)}</small></span>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════
// TAB 3 — COMMANDES
// ═══════════════════════════════════════════════════════════

const ORDER_STATUS_MAP = {
    'en cours':   { label: 'En cours',   cls: 'badge-yellow' },
    'effectue':   { label: 'Effectué',   cls: 'badge-green'  },
    'en_attente': { label: 'En attente', cls: 'badge-gray'   },
};

const PAYMENT_STATUS_MAP = {
    'payé':        { label: 'Payé',       cls: 'badge-green' },
    'en_attente':  { label: 'En attente', cls: 'badge-gray'  },
};

async function loadOrdersTab() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '<p class="loading">Chargement...</p>';

    const { data, error } = await db
        .from('orders')
        .select('id, coin_amount, price, payment_status, order_status, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<p class="empty">Erreur de chargement.</p>';
        return;
    }
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="empty">Aucune commande pour le moment.</p>';
        return;
    }

    container.innerHTML = data.map(o => {
        const os = ORDER_STATUS_MAP[o.order_status] || ORDER_STATUS_MAP['en_attente'];
        const ps = PAYMENT_STATUS_MAP[o.payment_status] || PAYMENT_STATUS_MAP['en_attente'];
        const date = new Date(o.created_at).toLocaleDateString('fr-FR');
        return `<div class="order-card">
            <div class="order-header">
                <span class="order-id">Commande #${o.id}</span>
                <span class="badge ${os.cls}">${os.label}</span>
            </div>
            <div class="order-body">
                <span>🪙 ${o.coin_amount} pièces</span>
                <span style="color:var(--color-accent);font-weight:700">${formatPrice(o.price)}</span>
            </div>
            <div class="order-date" style="display:flex;justify-content:space-between;align-items:center">
                <span>${date}</span>
                <span class="badge ${ps.cls}" style="font-size:11px">${ps.label}</span>
            </div>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════
// TAB 4 — PROFIL
// ═══════════════════════════════════════════════════════════

async function loadProfileTab() {
    const user = currentUser;

    document.getElementById('profileUsername').textContent  = '@' + user.tiktok_username;
    document.getElementById('displayName').textContent      = user.tiktok_username;
    document.getElementById('avatarFallback').textContent   = user.tiktok_username[0].toUpperCase();

    // Try TikTok oEmbed (often blocked by CORS — fallback handles it)
    const oembedUrl = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${encodeURIComponent(user.tiktok_username)}`;

    try {
        const controller = new AbortController();
        const timeout    = setTimeout(() => controller.abort(), 4000);

        const resp = await fetch(oembedUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const json = await resp.json();

        const avatarImg = document.getElementById('avatarImg');
        avatarImg.src   = json.thumbnail_url;
        avatarImg.style.display = 'block';
        avatarImg.onerror = () => {
            avatarImg.style.display = 'none';
        };

        if (json.author_name) {
            document.getElementById('displayName').textContent = json.author_name;
        }
    } catch {
        // CORS / network error — fallback avatar already showing
    }

    // Publications: no CORS-safe TikTok endpoint available
    renderPublicationsFallback(user.tiktok_username);
}

function renderPublicationsFallback(username) {
    const grid = document.getElementById('pubGrid');
    grid.innerHTML = `
        <div class="pub-placeholder-msg">
            <div style="font-size:48px">📱</div>
            <p>Les publications TikTok ne peuvent pas être affichées directement.</p>
            <a href="https://www.tiktok.com/@${encodeURIComponent(username)}"
               target="_blank"
               class="btn-secondary">
               Voir le profil sur TikTok ↗
            </a>
        </div>`;
}
