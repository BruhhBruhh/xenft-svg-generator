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
}

/**
 * Generates dynamic color schemes based on the current date
 * Colors change every 30 days in a 12-month cycle
 * @returns {Object} The current color scheme and cycle information
 */
function generateColorScheme() {
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
}

/**
 * Determines the category and rarity of a XENFT
 * @param {Object} xenftData - Data about the XENFT
 * @returns {Object} Category and rarity information
 */
function getXENFTRarityInfo(xenftData) {
    const { isApex, isLimited, powerGroupIdx } = xenftData.mintInfo.class;
    const burnedAmount = xenftData.xenBurned;
    
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
}

/**
 * Generate SVG for a XENFT
 * @param {Object} xenftData - The XENFT data
 * @returns {string} SVG markup
 */
function generateXENFTSVG(xenftData) {
    const { tokenId, vmuCount, mintInfo, xenBurned, isApex } = xenftData;
    const { term, maturityTs, rank, amp, eaa, class: classInfo } = mintInfo;
    
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
}
