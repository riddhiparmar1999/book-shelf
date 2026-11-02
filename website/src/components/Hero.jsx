function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-brand">
      <div
        className="hero__media"
        role="img"
        aria-label="Sunlit bookstore shelves filled with books"
      />
      <div className="hero__veil" aria-hidden="true" />

      <div className="hero__content">
        <p id="hero-brand" className="hero__brand">
          Shelf
        </p>
        <h1 className="hero__headline">Stories waiting on every shelf</h1>
        <p className="hero__lede">
          Discover carefully chosen titles for quiet mornings, long train rides,
          and late-night reading.
        </p>
        <div className="hero__actions">
          <a href="#books" className="btn btn--primary">
            Browse books
          </a>
          <a href="#contact" className="btn btn--ghost">
            Contact us
          </a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
