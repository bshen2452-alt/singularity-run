// ============================================
// 財務行動面板 UI (Finance Panel UI)
// ============================================
// 設計：純介面組件，不包含業務邏輯計算
// 功能：整合財務行動、創辦人掌控度、股權結構、IPO機制

const FinancePanelUI = {

    // ==========================================
    // 主渲染入口
    // ==========================================

    /**
     * 渲染完整財務面板
     * @param {Object} player - 玩家狀態
     * @param {Object} globalParams - 全球參數
     * @param {Function} onAction - 行動回調
     * @returns {React.Element}
     */
    renderFinancePanel(player, globalParams, onAction) {
        const isPublic = player.equity_state?.is_public || player.is_public || false;
        const mpTier = player.mp_tier || 0;

        return React.createElement('div', { 
            className: 'finance-panel',
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--bg-primary)',
                borderRadius: '12px'
            }
        },
            // 面板標題
            React.createElement('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: '0.75rem'
                }
            },
                React.createElement('h2', {
                    style: { margin: 0, color: 'var(--accent-cyan)', fontSize: '1.25rem' }
                }, '💰 財務中心'),
                React.createElement('span', {
                    style: { 
                        fontSize: '0.85rem',
                        color: isPublic ? 'var(--accent-green)' : 'var(--accent-yellow)',
                        background: isPublic ? 'rgba(0,255,136,0.15)' : 'rgba(255,213,0,0.15)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px'
                    }
                }, isPublic ? '📈 上市公司' : '🔒 私有公司')
            ),

            // 1. 創辦人掌控度面板 (IPO後整合股權結構)
            this.renderFounderControlPanel(player),

            // 2. 財務行動區
            this.renderFinanceActions(player, globalParams, onAction, mpTier, isPublic)
        );
    },

    // ==========================================
    // 1. 創辦人掌控度面板
    // ==========================================

    renderFounderControlPanel(player) {
        const equityState = player.equity_state;
        const founderShares = equityState?.founder_shares || 100;
        const investorShares = equityState?.investor_shares || 0;
        const publicShares = equityState?.public_shares || 0;
        const isPublic = equityState?.is_public || player.is_public || false;

        // 計算掌控度分數 (0-100)
        const controlScore = this.calculateControlScore(founderShares, investorShares, publicShares);
        const controlLevel = this.getControlLevel(controlScore);

        // 掌控度影響因素
        const factors = this.getControlFactors(player);

        return React.createElement('div', {
            className: 'founder-control-panel',
            style: {
                background: 'rgba(0,245,255,0.05)',
                border: '1px solid rgba(0,245,255,0.2)',
                borderRadius: '8px',
                padding: '1rem'
            }
        },
            // 標題列
            React.createElement('div', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }
            },
                React.createElement('h3', {
                    style: { margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }
                }, '👤 創辦人掌控度'),
                React.createElement('span', {
                    style: {
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: controlLevel.color
                    }
                }, `${controlLevel.icon} ${controlLevel.name}`)
            ),

            // IPO後顯示股權結構圖，私有公司顯示掌控度進度條
            isPublic ? 
                React.createElement('div', { style: { marginBottom: '1rem' } },
                    this.renderSharesChart(equityState),
                    this.renderSharesDetail(equityState),
                    equityState.stock_price > 0 && this.renderStockPriceHistory(equityState, player)
                )
            :

            // 掌控度進度條
            React.createElement('div', {
                style: {
                    height: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '1rem'
                }
            },
                React.createElement('div', {
                    style: {
                        width: `${controlScore}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${controlLevel.color}, ${controlLevel.color}88)`,
                        transition: 'width 0.3s ease'
                    }
                })
            ),

            // 掌控度因素列表
            React.createElement('div', {
                style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }
            },
                factors.map((factor, idx) =>
                    React.createElement('div', {
                        key: idx,
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.4rem 0.6rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '4px',
                            fontSize: '0.8rem'
                        }
                    },
                        React.createElement('span', { 
                            style: { color: 'var(--text-secondary)' }
                        }, factor.label),
                        React.createElement('span', {
                            style: { 
                                color: factor.value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                                fontWeight: 'bold'
                            }
                        }, factor.value >= 0 ? `+${factor.value}` : factor.value)
                    )
                )
            ),

            // 掌控度效果說明
            React.createElement('div', {
                style: {
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                }
            },
                React.createElement('div', null, `📊 監管抵抗: ${(controlLevel.regulationResist * 100).toFixed(0)}%`),
                React.createElement('div', null, `💫 忠誠度加成: +${controlLevel.loyaltyBonus.toFixed(1)}/季`)
            )
        );
    },

    calculateControlScore(founder, investor, publicS) {
        // 基礎分數來自創辦人持股
        let score = founder;
        // 投資人持股會稀釋控制（但較少影響）
        score -= investor * 0.3;
        // 公開股份影響更大
        score -= publicS * 0.5;
        return Math.max(0, Math.min(100, score));
    },

    getControlLevel(score) {
        if (score >= 80) return { name: '絕對控制', icon: '👑', color: '#00ff88', regulationResist: 0.6, loyaltyBonus: 3 };
        if (score >= 60) return { name: '穩固控制', icon: '✊', color: '#44ff88', regulationResist: 0.45, loyaltyBonus: 2 };
        if (score >= 40) return { name: '多數控制', icon: '🤝', color: '#ffd000', regulationResist: 0.30, loyaltyBonus: 1 };
        if (score >= 20) return { name: '少數控制', icon: '⚖️', color: '#ff9900', regulationResist: 0.15, loyaltyBonus: 0 };
        return { name: '被動持股', icon: '📉', color: '#ff4444', regulationResist: 0, loyaltyBonus: -1 };
    },

    getControlFactors(player) {
        const equityState = player.equity_state || {};
        const factors = [];

        // 創辦人持股
        const founderShares = equityState.founder_shares || 100;
        factors.push({ label: '創辦人持股', value: Math.round(founderShares) });

        // 投資人持股影響
        const investorShares = equityState.investor_shares || 0;
        if (investorShares > 0) {
            factors.push({ label: '投資人稀釋', value: -Math.round(investorShares * 0.3) });
        }

        // 公開股份影響
        const publicShares = equityState.public_shares || 0;
        if (publicShares > 0) {
            factors.push({ label: '公開市場壓力', value: -Math.round(publicShares * 0.5) });
        }

        // 信任度加成
        const trust = player.trust || 0;
        if (trust > 50) {
            factors.push({ label: '公眾信任', value: Math.round((trust - 50) * 0.1) });
        }

        return factors;
    },

    // ==========================================
    // 2. 股權結構（IPO後）
    // ==========================================

    renderEquityStructure(player, onAction) {
        const equityState = player.equity_state;
        if (!equityState) return null;

        return React.createElement('div', {
            className: 'equity-structure',
            style: {
                background: 'rgba(0,255,136,0.05)',
                border: '1px solid rgba(0,255,136,0.2)',
                borderRadius: '8px',
                padding: '1rem'
            }
        },
            React.createElement('h3', {
                style: { margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--accent-green)' }
            }, '📊 股權結構'),

            // 股權比例圖
            this.renderSharesChart(equityState),

            // 股權詳情
            this.renderSharesDetail(equityState),

            // 股價資訊（如果有）
            equityState.stock_price > 0 && this.renderStockPriceHistory(equityState, player)
        );
    },

    renderSharesChart(equityState) {
        const shareTypes = window.EquityConfig?.SHARE_TYPES || {
            founder: { name: '創辦人', color: '#00f5ff', icon: '👤' },
            investor: { name: '投資人', color: '#ffd000', icon: '🏦' },
            public: { name: '公開市場', color: '#00ff88', icon: '📈' }
        };

        const shares = [
            { type: 'founder', value: equityState.founder_shares || 0, ...shareTypes.founder },
            { type: 'investor', value: equityState.investor_shares || 0, ...shareTypes.investor },
            { type: 'public', value: equityState.public_shares || 0, ...shareTypes.public }
        ].filter(s => s.value > 0);

        return React.createElement('div', {
            style: {
                display: 'flex',
                height: '28px',
                borderRadius: '14px',
                overflow: 'hidden',
                marginBottom: '0.75rem',
                border: '1px solid rgba(255,255,255,0.1)'
            }
        },
            shares.map(share =>
                React.createElement('div', {
                    key: share.type,
                    title: `${share.name}: ${share.value.toFixed(1)}%`,
                    style: {
                        width: `${share.value}%`,
                        background: share.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: '#000',
                        fontWeight: 'bold',
                        transition: 'width 0.3s ease'
                    }
                }, share.value >= 12 ? `${share.icon} ${share.value.toFixed(0)}%` : (share.value >= 8 ? `${share.value.toFixed(0)}%` : ''))
            )
        );
    },

    renderSharesDetail(equityState) {
        const items = [
            { label: '創辦人', value: equityState.founder_shares || 0, color: '#00f5ff', icon: '👤' },
            { label: '投資人', value: equityState.investor_shares || 0, color: '#ffd000', icon: '🏦' },
            { label: '公開市場', value: equityState.public_shares || 0, color: '#00ff88', icon: '📈' }
        ];

        return React.createElement('div', {
            style: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }
        },
            items.map(item =>
                React.createElement('div', {
                    key: item.label,
                    style: {
                        flex: 1,
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '4px',
                        borderLeft: `3px solid ${item.color}`,
                        textAlign: 'center'
                    }
                },
                    React.createElement('div', {
                        style: { fontSize: '0.7rem', color: 'var(--text-secondary)' }
                    }, `${item.icon} ${item.label}`),
                    React.createElement('div', {
                        style: { fontSize: '1rem', fontWeight: 'bold', color: item.color }
                    }, `${item.value.toFixed(1)}%`)
                )
            )
        );
    },

    renderStockPriceHistory(equityState, player) {
        const currentPrice = equityState.stock_price || 0;
        const history = equityState.stock_price_history || [];
        const prevPrice = history.length > 1 ? history[history.length - 2]?.price : currentPrice;
        const change = currentPrice - prevPrice;
        const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

        return React.createElement('div', {
            style: {
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                marginTop: '0.5rem'
            }
        },
            React.createElement('div', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
            },
                React.createElement('div', null,
                    React.createElement('div', {
                        style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                    }, '📈 股價'),
                    React.createElement('div', {
                        style: { fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }
                    }, `$${currentPrice.toFixed(2)}`)
                ),
                React.createElement('div', {
                    style: { textAlign: 'right' }
                },
                    React.createElement('div', {
                        style: { 
                            fontSize: '0.9rem',
                            color: change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                            fontWeight: 'bold'
                        }
                    }, `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`),
                    React.createElement('div', {
                        style: { fontSize: '0.7rem', color: 'var(--text-secondary)' }
                    }, `市值: $${(player.market_cap || 0).toFixed(0)}M`)
                )
            ),

            // 簡易股價走勢圖（最近8季）
            history.length > 1 && React.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '2px',
                    height: '40px',
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid rgba(255,255,255,0.05)'
                }
            },
                history.slice(-8).map((h, idx) => {
                    const maxPrice = Math.max(...history.slice(-8).map(x => x.price));
                    const minPrice = Math.min(...history.slice(-8).map(x => x.price));
                    const range = maxPrice - minPrice || 1;
                    const height = ((h.price - minPrice) / range) * 100;
                    const isLast = idx === history.slice(-8).length - 1;
                    
                    return React.createElement('div', {
                        key: idx,
                        style: {
                            flex: 1,
                            height: `${Math.max(10, height)}%`,
                            background: isLast ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)',
                            borderRadius: '2px',
                            transition: 'height 0.3s ease'
                        },
                        title: `Q${h.quarter || idx + 1}: $${h.price.toFixed(2)}`
                    });
                })
            )
        );
    },

    // ==========================================
    // 3. 財務行動區
    // ==========================================
    renderFinanceActions(player, globalParams, onAction, mpTier, isPublic) {
        return React.createElement('div', {
            className: 'finance-actions',
            style: {
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                padding: '1rem'
            }
        },
            React.createElement('h3', {
                style: { margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--text-primary)' }
            }, '⚡ 財務行動'),

            // ==========================================
            // 常態性財務操作（不分階段都存在）
            // ==========================================
            this.renderRegularFinanceActions(player, globalParams, onAction, mpTier, isPublic),

            // ==========================================
            // Pre-IPO 限定：一次性輪次融資
            // ==========================================
            !isPublic && this.renderPreIPOFundingRounds(player, globalParams, onAction),

            // ==========================================
            // IPO 區塊 (Tier 2+，尚未上市)
            // ==========================================
            mpTier >= 2 && !isPublic && this.renderIPOSection(player, globalParams, onAction),

            // ==========================================
            // Post-IPO 階段
            // ==========================================
            isPublic && this.renderPostIPOActions(player, globalParams, onAction)
        );
    },

    // ==========================================
    // 常態性財務操作（不分 Tier/IPO 階段都存在）
    // ==========================================
    renderRegularFinanceActions(player, globalParams, onAction, mpTier, isPublic) {
        const cooldowns = player.finance_cooldowns || {};

        // Tier 0 基礎行動（永遠可用）
        const tier0Actions = [
            {
                id: 'founderWork',
                name: '創始人打工',
                icon: '💼',
                description: '暫時外出接案賺錢，但會影響研發進度',
                effect: '+$25M 現金, 下季MP成長-20%',
                available: true,
                cooldown: cooldowns.founderWork || 0,
                color: '#ffd000'
            },
            {
                id: 'applyGrant',
                name: '申請獎助金',
                icon: '🏛️',
                description: '向政府或基金會申請研究補助',
                effect: '有機會獲得 $15-35M',
                available: true,
                cooldown: cooldowns.applyGrant || 0,
                color: '#00f5ff'
            },
            {
                id: 'emergencyLoan',
                name: '緊急貸款',
                icon: '🏦',
                description: '緊急向銀行借款（僅現金<$30M時可用）',
                effect: '+$40M 現金, +$60M 債務',
                available: player.cash < 30,
                cooldown: 0,
                color: '#ff4444',
                warning: true
            }
        ];

        return React.createElement('div', { style: { marginBottom: '1rem' } },
            // ==========================================
            // Tier 0 基礎財務
            // ==========================================
            React.createElement('div', {
                style: { 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }
            }, 
                React.createElement('span', null, '🌱'),
                '基礎財務'
            ),

            React.createElement('div', {
                style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }
            },
                tier0Actions.map(action => this.renderActionButton(action, onAction))
            ),

            // ==========================================
            // Tier1+ 債務操作（IPO前後皆可見）
            // ==========================================
            mpTier >= 1 && !isPublic && this.renderDebtSection(player, globalParams, onAction),

            // ==========================================
            // 戰略投資（可重複，常態性）
            // ==========================================
            this.renderStrategicInvestmentSection(player, globalParams, onAction)
        );
    },

    // ==========================================
    // 戰略投資區塊（可重複，常態性操作）
    // ==========================================
    renderStrategicInvestmentSection(player, globalParams, onAction) {
        const config = window.EquityConfig?.STRATEGIC_FUNDING;
        const strategicConfig = config?.STRATEGIC_INVESTMENT || config?.TYPES?.strategic;
        
        if (!strategicConfig) return null;

        const mpTier = player.mp_tier || 0;
        const equityState = player.equity_state || {};
        const cooldowns = equityState.equity_cooldowns || {};
        const cooldownRemaining = cooldowns.strategic || 0;
        
        const tierMet = mpTier >= strategicConfig.tier_required;
        const isOnCooldown = cooldownRemaining > 0;
        const available = tierMet && !isOnCooldown;
        
        // 計算已完成的戰略投資次數
        const fundingRounds = equityState.funding_rounds || [];
        const strategicCount = fundingRounds.filter(r => r.type === 'strategic').length;

        return React.createElement('div', {
            style: {
                background: 'rgba(255,213,0,0.05)',
                border: '1px solid rgba(255,213,0,0.2)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem'
            }
        },
            React.createElement('div', {
                style: { 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.75rem'
                }
            },
                React.createElement('h4', {
                    style: { margin: 0, fontSize: '0.9rem', color: 'var(--accent-yellow)' }
                }, '🏦 戰略投資'),
                React.createElement('div', {
                    style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }
                },
                    React.createElement('span', {
                        style: { 
                            fontSize: '0.7rem', 
                            color: 'var(--text-secondary)',
                            padding: '0.2rem 0.5rem',
                            background: 'rgba(255,213,0,0.2)',
                            borderRadius: '4px'
                        }
                    }, '🔄 可重複'),
                    strategicCount > 0 && React.createElement('span', {
                        style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                    }, `已完成 ${strategicCount} 次`)
                )
            ),

            React.createElement('button', {
                style: {
                    width: '100%',
                    padding: '0.75rem',
                    background: available ? 'rgba(255,213,0,0.1)' : 'rgba(255,255,255,0.03)',
                    border: available ? '1px solid rgba(255,213,0,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    cursor: available ? 'pointer' : 'not-allowed',
                    opacity: available ? 1 : 0.6,
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                },
                onClick: () => available && onAction('openFundingModal', { fundingType: 'strategic' }),
                disabled: !available
            },
                React.createElement('div', {
                    style: { 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.25rem'
                    }
                },
                    React.createElement('span', { 
                        style: { fontWeight: 'bold', color: available ? 'var(--accent-yellow)' : 'var(--text-secondary)' }
                    }, strategicConfig.name),
                    isOnCooldown && React.createElement('span', {
                        style: { 
                            fontSize: '0.75rem',
                            color: 'var(--accent-red)',
                            padding: '0.15rem 0.4rem',
                            background: 'rgba(255,68,68,0.2)',
                            borderRadius: '4px'
                        }
                    }, `⏳ ${cooldownRemaining} 回合`)
                ),
                React.createElement('div', {
                    style: { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }
                }, strategicConfig.description),
                React.createElement('div', {
                    style: { fontSize: '0.75rem', color: 'var(--accent-green)' }
                }, `$${strategicConfig.cash_range[0]}-${strategicConfig.cash_range[1]}M | 稀釋 ${strategicConfig.dilution_range[0]}-${strategicConfig.dilution_range[1]}%`),
                !tierMet && React.createElement('div', {
                    style: { fontSize: '0.7rem', color: 'var(--accent-red)', marginTop: '0.25rem' }
                }, `⚠ 需達到 Tier ${strategicConfig.tier_required}`)
            ),

            // 冷卻說明
            React.createElement('div', {
                style: { 
                    marginTop: '0.5rem',
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary)',
                    textAlign: 'center'
                }
            }, `每次戰略投資後需等待 ${strategicConfig.cooldown || 2} 回合冷卻`)
        );
    },

    // ==========================================
    // 債務操作區塊（Tier1+ 可用，僅IPO前顯示）
    // ==========================================

    renderDebtSection(player, globalParams, onAction) {
        const cooldowns = player.finance_cooldowns || {};
        const creditInfo = window.CreditEngine?.getCreditRatingInfo(player, globalParams) || {};

        return React.createElement('div', {
            style: {
                background: 'rgba(255,213,0,0.05)',
                border: '1px solid rgba(255,213,0,0.2)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem'
            }
        },
            React.createElement('div', {
                style: { 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.75rem'
                }
            },
                React.createElement('h4', {
                    style: { margin: 0, fontSize: '0.9rem', color: 'var(--accent-yellow)' }
                }, '💳 債務融資'),
                creditInfo.rating && React.createElement('span', {
                    style: { 
                        fontSize: '0.75rem', 
                        color: creditInfo.ratingConfig?.color || 'var(--text-secondary)',
                        padding: '0.2rem 0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px'
                    }
                }, `信用 ${creditInfo.rating}`)
            ),

            React.createElement('div', {
                style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }
            },
                // 發行公司債
                this.renderActionButton({
                    id: 'corporateBond',
                    name: '發行公司債',
                    icon: '📜',
                    description: `發債成本: ${((creditInfo.bondPremium || 0) * 100).toFixed(0)}%溢價`,
                    effect: `+$80M, +$${Math.round(80 * (1 + (creditInfo.bondPremium || 0)))}M債務`,
                    available: !creditInfo.junkBondOnly && (cooldowns.corporateBond || 0) <= 0,
                    cooldown: cooldowns.corporateBond || 0,
                    color: '#ffd000',
                    disabled: creditInfo.junkBondOnly
                }, onAction),

                // 償還債務
                this.renderActionButton({
                    id: 'repayDebt',
                    name: '償還債務',
                    icon: '💵',
                    description: '償還部分或全部債務',
                    effect: `當前: $${(player.debt || 0).toFixed(0)}M`,
                    available: player.debt > 0 && player.cash > 0,
                    cooldown: 0,
                    color: '#44ff88'
                }, onAction)
            ),

            // 垃圾債（僅當信用評級較低時顯示）
            creditInfo.junkBondOnly && React.createElement('div', {
                style: { marginTop: '0.5rem' }
            },
                this.renderActionButton({
                    id: 'junkBond',
                    name: '垃圾債券',
                    icon: '⚠️',
                    description: '高利率緊急融資',
                    effect: '+$200M, +$280M債務, Hype-5',
                    available: (cooldowns.junkBond || 0) <= 0,
                    cooldown: cooldowns.junkBond || 0,
                    color: '#ff4444',
                    warning: true
                }, onAction)
            )
        );
    },

    // ==========================================
    // Pre-IPO 限定：一次性輪次融資（種子→A→B）
    // ==========================================

    renderPreIPOFundingRounds(player, globalParams, onAction) {
        const config = window.EquityConfig?.STRATEGIC_FUNDING;
        const roundConfigs = config?.FUNDING_ROUNDS || {};
        const equityState = player.equity_state || {};
        const completedRounds = equityState.funding_rounds || [];
        const completedIds = completedRounds.filter(r => r.type !== 'strategic').map(r => r.type);
        const mpTier = player.mp_tier || 0;

        // 按順序排列輪次
        const orderedRounds = Object.values(roundConfigs)
            .filter(r => r.order !== undefined)
            .sort((a, b) => a.order - b.order);

        // 找出下一個可進行的輪次
        let nextRound = null;
        for (const round of orderedRounds) {
            if (completedIds.includes(round.id)) continue;
            
            // 檢查前置條件
            if (round.prerequisite && !completedIds.includes(round.prerequisite)) continue;
            
            nextRound = round;
            break;
        }

        // 如果所有輪次都完成了
        const allCompleted = completedIds.length >= orderedRounds.length;

        return React.createElement('div', {
            style: {
                background: 'rgba(0,245,255,0.05)',
                border: '1px solid rgba(0,245,255,0.2)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem'
            }
        },
            React.createElement('div', {
                style: { 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.75rem'
                }
            },
                React.createElement('h4', {
                    style: { margin: 0, fontSize: '0.9rem', color: 'var(--accent-cyan)' }
                }, '📊 輪次融資'),
                React.createElement('span', {
                    style: { 
                        fontSize: '0.7rem', 
                        color: 'var(--text-secondary)',
                        padding: '0.2rem 0.5rem',
                        background: 'rgba(0,245,255,0.2)',
                        borderRadius: '4px'
                    }
                }, '一次性 · IPO前限定')
            ),

            // 進度顯示
            React.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                }
            },
                orderedRounds.map((round, idx) => {
                    const isCompleted = completedIds.includes(round.id);
                    const isNext = nextRound?.id === round.id;
                    return React.createElement(React.Fragment, { key: round.id },
                        idx > 0 && React.createElement('span', { 
                            style: { color: 'var(--text-secondary)' }
                        }, '→'),
                        React.createElement('span', {
                            style: {
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                background: isCompleted ? 'var(--accent-green)' 
                                    : isNext ? 'rgba(0,245,255,0.3)' 
                                    : 'rgba(255,255,255,0.05)',
                                color: isCompleted ? '#000' 
                                    : isNext ? 'var(--accent-cyan)' 
                                    : 'var(--text-secondary)',
                                fontWeight: isCompleted || isNext ? 'bold' : 'normal',
                                border: isNext ? '1px solid var(--accent-cyan)' : 'none'
                            }
                        }, isCompleted ? `✓ ${round.name}` : round.name)
                    );
                })
            ),

            // 下一個可用輪次或完成狀態
            allCompleted 
                ? React.createElement('div', {
                    style: { 
                        color: 'var(--accent-green)', 
                        fontSize: '0.9rem',
                        padding: '0.75rem',
                        background: 'rgba(0,255,136,0.1)',
                        borderRadius: '6px',
                        textAlign: 'center'
                    }
                }, '✓ 所有輪次融資已完成！可準備 IPO')
                : nextRound 
                    ? this.renderFundingRoundButton(nextRound, mpTier, onAction)
                    : React.createElement('div', {
                        style: { 
                            color: 'var(--text-secondary)', 
                            fontSize: '0.85rem',
                            textAlign: 'center',
                            padding: '0.5rem'
                        }
                    }, '尚未滿足下一輪融資條件')
        );
    },

    renderFundingRoundButton(round, mpTier, onAction) {
        const tierMet = mpTier >= round.tier_required;
        const available = tierMet;

        return React.createElement('button', {
            style: {
                width: '100%',
                padding: '0.75rem',
                background: available ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: available ? '1px solid rgba(0,245,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                cursor: available ? 'pointer' : 'not-allowed',
                opacity: available ? 1 : 0.6,
                textAlign: 'left',
                transition: 'all 0.2s ease'
            },
            onClick: () => available && onAction('openFundingModal', { fundingType: round.id }),
            disabled: !available
        },
            React.createElement('div', {
                style: { 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem'
                }
            },
                React.createElement('span', { 
                    style: { fontWeight: 'bold', color: available ? 'var(--accent-cyan)' : 'var(--text-secondary)' }
                }, `🎯 ${round.name}`),
                React.createElement('span', {
                    style: { 
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        padding: '0.15rem 0.4rem',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px'
                    }
                }, '一次性')
            ),
            React.createElement('div', {
                style: { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }
            }, round.description),
            React.createElement('div', {
                style: { fontSize: '0.75rem', color: 'var(--accent-green)' }
            }, `$${round.cash_range[0]}-${round.cash_range[1]}M | 稀釋 ${round.dilution_range[0]}-${round.dilution_range[1]}%`),
            !tierMet && React.createElement('div', {
                style: { fontSize: '0.7rem', color: 'var(--accent-red)', marginTop: '0.25rem' }
            }, `⚠ 需達到 Tier ${round.tier_required}`)
        );
    },

    // ==========================================
    // IPO 區塊 (Tier 2)
    // ==========================================

    renderIPOSection(player, globalParams, onAction) {
        const eligibility = window.EquityEngine?.checkIPOEligibility(player) || { canIPO: false, reasons: [] };
        const creditInfo = window.CreditEngine?.getCreditRatingInfo(player, globalParams) || {};

        return React.createElement('div', {
            style: {
                background: 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(0,255,136,0.1))',
                border: '2px solid rgba(0,245,255,0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginTop: '1rem'
            }
        },
            React.createElement('div', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }
            },
                React.createElement('h4', {
                    style: { margin: 0, fontSize: '1.1rem', color: 'var(--accent-cyan)' }
                }, '🔔 IPO 上市'),
                creditInfo.rating && React.createElement('span', {
                    style: {
                        fontSize: '0.85rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        color: creditInfo.ratingConfig?.color || 'var(--text-secondary)'
                    }
                }, `${creditInfo.ratingConfig?.icon || '📊'} ${creditInfo.rating}`)
            ),

            // IPO 預估資訊
            React.createElement('div', {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                }
            },
                React.createElement('div', {
                    style: { textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }
                },
                    React.createElement('div', { style: { fontSize: '0.7rem', color: 'var(--text-secondary)' } }, '預估募資'),
                    React.createElement('div', { style: { fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-green)' } }, 
                        `$${Math.round((player.market_cap || 100) * (creditInfo.ipoMultiplier || 0.25) * 0.25)}M`)
                ),
                React.createElement('div', {
                    style: { textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }
                },
                    React.createElement('div', { style: { fontSize: '0.7rem', color: 'var(--text-secondary)' } }, '當前市值'),
                    React.createElement('div', { style: { fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' } }, 
                        `$${(player.market_cap || 100).toFixed(0)}M`)
                ),
                React.createElement('div', {
                    style: { textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }
                },
                    React.createElement('div', { style: { fontSize: '0.7rem', color: 'var(--text-secondary)' } }, '信任度'),
                    React.createElement('div', { style: { fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-cyan)' } }, 
                        `${(player.trust || 0).toFixed(0)}`)
                )
            ),

            // IPO 按鈕或需求
            eligibility.canIPO ? React.createElement('button', {
                style: {
                    width: '100%',
                    padding: '0.9rem',
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                },
                onClick: () => onAction('openIPOModal'),
                onMouseOver: (e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 15px rgba(0,245,255,0.4)'; },
                onMouseOut: (e) => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }
            }, '🚀 啟動 IPO') : React.createElement('div', {
                style: { 
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                }
            },
                React.createElement('div', { 
                    style: { color: 'var(--accent-yellow)', marginBottom: '0.5rem', fontWeight: 'bold' }
                }, '⚠️ IPO 條件尚未滿足'),
                eligibility.reasons.map((reason, idx) =>
                    React.createElement('div', {
                        key: idx,
                        style: { color: 'var(--text-secondary)', fontSize: '0.8rem', paddingLeft: '1rem' }
                    }, `• ${reason}`)
                )
            )
        );
    },

    // ==========================================
    // Post-IPO 行動 (上市後)
    // ==========================================

    renderPostIPOActions(player, globalParams, onAction) {
        const cooldowns = player.finance_cooldowns || {};
        const equityCooldowns = player.equity_state?.equity_cooldowns || {};
        const creditInfo = window.CreditEngine?.getCreditRatingInfo(player, globalParams) || {};

        return React.createElement('div', null,
            // 信用評級與債務面板
            this.renderCreditPanel(player, globalParams, creditInfo),

            // 股票操作
            React.createElement('div', {
                style: { marginTop: '1rem' }
            },
                React.createElement('div', {
                    style: { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }
                }, '📈 股票操作'),

                React.createElement('div', {
                    style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }
                },
                    // 增發新股
                    this.renderActionButton({
                        id: 'stockIssue',
                        name: '增發新股',
                        icon: '📈',
                        description: '向公開市場增發股份籌資',
                        effect: `+$${Math.round((player.market_cap || 100) * 0.12 * (creditInfo.stockIssueMultiplier || 1))}M, 稀釋5-12%`,
                        available: (equityCooldowns.stock_issue || 0) <= 0,
                        cooldown: equityCooldowns.stock_issue || 0,
                        color: '#00ff88'
                    }, onAction),

                    // 股票回購
                    this.renderActionButton({
                        id: 'stockBuyback',
                        name: '股票回購',
                        icon: '🔄',
                        description: '從公開市場回購股份',
                        effect: `-$80M, 掌控度提升`,
                        available: (equityCooldowns.stock_buyback || 0) <= 0 && player.cash >= 80,
                        cooldown: equityCooldowns.stock_buyback || 0,
                        color: '#00f5ff'
                    }, onAction)
                )
            ),

            // 債務操作
            React.createElement('div', {
                style: { marginTop: '1rem' }
            },
                React.createElement('div', {
                    style: { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }
                }, '💳 債務操作'),

                React.createElement('div', {
                    style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }
                },
                    // 發行公司債
                    this.renderActionButton({
                        id: 'corporateBond',
                        name: '發行公司債',
                        icon: '📜',
                        description: `發債成本: ${((creditInfo.bondPremium || 0) * 100).toFixed(0)}%溢價`,
                        effect: `+$80M, +$${Math.round(80 * (1 + (creditInfo.bondPremium || 0)))}M債務`,
                        available: !creditInfo.junkBondOnly && (cooldowns.corporateBond || 0) <= 0,
                        cooldown: cooldowns.corporateBond || 0,
                        color: '#ffd000',
                        disabled: creditInfo.junkBondOnly
                    }, onAction),

                    // 償還債務
                    this.renderActionButton({
                        id: 'repayDebt',
                        name: '償還債務',
                        icon: '💵',
                        description: '償還部分或全部債務',
                        effect: `當前: $${(player.debt || 0).toFixed(0)}M`,
                        available: player.debt > 0 && player.cash > 0,
                        cooldown: 0,
                        color: '#44ff88'
                    }, onAction)
                )
            )
        );
    },

    // ==========================================
    // 信用評級面板
    // ==========================================

    renderCreditPanel(player, globalParams, creditInfo) {
        const rating = creditInfo.rating || 'BBB';
        const ratingConfig = creditInfo.ratingConfig || {};
        const score = creditInfo.score || 50;
        const interestRate = creditInfo.interestRate || 0.05;
        const debtRatio = (player.debt || 0) / Math.max(100, player.market_cap || 100);

        // 危機等級
        let crisisLevel = null;
        if (debtRatio >= 1.5) crisisLevel = { level: 'default', color: '#990000', text: '💀 違約風險' };
        else if (debtRatio >= 1.2) crisisLevel = { level: 'critical', color: '#ff3300', text: '🚨 債務危機' };
        else if (debtRatio >= 0.8) crisisLevel = { level: 'warning', color: '#ff9900', text: '⚠️ 債務警告' };

        return React.createElement('div', {
            style: {
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${ratingConfig.color || 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                padding: '1rem'
            }
        },
            // 標題與評級
            React.createElement('div', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }
            },
                React.createElement('div', {
                    style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }
                },
                    React.createElement('span', {
                        style: { fontSize: '1.5rem' }
                    }, ratingConfig.icon || '📊'),
                    React.createElement('div', null,
                        React.createElement('div', {
                            style: { fontSize: '1.2rem', fontWeight: 'bold', color: ratingConfig.color || 'var(--text-primary)' }
                        }, rating),
                        React.createElement('div', {
                            style: { fontSize: '0.7rem', color: 'var(--text-secondary)' }
                        }, ratingConfig.name || '信用評級')
                    )
                ),
                crisisLevel && React.createElement('span', {
                    style: {
                        fontSize: '0.8rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: `${crisisLevel.color}33`,
                        color: crisisLevel.color,
                        fontWeight: 'bold'
                    }
                }, crisisLevel.text)
            ),

            // 關鍵指標
            React.createElement('div', {
                style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }
            },
                React.createElement('div', {
                    style: { textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }
                },
                    React.createElement('div', { style: { fontSize: '0.7rem', color: 'var(--text-secondary)' } }, '季度利率'),
                    React.createElement('div', { style: { fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)' } }, 
                        `${(interestRate * 100).toFixed(1)}%`)
                ),
                React.createElement('div', {
                    style: { textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }
                },
                    React.createElement('div', { style: { fontSize: '0.7rem', color: 'var(--text-secondary)' } }, '債務/市值'),
                    React.createElement('div', { style: { 
                        fontSize: '0.95rem', 
                        fontWeight: 'bold', 
                        color: debtRatio > 0.8 ? 'var(--accent-red)' : (debtRatio > 0.5 ? 'var(--accent-yellow)' : 'var(--accent-green)')
                    } }, `${(debtRatio * 100).toFixed(0)}%`)
                ),
                React.createElement('div', {
                    style: { textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }
                },
                    React.createElement('div', { style: { fontSize: '0.7rem', color: 'var(--text-secondary)' } }, '發債溢價'),
                    React.createElement('div', { style: { fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)' } }, 
                        `+${((creditInfo.bondPremium || 0) * 100).toFixed(0)}%`)
                )
            )
        );
    },

    // ==========================================
    // 通用行動按鈕
    // ==========================================

    renderActionButton(action, onAction) {
        const isAvailable = action.available && action.cooldown <= 0;

        return React.createElement('button', {
            key: action.id,
            style: {
                padding: '0.6rem',
                background: isAvailable ? `${action.color}15` : 'rgba(255,255,255,0.03)',
                border: isAvailable ? `1px solid ${action.color}40` : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                opacity: isAvailable ? 1 : 0.5,
                textAlign: 'left',
                transition: 'all 0.2s ease'
            },
            onClick: () => isAvailable && onAction(action.id),
            disabled: !isAvailable,
            title: action.description
        },
            React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }
            },
                React.createElement('span', null, action.icon),
                React.createElement('span', {
                    style: { fontWeight: 'bold', fontSize: '0.85rem', color: isAvailable ? action.color : 'var(--text-secondary)' }
                }, action.name),
                action.cooldown > 0 && React.createElement('span', {
                    style: { 
                        fontSize: '0.7rem', 
                        background: 'rgba(255,255,255,0.1)', 
                        padding: '0.1rem 0.3rem', 
                        borderRadius: '3px',
                        marginLeft: 'auto'
                    }
                }, `${action.cooldown}回合`)
            ),
            React.createElement('div', {
                style: { fontSize: '0.7rem', color: 'var(--text-secondary)' }
            }, action.effect),
            action.warning && React.createElement('div', {
                style: { fontSize: '0.65rem', color: 'var(--accent-red)', marginTop: '0.2rem' }
            }, '⚠️ 高風險')
        );
    },

    // ==========================================
    // IPO 彈窗
    // ==========================================

    renderIPOModal(player, globalParams, selectedScale, selectedPricing, onScaleChange, onPricingChange, onConfirm, onCancel) {
        const scaleOptions = window.EquityConfig?.IPO?.SCALE_OPTIONS || {};
        const pricingOptions = window.EquityConfig?.IPO?.PRICING_OPTIONS || {};
        const creditInfo = window.CreditEngine?.getCreditRatingInfo(player, globalParams) || {};

        // 計算預估數值
        const scaleConfig = scaleOptions[selectedScale] || {};
        const pricingConfig = pricingOptions[selectedPricing] || {};
        const marketCap = player.market_cap || 100;
        
        const baseCash = marketCap * (scaleConfig.cash_multiplier || 0.25);
        const estimatedCash = baseCash * (pricingConfig.cash_modifier || 1) * (creditInfo.ipoMultiplier || 1);
        const dilution = (scaleConfig.dilution || 0.2) * 100;

        return React.createElement('div', {
            className: 'modal-overlay',
            style: {
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }
        },
            React.createElement('div', {
                className: 'ipo-modal',
                style: {
                    background: 'linear-gradient(180deg, var(--bg-secondary), var(--bg-primary))',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '90%',
                    border: '2px solid var(--accent-cyan)',
                    boxShadow: '0 0 40px rgba(0,245,255,0.3)'
                }
            },
                // 標題
                React.createElement('h2', {
                    style: { margin: '0 0 1.5rem 0', color: 'var(--accent-cyan)', textAlign: 'center', fontSize: '1.5rem' }
                }, '🔔 IPO 配置'),

                // 發行規模選擇
                React.createElement('div', { style: { marginBottom: '1.5rem' } },
                    React.createElement('h4', { style: { margin: '0 0 0.75rem 0', color: 'var(--text-primary)' } }, '發行規模'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' } },
                        Object.entries(scaleOptions).map(([key, opt]) =>
                            React.createElement('button', {
                                key,
                                style: {
                                    padding: '0.75rem',
                                    background: selectedScale === key ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                                    border: selectedScale === key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: selectedScale === key ? '#000' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                },
                                onClick: () => onScaleChange(key)
                            },
                                React.createElement('div', { style: { fontSize: '1.2rem' } }, opt.icon),
                                React.createElement('div', { style: { fontWeight: 'bold', marginTop: '0.25rem' } }, opt.name),
                                React.createElement('div', { style: { fontSize: '0.7rem', opacity: 0.7 } }, `稀釋 ${(opt.dilution * 100).toFixed(0)}%`)
                            )
                        )
                    )
                ),

                // 定價策略選擇
                React.createElement('div', { style: { marginBottom: '1.5rem' } },
                    React.createElement('h4', { style: { margin: '0 0 0.75rem 0', color: 'var(--text-primary)' } }, '定價策略'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' } },
                        Object.entries(pricingOptions).map(([key, opt]) =>
                            React.createElement('button', {
                                key,
                                style: {
                                    padding: '0.75rem',
                                    background: selectedPricing === key ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                                    border: selectedPricing === key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: selectedPricing === key ? '#000' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                },
                                onClick: () => onPricingChange(key)
                            },
                                React.createElement('div', { style: { fontSize: '1.2rem' } }, opt.icon),
                                React.createElement('div', { style: { fontWeight: 'bold', marginTop: '0.25rem' } }, opt.name),
                                React.createElement('div', { style: { fontSize: '0.7rem', opacity: 0.7 } }, 
                                    key === 'high' ? `成功率 ${(opt.success_rate * 100).toFixed(0)}%` : '穩定完成'
                                )
                            )
                        )
                    )
                ),

                // 預估結果
                React.createElement('div', {
                    style: {
                        padding: '1rem',
                        background: 'rgba(0,245,255,0.1)',
                        borderRadius: '8px',
                        marginBottom: '1.5rem'
                    }
                },
                    React.createElement('h4', { style: { margin: '0 0 0.5rem 0', color: 'var(--accent-cyan)' } }, '📊 預估結果'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' } },
                        React.createElement('div', null,
                            React.createElement('div', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)' } }, '預計募資'),
                            React.createElement('div', { style: { fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent-green)' } }, 
                                `$${estimatedCash.toFixed(0)}M`)
                        ),
                        React.createElement('div', null,
                            React.createElement('div', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)' } }, '股權稀釋'),
                            React.createElement('div', { style: { fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent-yellow)' } }, 
                                `${dilution.toFixed(0)}%`)
                        )
                    ),
                    creditInfo.rating && React.createElement('div', {
                        style: { marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }
                    }, `信用評級 ${creditInfo.rating} 加成: ×${(creditInfo.ipoMultiplier || 1).toFixed(2)}`)
                ),

                // 按鈕
                React.createElement('div', { style: { display: 'flex', gap: '0.75rem' } },
                    React.createElement('button', {
                        style: {
                            flex: 1,
                            padding: '0.9rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        },
                        onClick: onCancel
                    }, '取消'),
                    React.createElement('button', {
                        style: {
                            flex: 1,
                            padding: '0.9rem',
                            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#000',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        },
                        onClick: () => onConfirm()
                    }, '🚀 確認 IPO')
                )
            )
        );
    },

    // ==========================================
    // 戰略融資彈窗
    // ==========================================

    renderFundingModal(player, fundingType, globalParams, selectedInvestor, onInvestorChange, onConfirm, onCancel) {
        const config = window.EquityConfig?.STRATEGIC_FUNDING;
        const typeConfig = config?.TYPES?.[fundingType];
        const investorProfiles = config?.INVESTOR_PROFILES || {};

        if (!typeConfig) return null;

        const investorConfig = investorProfiles[selectedInvestor];
        const cashRange = typeConfig.cash_range;
        const dilutionRange = typeConfig.dilution_range;

        return React.createElement('div', {
            className: 'modal-overlay',
            style: {
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }
        },
            React.createElement('div', {
                className: 'funding-modal',
                style: {
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    maxWidth: '450px',
                    width: '90%',
                    border: '1px solid var(--accent-yellow)'
                }
            },
                // 標題
                React.createElement('h2', { 
                    style: { margin: '0 0 1rem 0', color: 'var(--accent-yellow)', textAlign: 'center' }
                }, `🏦 ${typeConfig.name}`),

                React.createElement('p', {
                    style: { color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem' }
                }, typeConfig.description),

                // 投資人選擇
                React.createElement('div', { style: { marginBottom: '1.5rem' } },
                    React.createElement('h4', { style: { margin: '0 0 0.5rem 0', color: 'var(--text-primary)' } }, '選擇投資人'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' } },
                        Object.entries(investorProfiles).map(([key, inv]) =>
                            React.createElement('button', {
                                key,
                                style: {
                                    padding: '0.5rem',
                                    background: selectedInvestor === key ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.05)',
                                    border: selectedInvestor === key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: selectedInvestor === key ? '#000' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                },
                                onClick: () => onInvestorChange(key)
                            }, inv.name)
                        )
                    )
                ),

                // 預估範圍
                React.createElement('div', {
                    style: {
                        padding: '1rem',
                        background: 'rgba(255,213,0,0.1)',
                        borderRadius: '8px',
                        marginBottom: '1.5rem'
                    }
                },
                    React.createElement('div', {
                        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }
                    },
                        React.createElement('div', null,
                            React.createElement('div', { style: { fontSize: '0.8rem', color: 'var(--text-secondary)' } }, '預計籌資'),
                            React.createElement('div', { style: { fontWeight: 'bold', color: 'var(--accent-green)' } }, 
                                `$${cashRange[0]}-${cashRange[1]}M`)
                        ),
                        React.createElement('div', null,
                            React.createElement('div', { style: { fontSize: '0.8rem', color: 'var(--text-secondary)' } }, '預計稀釋'),
                            React.createElement('div', { style: { fontWeight: 'bold', color: 'var(--accent-yellow)' } }, 
                                `${dilutionRange[0]}-${dilutionRange[1]}%`)
                        )
                    ),
                    investorConfig?.industries && React.createElement('div', {
                        style: { marginTop: '0.5rem', fontSize: '0.85rem' }
                    },
                        React.createElement('span', { style: { color: 'var(--text-secondary)' } }, '親和度增益: '),
                        React.createElement('span', { style: { color: 'var(--accent-cyan)' } }, 
                            investorConfig.industries.join(', '))
                    )
                ),

                // 按鈕
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem' } },
                    React.createElement('button', {
                        style: {
                            flex: 1,
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        },
                        onClick: onCancel
                    }, '取消'),
                    React.createElement('button', {
                        style: {
                            flex: 1,
                            padding: '0.75rem',
                            background: 'var(--accent-yellow)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#000',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        },
                        onClick: () => onConfirm()
                    }, '確認融資')
                )
            )
        );
    }
};

// 全域註冊
window.FinancePanelUI = FinancePanelUI;
console.log('✓ Finance Panel UI loaded');