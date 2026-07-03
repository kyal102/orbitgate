# Local Quick Start

OrbitGate Lite runs locally with Bun, Next.js, Prisma, SQLite, and Python.

## Requirements

- Bun 1.1 or newer
- Python 3.9 or newer
- Git

## Setup

```bash
git clone https://github.com/kyal102/orbitgate.git
cd orbitgate
cp .env.example .env
bun install --frozen-lockfile
bun run db:generate
bun run db:push
bun run dev
```

Open `http://localhost:3000`.

## Windows PowerShell

```powershell
git clone https://github.com/kyal102/orbitgate.git
cd orbitgate
Copy-Item .env.example .env
bun install --frozen-lockfile
bun run db:generate
bun run db:push
bun run dev
```

## Useful Commands

```bash
bun run dev          # local development server
bun run build        # production build check
bun run start        # serve a production build
bun run db:generate  # generate Prisma client
bun run db:push      # create/update local SQLite database
python -m orbitgate.orbit_cli --demo
python -m pytest tests -q
```
