const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Configura la conexión con MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",       // Cambia si tienes otro usuario
  password: "TU_PASSWORD",
  database: "login_app"
});

db.connect(err => {
  if (err) {
    console.log("❌ Error al conectar a MySQL:", err);
  } else {
    console.log("✅ Conectado a MySQL");
  }
});

// RUTA LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query("SELECT * FROM usuarios WHERE username = ?", [username], async (err, results) => {
    if (err) return res.status(500).json({ message: "Error en el servidor" });
    if (results.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Contraseña incorrecta" });

    // Devuelve username y rol
    res.json({ message: "Login exitoso", user: { username: user.username, role: user.role } });
  });
});

// RUTA REGISTRO
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.query("SELECT * FROM usuarios WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ message: "Error en el servidor" });
    if (results.length > 0) return res.status(409).json({ message: "Usuario ya existe" });

    db.query("INSERT INTO usuarios (username, password, role) VALUES (?, ?, 'user')", [username, hashedPassword], (err2) => {
      if (err2) return res.status(500).json({ message: "Error al registrar usuario" });
      res.json({ message: "Usuario registrado correctamente" });
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
