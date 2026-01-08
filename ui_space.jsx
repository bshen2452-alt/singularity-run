// ============================================
// 空間管理 UI 組件 (ui_space.jsx)
// ============================================
// 純介面層：分段式設計
// 1. 容量總覽
// 2. 現有設施管理（可收合清單，含電力合約）
// 3. 新建設施（可收合區塊）
// ============================================

// ============================================
// 設施技術升級面板組件
// ============================================

function FacilityTechUpgradePanel({ facility, player, onAction }) {
    // 只有 Tier3+ 顯示
    if ((player.mp_tier || 0) < 3) return null;
    
    const SpaceEng = window.SpaceEngine;
    if (!SpaceEng || !SpaceEng.getFacilityTechSummary) return null;
    
    const techSummary = SpaceEng.getFacilityTechSummary(player, facility.id);
    
    if (!techSummary || !techSummary.compatible) {
        return (
            <div style={{
                padding: '8px',
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                textAlign: 'center',
                marginTop: '10px'
            }}>此設施類型不支援技術升級</div>
        );
    }
    
    const categoryColors = {
        space: 'var(--accent-purple)',
        power: 'var(--accent-yellow)',
        compute: 'var(--accent-cyan)'
    };
    const categoryNames = { space: '空間', power: '電力', compute: '算力' };
    
    return (
        <div style={{
            marginTop: '10px',
            padding: '10px',
            background: 'var(--accent-purple)08',
            borderRadius: '6px',
            border: '1px solid var(--accent-purple)22'
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔬</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-purple)' }}>
                        技術升級
                    </span>
                    {techSummary.constructingCount > 0 && (
                        <span style={{
                            fontSize: '0.6rem',
                            padding: '1px 5px',
                            background: 'var(--accent-orange)33',
                            color: 'var(--accent-orange)',
                            borderRadius: '8px'
                        }}>🔧 {techSummary.constructingCount}/2</span>
                    )}
                </div>
            </div>
            
            {/* 施工懲罰警告 */}
            {techSummary.constructionPenalty > 0 && (
                <div style={{
                    padding: '6px',
                    background: 'var(--accent-orange)11',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '0.65rem',
                    color: 'var(--accent-orange)'
                }}>
                    ⚠️ 施工期間設施容量 -{(techSummary.constructionPenalty * 100).toFixed(0)}%
                </div>
            )}
            
            {/* 技術路線列表 */}
            <div style={{ display: 'grid', gap: '6px' }}>
                {techSummary.paths.map(path => {
                    const isConstructing = path.status === 'constructing';
                    const isMaxed = path.currentLevel >= path.maxLevel;
                    const color = categoryColors[path.category] || 'var(--text-muted)';
                    
                    return (
                        <div key={path.id} style={{
                            padding: '8px',
                            background: isConstructing ? 'var(--accent-orange)11' : 'var(--bg-secondary)',
                            borderRadius: '6px',
                            border: `1px solid ${isConstructing ? 'var(--accent-orange)33' : 'var(--border-color)'}`
                        }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '4px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.9rem' }}>{path.icon}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {path.name}
                                    </span>
                                    <span style={{ fontSize: '0.6rem', color: color }}>
                                        ({categoryNames[path.category] || path.category})
                                    </span>
                                </div>
                                {/* 等級指示 */}
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    {Array.from({ length: path.maxLevel }, (_, i) => (
                                        <div key={i} style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: i < path.currentLevel ? color : 'var(--bg-tertiary)',
                                            border: `1px solid ${i < path.currentLevel ? color : 'var(--border-color)'}`
                                        }} />
                                    ))}
                                </div>
                            </div>
                            
                            {/* 施工中狀態 */}
                            {isConstructing && (
                                <div style={{ marginTop: '4px' }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        fontSize: '0.6rem',
                                        marginBottom: '3px'
                                    }}>
                                        <span style={{ color: 'var(--accent-orange)' }}>🔧 升級中</span>
                                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            剩餘 {path.constructionRemaining} 季
                                        </span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '3px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${((path.upgradeTurns - path.constructionRemaining) / (path.upgradeTurns || 1)) * 100}%`,
                                            height: '100%',
                                            background: 'var(--accent-orange)'
                                        }} />
                                    </div>
                                </div>
                            )}
                            
                            {/* 升級按鈕 */}
                            {!isConstructing && !isMaxed && (
                                path.canUpgrade ? (
                                    <button
                                        onClick={() => onAction('startFacilityTechConstruction', {
                                            facilityId: facility.id,
                                            pathId: path.id
                                        })}
                                        disabled={player.cash < path.upgradeCost}
                                        style={{
                                            width: '100%',
                                            marginTop: '6px',
                                            padding: '5px 8px',
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            background: player.cash >= path.upgradeCost ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                                            color: player.cash >= path.upgradeCost ? 'white' : 'var(--text-muted)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: player.cash >= path.upgradeCost ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        施工升級 Lv.{path.currentLevel + 1} (${path.upgradeCost}M / {path.upgradeTurns}季)
                                    </button>
                                ) : (
                                    <div style={{ 
                                        fontSize: '0.6rem', 
                                        color: 'var(--text-muted)',
                                        marginTop: '4px',
                                        fontStyle: 'italic'
                                    }}>
                                        {path.upgradeReason || '無法升級'}
                                    </div>
                                )
                            )}
                            
                            {/* 已滿級 */}
                            {isMaxed && (
                                <div style={{ 
                                    fontSize: '0.6rem', 
                                    color: 'var(--accent-purple)',
                                    marginTop: '4px'
                                }}>✨ 已達最高等級</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


// ============================================
// 可收合區塊組件
// ============================================

function CollapsibleSection({ title, icon, color, defaultExpanded = false, children, badge = null }) {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
    
    return (
        <div style={{ marginBottom: '12px' }}>
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: isExpanded ? `${color}22` : 'var(--bg-tertiary)',
                    border: `1px solid ${isExpanded ? color : 'var(--border-color)'}`,
                    borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: isExpanded ? color : 'var(--text-secondary)'
                }}>
                    <span>{icon}</span>
                    <span>{title}</span>
                    {badge && (
                        <span style={{
                            padding: '2px 6px',
                            background: `${color}33`,
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            color: color
                        }}>
                            {badge}
                        </span>
                    )}
                </div>
                <span style={{ 
                    color: 'var(--text-muted)',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                    ▼
                </span>
            </div>
            {isExpanded && (
                <div style={{ 
                    padding: '12px',
                    background: 'var(--bg-tertiary)',
                    border: `1px solid ${color}33`,
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px'
                }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// ============================================
// 成本預估組件
// ============================================

function CostPreviewCard({ title, costs, totalLabel = '總計', totalValue, highlight = false }) {
    const calculatedTotal = totalValue !== undefined ? totalValue : 
        costs.reduce((sum, c) => {
            if (typeof c.value === 'number' && !c.isInfo) {
                return sum + c.value;
            }
            return sum;
        }, 0);
    
    return (
        <div style={{ 
            padding: '12px', 
            background: highlight ? 'var(--accent-purple)11' : 'var(--bg-tertiary)', 
            borderRadius: '8px',
            border: highlight ? '1px solid var(--accent-purple)44' : '1px solid var(--border-color)'
        }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                {title}
            </div>
            <div style={{ display: 'grid', gap: '4px' }}>
                {costs.map((cost, i) => (
                    <div key={i} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.75rem'
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>{cost.label}</span>
                        <span style={{ 
                            color: cost.color || 'var(--text-primary)', 
                            fontFamily: 'var(--font-mono)' 
                        }}>
                            {cost.display || `${cost.prefix || ''}${typeof cost.value === 'number' ? cost.value.toFixed(1) : cost.value}${cost.suffix || ''}`}
                        </span>
                    </div>
                ))}
            </div>
            <div style={{ 
                borderTop: '1px solid var(--border-color)', 
                marginTop: '8px', 
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                fontWeight: 600
            }}>
                <span style={{ color: 'var(--text-secondary)' }}>{totalLabel}</span>
                <span style={{ color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)' }}>
                    ${typeof calculatedTotal === 'number' ? calculatedTotal.toFixed(1) : calculatedTotal}M
                </span>
            </div>
        </div>
    );
}

// ============================================
// 段落一：容量總覽
// ============================================

function SpaceOverviewSection({ player, capacityStatus, energySummary, currentSeason }) {
    const getCapacityColor = (ratio) => {
        if (ratio >= 1.0) return 'var(--accent-red)';
        if (ratio >= 0.8) return 'var(--accent-yellow)';
        return 'var(--accent-green)';
    };
    
    // 修正：從正確的路徑獲取季節需求係數
    const demandMultiplier = currentSeason?.demand_multiplier || 
                             energySummary?.breakdown?.season_demand ||
                             energySummary?.season_info?.demand_multiplier || 
                             1.0;
    
    return (
        <div style={{ 
            padding: '12px', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '8px', 
            marginBottom: '16px'
        }}>
            {/* 容量進度條 */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🏢 設施容量</span>
                    <span style={{ 
                        fontSize: '0.85rem', 
                        fontFamily: 'var(--font-mono)',
                        color: getCapacityColor(capacityStatus.ratio)
                    }}>
                        {capacityStatus.used.toFixed(0)} / {capacityStatus.total.toFixed(0)} Units ({capacityStatus.percentage || 0}%)
                    </span>
                </div>
                <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '4px', 
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        width: `${Math.min(100, capacityStatus.ratio * 100)}%`, 
                        height: '100%', 
                        background: getCapacityColor(capacityStatus.ratio),
                        transition: 'width 0.3s'
                    }} />
                </div>
                {capacityStatus.ratio >= 0.8 && (
                    <div style={{ fontSize: '0.7rem', color: getCapacityColor(capacityStatus.ratio), marginTop: '4px' }}>
                        {capacityStatus.ratio >= 1.0 ? '🚨 容量已滿！無法購買算力/數據/人力' : '⚠️ 容量接近上限'}
                    </div>
                )}
            </div>
            
            {/* 電力與成本摘要 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ 
                    padding: '8px', 
                    background: 'var(--accent-yellow)11', 
                    borderRadius: '6px',
                    border: '1px solid var(--accent-yellow)22'
                }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', marginBottom: '4px' }}>⚡ 供電方式</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {energySummary?.contract_info?.name || '電網市電'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        電費: ${(energySummary?.total_cost || 0).toFixed(1)}M/季
                    </div>
                </div>
                <div style={{ 
                    padding: '8px', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '6px'
                }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>📊 當前季節</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {currentSeason?.name || '春季'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        需求係數: <span style={{ 
                            color: demandMultiplier > 1 ? 'var(--accent-red)' : 
                                   demandMultiplier < 1 ? 'var(--accent-green)' : 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)'
                        }}>{demandMultiplier.toFixed(2)}x</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// 設施電力合約選擇器（整合在設施內）
// ============================================

function FacilityPowerContractSelector({ facility, player, energyConfig, onAction }) {
    const currentContract = facility.power_contract || player.energy_settings?.power_contract || 'grid_default';
    const currentContractConfig = energyConfig[currentContract] || {};
    
    // 獲取當前合約剩餘期限
    const contractRemaining = player.energy_settings?.contract_remaining || 0;
    
    const availableContracts = Object.entries(energyConfig)
        .filter(([id, c]) => (c.unlock_tier || 1) <= (player.mp_tier || 1))
        .map(([id, config]) => ({ id, ...config }));
    
    const handleSwitchContract = (contractId) => {
        // 修正：正確傳遞 facilityId 參數
        onAction('switchFacilityPowerContract', { 
            facilityId: facility.id,
            contractId: contractId 
        });
    };
    
    return (
        <div style={{ 
            padding: '10px',
            background: 'var(--accent-yellow)11',
            borderRadius: '6px',
            border: '1px solid var(--accent-yellow)22'
        }}>
            <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
            }}>
                <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--accent-yellow)', 
                    fontWeight: 600
                }}>
                    ⚡ 電力合約
                </div>
                {contractRemaining > 0 && (
                    <div style={{ 
                        fontSize: '0.65rem', 
                        color: 'var(--text-muted)',
                        padding: '2px 6px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '4px'
                    }}>
                        合約剩餘: <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{contractRemaining}</span> 季
                    </div>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {availableContracts.map(contract => {
                    const isCurrent = currentContract === contract.id;
                    const contractTerm = contract.contract_term || 0;
                    
                    return (
                        <div 
                            key={contract.id}
                            onClick={() => !isCurrent && handleSwitchContract(contract.id)}
                            style={{ 
                                padding: '8px', 
                                background: isCurrent ? 'var(--accent-cyan)22' : 'var(--bg-secondary)',
                                border: `1px solid ${isCurrent ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                                borderRadius: '6px',
                                cursor: isCurrent ? 'default' : 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 600, 
                                color: isCurrent ? 'var(--accent-cyan)' : 'var(--text-primary)',
                                marginBottom: '2px'
                            }}>
                                {contract.display_name || contract.name}
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                {contract.price_per_pflops}x價格
                            </div>
                            {contractTerm > 0 && (
                                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                                    期限: {contractTerm}季
                                </div>
                            )}
                            {contract.upfront_cost > 0 && !isCurrent && (
                                <div style={{ fontSize: '0.55rem', color: 'var(--accent-yellow)' }}>
                                    ${contract.upfront_cost}M簽約
                                </div>
                            )}
                            {isCurrent && (
                                <div style={{ fontSize: '0.55rem', color: 'var(--accent-green)', marginTop: '2px' }}>
                                    ✓ 當前
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// 段落二：現有設施管理（可收合清單，含電力合約）
// ============================================

function ExistingFacilitiesSection({ player, spaceState, spaceConfig, energyConfig, onAction }) {
    const [expandedFacility, setExpandedFacility] = React.useState(null);
    
    const facilities = spaceState?.facilities || [];
    const underConstruction = spaceState?.under_construction || [];
    
    if (facilities.length === 0 && underConstruction.length === 0) {
        return null;
    }
    
    const facilityCount = facilities.length + underConstruction.length;
    
    return (
        <CollapsibleSection 
            title="現有設施管理" 
            icon="📋" 
            color="var(--accent-cyan)"
            defaultExpanded={facilities.length <= 2}
            badge={`${facilityCount}個`}
        >
            {/* 已完成設施列表 */}
            <div style={{ display: 'grid', gap: '8px' }}>
                {facilities.map((facility, i) => {
                    const typeConfig = spaceConfig[facility.type] || {};
                    const facilityPowerContract = facility.power_contract || player.energy_settings?.power_contract || 'grid_default';
                    const powerConfig = energyConfig[facilityPowerContract] || {};
                    const isExpanded = expandedFacility === facility.id;
                    
                    // 修正：使用正確的擴建配置路徑
                    const expansion = typeConfig.expansion || {};
                    const canExpand = typeConfig.expandable && 
                                     (facility.expansions || 0) < (expansion.max_expansions || 3);
                    
                    const expansionCost = expansion.cost || 0;
                    const expansionCapacity = expansion.capacity_add || 0;
                    const expansionTurns = expansion.construction_turns || 2;
                    
                    return (
                        <div key={facility.id} style={{ 
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden'
                        }}>
                            {/* 設施標題列 - 可點擊展開 */}
                            <div 
                                onClick={() => setExpandedFacility(isExpanded ? null : facility.id)}
                                style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    background: isExpanded ? 'var(--accent-cyan)11' : 'transparent'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{typeConfig.icon || '🏢'}</span>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {facility.name || typeConfig.name}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            容量: {facility.capacity} Units | 電力: {powerConfig.display_name || '市電'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {canExpand && (
                                        <span style={{ 
                                            fontSize: '0.65rem', 
                                            padding: '2px 6px',
                                            background: 'var(--accent-green)22',
                                            color: 'var(--accent-green)',
                                            borderRadius: '4px'
                                        }}>
                                            可擴建
                                        </span>
                                    )}
                                    <span style={{ 
                                        color: 'var(--text-muted)',
                                        fontSize: '0.8rem',
                                        transition: 'transform 0.2s',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}>▼</span>
                                </div>
                            </div>
                            
                            {/* 展開的詳細內容 */}
                            {isExpanded && (
                                <div style={{ 
                                    padding: '12px',
                                    borderTop: '1px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)'
                                }}>
                                    {/* 設施詳情 */}
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '8px',
                                        marginBottom: '12px',
                                        fontSize: '0.7rem'
                                    }}>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>容量: </span>
                                            <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                                                {facility.capacity} Units
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>擴建次數: </span>
                                            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                                                {facility.expansions || 0}/{expansion.max_expansions || 3}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>維護費: </span>
                                            <span style={{ color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)' }}>
                                                ${((facility.base_cost || typeConfig.base_cost || 0) * 
                                                   (typeConfig.maintenance_cost_ratio || 0.015)).toFixed(1)}M/季
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* 設施電力合約選擇 */}
                                    <FacilityPowerContractSelector 
                                        facility={facility}
                                        player={player}
                                        energyConfig={energyConfig}
                                        onAction={onAction}
                                    />

                                    {/* 設施技術升級面板 (Tier3+) */}
                                    <FacilityTechUpgradePanel
                                        facility={facility}
                                        player={player}
                                        onAction={onAction}
                                    />
                                    
                                    {/* 擴建選項 */}
                                    {canExpand && (
                                        <div style={{ 
                                            padding: '10px',
                                            background: 'var(--accent-green)11',
                                            borderRadius: '6px',
                                            border: '1px solid var(--accent-green)22',
                                            marginTop: '10px'
                                        }}>
                                            <div style={{ 
                                                fontSize: '0.75rem', 
                                                color: 'var(--accent-green)', 
                                                marginBottom: '8px',
                                                fontWeight: 600
                                            }}>
                                                🔧 擴建選項
                                            </div>
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: '1fr 1fr 1fr',
                                                gap: '8px',
                                                marginBottom: '8px',
                                                fontSize: '0.7rem'
                                            }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>成本: </span>
                                                    <span style={{ color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)' }}>
                                                        ${expansionCost}M
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>新增: </span>
                                                    <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                                                        +{expansionCapacity} Units
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>工期: </span>
                                                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                                                        {expansionTurns} 季
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <GlowButton 
                                                variant="success" 
                                                size="small"
                                                onClick={() => {
                                                    console.log('🔨 擴建按鈕點擊:', { facilityId: facility.id, cash: player.cash, cost: expansionCost });
                                                    onAction('expandFacility', { facilityId: facility.id });
                                                }}
                                                disabled={player.cash < expansionCost}
                                                style={{ width: '100%' }}
                                            >
                                                擴建此設施 (${expansionCost}M)
                                            </GlowButton>
                                            
                                            {player.cash < expansionCost && (
                                                <div style={{ fontSize: '0.65rem', color: 'var(--accent-red)', marginTop: '4px', textAlign: 'center' }}>
                                                    資金不足
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* 不可擴建說明 */}
                                    {!typeConfig.expandable && (
                                        <div style={{ 
                                            fontSize: '0.7rem', 
                                            color: 'var(--text-muted)',
                                            fontStyle: 'italic',
                                            marginTop: '8px'
                                        }}>
                                            此類型設施不支援擴建
                                        </div>
                                    )}
                                    
                                    {typeConfig.expandable && !canExpand && (
                                        <div style={{ 
                                            fontSize: '0.7rem', 
                                            color: 'var(--accent-orange)',
                                            marginTop: '8px'
                                        }}>
                                            已達最大擴建次數
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* 建設中項目 */}
            {underConstruction.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', marginBottom: '6px' }}>
                        🏗️ 建設中
                    </div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                        {underConstruction.map((project, i) => {
                            let displayName = project.name;
                            if (project.type === 'expansion' && project.target_facility_id) {
                                const targetFacility = facilities.find(f => f.id === project.target_facility_id);
                                displayName = (targetFacility?.name || '設施') + ' 擴建 (+' + (project.capacity_add || 0) + ' Units)';
                            }
                            const progress = project.total_construction_turns ? 
                                ((project.total_construction_turns - project.construction_remaining) / project.total_construction_turns * 100) : 0;
                            
                            return (
                                <div key={i} style={{ 
                                    padding: '10px',
                                    background: 'var(--accent-orange)11',
                                    borderRadius: '6px',
                                    border: '1px solid var(--accent-orange)22'
                                }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        marginBottom: '6px',
                                        fontSize: '0.75rem'
                                    }}>
                                        <span style={{ color: 'var(--text-primary)' }}>{displayName}</span>
                                        <span style={{ color: 'var(--accent-orange)' }}>
                                            剩餘 {project.construction_remaining} 季
                                        </span>
                                    </div>
                                    <div style={{ 
                                        width: '100%', 
                                        height: '4px', 
                                        background: 'var(--bg-secondary)', 
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ 
                                            width: `${progress}%`, 
                                            height: '100%', 
                                            background: 'var(--accent-orange)',
                                            transition: 'width 0.3s'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
}

// ============================================
// 段落三：新建設施（可收合區塊）
// ============================================

function NewFacilitySection({ player, spaceConfig, energyConfig, onAction }) {
    const [selectedType, setSelectedType] = React.useState(null);
    const [selectedPower, setSelectedPower] = React.useState('grid_default');
    
    const spaceTypes = Object.entries(spaceConfig)
        .filter(([id, config]) => (config.unlock_tier || 2) <= (player.mp_tier || 1))
        .map(([id, config]) => ({ id, ...config }));
    
    const availableContracts = Object.entries(energyConfig)
        .filter(([id, c]) => (c.unlock_tier || 1) <= (player.mp_tier || 1))
        .map(([id, config]) => ({ id, ...config }));
    
    const selectedTypeConfig = selectedType ? spaceConfig[selectedType] : null;
    const selectedPowerConfig = selectedPower ? energyConfig[selectedPower] : null;
    
    // 計算成本預估
    const calculateCostPreview = () => {
        if (!selectedTypeConfig) return null;
        
        const capacity = selectedTypeConfig.default_capacity;
        const isColocation = selectedType === 'colocation';
        
        const costs = [];
        let totalUpfront = 0;
        
        if (isColocation) {
            const rentalConfig = selectedTypeConfig.rental || {};
            const quarterlyRent = capacity * (rentalConfig.base_rate_per_unit || 0.5);
            costs.push({ label: '季度租金', value: quarterlyRent, suffix: 'M/季', color: 'var(--accent-yellow)' });
            costs.push({ label: '容量', display: `${capacity} Units`, color: 'var(--accent-cyan)', isInfo: true });
            costs.push({ label: '工期', display: '即時可用', color: 'var(--accent-green)', isInfo: true });
            totalUpfront = quarterlyRent;
            
            return { type: 'rental', costs, total: totalUpfront, capacity, turns: 0 };
        } else {
            const baseCost = selectedTypeConfig.base_cost || 0;
            const turns = selectedTypeConfig.construction_turns || 4;
            const maintenancePerQuarter = baseCost * (selectedTypeConfig.maintenance_cost_ratio || 0.015);
            
            totalUpfront = baseCost;
            
            costs.push({ label: '建造成本', value: baseCost, prefix: '$', suffix: 'M', color: 'var(--accent-yellow)' });
            costs.push({ label: '容量', display: `${capacity} Units`, color: 'var(--accent-cyan)', isInfo: true });
            costs.push({ label: '工期', display: `${turns} 季`, color: 'var(--accent-orange)', isInfo: true });
            costs.push({ label: '維護費用', display: `$${maintenancePerQuarter.toFixed(1)}M/季`, color: 'var(--text-muted)', isInfo: true });
            
            if (selectedPowerConfig && selectedPowerConfig.upfront_cost > 0) {
                costs.push({ label: '電力簽約金', value: selectedPowerConfig.upfront_cost, prefix: '$', suffix: 'M', color: 'var(--accent-purple)' });
                totalUpfront += selectedPowerConfig.upfront_cost;
            }
            
            return { type: 'build', costs, total: totalUpfront, capacity, turns };
        }
    };
    
    const costPreview = calculateCostPreview();
    
    const resetSelection = () => {
        setSelectedType(null);
        setSelectedPower('grid_default');
    };
    
    const handleConfirmBuild = () => {
        if (selectedType === 'colocation') {
            onAction('rentColocation', { capacity: selectedTypeConfig.default_capacity });
        } else {
            onAction('buildFacility', { 
                type: selectedType, 
                capacity: selectedTypeConfig.default_capacity,
                powerContract: selectedPower
            });
        }
        resetSelection();
    };
    
    return (
        <CollapsibleSection 
            title="新建設施" 
            icon="🏗️" 
            color="var(--accent-purple)"
            defaultExpanded={false}
        >
            {/* 設施類型選擇 */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    選擇設施類型：
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {spaceTypes.map(spaceType => {
                        const isSelected = selectedType === spaceType.id;
                        return (
                            <div 
                                key={spaceType.id}
                                onClick={() => {
                                    setSelectedType(spaceType.id);
                                    if (spaceType.id === 'colocation') {
                                        setSelectedPower(null);
                                    }
                                }}
                                style={{ 
                                    padding: '12px', 
                                    background: isSelected ? 'var(--accent-purple)22' : 'var(--bg-secondary)',
                                    border: `2px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>{spaceType.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
                                            {spaceType.name}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            {spaceType.default_capacity} Units
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    {spaceType.description}
                                </div>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    fontSize: '0.65rem',
                                    padding: '4px 6px',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '4px'
                                }}>
                                    <span style={{ color: 'var(--accent-yellow)' }}>
                                        {spaceType.id === 'colocation' 
                                            ? `$${((spaceType.rental?.base_rate_per_unit || 0.5) * spaceType.default_capacity).toFixed(0)}M/季`
                                            : `$${spaceType.base_cost}M`
                                        }
                                    </span>
                                    <span style={{ color: 'var(--accent-orange)' }}>
                                        {spaceType.id === 'colocation' ? '即時' : `${spaceType.construction_turns}季`}
                                    </span>
                                </div>
                                {isSelected && (
                                    <div style={{ 
                                        textAlign: 'center',
                                        marginTop: '4px',
                                        color: 'var(--accent-purple)',
                                        fontSize: '0.7rem'
                                    }}>
                                        ✔ 已選擇
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* 電力合約選擇（託管服務不顯示）*/}
            {selectedType && selectedType !== 'colocation' && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        選擇供電方式：
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {availableContracts.map(contract => {
                            const isSelected = selectedPower === contract.id;
                            
                            return (
                                <div 
                                    key={contract.id}
                                    onClick={() => setSelectedPower(contract.id)}
                                    style={{ 
                                        padding: '8px', 
                                        background: isSelected ? 'var(--accent-cyan)22' : 'var(--bg-secondary)',
                                        border: `2px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)', marginBottom: '2px' }}>
                                        {contract.display_name || contract.name}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                        {contract.price_per_pflops}x價格
                                    </div>
                                    {contract.upfront_cost > 0 && (
                                        <div style={{ fontSize: '0.6rem', color: 'var(--accent-yellow)' }}>
                                            ${contract.upfront_cost}M簽約
                                        </div>
                                    )}
                                    {isSelected && (
                                        <div style={{ fontSize: '0.55rem', color: 'var(--accent-green)', marginTop: '2px' }}>
                                            ✔
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* 成本預估與確認 */}
            {costPreview && (
                <div style={{ marginTop: '12px' }}>
                    <CostPreviewCard 
                        title="成本預估" 
                        costs={costPreview.costs}
                        totalValue={costPreview.total}
                        highlight
                    />
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <GlowButton 
                            variant="ghost" 
                            onClick={resetSelection}
                            style={{ flex: 1 }}
                        >
                            取消
                        </GlowButton>
                        <GlowButton 
                            variant="success" 
                            onClick={handleConfirmBuild}
                            disabled={player.cash < costPreview.total}
                            style={{ flex: 1 }}
                        >
                            {costPreview.type === 'rental' ? '確認租賃' : '確認建造'}
                        </GlowButton>
                    </div>
                    
                    {player.cash < costPreview.total && (
                        <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--accent-red)', 
                            textAlign: 'center',
                            marginTop: '8px'
                        }}>
                            資金不足！需要 ${costPreview.total.toFixed(1)}M，目前 ${player.cash.toFixed(1)}M
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}

// ============================================
// 主組件：空間管理面板
// ============================================

function SpaceManagementPanel({ player, onAction }) {
    const SpaceEng = window.SpaceEngine;
    const spaceConfig = window.SpaceConfig?.SPACE_TYPES || {};
    const energyConfig = window.ENERGY_CONFIG?.POWER_CONTRACTS || {};
    
    const spaceState = player.space_state;
    const capacityStatus = SpaceEng?.getCapacityStatus ? SpaceEng.getCapacityStatus(player) : { used: 0, total: 60, ratio: 0, percentage: 0 };
    
    const EnergyEng = window.EnergyPriceEngine;
    
    // 修正：正確獲取季節信息
    const turnCount = player.turn_count || 0;
    const currentSeason = EnergyEng?.getCurrentSeason ? EnergyEng.getCurrentSeason(turnCount) : { name: '春季', demand_multiplier: 1.0 };
    const energySummary = EnergyEng?.calculateEnergyPrice ? 
        EnergyEng.calculateEnergyPrice(player, {}, turnCount) : null;
    
    return (
        <div style={{ marginBottom: '20px' }}>
            <h4 style={{ 
                color: 'var(--accent-purple)', 
                fontSize: '0.95rem', 
                marginBottom: '16px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px'
            }}>
                🏢 空間與電力管理
            </h4>
            
            {/* 段落一：總覽 */}
            <SpaceOverviewSection 
                player={player}
                capacityStatus={capacityStatus}
                energySummary={energySummary}
                currentSeason={currentSeason}
            />
            
            {/* 段落二：現有設施（可收合，含電力合約管理） */}
            <ExistingFacilitiesSection 
                player={player}
                spaceState={spaceState}
                spaceConfig={spaceConfig}
                energyConfig={energyConfig}
                onAction={onAction}
            />
            
            {/* 段落三：新建設施（可收合） */}
            <NewFacilitySection 
                player={player}
                spaceConfig={spaceConfig}
                energyConfig={energyConfig}
                onAction={onAction}
            />
        </div>
    );
}

// ============================================
// 導出組件
// ============================================

window.SpaceUIComponents = {
    SpaceManagementPanel,
    SpaceOverviewSection,
    ExistingFacilitiesSection,
    NewFacilitySection,
    FacilityPowerContractSelector,
    CostPreviewCard,
    CollapsibleSection
};

// 覆蓋舊的 SpaceManagementPanel
window.SpaceManagementPanel = SpaceManagementPanel;

console.log('✓ Space UI components loaded (with collapsible sections & facility power contracts)');