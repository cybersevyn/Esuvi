/**
 * Application Settings and Guardrails
 * 
 * This file defines the boundaries and constraints for the application.
 * Modify these settings to ensure the application stays within your requirements.
 */

const APP_SETTINGS = {
    // Authentication Settings
    auth: {
        // Authentication methods to enable
        methods: ['email', 'google'],
        
        // Whether to require authentication for all features
        requireAuth: true,
        
        // Features that don't require authentication
        publicFeatures: ['login', 'register'],
        
        // Session timeout in minutes (0 for no timeout)
        sessionTimeout: 60,
        
        // Password requirements
        passwordRequirements: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true
        }
    },
    
    // Chat Settings
    chat: {
        // Maximum number of messages to display
        maxMessages: 100,
        
        // Maximum length of a message
        maxMessageLength: 1000,
        
        // Whether to save chat history
        saveHistory: true,
        
        // Maximum number of chat sessions to save
        maxSessions: 10,
        
        // AI model to use
        defaultModel: 'gpt-3.5-turbo',
        
        // Temperature setting for AI responses (0-1)
        temperature: 0.7,
        
        // Maximum tokens for AI responses
        maxTokens: 1000
    },
    
    // Finance Settings
    finance: {
        // Whether to save transactions
        saveTransactions: true,
        
        // Maximum number of transactions to display
        maxTransactions: 100,
        
        // Categories for transactions
        categories: {
            income: ['salary', 'freelance', 'investment', 'other'],
            expense: ['food', 'transport', 'utilities', 'entertainment', 'other']
        },
        
        // Currency to use
        currency: 'USD',
        
        // Whether to show financial insights
        showInsights: true
    },
    
    // UI Settings
    ui: {
        // Theme to use
        theme: 'dark',
        
        // Whether to show animations
        animations: true,
        
        // Whether to show tooltips
        tooltips: true,
        
        // Whether to show notifications
        notifications: true,
        
        // Whether to show confirmation dialogs
        confirmations: true
    },
    
    // Data Settings
    data: {
        // Whether to use local storage
        useLocalStorage: true,
        
        // Whether to use Firebase
        useFirebase: true,
        
        // Whether to encrypt sensitive data
        encryptData: false,
        
        // Data retention period in days (0 for no limit)
        retentionPeriod: 365
    }
};

// Function to validate settings
function validateSettings() {
    // Check authentication settings
    if (APP_SETTINGS.auth.requireAuth && APP_SETTINGS.auth.publicFeatures.length === 0) {
        console.warn('Warning: Authentication is required but no public features are defined');
    }
    
    // Check chat settings
    if (APP_SETTINGS.chat.maxMessages < 10) {
        console.warn('Warning: Maximum messages is set to a low value');
    }
    
    // Check finance settings
    if (APP_SETTINGS.finance.categories.income.length === 0 || APP_SETTINGS.finance.categories.expense.length === 0) {
        console.warn('Warning: No categories defined for income or expenses');
    }
    
    // Check data settings
    if (!APP_SETTINGS.data.useLocalStorage && !APP_SETTINGS.data.useFirebase) {
        console.warn('Warning: No data storage method is enabled');
    }
}

// Function to get a setting
function getSetting(category, key) {
    if (APP_SETTINGS[category] && APP_SETTINGS[category][key] !== undefined) {
        return APP_SETTINGS[category][key];
    }
    console.warn(`Setting not found: ${category}.${key}`);
    return null;
}

// Function to update a setting
function updateSetting(category, key, value) {
    if (APP_SETTINGS[category] && APP_SETTINGS[category][key] !== undefined) {
        APP_SETTINGS[category][key] = value;
        return true;
    }
    console.warn(`Setting not found: ${category}.${key}`);
    return false;
}

// Export settings
window.APP_SETTINGS = APP_SETTINGS;
window.validateSettings = validateSettings;
window.getSetting = getSetting;
window.updateSetting = updateSetting; 