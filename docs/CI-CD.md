# Ayantaraz CI/CD Documentation

## Overview

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Ayantaraz project.

## Pipeline Architecture

The CI/CD pipeline consists of multiple GitHub Actions workflows that run on various events:

### Workflows

1. **`ci-cd.yml`** - Main CI/CD pipeline
   - Runs on push to `main` and pull requests to `main`
   - Includes: Setup, Validation, Testing, Docker Build, Deployment, Security Scan, Performance Check

2. **`docker-build-push.yml`** - Docker image building and pushing
   - Runs on push to `main` and tags
   - Builds and pushes API and Web Docker images to GitHub Container Registry

3. **`quality-checks.yml`** - Code quality checks
   - Runs on push to `main` and pull requests to `main`
   - Includes: Lint, TypeCheck, Format Check, Schema Validate, Build Validate

4. **`test.yml`** - Test suite
   - Runs on push to `main` and pull requests to `main`
   - Runs unit and integration tests with PostgreSQL and Redis services

## Pipeline Stages

### Stage 1: Setup and Validation

**Workflow**: `ci-cd.yml` (setup job)

**Purpose**: Prepare the environment and validate the codebase

**Steps**:
1. Checkout repository
2. Setup Node.js (v22)
3. Enable Corepack and pnpm (v11.9.0)
4. Install dependencies
5. Validate Prisma schema
6. Generate Prisma client
7. Run TypeScript type checking
8. Run lint
9. Run format check
10. Validate build

**Artifacts**: Build artifacts uploaded for subsequent jobs

### Stage 2: Testing

**Workflow**: `ci-cd.yml` (test job) or `test.yml`

**Purpose**: Run comprehensive tests to ensure code quality

**Services**:
- PostgreSQL 15 (Alpine)
- Redis 7 (Alpine)

**Steps**:
1. Checkout repository
2. Setup Node.js
3. Enable Corepack and pnpm
4. Install dependencies
5. Generate Prisma client
6. Run database migrations
7. Run unit tests
8. Upload test results

**Environment Variables**:
```
DATABASE_URL=postgresql://test:test@localhost:5432/test?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=test_jwt_secret_key_1234567890
JWT_REFRESH_SECRET=test_jwt_refresh_secret_0987654321
FILE_ENCRYPTION_KEY=test_file_encryption_key
SESSION_SECRET=test_session_secret
NODE_ENV=test
```

### Stage 3: Docker Build

**Workflow**: `ci-cd.yml` (build-docker job) or `docker-build-push.yml`

**Purpose**: Build Docker images for API and Web services

**Steps**:
1. Checkout repository
2. Setup Docker Buildx
3. Login to GitHub Container Registry (GHCR)
4. Extract metadata (tags, labels)
5. Build and push API image
6. Build and push Web image
7. Generate artifact attestation

**Images**:
- `ghcr.io/codez37/ayantaraz-/api:latest`
- `ghcr.io/codez37/ayantaraz-/api:<sha>`
- `ghcr.io/codez37/ayantaraz-/web:latest`
- `ghcr.io/codez37/ayantaraz-/web:<sha>`

### Stage 4: Deployment

**Workflow**: `ci-cd.yml` (deploy-production job)

**Purpose**: Deploy the application to production server (202.133.91.13)

**Trigger**: Push to `main` branch only

**Steps**:
1. Checkout repository
2. Install SSH key
3. Connect to server via SSH
4. Pull latest changes
5. Stop existing containers
6. Pull latest Docker images
7. Start containers with `--build` flag
8. Wait for services to stabilize
9. Run database migrations
10. Seed database

**Server**: 202.133.91.13

### Stage 5: Security Scan

**Workflow**: `ci-cd.yml` (security-scan job)

**Purpose**: Scan the codebase for vulnerabilities

**Trigger**: Push to `main` branch only

**Tool**: Trivy vulnerability scanner

**Steps**:
1. Checkout repository
2. Run Trivy filesystem scan
3. Upload results to GitHub Security tab

**Severity Levels**: CRITICAL, HIGH

### Stage 6: Performance Check

**Workflow**: `ci-cd.yml` (performance-check job)

**Purpose**: Verify deployment performance

**Trigger**: After successful deployment

**Steps**:
1. Wait for deployment to stabilize (60 seconds)
2. Test API response time
3. Report if response time exceeds 1 second

### Stage 7: Notification

**Workflow**: `ci-cd.yml` (notify job)

**Purpose**: Provide deployment status summary

**Trigger**: Always runs after deployment stage

**Output**: Deployment status report with success/failure of each stage

## Required Secrets

The CI/CD pipeline requires the following GitHub Secrets to be configured:

