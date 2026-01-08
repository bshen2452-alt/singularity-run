// ============================================
// 社群系統 UI 元件 - Community UI
// ============================================
// 功能：呈現社群三指標和戰略選擇介面
// 設計：純 UI 呈現，不包含業務邏輯

/**
 * 社群面板元件
 */
function CommunityPanel({ player, onStrategy, disabled }) {
    const config = window.COMMUNITY_CONFIG || {};
    const CommunityEng = window.CommunityEngine || {};
    
    // 取得社群摘要
    const summary = CommunityEng.getCommunitySummary ? 
        CommunityEng.getCommunitySummary(player) : null;
    
    if (!summary) {
        return React.createElement('div', { 
            className: 'community-panel locked',
            style: { padding: '20px', textAlign: 'center', opacity: 0.6 }
        }, '社群系統載入中...');
    }
    
    // 未解鎖狀態
    if ((player.mp_tier || 0) < 1) {
        return React.createElement('div', { 
            className: 'community-panel locked',
            style: {
                padding: '20px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                textAlign: 'center'
            }
        }, [
            React.createElement('div', { 
                key: 'icon',
                style: { fontSize: '48px', marginBottom: '10px', opacity: 0.5 }
            }, '🔒'),
            React.createElement('div', { 
                key: 'text',
                style: { color: '#888' }
            }, '達成 Tier 1 里程碑後解鎖社群系統')
        ]);
    }
    
    return React.createElement('div', { 
        className: 'community-panel',
        style: {
            background: 'linear-gradient(135deg, rgba(20,20,40,0.9), rgba(30,30,60,0.9))',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(100,100,255,0.3)'
        }
    }, [
        // 標題
        React.createElement('h3', { 
            key: 'title',
            style: { 
                margin: '0 0 15px 0', 
                color: '#00f5ff',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }
        }, [
            React.createElement('span', { key: 'icon' }, '👥'),
            '社群系統'
        ]),
        
        // 三指標顯示
        React.createElement('div', {
            key: 'indicators',
            style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '15px',
                marginBottom: '20px'
            }
        }, [
            // 規模指標
            React.createElement(CommunityIndicator, {
                key: 'size',
                label: '社群規模',
                value: summary.size.toLocaleString(),
                subLabel: summary.sizeTier?.name || '無',
                icon: summary.sizeTier?.icon || '👥',
                color: '#00f5ff'
            }),
            
            // 情緒指標
            React.createElement(CommunityIndicator, {
                key: 'sentiment',
                label: '社群情緒',
                value: Math.round(summary.sentiment),
                maxValue: 100,
                subLabel: summary.sentimentLevel?.name || '中立',
                icon: summary.sentimentLevel?.icon || '😐',
                color: summary.sentimentLevel?.color || '#888',
                showBar: true
            }),
            
            // 活躍度指標
            React.createElement(CommunityIndicator, {
                key: 'engagement',
                label: '活躍度',
                value: Math.round(summary.engagement),
                maxValue: 100,
                subLabel: summary.engagementLevel?.name || '一般',
                icon: summary.engagementLevel?.icon || '👀',
                color: summary.engagementLevel?.color || '#888',
                showBar: true
            })
        ]),
        
        // 預估收益
        React.createElement('div', {
            key: 'estimates',
            style: {
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '15px'
            }
        }, [
            React.createElement('div', {
                key: 'title',
                style: { fontSize: '12px', color: '#888', marginBottom: '8px' }
            }, '預估下季社群貢獻'),
            React.createElement('div', {
                key: 'content',
                style: { 
                    display: 'flex', 
                    justifyContent: 'space-around',
                    fontSize: '14px'
                }
            }, [
                React.createElement('span', { key: 'revenue' }, [
                    React.createElement('span', { 
                        key: 'label',
                        style: { color: '#44ff88' } 
                    }, '💰 收入: '),
                    `$${summary.estimatedRevenue.toFixed(1)}M`
                ]),
                React.createElement('span', { key: 'high' }, [
                    React.createElement('span', { 
                        key: 'label',
                        style: { color: '#ffcc00' } 
                    }, '📊 高級數據: '),
                    summary.estimatedData.high_data
                ]),
                React.createElement('span', { key: 'low' }, [
                    React.createElement('span', { 
                        key: 'label',
                        style: { color: '#888' } 
                    }, '📋 低級數據: '),
                    summary.estimatedData.low_data
                ])
            ])
        ]),
        
        // 路線偏好提示
        React.createElement('div', {
            key: 'route-info',
            style: {
                fontSize: '12px',
                color: '#888',
                marginBottom: '15px',
                padding: '8px',
                background: 'rgba(100,100,255,0.1)',
                borderRadius: '4px'
            }
        }, [
            React.createElement('strong', { 
                key: 'route',
                style: { color: '#aa88ff' }
            }, `${player.route} 路線: `),
            summary.routePreference?.description || '標準社群依賴'
        ]),
        
        // 效果強度指示
        React.createElement('div', {
            key: 'effect-mult',
            style: {
                fontSize: '12px',
                textAlign: 'center',
                marginBottom: '10px'
            }
        }, [
            '當前效果強度: ',
            React.createElement('span', {
                key: 'value',
                style: { 
                    color: summary.effectMultiplier >= 1.5 ? '#ffcc00' : 
                           summary.effectMultiplier >= 1.0 ? '#44ff88' : '#ff6666',
                    fontWeight: 'bold'
                }
            }, `×${summary.effectMultiplier.toFixed(1)}`)
        ])
    ]);
}

