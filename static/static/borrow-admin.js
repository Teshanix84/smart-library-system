const BORROW_API = "http://localhost:8081/api/borrows";

// Load all borrows
async function loadBorrows() {
    try {
        showLoading();
        const response = await fetch(`${BORROW_API}/admin/all`);
        const borrows = await response.json();
        renderTable(borrows);
    } catch (error) {
        showError("❌ Error loading borrows: " + error.message);
    }
}

// Add new borrow
async function addBorrow() {
    const bookId = document.getElementById("bookId").value;
    const userId = document.getElementById("userId").value;
    const borrowDate = document.getElementById("borrowDate").value;
    const dueDate = document.getElementById("dueDate").value;

    if(!bookId || !userId || !borrowDate) {
        showError("Please fill all required fields!");
        return;
    }

    const borrowData = {
        book: { id: parseInt(bookId) },
        user: { id: parseInt(userId) },
        borrowDate: borrowDate,
        dueDate: dueDate || null
    };

    try {
        const response = await fetch(`${BORROW_API}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(borrowData)
        });

        const result = await response.json();

        if (response.ok) {
            showSuccess("✅ Borrow record added successfully!");
            hideBorrowForm();
            loadBorrows();
        } else {
            showError("❌ Error: " + (result.error || "Failed to add borrow record"));
        }
    } catch (error) {
        showError("❌ Network error: " + error.message);
    }
}

// Delete borrow record
async function deleteBorrow(id) {
    if(!confirm("Are you sure you want to delete this borrow record?")) return;

    try {
        const response = await fetch(`${BORROW_API}/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess("✅ " + result.message);
            loadBorrows();
        } else {
            const error = await response.json();
            showError("❌ Error: " + (error.error || "Delete failed"));
        }
    } catch (error) {
        showError("❌ Network error: " + error.message);
    }
}

// Return book
async function returnBook(id) {
    const date = prompt("Enter return date (YYYY-MM-DD):");
    if(!date) return;

    try {
        const response = await fetch(`${BORROW_API}/${id}/return?date=${date}`, {
            method: "PUT"
        });

        const result = await response.json();

        if (response.ok) {
            showSuccess("✅ Book returned successfully!");
            loadBorrows();
        } else {
            showError("❌ Error: " + (result.error || "Failed to return book"));
        }
    } catch (error) {
        showError("❌ Network error: " + error.message);
    }
}

// Show overdue by due date
async function showOverdueDueDate() {
    try {
        const response = await fetch(`${BORROW_API}/admin/overdue/by-due-date`);
        const data = await response.json();
        if(data.message) {
            showInfo(data.message);
            return;
        }
        renderTable(data);
    } catch (error) {
        showError("❌ Error loading overdue: " + error.message);
    }
}

// Show overdue by return date
async function showOverdueReturnDate() {
    try {
        const response = await fetch(`${BORROW_API}/admin/overdue/by-return-date`);
        const data = await response.json();
        if(data.message) {
            showInfo(data.message);
            return;
        }
        renderTable(data);
    } catch (error) {
        showError("❌ Error loading overdue: " + error.message);
    }
}

// Filter by user
async function filterByUser() {
    const userId = document.getElementById("filterUserId").value;
    if(!userId) {
        showError("Please enter user ID");
        return;
    }

    try {
        const response = await fetch(`${BORROW_API}/admin/all?userId=${userId}`);
        const data = await response.json();
        renderTable(data);
    } catch (error) {
        showError("❌ Error filtering: " + error.message);
    }
}

// Filter by book
async function filterByBook() {
    const bookId = document.getElementById("filterBookId").value;
    if(!bookId) {
        showError("Please enter book ID");
        return;
    }

    try {
        const response = await fetch(`${BORROW_API}/admin/all?bookId=${bookId}`);
        const data = await response.json();
        renderTable(data);
    } catch (error) {
        showError("❌ Error filtering: " + error.message);
    }
}

// Show statistics
async function showStats() {
    try {
        const response = await fetch(`${BORROW_API}/admin/stats`);
        const stats = await response.json();

        const statsText = `📊 Borrow Statistics:\n\n📚 Total: ${stats.total}\n📖 Active: ${stats.active}\n✅ Returned: ${stats.returned}\n⚠️ Overdue: ${stats.overdue}`;
        showInfo(statsText);
    } catch (error) {
        showError("❌ Error loading stats: " + error.message);
    }
}

// Render table
function renderTable(borrows) {
    const tbody = document.getElementById("borrowBody");
    tbody.innerHTML = "";

    if (!Array.isArray(borrows) || borrows.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="8" class="empty-state">
                <div>📖</div>
                <p>No borrow records found</p>
                <button class="btn btn-primary" onclick="showBorrowForm()" style="margin-top: 15px;">
                    Create First Borrow
                </button>
            </td>
        </tr>`;
        return;
    }

    borrows.forEach(borrow => {
        const status = getBorrowStatus(borrow);
        const statusBadge = `<span class="status-badge ${status.class}">${status.text}</span>`;

        const row = `<tr>
            <td>${borrow.id}</td>
            <td>${borrow.user?.id ?? "-"} (${borrow.user?.name ?? "N/A"})</td>
            <td>${borrow.book?.id ?? "-"} (${borrow.book?.title ?? "N/A"})</td>
            <td>${borrow.borrowDate ?? "-"}</td>
            <td>${borrow.dueDate ?? "-"}</td>
            <td>${borrow.returnDate ?? "-"}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="action-buttons">
                    ${!borrow.returned ? `<button class="btn btn-success btn-sm" onclick="returnBook(${borrow.id})">Return</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteBorrow(${borrow.id})">Delete</button>
                </div>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

// Helper function to determine borrow status
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

// Form toggle functions
function showBorrowForm() {
    document.getElementById("borrowFormOverlay").style.display = "flex";
}

function hideBorrowForm() {
    document.getElementById("borrowFormOverlay").style.display = "none";
    // Clear form fields
    document.getElementById("bookId").value = "";
    document.getElementById("userId").value = "";
    document.getElementById("borrowDate").valueAsDate = new Date();
    document.getElementById("dueDate").value = "";
}

// Redirect to books page
function goToBooks() {
    window.location.href = "admin-panel.html";
}

// Notification functions
function showSuccess(message) {
    alert(message); // Can be replaced with a toast notification
}

function showError(message) {
    alert(message); // Can be replaced with a toast notification
}

function showInfo(message) {
    alert(message); // Can be replaced with a toast notification
}

function showLoading() {
    // Can implement loading spinner
}

// Initial load
window.onload = loadBorrows;