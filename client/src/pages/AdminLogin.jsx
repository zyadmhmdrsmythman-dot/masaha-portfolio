import { useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.session().then(() => navigate("/admin", { replace: true })).catch(() => {});
  }, [navigate]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(credentials);
      navigate("/admin", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="login-card">
        <Link to="/" className="brand login-brand"><span className="brand-mark">م.</span><span>مساحة</span></Link>
        <div className="login-icon"><LockKeyhole size={23} /></div>
        <span className="section-kicker">مساحة خاصة</span>
        <h1>مرحبًا بعودتك.</h1>
        <p>سجّل الدخول لإدارة المشاريع والرسائل.</p>
        <form onSubmit={submit} className="login-form">
          <label>
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              autoComplete="email"
              value={credentials.email}
              onChange={(event) => setCredentials({ ...credentials, email: event.target.value })}
              required
            />
          </label>
          <label>
            <span>كلمة المرور</span>
            <input
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
              required
            />
          </label>
          {error && <p className="form-feedback is-error" role="alert">{error}</p>}
          <button className="button button-dark form-submit" type="submit" disabled={loading}>
            {loading ? "جارٍ التحقق..." : "تسجيل الدخول"} <ArrowLeft size={16} />
          </button>
        </form>
        <Link className="login-back" to="/">العودة إلى الموقع</Link>
      </div>
    </main>
  );
}

