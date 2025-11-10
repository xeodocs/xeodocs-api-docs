---
title: General Design
description: Overview of the XeoDocs backend architecture.
template: doc
---

This document provides an informative overview of the XeoDocs backend architecture. The backend is structured as a Golang-based monorepo with microservices, emphasizing modularity, scalability, and integration with tools like Docker, PostgreSQL, and RabbitMQ. This list breaks down key aspects to help Windsurf parse and comprehend the system's structure, components, and workflows, including asynchronous event flows for project management, translation, build, and publishing.

## 1. Overall Architecture
- **Monorepo Structure**: The backend is organized in a single repository (`xeodocs-backend/`) for ease of management, with shared modules and service-specific code.
  - **Microservices Design**: Decomposed into independent services (Auth, Project, Repository, Translation, Build, Logging, Scheduler, Worker) plus a custom API Gateway in Go.
  - **Asynchronous Processing**: Uses RabbitMQ for task queuing, enabling non-blocking operations and workflow chaining (e.g., setup → translate → build → publish).
- **Technology Stack**:
  - Language: Golang (Go 1.21+).
  - Database: PostgreSQL.
  - Storage: Local file system with mounted volumes for repositories and processing; static content published to dedicated Git repositories per language.
  - Message Queuing: RabbitMQ for asynchronous task handling.
  - Scheduling: gocron for periodic tasks in Scheduler Service.
  - Git Operations: go-git for cloning, pulling, and managing repos.
  - AI Integration: xAI/OpenAI/Gemini APIs for translations.
  - Web Scraping: gocolly/colly (fallback for static generation).
  - Authentication: JWT with RBAC using golang-jwt.
  - Routing: native Go HTTP package.
  - Logging: Zerolog or Logrus, centralized in Logging Service.
  - Deployment: Docker containers; docker-compose.dev.yml includes RabbitMQ for message queuing; Kubernetes-ready for scaling.

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
  - `repository/`: Repository handlers, gitops (forking/cloning/pulling/branching), change detection via hashes, repository models.
  - `translation/`: Translate handlers, AI integration.
  - `build/`: Build handlers, executor (npm), scraper, publisher.
  - `logging/`: Log query handlers, models.
  - `scheduler/`: Job definitions for periodic updates, auto-translations, builds, publishes.
  - `worker/`: Task processing handlers, queue consumers.
