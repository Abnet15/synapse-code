# SynapseCode

A real-time collaborative code editor with CRDT-based multi-user editing (Yjs + Monaco), live chat, and sandboxed code execution (Python, JavaScript, C++) via ephemeral Docker containers.

## Architecture

- **Frontend**: React + Vite + Tailwind, Monaco Editor, Yjs (`y-websocket`, `y-monaco`) for CRDT sync, Socket.io client for chat/execution.
- **Backend**: Node.js + Express + Socket.io for chat/room/execution events, plus a raw `ws` server running the `y-websocket` protocol (mounted at `/yjs`) for document sync.
- **Sandbox**: `dockerode` spins up a fresh, network-isolated, memory-capped container per execution, then force-removes it.

## Prerequisites

- Node.js 18+
- Docker Engine running locally (the server needs access to `/var/run/docker.sock` to spawn sandboxes)

## Running the backend

```bash
cd server
npm install
node index.js
```

The server listens on `http://localhost:4000`, exposes Socket.io on the same port, and serves Yjs sync at `ws://localhost:4000/yjs`.

**Note:** because the execution engine talks to the Docker daemon directly, run it either:
- directly on a host with Docker installed (simplest for local dev), or
- via `docker-compose up --build` from the project root, which mounts the host's Docker socket into the server container.

The first run of each language will pull its base image (`python:3.9-slim`, `node:18-alpine`, `gcc:latest`) if not already present locally — this may take a minute.

## Running the frontend

```bash
cd client
npm install
cp .env.example .env   # adjust URLs if your server isn't on localhost:4000
npm run dev
```

Open the printed local URL (default `http://localhost:5173`), enter a name, and either create a new room or join an existing one by its code. Share the room code with collaborators to edit together in real time.

## Security notes on the sandbox

Every execution runs in a brand-new container with:
- `NetworkDisabled: true` / `NetworkMode: none` — no network access
- 128MB memory cap, capped PIDs, no elevated privileges
- A hard 5-second wall-clock timeout that kills and force-removes the container
- Guaranteed cleanup (`container.remove({ force: true })`) on success, error, and timeout paths

This bounds resource usage per run but is not a substitute for full-system isolation (e.g., gVisor/Firecracker) in a multi-tenant production deployment — treat it as a solid baseline, and harden further (seccomp profiles, read-only root filesystem, non-root exec user) before exposing this to untrusted public users at scale.
