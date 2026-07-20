import pool from "../config/db.js";

export async function findSkills(search = "") {
  let sql = `
    SELECT
      id,
      name,
      normalized_name,
      category
    FROM skills
  `;

  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);

    sql += `
      WHERE
        name ILIKE $1
        OR normalized_name ILIKE $1
    `;
  }

  sql += `
    ORDER BY name ASC
    LIMIT 50
  `;

  const result = await pool.query(sql, params);

  return result.rows;
}

export async function findSkillByName(name) {
  const result = await pool.query(
    `
      SELECT *
      FROM skills
      WHERE LOWER(name)=LOWER($1)
      LIMIT 1
    `,
    [name]
  );

  return result.rows[0] || null;
}

export async function createSkill(
  name,
  normalizedName,
  category = null
) {
  const result = await pool.query(
    `
      INSERT INTO skills(
        name,
        normalized_name,
        category
      )
      VALUES($1,$2,$3)
      RETURNING *
    `,
    [
      name,
      normalizedName,
      category,
    ]
  );

  return result.rows[0];
}