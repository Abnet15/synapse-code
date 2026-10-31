#!/usr/bin/env bash

# ==============================================================================
# SynapseCode SaaS - Automated Build, Validation & Cloud Deployment Pipeline
# Principal Cloud Architect & SaaS Engineering Lead Automation Script
# ==============================================================================

set -e

echo "============================================================"
echo "🚀 STARTING SYNAPSECODE PRODUCTION DEPLOYMENT & VALIDATION"
echo "============================================================"

# Resolve root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "📍 Working directory: $PROJECT_ROOT"

# ------------------------------------------------------------------------------
# STEP 1: Production Build Validation
# ------------------------------------------------------------------------------
echo ""
echo "📦 [1/3] Validating Backend Server Dependencies & Build..."
cd "$PROJECT_ROOT/server"
if [ ! -d "node_modules" ]; then
  echo "Installing server dependencies..."
  npm install --silent
fi
echo "Running server build check..."
npm run build

echo ""
echo "⚛️  [2/3] Validating Frontend Client Dependencies & Production Build..."
cd "$PROJECT_ROOT/client"
if [ ! -d "node_modules" ]; then
  echo "Installing client dependencies..."
  npm install --silent
fi
echo "Compiling Vite production bundle..."
npm run build

echo "✅ Production build checks completed with 0 errors!"

# ------------------------------------------------------------------------------
# STEP 2: Git Initialization & Clean Commit
# ------------------------------------------------------------------------------
echo ""
echo "🔧 [3/3] Preparing Git Repository & Staging Files..."
cd "$PROJECT_ROOT"

if [ ! -d ".git" ]; then
  echo "Initializing Git repository..."
  git init -b main
else
  echo "Git repository already initialized. Ensuring branch is 'main'..."
  git branch -M main 2>/dev/null || true
fi

echo "Staging all project files..."
git add .

# Create commit if there are staged changes
if git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "No new changes to commit."
else
  echo "Creating conventional commit..."
  git commit -m "feat: complete production-ready SynapseCode SaaS with Chapa payments"
fi

# ------------------------------------------------------------------------------
# STEP 3: Remote Push to GitHub
# ------------------------------------------------------------------------------
echo ""
echo "🌐 Configuring Remote Origin & Pushing to GitHub..."

DEFAULT_REMOTE="https://github.com/Abnet15/synapse-code.git"

if git remote | grep -q "^origin$"; then
  CURRENT_REMOTE=$(git remote get-url origin)
  echo "Found existing remote 'origin': $CURRENT_REMOTE"
else
  echo "Setting remote 'origin' to: $DEFAULT_REMOTE"
  git remote add origin "$DEFAULT_REMOTE"
fi

echo "Pushing code to main branch on GitHub..."
git push -u origin main

echo ""
echo "============================================================"
echo "🎉 DEPLOYMENT READY: SynapseCode successfully built and pushed!"
echo "============================================================"
