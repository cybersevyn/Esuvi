// Firebase Configuration
const firebaseConfig = CONFIG.FIREBASE_CONFIG;

// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    } else {
        console.log("Firebase already initialized");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// Auth UI Elements
const loginBtn = document.getElementById('loginBtn');
const signUpBtn = document.getElementById('signUpBtn');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeText = document.getElementById('welcome');

// API Configuration
const API_KEY = CONFIG.OPENAI_API_KEY;
if (!API_KEY) {
    console.error('OpenAI API key not found. Please set OPENAI_API_KEY in config.js');
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
    
    // Initialize Firebase if enabled
    if (getSetting('data', 'useFirebase')) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log("Firebase initialized successfully");
            } else {
                console.log("Firebase already initialized");
            }
        } catch (error) {
            console.error("Firebase initialization error:", error);
        }
        
        // Set up auth state listener
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                loadUserData();
            } else {
                currentUser = null;
                clearUserData();
            }
        });
    } else {
        console.log("Firebase is disabled in settings");
        currentUser = null;
        welcomeText.textContent = 'Not logged in';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
    
    loadSettings();
    setupAuthButtons();
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

// Setup auth buttons
function setupAuthButtons() {
    // Google Sign-in
    loginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                console.log("Google sign-in successful:", result.user);
                // Create or update user document in Firestore
                return db.collection('users').doc(result.user.uid).set({
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoURL,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            })
            .then(() => {
                checkAuthStatus();
            })
            .catch((error) => {
                console.error("Google sign-in error:", error);
                // If Google sign-in fails, show email/password form
                createAuthForm('signin');
            });
    });

    // Sign Up button
    signUpBtn.addEventListener('click', () => {
        createAuthForm('signup');
    });

    // Logout button
    logoutBtn.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                console.log("Logout successful");
                checkAuthStatus();
            })
            .catch((error) => {
                console.error("Logout error:", error);
            });
    });
}

function createAuthForm(type) {
    const authSection = document.querySelector('.auth-section');
    const existingForm = document.querySelector('.auth-form');
    if (existingForm) {
        authSection.removeChild(existingForm);
    }

    const authForm = document.createElement('div');
    authForm.className = 'auth-form';
    authForm.innerHTML = `
        <h3>${type === 'signup' ? 'Create Account' : 'Sign In'}</h3>
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="Enter your email" required>
        </div>
        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Enter your password" required>
        </div>
        <div class="form-buttons">
            <button id="submitAuthBtn">${type === 'signup' ? 'Sign Up' : 'Sign In'}</button>
            <button id="cancelAuthBtn">Cancel</button>
        </div>
    `;
    
    authSection.appendChild(authForm);
    
    document.getElementById('submitAuthBtn').addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        if (type === 'signup') {
            // Check password requirements
            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }
            
            auth.createUserWithEmailAndPassword(email, password)
                .then((result) => {
                    console.log("Sign up successful:", result.user);
                    // Create user document in Firestore
                    return db.collection('users').doc(result.user.uid).set({
                        email: result.user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        settings: {
                            theme: 'dark',
                            notifications: true
                        }
                    });
                })
                .then(() => {
                    authSection.removeChild(authForm);
                    checkAuthStatus();
                })
                .catch((error) => {
                    console.error("Sign up error:", error);
                    alert(`Sign up failed: ${error.message}`);
                });
        } else {
            auth.signInWithEmailAndPassword(email, password)
                .then((result) => {
                    console.log("Sign in successful:", result.user);
                    authSection.removeChild(authForm);
                    checkAuthStatus();
                })
                .catch((error) => {
                    console.error("Sign in error:", error);
                    alert(`Sign in failed: ${error.message}`);
                });
        }
    });
    
    document.getElementById('cancelAuthBtn').addEventListener('click', () => {
        authSection.removeChild(authForm);
    });
}

function checkAuthStatus() {
    const user = auth.currentUser;
    if (user) {
        console.log("User is signed in:", user.email);
        welcomeText.textContent = `Welcome, ${user.displayName || user.email}`;
        loginBtn.style.display = 'none';
        signUpBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        // Load user data
        loadUserData();
    } else {
        console.log("No user is signed in");
        welcomeText.textContent = 'Not logged in';
        loginBtn.style.display = 'block';
        signUpBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        
        // Clear user data
        clearUserData();
    }
}

// Initialize auth state listener
auth.onAuthStateChanged((user) => {
    checkAuthStatus();
});

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
    if (!message) return;
    
    // Add user message to chat
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
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are Esuvi, a helpful AI assistant.' },
                    ...chatHistory.map(msg => ({
                        role: msg.isUser ? 'user' : 'assistant',
                        content: msg.content
                    })),
                    { role: 'user', content: message }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        addMessage(aiResponse, false);
        
        // Save to Firestore if user is authenticated
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).collection('chatHistory').add({
                content: message,
                isUser: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            db.collection('users').doc(auth.currentUser.uid).collection('chatHistory').add({
                content: aiResponse,
                isUser: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('I apologize, but I encountered an error. Please try again.', false);
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
    if (!auth.currentUser) {
        alert('Please log in to add transactions');
        return;
    }

    const transaction = {
        type,
        amount: parseFloat(amount),
        description,
        category,
        date: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('users').doc(auth.currentUser.uid).collection('transactions').add(transaction)
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