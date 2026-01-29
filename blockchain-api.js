// ===========================================
// Blockchain Explorer API Configuration
// Supports Etherscan-compatible APIs for all major EVM chains
// ===========================================

const BlockchainAPI = {
    // Etherscan V2 unified API endpoint
    apiBaseV2: 'https://api.etherscan.io/v2/api',

    // Chain configurations with explorer API details
    chains: {
        ethereum: {
            name: 'Ethereum',
            symbol: 'ETH',
            explorer: 'https://etherscan.io',
            rpcUrl: 'https://eth.llamarpc.com',
            chainId: 1,
            color: '#627EEA',
            stablecoins: {
                USDT: { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6, color: '#22c55e' },
                USDC: { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, color: '#3b82f6' }
            }
        },
        polygon: {
            name: 'Polygon',
            symbol: 'MATIC',
            explorer: 'https://polygonscan.com',
            rpcUrl: 'https://polygon.llamarpc.com',
            chainId: 137,
            color: '#8247E5',
            stablecoins: {
                USDT: { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', decimals: 6, color: '#22c55e' },
                USDC: { address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', decimals: 6, color: '#3b82f6' }
            }
        },
        bsc: {
            name: 'BNB Smart Chain',
            symbol: 'BNB',
            explorer: 'https://bscscan.com',
            apiBase: 'https://api.bscscan.com/api',
            rpcUrl: 'https://bsc-dataseed.binance.org',
            chainId: 56,
            color: '#F3BA2F',
            stablecoins: {
                USDT: { address: '0x55d398326f99059ff775485246999027b3197955', decimals: 18, color: '#22c55e' },
                USDC: { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', decimals: 18, color: '#3b82f6' }
            }
        },
        arbitrum: {
            name: 'Arbitrum',
            symbol: 'ETH',
            explorer: 'https://arbiscan.io',
            rpcUrl: 'https://arb1.arbitrum.io/rpc',
            chainId: 42161,
            color: '#28A0F0',
            stablecoins: {
                USDT: { address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', decimals: 6, color: '#22c55e' },
                USDC: { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', decimals: 6, color: '#3b82f6' }
            }
        },
        optimism: {
            name: 'Optimism',
            symbol: 'ETH',
            explorer: 'https://optimistic.etherscan.io',
            rpcUrl: 'https://mainnet.optimism.io',
            chainId: 10,
            color: '#FF0420',
            stablecoins: {
                USDT: { address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', decimals: 6, color: '#22c55e' },
                USDC: { address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', decimals: 6, color: '#3b82f6' }
            }
        },
        base: {
            name: 'Base',
            symbol: 'ETH',
            explorer: 'https://basescan.org',
            rpcUrl: 'https://mainnet.base.org',
            chainId: 8453,
            color: '#0052FF',
            stablecoins: {
                USDT: { address: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', decimals: 6, color: '#22c55e' },
                USDC: { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', decimals: 6, color: '#3b82f6' }
            }
        },
        avalanche: {
            name: 'Avalanche C-Chain',
            symbol: 'AVAX',
            explorer: 'https://snowtrace.io',
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            chainId: 43114,
            color: '#E84142',
            stablecoins: {
                USDT: { address: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', decimals: 6, color: '#22c55e' },
                USDC: { address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', decimals: 6, color: '#3b82f6' }
            }
        },
        fantom: {
            name: 'Fantom',
            symbol: 'FTM',
            explorer: 'https://ftmscan.com',
            rpcUrl: 'https://rpc.ftm.tools',
            chainId: 250,
            color: '#1969FF',
            stablecoins: {
                USDT: { address: '0x049d68029688eabf473097a2fc38ef61633a3c7a', decimals: 6, color: '#22c55e' },
                USDC: { address: '0x04068da6c83afcfa0e13ba15a6696662335d5b75', decimals: 6, color: '#3b82f6' }
            }
        }
    },

    // API keys storage (can be set via localStorage or directly)
    apiKeys: {},

    // Initialize API keys from localStorage
    init() {
        try {
            const stored = localStorage.getItem('blockchainApiKeys');
            if (stored) {
                this.apiKeys = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Could not load API keys from localStorage:', e);
        }
    },

    // Set API key for a chain
    setApiKey(chainId, apiKey) {
        this.apiKeys[chainId] = apiKey;
        try {
            localStorage.setItem('blockchainApiKeys', JSON.stringify(this.apiKeys));
        } catch (e) {
            console.warn('Could not save API key to localStorage:', e);
        }
    },

    // Get API key for a chain (returns empty string if not set)
    getApiKey(chainId) {
        return this.apiKeys[chainId] || '';
    },

    // Get chain config by ID
    getChain(chainId) {
        return this.chains[chainId] || null;
    },

    // Fetch native balance via RPC
    async fetchBalance(chainId, address) {
        const chain = this.getChain(chainId);
        if (!chain) throw new Error('Unknown chain');

        const response = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 1
            })
        });
        const data = await response.json();
        return parseInt(data.result, 16) / 1e18;
    },

    // Fetch transaction count via RPC
    async fetchTxCount(chainId, address) {
        const chain = this.getChain(chainId);
        if (!chain) throw new Error('Unknown chain');

        const response = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getTransactionCount',
                params: [address, 'latest'],
                id: 1
            })
        });
        const data = await response.json();
        return parseInt(data.result, 16);
    },

    // Check if address is contract via RPC
    async isContract(chainId, address) {
        const chain = this.getChain(chainId);
        if (!chain) throw new Error('Unknown chain');

        const response = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getCode',
                params: [address, 'latest'],
                id: 1
            })
        });
        const data = await response.json();
        return data.result && data.result !== '0x';
    },

    // Fetch ERC20 balance via RPC
    async fetchTokenBalance(chainId, tokenAddress, walletAddress, decimals) {
        const chain = this.getChain(chainId);
        if (!chain) throw new Error('Unknown chain');

        const balanceOfSelector = '0x70a08231';
        const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, '0');

        const response = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: tokenAddress,
                    data: balanceOfSelector + paddedAddress
                }, 'latest'],
                id: 1
            })
        });
        const data = await response.json();
        if (data.result && data.result !== '0x') {
            return parseInt(data.result, 16) / Math.pow(10, decimals);
        }
        return 0;
    },

    // Fetch token transfers using Explorer API (Etherscan V2)
    // This gives FULL historical data, not just recent blocks
    async fetchTokenTransfersAPI(chainId, address, options = {}) {
        const chain = this.getChain(chainId);
        if (!chain) throw new Error('Unknown chain');

        const apiKey = this.getApiKey(chainId);
        const transfers = [];
        const stableAddresses = Object.values(chain.stablecoins).map(s => s.address.toLowerCase());

        // Check if API key is set
        if (!apiKey) {
            console.warn('No API key set for', chainId, '- falling back to RPC method');
            return this.fetchTokenTransfersRPC(chainId, address);
        }

        // Build API URL for token transfers
        // Use chain-specific endpoint if available, otherwise use Etherscan V2 unified API
        let url;
        if (chain.apiBase) {
            // Chain-specific endpoint (e.g., BscScan, Snowtrace)
            url = `${chain.apiBase}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
            console.log('Using chain-specific API:', chain.apiBase);
        } else {
            // Etherscan V2 unified API
            url = `${this.apiBaseV2}?chainid=${chain.chainId}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
            console.log('Using Etherscan V2 API for chainId:', chain.chainId);
        }

        if (options.page) {
            url += `&page=${options.page}&offset=${options.offset || 100}`;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === '1' && Array.isArray(data.result)) {
                for (const tx of data.result) {
                    const contractAddr = tx.contractAddress.toLowerCase();

                    // Filter for stablecoins only (USDT/USDC)
                    if (!stableAddresses.includes(contractAddr)) continue;

                    // Find the stablecoin info
                    let tokenInfo = null;
                    let symbol = '';
                    for (const [sym, info] of Object.entries(chain.stablecoins)) {
                        if (info.address.toLowerCase() === contractAddr) {
                            tokenInfo = info;
                            symbol = sym;
                            break;
                        }
                    }

                    if (!tokenInfo) continue;

                    const isIncoming = tx.to.toLowerCase() === address.toLowerCase();
                    const value = parseInt(tx.value) / Math.pow(10, tokenInfo.decimals);

                    transfers.push({
                        type: isIncoming ? 'in' : 'out',
                        symbol: symbol,
                        from: tx.from,
                        to: tx.to,
                        value: value,
                        txHash: tx.hash,
                        blockNumber: parseInt(tx.blockNumber),
                        timestamp: parseInt(tx.timeStamp),
                        color: tokenInfo.color,
                        gasUsed: tx.gasUsed,
                        gasPrice: tx.gasPrice
                    });
                }
            } else if (data.status === '0' && data.message === 'No transactions found') {
                // No transactions - return empty array
                return [];
            } else if (data.status === '0') {
                console.warn('API returned error:', data.message, data.result);
                // Check if it's a paid plan requirement or other API error
                if (data.result && data.result.includes('Free API access is not supported')) {
                    console.warn('Chain requires paid API plan, falling back to RPC (recent blocks only)');
                }
                // Fall back to RPC method if API fails
                return this.fetchTokenTransfersRPC(chainId, address);
            }
        } catch (error) {
            console.error('Error fetching from explorer API:', error);
            // Fall back to RPC method
            return this.fetchTokenTransfersRPC(chainId, address);
        }

        return transfers;
    },

    // Fetch token transfers using RPC (limited to recent blocks)
    // Fallback when API is not available or rate-limited
    async fetchTokenTransfersRPC(chainId, address) {
        const chain = this.getChain(chainId);
        if (!chain) throw new Error('Unknown chain');

        const transfers = [];
        const paddedAddress = '0x' + address.slice(2).toLowerCase().padStart(64, '0');
        const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

        // Get current block
        const blockResponse = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
            })
        });
        const blockData = await blockResponse.json();
        const currentBlock = parseInt(blockData.result, 16);

        // Search last 10k blocks (public RPC limit)
        const fromBlock = '0x' + Math.max(0, currentBlock - 10000).toString(16);

        for (const [symbol, token] of Object.entries(chain.stablecoins)) {
            try {
                // Fetch incoming transfers
                const inResponse = await fetch(chain.rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getLogs',
                        params: [{
                            fromBlock,
                            toBlock: 'latest',
                            address: token.address,
                            topics: [transferTopic, null, paddedAddress]
                        }],
                        id: 1
                    })
                });
                const inData = await inResponse.json();

                if (inData.result && Array.isArray(inData.result)) {
                    for (const log of inData.result) {
                        const from = '0x' + log.topics[1].slice(26);
                        const to = '0x' + log.topics[2].slice(26);
                        const value = parseInt(log.data, 16) / Math.pow(10, token.decimals);
                        transfers.push({
                            type: 'in',
                            symbol,
                            from,
                            to,
                            value,
                            txHash: log.transactionHash,
                            blockNumber: parseInt(log.blockNumber, 16),
                            color: token.color
                        });
                    }
                }

                // Fetch outgoing transfers
                const outResponse = await fetch(chain.rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getLogs',
                        params: [{
                            fromBlock,
                            toBlock: 'latest',
                            address: token.address,
                            topics: [transferTopic, paddedAddress, null]
                        }],
                        id: 1
                    })
                });
                const outData = await outResponse.json();

                if (outData.result && Array.isArray(outData.result)) {
                    for (const log of outData.result) {
                        const from = '0x' + log.topics[1].slice(26);
                        const to = '0x' + log.topics[2].slice(26);
                        const value = parseInt(log.data, 16) / Math.pow(10, token.decimals);
                        transfers.push({
                            type: 'out',
                            symbol,
                            from,
                            to,
                            value,
                            txHash: log.transactionHash,
                            blockNumber: parseInt(log.blockNumber, 16),
                            color: token.color
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${symbol} transfers via RPC:`, error);
            }
        }

        // Sort by block number descending
        transfers.sort((a, b) => b.blockNumber - a.blockNumber);
        return transfers.slice(0, 100);
    },

    // Log query to backend
    async logQuery(address, blockchain) {
        try {
            const authToken = localStorage.getItem('authToken');
            const headers = { 'Content-Type': 'application/json' };
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            await fetch('/api/investigate', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    address,
                    blockchain,
                    query_type: 'details'
                })
            });
        } catch (e) {
            console.error('Failed to log query:', e);
        }
    },

    // Fetch all basic data for an address
    async fetchAddressData(chainId, address) {
        const chain = this.getChain(chainId);
        if (!chain) throw new Error('Unknown chain');

        // Log the query to backend (don't await, fire and forget)
        this.logQuery(address, chain.name);

        const [balance, txCount, isContractResult, usdtBalance, usdcBalance] = await Promise.all([
            this.fetchBalance(chainId, address),
            this.fetchTxCount(chainId, address),
            this.isContract(chainId, address),
            this.fetchTokenBalance(chainId, chain.stablecoins.USDT.address, address, chain.stablecoins.USDT.decimals),
            this.fetchTokenBalance(chainId, chain.stablecoins.USDC.address, address, chain.stablecoins.USDC.decimals)
        ]);

        return {
            balance,
            txCount,
            isContract: isContractResult,
            usdtBalance,
            usdcBalance
        };
    },

    // Calculate yearly summary from transfers
    calculateYearlySummary(transfers) {
        const summary = {};

        for (const tx of transfers) {
            const year = tx.timestamp ? new Date(tx.timestamp * 1000).getFullYear() : 'Unknown';

            if (!summary[year]) {
                summary[year] = { received: 0, sent: 0 };
            }

            if (tx.type === 'in') {
                summary[year].received += tx.value;
            } else {
                summary[year].sent += tx.value;
            }
        }

        return summary;
    },

    // Format timestamp to readable date/time
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp * 1000);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString()
        };
    },

    // Format address for display
    formatAddress(address, length = 8) {
        if (!address) return 'Unknown';
        return address.slice(0, length + 2) + '...' + address.slice(-length);
    }
};

// Initialize on load
BlockchainAPI.init();
