// Constants
const XENFT_ADDRESS = "0x379002701BF6f2862e3dFdd1f96d3C5E1BF450B6"; // XENTorrent contract
const XEN_CRYPTO_ADDRESS = "0xffcbF84650cE02DaFE96926B37a0ac5E34932fa5"; // cbXEN contract on Base
const BASE_CHAIN_ID = "0x2105"; // Base mainnet (8453 in hex)
const RPC_URL = "https://base-mainnet.g.alchemy.com/v2/8dASJbrbZeVybFKSf3HWqgLu3uFhskOL";

// ABIs (minimal necessary functions)
const XENFT_ABI = [
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function vmuCount(uint256 tokenId) view returns (uint256)",
    "function mintInfo(uint256 tokenId) view returns (uint256)",
    "function xenBurned(uint256 tokenId) view returns (uint256)",
    "function ownedTokens() view returns (uint256[])",
    "function isApex(uint256 tokenId) view returns (bool)"
];

const XEN_CRYPTO_ABI = [
    "function userMints(address user) view returns (address user, uint256 term, uint256 maturityTs, uint256 rank, uint256 amplifier, uint256 eaaRate)"
];

// Web3Modal instance
let web3Modal;

// State variables
let provider = null;
let xenftContract = null;
let xenCryptoContract = null;
let account = null;
let ownedTokens = [];
let currentTokenId = null;
let web3Provider = null;

// DOM Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const useRpcBtn = document.getElementById('useRpcBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingMessage = document.getElementById('loadingMessage');
const connectionContainer = document.getElementById('connectionContainer');
const connectedContainer = document.getElementById('connectedContainer');
const accountInfo = document.getElementById('accountInfo');
const accountAddress = document.getElementById('accountAddress');
const ownedTokensCount = document.getElementById('ownedTokensCount');
const tokenCount = document.getElementById('tokenCount');
const tokenIdInput = document.getElementById('tokenIdInput');
const viewTokenBtn = document.getElementById('viewTokenBtn');
const ownedTokensContainer = document.getElementById('ownedTokensContainer');
const disconnectBtn = document.getElementById('disconnectBtn');
const xenftCardContainer = document.getElementById('xenftCardContainer');
const svgContainer = document.getElementById('svgContainer');
const displayTokenId = document.getElementById('displayTokenId');
const vmuCount = document.getElementById('vmuCount');
const termValue = document.getElementById('termValue');
const burnedValue = document.getElementById('burnedValue');
const typeValue = document.getElementById('typeValue');
const cycleName = document.getElementById('cycleName');
const daysUntilNextCycle = document.getElementById('daysUntilNextCycle');
const primaryColor = document.getElementById('primaryColor');
const secondaryColor = document.getElementById('secondaryColor');
const tertiaryColor = document.getElementById('tertiaryColor');
const backgroundColor = document.getElementById('backgroundColor');

// Initialize Web3Modal for wallet connections
function initWeb3Modal() {
    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider.default,
            options: {
                rpc: {
                    8453: "https://mainnet.base.org"
                },
                network: "base",
                chainId: 8453
            }
        }
    };

    web3Modal = new Web3Modal.default({
        cacheProvider: false,
        providerOptions,
        disableInjectedProvider: true, // Disable MetaMask/injected provider
        theme: "dark"
    });
}

// Initialize color cycle info
function updateColorCycleInfo() {
    const colorScheme = generateColorScheme();
    cycleName.textContent = `${colorScheme.cycleNumber + 1}/12`;
    daysUntilNextCycle.textContent = colorScheme.daysUntilNextCycle;
    primaryColor.style.backgroundColor = colorScheme.primary;
    secondaryColor.style.backgroundColor = colorScheme.secondary;
    tertiaryColor.style.backgroundColor = colorScheme.tertiary;
    backgroundColor.style.backgroundColor = colorScheme.background;
}

// Load ethers.js dynamically to avoid initial loading errors
async function loadEthers() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js';
        script.type = 'application/javascript';
        script.onload = () => resolve(window.ethers);
        script.onerror = () => reject(new Error("Failed to load ethers.js"));
        document.body.appendChild(script);
    });
}

