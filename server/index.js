const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for demo purposes
    methods: ["GET", "POST"]
  }
});

// REST API for initial state
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

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Task Events
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
    // data: { id, columnId, newOrder, oldColumnId, oldOrder }
    // This is a simplified move. For full consistency, we'd need to shift others.
    // For this prototype, we'll update the specific task and just assume the client handles the visual sort
    // or we can implement a bulk update.
    
    // Better approach for drag-drop: Client sends the ENTIRE new state of the affected column(s) or we handle reordering here.
    // To keep it robust but simple: We receive the updated task's new column and order.
    // Realistically, reordering involves updating multiple rows.
    
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

  // Chat Events
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
