/**
 * XENFT MintInfo Decoder Library
 * 
 * This library decodes the MintInfo data structure from the XENFT contract.
 * The mintInfo is a packed uint256 with the following structure:
 * - term (uint16)
 * - maturityTs (uint64)
 * - rank (uint128)
 * - amp (uint16)
 * - eaa (uint16)
 * - class (uint8): [7] isApex, [6] isLimited, [0-5] powerGroupIdx
 * - redeemed (uint8)
 */

/**
 * Decodes a mintInfo value from the XENFT contract
 * @param {string|number|bigint} mintInfoValue - The raw mintInfo value
 * @returns {Object} Decoded mintInfo object
 */
function decodeMintInfo(mintInfoValue) {
    try {
        // Ensure we're working with BigInt to handle the large numbers correctly
        const mintInfo = BigInt(mintInfoValue);
        
        // Extract each field using bit masking and shifting
        // redeemed is the lowest bit
        const redeemed = Boolean(mintInfo & BigInt(1));
        
        // class is bits 1-8
        const classValue = Number((mintInfo >> BigInt(1)) & BigInt(0xFF));
        const isApex = Boolean(classValue & 0x80);
        const isLimited = Boolean(classValue & 0x40);
        const powerGroupIdx = classValue & 0x3F;
        
        // eaa is bits 9-24
        const eaa = Number((mintInfo >> BigInt(9)) & BigInt(0xFFFF));
        
        // amp is bits 25-40
        const amp = Number((mintInfo >> BigInt(25)) & BigInt(0xFFFF));
        
        // rank is bits 41-168
        const rank = (mintInfo >> BigInt(41)) & BigInt(0xFFFFFFFFFFFFFFFF);
        
        // maturityTs is bits 169-232
        const maturityTs = Number((mintInfo >> BigInt(169)) & BigInt(0xFFFFFFFFFFFFFFFF));
        
        // term is bits 233-248
        const term = Number((mintInfo >> BigInt(233)) & BigInt(0xFFFF));
        
        return {
            term,
            maturityTs,
            rank: rank.toString(), // Return as string to avoid precision issues with large numbers
            amp,
            eaa,
            class: {
                isApex,
                isLimited,
                powerGroupIdx
            },
            redeemed
        };
    } catch (error) {
        console.error("Error decoding mintInfo:", error);
        // Return a default structure to prevent UI errors
        return {
            term: 0,
            maturityTs: 0,
            rank: "0",
            amp: 0,
            eaa: 0,
            class: {
                isApex: false,
                isLimited: false,
                powerGroupIdx: 0
            },
            redeemed: false
        };
    }
}

/**
 * Generates dynamic color schemes based on the current date
 * Colors change every 30 days in a 12-month cycle
 * @returns {Object} The current color scheme and cycle information
 */
function generateColorScheme() {
    try {
        // Calculate days since epoch and divide by 30 to get a cycle number
        const now = Math.floor(Date.now() / 1000);
        const daysSinceEpoch = Math.floor(now / 86400);
        const colorCycle = Math.floor(daysSinceEpoch / 30) % 12;
        
        // Define 12 different color schemes (one for each month essentially)
        const colorSchemes = [
            { primary: "#FF5733", secondary: "#C70039", tertiary: "#900C3F", background: "#1C0F13" }, // Cycle 0
            { primary: "#33FF57", secondary: "#00C739", tertiary: "#0C903F", background: "#0F1C13" }, // Cycle 1
            { primary: "#3357FF", secondary: "#0039C7", tertiary: "#0C0C90", background: "#0F131C" }, // Cycle 2
            { primary: "#FF33F5", secondary: "#C700B9", tertiary: "#900C84", background: "#1C0F1A" }, // Cycle 3
            { primary: "#33FFF5", secondary: "#00C7B9", tertiary: "#0C9084", background: "#0F1C1A" }, // Cycle 4
            { primary: "#FFFF33", secondary: "#C7C700", tertiary: "#909000", background: "#1C1C0F" }, // Cycle 5
            { primary: "#FF8333", secondary: "#C75200", tertiary: "#903C00", background: "#1C150F" }, // Cycle 6
            { primary: "#FF3383", secondary: "#C70052", tertiary: "#90003C", background: "#1C0F15" }, // Cycle 7
            { primary: "#83FF33", secondary: "#52C700", tertiary: "#3C9000", background: "#151C0F" }, // Cycle 8
            { primary: "#8333FF", secondary: "#5200C7", tertiary: "#3C0090", background: "#150F1C" }, // Cycle 9
            { primary: "#33FFFF", secondary: "#00C7C7", tertiary: "#009090", background: "#0F1C1C" }, // Cycle 10
            { primary: "#FF3333", secondary: "#C70000", tertiary: "#900000", background: "#1C0F0F" }, // Cycle 11
        ];
        
        return {
            ...colorSchemes[colorCycle],
            cycleNumber: colorCycle,
            daysUntilNextCycle: 30 - (daysSinceEpoch % 30)
        };
    } catch (error) {
        console.error("Error generating color scheme:", error);
        // Return a default color scheme
        return {
            primary: "#3357FF",
            secondary: "#0039C7", 
            tertiary: "#0C0C90", 
            background: "#0F131C",
            cycleNumber: 0,
            daysUntilNextCycle: 30
        };
    }
}

