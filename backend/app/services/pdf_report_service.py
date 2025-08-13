# backend/app/services/pdf_report_service.py
"""
PDF Report Generation Service
Generates comprehensive PDF reports for sanctions screening results and compliance documentation
"""

import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from io import BytesIO
import json

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.platypus import Image as RLImage
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.search_history import SearchHistory
from app.models.search_notes import SearchNote
from app.models.starred_entity import StarredEntity
from app.models.user import User

logger = logging.getLogger(__name__)

class PDFReportService:
    """Service for generating PDF reports from search results and user data"""
    
    def __init__(self, db: Session):
        if not REPORTLAB_AVAILABLE:
            logger.warning("ReportLab not available. PDF generation will be limited.")
        
        self.db = db
        self.styles = getSampleStyleSheet() if REPORTLAB_AVAILABLE else None
        
        if REPORTLAB_AVAILABLE:
            # Custom styles
            self.title_style = ParagraphStyle(
                'CustomTitle',
                parent=self.styles['Heading1'],
                fontSize=20,
                spaceAfter=30,
                alignment=TA_CENTER,
                textColor=colors.darkblue
            )
            
            self.heading_style = ParagraphStyle(
                'CustomHeading',
                parent=self.styles['Heading2'],
                fontSize=14,
                spaceAfter=12,
                spaceBefore=20,
                textColor=colors.darkblue
            )
            
            self.normal_style = ParagraphStyle(
                'CustomNormal',
                parent=self.styles['Normal'],
                fontSize=10,
                spaceAfter=6,
                alignment=TA_JUSTIFY
            )
    
    def generate_individual_search_report(
        self,
        search_history_id: int,
        user_id: int,
        include_full_results: bool = True,
        include_notes: bool = True,
        include_starred: bool = True
    ) -> BytesIO:
        """
        Generate a PDF report for an individual search
        
        Args:
            search_history_id: ID of the search to report on
            user_id: User ID for authorization
            include_full_results: Whether to include full search results
            include_notes: Whether to include search notes
            include_starred: Whether to include starred entities
            
        Returns:
            BytesIO containing the PDF data
        """
        if not REPORTLAB_AVAILABLE:
            raise HTTPException(status_code=500, detail="PDF generation not available - ReportLab not installed")
        
        try:
            # Get search history
            search_history = self.db.query(SearchHistory).filter(
                SearchHistory.id == search_history_id,
                SearchHistory.user_id == user_id
            ).first()
            
            if not search_history:
                raise HTTPException(status_code=404, detail="Search history not found")
            
            # Get user info
            user = self.db.query(User).filter(User.id == user_id).first()
            
            # Get notes if requested
            notes = []
            if include_notes:
                notes = self.db.query(SearchNote).filter(
                    SearchNote.search_history_id == search_history_id
                ).all()
            
            # Get starred entities if requested
            starred_entities = []
            if include_starred:
                starred_entities = self.db.query(StarredEntity).filter(
                    StarredEntity.search_history_id == search_history_id
                ).all()
            
            # Create PDF
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
            
            # Build content
            content = []
            
            # Title
            content.append(Paragraph("SanctionsGuard Pro - Search Report", self.title_style))
            content.append(Spacer(1, 20))
            
            # Report metadata
            content.append(Paragraph("Report Information", self.heading_style))
            metadata_data = [
                ["Report Type:", "Individual Search Report"],
                ["Generated:", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")],
                ["User:", f"{user.full_name} ({user.email})" if user else "Unknown"],
                ["Organization:", user.organization if user and user.organization else "N/A"],
                ["Search ID:", str(search_history.id)]
            ]
            
            metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
            metadata_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            content.append(metadata_table)
            content.append(Spacer(1, 20))
            
            # Search details
            content.append(Paragraph("Search Details", self.heading_style))
            search_data = [
                ["Query:", search_history.query],
                ["Search Type:", search_history.search_type],
                ["Data Source:", search_history.data_source],
                ["Results Count:", str(search_history.results_count)],
                ["Risk Level:", search_history.risk_level],
                ["Relevance Score:", f"{search_history.relevance_score:.2f}" if search_history.relevance_score else "N/A"],
                ["Execution Time:", f"{search_history.execution_time_ms}ms" if search_history.execution_time_ms else "N/A"],
                ["Search Date:", search_history.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")]
            ]
            
            search_table = Table(search_data, colWidths=[2*inch, 4*inch])
            search_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            content.append(search_table)
            content.append(Spacer(1, 20))
            
            # Search results summary
            if include_full_results and search_history.results_data:
                content.append(Paragraph("Search Results", self.heading_style))
                results_data = search_history.results_data
                
                if isinstance(results_data, dict) and "results" in results_data:
                    results = results_data["results"][:10]  # Limit to first 10 results
                    
                    if results:
                        # Results table headers
                        results_table_data = [["Entity Name", "Score", "Risk Level", "Dataset", "Schema"]]
                        
                        for result in results:
                            entity_name = result.get("caption", "Unknown")[:50]  # Truncate long names
                            score = result.get("score", 0)
                            risk_level = self._get_risk_level_from_score(score)
                            dataset = result.get("dataset", "N/A")
                            schema = result.get("schema", "N/A")
                            
                            results_table_data.append([
                                entity_name,
                                f"{score:.2f}" if isinstance(score, (int, float)) else "N/A",
                                risk_level,
                                dataset,
                                schema
                            ])
                        
                        results_table = Table(results_table_data, colWidths=[2.5*inch, 0.8*inch, 0.8*inch, 1.2*inch, 0.7*inch])
                        results_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 9),
                            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                            ('FONTSIZE', (0, 1), (-1, -1), 8),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black),
                            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
                        ]))
                        content.append(results_table)
                        
                        if len(results_data["results"]) > 10:
                            content.append(Spacer(1, 10))
                            content.append(Paragraph(f"Note: Only first 10 results shown out of {len(results_data['results'])} total results.", self.normal_style))
                    else:
                        content.append(Paragraph("No results found.", self.normal_style))
                
                content.append(Spacer(1, 20))
            
            # Starred entities
            if include_starred and starred_entities:
                content.append(Paragraph("Starred Entities", self.heading_style))
                starred_table_data = [["Entity Name", "Entity ID", "Risk Level", "Tags", "Starred Date"]]
                
                for starred in starred_entities:
                    starred_table_data.append([
                        starred.entity_name[:50],  # Truncate long names
                        starred.entity_id[:30],    # Truncate long IDs
                        starred.risk_level or "N/A",
                        starred.tags[:30] if starred.tags else "N/A",
                        starred.created_at.strftime("%Y-%m-%d") if starred.created_at else "N/A"
                    ])
                
                starred_table = Table(starred_table_data, colWidths=[2*inch, 1.5*inch, 0.8*inch, 1*inch, 0.7*inch])
                starred_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
                ]))
                content.append(starred_table)
                content.append(Spacer(1, 20))
            
            # Notes
            if include_notes and notes:
                content.append(Paragraph("Search Notes", self.heading_style))
                for i, note in enumerate(notes):
                    content.append(Paragraph(f"Note {i+1}: {note.entity_name}", self.heading_style))
                    
                    note_data = [
                        ["Entity:", note.entity_name],
                        ["Note:", note.note_text[:200] + "..." if len(note.note_text) > 200 else note.note_text],
                        ["Risk Assessment:", note.risk_assessment or "N/A"],
                        ["Action Taken:", note.action_taken or "N/A"],
                        ["Created:", note.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if note.created_at else "N/A"]
                    ]
                    
                    note_table = Table(note_data, colWidths=[1.5*inch, 4.5*inch])
                    note_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (0, -1), colors.lightyellow),
                        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ]))
                    content.append(note_table)
                    content.append(Spacer(1, 15))
            
            # Footer
            content.append(Spacer(1, 30))
            content.append(Paragraph("--- End of Report ---", self.normal_style))
            content.append(Paragraph("This report is generated automatically by SanctionsGuard Pro for compliance purposes.", self.normal_style))
            
            # Build PDF
            doc.build(content)
            buffer.seek(0)
            
            return buffer
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating individual search PDF report: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")
    
    def generate_batch_report(
        self,
        user_id: int,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        risk_levels: Optional[List[str]] = None,
        include_summary: bool = True,
        include_details: bool = False
    ) -> BytesIO:
        """
        Generate a batch PDF report covering multiple searches
        
        Args:
            user_id: User ID for authorization
            date_from: Start date for report period
            date_to: End date for report period
            risk_levels: Filter by risk levels
            include_summary: Whether to include summary statistics
            include_details: Whether to include detailed search results
            
        Returns:
            BytesIO containing the PDF data
        """
        if not REPORTLAB_AVAILABLE:
            raise HTTPException(status_code=500, detail="PDF generation not available - ReportLab not installed")
        
        try:
            # Set default date range if not provided
            if not date_to:
                date_to = datetime.utcnow()
            if not date_from:
                date_from = date_to - timedelta(days=30)
            
            # Get user info
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Build query
            query = self.db.query(SearchHistory).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= date_from,
                SearchHistory.created_at <= date_to
            )
            
            if risk_levels:
                query = query.filter(SearchHistory.risk_level.in_(risk_levels))
            
            searches = query.order_by(SearchHistory.created_at.desc()).all()
            
            # Create PDF
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
            
            content = []
            
            # Title
            content.append(Paragraph("SanctionsGuard Pro - Batch Search Report", self.title_style))
            content.append(Spacer(1, 20))
            
            # Report metadata
            content.append(Paragraph("Report Information", self.heading_style))
            metadata_data = [
                ["Report Type:", "Batch Search Report"],
                ["Generated:", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")],
                ["User:", f"{user.full_name} ({user.email})"],
                ["Organization:", user.organization or "N/A"],
                ["Period:", f"{date_from.strftime('%Y-%m-%d')} to {date_to.strftime('%Y-%m-%d')}"],
                ["Total Searches:", str(len(searches))],
                ["Risk Filter:", ", ".join(risk_levels) if risk_levels else "All Levels"]
            ]
            
            metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
            metadata_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            content.append(metadata_table)
            content.append(Spacer(1, 20))
            
            # Summary statistics
            if include_summary and searches:
                content.append(Paragraph("Summary Statistics", self.heading_style))
                
                # Calculate statistics
                total_results = sum(search.results_count for search in searches)
                avg_results = total_results / len(searches) if searches else 0
                risk_counts = {}
                source_counts = {}
                
                for search in searches:
                    risk_counts[search.risk_level] = risk_counts.get(search.risk_level, 0) + 1
                    source_counts[search.data_source] = source_counts.get(search.data_source, 0) + 1
                
                summary_data = [
                    ["Total Searches:", str(len(searches))],
                    ["Total Results Found:", str(total_results)],
                    ["Average Results per Search:", f"{avg_results:.1f}"],
                    ["High Risk Searches:", str(risk_counts.get('HIGH', 0))],
                    ["Medium Risk Searches:", str(risk_counts.get('MEDIUM', 0))],
                    ["Low Risk Searches:", str(risk_counts.get('LOW', 0))]
                ]
                
                summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
                summary_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
                    ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                content.append(summary_table)
                content.append(Spacer(1, 20))
            
            # Search list
            if searches:
                content.append(Paragraph("Search History", self.heading_style))
                
                # Create search table
                search_table_data = [["Date", "Query", "Type", "Results", "Risk", "Source"]]
                
                for search in searches[:50]:  # Limit to 50 searches for readability
                    search_table_data.append([
                        search.created_at.strftime("%m/%d/%Y"),
                        search.query[:30] + "..." if len(search.query) > 30 else search.query,
                        search.search_type,
                        str(search.results_count),
                        search.risk_level,
                        search.data_source[:10]
                    ])
                
                search_list_table = Table(search_table_data, colWidths=[0.8*inch, 2.5*inch, 0.8*inch, 0.6*inch, 0.6*inch, 0.7*inch])
                search_list_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
                ]))
                content.append(search_list_table)
                
                if len(searches) > 50:
                    content.append(Spacer(1, 10))
                    content.append(Paragraph(f"Note: Only first 50 searches shown out of {len(searches)} total searches.", self.normal_style))
            else:
                content.append(Paragraph("No searches found for the specified period and criteria.", self.normal_style))
            
            # Footer
            content.append(Spacer(1, 30))
            content.append(Paragraph("--- End of Report ---", self.normal_style))
            content.append(Paragraph("This report is generated automatically by SanctionsGuard Pro for compliance purposes.", self.normal_style))
            
            # Build PDF
            doc.build(content)
            buffer.seek(0)
            
            return buffer
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating batch PDF report: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")
    
    def _get_risk_level_from_score(self, score: Union[int, float]) -> str:
        """Convert numeric score to risk level"""
        if isinstance(score, (int, float)):
            if score >= 0.8:
                return "HIGH"
            elif score >= 0.5:
                return "MEDIUM"
            else:
                return "LOW"
        return "UNKNOWN"

# Service factory function
def get_pdf_report_service(db: Session) -> PDFReportService:
    """Get PDF report service instance"""
    return PDFReportService(db)