// Reset ALL passwords to known defaults
// Run: node server/database/resetPasswords.js

const db = require("./database");
const { hashPassword } = require("../utils/passwordHash");

const users = [
  {
    username: "admin",
    password: hashPassword("admin123"),
    name: "Administrator",
    role: "admin",
    farm: null,
  },
  {
    username: "acctoffice",
    password: hashPassword("acct123"),
    name: "Accounts Office",
    role: "admin",
    farm: null,
  },
  {
    username: "bluefarm",
    password: hashPassword("bluefarm123"),
    name: "Blue Farm Office",
    role: "farm",
    farm: "Blue Farm",
  },
  {
    username: "blueremounts",
    password: hashPassword("remounts123"),
    name: "Blue Remounts Office",
    role: "farm",
    farm: "Blue Remounts",
  },
];

async function resetPasswords() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const u of users) {
      await client.query(
        `
        INSERT INTO users
          (username, password, name, role, farm)
        VALUES
          ($1, $2, $3, $4, $5)

        ON CONFLICT (username)
        DO UPDATE SET
          password = EXCLUDED.password,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          farm = EXCLUDED.farm
        `,
        [
          u.username,
          u.password,
          u.name,
          u.role,
          u.farm,
        ]
      );

      console.log(`✅ ${u.username} → ${u.password}`);
    }

    await client.query("COMMIT");

    console.log("");
    console.log("======================================");
    console.log("✅ Password reset completed");
    console.log("======================================");
    console.log("");
    console.log("Login credentials:");
    console.log("admin        / admin123");
    console.log("acctoffice   / acct123");
    console.log("bluefarm     / bluefarm123");
    console.log("blueremounts / remounts123");
    console.log("");

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("❌ Password reset failed:");
    console.error(err);

    process.exitCode = 1;
  } finally {
    client.release();

    // Close PostgreSQL pool
    await db.end();
  }
}

resetPasswords();