/**
 * Determines the category and rarity of a XENFT
 * @param {Object} xenftData - Data about the XENFT
 * @returns {Object} Category and rarity information
 */
function getXENFTRarityInfo(xenftData) {
    try {
        // Check if valid data exists
        if (!xenftData || !xenftData.mintInfo || !xenftData.mintInfo.class) {
            throw new Error("Invalid XENFT data structure");
        }
        
        const { isApex, isLimited, powerGroupIdx } = xenftData.mintInfo.class;
        const burnedAmount = xenftData.xenBurned || 0;
        
        let category, rarity, rarityColor;
        
        if (isApex) {
            category = "Apex";
            rarityColor = "#FFD700"; // Gold
            
            // Determine Apex rarity based on burn amount
            if (burnedAmount > 10000000) {
                rarity = "Xunicorn";
            } else if (burnedAmount > 1000000) {
                rarity = "Exotic";
            } else if (burnedAmount > 100000) {
                rarity = "Legendary";
            } else if (burnedAmount > 10000) {
                rarity = "Epic";
            } else {
                rarity = "Rare";
            }
        } else if (isLimited) {
            category = "Limited";
            rarity = "Limited";
            rarityColor = "#C0C0C0"; // Silver
        } else {
            category = "Common";
            rarityColor = "#CD7F32"; // Bronze
            
            // Determine Common rarity based on power group
            if (powerGroupIdx > 6) {
                rarity = "Uncommon";
            } else if (powerGroupIdx > 3) {
                rarity = "Standard";
            } else {
                rarity = "Basic";
            }
        }
        
        return { category, rarity, rarityColor };
    } catch (error) {
        console.error("Error determining XENFT rarity:", error);
        // Return default values
        return { 
            category: "Unknown", 
            rarity: "Unknown", 
            rarityColor: "#CCCCCC" 
        };
    }
}

/**
 * Generate SVG for a XENFT
 * @param {Object} xenftData - The XENFT data
 * @returns {string} SVG markup
 */
