# SynapseCode Project Constitution (`gemini.md`)

## 1. Architectural Invariants
1. **Zero Gap Policy**: No placeholders, no TODOs, no empty stubs. Every schema, route, controller, and UI component must be complete and production-grade.
2. **Container Security**: Code execution must always occur inside ephemeral, resource-restricted Docker containers with `NetworkDisabled: true` and 128MB RAM limit.
3. **Monetization & SaaS Tiering**:
   - **Free Tier**: 3s execution timeout limit, Python & JS runtimes, max 2 active room collaborators.
   - **Pro Tier**: 10s execution timeout limit, Python, Node.js & C++ runtimes, unlimited room collaborators. Integrates with Chapa Payment Gateway.

---

## 2. Canonical Data Schemas (Input/Output Shapes)

### User Schema (`models/User.js`)
```json
{
  "_id": "ObjectId",
  "username": "String (required, unique, trimmed)",
  "email": "String (required, unique, lowercase)",
  "password": "String (hashed bcrypt)",
  "isPro": "Boolean (default: false)",
  "subscriptionExpiresAt": "Date (default: null)",
  "chapaCustomerId": "String (default: null)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Room Schema (`models/Room.js`)
```json
{
  "_id": "ObjectId",
  "roomId": "String (required, unique, uppercase)",
  "owner": "ObjectId -> User",
  "language": "Enum ['python', 'javascript', 'cpp']",
  "content": "String",
  "collaborators": ["ObjectId -> User"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Transaction Schema (`models/Transaction.js`)
```json
{
  "_id": "ObjectId",
  "user": "ObjectId -> User",
  "tx_ref": "String (required, unique)",
  "amount": "Number (required)",
  "currency": "String (default: 'ETB')",
  "status": "Enum ['pending', 'success', 'failed']",
  "createdAt": "Date"
}
```

---

## 3. Chapa Payment Handshake Specification
- Endpoint: `POST https://api.chapa.co/v1/transaction/initialize`
- Verification: `GET https://api.chapa.co/v1/transaction/verify/:tx_ref`
- Webhook: `POST /api/payments/webhook` with `x-chapa-signature` verification.
