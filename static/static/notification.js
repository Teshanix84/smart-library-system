const userId = localStorage.getItem("userId");
const NOTIFICATION_API = `http://localhost:8081/api/notifications`;

// guard: ensure userId present
if (!userId) {
    console.warn("No userId found in localStorage. Notifications will not load.");
}

async function loadNotifications() {
    if (!userId) return;
    try {
        const res = await fetch(`${NOTIFICATION_API}/user/${userId}`);
        if (!res.ok) {
            console.error("Failed to fetch notifications:", res.status, res.statusText);
            document.getElementById("notificationContainer").innerHTML = "<p>Error loading notifications.</p>";
            return;
        }
        const data = await res.json();

        const container = document.getElementById("notificationContainer");
        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.innerHTML = "<p>No notifications yet.</p>";
            return;
        }

        data.forEach(n => {
            const div = document.createElement("div");
            div.classList.add("notification-item");
            if (n.read) div.classList.add("read");

            // safe interpolation: create elements instead of raw innerHTML for user content if needed
            div.innerHTML = `
        <div>
          <strong>📘 Message:</strong> ${escapeHtml(n.message)}
          <br>
          <small>${new Date(n.createdAt || n.timestamp || Date.now()).toLocaleString()}</small>
        </div>
        <div style="text-align:right; margin-top:8px;">
          ${!n.read ? `<button class="mark-read-btn" data-id="${n.id}">Mark Read</button>` : ""}
          <button class="delete-btn" data-id="${n.id}">Delete</button>
        </div>
      `;

            container.appendChild(div);
        });

        // attach event listeners using delegation for performance
        container.querySelectorAll(".mark-read-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.currentTarget.dataset.id;
                await markAsRead(id, e.currentTarget);
            });
        });
        container.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.currentTarget.dataset.id;
                await deleteNotification(id, e.currentTarget);
            });
        });

    } catch (err) {
        console.error("Error loading notifications:", err);
        document.getElementById("notificationContainer").innerHTML = "<p>Error loading notifications.</p>";
    }
}

async function markAsRead(id, btnEl) {
    if (!id) return;
    try {
        btnEl && (btnEl.disabled = true);
        const res = await fetch(`${NOTIFICATION_API}/${id}/read`, { method: "PUT" });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        await loadNotifications();
    } catch (err) {
        console.error("Error marking read:", err);
        alert("Failed to mark notification as read.");
    } finally {
        btnEl && (btnEl.disabled = false);
    }
}

async function markAllAsRead() {
    if (!userId) return;
    try {
        const res = await fetch(`${NOTIFICATION_API}/${userId}`, { method: "PUT" });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        await loadNotifications();
    } catch (err) {
        console.error("Error marking all read:", err);
        alert("Failed to mark all notifications as read.");
    }
}


async function deleteNotification(id, btnEl) {
    if (!id) return;
    if (!confirm("Delete this notification?")) return;
    try {
        btnEl && (btnEl.disabled = true);
        const res = await fetch(`${NOTIFICATION_API}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        await loadNotifications();
    } catch (err) {
        console.error("Error deleting notification:", err);
        alert("Failed to delete notification.");
    } finally {
        btnEl && (btnEl.disabled = false);
    }
}

async function deleteAllNotifications() {
    if (!userId) return;
    if (!confirm("Delete all notifications?")) return;
    try {
        const res = await fetch(`${NOTIFICATION_API}/user/${userId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        await loadNotifications();
    } catch (err) {
        console.error("Error deleting all notifications:", err);
        alert("Failed to delete notifications.");
    }
}

// small helper to escape text to avoid HTML injection
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return "";
    return String(unsafe)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// initial load
loadNotifications();

// auto-refresh every 10s
const REFRESH_INTERVAL_MS = 10000;
setInterval(loadNotifications, REFRESH_INTERVAL_MS);