function generateXENFTSVG(xenftData) {
    try {
        // Validate input
        if (!xenftData || !xenftData.tokenId) {
            console.error("Invalid XENFT data provided to SVG generator");
            return generateErrorSVG("Invalid XENFT data");
        }
        
        const { tokenId, vmuCount = 0, mintInfo = {}, xenBurned = 0 } = xenftData;
        const { term = 0, maturityTs = 0, rank = "0", amp = 0, eaa = 0, class: classInfo = {} } = mintInfo;
        
        // Get current color scheme based on date
        const colorScheme = generateColorScheme();
        
        // Get rarity information
        const rarityInfo = getXENFTRarityInfo(xenftData);
        
        // Set SVG dimensions
        const svgHeight = 400;
        const svgWidth = 400;
        
        // Calculate visual elements based on the data
        const circleSize = Math.min(30 + vmuCount / 10, 100);
        const circleCount = Math.min(vmuCount, 20);
        const patternDensity = Math.min(1 + vmuCount / 50, 5);
        
        // Create dynamic visual elements
        let circles = '';
        for (let i = 0; i < circleCount; i++) {
            const xPos = 50 + (300 * Math.sin(i * (2 * Math.PI / circleCount)));
            const yPos = 200 + (150 * Math.cos(i * (2 * Math.PI / circleCount)));
            const size = circleSize * (0.5 + (0.5 * Math.sin((i / circleCount) * Math.PI)));
            
            circles += `<circle cx="${xPos}" cy="${yPos}" r="${size}" fill="${colorScheme.primary}" opacity="${0.3 + (0.7 * i / circleCount)}" class="pulse-animation" />`;
        }
        
        // Background pattern
        let pattern = '';
        for (let i = 0; i < patternDensity * 20; i++) {
            const x1 = Math.random() * svgWidth;
            const y1 = Math.random() * svgHeight;
            const length = 20 + Math.random() * 80;
            const angle = Math.random() * 2 * Math.PI;
            const x2 = x1 + length * Math.cos(angle);
            const y2 = y1 + length * Math.sin(angle);
            
            pattern += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colorScheme.tertiary}" stroke-width="1" opacity="0.2" />`;
        }
        
        // Determine maturity status
        const now = Math.floor(Date.now() / 1000);
        const maturityStatus = now > maturityTs ? "Matured" : "Maturing";
        const daysToMaturity = Math.max(0, Math.floor((maturityTs - now) / 86400));
        
        // Create the SVG
        return `
            <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="${colorScheme.background}" />
                ${pattern}
                <circle cx="${svgWidth/2}" cy="${svgHeight/2}" r="${svgWidth/3}" fill="none" stroke="${colorScheme.secondary}" stroke-width="10" opacity="0.8" />
                ${circles}
                <polygon points="${svgWidth/2},50 ${svgWidth/2 + 40},${svgHeight/2 - 20} ${svgWidth/2},${svgHeight - 50} ${svgWidth/2 - 40},${svgHeight/2 - 20}" fill="${rarityInfo.rarityColor}" opacity="0.8" />
                <text x="${svgWidth/2}" y="30" fill="white" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold">XENFT #${tokenId}</text>
                <text x="${svgWidth/2}" y="${svgHeight/2 - 45}" fill="white" text-anchor="middle" font-family="Arial" font-size="14">VMUs: ${vmuCount}</text>
                <text x="${svgWidth/2}" y="${svgHeight/2 - 25}" fill="white" text-anchor="middle" font-family="Arial" font-size="14">Term: ${term} days</text>
                <text x="${svgWidth/2}" y="${svgHeight/2 - 5}" fill="white" text-anchor="middle" font-family="Arial" font-size="14">Rank: ${rank}</text>
                <text x="${svgWidth/2}" y="${svgHeight/2 + 15}" fill="white" text-anchor="middle" font-family="Arial" font-size="14">AMP: ${amp}</text>
                <text x="${svgWidth/2}" y="${svgHeight/2 + 35}" fill="white" text-anchor="middle" font-family="Arial" font-size="14">EAA: ${eaa}</text>
                <text x="${svgWidth/2}" y="${svgHeight/2 + 55}" fill="white" text-anchor="middle" font-family="Arial" font-size="14">${maturityStatus}: ${daysToMaturity > 0 ? `${daysToMaturity} days left` : 'Ready'}</text>
                <text x="${svgWidth/2}" y="${svgHeight - 80}" fill="${colorScheme.primary}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">Color Cycle: ${colorScheme.cycleNumber + 1}/12</text>
                <text x="${svgWidth/2}" y="${svgHeight - 60}" fill="${colorScheme.primary}" text-anchor="middle" font-family="Arial" font-size="12">Next cycle in ${colorScheme.daysUntilNextCycle} days</text>
                <text x="${svgWidth/2}" y="${svgHeight - 30}" fill="white" text-anchor="middle" font-family="Arial" font-size="10">Generated on ${new Date().toISOString().split('T')[0]}</text>
            </svg>
        `;
    } catch (error) {
        console.error("Error generating XENFT SVG:", error);
        return generateErrorSVG(error.message);
    }
}

