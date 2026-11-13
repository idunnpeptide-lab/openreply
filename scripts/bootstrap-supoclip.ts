import crypto from "node:crypto";
import pg from "pg";

const databaseUrl = process.env.SUPOCLIP_BOOTSTRAP_DATABASE_URL;
const apiKey = process.env.SUPOCLIP_BOOTSTRAP_API_KEY;

if (!databaseUrl) {
  throw new Error("SUPOCLIP_BOOTSTRAP_DATABASE_URL is required");
}
if (!apiKey || !apiKey.startsWith("sk_")) {
  throw new Error("SUPOCLIP_BOOTSTRAP_API_KEY is required and must start with sk_");
}

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();

  const userId = "replyhalo-service";
  const keyHash = crypto.createHash("sha256").update(apiKey.trim()).digest("hex");
  const keyPrefix = apiKey.slice(0, 11);

  await client.query(
    `INSERT INTO users (id, name, email, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       "emailVerified" = true,
       "updatedAt" = NOW()`,
    [userId, "ReplyHalo Service", "service@replyhalo.internal"]
  );

  const existing = await client.query(
    "SELECT id FROM api_keys WHERE key_hash = $1 LIMIT 1",
    [keyHash]
  );

  if (existing.rowCount === 0) {
    await client.query(
      `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ["replyhalo-service-key", userId, "ReplyHalo engine bridge", keyHash, keyPrefix]
    );
  } else {
    await client.query(
      "UPDATE api_keys SET revoked_at = NULL, name = $1 WHERE key_hash = $2",
      ["ReplyHalo engine bridge", keyHash]
    );
  }

  const verify = await client.query(
    `SELECT u.id AS user_id, k.id AS key_id
     FROM users u
     JOIN api_keys k ON k.user_id = u.id
     WHERE u.id = $1 AND k.key_hash = $2 AND k.revoked_at IS NULL`,
    [userId, keyHash]
  );

  if (verify.rowCount !== 1) {
    throw new Error("SupoClip bootstrap verification failed");
  }

  console.log("SupoClip bootstrap verified");
}

main()
  .finally(async () => {
    await client.end();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
