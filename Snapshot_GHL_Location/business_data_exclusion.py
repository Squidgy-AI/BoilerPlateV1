#!/usr/bin/env python3
"""
🔒 BUSINESS DATA EXCLUSION MODULE
================================
Critical security module that ensures NO business-specific data
is copied during Solar sub-account cloning operations.

ENSURES NO CROSS POLLINATION OF DATA between business accounts.
"""

import re
import copy
from typing import Dict, List, Set, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from solar_clone_models import ExcludedDataTypeEnum


class DataSensitivityLevel(Enum):
    """Sensitivity levels for different data types"""
    CRITICAL = "critical"        # Must never be copied (PII, payments)
    SENSITIVE = "sensitive"      # Business-specific info (contacts, staff)  
    RESTRICTED = "restricted"    # Business preferences (settings, custom data)
    STRUCTURAL = "structural"    # OK to copy (workflows, templates)


@dataclass
class BusinessDataPattern:
    """Pattern definition for identifying business-specific data"""
    pattern_type: str
    regex_pattern: str
    field_names: List[str]
    sensitivity: DataSensitivityLevel
    replacement_value: Optional[str] = None
    description: str = ""


class BusinessDataExclusionEngine:
    """
    Engine that identifies and excludes business-specific data
    Ensures complete separation of business information
    """
    
    def __init__(self):
        self.exclusion_patterns = self._initialize_exclusion_patterns()
        self.demo_replacements = self._initialize_demo_replacements()
        
        # Track what was excluded for auditing
        self.exclusion_log: List[Dict] = []
        
    def _initialize_exclusion_patterns(self) -> List[BusinessDataPattern]:
        """Initialize patterns for identifying business data to exclude"""
        
        return [
            # CRITICAL - Personal Identifiable Information
            BusinessDataPattern(
                pattern_type="email_addresses",
                regex_pattern=r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
                field_names=["email", "emailAddress", "fromEmail", "replyTo", "contactEmail"],
                sensitivity=DataSensitivityLevel.CRITICAL,
                replacement_value="demo@solar-company.com",
                description="Real email addresses that could identify actual customers"
            ),
            
            BusinessDataPattern(
                pattern_type="phone_numbers",
                regex_pattern=r"\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b",
                field_names=["phone", "phoneNumber", "contactPhone", "businessPhone"],
                sensitivity=DataSensitivityLevel.CRITICAL,
                replacement_value="(555) 123-SOLAR",
                description="Real phone numbers"
            ),
            
            BusinessDataPattern(
                pattern_type="addresses",
                regex_pattern=r"\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Blvd|Boulevard)",
                field_names=["address", "streetAddress", "businessAddress", "installationAddress"],
                sensitivity=DataSensitivityLevel.CRITICAL,
                replacement_value="123 Demo Solar Street, Demo City, DC 12345",
                description="Real physical addresses"
            ),
            
            # SENSITIVE - Business Identity Information
            BusinessDataPattern(
                pattern_type="business_names",
                regex_pattern=r"\b[A-Z][a-z]+\s+(Solar|Energy|Power|Electric|LLC|Inc|Corp|Company)\b",
                field_names=["companyName", "businessName", "locationName", "organizationName"],
                sensitivity=DataSensitivityLevel.SENSITIVE,
                replacement_value="Demo Solar Company",
                description="Actual business names"
            ),
            
            BusinessDataPattern(
                pattern_type="contact_names",
                regex_pattern=r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b",
                field_names=["contactName", "firstName", "lastName", "customerName", "leadName"],
                sensitivity=DataSensitivityLevel.SENSITIVE,
                replacement_value="Demo Customer",
                description="Real customer names"
            ),
            
            # RESTRICTED - Business-specific data
            BusinessDataPattern(
                pattern_type="payment_info",
                regex_pattern=r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b",
                field_names=["creditCard", "paymentMethod", "cardNumber", "accountNumber"],
                sensitivity=DataSensitivityLevel.CRITICAL,
                replacement_value="[PAYMENT_INFO_EXCLUDED]",
                description="Payment and financial information"
            ),
            
            BusinessDataPattern(
                pattern_type="website_urls",
                regex_pattern=r"https?://(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?",
                field_names=["website", "url", "domain", "trackingUrl"],
                sensitivity=DataSensitivityLevel.RESTRICTED,
                replacement_value="https://demo-solar-company.com",
                description="Business-specific websites and URLs"
            ),
            
            BusinessDataPattern(
                pattern_type="social_security",
                regex_pattern=r"\b\d{3}-\d{2}-\d{4}\b",
                field_names=["ssn", "socialSecurity", "taxId"],
                sensitivity=DataSensitivityLevel.CRITICAL,
                replacement_value="[SSN_EXCLUDED]",
                description="Social Security Numbers"
            ),
            
            BusinessDataPattern(
                pattern_type="staff_assignments",
                regex_pattern=r"(assigned|owner|rep|agent):\s*[A-Z][a-z]+\s+[A-Z][a-z]+",
                field_names=["assignedTo", "owner", "salesRep", "agent", "staffMember"],
                sensitivity=DataSensitivityLevel.SENSITIVE,
                replacement_value="Demo Staff Member",
                description="Staff assignments and ownership"
            )
        ]
    
    def _initialize_demo_replacements(self) -> Dict[str, Any]:
        """Initialize demo data replacements for excluded business data"""
        
        return {
            "demo_contacts": [
                {
                    "firstName": "John",
                    "lastName": "Demo",
                    "email": "john.demo@solar-company.com",
                    "phone": "(555) 123-SOLAR",
                    "address": "123 Solar Demo Street, Demo City, DC 12345",
                    "status": "Solar Prospect"
                },
                {
                    "firstName": "Sarah",
                    "lastName": "Example", 
                    "email": "sarah.example@solar-company.com",
                    "phone": "(555) 234-SOLAR",
                    "address": "456 Demo Energy Lane, Demo City, DC 12345",
                    "status": "Consultation Scheduled"
                },
                {
                    "firstName": "Mike",
                    "lastName": "Sample",
                    "email": "mike.sample@solar-company.com", 
                    "phone": "(555) 345-SOLAR",
                    "address": "789 Example Solar Way, Demo City, DC 12345",
                    "status": "Proposal Sent"
                }
            ],
            
            "demo_staff": [
                {
                    "name": "Demo Sales Rep",
                    "email": "sales@demo-solar-company.com",
                    "role": "Solar Sales Representative",
                    "phone": "(555) 100-SALES"
                },
                {
                    "name": "Demo Installation Manager",
                    "email": "install@demo-solar-company.com", 
                    "role": "Installation Manager",
                    "phone": "(555) 200-INSTALL"
                },
                {
                    "name": "Demo Customer Success",
                    "email": "support@demo-solar-company.com",
                    "role": "Customer Success Manager", 
                    "phone": "(555) 300-SUPPORT"
                }
            ],
            
            "demo_business_profile": {
                "companyName": "Demo Solar Company",
                "email": "info@demo-solar-company.com",
                "phone": "(555) 123-SOLAR",
                "address": "123 Demo Solar Headquarters, Demo City, DC 12345",
                "website": "https://demo-solar-company.com",
                "industry": "Solar Energy Installation",
                "description": "Demo solar company for system testing and training purposes"
            }
        }
    
    def scan_and_exclude_business_data(self, data: Dict, component_type: str) -> Tuple[Dict, List[str]]:
        """
        Scan data for business-specific information and exclude/replace it
        
        Returns:
            - Cleaned data with business info excluded
            - List of exclusions made for auditing
        """
        
        cleaned_data = copy.deepcopy(data)
        exclusions_made = []
        
        # Recursively scan all data
        self._recursive_clean(cleaned_data, component_type, exclusions_made)
        
        # Log exclusions for audit trail
        self.exclusion_log.append({
            "component_type": component_type,
            "timestamp": "2025-07-06T12:00:00Z",
            "exclusions_count": len(exclusions_made),
            "exclusions": exclusions_made
        })
        
        return cleaned_data, exclusions_made
    
    def _recursive_clean(self, obj: Any, context: str, exclusions: List[str]) -> None:
        """Recursively clean an object of business data"""
        
        if isinstance(obj, dict):
            self._clean_dict(obj, context, exclusions)
        elif isinstance(obj, list):
            for item in obj:
                self._recursive_clean(item, context, exclusions)
    
    def _clean_dict(self, data_dict: Dict, context: str, exclusions: List[str]) -> None:
        """Clean a dictionary of business data"""
        
        for key, value in list(data_dict.items()):
            # Check if this field should be excluded
            if self._should_exclude_field(key, value):
                original_value = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                
                # Get replacement value
                replacement = self._get_replacement_value(key, value)
                data_dict[key] = replacement
                
                exclusions.append(f"Field '{key}': '{original_value}' -> '{replacement}'")
            
            # Always remove critical ID fields that could link to real data
            elif key in ['id', 'contactId', 'customerId', 'paymentId', 'transactionId', 'ownerId']:
                if key in data_dict:
                    exclusions.append(f"Removed business ID field: '{key}'")
                    del data_dict[key]
            
            # Recursively clean nested objects
            elif isinstance(value, (dict, list)):
                self._recursive_clean(value, context, exclusions)
    
    def _should_exclude_field(self, field_name: str, field_value: Any) -> bool:
        """Determine if a field contains business data that should be excluded"""
        
        if not field_value or field_value == "":
            return False
        
        value_str = str(field_value)
        
        # Check against exclusion patterns
        for pattern in self.exclusion_patterns:
            # Check field name match
            if field_name.lower() in [fn.lower() for fn in pattern.field_names]:
                return True
            
            # Check regex pattern match  
            if re.search(pattern.regex_pattern, value_str, re.IGNORECASE):
                return True
        
        # Additional heuristics for business data
        
        # Check for actual business keywords in content
        business_indicators = [
            'customer', 'client', 'actual', 'real', 'production', 
            'live', 'billing', 'invoice', 'payment', 'transaction'
        ]
        
        if any(indicator in value_str.lower() for indicator in business_indicators):
            return True
        
        # Check for non-demo email domains
        if '@' in value_str and not any(demo in value_str.lower() for demo in ['demo', 'example', 'test', 'sample']):
            if not value_str.endswith('@solar-company.com'):
                return True
        
        return False
    
    def _get_replacement_value(self, field_name: str, original_value: Any) -> Any:
        """Get appropriate replacement value for excluded business data"""
        
        # Find matching pattern
        for pattern in self.exclusion_patterns:
            if field_name.lower() in [fn.lower() for fn in pattern.field_names]:
                if pattern.replacement_value:
                    return pattern.replacement_value
        
        # Default replacements based on field type
        value_str = str(original_value).lower()
        
        if 'email' in field_name.lower() or '@' in value_str:
            return "demo@solar-company.com"
        elif 'phone' in field_name.lower() or re.match(r'.*\d{3}.*\d{3}.*\d{4}.*', value_str):
            return "(555) 123-SOLAR"
        elif 'name' in field_name.lower() and len(value_str.split()) >= 2:
            return "Demo Customer"
        elif 'company' in field_name.lower() or 'business' in field_name.lower():
            return "Demo Solar Company"
        elif 'address' in field_name.lower():
            return "123 Demo Solar Street, Demo City, DC 12345"
        elif 'website' in field_name.lower() or 'url' in field_name.lower():
            return "https://demo-solar-company.com"
        else:
            return "[BUSINESS_DATA_EXCLUDED]"
    
    def validate_exclusion_completeness(self, data: Dict) -> Tuple[bool, List[str]]:
        """
        Validate that all business data has been properly excluded
        
        Returns:
            - True if validation passes, False if business data found
            - List of any business data that was missed
        """
        
        violations = []
        self._recursive_validate(data, "", violations)
        
        return len(violations) == 0, violations
    
    def _recursive_validate(self, obj: Any, path: str, violations: List[str]) -> None:
        """Recursively validate that no business data remains"""
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path else key
                
                if self._contains_business_data(key, value):
                    violations.append(f"Business data found at {current_path}: {str(value)[:100]}")
                
                if isinstance(value, (dict, list)):
                    self._recursive_validate(value, current_path, violations)
        
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                current_path = f"{path}[{i}]"
                self._recursive_validate(item, current_path, violations)
    
    def _contains_business_data(self, field_name: str, field_value: Any) -> bool:
        """Check if a field still contains business data"""
        
        if not field_value:
            return False
        
        value_str = str(field_value)
        
        # Check for common business data patterns that shouldn't exist
        business_patterns = [
            r'\b[A-Za-z0-9._%+-]+@(?!demo-solar-company\.com|solar-company\.com)[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Non-demo emails
            r'\b(?:\+?1[-.\s]?)?\(?(?!555)[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',  # Non-555 phone numbers
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN patterns
            r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b'  # Credit card patterns
        ]
        
        for pattern in business_patterns:
            if re.search(pattern, value_str, re.IGNORECASE):
                return True
        
        # Check for actual business names (not demo ones)
        if 'name' in field_name.lower() and not any(demo in value_str.lower() for demo in ['demo', 'example', 'test', 'sample']):
            if len(value_str.split()) >= 2:  # Likely a real name
                return True
        
        return False
    
    def get_exclusion_summary(self) -> Dict[str, Any]:
        """Get summary of all data exclusions performed"""
        
        total_exclusions = sum(log['exclusions_count'] for log in self.exclusion_log)
        
        exclusion_types = {}
        for log in self.exclusion_log:
            for exclusion in log['exclusions']:
                for pattern in self.exclusion_patterns:
                    if any(field in exclusion.lower() for field in pattern.field_names):
                        exclusion_types[pattern.pattern_type] = exclusion_types.get(pattern.pattern_type, 0) + 1
                        break
        
        return {
            "total_exclusions": total_exclusions,
            "exclusion_types": exclusion_types,
            "components_processed": len(self.exclusion_log),
            "exclusion_log": self.exclusion_log,
            "security_status": "BUSINESS_DATA_EXCLUDED" if total_exclusions > 0 else "NO_BUSINESS_DATA_FOUND"
        }


