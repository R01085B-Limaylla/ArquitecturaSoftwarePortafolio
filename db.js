// db.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "switchyard.proxy.rlwy.net",
  port: 35044,
  user: "root",
  password: "uUqGzWnifpPkvcATNRqqQnFGPckpqIqv",
  database: "railway",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
