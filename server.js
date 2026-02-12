require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= Middleware =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= Ensure uploads folder exists =================
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ================= Multer Setup =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, Date.now() + ext);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".mp4", ".mov", ".avi", ".webm"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only video files allowed"));
  }
});

// ================= Default Route =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ================= Login =================
app.post("/login", (req, res) => {
  const { name, email } = req.body;
  if (!name || !email)
    return res.json({ success: false, message: "Name and Email required" });

  res.json({ success: true, user: { name, email } });
});

// ================= Upload Route =================
app.post("/upload/:sport", upload.single("video"), async (req, res) => {
  try {
    const sport = req.params.sport;
    const file = req.file;
    const user = req.body.user ? JSON.parse(req.body.user) : null;

    if (!file)
      return res.status(400).json({ success: false, message: "No video uploaded" });

    const filepath = path.join("uploads", file.filename);

    await pool.query(
      `INSERT INTO uploads 
      (user_name, user_email, sport, filename, filepath) 
      VALUES (?, ?, ?, ?, ?)`,
      [user?.name || null, user?.email || null, sport, file.filename, filepath]
    );

    res.json({ success: true, message: "Uploaded successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================= Get Uploads =================
app.post("/api/uploads", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    const [rows] = await pool.query(
      `SELECT id, sport, filename, filepath, created_at 
       FROM uploads WHERE user_email = ? ORDER BY created_at DESC`,
      [email]
    );

    res.json({ success: true, uploads: rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================= Delete Upload =================
app.post("/api/delete-upload", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id)
      return res.status(400).json({ success: false, message: "ID required" });

    const [rows] = await pool.query(
      `SELECT filename FROM uploads WHERE id = ?`,
      [id]
    );

    if (!rows.length)
      return res.json({ success: false, message: "Not found" });

    const filePath = path.join(__dirname, "uploads", rows[0].filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query(`DELETE FROM uploads WHERE id = ?`, [id]);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================= Start Server =================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
