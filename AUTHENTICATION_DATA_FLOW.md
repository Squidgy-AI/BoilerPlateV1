# Authentication Data Flow Documentation

This document provides comprehensive step-by-step data flow documentation for the three main authentication processes in the Squidgy application.

## Table of Contents
1. [User Registration (Sign Up) Flow](#user-registration-sign-up-flow)
2. [User Login (Sign In) Flow](#user-login-sign-in-flow)
3. [Password Reset Flow](#password-reset-flow)
4. [Database Schema Overview](#database-schema-overview)

---

## User Registration (Sign Up) Flow

### Step-by-Step Process

#### 1. Frontend User Input Validation
- **Location**: `src/lib/auth-service.ts:43-56`
- **Process**:
  - Validates email format using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Validates password strength (8+ chars, uppercase, lowercase, number)
  - Validates full name (minimum 2 characters)
  - Throws specific error messages for invalid inputs

#### 2. Supabase Auth User Creation
- **Location**: `src/lib/auth-service.ts:61-69`
- **Process**:
  ```typescript
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email.toLowerCase(),
    password: userData.password,
    options: {
      data: {
        full_name: userData.fullName.trim(),
      }
    }
  });
  ```
- **Database Impact**: Creates record in `auth.users` table
- **Generated**: 
  - User ID (UUID)
  - Encrypted password
  - Email confirmation token (if email confirmation enabled)

#### 3. Profile Record Creation
- **Location**: `src/lib/auth-service.ts:92-108`
- **Process**:
  ```typescript
  const companyId = crypto.randomUUID(); // Generate company/firm ID
  const profileData = {
    id: authData.user.id,          // Links to auth.users.id
    user_id: uuidv4(),             // Internal user UUID
    email: userData.email.toLowerCase(),
    full_name: userData.fullName.trim(),
    profile_avatar_url: null,      // Updated field name
    company_id: companyId,         // This serves as firm_id
    role: 'member'
  };
  ```
- **Database Impact**: Creates record in `public.profiles` table
- **Generated**:
  - Internal `user_id` (UUID) - used for relationships
  - `company_id` (UUID) - serves as firm identifier

#### 4. Business Profile Creation
- **Location**: `src/lib/auth-service.ts:127-147`
- **Process**:
  ```typescript
  const { error: businessProfileError } = await supabase
    .from('business_profiles')
    .upsert({
      firm_user_id: profile.user_id,              // Links to profiles.user_id
      firm_id: companyId                           // Same as profiles.company_id
    }, {
      onConflict: 'firm_user_id'
    });
  ```
- **Database Impact**: Creates or updates record in `public.business_profiles` table using UPSERT
- **Purpose**: Separates business information from personal profile

#### 5. PersonalAssistant Agent Creation
- **Location**: `src/lib/auth-service.ts:149-181`
- **Process**:
  ```typescript
  const { error: agentError } = await supabase
    .from('squidgy_agent_business_setup')
    .insert({
      firm_id: companyId,                    // Same as profiles.company_id
      firm_user_id: profile.user_id,        // Links to profiles.user_id
      agent_id: 'PersonalAssistant',
      agent_name: 'Personal Assistant',
      setup_type: 'agent_config',           // Required type
      setup_json: personalAssistantConfig,
      is_enabled: true,
      session_id: sessionId
    });
  ```
- **Database Impact**: Creates default agent in `public.squidgy_agent_business_setup` table
- **Purpose**: Provides every user with a default AI assistant

#### 6. Error Handling & Cleanup
- **Location**: `src/lib/auth-service.ts:110-125`
- **Process**: If profile creation fails, attempts to cleanup auth user
- **Rollback**: Prevents orphaned records in auth.users table

### Data Created During Registration
1. **auth.users**: Authentication record with encrypted password
2. **public.profiles**: User profile with company_id and internal user_id
3. **public.business_profiles**: Business information linked to user
4. **public.squidgy_agent_business_setup**: Default PersonalAssistant agent

---

## User Login (Sign In) Flow

### Step-by-Step Process

#### 1. Frontend Input Validation
- **Location**: `src/lib/auth-service.ts:196-204`
- **Process**:
  - Validates email format
  - Ensures password is provided
  - Converts email to lowercase for consistency

#### 2. Supabase Authentication
- **Location**: `src/lib/auth-service.ts:207-222`
- **Process**:
  ```typescript
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: credentials.email.toLowerCase(),
    password: credentials.password,
  });
  ```
- **Database Impact**: 
  - Verifies credentials against `auth.users` table
  - Creates new session in `auth.sessions` table
  - Updates `last_sign_in_at` timestamp

#### 3. Profile Data Retrieval
- **Location**: `src/lib/auth-service.ts:228-237`
- **Process**:
  ```typescript
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();
  ```
- **Database Impact**: Fetches user profile from `public.profiles` table
- **Retrieved Data**:
  - User profile information
  - Company ID (firm_id)
  - Role and permissions
  - Profile avatar URL

#### 4. Session Management
- **Frontend**: Auth context updated with user and profile data
- **Backend**: JWT token contains user ID and session information
- **Security**: Row Level Security policies applied based on auth.uid()

### Data Accessed During Login
1. **auth.users**: Credential verification and session creation
2. **public.profiles**: User profile data for application use
3. **auth.sessions**: Session tracking and management

---

## Password Reset Flow

### Step-by-Step Process

#### 1. Password Reset Request
- **Location**: `src/lib/auth-service.ts:251-276`
- **Process**:
  ```typescript
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    data.email.toLowerCase(),
    {
      redirectTo: redirectUrl,
    }
  );
  ```
- **Email Validation**: Validates email format before sending
- **Database Impact**: 
  - Creates password reset token in Supabase Auth system
  - Sends email with reset link

#### 2. Email Processing
- **Service**: Supabase Auth handles email sending
- **Content**: Email contains magic link with embedded reset token
- **Redirect**: Link points to `/auth/reset-password` route
- **Security**: Token has expiration time (typically 1 hour)

#### 3. Token Verification & Password Update
- **Location**: `src/lib/auth-service.ts:285-308`
- **Process**:
  ```typescript
  const { error: updateError } = await supabase.auth.updateUser({
    password: data.newPassword
  });
  ```
- **Validation**: New password must meet strength requirements
- **Database Impact**: 
  - Updates encrypted password in `auth.users` table
  - Invalidates all existing sessions
  - User must login again with new password

#### 4. Session Invalidation
- **Security**: All existing sessions are terminated
- **Cleanup**: Forces re-authentication across all devices
- **User Experience**: User redirected to login page after successful reset

### Alternative: Custom Reset Table (Optional)
The schema includes `public.users_forgot_password` table for custom reset logic:
- **Purpose**: Track password reset requests with custom tokens
- **Fields**: `user_id`, `email`, `reset_token`, `token_expires_at`, `is_used`
- **Use Case**: When more control over reset process is needed

---

## Database Schema Overview

### Core Tables Relationships

```
auth.users (Supabase Auth)
    ↓ (id → id)
public.profiles
    ↓ (user_id → firm_user_id)
public.business_profiles
    
public.profiles
    ↓ (user_id → firm_user_id)
public.squidgy_agent_business_setup
    
public.profiles
    ↓ (user_id → user_id)
public.users_forgot_password
```

### Key Fields and Relationships

#### profiles table
- **id**: Links to `auth.users.id` (Supabase auth ID)
- **user_id**: Internal UUID for relationships
- **company_id**: Serves as firm_id across the system
- **profile_avatar_url**: Renamed from avatar_url

#### business_profiles table
- **firm_user_id**: Links to `profiles.user_id` (UNIQUE constraint for UPSERT)
- **firm_id**: Same as `profiles.company_id` - firm identifier
- **business_name**: NULL - populated later by user
- **business_email**: NULL - populated later by user
- **No RLS policies**: Full access allowed

#### squidgy_agent_business_setup table
- **firm_id**: Same as `profiles.company_id`
- **firm_user_id**: Links to `profiles.user_id`
- **setup_type**: Must be 'agent_config' for PersonalAssistant
- **Composite Primary Key**: (firm_user_id, agent_id, setup_type)

### Row Level Security (RLS)

#### Enabled Tables:
- **profiles**: Users can only view/update their own profile
- **squidgy_agent_business_setup**: Users can only access their own agent setups
- **users_forgot_password**: Users can view their own reset requests

#### No RLS:
- **business_profiles**: Full access allowed (as requested)

---

## Security Considerations

### Authentication Security
- Passwords encrypted using Supabase Auth's bcrypt implementation
- JWT tokens for session management with configurable expiration
- Rate limiting on login attempts (configurable in Supabase dashboard)

### Data Access Security
- Row Level Security policies prevent cross-user data access
- Foreign key constraints maintain data integrity
- Unique constraints prevent duplicate emails and user IDs

### Password Reset Security
- Tokens have short expiration times (typically 1 hour)
- Single-use tokens prevent replay attacks
- All sessions invalidated after password change

---

## Error Handling

### Common Error Scenarios
1. **Email already exists**: Handled during signup with specific error message
2. **Invalid credentials**: Generic "Invalid email or password" message
3. **Rate limiting**: Specific timeout guidance provided
4. **Network failures**: Retry logic and user-friendly error messages
5. **Database constraints**: Cleanup procedures to prevent orphaned records

### User Experience
- Clear, actionable error messages
- Progress indicators for multi-step processes
- Graceful degradation when optional steps fail (business_profiles, agent creation)
- Consistent error handling across all authentication flows

---

## Console Step-by-Step Flows

### 1. USER REGISTRATION CONSOLE FLOW

```
🚀 USER REGISTRATION STARTED
├── Input: { email: "john@example.com", password: "SecurePass123", fullName: "John Doe" }
│
├── STEP 1: Frontend Validation
│   ├── ✅ Email format valid: john@example.com
│   ├── ✅ Password strength valid: 8+ chars, uppercase, lowercase, number
│   └── ✅ Full name valid: "John Doe" (2+ characters)
│
├── STEP 2: Supabase Auth User Creation
│   ├── 📤 POST to supabase.auth.signUp()
│   ├── 💾 DATABASE: Insert into auth.users
│   │   ├── id: "auth-uuid-123"
│   │   ├── email: "john@example.com"
│   │   ├── encrypted_password: "[ENCRYPTED]"
│   │   └── email_confirmed_at: null
│   └── ✅ Auth user created successfully
│
├── STEP 3: Profile Record Creation
│   ├── 🎲 Generated company_id: "company-uuid-456"
│   ├── 🎲 Generated user_id: "user-uuid-789"
│   ├── 📤 INSERT into public.profiles
│   ├── 💾 DATABASE: profiles table
│   │   ├── id: "auth-uuid-123" (links to auth.users)
│   │   ├── user_id: "user-uuid-789" (internal UUID)
│   │   ├── email: "john@example.com"
│   │   ├── full_name: "John Doe"
│   │   ├── profile_avatar_url: null
│   │   ├── company_id: "company-uuid-456"
│   │   └── role: "member"
│   └── ✅ Profile created successfully
│
├── STEP 4: Business Profile Creation
│   ├── 📤 UPSERT into public.business_profiles
│   ├── 💾 DATABASE: business_profiles table
│   │   ├── id: "business-uuid-101" (auto-generated)
│   │   ├── firm_user_id: "user-uuid-789" (links to profiles.user_id)
│   │   ├── firm_id: "company-uuid-456" (same as profiles.company_id)
│   │   ├── business_name: null (populated later)
│   │   └── business_email: null (populated later)
│   └── ✅ Business profile created successfully
│
├── STEP 5: PersonalAssistant Agent Creation
│   ├── 🎲 Generated session_id: "session-uuid-111"
│   ├── 📤 INSERT into public.squidgy_agent_business_setup
│   ├── 💾 DATABASE: squidgy_agent_business_setup table
│   │   ├── firm_id: "company-uuid-456"
│   │   ├── firm_user_id: "user-uuid-789"
│   │   ├── agent_id: "PersonalAssistant"
│   │   ├── agent_name: "Personal Assistant"
│   │   ├── setup_type: "agent_config"
│   │   ├── setup_json: {"description": "Your general-purpose AI assistant", "capabilities": [...]}
│   │   ├── is_enabled: true
│   │   └── session_id: "session-uuid-111"
│   └── ✅ PersonalAssistant agent created successfully
│
└── 🎉 REGISTRATION COMPLETE
    ├── ✅ 4 database records created
    ├── 📧 Email confirmation sent (if enabled)
    └── 🔄 User ready for login
```

### 2. USER LOGIN CONSOLE FLOW

```
🔐 USER LOGIN STARTED
├── Input: { email: "john@example.com", password: "SecurePass123" }
│
├── STEP 1: Frontend Validation
│   ├── ✅ Email format valid: john@example.com
│   └── ✅ Password provided
│
├── STEP 2: Supabase Authentication
│   ├── 📤 POST to supabase.auth.signInWithPassword()
│   ├── 🔍 DATABASE: Query auth.users
│   │   ├── WHERE email = "john@example.com"
│   │   └── AND encrypted_password matches
│   ├── 💾 DATABASE: Insert into auth.sessions
│   │   ├── user_id: "auth-uuid-123"
│   │   ├── access_token: "[JWT_TOKEN]"
│   │   ├── refresh_token: "[REFRESH_TOKEN]"
│   │   └── expires_at: "2024-01-27T10:00:00Z"
│   ├── 💾 DATABASE: Update auth.users
│   │   └── last_sign_in_at: "2024-01-26T10:00:00Z"
│   └── ✅ Authentication successful
│
├── STEP 3: Profile Data Retrieval
│   ├── 📤 SELECT from public.profiles
│   ├── 🔍 DATABASE: Query profiles table
│   │   └── WHERE id = "auth-uuid-123"
│   ├── 📥 Retrieved profile data:
│   │   ├── user_id: "user-uuid-789"
│   │   ├── email: "john@example.com"
│   │   ├── full_name: "John Doe"
│   │   ├── profile_avatar_url: null
│   │   ├── company_id: "company-uuid-456"
│   │   └── role: "member"
│   └── ✅ Profile data loaded
│
├── STEP 4: Session Management
│   ├── 🔒 JWT token contains:
│   │   ├── sub: "auth-uuid-123"
│   │   ├── email: "john@example.com"
│   │   ├── role: "authenticated"
│   │   └── exp: 1706270400
│   ├── 🛡️ RLS policies activated for user_id: "auth-uuid-123"
│   └── 🌐 Frontend auth context updated
│
└── 🎉 LOGIN COMPLETE
    ├── ✅ User authenticated
    ├── ✅ Profile data available
    └── 🚀 User redirected to dashboard
```

### 3. PASSWORD RESET CONSOLE FLOW

```
🔄 PASSWORD RESET STARTED
├── Input: { email: "john@example.com" }
│
├── STEP 1: Reset Request
│   ├── ✅ Email format validation passed
│   ├── 🔍 DATABASE: Query profiles table
│   │   └── WHERE email = "john@example.com"
│   ├── ✅ User exists in profiles table
│   ├── 📤 POST to supabase.auth.resetPasswordForEmail()
│   ├── 🔍 DATABASE: Query auth.users
│   │   └── WHERE email = "john@example.com"
│   ├── 🎲 Generated reset token: "reset-token-xyz789"
│   ├── 💾 DATABASE: Store reset token in Supabase Auth
│   │   ├── token: "reset-token-xyz789"
│   │   ├── expires_at: "2024-01-26T11:00:00Z" (1 hour)
│   │   └── user_id: "auth-uuid-123"
│   └── ✅ Reset token created
│
├── STEP 2: Email Processing
│   ├── 📧 Supabase sends email to: john@example.com
│   ├── 📬 Email contains:
│   │   ├── Subject: "Reset your password"
│   │   ├── Magic link: "https://app.squidgy.net/auth/reset-password?token=reset-token-xyz789"
│   │   └── Expiry notice: "Link expires in 1 hour"
│   └── ✅ Email sent successfully
│
├── STEP 3: User Clicks Email Link
│   ├── 🌐 Browser navigates to: /auth/reset-password?token=reset-token-xyz789
│   ├── 🔍 Frontend extracts token from URL
│   ├── 📤 Supabase verifies token automatically
│   ├── 🔒 User temporarily authenticated via magic link
│   └── ✅ Reset page displayed
│
├── STEP 4: New Password Submission
│   ├── Input: { newPassword: "NewSecurePass456" }
│   ├── ✅ Password strength validation passed
│   ├── 📤 POST to supabase.auth.updateUser()
│   ├── 💾 DATABASE: Update auth.users
│   │   ├── encrypted_password: "[NEW_ENCRYPTED_PASSWORD]"
│   │   └── updated_at: "2024-01-26T10:30:00Z"
│   ├── 🔒 DATABASE: Invalidate all sessions
│   │   └── DELETE FROM auth.sessions WHERE user_id = "auth-uuid-123"
│   ├── 🗑️ Reset token marked as used/expired
│   └── ✅ Password updated successfully
│
├── STEP 5: Session Cleanup
│   ├── 🚪 All devices logged out automatically
│   ├── 🔄 User must login again with new password
│   └── 🛡️ Security: Previous sessions invalidated
│
└── 🎉 PASSWORD RESET COMPLETE
    ├── ✅ New password set
    ├── ✅ All sessions cleared
    └── 🔐 User redirected to login page
```

### ERROR SCENARIOS CONSOLE FLOW

```
❌ COMMON ERROR FLOWS

📧 Email Already Exists (Registration):
├── STEP 2: Supabase Auth Creation
├── 💥 ERROR: "User already registered"
├── 🔄 Cleanup: No auth.users record created
└── 📤 Response: "An account with this email already exists. Please try logging in instead."

🔐 Invalid Credentials (Login):
├── STEP 2: Authentication
├── 💥 ERROR: "Invalid login credentials"
├── 🛡️ Security: Rate limiting applied after 5 attempts
└── 📤 Response: "Invalid email or password"

⏰ Expired Reset Token (Password Reset):
├── STEP 4: Token Verification
├── 💥 ERROR: "Token expired or invalid"
├── 🗑️ Token cleanup performed
└── 📤 Response: "Reset link has expired. Please request a new one."

🚫 Rate Limiting (All Flows):
├── 🛡️ Too many requests detected
├── ⏱️ Cooldown period: 5-10 minutes
└── 📤 Response: "Too many attempts. Please wait and try again."

📧 Non-Existent Email (Password Reset):
├── STEP 1: Email Validation
├── 🔍 DATABASE: Query profiles table
├── ❌ No user found with email
├── 🛡️ Security: Don't reveal email doesn't exist
├── 📤 Response: "If an account exists with this email, a password reset link has been sent."
└── 📝 Log: Password reset attempted for non-existent email
```

---

## Technical Implementation Notes

### Frontend (Next.js + TypeScript)
- **Auth Service**: Centralized authentication logic
- **Context Provider**: Global auth state management
- **Form Validation**: Client-side validation with server-side verification
- **Error Boundaries**: Graceful error handling in UI components

### Backend (Supabase)
- **Auth System**: Built-in authentication with customizable policies
- **Database**: PostgreSQL with Row Level Security
- **Storage**: Profile avatars in Supabase Storage buckets
- **Real-time**: Optional real-time subscriptions for profile updates

### Database Design
- **Normalization**: Separate tables for profiles, business info, and agent configs
- **Scalability**: UUIDs for all primary keys, composite keys where appropriate
- **Flexibility**: JSON fields for extensible agent configurations
- **Performance**: Strategic indexes on commonly queried fields