- **tests/**: Integration/E2E tests.

## 3. Key Microservices and Responsibilities
- **API Gateway**:
  - Single entry point; routes to services (e.g., /v1/auth → Auth Service, /v1/projects → Project Service).
  - Handles JWT validation, RBAC, rate limiting, CORS.
  - Proxies requests using httputil.ReverseProxy.
- **Auth Service**:
  - Manages users, roles, sessions via JWT.
  - Handles POST `/v1/auth/login` for authentication.
- **Project Service**:
  - CRUD for projects (add repo URL, languages, build commands, auto flags).
  - Enqueues tasks (e.g., setup_repo) to RabbitMQ upon API requests, returning 202 Accepted immediately.
  - Updates project status for monitoring.
- **Repository Service**:
  - Dedicated to Git interactions (forking, cloning, pulling, branching, change detection via hashes).
  - Creates and manages dedicated Git repositories for published static content per language.
  - Called internally by Worker for Git ops, adhering to single responsibility.
- **Translation Service**:
  - Enqueues translation tasks to RabbitMQ upon internal triggers, returning 202 Accepted.
  - Processes AI translations asynchronously via Worker on language branches.
- **Build Service**:
  - Executes build/export commands (npm via os/exec), starts preview server if needed.
  - Performs export or scraping (fallback), generates static files with injected banners.
  - Publishes static content to dedicated Git repositories per language via Repository Service.
- **Logging Service**:
  - Stores/queries logs (event, user, system, cron).
- **Scheduler Service**:
  - Periodic git pulls, change detection, auto-translations, builds, and publishes.
  - Logs to Logging Service; no public endpoints.
- **Worker Service**:
  - Consumes tasks from RabbitMQ queues (e.g., clone_repo, translate_files).
  - Processes enqueued tasks using goroutines for concurrency.
  - Makes internal calls to other services or enqueues follow-up tasks, chaining workflows (e.g., clone → translate → build).
  - Scales horizontally in Kubernetes for AI-intensive loads; includes health checks and logging.
  - Chains workflows by enqueuing follow-up tasks (e.g., setup → translate → build → publish).

## 4. Workflows and Integration
- **Adding a Project**:
  - User authenticates via JWT.
  - Sends POST request with project details, API Gateway routes to Project Service, saves to DB, enqueues "setup_repo" to RabbitMQ, returns 202 Accepted.
  - Worker consumes task, calls Repository Service: forks source repo in XeoDocs account, shallow clones to local volume, creates branches per target language in cloned repo (name `project-[slug]`), detects translatable files, logs to DB.
  - Logs setup events.
  - If auto_translate, triggers Translation Service internally.
  - Status update.
  - If auto_convert, chains to Build Service.
  - If auto_publish, chains to publish: creates new Git repo per language (`project-[slug]-[language]`), pushes static content.
  - Scheduler adds project to periodic cron jobs.
- **Translation Workflow**:
  - Translation Service enqueues "translate_task" upon internal triggers (e.g., after setup or updates), returns 202 Accepted.
  - Worker processes task: reads files from language branches, chunks content, prompts AI, writes back, updates metadata.
- **Update Workflow**:
  - Scheduler runs cron job (e.g., hourly), fetches projects with auto_translate=TRUE, enqueues "check_for_updates" to RabbitMQ.
  - Worker consumes, calls Repository Service: git pull on forked repo, updates shallow clone, detects changes via hashes.
  - Logs update events.
  - If changes detected and auto_translate, triggers Translation Service.
  - Status update.
  - If auto_convert and auto_publish, chains to Build and Publish workflows.
- **Build Workflow**:
  - Manual build: API Gateway routes POST `/v1/projects/{id}/build` to Build Service, enqueues "build_project" to RabbitMQ, returns 202 Accepted.
  - Worker consumes, calls Repository Service for branches, Build Service: executes build command, starts preview, performs export or scraping, generates static files with injected banners.
  - Logs events, status update.
  - User retrieves static content info.
- **Publish Workflow**:
  - Manual publish: API Gateway routes POST `/v1/projects/{id}/publish` to Build Service, enqueues "publish_project" to RabbitMQ, returns 202 Accepted.
  - Worker consumes, calls Repository Service: commits static files to dedicated Git repo per language, pushes to remote (e.g., GitHub).
  - Logs events, status update.
  - User retrieves publish details.
- **Communication**:
  - Public endpoints through API Gateway with JWT/RBAC.
  - Private endpoints direct service-to-service HTTP/GRPC, secured with mTLS or API keys.
  - Async task handling via RabbitMQ queues.
  - Worker chains tasks for complex workflows (e.g., setup → translate → build → publish).
  - No service mesh (Istio/Linkerd) at this stage.
- **Security**:
  - JWT for auth; RBAC (admin/editor/viewer); API Gateway enforces permissions.
  - Error handling with retries, timeouts.

## 5. Development and Operations
- **Setup**: `docker compose up` for local (mounts volumes for hot-reload).
  - **CI/CD**: GitHub Actions build/push images, deploy.
  - **Scalability**: Horizontal scaling for Translation/Build/Publish; Kubernetes pods.
  - **Monitoring**: Prometheus metrics; centralized logs.
  - **Testing**: Unit per package; integration via gateway.

This structure ensures XeoDocs delivers up-to-date, translated static content efficiently while generating traffic via banners. Workflows are asynchronous and chained via RabbitMQ for scalability.