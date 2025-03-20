/**
 * Helper functions for the XENFT SVG Generator
 */

// Convert SVG to image (PNG) for easy sharing
function svgToPng(svgString, width, height) {
    return new Promise((resolve, reject) => {
        try {
            // Create a canvas element
            const canvas = document.createElement('canvas');
            canvas.width = width || 800;
            canvas.height = height || 800;
            const ctx = canvas.getContext('2d');
            
            // Fill with white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Create SVG image
            const img = new Image();
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = function() {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                
                // Convert to PNG
                const pngUrl = canvas.toDataURL('image/png');
                resolve(pngUrl);
            };
            
            img.onerror = function() {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load SVG'));
            };
            
            img.src = url;
        } catch (error) {
            reject(error);
        }
    });
}

// Download the current SVG as a PNG file
async function downloadPng(svgContent, tokenId) {
    try {
        const pngUrl = await svgToPng(svgContent);
        
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `XENFT-${tokenId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error('Failed to convert SVG to PNG:', error);
        alert('Failed to download PNG. Please try the SVG format instead.');
    }
}

// Save XENFT to local storage
function saveXENFTToLocalStorage(xenftData, svgContent) {
    try {
        // Get existing saved XENFTs
        const savedXENFTs = JSON.parse(localStorage.getItem('savedXENFTs') || '[]');
        
        // Check if this XENFT is already saved
        const existingIndex = savedXENFTs.findIndex(item => item.tokenId === xenftData.tokenId);
        
        // Prepare data to save
        const dataToSave = {
            tokenId: xenftData.tokenId,
            vmuCount: xenftData.vmuCount,
            term: xenftData.mintInfo.term,
            xenBurned: xenftData.xenBurned,
            svg: svgContent,
            category: getXENFTRarityInfo(xenftData).category,
            rarity: getXENFTRarityInfo(xenftData).rarity,
            savedAt: new Date().toISOString()
        };
        
        // Update or add
        if (existingIndex >= 0) {
            savedXENFTs[existingIndex] = dataToSave;
        } else {
            savedXENFTs.push(dataToSave);
        }
        
        // Save back to local storage
        localStorage.setItem('savedXENFTs', JSON.stringify(savedXENFTs));
        
        return true;
    } catch (error) {
        console.error('Failed to save XENFT to local storage:', error);
        return false;
    }
}

// Get saved XENFTs from local storage
function getSavedXENFTs() {
    try {
        return JSON.parse(localStorage.getItem('savedXENFTs') || '[]');
    } catch (error) {
        console.error('Failed to get saved XENFTs from local storage:', error);
        return [];
    }
}

// Remove a saved XENFT from local storage
function removeSavedXENFT(tokenId) {
    try {
        // Get existing saved XENFTs
        const savedXENFTs = JSON.parse(localStorage.getItem('savedXENFTs') || '[]');
        
        // Filter out the one to remove
        const filteredXENFTs = savedXENFTs.filter(item => item.tokenId !== tokenId);
        
        // Save back to local storage
        localStorage.setItem('savedXENFTs', JSON.stringify(filteredXENFTs));
        
        return true;
    } catch (error) {
        console.error('Failed to remove saved XENFT from local storage:', error);
        return false;
    }
}

// Create a gallery view of saved XENFTs
function renderGallery(container) {
    const savedXENFTs = getSavedXENFTs();
    
    if (savedXENFTs.length === 0) {
        container.innerHTML = '<p class="text-center my-4">No saved XENFTs found. View and save some XENFTs first!</p>';
        return;
    }
    
    // Create gallery HTML
    let galleryHTML = '<div class="gallery-grid">';
    
    savedXENFTs.forEach(xenft => {
        galleryHTML += `
            <div class="gallery-item" data-token-id="${xenft.tokenId}">
                <div class="gallery-svg">${xenft.svg}</div>
                <div class="gallery-info">
                    <h3>XENFT #${xenft.tokenId}</h3>
                    <p>Type: ${xenft.category} (${xenft.rarity})</p>
                    <div class="gallery-actions">
                        <button class="btn btn-sm btn-primary view-btn">View</button>
                        <button class="btn btn-sm btn-danger remove-btn">Remove</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    galleryHTML += '</div>';
    
    // Set the HTML
    container.innerHTML = galleryHTML;
    
    // Add event listeners
    container.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tokenId = parseInt(btn.closest('.gallery-item').dataset.tokenId);
            
            // Switch to view mode and load this token
            document.getElementById('galleryView').classList.add('hidden');
            document.getElementById('mainView').classList.remove('hidden');
            
            // Set current token ID and fetch data
            currentTokenId = tokenId;
            document.getElementById('tokenIdInput').value = tokenId;
            fetchAndRenderXenft(tokenId);
        });
    });
    
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tokenId = parseInt(btn.closest('.gallery-item').dataset.tokenId);
            
            if (confirm(`Are you sure you want to remove XENFT #${tokenId} from your saved gallery?`)) {
                // Remove from storage
                removeSavedXENFT(tokenId);
                
                // Re-render gallery
                renderGallery(container);
            }
        });
    });
}

// Add CSS styles for gallery
function addGalleryStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .gallery-item {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            background-color: white;
        }
        
        .gallery-svg svg {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .gallery-info {
            padding: 15px;
        }
        
        .gallery-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
        }
        
        .btn-sm {
            padding: 5px 10px;
            font-size: 0.875rem;
        }
        
        .tab-buttons {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
        }
        
        .tab-button {
            padding: 10px 20px;
            margin: 0 5px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background-color: white;
            cursor: pointer;
        }
        
        .tab-button.active {
            background-color: var(--primary-color);
            color: white;
            border-color: var(--secondary-color);
        }
    `;
    document.head.appendChild(style);
}
