#!/usr/bin/env python3
"""
🎭 DUMMY DATA GENERATOR FOR SOLAR CLONES
========================================
Generates realistic but clearly identifiable dummy data for cloned Solar locations
Ensures cloned systems have sample data for demonstrations and testing

Key Features:
- All data clearly marked as DEMO/TEST
- Solar industry-specific sample data
- Progressive customer journey examples
- No real business information
"""

import httpx
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from solar_clone_models import DummyDataResult, ExcludedDataTypeEnum


@dataclass
class DummyContact:
    """Dummy contact data structure"""
    first_name: str
    last_name: str
    email: str
    phone: str
    address: str
    city: str
    state: str
    zip_code: str
    solar_interest: str
    lead_source: str
    status: str
    monthly_electric_bill: int
    home_square_footage: int
    roof_type: str


@dataclass
class DummyStaffMember:
    """Dummy staff member data structure"""
    name: str
    email: str
    phone: str
    role: str
    department: str
    specialization: str


class SolarDummyDataGenerator:
    """
    Generates comprehensive dummy data for Solar business clones
    All data is clearly marked as demo/test and industry-appropriate
    """
    
    def __init__(self, agency_token: str, prefix: str = "DEMO_"):
        self.agency_token = agency_token
        self.prefix = prefix
        
        self.base_headers = {
            "Authorization": f"Bearer {agency_token}",
            "Version": "2021-07-28",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Solar-specific data pools
        self.solar_data = self._initialize_solar_data()
    
    def _initialize_solar_data(self) -> Dict[str, List]:
        """Initialize solar industry-specific dummy data pools"""
        
        return {
            "first_names": [
                "John", "Sarah", "Michael", "Lisa", "David", "Jennifer", "Robert", "Emily",
                "William", "Ashley", "James", "Jessica", "Christopher", "Amanda", "Daniel", "Stephanie"
            ],
            
            "last_names": [
                "Solar", "Green", "Bright", "Power", "Energy", "Sun", "Light", "Clean",
                "Eco", "Renewable", "Efficient", "Sustainable", "Demo", "Example", "Test", "Sample"
            ],
            
            "streets": [
                "Solar Panel Lane", "Renewable Energy Drive", "Green Power Street", "Eco Friendly Way",
                "Sustainable Living Blvd", "Clean Energy Circle", "Solar Farm Road", "Sunshine Avenue",
                "Environmental Drive", "Energy Efficient Street", "Solar Solutions Way", "Green Tech Lane"
            ],
            
            "cities": [
                "Solar City", "Green Valley", "Renewable Heights", "Eco Town", "Sustainable Springs",
                "Clean Energy Hills", "Solar Vista", "Environmental Park", "Green Power Grove",
                "Energy Efficient Estates", "Solar Solutions Springs", "Demo City"
            ],
            
            "states": ["CA", "TX", "FL", "AZ", "NV", "NC", "NJ", "NY", "CO", "GA"],
            
            "roof_types": [
                "Asphalt Shingle", "Metal", "Tile", "Flat", "Slate", "Wood Shake"
            ],
            
            "lead_sources": [
                "Website Demo Form", "Solar Calculator Demo", "Demo Referral Program", 
                "Demo Facebook Ad", "Demo Google Search", "Demo Trade Show", 
                "Demo Neighborhood Canvass", "Demo Partner Referral"
            ],
            
            "solar_interests": [
                "Reduce Electric Bills", "Environmental Benefits", "Energy Independence",
                "Increase Home Value", "Government Incentives", "Backup Power",
                "Future-Proofing", "Technology Interest"
            ],
            
            "customer_journey_stages": [
                {"status": "New Lead", "days_ago": 0},
                {"status": "Qualified Lead", "days_ago": 3},
                {"status": "Consultation Scheduled", "days_ago": 7},
                {"status": "Site Assessment Complete", "days_ago": 14},
                {"status": "Proposal Sent", "days_ago": 21},
                {"status": "Contract Signed", "days_ago": 35},
                {"status": "Installation Scheduled", "days_ago": 49},
                {"status": "Installation Complete", "days_ago": 63}
            ],
            
            "staff_roles": [
                {
                    "name": "Demo Solar Sales Rep",
                    "role": "Sales Representative", 
                    "department": "Sales",
                    "specialization": "Residential Solar Consultation",
                    "phone": "(555) 100-SALES"
                },
                {
                    "name": "Demo Installation Manager",
                    "role": "Installation Manager",
                    "department": "Operations", 
                    "specialization": "Solar Panel Installation",
                    "phone": "(555) 200-INSTALL"
                },
                {
                    "name": "Demo Customer Success Rep",
                    "role": "Customer Success Manager",
                    "department": "Customer Service",
                    "specialization": "Post-Installation Support", 
                    "phone": "(555) 300-SUPPORT"
                },
                {
                    "name": "Demo System Designer",
                    "role": "System Designer",
                    "department": "Engineering",
                    "specialization": "Solar System Design & Engineering",
                    "phone": "(555) 400-DESIGN"
                },
                {
                    "name": "Demo Finance Specialist",
                    "role": "Finance Specialist", 
                    "department": "Finance",
                    "specialization": "Solar Financing & Incentives",
                    "phone": "(555) 500-FINANCE"
                }
            ]
        }
    
    async def generate_all_dummy_data(self, location_id: str) -> List[DummyDataResult]:
        """Generate all types of dummy data for a location"""
        
        results = []
        
        # Generate dummy contacts (representing customer journey)
        contacts_result = await self.generate_dummy_contacts(location_id, count=15)
        results.append(contacts_result)
        
        # Generate dummy staff members
        staff_result = await self.generate_dummy_staff(location_id)
        results.append(staff_result)
        
        # Generate dummy business profile
        business_result = await self.generate_dummy_business_profile(location_id)
        results.append(business_result)
        
        # Generate dummy appointments (representing scheduled consultations)
        appointments_result = await self.generate_dummy_appointments(location_id, count=8)
        results.append(appointments_result)
        
        # Generate dummy conversations (representing customer interactions)
        conversations_result = await self.generate_dummy_conversations(location_id, count=12)
        results.append(conversations_result)
        
        return results
    
    async def generate_dummy_contacts(self, location_id: str, count: int = 15) -> DummyDataResult:
        """Generate dummy solar prospect contacts representing different stages"""
        
        result = DummyDataResult(
            data_type=ExcludedDataTypeEnum.CONTACTS,
            dummy_count=0,
            examples=[]
        )
        
        contacts = []
        
        # Create contacts for each stage of the solar customer journey
        for i in range(count):
            contact = self._generate_single_contact(i)
            contacts.append(contact)
            
            # Create contact via API (in real implementation)
            success = await self._create_dummy_contact(location_id, contact)
            
            if success:
                result.dummy_count += 1
                result.examples.append(f"{contact['firstName']} {contact['lastName']} - {contact['tags'][0]}")
        
        return result
    
    def _generate_single_contact(self, index: int) -> Dict[str, Any]:
        """Generate a single dummy contact with solar-specific data"""
        
        # Select journey stage based on index
        stage_index = index % len(self.solar_data["customer_journey_stages"])
        stage = self.solar_data["customer_journey_stages"][stage_index]
        
        # Generate basic info
        first_name = f"{self.prefix}{random.choice(self.solar_data['first_names'])}"
        last_name = random.choice(self.solar_data['last_names'])
        
        # Create realistic but demo email
        email = f"{first_name.lower().replace('_', '')}.{last_name.lower()}@demo-solar-prospects.com"
        
        # Generate demo phone number
        area_code = random.choice(["555", "556", "557"])  # Demo area codes
        phone = f"({area_code}) {random.randint(100, 999)}-{random.randint(1000, 9999)}"
        
        # Generate demo address
        street_num = random.randint(100, 9999)
        street = random.choice(self.solar_data["streets"])
        city = random.choice(self.solar_data["cities"])
        state = random.choice(self.solar_data["states"])
        zip_code = f"{random.randint(10000, 99999)}"
        
        # Solar-specific data
        monthly_bill = random.choice([120, 180, 250, 320, 450, 600, 750, 900])
        home_sqft = random.choice([1200, 1500, 1800, 2200, 2500, 3000, 3500, 4000])
        roof_type = random.choice(self.solar_data["roof_types"])
        solar_interest = random.choice(self.solar_data["solar_interests"])
        lead_source = random.choice(self.solar_data["lead_sources"])
        
        return {
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "phone": phone,
            "address1": f"{street_num} {street}",
            "city": city,
            "state": state,
            "postalCode": zip_code,
            "country": "US",
            "tags": [stage["status"], "Demo Contact", "Solar Prospect"],
            "customFields": {
                "monthly_electric_bill": monthly_bill,
                "home_square_footage": home_sqft,
                "roof_type": roof_type,
                "solar_interest": solar_interest,
                "lead_source": lead_source,
                "estimated_system_size": round(monthly_bill / 120 * 6, 1),  # kW estimate
                "estimated_annual_savings": monthly_bill * 12 * 0.7,  # 70% savings estimate
                "demo_contact": True
            },
            "source": lead_source,
            "dateAdded": (datetime.utcnow() - timedelta(days=stage["days_ago"])).isoformat()
        }
    
    async def generate_dummy_staff(self, location_id: str) -> DummyDataResult:
        """Generate dummy staff members for the solar business"""
        
        result = DummyDataResult(
            data_type=ExcludedDataTypeEnum.STAFF,
            dummy_count=0,
            examples=[]
        )
        
        for staff_template in self.solar_data["staff_roles"]:
            staff_member = {
                "name": f"{self.prefix}{staff_template['name']}",
                "email": f"{staff_template['name'].lower().replace(' ', '.')}@demo-solar-company.com",
                "phone": staff_template["phone"],
                "role": staff_template["role"],
                "department": staff_template["department"],
                "specialization": staff_template["specialization"],
                "status": "Active",
                "demo_staff": True,
                "dateAdded": datetime.utcnow().isoformat()
            }
            
            # Create staff member via API (in real implementation)
            success = await self._create_dummy_staff_member(location_id, staff_member)
            
            if success:
                result.dummy_count += 1
                result.examples.append(f"{staff_member['name']} - {staff_member['role']}")
        
        return result
    
    async def generate_dummy_business_profile(self, location_id: str) -> DummyDataResult:
        """Generate dummy business profile information"""
        
        result = DummyDataResult(
            data_type=ExcludedDataTypeEnum.BUSINESS_PROFILE,
            dummy_count=1,
            examples=[]
        )
        
        business_profile = {
            "companyName": f"{self.prefix}Solar Company",
            "businessName": f"{self.prefix}Professional Solar Solutions",
            "email": "info@demo-solar-company.com",
            "phone": "(555) 123-SOLAR",
            "address": "123 Demo Solar Headquarters Drive",
            "city": "Demo City",
            "state": "DC",
            "postalCode": "12345",
            "country": "US",
            "website": "https://demo-solar-company.com",
            "industry": "Solar Energy Installation",
            "businessType": "Solar Contractor",
            "description": "Demo solar company specializing in residential and commercial solar panel installation. This is demonstration data for system testing and training purposes.",
            "services": [
                "Residential Solar Installation",
                "Commercial Solar Solutions", 
                "Solar System Design",
                "Energy Storage Solutions",
                "Solar Maintenance & Monitoring"
            ],
            "certifications": [
                "NABCEP Certified",
                "Licensed Electrical Contractor",
                "BBB Accredited Business",
                "Demo Certifications"
            ],
            "demo_profile": True,
            "dateUpdated": datetime.utcnow().isoformat()
        }
        
        # Update business profile via API (in real implementation)
        success = await self._update_dummy_business_profile(location_id, business_profile)
        
        if success:
            result.examples.append(f"{business_profile['companyName']} - {business_profile['industry']}")
        
        return result
    
    async def generate_dummy_appointments(self, location_id: str, count: int = 8) -> DummyDataResult:
        """Generate dummy appointments for solar consultations"""
        
        result = DummyDataResult(
            data_type=ExcludedDataTypeEnum.APPOINTMENTS,
            dummy_count=0,
            examples=[]
        )
        
        appointment_types = [
            "Solar Consultation", "Site Assessment", "Proposal Presentation",
            "Contract Signing", "Installation Planning", "System Inspection"
        ]
        
        for i in range(count):
            # Schedule appointments in the future
            days_ahead = random.randint(1, 30)
            appointment_date = datetime.utcnow() + timedelta(days=days_ahead)
            
            appointment = {
                "title": f"{self.prefix}{random.choice(appointment_types)}",
                "description": f"Demo solar appointment for system testing and training purposes",
                "startTime": appointment_date.isoformat(),
                "endTime": (appointment_date + timedelta(hours=1)).isoformat(),
                "appointmentStatus": "scheduled",
                "contactName": f"{self.prefix}Demo Customer {i+1}",
                "contactEmail": f"customer{i+1}@demo-solar-prospects.com",
                "contactPhone": f"(555) {random.randint(100, 999)}-{random.randint(1000, 9999)}",
                "assignedTo": f"{self.prefix}Demo Solar Rep",
                "demo_appointment": True
            }
            
            # Create appointment via API (in real implementation)
            success = await self._create_dummy_appointment(location_id, appointment)
            
            if success:
                result.dummy_count += 1
                result.examples.append(f"{appointment['title']} - {appointment_date.strftime('%Y-%m-%d')}")
        
        return result
    
    async def generate_dummy_conversations(self, location_id: str, count: int = 12) -> DummyDataResult:
        """Generate dummy conversation history"""
        
        result = DummyDataResult(
            data_type=ExcludedDataTypeEnum.CONVERSATIONS,
            dummy_count=0,
            examples=[]
        )
        
        conversation_topics = [
            "Initial Solar Inquiry",
            "System Size Discussion", 
            "Financing Options",
            "Installation Timeline",
            "Energy Savings Questions",
            "Roof Assessment Follow-up",
            "Proposal Questions",
            "Contract Details",
            "Installation Preparation",
            "System Monitoring Setup"
        ]
        
        for i in range(count):
            days_ago = random.randint(1, 60)
            conversation_date = datetime.utcnow() - timedelta(days=days_ago)
            
            conversation = {
                "contactName": f"{self.prefix}Demo Customer {(i % 10) + 1}",
                "subject": f"{self.prefix}{random.choice(conversation_topics)}",
                "type": random.choice(["phone", "email", "text", "in_person"]),
                "direction": random.choice(["inbound", "outbound"]),
                "status": "completed",
                "duration": random.randint(5, 45),  # minutes
                "notes": f"Demo conversation about solar installation. This is sample data for system testing and training purposes.",
                "assignedTo": f"{self.prefix}Demo Staff Member",
                "dateAdded": conversation_date.isoformat(),
                "demo_conversation": True
            }
            
            # Create conversation via API (in real implementation)
            success = await self._create_dummy_conversation(location_id, conversation)
            
            if success:
                result.dummy_count += 1
                result.examples.append(f"{conversation['subject']} - {conversation['type']}")
        
        return result
    
    # API interaction methods (implementation would depend on actual GHL API)
    
    async def _create_dummy_contact(self, location_id: str, contact_data: Dict) -> bool:
        """Create a dummy contact via GHL API"""
        # In real implementation, this would call the GHL contacts API
        # For now, return True to simulate success
        return True
    
    async def _create_dummy_staff_member(self, location_id: str, staff_data: Dict) -> bool:
        """Create a dummy staff member via GHL API"""
        # In real implementation, this would call the GHL users/staff API
        return True
    
    async def _update_dummy_business_profile(self, location_id: str, profile_data: Dict) -> bool:
        """Update business profile with dummy data via GHL API"""
        # In real implementation, this would call the GHL location settings API
        return True
    
    async def _create_dummy_appointment(self, location_id: str, appointment_data: Dict) -> bool:
        """Create a dummy appointment via GHL API"""
        # In real implementation, this would call the GHL calendar/appointments API
        return True
    
    async def _create_dummy_conversation(self, location_id: str, conversation_data: Dict) -> bool:
        """Create a dummy conversation via GHL API"""
        # In real implementation, this would call the GHL conversations API
        return True
    
    def get_dummy_data_summary(self) -> Dict[str, Any]:
        """Get summary of all dummy data that would be generated"""
        
        return {
            "total_data_types": 5,
            "data_types": {
                "contacts": {
                    "count": 15,
                    "description": "Demo solar prospects at various stages of the customer journey",
                    "stages_represented": len(self.solar_data["customer_journey_stages"])
                },
                "staff": {
                    "count": len(self.solar_data["staff_roles"]),
                    "description": "Demo staff members representing different roles in a solar business",
                    "roles": [role["role"] for role in self.solar_data["staff_roles"]]
                },
                "business_profile": {
                    "count": 1,
                    "description": "Demo business profile and company information"
                },
                "appointments": {
                    "count": 8,
                    "description": "Demo solar consultation and installation appointments"
                },
                "conversations": {
                    "count": 12,
                    "description": "Demo conversation history between staff and prospects"
                }
            },
            "data_markers": {
                "prefix": self.prefix,
                "email_domain": "demo-solar-company.com",
                "phone_area_codes": ["555", "556", "557"],
                "clear_demo_indicators": True
            },
            "security_notes": [
                "All data clearly marked as demo/test",
                "No real customer information",
                "Industry-appropriate but fictional",
                "Safe for training and demonstrations"
            ]
        }


# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_dummy_data_generator():
        """Test the dummy data generator"""
        
        generator = SolarDummyDataGenerator(
            agency_token="pit-c4e9d6af-8956-4a84-9b83-554fb6801a69",
            prefix="DEMO_"
        )
        
        print("🎭 Solar Dummy Data Generator Test")
        print("=" * 50)
        
        # Generate sample contact
        sample_contact = generator._generate_single_contact(0)
        print("\n📝 Sample Demo Contact:")
        print(f"Name: {sample_contact['firstName']} {sample_contact['lastName']}")
        print(f"Email: {sample_contact['email']}")
        print(f"Phone: {sample_contact['phone']}")
        print(f"Status: {sample_contact['tags'][0]}")
        print(f"Monthly Bill: ${sample_contact['customFields']['monthly_electric_bill']}")
        
        # Get summary
        summary = generator.get_dummy_data_summary()
        print(f"\n📊 Dummy Data Summary:")
        print(f"Total data types: {summary['total_data_types']}")
        print(f"Total contacts: {summary['data_types']['contacts']['count']}")
        print(f"Total staff: {summary['data_types']['staff']['count']}")
        print(f"Data prefix: {summary['data_markers']['prefix']}")
        
        print("\n✅ Dummy data generator test complete!")
    
    asyncio.run(test_dummy_data_generator())