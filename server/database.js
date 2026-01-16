const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'kanban.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      displayName TEXT,
      photo TEXT
    )`);

    // Tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      columnId TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      color TEXT,
      creatorId TEXT,
      creatorName TEXT,
      creatorPhoto TEXT,
      assigneeId TEXT,
      assigneeName TEXT,
      assigneePhoto TEXT
    )`);

    // Migration: Add columns if they don't exist (for existing DBs)
    const columnsToAdd = [
        'creatorId TEXT', 'creatorName TEXT', 'creatorPhoto TEXT',
        'assigneeId TEXT', 'assigneeName TEXT', 'assigneePhoto TEXT'
    ];
    
    columnsToAdd.forEach(col => {
       const colName = col.split(' ')[0];
       db.run(`ALTER TABLE tasks ADD COLUMN ${col}`, (err) => {
           // Ignore duplicate column errors
           if (err && !err.message.includes('duplicate column')) {
               // console.error(err.message); 
           }
       });
    });


    // Messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      sender TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      senderId TEXT,
      senderPhoto TEXT
    )`);
    
    // Migration for messages
    const msgColumns = ['senderId TEXT', 'senderPhoto TEXT'];
    msgColumns.forEach(col => {
       db.run(`ALTER TABLE messages ADD COLUMN ${col}`, (err) => {
           if (err && !err.message.includes('duplicate column')) {}
       });
    });

    
    // Seed data if empty (optional, but good for demo)
    db.get("SELECT count(*) as count FROM tasks", [], (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            console.log("Seeding initial data...");
            const stmt = db.prepare("INSERT INTO tasks (id, title, columnId, \"order\", color) VALUES (?, ?, ?, ?, ?)");
            stmt.run("t1", "Research competitors", "todo", 0, "bg-red-500");
            stmt.run("t2", "Design system draft", "todo", 1, "bg-blue-500");
            stmt.run("t3", "Setup project repo", "in-progress", 0, "bg-yellow-500");
            stmt.finalize();
        }
    });
  });
}

module.exports = db;