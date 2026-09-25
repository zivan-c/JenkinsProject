# CRUD MVC DevOps Pipeline — Jenkins Setup & Proctor Guide

This repository contains a Node.js/Express CRUD task manager with MongoDB, Docker, Jenkins CI/CD, and Prometheus monitoring.

The Jenkins pipeline contains **7 stages**:

1. Build
2. Test
3. Code Quality
4. Security
5. Deploy
6. Release
7. Monitoring

The pipeline builds versioned Docker images, runs automated tests and quality/security checks, deploys to a staging environment, promotes a tagged image to production, and verifies production monitoring through Prometheus.

---

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Database:** MongoDB 7.0.43
- **Testing:** Jest, Supertest, MongoMemoryServer, jest-junit
- **Code Quality:** ESLint with configured complexity/maintainability rules
- **Security:** `npm audit`
- **Containerisation:** Docker + Docker Compose
- **CI/CD:** Jenkins
- **Monitoring:** Prometheus + `prom-client`

---

## Prerequisites

Need to have the following installed before proceeding.

- Git
- Docker Desktop with Docker Compose
- Jenkins
- A Jenkins agent with access to the Docker CLI and Docker daemon

# Steps

## Clone the Repository

```bash
git clone https://github.com/zivan-c/JenkinsProject.git
cd JenkinsProject
```

## IF RUNNING THE APPLICATION LOCALLY OR TEST DIRECTLY

Install Node.js dependencies if you want to run the application or tests directly:

```bash
npm install
```

The application is normally run through Docker Compose because MongoDB is provided as a Compose service.

---

## Run the Application Locally

Start the application and supporting services:

```bash
docker compose up -d
```

Check the services:

```bash
docker compose ps
```

The application is available at:

**http://localhost:3000**

The Prometheus dashboard is available at:

**http://localhost:9090**

Check the application health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{"status":"ok"}
```

Check application metrics:

```bash
curl http://localhost:3000/metrics
```

Stop the local environment with:

```bash
docker compose down
```

The MongoDB named volume is retained unless it is explicitly removed.

---

## FOR RUNNING THROUGH DOCKER COMPOSE

### Create the Jenkins job

1. Open Jenkins.
2. Select **New Item**.
3. Enter a job name such as `JenkinsProject`.
4. Select **Pipeline**.
5. In **Pipeline → Definition**, select **Pipeline script from SCM**.
6. Select **Git** as the SCM.
7. Repository URL:

```text
https://github.com/zivan-c/JenkinsProject.git
```

8. Select main as the branch, not master
9. Set the script path to:

```text
Jenkinsfile
```

10. Save the job.

### Run the pipeline

Select **Build Now** (or the equivalent build action) in Jenkins.

Jenkins reads the `Jenkinsfile` directly from GitHub and executes all seven stages.

---

## Pipeline Stages

### Build

- Installs project dependencies.
- Creates a versioned Docker image using the Jenkins build number.
- Creates and archives a project build artifact.

Example Docker image:

```text
task-crud-app:build-12
```

### Test

Runs the Jest test suite with coverage and publishes the JUnit test report.

Typical result:

```text
38/38 tests passed
```

### Code Quality

Runs ESLint using configured maintainability and complexity rules.

The stage also creates an ESLint JSON report and fails the pipeline when configured quality rules are violated.

### Security

Runs:

```bash
npm audit --audit-level=high
```

A successful pipeline currently expects no high-severity dependency vulnerabilities.

### Deploy

Deploys the versioned Docker image to the staging/test environment using Docker Compose.

The staging application is exposed on:

**http://localhost:3000**

The deployment performs checks such as:

- Application container running
- MongoDB healthy
- Application HTTP endpoint responding

The deployment also preserves the previous application image so that a failed deployment can be rolled back.

### Release

Promotes the exact image that passed the earlier pipeline stages by creating a release tag.

Example:

```text
task-crud-app:build-12
task-crud-app:release-12
```

Production runs on:

**http://localhost:3001**

Check the production health endpoint:

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{"status":"ok"}
```

The production deployment starts the `app` and `mongo` services only. The monitoring Prometheus instance is kept separate so it can continuously monitor production.

### Monitoring

Prometheus monitors the deployed application and verifies:

- Prometheus is available
- The production target exists
- The production target is UP
- Required alert rules are loaded
- Production availability metrics are available

Prometheus dashboard:

**http://localhost:9090**

Prometheus targets:

**http://localhost:9090/targets**

Prometheus alerts:

**http://localhost:9090/alerts**

The monitoring configuration includes alerts for:

- `ProductionAppDown`
- `ProductionHighErrorRate`
- `ProductionHighLatency`




