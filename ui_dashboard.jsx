// ============================================
// 奇點競速 - 儀表板 UI 組件 (Dashboard UI)
// ============================================
// 純介面層，直接使用 processData 數據

(function() {
    'use strict';

    const { useState, useMemo } = React;

    // ============================================
    // 輔助函數
    // ============================================
    
    const fmt = (num, dec = 0) => {
        if (num === undefined || num === null || isNaN(num)) return '0';
        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(dec);
    };

    const fmtCash = (num) => {
        if (num === undefined || num === null || isNaN(num)) return '$0M';
        return (num < 0 ? '-' : '') + '$' + fmt(Math.abs(num)) + 'M';
    };

    const C = {
        pos: '#00ff88', neg: '#ff3366', warn: '#ffd000', 
        cyan: '#00f5ff', magenta: '#ff00aa', muted: '#a0a0b0'
    };

    const card = {
        background: 'rgba(20, 20, 30, 0.85)',
        border: '1px solid rgba(0, 245, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px 16px',
        backdropFilter: 'blur(10px)',
        marginBottom: '12px'
    };

    // ============================================
    // 1. 關鍵指標列
    // ============================================
    
    function KeyMetricsBar({ player, derived }) {
        const metrics = [
            { label: '營運資金', value: fmtCash(player.cash), color: player.cash >= 0 ? C.pos : C.neg, icon: '💵' },
            { label: '算力需求', value: `${fmt(derived?.active_pflops)} PF`, color: C.cyan, icon: '💻' },
            { label: 'MP進度', value: fmt(player.model_power), sub: `T${player.mp_tier}`, color: C.magenta, icon: '🧠' },
            { label: '總員工數', value: (player.talent?.turing||0) + (player.talent?.senior||0) + (player.talent?.junior||0), color: C.pos, icon: '👥' },
            { label: '公司市值', value: fmtCash(player.market_cap), color: C.cyan, icon: '📈' }
        ];

        return (
            <div style={{ ...card, display: 'flex', justifyContent: 'space-between', padding: '12px 24px' }}>
                {metrics.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingRight: i < 4 ? '16px' : 0 }}>
                        <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase' }}>{m.label}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: m.color }}>
                                {m.value}{m.sub && <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '4px' }}>{m.sub}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ============================================
    // 2. 警示區
    // ============================================
    
    function AlertSection({ player, derived, rivals }) {
        const alerts = useMemo(() => {
            if (window.DashboardEngine?.generateAlerts) {
                return window.DashboardEngine.generateAlerts(player, derived, rivals);
            }
            // 回退：內建警示邏輯
            const list = [];
            if (player.cash < 0) list.push({ level: 'danger', icon: '💸', text: '現金為負', category: '財務' });
            if (player.loyalty < 40) list.push({ level: 'danger', icon: '😤', text: '忠誠度過低', category: '營運' });
            if (player.entropy > 80) list.push({ level: 'danger', icon: '🌀', text: '熵值過高', category: '技術' });
            return list;
        }, [player, derived, rivals]);

        if (alerts.length === 0) {
            return (
                <div style={{ ...card, borderColor: C.pos, background: 'rgba(0,255,136,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                    <span style={{ color: C.pos, fontWeight: 600 }}>一切正常</span>
                    <span style={{ color: C.muted, fontSize: '0.85rem' }}>— 當前無需緊急處理的問題</span>
                </div>
            );
        }

        const hasDanger = alerts.some(a => a.level === 'danger');
        return (
            <div style={{ ...card, borderColor: hasDanger ? C.neg : C.warn, padding: '8px 16px' }}>
                <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '8px' }}>⚠️ 需要注意 ({alerts.length})</div>
                {alerts.map((a, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '6px 10px', marginBottom: '4px',
                        background: a.level === 'danger' ? 'rgba(255,51,102,0.15)' : 'rgba(255,208,0,0.15)',
                        borderRadius: '4px', borderLeft: `3px solid ${a.level === 'danger' ? C.neg : C.warn}`
                    }}>
                        <span>{a.icon}</span>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.9rem' }}>{a.text}</span>
                            {a.category && (
                                <span style={{ fontSize: '0.7rem', color: C.muted, marginLeft: '8px' }}>
                                    [{a.category}]
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ============================================
    // 3. 回合摘要 (直接使用 processData)
    // ============================================
    
    function TurnSummary({ player, processData, finances }) {
        const [expanded, setExpanded] = useState(true);

        // 從 processData 和 finances 整理收支
        const income = [];
        const expense = [];

        // 收入
        if (finances?.base_model_revenue > 0) income.push({ label: '模型基礎收益', value: finances.base_model_revenue, recurring: true });
        if (processData?.totalPocIncome > 0) income.push({ label: 'PoC合約', value: processData.totalPocIncome, recurring: true });
        if (processData?.totalRentOutIncome > 0) income.push({ label: '算力出租', value: processData.totalRentOutIncome, recurring: true });
        if (processData?.rivalInvestmentIncome > 0) income.push({ label: '投資收益', value: processData.rivalInvestmentIncome, recurring: true });
        if (processData?.productRevenue > 0 || finances?.product_revenue > 0) {
            income.push({ label: '商品營收', value: processData?.productRevenue || finances?.product_revenue, recurring: true });
        }
        if (processData?.communityRevenue > 0 || finances?.community_revenue > 0) {
            income.push({ label: '社群收入', value: processData?.communityRevenue || finances?.community_revenue, recurring: true });
        }

        // 支出
        if (finances?.talent_cost > 0) expense.push({ label: '人事成本', value: finances.talent_cost, recurring: true });
        if (finances?.cloud_cost > 0) expense.push({ label: '雲端租用', value: finances.cloud_cost, recurring: true });
        if (finances?.maintenance_cost > 0) expense.push({ label: '設備維護', value: finances.maintenance_cost, recurring: true });
        if (finances?.interest_cost > 0) expense.push({ label: '利息支出', value: finances.interest_cost, recurring: true });

        const totalIn = income.reduce((s, i) => s + i.value, 0);
        const totalOut = expense.reduce((s, e) => s + e.value, 0);
        const netFlow = finances?.net_cash_flow ?? (totalIn - totalOut);

        // 事件
        const events = [];
        if (processData?.expiredRentOutContracts?.length) events.push({ icon: '📄', text: `${processData.expiredRentOutContracts.length} 份出租合約到期` });
        if (processData?.expiredIndustryContracts?.length) events.push({ icon: '🏭', text: `${processData.expiredIndustryContracts.length} 份產業合約到期` });
        if (processData?.newPlayerMilestones?.length) {
            processData.newPlayerMilestones.forEach(m => events.push({ icon: '🏆', text: `達成: ${m}`, highlight: true }));
        }

        return (
            <div style={card}>
                <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expanded ? '12px' : 0 }}>
                    <div style={{ fontSize: '0.85rem', color: C.muted }}>
                        <span>📊 Q{player.turn_count} 回合摘要</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: netFlow >= 0 ? C.pos : C.neg }}>
                            現金流: {netFlow >= 0 ? '+' : ''}{fmtCash(netFlow)}
                        </span>
                        <span style={{ color: C.muted }}>{expanded ? '▼' : '▶'}</span>
                    </div>
                </div>

                {expanded && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* 收入 */}
                        <div>
                            <div style={{ fontSize: '0.75rem', color: C.pos, marginBottom: '8px' }}>收入 (+{fmtCash(totalIn)})</div>
                            {income.length === 0 ? <div style={{ color: C.muted, fontSize: '0.85rem' }}>本季無收入</div> :
                                income.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: C.muted }}>{item.label}{item.recurring && <span style={{ marginLeft: '4px', fontSize: '0.7rem', opacity: 0.6 }}>🔄</span>}</span>
                                        <span style={{ color: C.pos, fontFamily: 'var(--font-mono)' }}>+{fmtCash(item.value)}</span>
                                    </div>
                                ))
                            }
                        </div>
                        {/* 支出 */}
                        <div>
                            <div style={{ fontSize: '0.75rem', color: C.neg, marginBottom: '8px' }}>支出 (-{fmtCash(totalOut)})</div>
                            {expense.length === 0 ? <div style={{ color: C.muted, fontSize: '0.85rem' }}>本季無支出</div> :
                                expense.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: C.muted }}>{item.label}{item.recurring && <span style={{ marginLeft: '4px', fontSize: '0.7rem', opacity: 0.6 }}>🔄</span>}</span>
                                        <span style={{ color: C.neg, fontFamily: 'var(--font-mono)' }}>-{fmtCash(item.value)}</span>
                                    </div>
                                ))
                            }
                        </div>
                        {/* 事件 */}
                        {events.length > 0 && (
                            <div style={{ gridColumn: 'span 2', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '6px' }}>本季事件</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {events.map((e, i) => (
                                        <span key={i} style={{ padding: '4px 10px', background: e.highlight ? 'rgba(255,208,0,0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem', color: e.highlight ? C.warn : C.muted }}>
                                            {e.icon} {e.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 4. 公司詳細資料 (摺疊)
    // ============================================
    
    function CompanyDetails({ player, derived }) {
        const [expanded, setExpanded] = useState(false);

        const sections = [
            { title: '現金', icon: '💰', items: [
                { label: '現金', value: fmtCash(player.cash), color: player.cash >= 0 ? C.pos : C.neg },
                { label: '負債', value: fmtCash(player.debt), color: player.debt > 0 ? C.neg : C.pos },
                { label: '市值', value: fmtCash(player.market_cap) },
                { label: '評級', value: derived?.finance_rating?.split(' ')[0] || 'N/A' }
            ]},
            { title: '算力', icon: '💻', items: [
                { label: '總量', value: `${fmt(derived?.total_pflops_reserve)} PF` },
                { label: '訓練需求', value: `${fmt(derived?.trainingPflops)} PF`, color: C.pos },
                { label: '使用率', value: `${((derived?.compute_utilization||0)*100).toFixed(0)}%` }
            ]},
            { title: '人力', icon: '👥', items: [
                { label: 'Turing', value: player.talent?.turing || 0, color: C.magenta },
                { label: 'Senior', value: player.talent?.senior || 0, color: C.cyan },
                { label: 'Junior', value: player.talent?.junior || 0 },
                { label: '忠誠度', value: `${player.loyalty||0}%`, color: player.loyalty < 50 ? C.neg : C.pos }
            ]},
            { title: '數據', icon: '💾', items: [
                { label: '高品質', value: fmt(player.high_data), color: C.cyan },
                { label: '低品質', value: fmt(player.low_data) },
                { label: '合規風險', value: `${player.compliance_risk||0}%`, color: player.compliance_risk > 50 ? C.neg : C.pos }
            ]},
            { title: 'MP', icon: '🧠', items: [
                { label: 'MP', value: fmt(player.model_power), color: C.magenta },
                { label: 'Tier', value: `T${player.mp_tier}` },
                { label: '熵值', value: `${player.entropy||0}%`, color: player.entropy > 60 ? C.neg : C.pos },
                { label: '對齊度', value: `${player.alignment||0}%`, color: C.pos }
            ]},
            { title: '形象', icon: '🏢', items: [
                { label: '炒作度', value: player.hype || 0, color: '#ff6600' },
                { label: '信任度', value: player.trust || 0, color: C.cyan },
                { label: '監管壓力', value: `${player.regulation||0}%`, color: player.regulation > 60 ? C.neg : C.pos }
            ]},
                        { title: '社群', icon: '👥', items: (() => {
                const community = player.community || {};
                const size = community.size || 0;
                const sentiment = community.sentiment || 0;
                const engagement = community.engagement || 0;
                
                const getSentimentLabel = (val) => {
                    if (val <= 20) return '厭惡';
                    if (val <= 40) return '不滿';
                    if (val <= 60) return '中立';
                    if (val <= 80) return '友善';
                    return '死忠';
                };
                const getEngagementLabel = (val) => {
                    if (val <= 20) return '死寂';
                    if (val <= 40) return '低迷';
                    if (val <= 60) return '一般';
                    if (val <= 80) return '活躍';
                    return '關注';
                };
                const getSentimentColor = (val) => {
                    if (val <= 20) return C.neg;
                    if (val <= 40) return '#ff9944';
                    if (val <= 60) return C.muted;
                    if (val <= 80) return C.pos;
                    return C.cyan;
                };
                const getEngagementColor = (val) => {
                    if (val <= 20) return '#444444';
                    if (val <= 40) return '#666666';
                    if (val <= 60) return '#888888';
                    if (val <= 80) return '#ff9944';
                    return '#ffcc00';
                };
                
                return [
                    { label: '規模', value: size >= 1000 ? (size/1000).toFixed(1) + 'K' : size, color: C.cyan },
                    { label: '情緒', value: `${sentiment} (${getSentimentLabel(sentiment)})`, color: getSentimentColor(sentiment) },
                    { label: '活躍度', value: `${engagement} (${getEngagementLabel(engagement)})`, color: getEngagementColor(engagement) }
                ];
            })()},
        ];


        return (
            <div style={card}>
                <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.85rem', color: C.muted }}>🏢 公司詳細資料</span>
                    <span style={{ color: C.muted }}>{expanded ? '▼' : '▶'}</span>
                </div>
                {expanded && (
                    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        {sections.map((s, i) => (
                            <div key={i} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                                <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '6px' }}>{s.icon} {s.title}</div>
                                {s.items.map((item, j) => (
                                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '2px 0' }}>
                                        <span style={{ color: C.muted }}>{item.label}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', color: item.color || 'var(--text-primary)' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 5. 世界環境 (整合區域系統與事件系統)
    // ============================================
    
    /**
     * 事件通知組件 - 顯示全球事件與隨機事件
     */
    function EventNotificationPanel({ events, randomEvent }) {
        const allEvents = [];
        
        // 加入全球事件
        if (events && events.length > 0) {
            events.forEach(evt => {
                allEvents.push({
                    ...evt,
                    category: 'global',
                    icon: '🌍'
                });
            });
        }
        
        // 加入隨機事件
        if (randomEvent?.event) {
            allEvents.push({
                title: randomEvent.event.desc || randomEvent.event.name || '隨機事件',
                desc: getRandomEventDesc(randomEvent),
                category: 'random',
                icon: getRandomEventIcon(randomEvent.type),
                type: randomEvent.type
            });
        }
        
        if (allEvents.length === 0) return null;
        
        return (
            <div style={{ marginBottom: '12px' }}>
                {allEvents.slice(0, 3).map((event, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        background: event.category === 'global' 
                            ? 'rgba(255, 208, 0, 0.1)' 
                            : event.type === 'neutral' 
                                ? 'rgba(0, 245, 255, 0.1)'
                                : 'rgba(255, 51, 102, 0.1)',
                        border: `1px solid ${event.category === 'global' 
                            ? 'rgba(255, 208, 0, 0.3)' 
                            : event.type === 'neutral'
                                ? 'rgba(0, 245, 255, 0.3)'
                                : 'rgba(255, 51, 102, 0.3)'}`,
                        borderRadius: '6px',
                        marginBottom: '6px'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>{event.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{event.title}</div>
                            <div style={{ fontSize: '0.75rem', color: C.muted }}>{event.desc}</div>
                        </div>
                        {event.remaining_turns && (
                            <span style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 6px',
                                background: C.warn + '33',
                                borderRadius: '4px',
                                color: C.warn
                            }}>
                                {event.remaining_turns} 回合
                            </span>
                        )}
                        {event.category === 'random' && (
                            <span style={{ 
                                fontSize: '0.65rem', 
                                padding: '2px 6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: C.muted
                            }}>
                                本季事件
                            </span>
                        )}
                    </div>
                ))}
            </div>
        );
    }
    
    /**
     * 取得隨機事件描述
     */
    function getRandomEventDesc(randomEvent) {
        if (!randomEvent?.event) return '';
        const evt = randomEvent.event;
        
        // 處理不同效果格式
        if (typeof evt.effect === 'string') {
            const effectMap = {
                'cash_gain': `獲得 $${evt.value || 0}M`,
                'cash_loss': `損失 $${evt.value || 0}M`,
                'mp_boost': `MP +${evt.value || 0}`,
                'data_gain': `獲得 ${evt.value || 0} 數據`,
                'talent_loss': `失去 ${evt.value || 0} 名員工`,
                'trust_loss': `信任度 -${evt.value || 0}`
            };
            return effectMap[evt.effect] || '';
        } else if (typeof evt.effect === 'object') {
            const parts = [];
            for (const [key, val] of Object.entries(evt.effect)) {
                if (val > 0) parts.push(`${key} +${val}`);
                else if (val < 0) parts.push(`${key} ${val}`);
            }
            return parts.join(', ');
        }
        return '';
    }
    
    /**
     * 取得隨機事件圖標
     */
    function getRandomEventIcon(type) {
        const icons = {
            'neutral': '📋',
            'crisis': '⚠️',
            'regulation': '⚖️',
            'entropy': '🌀',
            'compliance_risk': '🔒',
            'commercial_ruin': '💸',
            'internal_unraveling': '👥',
            'external_sanction': '🚫'
        };
        return icons[type] || '📰';
    }
    
    function WorldEnvironment({ player, globalParams, gameState, onAction, processData }) {
        const tier = player?.mp_tier || 0;
        const hasRegionUI = !!window.RegionUI?.WorldEnvironmentPanel;
        
        // Tier4+: 使用 RegionUI 完整面板
        if (hasRegionUI && tier >= 4) {
            return React.createElement(window.RegionUI.WorldEnvironmentPanel, {
                gameState: gameState || { player, globalParams },
                onAction: onAction
            });
        }
        
        // 所有 Tier: 整合事件通知的版本
        const [expanded, setExpanded] = useState(false);
        const quarter = ((player?.turn_count || 1) - 1) % 4 + 1;
        const seasons = ['Q1 春', 'Q2 夏', 'Q3 秋', 'Q4 冬'];

        // 收集全球事件
        const globalEvents = useMemo(() => {
            const events = [];
            
            // 從 global_market 取得活躍事件 (Tier4+)
            if (player?.global_market?.active_events) {
                player.global_market.active_events.forEach(evt => {
                    events.push({
                        title: window.EventEngine?.getEventTitle?.(evt.id) || evt.id,
                        desc: window.EventEngine?.getEventDescription?.(evt.id) || '',
                        remaining_turns: evt.remaining
                    });
                });
            }
            
            // 從 processData 取得本季全球事件
            if (processData?.globalEvent) {
                const ge = processData.globalEvent;
                // 避免重複添加 (如果已在 active_events 中)
                if (!events.find(e => e.title === ge.title || e.title === ge.name)) {
                    events.push({
                        title: ge.title || ge.name || '全球事件',
                        desc: ge.desc || '',
                        type: ge.type
                    });
                }
            }
            
            // 從 gameState 取得當前事件
            if (gameState?.currentGlobalEvent) {
                const ge = gameState.currentGlobalEvent;
                if (!events.find(e => e.title === ge.title || e.title === ge.name)) {
                    events.push({
                        title: ge.title || ge.name || '全球事件',
                        desc: ge.desc || '',
                        type: ge.type
                    });
                }
            }
            
            return events;
        }, [player?.global_market, processData?.globalEvent, gameState?.currentGlobalEvent]);
        
        // 收集隨機事件
        const randomEvent = useMemo(() => {
            if (processData?.randomEvent) {
                return processData.randomEvent;
            }
            if (gameState?.currentRandomEvent) {
                return gameState.currentRandomEvent;
            }
            return null;
        }, [processData?.randomEvent, gameState?.currentRandomEvent]);
        
        // 市場指標
        const indicators = [
            { label: '利率', value: `${(((globalParams?.R_base||1)-1)*100).toFixed(0)}%`, icon: '📈' },
            { label: 'GPU價格', value: `${(globalParams?.P_GPU||1).toFixed(2)}x`, icon: '🖥️' },
            { label: '能源價格', value: `${(globalParams?.E_Price||1).toFixed(2)}x`, icon: '⚡' },
            { label: '市場熱度', value: `${(globalParams?.I_Hype||1).toFixed(2)}x`, icon: '🔥' }
        ];
        
        // 計算事件數量
        const eventCount = globalEvents.length + (randomEvent ? 1 : 0);
        const hasEvents = eventCount > 0;

        return (
            <div style={card}>
                {/* 標題列 */}
                <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: (hasEvents || expanded) ? '12px' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>🌐</span>
                        <span style={{ fontSize: '0.85rem', color: C.muted }}>世界環境</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.85rem', color: C.muted }}>{seasons[quarter-1]}</span>
                        <span style={{ color: C.muted }}>{expanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                
                {/* 事件通知區 - 平時就顯示 */}
                <EventNotificationPanel 
                    events={globalEvents} 
                    randomEvent={randomEvent} 
                />
                
                {/* 市場指標 - 需要展開才顯示 */}
                {expanded && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        {indicators.map((ind, i) => (
                            <div key={i} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{ind.icon}</div>
                                <div style={{ fontSize: '0.65rem', color: C.muted }}>{ind.label}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: C.cyan }}>{ind.value}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 6. 風險儀表板
    // ============================================
    
    function RiskDashboard({ player, derived, rivals }) {
        const [expanded, setExpanded] = useState(true);
        
        // 計算風險數據
        const riskData = useMemo(() => {
            if (window.DashboardEngine?.calculateRiskDashboard) {
                return window.DashboardEngine.calculateRiskDashboard(player, derived, rivals);
            }
            return null;
        }, [player, derived, rivals]);

        if (!riskData) return null;

        const { risks, overall } = riskData;

        // 風險條樣式
        const RiskBar = ({ risk }) => {
            const barWidth = Math.min(100, risk.score);
            return (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{risk.icon}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{risk.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '2px 8px', 
                                borderRadius: '10px',
                                background: risk.level.color + '22',
                                color: risk.level.color
                            }}>
                                {risk.level.label}
                            </span>
                            <span style={{ 
                                fontFamily: 'var(--font-mono)', 
                                fontSize: '0.85rem',
                                color: risk.level.color
                            }}>
                                {risk.score}
                            </span>
                        </div>
                    </div>
                    {/* 進度條 */}
                    <div style={{ 
                        height: '6px', 
                        background: 'rgba(255,255,255,0.1)', 
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{ 
                            width: barWidth + '%', 
                            height: '100%', 
                            background: `linear-gradient(90deg, ${risk.level.color}88, ${risk.level.color})`,
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    {/* 風險因素列表 */}
                    {risk.factors.length > 0 && (
                        <div style={{ marginTop: '6px', paddingLeft: '20px' }}>
                            {risk.factors.slice(0, 3).map((f, i) => (
                                <div key={i} style={{ 
                                    fontSize: '0.75rem', 
                                    color: f.severity === 'danger' ? C.neg : f.severity === 'warning' ? C.warn : C.muted,
                                    padding: '2px 0'
                                }}>
                                    {f.severity === 'danger' ? '⚠️' : f.severity === 'warning' ? '⚡' : '•'} {f.text}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div style={{ 
                ...card, 
                borderColor: overall.score >= 70 ? C.neg : overall.score >= 50 ? C.warn : 'rgba(0, 245, 255, 0.2)'
            }}>
                <div 
                    onClick={() => setExpanded(!expanded)} 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expanded ? '16px' : 0 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>🎯</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>風險儀表板</span>
                        {overall.criticalCount > 0 && (
                            <span style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 6px', 
                                borderRadius: '10px',
                                background: C.neg + '33',
                                color: C.neg
                            }}>
                                {overall.criticalCount} 項危險
                            </span>
                        )}
                        {overall.warningCount > 0 && (
                            <span style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 6px', 
                                borderRadius: '10px',
                                background: C.warn + '33',
                                color: C.warn
                            }}>
                                {overall.warningCount} 項警戒
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                            padding: '4px 12px', 
                            borderRadius: '12px',
                            background: overall.level.color + '22',
                            color: overall.level.color,
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600
                        }}>
                            {overall.score} / 100
                        </div>
                        <span style={{ color: C.muted }}>{expanded ? '▼' : '▶'}</span>
                    </div>
                </div>

                {expanded && (
                    <div>
                        {risks.map((risk, i) => (
                            <RiskBar key={risk.id} risk={risk} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 主儀表板
    // ============================================
    
    function GameDashboardNew({ gameState, derived, processData, finances, messages, onAction }) {
        const { player, globalParams, rivals } = gameState;
        const route = window.GameConfig?.TECH_ROUTES?.[player.route] || {};

        return (
            <div style={{ padding: '16px' }}>
                {/* 頂部標題列 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: `linear-gradient(135deg, ${route.color||C.cyan}44, ${route.color||C.cyan}22)`, border: `2px solid ${route.color||C.cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                            {route.icon || '🏢'}
                        </div>
                        <div>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', margin: 0 }}>{player.name}</h2>
                            <div style={{ fontSize: '0.75rem', color: route.color || C.cyan, fontFamily: 'var(--font-mono)' }}>{route.name || player.route}</div>
                        </div>
                    </div>
                    <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: C.muted }}>季度</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: C.cyan }}>Q{player.turn_count}</div>
                    </div>
                </div>

                <KeyMetricsBar player={player} derived={derived} />
                <AlertSection player={player} derived={derived} rivals={rivals} />
                <TurnSummary player={player} processData={processData} finances={finances} />
                <RiskDashboard player={player} derived={derived} rivals={rivals} />
                <CompanyDetails player={player} derived={derived} />
                <WorldEnvironment player={player} globalParams={globalParams} gameState={gameState} processData={processData} />
            </div>
        );
    }

    // ============================================
    // 導出
    // ============================================
    
    window.DashboardUI = {
        GameDashboardNew,
        KeyMetricsBar,
        AlertSection,
        TurnSummary,
        RiskDashboard,
        CompanyDetails,
        WorldEnvironment,
        EventNotificationPanel
    };

    console.log('✓ Dashboard UI loaded (with Risk Dashboard)');

})();