/**
 * Generate error SVG when regular SVG generation fails
 * @param {string} errorMessage - Error message to display
 * @returns {string} Error SVG markup
 */
function generateErrorSVG(errorMessage) {
    return `
        <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1a1a1a" />
            <text x="200" y="180" fill="#ff3333" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold">SVG Generation Error</text>
            <text x="200" y="220" fill="#ffffff" text-anchor="middle" font-family="Arial" font-size="14">${errorMessage || "Unknown error"}</text>
            <text x="200" y="370" fill="#888888" text-anchor="middle" font-family="Arial" font-size="10">Generated on ${new Date().toISOString().split('T')[0]}</text>
        </svg>
    `;
}

/**
 * Save XENFT data to browser's local storage
 * @param {Object} xenftData - The XENFT data to save
 * @param {string} svgContent - The SVG content to save
 * @returns {boolean} Success status
 */
function saveXENFTToLocalStorage(xenftData, svgContent) {
    try {
        if (!xenftData || !xenftData.tokenId || !svgContent) {
            console.error("Missing required data for saving to local storage");
            return false;
        }
        
        // Get existing saved XENFTs or initialize empty array
        const savedXenfts = JSON.parse(localStorage.getItem('savedXenfts') || '[]');
        
        // Check if this XENFT is already saved
        const existingIndex = savedXenfts.findIndex(item => item.tokenId === xenftData.tokenId);
        
        // Create entry with timestamp
        const entry = {
            tokenId: xenftData.tokenId,
            data: xenftData,
            svg: svgContent,
            savedAt: new Date().toISOString()
        };
        
        // Update or add
        if (existingIndex >= 0) {
            savedXenfts[existingIndex] = entry;
        } else {
            savedXenfts.push(entry);
        }
        
        // Save back to localStorage
        localStorage.setItem('savedXenfts', JSON.stringify(savedXenfts));
        return true;
    } catch (error) {
        console.error("Error saving XENFT to local storage:", error);
        return false;
    }
}

/**
 * Render saved XENFTs to the gallery container
 * @param {HTMLElement} container - The container element to render the gallery into
 */
function renderGallery(container) {
    try {
        if (!container) {
            console.error("Gallery container not found");
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Get saved XENFTs
        const savedXenfts = JSON.parse(localStorage.getItem('savedXenfts') || '[]');
        
        if (savedXenfts.length === 0) {
            container.innerHTML = '<p class="empty-gallery">No saved XENFTs. View a XENFT and click "Save to Gallery" to add it here.</p>';
            return;
        }
        
        // Create gallery items
        savedXenfts.forEach(item => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            // Create SVG container
            const svgContainer = document.createElement('div');
            svgContainer.className = 'gallery-svg';
            svgContainer.innerHTML = item.svg;
            
            // Create info section
            const infoSection = document.createElement('div');
            infoSection.className = 'gallery-info';
            
            const tokenInfo = document.createElement('h3');
            tokenInfo.textContent = `XENFT #${item.tokenId}`;
            
            const savedDate = document.createElement('p');
            const date = new Date(item.savedAt).toLocaleDateString();
            savedDate.textContent = `Saved: ${date}`;
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger btn-sm';
            deleteButton.textContent = 'Remove';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Remove XENFT #${item.tokenId} from your gallery?`)) {
                    removeFromGallery(item.tokenId);
                    renderGallery(container);
                }
            });
            
            // Assemble
            infoSection.appendChild(tokenInfo);
            infoSection.appendChild(savedDate);
            infoSection.appendChild(deleteButton);
            
            galleryItem.appendChild(svgContainer);
            galleryItem.appendChild(infoSection);
            
            // Add click to view in main view
            galleryItem.addEventListener('click', () => {
                // If the viewXENFT function exists, call it
                if (typeof viewXENFT === 'function') {
                    viewXENFT(item.tokenId);
                    
                    // Switch to view tab programmatically
                    const viewTab = document.getElementById('viewTab');
                    if (viewTab) {
                        viewTab.click();
                    }
                }
            });
            
            container.appendChild(galleryItem);
        });
    } catch (error) {
        console.error("Error rendering gallery:", error);
        container.innerHTML = '<p class="error">Error loading gallery. Please try again.</p>';
    }
}

