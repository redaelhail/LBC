# backend/app/api/v1/endpoints/reports.py
"""
PDF Report Generation API Endpoints
Provides comprehensive PDF report generation for sanctions screening results
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from pydantic import BaseModel
import logging
import io

from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user
from app.core.permissions import require_analyst_or_above
from app.services.pdf_report_service import get_pdf_report_service
from app.services.audit_service import get_audit_service

logger = logging.getLogger(__name__)
router = APIRouter()

class BatchReportRequest(BaseModel):
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    risk_levels: Optional[List[str]] = None
    include_summary: bool = True
    include_details: bool = False

@router.get("/individual/{search_history_id}")
async def generate_individual_report(
    search_history_id: int,
    request: Request,
    include_full_results: bool = Query(True, description="Include full search results"),
    include_notes: bool = Query(True, description="Include search notes"),
    include_starred: bool = Query(True, description="Include starred entities"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> StreamingResponse:
    """
    Generate a PDF report for an individual search
    Returns a downloadable PDF file with comprehensive search details
    """
    try:
        pdf_service = get_pdf_report_service(db)
        
        # Generate PDF
        pdf_buffer = pdf_service.generate_individual_search_report(
            search_history_id=search_history_id,
            user_id=current_user.id,
            include_full_results=include_full_results,
            include_notes=include_notes,
            include_starred=include_starred
        )
        
        # Log report generation
        audit_service = get_audit_service(db)
        audit_service.log_export(
            user_id=current_user.id,
            export_type="PDF",
            resource=f"individual_search_report_{search_history_id}",
            request=request,
            record_count=1
        )
        
        # Create filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"search_report_{search_history_id}_{timestamp}.pdf"
        
        # Return PDF as streaming response
        return StreamingResponse(
            io=pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating individual PDF report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")

@router.post("/batch")
async def generate_batch_report(
    report_request: BatchReportRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> StreamingResponse:
    """
    Generate a PDF report covering multiple searches in a date range
    Useful for compliance reporting and periodic reviews
    """
    try:
        pdf_service = get_pdf_report_service(db)
        
        # Generate PDF
        pdf_buffer = pdf_service.generate_batch_report(
            user_id=current_user.id,
            date_from=report_request.date_from,
            date_to=report_request.date_to,
            risk_levels=report_request.risk_levels,
            include_summary=report_request.include_summary,
            include_details=report_request.include_details
        )
        
        # Log report generation
        audit_service = get_audit_service(db)
        date_range = f"{report_request.date_from or 'all'}_{report_request.date_to or 'now'}"
        audit_service.log_export(
            user_id=current_user.id,
            export_type="PDF",
            resource=f"batch_search_report_{date_range}",
            request=request,
            record_count=1  # One report generated
        )
        
        # Create filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        date_suffix = ""
        if report_request.date_from:
            date_suffix = f"_{report_request.date_from.strftime('%Y%m%d')}"
        if report_request.date_to:
            date_suffix += f"_to_{report_request.date_to.strftime('%Y%m%d')}"
        
        filename = f"batch_report{date_suffix}_{timestamp}.pdf"
        
        # Return PDF as streaming response
        return StreamingResponse(
            io=pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating batch PDF report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")

@router.get("/compliance/{period_days}")
async def generate_compliance_report(
    period_days: int,
    request: Request,
    include_high_risk_only: bool = Query(False, description="Include only high-risk searches"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> StreamingResponse:
    """
    Generate a compliance-focused PDF report
    Includes statistics, high-risk searches, and regulatory information
    """
    try:
        pdf_service = get_pdf_report_service(db)
        
        # Set date range
        date_from = datetime.utcnow() - timedelta(days=period_days)
        date_to = datetime.utcnow()
        risk_levels = ["HIGH"] if include_high_risk_only else None
        
        # Generate PDF with compliance focus
        pdf_buffer = pdf_service.generate_batch_report(
            user_id=current_user.id,
            date_from=date_from,
            date_to=date_to,
            risk_levels=risk_levels,
            include_summary=True,
            include_details=True  # Include details for compliance
        )
        
        # Log compliance report generation
        audit_service = get_audit_service(db)
        audit_service.log_export(
            user_id=current_user.id,
            export_type="PDF",
            resource=f"compliance_report_{period_days}days",
            request=request,
            record_count=1
        )
        
        # Create filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"compliance_report_{period_days}days_{timestamp}.pdf"
        
        # Return PDF as streaming response
        return StreamingResponse(
            io=pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating compliance PDF report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate compliance report: {str(e)}")

@router.get("/status")
async def get_report_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get PDF report generation status and capabilities
    Returns information about available report types and system status
    """
    try:
        from app.services.pdf_report_service import REPORTLAB_AVAILABLE
        
        # Get basic statistics
        from app.models.search_history import SearchHistory
        from app.models.search_notes import SearchNote
        from app.models.starred_entity import StarredEntity
        from sqlalchemy import func
        
        # Count user's data
        total_searches = db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id
        ).count()
        
        searches_with_notes = db.query(SearchHistory).join(SearchNote).filter(
            SearchHistory.user_id == current_user.id
        ).distinct().count()
        
        searches_with_starred = db.query(SearchHistory).join(StarredEntity).filter(
            SearchHistory.user_id == current_user.id
        ).distinct().count()
        
        # Recent searches (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_searches = db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id,
            SearchHistory.created_at >= thirty_days_ago
        ).count()
        
        return {
            "pdf_generation_available": REPORTLAB_AVAILABLE,
            "available_report_types": [
                "individual_search",
                "batch_report",
                "compliance_report"
            ] if REPORTLAB_AVAILABLE else [],
            "user_statistics": {
                "total_searches": total_searches,
                "searches_with_notes": searches_with_notes,
                "searches_with_starred": searches_with_starred,
                "recent_searches_30d": recent_searches
            },
            "report_capabilities": {
                "individual_reports": REPORTLAB_AVAILABLE,
                "batch_reports": REPORTLAB_AVAILABLE,
                "compliance_reports": REPORTLAB_AVAILABLE,
                "custom_date_ranges": REPORTLAB_AVAILABLE,
                "risk_level_filtering": REPORTLAB_AVAILABLE,
                "detailed_results": REPORTLAB_AVAILABLE,
                "notes_inclusion": REPORTLAB_AVAILABLE,
                "starred_entities": REPORTLAB_AVAILABLE
            },
            "limitations": {
                "max_results_per_report": 50,
                "max_date_range_days": 365,
                "supported_formats": ["PDF"]
            } if REPORTLAB_AVAILABLE else {
                "error": "PDF generation not available - ReportLab library not installed"
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting report status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get report status: {str(e)}")

@router.get("/templates")
async def get_report_templates(
    current_user: User = Depends(require_analyst_or_above)
) -> List[Dict[str, Any]]:
    """
    Get available report templates and their descriptions
    Helps users understand what types of reports they can generate
    """
    try:
        from app.services.pdf_report_service import REPORTLAB_AVAILABLE
        
        if not REPORTLAB_AVAILABLE:
            return []
        
        templates = [
            {
                "id": "individual_search",
                "name": "Individual Search Report",
                "description": "Detailed report for a single search including results, notes, and starred entities",
                "parameters": [
                    {"name": "search_history_id", "type": "integer", "required": True, "description": "ID of the search to report on"},
                    {"name": "include_full_results", "type": "boolean", "required": False, "default": True, "description": "Include full search results"},
                    {"name": "include_notes", "type": "boolean", "required": False, "default": True, "description": "Include search notes"},
                    {"name": "include_starred", "type": "boolean", "required": False, "default": True, "description": "Include starred entities"}
                ],
                "endpoint": "/api/v1/reports/individual/{search_history_id}",
                "method": "GET"
            },
            {
                "id": "batch_report",
                "name": "Batch Search Report",
                "description": "Report covering multiple searches within a date range with summary statistics",
                "parameters": [
                    {"name": "date_from", "type": "datetime", "required": False, "description": "Start date for report period"},
                    {"name": "date_to", "type": "datetime", "required": False, "description": "End date for report period"},
                    {"name": "risk_levels", "type": "array[string]", "required": False, "description": "Filter by risk levels"},
                    {"name": "include_summary", "type": "boolean", "required": False, "default": True, "description": "Include summary statistics"},
                    {"name": "include_details", "type": "boolean", "required": False, "default": False, "description": "Include detailed search results"}
                ],
                "endpoint": "/api/v1/reports/batch",
                "method": "POST"
            },
            {
                "id": "compliance_report",
                "name": "Compliance Report",
                "description": "Compliance-focused report for regulatory purposes with emphasis on high-risk searches",
                "parameters": [
                    {"name": "period_days", "type": "integer", "required": True, "description": "Number of days to include (1-365)"},
                    {"name": "include_high_risk_only", "type": "boolean", "required": False, "default": False, "description": "Include only high-risk searches"}
                ],
                "endpoint": "/api/v1/reports/compliance/{period_days}",
                "method": "GET"
            }
        ]
        
        return templates
        
    except Exception as e:
        logger.error(f"Error getting report templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get report templates: {str(e)}")