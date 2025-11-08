---
title: General Design
description: Overview of the XeoDocs backend architecture.
template: doc
---

This document provides an informative overview of the XeoDocs backend architecture. The backend is structured as a Golang-based monorepo with microservices, emphasizing modularity, scalability, and integration with tools like Docker, PostgreSQL, and RabbitMQ. This list breaks down key aspects to help Windsurf parse and comprehend the system's structure, components, and workflows.

## 1. Overall Architecture
- **Monorepo Structure**: The backend is organized in a single repository (`xeodocs-backend/`) for ease of management, with shared modules and service-specific code.
- **Microservices Design**: Decomposed into independent services (Auth, Project, Repository, Translation, Build, Logging, Scheduler, Worker) plus a custom API Gateway in Go.
- **Technology Stack**:
  - Language: Golang (Go 1.21+).
  - Database: PostgreSQL.
  - Storage: Local file system with mounted volumes for repositories and processing; final output uploaded to target repositories.
  - Message Queuing: RabbitMQ for asynchronous task handling.
  - Scheduling: gocron for periodic tasks in Scheduler Service.
  - Git Operations: go-git for cloning, pulling, and managing repos.
  - AI Integration: xAI/OpenAI/Gemini APIs for translations.
  - Web Scraping: gocolly/colly (fallback for static generation).
  - Authentication: JWT with RBAC using golang-jwt.
  - Routing: native Go HTTP package.
  - Logging: Zerolog or Logrus, centralized in Logging Service.
- **Deployment**: Docker containers; docker-compose.dev.yml includes RabbitMQ for message queuing; Kubernetes-ready for scaling.

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
  - `worker/main.go`: Worker Service consumer.
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
  - `worker/`: Task processing handlers, queue consumers.
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
  - Enqueues tasks (e.g., clone_repo) to RabbitMQ upon API requests, returning 202 Accepted immediately.
- **Repository Service**:
  - Dedicated to Git interactions (cloning, pulling, forking, change detection via hashes).
  - Called internally by Worker for Git ops, adhering to single responsibility.
- **Translation Service**:
  - Enqueues translation tasks to RabbitMQ upon requests, returning 202 Accepted.
  - Processes AI translations asynchronously via Worker.
- **Build Service**:
  - Executes build/export commands (npm via os/exec).
  - Fallback scraping; injects non-intrusive banners.
  - Uploads static content to target repositories.
- **Logging Service**:
  - Stores/queries logs (event, user, system, cron).
- **Scheduler Service**:
  - Periodic git pulls, change detection, auto-translations/builds.
  - Logs to Logging Service; no public endpoints.
- **Worker Service**:
  - Consumes tasks from RabbitMQ queues (e.g., clone_repo, translate_files).
  - Processes enqueued tasks using goroutines for concurrency.
  - Makes internal calls to other services or enqueues follow-up tasks, chaining workflows (e.g., clone → translate → build).
  - Scales horizontally in Kubernetes for AI-intensive loads; includes health checks and logging.

## 4. Workflows and Integration
- **Adding a Project**:
  - Project Service enqueues "clone_repo" task to RabbitMQ, returns 202 Accepted.
  - Worker consumes task, calls Repository Service to clone to /repos/{id}/original and create language copies.
  - Detect files, log to DB.
- **Translation Workflow**:
  - Translation Service enqueues "translate_files" task, returns 202 Accepted.
  - Worker processes task: reads files, chunks content, prompts AI, writes back, updates metadata.
- **Update Workflow**:
  - Scheduler pulls changes hourly.
  - Propagate to copies; re-translate if changed.
  - Trigger build if needed.
- **Build Workflow**:
  - Build Service enqueues "build_task" or Worker chains it after translation.
  - Worker processes: runs commands in language dir, exports or scrapes, injects banners.
  - Uploads static content to target repository.
- **Communication**:
  - Public endpoints through API Gateway with JWT/RBAC.
  - Private endpoints direct service-to-service HTTP/GRPC, secured with mTLS or API keys.
  - Async task handling via RabbitMQ queues.
  - No service mesh (Istio/Linkerd) at this stage.
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