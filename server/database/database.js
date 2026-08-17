const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
    process.env.DB_PATH || path.join(__dirname, "bluefarm.db"),
    (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log("✅ SQLite Database Connected");
        }
    }
);

// Add Farm Column (Run only once)
db.run(
    `ALTER TABLE employees ADD COLUMN farm TEXT`,
    (err) => {
        if (err) {
            if (err.message.includes("duplicate column")) {
                console.log("✅ Farm column already exists");
            } else {
                console.log(err.message);
            }
        } else {
            console.log("✅ Farm column added");
        }
    }
);

module.exports = db;