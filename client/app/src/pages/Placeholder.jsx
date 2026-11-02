function Placeholder({ title }) {
  return (
    <section className="page-heading" aria-labelledby="page-heading-title">
      <h2 id="page-heading-title" className="page-heading__title">
        {title}
      </h2>
      <p className="page-heading__hint">This section is coming soon.</p>
    </section>
  );
}

export default Placeholder;
