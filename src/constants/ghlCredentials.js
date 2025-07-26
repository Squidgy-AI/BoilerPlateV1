// GHL Automation Credentials Constants
// These credentials are used for GoHighLevel login automation
// Business users get their own sub-accounts but automation uses these fixed credentials

export const GHL_AUTOMATION_CREDENTIALS = {
  BASE_EMAIL: 'info',
  EMAIL_DOMAIN: '@squidgy.net', 
  PASSWORD: 'Dummy@123',
  // Gmail app password for 2FA automation
  GMAIL_APP_PASSWORD: process.env.NEXT_PUBLIC_GHL_GMAIL_APP_PASSWORD || 'qfwfjrfedcjbzdam'
};

/**
 * Generate dynamic GHL login email with random string
 * Format: info+{random}@squidgy.net
 */
export const generateGHLEmail = () => {
  const randomString = Math.random().toString(36).substring(2, 8); // 6 character random string
  return `${GHL_AUTOMATION_CREDENTIALS.BASE_EMAIL}+${randomString}${GHL_AUTOMATION_CREDENTIALS.EMAIL_DOMAIN}`;
};

/**
 * Get base email for 2FA access (without +extension)
 */
export const getBase2FAEmail = () => {
  return `${GHL_AUTOMATION_CREDENTIALS.BASE_EMAIL}${GHL_AUTOMATION_CREDENTIALS.EMAIL_DOMAIN}`;
};

/**
 * Get GHL automation credentials for API calls
 */
export const getGHLCredentials = () => ({
  email: generateGHLEmail(),
  password: GHL_AUTOMATION_CREDENTIALS.PASSWORD,
  base_email: getBase2FAEmail(),
  gmail_app_password: GHL_AUTOMATION_CREDENTIALS.GMAIL_APP_PASSWORD
});