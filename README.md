# Blockchain-Based-E-Procurement-System

## Jira site
`https://asynashen.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog?atlOrigin=eyJpIjoiZTY1ZGQ0MmFhZTU0NGFiZGI2N2ZhODdhNWY0MDhmODAiLCJwIjoiaiJ9`

## Local Development Baseline

This project uses Node.js version 20. Please use the same version locally to ensure consistency with CI.

### Install Dependencies
```bash
npm ci
```

### Run Quality Gates Locally
Before pushing changes, ensure your code passes the same quality gates that CI runs:

```bash
npm test
npm run build
```

## CI Behavior

GitHub Actions automatically runs the quality gates (install, test, build) on every push to `main` and every pull request targeting `main`. A failed CI step will block merging.
