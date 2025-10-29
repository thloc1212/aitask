// server.js
// A simple backend API server using Node.js, Express, and pg to connect to your PostgreSQL database.

// --- INSTRUCTIONS ---
// 1. Install dependencies:
//    In your terminal, run: npm install express pg cors
//
// 2. Run the server:
//    In your terminal, run: node server.js
//
// 3. Your backend API will be running at http://localhost:3001



import express from 'express';
import cors from 'cors';
import fs from 'fs';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const port = 3001;

// --- MIDDLEWARE ---
// Enable CORS for all routes, allowing your frontend (even if on a different port) to make requests.
app.use(cors());
// Parse incoming JSON request bodies.
app.use(express.json());


// --- DATABASE CONNECTION ---
// Create a new Pool instance to manage connections to your PostgreSQL database.
// It uses the connection details you provided for your Aiven.io service.
// Use env-configurable DB settings and default to the values shown in your
// Aiven console. New default port is 22671 per the details you pasted.
const DB_HOST = process.env.DB_HOST || 'pg-1648def4-bike.b.aivencloud.com';
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 22671;
const DB_USER = process.env.DB_USER || 'avnadmin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'AVNS_Yn0BkZRL-WQCoq-uFie';
const DB_NAME = process.env.DB_NAME || 'defaultdb';

let sslOption;
if (process.env.DB_SSL_CA_PATH) {
    const ca = fs.readFileSync(process.env.DB_SSL_CA_PATH).toString();
    sslOption = { ca, rejectUnauthorized: true };
} else if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true') {
    sslOption = { rejectUnauthorized: true };
} else {
    // For quick local testing without the CA, fall back to the previous relaxed setting.
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

// Serve static files (so GET / will return your project's index.html)
// Determine __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// If a production build exists in `dist`, serve that. Otherwise serve project root.
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // SPA fallback for client-side routing — do NOT match /api/* so API routes still work.
    // This RegExp matches any path that does NOT start with /api
    app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    // Serve files from project root (useful for simple static files and dev checks)
    app.use(express.static(path.join(__dirname)));
    // Fallback route: serve index.html for root
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
}

// Simple health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

export default app;


// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
    } else {
        console.log('Successfully connected to the database at:', res.rows[0].now);
    }
});


// --- API ENDPOINTS ---

// GET /api/tasks - Retrieve all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, datetime, tags, status } = req.body;
        // Basic validation
        if (!title || !description) {
            return res.status(400).json({ msg: 'Please include a title and description' });
        }
        const newEntry = await pool.query(
            'INSERT INTO tasks (title, description, datetime, tags, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, description, datetime, tags || [], status || 'pending']
        );
        res.json(newEntry.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT /api/tasks/:id - Update an existing task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, datetime, tags, status } = req.body;
        
        const update = await pool.query(
            'UPDATE tasks SET title = $1, description = $2, datetime = $3, tags = $4, status = $5 WHERE id = $6 RETURNING *',
            [title, description, datetime, tags, status, id]
        );

        if (update.rows.length === 0) {
            return res.status(404).json({ msg: 'Task not found' });
        }

        res.json(update.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleteOp = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

        if (deleteOp.rows.length === 0) {
            return res.status(404).json({ msg: 'Task not found' });
        }

        res.json({ msg: 'Task deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- START SERVER ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
