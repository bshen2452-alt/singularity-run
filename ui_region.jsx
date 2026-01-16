// ============================================
// 區域系統 UI (Region UI)
// ============================================
// 設計原則：
//   1. 純介面層，不包含業務邏輯計算
//   2. 數據來自 RegionEngine 與 RegionConfig
//   3. 簡化地圖 + 彈出詳細面板模式
// ============================================

(function() {
    'use strict';

    const { useState, useMemo, useCallback } = React;
    const { createPortal } = ReactDOM;

    // ============================================
    // 樣式常量
    // ============================================
    
    const C = {
        pos: '#00ff88', neg: '#ff3366', warn: '#ffd000', 
        cyan: '#00f5ff', magenta: '#ff00aa', muted: '#a0a0b0',
        home: '#00ff88',
        unlocked: '#00f5ff',
        pending: '#ffd000',
        eligible: '#9966ff',
        locked: '#666688'
    };

    const cardStyle = {
        background: 'rgba(20, 20, 30, 0.85)',
        border: '1px solid rgba(0, 245, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px 16px',
        backdropFilter: 'blur(10px)'
    };

    // ============================================
    // 區域地圖位置配置（簡化世界地圖）
    // ============================================
    
    const REGION_POSITIONS = {
        north_america: { x: 15, y: 30, label: '北美' },
        europe: { x: 45, y: 25, label: '歐洲' },
        middle_east: { x: 55, y: 45, label: '中東' },
        east_asia: { x: 75, y: 35, label: '東亞' },
        south_southeast_asia: { x: 70, y: 55, label: '南亞' },
        australia: { x: 80, y: 75, label: '澳洲' },
        latam_africa: { x: 35, y: 65, label: '拉美非洲' }
    };

    // ============================================
    // 輔助函數
    // ============================================
    
    const fmt = (num, dec = 0) => {
        if (num === undefined || num === null || isNaN(num)) return '0';
        return num.toFixed(dec);
    };

    const fmtCash = (num) => {
        if (num === undefined || num === null || isNaN(num)) return '$0M';
        return (num < 0 ? '-' : '') + '$' + fmt(Math.abs(num)) + 'M';
    };

    /**
     * 取得區域狀態顏色與圖標
     */
    function getRegionStatus(regionId, regionSystemState, playerState, marketState) {
        const config = window.RegionConfig;
        const region = config?.getRegion(regionId);
        if (!region) return { status: 'unknown', color: C.locked, icon: '❓' };
        
        // 母國
        if (region.is_home) {
            return { status: 'home', color: C.home, icon: '🏠', label: '總部' };
        }
        
        const regionState = regionSystemState?.regions?.[regionId];
        
        // 已進入（有辦公室）
        if (regionState?.unlocked && regionState.offices?.length > 0) {
            return { status: 'unlocked', color: C.unlocked, icon: '🏢', label: '已進入' };
        }
        
        // 審批中
        if (regionState?.pending_applications?.length > 0) {
            const pending = regionState.pending_applications[0];
            return { 
                status: 'pending', 
                color: C.pending, 
                icon: '⏳', 
                label: `審批中 (${pending.remaining_turns}回合)` 
            };
        }
        
        // 計算准入評分
        if (window.RegionEngine && playerState) {
            const scoreResult = window.RegionEngine.calculateRegionScore(
                regionId, playerState, regionSystemState, marketState
            );
            
            if (scoreResult.eligible) {
                return { status: 'eligible', color: C.eligible, icon: '✅', label: '可申請' };
            } else {
                const gap = scoreResult.threshold - scoreResult.score;
                return { 
                    status: 'locked', 
                    color: C.locked, 
                    icon: '🔒', 
                    label: `差 ${fmt(gap, 0)} 分` 
                };
            }
        }
        
        return { status: 'unknown', color: C.locked, icon: '❓', label: '未知' };
    }

    // ============================================
    // 區域地圖標記組件
    // ============================================
    
    function RegionMarker({ regionId, position, status, onClick, isSelected }) {
        const config = window.RegionConfig;
        const region = config?.getRegion(regionId);
        
        return (
            <div
                onClick={() => onClick(regionId)}
                style={{
                    position: 'absolute',
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'transform 0.2s ease',
                    zIndex: isSelected ? 10 : 1
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.2)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
            >
                {/* 狀態圓圈 */}
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${status.color}44, ${status.color}22)`,
                    border: `3px solid ${status.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    boxShadow: isSelected ? `0 0 20px ${status.color}88` : `0 0 10px ${status.color}44`,
                    transition: 'box-shadow 0.2s ease'
                }}>
                    {status.icon}
                </div>
                
                {/* 區域名稱 */}
                <div style={{
                    marginTop: '4px',
                    fontSize: '0.7rem',
                    color: status.color,
                    fontWeight: 600,
                    textShadow: '0 0 4px rgba(0,0,0,0.8)'
                }}>
                    {region?.icon} {position.label}
                </div>
                
                {/* 狀態標籤 */}
                <div style={{
                    fontSize: '0.6rem',
                    color: C.muted,
                    marginTop: '2px'
                }}>
                    {status.label}
                </div>
            </div>
        );
    }

    // ============================================
    // 簡化世界地圖組件
    // ============================================
    
    function WorldMap({ regionSystemState, playerState, marketState, selectedRegion, onSelectRegion }) {
        return (
            <div style={{
                position: 'relative',
                width: '100%',
                height: '200px',
                background: 'linear-gradient(180deg, rgba(10,20,40,0.9) 0%, rgba(20,30,50,0.9) 100%)',
                borderRadius: '8px',
                border: '1px solid rgba(0, 245, 255, 0.2)',
                overflow: 'hidden'
            }}>
                {/* 簡化的世界輪廓背景（用CSS漸變模擬） */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `
                        radial-gradient(ellipse 30% 20% at 20% 35%, rgba(0,100,50,0.15) 0%, transparent 70%),
                        radial-gradient(ellipse 25% 25% at 50% 30%, rgba(0,100,50,0.15) 0%, transparent 70%),
                        radial-gradient(ellipse 20% 20% at 75% 40%, rgba(0,100,50,0.15) 0%, transparent 70%),
                        radial-gradient(ellipse 15% 15% at 35% 60%, rgba(0,100,50,0.15) 0%, transparent 70%),
                        radial-gradient(ellipse 10% 10% at 80% 70%, rgba(0,100,50,0.15) 0%, transparent 70%)
                    `,
                    opacity: 0.5
                }} />
                
                {/* 區域標記 */}
                {Object.entries(REGION_POSITIONS).map(([regionId, position]) => {
                    const status = getRegionStatus(regionId, regionSystemState, playerState, marketState);
                    return (
                        <RegionMarker
                            key={regionId}
                            regionId={regionId}
                            position={position}
                            status={status}
                            isSelected={selectedRegion === regionId}
                            onClick={onSelectRegion}
                        />
                    );
                })}
                
                {/* 圖例 */}
                <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    display: 'flex',
                    gap: '12px',
                    fontSize: '0.65rem'
                }}>
                    <span style={{ color: C.home }}>🏠 總部</span>
                    <span style={{ color: C.unlocked }}>🏢 已進入</span>
                    <span style={{ color: C.pending }}>⏳ 審批中</span>
                    <span style={{ color: C.eligible }}>✅ 可申請</span>
                    <span style={{ color: C.locked }}>🔒 未達標</span>
                </div>
            </div>
        );
    }

    // ============================================
    // 評分維度條組件
    // ============================================
    
    function ScoreDimensionBar({ dimension, raw, weight, weighted, threshold }) {
        const barWidth = Math.min(100, raw);
        const thresholdPos = threshold ? Math.min(100, threshold) : null;
        
        return (
            <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                    <span style={{ color: C.muted }}>
                        {dimension.icon} {dimension.name} 
                        <span style={{ opacity: 0.6, marginLeft: '4px' }}>×{(weight * 100).toFixed(0)}%</span>
                    </span>
                    <span style={{ color: C.cyan, fontFamily: 'var(--font-mono)' }}>
                        {fmt(raw, 0)} → {fmt(weighted, 1)}
                    </span>
                </div>
                <div style={{ 
                    height: '6px', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '3px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        width: barWidth + '%', 
                        height: '100%', 
                        background: `linear-gradient(90deg, ${C.cyan}88, ${C.cyan})`,
                        borderRadius: '3px'
                    }} />
                </div>
            </div>
        );
    }

    // ============================================
    // 區域詳細面板組件
    // ============================================
    
    function RegionDetailPanel({ regionId, regionSystemState, playerState, marketState, onClose, onAction }) {
        const [activeTab, setActiveTab] = useState('overview');
        
        const config = window.RegionConfig;
        const region = config?.getRegion(regionId);
        const regionState = regionSystemState?.regions?.[regionId];
        
        // 計算評分
        const scoreResult = useMemo(() => {
            if (!window.RegionEngine || !playerState) return null;
            return window.RegionEngine.calculateRegionScore(
                regionId, playerState, regionSystemState, marketState
            );
        }, [regionId, playerState, regionSystemState, marketState]);
        
        // 取得區域摘要
        const summary = useMemo(() => {
            if (!window.RegionEngine) return null;
            return window.RegionEngine.getRegionSummary(regionId, regionSystemState);
        }, [regionId, regionSystemState]);
        
        if (!region) return null;
        
        const status = getRegionStatus(regionId, regionSystemState, playerState, marketState);
        const isHome = region.is_home;
        const hasOffice = regionState?.offices?.length > 0;
        const isPending = regionState?.pending_applications?.length > 0;
        
        // 計算審批時間
        const approvalTime = useMemo(() => {
            if (!window.RegionEngine || !scoreResult) return { turns: region.approval_turns || 2, type: 'normal' };
            return window.RegionEngine.calculateApprovalTime(
                regionId, scoreResult.score, scoreResult.threshold
            );
        }, [regionId, scoreResult]);

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(4px)'
            }} onClick={onClose}>
                <div 
                    style={{
                        ...cardStyle,
                        position: 'relative',
                        zIndex: 10000,
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        border: `2px solid ${status.color}`,
                        boxShadow: '0 0 40px rgba(0,0,0,0.8)'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* 標題列 */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '2rem' }}>{region.icon}</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{region.name}</h3>
                                <div style={{ fontSize: '0.8rem', color: C.muted }}>{region.description}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                                padding: '4px 12px', 
                                borderRadius: '12px',
                                background: status.color + '22',
                                color: status.color,
                                fontSize: '0.85rem'
                            }}>
                                {status.icon} {status.label}
                            </span>
                            <button 
                                onClick={onClose}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: C.muted,
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    padding: '4px 8px'
                                }}
                            >×</button>
                        </div>
                    </div>

                    {/* 標籤頁切換 */}
                    {!isHome && (
                        <div style={{ 
                            display: 'flex', 
                            gap: '4px', 
                            marginBottom: '16px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '8px'
                        }}>
                            {['overview', 'scoring', 'operations'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '6px 16px',
                                        background: activeTab === tab ? status.color + '33' : 'transparent',
                                        border: activeTab === tab ? `1px solid ${status.color}` : '1px solid transparent',
                                        borderRadius: '4px',
                                        color: activeTab === tab ? status.color : C.muted,
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {tab === 'overview' ? '📋 概覽' : 
                                     tab === 'scoring' ? '📊 評分' : '⚙️ 營運'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 概覽標籤 */}
                    {(activeTab === 'overview' || isHome) && (
                        <div>
                            {/* 區域特性 */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(3, 1fr)', 
                                gap: '8px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', color: C.muted }}>能源成本</div>
                                    <div style={{ 
                                        fontFamily: 'var(--font-mono)', 
                                        color: region.characteristics?.energy_cost_mult > 1 ? C.neg : C.pos 
                                    }}>
                                        {((region.characteristics?.energy_cost_mult || 1) * 100 - 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', color: C.muted }}>算力成本</div>
                                    <div style={{ 
                                        fontFamily: 'var(--font-mono)', 
                                        color: region.characteristics?.compute_cost_mult > 1 ? C.neg : C.pos 
                                    }}>
                                        {((region.characteristics?.compute_cost_mult || 1) * 100 - 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', color: C.muted }}>人才成本</div>
                                    <div style={{ 
                                        fontFamily: 'var(--font-mono)', 
                                        color: region.characteristics?.talent_cost_mult > 1 ? C.neg : C.pos 
                                    }}>
                                        {((region.characteristics?.talent_cost_mult || 1) * 100 - 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>

                            {/* 優勢 */}
                            {region.advantages?.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.75rem', color: C.pos, marginBottom: '6px' }}>✨ 區域優勢</div>
                                    {region.advantages.map((adv, i) => (
                                        <div key={i} style={{ 
                                            fontSize: '0.8rem', 
                                            color: C.muted, 
                                            padding: '4px 8px',
                                            marginBottom: '2px'
                                        }}>
                                            • {adv.description}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 劣勢 */}
                            {region.disadvantages?.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.75rem', color: C.neg, marginBottom: '6px' }}>⚠️ 區域劣勢</div>
                                    {region.disadvantages.map((dis, i) => (
                                        <div key={i} style={{ 
                                            fontSize: '0.8rem', 
                                            color: C.muted, 
                                            padding: '4px 8px',
                                            marginBottom: '2px'
                                        }}>
                                            • {dis.description}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 特殊機制 */}
                            {region.special && (
                                <div style={{
                                    padding: '10px',
                                    background: `${status.color}11`,
                                    border: `1px solid ${status.color}44`,
                                    borderRadius: '6px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: status.color, marginBottom: '4px' }}>
                                        🎯 特殊機制
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                        {region.special.description}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 評分標籤（非母國） */}
                    {activeTab === 'scoring' && !isHome && scoreResult && (
                        <div>
                            {/* 總分顯示 */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: C.muted }}>你的評分</div>
                                    <div style={{ 
                                        fontSize: '2rem', 
                                        fontFamily: 'var(--font-mono)',
                                        color: scoreResult.eligible ? C.pos : C.neg
                                    }}>
                                        {fmt(scoreResult.score, 1)}
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.5rem', color: C.muted }}>vs</div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: C.muted }}>准入門檻</div>
                                    <div style={{ 
                                        fontSize: '2rem', 
                                        fontFamily: 'var(--font-mono)',
                                        color: C.warn
                                    }}>
                                        {fmt(scoreResult.threshold, 0)}
                                    </div>
                                </div>
                            </div>

                            {/* 差距提示 */}
                            {!scoreResult.eligible && (
                                <div style={{
                                    padding: '8px 12px',
                                    background: `${C.neg}22`,
                                    border: `1px solid ${C.neg}44`,
                                    borderRadius: '6px',
                                    marginBottom: '12px',
                                    fontSize: '0.85rem',
                                    color: C.neg
                                }}>
                                    ⚠️ 還差 {fmt(scoreResult.threshold - scoreResult.score, 1)} 分才能申請進入
                                </div>
                            )}

                            {/* 各維度評分 */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '8px' }}>📊 評分細節</div>
                                {scoreResult.breakdown && Object.entries(scoreResult.breakdown).map(([dimId, data]) => {
                                    const dimension = config.getDimension(dimId);
                                    if (!dimension) return null;
                                    return (
                                        <ScoreDimensionBar
                                            key={dimId}
                                            dimension={dimension}
                                            raw={data.raw}
                                            weight={data.weight}
                                            weighted={data.weighted}
                                        />
                                    );
                                })}
                            </div>

                            {/* 路線親和度 */}
                            {scoreResult.breakdown?.route_affinity && (
                                <div style={{
                                    padding: '8px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '6px',
                                    marginBottom: '12px'
                                }}>
                                    <span style={{ fontSize: '0.8rem', color: C.muted }}>🛤️ 技術路線加成：</span>
                                    <span style={{ 
                                        color: scoreResult.breakdown.route_affinity.bonus > 0 ? C.pos : C.neg,
                                        fontFamily: 'var(--font-mono)',
                                        marginLeft: '8px'
                                    }}>
                                        {scoreResult.breakdown.route_affinity.bonus > 0 ? '+' : ''}{scoreResult.breakdown.route_affinity.bonus}
                                    </span>
                                </div>
                            )}

                            {/* 提升建議 */}
                            {!scoreResult.eligible && (
                                <div style={{
                                    padding: '10px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '6px'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: C.cyan, marginBottom: '6px' }}>💡 提升建議</div>
                                    {region.scoring_weights && (
                                        <div style={{ fontSize: '0.8rem', color: C.muted }}>
                                            {Object.entries(region.scoring_weights)
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 2)
                                                .map(([dimId, weight], i) => {
                                                    const dim = config.getDimension(dimId);
                                                    return (
                                                        <div key={dimId} style={{ marginBottom: '4px' }}>
                                                            • 提升 {dim?.icon} {dim?.name} 可增加 {(weight * 10).toFixed(1)} 分/10分
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 營運標籤 */}
                    {activeTab === 'operations' && !isHome && (
                        <div>
                            {hasOffice ? (
                                // 已進入區域的營運管理
                                <div>
                                    {/* 辦公室列表 */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '8px' }}>🏢 據點</div>
                                        {regionState.offices.map((office, i) => {
                                            const officeConfig = config.getOfficeLevel(office.level);
                                            return (
                                                <div key={i} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px 12px',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    borderRadius: '6px',
                                                    marginBottom: '8px'
                                                }}>
                                                    <div>
                                                        <span style={{ fontSize: '1.1rem', marginRight: '8px' }}>{officeConfig?.icon}</span>
                                                        <span>{officeConfig?.name}</span>
                                                    </div>
                                                    {officeConfig?.upgrade_from && (
                                                        <button
                                                            onClick={() => onAction?.('upgrade_office', { regionId, officeIndex: i })}
                                                            style={{
                                                                padding: '4px 12px',
                                                                background: C.cyan + '22',
                                                                border: `1px solid ${C.cyan}`,
                                                                borderRadius: '4px',
                                                                color: C.cyan,
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem'
                                                            }}
                                                        >
                                                            升級 ({fmtCash(officeConfig.upgrade_cost)})
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* 派駐資產 */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '8px' }}>📦 派駐資產</div>
                                        {(regionState.assigned_assets?.length || 0) === 0 ? (
                                            <div style={{ fontSize: '0.8rem', color: C.muted, fontStyle: 'italic' }}>
                                                尚未派駐任何資產
                                            </div>
                                        ) : (
                                            regionState.assigned_assets.map((asset, i) => (
                                                <div key={i} style={{
                                                    padding: '6px 10px',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    borderRadius: '4px',
                                                    marginBottom: '4px',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {asset.name || asset.id}
                                                </div>
                                            ))
                                        )}
                                        <button
                                            onClick={() => onAction?.('assign_asset', { regionId })}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                marginTop: '8px',
                                                background: 'transparent',
                                                border: `1px dashed ${C.muted}`,
                                                borderRadius: '4px',
                                                color: C.muted,
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            + 派駐資產
                                        </button>
                                    </div>

                                    {/* 營運效果 */}
                                    <div style={{
                                        padding: '10px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '6px'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '6px' }}>📈 營運效果</div>
                                        <div style={{ fontSize: '0.8rem', color: C.muted }}>
                                            • 在地連結分數：{fmt(summary?.local_score || 0, 0)}
                                        </div>
                                    </div>
                                </div>
                            ) : isPending ? (
                                // 審批進行中
                                <div style={{
                                    textAlign: 'center',
                                    padding: '24px'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⏳</div>
                                    <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>審批進行中</div>
                                    <div style={{ color: C.muted }}>
                                        剩餘 {regionState.pending_applications[0]?.remaining_turns} 回合
                                    </div>
                                    <div style={{
                                        marginTop: '16px',
                                        height: '8px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: '40%',
                                            height: '100%',
                                            background: `linear-gradient(90deg, ${C.pending}, ${C.cyan})`,
                                            animation: 'pulse 2s infinite'
                                        }} />
                                    </div>
                                </div>
                            ) : (
                                // 可申請進入
                                <div>
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '16px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                        marginBottom: '16px'
                                    }}>
                                        <div style={{ fontSize: '0.85rem', color: C.muted, marginBottom: '8px' }}>
                                            預估審批時間
                                        </div>
                                        <div style={{ 
                                            fontSize: '2rem', 
                                            fontFamily: 'var(--font-mono)',
                                            color: C.cyan 
                                        }}>
                                            {approvalTime?.turns || 2} 回合
                                        </div>
                                        {approvalTime?.type === 'fast_track' && (
                                            <div style={{ fontSize: '0.75rem', color: C.pos, marginTop: '4px' }}>
                                                🚀 快速通道
                                            </div>
                                        )}
                                        {approvalTime?.type === 'extended' && (
                                            <div style={{ fontSize: '0.75rem', color: C.warn, marginTop: '4px' }}>
                                                ⚠️ 延長審查
                                            </div>
                                        )}
                                    </div>

                                    {scoreResult?.eligible ? (
                                        <div>
                                            <button
                                                onClick={() => { console.log('🔘 Button clicked: establish_liaison', { regionId, onAction: typeof onAction }); onAction?.('establish_liaison', { regionId }); }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    marginBottom: '8px',
                                                    background: `linear-gradient(135deg, ${C.cyan}44, ${C.cyan}22)`,
                                                    border: `2px solid ${C.cyan}`,
                                                    borderRadius: '8px',
                                                    color: C.cyan,
                                                    cursor: 'pointer',
                                                    fontSize: '0.95rem',
                                                    fontWeight: 600
                                                }}
                                            >
                                                📍 建立聯絡處 ({fmtCash(config.OFFICE_LEVELS?.liaison?.setup_cost || 20)})
                                            </button>
                                            <button
                                                onClick={() => { console.log('🔘 Button clicked: submit_application', { regionId, onAction: typeof onAction }); onAction?.('submit_application', { regionId }); }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: 'transparent',
                                                    border: `1px solid ${C.muted}`,
                                                    borderRadius: '8px',
                                                    color: C.muted,
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                📝 提交營運申請（需審批）
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '16px',
                                            color: C.muted,
                                            fontSize: '0.9rem'
                                        }}>
                                            評分未達門檻，請先提升相關能力
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============================================
    // 全球事件通知組件
    // ============================================
    
    function GlobalEventNotification({ events, marketState }) {
        if (!events || events.length === 0) return null;
        
        return (
            <div style={{ marginBottom: '12px' }}>
                {events.slice(0, 2).map((event, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        background: 'rgba(255, 208, 0, 0.1)',
                        border: '1px solid rgba(255, 208, 0, 0.3)',
                        borderRadius: '6px',
                        marginBottom: '6px'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>📰</span>
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
                    </div>
                ))}
            </div>
        );
    }

    // ============================================
    // 全球市場指標迷你面板
    // ============================================
    
    function MarketIndicatorsMini({ marketState }) {
        const indices = marketState?.indices || {};
        
        const indicators = [
            { id: 'interest_rate', icon: '🏦', label: '利率' },
            { id: 'energy_price', icon: '⚡', label: '能源' },
            { id: 'gpu_price', icon: '🎮', label: 'GPU' },
            { id: 'market_confidence', icon: '📈', label: '信心' }
        ];
        
        return (
            <div style={{ 
                display: 'flex', 
                gap: '8px',
                marginBottom: '12px',
                flexWrap: 'wrap'
            }}>
                {indicators.map(ind => {
                    const value = indices[ind.id] || 100;
                    const change = value - 100;
                    return (
                        <div key={ind.id} style={{
                            padding: '6px 10px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span>{ind.icon}</span>
                            <span style={{ fontSize: '0.7rem', color: C.muted }}>{ind.label}</span>
                            <span style={{ 
                                fontFamily: 'var(--font-mono)', 
                                fontSize: '0.8rem',
                                color: change > 5 ? C.neg : change < -5 ? C.pos : C.muted
                            }}>
                                {change >= 0 ? '+' : ''}{change.toFixed(0)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // ============================================
    // 整合的世界環境面板（替換原 WorldEnvironment）
    // ============================================
    
    function WorldEnvironmentPanel({ gameState, onAction }) {
        const [expanded, setExpanded] = useState(false);
        const [selectedRegion, setSelectedRegion] = useState(null);
        
        const { player, globalParams } = gameState;
        const regionSystemState = player?.region_system || window.RegionEngine?.createInitialState();
        const marketState = player?.global_market;
        
        // 全球事件
        const activeEvents = useMemo(() => {
            if (!marketState?.active_events) return [];
            return marketState.active_events.map(evt => ({
                title: window.EventEngine?.getEventTitle?.(evt.id) || evt.id,
                desc: window.EventEngine?.getEventDescription?.(evt.id) || '',
                remaining_turns: evt.remaining
            }));
        }, [marketState]);
        
        // 全球概覽
        const globalOverview = useMemo(() => {
            if (!window.RegionEngine) return null;
            return window.RegionEngine.getGlobalOverview(regionSystemState);
        }, [regionSystemState]);
        
        const quarter = ((player?.turn_count || 1) - 1) % 4 + 1;
        const seasons = ['Q1 春', 'Q2 夏', 'Q3 秋', 'Q4 冬'];

        return (
            <div style={cardStyle}>
                {/* 標題列 */}
                <div 
                    onClick={() => setExpanded(!expanded)} 
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        marginBottom: expanded ? '12px' : 0
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>🌐</span>
                        <span style={{ fontSize: '0.85rem', color: C.muted }}>世界環境</span>
                        {globalOverview && (
                            <span style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 8px',
                                background: 'rgba(0,245,255,0.1)',
                                borderRadius: '10px',
                                color: C.cyan
                            }}>
                                {globalOverview.unlocked_regions}/{globalOverview.total_regions} 區域
                            </span>
                        )}
                        {activeEvents.length > 0 && (
                            <span style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 8px',
                                background: 'rgba(255,208,0,0.1)',
                                borderRadius: '10px',
                                color: C.warn
                            }}>
                                {activeEvents.length} 事件
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.85rem', color: C.muted }}>{seasons[quarter - 1]}</span>
                        <span style={{ color: C.muted }}>{expanded ? '▼' : '▶'}</span>
                    </div>
                </div>

                {/* 展開內容 */}
                {expanded && (
                    <div>
                        {/* 全球事件通知 */}
                        <GlobalEventNotification events={activeEvents} marketState={marketState} />
                        
                        {/* 市場指標迷你面板 */}
                        <MarketIndicatorsMini marketState={marketState} />
                        
                        {/* 世界地圖 */}
                        <WorldMap
                            regionSystemState={regionSystemState}
                            playerState={player}
                            marketState={marketState}
                            selectedRegion={selectedRegion}
                            onSelectRegion={setSelectedRegion}
                        />
                    </div>
                )}

                {/* 區域詳細面板 - 使用Portal渲染到body確保在最上層 */}
                {selectedRegion && createPortal(
                    <RegionDetailPanel
                        regionId={selectedRegion}
                        regionSystemState={regionSystemState}
                        playerState={player}
                        marketState={marketState}
                        onClose={() => setSelectedRegion(null)}
                        onAction={onAction}
                    />,
                    document.body
                )}
            </div>
        );
    }

    // ============================================
    // 導出
    // ============================================
    
    window.RegionUI = {
        WorldMap,
        RegionMarker,
        RegionDetailPanel,
        GlobalEventNotification,
        MarketIndicatorsMini,
        WorldEnvironmentPanel,
        // 輔助函數
        getRegionStatus,
        REGION_POSITIONS
    };

    // 調試：確認載入
    console.log('✓ Region UI loaded');
    console.log('  - WorldEnvironmentPanel available:', typeof WorldEnvironmentPanel === 'function');
    console.log('  - RegionEngine available:', typeof window.RegionEngine !== 'undefined');
    console.log('  - RegionConfig available:', typeof window.RegionConfig !== 'undefined');

})();