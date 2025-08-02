from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest) -> LoginResponse:
    """Login endpoint - Mock implementation"""
    
    # Mock authentication
    if request.email == "admin@sanctionsguard.ma" and request.password == "admin123":
        return LoginResponse(
            access_token="mock_jwt_token_here",
            token_type="bearer",
            user={
                "id": 1,
                "email": request.email,
                "full_name": "System Administrator",
                "role": "admin",
                "organization": "SanctionsGuard Pro"
            }
        )
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/logout")
async def logout() -> Dict[str, str]:
    """Logout endpoint"""
    return {"message": "Successfully logged out"}

@router.get("/me")
async def get_current_user() -> Dict[str, Any]:
    """Get current user - Mock implementation"""
    return {
        "id": 1,
        "email": "admin@sanctionsguard.ma",
        "full_name": "System Administrator",
        "role": "admin",
        "organization": "SanctionsGuard Pro"
    }
