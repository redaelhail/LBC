#!/usr/bin/env python3
"""
Script to create admin user with proper authentication
Run this if the admin user doesn't exist or password doesn't work
"""

import sys
import os
import asyncio
from sqlalchemy.orm import Session

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import SessionLocal
from app.models.user import User
from app.core.auth import get_password_hash

def create_admin_user():
    """Create or update admin user with proper credentials"""
    
    db = SessionLocal()
    
    try:
        # Admin credentials
        admin_email = "admin@sanctionsguard.com"
        admin_password = "admin123"
        
        # Check if admin user exists
        admin_user = db.query(User).filter(User.email == admin_email).first()
        
        if admin_user:
            print(f"Admin user exists: {admin_user.email}")
            # Update password to ensure it's correct
            admin_user.hashed_password = get_password_hash(admin_password)
            admin_user.is_active = True
            admin_user.is_superuser = True
            admin_user.role = "admin"
            db.commit()
            print("✅ Admin user password updated successfully!")
        else:
            # Create new admin user
            admin_user = User(
                username="admin",
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                full_name="System Administrator",
                role="admin",
                is_superuser=True,
                is_active=True
            )
            
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print("✅ Admin user created successfully!")
        
        print(f"Admin credentials:")
        print(f"  Email: {admin_email}")
        print(f"  Password: {admin_password}")
        print(f"  Role: {admin_user.role}")
        print(f"  Active: {admin_user.is_active}")
        print(f"  Superuser: {admin_user.is_superuser}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()