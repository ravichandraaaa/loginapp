<<<<<<< HEAD
# loginapp
login three tier applicatiom
=======
# LoginApp — Microservices Architecture

A production-grade login application built with **Three-Tier Architecture** and **Microservices** pattern.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  PRESENTATION TIER                       │
│         React + Vite (port 3000)                        │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│                  APPLICATION TIER                        │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ API Gateway │───▶│Auth Service │───▶│Notify Svc   │ │
│  │  port 4000  │    │  port 4001  │    │  port 4003  │ │
│  └──────┬──────┘    └─────────────┘    └─────────────┘ │
│         │                                               │
│         │           ┌─────────────┐                    │
│         └──────────▶│User Service │                    │
│                     │  port 4002  │                    │
│                     └─────────────┘                    │
└──────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    DATA TIER                             │
│                                                         │
│     PostgreSQL (port 5432)    Redis (port 6379)         │
└─────────────────────────────────────────────────────────┘
```

---

## Services

| Service              | Port | Responsibility                              |
|---------------------|------|---------------------------------------------|
| **Frontend**        | 3000 | React UI — login, register, dashboard       |
| **API Gateway**     | 4000 | Single entry point, proxy routing, rate-limit|
| **Auth Service**    | 4001 | JWT issue/verify, login, logout, refresh    |
| **User Service**    | 4002 | User CRUD, PostgreSQL persistence           |
| **Notification Svc**| 4003 | Email on register & login                  |

---

## Quick Start (Local)

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (optional — auth works without it)

### 1. Clone & setup

```bash
cd login-app
chmod +x setup.sh start-all.sh
./setup.sh
```

### 2. Create PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE loginapp;"
```

### 3. Configure environment

Each service has a `.env` file. Defaults work out of the box.
Edit `user-service/.env` if your Postgres credentials differ:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loginapp
DB_USER=postgres
DB_PASSWORD=postgres
```

### 4. Start all services

**Option A — One command:**
```bash
./start-all.sh
```

**Option B — Separate terminals:**
```bash
# Terminal 1
cd api-gateway && npm run dev

# Terminal 2
cd auth-service && npm run dev

# Terminal 3
cd user-service && npm run dev

# Terminal 4
cd notification-service && npm run dev

# Terminal 5
cd frontend && npm run dev
```

Open **http://localhost:3000** 🎉

---

## Docker Deployment (Phase 2)

```bash
# Build and start everything
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and remove volumes (wipe DB)
docker compose down -v
```

App will be at **http://localhost:3000**

---

## API Reference

All requests go through the API Gateway at `http://localhost:4000`.

### Auth Endpoints

| Method | Path                   | Body                              | Description          |
|--------|------------------------|-----------------------------------|----------------------|
| POST   | `/api/auth/register`   | `{ name, email, password }`       | Register new user    |
| POST   | `/api/auth/login`      | `{ email, password }`             | Login, get tokens    |
| POST   | `/api/auth/logout`     | —  (Bearer token in header)       | Invalidate token     |
| POST   | `/api/auth/refresh`    | `{ refreshToken }`                | Get new access token |
| GET    | `/api/auth/verify`     | — (Bearer token in header)        | Verify token         |

### User Endpoints

| Method | Path                   | Description                      |
|--------|------------------------|----------------------------------|
| GET    | `/api/users/:id`       | Get user profile                 |
| PATCH  | `/api/users/:id`       | Update name / avatar             |
| GET    | `/api/users`           | List all users (admin)           |

### Health Checks

| Service       | URL                              |
|---------------|----------------------------------|
| Gateway       | `GET /health`                   |
| Auth          | `GET /api/auth/health`          |
| Users         | `GET /api/users/health`         |
| Notifications | `GET /api/notifications/health` |

---

## Token Flow

```
1. User logs in → Auth Service validates → issues accessToken (15m) + refreshToken (7d)
2. Frontend sends accessToken in Authorization: Bearer <token> header
3. When accessToken expires → frontend auto-calls /api/auth/refresh
4. On logout → accessToken blacklisted in Redis, refreshToken deleted
```

---

## Project Structure

```
login-app/
├── api-gateway/
│   ├── index.js          # Express proxy router
│   ├── .env
│   ├── Dockerfile
│   └── package.json
├── auth-service/
│   ├── index.js          # JWT + bcrypt + Redis
│   ├── .env
│   ├── Dockerfile
│   └── package.json
├── user-service/
│   ├── index.js          # PostgreSQL CRUD
│   ├── .env
│   ├── Dockerfile
│   └── package.json
├── notification-service/
│   ├── index.js          # Nodemailer (Ethereal for dev)
│   ├── .env
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js
│   │   ├── components/ProtectedRoute.jsx
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       └── DashboardPage.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── setup.sh
├── start-all.sh
└── README.md
```

---

## Environment Variables

### auth-service
| Variable            | Default                      | Description              |
|--------------------|------------------------------|--------------------------|
| PORT               | 4001                         | Service port             |
| JWT_SECRET         | (change in prod!)            | Access token secret      |
| JWT_REFRESH_SECRET | (change in prod!)            | Refresh token secret     |
| REDIS_URL          | redis://localhost:6379       | Redis connection URL     |
| USER_SERVICE_URL   | http://localhost:4002        | User service base URL    |

### user-service
| Variable    | Default   | Description         |
|------------|-----------|---------------------|
| PORT       | 4002      | Service port        |
| DB_HOST    | localhost | PostgreSQL host     |
| DB_PORT    | 5432      | PostgreSQL port     |
| DB_NAME    | loginapp  | Database name       |
| DB_USER    | postgres  | DB username         |
| DB_PASSWORD| postgres  | DB password         |

---

## Tech Stack

- **Frontend:** React 18, Vite, React Router, Axios
- **API Gateway:** Express.js, http-proxy-middleware, express-rate-limit
- **Auth Service:** Express.js, jsonwebtoken, bcryptjs, redis (ioredis)
- **User Service:** Express.js, pg (node-postgres), bcryptjs, Joi
- **Notification:** Express.js, Nodemailer
- **Database:** PostgreSQL 16
- **Cache/Sessions:** Redis 7
- **Containers:** Docker, Docker Compose, Nginx

---

## Next Steps

- [ ] Add password reset flow
- [ ] Add Google OAuth
- [ ] Add admin panel
- [ ] Add Swagger/OpenAPI docs
- [ ] Add unit tests (Jest)
- [ ] Add CI/CD pipeline
- [ ] Deploy to Kubernetes
>>>>>>> e7cc438 (initial commit: login microservice)
