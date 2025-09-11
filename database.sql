-- Crear base de datos
CREATE DATABASE login_app;
USE login_app;

-- Crear tabla usuarios (solo username y password)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);
