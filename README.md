# Running the Project with Docker

This project can be efficiently run using Docker and Docker Compose. Below are the steps and configurations specific to this project:

## Prerequisites

- Ensure Docker and Docker Compose are installed on your system.
- Docker version: `22.13.1-slim` (as specified in the Dockerfile).

## Environment Variables

- `NODE_ENV`: Set to `production` for optimized performance.
- `NODE_OPTIONS`: Configure memory usage, default is `--max-old-space-size=4096`.
- `POSTGRES_USER`: Database username (default: `user`).
- `POSTGRES_PASSWORD`: Database password (default: `password`).
- `POSTGRES_DB`: Database name (default: `appdb`).

## Build and Run Instructions

1. Clone the repository and navigate to the project directory.
2. Build and start the services using Docker Compose:

   ```bash
   docker-compose up --build
   ```

3. Access the application at `http://localhost:3000`.

## Exposed Ports

- Application: `3000` (mapped to host `3000`).
- Database: Not exposed to the host.

## Notes

- The application requires a PostgreSQL database; ensure the `database` service is running.
- For advanced configurations, refer to the `docker-compose.yml` file.

By following these instructions, you can set up and run the project seamlessly using Docker.