### For Deployment
- `SSH_PRIVATE_KEY` - SSH private key for server access
- `SSH_USER` - SSH username (default: root)
- `SSH_KNOWN_HOSTS` - Known hosts for SSH connection

### For Container Registry
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Branch Protection

The `main` branch has the following protection rules:

### Required Status Checks
- lint
- typecheck
- format-check
- schema-validate
- build-validate
- test
- Docker Build and Push
- Quality Checks

### Additional Rules
- Require pull request reviews before merging
- Dismiss stale pull request approvals when new commits are pushed
- Require review from Code Owners
- Require at least 1 approving review
- Require conversation resolution before merging
- Enforce linear history
- Do not allow force pushes
- Do not allow deletions

## Local Development

### Prerequisites
- Node.js v22
- pnpm v11.9.0
- Docker
- Docker Compose

### Setup
```bash
# Clone repository
git clone https://github.com/codez37/ayantaraz.git
cd ayantaraz

# Install dependencies
pnpm install --shamefully-hoist

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed database
pnpm db:seed
```

### Running Locally
```bash
# Start development servers
pnpm dev

# Or start individual services
pnpm dev:api
pnpm dev:web
```

### Running with Docker
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start containers
docker compose up -d

# View logs
docker compose logs -f
```

## Testing Locally

### Run Tests
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test -- apps/api/src/users/users.service.spec.ts
```

### Run Quality Checks
```bash
# Run lint
pnpm lint

# Run typecheck
pnpm typecheck

# Run format check
pnpm format:check

# Run all quality checks
pnpm lint && pnpm typecheck && pnpm format:check
```

## Monitoring and Logging

### GitHub Actions
View pipeline status at: https://github.com/codez37/ayantaraz/actions

### Docker Logs
```bash
# View all container logs
docker compose logs -f

# View specific container logs
docker logs -f ayantaraz-api
```

### Application Logs
```bash
# View API logs
docker logs ayantaraz-api

# View Web logs
docker logs ayantaraz-web
```

## Troubleshooting

### Common Issues

#### Issue: Pipeline fails on setup
**Solution**: Check Node.js version and pnpm version in workflow files

#### Issue: Tests fail
**Solution**: Check test environment variables and database connection

#### Issue: Docker build fails
**Solution**: Check Dockerfile syntax and base image availability

#### Issue: Deployment fails
**Solution**: Check SSH key configuration and server accessibility

### Debugging

To debug pipeline issues:

1. View workflow run logs in GitHub Actions
2. Check out the specific commit that triggered the failure
3. Run the failing commands locally
4. Check environment variables and secrets

## Best Practices

### Commit Messages
- Use clear, descriptive commit messages
- Follow conventional commits format (feat:, fix:, docs:, etc.)
- Reference issues when applicable

### Pull Requests
- Create PRs from feature branches to `main`
- Include clear description of changes
- Reference related issues
- Request reviews from team members

### Code Quality
- Run quality checks before pushing
- Fix lint warnings
- Ensure type safety
- Write tests for new functionality

### Security
- Never commit secrets to repository
- Use environment variables for sensitive data
- Keep dependencies updated
- Regularly scan for vulnerabilities

## Performance Optimization

### Docker Build Cache
The pipeline uses GitHub Actions cache for Docker builds to speed up subsequent runs.

### Dependency Caching
pnpm dependencies are cached to speed up installation.

### Parallel Jobs
Quality check jobs run in parallel to reduce total pipeline time.

## Scaling

### Multiple Environments
To add additional environments (staging, development):

1. Create new workflow files (e.g., `deploy-staging.yml`)
2. Configure environment-specific secrets
3. Update branch protection rules if needed

### Multiple Servers
To deploy to multiple servers:

1. Add additional deployment jobs to the workflow
2. Configure server-specific secrets
3. Update deployment scripts

## Future Enhancements

### Planned Improvements
- [ ] Add automated rollback on deployment failure
- [ ] Add canary deployment support
- [ ] Add blue-green deployment support
- [ ] Add performance monitoring and alerting
- [ ] Add automated backup verification
- [ ] Add load testing to pipeline
- [ ] Add security scanning to PR workflow

### Monitoring
- [ ] Add Prometheus metrics
- [ ] Add Grafana dashboards
- [ ] Add alerting for critical issues

### Security
- [ ] Add SAST scanning
- [ ] Add DAST scanning
- [ ] Add dependency scanning
- [ ] Add secret scanning

## References

- GitHub Actions Documentation: https://docs.github.com/en/actions
- Docker Documentation: https://docs.docker.com/
- pnpm Documentation: https://pnpm.io/
- Prisma Documentation: https://www.prisma.io/docs

---

**Last Updated**: July 2026  
**Version**: 2.0
