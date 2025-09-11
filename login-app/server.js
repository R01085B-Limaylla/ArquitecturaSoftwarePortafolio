const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conexión a MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",   // tu usuario MySQL
  password: "",   // tu contraseña MySQL
  database: "login_app"
});

db.connect(err => {
  if (err) {
    console.error("❌ Error al conectar con MySQL:", err);
    return;
  }
  console.log("✅ Conectado a MySQL");
});

/* ------------------------- RUTAS ------------------------- */

// Registro de usuario
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  // Encriptar contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO usuarios (username, password) VALUES (?, ?)",
    [username, hashedPassword],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "El nombre de usuario ya existe" });
        }
        return res.status(500).json({ message: "Error al registrar usuario" });
      }
      res.json({ message: "Usuario registrado correctamente" });
    }
  );
});

// Login de usuario
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Usuario y contraseña son obligatorios" });
  }

  db.query(
    "SELECT * FROM usuarios WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Error en el servidor" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const user = results[0];
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      res.json({ message: "Login exitoso", user: { id: user.id, username: user.username } });
    }
  );
});

// Iniciar servidor
app.listen(3000, () => {
  console.log("🚀 Servidor corriendo en http://localhost:3000");
});
