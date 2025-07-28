// Dashboard JavaScript functionality
let currentPlaylists = [];
let selectedPlaylistId = null;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadPlaylists();
    loadTrackedPlaylists();
    loadDownloadHistory();
    
    // Refresh data every 30 seconds
    setInterval(() => {
        loadTrackedPlaylists();
        loadDownloadHistory();
    }, 30000);
});

// Load user's Spotify playlists
async function loadPlaylists() {
    const loadingElement = document.getElementById('playlists-loading');
    const listElement = document.getElementById('playlists-list');
    
    loadingElement.style.display = 'block';
    listElement.innerHTML = '';
    
    try {
        const response = await fetch('/api/playlists');
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/';
                return;
            }
            throw new Error('Failed to fetch playlists');
        }
        
        const data = await response.json();
        currentPlaylists = data.items || [];
        
        loadingElement.style.display = 'none';
        
        if (currentPlaylists.length === 0) {
            listElement.innerHTML = '<p class="no-data">No playlists found</p>';
            return;
        }
        
        currentPlaylists.forEach(playlist => {
            const playlistElement = createPlaylistElement(playlist);
            listElement.appendChild(playlistElement);
        });
        
    } catch (error) {
        console.error('Error loading playlists:', error);
        loadingElement.style.display = 'none';
        listElement.innerHTML = '<p class="error">Failed to load playlists. Please try again.</p>';
    }
}

// Create playlist element
function createPlaylistElement(playlist) {
    const div = document.createElement('div');
    div.className = 'playlist-item';
    div.onclick = () => showPlaylistModal(playlist);
    
    div.innerHTML = `
        <div class="playlist-info">
            <div class="playlist-name">${playlist.name}</div>
            <div class="playlist-meta">${playlist.tracks.total} tracks • ${playlist.owner.display_name}</div>
        </div>
        <div class="playlist-actions">
            <button class="track-btn" onclick="event.stopPropagation(); trackPlaylistDirect('${playlist.id}')">
                <i class="fas fa-plus"></i> Track
            </button>
        </div>
    `;
    
    return div;
}

// Show playlist details modal
function showPlaylistModal(playlist) {
    selectedPlaylistId = playlist.id;
    const modal = document.getElementById('playlist-modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');
    
    title.textContent = playlist.name;
    content.innerHTML = `
        <div class="playlist-details">
            <p><strong>Description:</strong> ${playlist.description || 'No description'}</p>
            <p><strong>Tracks:</strong> ${playlist.tracks.total}</p>
            <p><strong>Owner:</strong> ${playlist.owner.display_name}</p>
            <p><strong>Public:</strong> ${playlist.public ? 'Yes' : 'No'}</p>
            ${playlist.images && playlist.images[0] ? `<img src="${playlist.images[0].url}" alt="Playlist cover" style="max-width: 200px; border-radius: 8px; margin-top: 1rem;">` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('playlist-modal').style.display = 'none';
    selectedPlaylistId = null;
}

// Track playlist from modal
async function trackPlaylist() {
    if (!selectedPlaylistId) return;
    
    await trackPlaylistDirect(selectedPlaylistId);
    closeModal();
}

// Track playlist directly
async function trackPlaylistDirect(playlistId) {
    try {
        const response = await fetch('/api/track-playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playlistId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to track playlist');
        }
        
        const result = await response.json();
        showNotification('success', `Playlist tracked! ${result.trackCount} tracks queued for download.`);
        
        // Refresh tracked playlists
        loadTrackedPlaylists();
        
    } catch (error) {
        console.error('Error tracking playlist:', error);
        showNotification('error', 'Failed to track playlist. Please try again.');
    }
}

// Load tracked playlists
async function loadTrackedPlaylists() {
    try {
        const response = await fetch('/api/tracked-playlists');
        if (!response.ok) throw new Error('Failed to fetch tracked playlists');
        
        const trackedPlaylists = await response.json();
        const container = document.getElementById('tracked-playlists');
        const countElement = document.getElementById('tracked-count');
        
        countElement.textContent = `${trackedPlaylists.length} playlist${trackedPlaylists.length !== 1 ? 's' : ''}`;
        
        if (trackedPlaylists.length === 0) {
            container.innerHTML = '<p class="no-data">No playlists being tracked yet</p>';
            return;
        }
        
        container.innerHTML = '';
        trackedPlaylists.forEach(playlist => {
            const playlistInfo = currentPlaylists.find(p => p.id === playlist.id);
            const div = document.createElement('div');
            div.className = 'tracked-item';
            
            div.innerHTML = `
                <div class="playlist-info">
                    <div class="playlist-name">${playlistInfo ? playlistInfo.name : 'Unknown Playlist'}</div>
                    <div class="playlist-meta">${playlist.trackCount} tracks • Added ${new Date(playlist.addedAt).toLocaleDateString()}</div>
                </div>
                <div class="playlist-actions">
                    <button class="remove-btn" onclick="removeTrackedPlaylist('${playlist.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
            
            container.appendChild(div);
        });
        
    } catch (error) {
        console.error('Error loading tracked playlists:', error);
    }
}

// Remove tracked playlist
async function removeTrackedPlaylist(playlistId) {
    if (!confirm('Are you sure you want to stop tracking this playlist?')) return;
    
    try {
        const response = await fetch(`/api/tracked-playlists/${playlistId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove playlist');
        
        showNotification('success', 'Playlist removed from tracking');
        loadTrackedPlaylists();
        
    } catch (error) {
        console.error('Error removing tracked playlist:', error);
        showNotification('error', 'Failed to remove playlist. Please try again.');
    }
}

// Load download history
async function loadDownloadHistory() {
    try {
        const response = await fetch('/api/download-history');
        if (!response.ok) throw new Error('Failed to fetch download history');
        
        const history = await response.json();
        const container = document.getElementById('download-history');
        const successCount = document.getElementById('success-count');
        const failedCount = document.getElementById('failed-count');
        
        const successful = history.filter(h => h.success).length;
        const failed = history.filter(h => !h.success).length;
        
        successCount.textContent = `${successful} successful`;
        failedCount.textContent = `${failed} failed`;
        
        if (history.length === 0) {
            container.innerHTML = '<p class="no-data">No downloads yet</p>';
            return;
        }
        
        container.innerHTML = '';
        history.reverse().forEach(download => {
            const div = document.createElement('div');
            div.className = 'download-item';
            
            div.innerHTML = `
                <div class="download-info">
                    <div class="download-track">${download.track}</div>
                    <div class="download-time">${new Date(download.timestamp).toLocaleString()}</div>
                </div>
                <div class="download-status ${download.success ? 'success' : 'failed'}">
                    ${download.success ? 'Success' : 'Failed'}
                </div>
            `;
            
            container.appendChild(div);
        });
        
    } catch (error) {
        console.error('Error loading download history:', error);
    }
}

// Show notification
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;
    
    // Add notification styles if not already present
    if (!document.querySelector('style[data-notifications]')) {
        const style = document.createElement('style');
        style.setAttribute('data-notifications', 'true');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 1001;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease-out;
            }
            
            .notification.success {
                background: #28a745;
            }
            
            .notification.error {
                background: #dc3545;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session cookie
        document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('playlist-modal');
    if (event.target === modal) {
        closeModal();
    }
}