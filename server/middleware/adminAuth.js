import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
  const token = req.cookies?.portfolio_admin;
  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ message: "يلزم تسجيل الدخول كمدير." });
  }

  try {
    const session = jwt.verify(token, process.env.JWT_SECRET);
    if (session.role !== "admin") {
      return res.status(403).json({ message: "ليس لديك صلاحية الوصول." });
    }
    next();
  } catch {
    return res.status(401).json({ message: "انتهت الجلسة. سجل الدخول مجدداً." });
  }
}
