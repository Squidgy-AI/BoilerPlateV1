-- Create tables for SOL Agent Progressive Setup
-- Run this in your Supabase SQL editor

-- 1. Solar Configurations Table
CREATE TABLE IF NOT EXISTS solar_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) for solar_configurations
ALTER TABLE solar_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own solar configurations
CREATE POLICY "Users can manage their own solar configurations" ON solar_configurations
    FOR ALL USING (auth.uid()::text = user_id::text);

-- 2. Calendar Setups Table
CREATE TABLE IF NOT EXISTS calendar_setups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    setup_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for calendar_setups
ALTER TABLE calendar_setups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own calendar setups
CREATE POLICY "Users can manage their own calendar setups" ON calendar_setups
    FOR ALL USING (auth.uid()::text = user_id::text);

-- 3. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    preferences_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own notification preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_solar_configurations_user_id ON solar_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_solar_configurations_active ON solar_configurations(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_calendar_setups_user_id ON calendar_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_setups_active ON calendar_setups(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_active ON notification_preferences(user_id, is_active);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to automatically update updated_at
CREATE TRIGGER update_solar_configurations_updated_at BEFORE UPDATE ON solar_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_setups_updated_at BEFORE UPDATE ON calendar_setups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();