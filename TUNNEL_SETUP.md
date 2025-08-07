# 🔧 Local Tunnel Setup Guide

This guide explains how to set up external access to your local SanctionsGuard Pro development environment using localtunnel.

## 📋 Prerequisites

- Frontend development server running on port 3001 (via `npm run dev`)
- Backend API server running on port 8000 (via Docker: `docker compose up`)
- Node.js and npm installed
- localtunnel package available globally (`npm install -g localtunnel`)

## 🚀 Quick Setup Steps

### 1. Start Backend Services
```bash
cd /path/to/sanctionsguard-pro
docker compose up -d
```

Verify backend is running:
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"SanctionsGuard Pro","version":"1.0.0"}
```

### 2. Configure Frontend for Local Development

The `frontend/vite.config.ts` must be configured to:
- Proxy API calls to `localhost:8000` (not Docker internal network)
- Allow tunnel domains in `allowedHosts`

Correct configuration:
```typescript
export default defineConfig({
  // ... other config
  server: {
    host: true,
    port: 3000,
    allowedHosts: [
      'simple-sanctionsguard.loca.lt',
      'sanctionsguard-app.loca.lt', 
      'crazy-pants-grin.loca.lt'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // ⚠️ Important: Use localhost, not backend:8000
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
```

### 3. Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The server will start on port 3001 (port 3000 is used by Docker frontend container).

Verify frontend is running:
```bash
curl http://localhost:3001/api/v1/search/history
# Should return JSON with search history
```

### 4. Start Tunnel

**Option A: With specific subdomain (recommended)**
```bash
npx localtunnel --port 3001 --subdomain simple-sanctionsguard
```

**Option B: With random subdomain (if specific name is taken)**
```bash
npx localtunnel --port 3001
```

### 5. Access Application

- **URL**: https://simple-sanctionsguard.loca.lt (or the URL shown in terminal)
- **Password**: Your public IP address (get it with: `curl https://ipinfo.io/ip`)

## 🔍 Troubleshooting

### Problem: 503 - Tunnel Unavailable
**Cause**: Frontend dev server not running or tunnel can't connect
**Solution**: 
1. Verify frontend is running on port 3001: `lsof -i :3001`
2. Restart tunnel: Kill existing processes and start again
3. Try different subdomain if name is taken

### Problem: HTTP 500 - Search Error Failed
**Cause**: API proxy not working correctly
**Solution**:
1. Verify vite.config.ts has `target: 'http://localhost:8000'`
2. Restart frontend dev server after config changes
3. Test proxy: `curl http://localhost:3001/api/v1/search/history`

### Problem: Connection Refused
**Cause**: Backend containers not running
**Solution**:
```bash
docker compose ps  # Check container status
docker compose up -d  # Start containers
curl http://localhost:8000/health  # Verify backend
```

### Problem: Tunnel Randomly Stops Working
**Cause**: localtunnel connection issues
**Solution**:
```bash
# Kill all localtunnel processes
pkill -f localtunnel

# Start fresh tunnel
npx localtunnel --port 3001 --subdomain simple-sanctionsguard
```

## 📱 Mobile Access Tips

### Add to Home Screen
- **iOS**: Safari → Share → "Add to Home Screen"
- **Android**: Chrome → Menu → "Add to home screen"

### Persistent Access
To keep tunnel running continuously:
```bash
# Run in background
nohup npx localtunnel --port 3001 --subdomain simple-sanctionsguard > tunnel.log 2>&1 &

# Check if running
ps aux | grep localtunnel
```

## 🔧 Environment Variables

For production deployments, consider these environment variables:

```bash
# Frontend
VITE_API_BASE_URL=https://your-api-domain.com

# Backend  
API_HOST=0.0.0.0
API_PORT=8000
```

## ⚠️ Security Notes

- localtunnel exposes your local server to the internet
- Use strong passwords and limit access in production
- Consider using ngrok or CloudFlare tunnels for production use
- Never commit tunnel URLs or passwords to version control

## 📞 Support

If you encounter issues:
1. Check Docker containers are healthy: `docker compose ps`
2. Verify all services are accessible locally first
3. Test API proxy through frontend dev server
4. Try different tunnel subdomains if name conflicts occur