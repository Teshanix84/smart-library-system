const BOOK_API = "http://localhost:8081/api/books";

async function loadBooks() {
    const response = await fetch(BOOK_API);
    const books = await response.json();

    const tbody = document.getElementById("booksBody");
    tbody.innerHTML = "";

    books.forEach(book => {
        tbody.innerHTML += `
            <tr>
                <td>${book.id}</td>
                <td><img src="${book.imageUrl || 'images/default-book.png'}" width="60" height="80" style="border-radius:5px;"></td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.category}</td>
                <td>${book.publicationYear}</td>
                <td>
                    <button onclick="editBook(${book.id}, '${book.title}', '${book.author}', '${book.category}', ${book.publicationYear}, '${book.imageUrl || ''}')">✏️ Edit</button>
                    <button onclick="deleteBook(${book.id})">🗑️ Delete</button>
                    <button onclick="goToBorrow(${book.id}, '${book.title}')">📖 Borrow</button>
                </td>
            </tr>
        `;
    });
}

function showAddForm() {
    document.getElementById("bookId").value = "";
    document.getElementById("title").value = "";
    document.getElementById("author").value = "";
    document.getElementById("category").value = "";
    document.getElementById("year").value = "";
    document.getElementById("imageFile").value = "";
    document.getElementById("formTitle").textContent = "Add New Book";
    document.getElementById("bookForm").style.display = "block";
}

function hideForm() {
    document.getElementById("bookForm").style.display = "none";
}

function editBook(id, title, author, category, year, imageUrl) {
    document.getElementById("bookId").value = id;
    document.getElementById("title").value = title;
    document.getElementById("author").value = author;
    document.getElementById("category").value = category;
    document.getElementById("year").value = year;
    document.getElementById("formTitle").textContent = "Edit Book";
    document.getElementById("bookForm").style.display = "block";
}

async function saveBook() {
    const id = document.getElementById("bookId").value;
    const title = document.getElementById("title").value;
    const author = document.getElementById("author").value;
    const category = document.getElementById("category").value;
    const publicationYear = document.getElementById("year").value;
    const imageFile = document.getElementById("imageFile").files[0];

    let imageUrl = null;

    // 🖼️ If user uploaded a file, upload it first
    if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadResponse = await fetch(`${BOOK_API}/upload`, {
            method: "POST",
            body: formData
        });
        imageUrl = await uploadResponse.text();
    }

    const book = { title, author, category, publicationYear, imageUrl };
    const method = id ? "PUT" : "POST";
    const url = id ? `${BOOK_API}/${id}` : BOOK_API;

    const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book)
    });

    const result = await response.text();
    alert(result);
    hideForm();
    loadBooks();
}

async function deleteBook(id) {
    if (!confirm("Are you sure you want to delete this book?")) return;
    const response = await fetch(`${BOOK_API}/${id}`, { method: "DELETE" });
    const result = await response.text();
    alert(result);
    loadBooks();
}

function goToBorrow(id, title) {
    window.location.href = `borrow-admin.html?bookId=${id}&title=${encodeURIComponent(title)}`;
}

function logout() {
    localStorage.clear();
    window.location.href = "admin-login.html";
}

window.onload = loadBooks;
