from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from app.core.permissions import require_admin
from pathlib import Path
import os
import markdown
from typing import List, Dict, Any

router = APIRouter()

# Documentation base path
DOCS_PATH = Path(__file__).parent.parent.parent.parent.parent / "docs"
ROOT_PATH = Path(__file__).parent.parent.parent.parent.parent

@router.get("/structure")
async def get_documentation_structure(current_user = Depends(require_admin)) -> Dict[str, Any]:
    """Get the documentation structure for admin users"""
    
    def scan_directory(path: Path, relative_path: str = "") -> List[Dict[str, Any]]:
        items = []
        if not path.exists():
            return items
            
        for item in sorted(path.iterdir()):
            if item.name.startswith('.'):
                continue
                
            item_path = os.path.join(relative_path, item.name) if relative_path else item.name
            
            if item.is_dir():
                items.append({
                    "name": item.name,
                    "type": "directory",
                    "path": item_path,
                    "children": scan_directory(item, item_path)
                })
            elif item.suffix.lower() in ['.md', '.txt', '.json']:
                items.append({
                    "name": item.name,
                    "type": "file",
                    "path": item_path,
                    "size": item.stat().st_size
                })
        return items
    
    structure = {
        "documentation": scan_directory(DOCS_PATH, "docs"),
        "root_docs": []
    }
    
    # Add root-level documentation files
    for item in ROOT_PATH.iterdir():
        if item.is_file() and item.suffix.lower() == '.md':
            structure["root_docs"].append({
                "name": item.name,
                "type": "file", 
                "path": item.name,
                "size": item.stat().st_size
            })
    
    return structure

@router.get("/content/{file_path:path}")
async def get_documentation_content(file_path: str, current_user = Depends(require_admin)):
    """Get documentation file content"""
    
    # Security check - prevent path traversal
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    # Try docs directory first
    full_path = DOCS_PATH / file_path
    if not full_path.exists():
        # Try root directory for root-level docs
        full_path = ROOT_PATH / file_path
    
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="Documentation file not found")
    
    # Security check - ensure file is within allowed directories
    try:
        full_path.resolve().relative_to(ROOT_PATH.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        content = full_path.read_text(encoding='utf-8')
        
        # Convert markdown to HTML if it's a markdown file
        if full_path.suffix.lower() == '.md':
            html_content = markdown.markdown(content, extensions=['tables', 'fenced_code', 'toc'])
            return {
                "type": "markdown",
                "content": content,
                "html": html_content,
                "path": file_path,
                "name": full_path.name
            }
        else:
            return {
                "type": "text",
                "content": content,
                "path": file_path,
                "name": full_path.name
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

@router.get("/download/{file_path:path}")
async def download_documentation(file_path: str, current_user = Depends(require_admin)):
    """Download documentation file"""
    
    # Security check - prevent path traversal
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    # Try docs directory first
    full_path = DOCS_PATH / file_path
    if not full_path.exists():
        # Try root directory for root-level docs
        full_path = ROOT_PATH / file_path
    
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="Documentation file not found")
    
    # Security check - ensure file is within allowed directories
    try:
        full_path.resolve().relative_to(ROOT_PATH.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        path=str(full_path),
        filename=full_path.name,
        media_type='application/octet-stream'
    )