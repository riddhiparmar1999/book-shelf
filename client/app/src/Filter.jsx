import { useState } from "react";
import "./Filter.css";

function Filter({ authors, genres, filters, setFilters, applyFilters, emptyFilters}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const commitFilters = (nextFilters, { reapply = false } = {}) => {
    setFilters(nextFilters);
    if (reapply) {
      applyFilters(1, { filtersOverride: nextFilters });
    }
  };

  const updateText = (field) => (e) => {
    const value = e.target.value;
    const nextFilters = {
      ...filters,
      [field]: value,
    };

    const wasCleared = value === "" && filters[field] !== "";
    commitFilters(nextFilters, { reapply: wasCleared });
  };

  const toggleMulti = (field, value) => {
    const selected = filters[field];
    const isRemoving = selected?.includes(value);
    const next = isRemoving
      ? selected?.filter((item) => item !== value)
      : [...selected, value];

    const nextFilters = {
      ...filters,
      [field]: next,
    };
    // Re-fetch when a chip/checkbox is removed
    commitFilters(nextFilters, { reapply: isRemoving });
  };

  const clearFilters = () => {
    setOpenMenu(null);
    commitFilters(emptyFilters, { reapply: true });
  };

  const toggleContainer = () => {
    setIsOpen((open) => {
      if (open) setOpenMenu(null);
      return !open;
    });
  };

  return (
    <section
      className={`filter${isOpen ? " filter--open" : " filter--closed"}`}
      aria-labelledby="filter-heading"
    >
      <div className="filter__header">
        <div className="filter__header__left">
          <h2 id="filter-heading" className="panel__title">
            Filter books
          </h2>
          <button
            type="button"
            className="filter__toggle"
            onClick={toggleContainer}
            aria-expanded={isOpen}
            aria-controls="filter-body"
          >
            {isOpen ? "Close" : "Open"}
          </button>
        </div>
      </div>

      <div
        id="filter-body"
        className={`filter__body${isOpen ? " filter__body--open" : ""}`}
      >
        <div className="filter__body-inner">
          <p className="filter__hint">Search and narrow your library.</p>

          <div className="filter__grid">
            <div className="field filter__search">
              <label htmlFor="filter-title">Search by title</label>
              <input
                id="filter-title"
                type="search"
                placeholder="Type a book title..."
                value={filters.title}
                onChange={updateText("title")}
              />
            </div>

            <div className="field">
              <span className="filter__label" id="genre-label">
                Genre
              </span>
              <div className="multi-select">
                <button
                  type="button"
                  className="multi-select__trigger"
                  aria-haspopup="listbox"
                  aria-expanded={openMenu === "genres"}
                  aria-labelledby="genre-label"
                  onClick={() =>
                    setOpenMenu(openMenu === "genres" ? null : "genres")
                  }
                >
                  {filters?.genres?.length > 0
                    ? `${filters?.genres?.length} selected`
                    : "Select genres"}
                </button>
                {openMenu === "genres" && (
                  <ul className="multi-select__menu" role="listbox" aria-multiselectable="true">
                    {genres?.map((genre) => {
                      const checked = filters?.genres?.includes(genre?.value);
                      return (
                        <li key={genre?.value} role="option" aria-selected={checked}>
                          <label className="multi-select__option">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMulti("genres", genre?.value)}
                              className="filter__checkbox"
                            />
                            <span>{genre?.label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {filters?.genres?.length > 0 && (
                <div className="filter__chips">
                  {filters?.genres?.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      className="filter__chip"
                      onClick={() => toggleMulti("genres", genre)}
                    >
                      {genre}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="field">
              <span className="filter__label" id="author-label">
                Author
              </span>
              <div className="multi-select">
                <button
                  type="button"
                  className="multi-select__trigger"
                  aria-haspopup="listbox"
                  aria-expanded={openMenu === "authors"}
                  aria-labelledby="author-label"
                  onClick={() =>
                    setOpenMenu(openMenu === "authors" ? null : "authors")
                  }
                >
                  {filters?.authors?.length > 0
                    ? `${filters?.authors?.length} selected`
                    : "Select authors"}
                </button>
                {openMenu === "authors" && (
                  <ul className="multi-select__menu" role="listbox" aria-multiselectable="true">
                    {authors?.map((author) => {
                      const checked = filters?.authors?.includes(author?.value);
                      return (
                        <li key={author?.value} role="option" aria-selected={checked}>
                          <label className="multi-select__option">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMulti("authors", author?.value)}
                              className="filter__checkbox"
                            />
                            <span>{author?.label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {filters?.authors?.length > 0 && (
                <div className="filter__chips">
                  {filters?.authors?.map((author) => (
                    <button
                      key={author}
                      type="button"
                      className="filter__chip"
                      onClick={() => toggleMulti("authors", author)}
                    >
                      {author}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="field">
              <span className="filter__label">Price range (₹)</span>
              <div className="filter__range">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  aria-label="Minimum price"
                  value={filters.minPrice}
                  onChange={updateText("minPrice")}
                />
                <span className="filter__range-sep">to</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  aria-label="Maximum price"
                  value={filters.maxPrice}
                  onChange={updateText("maxPrice")}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="filter-year">Release year</label>
              <input
                id="filter-year"
                type="number"
                placeholder="e.g. 1988"
                value={filters.year}
                onChange={updateText("year")}
              />
            </div>
          </div>

          <div className="filter__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={clearFilters}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                applyFilters();
              }}
            >
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Filter;
