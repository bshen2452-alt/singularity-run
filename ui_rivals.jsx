// ============================================
// 業界競爭者 UI 元件 - Rivals & ETF Panel
// ============================================
// 設計：純 UI 呈現，不包含業務邏輯

/**
 * 數字格式化工具（最多小數點後兩位）
 */
function formatToTwoDecimals(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * ETF 卡片組件
 */
function ETFCard({ etf, priceInfo, holding, onBuy, onSell, playerCash, disabled }) {
    const [buyAmount, setBuyAmount] = React.useState(50);
    const [sellShares, setSellShares] = React.useState(1);
    
    const config = window.ETF_CONFIG?.ETF_PRODUCTS?.[etf] || {};
    const hasHolding = holding && holding.shares > 0;
    
    return React.createElement('div', {
        style: {
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            padding: '12px',
            border: `1px solid ${config.color}44`
        }
    }, [
        // 標題行
        React.createElement('div', {
            key: 'header',
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
            }
        }, [
            React.createElement('div', {
                key: 'name',
                style: { display: 'flex', alignItems: 'center', gap: '8px' }
            }, [
                React.createElement('span', { key: 'icon', style: { fontSize: '1.2rem' } }, config.icon),
                React.createElement('span', { 
                    key: 'label',
                    style: { fontWeight: 600, color: config.color } 
                }, config.name)
            ]),
            React.createElement('div', {
                key: 'price',
                style: { textAlign: 'right' }
            }, [
                React.createElement('div', {
                    key: 'current',
                    style: { 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '1.1rem',
                        color: 'var(--text-primary)'
                    }
                }, `$${formatToTwoDecimals(priceInfo?.price || 100)}`),
                React.createElement('div', {
                    key: 'change',
                    style: { 
                        fontSize: '0.75rem',
                        color: (priceInfo?.changePercent || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                    }
                }, `${(priceInfo?.changePercent || 0) >= 0 ? '+' : ''}${formatToTwoDecimals(priceInfo?.changePercent || 0)}%`)
            ])
        ]),
        
        // 驅動因子
        React.createElement('div', {
            key: 'driver',
            style: {
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginBottom: '8px'
            }
        }, `驅動: ${priceInfo?.driverName || ''} = ${formatToTwoDecimals(priceInfo?.driverValue || 1)}x`),
        
        // 持倉信息
        hasHolding && React.createElement('div', {
            key: 'holding',
            style: {
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '8px',
                fontSize: '0.8rem'
            }
        }, [
            React.createElement('div', {
                key: 'shares',
                style: { display: 'flex', justifyContent: 'space-between' }
            }, [
                React.createElement('span', { key: 'l' }, '持有'),
                React.createElement('span', { 
                    key: 'v',
                    style: { color: config.color }
                }, `${formatToTwoDecimals(holding.shares)} 股`)
            ]),
            React.createElement('div', {
                key: 'value',
                style: { display: 'flex', justifyContent: 'space-between' }
            }, [
                React.createElement('span', { key: 'l' }, '市值'),
                React.createElement('span', { key: 'v' }, `$${formatToTwoDecimals(holding.currentValue)}M`)
            ]),
            React.createElement('div', {
                key: 'pl',
                style: { display: 'flex', justifyContent: 'space-between' }
            }, [
                React.createElement('span', { key: 'l' }, '盈虧'),
                React.createElement('span', { 
                    key: 'v',
                    style: { color: holding.profitLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }
                }, `${holding.profitLoss >= 0 ? '+' : ''}$${formatToTwoDecimals(holding.profitLoss)}M (${formatToTwoDecimals(holding.profitLossPercent)}%)`)
            ])
        ]),
        
        // 交易區
        React.createElement('div', {
            key: 'trade',
            style: {
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
            }
        }, [
            React.createElement('input', {
                key: 'amount',
                type: 'number',
                value: buyAmount,
                onChange: (e) => setBuyAmount(parseFloat(e.target.value) || 0),
                min: 10,
                step: 10,
                style: {
                    width: '60px',
                    padding: '4px 6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                }
            }),
            React.createElement('button', {
                key: 'buy',
                onClick: () => onBuy(etf, buyAmount),
                disabled: disabled || buyAmount < 10 || playerCash < buyAmount,
                style: {
                    padding: '4px 8px',
                    background: disabled || buyAmount < 10 || playerCash < buyAmount ? 'var(--bg-secondary)' : 'var(--accent-green)22',
                    border: '1px solid var(--accent-green)',
                    borderRadius: '4px',
                    color: 'var(--accent-green)',
                    cursor: disabled || buyAmount < 10 || playerCash < buyAmount ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    opacity: disabled || buyAmount < 10 || playerCash < buyAmount ? 0.5 : 1
                }
            }, '買入'),
            hasHolding && React.createElement('button', {
                key: 'sell',
                onClick: () => onSell(etf, Math.min(holding.shares, sellShares)),
                disabled: disabled,
                style: {
                    padding: '4px 8px',
                    background: disabled ? 'var(--bg-secondary)' : 'var(--accent-red)22',
                    border: '1px solid var(--accent-red)',
                    borderRadius: '4px',
                    color: 'var(--accent-red)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    opacity: disabled ? 0.5 : 1
                }
            }, '賣出')
        ])
    ]);
}

/**
 * 競爭對手股票卡片
 */
function RivalStockCard({ rivalStock, onInvest, playerCash, disabled }) {
    const [amount, setAmount] = React.useState(50);
    
    return React.createElement('div', {
        style: {
            background: 'var(--bg-tertiary)',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '0.85rem'
        }
    }, [
        // 標題行
        React.createElement('div', {
            key: 'header',
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
            }
        }, [
            React.createElement('div', {
                key: 'name',
                style: { display: 'flex', alignItems: 'center', gap: '6px' }
            }, [
                React.createElement('span', { key: 'icon' }, rivalStock.icon),
                React.createElement('span', { key: 'label', style: { fontWeight: 600 } }, rivalStock.name)
            ]),
            React.createElement('div', {
                key: 'price',
                style: { textAlign: 'right' }
            }, [
                React.createElement('div', {
                    key: 'mp',
                    style: { 
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-magenta)'
                    }
                }, `MP ${formatToTwoDecimals(rivalStock.mp)}`),
                React.createElement('div', {
                    key: 'stock',
                    style: { 
                        fontSize: '0.75rem',
                        color: rivalStock.priceChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                    }
                }, `$${formatToTwoDecimals(rivalStock.currentPrice)} (${rivalStock.priceChange >= 0 ? '+' : ''}${formatToTwoDecimals(rivalStock.priceChange)}%)`)
            ])
        ]),
        
        // 持倉和盈虧
        rivalStock.invested > 0 && React.createElement('div', {
            key: 'holding',
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '6px'
            }
        }, [
            React.createElement('span', { key: 'inv' }, `已投 $${formatToTwoDecimals(rivalStock.invested)}M`),
            React.createElement('span', { 
                key: 'pl',
                style: { color: rivalStock.profitLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }
            }, `${rivalStock.profitLoss >= 0 ? '+' : ''}$${formatToTwoDecimals(rivalStock.profitLoss)}M`)
        ]),
        
        // 交易區
        React.createElement('div', {
            key: 'trade',
            style: {
                display: 'flex',
                gap: '6px',
                alignItems: 'center'
            }
        }, [
            React.createElement('input', {
                key: 'amount',
                type: 'number',
                value: amount,
                onChange: (e) => setAmount(parseInt(e.target.value) || 0),
                min: 10,
                step: 10,
                style: {
                    width: '50px',
                    padding: '3px 5px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem'
                }
            }),
            React.createElement('button', {
                key: 'buy',
                onClick: () => onInvest(rivalStock.name, amount),
                disabled: disabled || playerCash < amount,
                style: {
                    padding: '3px 6px',
                    background: 'var(--accent-green)22',
                    border: '1px solid var(--accent-green)',
                    borderRadius: '4px',
                    color: 'var(--accent-green)',
                    cursor: disabled || playerCash < amount ? 'not-allowed' : 'pointer',
                    fontSize: '0.7rem',
                    opacity: disabled || playerCash < amount ? 0.5 : 1
                }
            }, '+'),
            rivalStock.invested > 0 && React.createElement('button', {
                key: 'sell',
                onClick: () => onInvest(rivalStock.name, -Math.min(amount, rivalStock.invested)),
                disabled: disabled,
                style: {
                    padding: '3px 6px',
                    background: 'var(--accent-red)22',
                    border: '1px solid var(--accent-red)',
                    borderRadius: '4px',
                    color: 'var(--accent-red)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.7rem',
                    opacity: disabled ? 0.5 : 1
                }
            }, '-')
        ])
    ]);
}

