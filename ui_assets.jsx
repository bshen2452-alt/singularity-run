// ============================================
// 奇點競速 - 資產面板 UI 組件
// 純介面層：僅負責視覺呈現，不包含業務邏輯
// ============================================

// ============================================
// 輔助組件
// ============================================

function AssetStatValue({ label, value, icon, color = 'var(--accent-cyan)', suffix = '', prefix = '' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                {icon && <span>{icon}</span>}{label}
            </div>
            <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: color }}>
                {prefix}{typeof value === 'number' ? value.toFixed(1) : value}{suffix}
            </div>
        </div>
    );
}

function AssetCard({ title, icon, color, children, compact = false }) {
    return (
        <div style={{ 
            padding: compact ? '10px' : '12px', 
            background: `${color}11`, 
            borderRadius: '8px', 
            border: `1px solid ${color}33`,
            height: '100%'
        }}>
            <h4 style={{ 
                color: color, 
                fontSize: '0.85rem', 
                marginBottom: compact ? '6px' : '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span>{icon}</span> {title}
            </h4>
            {children}
        </div>
    );
}

// ============================================
// 算力並排卡片 (自有 + 雲端)
// ============================================

function ComputeCardsRow({ player, globalParams, derived, quantity, setQuantity, onAction }) {
    const P_GPU = (window.GameConfig?.COSTS?.PFLOPS_UNIT_PRICE || 1) * (globalParams?.P_GPU || 1);
    const currentRentedOut = player.rented_pflops_contracts ? 
        player.rented_pflops_contracts.reduce((sum, c) => sum + c.amount, 0) : 0;
    
     // 空間容量檢查 - Tier2+才需要檢查
    const SpaceEng = window.SpaceEngine;
    const isTier2Plus = (player.mp_tier || 0) >= 2;
    let capacityCheck = { canPurchase: true };
    if (isTier2Plus && SpaceEng && typeof SpaceEng.canPurchaseAsset === 'function') {
        capacityCheck = SpaceEng.canPurchaseAsset(player, quantity) || { canPurchase: true };
    }
        const canBuyPflops = capacityCheck.canPurchase && player.cash >= quantity * P_GPU;
    
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {/* 自有算力卡片 */}
            <AssetCard title="自有算力" icon="🖥️" color="var(--accent-cyan)" compact>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>擁有: {player.pflops.toFixed(1)} PF</span>
                    <span style={{ color: 'var(--text-muted)' }}>鎖定: {(player.locked_pflops || 0).toFixed(1)}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    一次性購買 · 價格: ${P_GPU.toFixed(1)}M/PF
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <GlowButton 
                        variant="primary" 
                        size="small" 
                        onClick={() => onAction('buyPflops',  { quantity: quantity })} 
                        disabled={!canBuyPflops}
                        style={{ flex: 1 }}
                    >
                        +{quantity} PF
                    </GlowButton>
                    <GlowButton 
                        variant="danger" 
                        size="small" 
                        onClick={() => onAction('sellPflops',  { quantity: quantity })} 
                        disabled={player.pflops - (derived?.total_locked_pflops || 0) - currentRentedOut < quantity}
                        style={{ flex: 1 }}
                    >
                        出售
                    </GlowButton>
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
            </AssetCard>
            
            {/* 雲端算力卡片 */}
            <AssetCard title="雲端算力" icon="☁️" color="var(--accent-yellow)" compact>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--accent-yellow)' }}>租用中: {player.cloud_pflops.toFixed(1)} PF</span>
                    <span style={{ color: 'var(--accent-red)' }}>${(player.cloud_pflops * 3 * (globalParams?.E_Price || 1)).toFixed(1)}M/季</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    每季扣款 · 成本: ${(3 * (globalParams?.E_Price || 1)).toFixed(1)}M/PF/季
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <GlowButton 
                        variant="warning" 
                        size="small" 
                        onClick={() => onAction('rentCloud',  { quantity: quantity })}
                        style={{ flex: 1 }}
                    >
                        +{quantity} PF
                    </GlowButton>
                    <GlowButton 
                        variant="success" 
                        size="small" 
                        onClick={() => onAction('cancelCloud',  { quantity: quantity })} 
                        disabled={player.cloud_pflops < quantity}
                        style={{ flex: 1 }}
                    >
                        解約
                    </GlowButton>
                </div>
            </AssetCard>
        </div>
    );
}

