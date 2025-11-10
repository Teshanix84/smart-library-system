// admin-auth.js - forces redirect on success + improved debug logs
const API_BASE = "http://localhost:8081/api/admin";

// ---------------------- helpers ----------------------
function showMessage(elId, text = "", type = "error") {
    const el = document.getElementById(elId);
    if (!el) {
        // fallback console log
        console.log(`[showMessage:${type}]`, text);
        return;
    }

    if (el.classList && el.classList.contains("message")) {
        el.className = "message";
        if (!text) {
            el.style.display = "none";
            el.textContent = "";
            el.setAttribute("aria-hidden", "true");
            return;
        }
        el.style.display = "flex";
        el.setAttribute("aria-hidden", "false");
        if (type === "success") el.classList.add("success");
        else if (type === "info") el.classList.add("info");
        else el.classList.add("error");
        el.textContent = text;
        return;
    }

    el.textContent = text || "";
    el.style.display = text ? "block" : "none";
    el.style.color = type === "error" ? "#ef4444" : "#16a34a";
}

async function parseResponseTextOrJson(res) {
    try {
        const txt = await res.text();
        try {
            const json = JSON.parse(txt);
            return json;
        } catch {
            return txt;
        }
    } catch (err) {
        return null;
    }
}

async function postJson(url, payload) {
    // Helpful debug
    console.log(`[postJson] POST ${url}`, payload);
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // If your backend uses cookies/session, uncomment:
        // credentials: 'include',
        body: JSON.stringify(payload),
    });
    console.log(`[postJson] response status ${res.status}`);
    return res;
}

// ---------------------- Login ----------------------
/**
 * authLogin({ username, password, autoRedirect = true })
 * - returns { success: boolean, message: string, token?: string }
 * - by default performs redirect to admin-panel.html on success
 */
async function authLogin({ username, password, autoRedirect = true } = {}) {
    const msgId = document.getElementById("msg") ? "msg" : (document.getElementById("message") ? "message" : null);
    if (msgId) showMessage(msgId, "", "error");

    if (!username || !password) {
        if (msgId) showMessage(msgId, "Please enter username and password.", "error");
        return { success: false, message: "Please enter username and password." };
    }

    try {
        const res = await postJson(`${API_BASE}/login`, { username, password });

        // parse full body (try JSON otherwise text)
        const body = await parseResponseTextOrJson(res);
        console.log("[authLogin] parsed body:", body);

        if (res.ok) {
            // Prefer body.token if present
            const token = (body && (body.token || body.accessToken)) || undefined;

            // store minimal login flags
            localStorage.setItem("isAdminLoggedIn", "true");
            localStorage.setItem("adminUsername", username);
            if (token) {
                localStorage.setItem("admin_token", token);
                console.log("[authLogin] saved admin_token");
            }

            const message = (body && (body.message || body.msg)) || "Login successful.";
            if (msgId) showMessage(msgId, message, "success");

            const result = { success: true, message, token };

            // Decide redirect target:
            // prefer server-provided redirect/next field if present
            const redirectTo = (body && (body.redirect || body.next)) || "admin-panel.html";

            // If autoRedirect enabled, perform redirect
            if (autoRedirect) {
                // short delay so success message shows
                console.log("[authLogin] success — redirecting to:", redirectTo);
                setTimeout(() => {
                    // use replace to avoid back to login
                    window.location.replace(redirectTo);
                }, 600);
            }

            return result;
        } else {
            // Not ok (401 etc.). Extract the best message available.
            let text = "Invalid credentials";
            if (body) {
                if (typeof body === "string") text = body;
                else text = body.message || body.error || body.msg || JSON.stringify(body);
            }
            text = (text || "Invalid credentials").trim();
            if (msgId) showMessage(msgId, text, "error");
            console.warn("[authLogin] login failed:", res.status, text);
            return { success: false, message: text };
        }
    } catch (err) {
        console.error("Login error:", err);
        if (msgId) showMessage(msgId, "Server error. Please try again later.", "error");
        return { success: false, message: "Server error. Please try again later." };
    }
}

// wrapper (keeps previous behavior)
async function handleLogin() {
    const username = (document.getElementById("username") || {}).value || "";
    const password = (document.getElementById("password") || {}).value || "";
    const btn = document.getElementById("loginBtn");
    if (btn) btn.disabled = true;
    const result = await authLogin({ username: username.trim(), password: password.trim(), autoRedirect: true });
    if (btn) btn.disabled = false;
    return result;
}

// ---------------------- Register ----------------------
async function authRegister({ username, email, password } = {}) {
    const msgId = document.getElementById("registerMsg") ? "registerMsg" : (document.getElementById("message") ? "message" : null);
    if (msgId) showMessage(msgId, "", "error");

    if (!username || !email || !password) {
        if (msgId) showMessage(msgId, "All fields are required.", "error");
        return { success: false, message: "All fields are required." };
    }
    if (password.length < 6) {
        if (msgId) showMessage(msgId, "Password must be at least 6 characters.", "error");
        return { success: false, message: "Password must be at least 6 characters." };
    }

    try {
        const res = await postJson(`${API_BASE}/create-admin`, { username, password, email });
        const body = await parseResponseTextOrJson(res);
        console.log("[authRegister] response:", res.status, body);

        if (res.ok) {
            const txt = (body && (body.message || body.msg)) || "Registered successfully.";
            // show inline message
            if (msgId) showMessage(msgId, txt, "success");

            // redirect to login after a short delay
            setTimeout(() => {
                window.location.replace("admin-login.html");
            }, 800);

            return { success: true, message: txt };
        } else {
            let text = "Registration failed";
            if (body) {
                if (typeof body === "string") text = body;
                else text = body.message || body.error || body.msg || JSON.stringify(body);
            }
            if (msgId) showMessage(msgId, text.trim() || "Registration failed", "error");
            return { success: false, message: text.trim() || "Registration failed" };
        }
    } catch (err) {
        console.error("Register error:", err);
        if (msgId) showMessage(msgId, "Server error. Please try again later.", "error");
        return { success: false, message: "Server error. Please try again later." };
    }

}

async function handleRegister() {
    const username = (document.getElementById("regUsername") || document.getElementById("username") || {}).value || "";
    const email = (document.getElementById("regEmail") || document.getElementById("email") || {}).value || "";
    const password = (document.getElementById("regPassword") || document.getElementById("password") || {}).value || "";
    const btn = document.getElementById("registerBtn");
    if (btn) btn.disabled = true;
    const result = await authRegister({ username: username.trim(), email: email.trim(), password: password.trim() });
    if (btn) btn.disabled = false;
    return result;
}

// ---------------------- Auto-wire buttons ----------------------
document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn && !loginBtn.onclick) loginBtn.addEventListener("click", (e) => { e.preventDefault(); handleLogin(); });

    const registerBtn = document.getElementById("registerBtn");
    if (registerBtn && !registerBtn.onclick) registerBtn.addEventListener("click", (e) => { e.preventDefault(); handleRegister(); });

    // Create fallback message elements for backwards compatibility
    if (!document.getElementById("message")) {
        const msg = document.createElement("p");
        msg.id = "message";
        msg.style.display = "none";
        msg.style.marginTop = "10px";
        const container = document.querySelector(".card") || document.body;
        container.appendChild(msg);
    }
    if (!document.getElementById("registerMsg")) {
        const msg = document.createElement("p");
        msg.id = "registerMsg";
        msg.style.display = "none";
        msg.style.marginTop = "10px";
        const container = document.querySelector(".card") || document.body;
        container.appendChild(msg);
    }

    console.log("[admin-auth] auto-wired buttons and ready");
});
