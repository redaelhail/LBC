# SanctionsGuard Pro - Local Server Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying SanctionsGuard Pro on a local server. The application is a comprehensive sanctions and PEP screening platform designed for Moroccan financial institutions.

## Table of Contents

- [System Requirements](#system-requirements)
- [Server Setup](#server-setup)
- [Docker Installation](#docker-installation)
- [Application Deployment](#application-deployment)
- [Configuration](#configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Production Optimizations](#production-optimizations)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

---

## System Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04 LTS or CentOS 8+ (recommended)
- **CPU**: 4 cores (Intel/AMD x64)
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps connection

### Recommended Production Requirements
- **OS**: Ubuntu 22.04 LTS Server
- **CPU**: 8+ cores (Intel Xeon or AMD EPYC)
- **RAM**: 16 GB
- **Storage**: 500 GB NVMe SSD
- **Network**: 10 Gbps connection
- **Load Capacity**: Supports 2500 concurrent users

### Software Prerequisites
- Docker Engine 24.0+
- Docker Compose v2.20+
- Git 2.30+
- curl/wget
- systemd (for service management)

---

## Server Setup

### 1. Operating System Installation

#### Ubuntu 22.04 LTS Server Setup
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    vim \
    net-tools \
    ufw \
    fail2ban \
    logrotate \
    cron

# Configure timezone
sudo timedatectl set-timezone UTC

# Set up hostname
sudo hostnamectl set-hostname sanctionsguard-server
```

#### CentOS/RHEL Setup
```bash
# Update system packages
sudo yum update -y

# Install essential packages
sudo yum install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    vim \
    net-tools \
    firewalld \
    fail2ban \
    logrotate \
    cronie

# Enable services
sudo systemctl enable firewalld
sudo systemctl start firewalld
```

### 2. User Setup

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash sanctionsguard
sudo usermod -aG docker sanctionsguard

# Create application directory
sudo mkdir -p /opt/sanctionsguard
sudo chown sanctionsguard:sanctionsguard /opt/sanctionsguard

# Switch to application user
sudo su - sanctionsguard
```

### 3. Security Configuration

#### Firewall Setup (Ubuntu with UFW)
```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 8000/tcp  # Backend API

# Check status
sudo ufw status verbose
```

#### Firewall Setup (CentOS with firewalld)
```bash
# Allow required ports
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp

# Reload firewall
sudo firewall-cmd --reload
```

#### Fail2ban Configuration
```bash
# Configure fail2ban for SSH protection
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo vim /etc/fail2ban/jail.local
```

Add the following configuration to `/etc/fail2ban/jail.local`:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
```

```bash
# Enable and start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Docker Installation

### 1. Install Docker Engine

#### Ubuntu Installation
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl enable docker
sudo systemctl start docker
```

#### CentOS Installation
```bash
# Remove old versions
sudo yum remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine

# Add Docker repository
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl enable docker
sudo systemctl start docker
```

### 2. Configure Docker

```bash
# Add user to docker group
sudo usermod -aG docker $USER
sudo usermod -aG docker sanctionsguard

# Configure Docker daemon
sudo mkdir -p /etc/docker
```

Create Docker daemon configuration at `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "data-root": "/var/lib/docker",
  "default-address-pools": [
    {
      "base": "172.17.0.0/12",
      "size": 24
    }
  ]
}
```

```bash
# Restart Docker with new configuration
sudo systemctl restart docker

# Verify installation
docker --version
docker compose version
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Switch to application user
sudo su - sanctionsguard

# Navigate to application directory
cd /opt/sanctionsguard

# Clone the repository
git clone https://github.com/redaelhail/LBC.git sanctionsguard-pro
cd sanctionsguard-pro

# Switch to main branch
git checkout main
```

### 2. Environment Configuration

```bash
# Create environment files
cp .env.example .env

# Edit environment configuration
vim .env
```

Configure the following environment variables in `.env`:
```env
# Application Settings
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=your-super-secure-secret-key-change-this
API_BASE_URL=https://your-domain.com

# Database Configuration
POSTGRES_DB=sanctionsguard_prod
POSTGRES_USER=sanctionsguard_user
POSTGRES_PASSWORD=your-secure-db-password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Authentication Settings
ACCESS_TOKEN_EXPIRE_MINUTES=60
SESSION_TIMEOUT_MINUTES=30

# OpenSanctions API Configuration
OPENSANCTIONS_API_URL=https://api.opensanctions.org
OPENSANCTIONS_API_KEY=your-opensanctions-api-key

# Email Configuration (optional)
SMTP_SERVER=smtp.your-domain.com
SMTP_PORT=587
SMTP_USERNAME=noreply@your-domain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM_EMAIL=noreply@your-domain.com

# Monitoring & Logging
LOG_LEVEL=INFO
SENTRY_DSN=your-sentry-dsn

# Security
CORS_ORIGINS=["https://your-domain.com"]
ALLOWED_HOSTS=["your-domain.com", "www.your-domain.com"]
```

### 3. SSL/TLS Configuration

#### Generate SSL Certificates (using Let's Encrypt)
```bash
# Install Certbot
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Generate certificates (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Set up automatic renewal
sudo crontab -e
```

Add to crontab:
```bash
0 0,12 * * * python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && sudo certbot renew -q
```

#### Configure SSL in Docker Compose
Update `docker-compose.yml` for production:
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: sanctionsguard-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/nginx/sites-available:/etc/nginx/sites-available:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - sanctionsguard-network

  frontend:
    build: ./frontend
    container_name: sanctionsguard-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - REACT_APP_API_BASE_URL=https://your-domain.com/api
    networks:
      - sanctionsguard-network

  backend:
    build: ./backend
    container_name: sanctionsguard-backend
    restart: unless-stopped
    environment:
      - ENVIRONMENT=production
    depends_on:
      - postgres
      - redis
    networks:
      - sanctionsguard-network

  postgres:
    image: postgres:15-alpine
    container_name: sanctionsguard-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
      - ./logs/postgres:/var/log/postgresql
    networks:
      - sanctionsguard-network

  redis:
    image: redis:7-alpine
    container_name: sanctionsguard-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - sanctionsguard-network

  opensanctions-index:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.14.3
    container_name: opensanctions-index
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    volumes:
      - opensanctions_data:/usr/share/elasticsearch/data
    networks:
      - sanctionsguard-network

  opensanctions-api:
    image: ghcr.io/opensanctions/yente:latest
    container_name: opensanctions-api
    restart: unless-stopped
    environment:
      - YENTE_ELASTICSEARCH_URL=http://opensanctions-index:9200
      - YENTE_ENDPOINT_URL=https://data.opensanctions.org/datasets/latest/default/entities.ftm.json
    depends_on:
      - opensanctions-index
    networks:
      - sanctionsguard-network

volumes:
  postgres_data:
  redis_data:
  opensanctions_data:

networks:
  sanctionsguard-network:
    driver: bridge
```

### 4. Nginx Configuration

Create Nginx configuration at `config/nginx/nginx.conf`:
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    include /etc/nginx/sites-available/sanctionsguard.conf;
}
```

Create site configuration at `config/nginx/sites-available/sanctionsguard.conf`:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Root directory
    root /var/www/html;
    index index.html;

    # Frontend (React app)
    location / {
        proxy_pass http://sanctionsguard-frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Backend API
    location /api/ {
        proxy_pass http://sanctionsguard-backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://sanctionsguard-backend:8000/health;
        access_log off;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

### 5. Deploy Application

```bash
# Build and start services
docker compose build
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f

# Check application health
curl -k https://your-domain.com/health
```

### 6. Database Initialization

```bash
# Run database migrations
docker compose exec backend python -m alembic upgrade head

# Create admin user
docker compose exec backend python scripts/create_admin_user.py
```

---

## Configuration

### 1. Application Configuration

#### Backend Configuration
Update `backend/app/core/config.py` for production:
```python
class Settings(BaseSettings):
    environment: str = "production"
    debug: bool = False
    secret_key: str
    access_token_expire_minutes: int = 60
    
    # Database
    database_url: str = "postgresql://user:pass@postgres/db"
    
    # Redis
    redis_url: str = "redis://:pass@redis:6379/0"
    
    # CORS
    cors_origins: List[str] = ["https://your-domain.com"]
    
    # Rate limiting
    rate_limit_per_minute: int = 100
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
```

#### Frontend Configuration
Update `frontend/.env.production`:
```env
REACT_APP_API_BASE_URL=https://your-domain.com/api
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

### 2. Monitoring Configuration

#### Log Management with Logrotate
Create `/etc/logrotate.d/sanctionsguard`:
```
/opt/sanctionsguard/sanctionsguard-pro/logs/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sanctionsguard sanctionsguard
    postrotate
        docker compose -f /opt/sanctionsguard/sanctionsguard-pro/docker-compose.yml restart nginx
    endscript
}
```

#### Health Check Scripts
Create `/opt/sanctionsguard/scripts/health-check.sh`:
```bash
#!/bin/bash

HEALTH_URL="https://your-domain.com/health"
LOG_FILE="/opt/sanctionsguard/logs/health-check.log"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
    echo "$(date): Health check passed" >> $LOG_FILE
else
    echo "$(date): Health check failed - HTTP $response" >> $LOG_FILE
    # Send alert (email, Slack, etc.)
fi
```

Add to crontab:
```bash
# Health check every 5 minutes
*/5 * * * * /opt/sanctionsguard/scripts/health-check.sh
```

---

## Production Optimizations

### 1. Performance Tuning

#### PostgreSQL Optimization
Add to `docker-compose.yml` postgres service:
```yaml
postgres:
  command: >
    postgres
    -c max_connections=200
    -c shared_buffers=256MB
    -c effective_cache_size=1GB
    -c work_mem=4MB
    -c maintenance_work_mem=64MB
    -c random_page_cost=1.1
    -c effective_io_concurrency=200
```

#### Redis Optimization
```yaml
redis:
  command: >
    redis-server
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
    --save 900 1
    --save 300 10
```

### 2. Resource Limits

Update `docker-compose.yml` with resource limits:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

  postgres:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### 3. Backup Strategy

#### Database Backup Script
Create `/opt/sanctionsguard/scripts/backup.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/opt/sanctionsguard/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="sanctionsguard_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker compose exec -T postgres pg_dump -U sanctionsguard_user $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup application data
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /opt/sanctionsguard/sanctionsguard-pro

# Remove backups older than 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

Add to crontab for daily backups:
```bash
0 2 * * * /opt/sanctionsguard/scripts/backup.sh
```

---

## Monitoring & Maintenance

### 1. System Monitoring

#### Install monitoring tools
```bash
# Install system monitoring
sudo apt install -y htop iotop nethogs

# Install Docker monitoring
docker run -d \
  --name cadvisor \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/docker/:/var/lib/docker:ro \
  gcr.io/cadvisor/cadvisor:latest
```

#### Monitoring Dashboard
Create `/opt/sanctionsguard/scripts/system-status.sh`:
```bash
#!/bin/bash

echo "=== SanctionsGuard Pro System Status ==="
echo "Date: $(date)"
echo

echo "=== Docker Services ==="
docker compose -f /opt/sanctionsguard/sanctionsguard-pro/docker-compose.yml ps

echo
echo "=== System Resources ==="
free -h
df -h
uptime

echo
echo "=== Application Health ==="
curl -s https://your-domain.com/health | jq .

echo
echo "=== Recent Logs ==="
docker compose -f /opt/sanctionsguard/sanctionsguard-pro/docker-compose.yml logs --tail=10 backend
```

### 2. Update Process

#### Application Updates
Create `/opt/sanctionsguard/scripts/update.sh`:
```bash
#!/bin/bash

cd /opt/sanctionsguard/sanctionsguard-pro

echo "=== Starting Application Update ==="

# Backup before update
/opt/sanctionsguard/scripts/backup.sh

# Pull latest changes
git pull origin main

# Rebuild containers
docker compose build --no-cache

# Update database schema
docker compose run --rm backend python -m alembic upgrade head

# Restart services
docker compose down
docker compose up -d

echo "=== Update Complete ==="

# Check health
sleep 30
curl -s https://your-domain.com/health
```

### 3. Log Management

#### Centralized Logging
Create `/opt/sanctionsguard/config/rsyslog-sanctionsguard.conf`:
```
# SanctionsGuard Pro logging
$template SanctionsGuardFormat,"/var/log/sanctionsguard/%programname%.log"
:programname, isequal, "sanctionsguard" ?SanctionsGuardFormat
& stop
```

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker compose logs <service-name>

# Check resource usage
docker system df
docker system prune

# Restart service
docker compose restart <service-name>
```

#### 2. Database Connection Issues
```bash
# Check database logs
docker compose logs postgres

# Test connection
docker compose exec backend python -c "from app.database import engine; print(engine.execute('SELECT 1').scalar())"

# Reset database
docker compose down postgres
docker volume rm sanctionsguard-pro_postgres_data
docker compose up -d postgres
```

#### 3. SSL Certificate Issues
```bash
# Test certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run

# Check Nginx configuration
docker compose exec nginx nginx -t
```

#### 4. Performance Issues
```bash
# Check resource usage
docker stats

# Monitor database performance
docker compose exec postgres psql -U sanctionsguard_user -d sanctionsguard_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"

# Check slow queries
docker compose logs postgres | grep "slow query"
```

### Emergency Procedures

#### 1. Service Recovery
```bash
# Quick restart all services
docker compose down && docker compose up -d

# Force rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### 2. Database Recovery
```bash
# Restore from backup
gunzip -c /opt/sanctionsguard/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
docker compose exec -T postgres psql -U sanctionsguard_user sanctionsguard_prod
```

---

## Security Considerations

### 1. Network Security

- **Firewall**: Only expose necessary ports (80, 443)
- **VPN**: Consider VPN access for administrative functions
- **Rate Limiting**: Implement rate limiting at Nginx level
- **DDoS Protection**: Use CloudFlare or similar service

### 2. Application Security

- **Authentication**: Enforce strong passwords and 2FA
- **Session Management**: Configure secure session timeouts
- **Input Validation**: All inputs are validated server-side
- **SQL Injection**: Uses parameterized queries (SQLAlchemy)

### 3. Data Protection

- **Encryption**: All data encrypted in transit (TLS) and at rest
- **Backup Encryption**: Encrypt backup files
- **Audit Logging**: Complete audit trail of all actions
- **Access Control**: Role-based access control (RBAC)

### 4. Regular Maintenance

```bash
# Weekly security updates
sudo apt update && sudo apt upgrade -y

# Monthly Docker image updates
docker compose pull
docker compose build --pull --no-cache

# Quarterly security audit
/opt/sanctionsguard/scripts/security-audit.sh
```

---

## Support & Documentation

### Additional Resources

- **API Documentation**: https://your-domain.com/docs
- **User Manual**: `/docs/user-guides/`
- **Architecture Documentation**: `/docs/architecture/`
- **Troubleshooting Guide**: `/docs/troubleshooting/`

### Contact Information

- **Technical Support**: support@your-domain.com
- **Security Issues**: security@your-domain.com
- **Emergency Contact**: +212-XXX-XXXX

### Compliance

This deployment guide ensures compliance with:
- **GDPR**: Data protection and privacy
- **ISO 27001**: Information security management
- **SOC 2**: Security, availability, and confidentiality
- **Moroccan Banking Regulations**: Local compliance requirements

---

## Conclusion

This deployment guide provides a comprehensive setup for SanctionsGuard Pro on a local server. The configuration ensures high availability, security, and performance suitable for production use in financial institutions.

For additional support or customization requirements, please contact the technical team.

**Version**: 1.0  
**Last Updated**: August 2025  
**Reviewed By**: Technical Team