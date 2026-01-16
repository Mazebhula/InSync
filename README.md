# SyncTeam - Real-Time Collaborative Kanban Board

SyncTeam is a full-stack, real-time Kanban board designed for teams that need seamless collaboration. Built with **Node.js**, **Express**, **Socket.io**, and **React**, it combines drag-and-drop task management with instant updates and an integrated team chat.

## Key Features

- **Real-time synchronization** — Every task movement, edit, or deletion is instantly reflected for all connected users via WebSockets.
- **Drag-and-drop interface** — Move tasks between columns smoothly using `@dnd-kit`.
- **Built-in team chat** — A dedicated sidebar for real-time team communication.
- **WhatsApp task creation** — Send messages starting with "Task:" or "Todo:" to your linked WhatsApp number to automatically create tasks on the board.
- **Task management commands** — Use simple WhatsApp commands like "Move:", "Delete:", or "Remove:" to update tasks.
- **Persistent storage** — All data is saved in a local **SQLite** database.
- **Clean, modern UI** — Styled with **Tailwind CSS v4** and **Lucide** icons.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS v4, Socket.io-client, @dnd-kit
- **Backend**: Node.js, Express, Socket.io, SQLite3, WhatsApp-Web.js
- **Development tools**: Concurrently (parallel client/server runs), Nodemon

## Getting Started

### Prerequisites

- Node.js ≥ v18
- npm
- A WhatsApp account (on your phone for QR code scanning)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/syncteam.git
   cd syncteam

Install dependencies for both client and server:Bashnpm run install-all

Running the Application
Start both the backend and frontend with a single command:
Bashnpm run dev

First-time setup: A QR code will appear in your terminal.
Open WhatsApp on your phone → Settings → Linked Devices → Link a Device.
Scan the QR code to connect.
Once connected, you'll see "WhatsApp Client is ready!" in the terminal.

Frontend: http://localhost:5173
Backend: http://localhost:3001

Using the WhatsApp Integration
Send messages to your linked WhatsApp number (or to yourself) to manage tasks directly from your phone:

Create tasks
Task: Buy coffee
Todo: Fix login bug

Move tasks
Move: coffee to done
Move: login to progress

Delete tasks
Delete: coffee
Remove: documentation


Note: You only need to type a partial task title — the system will match the closest one.
Changes appear instantly on everyone's board.
Project Structure
text.
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Board, Column, TaskCard, Chat, etc.
│   │   └── ...
├── server/               # Node.js + Express + Socket.io backend
│   ├── database.js       # SQLite setup and schema
│   └── ...
├── package.json          # Root scripts (install-all, dev, etc.)
└── README.md
Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.

Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

License
This project is licensed under the ISC License — see the LICENSE file for details.
textThis version:
- Removes all emojis
- Sounds more natural and human-written (varied sentence structure, conversational tone where appropriate)
- Keeps it professional and concise
- Follows common best practices for portfolio/open-source READMEs
- Highlights technical decisions and unique features (WhatsApp integration) without hype

You can copy-paste this directly into your `README.md`.