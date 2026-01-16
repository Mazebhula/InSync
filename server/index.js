const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const crypto = require('crypto');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
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
    // Accepts: "Task: Title", "Todo: Title", or just "Task Title"
    if (text.toLowerCase().startsWith('task') || text.toLowerCase().startsWith('todo')) {
        let title = text.substring(4).trim(); // Remove "Task" or "Todo"
        if (title.startsWith(':')) title = title.substring(1).trim(); // Remove colon if present
        
        if (!title) return;

        console.log(`Received task from WhatsApp: ${title}`);

        // Get count to determine order
        db.get('SELECT count(*) as count FROM tasks WHERE columnId = ?', ['todo'], async (err, row) => {
            if (err) {
                console.error('Error fetching task count:', err);
                return;
            }

            const order = row ? row.count : 0;
            const id = crypto.randomUUID();
            const color = 'bg-green-500'; // Default color for WA tasks

            db.run(
                "INSERT INTO tasks (id, title, columnId, \"order\", color) VALUES (?, ?, ?, ?, ?)",
                [id, title, 'todo', order, color],
                async (err) => {
                    if (err) {
                        console.error('Error inserting task from WA:', err);
                        try { await msg.reply('Error saving task.'); } catch (e) { console.error('Failed to reply', e); }
                    } else {
                        const newTask = { id, title, columnId: 'todo', order, color };
                        io.emit('task:created', newTask);
                        try { await msg.reply(`✅ Task added to board: "${title}"`); } catch (e) { console.error('Failed to reply', e); }
                    }
                }
            );
        });
    }

    // 2. DELETE TASK
    // Format: "Delete: [Task Partial Name]"
    else if (text.toLowerCase().startsWith('delete') || text.toLowerCase().startsWith('remove')) {
        let taskNamePart = text.substring(6).trim(); 
        if (taskNamePart.startsWith(':')) taskNamePart = taskNamePart.substring(1).trim();

        if (!taskNamePart) return;

        // Find task by partial name match
        db.get("SELECT * FROM tasks WHERE lower(title) LIKE ?", [`%${taskNamePart.toLowerCase()}%`], async (err, task) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!task) {
                try { await msg.reply(`❌ Task not found matching: "${taskNamePart}"`); } catch (e) {}
                return;
            }

            // Delete the task
            db.run("DELETE FROM tasks WHERE id = ?", [task.id], async (deleteErr) => {
                if (deleteErr) {
                    console.error(deleteErr);
                    try { await msg.reply('❌ Error deleting task.'); } catch (e) {}
                } else {
                    io.emit('task:deleted', task.id);
                    try { await msg.reply(`🗑️ Deleted task: "${task.title}"`); } catch (e) {}
                }
            });
        });
    }

    // 3. MOVE TASK
    // Format: "Move: [Task Partial Name] to [Column Keyword]"
    else if (text.toLowerCase().startsWith('move')) {
        // Expected format: "Move: <TaskName> to <Column>"
        const parts = text.split(' to ');
        if (parts.length < 2) return;

        let taskNamePart = parts[0].substring(5).trim(); // Remove "Move:"
        if (taskNamePart.startsWith(':')) taskNamePart = taskNamePart.substring(1).trim();
        
        const targetColumnRaw = parts[1].trim().toLowerCase();
        
        // Map target column
        let targetColumnId = 'todo';
        if (['done', 'completed', 'finish', 'finished'].some(k => targetColumnRaw.includes(k))) {
            targetColumnId = 'done';
        } else if (['progress', 'doing', 'working', 'process'].some(k => targetColumnRaw.includes(k))) {
            targetColumnId = 'in-progress';
        } else if (['todo', 'backlog', 'start'].some(k => targetColumnRaw.includes(k))) {
            targetColumnId = 'todo';
        } else {
             try { await msg.reply(`❌ Unknown column: "${targetColumnRaw}". Use "todo", "progress", or "done".`); } catch (e) {}
             return;
        }

        // Find task by partial name match
        db.get("SELECT * FROM tasks WHERE lower(title) LIKE ?", [`%${taskNamePart.toLowerCase()}%`], async (err, task) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!task) {
                try { await msg.reply(`❌ Task not found matching: "${taskNamePart}"`); } catch (e) {}
                return;
            }

            // Move the task
            const newOrder = 0; 
            
            db.run("UPDATE tasks SET columnId = ?, \"order\" = ? WHERE id = ?", [targetColumnId, newOrder, task.id], async (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);
                    try { await msg.reply('❌ Error moving task.'); } catch (e) {}
                } else {
                    io.emit('task:moved', { id: task.id, columnId: targetColumnId, order: newOrder });
                    try { await msg.reply(`✅ Moved "${task.title}" to ${targetColumnId.toUpperCase()}`); } catch (e) {}
                }
            });
        });
    }
});

// Start WhatsApp Client
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
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('task:create', (data) => {
    const id = crypto.randomUUID();
    const { title, columnId, order, color } = data;
    db.run(
      "INSERT INTO tasks (id, title, columnId, \"order\", color) VALUES (?, ?, ?, ?, ?)",
      [id, title, columnId, order, color],
      (err) => {
        if (err) return console.error(err);
        const newTask = { id, title, columnId, order, color };
        io.emit('task:created', newTask);
      }
    );
  });

  socket.on('task:move', (data) => {
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
    const { text, sender } = data;
    const timestamp = Date.now();
    
    db.run("INSERT INTO messages (id, text, sender, timestamp) VALUES (?, ?, ?, ?)", [id, text, sender, timestamp], (err) => {
        if (err) return console.error(err);
        io.emit('message:received', { id, text, sender, timestamp });
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});