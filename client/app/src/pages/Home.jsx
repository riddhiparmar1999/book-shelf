import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Filter from "../Filter";
import { apiFetch } from "../auth";
import ConfirmDialog from "../components/ConfirmDialog";
import { DeleteIcon, EditIcon, ViewIcon } from "../components/ActionIcons";
import { usePermissions } from "../permissions";

const emptyPagination = {
  current_page: 1,
  page_size: 5,
  total_records: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
};

const emptyFilters = {
  title: "",
  genres: [],
  authors: [],
  minPrice: "",
  maxPrice: "",
  year: "",
};

function Home({ showToast }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canCreate = can("books", "create");
  const canUpdate = can("books", "update");
  const canDelete = can("books", "delete");
  const canRead = can("books", "read");
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = pagination.page_size || 10;

  const fetchBooks = async (page = 1, options = {}) => {
    const { showSuccessMessage = false, filtersOverride } = options;
    const activeFilters = filtersOverride ?? filters;

    try {
      const response = await apiFetch("/books/", {
        method: "POST",
        body: JSON.stringify({
          page,
          page_size: pageSize,
          title: activeFilters.title,
          authors: activeFilters.authors,
          genres: activeFilters.genres,
          minPrice: activeFilters.minPrice,
          maxPrice: activeFilters.maxPrice,
          year: activeFilters.year,
        }),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (data?.success) {
        setBooks(data?.data ?? []);
        setPagination(data?.pagination ?? emptyPagination);
        if (showSuccessMessage && data?.message) {
          showToast(data.message);
        } else {
          showToast(data?.message);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.total_pages) return;
    if (page === pagination.current_page) return;
    fetchBooks(page);
  };

  const deleteBook = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      const response = await apiFetch(`/books/${pendingDelete.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        return;
      }

      if (editingId === pendingDelete.id) setEditingId(null);

      const isLastItemOnPage = books.length === 1 && pagination.current_page > 1;
      const pageToLoad = isLastItemOnPage
        ? pagination.current_page - 1
        : pagination.current_page;
      fetchBooks(pageToLoad);
      fetchFilters();
      setPendingDelete(null);
    } catch (err) {
      console.log(err);
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (book) => {
    navigate(`/edit_book/${book?.id}`);
  };

  const viewBook = (id) => {
    navigate(`/view_book/${id}`);
  };

  const fetchFilters = async () => {
    try {
      const response = await apiFetch("/book-filters/");

      if (response.status === 401) {
        return;
      }

      const data = await response.json();
      setAuthors(data?.data?.authors);
      setGenres(data?.data?.genres);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchBooks(1, { showSuccessMessage: true });
    fetchFilters();
  }, []);

  useEffect(() => {
    if (location.state?.toast) {
      showToast(location.state.toast);
      fetchBooks(1);
      fetchFilters();
      navigate("/books", { replace: true, state: {} });
    }
  }, [location.state, navigate, showToast]);

  return (
    <>
      <Filter
        authors={authors}
        genres={genres}
        filters={filters}
        setFilters={setFilters}
        applyFilters={fetchBooks}
        emptyFilters={emptyFilters}
      />

      <section className="library" aria-labelledby="library-heading">
        <div className="library__header">
          <div className="library__header-left">
            <h2 id="library-heading" className="library__title">
              About Books
            </h2>
            <p className="library__count">
              {pagination.total_records}{" "}
              {pagination.total_records === 1 ? "title" : "titles"}
            </p>
          </div>
          {canCreate && (
            <Link to="/add_book" className="btn btn--primary">
              Add book
            </Link>
          )}
        </div>

        {books?.length === 0 ? (
          <p className="empty">
            No books yet.
            {canCreate ? " Add your first one." : ""}
          </p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Author</th>
                    <th scope="col">Genre</th>
                    <th scope="col">Year</th>
                    <th scope="col">Price</th>
                    {(canRead || canUpdate || canDelete) && (
                      <th scope="col" className="data-table__actions-col">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {books?.map((book) => (
                    <tr
                      key={book?.id ?? `${book?.title}-${book?.releaseYear}`}
                      className={
                        editingId === book?.id ? "data-table__row--active" : ""
                      }
                    >
                      <td>
                        <span className="data-table__title">{book?.title}</span>
                        {book?.description && (
                          <span className="data-table__sub">
                            {book.description}
                          </span>
                        )}
                      </td>
                      <td>{book?.author || "—"}</td>
                      <td>
                        {book?.genre ? (
                          <span className="chip chip--mint">{book.genre}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{book?.releaseYear || "—"}</td>
                      <td className="data-table__price">
                        {book?.price != null && book?.price !== ""
                          ? `₹${Number(book.price).toFixed(2)}`
                          : "—"}
                      </td>
                      {(canRead || canUpdate || canDelete) && (
                        <td>
                          <div className="book__actions">
                            {canRead && (
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label={`View ${book?.title}`}
                                title="View"
                                onClick={() => viewBook(book?.id)}
                              >
                                <ViewIcon />
                              </button>
                            )}
                            {canUpdate && (
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label={`Edit ${book?.title}`}
                                title="Edit"
                                onClick={() => startEdit(book)}
                              >
                                <EditIcon />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="icon-btn icon-btn--danger"
                                aria-label={`Delete ${book?.title}`}
                                title="Delete"
                                onClick={() =>
                                  setPendingDelete({
                                    id: book?.id,
                                    name: book?.title,
                                  })
                                }
                              >
                                <DeleteIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav className="pagination" aria-label="Books pagination">
              <p className="pagination__info">
                Page {pagination.current_page} of {pagination.total_pages || 1}
                <span className="pagination__sep">·</span>
                {pagination.total_records} titles
              </p>

              <div className="pagination__controls">
                <button
                  type="button"
                  className="pagination__btn"
                  disabled={!pagination.has_previous}
                  aria-label="Previous page"
                  onClick={() => goToPage(pagination.current_page - 1)}
                >
                  Previous
                </button>

                <div className="pagination__pages">
                  {Array.from(
                    { length: pagination.total_pages || 1 },
                    (_, index) => {
                      const page = index + 1;
                      return (
                        <button
                          key={page}
                          type="button"
                          className={`pagination__page${
                            pagination.current_page === page
                              ? " pagination__page--active"
                              : ""
                          }`}
                          aria-label={`Page ${page}`}
                          aria-current={
                            pagination.current_page === page ? "page" : undefined
                          }
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  className="pagination__btn"
                  disabled={!pagination.has_next}
                  aria-label="Next page"
                  onClick={() => goToPage(pagination.current_page + 1)}
                >
                  Next
                </button>
              </div>
            </nav>
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete book"
        message="Are you sure you want to delete"
        itemName={pendingDelete?.name}
        confirmLabel="Delete book"
        loading={deleting}
        onConfirm={deleteBook}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default Home;
