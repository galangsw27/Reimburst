#!/bin/bash

# AIRism Deployment Script
# This script deploys the application using Docker Compose

set -e

echo "🚀 AIRism Deployment Script"
echo "============================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please copy .env.production to .env and update the values:"
    echo "   cp .env.production .env"
    echo "   nano .env  # or use your preferred editor"
    exit 1
fi

# Check if JWT_SECRET is set
if grep -q "CHANGE_THIS_TO_SECURE_RANDOM_STRING" .env; then
    echo "⚠️  Warning: JWT_SECRET is not set to a secure value!"
    echo "📝 Generate a secure secret with:"
    echo "   openssl rand -base64 32"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start containers
echo "🏗️  Building Docker images..."
docker-compose build --no-cache

echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    echo ""
    echo "🌐 Application is running at: http://localhost:3000"
    echo "🗄️  Database is running at: localhost:5432"
    echo ""
    echo "📝 Useful commands:"
    echo "   View logs:        docker-compose logs -f"
    echo "   Stop services:    docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   View status:      docker-compose ps"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "📋 Check logs with: docker-compose logs"
    exit 1
fi
