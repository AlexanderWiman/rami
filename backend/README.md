# Rami Forum Backend

Backend API for the Rami app forum feature. Built with Express, PostgreSQL, and Cloudinary.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Image Storage**: Cloudinary
- **Authentication**: JWT

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Cloudinary account (free tier works)

### Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3000`.

## Railway Deployment

### 1. Create Railway Project

1. Go to [Railway](https://railway.app) and create a new project
2. Add a **PostgreSQL** database service
3. Add a new service from your GitHub repo (select the `backend` folder)

### 2. Configure Environment Variables

In your Railway service settings, add these environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL addon |
| `JWT_SECRET` | Random 32+ character string for JWT signing |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |
| `INITIAL_SUPERADMIN_USERNAME` | Username for first admin (e.g., `admin`) |
| `INITIAL_SUPERADMIN_PASSWORD` | Password for first admin (min 8 chars) |
| `NODE_ENV` | `production` |
| `PORT` | Railway sets this automatically |

### 3. Deploy

Railway will automatically detect the `railway.json` config and deploy.

The build command runs `npm run build && npm start`.

### 4. Update App API URL

After deployment, update the API URL in `Rami/src/features/forum/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://YOUR-APP.railway.app/api';  // <-- Replace with your Railway URL
```

## API Endpoints

### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/threads` | List all threads |
| GET | `/api/threads/:id` | Get thread with content |

### Admin (Requires JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, get JWT token |
| GET | `/api/auth/me` | Get current admin info |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/threads` | Create thread |
| PUT | `/api/threads/:id` | Update thread |
| DELETE | `/api/threads/:id` | Delete thread |
| POST | `/api/upload` | Upload image to Cloudinary |

### Superadmin Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admins` | List all admins |
| POST | `/api/admins` | Create new admin |
| PUT | `/api/admins/:id` | Update admin |
| DELETE | `/api/admins/:id` | Delete admin |

## Database Schema

```sql
-- Admins with roles
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin', -- 'superadmin' | 'admin'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Forum threads
CREATE TABLE threads (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  created_by INTEGER REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  pinned BOOLEAN DEFAULT FALSE
);

-- Thread content blocks (supports text, images, videos)
CREATE TABLE thread_content (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL, -- 'text' | 'image' | 'video'
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
```

## Cloudinary Setup

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard and copy:
   - Cloud Name
   - API Key
   - API Secret
3. Add these as environment variables

Images are uploaded to a `rami-forum` folder with automatic optimization (max 1200px width, auto quality/format).

## Security Features

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens expire after 7 days
- Rate limiting on login endpoint (10 requests per 15 minutes)
- SQL injection protection via parameterized queries
- CORS enabled for cross-origin requests
