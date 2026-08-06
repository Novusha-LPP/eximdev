# AIVision Market Intelligence Module - Runbook

## Overview
This is the runbook for the **AIVision Market Intelligence Module**, which follows a micromonolithic architecture.

## System Architecture
The application consists of the following core services and infrastructure:
- **Gateway**: Node.js Main Backend (`services/gateway`) running on port `3001`.
- **Mystique**: Python AI Service (`services/mystique`) running on port `8100` with NVIDIA GPU support.
- **Web**: Next.js Frontend (`web`) running on port `3000`.
- **MongoDB**: Primary database running on port `27017`.
- **Ollama**: Local LLM Server running on port `11434` with NVIDIA GPU support.

## Prerequisites
- Node.js (`>=22.0.0`)
- Docker & Docker Compose
- NVIDIA Drivers and Container Toolkit (for GPU support in Mystique & Ollama)

## Initial Setup
1. **Environment Variables**: 
   Copy the example environment file and configure any necessary variables.
   ```bash
   cp .env.example .env
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Database Seeding**:
   If you need to seed the database initially:
   ```bash
   npm run seed
   ```

## Running the Application

### 1. Docker (Recommended for production/full stack)
You can run the entire stack using Docker Compose:
```bash
# Start all services
npm run docker:up
# Or alternatively: docker compose up -d

# Stop all services
npm run docker:down
```

### 2. Local Development
To run the services locally concurrently:
```bash
# Start gateway, mystique, and web concurrently
npm run dev
```

**Individual Services:**
- Gateway: `npm run dev:gateway`
- Mystique: `npm run dev:mystique`
- Web: `npm run dev:web`

## Build & Test
- **Build all (Gateway & Web)**: `npm run build`
- **Test all**: `npm run test`
  - Gateway Tests: `npm run test:gateway`
  - Mystique Tests: `npm run test:mystique` (requires `pytest`)
  - Web Tests: `npm run test:web`
- **Linting**: `npm run lint`

## Service Endpoints
When running locally or via Docker, the services are exposed as follows:
- **Web UI**: http://localhost:3000
- **Gateway API**: http://localhost:3001
- **Mystique API**: http://localhost:8100
- **Ollama**: http://localhost:11434
- **MongoDB**: mongodb://localhost:27017
