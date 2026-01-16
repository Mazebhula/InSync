require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const crypto = require('crypto');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();

// --- Middleware ---
app.use(cors({
    origin: 'http://localhost:5173', // Must specify origin for credentials
    credentials: true
}));
app.use(express.json());

// Session Setup
app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: '.' }),
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        httpOnly: true 
        // secure: false // for localhost
    } 
}));

// Passport Setup
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
        done(err, row);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
      // Upsert user
      db.run("INSERT OR REPLACE INTO users (id, displayName, photo) VALUES (?, ?, ?)", 
        [profile.id, profile.displayName, profile.photos[0]?.value], 
        (err) => {
            if(err) return cb(err);
            const user = { id: profile.id, displayName: profile.displayName, photo: profile.photos[0]?.value };
            return cb(null, user);
        }
      );
  }
));


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Sync with Express CORS
    methods: ["GET", "POST"],
    credentials: true
  }
});


// --- Auth Routes ---
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login?error=true' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('http://localhost:5173/');
  });

app.post('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.status(200).json({ message: 'Logged out' });
    });
});

app.get('/api/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});


// --- WhatsApp Client Setup ---
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('\n=============================================================');
    console.log('WHATSAPP WEB QR CODE RECEIVED');
    console.log('Scan this with your WhatsApp (Linked Devices) to login:');
    qrcode.generate(qr, { small: true });
    console.log('=============================================================\n');
});

whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

whatsappClient.on('message', async (msg) => {
    const text = msg.body.trim();
    
    // 1. CREATE TASK
    if (text.toLowerCase().startsWith('task') || text.toLowerCase().startsWith('todo')) {
        let title = text.substring(4).trim(); 
        if (title.startsWith(':')) title = title.substring(1).trim(); 
        
        if (!title) return;

        console.log(`Received task from WhatsApp: ${title}`);

        db.get('SELECT count(*) as count FROM tasks WHERE columnId = ?', ['todo'], async (err, row) => {
            if (err) {
                console.error('Error fetching task count:', err);
                return;
            }

            const order = row ? row.count : 0;
            const id = crypto.randomUUID();
            const color = 'bg-green-500';

            db.run(
                "INSERT INTO tasks (id, title, columnId, \"order\", color, creatorName) VALUES (?, ?, ?, ?, ?, ?)",
                [id, title, 'todo', order, color, 'WhatsApp'], // Mark source as WhatsApp
                async (err) => {
                    if (err) {
                        console.error('Error inserting task from WA:', err);
                        try { await whatsappClient.sendMessage(msg.from, 'Error saving task.'); } 
                        catch (e) { console.error('Note: Reply failed (WA compatibility), but task saved.'); }
                    } else {
                        const newTask = { id, title, columnId: 'todo', order, color, creatorName: 'WhatsApp' };
                        io.emit('task:created', newTask);
                        try { await whatsappClient.sendMessage(msg.from, `✅ Task added to board: "${title}"`); } 
                        catch (e) { console.error('Note: Reply failed (WA compatibility), but task saved.'); }
                    }
                }
            );
        });
    }

    // 2. DELETE TASK
    else if (text.toLowerCase().startsWith('delete') || text.toLowerCase().startsWith('remove')) {
        let taskNamePart = text.substring(6).trim(); 
        if (taskNamePart.startsWith(':')) taskNamePart = taskNamePart.substring(1).trim();

        if (!taskNamePart) return;

        db.get("SELECT * FROM tasks WHERE lower(title) LIKE ?", [`%${taskNamePart.toLowerCase()}%`], async (err, task) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!task) {
                try { await whatsappClient.sendMessage(msg.from, `❌ Task not found matching: "${taskNamePart}"`); } 
                catch (e) { console.error('Note: Reply failed (WA compatibility).'); }
                return;
            }

            db.run("DELETE FROM tasks WHERE id = ?", [task.id], async (deleteErr) => {
                if (deleteErr) {
                    console.error(deleteErr);
                    try { await whatsappClient.sendMessage(msg.from, '❌ Error deleting task.'); } 
                    catch (e) { console.error('Note: Reply failed (WA compatibility).'); }
                } else {
                    io.emit('task:deleted', task.id);
                    try { await whatsappClient.sendMessage(msg.from, `🗑️ Deleted task: "${task.title}"`); } 
                    catch (e) { console.error('Note: Reply failed (WA compatibility).'); }
                }
            });
        });
    }

    // 3. MOVE TASK
    else if (text.toLowerCase().startsWith('move')) {
        const parts = text.split(' to ');
        if (parts.length < 2) return;

        let taskNamePart = parts[0].substring(5).trim();
        if (taskNamePart.startsWith(':')) taskNamePart = taskNamePart.substring(1).trim();
        
        const targetColumnRaw = parts[1].trim().toLowerCase();
        
        let targetColumnId = 'todo';
        if (['done', 'completed', 'finish', 'finished'].some(k => targetColumnRaw.includes(k))) {
            targetColumnId = 'done';
        } else if (['progress', 'doing', 'working', 'process'].some(k => targetColumnRaw.includes(k))) {
            targetColumnId = 'in-progress';
        } else if (['todo', 'backlog', 'start'].some(k => targetColumnRaw.includes(k))) {
            targetColumnId = 'todo';
        } else {
             try { await whatsappClient.sendMessage(msg.from, `❌ Unknown column: "${targetColumnRaw}". Use "todo", "progress", or "done".`); } 
             catch (e) { console.error('Note: Reply failed (WA compatibility).'); }
             return;
        }

        db.get("SELECT * FROM tasks WHERE lower(title) LIKE ?", [`%${taskNamePart.toLowerCase()}%`], async (err, task) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!task) {
                try { await whatsappClient.sendMessage(msg.from, `❌ Task not found matching: "${taskNamePart}"`); } 
                catch (e) { console.error('Note: Reply failed (WA compatibility).'); }
                return;
            }

            const newOrder = 0; 
            
            db.run("UPDATE tasks SET columnId = ?, \"order\" = ? WHERE id = ?", [targetColumnId, newOrder, task.id], async (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);
                    try { await whatsappClient.sendMessage(msg.from, '❌ Error moving task.'); } 
                    catch (e) { console.error('Note: Reply failed (WA compatibility).'); }
                } else {
                    io.emit('task:moved', { id: task.id, columnId: targetColumnId, order: newOrder });
                    try { await whatsappClient.sendMessage(msg.from, `✅ Moved "${task.title}" to ${targetColumnId.toUpperCase()}`); } 
                    catch (e) { console.error('Note: Reply failed (WA compatibility).'); }
                }
            });
        });
    }
});

