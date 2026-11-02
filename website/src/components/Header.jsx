import { useEffect, useState } from "react";

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <header className={`site-header${scrolled ? " site-header--scrolled" : ""}`}>
      <div className="site-header__inner">
        <a href="#top" className="site-logo" onClick={closeMenu}>
          Shelf
        </a>

        <button
          type="button"
          className={`nav-toggle${open ? " nav-toggle--open" : ""}`}
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
        </button>

        <nav
          id="site-nav"
          className={`site-nav${open ? " site-nav--open" : ""}`}
          aria-label="Primary"
        >
          <a href="#books" onClick={closeMenu}>
            Books
          </a>
          <a href="#contact" onClick={closeMenu}>
            Contact
          </a>
          <a href="#contact" className="site-nav__cta" onClick={closeMenu}>
            Get in touch
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