# Example usage and testing
if __name__ == "__main__":
    # Test the exclusion engine
    exclusion_engine = BusinessDataExclusionEngine()
    
    # Sample workflow data with business information
    test_workflow = {
        "name": "Solar Lead Follow-up",
        "contactEmail": "john.doe@realcompany.com",
        "assignedTo": "Sarah Johnson", 
        "businessPhone": "(312) 555-1234",
        "customerAddress": "123 Real Street, Chicago, IL 60601",
        "actions": [
            {
                "type": "send_email",
                "fromEmail": "sales@actualcompany.com",
                "contactIds": ["real_contact_123", "real_contact_456"]
            }
        ]
    }
    
    print("🔍 Original workflow data:")
    print(json.dumps(test_workflow, indent=2))
    
    # Clean the data
    cleaned_data, exclusions = exclusion_engine.scan_and_exclude_business_data(test_workflow, "workflow")
    
    print("\n🧹 Cleaned workflow data:")
    print(json.dumps(cleaned_data, indent=2))
    
    print(f"\n📋 Exclusions made: {len(exclusions)}")
    for exclusion in exclusions:
        print(f"  - {exclusion}")
    
    # Validate exclusion completeness
    is_clean, violations = exclusion_engine.validate_exclusion_completeness(cleaned_data)
    print(f"\n✅ Validation passed: {is_clean}")
    if violations:
        print("❌ Violations found:")
        for violation in violations:
            print(f"  - {violation}")
    
    # Get summary
    summary = exclusion_engine.get_exclusion_summary()
    print(f"\n📊 Exclusion Summary:")
    print(f"Total exclusions: {summary['total_exclusions']}")
    print(f"Security status: {summary['security_status']}")