import { useEffect, useState } from "react";
import { fetchPublicBooks } from "../api";

const COVER_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" fill="none">
      <rect width="600" height="800" fill="#D7E4DE"/>
      <rect x="70" y="90" width="460" height="620" rx="8" fill="#EEF3F0"/>
      <path d="M180 300h240M180 360h180M180 420h200" stroke="#1A9B8E" stroke-width="18" stroke-linecap="round"/>
    </svg>`
  );

function formatPrice(price) {
  const value = Number(price);
  if (Number.isNaN(value)) return "—";
  return `₹${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadBooks = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchPublicBooks({ page: 1, pageSize: 12 });
        if (!cancelled) {
          setBooks(data?.data ?? []);
        }
      } catch (err) {
        console.log(err);
        if (!cancelled) {
          setError(err?.message ?? "Unable to load books.");
          setBooks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBooks();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="books" id="books" aria-labelledby="books-heading">
      <div className="section-intro">
        <h2 id="books-heading">Books on the shelf</h2>
        <p>A rotating selection of fiction, science, poetry, and more.</p>
      </div>

      {loading ? (
        <p className="books__status">Loading books...</p>
      ) : error ? (
        <p className="books__status books__status--error">{error}</p>
      ) : books.length === 0 ? (
        <p className="books__status">No books available yet.</p>
      ) : (
        <ul className="books__grid">
          {books.map((book, index) => (
            <li
              key={book.id}
              className="book-item"
              style={{ "--delay": `${index * 70}ms` }}
            >
              <a href="#contact" className="book-item__link">
                <img
                  src={book.cover_image || COVER_PLACEHOLDER}
                  alt=""
                  className="book-item__image"
                  loading="lazy"
                />
                <div className="book-item__body">
                  <h3>{book.title}</h3>
                  <p className="book-item__author">{book.author}</p>
                  <p className="book-item__meta">
                    <span>{book.genre}</span>
                    <span>{formatPrice(book.price)}</span>
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default Books;
