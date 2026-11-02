import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export default function ProjectPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.project(slug)
      .then((result) => {
        if (active) setProject(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  return (
    <>
      <SiteHeader />
      <main className="detail-page">
        <div className="container">
          <Link className="back-link" to="/#projects"><ArrowLeft size={16} /> العودة إلى المشاريع</Link>
          {loading ? (
            <div className="loading-state detail-loading">جارٍ تحميل تفاصيل المشروع...</div>
          ) : error ? (
            <div className="empty-state error-state detail-error">
              <span className="empty-icon"><X size={22} /></span>
              <h2>لم نتمكن من عرض المشروع</h2>
              <p>{error}</p>
              <Link className="button button-outline" to="/">العودة للرئيسية</Link>
            </div>
          ) : project ? (
            <>
              <div className="detail-heading">
                <div>
                  <span className="section-kicker">{project.category} · {project.year}</span>
                  <h1>{project.title}</h1>
                </div>
                <p>{project.description}</p>
              </div>
              {project.links?.length > 0 && (
                <nav className="detail-project-links" aria-label="روابط المشروع">
                  {project.links.map((url, index) => (
                    <a href={url} key={url} target="_blank" rel="noreferrer">
                      رابط {index + 1} <ExternalLink size={15} />
                    </a>
                  ))}
                </nav>
              )}
              <img className="detail-cover" src={project.coverImage} alt={`غلاف مشروع ${project.title}`} />
              
              {project.gallery?.length > 0 && (
                <div className="detail-gallery">
                  {project.gallery.map((image, index) => (
                    <img src={image} alt={`صورة ${index + 1} من مشروع ${project.title}`} key={image} />
                  ))}
                </div>
              )}
              
              <div className="detail-end">
                <span>نهاية المشروع، وبداية فكرة جديدة.</span>
                <Link className="button button-dark" to="/#contact">لديك مشروع مشابه؟ <ArrowLeft size={16} /></Link>
              </div>
            </>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
