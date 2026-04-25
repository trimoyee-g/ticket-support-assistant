# Ticket Support Assistant

A full-stack AI-powered ticketing system that analyzes incoming support tickets, classifies priority, and suggests relevant skills. Built with a Node.js/Express backend, Inngest event workflows, Socket.IO real-time chat, and a Vite + React frontend.

---

## 🚀 Features

- 🤖 **AI-Powered Ticket Intelligence** — Integrated Gemini LLM with AI agents to automatically analyze support tickets, generate concise summaries, determine priority levels, and enable intelligent skill-based routing for efficient resolution.

- ⚡ **Event-Driven Backend Architecture** — Built a scalable backend using Inngest to orchestrate asynchronous workflows for AI processing, email notifications, and dynamic moderator assignment, improving system responsiveness and scalability.

- 💬 **Real-Time Ticket Collaboration** — Implemented WebSocket (Socket.IO) powered chat threads within tickets, enabling seamless bidirectional communication between users and support agents with persistent message storage.

- 🔐 **Secure Authentication & Access Control** — Designed JWT-based authentication with role-based access control (RBAC) to secure APIs and manage user and admin-level permissions effectively.

---

## 🏗️ Architecture

- **Backend**: Express.js + MongoDB + Socket.IO + Inngest — Entry: [backend/index.js](backend/index.js#L1)
- **Frontend**: Vite + React SPA — Entry: [frontend/src/main.jsx](frontend/src/main.jsx#L1)
- **AI Layer**: Gemini via Inngest Agent Kit — Utility: [backend/utils/ai.js](backend/utils/ai.js#L1)
- **Inngest Functions**: Event-driven workflows — Location: `backend/inngest/functions`

---

## 📁 Project Structure (high level)

```
backend/
├── index.js
├── utils/
│   └── ai.js
├── inngest/
│   └── functions/
├── models/
├── routes/
└── controllers/

frontend/
├── src/
│   ├── main.jsx
   ├── pages/
   └── components/
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB (Atlas or local)
- Gemini API Key (Google AI)
- SMTP service (Mailtrap or similar)

---

## 📦 Installation

### 1. Clone repository

```bash
git clone https://github.com/your-org/ai-ticket-analyzer.git
cd ai-ticket-analyzer
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file (example below).

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs via Vite (usually at http://localhost:5173).

### .env.example

```env
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:5173
MAILTRAP_SMTP_HOST=your_smtp_host
MAILTRAP_SMTP_PORT=your_smtp_port
MAILTRAP_SMTP_USER=your_smtp_user
MAILTRAP_SMTP_PASS=your_smtp_pass
PORT=3000
```

### Run backend (development)

```bash
cd backend
npm run dev
```

---

## 🔄 System Workflow

- User signs up → Inngest triggers signup workflow
- User creates ticket → AI agent analyzes ticket and returns structured JSON (summary, priority, suggested skills)
- Ticket stored in database with AI metadata
- Real-time chat enabled via Socket.IO
- Notifications and async tasks managed by Inngest workflows

---

## 🧠 AI Processing Flow

- Ticket is sent to the AI agent in `backend/utils/ai.js`
- Gemini model returns raw JSON (the code parses and validates this)
- Parsed data is attached to the ticket and used for routing/triage

---

## 📡 Key Modules

- Ticket creation & management
- AI-based ticket analysis
- Priority classification
- Skill-based routing
- Real-time chat (Socket.IO)
- Authentication & RBAC
- Event-driven workflows (Inngest)

---

## 🧪 Development Notes

- Run Inngest locally: `npm run inngest-dev` (from `backend`)
- Backend default port: `3000`
- Frontend default port: `5173`
- AI responses should return valid JSON; `backend/utils/ai.js` includes a parsing fallback.

---

## 🚀 Future Improvements

- AI sentiment analysis for tickets
- Analytics dashboard and reporting
- Agent performance scoring
- Multi-language support
- Auto-scaling AI workflows

---

## 🤝 Contributing

- Fork the repo, create a feature branch, commit, and open a Pull Request.
