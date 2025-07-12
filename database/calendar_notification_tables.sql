-- Create calendar setup table for business users
CREATE TABLE IF NOT EXISTS public.business_calendar_setup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_user_id UUID NOT NULL,
  calendar_name VARCHAR(255) NOT NULL,
  description TEXT,
  calendar_type VARCHAR(50) DEFAULT 'event', -- event, personal, round_robin, etc.
  
  -- Appointment settings
  slot_duration INTEGER DEFAULT 30, -- in minutes
  slot_interval INTEGER DEFAULT 30, -- in minutes
  slot_buffer INTEGER DEFAULT 0, -- buffer time after appointment
  pre_buffer INTEGER DEFAULT 0, -- buffer time before appointment
  
  -- Booking rules
  allow_booking_after INTEGER DEFAULT 24, -- minimum notice in hours
  allow_booking_for INTEGER DEFAULT 30, -- how many days ahead can book
  appointments_per_day INTEGER, -- max appointments per day
  
  -- Features
  auto_confirm BOOLEAN DEFAULT true,
  allow_reschedule BOOLEAN DEFAULT true,
  allow_cancellation BOOLEAN DEFAULT true,
  enable_recurring BOOLEAN DEFAULT false,
  
  -- Availability
  availability_type VARCHAR(20) DEFAULT 'business_hours', -- business_hours, custom, 24_7
  business_hours JSONB DEFAULT '{}', -- Store day-wise hours
  custom_availability JSONB DEFAULT '[]', -- Store custom availability slots
  
  -- Additional settings
  confirmation_message TEXT,
  cancellation_policy TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_user_calendar UNIQUE (firm_user_id)
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.business_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_user_id UUID NOT NULL,
  
  -- Notification channels
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  fb_messenger_enabled BOOLEAN DEFAULT true, -- Auto-selected as per requirement
  ghl_app_enabled BOOLEAN DEFAULT false, -- Not selectable for now
  
  -- Email preferences
  email_address VARCHAR(255),
  email_appointment_reminders BOOLEAN DEFAULT true,
  email_booking_confirmations BOOLEAN DEFAULT true,
  email_cancellations BOOLEAN DEFAULT true,
  email_reschedules BOOLEAN DEFAULT true,
  
  -- SMS preferences  
  phone_number VARCHAR(50),
  sms_appointment_reminders BOOLEAN DEFAULT true,
  sms_booking_confirmations BOOLEAN DEFAULT true,
  sms_cancellations BOOLEAN DEFAULT true,
  sms_reschedules BOOLEAN DEFAULT true,
  
  -- WhatsApp preferences
  whatsapp_number VARCHAR(50),
  whatsapp_appointment_reminders BOOLEAN DEFAULT true,
  whatsapp_booking_confirmations BOOLEAN DEFAULT true,
  whatsapp_cancellations BOOLEAN DEFAULT true,
  whatsapp_reschedules BOOLEAN DEFAULT true,
  
  -- Timing preferences
  reminder_hours_before INTEGER DEFAULT 24, -- Send reminder X hours before
  quiet_hours_start TIME, -- Don't send notifications before this time
  quiet_hours_end TIME, -- Don't send notifications after this time
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_user_notifications UNIQUE (firm_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_setup_user 
ON public.business_calendar_setup(firm_user_id);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user 
ON public.business_notification_preferences(firm_user_id);

-- Grant permissions
GRANT ALL ON public.business_calendar_setup TO anon, authenticated;
GRANT ALL ON public.business_notification_preferences TO anon, authenticated;

-- Enable RLS (Row Level Security)
ALTER TABLE public.business_calendar_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow users to manage their own records
CREATE POLICY "Users can manage their own calendar setup" 
ON public.business_calendar_setup
FOR ALL 
USING (auth.uid() = firm_user_id);

CREATE POLICY "Users can manage their own notification preferences" 
ON public.business_notification_preferences
FOR ALL 
USING (auth.uid() = firm_user_id);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_setup_updated_at 
BEFORE UPDATE ON public.business_calendar_setup 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_prefs_updated_at 
BEFORE UPDATE ON public.business_notification_preferences 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();