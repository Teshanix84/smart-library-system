const BOOK_API = "http://localhost:8081/api/books";  // ✅ PORT 8081

async function loadBooks() {
    const searchEl = document.getElementById("search");
    const search = searchEl ? searchEl.value.trim() : '';

    const url = `${BOOK_API}${search ? `?search=${encodeURIComponent(search)}` : ''}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Failed to load books:', response.status, response.statusText);
            return;
        }

        const books = await response.json();

        const tbody = document.getElementById("booksBody");
        if (!tbody) {
            console.error('Element #booksBody not found');
            return;
        }

        let rows = '';
        books.forEach(book => {
            const img = book.imageUrl ?? book.image_url ?? 'images/default-book.png';
            const title = String(book.title ?? '');
            const author = String(book.author ?? '');
            const category = String(book.category ?? '');
            const year = String(book.publicationYear ?? book.publication_year ?? '');

            rows += `
        <tr data-book-id="${htmlEscapeAttr(book.id)}" data-book-title="${encodeURIComponent(title)}">
          <td>${htmlEscape(book.id)}</td>
          <td><img src="${htmlEscapeAttr(img)}" alt="Book" width="50" height="70" style="border-radius:5px;"></td>
          <td>${htmlEscape(title)}</td>
          <td>${htmlEscape(author)}</td>
          <td>${htmlEscape(category)}</td>
          <td>${htmlEscape(year)}</td>
          <td><button class="borrow-btn">📖 Borrow</button></td>
        </tr>
      `;
        });

        tbody.innerHTML = rows;
    } catch (err) {
        console.error('Error loading books:', err);
    }
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.borrow-btn');
    if (!btn) return;
    const tr = btn.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-book-id');
    const encodedTitle = tr.getAttribute('data-book-title') || '';
    const title = decodeURIComponent(encodedTitle);
    goToBorrow(id, title);
});

function goToBorrow(id, title) {
    window.location.href = `borrow-user.html?bookId=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}`;
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

window.addEventListener('load', loadBooks);

function htmlEscape(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function htmlEscapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}