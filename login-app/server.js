const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Servir archivos estáticos (frontend en carpeta public)
app.use(express.static("public"));

// ✅ Configuración de sesión
app.use(session({
  secret: "mi_secreto_super_seguro",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,       // ⚠️ en producción debe ser true con HTTPS
    sameSite: "lax",     // permite compartir cookie en localhost
    maxAge: 1000 * 60 * 60 // 1 hora
  }
}));

// ✅ Conexión a MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "sebas123", // cámbialo si usas otra clave
  database: "login_app"
});

db.connect(err => {
  if (err) {
    console.log("❌ Error al conectar a MySQL:", err);
  } else {
    console.log("✅ Conectado a MySQL");
  }
});

// ✅ Middleware para verificar login
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: "Sesión expirada" });
  }
}

// ==================== AUTENTICACIÓN ====================

// LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query("SELECT * FROM usuarios WHERE username = ?", [username], async (err, results) => {
    if (err) return res.status(500).json({ message: "Error en el servidor" });
    if (results.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Contraseña incorrecta" });

    req.session.user = { username: user.username, role: user.role };
    res.json({ message: "Login exitoso", user: req.session.user });
  });
});

// REGISTRO
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.query("SELECT * FROM usuarios WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ message: "Error en el servidor" });
    if (results.length > 0) return res.status(409).json({ message: "Usuario ya existe" });

    db.query("INSERT INTO usuarios (username, password, role) VALUES (?, ?, 'user')",
      [username, hashedPassword],
      (err2) => {
        if (err2) return res.status(500).json({ message: "Error al registrar usuario" });
        res.json({ message: "Usuario registrado correctamente" });
      });
  });
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Error al cerrar sesión");
    res.clearCookie("connect.sid");
    res.json({ message: "Sesión cerrada correctamente" });
  });
});

// ==================== DASHBOARD ====================

// API usuario actual
app.get("/api/user", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: "No autenticado" });
  }
});


// ==================== GESTIÓN DE ARCHIVOS (SOLO ADMIN) ====================

// 📂 Configuración de Multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// 🟢 SUBIR ARCHIVO (Solo admin)
app.post("/upload", isAuthenticated, upload.single("file"), (req, res) => {
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Solo los administradores pueden subir archivos" });
  }

  const { semana, title } = req.body;
  const filename = req.file.filename;

  db.query("INSERT INTO archivos (filename, title, semana) VALUES (?, ?, ?)",
    [filename, title || filename, semana],
    (err) => {
      if (err) return res.status(500).json({ message: "Error al guardar archivo en BD" });
      res.json({ message: "Archivo subido con éxito", file: filename });
    });
});

// 🟢 EDITAR ARCHIVO (Solo admin)
app.put("/files/:id", isAuthenticated, (req, res) => {
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Solo los administradores pueden editar archivos" });
  }

  const { id } = req.params;
  const { title, semana } = req.body;

  db.query("UPDATE archivos SET title = ?, semana = ? WHERE id = ?",
    [title, semana, id],
    (err) => {
      if (err) return res.status(500).json({ message: "Error al editar archivo" });
      res.json({ message: "Archivo actualizado con éxito" });
    });
});

// 🟢 ELIMINAR ARCHIVO (Solo admin)
app.delete("/files/:id", isAuthenticated, (req, res) => {
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Solo los administradores pueden eliminar archivos" });
  }

  const { id } = req.params;

  // 1. Buscar el archivo en BD
  db.query("SELECT filename FROM archivos WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al buscar archivo" });
    if (results.length === 0) return res.status(404).json({ message: "Archivo no encontrado" });

    const filePath = path.join(__dirname, "uploads", results[0].filename);

    // 2. Eliminar archivo físico
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error al eliminar archivo del servidor:", err);
    });

    // 3. Eliminar registro de BD
    db.query("DELETE FROM archivos WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Error al eliminar de BD" });
      res.json({ message: "Archivo eliminado con éxito" });
    });
  });
});

// 🔵 LISTAR ARCHIVOS por semana (Disponible para todos)
app.get("/files/:semana", isAuthenticated, (req, res) => {
  const { semana } = req.params;
  db.query("SELECT * FROM archivos WHERE semana = ?", [semana], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al listar archivos" });
    res.json(results);
  });
});

// 🔵 DESCARGAR ARCHIVO (Disponible para todos)
app.get("/download/:filename", isAuthenticated, (req, res) => {
  const file = path.join(__dirname, "uploads", req.params.filename);
  res.download(file);
});


// ==================== INICIAR SERVIDOR ====================
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
