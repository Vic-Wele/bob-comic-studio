#!/bin/bash

echo "Creating Bob Comic Studio project structure..."

# Root files
touch README.md
touch LICENSE
touch CONTRIBUTING.md
touch .gitignore
touch docker-compose.yml

# Documentation
mkdir -p docs

touch docs/product-spec.md
touch docs/architecture.md
touch docs/demo-script.md
touch docs/roadmap.md


# Frontend
mkdir -p frontend

mkdir -p frontend/src/components
mkdir -p frontend/src/pages
mkdir -p frontend/src/hooks
mkdir -p frontend/src/services
mkdir -p frontend/src/styles
mkdir -p frontend/src/utils


# Backend
mkdir -p backend/app

mkdir -p backend/app/api
mkdir -p backend/app/models
mkdir -p backend/app/services
mkdir -p backend/app/database
mkdir -p backend/app/auth

touch backend/app/main.py


# AI Layer
mkdir -p ai

mkdir -p ai/agents/bob_director
mkdir -p ai/agents/characterforge
mkdir -p ai/agents/worldforge
mkdir -p ai/agents/plotsmith
mkdir -p ai/agents/canonguard

mkdir -p ai/memory/canoncore


# Database
mkdir -p database

mkdir -p database/schemas
mkdir -p database/migrations
mkdir -p database/seed


# Assets
mkdir -p assets


echo "Bob Comic Studio structure created successfully!"
