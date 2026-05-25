/**
 * Home Page Logic
 * Handles: Documents listing, Forum highlights fetching, Chat preview loading
 */

const API = window.AppConfig?.API || 'http://localhost:3000/api';

// ===== DOCUMENT HANDLING =====

let currentView = localStorage.getItem('doc_view') || 'list';
let documents = [];
let filteredDocuments = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  setView(currentView);
  fetchDocuments();
  fetchForumHighlights();
  fetchChatPreview();
});

// Fetch documents from server
async function fetchDocuments() {
  try {
    const token = window.Auth?.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await fetch(`${API}/documents`, { headers });
    if (!response.ok) throw new Error('Failed to fetch documents');
    
    documents = await response.json();
    filterAndRenderDocuments();
  } catch (error) {
    console.error('Error fetching documents:', error);
    document.getElementById('doc-list').innerHTML = `
      <p style="color: var(--clr-muted); text-align: center; padding: 20px;">
        Failed to load documents. Please try again.
      </p>
    `;
  }
}

// Filter documents
function handleFilter() {
  filterAndRenderDocuments();
}

function filterAndRenderDocuments() {
  const searchQuery = document.getElementById('search-q')?.value.toLowerCase() || '';
  const typeFilter = document.getElementById('type-filter')?.value || 'all';
  const dateFilter = document.getElementById('date-filter')?.value || '';

  filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.name?.toLowerCase().includes(searchQuery) ||
      doc.description?.toLowerCase().includes(searchQuery) ||
      doc.field?.toLowerCase().includes(searchQuery);
    
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    
    const matchesDate = !dateFilter || 
      (doc.uploaded_at && doc.uploaded_at.startsWith(dateFilter));
    
    return matchesSearch && matchesType && matchesDate;
  });

  updateCountPill();
  renderDocuments();
}

// Render documents based on view
function renderDocuments() {
  const container = document.getElementById('doc-list');
  
  if (filteredDocuments.length === 0) {
    container.innerHTML = `
      <p style="color: var(--clr-muted); text-align: center; padding: 40px 20px;">
        No documents found. <a href="#" onclick="openUpload()" style="color: var(--clr-primary); font-weight: 600;">Upload one →</a>
      </p>
    `;
    return;
  }

  if (currentView === 'list') {
    renderListView();
  } else if (currentView === 'grid') {
    renderGridView();
  } else if (currentView === 'compact') {
    renderCompactView();
  }
}

function renderListView() {
  const container = document.getElementById('doc-list');
  container.style.display = 'block';
  container.innerHTML = filteredDocuments.map(doc => `
    <div class="doc-item doc-item-list" onclick="editDoc('${doc.id}')">
      <div class="doc-item-icon">📄</div>
      <div class="doc-item-info">
        <div class="doc-item-title">${escapeHtml(doc.name || 'Untitled')}</div>
        <div class="doc-item-meta">
          <span>${doc.type}</span> • 
          <span>${doc.field || 'General'}</span> •
          <span>${new Date(doc.uploaded_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="doc-item-actions">
        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); downloadDoc('${doc.id}')">⬇</button>
        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); deleteDoc('${doc.id}')">🗑</button>
      </div>
    </div>
  `).join('');
}

function renderGridView() {
  const container = document.getElementById('doc-list');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  container.style.gap = '16px';
  
  container.innerHTML = filteredDocuments.map(doc => `
    <div class="doc-item doc-item-card" onclick="editDoc('${doc.id}')">
      <div class="doc-card-icon">📄</div>
      <div class="doc-card-title">${escapeHtml(doc.name || 'Untitled')}</div>
      <div class="doc-card-meta">${doc.type}</div>
      <div class="doc-card-field">${doc.field || 'General'}</div>
      <div class="doc-card-date">${new Date(doc.uploaded_at).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function renderCompactView() {
  const container = document.getElementById('doc-list');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
  container.style.gap = '12px';
  
  container.innerHTML = filteredDocuments.map(doc => `
    <div class="doc-item doc-item-compact" onclick="editDoc('${doc.id}')" title="${escapeHtml(doc.name || 'Untitled')}">
      <div>📄</div>
      <div style="font-size: 0.75rem; font-weight: 600; word-break: break-word;">${escapeHtml(doc.name || 'Untitled')}</div>
    </div>
  `).join('');
}

// Set view type
function setView(view) {
  currentView = view;
  localStorage.setItem('doc_view', view);
  
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-view-${view}`)?.classList.add('active');
  
  renderDocuments();
}

