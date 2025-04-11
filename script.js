// Firebase Configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// Auth UI Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeText = document.getElementById('welcome');

// API Configuration
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
    console.error('OpenAI API key not found. Please set OPENAI_API_KEY in your environment variables.');
}
const API_URL = 'https://api.openai.com/v1/chat/completions';

// DOM Elements
const chatContainer = document.querySelector('.chat-container');
const messagesContainer = document.querySelector('.messages');
const inputField = document.querySelector('textarea');
const sendButton = document.getElementById('sendBtn');
const settingsButton = document.getElementById('settingsBtn');
const settingsModal = document.querySelector('.settings-modal');
const closeSettingsButton = document.getElementById('closeSettings');
const saveSettingsButton = document.getElementById('saveSettings');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('model');
const temperatureInput = document.getElementById('temperature');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const transactionForm = document.getElementById('transactionForm');
const transactionsList = document.getElementById('transactionsList');
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');

// State
let chatHistory = [];
let transactions = [];
let currentTab = 'chat';
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing app");
    
    // Validate settings
    validateSettings();
    
    // Simple authentication check
    if (getSetting('data', 'useFirebase')) {
        checkAuthStatus();
    } else {
        console.log("Firebase is disabled in settings");
        // Set default user state
        currentUser = null;
        welcomeText.textContent = 'Not logged in';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
    
    loadSettings();
    setupAuthButtons();
    
    // Only load data if user is authenticated
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData();
        } else {
            currentUser = null;
            clearUserData();
        }
    });
    
    loadTransactions();
    updateTransactionsList();
    updateFinanceSummary();
    switchTab('chat');
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
        }
    });
});

// Simple authentication check
function checkAuthStatus() {
    const user = firebase.auth().currentUser;
    if (user) {
        console.log("User is signed in:", user.email);
        currentUser = user;
        welcomeText.textContent = `Welcome, ${user.displayName || user.email}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        console.log("No user is signed in");
        currentUser = null;
        welcomeText.textContent = 'Not logged in';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
}

// Mobile Sidebar Toggle
sidebarToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('expanded');
});

// Tab Switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        switchTab(tabId);
    });
});

function switchTab(tabId) {
    currentTab = tabId;
    
    // Update tab styles
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        }
    });
    
    // Update content visibility
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabId}Tab`) {
            content.classList.add('active');
        }
    });
}

// Auth Functions
function setupAuthButtons() {
    loginBtn.addEventListener('click', () => {
        console.log("Login button clicked");
        
        // Check if authentication is required
        if (!getSetting('auth', 'requireAuth')) {
            console.log("Authentication is not required");
            // Set a default user
            currentUser = { email: 'guest@example.com', displayName: 'Guest' };
            welcomeText.textContent = `Welcome, ${currentUser.displayName}`;
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            return;
        }
        
        // Create a simple email/password login form
        const loginForm = document.createElement('div');
        loginForm.className = 'auth-form';
        loginForm.innerHTML = `
            <h3>Login</h3>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="Enter your password">
            </div>
            <div class="form-buttons">
                <button id="emailLoginBtn">Login</button>
                <button id="cancelLoginBtn">Cancel</button>
            </div>
        `;
        
        // Add form to the auth section
        const authSection = document.querySelector('.auth-section');
        authSection.appendChild(loginForm);
        
        // Add event listeners
        document.getElementById('emailLoginBtn').addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                alert('Please enter both email and password');
                return;
            }
            
            // Check password requirements
            const passwordReqs = getSetting('auth', 'passwordRequirements');
            if (password.length < passwordReqs.minLength) {
                alert(`Password must be at least ${passwordReqs.minLength} characters long`);
                return;
            }
            
            // Try email/password login
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((result) => {
                    console.log("Login successful:", result.user);
                    authSection.removeChild(loginForm);
                    checkAuthStatus();
                })
                .catch((error) => {
                    console.error('Login error:', error);
                    alert(`Login failed: ${error.message}`);
                });
        });
        
        document.getElementById('cancelLoginBtn').addEventListener('click', () => {
            authSection.removeChild(loginForm);
        });
    });

    logoutBtn.addEventListener('click', () => {
        console.log("Logout button clicked");
        
        // Check if Firebase is enabled
        if (getSetting('data', 'useFirebase')) {
            firebase.auth().signOut()
                .then(() => {
                    console.log('Logged out successfully');
                    checkAuthStatus();
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                });
        } else {
            // Simple logout without Firebase
            currentUser = null;
            welcomeText.textContent = 'Not logged in';
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
        }
    });
}

function loadUserData() {
    if (!currentUser) return;
    
    // Load chat history from Firestore
    firebase.firestore().collection('users').doc(currentUser.uid).collection('chatHistory')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get()
        .then((snapshot) => {
            chatHistory = [];
            snapshot.forEach((doc) => {
                chatHistory.push(doc.data());
            });
            updateChatHistory();
        });

    // Load transactions from Firestore
    firebase.firestore().collection('users').doc(currentUser.uid).collection('transactions')
        .orderBy('date', 'desc')
        .get()
        .then((snapshot) => {
            transactions = [];
            snapshot.forEach((doc) => {
                transactions.push(doc.data());
            });
            updateTransactionsList();
            updateFinanceSummary();
        });
}

function clearUserData() {
    chatHistory = [];
    transactions = [];
    updateChatHistory();
    updateTransactionsList();
    updateFinanceSummary();
}