/**
 * 社群指標元件
 */
function CommunityIndicator({ label, value, maxValue, subLabel, icon, color, showBar }) {
    return React.createElement('div', {
        style: {
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
        }
    }, [
        // 圖標和標籤
        React.createElement('div', {
            key: 'header',
            style: { 
                fontSize: '12px', 
                color: '#888',
                marginBottom: '5px'
            }
        }, label),
        
        // 圖標
        React.createElement('div', {
            key: 'icon',
            style: { fontSize: '24px', marginBottom: '5px' }
        }, icon),
        
        // 數值
        React.createElement('div', {
            key: 'value',
            style: { 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: color
            }
        }, typeof value === 'number' && maxValue ? `${value}/${maxValue}` : value),
        
        // 進度條（可選）
        showBar && React.createElement('div', {
            key: 'bar',
            style: {
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                marginTop: '8px',
                overflow: 'hidden'
            }
        }, React.createElement('div', {
            style: {
                height: '100%',
                width: `${(value / maxValue) * 100}%`,
                background: color,
                borderRadius: '2px',
                transition: 'width 0.3s ease'
            }
        })),
        
        // 等級標籤
        React.createElement('div', {
            key: 'sublabel',
            style: { 
                fontSize: '11px', 
                color: color,
                marginTop: '5px'
            }
        }, subLabel)
    ]);
}

/**
 * 社群戰略選擇面板
 */
