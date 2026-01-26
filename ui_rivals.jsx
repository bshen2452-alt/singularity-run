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
 * 競爭對手股票卡片（含行為和里程碑顯示）
 */
function RivalStockCard({ rivalStock, onInvest, playerCash, disabled }) {
    const [amount, setAmount] = React.useState(50);
    
    // 獲取行為配置
    const getBehaviorDisplay = () => {
        const behavior = rivalStock.last_behavior;
        const milestoneEvent = rivalStock.last_milestone_event;
        
        // 優先顯示里程碑事件結果
        if (milestoneEvent) {
            if (milestoneEvent.type === 'success') {
                return {
                    icon: '🏆',
                    name: `發布 ${milestoneEvent.tierName || ('Tier ' + milestoneEvent.tier)}`,
                    color: 'var(--accent-green)',
                    bg: 'rgba(0, 255, 136, 0.15)',
                    isMilestone: true,
                    milestoneType: 'success'
                };
            } else if (milestoneEvent.type === 'failure') {
                // 根據當前行為決定顯示（不同路線有不同的失敗後行為）
                const afterBehavior = behavior ? window.RivalBehaviorConfig?.getBehavior?.(behavior.id) : null;
                const afterBehaviorName = afterBehavior ? afterBehavior.name : '調整中';
                return {
                    icon: '❌',
                    name: `發布失敗 → ${afterBehaviorName}`,
                    color: 'var(--accent-red)',
                    bg: 'rgba(255, 51, 102, 0.15)',
                    isMilestone: true,
                    milestoneType: 'failure'
                };
            }
        }
        
        if (!behavior) return null;
        
        const behaviorConfig = window.RivalBehaviorConfig?.getBehavior?.(behavior.id);
        if (!behaviorConfig) return null;
        
        // 根據行為類型決定顏色
        const getColorByBehavior = (id) => {
            const colorMap = {
                'research_sprint': { color: 'var(--accent-magenta)', bg: 'var(--accent-magenta)15' },
                'steady_research': { color: 'var(--accent-cyan)', bg: 'var(--accent-cyan)15' },
                'safety_alignment': { color: 'var(--accent-green)', bg: 'var(--accent-green)15' },
                'compliance_reform': { color: 'var(--accent-blue)', bg: 'var(--accent-blue)15' },
                'pr_recovery': { color: 'var(--accent-orange)', bg: 'var(--accent-orange)15' },
                'milestone_sprint': { color: 'var(--accent-yellow)', bg: 'var(--accent-yellow)15' },
                'internal_restructure': { color: 'var(--accent-red)', bg: 'var(--accent-red)15' },
                'market_expansion': { color: 'var(--accent-green)', bg: 'var(--accent-green)15' },
                'compute_stockpile': { color: 'var(--accent-cyan)', bg: 'var(--accent-cyan)15' },
                'defensive_stance': { color: 'var(--text-secondary)', bg: 'var(--bg-tertiary)' }
            };
            return colorMap[id] || { color: 'var(--text-secondary)', bg: 'var(--bg-tertiary)' };
        };
        
        const style = getColorByBehavior(behavior.id);
        
        // 特殊處理：接近里程碑時顯示目標
        let displayName = behaviorConfig.name;
        if (behavior.reason === 'near_milestone_threshold') {
            const MODEL_TIERS = window.GameConfig?.COSTS?.MODEL_TIERS;
            const nextTier = (rivalStock.mp_tier || 0) + 1;
            const tierName = MODEL_TIERS?.[nextTier]?.name?.split(':')[0] || ('Tier ' + nextTier);
            displayName = `衝刺 ${tierName}`;
        }
        
        return {
            icon: behaviorConfig.icon,
            name: displayName,
            color: style.color,
            bg: style.bg,
            riskLevel: behavior.riskLevel
        };
    };
    
    const behaviorDisplay = getBehaviorDisplay();
    
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
                React.createElement('span', { key: 'label', style: { fontWeight: 600 } }, rivalStock.name),
                rivalStock.route && React.createElement('span', {
                    key: 'route',
                    style: { 
                        fontSize: '0.65rem', 
                        color: 'var(--text-muted)',
                        padding: '1px 4px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '2px'
                    }
                }, rivalStock.route)
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
                }, `MP ${formatToTwoDecimals(rivalStock.mp)} T${rivalStock.mp_tier || 0}`),
                React.createElement('div', {
                    key: 'stock',
                    style: { 
                        fontSize: '0.75rem',
                        color: rivalStock.priceChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                    }
                }, `$${formatToTwoDecimals(rivalStock.currentPrice)} (${rivalStock.priceChange >= 0 ? '+' : ''}${formatToTwoDecimals(rivalStock.priceChange)}%)`)
            ])
        ]),
        
        // 當前行為顯示（含里程碑事件）
        behaviorDisplay && React.createElement('div', {
            key: 'behavior',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: behaviorDisplay.bg,
                borderRadius: '4px',
                marginBottom: '6px',
                borderLeft: behaviorDisplay.isMilestone
                    ? (behaviorDisplay.milestoneType === 'success' ? '3px solid var(--accent-green)' : '3px solid var(--accent-red)')
                    : (behaviorDisplay.riskLevel === 'critical' 
                        ? '3px solid var(--accent-red)' 
                        : behaviorDisplay.riskLevel === 'warning'
                            ? '3px solid var(--accent-orange)'
                            : '3px solid ' + behaviorDisplay.color)
            }
        }, [
            React.createElement('span', { key: 'icon', style: { fontSize: '0.9rem' } }, behaviorDisplay.icon),
            React.createElement('span', { 
                key: 'name', 
                style: { 
                    fontSize: '0.75rem', 
                    color: behaviorDisplay.color,
                    fontWeight: 500
                } 
            }, behaviorDisplay.name),
            // 里程碑標籤
            behaviorDisplay.isMilestone && React.createElement('span', {
                key: 'milestone-tag',
                style: {
                    fontSize: '0.6rem',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    background: behaviorDisplay.milestoneType === 'success' ? 'var(--accent-green)22' : 'var(--accent-red)22',
                    color: behaviorDisplay.milestoneType === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                    marginLeft: 'auto'
                }
            }, behaviorDisplay.milestoneType === 'success' ? '里程碑' : '失敗'),
            // 風險標籤
            !behaviorDisplay.isMilestone && behaviorDisplay.riskLevel && behaviorDisplay.riskLevel !== 'normal' && React.createElement('span', {
                key: 'risk',
                style: {
                    fontSize: '0.6rem',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    background: behaviorDisplay.riskLevel === 'critical' ? 'var(--accent-red)22' : 'var(--accent-orange)22',
                    color: behaviorDisplay.riskLevel === 'critical' ? 'var(--accent-red)' : 'var(--accent-orange)',
                    marginLeft: 'auto'
                }
            }, behaviorDisplay.riskLevel === 'critical' ? '緊急' : '警戒')
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
    const [activeTab, setActiveTab] = React.useState("dashboard");
    
    // 獲取ETF價格
    const etfPrices = window.ETFEngine?.getAllETFPrices?.(globalParams, player?.turn_count) || {};
    const etfPortfolio = window.ETFEngine?.getETFPortfolioSummary?.(player, globalParams) || { holdings: [] };
    const rivalStocks = window.ETFEngine?.getRivalStockPrices?.(rivals, player) || [];
    
    // === 對手里程碑事件訊息（用於收縮時顯示） ===
    const rivalEvents = React.useMemo(() => {
        if (!rivals || rivals.length === 0) return [];
        
        const events = [];
        const currentTurn = window.gameState?.player?.turn_count || 0;
        
        rivals.forEach(rival => {
            // === 1. 檢查里程碑事件（優先級最高） ===
            if (rival.last_milestone_event) {
                const evt = rival.last_milestone_event;
                // 只顯示最近1回合內的事件
                if (currentTurn - (evt.turn || 0) <= 1) {
                    if (evt.type === "success") {
                        events.push({
                            rivalName: rival.name,
                            icon: "🏆",
                            text: rival.name + " 發布 " + evt.tierName + "！",
                            type: "success",
                            priority: 5
                        });
                    } else if (evt.type === "failure") {
                        events.push({
                            rivalName: rival.name,
                            icon: "❌",
                            text: rival.name + " " + evt.tierName + " 發布失敗",
                            type: "danger",
                            priority: 4
                        });
                    }
                }
            }
            
            // === 2. 檢查風險反應行為 ===
            if (rival.last_behavior && rival.last_behavior.riskLevel) {
                const behavior = rival.last_behavior;
                const behaviorConfig = window.RivalBehaviorConfig?.getBehavior?.(behavior.id);
                const behaviorName = behaviorConfig?.name || behavior.id;
                
                if (behavior.riskLevel === "critical") {
                    events.push({
                        rivalName: rival.name,
                        icon: "⚠️",
                        text: rival.name + " 緊急" + behaviorName,
                        type: "warning",
                        priority: 3
                    });
                } else if (behavior.riskLevel === "warning") {
                    events.push({
                        rivalName: rival.name,
                        icon: "⚡",
                        text: rival.name + " " + behaviorName,
                        type: "info",
                        priority: 2
                    });
                }
            }
            
            // === 3. 檢查高風險狀態 ===
            if ((rival.entropy || 0) >= 70 && !events.find(e => e.rivalName === rival.name)) {
                events.push({
                    rivalName: rival.name,
                    icon: "🔥",
                    text: rival.name + " 熵值危險",
                    type: "warning",
                    priority: 3
                });
            }
        });
        
        // 按優先級排序
        events.sort((a, b) => b.priority - a.priority);
        return events;
    }, [rivals]);
    
    // 構建標題區域顯示的訊息（取最高優先級的事件）
    const collapsedInfo = React.useMemo(() => {
        if (rivalEvents && rivalEvents.length > 0) {
            const topEvent = rivalEvents[0];
            const colorMap = {
                "success": { color: "var(--accent-green)", background: "var(--accent-green)22" },
                "danger": { color: "var(--accent-red)", background: "var(--accent-red)22" },
                "warning": { color: "var(--accent-orange)", background: "var(--accent-orange)22" },
                "info": { color: "var(--accent-cyan)", background: "var(--accent-cyan)22" }
            };
            const style = colorMap[topEvent.type] || colorMap.info;
            return {
                icon: topEvent.icon,
                text: topEvent.text,
                color: style.color,
                background: style.background,
                pulse: topEvent.priority >= 4
            };
        }
        return null;
    }, [rivalEvents]);
    
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
        defaultCollapsed: true,
        collapsedInfo: collapsedInfo
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
        
        // ==========================================
        // 儀表板標籤頁
        // ==========================================
        activeTab === 'dashboard' && React.createElement('div', {
            key: 'dashboard-content',
            style: { display: 'grid', gap: '12px' }
        }, [
            // === 市場總價值概覽 ===
            React.createElement('div', {
                key: 'total-market-value',
                style: {
                    padding: '12px',
                    background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
                    borderRadius: '8px',
                    border: '1px solid var(--accent-cyan)33'
                }
            }, [
                React.createElement('div', {
                    key: 'header',
                    style: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }
                }, '🌐 AI 產業市場總價值'),
                // 計算市場總價值
                (() => {
                    const playerMarketCap = player?.market_cap || 0;
                    const rivalsList = rivals || [];
                    const rivalsMarketCap = rivalsList.reduce((sum, r) => sum + (r.market_cap || 0), 0);
                    const totalMarketCap = playerMarketCap + rivalsMarketCap;
                    const playerShare = totalMarketCap > 0 ? (playerMarketCap / totalMarketCap) * 100 : 0;
                    
                    // 準備所有參與者的市值數據（用於進度條和列表）
                    const marketParticipants = [
                        { name: '你', marketCap: playerMarketCap, color: 'var(--accent-cyan)', icon: '🏠' }
                    ];
                    rivalsList.forEach(r => {
                        marketParticipants.push({
                            name: r.name,
                            marketCap: r.market_cap || 0,
                            color: 'var(--accent-orange)',
                            icon: r.icon || '🏢',
                            route: r.route
                        });
                    });
                    // 按市值排序
                    marketParticipants.sort((a, b) => b.marketCap - a.marketCap);
                    
                    return React.createElement('div', { key: 'market-stats' }, [
                        // 總市值
                        React.createElement('div', {
                            key: 'total',
                            style: { 
                                textAlign: 'center', 
                                marginBottom: '12px',
                                padding: '10px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '6px'
                            }
                        }, [
                            React.createElement('div', {
                                key: 'value',
                                style: { 
                                    fontSize: '1.5rem', 
                                    fontFamily: 'var(--font-mono)', 
                                    color: 'var(--accent-cyan)',
                                    fontWeight: 'bold'
                                }
                            }, `$${formatToTwoDecimals(totalMarketCap)}M`),
                            React.createElement('div', {
                                key: 'label',
                                style: { fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }
                            }, '市場總估值')
                        ]),
                        // 市佔率進度條（多色分段）
                        React.createElement('div', {
                            key: 'share-bar',
                            style: {
                                height: '24px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                display: 'flex',
                                marginBottom: '8px'
                            }
                        }, marketParticipants.map((p, idx) => {
                            const share = totalMarketCap > 0 ? (p.marketCap / totalMarketCap) * 100 : 0;
                            // 給每個對手不同的橘色深淺
                            const rivalColors = ['#ff8800', '#ff6600', '#ff9933', '#cc5500', '#ffaa44'];
                            const bgColor = p.name === '你' 
                                ? 'linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)'
                                : rivalColors[idx % rivalColors.length];
                            return React.createElement('div', {
                                key: idx,
                                style: {
                                    width: `${share}%`,
                                    height: '100%',
                                    background: bgColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    minWidth: share > 8 ? '30px' : '0',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                },
                                title: `${p.name}: $${formatToTwoDecimals(p.marketCap)}M (${formatToTwoDecimals(share)}%)`
                            }, share > 8 ? `${formatToTwoDecimals(share)}%` : '');
                        })),
                        // 分項數據列表
                        React.createElement('div', {
                            key: 'breakdown',
                            style: {
                                display: 'grid',
                                gap: '4px',
                                fontSize: '0.75rem',
                                maxHeight: '120px',
                                overflowY: 'auto'
                            }
                        }, marketParticipants.map((p, idx) => {
                            const share = totalMarketCap > 0 ? (p.marketCap / totalMarketCap) * 100 : 0;
                            const isPlayer = p.name === '你';
                            return React.createElement('div', {
                                key: idx,
                                style: { 
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '5px 10px', 
                                    background: isPlayer ? 'var(--accent-cyan)11' : 'var(--bg-tertiary)', 
                                    borderRadius: '4px',
                                    borderLeft: `3px solid ${isPlayer ? 'var(--accent-cyan)' : 'var(--accent-orange)'}`
                                }
                            }, [
                                React.createElement('div', { 
                                    key: 'name',
                                    style: { display: 'flex', alignItems: 'center', gap: '6px' }
                                }, [
                                    React.createElement('span', { key: 'icon' }, p.icon),
                                    React.createElement('span', { 
                                        key: 'text',
                                        style: { fontWeight: isPlayer ? 'bold' : 'normal' }
                                    }, p.name),
                                    !isPlayer && p.route && React.createElement('span', {
                                        key: 'route',
                                        style: { 
                                            fontSize: '0.6rem', 
                                            color: 'var(--text-muted)',
                                            padding: '1px 4px',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '2px'
                                        }
                                    }, p.route)
                                ]),
                                React.createElement('div', {
                                    key: 'value',
                                    style: { 
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }
                                }, [
                                    React.createElement('span', { 
                                        key: 'cap',
                                        style: { 
                                            fontFamily: 'var(--font-mono)', 
                                            color: isPlayer ? 'var(--accent-cyan)' : 'var(--accent-orange)' 
                                        } 
                                    }, `$${formatToTwoDecimals(p.marketCap)}M`),
                                    React.createElement('span', {
                                        key: 'share',
                                        style: { 
                                            fontSize: '0.65rem',
                                            color: 'var(--text-muted)',
                                            minWidth: '35px',
                                            textAlign: 'right'
                                        }
                                    }, `${formatToTwoDecimals(share)}%`)
                                ])
                            ]);
                        }))
                    ]);
                })()
            ]),
            
            // === 玩家投資組合分布 ===
            React.createElement('div', {
                key: 'portfolio-section',
                style: {
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px'
                }
            }, [
                React.createElement('div', {
                    key: 'header',
                    style: { 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '10px'
                    }
                }, [
                    React.createElement('span', {
                        key: 'title',
                        style: { fontSize: '0.85rem', color: 'var(--text-secondary)' }
                    }, '💼 投資組合分布'),
                    React.createElement('span', {
                        key: 'total',
                        style: { 
                            fontSize: '0.85rem', 
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--accent-green)'
                        }
                    }, `總值: $${formatToTwoDecimals(totalInvestment)}M`)
                ]),
                // 投資使用率
                React.createElement('div', {
                    key: 'usage-bar',
                    style: {
                        marginBottom: '10px'
                    }
                }, [
                    React.createElement('div', {
                        key: 'bar-bg',
                        style: {
                            height: '8px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }
                    }, React.createElement('div', {
                        style: {
                            width: `${Math.min(100, (totalInvestment / Math.max(1, investmentLimit)) * 100)}%`,
                            height: '100%',
                            background: (totalInvestment / investmentLimit) > 0.8 
                                ? 'var(--accent-yellow)' 
                                : 'var(--accent-green)',
                            transition: 'width 0.3s ease'
                        }
                    })),
                    React.createElement('div', {
                        key: 'usage-label',
                        style: { 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)',
                            marginTop: '4px'
                        }
                    }, [
                        React.createElement('span', { key: 'used' }, 
                            `已用: ${formatToTwoDecimals((totalInvestment / Math.max(1, investmentLimit)) * 100)}%`),
                        React.createElement('span', { key: 'limit' }, 
                            `上限: $${formatToTwoDecimals(investmentLimit)}M`)
                    ])
                ]),
                // 投資組合分布條
                portfolioDistribution.length > 0 ? [
                    React.createElement('div', {
                        key: 'dist-bar',
                        style: {
                            height: '24px',
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
                                transition: 'width 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.6rem',
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: (item.value / totalInvestment) > 0.15 ? '40px' : '0'
                            },
                            title: `${item.name}: $${formatToTwoDecimals(item.value)}M`
                        }, (item.value / totalInvestment) > 0.15 ? item.name : '')
                    )),
                    // 投資明細列表
                    React.createElement('div', {
                        key: 'dist-list',
                        style: { display: 'grid', gap: '4px', maxHeight: '100px', overflowY: 'auto' }
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
                                    style: { 
                                        fontSize: '0.6rem', 
                                        color: item.type === 'ETF' ? 'var(--accent-cyan)' : 'var(--accent-orange)', 
                                        padding: '1px 4px', 
                                        background: 'var(--bg-secondary)', 
                                        borderRadius: '2px' 
                                    }
                                }, item.type)
                            ]),
                            React.createElement('span', {
                                key: 'value',
                                style: { fontFamily: 'var(--font-mono)', color: item.color }
                            }, `$${formatToTwoDecimals(item.value)}M (${formatToTwoDecimals((item.value / Math.max(1, totalInvestment)) * 100)}%)`)
                        ])
                    ))
                ] : React.createElement('div', {
                    key: 'empty',
                    style: { 
                        textAlign: 'center', 
                        padding: '20px', 
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem'
                    }
                }, '尚無投資持倉，點擊「競爭對手」或「ETF基金」開始投資')
            ]),
            
            // === 市場指標 ===
            React.createElement('div', {
                key: 'market-indices',
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    padding: '10px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                }
            }, [
                React.createElement('div', { key: 'gpu', style: { textAlign: 'center', padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '4px' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)', fontSize: '0.65rem' } }, '💻 GPU'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }
                    }, `${formatToTwoDecimals(globalParams?.P_GPU || 1)}x`)
                ]),
                React.createElement('div', { key: 'energy', style: { textAlign: 'center', padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '4px' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)', fontSize: '0.65rem' } }, '⚡ 能源'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }
                    }, `${formatToTwoDecimals(globalParams?.E_Price || 1)}x`)
                ]),
                React.createElement('div', { key: 'rate', style: { textAlign: 'center', padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '4px' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)', fontSize: '0.65rem' } }, '📊 利率'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }
                    }, `${formatToTwoDecimals(globalParams?.R_base || 1)}x`)
                ]),
                React.createElement('div', { key: 'hype', style: { textAlign: 'center', padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '4px' } }, [
                    React.createElement('div', { key: 'l', style: { color: 'var(--text-muted)', fontSize: '0.65rem' } }, '🔥 信心'),
                    React.createElement('div', { 
                        key: 'v',
                        style: { color: 'var(--accent-magenta)', fontFamily: 'var(--font-mono)' }
                    }, `${formatToTwoDecimals(globalParams?.I_Hype || 1)}x`)
                ])
            ]),
            
            // === 快捷提示 ===
            React.createElement('div', {
                key: 'tips',
                style: {
                    padding: '8px 12px',
                    background: 'var(--accent-cyan)11',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center'
                }
            }, '💡 點擊「競爭對手」或「ETF基金」標籤頁進行交易操作')
        ]),
        
        // ==========================================
        // 競爭對手標籤頁
        // ==========================================
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
        
        // ==========================================
        // ETF 標籤頁
        // ==========================================
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