// ============================================
// 出租算力區塊
// ============================================

function ComputeRentalSection({ player, onAction }) {
    const [rentOutQty, setRentOutQty] = React.useState(5);
    const [rentOutTurns, setRentOutTurns] = React.useState(4);
    
    const currentRentedOut = player.rented_pflops_contracts ? 
        player.rented_pflops_contracts.reduce((sum, c) => sum + c.amount, 0) : 0;
    const availableToRent = Math.max(0, player.pflops - (player.locked_pflops || 0) - currentRentedOut);
    
    return (
        <AssetCard title="出租自有算力" icon="📤" color="var(--accent-green)">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                可出租閒置算力: <span style={{ color: 'var(--accent-green)' }}>{availableToRent.toFixed(1)} PF</span> · 租金: $5M/PF/季
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div style={{ flex: '1', minWidth: '80px' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>出租數量</label>
                    <input 
                        type="number" 
                        value={rentOutQty} 
                        onChange={(e) => setRentOutQty(parseFloat(e.target.value) || 0)} 
                        min={0.1} 
                        max={availableToRent} 
                        step={0.1}
                        style={{ width: '100%', padding: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} 
                    />
                </div>
                <div style={{ flex: '1', minWidth: '80px' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>合約季數</label>
                    <input 
                        type="number" 
                        value={rentOutTurns} 
                        onChange={(e) => setRentOutTurns(parseInt(e.target.value) || 1)} 
                        min={1} 
                        max={8}
                        style={{ width: '100%', padding: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} 
                    />
                </div>
                <GlowButton 
                    variant="success" 
                    size="small" 
                    onClick={() => onAction('rentOutPflops', { quantity: rentOutQty, turns: rentOutTurns })} 
                    disabled={rentOutQty > availableToRent || rentOutQty <= 0}
                >
                    出租 (+${(rentOutQty * 5).toFixed(1)}M/季)
                </GlowButton>
            </div>
            {player.rented_pflops_contracts && player.rented_pflops_contracts.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>當前出租合約:</div>
                    {player.rented_pflops_contracts.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{c.amount.toFixed(1)} PF</span>
                            <span>剩餘 {c.return_turn - player.turn_count} 季</span>
                            <span style={{ color: 'var(--accent-green)' }}>+${(c.amount * 5).toFixed(1)}M/季</span>
                        </div>
                    ))}
                </div>
            )}
        </AssetCard>
    );
}

// ============================================
// 人才管理卡片 (聘用/解聘並排)
// ============================================

function TalentManagementCards({ player, derived, onAction }) {
    const [fireType, setFireType] = React.useState('junior');
    const [hireQty, setHireQty] = React.useState({ turing: 1, senior: 1, junior: 5 });
    const [fireQty, setFireQty] = React.useState(1);
    const [showInfo, setShowInfo] = React.useState(null);
    
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
    
    // 空間容量檢查 - Tier2+才需要檢查
    const SpaceEng = window.SpaceEngine;
    const isTier2Plus = (player.mp_tier || 0) >= 2;
    let capacityCheck = { canPurchase: true };
    if (isTier2Plus && SpaceEng && typeof SpaceEng.canPurchaseAsset === 'function') {
        capacityCheck = SpaceEng.canPurchaseAsset(player, 0.1) || { canPurchase: true };
    }
    
    const talentLabels = {
        turing: { icon: '🧠', name: 'Turing', color: 'var(--accent-magenta)' },
        senior: { icon: '👨‍💻', name: 'Senior', color: 'var(--accent-cyan)' },
        junior: { icon: '👷', name: 'Junior', color: 'var(--accent-green)' }
    };
    
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {/* 聘用卡片 */}
            <AssetCard title="人才聘用" icon="👥" color="var(--accent-cyan)" compact>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Turing: {player.talent?.turing || 0} | Senior: {player.talent?.senior || 0} | Junior: {player.talent?.junior || 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    人事成本: ${(derived?.hr_cost || 0).toFixed(1)}M/季
                </div>
                
                {/* 三種員工橫向排列 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {Object.entries(talentLabels).map(([type, info]) => (
                        <div key={type} style={{ textAlign: 'center', position: 'relative' }}>
                            <div 
                                style={{ fontSize: '1rem', marginBottom: '2px', cursor: 'pointer' }}
                                onClick={() => setShowInfo(showInfo === type ? null : type)}
                                title="點擊查看詳情"
                            >
                                {info.icon}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: info.color, marginBottom: '4px' }}>{info.name}</div>
                            <GlowButton 
                                variant={type === 'turing' ? 'secondary' : type === 'senior' ? 'primary' : 'success'}
                                size="small"
                                onClick={() => onAction('hireTalent', { type, quantity: 1 })}
                                disabled={player.cash < talentCosts[type] || !capacityCheck.canPurchase}
                                style={{ width: '100%', fontSize: '0.7rem', padding: '4px 6px' }}
                            >
                                +1 (${talentCosts[type]}M)
                            </GlowButton>
                        </div>
                    ))}
                </div>
                
                {/* 員工介紹彈出框 */}
                {showInfo && (
                    <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        background: 'var(--bg-tertiary)', 
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
            </AssetCard>
            
            {/* 解聘卡片 */}
            <AssetCard title="解聘員工" icon="⚠️" color="var(--accent-red)" compact>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    解聘 Turing/Senior 將觸發 4 季忠誠度懲罰
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '70px' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>類型</label>
                        <select 
                            value={fireType} 
                            onChange={(e) => setFireType(e.target.value)}
                            style={{ width: '100%', padding: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.75rem' }}
                        >
                            <option value="junior">Junior ({player.talent?.junior || 0})</option>
                            <option value="senior">Senior ({player.talent?.senior || 0})</option>
                            <option value="turing">Turing ({player.talent?.turing || 0})</option>
                        </select>
                    </div>
                    <div style={{ width: '50px' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>人數</label>
                        <input 
                            type="number" 
                            value={fireQty} 
                            onChange={(e) => setFireQty(parseInt(e.target.value) || 1)} 
                            min={1} 
                            max={player.talent?.[fireType] || 0}
                            style={{ width: '100%', padding: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }} 
                        />
                    </div>
                    <GlowButton 
                        variant="danger" 
                        size="small" 
                        onClick={() => onAction('fireTalent', { type: fireType, quantity: fireQty })} 
                        disabled={(player.talent?.[fireType] || 0) < fireQty}
                    >
                        解聘
                    </GlowButton>
                </div>
            </AssetCard>
        </div>
    );
}

// ============================================
// 數據資源區塊（依 Tier 顯示不同介面）
// ============================================

function DataPurchaseSection({ player, quantity, setQuantity, onAction }) {
    const tier = player.mp_tier || 0;
    
    // Tier 0: 基礎顯示 + 爬蟲
    if (tier < 1) {
        return <DataDisplayBasic player={player} onAction={onAction} />;
    }
    
    // Tier 1: 採購與爬蟲
    if (tier < 2) {
        return (
            <DataPurchaseTier1 
                player={player}
                quantity={quantity}
                setQuantity={setQuantity}
                onAction={onAction}
            />
        );
    }
    
    // Tier 2+: 完整管理
    return (
        <DataManagementTier2 
            player={player}
            quantity={quantity}
            setQuantity={setQuantity}
            onAction={onAction}
        />
    );
}

// Tier 0: 基礎數據顯示 + 爬蟲
function DataDisplayBasic({ player, onAction }) {
    const tier = player.mp_tier || 0;
    
    // 檢查路線是否禁止灰色數據
    const config = window.DataConfig || {};
    const routeMod = config.ROUTE_MODIFIERS?.[player.route] || {};
    const grayForbidden = routeMod.gray_data_forbidden || false;
    
    return (
        <AssetCard title="數據資源" icon="💾" color="var(--accent-purple)">
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', marginBottom: '10px' }}>
                <div>
                    <span style={{ color: 'var(--text-muted)' }}>高品質: </span>
                    <span style={{ color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)' }}>
                        {(player.high_data || 0).toFixed(0)}
                    </span>
                </div>
                <div>
                    <span style={{ color: 'var(--text-muted)' }}>低品質: </span>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {(player.low_data || 0).toFixed(0)}
                    </span>
                </div>
            </div>
            
            {/* 灰色爬蟲（Tier 0 可用低調/積極） */}
            {!grayForbidden && (
                <div style={{ 
                    padding: '8px', 
                    background: 'var(--accent-yellow)08', 
                    borderRadius: '6px',
                    border: '1px solid var(--accent-yellow)22',
                    marginBottom: '10px'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginBottom: '6px' }}>
                        🕷️ 網路爬蟲（免費但有風險）
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        爬取公開網站數據，可快速累積資源但會增加監管風險。
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <GlowButton 
                            variant="secondary" 
                            size="small" 
                            onClick={() => onAction('scrapeData', { intensity: 1 })}
                            style={{ flex: 1 }}
                        >
                            低調
                        </GlowButton>
                        <GlowButton 
                            variant="secondary" 
                            size="small" 
                            onClick={() => onAction('scrapeData', { intensity: 2 })}
                            style={{ flex: 1 }}
                        >
                            積極
                        </GlowButton>
                        <GlowButton 
                            variant="danger" 
                            size="small" 
                            onClick={() => onAction('scrapeData', { intensity: 3 })}
                            disabled={tier < 1}
                            style={{ flex: 1, opacity: tier < 1 ? 0.5 : 1 }}
                            title={tier < 1 ? 'Tier 1 解鎖' : ''}
                        >
                            🔒 瘋狂
                        </GlowButton>
                    </div>
                </div>
            )}
            
            {grayForbidden && (
                <div style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--accent-red)', 
                    padding: '6px',
                    background: 'var(--accent-red)11',
                    borderRadius: '4px',
                    marginBottom: '10px'
                }}>
                    🚫 您的技術路線禁止使用灰色數據
                </div>
            )}
            
            <div style={{ 
                fontSize: '0.7rem', 
                color: 'var(--text-muted)', 
                padding: '6px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px'
            }}>
                🔒 達成 Tier 1 里程碑解鎖數據購買與進階管理
            </div>
        </AssetCard>
    );
}

// Tier 1: 數據採購與爬蟲
function DataPurchaseTier1({ player, quantity, setQuantity, onAction }) {
    const DataInt = window.DataIntegration;
    const COSTS = window.GameConfig?.COSTS || {};
    
    // 取得數據摘要
    const summary = DataInt ? DataInt.getDataSummary(player) : {
        high_data: player.high_data || 0,
        low_data: player.low_data || 0,
        total: (player.high_data || 0) + (player.low_data || 0),
        legal_total: (player.high_data || 0) + (player.low_data || 0),
        gray_total: 0
    };
    
    const report = DataInt ? DataInt.getDetailedReport(player) : null;
    const grayWarning = report?.gray_warning || false;
    const grayRatio = report?.gray_ratio || 0;
    const decayEstimate = report?.decay_estimate || { high_decay: 0 };

    // 空間容量檢查
    const SpaceEng = window.SpaceEngine;
    const spaceConfig = window.SpaceConfig || {};
    const dataPerUnit = spaceConfig.CAPACITY_UNITS?.data_per_unit || 100;
    const requiredUnits = quantity / dataPerUnit;
    const isTier2Plus = (player.mp_tier || 0) >= 2;
    let capacityCheck = { canPurchase: true };
    if (isTier2Plus && SpaceEng && typeof SpaceEng.canPurchaseAsset === 'function') {
        capacityCheck = SpaceEng.canPurchaseAsset(player, requiredUnits) || { canPurchase: true };
    }

    const highPrice = COSTS.HIGH_DATA_UNIT_PRICE || 2;
    const lowPrice = COSTS.LOW_DATA_UNIT_PRICE || 0.5;

    return (
        <AssetCard title="數據資源" icon="💾" color="var(--accent-purple)">
            {/* 數據概覽 */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '8px', 
                marginBottom: '12px',
                padding: '8px',
                background: 'var(--bg-tertiary)',
                borderRadius: '6px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>合規數據</div>
                    <div style={{ fontSize: '1rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                        {summary.legal_total?.toFixed(0) || 0}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>灰色數據</div>
                    <div style={{ fontSize: '1rem', color: grayWarning ? 'var(--accent-red)' : 'var(--accent-yellow)', fontFamily: 'var(--font-mono)' }}>
                        {summary.gray_total?.toFixed(0) || 0}
                        {grayWarning && <span style={{ fontSize: '0.7rem' }}> ⚠️</span>}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>總量</div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {summary.total?.toFixed(0) || 0}
                    </div>
                </div>
            </div>

            {/* 衰減警告 */}
            {decayEstimate.high_decay > 0 && (
                <div style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--accent-yellow)', 
                    marginBottom: '10px',
                    padding: '6px',
                    background: 'var(--accent-yellow)11',
                    borderRadius: '4px'
                }}>
                    📉 預計下季約 {decayEstimate.high_decay} 單位高品質數據將過時降級
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

            {/* 購買區域 */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    📦 第三方購買
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ width: '70px' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                            數量
                        </label>
                        <input 
                            type="number" 
                            value={quantity} 
                            onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)} 
                            min={1}
                            style={{ 
                                width: '100%', 
                                padding: '6px', 
                                background: 'var(--bg-tertiary)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '4px', 
                                color: 'var(--text-primary)', 
                                fontFamily: 'var(--font-mono)', 
                                fontSize: '0.85rem' 
                            }} 
                        />
                    </div>
                    <GlowButton 
                        variant="warning" 
                        size="small" 
                        onClick={() => onAction('buyDataByType', { dataType: 'legal_high_broad', quantity })}
                        disabled={player.cash < quantity * highPrice || !capacityCheck.canPurchase}
                    >
                        高品質 (${highPrice}M)
                    </GlowButton>
                    <GlowButton 
                        variant="primary" 
                        size="small" 
                        onClick={() => onAction('buyDataByType', { dataType: 'legal_low', quantity })}
                        disabled={player.cash < quantity * lowPrice || !capacityCheck.canPurchase}
                    >
                        低品質 (${lowPrice}M)
                    </GlowButton>
                </div>
            </div>

            {/* 灰色爬蟲區域 */}
            <div style={{ 
                padding: '8px', 
                background: 'var(--accent-yellow)08', 
                borderRadius: '6px',
                border: '1px solid var(--accent-yellow)22'
            }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginBottom: '6px' }}>
                    🕷️ 網路爬蟲（免費但有風險）
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    大量取得灰色數據。強度越高，數量越多但被發現機率也越高。
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <GlowButton 
                        variant="secondary" 
                        size="small" 
                        onClick={() => onAction('scrapeData', { intensity: 1 })}
                        style={{ flex: 1 }}
                    >
                        低調
                    </GlowButton>
                    <GlowButton 
                        variant="secondary" 
                        size="small" 
                        onClick={() => onAction('scrapeData', { intensity: 2 })}
                        style={{ flex: 1 }}
                    >
                        積極
                    </GlowButton>
                    <GlowButton 
                        variant="danger" 
                        size="small" 
                        onClick={() => onAction('scrapeData', { intensity: 3 })}
                        style={{ flex: 1 }}
                    >
                        瘋狂
                    </GlowButton>
                </div>
            </div>

            {!capacityCheck.canPurchase && (
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-red)', marginTop: '8px' }}>
                    🚨 {capacityCheck.reason}
                </div>
            )}

            {/* Tier 2 預告 */}
            <div style={{ 
                fontSize: '0.7rem', 
                color: 'var(--text-muted)', 
                marginTop: '10px',
                padding: '6px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                textAlign: 'center'
            }}>
                🔒 達成 Tier 2 里程碑解鎖數據清洗功能
            </div>
        </AssetCard>
    );
}

// Tier 2+: 完整數據管理（標籤頁介面）
function DataManagementTier2({ player, quantity, setQuantity, onAction }) {
    const [activeTab, setActiveTab] = React.useState('overview');
    const DataInt = window.DataIntegration;
    const COSTS = window.GameConfig?.COSTS || {};
    
    const summary = DataInt ? DataInt.getDataSummary(player) : null;
    const report = DataInt ? DataInt.getDetailedReport(player) : null;
    const features = DataInt ? DataInt.getUnlockedFeatures(player) : {};
    const synthesisMethods = DataInt ? DataInt.getAvailableSynthesisMethods(player) : [];
    const processingTasks = report?.processing_tasks || [];
    const contracts = report?.contracts || [];

    const tabs = [
        { id: 'overview', label: '總覽', icon: '📊' },
        { id: 'purchase', label: '採購', icon: '🛒' },
        { id: 'synthesis', label: '合成', icon: '🧬' },
        { id: 'cleaning', label: '清洗', icon: '🧹' }
    ];

    return (
        <div style={{ 
            padding: '12px', 
            background: 'var(--accent-purple)11', 
            borderRadius: '8px', 
            border: '1px solid var(--accent-purple)33'
        }}>
            {/* 標題列 */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '10px'
            }}>
                <h4 style={{ 
                    color: 'var(--accent-purple)', 
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: 0
                }}>
                    <span>💾</span> 數據管理中心
                </h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    總量: {summary?.total?.toFixed(0) || 0} TB
                </span>
            </div>

            {/* 標籤頁 */}
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

            {/* 總覽標籤 */}
            {activeTab === 'overview' && (
                <DataOverviewTab summary={summary} report={report} processingTasks={processingTasks} contracts={contracts} />
            )}

            {/* 採購標籤 */}
            {activeTab === 'purchase' && (
                <DataPurchaseTab player={player} quantity={quantity} setQuantity={setQuantity} onAction={onAction} features={features} />
            )}

            {/* 合成標籤 */}
            {activeTab === 'synthesis' && (
                <DataSynthesisTab player={player} methods={synthesisMethods} onAction={onAction} />
            )}

            {/* 清洗標籤 */}
            {activeTab === 'cleaning' && (
                <DataCleaningTab player={player} summary={summary} processingTasks={processingTasks} onAction={onAction} />
            )}
        </div>
    );
}

// 總覽標籤內容
function DataOverviewTab({ summary, report, processingTasks, contracts }) {
    const grayWarning = report?.gray_warning || false;
    const grayRatio = report?.gray_ratio || 0;
    const decayEstimate = report?.decay_estimate || {};

    return (
        <div>
            {/* 總覽統計 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                <div style={{ padding: '8px', background: 'var(--accent-green)11', borderRadius: '6px', border: '1px solid var(--accent-green)33', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)' }}>✓ 合規</div>
                    <div style={{ fontSize: '1rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {(summary?.legal_total || 0).toFixed(0)}
                    </div>
                </div>
                <div style={{ padding: '8px', background: grayWarning ? 'var(--accent-red)11' : 'var(--accent-yellow)11', borderRadius: '6px', border: `1px solid ${grayWarning ? 'var(--accent-red)33' : 'var(--accent-yellow)33'}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: grayWarning ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>⚠ 灰色</div>
                    <div style={{ fontSize: '1rem', color: grayWarning ? 'var(--accent-red)' : 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {(summary?.gray_total || 0).toFixed(0)}
                    </div>
                </div>
                <div style={{ padding: '8px', background: 'var(--accent-purple)11', borderRadius: '6px', border: '1px solid var(--accent-purple)33', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-purple)' }}>🧬 合成</div>
                    <div style={{ fontSize: '1rem', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {(summary?.synthetic_total || 0).toFixed(0)}
                    </div>
                </div>
            </div>
            
            {/* 6種數據類型詳細顯示 */}
            <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>📦 數據庫存明細</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {/* 合規數據 */}
                    <DataTypeRowLegacy 
                        icon="💎" 
                        name="優質通用" 
                        value={summary?.by_type?.legal_high_broad || 0} 
                        color="#00f5ff"
                    />
                    <DataTypeRowLegacy 
                        icon="📊" 
                        name="專業領域" 
                        value={summary?.by_type?.legal_high_focused || 0} 
                        color="#44aaff"
                    />
                    <DataTypeRowLegacy 
                        icon="📁" 
                        name="基礎合規" 
                        value={summary?.by_type?.legal_low || 0} 
                        color="#88aa88"
                    />
                    {/* 灰色數據 */}
                    <DataTypeRowLegacy 
                        icon="🔶" 
                        name="敏感高值" 
                        value={summary?.by_type?.gray_high || 0} 
                        color="#ffaa00"
                        warning={true}
                    />
                    <DataTypeRowLegacy 
                        icon="🕷️" 
                        name="爬蟲採集" 
                        value={summary?.by_type?.gray_low || 0} 
                        color="#aa6600"
                        warning={true}
                    />
                    {/* 合成數據 */}
                    <DataTypeRowLegacy 
                        icon="🧬" 
                        name="合成數據" 
                        value={summary?.by_type?.synthetic || 0} 
                        color="#aa44ff"
                        quality={summary?.synthetic_quality}
                    />
                </div>
            </div>
            
            {/* 衰減預估 */}
            {decayEstimate.high_decay > 0 && (
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

            {/* 合約 */}
            {contracts.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>📝 訂閱合約</div>
                    {contracts.map(contract => (
                        <div key={contract.id} style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '2px', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>每季 {contract.delivery_per_turn} TB</span>
                            <span style={{ color: 'var(--text-muted)' }}>剩餘 {contract.turns_remaining} 季</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// 數據類型行顯示輔助組件（傳統模式用）
function DataTypeRowLegacy({ icon, name, value, color, warning = false, quality = null }) {
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


// 採購標籤內容
function DataPurchaseTab({ player, quantity, setQuantity, onAction, features }) {
    const COSTS = window.GameConfig?.COSTS || {};
    const highPrice = COSTS.HIGH_DATA_UNIT_PRICE || 2;
    const lowPrice = COSTS.LOW_DATA_UNIT_PRICE || 0.5;

    return (
        <div>
            {/* 現貨購買 */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>🛒 現貨購買</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ width: '60px' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>數量</label>
                        <input type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)} min={1}
                            style={{ width: '100%', padding: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                    </div>
                    <GlowButton variant="warning" size="small" onClick={() => onAction('buyDataByType', { dataType: 'legal_high_broad', quantity })} disabled={player.cash < quantity * highPrice}>
                        高品質 (${highPrice}M)
                    </GlowButton>
                    <GlowButton variant="primary" size="small" onClick={() => onAction('buyDataByType', { dataType: 'legal_low', quantity })} disabled={player.cash < quantity * lowPrice}>
                        低品質 (${lowPrice}M)
                    </GlowButton>
                </div>
            </div>

            {/* 訂閱合約 */}
            {features.contracts && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>📝 訂閱合約（7折，4季交付）</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <GlowButton variant="secondary" size="small" onClick={() => onAction('signDataContract', { dataType: 'legal_high_broad' })} disabled={player.cash < 70}>
                            高品質合約
                        </GlowButton>
                        <GlowButton variant="secondary" size="small" onClick={() => onAction('signDataContract', { dataType: 'legal_low' })} disabled={player.cash < 20}>
                            低品質合約
                        </GlowButton>
                    </div>
                </div>
            )}

            {/* 灰色爬蟲 */}
            <div style={{ padding: '8px', background: 'var(--accent-yellow)08', borderRadius: '6px', border: '1px solid var(--accent-yellow)22' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginBottom: '6px' }}>🕷️ 網路爬蟲</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '6px' }}>免費取得灰色數據，但增加監管風險</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <GlowButton variant="secondary" size="small" onClick={() => onAction('scrapeData', { intensity: 1 })} style={{ flex: 1 }}>低調</GlowButton>
                    <GlowButton variant="secondary" size="small" onClick={() => onAction('scrapeData', { intensity: 2 })} style={{ flex: 1 }}>積極</GlowButton>
                    <GlowButton variant="danger" size="small" onClick={() => onAction('scrapeData', { intensity: 3 })} style={{ flex: 1 }}>瘋狂</GlowButton>
                </div>
            </div>
        </div>
    );
}

// 合成標籤內容
function DataSynthesisTab({ player, methods, onAction }) {
    const config = window.DataConfig?.SYNTHESIS_METHODS || {};

    if (methods.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔒</div>
                尚未研發合成技術
                <div style={{ fontSize: '0.7rem', marginTop: '8px' }}>Tier 3 升級合成路徑解鎖</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                使用算力生成合成數據，品質受 MP 影響
            </div>
            {methods.map(method => {
                const m = config[method.id] || method;
                return (
                    <div key={method.id} style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem' }}>{m.icon} {m.name}</span>
                            <GlowButton variant="primary" size="small" onClick={() => onAction('synthesizeData', { methodId: method.id })} disabled={player.cash < (m.costs?.cash || 0)}>
                                ${m.costs?.cash || 0}M
                            </GlowButton>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.description}</div>
                    </div>
                );
            })}
        </div>
    );
}

// 清洗標籤內容
function DataCleaningTab({ player, summary, processingTasks, onAction }) {
    const lowTotal = (summary?.by_type?.legal_low || 0) + (summary?.by_type?.gray_low || 0);
    const grayTotal = (summary?.by_type?.gray_high || 0) + (summary?.by_type?.gray_low || 0);

    const options = [
        { id: 'quality_upgrade', name: '數據清洗', icon: '🧹', desc: '低品質 → 高品質', available: lowTotal >= 10, need: `需 10+ 低品質（現有 ${lowTotal}）`, cost: '$5M + 1 Junior' },
        { id: 'compliance_upgrade', name: '合規化', icon: '📋', desc: '灰色 → 合法', available: grayTotal >= 20, need: `需 20+ 灰色（現有 ${grayTotal}）`, cost: '$15M + 1 Senior' }
    ];

    return (
        <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                將低品質或灰色數據轉化為更好的形式
            </div>
            {options.map(opt => (
                <div key={opt.id} style={{ padding: '8px', background: opt.available ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', borderRadius: '6px', marginBottom: '6px', opacity: opt.available ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem' }}>{opt.icon} {opt.name}</span>
                        <GlowButton variant="secondary" size="small" onClick={() => onAction('startCleaning', { taskType: opt.id })} disabled={!opt.available}>
                            開始
                        </GlowButton>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: opt.available ? 'var(--text-muted)' : 'var(--accent-yellow)' }}>
                        {opt.available ? `${opt.desc} | ${opt.cost}` : opt.need}
                    </div>
                </div>
            ))}

            {processingTasks.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>🔄 進行中</div>
                    {processingTasks.map(task => (
                        <div key={task.id} style={{ padding: '4px 8px', background: 'var(--accent-cyan)11', borderRadius: '4px', marginBottom: '2px', fontSize: '0.7rem' }}>
                            {task.type === 'quality_upgrade' ? '🧹 清洗' : '📋 合規化'}: 剩餘 {task.turns_remaining} 回合
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// 空間管理面板 (Tier2+)
// ============================================

// 引用 ui_space.jsx 提供的 SpaceManagementPanel
const SpaceManagementPanel = window.SpaceManagementPanel;

// ============================================
// 主資產面板組件（整合卡片與傳統模式）
// ============================================

function AssetActionsPanel({ gameState, derived, onAction }) {
    const { player, globalParams } = gameState;
    const [quantity, setQuantity] = React.useState(10);
    const [viewMode, setViewMode] = React.useState('cards');
    
    const isTier2Plus = (player.mp_tier || 0) >= 2;
    const AssetCardsPanel = window.AssetCardsPanel;
    
    // 卡片模式
    if (viewMode === 'cards' && AssetCardsPanel) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '8px' }}>
                    <button
                        onClick={() => setViewMode('cards')}
                        style={{
                            padding: '4px 8px',
                            background: 'var(--accent-cyan)22',
                            border: '1px solid var(--accent-cyan)',
                            borderRadius: '4px',
                            color: 'var(--accent-cyan)',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                    >📊 卡片模式</button>
                    <button
                        onClick={() => setViewMode('legacy')}
                        style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                    >📋 傳統模式</button>
                </div>
                <AssetCardsPanel player={player} onAction={onAction} />
            </div>
        );
    }
    
    // 傳統模式
    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            {AssetCardsPanel && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px', gap: '8px' }}>
                    <button
                        onClick={() => setViewMode('cards')}
                        style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                    >📊 卡片模式</button>
                    <button
                        onClick={() => setViewMode('legacy')}
                        style={{
                            padding: '4px 8px',
                            background: 'var(--accent-cyan)22',
                            border: '1px solid var(--accent-cyan)',
                            borderRadius: '4px',
                            color: 'var(--accent-cyan)',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                    >📋 傳統模式</button>
                </div>
            )}
            
            {isTier2Plus && (
                <SpaceManagementPanel player={player} onAction={onAction} />
            )}
            
            <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    ⚡ 算力管理
                </div>
                <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        交易數量 (PFLOPS)
                    </label>
                    <input 
                        type="number" 
                        value={quantity} 
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)} 
                        min={1}
                        style={{ width: '120px', padding: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }} 
                    />
                </div>
                <ComputeCardsRow 
                    player={player} 
                    globalParams={globalParams} 
                    derived={derived}
                    quantity={quantity} 
                    setQuantity={setQuantity} 
                    onAction={onAction} 
                />
            </div>
            
            <ComputeRentalSection player={player} onAction={onAction} />
            
            <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    👥 人才管理
                </div>
                <TalentManagementCards player={player} derived={derived} onAction={onAction} />
            </div>
            
            <DataPurchaseSection 
                player={player} 
                quantity={quantity} 
                setQuantity={setQuantity} 
                onAction={onAction} 
            />
        </div>
    );
}

// ============================================
// 導出組件
// ============================================

window.AssetComponents = {
    AssetActionsPanel,
    AssetCard,
    AssetStatValue,
    ComputeCardsRow,
    ComputeRentalSection,
    TalentManagementCards,
    DataPurchaseSection,
    SpaceManagementPanel
};

console.log('✓ Asset UI components loaded');
