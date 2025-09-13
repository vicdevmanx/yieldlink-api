import pool from "../config/db.js";

export const createUser = async ({ name, phone, email, passwordHash }) => {
  const result = await pool`
    INSERT INTO users (name, phone, email, password_hash)
    VALUES (${name}, ${phone}, ${email}, ${passwordHash})
    RETURNING id, name, phone, email, created_at
  `;
  return result[0];
};

export const findUserByPhoneOrEmail = async (identifier) => {
  const result = await pool`
    SELECT * FROM users
    WHERE phone = ${identifier} OR email = ${identifier}
    LIMIT 1
  `;
  return result[0];
};

// ✅ New functions for profile management
export const findUserById = async (id) => {
  const result = await pool`
    SELECT id, name, phone, email, created_at
    FROM users
    WHERE id = ${id}
  `;
  return result[0];
};

export const updateUserById = async (id, fields) => {
  // only allow updating name, phone, email (not password here)
  const { name, phone, email } = fields;

  const result = await pool`
    UPDATE users
    SET 
      name = COALESCE(${name}, name),
      phone = COALESCE(${phone}, phone),
      email = COALESCE(${email}, email)
    WHERE id = ${id}
    RETURNING id, name, phone, email, created_at
  `;
  return result[0];
};

export const deleteUserById = async (id) => {
  const result = await pool`
    DELETE FROM users
    WHERE id = ${id}
    RETURNING id
  `;
  return result[0];
};
