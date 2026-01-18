# AIRism - Deployment Guide

Panduan lengkap untuk deploy aplikasi AIRism menggunakan Docker.

## Prerequisites

- Docker (versi 20.10 atau lebih baru)
- Docker Compose (versi 2.0 atau lebih baru)
- Minimal 2GB RAM tersedia
- Port 3000 dan 5432 harus tersedia

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy template environment file
cp .env.production .env

# Edit file .env dan update nilai-nilai berikut:
nano .env
```

**PENTING:** Update nilai berikut di file `.env`:

```bash
# Generate JWT secret yang aman
JWT_SECRET=$(openssl rand -base64 32)

# Update database credentials jika diperlukan
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/reimbursement_db

# Update webhook URLs sesuai kebutuhan
NEXT_PUBLIC_WEBHOOK_URL=your_webhook_url
NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL=your_maxstream_url
```

### 2. Deploy Aplikasi

```bash
# Berikan permission execute pada script
chmod +x deploy.sh

# Jalankan deployment
./deploy.sh
```

Script akan otomatis:
- ✅ Validasi environment variables
- ✅ Build Docker images
- ✅ Start database dan aplikasi
- ✅ Jalankan database migrations
- ✅ Verify health checks

### 3. Akses Aplikasi

Setelah deployment berhasil:

- **Web Application:** http://localhost:3000
- **Database:** localhost:5432
- **Health Check:** http://localhost:3000/api/health

## Manual Deployment

Jika ingin deploy manual tanpa script:

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Production Deployment

Untuk production dengan port 80:

```bash
# Gunakan production compose file
docker-compose -f docker-compose.prod.yml up -d
```

## Management Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart app
```

### Stop Services

```bash
# Stop without removing containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

### Database Management

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d reimbursement_db

# Backup database
docker-compose exec postgres pg_dump -U postgres reimbursement_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres reimbursement_db < backup.sql

# View database logs
docker-compose logs postgres
```

### Application Management

```bash
# View application logs
docker-compose logs -f app

# Restart application only
docker-compose restart app

# Rebuild and restart application
docker-compose up -d --build app

# Execute command in app container
docker-compose exec app sh
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Or use different port
# Edit docker-compose.yml: ports: - "8080:3000"
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres pg_isready -U postgres
```

### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Rebuild without cache
docker-compose build --no-cache app
docker-compose up -d app

# Check environment variables
docker-compose exec app env | grep DATABASE_URL
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
./deploy.sh
```

## Health Checks

### Application Health

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-18T10:00:00.000Z"
}
```

### Database Health

```bash
docker-compose exec postgres pg_isready -U postgres
```

Expected output:
```
/var/run/postgresql:5432 - accepting connections
```

## Security Considerations

### Production Checklist

- [ ] Change default database password
- [ ] Generate secure JWT_SECRET
- [ ] Use HTTPS (setup reverse proxy)
- [ ] Enable firewall rules
- [ ] Regular backups
- [ ] Monitor logs
- [ ] Update dependencies regularly

### Environment Variables Security

```bash
# Never commit .env to git
echo ".env" >> .gitignore

# Set proper file permissions
chmod 600 .env

# Use secrets management in production
# Consider: Docker Secrets, AWS Secrets Manager, etc.
```

## Monitoring

### Resource Usage

```bash
# View resource usage
docker stats

# View specific container
docker stats reimbursement_app
```

### Disk Usage

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Scaling

### Horizontal Scaling

```bash
# Scale application instances
docker-compose up -d --scale app=3

# Note: Requires load balancer configuration
```

### Vertical Scaling

Edit `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Backup Strategy

### Automated Backups

Create backup script:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U postgres reimbursement_db > "backup_${DATE}.sql"
```

Schedule with cron:

```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

## Updates and Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build app
```

### Update Dependencies

```bash
# Update npm packages
npm update

# Rebuild image
docker-compose build --no-cache app
docker-compose up -d app
```

## Support

Jika mengalami masalah:

1. Check logs: `docker-compose logs -f`
2. Verify environment: `docker-compose config`
3. Check health: `curl http://localhost:3000/api/health`
4. Review this guide
5. Check Docker documentation

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
