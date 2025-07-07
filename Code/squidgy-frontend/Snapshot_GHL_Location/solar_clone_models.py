#!/usr/bin/env python3
"""
🌞 SOLAR SUB-ACCOUNT CLONING MODELS
====================================
Pydantic models for automated Solar sub-account cloning API
Ensures proper data validation and excludes business-specific information
"""

from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class CloneStatusEnum(str, Enum):
    """Status of the cloning operation"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class ComponentTypeEnum(str, Enum):
    """Types of components that can be cloned"""
    WORKFLOWS = "workflows"
    PIPELINES = "pipelines"
    CUSTOM_FIELDS = "custom_fields"
    EMAIL_TEMPLATES = "email_templates"
    SMS_TEMPLATES = "sms_templates"
    FORMS = "forms"
    FUNNELS = "funnels"
    CALENDARS = "calendars"
    TAGS = "tags"
    TRIGGERS = "triggers"
    CAMPAIGNS = "campaigns"
    PRODUCTS = "products"


class ExcludedDataTypeEnum(str, Enum):
    """Types of business data that must be excluded"""
    CONTACTS = "contacts"
    CONVERSATIONS = "conversations"
    PAYMENTS = "payments"
    TRANSACTIONS = "transactions"
    STAFF = "staff"
    BUSINESS_PROFILE = "business_profile"
    MEDIA_FILES = "media_files"
    APPOINTMENTS = "appointments"
    INVOICES = "invoices"


class SolarCloneRequest(BaseModel):
    """Request model for Solar sub-account cloning"""
    
    # Source configuration
    source_location_id: str = Field(..., description="Source location ID to clone from")
    source_snapshot_id: Optional[str] = Field(None, description="Specific snapshot ID to use (optional)")
    
    # Target configuration
    target_location_name: str = Field(..., description="Name for the new cloned location")
    target_company_id: str = Field(..., description="Company ID where the clone will be created")
    
    # Component selection
    include_components: List[ComponentTypeEnum] = Field(
        default=[
            ComponentTypeEnum.WORKFLOWS,
            ComponentTypeEnum.PIPELINES,
            ComponentTypeEnum.CUSTOM_FIELDS,
            ComponentTypeEnum.EMAIL_TEMPLATES,
            ComponentTypeEnum.SMS_TEMPLATES,
            ComponentTypeEnum.FORMS,
            ComponentTypeEnum.FUNNELS,
            ComponentTypeEnum.CALENDARS,
            ComponentTypeEnum.TAGS,
            ComponentTypeEnum.TRIGGERS,
            ComponentTypeEnum.CAMPAIGNS,
            ComponentTypeEnum.PRODUCTS
        ],
        description="Components to include in the clone"
    )
    
    # Data exclusion (enforced for security)
    exclude_data_types: List[ExcludedDataTypeEnum] = Field(
        default=[
            ExcludedDataTypeEnum.CONTACTS,
            ExcludedDataTypeEnum.CONVERSATIONS,
            ExcludedDataTypeEnum.PAYMENTS,
            ExcludedDataTypeEnum.TRANSACTIONS,
            ExcludedDataTypeEnum.STAFF,
            ExcludedDataTypeEnum.BUSINESS_PROFILE,
            ExcludedDataTypeEnum.MEDIA_FILES,
            ExcludedDataTypeEnum.APPOINTMENTS,
            ExcludedDataTypeEnum.INVOICES
        ],
        description="Business data types to exclude (cannot be changed)"
    )
    
    # Dummy data configuration
    add_dummy_data: bool = Field(True, description="Add dummy data for excluded business fields")
    dummy_data_prefix: str = Field("DEMO_", description="Prefix for dummy data entries")
    
    # Customization options
    custom_branding: Optional[Dict[str, Any]] = Field(None, description="Custom branding settings")
    custom_settings: Optional[Dict[str, Any]] = Field(None, description="Custom location settings")
    
    # Notification settings
    notify_on_completion: bool = Field(True, description="Send notification when cloning is complete")
    notification_email: Optional[str] = Field(None, description="Email for completion notification")
    
    @validator('target_location_name')
    def validate_location_name(cls, v):
        if len(v) < 3:
            raise ValueError('Location name must be at least 3 characters')
        if len(v) > 100:
            raise ValueError('Location name must be less than 100 characters')
        return v
    
    @validator('exclude_data_types')
    def enforce_data_exclusion(cls, v):
        """Enforce that sensitive business data is always excluded"""
        required_exclusions = [
            ExcludedDataTypeEnum.CONTACTS,
            ExcludedDataTypeEnum.CONVERSATIONS,
            ExcludedDataTypeEnum.PAYMENTS,
            ExcludedDataTypeEnum.TRANSACTIONS,
            ExcludedDataTypeEnum.STAFF,
            ExcludedDataTypeEnum.BUSINESS_PROFILE
        ]
        
        for exclusion in required_exclusions:
            if exclusion not in v:
                v.append(exclusion)
        
        return v


class ComponentCloneResult(BaseModel):
    """Result of cloning a specific component type"""
    component_type: ComponentTypeEnum
    status: CloneStatusEnum
    source_count: int = Field(0, description="Number of items in source")
    cloned_count: int = Field(0, description="Number of items successfully cloned")
    failed_count: int = Field(0, description="Number of items that failed to clone")
    error_messages: List[str] = Field(default_factory=list, description="Error messages if any")
    duration_seconds: Optional[float] = Field(None, description="Time taken to clone this component")


class DummyDataResult(BaseModel):
    """Result of dummy data insertion"""
    data_type: ExcludedDataTypeEnum
    dummy_count: int = Field(0, description="Number of dummy entries created")
    examples: List[str] = Field(default_factory=list, description="Examples of dummy data created")


class SolarCloneResponse(BaseModel):
    """Response model for Solar sub-account cloning"""
    
    # Request tracking
    clone_id: str = Field(..., description="Unique identifier for this cloning operation")
    request_timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the request was received")
    completion_timestamp: Optional[datetime] = Field(None, description="When the cloning was completed")
    
    # Overall status
    status: CloneStatusEnum = Field(CloneStatusEnum.PENDING, description="Overall cloning status")
    progress_percentage: float = Field(0.0, description="Completion percentage (0-100)")
    
    # Location information
    source_location_id: str = Field(..., description="Source location that was cloned")
    target_location_id: Optional[str] = Field(None, description="New location ID created")
    target_location_name: str = Field(..., description="Name of the cloned location")
    
    # Component results
    component_results: List[ComponentCloneResult] = Field(default_factory=list, description="Results for each component type")
    dummy_data_results: List[DummyDataResult] = Field(default_factory=list, description="Results of dummy data insertion")
    
    # Summary statistics
    total_components_requested: int = Field(0, description="Total number of component types requested")
    total_components_completed: int = Field(0, description="Total number of component types completed")
    total_items_cloned: int = Field(0, description="Total individual items cloned")
    total_errors: int = Field(0, description="Total number of errors encountered")
    
    # Performance metrics
    total_duration_seconds: Optional[float] = Field(None, description="Total time taken for cloning")
    average_items_per_second: Optional[float] = Field(None, description="Average cloning rate")
    
    # Error handling
    error_messages: List[str] = Field(default_factory=list, description="General error messages")
    warnings: List[str] = Field(default_factory=list, description="Warning messages")
    
    # Links and references
    snapshot_share_link: Optional[str] = Field(None, description="Share link for the created snapshot")
    target_location_url: Optional[str] = Field(None, description="URL to access the cloned location")
    documentation_url: Optional[str] = Field(None, description="Link to documentation for the cloned system")
    
    # Security confirmation
    data_exclusion_confirmed: bool = Field(True, description="Confirms business data was properly excluded")
    excluded_data_types: List[ExcludedDataTypeEnum] = Field(default_factory=list, description="List of data types that were excluded")
    
    @property
    def is_complete(self) -> bool:
        """Check if cloning is complete"""
        return self.status in [CloneStatusEnum.COMPLETED, CloneStatusEnum.FAILED]
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_components_requested == 0:
            return 0.0
        return (self.total_components_completed / self.total_components_requested) * 100


class SolarCloneStatusRequest(BaseModel):
    """Request model for checking clone status"""
    clone_id: str = Field(..., description="Clone operation ID to check")


class SolarCloneListRequest(BaseModel):
    """Request model for listing clone operations"""
    company_id: str = Field(..., description="Company ID to list clones for")
    status_filter: Optional[CloneStatusEnum] = Field(None, description="Filter by status")
    limit: int = Field(10, ge=1, le=100, description="Number of results to return")
    offset: int = Field(0, ge=0, description="Number of results to skip")


class SolarCloneListResponse(BaseModel):
    """Response model for listing clone operations"""
    total_count: int = Field(0, description="Total number of clone operations")
    items: List[SolarCloneResponse] = Field(default_factory=list, description="List of clone operations")
    has_more: bool = Field(False, description="Whether there are more results available")


# Example usage and validation
if __name__ == "__main__":
    # Example request
    example_request = SolarCloneRequest(
        source_location_id="JUTFTny8EXQOSB5NcvAA",
        target_location_name="DEMO Solar Client - ABC Company",
        target_company_id="lp2p1q27DrdGta1qGDJd",
        notification_email="admin@example.com"
    )
    
    print("✅ Example Solar Clone Request:")
    print(example_request.json(indent=2))
    
    # Example response
    example_response = SolarCloneResponse(
        clone_id="solar_clone_2025_07_06_001",
        source_location_id="JUTFTny8EXQOSB5NcvAA",
        target_location_name="DEMO Solar Client - ABC Company",
        status=CloneStatusEnum.COMPLETED,
        progress_percentage=100.0,
        total_components_requested=12,
        total_components_completed=12,
        total_items_cloned=156
    )
    
    print("\n✅ Example Solar Clone Response:")
    print(example_response.json(indent=2))