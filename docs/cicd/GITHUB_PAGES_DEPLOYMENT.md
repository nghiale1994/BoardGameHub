NOTE: AI must read docs/ai/README.md before modifying this file.

# GitHub Pages Deployment Guide

This guide explains how to deploy the BoardGameHub application to GitHub Pages.

## Prerequisites

- GitHub repository: `https://github.com/ryuuzoku/BoardGameHub`
- Node.js and npm installed
- GitHub repository access

## Quick Deploy Script

For easy deployment, use the provided script:

```bash
# Make sure you're in the project root
./scripts/deploy-gh-pages.sh
```

This script will:
1. Install gh-pages if needed
2. Build the application
3. Deploy to GitHub Pages

## Method 1: Manual Deployment (Recommended for testing)

### Step 1: Build the application
```bash
cd app
npm install
npm run build
```

### Step 2: Deploy to GitHub Pages
```bash
cd ..
# Install gh-pages package globally (one time)
npm install -g gh-pages

# Deploy dist folder to gh-pages branch
npx gh-pages -d app/dist
```

### Step 3: Verify deployment
- Go to: `https://ryuuzoku.github.io/BoardGameHub`
- The application should be live within a few minutes

## Method 2: GitHub Actions (Automated)

**Note**: The GitHub Actions workflow checks that test results file exists but does not validate test outcomes. Make sure to run tests locally and commit results before pushing.

### Workflow Overview
The CI/CD pipeline checks for the existence of test results before deploying:

1. **Check test results exist**: Validates `app/test-results/test-summary.json` exists (but doesn't check if tests passed)
2. **Deploy**: Deploys `app/dist` to GitHub Pages (no build step - assumes dist is committed)
3. **PR Check**: For pull requests, validates that test results file exists

### Step 1: Create GitHub Actions workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  check-test-results:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Check test results exist
      run: |
        if [ ! -f "app/test-results/test-summary.json" ]; then
          echo "❌ Test results not found! Please run tests locally before pushing."
          echo "Run: cd app && npm run test:unit && npm run test:e2e"
          exit 1
        fi

        echo "✅ Test results file found. Proceeding with deployment..."

  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: check-test-results
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: app/dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

  check-pr-test-results:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Check test results exist for PR
      run: |
        if [ ! -f "app/test-results/test-summary.json" ]; then
          echo "❌ Test results not found! Please run tests locally before creating PR."
          echo "Run: cd app && npm run test:unit && npm run test:e2e"
          exit 1
        fi

        echo "✅ Test results file found in PR. Proceeding..."
```

### Step 2: Enable GitHub Pages
1. Go to repository Settings → Pages
2. Source: "GitHub Actions"

### Step 3: Push to main branch
```bash
git add .
git commit -m "Add GitHub Pages deployment workflow"
git push origin main
```

## Configuration Details

### Vite Configuration
The `app/vite.config.ts` is already configured for GitHub Pages:
- Base path: `/BoardGameHub/` (matches repository name)
- Environment variables for PeerJS configuration

### Package.json
The `app/package.json` includes:
- Homepage: `https://ryuuzoku.github.io/BoardGameHub`
- Build script: `vite build`

## PeerJS Configuration for Production

For PeerJS to work on GitHub Pages, you need to set up a signaling server. Add these secrets to your GitHub repository:

- `VITE_PEERJS_HOST`: Your PeerJS server host
- `VITE_PEERJS_PORT`: Your PeerJS server port
- `VITE_PEERJS_PATH`: PeerJS path (usually `/peerjs`)
- `VITE_PEERJS_SECURE`: `true` for HTTPS
- `VITE_PEERJS_KEY`: Your PeerJS API key

## Troubleshooting

### Build fails
```bash
cd app
npm run lint  # Check for linting errors
npm run build  # Check build output
```

### 404 errors after deployment
- Check that `base: '/BoardGameHub/'` is set in `vite.config.ts`
- Verify repository name matches the base path

### PeerJS not working
- Ensure PeerJS environment variables are set
- Check that signaling server is running and accessible

## Local Testing

Test the production build locally:
```bash
cd app
npm run build
npm run preview
```

This serves the built application on `http://localhost:4173`