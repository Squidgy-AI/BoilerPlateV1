// src/config/calendarNotificationConfig.ts

export interface CalendarSetup {
  calendar_name: string;
  description: string;
  calendar_type: 'event' | 'personal' | 'round_robin';
  
  // Appointment settings
  slot_duration: number; // minutes
  slot_interval: number; // minutes
  slot_buffer: number; // minutes after appointment
  pre_buffer: number; // minutes before appointment
  
  // Booking rules
  allow_booking_after: number; // hours
  allow_booking_for: number; // days
  appointments_per_day: number | null;
  
  // Features
  auto_confirm: boolean;
  allow_reschedule: boolean;
  allow_cancellation: boolean;
  enable_recurring: boolean;
  
  // Availability
  availability_type: 'business_hours' | 'custom' | '24_7';
  business_hours: BusinessHours;
  
  // Policies
  confirmation_message: string;
  cancellation_policy: string;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  enabled: boolean;
  start: string; // "09:00"
  end: string;   // "17:00"
}

export interface NotificationPreferences {
  // Channels
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  fb_messenger_enabled: boolean;
  ghl_app_enabled: boolean;
  
  // Contact info
  email_address: string;
  phone_number: string;
  whatsapp_number: string;
  
  // Email preferences
  email_appointment_reminders: boolean;
  email_booking_confirmations: boolean;
  email_cancellations: boolean;
  email_reschedules: boolean;
  
  // SMS preferences
  sms_appointment_reminders: boolean;
  sms_booking_confirmations: boolean;
  sms_cancellations: boolean;
  sms_reschedules: boolean;
  
  // WhatsApp preferences
  whatsapp_appointment_reminders: boolean;
  whatsapp_booking_confirmations: boolean;
  whatsapp_cancellations: boolean;
  whatsapp_reschedules: boolean;
  
  // Timing
  reminder_hours_before: number;
  quiet_hours_start: string | null; // "22:00"
  quiet_hours_end: string | null;   // "08:00"
  timezone: string;

  // Legacy format for backwards compatibility (used in component state)
  email_booking?: boolean;
  email_reminder?: boolean;
  email_cancellation?: boolean;
  email_reschedule?: boolean;
  sms_booking?: boolean;
  sms_reminder?: boolean;
  sms_cancellation?: boolean;
  sms_reschedule?: boolean;
  whatsapp_booking?: boolean;
  whatsapp_reminder?: boolean;
  whatsapp_cancellation?: boolean;
  whatsapp_reschedule?: boolean;

  // General notification types (the three checkboxes)
  notification_confirmations?: boolean;
  notification_reminders?: boolean;
  notification_cancellations?: boolean;
}

// Default calendar setup
export const DEFAULT_CALENDAR_SETUP: CalendarSetup = {
  calendar_name: 'Solar Consultation Calendar',
  description: 'Schedule solar panel consultations and site assessments',
  calendar_type: 'event',
  
  slot_duration: 30,
  slot_interval: 30,
  slot_buffer: 15,
  pre_buffer: 15,
  
  allow_booking_after: 24,
  allow_booking_for: 30,
  appointments_per_day: null,
  
  auto_confirm: true,
  allow_reschedule: true,
  allow_cancellation: true,
  enable_recurring: false,
  
  availability_type: 'business_hours',
  business_hours: {
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '12:00' },
    sunday: { enabled: false, start: '09:00', end: '12:00' },
  },
  
  confirmation_message: 'Your solar consultation has been confirmed. We look forward to meeting with you!',
  cancellation_policy: 'Please cancel at least 24 hours in advance to allow others to book this time slot.',
};

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_enabled: true,
  sms_enabled: false,
  whatsapp_enabled: false,
  fb_messenger_enabled: true, // Auto-selected
  ghl_app_enabled: false, // Not selectable
  
  email_address: '',
  phone_number: '',
  whatsapp_number: '',
  
  email_appointment_reminders: true,
  email_booking_confirmations: true,
  email_cancellations: true,
  email_reschedules: true,
  
  sms_appointment_reminders: true,
  sms_booking_confirmations: true,
  sms_cancellations: true,
  sms_reschedules: true,
  
  whatsapp_appointment_reminders: true,
  whatsapp_booking_confirmations: true,
  whatsapp_cancellations: true,
  whatsapp_reschedules: true,
  
  reminder_hours_before: 24,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  timezone: 'America/New_York',
};

// Calendar type options
export const CALENDAR_TYPES = [
  { value: 'event', label: 'Event Calendar', description: 'For scheduled appointments and consultations' },
  { value: 'personal', label: 'Personal Calendar', description: 'Your personal availability calendar' },
  { value: 'round_robin', label: 'Round Robin', description: 'Distribute appointments among team members' },
];

// Notification channel info
export const NOTIFICATION_CHANNELS = [
  { 
    id: 'email',
    label: 'Email',
    icon: '📧',
    enabled_key: 'email_enabled',
    contact_field: 'email_address',
    placeholder: 'your@email.com',
  },
  { 
    id: 'sms',
    label: 'Text Message (SMS)',
    icon: '💬',
    enabled_key: 'sms_enabled',
    contact_field: 'phone_number',
    placeholder: '+1234567890',
  },
  { 
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '📱',
    enabled_key: 'whatsapp_enabled',
    contact_field: 'whatsapp_number',
    placeholder: '+1234567890',
  },
  { 
    id: 'fb_messenger',
    label: 'Facebook Messenger',
    icon: '💙',
    enabled_key: 'fb_messenger_enabled',
    contact_field: null,
    locked: true, // Always enabled
  },
];

// Notification types
export const NOTIFICATION_TYPES = [
  { key: 'appointment_reminders', label: 'Appointment Reminders' },
  { key: 'booking_confirmations', label: 'Booking Confirmations' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'reschedules', label: 'Reschedule Notifications' },
];

// Helper functions
export const saveCalendarSetup = async (setup: CalendarSetup): Promise<boolean> => {
  localStorage.setItem('calendarSetup', JSON.stringify(setup));
  // TODO: Also save to database
  return true;
};

export const getCalendarSetup = (): CalendarSetup => {
  const saved = localStorage.getItem('calendarSetup');
  if (saved) {
    try {
      return { ...DEFAULT_CALENDAR_SETUP, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_CALENDAR_SETUP;
    }
  }
  return DEFAULT_CALENDAR_SETUP;
};

export const saveNotificationPreferences = async (prefs: NotificationPreferences): Promise<boolean> => {
  localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
  // TODO: Also save to database
  return true;
};

export const getNotificationPreferences = (): NotificationPreferences => {
  const saved = localStorage.getItem('notificationPreferences');
  if (saved) {
    try {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
};