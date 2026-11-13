import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
const userId = process.env.SERVICE_USER_ID || "replyhalo-engine-user";
const email = process.env.SERVICE_USER_EMAIL || "engine@replyhalo.internal";
const name = process.env.SERVICE_USER_NAME || "ReplyHalo Engine";

if (!databaseUrl) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(
    `INSERT INTO users (id, name, email, "emailVerified", is_admin, plan, subscription_status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, true, 'scale', 'active', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       "emailVerified" = true,
       is_admin = true,
       plan = 'scale',
       subscription_status = 'active',
       "updatedAt" = NOW()`,
    [userId, name, email]
  );
  const result = await client.query(
    `SELECT id, email, "emailVerified", is_admin, plan, subscription_status
     FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rowCount !== 1) throw new Error("Service user verification failed");
  console.log("SupoClip service user ready:", result.rows[0].id);
} finally {
  await client.end();
}