// Connect to wallet using Web3Modal
async function connectWallet() {
    try {
        showLoading(true);
        hideError();
        
        // Open Web3Modal to allow user to select wallet
        web3Provider = await web3Modal.connect();
        
        // Load ethers.js dynamically
        const ethers = await loadEthers();
        
        // Handle provider events
        web3Provider.on("accountsChanged", (accounts) => {
            if (accounts.length === 0) {
                // User disconnected their wallet
                disconnect();
            } else {
                // User switched accounts
                account = accounts[0];
                updateAccountInfo();
                fetchOwnedTokens();
            }
        });
        
        web3Provider.on("chainChanged", (chainId) => {
            // Handle chain change - refresh page is best practice
            window.location.reload();
        });
        
        // Create ethers provider
        provider = new ethers.providers.Web3Provider(web3Provider);
        
        // Check if we're on Base network
        const network = await provider.getNetwork();
        if (network.chainId !== 8453) {
            // Try to switch to Base
            try {
                await web3Provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BASE_CHAIN_ID }],
                });
                // Refresh provider after chain switch
                provider = new ethers.providers.Web3Provider(web3Provider);
            } catch (switchError) {
                // This error code indicates that the chain has not been added to the wallet
                if (switchError.code === 4902) {
                    try {
                        await web3Provider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: BASE_CHAIN_ID,
                                chainName: 'Base Mainnet',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            }]
                        });
                        // After adding, try switching again
                        await web3Provider.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: BASE_CHAIN_ID }],
                        });
                        // Refresh provider after chain switch
                        provider = new ethers.providers.Web3Provider(web3Provider);
                    } catch (addError) {
                        throw new Error("Failed to add Base network to wallet. Please add it manually.");
                    }
                } else {
                    throw switchError;
                }
            }
        }
        
        // Get account
        const accounts = await provider.listAccounts();
        account = accounts[0];
        
        // Initialize contracts
        initializeContracts(ethers);
        
        // Fetch owned tokens
        await fetchOwnedTokens(ethers);
        
        // Update UI
        updateUIOnConnect(true);
    } catch (error) {
        console.error("Error connecting wallet:", error);
        showError(error.message || "Failed to connect wallet. Please try again.");
    } finally {
        showLoading(false);
    }
}

// Connect to public RPC (view only)
async function connectToRPC() {
    try {
        showLoading(true);
        hideError();
        
        // Load ethers.js dynamically
        const ethers = await loadEthers();
        
        // Connect to Base using public RPC
        provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        
        // Initialize contracts
        initializeContracts(ethers);
        
        // Update UI
        updateUIOnConnect(false);
    } catch (error) {
        console.error("Error connecting to RPC:", error);
        showError("Failed to connect to the blockchain. Please try again.");
    } finally {
        showLoading(false);
    }
}

// Initialize contract instances
function initializeContracts(ethers) {
    xenftContract = new ethers.Contract(XENFT_ADDRESS, XENFT_ABI, provider);
    xenCryptoContract = new ethers.Contract(XEN_CRYPTO_ADDRESS, XEN_CRYPTO_ABI, provider);
}

// Fetch tokens owned by the connected address
async function fetchOwnedTokens(ethers) {
    if (!account || !xenftContract) return;
    
    try {
        const signer = provider.getSigner(account);
        const connectedContract = xenftContract.connect(signer);
        
        const tokens = await connectedContract.ownedTokens();
        ownedTokens = tokens.map(t => Number(t));
        
        // Update UI
        tokenCount.textContent = ownedTokens.length;
        ownedTokensCount.classList.toggle('hidden', ownedTokens.length === 0);
        
        // Render token badges
        renderOwnedTokens();
        
        // Set the first token as current if available
        if (ownedTokens.length > 0) {
            currentTokenId = ownedTokens[0];
            fetchAndRenderXenft(currentTokenId);
        }
    } catch (error) {
        console.error("Error fetching owned tokens:", error);
        showError("Failed to fetch your XENFTs. Please try again.");
    }
}

// Render owned token badges
function renderOwnedTokens() {
    if (ownedTokens.length === 0) {
        ownedTokensContainer.classList.add('hidden');
        return;
    }
    
    // Clear container
    ownedTokensContainer.innerHTML = '';
    
    // Add token badges
    ownedTokens.forEach(tokenId => {
        const badge = document.createElement('div');
        badge.className = `token-badge ${currentTokenId === tokenId ? 'active' : ''}`;
        badge.textContent = `#${tokenId}`;
        badge.addEventListener('click', () => {
            // Update UI and fetch token data
            document.querySelectorAll('.token-badge').forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            currentTokenId = tokenId;
            fetchAndRenderXenft(tokenId);
        });
        ownedTokensContainer.appendChild(badge);
    });
    
    ownedTokensContainer.classList.remove('hidden');
}

