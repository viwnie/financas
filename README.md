# Financial Management App

A modern, scalable, and secure personal and shared financial management application.

## Quick Start

### Prerequisites
- Node.js (v18+)
- Docker Desktop

### Run the App

1.  **Start Infrastructure:**
    ```bash
    docker-compose up -d
    ```

2.  **Start Backend:**
    ```bash
    cd backend
    cd backend
    bun install
    bunx prisma generate
    bunx prisma db push
    bun run start:dev
    ```

3.  **Start Frontend:**
    ```bash
    cd frontend
    cd frontend
    bun install
    bun run dev
    ```

## Documentation

- [Walkthrough](file:///c:/Users/vinicio.barbosa/.gemini/antigravity/brain/6016a493-d1b5-42f1-85cf-d4acbc227062/walkthrough.md): Detailed guide on features and testing.
- [Task List](file:///c:/Users/vinicio.barbosa/.gemini/antigravity/brain/6016a493-d1b5-42f1-85cf-d4acbc227062/task.md): Development progress tracking.
