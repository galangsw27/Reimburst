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

prune: ## Clean up Docker system
	docker system prune -af
	docker volume prune -f
