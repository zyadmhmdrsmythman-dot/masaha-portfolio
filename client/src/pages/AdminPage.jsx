import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  ImagePlus,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

const initialForm = {
  title: "",
  category: "",
  year: new Date().getFullYear().toString(),
  description: "",
  links: "",
};

async function uploadToImageKit(file, auth) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("publicKey", auth.publicKey);
  formData.append("signature", auth.signature);
  formData.append("token", auth.token);
  formData.append("expire", auth.expire);
  formData.append("folder", "/portfolio");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || "تعذر رفع الصورة إلى ImageKit.");
  }
  if (typeof result?.url !== "string" || !result.url) {
    throw new Error("لم يُرجع ImageKit رابط الصورة بعد رفعها.");
  }
  return result.url;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [profileCode, setProfileCode] = useState("");
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [cover, setCover] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [clearExistingGallery, setClearExistingGallery] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [notice, setNotice] = useState({ text: "", error: false });
  const [saving, setSaving] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [projectList, inbox, session] = await Promise.all([
        api.adminProjects(),
        api.messages(),
        api.session(),
      ]);
      setProjects(projectList);
      setMessages(inbox);
      setProfileCode(session.publicCode || "");
      setAuthenticated(true);
    } catch (error) {
      if (error.message.includes("تسجيل الدخول") || error.message.includes("انتهت الجلسة")) {
        navigate("/admin/login", { replace: true });
      } else {
        setNotice({ text: error.message, error: true });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!cover) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(cover);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  function resetProjectForm() {
    setForm(initialForm);
    setCover(null);
    setGallery([]);
    setEditingProject(null);
    setClearExistingGallery(false);
    setFormKey((key) => key + 1);
  }

  function editProject(project) {
    setEditingProject(project);
    setForm({
      title: project.title,
      category: project.category,
      year: project.year,
      description: project.description,
      links: (project.links || []).join("\n"),
    });
    setCover(null);
    setGallery([]);
    setClearExistingGallery(false);
    setFormKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createProject(event) {
    event.preventDefault();
    if (!cover && !editingProject) {
      setNotice({ text: "اختَر صورة غلاف للمشروع قبل الحفظ.", error: true });
      return;
    }
    const images = [cover, ...gallery].filter(Boolean);
    if (
      gallery.length > 8 ||
      images.some(
        (image) =>
          image.size > 8 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(image.type),
      )
    ) {
      setNotice({
        text: "اختر صورة غلاف وحتى 8 صور إضافية بصيغة JPG أو PNG أو WebP، لا يتجاوز حجم أي منها 8 ميغابايت.",
        error: true,
      });
      return;
    }
    const projectLinks = form.links
      .split(/\r?\n/)
      .map((link) => link.trim())
      .filter(Boolean);
    if (
      projectLinks.length > 10 ||
      projectLinks.some((link) => {
        try {
          return !["http:", "https:"].includes(new URL(link).protocol);
        } catch {
          return true;
        }
      })
    ) {
      setNotice({
        text: "أدخل حتى 10 روابط صالحة تبدأ بـ http:// أو https://، رابطًا في كل سطر.",
        error: true,
      });
      return;
    }

    setSaving(true);
    setNotice({ text: "", error: false });
    try {
      const { imagekit } = await api.health();
      let projectData;
      if (imagekit) {
        const imageUrls = images.length
          ? await Promise.all(
              images.map(async (image) => uploadToImageKit(image, await api.imagekitAuth())),
            )
          : [];
        let nextCover = editingProject?.coverImage;
        let nextGallery = editingProject?.gallery || [];
        let uploadedIndex = 0;
        if (cover) nextCover = imageUrls[uploadedIndex++];
        if (gallery.length) {
          nextGallery = imageUrls.slice(uploadedIndex);
        } else if (clearExistingGallery) {
          nextGallery = [];
        }
        projectData = editingProject
          ? { ...form, links: projectLinks, coverImage: nextCover, gallery: nextGallery }
          : { ...form, links: projectLinks, coverImage: imageUrls[0], gallery: imageUrls.slice(1) };
      } else {
        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => formData.append(key, value));
        formData.set("links", JSON.stringify(projectLinks));
        if (cover) formData.append("cover", cover);
        gallery.forEach((image) => formData.append("gallery", image));
        if (editingProject && (gallery.length || clearExistingGallery)) {
          formData.append("replaceGallery", "true");
        }
        projectData = formData;
      }

      const saved = editingProject
        ? await api.updateProject(editingProject._id, projectData)
        : await api.createProject(projectData);

      setProjects(
        editingProject
          ? projects.map((project) => (project._id === saved._id ? saved : project))
          : [saved, ...projects],
      );
      resetProjectForm();
      setNotice({
        text: editingProject ? "تم تحديث المشروع بنجاح." : "تمت إضافة المشروع بنجاح وحُفظت الصور.",
        error: false,
      });
    } catch (error) {
      setNotice({ text: error.message, error: true });
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(project) {
    if (!window.confirm(`هل تريد حذف مشروع «${project.title}»؟`)) return;
    try {
      await api.deleteProject(project._id);
      setProjects(projects.filter((item) => item._id !== project._id));
      if (editingProject?._id === project._id) resetProjectForm();
      setNotice({ text: "تم حذف المشروع والصور الخاصة به بنجاح.", error: false });
    } catch (error) {
      setNotice({ text: error.message, error: true });
    }
  }

  async function logout() {
    try {
      await api.logout();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      setNotice({ text: error.message, error: true });
    }
  }

  async function copyProfileLink() {
    const profileUrl = `${window.location.origin}/p/${profileCode}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setProfileLinkCopied(true);
      window.setTimeout(() => setProfileLinkCopied(false), 2000);
    } catch (error) {
      setNotice({ text: "تعذر نسخ الرابط. انسخه يدويًا من الحقل.", error: true });
    }
  }

  if (loading) {
    return <main className="admin-loading"><span className="loading-state">جارٍ فتح لوحة الإدارة...</span></main>;
  }

  if (!authenticated) {
    return (
      <main className="admin-loading">
        <div className="empty-state error-state">
          <h2>تعذر تحميل لوحة الإدارة</h2>
          <p>{notice.text || "تحقق من اتصال الخادم ثم أعد المحاولة."}</p>
          <button className="button button-dark" onClick={loadDashboard}>إعادة المحاولة</button>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="container dashboard-header-inner">
          <Link to="/" className="brand"><span className="brand-mark">م.</span><span>مساحة</span></Link>
          <span className="dashboard-label"><LayoutDashboard size={17} /> لوحة الإدارة</span>
          <div className="dashboard-header-actions">
            <a
              href={profileCode ? `/p/${profileCode}` : "/"}
              className="dashboard-site-link"
              target="_blank"
              rel="noreferrer"
            >
              عرض الموقع <ExternalLink size={15} />
            </a>
            <button type="button" className="logout-button" onClick={logout}>تسجيل الخروج</button>
          </div>
        </div>
      </header>
      <div className="container dashboard-main">
        <div className="dashboard-intro">
          <div>
            <span className="section-kicker">مساحتك الإبداعية <span>✳</span></span>
            <h1>أهلًا بك في لوحة التحكم.</h1>
            <p>أضف أعمالك، وشارك قصتها مع العالم.</p>
            {profileCode && (
              <section className="profile-share" aria-label="رابط البورتفوليو">
                <strong>رابط البورتفوليو الخاص بك</strong>
                <div className="profile-share-controls">
                  <a href={`/p/${profileCode}`} target="_blank" rel="noreferrer" dir="ltr">
                    {`${window.location.origin}/p/${profileCode}`}
                  </a>
                  <button type="button" className="button button-outline profile-copy-button" onClick={copyProfileLink}>
                    {profileLinkCopied ? "تم النسخ" : "نسخ الرابط"}
                  </button>
                </div>
              </section>
            )}
          </div>
          <div className="dashboard-stats">
            <div><strong>{projects.length.toString().padStart(2, "0")}</strong><span>مشروع منشور</span></div>
            <div><strong>{messages.length.toString().padStart(2, "0")}</strong><span>رسالة واردة</span></div>
          </div>
        </div>

        {notice.text && <div className={`dashboard-notice ${notice.error ? "is-error" : "is-success"}`} role="status">{notice.text}</div>}

        <div className="dashboard-layout">
          <section className="dashboard-panel project-form-panel">
            <div className="panel-heading">
              <div className="panel-icon">{editingProject ? <Pencil size={19} /> : <Plus size={19} />}</div>
              <div><h2>{editingProject ? "تعديل المشروع" : "أضف مشروعًا جديدًا"}</h2><p>{editingProject ? "عدّل التفاصيل أو استبدل الصور." : "املأ التفاصيل وارفع الصور لعرض مشروعك."}</p></div>
            </div>
            <form key={formKey} onSubmit={createProject} className="project-form">
              <div className="input-row">
                <label><span>اسم المشروع</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} placeholder="مثال: هوية مقهى نَبت" required /></label>
                <label><span>التصنيف</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} placeholder="هوية بصرية، تصميم مواقع..." required /></label>
              </div>
              <label className="year-field"><span>سنة المشروع</span><input type="number" min="1900" max="2099" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required /></label>
              <label><span>وصف المشروع</span><textarea rows="5" maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="احكِ عن الفكرة، التحدي، وكيف وصلت للحل..." required /></label>
              <label>
                <span>روابط المشروع <small>اختياري · حتى 10 روابط، رابط في كل سطر</small></span>
                <textarea rows="3" maxLength={20480} value={form.links} onChange={(e) => setForm({ ...form, links: e.target.value })} placeholder={"https://example.com\nhttps://behance.net/..."} dir="ltr" />
              </label>
              <label className="upload-field">
                <span>صورة الغلاف <small>JPG أو PNG أو WebP · حتى 8MB</small></span>
                <span className={`upload-zone ${previewUrl ? "has-preview" : ""}`}>
                  {previewUrl || editingProject?.coverImage
                    ? <img src={previewUrl || editingProject.coverImage} alt="معاينة صورة الغلاف" />
                    : <><ImagePlus size={23} /><strong>اضغط لاختيار صورة الغلاف</strong><small>هذه الصورة ستظهر في بطاقة المشروع</small></>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files?.[0] || null)} required={!cover && !editingProject} />
                </span>
              </label>
              <div className="upload-field">
                <span>صور إضافية <small>اختياري · حتى 8 صور</small></span>
                <span className="gallery-picker">
                  <ImagePlus size={18} />
                  <strong>{gallery.length ? `تم اختيار ${gallery.length} صور جديدة` : editingProject?.gallery?.length && !clearExistingGallery ? `${editingProject.gallery.length} صور حالية · اختر صورًا لاستبدالها` : "اختر صورًا إضافية للمشروع"}</strong>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { setGallery(Array.from(e.target.files || []).slice(0, 8)); setClearExistingGallery(false); }} />
                </span>
                {gallery.length > 0 && <span className="selected-files">{gallery.map((image) => image.name).join("، ")}</span>}
                {!gallery.length && editingProject?.gallery?.length > 0 && !clearExistingGallery && <button className="secondary-button" type="button" onClick={() => setClearExistingGallery(true)}>حذف الصور الإضافية الحالية</button>}
                {clearExistingGallery && <span className="selected-files">سيتم حذف الصور الإضافية الحالية.</span>}
              </div>
              <button className="button button-dark form-submit" type="submit" disabled={saving}>
                {saving ? "جارٍ حفظ ورفع المشروع..." : editingProject ? "حفظ التعديلات" : "نشر المشروع"} <ArrowLeft size={16} />
              </button>
              {editingProject && <button className="secondary-button" type="button" onClick={resetProjectForm} disabled={saving}>إلغاء التعديل</button>}
            </form>
          </section>

          <div className="dashboard-side">
            <section className="dashboard-panel">
              <div className="panel-heading">
                <div className="panel-icon"><ImagePlus size={18} /></div>
                <div><h2>مشاريعك</h2><p>{projects.length ? `${projects.length} مشاريع منشورة على الموقع` : "لا توجد مشاريع منشورة بعد"}</p></div>
              </div>
              {projects.length ? (
                <div className="admin-project-list">
                  {projects.map((project) => (
                    <article className="admin-project" key={project._id}>
                      <img src={project.coverImage} alt="" />
                      <div><strong>{project.title}</strong><span>{project.category} · {project.year}</span></div>
                      <button type="button" className="icon-button" onClick={() => editProject(project)} aria-label={`تعديل ${project.title}`}><Pencil size={16} /></button>
                      <button type="button" className="icon-button danger-button" onClick={() => deleteProject(project)} aria-label={`حذف ${project.title}`}><Trash2 size={16} /></button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty"><ImagePlus size={20} /><span>مشروعك الأول يبدأ من النموذج هنا.</span></div>
              )}
            </section>

            <section className="dashboard-panel inbox-panel">
              <div className="panel-heading">
                <div className="panel-icon"><MessageCircle size={18} /></div>
                <div><h2>صندوق التواصل</h2><p>الرسائل الواردة من زوار الموقع</p></div>
              </div>
              {messages.length ? (
                <div className="inbox-list">
                  {messages.map((message) => (
                    <article className="inbox-message" key={message._id}>
                      <div className="inbox-message-head"><strong>{message.name}</strong><time>{new Date(message.createdAt).toLocaleDateString("ar")}</time></div>
                      <span className="inbox-message-email" dir="ltr">{message.email}</span>
                      <p>{message.message}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty"><Mail size={20} /><span>ستظهر رسائل الزوار هنا.</span></div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
