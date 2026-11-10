import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import ImageKit from "imagekit";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import Message from "./models/Message.js";
import Project from "./models/Project.js";
import User from "./models/User.js";
import { requireAdmin } from "./middleware/adminAuth.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
app.set("trust proxy", process.env.VERCEL ? 1 : false);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(currentDir, "uploads");
const imageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const imagekitConfigured = Boolean(
  process.env.IMAGEKIT_PUBLIC_KEY &&
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT,
);
let imagekit;
if (imagekitConfigured) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 9 },
  fileFilter: (_req, file, done) => {
    if (!imageTypes.has(file.mimetype)) {
      return done(new Error("يسمح فقط بصور JPG و PNG و WebP."));
    }
    done(null, true);
  },
});

let databaseConnection;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }
  if (mongoose.connection.readyState === 0) {
    databaseConnection = undefined;
  }
  if (!databaseConnection) {
    databaseConnection = mongoose.connect(process.env.MONGODB_URI).catch((error) => {
      databaseConnection = undefined;
      throw error;
    });
  }
  await databaseConnection;
}

app.use((req, res, next) => {
  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  const allowedOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:5173", "http://localhost:3000"]),
  ].filter(Boolean);

  cors({
    origin: (origin, callback) => {
      if (!origin || origin === requestOrigin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })(req, res, next);
});

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir, { maxAge: "1d" }));
app.get("/", (_req, res) => {
  res.json({
    service: "portfolio-api",
    frontend: process.env.CLIENT_URL || "http://localhost:5173",
    health: "/api/health",
  });
});
app.use("/api", async (_req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

function validateProject(body) {
  const required = ["title", "category", "year", "description"];
  for (const field of required) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      return "يرجى تعبئة جميع بيانات المشروع.";
    }
  }
  if (body.title.length > 100 || body.category.length > 60) {
    return "العنوان أو التصنيف أطول من الحد المسموح.";
  }
  if (!/^\d{4}$/.test(body.year)) {
    return "يرجى إدخال السنة بأربعة أرقام.";
  }
  if (body.description.length > 5000) {
    return "وصف المشروع يتجاوز الحد المسموح.";
  }
  return null;
}

function parseProjectLinks(value) {
  const invalidMessage =
    "أدخل حتى 10 روابط صالحة تبدأ بـ http:// أو https://، رابطًا في كل سطر.";
  if (value === undefined || value === null || value === "") {
    return { links: [], error: null };
  }

  let links = value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) links = parsed;
      else links = value.split(/\r?\n/);
    } catch {
      links = value.split(/\r?\n/);
    }
  }
  if (!Array.isArray(links) || links.some((link) => typeof link !== "string")) {
    return { links: [], error: invalidMessage };
  }

  const normalizedLinks = links.map((link) => link.trim()).filter(Boolean);
  if (
    normalizedLinks.length > 10 ||
    normalizedLinks.some((link) => {
      try {
        const url = new URL(link);
        return !["http:", "https:"].includes(url.protocol) || !url.hostname;
      } catch {
        return true;
      }
    })
  ) {
    return { links: [], error: invalidMessage };
  }
  return { links: normalizedLinks, error: null };
}

function isImageKitUrl(url) {
  if (!process.env.IMAGEKIT_URL_ENDPOINT || typeof url !== "string") return false;
  return url.startsWith(process.env.IMAGEKIT_URL_ENDPOINT);
}

function projectUpload(req, res, next) {
  if (req.is("application/json")) return next();
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "gallery", maxCount: 8 },
  ])(req, res, next);
}

async function saveImages(files = []) {
  const saved = [];
  try {
    for (const file of files) {
      const ext = imageTypes.get(file.mimetype) || ".jpg";
      const filename = `${crypto.randomUUID()}${ext}`;

      if (imagekitConfigured) {
        const uploadResponse = await imagekit.upload({
          file: file.buffer,
          fileName: filename,
          folder: "/portfolio",
          useUniqueFileName: true,
        });

        if (!uploadResponse?.url) {
          throw new Error("تعذر حفظ الصورة في ImageKit.");
        }
        saved.push(uploadResponse.url);
      } else {
        if (process.env.VERCEL) {
          throw new Error("يجب إعداد ImageKit لتخزين الصور عند النشر على Vercel.");
        }
        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.writeFile(path.join(uploadsDir, filename), file.buffer, {
          flag: "wx",
        });
        saved.push(`/uploads/${filename}`);
      }
    }
    return saved;
  } catch (error) {
    await removeImages(saved);
    throw error;
  }
}

