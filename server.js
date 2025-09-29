const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;

// Test route
// app.get("/", (req, res) => {
//   res.send("Postgres API is running 🚀");
// });

// quick test
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Connected! Current time:", res.rows[0]);
  } catch (err) {
    console.error("Connection failed:", err);
  }
})();

// Get all users
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tblUsers");
    console.log("Connected! Current time:");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Add a new user
// app.post("/users", async (req, res) => {
//   const { name, age } = req.body;
//   try {
//     const result = await pool.query(
//       "INSERT INTO users (name, age) VALUES ($1, $2) RETURNING *",
//       [name, age]
//     );
//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Server Error");
//   }
// });

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
