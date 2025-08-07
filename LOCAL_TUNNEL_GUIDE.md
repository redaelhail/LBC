# 📱 Local Tunnel Setup Guide - Do It Yourself

This guide shows you how to set up external mobile access to your local SanctionsGuard Pro development environment.

## 🚀 Quick Setup (2 minutes)

### Step 1: Check Prerequisites
```bash
# 1. Make sure Docker containers are running
docker compose ps

# You should see these containers running:
# - sanctionsguard-backend (port 8000)
# - sanctionsguard-postgres (port 5432)
# - opensanctions-api (port 9000)
```

### Step 2: Start Frontend Development Server
```bash
# Navigate to frontend directory
cd frontend

# Start the dev server (will automatically find port 3001 since 3000 is used by Docker)
npm run dev

# You should see:
# ➜  Local:   http://localhost:3001/
# ➜  Network: http://[YOUR_LOCAL_IP]:3001/
```

### Step 3: Start Local Tunnel
```bash
# In a new terminal, run:
npx localtunnel --port 3001 --subdomain sanctionsguard-mobile

# You should see:
# your url is: https://sanctionsguard-mobile.loca.lt
```

### Step 4: Get Your Public IP (Password)
```bash
curl https://ipinfo.io/ip
```

### Step 5: Access from Mobile
- **URL**: https://sanctionsguard-mobile.loca.lt
- **Password**: Your public IP from step 4

---

## 🔧 Troubleshooting Guide

### Problem: "503 - Tunnel Unavailable"
**Solution:**
```bash
# 1. Kill any existing tunnel processes
pkill -f localtunnel

# 2. Check if frontend is running
lsof -i :3001

# 3. If no process on 3001, restart frontend:
cd frontend && npm run dev

# 4. Start tunnel with different subdomain:
npx localtunnel --port 3001 --subdomain sg-mobile-$(date +%s)
```

### Problem: "Blocked request. This host is not allowed"
**Solution:**
```bash
# Add your tunnel subdomain to vite.config.ts allowedHosts array:
# Edit frontend/vite.config.ts and add your tunnel URL:
# allowedHosts: [...existing, 'your-subdomain.loca.lt']

# Then restart frontend:
pkill -f "npm run dev"
cd frontend && npm run dev
```

### Problem: "HTTP 500 - Search Error Failed"
**Solution:**
```bash
# Check if backend is healthy
curl http://localhost:8000/health

# If not healthy, restart backend:
docker compose restart backend

# Wait 10 seconds, then test API proxy:
curl http://localhost:3001/api/v1/search/entities/starred
```

### Problem: Frontend Won't Start
**Solution:**
```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Check if port 3000 is occupied by Docker
lsof -i :3000

# 3. Start with host flag
npm run dev -- --host
```

---

## 📋 Step-by-Step Checklist

**Before starting tunnel:**
- [ ] Docker containers are running (`docker compose ps`)
- [ ] Backend is healthy (`curl localhost:8000/health`)
- [ ] Frontend dev server is on port 3001 (`lsof -i :3001`)

**Starting tunnel:**
- [ ] Run: `npx localtunnel --port 3001 --subdomain YOUR_SUBDOMAIN`
- [ ] Get public IP: `curl https://ipinfo.io/ip`
- [ ] Test local access first: `curl localhost:3001`

**Testing mobile access:**
- [ ] Open tunnel URL in mobile browser
- [ ] Enter your public IP as password
- [ ] Test search functionality works
- [ ] Test reports and starred entities work

---

## 🎯 Common Commands Reference

```bash
# Check what's running on port 3001
lsof -i :3001

# Check Docker services
docker compose ps

# Kill all localtunnel processes
pkill -f localtunnel

# Start tunnel with random subdomain
npx localtunnel --port 3001

# Start tunnel with custom subdomain
npx localtunnel --port 3001 --subdomain my-custom-name

# Get your public IP (tunnel password)
curl https://ipinfo.io/ip

# Test backend health
curl http://localhost:8000/health

# Test API proxy through frontend
curl http://localhost:3001/api/v1/search/entities/starred

# Check frontend vite config (should proxy to localhost:8000)
cat frontend/vite.config.ts
```

---

## 🔄 If Tunnel Stops Working

Localtunnel connections can drop randomly. Here's the restart process:

```bash
# 1. Kill old tunnel
pkill -f localtunnel

# 2. Start new tunnel (use timestamp for unique subdomain)
npx localtunnel --port 3001 --subdomain sg-$(date +%H%M)

# 3. Update your bookmarks with the new URL
# 4. Use same password (your public IP)
```

---

## 💡 Pro Tips

1. **Keep terminal open**: Don't close the terminal running `npm run dev` or the tunnel
2. **Bookmark the URL**: Save the tunnel URL to your mobile browser
3. **Add to home screen**: For better mobile experience
4. **Check logs**: If something fails, check the terminal outputs
5. **Use unique subdomains**: Add timestamp to avoid conflicts
6. **Test locally first**: Always test `localhost:3001` before using tunnel

---

## 🔒 Security Notes

- **Tunnel exposes your local server** to the internet temporarily
- **Only use for development/testing** - not for production
- **Password protects access** with your public IP
- **Tunnel URL is public** - don't share sensitive data
- **Stop tunnel when done** - close terminal or `pkill -f localtunnel`

---

## 📞 Quick Status Check

Run this one-liner to check everything:
```bash
echo "=== STATUS CHECK ===" && \
echo "Backend Health:" && curl -s localhost:8000/health | jq -r .status && \
echo "Frontend Running:" && (lsof -i :3001 >/dev/null && echo "✅ Yes" || echo "❌ No") && \
echo "Docker Services:" && docker compose ps --format "table {{.Names}}\t{{.Status}}" && \
echo "Public IP:" && curl -s https://ipinfo.io/ip && \
echo "Tunnel Process:" && (pgrep -f localtunnel >/dev/null && echo "✅ Running" || echo "❌ Not running")
```

---

## 🚨 Emergency Reset

If everything is broken:
```bash
# 1. Stop everything
pkill -f localtunnel
pkill -f "npm run dev"
docker compose down

# 2. Start fresh
docker compose up -d
sleep 10
cd frontend && npm run dev &
sleep 5
npx localtunnel --port 3001 --subdomain sg-emergency
```

**Your current tunnel is ready:**
- **URL**: https://sanctionsguard-mobile.loca.lt
- **Password**: 84.197.252.50