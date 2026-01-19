// ============================================
// 資產卡片 UI 組件 (ui_asset_cards.jsx)
// ============================================
// 排序：空間 → 電力 → 算力 → 人力 → 數據
// Tier 0: 算力/人力/數據（基本操作）
// Tier 2: 空間/電力卡片開放
// Tier 3: 所有資產技術升級開放
// ============================================

const { GlowButton } = window.Components || {};

// ============================================
// 基礎卡片組件
// ============================================

function AssetCardBase({ 
    title, 
    icon, 
    color, 
    level,
    isExpanded, 
    onToggle, 
    children,
    upgradeAvailable = false
}) {
    return (
        <div style={{
            background: 'var(--bg-secondary)',
            border: `1px solid ${isExpanded ? color : 'var(--border-color)'}`,
            borderRadius: '8px',
            overflow: 'hidden',
            transition: 'all 0.2s'
        }}>
            <div 
                onClick={onToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: isExpanded ? `${color}15` : 'transparent',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? `1px solid ${color}33` : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                    <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 600, 
                        color: isExpanded ? color : 'var(--text-primary)' 
                    }}>
                        {title}
                    </span>
                    {level > 0 && (
                        <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            background: `${color}33`,
                            borderRadius: '4px',
                            color: color
                        }}>
                            Lv.{level}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {upgradeAvailable && (
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--accent-green)',
                            animation: 'pulse 2s infinite'
                        }} />
                    )}
                    <span style={{ 
                        color: 'var(--text-muted)', 
                        fontSize: '0.8rem',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                    }}>
                        ▼
                    </span>
                </div>
            </div>
            {isExpanded && (
                <div style={{ padding: '12px' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// ============================================
// 鎖定資產卡片（未解鎖顯示）
// ============================================

function LockedAssetCard({ title, icon, color, unlockTier, currentTier }) {
    return (
        <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            opacity: 0.6
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem', filter: 'grayscale(1)' }}>{icon}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{title}</span>
                </div>
                <span style={{
                    fontSize: '0.7rem',
                    padding: '4px 8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '4px',
                    color: 'var(--text-muted)'
                }}>
                    🔒 Tier {unlockTier} 解鎖
                </span>
            </div>
        </div>
    );
}

// ============================================
// 統計數值行
// ============================================

function StatRow({ icon, label, value, unit = '', color = 'var(--text-primary)', highlight = false }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 0',
            borderBottom: '1px solid var(--border-color)'
        }}>
            <span style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                {icon && <span>{icon}</span>}
                {label}
            </span>
            <span style={{ 
                fontSize: highlight ? '0.9rem' : '0.8rem', 
                fontWeight: highlight ? 600 : 400,
                color: color,
                fontFamily: 'var(--font-mono)'
            }}>
                {typeof value === 'number' ? value.toLocaleString() : value}{unit}
            </span>
        </div>
    );
}

// ============================================
// 升級路線顯示
// ============================================

function UpgradePathDisplay({ 
    assetType,
    pathId, 
    pathConfig, 
    currentLevel, 
    maxLevel = 3,
    onUpgrade,
    canUpgrade,
    upgradeCost,
    disabled = false,
    upgradeStatus = null
}) {
    const levels = pathConfig?.levels || [];
    const currentConfig = levels.find(l => l.level === currentLevel);
    const nextConfig = levels.find(l => l.level === currentLevel + 1);
    const isMaxed = currentLevel >= maxLevel;
    
    // 解析進度狀態
    const isResearching = upgradeStatus?.status === 'researching';
    const isConstructing = upgradeStatus?.status === 'constructing';
    const isInProgress = isResearching || isConstructing;
    const productState = upgradeStatus?.productState;
    
    // 計算進度百分比
    let progressPercent = 0;
    let progressLabel = '';
    if (isResearching && productState) {
        const total = productState.research_total || 1;
        const current = productState.research_progress || 0;
        progressPercent = (current / total) * 100;
        progressLabel = `🔬 研發中 ${Math.floor(current)}/${total} 季`;
    } else if (isConstructing && productState) {
        const total = productState.construction_total || 1;
        const current = productState.construction_progress || 0;
        progressPercent = (current / total) * 100;
        progressLabel = `🏗️ 施工中 ${current}/${total} 季`;
    }
    
    
    return (
        <div style={{
            padding: '8px',
            background: isInProgress ? 'var(--accent-yellow)11' : 'var(--bg-tertiary)',
            border: isInProgress ? '1px solid var(--accent-yellow)33' : 'none',
            borderRadius: '6px',
            marginBottom: '6px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{pathConfig?.icon || 'âš™ï¸'}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{pathConfig?.name || pathId}</span>
                </div>
                <span style={{
                    fontSize: '0.65rem',
                    color: isInProgress ? 'var(--accent-yellow)' : (isMaxed ? 'var(--accent-yellow)' : 'var(--text-muted)'),
                    padding: '2px 6px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px'
                }}>
                    {isInProgress ? (isResearching ? '🔬 研發中' : '🏗️ 施工中') : (currentLevel === 0 ? '未升級' : (currentConfig?.name || `Lv.${currentLevel}`))}
                </span>
            </div>
            
            <div style={{ fontSize: '0.65rem', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--accent-green)' }}>â†‘ {pathConfig?.benefit_summary || ''}</span>
                <span style={{ color: 'var(--accent-red)' }}>â†“ {pathConfig?.cost_summary || ''}</span>
            </div>
            
            <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
                {[1, 2, 3].map(level => (
                    <div key={level} style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        background: level <= currentLevel ? 'var(--accent-cyan)' : 
                                   (level === currentLevel + 1 && isInProgress) ? 'var(--accent-yellow)55' : 
                                   'var(--bg-secondary)'
                    }} />
                ))}
            </div>
            
            {/* 研發/施工進度條 */}
            {isInProgress && (
                <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-yellow)', marginBottom: '3px' }}>
                        {progressLabel}
                    </div>
                    <div style={{ 
                        height: '6px', 
                        background: 'var(--bg-secondary)', 
                        borderRadius: '3px', 
                        overflow: 'hidden' 
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: isResearching ? 'var(--accent-yellow)' : 'var(--accent-orange)',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                </div>
            )}
            
            {!isMaxed && nextConfig && !isInProgress && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>â†’ {nextConfig.name}</span>
                    {GlowButton ? (
                        <GlowButton variant="primary" size="small" onClick={() => onUpgrade(assetType, pathId)} disabled={disabled || !canUpgrade} style={{ fontSize: '0.65rem', padding: '3px 8px' }}>
                            ${upgradeCost?.cash || '?'}M
                        </GlowButton>
                    ) : (
                        <button onClick={() => onUpgrade(assetType, pathId)} disabled={disabled || !canUpgrade} style={{ fontSize: '0.65rem', padding: '3px 8px' }}>
                            ${upgradeCost?.cash || '?'}M
                        </button>
                    )}
                </div>
            )}
            
            {/* 顯示不可升級原因 */}
            {!isMaxed && !isInProgress && !canUpgrade && upgradeStatus?.reason && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    🔒 {upgradeStatus.reason}
                </div>
            )}
            
            {isMaxed && (
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', textAlign: 'center' }}>
                    ✔ 已達最高等級
                </div>
            )}
        </div>
    );
}

// ============================================
// 空間卡片（Tier 2+ 開放）
// ============================================

// 新建設施彈出視窗組件
function NewFacilityModal({ player, onAction, onClose }) {
    const [selectedType, setSelectedType] = React.useState(null);
    const [selectedPower, setSelectedPower] = React.useState('grid_default');
    
    const spaceConfig = window.SpaceConfig?.SPACE_TYPES || {};
    const energyConfig = window.ENERGY_CONFIG?.POWER_CONTRACTS || {};
    
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
        
        let totalUpfront = 0;
        let quarterlyRent = 0;
        let turns = 0;
        let maintenancePerQuarter = 0;
        
        if (isColocation) {
            const rentalConfig = selectedTypeConfig.rental || {};
            quarterlyRent = capacity * (rentalConfig.base_rate_per_unit || 0.5);
            totalUpfront = quarterlyRent;
        } else {
            const baseCost = selectedTypeConfig.base_cost || 0;
            turns = selectedTypeConfig.construction_turns || 4;
            maintenancePerQuarter = baseCost * (selectedTypeConfig.maintenance_cost_ratio || 0.015);
            totalUpfront = baseCost;
            
            if (selectedPowerConfig && selectedPowerConfig.upfront_cost > 0) {
                totalUpfront += selectedPowerConfig.upfront_cost;
            }
        }
        
        return { 
            type: isColocation ? 'rental' : 'build', 
            total: totalUpfront, 
            capacity, 
            turns,
            quarterlyRent,
            maintenancePerQuarter,
            powerCost: selectedPowerConfig?.upfront_cost || 0
        };
    };
    
    const costPreview = calculateCostPreview();
    
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
        onClose();
    };
    
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--accent-purple)',
                padding: '20px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
            }} onClick={e => e.stopPropagation()}>
                {/* 標題 */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{ color: 'var(--accent-purple)', fontSize: '1rem', margin: 0 }}>
                        🏗️ 新建設施
                    </h3>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '1.2rem',
                            cursor: 'pointer'
                        }}
                    >✕</button>
                </div>
                
                {/* 設施類型選擇 */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
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
                                        } else {
                                            setSelectedPower('grid_default');
                                        }
                                    }}
                                    style={{ 
                                        padding: '10px', 
                                        background: isSelected ? 'var(--accent-purple)22' : 'var(--bg-tertiary)',
                                        border: `2px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{spaceType.icon}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
                                        {spaceType.name}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {spaceType.id === 'colocation' ? '即時可用' : `${spaceType.default_capacity} Units · ${spaceType.construction_turns}季`}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', marginTop: '2px' }}>
                                        {spaceType.id === 'colocation' 
                                            ? `$${(spaceType.default_capacity * (spaceType.rental?.base_rate_per_unit || 0.5)).toFixed(0)}M/季`
                                            : `$${spaceType.base_cost}M`
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* 電力合約選擇（非託管時顯示）*/}
                {selectedType && selectedType !== 'colocation' && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            選擇供電方式：
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                            {availableContracts.map(contract => {
                                const isSelected = selectedPower === contract.id;
                                return (
                                    <div 
                                        key={contract.id}
                                        onClick={() => setSelectedPower(contract.id)}
                                        style={{ 
                                            padding: '8px', 
                                            background: isSelected ? 'var(--accent-cyan)22' : 'var(--bg-tertiary)',
                                            border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
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
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* 成本預估 */}
                {costPreview && (
                    <div style={{ 
                        padding: '12px', 
                        background: 'var(--accent-purple)11', 
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            成本預估
                        </div>
                        <div style={{ display: 'grid', gap: '4px', fontSize: '0.75rem' }}>
                            {costPreview.type === 'rental' ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>季度租金</span>
                                        <span style={{ color: 'var(--accent-yellow)' }}>${costPreview.quarterlyRent.toFixed(1)}M/季</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>容量</span>
                                        <span style={{ color: 'var(--accent-cyan)' }}>{costPreview.capacity} Units</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>建造成本</span>
                                        <span style={{ color: 'var(--accent-yellow)' }}>${(costPreview.total - costPreview.powerCost).toFixed(1)}M</span>
                                    </div>
                                    {costPreview.powerCost > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>電力簽約金</span>
                                            <span style={{ color: 'var(--accent-purple)' }}>${costPreview.powerCost}M</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>容量</span>
                                        <span style={{ color: 'var(--accent-cyan)' }}>{costPreview.capacity} Units</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>工期</span>
                                        <span style={{ color: 'var(--accent-orange)' }}>{costPreview.turns} 季</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>維護費用</span>
                                        <span style={{ color: 'var(--text-muted)' }}>${costPreview.maintenancePerQuarter.toFixed(1)}M/季</span>
                                    </div>
                                </>
                            )}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>總計</span>
                                <span style={{ color: 'var(--accent-yellow)' }}>${costPreview.total.toFixed(1)}M</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 按鈕 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        取消
                    </button>
                    {GlowButton ? (
                        <GlowButton 
                            variant="success" 
                            onClick={handleConfirmBuild}
                            disabled={!selectedType || (player.cash < (costPreview?.total || 0))}
                            style={{ flex: 1 }}
                        >
                            {costPreview?.type === 'rental' ? '確認租賃' : '確認建造'}
                        </GlowButton>
                    ) : (
                        <button 
                            onClick={handleConfirmBuild}
                            disabled={!selectedType || (player.cash < (costPreview?.total || 0))}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: 'var(--accent-green)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                cursor: 'pointer',
                                opacity: (!selectedType || (player.cash < (costPreview?.total || 0))) ? 0.5 : 1
                            }}
                        >
                            {costPreview?.type === 'rental' ? '確認租賃' : '確認建造'}
                        </button>
                    )}
                </div>
                
                {costPreview && player.cash < costPreview.total && (
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
        </div>
    );
}


function SpaceCard({ player, onAction, onUpgrade, isExpanded, onToggle, showUpgrades = false }) {
    const [showNewFacilityModal, setShowNewFacilityModal] = React.useState(false);
    
    const config = window.AssetCardConfig;
    const upgrades = config?.SPACE_UPGRADES || {};
    const playerUpgrades = player.asset_upgrades?.space || {};
    
    const avgLevel = Object.keys(upgrades).length > 0 
        ? Math.round(Object.values(playerUpgrades).reduce((a, b) => a + b, 0) / Object.keys(upgrades).length)
        : 0;
    
    // 使用 SpaceEngine 計算正確的容量數據
    const SpaceEng = window.SpaceEngine;
    const spaceState = player.space_state;
    
    // 從 space_state 獲取設施列表
    const facilities = spaceState?.facilities || [];
    const underConstruction = spaceState?.under_construction || [];
    const colocationRentals = spaceState?.colocation_rentals || [];
    
    // 使用 SpaceEngine 計算容量狀態
    const capacityStatus = SpaceEng?.getCapacityStatus ? 
        SpaceEng.getCapacityStatus(player) : 
        { used: 0, total: 60, ratio: 0, percentage: 0, status: 'normal' };
    
    // 計算總容量（已完成設施 + 託管）
    const totalCapacity = capacityStatus.total;
    const usedCapacity = capacityStatus.used;
    const usageRatio = capacityStatus.ratio * 100;
    
    return (
        <AssetCardBase
            title="空間"
            icon="🏢"
            color="#aa44ff"
            level={avgLevel}
            isExpanded={isExpanded}
            onToggle={onToggle}
            upgradeAvailable={showUpgrades && avgLevel < 3}
        >
            <div style={{ marginBottom: '12px' }}>
                <StatRow icon="🏗️" label="已完成設施" value={facilities.filter(f => f.status === 'completed').length} unit=" 座" />
                {underConstruction.length > 0 && (
                    <StatRow icon="🔧" label="建設中" value={underConstruction.length} unit=" 項" color="var(--accent-yellow)" />
                )}
                {colocationRentals.length > 0 && (
                    <StatRow icon="☁️" label="託管租賃" value={colocationRentals.length} unit=" 個" color="var(--accent-cyan)" />
                )}
                <StatRow icon="📦" label="總容量" value={totalCapacity.toFixed(0)} unit=" Units" highlight />
                <StatRow icon="📊" label="已使用" value={usedCapacity.toFixed(0)} unit=" Units" />
                <StatRow 
                    icon="⚡" 
                    label="使用率" 
                    value={usageRatio.toFixed(1)} 
                    unit="%" 
                    color={capacityStatus.status === 'critical' ? 'var(--accent-red)' : 
                           capacityStatus.status === 'warning' ? 'var(--accent-yellow)' : 
                           'var(--accent-green)'} 
                />
            </div>
            
            {/* 使用率進度條 */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${Math.min(100, usageRatio)}%`,
                        height: '100%',
                        background: capacityStatus.status === 'critical' ? 'var(--accent-red)' : 
                                   capacityStatus.status === 'warning' ? 'var(--accent-yellow)' : 
                                   'var(--accent-cyan)',
                        transition: 'width 0.3s'
                    }} />
                </div>
                {capacityStatus.status !== 'normal' && (
                    <div style={{ 
                        fontSize: '0.65rem', 
                        color: capacityStatus.status === 'critical' ? 'var(--accent-red)' : 'var(--accent-yellow)', 
                        marginTop: '4px' 
                    }}>
                        {capacityStatus.status === 'critical' ? '🚨 容量不足！無法購買新資產' : '⚠️ 容量接近上限'}
                    </div>
                )}
            </div>
            
            {/* 新建設施按鈕 - 改為開啟彈出視窗 */}
            <div style={{ marginBottom: '12px' }}>
                {GlowButton ? (
                    <GlowButton variant="primary" size="small" onClick={() => setShowNewFacilityModal(true)} style={{ width: '100%' }}>
                        🏗️ 新建設施
                    </GlowButton>
                ) : (
                    <button onClick={() => setShowNewFacilityModal(true)} style={{ width: '100%', padding: '8px' }}>
                        🏗️ 新建設施
                    </button>
                )}
            </div>
            
            {/* 技術升級區 */}
            {showUpgrades && Object.keys(upgrades).length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        ⬆️ 技術升級
                    </div>
                    {Object.entries(upgrades).map(([pathId, pathConfig]) => {
                        const currentLevel = playerUpgrades[pathId] || 0;
                        const canUpgradeResult = window.AssetCardEngine?.canUpgrade(player, 'space', pathId);
                        return (
                            <UpgradePathDisplay
                                key={pathId}
                                assetType="space"
                                pathId={pathId}
                                pathConfig={pathConfig}
                                currentLevel={currentLevel}
                                maxLevel={3}
                                onUpgrade={onUpgrade}
                                canUpgrade={canUpgradeResult?.canUpgrade}
                                upgradeCost={canUpgradeResult?.cost}
                                upgradeStatus={canUpgradeResult}
                            />
                        );
                    })}
                </div>
            )}
            
            {!showUpgrades && (
                <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    🔒 Tier 3 解鎖技術升級
                </div>
            )}
            
            {/* 新建設施彈出視窗 */}
            {showNewFacilityModal && (
                <NewFacilityModal 
                    player={player} 
                    onAction={onAction} 
                    onClose={() => setShowNewFacilityModal(false)} 
                />
            )}
        </AssetCardBase>
    );
}