/**
 * Remove a XENFT from the gallery
 * @param {number} tokenId - The token ID to remove
 * @returns {boolean} Success status
 */
function removeFromGallery(tokenId) {
    try {
        // Get existing saved XENFTs
        const savedXenfts = JSON.parse(localStorage.getItem('savedXenfts') || '[]');
        
        // Filter out the one to remove
        const updatedXenfts = savedXenfts.filter(item => item.tokenId !== tokenId);
        
        // Save back to localStorage
        localStorage.setItem('savedXenfts', JSON.stringify(updatedXenfts));
        return true;
    } catch (error) {
        console.error("Error removing XENFT from gallery:", error);
        return false;
    }
}

/**
 * Add gallery styles to the document
 */
function addGalleryStyles() {
    // Check if styles already exist
    if (document.getElementById('gallery-styles')) return;
    
    // Create style element
    const styleEl = document.createElement('style');
    styleEl.id = 'gallery-styles';
    
    // Add CSS
    styleEl.textContent = `
        #galleryContainer {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .gallery-item {
            border: 1px solid #444;
            border-radius: 8px;
            overflow: hidden;
            background: #222;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        }
        
        .gallery-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        .gallery-svg {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1a1a1a;
            overflow: hidden;
        }
        
        .gallery-svg svg {
            max-width: 100%;
            max-height: 100%;
        }
        
        .gallery-info {
            padding: 10px;
        }
        
        .gallery-info h3 {
            margin: 0 0 5px 0;
            font-size: 16px;
        }
        
        .gallery-info p {
            margin: 0 0 10px 0;
            font-size: 12px;
            color: #aaa;
        }
        
        .empty-gallery {
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px;
            color: #888;
            font-style: italic;
        }
        
        .btn-sm {
            padding: 5px 10px;
            font-size: 12px;
        }
    `;
    
    // Add to document
    document.head.appendChild(styleEl);
}

/**
 * Converts an SVG to a PNG and downloads it
 * @param {string} svgContent - The SVG content to convert
 * @param {number} tokenId - The token ID for the filename
 */
function downloadPng(svgContent, tokenId) {
    try {
        // Create a temporary container
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.innerHTML = svgContent;
        document.body.appendChild(container);
        
        const svgElement = container.querySelector('svg');
        
        if (!svgElement) {
            throw new Error("SVG element not found");
        }
        
        // Set dimensions
        const width = parseInt(svgElement.getAttribute('width') || '400');
        const height = parseInt(svgElement.getAttribute('height') || '400');
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Create image from SVG
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svgElement));
        
        img.onload = function() {
            // Draw to canvas
            ctx.drawImage(img, 0, 0);
            
            // Convert to data URL
            try {
                const dataUrl = canvas.toDataURL('image/png');
                
                // Create download link
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `XENFT-${tokenId}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (error) {
                console.error("Error converting to PNG:", error);
                alert("Failed to convert to PNG. This may be due to cross-origin restrictions.");
            }
            
            // Clean up
            document.body.removeChild(container);
        };
        
        img.onerror = function() {
            document.body.removeChild(container);
            console.error("Error loading SVG for PNG conversion");
            alert("Failed to convert SVG to PNG");
        };
    } catch (error) {
        console.error("Error in PNG download:", error);
        alert("Error creating PNG: " + error.message);
    }
}

// Make our functions available globally
window.decodeMintInfo = decodeMintInfo;
window.generateColorScheme = generateColorScheme;
window.getXENFTRarityInfo = getXENFTRarityInfo;
window.generateXENFTSVG = generateXENFTSVG;
window.saveXENFTToLocalStorage = saveXENFTToLocalStorage;
window.renderGallery = renderGallery;
window.removeFromGallery = removeFromGallery;
window.addGalleryStyles = addGalleryStyles;
window.downloadPng = downloadPng;

// Initialize window.currentTokenId if it doesn't exist
window.currentTokenId = window.currentTokenId || null;