/**
 * 市場投資主面板（含儀表板）
 */
function RivalsPanelEnhanced({ rivals, player, globalParams, onInvestRival, onBuyETF, onSellETF, disabled }) {
    const { Panel } = window.Components || {};
    const [activeTab, setActiveTab] = React.useState('dashboard');
    
    // 獲取ETF價格
    const etfPrices = window.ETFEngine?.getAllETFPrices?.(globalParams, player?.turn_count) || {};
    const etfPortfolio = window.ETFEngine?.getETFPortfolioSummary?.(player, globalParams) || { holdings: [] };
    const rivalStocks = window.ETFEngine?.getRivalStockPrices?.(rivals, player) || [];
    
    // 計算總投資價值
    const totalRivalInvestment = Object.values(player?.rival_investments || {}).reduce((s, v) => s + v, 0);
    const totalETFValue = etfPortfolio.totalValue || 0;
    const totalInvestment = totalRivalInvestment + totalETFValue;
    
    // 計算投資上限（取總資產的50%）
    const totalAssets = (player?.cash || 0) + (player?.pflops || 0) * 20 + totalInvestment;
    const investmentLimit = totalAssets * 0.5;
    
    // 計算總盈虧
    const etfProfitLoss = etfPortfolio.totalProfitLoss || 0;
    const rivalProfitLoss = rivalStocks.reduce((sum, rs) => {
        const invested = player?.rival_investments?.[rs.name] || 0;
        if (invested <= 0) return sum;
        const currentValue = invested * (1 + (rs.priceChange || 0) / 100);
        return sum + (currentValue - invested);
    }, 0);
    const totalProfitLoss = etfProfitLoss + rivalProfitLoss;
    
    // 計算投資組合分佈
    const portfolioDistribution = [];
    // ETF 分佈
    etfPortfolio.holdings?.forEach(h => {
        if (h.currentValue > 0) {
            const config = window.ETF_CONFIG?.ETF_PRODUCTS?.[h.etfId] || {};
            portfolioDistribution.push({
                name: config.name || h.etfId,
                value: h.currentValue,
                color: config.color || 'var(--accent-cyan)',
                type: 'ETF'
            });
        }
    });
    // 對手股票分佈
    rivalStocks.forEach(rs => {
        const invested = player?.rival_investments?.[rs.name] || 0;
        if (invested > 0) {
            portfolioDistribution.push({
                name: rs.name,
                value: invested,
                color: 'var(--accent-orange)',
                type: 'Rival'
            });
        }
    });
    
    const tabs = [
        { id: 'dashboard', label: '儀表板', icon: '📊' },
        { id: 'rivals', label: '競爭對手', icon: '🏢' },
        { id: 'etf', label: 'ETF基金', icon: '📈' }
    ];
    
    return React.createElement(Panel || 'div', {
        title: '市場投資',
        icon: '🏢',
        color: 'var(--accent-orange)',
        collapsible: true,
        defaultCollapsed: true
    }, [
        // 標籤頁切換
        React.createElement('div', {
            key: 'tabs',
            style: {
                display: 'flex',
                gap: '4px',
                marginBottom: '12px'
            }
        }, tabs.map(tab => 
            React.createElement('button', {
                key: tab.id,
                onClick: () => setActiveTab(tab.id),
                style: {
                    flex: 1,
                    padding: '6px 12px',
                    background: activeTab === tab.id ? 'var(--accent-cyan)22' : 'var(--bg-tertiary)',
                    border: `1px solid ${activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    borderRadius: '4px',
                    color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                }
            }, `${tab.icon} ${tab.label}`)
        )),
        
        // 儀表板標籤頁
        activeTab === 'dashboard' && React.createElement('div', {
            key: 'dashboard-content',
            style: { display: 'grid', gap: '12px' }
        }, [
            // 整體市場概覽
            React.createElement('div', {
                key: 'market-overview',
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px'
                }
            }, [
                React.createElement('div', {
                    key: 'total-market',
                    style: { textAlign: 'center', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px' }
                }, [
                    React.createElement('div', { key: 'l', style: { fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' } }, '🌐 整體市值'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }
                    }, `$${formatToTwoDecimals(totalInvestment)}M`)
                ]),
                React.createElement('div', {
                    key: 'investment-limit',
                    style: { textAlign: 'center', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px' }
                }, [
                    React.createElement('div', { key: 'l', style: { fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' } }, '📊 投資上限'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: totalInvestment > investmentLimit ? 'var(--accent-red)' : 'var(--accent-green)' }
                    }, `$${formatToTwoDecimals(investmentLimit)}M`)
                ]),
                React.createElement('div', {
                    key: 'total-pl',
                    style: { textAlign: 'center', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px' }
                }, [
                    React.createElement('div', { key: 'l', style: { fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' } }, '💰 總盈虧'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: totalProfitLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }
                    }, `${totalProfitLoss >= 0 ? '+' : ''}$${formatToTwoDecimals(totalProfitLoss)}M`)
                ]),
                React.createElement('div', {
                    key: 'usage',
                    style: { textAlign: 'center', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px' }
                }, [
                    React.createElement('div', { key: 'l', style: { fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' } }, '📈 額度使用率'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: (totalInvestment / investmentLimit) > 0.8 ? 'var(--accent-yellow)' : 'var(--text-primary)' }
                    }, `${formatToTwoDecimals((totalInvestment / Math.max(1, investmentLimit)) * 100)}%`)
                ])
            ]),
            
            // 投資組合分佈
            portfolioDistribution.length > 0 && React.createElement('div', {
                key: 'portfolio-dist',
                style: {
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px'
                }
            }, [
                React.createElement('div', {
                    key: 'title',
                    style: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }
                }, '📊 投資組合分佈'),
                // 超寬進度條
                React.createElement('div', {
                    key: 'bar',
                    style: {
                        height: '20px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        marginBottom: '8px'
                    }
                }, portfolioDistribution.map((item, idx) => 
                    React.createElement('div', {
                        key: idx,
                        style: {
                            width: `${(item.value / Math.max(1, totalInvestment)) * 100}%`,
                            height: '100%',
                            background: item.color,
                            transition: 'width 0.3s ease'
                        },
                        title: `${item.name}: $${formatToTwoDecimals(item.value)}M`
                    })
                )),
                // 列表明細
                React.createElement('div', {
                    key: 'list',
                    style: { display: 'grid', gap: '4px', maxHeight: '120px', overflowY: 'auto' }
                }, portfolioDistribution.map((item, idx) =>
                    React.createElement('div', {
                        key: idx,
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 8px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                        }
                    }, [
                        React.createElement('div', {
                            key: 'name',
                            style: { display: 'flex', alignItems: 'center', gap: '6px' }
                        }, [
                            React.createElement('span', {
                                key: 'dot',
                                style: { width: '8px', height: '8px', borderRadius: '50%', background: item.color }
                            }),
                            React.createElement('span', { key: 'text' }, item.name),
                            React.createElement('span', {
                                key: 'type',
                                style: { fontSize: '0.65rem', color: 'var(--text-muted)', padding: '1px 4px', background: 'var(--bg-secondary)', borderRadius: '2px' }
                            }, item.type)
                        ]),
                        React.createElement('span', {
                            key: 'value',
                            style: { fontFamily: 'var(--font-mono)', color: item.color }
                        }, `$${formatToTwoDecimals(item.value)}M (${formatToTwoDecimals((item.value / Math.max(1, totalInvestment)) * 100)}%)`)
                    ])
                ))
            ]),
            
            // 市場指標
            React.createElement('div', {
                key: 'market-indices',
                style: {
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '8px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                }
            }, [
                React.createElement('div', { key: 'gpu', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)' } }, 'GPU指數'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-cyan)' }
                    }, `${formatToTwoDecimals(globalParams?.P_GPU || 1)}x`)
                ]),
                React.createElement('div', { key: 'energy', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)' } }, '能源指數'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-orange)' }
                    }, `${formatToTwoDecimals(globalParams?.E_Price || 1)}x`)
                ]),
                React.createElement('div', { key: 'rate', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)' } }, '利率指數'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-green)' }
                    }, `${formatToTwoDecimals(globalParams?.R_base || 1)}x`)
                ]),
                React.createElement('div', { key: 'hype', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)' } }, '市場信心'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-magenta)' }
                    }, `${formatToTwoDecimals(globalParams?.I_Hype || 1)}x`)
                ])
            ]),
            
            // 快捷操作提示
            React.createElement('div', {
                key: 'tips',
                style: {
                    padding: '8px 12px',
                    background: 'var(--accent-cyan)11',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)'
                }
            }, '💡 點擊 "競爭對手" 或 "ETF基金" 標籤頁進行交易操作')
        ]),
        
        // 競爭對手標籤頁
        activeTab === 'rivals' && React.createElement('div', {
            key: 'rivals-content',
            style: {
                display: 'grid',
                gap: '8px'
            }
        }, rivalStocks.map(rs => 
            React.createElement(RivalStockCard, {
                key: rs.name,
                rivalStock: rs,
                onInvest: onInvestRival,
                playerCash: player?.cash || 0,
                disabled: disabled
            })
        )),
        
        // ETF 標籤頁
        activeTab === 'etf' && React.createElement('div', {
            key: 'etf-content',
            style: {
                display: 'grid',
                gap: '10px'
            }
        }, [
            // 市場指標
            React.createElement('div', {
                key: 'market-info',
                style: {
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '8px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                }
            }, [
                React.createElement('div', { key: 'gpu', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)' } }, 'GPU指數'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-cyan)' }
                    }, `${formatToTwoDecimals(globalParams?.P_GPU || 1)}x`)
                ]),
                React.createElement('div', { key: 'energy', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)' } }, '能源指數'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-orange)' }
                    }, `${formatToTwoDecimals(globalParams?.E_Price || 1)}x`)
                ]),
                React.createElement('div', { key: 'rate', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)' } }, '利率指數'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-green)' }
                    }, `${formatToTwoDecimals(globalParams?.R_base || 1)}x`)
                ])
            ]),
            // ETF 卡片列表
            ...Object.keys(window.ETF_CONFIG?.ETF_PRODUCTS || {}).map(etfId => {
                const holding = etfPortfolio.holdings.find(h => h.etfId === etfId);
                return React.createElement(ETFCard, {
                    key: etfId,
                    etf: etfId,
                    priceInfo: etfPrices[etfId],
                    holding: holding,
                    onBuy: onBuyETF,
                    onSell: onSellETF,
                    playerCash: player?.cash || 0,
                    disabled: disabled
                });
            })
        ])
    ]);
}



// ============================================
// UI 元件全局註冊
// ============================================

(function() {
    'use strict';
    
    window.RivalsUI = {
        ETFCard,
        RivalStockCard,
        RivalsPanelEnhanced,
        formatToTwoDecimals
    };
    
    console.log('✓ Rivals UI loaded');
})();