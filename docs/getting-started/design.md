---
title: General Design
description: Overview of the XeoDocs backend architecture.
template: doc
---

This document provides an informative overview of the XeoDocs backend architecture. The backend is structured as a Golang-based monorepo with microservices, emphasizing modularity, scalability, and integration with tools like Docker, PostgreSQL, and MinIO. This list breaks down key aspects to help Windsurf parse and comprehend the system's structure, components, and workflows.

## 1. Overall Architecture
- **Monorepo Structure**: The backend is organized in a single repository (`xeodocs-backend/`) for ease of management, with shared modules and service-specific code.
- **Microservices Design**: Decomposed into independent services (Auth, Project, Repository, Translation, Build, Logging, Scheduler) plus a custom API Gateway in Go.
- **Technology Stack**:
  - Language: Golang (Go 1.21+).
  - Database: PostgreSQL.
  - Storage: MinIO (S3-compatible) for repositories and static files.
  - Scheduling: gocron for periodic tasks.
  - Git Operations: go-git for cloning, pulling, and managing repos.
  - AI Integration: xAI/OpenAI/Gemini APIs for translations.
  - Web Scraping: gocolly/colly (fallback for static generation).
  - Authentication: JWT with RBAC using golang-jwt.
  - Routing: native Go HTTP package.
  - Logging: Zerolog or Logrus, centralized in Logging Service.
- **Deployment**: Docker containers; docker-compose for dev/prod; Kubernetes-ready for scaling.

## 2. Directory Structure
- **Root Files**:
  - `README.md`: Project overview, setup for XeoDocs.
  - `go.mod` / `go.sum`: Shared dependencies.
  - `Dockerfile.*`: Service-specific Dockerfiles (e.g., `Dockerfile.gateway`).
  - `docker-compose.dev.yml` / `docker-compose.prod.yml`: Orchestration configs.
- **cmd/**: Entry points for services.
  - `gateway/main.go`: Starts API Gateway.
  - `auth/main.go`: Auth Service server.
  - `project/main.go`: Project Service.
  - `repository/main.go`: Repository Service.
  - `translation/main.go`: Translation Service.
  - `build/main.go`: Build Service.
  - `logging/main.go`: Logging Service.
  - `scheduler/main.go`: Scheduler with gocron jobs.
- **internal/**: Core logic packages.
  - `shared/`: Common utils (config, db, logging, auth, storage).
  - `gateway/`: Proxy handlers, routes, middleware.
  - `auth/`: Handlers for register/login, user models.
  - `project/`: CRUD handlers, project models.
  - `repository/`: Repository handlers, gitops (cloning/pulling), copy to language-specific directories, repository models.
  - `translation/`: Translate handlers, AI integration.
  - `build/`: Build handlers, executor (npm), scraper.
  - `logging/`: Log query handlers, models.
  - `scheduler/`: Job definitions for periodic updates.
- **tests/**: Integration/E2E tests.

## 3. Key Microservices and Responsibilities
- **API Gateway**:
  - Single entry point; routes to services (e.g., /v1/auth → Auth Service).
  - Handles JWT validation, rate limiting, CORS.
  - Proxies requests using httputil.ReverseProxy.
- **Auth Service**:
  - Manages users, roles, sessions via JWT.
- **Project Service**:
  - CRUD for projects (add repo URL, languages, build commands).
- **Repository Service**:
  - Clones/forks repos, detects translatable files (.md, .html), creates language copies.
- **Translation Service**:
  - Triggers AI translations for tracked files.
  - Parallel processing with goroutines; updates file hashes.
- **Build Service**:
  - Executes build/export commands (npm via os/exec).
  - Fallback scraping; injects non-intrusive banners.
  - Stores static content in MinIO.
- **Logging Service**:
  - Stores/queries logs (event, user, system, cron).
- **Scheduler Service**:
  - Periodic git pulls, change detection, auto-translations/builds.
  - Logs to Logging Service; no public endpoints.

## 4. Workflows and Integration
- **Adding a Project**:
  - Clone original repo to /repos/{id}/original.
  - Detect files, log to DB.
  - Copy to language dirs (e.g., /repos/{id}/es).
- **Translation Workflow**:
  - Read file, chunk content, prompt AI (e.g., "Translate to {lang}, preserve markdown").
  - Write back, update metadata.
- **Update Workflow**:
  - Scheduler pulls changes hourly.
  - Propagate to copies; re-translate if changed.
  - Trigger build if needed.
- **Build Workflow**:
  - Run commands in language dir.
  - Export or scrape preview server.
  - Inject banners (e.g., HTML footer).
  - Upload to MinIO bucket.
- **Communication**:
  - HTTP/GRPC between services; service discovery via env vars.
  - Async via queues (optional, e.g., RabbitMQ).
- **Security**:
  - JWT for auth; RBAC (admin/editor/viewer).
  - Error handling with retries, timeouts.

## 5. Development and Operations
- **Setup**: `docker compose up` for local (mounts volumes for hot-reload).
- **CI/CD**: GitHub Actions build/push images, deploy.
- **Scalability**: Horizontal scaling for Translation/Build; Kubernetes pods.
- **Monitoring**: Prometheus metrics; centralized logs.
- **Testing**: Unit per package; integration via gateway.

This structure ensures XeoDocs delivers up-to-date, translated static content efficiently while generating traffic via banners.