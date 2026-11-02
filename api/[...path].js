import app from "../server/server.js";

export default function handler(req, res) {
  const requestUrl = req.url || "/";
  if (requestUrl !== "/api" && !requestUrl.startsWith("/api/")) {
    req.url = `/api${requestUrl.startsWith("/") ? requestUrl : `/${requestUrl}`}`;
  }
  return app(req, res);
}
