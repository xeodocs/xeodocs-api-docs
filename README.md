# xeodocs-api-docs

Documentation for XeoDocs, including API specifications and backend architecture guides.

## Services Overview

This project provides multiple services for previewing and documenting the XeoDocs system:

- **Starlight Documentation Site**: Comprehensive guides and documentation about the backend architecture, design principles, workflows, and component details.
- **Spec Server**: Serves raw OpenAPI YAML specifications.
- **Swagger UI**: Interactive API documentation with testing capabilities.
- **Redoc**: Clean, responsive API documentation viewer.

## Preview with Docker

For a containerized preview environment with hot reload:

1. Copy the environment template: `cp .env.example .env`
2. Optionally edit `.env` to select a different OpenAPI file.
    - Set `OPENAPI_FILE` to the desired YAML file name (e.g., `OPENAPI_FILE=microservice-1.yml`).

To start the containers:

```bash
docker compose up --build -d
```

Available URLs:
- **Starlight Docs (explained docs)**: `http://localhost:12000`
- **Swagger UI (interactive)**: `http://localhost:12002`
- **Redoc (clean, responsive)**: `http://localhost:12003`
- **Raw YAML file**: `http://localhost:12001/openapi/${OPENAPI_FILE}`

To stop the containers:

```bash
docker compose down --volumes --rmi local
```

## Contributing

### Explained Docs

Customize the Explained Docs files in `docs/` and update the documentation accordingly and refresh the browser to see changes. These are Astro Starlight docs.

Configure the Starlight docs in `starlight.config.ts`.

### OpenAPI Design

Edit the OpenAPI design file in `openapi/api-design/openapi-design.yaml` and refresh the browser to see changes.

