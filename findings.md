# SynapseCode Findings & Technical Constraints Log

## System Constraints & Discoveries

1. **Chapa Payment Gateway API**:
   - Initialization Endpoint: `POST https://api.chapa.co/v1/transaction/initialize`
   - Verification Endpoint: `GET https://api.chapa.co/v1/transaction/verify/:tx_ref`
   - Secret Key Header: `Authorization: Bearer CHASECK_TEST-X6l0MSnRJYPnDRqjXrfmfuoGDPJFBi9t`
   - Requirement: Unique `tx_ref` prefix per transaction, return URL parameter `?payment=success&tx_ref=...` handling.

2. **Docker Ephemeral Sandboxing**:
   - Container Client: `dockerode` over local socket (`/var/run/docker.sock` or `\\.\pipe\docker_engine`).
   - Free Tier Limits: 3,000ms execution timeout cap, Python (`python:3.9-slim`) & Node.js (`node:18-alpine`) runtimes. C++ runtime restricted.
   - Pro Tier Limits: 10,000ms execution timeout cap, Python, Node.js, and C++ (`gcc:latest`).
   - Security: `NetworkDisabled: true`, 128MB RAM limit, `SecurityOpt: ['no-new-privileges']`.

3. **Real-time Collaboration & Synchronization**:
   - Yjs CRDT document model using `y-websocket` binary server mounted at `/yjs` on port `5000`.
   - Socket.io engine handling room presence (`join-room`), team chat (`send-message`), cursor updates (`cursor-update`), and execution requests (`run-code`).

4. **Database & Authentication**:
   - MongoDB Atlas connection URI set in `server/.env`.
   - Password hashing: `bcryptjs` (salt round 10).
   - Session authentication: JSON Web Token (`jsonwebtoken`) with `7d` expiration.
