import { useState } from "react";
import { ArrowUpLeft, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="مساحة، الصفحة الرئيسية">
          <span className="brand-mark">م.</span>
          <span>مساحة</span>
        </Link>
        <button
          className="mobile-menu-button"
          type="button"
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`}>
          <a href="/#projects" onClick={() => setMenuOpen(false)}>
            المشاريع
          </a>
          <a href="/#about" onClick={() => setMenuOpen(false)}>
            نبذة عني
          </a>
          <a href="/#contact" onClick={() => setMenuOpen(false)}>
            تواصل معي
          </a>
        </nav>
        <a className="header-cta" href="/#contact">
          لنتحدث عن مشروعك <ArrowUpLeft size={17} />
        </a>
      </div>
    </header>
  );
}

