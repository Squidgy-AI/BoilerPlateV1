# 🔍 How to Test Solar Assistant Snapshot in GHL UI

## 🎯 Step-by-Step Testing Process

### Step 1: Import the Snapshot
1. **Login to your GHL account**
2. **Create a NEW test location** (don't use existing ones)
   - Go to Agency Dashboard
   - Click "Add Location" 
   - Name it: "TEST - Solar Import"
   - Complete the setup

3. **Import the snapshot:**
   - Use this link: https://affiliates.gohighlevel.com/?share=EeLhTqeazpgPDfH5cmxK
   - Click the link, it will open GHL
   - Select your TEST location (not the original!)
   - Click "Import Snapshot"
   - Wait for import to complete

### Step 2: Verify All Components Imported

#### 🔄 Check Workflows & Automations
**Path: Automation → Workflows**
```
Expected Solar Workflows:
✓ Solar Lead Qualification Workflow
✓ Solar Appointment Booking Flow
✓ Solar Follow-up Sequences
✓ Solar Proposal Automation
✓ Solar Customer Onboarding
```

**What to Check:**
- Are all workflows present?
- Do triggers work correctly?
- Are email/SMS templates attached?
- Are delays and conditions set up?

#### 📊 Check Pipelines & Stages
**Path: Opportunities → Pipelines**
```
Expected Solar Pipeline Stages:
✓ New Lead
✓ Qualified Lead
✓ Appointment Scheduled
✓ Proposal Sent
✓ Contract Signed
✓ Installation Scheduled
✓ Installed/Complete
```

**What to Check:**
- Are all pipeline stages present?
- Are stage actions configured?
- Are automation triggers set up?

#### 📝 Check Custom Fields
**Path: Settings → Custom Fields**
```
Expected Solar Custom Fields:
✓ Solar System Size (kW)
✓ Annual Energy Usage
✓ Roof Type
✓ Home Square Footage
✓ Electric Bill Amount
✓ Installation Address
✓ Financing Option
✓ Solar Savings Estimate
```

**What to Check:**
- Are all solar-specific fields present?
- Are field types correct (text, number, dropdown)?
- Are dropdown options populated?

#### 📧 Check Email Templates
**Path: Marketing → Templates → Email**
```
Expected Solar Email Templates:
✓ Solar Welcome Email
✓ Appointment Confirmation
✓ Solar Proposal Follow-up
✓ Contract Reminder
✓ Installation Updates
✓ Post-Installation Survey
```

**What to Check:**
- Are all templates present?
- Do templates have solar-specific content?
- Are merge fields working?
- Are images/branding included?

#### 📱 Check SMS Templates
**Path: Marketing → Templates → SMS**
```
Expected Solar SMS Templates:
✓ Appointment Reminders
✓ Proposal Follow-up
✓ Contract Reminders
✓ Installation Updates
```

#### 📋 Check Forms & Surveys
**Path: Sites → Forms** and **Marketing → Surveys**
```
Expected Solar Forms:
✓ Solar Qualification Form
✓ Energy Usage Calculator
✓ Roof Assessment Form
✓ Installation Questionnaire
✓ Customer Satisfaction Survey
```

**What to Check:**
- Are all forms present?
- Do forms have solar-specific questions?
- Are form submissions routed correctly?
- Are custom fields mapped?

#### 🌐 Check Funnels & Websites
**Path: Sites → Funnels** and **Sites → Websites**
```
Expected Solar Funnels:
✓ Solar Landing Pages
✓ Energy Calculator Pages
✓ Proposal Request Pages
✓ Testimonial Pages
```

**What to Check:**
- Are all funnels/websites present?
- Do pages load correctly?
- Are forms connected?
- Is solar branding present?

#### 📅 Check Calendars
**Path: Calendars**
```
Expected Solar Calendars:
✓ Solar Consultation Calendar
✓ Site Assessment Calendar
✓ Installation Calendar
✓ Follow-up Call Calendar
```

**What to Check:**
- Are all calendars present?
- Are availability settings correct?
- Are confirmation emails set up?
- Are buffer times configured?

#### 🏷️ Check Tags
**Path: Contacts → Tags**
```
Expected Solar Tags:
✓ Solar Lead
✓ Qualified Solar Prospect
✓ Solar Appointment Scheduled
✓ Proposal Sent
✓ Solar Customer
✓ Installation Complete
```

#### ⚡ Check Triggers
**Path: Automation → Triggers**
```
Expected Solar Triggers:
✓ New Solar Lead Created
✓ Form Submission Triggers
✓ Opportunity Stage Changes
✓ Appointment Booking Triggers
```

### Step 3: Test Functionality

#### 🧪 Test a Complete Solar Lead Flow:
1. **Submit a test form** (use solar qualification form)
2. **Check if contact is created** with proper tags
3. **Verify workflow triggers** start automatically
4. **Check pipeline assignment** (should be in "New Lead" stage)
5. **Test automation sequences** (emails/SMS should be sent)
6. **Move through pipeline stages** and verify triggers work

#### 📊 Test Custom Fields:
1. **Create a new contact**
2. **Fill in solar custom fields**
3. **Verify fields save correctly**
4. **Check if fields appear in templates**

#### 📧 Test Email Templates:
1. **Send test emails** using solar templates
2. **Check merge fields** populate correctly
3. **Verify solar branding** and content

### Step 4: Compare with Original

#### 🔍 Side-by-Side Comparison:
1. **Open original location** (JUTFTny8EXQOSB5NcvAA) in one tab
2. **Open test location** in another tab
3. **Compare each section** to ensure everything copied correctly

**Key Things to Verify:**
- ✅ All workflows have same triggers and actions
- ✅ Pipeline stages match exactly
- ✅ Custom fields are identical
- ✅ Email templates have same content
- ✅ Forms have same questions and routing
- ✅ Calendars have same settings
- ✅ Tags are all present

### Step 5: Document Results

Create a checklist like this:
```
Solar Assistant Snapshot Import Test Results:
□ Workflows imported successfully (X out of Y)
□ Pipeline stages imported successfully  
□ Custom fields imported successfully
□ Email templates imported successfully
□ SMS templates imported successfully
□ Forms imported successfully
□ Funnels/websites imported successfully
□ Calendars imported successfully
□ Tags imported successfully
□ Triggers imported successfully

Issues Found:
- [List any missing components]
- [List any broken functionality]
- [List any incorrect configurations]
```

## 🚨 What to Watch For

### ❌ Common Issues:
- **Missing integrations** (Zapier, third-party tools)
- **Broken form submissions** (webhook URLs)
- **Missing images** in templates/funnels
- **Incorrect domain links** in funnels
- **Calendar timezone issues**
- **Incomplete automation triggers**

### ✅ Success Indicators:
- All 26 components imported
- Test lead flows work end-to-end
- Emails/SMS send correctly
- Forms capture and route properly
- Calendars book appointments correctly
- Pipeline automation functions

## 📞 Need Help?

If anything is missing or broken:
1. **Document exactly what's missing**
2. **Check the original location** to see if it exists there
3. **Try re-importing** if major components are missing
4. **Contact GHL support** if core functionality is broken

## 🎉 Success!

If everything checks out, you've successfully verified that the Solar Assistant snapshot includes all components and can be imported to recreate the full solar lead management system in a new location!