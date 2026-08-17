// Reset ALL passwords to known defaults
// Run:  node server/database/resetPasswords.js
// This also auto-initializes the database if tables are missing.

require("./initDatabase");
require("./initCashbook");

const db = require("./database");

const users = [
  { username: "admin", password: "admin123", name: "Administrator", role: "admin", farm: null },
  { username: "acctoffice", password: "acct123", name: "Accounts Office", role: "admin", farm: null },
  { username: "bluefarm", password: "bluefarm123", name: "Blue Farm Office", role: "farm", farm: "Blue Farm" },
  { username: "blueremounts", password: "remounts123", name: "Blue Remounts Office", role: "farm", farm: "Blue Remounts" },
];

setTimeout(() => {
  db.serialize(() => {
    users.forEach((u) => {
      db.run(
        `INSERT OR REPLACE INTO users (id, username, password, name, role, farm) VALUES ((SELECT id FROM users WHERE username=?), ?, ?, ?, ?, ?)`,
        [u.username, u.username, u.password, u.name, u.role, u.farm],
        function (err) {
          if (err) console.log("❌", u.username, err.message);
          else console.log("✅", u.username, "→", u.password);
        }
      );
    });
  
    setTimeout(() => {
      console.log("\n✅ Done. Login with:");
      console.log("   admin / admin123");
      console.log("   acctoffice / acct123");
      console.log("   bluefarm / bluefarm123");
      console.log("   blueremounts / remounts123");
      process.exit(0);
    }, 1000);
  });
}, 1000);
