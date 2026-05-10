// Global variables
let currentDocumentId = null;
let currentDocumentName = null;

// API Configuration
const API_BASE_URL = window.location.origin;

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const chatSection = document.getElementById('chatSection');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const chatForm = document.getElementById('chatForm');
const questionInput = document.getElementById('questionInput');
const messages = document.getElementById('messages');
const docName = document.getElementById('docName');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

// File input change handler
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = `Selected: ${file.name}`;
        uploadBtn.style.display = 'inline-block';
        uploadStatus.textContent = '';
        uploadStatus.className = 'status-message';
    }
});

// Upload form submit handler
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = fileInput.files[0];
    if (!file) {
        showStatus('Please select a file', 'error');
        return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.txt') && !fileName.endsWith('.csv')) {
        showStatus('Please upload a PDF, TXT, or CSV file', 'error');
        return;
    }

    showLoading('Uploading and indexing document...');

    const formData = new FormData();
    formData.append('document', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentDocumentId = data.documentId;
            currentDocumentName = data.documentName;
            
            showStatus(`✓ Successfully indexed ${data.chunksCount} chunks`, 'success');
            
            setTimeout(() => {
                showChatInterface();
            }, 1500);
        } else {
            showStatus(`Error: ${data.error || 'Upload failed'}`, 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
});

// Chat form submit handler
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const question = questionInput.value.trim();
    if (!question) return;

    // Add user message to chat
    addMessage(question, 'user');
    questionInput.value = '';

    // Show loading
    showLoading('Searching document and generating answer...');

    try {
        const response = await fetch(`${API_BASE_URL}/api/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                documentId: currentDocumentId,
                question: question
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Add bot response to chat
            addMessage(data.answer, 'bot', data.sources);
        } else {
            addMessage(`Error: ${data.error || 'Failed to get answer'}`, 'bot');
        }
    } catch (error) {
        console.error('Query error:', error);
        addMessage(`Error: ${error.message}`, 'bot');
    } finally {
        hideLoading();
    }
});

// Helper Functions

function showChatInterface() {
    uploadSection.style.display = 'none';
    chatSection.style.display = 'flex';
    docName.textContent = currentDocumentName;
    questionInput.focus();
}

function addMessage(content, type, sources = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Format the content with better styling
    const formattedContent = formatText(content);
    contentDiv.innerHTML = formattedContent;
    
    messageDiv.appendChild(contentDiv);

    // Add sources if available
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'sources';
        
        const sourcesTitle = document.createElement('div');
        sourcesTitle.className = 'sources-title';
        sourcesTitle.textContent = '📚 Sources:';
        sourcesDiv.appendChild(sourcesTitle);

        sources.forEach((source, idx) => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.textContent = `• Page ${source.page}: ${source.preview}`;
            sourcesDiv.appendChild(sourceItem);
        });

        contentDiv.appendChild(sourcesDiv);
    }

    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

// Format text with markdown-like features
function formatText(text) {
    // Escape HTML to prevent XSS
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert numbered lists (1. 2. 3.)
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="list-item numbered">$1. $2</div>');
    
    // Convert bullet points (- or *)
    formatted = formatted.replace(/^[-•]\s+(.+)$/gm, '<div class="list-item bullet">• $1</div>');
    
    // Convert line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraph
    formatted = '<p>' + formatted + '</p>';
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\/p>/g, '');
    
    return formatted;
}

function showStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `status-message ${type}`;
}

function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function resetApp() {
    currentDocumentId = null;
    currentDocumentName = null;
    
    uploadSection.style.display = 'flex';
    chatSection.style.display = 'none';
    
    fileInput.value = '';
    fileName.textContent = '';
    uploadBtn.style.display = 'none';
    uploadStatus.textContent = '';
    uploadStatus.className = 'status-message';
    
    // Clear chat messages except the initial greeting
    messages.innerHTML = `
        <div class="message bot-message">
            <div class="message-content">
                👋 Hello! I'm ready to answer questions about your document. What would you like to know?
            </div>
        </div>
    `;
}

// Check server health on load
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        console.log('Server status:', data);
    } catch (error) {
        console.error('Server health check failed:', error);
    }
}

// Initialize
checkServerHealth();