// ============================================
// 電力卡片（Tier 2+ 開放）
// ============================================

function PowerCard({ player, onAction, onUpgrade, isExpanded, onToggle, showUpgrades = false }) {
    const config = window.AssetCardConfig;
    const upgrades = config?.POWER_UPGRADES || {};
    const playerUpgrades = player.asset_upgrades?.power || {};
    
    const avgLevel = Object.keys(upgrades).length > 0 
        ? Math.round(Object.values(playerUpgrades).reduce((a, b) => a + b, 0) / Object.keys(upgrades).length)
        : 0;
    
    // 使用 SpaceEngine 計算電力穩定性
    const SpaceEng = window.SpaceEngine;
    const EnergyEng = window.EnergyPriceEngine;
    const energyConfig = window.ENERGY_CONFIG || {};
    const spaceState = player.space_state;
    
    // 電力穩定性狀態
    const powerStatus = SpaceEng?.getPowerStabilityStatus ? 
        SpaceEng.getPowerStabilityStatus(player) : 
        { stability: 1, status: 'normal', percentage: 100, details: [] };
    
    // 計算季節信息
    const turnCount = player.turn_count || 0;
    const currentSeason = EnergyEng?.getCurrentSeason ? 
        EnergyEng.getCurrentSeason(turnCount) : 
        { name: '春季', demand_multiplier: 1.0 };
    
    // 計算能源成本
    const energySummary = EnergyEng?.calculateEnergyPrice ? 
        EnergyEng.calculateEnergyPrice(player, player.globalParams || {}, turnCount) : 
        { total_cost: 0, base_price: 1.0 };
    
    // 獲取設施電力合約分布
    const facilities = spaceState?.facilities || [];
    const contractDistribution = {};
    facilities.forEach(f => {
        if (f.status === 'completed') {
            const contractId = f.power_contract || 'grid_default';
            const contractConfig = energyConfig.POWER_CONTRACTS?.[contractId] || {};
            const contractName = contractConfig.display_name || contractConfig.name || '市電';
            contractDistribution[contractName] = (contractDistribution[contractName] || 0) + 1;
        }
    });
    
    // 檢查是否解鎖多元能源（renewable Lv.1+）
    const hasRenewable = (playerUpgrades.renewable || 0) >= 1;
    
    return (
        <AssetCardBase
            title="電力"
            icon="⚡"
            color="#ffd000"
            level={avgLevel}
            isExpanded={isExpanded}
            onToggle={onToggle}
            upgradeAvailable={showUpgrades && avgLevel < 3}
        >
            <div style={{ marginBottom: '12px' }}>
                <StatRow 
                    icon="📊" 
                    label="供電穩定性" 
                    value={powerStatus.percentage} 
                    unit="%" 
                    highlight 
                    color={powerStatus.status === 'critical' ? 'var(--accent-red)' : 
                           powerStatus.status === 'warning' ? 'var(--accent-yellow)' : 
                           'var(--accent-green)'} 
                />
                <StatRow icon="🌡️" label="當前季節" value={currentSeason.name || '春季'} />
                <StatRow icon="📈" label="季節需求" value={((currentSeason.demand_multiplier || 1) * 100).toFixed(0)} unit="%" />
                <StatRow 
                    icon="💰" 
                    label="預估電費" 
                    value={(energySummary.total_cost || 0).toFixed(1)} 
                    unit=" M/季" 
                    color="var(--accent-yellow)" 
                />
            </div>
            
            {/* 電力穩定性進度條 */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${powerStatus.percentage}%`,
                        height: '100%',
                        background: powerStatus.status === 'critical' ? 'var(--accent-red)' : 
                                   powerStatus.status === 'warning' ? 'var(--accent-yellow)' : 
                                   'var(--accent-cyan)',
                        transition: 'width 0.3s'
                    }} />
                </div>
            </div>
            
            {/* 合約分布 */}
            {Object.keys(contractDistribution).length > 0 && (
                <div style={{ marginBottom: '12px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        ⚡ 設施電力合約分布
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(contractDistribution).map(([name, count]) => (
                            <span key={name} style={{ 
                                fontSize: '0.65rem', 
                                padding: '2px 6px', 
                                background: 'var(--accent-cyan)22', 
                                borderRadius: '4px',
                                color: 'var(--accent-cyan)'
                            }}>
                                {name}: {count}座
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            {/* 自營能源選項（需要 renewable Lv.1+）*/}
            {hasRenewable && (
                <div style={{ marginBottom: '12px', padding: '8px', background: 'var(--accent-green)11', borderRadius: '6px', border: '1px solid var(--accent-green)33' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginBottom: '6px' }}>
                        🌱 自營能源可用
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        新建設施時可選擇自營能源選項
                    </div>
                </div>
            )}
            
            {/* 技術升級區 */}
            {showUpgrades && Object.keys(upgrades).length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        ⬆️ 技術升級
                    </div>
                    {Object.entries(upgrades).map(([pathId, pathConfig]) => {
                        const currentLevel = playerUpgrades[pathId] || 0;
                        const canUpgradeResult = window.AssetCardEngine?.canUpgrade(player, 'power', pathId);
                        return (
                            <UpgradePathDisplay
                                key={pathId}
                                assetType="compute"
                                pathId={pathId}
                                pathConfig={pathConfig}
                                currentLevel={currentLevel}
                                maxLevel={3}
                                onUpgrade={onUpgrade}
                                canUpgrade={canUpgradeResult?.canUpgrade}
                                upgradeCost={canUpgradeResult?.cost}
                                upgradeStatus={canUpgradeResult}
                            />
                        );
                    })}
                </div>
            )}
            
            {!showUpgrades && (
                <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    🔒 Tier 3 解鎖技術升級
                </div>
            )}
        </AssetCardBase>
    );
}

// ============================================
// 算力卡片（始終開放）- 整合完整功能
// ============================================

function ComputeCard({ player, onAction, onUpgrade, isExpanded, onToggle, showUpgrades = false, globalParams, derived }) {
    const [quantity, setQuantity] = React.useState(10);
    const [rentOutQty, setRentOutQty] = React.useState(5);
    const [rentOutTurns, setRentOutTurns] = React.useState(4);
    
    const config = window.AssetCardConfig;
    const P_GPU = (window.GameConfig?.COSTS?.PFLOPS_UNIT_PRICE || 20) * (globalParams?.P_GPU || player.globalParams?.P_GPU || 1);
    
    const upgrades = config?.COMPUTE_UPGRADES || {};
    const playerUpgrades = player.asset_upgrades?.compute || {};
    
    const avgLevel = Object.keys(upgrades).length > 0 
        ? Math.round(Object.values(playerUpgrades).reduce((a, b) => a + b, 0) / Object.keys(upgrades).length)
        : 0;
    
    const owned = player.pflops || player.pflops_owned || 0;
    const cloud = player.cloud_pflops || 0;
    const total = owned + cloud;
    const locked = player.locked_pflops || derived?.total_locked_pflops || 0;
    
    // 出租合約計算
    const currentRentedOut = player.rented_pflops_contracts ? 
        player.rented_pflops_contracts.reduce((sum, c) => sum + c.amount, 0) : 0;
    const availableToRent = Math.max(0, owned - locked - currentRentedOut);
    const available = owned - locked - currentRentedOut;
    
    // 空間容量檢查 - Tier2+才需要檢查
    const SpaceEng = window.SpaceEngine;
    const isTier2Plus = (player.mp_tier || 0) >= 2;
    let capacityCheck = { canPurchase: true };
    if (isTier2Plus && SpaceEng && typeof SpaceEng.canPurchaseAsset === 'function') {
        capacityCheck = SpaceEng.canPurchaseAsset(player, quantity) || { canPurchase: true };
    }
    const canBuyPflops = capacityCheck.canPurchase && player.cash >= quantity * P_GPU;
    
    return (
        <AssetCardBase
            title="算力"
            icon="🖥️"
            color="#00f5ff"
            level={avgLevel}
            isExpanded={isExpanded}
            onToggle={onToggle}
            upgradeAvailable={showUpgrades && avgLevel < 3}
        >
            {/* 統計信息 */}
            <div style={{ marginBottom: '12px' }}>
                <StatRow icon="🖥️" label="自有算力" value={owned.toFixed(1)} unit=" PF" color="var(--accent-cyan)" highlight />
                <StatRow icon="☁️" label="雲端租賃" value={cloud.toFixed(1)} unit=" PF" />
                <StatRow icon="⚡" label="總算力" value={total.toFixed(1)} unit=" PF" highlight />
                <StatRow icon="🔒" label="已鎖定" value={locked.toFixed(1)} unit=" PF" color="var(--text-muted)" />
                <StatRow icon="📤" label="已出租" value={currentRentedOut.toFixed(1)} unit=" PF" color="var(--accent-green)" />
                <StatRow icon="📦" label="可用算力" value={available.toFixed(1)} unit=" PF" />
            </div>
            
            {/* 購買/出售區域 */}
            <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    💰 自有算力交易
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>數量:</span>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
                        min={1}
                        style={{
                            width: '70px',
                            padding: '4px 6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem'
                        }}
                    />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        單價: ${P_GPU.toFixed(1)}M
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {GlowButton ? (
                        <>
                            <GlowButton variant="primary" size="small" onClick={() => onAction('buyPflops', { quantity })} disabled={!canBuyPflops}>
                                購買 +{quantity} (${(quantity * P_GPU).toFixed(1)}M)
                            </GlowButton>
                            <GlowButton variant="danger" size="small" onClick={() => onAction('sellPflops', { quantity })} disabled={available < quantity}>
                                出售 -{quantity}
                            </GlowButton>
                        </>
                    ) : (
                        <>
                            <button onClick={() => onAction('buyPflops', { quantity })} disabled={!canBuyPflops}>購買 +{quantity}</button>
                            <button onClick={() => onAction('sellPflops', { quantity })} disabled={available < quantity}>出售 -{quantity}</button>
                        </>
                    )}
                </div>
                {capacityCheck.warning && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-yellow)', marginTop: '4px' }}>
                        ⚠️ {capacityCheck.warning}
                    </div>
                )}
                {!capacityCheck.canPurchase && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-red)', marginTop: '4px' }}>
                        🚨 空間不足
                    </div>
                )}
            </div>
            
            {/* 雲端算力區域 */}
            <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--accent-yellow)11', borderRadius: '6px', border: '1px solid var(--accent-yellow)33' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginBottom: '8px' }}>
                    ☁️ 雲端算力租賃
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    每季扣款 · 成本: ${(3 * (globalParams?.E_Price || player.globalParams?.E_Price || 1)).toFixed(1)}M/PF/季
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {GlowButton ? (
                        <>
                            <GlowButton variant="warning" size="small" onClick={() => onAction('rentCloud', { quantity })}>租用 +{quantity}</GlowButton>
                            <GlowButton variant="danger" size="small" onClick={() => onAction('cancelCloud', { quantity })} disabled={cloud < quantity}>解約 -{quantity}</GlowButton>
                        </>
                    ) : (
                        <>
                            <button onClick={() => onAction('rentCloud', { quantity })}>租用 +{quantity}</button>
                            <button onClick={() => onAction('cancelCloud', { quantity })} disabled={cloud < quantity}>解約</button>
                        </>
                    )}
                </div>
            </div>
            
            {/* 出租算力區域 */}
            <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--accent-green)11', borderRadius: '6px', border: '1px solid var(--accent-green)33' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginBottom: '6px' }}>
                    📤 出租自有算力
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    可出租閒置算力: {availableToRent.toFixed(1)} PF · 租金: $5M/PF/季
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <div style={{ flex: '1', minWidth: '60px' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>出租數量</label>
                        <input 
                            type="number" 
                            value={rentOutQty} 
                            onChange={(e) => setRentOutQty(parseFloat(e.target.value) || 0)} 
                            min={0.1} 
                            max={availableToRent} 
                            step={0.1}
                            style={{ width: '100%', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }} 
                        />
                    </div>
                    <div style={{ flex: '1', minWidth: '60px' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>合約季數</label>
                        <input 
                            type="number" 
                            value={rentOutTurns} 
                            onChange={(e) => setRentOutTurns(parseInt(e.target.value) || 1)} 
                            min={1} 
                            max={8}
                            style={{ width: '100%', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }} 
                        />
                    </div>
                    {GlowButton ? (
                        <GlowButton 
                            variant="success" 
                            size="small" 
                            onClick={() => onAction('rentOutPflops', { quantity: rentOutQty, turns: rentOutTurns })} 
                            disabled={rentOutQty > availableToRent || rentOutQty <= 0}
                        >
                            出租 (+${(rentOutQty * 5).toFixed(1)}M/季)
                        </GlowButton>
                    ) : (
                        <button onClick={() => onAction('rentOutPflops', { quantity: rentOutQty, turns: rentOutTurns })} disabled={rentOutQty > availableToRent || rentOutQty <= 0}>
                            出租
                        </button>
                    )}
                </div>
                {/* 當前出租合約 */}
                {player.rented_pflops_contracts && player.rented_pflops_contracts.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>當前出租合約:</div>
                        {player.rented_pflops_contracts.map((c, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span>{c.amount.toFixed(1)} PF</span>
                                <span style={{ color: 'var(--text-muted)' }}>剩餘 {c.return_turn - player.turn_count} 季</span>
                                <span style={{ color: 'var(--accent-green)' }}>+${(c.amount * 5).toFixed(1)}M/季</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* 技術升級區 */}
            {showUpgrades && Object.keys(upgrades).length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        ⬆️ 技術升級
                    </div>
                    {Object.entries(upgrades).map(([pathId, pathConfig]) => {
                        const currentLevel = playerUpgrades[pathId] || 0;
                        const canUpgradeResult = window.AssetCardEngine?.canUpgrade(player, 'compute', pathId);
                        return (
                            <UpgradePathDisplay
                                key={pathId}
                                assetType="compute"
                                pathId={pathId}
                                pathConfig={pathConfig}
                                currentLevel={currentLevel}
                                maxLevel={3}
                                onUpgrade={onUpgrade}
                                canUpgrade={canUpgradeResult?.canUpgrade}
                                upgradeCost={canUpgradeResult?.cost}
                                upgradeStatus={canUpgradeResult}
                            />
                        );
                    })}
                </div>
            )}
            
            {!showUpgrades && (
                <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    🔒 Tier 3 解鎖技術升級
                </div>
            )}
        </AssetCardBase>
    );
}

// ============================================
// 人力卡片（始終開放）- 整合完整功能
// ============================================

function TalentCard({ player, onAction, onUpgrade, isExpanded, onToggle, showUpgrades = false, derived }) {
    const [fireType, setFireType] = React.useState('junior');
    const [fireQty, setFireQty] = React.useState(1);
    const [showInfo, setShowInfo] = React.useState(null);
    
    const config = window.AssetCardConfig;
    const upgrades = config?.TALENT_UPGRADES || {};
    const playerUpgrades = player.asset_upgrades?.talent || {};
    
    const avgLevel = Object.keys(upgrades).length > 0 
        ? Math.round(Object.values(playerUpgrades).reduce((a, b) => a + b, 0) / Object.keys(upgrades).length)
        : 0;
    
    const talent = player.talent || {};
    const totalTalent = (talent.turing || 0) + (talent.senior || 0) + (talent.junior || 0);
    
    const costs = window.GameConfig?.COSTS || {};
    const talentCosts = {
        turing: costs.TURING_RECRUIT_PRICE || 50,
        senior: (costs.SENIOR_SALARY || 2) * 3,
        junior: (costs.JUNIOR_SALARY || 0.5) * 2
    };
    
    // 員工介紹
    const talentDescriptions = {
        turing: '🧠 頂尖 AI 科學家\n• 大幅提升研發效率\n• 解鎖高級產品\n• 增加信任度 +5\n• 季薪: $5M',
        senior: '👨‍💻 資深工程師\n• 可分配至研發/產品/營運\n• 提供穩定技術支援\n• 增加信任度 +2\n• 季薪: $2M',
        junior: '👷 初級工程師\n• 提供基礎算力支援\n• 成本低廉\n• 增加炒作度 +3\n• 季薪: $0.5M'
    };
    
    const talentLabels = {
        turing: { icon: '🧠', name: 'Turing', color: 'var(--accent-magenta)' },
        senior: { icon: '👨‍💻', name: 'Senior', color: 'var(--accent-cyan)' },
        junior: { icon: '👷', name: 'Junior', color: 'var(--accent-green)' }
    };
    
    // 空間容量檢查 - Tier2+才需要檢查
    const SpaceEng = window.SpaceEngine;
    const isTier2Plus = (player.mp_tier || 0) >= 2;
    let capacityCheck = { canPurchase: true };
    if (isTier2Plus && SpaceEng && typeof SpaceEng.canPurchaseAsset === 'function') {
        capacityCheck = SpaceEng.canPurchaseAsset(player, 0.1) || { canPurchase: true };
    }
    
    return (
        <AssetCardBase
            title="人力"
            icon="👥"
            color="#00ff88"
            level={avgLevel}
            isExpanded={isExpanded}
            onToggle={onToggle}
            upgradeAvailable={showUpgrades && avgLevel < 3}
        >
            {/* 統計信息 */}
            <div style={{ marginBottom: '12px' }}>
                <StatRow icon="🧠" label="Turing" value={talent.turing || 0} unit=" 人" color="var(--accent-magenta)" />
                <StatRow icon="👨‍💻" label="Senior" value={talent.senior || 0} unit=" 人" color="var(--accent-cyan)" />
                <StatRow icon="👷" label="Junior" value={talent.junior || 0} unit=" 人" />
                <StatRow icon="👥" label="總人數" value={totalTalent} unit=" 人" highlight />
                <StatRow icon="💰" label="人事成本" value={(derived?.hr_cost || 0).toFixed(1)} unit=" M/季" color="var(--accent-red)" />
            </div>
            
            {/* 聘用區域 */}
            <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    ➕ 人才聘用
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {Object.entries(talentLabels).map(([type, info]) => (
                        <div key={type} style={{ textAlign: 'center', position: 'relative' }}>
                            <div 
                                style={{ fontSize: '1.2rem', marginBottom: '2px', cursor: 'pointer' }}
                                onClick={() => setShowInfo(showInfo === type ? null : type)}
                                title="點擊查看詳情"
                            >
                                {info.icon}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: info.color, marginBottom: '4px' }}>{info.name}</div>
                            {GlowButton ? (
                                <GlowButton 
                                    variant={type === 'turing' ? 'secondary' : type === 'senior' ? 'primary' : 'success'}
                                    size="small"
                                    onClick={() => onAction('hireTalent', { type, quantity: 1 })}
                                    disabled={player.cash < talentCosts[type] || !capacityCheck.canPurchase}
                                    style={{ width: '100%', fontSize: '0.65rem', padding: '4px 6px' }}
                                >
                                    +1 (${talentCosts[type]}M)
                                </GlowButton>
                            ) : (
                                <button 
                                    onClick={() => onAction('hireTalent', { type, quantity: 1 })}
                                    disabled={player.cash < talentCosts[type] || !capacityCheck.canPurchase}
                                    style={{ width: '100%', fontSize: '0.65rem' }}
                                >
                                    +1
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                
                {/* 員工介紹彈出框 */}
                {showInfo && (
                    <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        background: 'var(--bg-secondary)', 
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-line',
                        border: `1px solid ${talentLabels[showInfo].color}33`
                    }}>
                        {talentDescriptions[showInfo]}
                        <div 
                            style={{ 
                                marginTop: '6px', 
                                textAlign: 'right', 
                                color: 'var(--text-muted)', 
                                cursor: 'pointer',
                                fontSize: '0.65rem'
                            }}
                            onClick={() => setShowInfo(null)}
                        >
                            ✕ 關閉
                        </div>
                    </div>
                )}
                
                {!capacityCheck.canPurchase && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-red)', marginTop: '6px', textAlign: 'center' }}>
                        🚨 空間不足，無法聘用
                    </div>
                )}
            </div>
            
            {/* 解聘區域 */}
            <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--accent-red)11', borderRadius: '6px', border: '1px solid var(--accent-red)33' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginBottom: '6px' }}>
                    ⚠️ 員工解聘
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    解聘 Turing/Senior 將觸發 4 季忠誠度懲罰
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '70px' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>類型</label>
                        <select 
                            value={fireType} 
                            onChange={(e) => setFireType(e.target.value)}
                            style={{ width: '100%', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.75rem' }}
                        >
                            <option value="junior">Junior ({talent.junior || 0})</option>
                            <option value="senior">Senior ({talent.senior || 0})</option>
                            <option value="turing">Turing ({talent.turing || 0})</option>
                        </select>
                    </div>
                    <div style={{ width: '50px' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>人數</label>
                        <input 
                            type="number" 
                            value={fireQty} 
                            onChange={(e) => setFireQty(parseInt(e.target.value) || 1)} 
                            min={1} 
                            max={talent[fireType] || 0}
                            style={{ width: '100%', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }} 
                        />
                    </div>
                    {GlowButton ? (
                        <GlowButton 
                            variant="danger" 
                            size="small" 
                            onClick={() => onAction('fireTalent', { type: fireType, quantity: fireQty })} 
                            disabled={(talent[fireType] || 0) < fireQty}
                        >
                            解聘
                        </GlowButton>
                    ) : (
                        <button 
                            onClick={() => onAction('fireTalent', { type: fireType, quantity: fireQty })} 
                            disabled={(talent[fireType] || 0) < fireQty}
                        >
                            解聘
                        </button>
                    )}
                </div>
            </div>
            
            {/* 技術升級區 */}
            {showUpgrades && Object.keys(upgrades).length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        ⬆️ 技術升級
                    </div>
                    {Object.entries(upgrades).map(([pathId, pathConfig]) => {
                        const currentLevel = playerUpgrades[pathId] || 0;
                        const canUpgradeResult = window.AssetCardEngine?.canUpgrade(player, 'talent', pathId);
                        return (
                            <UpgradePathDisplay
                                key={pathId}
                                assetType="talent"
                                pathId={pathId}
                                pathConfig={pathConfig}
                                currentLevel={currentLevel}
                                maxLevel={3}
                                onUpgrade={onUpgrade}
                                canUpgrade={canUpgradeResult?.canUpgrade}
                                upgradeCost={canUpgradeResult?.cost}
                                upgradeStatus={canUpgradeResult}
                            />
                        );
                    })}
                </div>
            )}
            
            {!showUpgrades && (
                <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    🔒 Tier 3 解鎖技術升級
                </div>
            )}
        </AssetCardBase>
    );
}

// ============================================
// 數據類型行顯示輔助組件
// ============================================

function DataTypeRow({ icon, name, value, color, warning = false, quality = null }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            background: warning ? 'var(--accent-yellow)08' : 'transparent',
            borderRadius: '4px',
            borderLeft: `2px solid ${color}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem' }}>{icon}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ 
                    fontSize: '0.8rem', 
                    fontFamily: 'var(--font-mono)', 
                    color: value > 0 ? color : 'var(--text-muted)',
                    fontWeight: value > 0 ? 600 : 400
                }}>
                    {Math.floor(value)}
                </span>
                {quality !== null && value > 0 && (
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        ({(quality * 100).toFixed(0)}%)
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================
// 帶有採購/爬蟲/販賣按鈕的數據類型行組件
// ============================================

function DataTypeRowWithAction({ 
    typeId,
    icon, 
    name, 
    value, 
    color, 
    warning = false, 
    quality = null,
    actionType = null,  // 'purchase' | 'scrape' | null
    actionPrice = 0,
    scrapeRisk = '',    // 'low' | 'high'
    onAction,
    disabled = false,
    grayForbidden = false,
    // 販賣相關
    canSell = false,
    sellPrice = 0,
    onSell,
    sellDisabled = false
}) {
    const { GlowButton } = window.Components || {};
    
    // 決定按鈕樣式
    const getButtonVariant = () => {
        if (actionType === 'purchase') return 'primary';
        if (actionType === 'scrape') {
            return scrapeRisk === 'high' ? 'danger' : 'warning';
        }
        return 'secondary';
    };
    
    // 決定按鈕文字
    const getButtonText = () => {
        if (actionType === 'purchase') {
            return `$${actionPrice}M`;
        }
        if (actionType === 'scrape') {
            return scrapeRisk === 'high' ? '⚠爬取' : '爬取';
        }
        return '';
    };
    
    // 是否顯示主按鈕
    const showButton = actionType && !(actionType === 'scrape' && grayForbidden);
    const isDisabled = disabled;
    
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            background: warning ? 'var(--accent-yellow)08' : 'var(--bg-secondary)',
            borderRadius: '6px',
            borderLeft: `3px solid ${color}`,
            marginBottom: '4px'
        }}>
            {/* 左側：圖標與名稱 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: 0 }}>
                <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                    {actionType === 'scrape' && (
                        <span style={{ 
                            fontSize: '0.55rem', 
                            color: scrapeRisk === 'high' ? 'var(--accent-red)' : 'var(--accent-yellow)' 
                        }}>
                            {scrapeRisk === 'high' ? '⚠高風險' : '🔹低風險'}
                        </span>
                    )}
                    {actionType === 'purchase' && (
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                            買${actionPrice}M {canSell ? `/ 賣$${sellPrice}M` : ''}
                        </span>
                    )}
                </div>
            </div>
            
            {/* 中間：數量 */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                minWidth: '50px',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <span style={{ 
                    fontSize: '0.85rem', 
                    fontFamily: 'var(--font-mono)', 
                    color: value > 0 ? color : 'var(--text-muted)',
                    fontWeight: value > 0 ? 600 : 400
                }}>
                    {Math.floor(value)}
                </span>
                {quality !== null && value > 0 && (
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                        ({(quality * 100).toFixed(0)}%)
                    </span>
                )}
            </div>
            
            {/* 右側：操作按鈕 */}
            <div style={{ minWidth: canSell ? '120px' : '65px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, gap: '4px' }}>
                {/* 主操作按鈕（購買/爬蟲） */}
                {showButton && (
                    GlowButton ? (
                        <GlowButton 
                            variant={getButtonVariant()} 
                            size="small" 
                            onClick={() => onAction(typeId, actionType)}
                            disabled={isDisabled}
                            style={{ fontSize: '0.6rem', padding: '2px 6px' }}
                        >
                            {getButtonText()}
                        </GlowButton>
                    ) : (
                        <button 
                            onClick={() => onAction(typeId, actionType)}
                            disabled={isDisabled}
                            style={{ fontSize: '0.6rem', padding: '2px 6px' }}
                        >
                            {getButtonText()}
                        </button>
                    )
                )}
                
                {/* 販賣按鈕 */}
                {canSell && onSell && (
                    GlowButton ? (
                        <GlowButton 
                            variant="success" 
                            size="small" 
                            onClick={() => onSell(typeId)}
                            disabled={sellDisabled || value < 10}
                            style={{ fontSize: '0.6rem', padding: '2px 6px' }}
                        >
                            賣出
                        </GlowButton>
                    ) : (
                        <button 
                            onClick={() => onSell(typeId)}
                            disabled={sellDisabled || value < 10}
                            style={{ fontSize: '0.6rem', padding: '2px 6px' }}
                        >
                            賣出
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

// ============================================
// 數據合約簽訂彈出視窗
// ============================================

function DataContractModal({ player, onAction, onClose }) {
    const [selectedType, setSelectedType] = React.useState('legal_high_broad');
    const { GlowButton } = window.Components || {};
    
    const dataConfig = window.DataConfig || {};
    const contractConfig = dataConfig.PURCHASE_OPTIONS?.contract || {};
    const availableTypes = contractConfig.available_types || ['legal_high_broad', 'legal_low'];
    
    const getContractDetails = (typeId) => {
        const typeConfig = dataConfig.DATA_TYPES?.[typeId] || {};
        const basePrice = typeConfig.base_price || 1;
        const discountedPrice = basePrice * (contractConfig.price_multiplier || 0.7);
        const duration = contractConfig.duration || 4;
        const deliveryPerTurn = contractConfig.delivery_per_turn || 50;
        const totalDelivery = deliveryPerTurn * duration;
        const costPerTurn = discountedPrice * deliveryPerTurn;
        const totalCost = costPerTurn * duration;
        return { typeConfig, basePrice, discountedPrice, duration, deliveryPerTurn, totalDelivery, costPerTurn, totalCost, savings: (basePrice - discountedPrice) * totalDelivery };
    };
    
    const details = getContractDetails(selectedType);
    const canAfford = player.cash >= details.costPerTurn;
    
    const handleSign = () => {
        onAction('signDataContract', { dataType: selectedType, duration: details.duration, deliveryPerTurn: details.deliveryPerTurn, costPerTurn: details.costPerTurn });
        onClose();
    };
    
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-cyan)', borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-cyan)' }}>📝 數據訂閱合約</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                </div>
                
                <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <p style={{ margin: '0 0 6px 0' }}>📋 合約條款：</p>
                    <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                        <li>合約期限：{details.duration} 季</li>
                        <li>每季自動交付數據</li>
                        <li>享受 {((1 - (contractConfig.price_multiplier || 0.7)) * 100).toFixed(0)}% 價格折扣</li>
                        <li>提前解約需支付 {((contractConfig.cancellation_fee || 0.3) * 100).toFixed(0)}% 違約金</li>
                    </ul>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>選擇數據類型</div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {availableTypes.map(typeId => {
                            const typeConfig = dataConfig.DATA_TYPES?.[typeId] || {};
                            const isSelected = selectedType === typeId;
                            return (
                                <button key={typeId} onClick={() => setSelectedType(typeId)} style={{ padding: '10px 12px', background: isSelected ? 'var(--accent-cyan)22' : 'var(--bg-tertiary)', border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1rem' }}>{typeConfig.icon || '📦'}</span>
                                        <span style={{ fontSize: '0.8rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{typeConfig.name || typeId}</span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>${(typeConfig.base_price || 1).toFixed(1)}M/TB</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <div style={{ padding: '12px', background: 'var(--accent-cyan)11', borderRadius: '6px', marginBottom: '16px', border: '1px solid var(--accent-cyan)22' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '8px', fontWeight: 600 }}>合約詳情</div>
                    <div style={{ display: 'grid', gap: '6px', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>每季交付</span><span>{details.deliveryPerTurn} TB</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>原價</span><span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>${(details.basePrice * details.deliveryPerTurn).toFixed(1)}M/季</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>折扣價</span><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>${details.costPerTurn.toFixed(1)}M/季</span></div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>總數據</span><span style={{ color: 'var(--accent-cyan)' }}>{details.totalDelivery} TB</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>總費用</span><span>${details.totalCost.toFixed(1)}M</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--accent-green)' }}>節省</span><span style={{ color: 'var(--accent-green)' }}>${details.savings.toFixed(1)}M</span></div>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button onClick={onClose} style={{ padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>取消</button>
                    <button onClick={handleSign} disabled={!canAfford} style={{ padding: '10px', background: canAfford ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', border: 'none', borderRadius: '6px', color: canAfford ? 'white' : 'var(--text-muted)', cursor: canAfford ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 600 }}>{canAfford ? '簽訂合約' : '現金不足'}</button>
                </div>
                {!canAfford && <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--accent-red)', textAlign: 'center' }}>需要 ${details.costPerTurn.toFixed(1)}M 支付首期款項</div>}
            </div>
        </div>
    );
}

// ============================================
// 數據卡片（始終開放）- 整合完整功能
// ============================================

function DataCard({ player, onAction, onUpgrade, isExpanded, onToggle, showUpgrades = false }) {
    const [purchaseQty, setPurchaseQty] = React.useState(100);
    const [activeTab, setActiveTab] = React.useState('overview');
    const [showContractModal, setShowContractModal] = React.useState(false);
    
    const config = window.AssetCardConfig;
    const upgrades = config?.DATA_UPGRADES || {};
    const playerUpgrades = player.asset_upgrades?.data || {};
    
    const avgLevel = Object.keys(upgrades).length > 0 
        ? Math.round(Object.values(playerUpgrades).reduce((a, b) => a + b, 0) / Object.keys(upgrades).length)
        : 0;
    
    const tier = player.mp_tier || 0;
    
    // 數據整合 - 使用 useMemo 確保數據正確同步
    const DataInt = window.DataIntegration;
    const DataEng = window.DataEngine;
    
    // 獲取統一的數據摘要（優先使用 data_state.inventory，同時檢查 data_inventory）
    const summary = React.useMemo(() => {
        // 優先使用 DataIntegration
        if (DataInt) {
            const baseSummary = DataInt.getDataSummary(player);
            // 如果 by_type 有數據，直接使用
            if (baseSummary.by_type && Object.keys(baseSummary.by_type).some(k => baseSummary.by_type[k] > 0)) {
                return baseSummary;
            }
        }
        
        // 後備：合併 data_state.inventory 和 data_inventory
        const ds = player.data_state;
        const di = player.data_inventory || {};
        
        // 合併兩個來源的數據（取較大值避免數據丟失）
        const mergedInventory = {
            legal_high_broad: Math.max(ds?.inventory?.legal_high_broad || 0, di.legal_high_broad || 0),
            legal_high_focused: Math.max(ds?.inventory?.legal_high_focused || 0, di.legal_high_focused || 0),
            legal_low: Math.max(ds?.inventory?.legal_low || 0, di.legal_low || 0),
            gray_high: Math.max(ds?.inventory?.gray_high || 0, di.gray_high || 0),
            gray_low: Math.max(ds?.inventory?.gray_low || 0, di.gray_low || 0),
            synthetic: ds?.inventory?.synthetic || 0
        };
        
        const legalTotal = mergedInventory.legal_high_broad + mergedInventory.legal_high_focused + mergedInventory.legal_low;
        const grayTotal = mergedInventory.gray_high + mergedInventory.gray_low;
        const syntheticTotal = mergedInventory.synthetic;
        const total = legalTotal + grayTotal + syntheticTotal;
        
        return {
            high_data: player.high_data || 0,
            low_data: player.low_data || 0,
            total,
            legal_total: legalTotal,
            gray_total: grayTotal,
            synthetic_total: syntheticTotal,
            by_type: mergedInventory,
            synthetic_quality: ds?.synthetic_quality || 0.5
        };
    }, [player.data_state, player.data_inventory, player.high_data, player.low_data, DataInt]);
    
    const report = DataInt ? DataInt.getDetailedReport(player) : null;
    const features = DataInt ? DataInt.getUnlockedFeatures(player) : {};
    const synthesisMethods = DataInt ? DataInt.getAvailableSynthesisMethods(player) : [];
    const processingTasks = report?.processing_tasks || [];
    
    // 數據合約相關
    const dataContracts = player.data_state?.contracts || player.data_contracts || [];
    const dataConfig = window.DataConfig || {};
    const contractConfig = dataConfig.PURCHASE_OPTIONS?.contract || {};
    const canUseContracts = tier >= (contractConfig.unlock_tier || 2);
    
    const grayWarning = report?.gray_warning || false;
    const grayRatio = report?.gray_ratio || 0;
    const decayEstimate = report?.decay_estimate || { high_decay: 0 };
    
    // 檢查路線是否禁止灰色數據
    const routeMod = dataConfig.ROUTE_MODIFIERS?.[player.route] || {};
    const grayForbidden = routeMod.gray_data_forbidden || false;
    
    // 檢查是否解鎖合成技術（synthesis Lv.1+）
    const hasSynthesis = (playerUpgrades.synthesis || 0) >= 1;

    // 檢查販賣功能解鎖（marketplace 升級等級）
    const marketplaceLevel = playerUpgrades.marketplace || 0;
    const sellableTypes = DataEng ? DataEng.getSellableDataTypes(player) : [];
    const sellConfig = dataConfig.SELL_OPTIONS || {};
    const canSellType = (typeId) => sellableTypes.includes(typeId);
    const getSellPrice = (typeId) => sellConfig.type_prices?.[typeId] || 0;
    
    // 數據價格
    const COSTS = window.GameConfig?.COSTS || {};
    const highPrice = COSTS.HIGH_DATA_UNIT_PRICE || 2;
    const lowPrice = COSTS.LOW_DATA_UNIT_PRICE || 0.5;
    
    // 空間容量檢查
    const SpaceEng = window.SpaceEngine;
    const spaceConfig = window.SpaceConfig || {};
    const dataPerUnit = spaceConfig.CAPACITY_UNITS?.data_per_unit || 100;
    const requiredUnits = purchaseQty / dataPerUnit;
    const isTier2Plus = tier >= 2;
    let capacityCheck = { canPurchase: true };
    if (isTier2Plus && SpaceEng && typeof SpaceEng.canPurchaseAsset === 'function') {
        capacityCheck = SpaceEng.canPurchaseAsset(player, requiredUnits) || { canPurchase: true };
    }
    
    // Tier 2+ 標籤頁
    const tabs = tier >= 2 ? [
        { id: 'overview', label: '總覽', icon: '📊' },
        { id: 'purchase', label: '採購', icon: '🛒' },
        { id: 'synthesis', label: '合成', icon: '🧬' },
        { id: 'cleaning', label: '清洗', icon: '🧹' }
    ] : null;
    
    return (
        <AssetCardBase
            title="數據"
            icon="📊"
            color="#ff6b6b"
            level={avgLevel}
            isExpanded={isExpanded}
            onToggle={onToggle}
            upgradeAvailable={showUpgrades && avgLevel < 3}
        >
            {/* Tier 2+ 標籤頁導航 */}
            {tabs && (
                <div style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    marginBottom: '12px',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '8px'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '4px 10px',
                                background: activeTab === tab.id ? 'var(--accent-purple)33' : 'transparent',
                                border: 'none',
                                borderRadius: '4px',
                                color: activeTab === tab.id ? 'var(--accent-purple)' : 'var(--text-muted)',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}
            
            {/* 數據概覽（始終顯示或 Tier2+ 總覽標籤） */}
            {(!tabs || activeTab === 'overview') && (
                <div style={{ marginBottom: '12px' }}>
                    {/* 總覽統計 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                        <div style={{ padding: '8px', background: 'var(--accent-green)11', borderRadius: '6px', border: '1px solid var(--accent-green)33', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)' }}>✓ 合規</div>
                            <div style={{ fontSize: '1rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                {(summary.legal_total || 0).toFixed(0)}
                            </div>
                        </div>
                        <div style={{ padding: '8px', background: grayWarning ? 'var(--accent-red)11' : 'var(--accent-yellow)11', borderRadius: '6px', border: `1px solid ${grayWarning ? 'var(--accent-red)33' : 'var(--accent-yellow)33'}`, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: grayWarning ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>⚠ 灰色</div>
                            <div style={{ fontSize: '1rem', color: grayWarning ? 'var(--accent-red)' : 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                {(summary.gray_total || 0).toFixed(0)}
                            </div>
                        </div>
                        <div style={{ padding: '8px', background: 'var(--accent-purple)11', borderRadius: '6px', border: '1px solid var(--accent-purple)33', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--accent-purple)' }}>🧬 合成</div>
                            <div style={{ fontSize: '1rem', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                {(summary.synthetic_total || 0).toFixed(0)}
                            </div>
                        </div>
                    </div>
                    
                    
                    {/* 衰減預估 (Tier 2+) */}
                    {tier >= 2 && decayEstimate.high_decay > 0 && (
                        <div style={{ 
                            padding: '6px 10px', 
                            background: 'var(--accent-yellow)11', 
                            borderRadius: '4px', 
                            marginBottom: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📉 下季預估衰減</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)' }}>
                                -{decayEstimate.high_decay || 0} TB
                            </span>
                        </div>
                    )}
                    
                    {/* 灰色數據風險警告 */}
                    {grayWarning && (
                        <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--accent-red)', 
                            marginBottom: '10px',
                            padding: '6px',
                            background: 'var(--accent-red)11',
                            borderRadius: '4px'
                        }}>
                            ⚠️ 灰色數據佔比過高 ({(grayRatio * 100).toFixed(0)}%)，監管審計風險增加
                        </div>
                    )}
                    
                    {/* 進行中任務 */}
                    {processingTasks.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>🔄 處理中</div>
                            {processingTasks.map(task => (
                                <div key={task.id} style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '2px', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{task.type === 'quality_upgrade' ? '🧹 清洗' : '📋 合規化'}</span>
                                    <span style={{ color: 'var(--accent-cyan)' }}>剩餘 {task.turns_remaining} 回合</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* 數據採購（Tier 0-1 或 Tier2+ 採購標籤） */}
            {(tier < 2 || activeTab === 'purchase') && (
                <div style={{ marginBottom: '12px' }}>
                    {/* 購買數量設定 */}
                    {tier >= 1 && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            marginBottom: '12px',
                            padding: '8px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '6px'
                        }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>單次交易量:</span>
                            <input
                                type="number"
                                value={purchaseQty}
                                onChange={(e) => setPurchaseQty(Math.max(10, parseInt(e.target.value) || 10))}
                                min={10}
                                step={10}
                                style={{
                                    width: '70px',
                                    padding: '4px 6px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.75rem'
                                }}
                            />
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TB</span>
                            {!capacityCheck.canPurchase && (
                                <span style={{ fontSize: '0.6rem', color: 'var(--accent-red)', marginLeft: 'auto' }}>
                                    🚨 空間不足
                                </span>
                            )}

                            
                        </div>
                    )}
                    
                    {/* 數據訂閱合約按鈕 (Tier 2+) */}
                    {canUseContracts && (
                        <div style={{ 
                            marginBottom: '12px', 
                            padding: '10px', 
                            background: 'var(--accent-cyan)08',
                            border: '1px solid var(--accent-cyan)22',
                            borderRadius: '6px'
                        }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '6px'
                            }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                                    📝 數據訂閱合約
                                </span>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                    7折優惠 · 4季期約
                                </span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                簽訂長期合約可享受折扣價，每季自動交付數據
                            </div>
                            {GlowButton ? (
                                <GlowButton 
                                    variant="primary" 
                                    size="small" 
                                    onClick={() => setShowContractModal(true)}
                                    style={{ width: '100%' }}
                                >
                                    📋 簽訂數據合約
                                </GlowButton>
                            ) : (
                                <button 
                                    onClick={() => setShowContractModal(true)}
                                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem' }}
                                >
                                    📋 簽訂數據合約
                                </button>
                            )}
                            {dataContracts.length > 0 && (
                                <div style={{ marginTop: '6px', fontSize: '0.6rem', color: 'var(--accent-green)' }}>
                                    ✓ 已有 {dataContracts.length} 個進行中的合約
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                        {/* 合法數據 - 購買按鈕 */}
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginBottom: '6px', fontWeight: 600 }}>
                            ✓ 合規數據（購買{marketplaceLevel > 0 ? '/販賣' : ''}）
                        </div>
                        <DataTypeRowWithAction
                            typeId="legal_high_broad"
                            icon="💎"
                            name="優質通用"
                            value={summary.by_type?.legal_high_broad || 0}
                            color="#00f5ff"
                            actionType={tier >= 1 ? 'purchase' : null}
                            actionPrice={5}
                            onAction={(typeId, actionType) => {
                                onAction('buyDataByType', { dataType: typeId, quantity: purchaseQty });
                            }}
                            disabled={player.cash < purchaseQty * 5 || !capacityCheck.canPurchase}
                            canSell={canSellType('legal_high_broad')}
                            sellPrice={getSellPrice('legal_high_broad')}
                            onSell={(typeId) => {
                                onAction('sellDataByType', { dataType: typeId, quantity: purchaseQty });
                            }}
                            sellDisabled={(summary.by_type?.legal_high_broad || 0) < purchaseQty}
                        />
                        <DataTypeRowWithAction
                            typeId="legal_high_focused"
                            icon="📊"
                            name="專業領域"
                            value={summary.by_type?.legal_high_focused || 0}
                            color="#44aaff"
                            actionType={tier >= 1 ? 'purchase' : null}
                            actionPrice={4}
                            onAction={(typeId, actionType) => {
                                onAction('buyDataByType', { dataType: typeId, quantity: purchaseQty });
                            }}
                            disabled={player.cash < purchaseQty * 4 || !capacityCheck.canPurchase}
                            canSell={canSellType('legal_high_focused')}
                            sellPrice={getSellPrice('legal_high_focused')}
                            onSell={(typeId) => {
                                onAction('sellDataByType', { dataType: typeId, quantity: purchaseQty });
                            }}
                            sellDisabled={(summary.by_type?.legal_high_focused || 0) < purchaseQty}
                        />
                        <DataTypeRowWithAction
                            typeId="legal_low"
                            icon="📁"
                            name="基礎合規"
                            value={summary.by_type?.legal_low || 0}
                            color="#88aa88"
                            actionType={tier >= 1 ? 'purchase' : null}
                            actionPrice={1}
                            onAction={(typeId, actionType) => {
                                onAction('buyDataByType', { dataType: typeId, quantity: purchaseQty });
                            }}
                            disabled={player.cash < purchaseQty * 1 || !capacityCheck.canPurchase}
                            canSell={canSellType('legal_low')}
                            sellPrice={getSellPrice('legal_low')}
                            onSell={(typeId) => {
                                onAction('sellDataByType', { dataType: typeId, quantity: purchaseQty });
                            }}
                            sellDisabled={(summary.by_type?.legal_low || 0) < purchaseQty}
                        />
                        
                        {/* 灰色數據 - 爬蟲按鈕 */}
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', marginTop: '12px', marginBottom: '6px', fontWeight: 600 }}>
                            ⚠ 灰色數據（爬蟲）
                        </div>
                        {!grayForbidden ? (
                            <>
                                <DataTypeRowWithAction
                                    typeId="gray_high"
                                    icon="🔶"
                                    name="敏感高值"
                                    value={summary.by_type?.gray_high || 0}
                                    color="#ffaa00"
                                    warning={true}
                                    actionType="scrape"
                                    scrapeRisk="high"
                                    onAction={(typeId, actionType) => {
                                        onAction('scrapeData', { dataType: typeId, intensity: 2 });
                                    }}
                                    grayForbidden={grayForbidden}
                                />
                                <DataTypeRowWithAction
                                    typeId="gray_low"
                                    icon="🕷️"
                                    name="爬蟲採集"
                                    value={summary.by_type?.gray_low || 0}
                                    color="#aa6600"
                                    warning={true}
                                    actionType="scrape"
                                    scrapeRisk="low"
                                    onAction={(typeId, actionType) => {
                                        onAction('scrapeData', { dataType: typeId, intensity: 1 });
                                    }}
                                    grayForbidden={grayForbidden}
                                />
                            </>
                        ) : (
                            <div style={{ 
                                fontSize: '0.7rem', 
                                color: 'var(--accent-red)', 
                                padding: '8px',
                                background: 'var(--accent-red)11',
                                borderRadius: '4px'
                            }}>
                                🚫 您的技術路線禁止使用灰色數據
                            </div>
                        )}
                        
                        {/* 合成數據 - 無按鈕 */}
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', marginTop: '12px', marginBottom: '6px', fontWeight: 600 }}>
                            🧬 合成數據（無法購買）
                        </div>
                        <DataTypeRowWithAction
                            typeId="synthetic"
                            icon="🧬"
                            name="合成數據"
                            value={summary.by_type?.synthetic || 0}
                            color="#aa44ff"
                            quality={summary.synthetic_quality}
                            actionType={null}
                            onAction={() => {}}
                        />
                        {tier < 2 && (
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                                Tier 3 透過技術升級，解鎖合成功能
                            </div>
                        )}
                    </div>
                    
                    {/* Tier 解鎖提示 */}
                    {tier < 1 && (
                        <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-muted)', 
                            padding: '6px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '4px'
                        }}>
                            🔒 達成 Tier 1 里程碑解鎖數據購買
                        </div>
                    )}
                    {tier === 1 && (
                        <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-muted)', 
                            padding: '6px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '4px'
                        }}>
                            🔒 達成 Tier 2 里程碑解鎖數據清洗與合成功能
                        </div>
                    )}
                </div>
            )}
            
            {/* 合成數據（Tier 2+ 合成標籤） */}
            {tier >= 2 && activeTab === 'synthesis' && (
                <div style={{ marginBottom: '12px' }}>
                    {hasSynthesis || synthesisMethods.length > 0 ? (
                        <>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                使用算力生成合成數據，品質受 MP 影響
                            </div>
                            {synthesisMethods.map(method => {
                                const m = dataConfig.SYNTHESIS_METHODS?.[method.id] || method;
                                return (
                                    <div key={method.id} style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '6px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.8rem' }}>{m.icon} {m.name}</span>
                                            {GlowButton ? (
                                                <GlowButton variant="primary" size="small" onClick={() => onAction('synthesizeData', { methodId: method.id })} disabled={player.cash < (m.costs?.cash || 0)}>
                                                    ${m.costs?.cash || 0}M
                                                </GlowButton>
                                            ) : (
                                                <button onClick={() => onAction('synthesizeData', { methodId: method.id })}>
                                                    ${m.costs?.cash || 0}M
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.description}</div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔒</div>
                            尚未研發合成技術
                            <div style={{ fontSize: '0.7rem', marginTop: '8px' }}>Tier 3 升級合成路徑解鎖</div>
                        </div>
                    )}
                </div>
            )}
            
            {/* 清洗數據（Tier 2+ 清洗標籤） */}
            {tier >= 2 && activeTab === 'cleaning' && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        將低品質或灰色數據轉化為更好的形式
                    </div>
                    {(() => {
                        const lowTotal = (summary.by_type?.legal_low || 0) + (summary.by_type?.gray_low || 0);
                        const grayTotal = (summary.by_type?.gray_high || 0) + (summary.by_type?.gray_low || 0);
                        
                        const options = [
                            { id: 'quality_upgrade', name: '數據清洗', icon: '🧹', desc: '低品質 → 高品質', available: lowTotal >= 10, need: `需 10+ 低品質（現有 ${lowTotal}）`, cost: '$5M + 1 Junior' },
                            { id: 'compliance_upgrade', name: '合規化', icon: '📋', desc: '灰色 → 合法', available: grayTotal >= 20, need: `需 20+ 灰色（現有 ${grayTotal}）`, cost: '$15M + 1 Senior' }
                        ];
                        
                        return options.map(opt => (
                            <div key={opt.id} style={{ padding: '8px', background: opt.available ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', borderRadius: '6px', marginBottom: '6px', opacity: opt.available ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.8rem' }}>{opt.icon} {opt.name}</span>
                                    {GlowButton ? (
                                        <GlowButton variant="secondary" size="small" onClick={() => onAction('startCleaning', { taskType: opt.id })} disabled={!opt.available}>
                                            開始
                                        </GlowButton>
                                    ) : (
                                        <button onClick={() => onAction('startCleaning', { taskType: opt.id })} disabled={!opt.available}>
                                            開始
                                        </button>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: opt.available ? 'var(--text-muted)' : 'var(--accent-yellow)' }}>
                                    {opt.available ? `${opt.desc} | ${opt.cost}` : opt.need}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}
            
            {/* 技術升級區 */}
            {showUpgrades && Object.keys(upgrades).length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        ⬆️ 技術升級
                    </div>
                    {Object.entries(upgrades).map(([pathId, pathConfig]) => {
                        const currentLevel = playerUpgrades[pathId] || 0;
                        const canUpgradeResult = window.AssetCardEngine?.canUpgrade(player, 'data', pathId);
                        return (
                            <UpgradePathDisplay
                                key={pathId}
                                assetType="data"
                                pathId={pathId}
                                pathConfig={pathConfig}
                                currentLevel={currentLevel}
                                maxLevel={3}
                                onUpgrade={onUpgrade}
                                canUpgrade={canUpgradeResult?.canUpgrade}
                                upgradeCost={canUpgradeResult?.cost}
                                upgradeStatus={canUpgradeResult}
                            />
                        );
                    })}
                </div>
            )}
            
            {!showUpgrades && (
                <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    🔒 Tier 3 解鎖技術升級
                </div>
            )}


            {/* 數據合約簽訂彈出視窗 */}
            {showContractModal && (
                <DataContractModal
                    player={player}
                    onAction={onAction}
                    onClose={() => setShowContractModal(false)}
                />
            )}
        </AssetCardBase>
    );
}

// ============================================
// 部門解鎖提示
// ============================================

function DepartmentUnlockHint({ unlockableDepartments, activeDepartments, onEstablish }) {
    const config = window.AssetCardConfig?.DEPARTMENTS || {};
    
    const availableToEstablish = (unlockableDepartments || []).filter(
        deptId => !(activeDepartments || []).includes(deptId)
    );
    
    if (availableToEstablish.length === 0 && (!activeDepartments || activeDepartments.length === 0)) {
        return null;
    }
    
    return (
        <div style={{
            padding: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            marginBottom: '8px'
        }}>
            {activeDepartments && activeDepartments.length > 0 && (
                <div style={{ marginBottom: availableToEstablish.length > 0 ? '12px' : 0 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        🏢 已成立部門
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {activeDepartments.map(deptId => {
                            const dept = config[deptId];
                            if (!dept) return null;
                            return (
                                <div key={deptId} style={{
                                    padding: '6px 10px',
                                    background: 'var(--accent-green)22',
                                    border: '1px solid var(--accent-green)44',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem'
                                }}>
                                    <span>{dept.icon}</span>
                                    <span>{dept.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {availableToEstablish.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                        ✨ 可成立新部門
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {availableToEstablish.map(deptId => {
                            const dept = config[deptId];
                            if (!dept) return null;
                            return (
                                <button key={deptId} onClick={() => onEstablish(deptId)} style={{
                                    padding: '6px 12px',
                                    background: 'var(--accent-cyan)22',
                                    border: '1px solid var(--accent-cyan)',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem',
                                    color: 'var(--accent-cyan)',
                                    cursor: 'pointer'
                                }}>
                                    <span>{dept.icon}</span>
                                    <span>成立 {dept.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// 主要資產卡片面板
// ============================================

function AssetCardsPanel({ player, onAction, globalParams, derived }) {
    const [expandedCards, setExpandedCards] = React.useState({
        space: false,
        power: false,
        compute: true,
        talent: false,
        data: false
    });
    
    const unlockableDepartments = React.useMemo(() => {
        if (!window.AssetCardConfig) return [];
        return window.AssetCardConfig.getUnlockableDepartments(player.asset_upgrades);
    }, [player.asset_upgrades]);
    
    const generalistPenalty = React.useMemo(() => {
        if (!window.AssetCardConfig) return null;
        return window.AssetCardConfig.checkGeneralistPenalty(player.asset_upgrades);
    }, [player.asset_upgrades]);
    
    const toggleCard = (cardId) => {
        setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
    };
    
    const handleUpgrade = (assetType, pathId) => {
        onAction('upgradeAsset', { assetType, pathId });
    };
    
    const tier = player.mp_tier || 0;
    const isTier2 = tier >= 2;
    const isTier3 = tier >= 3;
    
    // 合併 globalParams
    const effectiveGlobalParams = globalParams || player.globalParams || {};
    
    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            {/* 全面發展懲罰警告 */}
            {generalistPenalty?.active && (
                <div style={{
                    padding: '12px',
                    background: 'var(--accent-yellow)11',
                    border: '1px solid var(--accent-yellow)44',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--accent-yellow)'
                }}>
                    ⚠️ {generalistPenalty.penalty.description}（收益 ×{generalistPenalty.penalty.revenue_mult}）
                </div>
            )}
            
            {/* 可解鎖部門提示 */}
            <DepartmentUnlockHint 
                unlockableDepartments={unlockableDepartments} 
                activeDepartments={player.functional_depts || player.departments || []}
                onEstablish={(deptId) => onAction('establishDepartment', { departmentId: deptId })}
            />
            {/* 職能部門提示已移至商品面板的 OrganizationPanel */}
            
            {/* 排序：空間 → 電力 → 算力 → 人力 → 數據 */}
            
            {/* 空間卡片：Tier 2+ 開放 */}
            {isTier2 ? (
                <SpaceCard 
                    player={player}
                    onAction={onAction}
                    onUpgrade={handleUpgrade}
                    isExpanded={expandedCards.space}
                    onToggle={() => toggleCard('space')}
                    showUpgrades={isTier3}
                />
            ) : (
                <LockedAssetCard title="空間" icon="🏢" color="#aa44ff" unlockTier={2} currentTier={tier} />
            )}
            
            {/* 電力卡片：Tier 2+ 開放 */}
            {isTier2 ? (
                <PowerCard 
                    player={player}
                    onAction={onAction}
                    onUpgrade={handleUpgrade}
                    isExpanded={expandedCards.power}
                    onToggle={() => toggleCard('power')}
                    showUpgrades={isTier3}
                />
            ) : (
                <LockedAssetCard title="電力" icon="⚡" color="#ffd000" unlockTier={2} currentTier={tier} />
            )}
            
            {/* 算力卡片：始終開放 */}
            <ComputeCard 
                player={player}
                onAction={onAction}
                onUpgrade={handleUpgrade}
                isExpanded={expandedCards.compute}
                onToggle={() => toggleCard('compute')}
                showUpgrades={isTier3}
                globalParams={effectiveGlobalParams}
                derived={derived}
            />
            
            {/* 人力卡片：始終開放 */}
            <TalentCard 
                player={player}
                onAction={onAction}
                onUpgrade={handleUpgrade}
                isExpanded={expandedCards.talent}
                onToggle={() => toggleCard('talent')}
                showUpgrades={isTier3}
                derived={derived}
            />
            
            {/* 數據卡片：始終開放 */}
            <DataCard 
                player={player}
                onAction={onAction}
                onUpgrade={handleUpgrade}
                isExpanded={expandedCards.data}
                onToggle={() => toggleCard('data')}
                showUpgrades={isTier3}
            />
        </div>
    );
}

// ============================================
// 導出組件
// ============================================

window.AssetCardComponents = {
    AssetCardBase,
    LockedAssetCard,
    StatRow,
    UpgradePathDisplay,
    SpaceCard,
    PowerCard,
    ComputeCard,
    TalentCard,
    DataCard,
    DataTypeRow,
    DataTypeRowWithAction,
    DataContractModal,
    DepartmentUnlockHint,
    AssetCardsPanel
};

window.AssetCardsPanel = AssetCardsPanel;

console.log('Asset Card UI components loaded');