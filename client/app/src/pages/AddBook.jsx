import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";
import FileUpload from "../components/FileUpload";
import { usePermissions } from "../permissions";

const emptyForm = {
  title: "",
  releaseYear: "",
  author: "",
  genre: "",
  price: "",
  description: "",
};

const emptyErrors = {
  title: "",
  releaseYear: "",
  author: "",
  genre: "",
  price: "",
  description: "",
  cover_image: "",
};

const bookToForm = (book) => ({
  title: book?.title ?? "",
  releaseYear: book?.releaseYear ?? "",
  author: book?.author ?? "",
  genre: book?.genre ?? "",
  price: book?.price ?? "",
  description: book?.description ?? "",
});

function buildBookFormData(bookForm, coverFile) {
  const formData = new FormData();
  formData.append("title", bookForm.title.trim());
  formData.append("releaseYear", String(Number(bookForm.releaseYear)));
  formData.append("author", bookForm.author.trim());
  formData.append("genre", bookForm.genre.trim());
  formData.append("price", String(Number(bookForm.price)));
  formData.append("description", bookForm.description.trim());
  if (coverFile) {
    formData.append("cover_image", coverFile);
  }
  return formData;
}

function AddBook({ mode = "add" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, loading: permissionsLoading, homePath } = usePermissions();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const editingId = isView || isEdit ? id : null;
  const requiredAction = isView ? "read" : isEdit ? "update" : "create";
  const canUpdate = can("books", "update");

  const [bookForm, setBookForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState("");
  const [errors, setErrors] = useState(emptyErrors);
  const [loading, setLoading] = useState(isView || isEdit);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if ((!isView && !isEdit) || !editingId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchBook = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch(`/books/${editingId}`);

        if (response.status === 401) {
          return;
        }

        const data = await response.json();

        if (cancelled) return;

        if (response.ok && data?.success) {
          setBookForm(bookToForm(data.data));
          setExistingCoverUrl(data.data?.cover_image || "");
          setCoverFile(null);
        } else {
          setLoadError(data?.message ?? "Unable to load book details.");
        }
      } catch (error) {
        console.log(error);
        if (!cancelled) {
          setLoadError("Unable to load book details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBook();

    return () => {
      cancelled = true;
    };
  }, [isView, isEdit, editingId, navigate]);

  const pageTitle = isView ? "View book" : isEdit ? "Edit book" : "Add a book";

  const validate = () => {
    const nextErrors = { ...emptyErrors };
    const year = Number(bookForm.releaseYear);
    const price = Number(bookForm.price);

    if (!bookForm.title.trim()) {
      nextErrors.title = "Title is required.";
    } else if (bookForm.title.trim().length > 50) {
      nextErrors.title = "Title must be 50 characters or less.";
    }

    if (!bookForm.releaseYear) {
      nextErrors.releaseYear = "Release year is required.";
    } else if (!Number.isInteger(year) || year < 1000 || year > 2100) {
      nextErrors.releaseYear = "Enter a valid year (1000–2100).";
    }

    if (!bookForm.author.trim()) {
      nextErrors.author = "Author is required.";
    }

    if (!bookForm.genre.trim()) {
      nextErrors.genre = "Genre is required.";
    }

    if (bookForm.price === "" || bookForm.price === null) {
      nextErrors.price = "Price is required.";
    } else if (Number.isNaN(price) || price < 0) {
      nextErrors.price = "Price must be a number 0 or greater.";
    }

    if (!bookForm.description.trim()) {
      nextErrors.description = "Description is required.";
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some((msg) => msg !== "");
  };

  const updateField = (field) => (e) => {
    if (isView) return;

    setBookForm({
      ...bookForm,
      [field]: e.target.value,
    });
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: "",
      });
    }
  };

  const handleCoverChange = (file, validationError = "") => {
    setCoverFile(file);
    setErrors((prev) => ({
      ...prev,
      cover_image: validationError,
    }));
  };

  const applyServerErrors = (data) => {
    if (!data || typeof data !== "object") return;

    const nextErrors = { ...emptyErrors };
    Object.keys(emptyErrors).forEach((key) => {
      const value = data[key];
      if (Array.isArray(value) && value[0]) {
        nextErrors[key] = String(value[0]);
      } else if (typeof value === "string") {
        nextErrors[key] = value;
      }
    });
    setErrors(nextErrors);
  };

  const addBook = async () => {
    if (!validate() || errors.cover_image) return;

    try {
      const response = await apiFetch("/books/create/", {
        method: "POST",
        body: buildBookFormData(bookForm, coverFile),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (data?.success) {
        navigate("/books", { state: { toast: data?.message } });
        return;
      }

      applyServerErrors(data);
    } catch (error) {
      console.log(error);
    }
  };

  const updateBook = async () => {
    if (!validate() || !editingId || errors.cover_image) return;

    try {
      const response = await apiFetch(`/books/${editingId}`, {
        method: "PUT",
        body: buildBookFormData(bookForm, coverFile),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (data?.success) {
        navigate("/books", {
          state: { toast: data?.message ?? "Book updated successfully." },
        });
        return;
      }

      applyServerErrors(data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = () => {
    if (isEdit) {
      updateBook();
    } else {
      addBook();
    }
  };

  const startEdit = () => {
    navigate(`/edit_book/${editingId}`);
  };

  if (permissionsLoading || loading) {
    return (
      <section className="panel" aria-labelledby="book-form-heading">
        <p className="book-form__status">
          {loading ? "Loading book details..." : "Loading permissions..."}
        </p>
      </section>
    );
  }

  if (!can("books", requiredAction)) {
    return <Navigate to={homePath} replace />;
  }

  if (loadError) {
    return (
      <section className="panel" aria-labelledby="book-form-heading">
        <p className="book-form__status book-form__status--error">{loadError}</p>
        <div className="form-actions">
          <Link to="/books" className="btn btn--secondary">
            Back to listing
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`panel${isView ? " panel--view" : ""}`}
      aria-labelledby="book-form-heading"
    >
      <h2 id="book-form-heading" className="panel__title">
        {pageTitle}
      </h2>

      <div className="form-grid">
        <div className={`field${errors.title ? " field--error" : ""}`}>
          <label htmlFor="title">
            Title {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. The Alchemist"
            value={bookForm.title}
            onChange={updateField("title")}
            readOnly={isView}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <p className="field__error">{errors.title}</p>}
        </div>

        <div className={`field${errors.releaseYear ? " field--error" : ""}`}>
          <label htmlFor="releaseYear">
            Release year {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="releaseYear"
            type="number"
            placeholder="e.g. 1988"
            value={bookForm.releaseYear}
            onChange={updateField("releaseYear")}
            readOnly={isView}
            aria-invalid={Boolean(errors.releaseYear)}
          />
          {errors.releaseYear && (
            <p className="field__error">{errors.releaseYear}</p>
          )}
        </div>

        <div className={`field${errors.author ? " field--error" : ""}`}>
          <label htmlFor="author">
            Author {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="author"
            type="text"
            placeholder="e.g. Paulo Coelho"
            value={bookForm.author}
            onChange={updateField("author")}
            readOnly={isView}
            aria-invalid={Boolean(errors.author)}
          />
          {errors.author && <p className="field__error">{errors.author}</p>}
        </div>

        <div className={`field${errors.genre ? " field--error" : ""}`}>
          <label htmlFor="genre">
            Genre {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="genre"
            type="text"
            placeholder="e.g. Fiction"
            value={bookForm.genre}
            onChange={updateField("genre")}
            readOnly={isView}
            aria-invalid={Boolean(errors.genre)}
          />
          {errors.genre && <p className="field__error">{errors.genre}</p>}
        </div>

        <div className={`field${errors.price ? " field--error" : ""}`}>
          <label htmlFor="price">
            Price (₹) {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="price"
            type="number"
            placeholder="e.g. 299"
            value={bookForm.price}
            onChange={updateField("price")}
            readOnly={isView}
            aria-invalid={Boolean(errors.price)}
          />
          {errors.price && <p className="field__error">{errors.price}</p>}
        </div>

        <div
          className={`field field--full${errors.description ? " field--error" : ""}`}
        >
          <label htmlFor="description">
            Description {!isView && <span className="field__required">*</span>}
          </label>
          <textarea
            id="description"
            placeholder="A short summary of the book..."
            value={bookForm.description}
            onChange={updateField("description")}
            readOnly={isView}
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description && (
            <p className="field__error">{errors.description}</p>
          )}
        </div>

        <FileUpload
          id="cover_image"
          label="Cover image"
          value={coverFile}
          existingUrl={existingCoverUrl}
          onChange={handleCoverChange}
          error={errors.cover_image}
          disabled={isView}
          helpText="JPG, JPEG, PNG, or WEBP. Max 5 MB."
        />
      </div>

      <div className="form-actions">
        <Link to="/books" className="btn btn--secondary">
          {isView ? "Back to listing" : "Cancel"}
        </Link>
        {isView ? (
          canUpdate && (
            <button type="button" className="btn btn--primary" onClick={startEdit}>
              Edit book
            </button>
          )
        ) : (
          <button type="button" className="btn btn--primary" onClick={handleSubmit}>
            {isEdit ? "Save changes" : "Add Book"}
          </button>
        )}
      </div>
    </section>
  );
}

export default AddBook;