// Modified Chat Functions
function addMessage(content, isUser = false) {
    // Check if authentication is required
    if (getSetting('auth', 'requireAuth') && !currentUser) {
        alert('Please log in to use the chat');
        return;
    }
    
    // Check message length
    const maxLength = getSetting('chat', 'maxMessageLength');
    if (content.length > maxLength) {
        alert(`Message is too long. Maximum length is ${maxLength} characters.`);
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`;
    avatar.textContent = isUser ? 'U' : 'E';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Save to chat history if enabled
    if (getSetting('chat', 'saveHistory')) {
        chatHistory.push({ content, isUser });
        
        // Check if we need to limit the number of messages
        const maxMessages = getSetting('chat', 'maxMessages');
        if (chatHistory.length > maxMessages) {
            chatHistory = chatHistory.slice(-maxMessages);
        }
        
        // Save to localStorage if enabled
        if (getSetting('data', 'useLocalStorage')) {
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        }
    }
}

async function handleSendMessage() {
    const message = inputField.value.trim();
    if (message) {
        addMessage(message, true);
        inputField.value = '';
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: modelSelect.value || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are Esuvi, a helpful AI assistant.' },
                        ...chatHistory.map(msg => ({
                            role: msg.isUser ? 'user' : 'assistant',
                            content: msg.content
                        })),
                        { role: 'user', content: message }
                    ],
                    temperature: parseFloat(temperatureInput.value) || 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            addMessage(aiResponse, false);
        } catch (error) {
            console.error('Error:', error);
            addMessage('I apologize, but I encountered an error. Please check your API key and try again.', false);
        }
    }
}

// Finance Functions
function loadTransactions() {
    console.log('Loading transactions from localStorage');
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        console.log('Loaded transactions:', transactions);
    } else {
        console.log('No saved transactions found');
    }
}

function saveTransactions() {
    console.log('Saving transactions to localStorage:', transactions);
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function addTransaction(type, amount, description, category) {
    if (!currentUser) {
        alert('Please log in to add transactions');
        return;
    }

    if (!type || !amount || !description || !category) {
        console.error('Missing required transaction fields');
        return;
    }

    const transaction = {
        type,
        amount: parseFloat(amount),
        description,
        category,
        date: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    db.collection('users').doc(currentUser.uid).collection('transactions').add(transaction)
        .then(() => {
            transactions.unshift(transaction);
            updateTransactionsList();
            updateFinanceSummary();
        })
        .catch((error) => {
            console.error('Error saving transaction:', error);
            alert('Failed to save transaction. Please try again.');
        });
}

function updateTransactionsList() {
    if (!transactionsList) {
        console.error('Transactions list element not found');
        return;
    }

    transactionsList.innerHTML = '';
    
    if (transactions.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No transactions yet';
        transactionsList.appendChild(emptyMessage);
        return;
    }
    
    transactions.forEach(transaction => {
        const transactionDiv = document.createElement('div');
        transactionDiv.className = 'transaction-item';
        
        const info = document.createElement('div');
        info.className = 'transaction-info';
        
        const title = document.createElement('h4');
        title.textContent = transaction.description;
        
        const details = document.createElement('small');
        details.textContent = `${transaction.category} • ${new Date(transaction.date).toLocaleDateString()}`;
        
        const amount = document.createElement('div');
        amount.className = `transaction-amount ${transaction.type}`;
        amount.textContent = `${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}`;
        
        info.appendChild(title);
        info.appendChild(details);
        transactionDiv.appendChild(info);
        transactionDiv.appendChild(amount);
        transactionsList.appendChild(transactionDiv);
    });
}

function updateFinanceSummary() {
    const totalBalance = transactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);
    
    const monthlyIncome = transactions
        .filter(t => t.type === 'income' && isThisMonth(new Date(t.date)))
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = transactions
        .filter(t => t.type === 'expense' && isThisMonth(new Date(t.date)))
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalBalanceElement = document.getElementById('totalBalance');
    const monthlyIncomeElement = document.getElementById('monthlyIncome');
    const monthlyExpensesElement = document.getElementById('monthlyExpenses');
    
    if (totalBalanceElement) totalBalanceElement.textContent = `$${totalBalance.toFixed(2)}`;
    if (monthlyIncomeElement) monthlyIncomeElement.textContent = `$${monthlyIncome.toFixed(2)}`;
    if (monthlyExpensesElement) monthlyExpensesElement.textContent = `$${monthlyExpenses.toFixed(2)}`;
}

function isThisMonth(date) {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// Settings Functions
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    apiKeyInput.value = settings.apiKey || '';
    modelSelect.value = settings.model || 'gpt-3.5-turbo';
    temperatureInput.value = settings.temperature || 0.7;
}

function saveSettings() {
    const settings = {
        apiKey: apiKeyInput.value,
        model: modelSelect.value,
        temperature: parseFloat(temperatureInput.value)
    };
    localStorage.setItem('settings', JSON.stringify(settings));
    settingsModal.style.display = 'none';
}

// Event Listeners
sendButton.addEventListener('click', handleSendMessage);

inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
});

closeSettingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

saveSettingsButton.addEventListener('click', saveSettings);

transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    const formData = new FormData(transactionForm);
    const type = formData.get('type');
    const amount = formData.get('amount');
    const description = formData.get('description');
    const category = formData.get('category');
    
    console.log('Form data collected:', { type, amount, description, category });
    
    if (!type || !amount || !description || !category) {
        console.error('Missing form fields:', { type, amount, description, category });
        return;
    }
    
    addTransaction(type, amount, description, category);
    
    // Reset form and show success message
    transactionForm.reset();
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.textContent = 'Transaction added successfully!';
    transactionForm.appendChild(successMessage);
    setTimeout(() => successMessage.remove(), 3000);
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
}); 