async function removeImages(images = []) {
  await Promise.all(
    images.map(async (image) => {
      if (!image || typeof image !== "string") return;

      if (image.startsWith("/uploads/")) {
        await fs.unlink(path.join(uploadsDir, path.basename(image))).catch((error) => {
          if (error.code !== "ENOENT") throw error;
        });
        return;
      }

      if (imagekitConfigured && isImageKitUrl(image)) {
        try {
          const parsed = new URL(image);
          const fileName = path.basename(parsed.pathname);
          const files = await imagekit.listFiles({
            searchQuery: `name = "${fileName}"`,
            limit: 1,
          });
          if (files?.[0]?.fileId) {
            await imagekit.deleteFile(files[0].fileId);
          }
        } catch (err) {
          console.error("Error deleting from ImageKit:", err);
        }
      }
    }),
  );
}

function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  };
}

function ownerFilter(req) {
  return { ownerId: req.auth.role === "owner" ? req.auth.userId : null };
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1,
    imagekit: imagekitConfigured,
  });
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      !isValidEmail(email) ||
      email.length > 254 ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: "أدخل اسمًا وبريدًا صالحًا، وكلمة مرور من 8 أحرف على الأقل.",
      });
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(503).json({ message: "إعدادات تسجيل الدخول غير مكتملة." });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail === process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
      (await User.exists({ email: normalizedEmail }))
    ) {
      return res.status(409).json({ message: "هذا البريد مسجل بالفعل." });
    }

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      publicCode: crypto.randomBytes(6).toString("hex"),
      emailVerified: true,
    });
    res.status(201).json({
      message: "تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "هذا البريد مسجل بالفعل." });
    }
    next(error);
  }
});

