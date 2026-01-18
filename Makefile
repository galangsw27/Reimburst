# AIRism - Makefile for common tasks

.PHONY: help install dev build start stop restart logs clean deploy test db-shell backup

help: ## Show this help message
	@echo "AIRism - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Start development server (database only in Docker)
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Waiting for database..."
	@sleep 5
	npm run dev

dev-full: ## Start full development environment in Docker
	docker-compose -f docker-compose.dev.yml up

build: ## Build Docker images
	docker-compose build

start: ## Start all services
	docker-compose up -d

stop: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs (use 'make logs service=app' for specific service)
	@if [ -z "$(service)" ]; then \
		docker-compose logs -f; \
	else \
		docker-compose logs -f $(service); \
	fi

clean: ## Stop and remove all containers, networks, and volumes
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	rm -rf .next node_modules/.cache

deploy: ## Deploy application (production)
	@chmod +x deploy.sh
	./deploy.sh

test: ## Run tests
	npm run test

test-run: ## Run tests once (no watch)
	npm run test:run

db-shell: ## Access PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d reimbursement_db

db-backup: ## Backup database
	@mkdir -p backups
	docker-compose exec -T postgres pg_dump -U postgres reimbursement_db > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created in backups/"

db-restore: ## Restore database from backup (use 'make db-restore file=backup.sql')
	@if [ -z "$(file)" ]; then \
		echo "Error: Please specify backup file with 'make db-restore file=backup.sql'"; \
		exit 1; \
	fi
	docker-compose exec -T postgres psql -U postgres reimbursement_db < $(file)

status: ## Show status of all services
	docker-compose ps

health: ## Check application health
	@echo "Checking application health..."
	@curl -s http://localhost:3000/api/health | jq . || echo "Application not responding"

rebuild: ## Rebuild and restart application
	docker-compose up -d --build app

rebuild-all: ## Rebuild all services from scratch
	docker-compose build --no-cache
	docker-compose up -d

prune: ## Clean up Docker system
	docker system prune -af
	docker volume prune -f

seed: ## Seed database with initial data
	npm run db:seed

db-migrate: ## Run database migrations
	docker-compose exec postgres psql -U postgres -d reimbursement_db -f /docker-entrypoint-initdb.d/01-init.sql

db-reset: ## Reset database (WARNING: deletes all data)
	@echo "WARNING: This will delete all data. Press Ctrl+C to cancel..."
	@sleep 5
	docker-compose down -v
	docker-compose up -d postgres
	@echo "Waiting for database..."
	@sleep 10
	docker-compose up -d app

shell-app: ## Access app container shell
	docker-compose exec app sh

shell-db: ## Access database container shell
	docker-compose exec postgres sh

inspect-app: ## Inspect app container
	docker-compose exec app node -e "console.log(process.env)"

prod-build: ## Build for production
	docker-compose -f docker-compose.yml build --no-cache

prod-up: ## Start production environment
	docker-compose -f docker-compose.yml up -d

prod-down: ## Stop production environment
	docker-compose -f docker-compose.yml down

prod-logs: ## View production logs
	docker-compose -f docker-compose.yml logs -f

# Railway Commands
railway-setup: ## Setup Railway project (first time)
	@chmod +x scripts/railway-setup.sh
	./scripts/railway-setup.sh

railway-migrate: ## Run Railway database migration
	@chmod +x scripts/railway-migrate.sh
	./scripts/railway-migrate.sh

railway-deploy: ## Deploy to Railway
	railway up

railway-logs: ## View Railway logs
	railway logs -f

railway-status: ## Check Railway status
	railway status

railway-shell: ## Access Railway shell
	railway run bash

railway-vars: ## View Railway environment variables
	railway variables

railway-open: ## Open Railway app in browser
	railway open
