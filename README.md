# Online Meet

A Google Meet style meeting platform built with Next.js 15, TypeScript, Tailwind CSS, shadcn-style UI components, Zustand, TanStack Query, Socket.IO, WebRTC, mediasoup SFU, PostgreSQL, Redis, Docker, and coturn.

## What Is Included

- Instant meeting creation with secure `abc-defg-hij` meeting ids
- No authentication required for the first version
- Host admission flow with admit/reject controls
- WebRTC media through mediasoup SFU, not peer-to-peer mesh
- Camera, microphone, screen sharing, participant list, pin/fullscreen controls
- Real-time meeting chat with system messages and unread counts
- PostgreSQL persistence through Prisma
- Redis presence and Socket.IO adapter support
- coturn TURN/STUN service for relay fallback
- Docker Compose local stack
- Vitest and Playwright test scaffolding

## Beginner Local Setup

### 1. Install Required Tools

Install these first:

- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Node.js 22 LTS: https://nodejs.org/
- Git, optional but recommended: https://git-scm.com/

After installing Docker Desktop, open it once and wait until it says Docker is running.

### 2. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

For local development you can keep the default values.

Important local values:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- TURN/STUN: `localhost:3478`

### 3. Start Everything With Docker

Run this from the project root:

```bash
docker compose up --build
```

The first run can take several minutes because Docker installs Node dependencies and builds mediasoup native modules.

When the services are ready, open:

```text
http://localhost:3000
```

### 4. Test The Meeting Flow

1. Open `http://localhost:3000`.
2. Enter your display name.
3. Click **Start Instant Meeting**.
4. Copy the meeting link.
5. Open the link in another browser, private window, or another device on your network.
6. Enter a second display name.
7. Click **Ask to Join**.
8. In the host window, open the participants panel and admit the user.
9. Test camera, microphone, chat, and screen sharing.

### 5. Stop The Stack

Press `Ctrl + C`, then run:

```bash
docker compose down
```

To also delete the local database data:

```bash
docker compose down -v
```

## Running Without Docker

Start PostgreSQL and Redis yourself, then:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The app uses npm workspaces:

- `apps/web`: Next.js frontend
- `server`: Express, Socket.IO, Prisma, mediasoup backend

## Database Setup

Local Docker Compose automatically creates:

- Database name: `online_meet`
- User: `meet`
- Password: `meet_password`

Prisma migrations run automatically inside the backend container. If you run locally without Docker:

```bash
npm run prisma:dev -w server
```

To inspect the database:

```bash
npx prisma studio -w server
```

## TURN/STUN Setup

The local stack starts coturn on:

```text
stun:localhost:3478
turn:localhost:3478
```

For production:

1. Deploy coturn on a VM with a public static IP.
2. Open UDP/TCP `3478`.
3. Open the relay UDP range, for example `49160-49200`.
4. Set a strong TURN username and password.
5. Set frontend env vars:
   - `NEXT_PUBLIC_STUN_URL=stun:your-turn-domain:3478`
   - `NEXT_PUBLIC_TURN_URL=turn:your-turn-domain:3478`
   - `NEXT_PUBLIC_TURN_USERNAME=...`
   - `NEXT_PUBLIC_TURN_PASSWORD=...`

## Production Deployment

### Backend on Railway or Render

1. Create managed PostgreSQL.
2. Create managed Redis.
3. Deploy the `server` folder.
4. Set environment variables:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `CLIENT_ORIGIN=https://your-frontend-domain`
   - `SERVER_PORT`
   - `MEDIASOUP_LISTEN_IP=0.0.0.0`
   - `MEDIASOUP_ANNOUNCED_IP=your-public-backend-ip-or-host`
   - `MEDIASOUP_MIN_PORT=40000`
   - `MEDIASOUP_MAX_PORT=40100`
5. Expose UDP ports `40000-40100` for mediasoup RTP traffic.
6. Run Prisma migrations during deploy:

```bash
npx prisma migrate deploy
```

### Frontend on Vercel

1. Import the repository into Vercel.
2. Set root directory to `apps/web`.
3. Set environment variables:
   - `NEXT_PUBLIC_SIGNALING_URL=https://your-backend-domain`
   - `NEXT_PUBLIC_STUN_URL=stun:your-turn-domain:3478`
   - `NEXT_PUBLIC_TURN_URL=turn:your-turn-domain:3478`
   - `NEXT_PUBLIC_TURN_USERNAME`
   - `NEXT_PUBLIC_TURN_PASSWORD`
4. Deploy.

## Testing

```bash
npm test
npm run test:e2e -w apps/web
```

Playwright needs the frontend running or will start it automatically.

## Notes For Real Production Scale

- Put mediasoup workers behind region-aware routing so participants join the closest SFU.
- Use long-term TURN credentials instead of static local credentials.
- Add authentication before exposing persistent meeting history.
- Add observability: structured logs, WebRTC stats ingestion, alerts, and packet-loss dashboards.
- Use TLS everywhere. Browsers require HTTPS for camera/microphone outside localhost.