app.get("/api/profiles/:code", async (req, res, next) => {
  try {
    const user = await User.findOne({ publicCode: req.params.code })
      .select("name publicCode")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "لم يتم العثور على صفحة الأعمال." });
    }
    const projects = await Project.find({ ownerId: user._id }).sort({ createdAt: -1 }).lean();
    res.json({ profile: user, projects });
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects", async (_req, res, next) => {
  try {
    const projects = await Project.find({ ownerId: null }).sort({ createdAt: -1 }).lean();
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:slug", async (req, res, next) => {
  try {
    const project = await Project.findOne({ slug: req.params.slug, ownerId: null }).lean();
    if (!project) {
      return res.status(404).json({ message: "لم يتم العثور على المشروع." });
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

app.get("/api/profiles/:code/projects/:slug", async (req, res, next) => {
  try {
    const user = await User.findOne({ publicCode: req.params.code })
      .select("_id")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "لم يتم العثور على صفحة الأعمال." });
    }
    const project = await Project.findOne({
      slug: req.params.slug,
      ownerId: user._id,
    }).lean();
    if (!project) {
      return res.status(404).json({ message: "لم يتم العثور على المشروع." });
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

// ImageKit Authentication parameters for frontend direct upload (if needed)
app.get("/api/admin/uploads/auth", requireAdmin, (_req, res) => {
  if (!imagekitConfigured) {
    return res.status(503).json({
      message: "أضف إعدادات ImageKit في الخادم لتفعيل الرفع المباشر.",
    });
  }
  const authParams = imagekit.getAuthenticationParameters();
  res.json({
    ...authParams,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
});

app.post("/api/contact", async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !message.trim() ||
      name.length > 100 ||
      email.length > 254 ||
      message.length > 3000
    ) {
      return res.status(400).json({ message: "تحقق من بيانات التواصل المدخلة." });
    }
    const contactMessage = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
    };
    const newMessage = await Message.create(contactMessage);
    res.status(201).json({ message: "وصلتنا رسالتك، شكرًا لتواصلك!", id: newMessage._id });
  } catch (error) {
    next(error);
  }
});

app.post("/api/profiles/:code/contact", async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    if (
      typeof name !== "string" ||
      !isValidEmail(email) ||
      typeof message !== "string" ||
      !name.trim() ||
      !message.trim() ||
      name.length > 100 ||
      email.length > 254 ||
      message.length > 3000
    ) {
      return res.status(400).json({ message: "تحقق من بيانات التواصل المدخلة." });
    }
    const user = await User.findOne({ publicCode: req.params.code })
      .select("_id")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "لم يتم العثور على صفحة الأعمال." });
    }
    const contactMessage = {
      ownerId: user._id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
    };
    const newMessage = await Message.create(contactMessage);
    res.status(201).json({ message: "وصلتنا رسالتك، شكرًا لتواصلك!", id: newMessage._id });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(503).json({ message: "إعدادات تسجيل الدخول غير مكتملة." });
    }
    if (!isValidEmail(email) || typeof password !== "string") {
      return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const isAdminEmail =
      Boolean(passwordHash && process.env.ADMIN_EMAIL) &&
      normalizedEmail === process.env.ADMIN_EMAIL.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    const adminPasswordMatches =
      isAdminEmail && (await bcrypt.compare(password, passwordHash));
    const userPasswordMatches =
      user && (await bcrypt.compare(password, user.passwordHash));

    if (adminPasswordMatches) {
      const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "8h" });
      res.cookie("portfolio_admin", token, adminCookieOptions());
      return res.json({ message: "تم تسجيل الدخول بنجاح." });
    }
    if (!user || !userPasswordMatches) {
      return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    }

    const token = jwt.sign(
      {
        role: "owner",
        userId: user._id.toString(),
        email: user.email,
        publicCode: user.publicCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );
    res.cookie("portfolio_admin", token, adminCookieOptions());
    res.json({ message: "تم تسجيل الدخول بنجاح." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/logout", (_req, res) => {
  res.clearCookie("portfolio_admin", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.json({ message: "تم تسجيل الخروج." });
});

app.get("/api/admin/session", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const token = req.cookies?.portfolio_admin;
  if (!token || !process.env.JWT_SECRET) {
    return res.json({ authenticated: false });
  }

  try {
    const session = jwt.verify(token, process.env.JWT_SECRET);
    const authenticated = ["admin", "owner"].includes(session.role);
    res.json({
      authenticated,
      role: authenticated ? session.role : null,
      email: authenticated ? session.email || null : null,
      publicCode: authenticated ? session.publicCode || null : null,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.json({ authenticated: false });
    }
    next(error);
  }
});

app.get("/api/admin/projects", requireAdmin, async (req, res, next) => {
  try {
    const projects = await Project.find(ownerFilter(req)).sort({ createdAt: -1 }).lean();
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/admin/projects",
  requireAdmin,
  projectUpload,
  async (req, res, next) => {
    let images = [];
    try {
      const validationError = validateProject(req.body);
      const { links, error: linksError } = parseProjectLinks(req.body.links);
      if (linksError) {
        return res.status(400).json({ message: linksError });
      }
      const cover = req.files?.cover?.[0];
      const isDirectUpload = req.is("application/json");
      const gallery = Array.isArray(req.body.gallery) ? req.body.gallery : [];
      const imageList = [req.body.coverImage, ...gallery];

      if (
        validationError ||
        (!isDirectUpload && !cover) ||
        (isDirectUpload &&
          (!req.body.coverImage ||
            !Array.isArray(req.body.gallery) ||
            gallery.length > 8 ||
            !imageList.every(isImageKitUrl)))
      ) {
        return res.status(400).json({
          message:
            validationError ||
            (!isDirectUpload
              ? "يرجى اختيار صورة غلاف للمشروع."
              : "صور المشروع غير صالحة. أعد رفع الصور ثم حاول مجددًا."),
        });
      }

      images = isDirectUpload
        ? imageList
        : await saveImages([cover, ...(req.files?.gallery || [])]);

      const baseSlug = slugify(req.body.title) || "project";
      const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;
      const project = await Project.create({
        ...ownerFilter(req),
        title: req.body.title.trim(),
        slug,
        category: req.body.category.trim(),
        year: req.body.year.trim(),
        description: req.body.description.trim(),
        coverImage: images[0],
        gallery: images.slice(1),
        links,
      });
      res.status(201).json(project);
    } catch (error) {
      await removeImages(images);
      next(error);
    }
  },
);

app.put(
  "/api/admin/projects/:id",
  requireAdmin,
  projectUpload,
  async (req, res, next) => {
    let newImages = [];
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "معرّف المشروع غير صالح." });
      }

      const existingProject = await Project.findOne({
        _id: req.params.id,
        ...ownerFilter(req),
      });
      if (!existingProject) {
        return res.status(404).json({ message: "لم يتم العثور على المشروع." });
      }

      const validationError = validateProject(req.body);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      let links = existingProject.links;
      if (req.body.links !== undefined) {
        const parsedLinks = parseProjectLinks(req.body.links);
        if (parsedLinks.error) {
          return res.status(400).json({ message: parsedLinks.error });
        }
        links = parsedLinks.links;
      }

      const coverFile = req.files?.cover?.[0];
      const galleryFiles = req.files?.gallery || [];
      const hasUploadedFiles = Boolean(coverFile || galleryFiles.length);

      let coverImage = existingProject.coverImage;
      let gallery = existingProject.gallery;

      if (hasUploadedFiles) {
        if (coverFile) {
          const [uploadedCover] = await saveImages([coverFile]);
          newImages.push(uploadedCover);
          await removeImages([existingProject.coverImage]);
          coverImage = uploadedCover;
        }

        if (galleryFiles.length) {
          const uploadedGallery = await saveImages(galleryFiles);
          newImages.push(...uploadedGallery);
          await removeImages(existingProject.gallery);
          gallery = uploadedGallery;
        }
      } else if (req.body.coverImage || req.body.gallery) {
        if (req.body.coverImage) {
          if (!isImageKitUrl(req.body.coverImage)) {
            return res.status(400).json({ message: "رابط صورة الغلاف غير صالح." });
          }
          coverImage = req.body.coverImage;
        }

        if (Array.isArray(req.body.gallery)) {
          if (
            req.body.gallery.length > 8 ||
            !req.body.gallery.every(isImageKitUrl)
          ) {
            return res.status(400).json({ message: "روابط صور المعرض غير صالحة." });
          }
          gallery = req.body.gallery;
        }
      }

      existingProject.title = req.body.title.trim();
      existingProject.category = req.body.category.trim();
      existingProject.year = req.body.year.trim();
      existingProject.description = req.body.description.trim();
      existingProject.coverImage = coverImage;
      existingProject.gallery = gallery;
      existingProject.links = links;

      await existingProject.save();
      res.json(existingProject);
    } catch (error) {
      await removeImages(newImages);
      next(error);
    }
  },
);

