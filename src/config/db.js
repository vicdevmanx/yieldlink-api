// src/config/db.js
import { neon } from '@neondatabase/serverless';
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = neon(process.env.DATABASE_URL);


// Test connection
(async () => {
  try {
    const result = await pool`SELECT NOW()`;
    console.log("✅ Neon DB connected successfully at:", result[0].now);
  } catch (err) {
    console.error("❌ Neon DB connection error:", err.message);
  }
})();

//actual Test
// const posts = await sql('SELECT * FROM posts');

// Quick test
// pool.connect()
//   .then(client => {
//     console.log("✅ Neon DB connected successfully");
//     client.release();
//   })
//   .catch(err => {
//     console.error("❌ Neon DB connection error", err);
//   });

export default pool;
