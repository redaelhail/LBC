#!/usr/bin/env python3
"""
Debug script to check admin login credentials
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.user import User
from app.core.auth import verify_password, get_password_hash

def debug_admin_login():
    """Debug admin login credentials"""
    
    db = SessionLocal()
    
    try:
        admin_email = "admin@sanctionsguard.com"
        admin_password = "admin123"
        
        print(f"🔍 Debugging login for: {admin_email}")
        print(f"🔍 Password: {admin_password}")
        print()
        
        # Check if user exists
        user = db.query(User).filter(User.email == admin_email).first()
        
        if not user:
            print("❌ Admin user not found in database!")
            
            # Create the admin user
            print("📝 Creating admin user...")
            hashed_password = get_password_hash(admin_password)
            
            admin_user = User(
                username="admin",
                email=admin_email,
                hashed_password=hashed_password,
                full_name="System Administrator",
                role="admin",
                is_superuser=True,
                is_active=True
            )
            
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            print("✅ Admin user created successfully!")
            user = admin_user
        else:
            print("✅ Admin user found in database")
        
        print(f"👤 User details:")
        print(f"   ID: {user.id}")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        print(f"   Active: {user.is_active}")
        print(f"   Superuser: {user.is_superuser}")
        print(f"   Hash: {user.hashed_password[:50]}...")
        print()
        
        # Test password verification
        password_valid = verify_password(admin_password, user.hashed_password)
        print(f"🔐 Password verification: {'✅ VALID' if password_valid else '❌ INVALID'}")
        
        if not password_valid:
            print("🔧 Updating password hash...")
            user.hashed_password = get_password_hash(admin_password)
            db.commit()
            
            # Test again
            password_valid = verify_password(admin_password, user.hashed_password)
            print(f"🔐 Password verification (after update): {'✅ VALID' if password_valid else '❌ INVALID'}")
        
        print()
        print("🎯 Summary:")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print(f"   User exists: {'✅' if user else '❌'}")
        print(f"   User active: {'✅' if user and user.is_active else '❌'}")
        print(f"   Password valid: {'✅' if password_valid else '❌'}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_admin_login()