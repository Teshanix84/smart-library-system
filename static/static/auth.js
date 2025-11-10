// auth.js - robust client auth helper (backend + local fallback)
const API_URL = "http://localhost:8081/api/user"; // adjust if backend differs

// helper: safely parse backend responses
async function parseResponse(res) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json().catch(()=>null);
    return await res.text().catch(()=>null);
}

/* ----------------- REGISTER ----------------- */
async function register() {
    console.log('[auth] register() called');
    const name = (document.getElementById("regUsername")?.value || '').trim();
    const email = (document.getElementById("regEmail")?.value || '').trim();
    const password = (document.getElementById("regPassword")?.value || '');

    const msgEl = document.getElementById('registerMsg') || { style:{}, textContent:'' };
    msgEl.style.display = 'none'; msgEl.textContent = '';

    if (!name || !email || !password) {
        msgEl.style.display='block';
        msgEl.textContent = 'Please fill all fields.';
        return;
    }

    const btn = document.getElementById('registerBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Registering...'; }

    try {
        // Try backend first
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const body = await parseResponse(res);

        if (res.ok) {
            msgEl.style.display='block';
            msgEl.textContent = (body && body.message) ? body.message : 'Registration successful!';
            setTimeout(()=> window.location.href = 'login.html', 900);
            return;
        } else {
            msgEl.style.display='block';
            msgEl.textContent = (body && body.message) ? body.message : `Error ${res.status}`;
            return;
        }

    } catch (err) {
        console.warn('[auth] register backend failed, using local fallback:', err);

        // Local fallback (dev mode)
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.email === email)) {
            msgEl.style.display='block';
            msgEl.textContent = 'This email is already registered (local).';
            return;
        }

        // assign sequential ID (1, 2, 3, ...)
        const nextId = users.length > 0 ? users[users.length - 1].id + 1 : 1;

        const newUser = { id: nextId, name, email, password };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        msgEl.style.display='block';
        msgEl.textContent = `Registered locally with ID: ${nextId}`;
        setTimeout(()=> window.location.href = 'login.html', 800);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Register'; }
    }
}
window.register = register;

/* ----------------- LOGIN ----------------- */
async function userLogin({ username, password }) {
    console.log('[auth] userLogin() called', { username });
    const msgEl = document.getElementById('message') || { style:{}, textContent:'' };
    msgEl.style.display = 'none'; msgEl.textContent = '';

    if (!username || !password) {
        msgEl.style.display='block';
        msgEl.textContent = 'Please enter both username and password.';
        return;
    }

    const btn = document.getElementById('loginBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Logging in...'; }

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const body = await parseResponse(res);

        if (res.ok) {
            console.log('[auth] login success (backend)', body);
            localStorage.setItem('loggedInUser', JSON.stringify(body));
            window.location.href = 'user-dashboard.html';
            return;
        } else {
            msgEl.style.display='block';
            msgEl.textContent = (body && body.message) ? body.message : `Login failed (${res.status})`;
            return;
        }

    } catch (err) {
        console.warn('[auth] login backend failed, trying local fallback:', err);

        let users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u =>
            (u.email === username || u.name === username || u.username === username)
            && u.password === password
        );

        if (user) {
            console.log('[auth] local login success', user);
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            window.location.href = 'user-dashboard.html';
        } else {
            msgEl.style.display='block';
            msgEl.textContent = 'Network error and no local account matched.';
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
    }
}
window.userLogin = userLogin;

/* ----------------- AUTO-WIRE UI ----------------- */
document.addEventListener('DOMContentLoaded', () => {
    // Register button handler
    const regBtn = document.getElementById('registerBtn');
    if (regBtn) {
        regBtn.addEventListener('click', () => register());
        ['regUsername','regEmail','regPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') regBtn.click(); });
        });
    }

    // Login button handler
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = (document.getElementById('username')?.value || '').trim();
            const password = (document.getElementById('password')?.value || '');
            userLogin({ username, password });
        });
        ['username','password'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
        });
    }
});