app.delete("/api/admin/projects/:id", requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "معرّف المشروع غير صالح." });
    }
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      ...ownerFilter(req),
    });
    if (!project) {
      return res.status(404).json({ message: "لم يتم العثور على المشروع." });
    }
    await removeImages([project.coverImage, ...project.gallery]);
    res.json({ message: "تم حذف المشروع بنجاح." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/messages", requireAdmin, async (req, res, next) => {
  try {
    const messages = await Message.find(ownerFilter(req))
      .sort({ createdAt: -1 })
      .limit(100)
      .select("name email message createdAt")
      .lean();
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "حجم الصورة يجب ألا يتجاوز 8 ميغابايت."
        : "تعذر رفع الملفات المحددة.";
    return res.status(400).json({ message });
  }
  if (error.message === "يسمح فقط بصور JPG و PNG و WebP.") {
    return res.status(400).json({ message: error.message });
  }
  if (error.message === "يجب إعداد ImageKit لتخزين الصور عند النشر على Vercel.") {
    return res.status(503).json({ message: error.message });
  }
  console.error(error);
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return res.status(error.status).json({ message: error.message });
  }
  res.status(500).json({ message: "حدث خطأ في الخادم. حاول لاحقًا." });
});

async function start() {
  await connectDatabase();
  await fs.mkdir(uploadsDir, { recursive: true });
  app.listen(port, () => {
    console.log(`the server is running at http://localhost:${port}`);
  });
}

if (!process.env.VERCEL) {
  start().catch((error) => {
    console.error("Could not start the portfolio API:", error);
    process.exitCode = 1;
  });
}

export default app;
