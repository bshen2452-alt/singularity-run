// ============================================
// 股權機制 UI (Equity UI)
// ============================================
// 設計：純介面組件，不包含業務邏輯計算
// 功能：顯示股權結構、IPO界面、融資操作

const EquityUI = {

    // ==========================================
    // 股權結構面板
    // ==========================================

    /**
     * 渲染股權結構面板
     * @param {Object} player - 玩家狀態
     * @param {Function} onAction - 操作回調
     * @returns {React.Element}
     */
    renderEquityPanel(player, onAction) {
        const equityState = player.equity_state;
        const config = window.EquityConfig;
        const engine = window.EquityEngine;
        
        if (!equityState || !config) {
            return React.createElement('div', { 
                className: 'equity-panel empty',
                style: { padding: '1rem', color: 'var(--text-secondary)' }
            }, '股權系統尚未初始化');
        }

        const summary = engine?.getEquitySummary(equityState);
        const shareTypes = config.SHARE_TYPES;

        return React.createElement('div', { className: 'equity-panel' },
            // 標題
            React.createElement('div', { 
                className: 'panel-header',
                style: { 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }
            },
                React.createElement('h3', { 
                    style: { margin: 0, color: 'var(--accent-cyan)' }
                }, '📊 股權結構'),
                summary?.control && React.createElement('span', {
                    style: { 
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)'
                    }
                }, `${summary.control.icon} ${summary.control.name}`)
            ),

            // 股權餅圖（簡化版）
            this.renderSharesChart(equityState, shareTypes),

            // 股權詳情
            this.renderSharesDetail(equityState, shareTypes, summary),

            // IPO狀態/操作區
            equityState.is_public 
                ? this.renderPublicCompanySection(player, equityState, onAction)
                : this.renderPrivateCompanySection(player, onAction),

            // 統計資訊
            summary && React.createElement('div', {
                className: 'equity-stats',
                style: {
                    marginTop: '1rem',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                }
            },
                React.createElement('div', { 
                    style: { display: 'flex', justifyContent: 'space-between' }
                },
                    React.createElement('span', null, `累計稀釋: ${summary.total_dilution.toFixed(1)}%`),
                    React.createElement('span', null, `累計籌資: $${summary.total_raised.toFixed(0)}M`)
                )
            )
        );
    },

    /**
     * 渲染股權比例圖
     */
    renderSharesChart(equityState, shareTypes) {
        const shares = [
            { type: 'founder', value: equityState.founder_shares, ...shareTypes.founder },
            { type: 'investor', value: equityState.investor_shares, ...shareTypes.investor },
            { type: 'public', value: equityState.public_shares, ...shareTypes.public }
        ].filter(s => s.value > 0);

        return React.createElement('div', {
            className: 'shares-chart',
            style: {
                display: 'flex',
                height: '24px',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '1rem'
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
                        minWidth: share.value > 5 ? 'auto' : '0'
                    }
                }, share.value >= 10 ? `${share.value.toFixed(0)}%` : '')
            )
        );
    },

    /**
     * 渲染股權詳情
     */
    renderSharesDetail(equityState, shareTypes, summary) {
        const effects = summary?.effects || {};

        const renderShareRow = (type, config, value, effect) => {
            return React.createElement('div', {
                key: type,
                className: 'share-row',
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '4px',
                    borderLeft: `3px solid ${config.color}`
                }
            },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' } },
                    React.createElement('span', null, config.icon),
                    React.createElement('span', null, config.name)
                ),
                React.createElement('div', { style: { textAlign: 'right' } },
                    React.createElement('div', { 
                        style: { fontWeight: 'bold', color: config.color }
                    }, `${value.toFixed(1)}%`),
                    effect && React.createElement('div', {
                        style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                    }, effect)
                )
            );
        };

        return React.createElement('div', { className: 'shares-detail' },
            renderShareRow('founder', shareTypes.founder, equityState.founder_shares,
                effects.founder?.control_level ? `控制力: ${effects.founder.control_level}` : null),
            renderShareRow('investor', shareTypes.investor, equityState.investor_shares,
                effects.investor?.affinity_bonus ? `親和度+${effects.investor.affinity_bonus.toFixed(0)}` : null),
            renderShareRow('public', shareTypes.public, equityState.public_shares,
                effects.public?.trust_bonus ? `信任+${effects.public.trust_bonus.toFixed(1)}` : null)
        );
    },

    // ==========================================
    // 私有公司區塊（IPO前）
    // ==========================================


    renderPrivateCompanySection(player, onAction) {
        const engine = window.EquityEngine;
        const eligibility = engine?.checkIPOEligibility(player) || { canIPO: false, reasons: [] };
        const fundingResult = engine?.getAvailableFundingOptions(player) || { fundingRounds: [], strategicInvestment: null };
        const { fundingRounds, strategicInvestment } = fundingResult;
        
        // 計算已完成的輪次
        const completedRounds = player.equity_state?.funding_rounds || [];
        const completedRoundIds = completedRounds.filter(r => r.type !== 'strategic').map(r => r.type);

        return React.createElement('div', { className: 'private-company-section' },

            // ==========================================
            // 輪次融資區塊（一次性：種子→A輪→B輪）
            // ==========================================
            React.createElement('div', {
                style: {
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'rgba(0,245,255,0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,245,255,0.2)'
                }
            },
                React.createElement('h4', { 
                    style: { margin: '0 0 0.75rem 0', color: 'var(--accent-cyan)' }
                }, '📊 輪次融資'),
                
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
                    ['seed', 'series_a', 'series_b'].map((roundId, idx) => {
                        const isCompleted = completedRoundIds.includes(roundId);
                        const roundNames = { seed: '種子輪', series_a: 'A輪', series_b: 'B輪' };
                        return React.createElement(React.Fragment, { key: roundId },
                            idx > 0 && React.createElement('span', { 
                                style: { color: 'var(--text-secondary)' }
                            }, '→'),
                            React.createElement('span', {
                                style: {
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    background: isCompleted ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                                    color: isCompleted ? '#000' : 'var(--text-secondary)',
                                    fontWeight: isCompleted ? 'bold' : 'normal'
                                }
                            }, isCompleted ? `✓ ${roundNames[roundId]}` : roundNames[roundId])
                        );
                    })
                ),
                
                // 下一個可用輪次
                fundingRounds.length > 0 
                    ? fundingRounds.map(opt => 
                        React.createElement('button', {
                            key: opt.id,
                            className: 'funding-btn',
                            disabled: !opt.available,
                            style: {
                                display: 'block',
                                width: '100%',
                                padding: '0.75rem',
                                marginBottom: '0.5rem',
                                background: opt.available ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${opt.available ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '4px',
                                color: opt.available ? 'var(--text-primary)' : 'var(--text-secondary)',
                                cursor: opt.available ? 'pointer' : 'not-allowed',
                                textAlign: 'left',
                                opacity: opt.available ? 1 : 0.6
                            },
                            onClick: () => opt.available && onAction('openFundingModal', { fundingType: opt.id })
                        },
                            React.createElement('div', { 
                                style: { 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }
                            },
                                React.createElement('span', { style: { fontWeight: 'bold' } }, 
                                    `🎯 ${opt.name}`),
                                React.createElement('span', { 
                                    style: { 
                                        fontSize: '0.8rem',
                                        padding: '0.2rem 0.5rem',
                                        background: 'rgba(0,245,255,0.2)',
                                        borderRadius: '4px'
                                    }
                                }, '一次性')
                            ),
                            React.createElement('div', { 
                                style: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }
                            }, opt.description),
                            React.createElement('div', { 
                                style: { fontSize: '0.8rem', color: 'var(--accent-green)', marginTop: '0.25rem' }
                            }, `$${opt.cash_range[0]}-${opt.cash_range[1]}M | 稀釋 ${opt.dilution_range[0]}-${opt.dilution_range[1]}%`),
                            !opt.available && opt.unavailable_reason && React.createElement('div', {
                                style: { fontSize: '0.75rem', color: 'var(--accent-yellow)', marginTop: '0.25rem' }
                            }, `⚠ ${opt.unavailable_reason}`)
                        )
                    )
                    : completedRoundIds.length >= 3
                        ? React.createElement('div', { 
                            style: { 
                                color: 'var(--accent-green)', 
                                fontSize: '0.9rem',
                                padding: '0.5rem',
                                background: 'rgba(0,255,136,0.1)',
                                borderRadius: '4px',
                                textAlign: 'center'
                            }
                        }, '✓ 所有輪次融資已完成')
                        : React.createElement('div', { 
                            style: { color: 'var(--text-secondary)', fontSize: '0.9rem' }
                        }, '尚未滿足下一輪融資條件')
            ),

            // ==========================================
            // 戰略投資區塊（可重複）
            // ==========================================
            React.createElement('div', {
                style: {
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'rgba(255,213,0,0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,213,0,0.2)'
                }
            },
                React.createElement('h4', { 
                    style: { margin: '0 0 0.5rem 0', color: 'var(--accent-yellow)' }
                }, '🏦 戰略投資'),
                
                strategicInvestment 
                    ? React.createElement('button', {
                        className: 'funding-btn strategic',
                        disabled: !strategicInvestment.available,
                        style: {
                            display: 'block',
                            width: '100%',
                            padding: '0.75rem',
                            background: strategicInvestment.available 
                                ? 'rgba(255,213,0,0.1)' 
                                : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${strategicInvestment.available 
                                ? 'var(--accent-yellow)' 
                                : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '4px',
                            color: strategicInvestment.available 
                                ? 'var(--text-primary)' 
                                : 'var(--text-secondary)',
                            cursor: strategicInvestment.available ? 'pointer' : 'not-allowed',
                            textAlign: 'left',
                            opacity: strategicInvestment.available ? 1 : 0.6
                        },
                        onClick: () => strategicInvestment.available && 
                            onAction('openFundingModal', { fundingType: 'strategic' })
                    },
                        React.createElement('div', { 
                            style: { 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }
                        },
                            React.createElement('span', { style: { fontWeight: 'bold' } }, 
                                strategicInvestment.name),
                            React.createElement('span', { 
                                style: { 
                                    fontSize: '0.8rem',
                                    padding: '0.2rem 0.5rem',
                                    background: 'rgba(255,213,0,0.2)',
                                    borderRadius: '4px'
                                }
                            }, `🔄 可重複 (CD: ${strategicInvestment.cooldown || 2}回合)`)
                        ),
                        React.createElement('div', { 
                            style: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }
                        }, strategicInvestment.description),
                        React.createElement('div', { 
                            style: { fontSize: '0.8rem', color: 'var(--accent-green)', marginTop: '0.25rem' }
                        }, `$${strategicInvestment.cash_range[0]}-${strategicInvestment.cash_range[1]}M | 稀釋 ${strategicInvestment.dilution_range[0]}-${strategicInvestment.dilution_range[1]}%`),
                        !strategicInvestment.available && strategicInvestment.unavailable_reason && 
                            React.createElement('div', {
                                style: { 
                                    fontSize: '0.75rem', 
                                    color: 'var(--accent-yellow)', 
                                    marginTop: '0.25rem' 
                                }
                            }, `⚠ ${strategicInvestment.unavailable_reason}`)
                    )
                    : React.createElement('div', { 
                        style: { color: 'var(--text-secondary)', fontSize: '0.9rem' }
                    }, '戰略投資功能尚未解鎖')
            ),

            // ==========================================
            // IPO 按鈕
            // ==========================================
            React.createElement('div', {
                style: {
                    padding: '1rem',
                    background: eligibility.canIPO 
                        ? 'rgba(0,245,255,0.1)' 
                        : 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: `1px solid ${eligibility.canIPO ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'}`
                }
            },
                React.createElement('h4', { 
                    style: { 
                        margin: '0 0 0.5rem 0', 
                        color: eligibility.canIPO ? 'var(--accent-cyan)' : 'var(--text-secondary)' 
                    }
                }, '📈 首次公開發行 (IPO)'),
                
                eligibility.canIPO
                    ? React.createElement('button', {
                        className: 'ipo-btn primary',
                        style: {
                            width: '100%',
                            padding: '0.75rem',
                            background: 'var(--accent-cyan)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#000',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        },
                        onClick: () => onAction('openIPOModal')
                    }, '🔔 發起 IPO')
                    : React.createElement('div', null,
                        eligibility.reasons.map((reason, i) => 
                            React.createElement('div', { 
                                key: i,
                                style: { 
                                    fontSize: '0.85rem', 
                                    color: 'var(--text-secondary)',
                                    marginBottom: '0.25rem'
                                }
                            }, `• ${reason}`)
                        )
                    )
            )
        );
    },

    // ==========================================
    // 上市公司區塊（IPO後）
    // ==========================================

    renderPublicCompanySection(player, equityState, onAction) {
        const cooldowns = equityState.equity_cooldowns || {};

        return React.createElement('div', { className: 'public-company-section' },
            // 股價資訊
            React.createElement('div', {
                style: {
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(0,255,136,0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,255,136,0.3)',
                    textAlign: 'center'
                }
            },
                React.createElement('div', { 
                    style: { fontSize: '0.85rem', color: 'var(--text-secondary)' }
                }, '當前股價'),
                React.createElement('div', { 
                    style: { 
                        fontSize: '1.8rem', 
                        fontWeight: 'bold', 
                        color: 'var(--accent-green)' 
                    }
                }, `$${(equityState.stock_price || 0).toFixed(2)}`),
                this.renderStockPriceHistory(equityState.stock_price_history)
            ),

            // 股票操作
            React.createElement('div', {
                style: {
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem'
                }
            },
                // 增發
                React.createElement('button', {
                    className: 'equity-action-btn',
                    disabled: cooldowns.stock_issue > 0,
                    style: {
                        padding: '0.75rem',
                        background: cooldowns.stock_issue > 0 
                            ? 'rgba(255,255,255,0.03)' 
                            : 'rgba(0,245,255,0.1)',
                        border: '1px solid rgba(0,245,255,0.3)',
                        borderRadius: '4px',
                        color: cooldowns.stock_issue > 0 
                            ? 'var(--text-secondary)' 
                            : 'var(--accent-cyan)',
                        cursor: cooldowns.stock_issue > 0 ? 'not-allowed' : 'pointer'
                    },
                    onClick: () => cooldowns.stock_issue <= 0 && onAction('openStockIssueModal')
                },
                    React.createElement('div', { style: { fontWeight: 'bold' } }, '📈 增發新股'),
                    React.createElement('div', { style: { fontSize: '0.8rem' } }, 
                        cooldowns.stock_issue > 0 ? `冷卻: ${cooldowns.stock_issue}回合` : '籌集資金'
                    )
                ),

                // 回購
                React.createElement('button', {
                    className: 'equity-action-btn',
                    disabled: cooldowns.stock_buyback > 0,
                    style: {
                        padding: '0.75rem',
                        background: cooldowns.stock_buyback > 0 
                            ? 'rgba(255,255,255,0.03)' 
                            : 'rgba(255,213,0,0.1)',
                        border: '1px solid rgba(255,213,0,0.3)',
                        borderRadius: '4px',
                        color: cooldowns.stock_buyback > 0 
                            ? 'var(--text-secondary)' 
                            : 'var(--accent-yellow)',
                        cursor: cooldowns.stock_buyback > 0 ? 'not-allowed' : 'pointer'
                    },
                    onClick: () => cooldowns.stock_buyback <= 0 && onAction('openStockBuybackModal')
                },
                    React.createElement('div', { style: { fontWeight: 'bold' } }, '🔄 股票回購'),
                    React.createElement('div', { style: { fontSize: '0.8rem' } }, 
                        cooldowns.stock_buyback > 0 ? `冷卻: ${cooldowns.stock_buyback}回合` : '提升控制力'
                    )
                )
            )
        );
    },

    /**
     * 渲染股價歷史迷你圖
     */
    renderStockPriceHistory(history) {
        if (!history || history.length < 2) return null;

        const recent = history.slice(-8);
        const max = Math.max(...recent.map(h => h.price));
        const min = Math.min(...recent.map(h => h.price));
        const range = max - min || 1;

        return React.createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                height: '30px',
                gap: '2px',
                marginTop: '0.5rem'
            }
        },
            recent.map((h, i) => 
                React.createElement('div', {
                    key: i,
                    style: {
                        width: '8px',
                        height: `${((h.price - min) / range) * 100}%`,
                        minHeight: '4px',
                        background: i === recent.length - 1 
                            ? 'var(--accent-green)' 
                            : 'rgba(0,255,136,0.4)',
                        borderRadius: '2px'
                    }
                })
            )
        );
    },

    // ==========================================
    // IPO 彈窗
    // ==========================================

    renderIPOModal(player, onConfirm, onCancel) {
        const config = window.EquityConfig?.IPO;
        const [selectedScale, setScale] = React.useState('medium');
        const [selectedPricing, setPricing] = React.useState('low');

        if (!config) return null;

        const scaleConfig = config.SCALE_OPTIONS[selectedScale];
        const pricingConfig = config.PRICING_OPTIONS[selectedPricing];
        
        // 預估結果
        const estimatedCash = (player.market_cap || 500) * 
            scaleConfig.cash_multiplier * pricingConfig.cash_modifier;
        const dilution = scaleConfig.dilution * 100;

        return React.createElement('div', {
            className: 'modal-overlay',
            style: {
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }
        },
            React.createElement('div', {
                className: 'ipo-modal',
                style: {
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    maxWidth: '500px',
                    width: '90%',
                    border: '1px solid var(--accent-cyan)'
                }
            },
                // 標題
                React.createElement('h2', { 
                    style: { 
                        margin: '0 0 1.5rem 0', 
                        color: 'var(--accent-cyan)',
                        textAlign: 'center'
                    }
                }, '🔔 首次公開發行 (IPO)'),

                // 發行規模選擇
                React.createElement('div', { style: { marginBottom: '1.5rem' } },
                    React.createElement('h4', { 
                        style: { margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }
                    }, '發行規模'),
                    React.createElement('div', {
                        style: { display: 'flex', gap: '0.5rem' }
                    },
                        Object.entries(config.SCALE_OPTIONS).map(([key, opt]) =>
                            React.createElement('button', {
                                key,
                                style: {
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: selectedScale === key 
                                        ? 'var(--accent-cyan)' 
                                        : 'rgba(255,255,255,0.05)',
                                    border: selectedScale === key 
                                        ? 'none' 
                                        : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: selectedScale === key ? '#000' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: selectedScale === key ? 'bold' : 'normal'
                                },
                                onClick: () => setScale(key)
                            },
                                React.createElement('div', null, opt.icon),
                                React.createElement('div', { style: { fontSize: '0.9rem' } }, opt.name),
                                React.createElement('div', { 
                                    style: { fontSize: '0.75rem', opacity: 0.8 }
                                }, `稀釋 ${opt.dilution * 100}%`)
                            )
                        )
                    )
                ),

                // 定價策略選擇
                React.createElement('div', { style: { marginBottom: '1.5rem' } },
                    React.createElement('h4', { 
                        style: { margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }
                    }, '定價策略'),
                    React.createElement('div', {
                        style: { display: 'flex', gap: '0.5rem' }
                    },
                        Object.entries(config.PRICING_OPTIONS).map(([key, opt]) =>
                            React.createElement('button', {
                                key,
                                style: {
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: selectedPricing === key 
                                        ? 'var(--accent-yellow)' 
                                        : 'rgba(255,255,255,0.05)',
                                    border: selectedPricing === key 
                                        ? 'none' 
                                        : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: selectedPricing === key ? '#000' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: selectedPricing === key ? 'bold' : 'normal'
                                },
                                onClick: () => setPricing(key)
                            },
                                React.createElement('div', null, opt.icon),
                                React.createElement('div', { style: { fontSize: '0.9rem' } }, opt.name),
                                React.createElement('div', { 
                                    style: { fontSize: '0.75rem', opacity: 0.8 }
                                }, key === 'high' ? '風險75%成功' : '保守穩定')
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
                    React.createElement('h4', { 
                        style: { margin: '0 0 0.5rem 0', color: 'var(--accent-cyan)' }
                    }, '預估結果'),
                    React.createElement('div', {
                        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }
                    },
                        React.createElement('div', null,
                            React.createElement('div', { 
                                style: { fontSize: '0.8rem', color: 'var(--text-secondary)' }
                            }, '預計籌資'),
                            React.createElement('div', { 
                                style: { fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-green)' }
                            }, `$${estimatedCash.toFixed(0)}M`)
                        ),
                        React.createElement('div', null,
                            React.createElement('div', { 
                                style: { fontSize: '0.8rem', color: 'var(--text-secondary)' }
                            }, '股權稀釋'),
                            React.createElement('div', { 
                                style: { fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-yellow)' }
                            }, `${dilution}%`)
                        )
                    )
                ),

                // 按鈕
                React.createElement('div', {
                    style: { display: 'flex', gap: '0.5rem' }
                },
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
                            background: 'var(--accent-cyan)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#000',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        },
                        onClick: () => onConfirm(selectedScale, selectedPricing)
                    }, '確認 IPO')
                )
            )
        );
    },

    // ==========================================
    // 戰略融資彈窗
    // ==========================================

    renderFundingModal(player, fundingType, onConfirm, onCancel) {
        const config = window.EquityConfig?.STRATEGIC_FUNDING;
        const typeConfig = config?.TYPES?.[fundingType];
        const investorProfiles = config?.INVESTOR_PROFILES || {};
        
        const [selectedInvestor, setInvestor] = React.useState(
            Object.keys(investorProfiles)[0] || 'tech_vc'
        );

        if (!typeConfig) return null;

        const investorConfig = investorProfiles[selectedInvestor];
        const cashRange = typeConfig.cash_range;
        const dilutionRange = typeConfig.dilution_range;

        return React.createElement('div', {
            className: 'modal-overlay',
            style: {
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)',
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
                    style: { 
                        margin: '0 0 1rem 0', 
                        color: 'var(--accent-yellow)',
                        textAlign: 'center'
                    }
                }, `🏦 ${typeConfig.name}`),

                React.createElement('p', {
                    style: { 
                        color: 'var(--text-secondary)', 
                        textAlign: 'center',
                        marginBottom: '1.5rem'
                    }
                }, typeConfig.description),

                // 投資人選擇
                React.createElement('div', { style: { marginBottom: '1.5rem' } },
                    React.createElement('h4', { 
                        style: { margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }
                    }, '選擇投資人'),
                    React.createElement('div', {
                        style: { 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(2, 1fr)', 
                            gap: '0.5rem' 
                        }
                    },
                        Object.entries(investorProfiles).map(([key, inv]) =>
                            React.createElement('button', {
                                key,
                                style: {
                                    padding: '0.5rem',
                                    background: selectedInvestor === key 
                                        ? 'var(--accent-yellow)' 
                                        : 'rgba(255,255,255,0.05)',
                                    border: selectedInvestor === key 
                                        ? 'none' 
                                        : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: selectedInvestor === key ? '#000' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                },
                                onClick: () => setInvestor(key)
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
                            React.createElement('div', { 
                                style: { fontSize: '0.8rem', color: 'var(--text-secondary)' }
                            }, '預計籌資'),
                            React.createElement('div', { 
                                style: { fontWeight: 'bold', color: 'var(--accent-green)' }
                            }, `$${cashRange[0]}-${cashRange[1]}M`)
                        ),
                        React.createElement('div', null,
                            React.createElement('div', { 
                                style: { fontSize: '0.8rem', color: 'var(--text-secondary)' }
                            }, '預計稀釋'),
                            React.createElement('div', { 
                                style: { fontWeight: 'bold', color: 'var(--accent-yellow)' }
                            }, `${dilutionRange[0]}-${dilutionRange[1]}%`)
                        )
                    ),
                    investorConfig?.industries && React.createElement('div', {
                        style: { marginTop: '0.5rem', fontSize: '0.85rem' }
                    },
                        React.createElement('span', { 
                            style: { color: 'var(--text-secondary)' }
                        }, '親和度增益: '),
                        React.createElement('span', { 
                            style: { color: 'var(--accent-cyan)' }
                        }, investorConfig.industries.join(', '))
                    )
                ),

                // 按鈕
                React.createElement('div', {
                    style: { display: 'flex', gap: '0.5rem' }
                },
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
                        onClick: () => onConfirm(fundingType, selectedInvestor)
                    }, '確認融資')
                )
            )
        );
    }
};

// 全域註冊
window.EquityUI = EquityUI;
console.log('✓ Equity UI loaded');