function CommunityStrategyPanel({ player, onSelectStrategy, disabled, selectedStrategy }) {
    const config = window.COMMUNITY_CONFIG || {};
    const strategies = config.STRATEGIES || {};
    
    // 未解鎖狀態
    if ((player.mp_tier || 0) < 1) {
        return null;
    }
    
    return React.createElement('div', {
        className: 'community-strategy-panel',
        style: {
            background: 'rgba(20,20,40,0.8)',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '15px'
        }
    }, [
        React.createElement('h4', {
            key: 'title',
            style: { 
                margin: '0 0 12px 0', 
                color: '#aa88ff',
                fontSize: '14px'
            }
        }, '📢 社群戰略（每季可選一個）'),
        
        React.createElement('div', {
            key: 'strategies',
            style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '10px'
            }
        }, Object.entries(strategies).map(([id, strategy]) => {
            const isSelected = selectedStrategy === id;
            const canAfford = player.cash >= (strategy.costs?.cash || 0);
            const meetsRequirements = !strategy.requires?.min_engagement || 
                (player.community?.engagement || 0) >= strategy.requires.min_engagement;
            const isDisabled = disabled || !canAfford || !meetsRequirements;
            
            return React.createElement('button', {
                key: id,
                onClick: () => !isDisabled && onSelectStrategy(id),
                disabled: isDisabled,
                style: {
                    background: isSelected ? 'rgba(100,100,255,0.3)' : 'rgba(0,0,0,0.3)',
                    border: isSelected ? '2px solid #aa88ff' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    textAlign: 'left',
                    color: '#fff',
                    transition: 'all 0.2s ease'
                }
            }, [
                // 標題行
                React.createElement('div', {
                    key: 'header',
                    style: { 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '5px'
                    }
                }, [
                    React.createElement('span', { key: 'icon', style: { fontSize: '18px' } }, strategy.icon),
                    React.createElement('span', { 
                        key: 'name',
                        style: { fontWeight: 'bold', color: isSelected ? '#aa88ff' : '#fff' }
                    }, strategy.name)
                ]),
                
                // 描述
                React.createElement('div', {
                    key: 'desc',
                    style: { fontSize: '11px', color: '#888', marginBottom: '5px' }
                }, strategy.description),
                
                // 費用
                strategy.costs?.cash && React.createElement('div', {
                    key: 'cost',
                    style: { 
                        fontSize: '11px', 
                        color: canAfford ? '#44ff88' : '#ff6666'
                    }
                }, `💰 費用: $${strategy.costs.cash}M`),
                
                // 需求
                strategy.requires?.min_engagement && React.createElement('div', {
                    key: 'req',
                    style: { 
                        fontSize: '11px', 
                        color: meetsRequirements ? '#888' : '#ff6666'
                    }
                }, `📊 需要活躍度 ≥ ${strategy.requires.min_engagement}`)
            ]);
        }))
    ]);
}

/**
 * 社群事件通知元件
 */
function CommunityEventNotification({ event, onDismiss }) {
    if (!event) return null;
    
    const isPositive = event.pool === 'community_positive' || event.pool === 'viral_events';
    
    return React.createElement('div', {
        className: 'community-event-notification',
        style: {
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: isPositive ? 
                'linear-gradient(135deg, rgba(40,80,40,0.95), rgba(20,60,20,0.95))' :
                'linear-gradient(135deg, rgba(80,40,40,0.95), rgba(60,20,20,0.95))',
            border: `2px solid ${isPositive ? '#44ff88' : '#ff4466'}`,
            borderRadius: '12px',
            padding: '20px 30px',
            zIndex: 1000,
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: `0 0 30px ${isPositive ? 'rgba(68,255,136,0.3)' : 'rgba(255,68,102,0.3)'}`
        }
    }, [
        React.createElement('div', {
            key: 'icon',
            style: { fontSize: '36px', marginBottom: '10px' }
        }, isPositive ? '🎉' : '⚠️'),
        
        React.createElement('div', {
            key: 'title',
            style: { 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: isPositive ? '#44ff88' : '#ff4466',
                marginBottom: '10px'
            }
        }, event.name),
        
        React.createElement('div', {
            key: 'desc',
            style: { 
                fontSize: '14px', 
                color: '#ccc',
                marginBottom: '15px'
            }
        }, event.desc),
        
        React.createElement('button', {
            key: 'dismiss',
            onClick: onDismiss,
            style: {
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                padding: '8px 20px',
                color: '#fff',
                cursor: 'pointer'
            }
        }, '確認')
    ]);
}

// ============================================
// UI 元件全局註冊
// ============================================

(function() {
    'use strict';
    
    window.CommunityUI = {
        CommunityPanel,
        CommunityIndicator,
        CommunityStrategyPanel,
        CommunityEventNotification
    };
    
    console.log('✓ Community UI loaded');
})();