function updateCountPill() {
  const count = filteredDocuments.length;
  document.getElementById('count-pill').textContent = `${count} document${count !== 1 ? 's' : ''}`;
}

// ===== UPLOAD MODAL =====

function openUpload() {
  const modal = document.getElementById('upload-modal');
  if (modal) modal.classList.add('is-open');
}

function closeUpload() {
  const modal = document.getElementById('upload-modal');
  if (modal) modal.classList.remove('is-open');
}

let selectedFile = null;

function handleFile(input) {
  selectedFile = input.files[0];
  if (selectedFile) {
    document.getElementById('file-label').textContent = selectedFile.name;
  }
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const dropZone = event.target.closest('.drop-zone');
  if (dropZone) {
    dropZone.classList.remove('over');
    
    if (event.dataTransfer?.files[0]) {
      selectedFile = event.dataTransfer.files[0];
      document.getElementById('file-label').textContent = selectedFile.name;
    }
  }
}

async function handleUploadSubmit() {
  const name = document.getElementById('up-name')?.value.trim();
  const type = document.getElementById('up-type')?.value;
  const field = document.getElementById('up-field')?.value.trim();
  const univ = document.getElementById('up-univ')?.value.trim();
  const description = document.getElementById('up-description')?.value.trim();
  
  if (!name || !selectedFile) {
    alert('Please enter a title and select a file');
    return;
  }
  
  const formData = new FormData();
  formData.append('name', name);
  formData.append('type', type);
  formData.append('field', field);
  formData.append('institution', univ);
  formData.append('description', description);
  formData.append('file', selectedFile);
  
  try {
    const token = window.Auth?.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await fetch(`${API}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    closeUpload();
    selectedFile = null;
    document.getElementById('file-label').textContent = '';
    document.getElementById('upload-modal').querySelector('form')?.reset?.();
    
    fetchDocuments();
  } catch (error) {
    console.error('Error uploading document:', error);
    alert('Failed to upload document');
  }
}

// ===== FORUM HIGHLIGHTS =====

async function fetchForumHighlights() {
  try {
    const response = await fetch(`${API}/forum/highlights?limit=5`);
    if (!response.ok) throw new Error('Failed to fetch forum highlights');
    
    const posts = await response.json();
    renderForumPosts(posts);
  } catch (error) {
    console.error('Error fetching forum highlights:', error);
    document.getElementById('forum-posts').innerHTML = `
      <p class="posts-empty">Failed to load forum posts</p>
    `;
  }
}

function renderForumPosts(posts) {
  const container = document.getElementById('forum-posts');
  
  if (!posts || posts.length === 0) {
    container.innerHTML = '<p class="posts-empty">No posts yet</p>';
    return;
  }
  
  container.innerHTML = posts.map(post => `
    <a href="../../pages/forum/forum.html?post=${post.id}" class="post-item">
      <span class="post-title">${escapeHtml(post.title || 'Untitled')}</span>
      <span class="post-meta">${post.reply_count || 0} replies • ${getTimeAgo(post.created_at)}</span>
    </a>
  `).join('');
}

// ===== CHAT PREVIEW =====

async function fetchChatPreview() {
  try {
    const token = window.Auth?.getToken();
    if (!token) {
      document.getElementById('chat-preview').innerHTML = '<p class="chat-empty">Sign in to see chats</p>';
      return;
    }
    
    const response = await fetch(`${API}/chat/recent?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to fetch chat preview');
    
    const messages = await response.json();
    renderChatPreview(messages);
  } catch (error) {
    console.error('Error fetching chat preview:', error);
    document.getElementById('chat-preview').innerHTML = '<p class="chat-empty">No recent messages</p>';
  }
}

function renderChatPreview(messages) {
  const container = document.getElementById('chat-preview');
  const userId = window.Auth?.getUser()?.id;
  
  if (!messages || messages.length === 0) {
    container.innerHTML = '<p class="chat-empty">No recent messages</p>';
    return;
  }
  
  container.innerHTML = messages.map(msg => `
    <div class="chat-message ${msg.sender_id === userId ? 'sent' : 'received'}">
      ${escapeHtml(msg.text || '')}
    </div>
  `).join('');
}

// ===== UTILITY FUNCTIONS =====

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Placeholder functions (to be implemented)
function editDoc(docId) {
  console.log('Edit doc:', docId);
  // TODO: Implement edit modal
}

function downloadDoc(docId) {
  console.log('Download doc:', docId);
  // TODO: Implement download
}

function deleteDoc(docId) {
  if (confirm('Delete this document?')) {
    console.log('Delete doc:', docId);
    // TODO: Implement delete
    fetchDocuments();
  }
}

// Add styles for document items (injected dynamically)
const styles = `
  .doc-item-list {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px;
    border-bottom: 1px solid var(--clr-border);
    cursor: pointer;
    transition: background var(--transition);
  }
  
  .doc-item-list:hover {
    background: var(--clr-card-hover);
  }
  
  .doc-item-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  .doc-item-info {
    flex: 1;
    min-width: 0;
  }
  
  .doc-item-title {
    font-weight: 600;
    color: var(--clr-text);
    margin-bottom: 4px;
    word-break: break-word;
  }
  
  .doc-item-meta {
    font-size: 0.85rem;
    color: var(--clr-muted);
  }
  
  .doc-item-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  
  .btn-sm {
    padding: 6px 10px;
    font-size: 0.8rem;
  }
  
  .doc-item-card,
  .doc-item-compact {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius);
    padding: 16px;
    text-align: center;
    cursor: pointer;
    transition: all var(--transition);
  }
  
  .doc-item-card:hover,
  .doc-item-compact:hover {
    border-color: var(--clr-primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  
  .doc-card-icon {
    font-size: 2rem;
    margin-bottom: 8px;
  }
  
  .doc-card-title {
    font-weight: 600;
    color: var(--clr-text);
    margin-bottom: 4px;
    word-break: break-word;
    font-size: 0.95rem;
  }
  
  .doc-card-meta,
  .doc-card-field {
    font-size: 0.8rem;
    color: var(--clr-muted);
  }
  
  .doc-card-date {
    font-size: 0.75rem;
    color: var(--clr-muted);
    margin-top: 8px;
  }
  
  .drop-zone {
    border: 2px dashed var(--clr-border);
    border-radius: var(--radius);
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all var(--transition);
  }
  
  .drop-zone:hover,
  .drop-zone.over {
    border-color: var(--clr-primary);
    background: var(--clr-card-hover);
  }
  
  .drop-icon {
    font-size: 2rem;
    display: block;
    margin-bottom: 12px;
  }
  
  .drop-title {
    font-weight: 600;
    color: var(--clr-text);
  }
  
  .drop-sub {
    font-size: 0.85rem;
    color: var(--clr-muted);
    margin-top: 4px;
  }
  
  .file-name-display {
    margin-top: 12px;
    font-size: 0.9rem;
    color: var(--clr-primary);
    font-weight: 600;
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    gap: 16px;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }
  
  .form-group label {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--clr-text);
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 10px;
    border: 1px solid var(--clr-border);
    border-radius: var(--radius);
    background: var(--clr-bg);
    color: var(--clr-text);
    font-family: inherit;
    font-size: 0.9rem;
  }
  
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--clr-primary);
    box-shadow: 0 0 0 2px rgba(58, 108, 244, 0.1);
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  
  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }
  
  .btn-secondary {
    background: var(--clr-bg);
    border: 1px solid var(--clr-border);
    color: var(--clr-text);
  }
  
  .btn-secondary:hover {
    background: var(--clr-card-hover);
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);