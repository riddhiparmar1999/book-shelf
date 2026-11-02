function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <a href="#top" className="site-logo site-logo--footer">
          Shelf
        </a>
        <p className="site-footer__copy">
          © {new Date().getFullYear()} Shelf. Made for readers.
        </p>
        <nav className="site-footer__nav" aria-label="Footer">
          <a href="#books">Books</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
