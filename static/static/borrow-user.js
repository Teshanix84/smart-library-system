// borrow-user.js

const BORROW_API = "http://localhost:8081/api/borrows";

/** Utility: format Date object to yyyy-mm-dd for input[type=date] and JSON */
function formatDateForInput(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** Compute due date = borrowDate + 14 days */
function computeDueDateFrom(borrowDateStr) {
    // borrowDateStr expected 'yyyy-mm-dd'
    if (!borrowDateStr) return null;
    const parts = borrowDateStr.split('-').map(p => parseInt(p, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    // new Date(year, monthIndex, day)
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + 14);
    return formatDateForInput(d);
}

// -------------------- API: Load user borrows --------------------
async function loadUserBorrows() {
    const userId = document.getElementById("userId").value;
    if (!userId) {
        showError("Please enter your User ID first!");
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${BORROW_API}?userId=${userId}`);

        if (!response.ok) {
            showError("❌ Error loading borrows");
            return;
        }

        const data = await response.json();

        // Handle both array response and message response
        if (Array.isArray(data)) {
            renderTable(data);
        } else if (data.message) {
            showInfo(data.message);
            renderTable([]);
        } else {
            renderTable(data);
        }
    } catch (error) {
        showError("❌ Network error: " + error.message);
    }
}

// -------------------- API: Add new borrow --------------------
async function addBorrow() {
    const userId = document.getElementById("userId").value;
    const bookId = document.getElementById("bookId").value;
    let borrowDate = document.getElementById("borrowDate").value;
    let dueDate = document.getElementById("dueDate").value;

    if (!userId || !bookId || !borrowDate) {
        showError("Please fill all required details!");
        return;
    }

    // Defensive: if dueDate is empty or invalid, compute borrowDate + 14
    if (!dueDate) {
        dueDate = computeDueDateFrom(borrowDate);
    }

    const borrowData = {
        user: { id: parseInt(userId, 10) },
        book: { id: parseInt(bookId, 10) },
        borrowDate: borrowDate,
        dueDate: dueDate
    };

    try {
        const response = await fetch(BORROW_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(borrowData)
        });

        // Try to parse JSON safely
        let result = {};
        try { result = await response.json(); } catch (e) { /* ignore */ }

        if (response.ok) {
            showSuccess("✅ Book borrowed successfully!");
            hideBorrowForm();
            loadUserBorrows();
        } else {
            showError("❌ Error: " + (result.error || result.message || "Failed to borrow book"));
        }
    } catch (error) {
        showError("❌ Network error: " + error.message);
    }
}

// -------------------- API: Return book --------------------
async function returnBook(id) {
    const date = prompt("Enter return date (YYYY-MM-DD):");
    if (!date) return;

    try {
        const response = await fetch(`${BORROW_API}/${id}/return?date=${encodeURIComponent(date)}`, {
            method: "PUT"
        });

        let result = {};
        try { result = await response.json(); } catch (e) { /* ignore */ }

        if (response.ok) {
            showSuccess("✅ Book returned successfully!");
            loadUserBorrows();
        } else {
            showError("❌ Error: " + (result.error || result.message || "Failed to return book"));
        }
    } catch (error) {
        showError("❌ Network error: " + error.message);
    }
}

// -------------------- Show overdue for user --------------------
async function showUserOverdue() {
    const userId = document.getElementById("userId").value;
    if (!userId) {
        showError("Please enter your User ID first!");
        return;
    }

    try {
        const response = await fetch(`${BORROW_API}?userId=${userId}`);

        if (!response.ok) {
            showError("❌ Error loading borrows");
            return;
        }

        const allBorrows = await response.json();

        const borrowsArray = Array.isArray(allBorrows) ? allBorrows : (allBorrows.message ? [] : allBorrows);

        const today = new Date().toISOString().split('T')[0];
        const overdue = borrowsArray.filter(borrow =>
            !borrow.returned &&
            borrow.dueDate &&
            borrow.dueDate < today
        );

        if (overdue.length === 0) {
            showInfo("✅ No overdue books found!");
            renderTable([]);
        } else {
            renderTable(overdue);
        }
    } catch (error) {
        showError("❌ Network error: " + error.message);
    }
}

// -------------------- Render table --------------------
function renderTable(borrows) {
    const tbody = document.getElementById("borrowBody");
    tbody.innerHTML = "";

    if (!Array.isArray(borrows) || borrows.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="6" class="empty-state">
                <div>📚</div>
                <p>${document.getElementById("userId").value ? "No borrow records found" : "Enter your User ID to see your borrowed books"}</p>
            </td>
        </tr>`;
        return;
    }

    borrows.forEach(borrow => {
        const status = getBorrowStatus(borrow);
        const statusBadge = `<span class="status-badge ${status.class}">${status.text}</span>`;

        const isReturned = borrow.returned || (borrow.returnDate !== null && borrow.returnDate !== undefined);
        const returnButton = !isReturned ?
            `<button class="btn btn-success btn-sm" onclick="returnBook(${borrow.id})">Return</button>` :
            '<span style="color: #10b981; font-weight: 600;">✓ Returned</span>';

        tbody.innerHTML += `<tr>
            <td>${borrow.book?.id ?? "-"}</td>
            <td>${borrow.borrowDate ?? "-"}</td>
            <td>${borrow.dueDate ?? "-"}</td>
            <td>${borrow.returnDate ?? "-"}</td>
            <td>${statusBadge}</td>
            <td>${returnButton}</td>
        </tr>`;
    });
}

// -------------------- Borrow status helper --------------------
function getBorrowStatus(borrow) {
    const today = new Date().toISOString().split('T')[0];

    if (borrow.returned) {
        return { class: 'status-returned', text: 'Returned' };
    } else if (borrow.dueDate && borrow.dueDate < today) {
        return { class: 'status-overdue', text: 'Overdue' };
    } else {
        return { class: 'status-active', text: 'Active' };
    }
}

// -------------------- Form toggle functions & auto date logic --------------------
function showBorrowForm() {
    const userId = document.getElementById("userId").value;
    if (!userId) {
        showError("Please enter your User ID first!");
        return;
    }

    // Set borrow date to today
    const today = new Date();
    const borrowDateStr = formatDateForInput(today);
    document.getElementById("borrowDate").value = borrowDateStr;

    // Set due date = borrowDate + 14
    const due = computeDueDateFrom(borrowDateStr);
    if (due) {
        document.getElementById("dueDate").value = due;
    }

    // Overwrite onchange to avoid adding multiple listeners
    const borrowDateEl = document.getElementById("borrowDate");
    borrowDateEl.onchange = function () {
        const newBorrow = this.value;
        if (newBorrow) {
            const newDue = computeDueDateFrom(newBorrow);
            if (newDue) document.getElementById("dueDate").value = newDue;
        }
    };

    document.getElementById("borrowFormOverlay").style.display = "flex";
}

function hideBorrowForm() {
    document.getElementById("borrowFormOverlay").style.display = "none";
    // Clear form fields
    document.getElementById("bookId").value = "";
    document.getElementById("borrowDate").value = "";
    document.getElementById("dueDate").value = "";
}

// -------------------- Navigation --------------------
function goToBooks() {
    window.location.href = "books.html";
}

// -------------------- Notifications (toasts) --------------------
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notif => notif.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `custom-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .custom-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                padding: 16px;
                color: #f8fafc;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                animation: slideInRight 0.3s ease;
                max-width: 400px;
            }
            .custom-notification.success {
                border-left: 4px solid #10b981;
            }
            .custom-notification.error {
                border-left: 4px solid #ef4444;
            }
            .custom-notification.info {
                border-left: 4px solid #0ea5e9;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .notification-icon {
                font-size: 20px;
            }
            .notification-message {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
            }
            .notification-close {
                background: none;
                border: none;
                color: #cbd5e1;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.3s ease;
            }
            .notification-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'info': return 'ℹ️';
        default: return '📢';
    }
}

// -------------------- Loading helper --------------------
function showLoading() {
    const tbody = document.getElementById("borrowBody");
    // If table currently showing empty state, show loading
    if (tbody.children.length === 1 && tbody.children[0].className === 'empty-state') {
        tbody.innerHTML = `<tr>
            <td colspan="6" class="empty-state">
                <div>⏳</div>
                <p>Loading your books...</p>
            </td>
        </tr>`;
    }
}

// -------------------- Keyboard & initial load handlers --------------------
document.addEventListener('DOMContentLoaded', function() {
    const userIdInput = document.getElementById('userId');
    if (userIdInput) {
        userIdInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadUserBorrows();
            }
        });
    }

    // Add Enter key support for form inputs inside overlay (submits borrow)
    const formInputs = document.querySelectorAll('#borrowFormOverlay input');
    formInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // prevent accidental form submit that may reload
                addBorrow();
            }
        });
    });
});

// Auto-load books if user ID is already in URL
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('userId');

    if (userIdFromUrl) {
        document.getElementById('userId').value = userIdFromUrl;
        loadUserBorrows();
    }

    renderTable([]);
};