// Fetch and render XENFT data
async function fetchAndRenderXenft(tokenId) {
    if (!tokenId || !xenftContract) return;
    
    try {
        showLoading(true);
        
        // Fetch data from the contract
        const vmuCountValue = await xenftContract.vmuCount(tokenId);
        const mintInfoValue = await xenftContract.mintInfo(tokenId);
        const xenBurnedValue = await xenftContract.xenBurned(tokenId);
        const isApexValue = await xenftContract.isApex(tokenId);
        
        // Decode the mintInfo
        const decodedMintInfo = decodeMintInfo(mintInfoValue);
        
        const xenftData = {
            tokenId,
            vmuCount: Number(vmuCountValue),
            mintInfo: decodedMintInfo,
            xenBurned: Number(xenBurnedValue),
            isApex: isApexValue
        };
        
        // Display XENFT card
        displayXENFT(xenftData);
        
        // Show the card container
        xenftCardContainer.classList.remove('hidden');
    } catch (error) {
        console.error("Error fetching XENFT data:", error);
        showError(`Failed to fetch data for XENFT #${tokenId}. Please try again.`);
    } finally {
        showLoading(false);
    }
}

// Display XENFT card with data
function displayXENFT(xenftData) {
    // Get rarity information
    const rarityInfo = getXENFTRarityInfo(xenftData);
    
    // Generate SVG
    const svg = generateXENFTSVG(xenftData);
    
    // Update the SVG container
    svgContainer.innerHTML = svg;
    
    // Update the info section
    displayTokenId.textContent = xenftData.tokenId;
    vmuCount.textContent = xenftData.vmuCount;
    termValue.textContent = xenftData.mintInfo.term;
    burnedValue.textContent = xenftData.xenBurned;
    typeValue.textContent = `${rarityInfo.category} (${rarityInfo.rarity})`;
}

// Update UI when connected
function updateUIOnConnect(hasAccount) {
    connectionContainer.classList.add('hidden');
    connectedContainer.classList.remove('hidden');
    
    if (hasAccount) {
        accountInfo.classList.remove('hidden');
        updateAccountInfo();
    }
}

// Update account info display
function updateAccountInfo() {
    if (!account) return;
    
    // Display truncated address
    accountAddress.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
}

// Disconnect wallet and reset state
function disconnect() {
    if (web3Provider && web3Provider.disconnect) {
        web3Provider.disconnect();
    }
    
    // Reset state
    provider = null;
    xenftContract = null;
    xenCryptoContract = null;
    account = null;
    ownedTokens = [];
    currentTokenId = null;
    web3Provider = null;
    
    // Reset UI
    connectionContainer.classList.remove('hidden');
    connectedContainer.classList.add('hidden');
    accountInfo.classList.add('hidden');
    ownedTokensContainer.classList.add('hidden');
    xenftCardContainer.classList.add('hidden');
    
    // Clear any errors
    hideError();
}

// Show loading indicator
function showLoading(isLoading) {
    loadingMessage.classList.toggle('hidden', !isLoading);
    connectWalletBtn.disabled = isLoading;
    useRpcBtn.disabled = isLoading;
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Hide error message
function hideError() {
    errorMessage.classList.add('hidden');
}

// Handle the "View" button for manual token ID entry
function handleViewToken() {
    const tokenId = parseInt(tokenIdInput.value.trim());
    if (isNaN(tokenId) || tokenId <= 0) {
        showError("Please enter a valid Token ID");
        return;
    }
    
    currentTokenId = tokenId;
    
    // Update active token in UI if it exists in owned tokens
    document.querySelectorAll('.token-badge').forEach(badge => {
        badge.classList.toggle('active', parseInt(badge.textContent.slice(1)) === tokenId);
    });
    
    // Fetch and display the token
    fetchAndRenderXenft(tokenId);
}

// Download the current SVG as a file
function downloadSvg() {
    if (!svgContainer.innerHTML) return;
    
    const svgContent = svgContainer.innerHTML;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `XENFT-${currentTokenId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize the application
function init() {
    // Initialize Web3Modal
    initWeb3Modal();
    
    // Update color cycle information
    updateColorCycleInfo();
    
    // Add event listeners
    connectWalletBtn.addEventListener('click', connectWallet);
    useRpcBtn.addEventListener('click', connectToRPC);
    disconnectBtn.addEventListener('click', disconnect);
    viewTokenBtn.addEventListener('click', handleViewToken);
    
    // Add download functionality
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-secondary mt-4';
    downloadBtn.textContent = 'Download SVG';
    downloadBtn.addEventListener('click', downloadSvg);
    
    // Add the button if it doesn't exist yet
    const xenftInfo = xenftCardContainer.querySelector('.xenft-info');
    if (xenftInfo && !document.getElementById('downloadSvgBtn')) {
        xenftInfo.appendChild(downloadBtn);
    }
    
    // Add keyboard support for token input
    tokenIdInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleViewToken();
        }
    });
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
