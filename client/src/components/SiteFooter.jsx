import { ArrowDown, LockKeyhole, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Link to="/" className="brand footer-brand">
          <span className="brand-mark">م.</span>
          <span>مساحة</span>
        </Link>
        <p>أفكار جميلة، تتحول إلى تجارب لا تُنسى.</p>
        <div className="footer-links">
          <a href="mailto:zieadmohamed18@gmail.com" aria-label="البريد الإلكتروني">
            <Mail size={18} />
          </a>
          <a href="#top" aria-label="العودة إلى الأعلى">
            <ArrowDown size={18} className="back-to-top-icon" />
          </a>
          <Link to="/admin/login" aria-label="دخول المدير" title="دخول المدير">
            <LockKeyhole size={16} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} مساحة. جميع الحقوق محفوظة.</span>
        <span>صُنع بشغف واهتمام بالتفاصيل.</span>
      </div>
    </footer>
  );
}

