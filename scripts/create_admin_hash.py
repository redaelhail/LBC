#!/usr/bin/env python3
"""
Script to generate proper password hash for admin user
"""

from passlib.context import CryptContext

# Initialize the password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Generate hash for 'admin123'
password = "admin123"
hashed = pwd_context.hash(password)

print(f"Password: {password}")
print(f"Hash: {hashed}")

# Verify the hash works
if pwd_context.verify(password, hashed):
    print("✅ Hash verification successful!")
else:
    print("❌ Hash verification failed!")