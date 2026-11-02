async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "تعذر إكمال الطلب. حاول مرة أخرى.");
  }
  return result;
}

export const api = {
  health: () => request("/health"),
  projects: () => request("/projects"),
  project: (slug) => request(`/projects/${encodeURIComponent(slug)}`),
  contact: (body) =>
    request("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  session: () => request("/admin/session"),
  login: (body) =>
    request("/admin/login", {
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
