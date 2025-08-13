#!/bin/bash

echo "🔍 Testing SanctionsGuard Pro Backend Connection"
echo "=============================================="

# Test if backend is running
echo "1. Testing backend health endpoint..."
curl -v http://localhost:8000/health 2>&1 | head -20

echo -e "\n\n2. Testing admin debug endpoint..."
curl -v http://localhost:8000/api/v1/auth/debug-admin 2>&1 | head -20

echo -e "\n\n3. Testing login endpoint..."
curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@sanctionsguard.com","password":"admin123"}' \
     2>&1 | head -20

echo -e "\n\n4. Testing through proxy (if frontend is running)..."
curl -v http://localhost:3001/api/v1/health 2>&1 | head -10