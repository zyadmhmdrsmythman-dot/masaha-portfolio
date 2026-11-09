const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const url = `${API_BASE}/api${path}`;
  const response = await fetch(url, {
    credentials: "include",
    ...options,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || "تعذر إكمال الطلب. حاول مرة أخرى.");
    error.code = result.code;
    throw error;
  }
  return result;
}

export const api = {
  health: () => request("/health"),
  projects: () => request("/projects"),
  project: (slug, profileCode) =>
    request(
      profileCode
        ? `/profiles/${encodeURIComponent(profileCode)}/projects/${encodeURIComponent(slug)}`
        : `/projects/${encodeURIComponent(slug)}`,
    ),
  publicProfile: (code) => request(`/profiles/${encodeURIComponent(code)}`),
  contact: (body, profileCode) =>
    request(profileCode ? `/profiles/${encodeURIComponent(profileCode)}/contact` : "/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  session: () => request("/admin/session", { cache: "no-store" }),
  login: (body) =>
    request("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  register: (body) =>
    request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  logout: () => request("/admin/logout", { method: "POST" }),
  adminProjects: () => request("/admin/projects"),
  messages: () => request("/admin/messages"),
  imagekitAuth: () => request("/admin/uploads/auth"),
  createProject: (body) =>
    request("/admin/projects", {
      method: "POST",
      ...(body instanceof FormData
        ? { body }
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    }),
  updateProject: (id, body) =>
    request(`/admin/projects/${id}`, {
      method: "PUT",
      ...(body instanceof FormData
        ? { body }
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    }),
  deleteProject: (id) =>
    request(`/admin/projects/${id}`, { method: "DELETE" }),
};
