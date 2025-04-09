// API Configuration
const API_KEY = 'YOUR_API_KEY_HERE';
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
const financeForm = document.getElementById('financeForm');
const transactionsList = document.getElementById('transactionsList');

// State
let chatHistory = [];
let transactions = [];
let currentTab = 'chat';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadTransactions();
    updateTransactionsList();
    updateFinanceSummary();
    switchTab('chat');
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

// Chat Functions
function addMessage(content, isUser = false) {
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
    
    // Save to chat history
    chatHistory.push({ content, isUser });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function handleSendMessage() {
    const message = inputField.value.trim();
    if (message) {
        addMessage(message, true);
        inputField.value = '';
        // Here you would typically make an API call to your AI service
        // For now, we'll just echo back a response
        setTimeout(() => {
            addMessage('I am Esuvi, your AI assistant. How can I help you today?');
        }, 1000);
    }
}

// Finance Functions
function loadTransactions() {
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }
}

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function addTransaction(type, amount, description, category) {
    const transaction = {
        id: Date.now(),
        type,
        amount: parseFloat(amount),
        description,
        category,
        date: new Date().toISOString()
    };
    
    transactions.unshift(transaction);
    saveTransactions();
    updateTransactionsList();
    updateFinanceSummary();
}

function updateTransactionsList() {
    transactionsList.innerHTML = '';
    
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
    
    document.getElementById('totalBalance').textContent = `$${totalBalance.toFixed(2)}`;
    document.getElementById('monthlyIncome').textContent = `$${monthlyIncome.toFixed(2)}`;
    document.getElementById('monthlyExpenses').textContent = `$${monthlyExpenses.toFixed(2)}`;
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

financeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(financeForm);
    addTransaction(
        formData.get('type'),
        formData.get('amount'),
        formData.get('description'),
        formData.get('category')
    );
    financeForm.reset();
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
}); 