import { readFileSync } from "fs";
import pg from "pg";

const sql = readFileSync(process.argv[2], "utf8");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log("migration applied");
} finally {
  await client.end();
}
