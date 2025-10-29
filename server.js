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

// Get medical aid details by user ID
app.get("/medicalaid/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT json_build_object(
        'medicalaidid', ma.medicalaidid,
        'userid', ma.userid,
        'medicalaidname', ma.medicalaidname,
        'medicalnumber', ma.medicalnumber
      ) AS medicalaid
      FROM tblmedicalaid ma
      WHERE ma.userid = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No medical aid found for this user." });
    }

    res.json(result.rows[0].medicalaid);
  } catch (err) {
    console.error("Error fetching medical aid:", err);
    res.status(500).send("Server Error");
  }
});

// Get user address details by user ID
app.get("/useraddress/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT json_build_object(
        'addressid', ua.addressid,
        'userid', ua.userid,
        'postaladdress', ua.postaladdress,
        'postalcode', ua.postalcode,
        'physicaladdress', ua.physicaladdress,
        'physicalcode', ua.physicalcode
      ) AS useraddress
      FROM tbluseraddresses ua
      WHERE ua.userid = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No address found for this user." });
    }

    res.json(result.rows[0].useraddress);
  } catch (err) {
    console.error("Error fetching user address:", err);
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
    'medicalNumber', us.userid::text,
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
              'notes', ap.notes,
              'date', ap.date,
              'practitioner_occupation', pr.occupation,
              'practicenumber', pr.practicenumber,
              'statutorycouncil', pr.statutorycouncil,
              'practitioner_userid', pru.userid,
              'practitioner_name', pru.name,
              'practitioner_surname', pru.surname,
              'title',pr.title
            )
              ORDER BY ap.date DESC
          ) FILTER (WHERE ap.app_id IS NOT NULL), '[]'::json
        ),
        'vitals', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'vitalid', vt.vitalid,
                'systolic', vt.systolic,
                'diastolic', vt.diastolic,
                'heartrate', vt.heartrate,
                'temperature', vt.temperature,
                'vitalsdate', vt.vitalsdate,
                'practitionerid', vt.practitionerid,
                'practitioner_occupation', vpr.occupation,
                'practitioner_userid', vru.userid,
                'practitioner_name', vru.name,
                'practitioner_surname', vru.surname,
                'title', vpr.title
              )
              ORDER BY vt.vitalsdate DESC
            )
            FROM tblvitals vt
            LEFT JOIN tblpractitioner vpr ON vt.practitionerid = vpr.practitionerid
            LEFT JOIN tblusers vru ON vpr.userid = vru.userid
            WHERE vt.userid = us.userid
          ),
          '[]'::json
        ),
        'medication', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'medicationid', md.medicationid,
                'medicationname', md.medicationname,
                'dosage', md.dosage,
                'userid', md.userid,
                'frequency', md.frequency
              )
              ORDER BY md.medicationid DESC
            )
            FROM tblmedication md
            WHERE md.userid = us.userid
          ),
          '[]'::json
        ),
        'conditions', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'conditionid', c.conditionid,
                'conditionname', c.conditionname,
                'diagnosisdate', c.diagnosisdate
              )
            )
            FROM tblconditions c
            WHERE c.userid = us.userid
          ),
          '[]'::json
        )
      ) AS patient
      FROM tblusers us
      LEFT JOIN tblappointments ap ON us.userid = ap.userid
      LEFT JOIN tblpractitioner pr ON ap.practitionerid = pr.practitionerid
      LEFT JOIN tblusers pru ON pr.userid = pru.userid
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
        'medicalNumber', us.userid::text,
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
              'notes', ap.notes,
              'date', ap.date,
              'practitioner_occupation', pr.occupation,
              'practicenumber', pr.practicenumber,
              'statutorycouncil', pr.statutorycouncil,
              'practitioner_userid', pru.userid,
              'practitioner_name', pru.name,
              'practitioner_surname', pru.surname,
              'title',pr.title
            )
              ORDER BY ap.date DESC
          ) FILTER (WHERE ap.app_id IS NOT NULL), '[]'::json
        ),
        'vitals', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'vitalid', vt.vitalid,
                'systolic', vt.systolic,
                'diastolic', vt.diastolic,
                'heartrate', vt.heartrate,
                'temperature', vt.temperature,
                'vitalsdate', vt.vitalsdate,
                'practitionerid', vt.practitionerid,
                'practitioner_occupation', vpr.occupation,
                'practitioner_userid', vru.userid,
                'practitioner_name', vru.name,
                'practitioner_surname', vru.surname,
                'title', vpr.title
              )
              ORDER BY vt.vitalsdate DESC
            )
            FROM tblvitals vt
            LEFT JOIN tblpractitioner vpr ON vt.practitionerid = vpr.practitionerid
            LEFT JOIN tblusers vru ON vpr.userid = vru.userid
            WHERE vt.userid = us.userid
          ),
          '[]'::json
        ),
        'medication', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'medicationid', md.medicationid,
                'medicationname', md.medicationname,
                'dosage', md.dosage,
                'userid', md.userid,
                'frequency', md.frequency
              )
              ORDER BY md.medicationid DESC
            )
            FROM tblmedication md
            WHERE md.userid = us.userid
          ),
          '[]'::json
        ),
        'conditions', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'conditionid', c.conditionid,
                'conditionname', c.conditionname,
                'diagnosisdate', c.diagnosisdate
              )
            )
            FROM tblconditions c
            WHERE c.userid = us.userid
          ),
          '[]'::json
        )
      ) AS patient
      FROM tblusers us
      LEFT JOIN tblappointments ap ON us.userid = ap.userid
      LEFT JOIN tblpractitioner pr ON ap.practitionerid = pr.practitionerid
      LEFT JOIN tblusers pru ON pr.userid = pru.userid
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
        'medicalNumber', us.userid::text,
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
              'notes', ap.notes,
              'date', ap.date,
              'practitioner_occupation', pr.occupation,
              'practicenumber', pr.practicenumber,
              'statutorycouncil', pr.statutorycouncil,
              'practitioner_userid', pru.userid,
              'practitioner_name', pru.name,
              'practitioner_surname', pru.surname,
              'title',pr.title
            )
              ORDER BY ap.date DESC
          ) FILTER (WHERE ap.app_id IS NOT NULL), '[]'::json
        ),
        'vitals', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'vitalid', vt.vitalid,
                'systolic', vt.systolic,
                'diastolic', vt.diastolic,
                'heartrate', vt.heartrate,
                'temperature', vt.temperature,
                'vitalsdate', vt.vitalsdate,
                'practitionerid', vt.practitionerid,
                'practitioner_occupation', vpr.occupation,
                'practitioner_userid', vru.userid,
                'practitioner_name', vru.name,
                'practitioner_surname', vru.surname,
                'title', vpr.title
              )
              ORDER BY vt.vitalsdate DESC
            )
            FROM tblvitals vt
            LEFT JOIN tblpractitioner vpr ON vt.practitionerid = vpr.practitionerid
            LEFT JOIN tblusers vru ON vpr.userid = vru.userid
            WHERE vt.userid = us.userid
          ),
          '[]'::json
        ),
        'medication', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'medicationid', md.medicationid,
                'medicationname', md.medicationname,
                'dosage', md.dosage,
                'userid', md.userid,
                'frequency', md.frequency
              )
              ORDER BY md.medicationid DESC
            )
            FROM tblmedication md
            WHERE md.userid = us.userid
          ),
          '[]'::json
        ),
        'conditions', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'conditionid', c.conditionid,
                'conditionname', c.conditionname,
                'diagnosisdate', c.diagnosisdate
              )
            )
            FROM tblconditions c
            WHERE c.userid = us.userid
          ),
          '[]'::json
        )
      ) AS patient
      FROM tblusers us
      LEFT JOIN tblappointments ap ON us.userid = ap.userid
      LEFT JOIN tblpractitioner pr ON ap.practitionerid = pr.practitionerid
      LEFT JOIN tblusers pru ON pr.userid = pru.userid
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
