import { useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [notice, setNotice] = useState({ text: "", error: false });
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setNotice({ text: "", error: false });
    try {
      const result = await api.register(form);
      setNotice({ text: result.message, error: false });
      setForm({ name: "", email: "", password: "" });
    } catch (error) {
      setNotice({ text: error.message, error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="login-card">
        <Link to="/" className="brand login-brand"><span className="brand-mark">م.</span><span>مساحة</span></Link>
        <div className="login-icon"><LockKeyhole size={23} /></div>
        <span className="section-kicker">مساحتك الإبداعية</span>
        <h1>أنشئ حسابك.</h1>
        <p>أنشئ صفحة أعمالك وأدر مشاريعك ورسائلك من مكان واحد.</p>
        <form onSubmit={submit} className="login-form">
          <label>
            <span>الاسم الظاهر في صفحة الأعمال</span>
            <input
              type="text"
              autoComplete="name"
              maxLength={100}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label>
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>
          <label>
            <span>كلمة المرور</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          {notice.text && <p className={`form-feedback ${notice.error ? "is-error" : "is-success"}`} role="status">{notice.text}</p>}
          <button className="button button-dark form-submit" type="submit" disabled={loading}>
            {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"} <ArrowLeft size={16} />
          </button>
        </form>
        <p className="login-register">لديك حساب؟ <Link to="/admin/login">سجّل الدخول</Link></p>
        <Link className="login-back" to="/">العودة إلى الموقع</Link>
      </div>
    </main>
  );
}
