/**
 * Quick DB connectivity test — run with:
 *   node scripts/test-db.mjs
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = resolve(__dirname, "../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
} catch {
  console.error("❌ Could not read .env file");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL not set in .env");
  process.exit(1);
}

const maskedUrl = url.replace(/:([^:@]+)@/, ":****@");
console.log(`\n🔌 Testing connection to:\n   ${maskedUrl}\n`);

// Try full pg test first
let pg;
try {
  pg = require("pg");
} catch {
  console.log("ℹ️  'pg' package not found — falling back to TCP test\n");
  testTCP(url);
}

if (pg) {
  const { Client } = pg;
  const client = new Client({ connectionString: url });

  const timeout = setTimeout(() => {
    console.error("❌ Connection timed out after 10 seconds");
    console.log("💡 The Supabase project may be paused. Go to supabase.com and check for a 'Restore project' button.");
    process.exit(1);
  }, 10000);

  try {
    await client.connect();
    clearTimeout(timeout);

    const res = await client.query(
      "SELECT version(), current_database(), current_user, now()"
    );
    const row = res.rows[0];

    console.log("✅ Connected successfully!\n");
    console.log(`   Database : ${row.current_database}`);
    console.log(`   User     : ${row.current_user}`);
    console.log(`   Time     : ${row.now}`);
    console.log(`   Version  : ${row.version.split(",")[0]}`);

    await client.end();
    console.log("\n✅ Connection closed cleanly.\n");
    process.exit(0);
  } catch (err) {
    clearTimeout(timeout);
    console.error("❌ Connection failed:\n");
    console.error(`   ${err.message}\n`);

    if (err.message.includes("ENOTFOUND")) {
      console.log("💡 Hostname not found. Check the host in DATABASE_URL.");
    } else if (err.message.includes("ECONNREFUSED")) {
      console.log("💡 Connection refused. Port may be blocked or server is down.");
    } else if (err.message.includes("password authentication")) {
      console.log("💡 Wrong password. Check your Supabase database password.");
    } else if (err.message.includes("tenant") || err.message.includes("not found")) {
      console.log("💡 Project not found. The Supabase project may be PAUSED.");
      console.log("   → Go to supabase.com → your project → click 'Restore project'");
    } else if (err.message.includes("SSL")) {
      console.log("💡 SSL error. Try adding ?sslmode=require to the connection string.");
    }
    process.exit(1);
  }
}

function testTCP(url) {
  const match = url.match(/postgresql:\/\/[^@]+@([^:/]+):(\d+)/);
  if (!match) {
    console.error("❌ Could not parse host/port from DATABASE_URL");
    process.exit(1);
  }
  const [, host, port] = match;
  const net = require("net");
  const socket = new net.Socket();

  console.log(`Testing TCP to ${host}:${port} ...`);

  socket.setTimeout(8000);

  socket.connect(parseInt(port), host, () => {
    console.log(`✅ TCP port ${port} is reachable on ${host}`);
    console.log("   Run 'npm install pg' then re-run this script for a full auth test.");
    socket.destroy();
    process.exit(0);
  });

  socket.on("error", (err) => {
    console.error(`❌ TCP failed: ${err.message}`);
    process.exit(1);
  });

  socket.on("timeout", () => {
    console.error(`❌ TCP timed out — port ${port} is blocked or project is paused`);
    console.log("💡 Try: supabase.com → your project → 'Restore project' if paused");
    console.log("💡 Or:  switch to a mobile hotspot to bypass firewall restrictions");
    socket.destroy();
    process.exit(1);
  });
}
