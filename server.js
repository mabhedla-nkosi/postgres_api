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
    //const result = await pool.query("SELECT * FROM tblUsers");
    const result = await pool.query(`
      SELECT json_build_object(
    'userid', ur.userid,
    'name', ur.name,
    'surname', ur.surname,
    'phone', ur.contactinfo,
    'dateofrecording', ur.dateofrecording,
    'email', ur.email,
    'password', ur.password,
    'id_passportnumber', ur.id_passportnumber,
    'gender', ur.gender,
    'dob', ur.dob,
    'nationality', ur.nationality,
    'address', json_build_object(
        'addressid', ad.addressid,
        'postaladdress', ad.postaladdress,
        'postalcode', ad.postalcode,
        'physicaladdress', ad.physicaladdress,
        'physicalcode', ad.physicalcode
    )
) AS user_json
FROM tblusers ur
INNER JOIN tbluseraddresses ad ON ur.userid = ad.userid`
    );
    console.log("Connected! Current time:");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Get all patientData
app.get("/patientData", async (req, res) => {
  try {
    //const result = await pool.query("SELECT * FROM tblUsers");
    const result = await pool.query(`
      SELECT json_build_object(
    'userid', us.userid,
    'name', us.name,
    'surname', us.surname,
    'phone', us.contactinfo,
    'email', us.email,
    'id_passportnumber', us.id_passportnumber,
    'gender', us.gender,
    'dob', us.dob,
    'nationality', us.nationality,
    'appointments', COALESCE(
      json_agg(
        json_build_object(
          'app_id', ap.app_id,
          'practitionerid', ap.practitionerid,
          'status', ap.status,
          'notes', ap.notes
        )
      ) FILTER (WHERE ap.app_id IS NOT NULL), '[]'::json
    )
) AS patient
FROM tblusers us
LEFT JOIN tblappointments ap ON us.userid = ap.userid
GROUP BY us.userid;`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


// Get a single patient's data by user ID
app.get("/patientData/:id", async (req, res) => {
  const { id } = req.params; // Extract user ID from the URL

  try {
    const result = await pool.query(`
      SELECT json_build_object(
        'userid', us.userid,
        'name', us.name,
        'surname', us.surname,
        'phone', us.contactinfo,
        'email', us.email,
        'id_passportnumber', us.id_passportnumber,
        'gender', us.gender,
        'dob', us.dob,
        'nationality', us.nationality,
        'appointments', COALESCE(
          json_agg(
            json_build_object(
              'app_id', ap.app_id,
              'practitionerid', ap.practitionerid,
              'status', ap.status,
              'notes', ap.notes
            )
          ) FILTER (WHERE ap.app_id IS NOT NULL), '[]'::json
        )
      ) AS patient
      FROM tblusers us
      LEFT JOIN tblappointments ap ON us.userid = ap.userid
      WHERE us.userid = $1
      GROUP BY us.userid;
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Return just the patient object (not an array)
    res.json(result.rows[0].patient);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Get a single patient's data by email
app.get("/patientData/email/:email", async (req, res) => {
  const { email } = req.params; // Extract email from the URL

  try {
    const result = await pool.query(`
      SELECT json_build_object(
        'userid', us.userid,
        'name', us.name,
        'surname', us.surname,
        'phone', us.contactinfo,
        'email', us.email,
        'id_passportnumber', us.id_passportnumber,
        'gender', us.gender,
        'dob', us.dob,
        'nationality', us.nationality,
        'appointments', COALESCE(
          json_agg(
            json_build_object(
              'app_id', ap.app_id,
              'practitionerid', ap.practitionerid,
              'status', ap.status,
              'notes', ap.notes
            )
          ) FILTER (WHERE ap.app_id IS NOT NULL), '[]'::json
        )
      ) AS patient
      FROM tblusers us
      LEFT JOIN tblappointments ap ON us.userid = ap.userid
      WHERE LOWER(us.email) = LOWER($1)
      GROUP BY us.userid;
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json(result.rows[0].patient);

  } catch (err) {
    console.error("Error fetching patient by email:", err);
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
