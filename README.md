# FlatBill API: Building Bill & Service Charge Management Backend

REST API for FlatBill. It handles buildings, flats, monthly bill generation, payments, expenses, notices and complaints. Requests are secured with JWT, and custom Express middlewares (verifyToken, verifyAdmin, verifyOwner, verifyTenant) make sure each role can only access its own routes and its own building's data.

> This repository contains the **Express backend** of FlatBill.

## Live Links

| Resource | Link |
|---|---|
| Live Website | https://flatbill-bd.vercel.app/ |
| API Base URL | https://flatbill-server.vercel.app/ |
| Frontend Repository | https://github.com/rezasdsju/flatbill-client |

---

### Features
- JWT authentication using `verifyToken` middleware.
- Role-based access control using `verifyFlatOwner` middleware.
- Add new flats under existing buildings or automatically create a building if it doesn't exist.

## Technologies

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API framework |
| MongoDB | Database |
| jsonwebtoken | JWT creation and verification |
| dotenv | Environment variable management |
| CORS | Allows requests from the frontend |

---

## Roles

| Role | Description |
|---|---|
| `admin` | Building manager or committee. Manages buildings, flats, bills, expenses, notices and complaints |
| `owner` | Flat owner. Views and pays bills, reads notices, raises complaints |
| `tenant` | Tenant. Views and pays bills, reads notices, raises complaints |

---

## API Endpoints

**Base URL:** `https://flatbill-server.vercel.app`

**Access levels**

- **Public:** no token needed
- **Internal:** needs the `x-internal-key` header (used only by the Next.js server)
- **Any user:** valid JWT (`verifyToken`)
- **Admin / Owner / Tenant:** valid JWT and the matching role

Protected routes need this header:

```
Authorization: Bearer <token>
```

### General and Auth

| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| GET | `/` | Public | Checks that the API is running | Done |
| POST | `/jwt` | Internal | Issues a JWT for a registered user | Planned |
| GET | `/me` | Any user | Returns the logged-in user's profile | Planned |

### Buildings and Flats

| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| POST | `/buildings` | Admin | Creates a building | Planned |
| GET | `/buildings/my` | Any user | Returns the user's own building | Planned |
| PATCH | `/buildings/:id` | Admin | Updates building details | Planned |
| POST | `/flat-owner/flats` | Flat Owner | Adds a flat | Done |
| GET | `/flats` | Admin | Lists all flats in the building | Planned |
| PATCH | `/flats/:id` | Admin | Updates a flat, owner or tenant | Planned |
| DELETE | `/flats/:id` | Admin | Removes a flat | Planned |

### Bills

| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| POST | `/bills/generate` | Admin | Generates the monthly bill for all flats | Planned |
| GET | `/bills` | Admin | Lists all bills, filterable by month and status | Planned |
| GET | `/bills/defaulters` | Admin | Lists flats with unpaid bills | Planned |
| GET | `/my-bills` | Owner, Tenant | Returns the logged-in user's own bills | Planned |

### Payments

| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| POST | `/payments/checkout` | Owner, Tenant | Starts an online payment for a bill | Planned |
| POST | `/payments/manual` | Admin | Records a cash or manual payment | Planned |
| GET | `/payments` | Admin | Lists all payments | Planned |
| GET | `/my-payments` | Owner, Tenant | Returns the user's own payment history | Planned |

### Expenses

| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| POST | `/expenses` | Admin | Adds an expense | Planned |
| GET | `/expenses` | Any user | Lists the building's expenses (read-only for residents) | Planned |
| PATCH | `/expenses/:id` | Admin | Updates an expense | Planned |
| DELETE | `/expenses/:id` | Admin | Deletes an expense | Planned |
| GET | `/summary` | Any user | Monthly income, expense and balance summary | Planned |

### Notices

| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| POST | `/notices` | Admin | Posts a notice | Planned |
| GET | `/notices` | Any user | Lists notices | Planned |
| DELETE | `/notices/:id` | Admin | Deletes a notice | Planned |

### Complaints

| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| POST | `/complaints` | Owner, Tenant | Submits a complaint | Planned |
| GET | `/my-complaints` | Owner, Tenant | Returns the user's own complaints | Planned |
| GET | `/complaints` | Admin | Lists all complaints | Planned |
| PATCH | `/complaints/:id` | Admin | Updates status and adds a note | Planned |

### Users

| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| GET | `/admin/users` | Admin | Lists users in the building | Planned |
| PATCH | `/admin/users/:id/role` | Admin | Changes a user's role | Planned |

---

## Response Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request, missing or invalid data |
| 401 | Missing, invalid or expired token |
| 403 | Logged in, but the role is not allowed |
| 404 | Resource not found |
| 500 | Server error |

---

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_URI=
JWT_SECRET=
INTERNAL_API_KEY=
STRIPE_SECRET_KEY=
```

`INTERNAL_API_KEY` must be the same value as in the frontend.

---

## Local Development

```bash
git clone https://github.com/rezasdsju/flatbill-server.git
cd flatbill-server
npm install
npm run dev
```

The server runs at `http://localhost:5000`.

---

## Related Repository

- [FlatBill Frontend](https://github.com/rezasdsju/flatbill-client)