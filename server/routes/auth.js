const express = require("express");
const router = express.Router();

const db = require("../database/database");

const {
    hashPassword,
    verifyPassword,
    isHashed
} = require("../utils/passwordHash");

const {
    recordFailure,
    clearAttempts
} = require("../utils/rateLimiter");

const {
    createSession,
    revokeSession
} = require("../utils/sessionStore");


// =====================================================
// LOGIN
// =====================================================

router.post("/login", async (req, res) => {

    try {

        const username = String(
            req.body.username || ""
        ).trim().toLowerCase();

        const password = String(
            req.body.password || ""
        ).trim();


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });

        }


        // ---------------------------------------------
        // FIND USER
        // ---------------------------------------------

        const result = await db.query(
            `
            SELECT *
            FROM users
            WHERE LOWER(username) = $1
            LIMIT 1
            `,
            [username]
        );


        const row = result.rows[0];


        // ---------------------------------------------
        // INVALID LOGIN
        // ---------------------------------------------

        if (
            !row ||
            !verifyPassword(password, row.password)
        ) {

            recordFailure(req);

            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });

        }


        // ---------------------------------------------
        // SUCCESSFUL LOGIN
        // ---------------------------------------------

        clearAttempts(req);


        // ---------------------------------------------
        // UPGRADE OLD PASSWORD
        // ---------------------------------------------

        if (!isHashed(row.password)) {

            const upgraded = hashPassword(password);

            try {

                await db.query(
                    `
                    UPDATE users
                    SET password = $1
                    WHERE id = $2
                    `,
                    [
                        upgraded,
                        row.id
                    ]
                );

            } catch (err) {

                console.log(
                    "Password upgrade failed:",
                    err.message
                );

            }

        }


        // ---------------------------------------------
        // USER OBJECT
        // ---------------------------------------------

        const user = {

            username: row.username,

            name: row.name,

            role: row.role,

            farm: row.farm

        };


        // ---------------------------------------------
        // CREATE SESSION
        // ---------------------------------------------

        const token = createSession(user);


        // ---------------------------------------------
        // RESPONSE
        // ---------------------------------------------

        return res.json({

            success: true,

            token,

            user

        });

    } catch (err) {

        console.error(
            "LOGIN ERROR:",
            err
        );

        return res.status(500).json({

            success: false,

            message: "Server error during login"

        });

    }

});


// =====================================================
// LOGOUT
// =====================================================

router.post("/logout", (req, res) => {

    try {

        const header =
            req.headers.authorization || "";

        const token =
            header.startsWith("Bearer ")
                ? header.slice(7)
                : null;


        if (token) {
            revokeSession(token);
        }


        return res.json({

            success: true,

            message: "Logged out successfully"

        });

    } catch (err) {

        console.error(
            "LOGOUT ERROR:",
            err
        );

        return res.status(500).json({

            success: false,

            message: "Logout failed"

        });

    }

});


module.exports = router;