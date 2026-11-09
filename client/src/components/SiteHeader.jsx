import { useState } from "react";
import { ArrowUpLeft, Menu, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export default function SiteHeader() {
  const { code } = useParams();
  const homePath = code ? `/p/${code}` : "/";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to={homePath} className="brand" aria-label="مساحة، الصفحة الرئيسية">
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
          <a href={`${homePath}#projects`} onClick={() => setMenuOpen(false)}>
            المشاريع
          </a>
          <a href={`${homePath}#about`} onClick={() => setMenuOpen(false)}>
            نبذة عني
          </a>
          <a href={`${homePath}#contact`} onClick={() => setMenuOpen(false)}>
            تواصل معي
          </a>
        </nav>
        <a className="header-cta" href={`${homePath}#contact`}>
          لنتحدث عن مشروعك <ArrowUpLeft size={17} />
        </a>
      </div>
    </header>
  );
}
