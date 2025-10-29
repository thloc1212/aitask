// setup.js
// Initialize the PostgreSQL database for the first run.
// Creates the `tasks` table (if it doesn't exist) and inserts a sample row.

import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

// Read configuration from environment with sensible defaults from your Aiven console
const DB_HOST = process.env.DB_HOST || 'pg-1648def4-bike.b.aivencloud.com';
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 22671;
const DB_USER = process.env.DB_USER || 'avnadmin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'AVNS_Yn0BkZRL-WQCoq-uFie';
const DB_NAME = process.env.DB_NAME || 'defaultdb';

// SSL configuration: prefer a provided CA file. If none provided we fall back to
// rejectUnauthorized: false for convenience (insecure). To use a CA file set
// the environment variable DB_SSL_CA_PATH to the absolute path of the certificate.
let sslOption;
if (process.env.DB_SSL_CA_PATH) {
    const ca = fs.readFileSync(process.env.DB_SSL_CA_PATH).toString();
    sslOption = { ca, rejectUnauthorized: true };
} else if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true') {
    sslOption = { rejectUnauthorized: true };
} else {
    // Default fallback (matches previous behavior) — set to false if you don't have the CA
    sslOption = { rejectUnauthorized: false };
}

const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: sslOption
});

async function main() {
    try {
        console.log('Connecting to database...');
        await pool.query('SELECT 1');

        const createTableSql = `
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            datetime TIMESTAMP,
            tags TEXT[] DEFAULT array[]::text[],
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
        );
        `;

        console.log('Creating table `tasks` if not exists...');
        await pool.query(createTableSql);
        console.log('Table ensured.');

        // Insert a sample row only if table is empty
        const { rows } = await pool.query('SELECT count(*)::int as c FROM tasks');
        const count = rows[0].c;
        if (count === 0) {
            console.log('Table is empty — inserting a sample task...');
            const insertSql = `
                INSERT INTO tasks (title, description, datetime, tags, status)
                VALUES ($1, $2, $3, $4, $5) RETURNING *;
            `;
            const sample = [
                'Sample task',
                'This task was created by setup.js',
                new Date().toISOString(),
                ['setup', 'sample'],
                'pending'
            ];
            const inserted = await pool.query(insertSql, sample);
            console.log('Inserted sample task:', inserted.rows[0]);
        } else {
            console.log(`Table already has ${count} row(s); skipping sample insert.`);
        }

        console.log('Setup complete.');
    } catch (err) {
        console.error('Error during setup:', err.message || err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
