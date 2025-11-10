/**
 * User-facing messages and notifications
 * Centralized messages for consistency and easy i18n implementation
 */

export const MESSAGES = {
  AUTH: {
    // Success messages
    LOGIN_SUCCESS: {
      title: 'Welcome back!',
      description: 'You have been successfully logged in.',
    },
    REGISTER_SUCCESS: {
      title: 'Account created!',
      description: 'Your account has been created successfully. Please check your email for verification.',
    },
    LOGOUT_SUCCESS: {
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    },
    PROFILE_COMPLETE_SUCCESS: {
      title: 'Profile completed!',
      description: 'Welcome to your POS system.',
    },

    // Error messages
    LOGIN_FAILED: {
      title: 'Login failed',
      description: 'Invalid email or password',
    },
    REGISTER_FAILED: {
      title: 'Registration failed',
      description: 'Failed to create account',
    },
    OAUTH_FAILED: {
      title: 'Authentication failed',
      description: 'Failed to complete authentication',
    },
    MISSING_FIELDS: {
      title: 'Error',
      description: 'Please fill in all required fields',
    },
    PASSWORDS_NOT_MATCH: {
      title: 'Error',
      description: 'Passwords do not match',
    },
    WEAK_PASSWORD: {
      title: 'Weak password',
      description: 'Please choose a stronger password with at least 8 characters',
    },
    ACCEPT_TERMS: {
      title: 'Error',
      description: 'Please accept the terms and conditions',
    },
    SESSION_EXPIRED: {
      title: 'Session expired',
      description: 'Please log in again',
    },
  },

  GENERAL: {
    ERROR: {
      title: 'Error',
      description: 'Something went wrong',
    },
    SUCCESS: {
      title: 'Success',
      description: 'Operation completed successfully',
    },
    LOADING: 'Loading...',
    SAVING: 'Saving...',
    DELETING: 'Deleting...',
  },
} as const

// Helper to create consistent toast messages
export const createToastMessage = (
  category: keyof typeof MESSAGES,
  key: string,
  customDescription?: string
): { title: string; description: string } => {
  const message = MESSAGES[category]?.[key as keyof typeof MESSAGES[typeof category]]

  if (!message || typeof message === 'string') {
    return { title: 'Notification', description: customDescription || '' }
  }

  // Type assertion since we know message has title and description after the check above
  const typedMessage = message as { title: string; description: string }

  return {
    title: typedMessage.title,
    description: customDescription || typedMessage.description,
  }
}
