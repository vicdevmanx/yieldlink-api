// src/models/userModel.js
import pool from "../config/db.js";

export const createUser = async ({ name, phone, email, passwordHash }) => {
  const result = await pool`
    INSERT INTO users (name, phone, email, password_hash)
    VALUES (${name}, ${phone}, ${email}, ${passwordHash})
    RETURNING id, name, phone, email, created_at
  `;
  return result[0]; // neon returns an array of rows
};

export const findUserByPhoneOrEmail = async (identifier) => {
  const result = await pool`
    SELECT * FROM users
    WHERE phone = ${identifier} OR email = ${identifier}
    LIMIT 1
  `;
  return result[0];
};
