import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpLeft,
  ImagePlus,
  Instagram,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export default function HomePage() {
  const { code: profileCode } = useParams();
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [contactState, setContactState] = useState({ loading: false, note: "", error: false });

  async function loadProjects() {
    setProjectsLoading(true);
    setProjectsError("");
    try {
      if (profileCode) {
        const result = await api.publicProfile(profileCode);
        setProfile(result.profile);
        setProjects(result.projects);
      } else {
        setProfile(null);
        setProjects(await api.projects());
      }
    } catch (error) {
      setProjectsError(error.message);
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, [profileCode]);

  async function submitContact(event) {
    event.preventDefault();
    setContactState({ loading: true, note: "", error: false });
    try {
      const result = await api.contact(contact, profileCode);
      setContact({ name: "", email: "", message: "" });
      setContactState({ loading: false, note: result.message, error: false });
    } catch (error) {
      setContactState({ loading: false, note: error.message, error: true });
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="top">
        <section className="hero-section">
          <div className="container hero-layout">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                {profile ? `أعمال ${profile.name}` : "مصمم مستقل · متاح لمشاريع جديدة"}
              </div>
              <h1>
                أصنع تجارب
                <br />
                رقمية <span className="accent-word">تُشبهك.</span>
              </h1>
              <p className="hero-description">
                أجمع بين الفكرة والتصميم والتقنية لأصنع حضورًا رقميًا يترك
                أثرًا، ويحكي قصة علامتك بأسلوبها الخاص.
              </p>
              <div className="hero-actions">
                <a className="button button-dark" href="#projects">
                  اكتشف أعمالي <ArrowLeft size={17} />
                </a>
                <a className="text-link" href="#about">
                  تعرّف عليّ <ArrowDown size={15} />
                </a>
              </div>
              <div className="hero-meta">
                <div className="avatar-stack" aria-hidden="true">
                  <span>م</span>
                  <span>✳</span>
                  <span>↗</span>
                </div>
                <p>
                  <strong>تصميم بفكرة</strong>
                  <br />
                  وتنفيذ بكل عناية
                </p>
                <span className="meta-divider" />
                <p>
                  <strong>من الفكرة</strong>
                  <br />
                  إلى الإطلاق
                </p>
              </div>
            </div>
            <div className="hero-art" aria-label="تصميم تجريدي بألوان هادئة">
              <div className="hero-art-grid" />
              <div className="art-note">
                <Sparkles size={16} />
                تفاصيل تصنع الفرق
              </div>
              <div className="art-card art-card-back">
                <span className="art-card-kicker">BRAND / 2025</span>
                <div className="art-orbit">
                  <span />
                </div>
                <span className="art-card-number">01</span>
              </div>
              <div className="art-card art-card-front">
                <div className="art-front-top">
                  <span className="art-sun">✳</span>
                  <span>هُوية · تجربة · أثر</span>
                </div>
                <div className="art-typography">
                  <span>DESIGN</span>
                  <strong>ببساطة</strong>
                  <span>MADE WITH INTENTION</span>
                </div>
                <div className="art-footer-line">
                  <span>01 — 04</span>
                  <span>مساحة إبداعية</span>
                </div>
              </div>
              <div className="art-stamp">أفكار<br />تُرى وتُحسّ</div>
              <span className="art-star">✳</span>
            </div>
          </div>
          <div className="container hero-bottom">
            <span>مجالات أعمل عليها</span>
            <div className="expertise-list">
              <span>هويات بصرية</span>
              <i />
              <span>تصميم مواقع</span>
              <i />
              <span>تجربة المستخدم</span>
            </div>
            <a href="#projects" className="scroll-cue">
              <span>مرّر للاستكشاف</span>
              <ArrowDown size={15} />
            </a>
          </div>
        </section>

        <section className="section projects-section" id="projects">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">أعمال مختارة <span>✳</span></span>
                <h2>مشاريع تحكي قصتها.</h2>
              </div>
              <p>
                كل مشروع يبدأ بسؤال جيد، وينتهي بتجربة مدروسة
                <br className="desktop-break" /> وتفاصيل تستحق أن تُرى.
              </p>
            </div>
            {projectsLoading ? (
              <div className="loading-state">جارٍ تحميل المشاريع...</div>
            ) : projectsError ? (
              <div className="empty-state error-state">
                <span className="empty-icon"><X size={22} /></span>
                <h3>تعذر تحميل المشاريع</h3>
                <p>{projectsError}</p>
                <button className="button button-outline" onClick={loadProjects}>إعادة المحاولة</button>
              </div>
            ) : projects.length ? (
              <div className="project-grid">
                {projects.map((project, index) => (
                  <Link
                    className={`project-card project-card-${(index % 2) + 1}`}
                    to={profileCode
                      ? `/p/${encodeURIComponent(profileCode)}/project/${encodeURIComponent(project.slug)}`
                      : `/project/${encodeURIComponent(project.slug)}`}
                    key={project._id}
                  >
                    <div className="project-image-wrap">
                      <img src={project.coverImage} alt={`صورة مشروع ${project.title}`} />
                      <span className="project-open"><ArrowUpLeft size={19} /></span>
                    </div>
                    <div className="project-card-info">
                      <div>
                        <span className="project-category">{project.category} · {project.year}</span>
                        <h3>{project.title}</h3>
                      </div>
                      <span className="project-index">0{index + 1}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon"><ImagePlus size={22} /></span>
                <h3>المساحة جاهزة لأعمالك</h3>
                <p>ستظهر المشاريع هنا بمجرد إضافتها من لوحة الحساب.</p>
                <Link className="text-link" to="/admin/login">دخول أصحاب الأعمال <ArrowLeft size={15} /></Link>
              </div>
            )}
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="container about-layout">
            <div className="about-sticker">
              <span className="sticker-star">✳</span>
              <span>فكرة<br />واضحة</span>
              <span>تجربة<br />أجمل</span>
              <span className="sticker-arrow">↙</span>
            </div>
            <div className="about-copy">
              <span className="section-kicker">من أنا؟ <span>✳</span></span>
              <h2>أؤمن أن التصميم الجميل يبدأ من <em>الإنصات.</em></h2>
              <p>
                أعمل مع أصحاب الأفكار والعلامات الطموحة لتحويل ما في أذهانهم
                إلى تجارب واضحة، أنيقة، وسهلة الاستخدام. من أول سؤال وحتى
                آخر تفصيلة — أصمم بهدف، وأنفذ باهتمام.
              </p>
              <a className="text-link" href="#contact">خلّنا نبدأ حكاية جديدة <ArrowLeft size={15} /></a>
            </div>
            <div className="about-facts">
              <div><strong>01</strong><span>فهم عميق<br />للفكرة</span></div>
              <div><strong>02</strong><span>تصميم واضح<br />ومدروس</span></div>
              <div><strong>03</strong><span>نتيجة تليق<br />بطموحك</span></div>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="container contact-layout">
            <div className="contact-copy">
              <span className="section-kicker">رسالتك هي البداية <span>✳</span></span>
              <h2>عندك فكرة؟<br /><em>أنا أسمعك.</em></h2>
              <p>اكتب لي عن مشروعك، أو حتى عن فكرة تدور في بالك. يسعدني أن نبدأ الحديث.</p>
              <p className="contact-inbox-note">
                <span className="contact-icon"><Mail size={19} /></span>
                <span>ستصل رسالتك مباشرة إلى بريدي الإلكتروني</span>
              </p>
              <div className="contact-social">
                <span>تجدني أيضًا</span>
                <a href="https://www.instagram.com/maxcode73/" target="_blank" rel="noreferrer" aria-label="إنستغرام"><Instagram size={18} /></a>
              </div>
            </div>
            <form className="contact-form" onSubmit={submitContact}>
              <div className="form-heading">
                <span>✳</span>
                <p>كل بداية جميلة تبدأ برسالة.</p>
              </div>
              <label>
                <span>اسمك</span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="كيف أناديك؟"
                  value={contact.name}
                  onChange={(event) => setContact({ ...contact, name: event.target.value })}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                <span>بريدك الإلكتروني</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  dir="ltr"
                  value={contact.email}
                  onChange={(event) => setContact({ ...contact, email: event.target.value })}
                  maxLength={254}
                  required
                />
              </label>
              <label>
                <span>عن ماذا تود أن نتحدث؟</span>
                <textarea
                  name="message"
                  rows="3"
                  placeholder="احكِ لي قليلًا عن فكرتك..."
                  value={contact.message}
                  onChange={(event) => setContact({ ...contact, message: event.target.value })}
                  maxLength={3000}
                  required
                />
              </label>
              {contactState.note && (
                <p className={`form-feedback ${contactState.error ? "is-error" : "is-success"}`} role="status">
                  {contactState.note}
                </p>
              )}
              <button className="button button-dark form-submit" type="submit" disabled={contactState.loading}>
                {contactState.loading ? "جارٍ الإرسال..." : "أرسل رسالتك"}
                {contactState.loading ? <MessageCircle size={17} /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
