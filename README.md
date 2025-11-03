# Todo Full-Stack Application

A modern todo application with a Node.js TypeScript backend and React TypeScript frontend.

## Project Structure

This project is organized as a monorepo with separate frontend and backend applications:

```
server/                 # Backend application
├── src/               # Source code
├── tests/             # Integration tests
├── package.json       # Backend dependencies
├── Dockerfile         # Backend container
└── ...               # Other backend files
client/                # Frontend application
├── src/               # React TypeScript source code
├── package.json       # Frontend dependencies
└── ...               # Other frontend files
README.md              # This file
docker-compose.yml     # Container orchestration
.env.example          # Environment variables template
```

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- MongoDB (for local development) or Docker

## Installation

1. Clone the repository
2. Install dependencies for both server and client:
   ```bash
   npm run install:all
   ```
   
   Or manually:
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```


## Build

Build both frontend and backend:

```bash
npm run build:all
```

Or build individually:

```bash
npm run build:server  # Build backend
npm run build:client  # Build frontend
```

## Development

### Full Stack Development

Start both the backend API and frontend development server:

```bash
# Terminal 1: Start backend with MongoDB and frontend
npm run dev:all
```

Or  start individually:

```bash
# Terminal 1: Start backend with MongoDB
npm run dev:backend

# Terminal 2: Start frontend development server
npm run dev:client
```

This will:
1. Start MongoDB container
2. Run the backend API on `http://localhost:8080`
3. Run the frontend dev server on `http://localhost:3000` with hot reloading