whatsappClient.initialize();


// --- REST API ---
app.get('/api/tasks', (req, res) => {
  db.all("SELECT * FROM tasks ORDER BY \"order\" ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/messages', (req, res) => {
  db.all("SELECT * FROM messages ORDER BY timestamp ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Socket.io Logic ---
// We can use a middleware to inject user info into socket if we shared session store,
// but for simplicity we'll just pass user info in the payload from client.
// OR we can make the socket protected. For this demo, we trust the client to send 'user' object.

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('task:create', (data) => {
    // data should now include user info if logged in
    const id = crypto.randomUUID();
    const { title, columnId, order, color, user } = data;
    
    // Safe fallback if user is null
    const creatorId = user ? user.id : null;
    const creatorName = user ? user.displayName : 'Anonymous';
    const creatorPhoto = user ? user.photo : null;

    db.run(
      "INSERT INTO tasks (id, title, columnId, \"order\", color, creatorId, creatorName, creatorPhoto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, title, columnId, order, color, creatorId, creatorName, creatorPhoto],
      (err) => {
        if (err) return console.error(err);
        const newTask = { id, title, columnId, order, color, creatorId, creatorName, creatorPhoto };
        io.emit('task:created', newTask);
      }
    );
  });

  socket.on('task:move', (data) => {
    // We can also track WHO moved it if we want, but schema doesn't have 'lastModifiedBy' yet.
    // We do have 'assignee'.
    // If we want to assign on move?
    // For now, let's just move.
    
    const { id, columnId, order } = data;
    db.run("UPDATE tasks SET columnId = ?, \"order\" = ? WHERE id = ?", [columnId, order, id], (err) => {
        if (err) return console.error(err);
        io.emit('task:moved', data);
    });
  });

  socket.on('task:delete', (id) => {
      db.run("DELETE FROM tasks WHERE id = ?", [id], (err) => {
          if (err) return console.error(err);
          io.emit('task:deleted', id);
      });
  });

  socket.on('message:send', (data) => {
    const id = crypto.randomUUID();
    const { text, sender, user } = data; // user is passed from client
    
    const senderName = user ? user.displayName : sender;
    const senderPhoto = user ? user.photo : null;
    const senderId = user ? user.id : null;

    const timestamp = Date.now();
    
    db.run("INSERT INTO messages (id, text, sender, timestamp, senderId, senderPhoto) VALUES (?, ?, ?, ?, ?, ?)", 
        [id, text, senderName, timestamp, senderId, senderPhoto], (err) => {
        if (err) return console.error(err);
        io.emit('message:received', { id, text, sender: senderName, timestamp, senderId, senderPhoto });
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
console.log('Attempting to start server on port', PORT);
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});