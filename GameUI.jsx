// ============================================
// 奇點競速 - 遊戲專業 UI 組件
// ============================================

// 引入工具函數
// 假設 utils.js 及其導出 (formatNumber, getStatusColor, getDoomColor) 位於同目錄或可解析的路徑
// 假設 React 和 useState 是從 React 庫或 CDN 引入的

/**
 * 電力合約面板（Tier2）
 */
function PowerContractPanel({ player, onSwitchContract, disabled }) {
    const [expanded, setExpanded] = React.useState(false);
    const config = window.ENERGY_CONFIG || {};
    const EnergyEng = window.EnergyPriceEngine || {};
    
    // 取得能源價格摘要
    const summary = EnergyEng.getEnergyPriceSummary ? 
        EnergyEng.getEnergyPriceSummary(player, {}, player.turn_count || 0) : null;
    
    if (!summary || summary.mode !== 'single') {
        return null;  // Tier2 前或資料錯誤
    }
    
    const contract = summary.contract;
    const totalPflops = (player.pflops || 0) + (player.cloud_pflops || 0);
    const usageRatio = contract.capacity_total > 0 ? 
        (contract.capacity_used / contract.capacity_total) : 0;
    
    // 健康狀態顏色
    const healthColor = usageRatio > 0.9 ? '#ff4444' :  // 紅：接近上限
                        usageRatio > 0.7 ? '#ffaa00' :  // 黃：警告
                        '#00ff88';                      // 綠：正常
    
    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(20,20,40,0.9), rgba(30,30,60,0.9))',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(100,100,255,0.3)',
            marginTop: '12px'
        }}>
            {/* 摺疊標題 */}
            <div 
                onClick={() => setExpanded(!expanded)}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    marginBottom: expanded ? '12px' : '0'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚡</span>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#00f5ff' }}>
                        電力合約
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!expanded && (
                        <span style={{ fontSize: '0.9rem', color: '#888' }}>
                            {contract.name} · ${summary.total_cost.toFixed(0)}M/季
                        </span>
                    )}
                    <span style={{ color: '#888' }}>{expanded ? '▲' : '▼'}</span>
                </div>
            </div>
            
            {/* 展開內容 */}
            {expanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 合約資訊 */}
                    <div>
                        <div style={{ 
                            fontSize: '0.8rem', 
                            color: '#888', 
                            marginBottom: '4px' 
                        }}>
                            當前合約
                        </div>
                        <div style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: 600, 
                            color: '#00f5ff' 
                        }}>
                            {contract.name}
                        </div>
                    </div>
                    
                    {/* 電費 */}
                    <div>
                        <div style={{ 
                            fontSize: '0.8rem', 
                            color: '#888', 
                            marginBottom: '4px' 
                        }}>
                            💰 電費
                        </div>
                        <div style={{ 
                            fontSize: '1.3rem', 
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: '#00ff88'
                        }}>
                            ${summary.total_cost.toFixed(1)}M/季
                        </div>
                    </div>
                    
                    {/* 供電使用量 */}
                    <div>
                        <div style={{ 
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.8rem',
                            color: '#888',
                            marginBottom: '4px'
                        }}>
                            <span>⚡ 供電</span>
                            <span>
                                {contract.capacity_used.toFixed(0)} / {contract.capacity_total} PF
                            </span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#222',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: (usageRatio * 100) + '%',
                                height: '100%',
                                background: healthColor,
                                transition: 'width 0.3s, background 0.3s'
                            }} />
                        </div>
                        {contract.remaining_capacity < 20 && (
                            <div style={{ 
                                fontSize: '0.75rem',
                                color: '#ffaa00',
                                marginTop: '4px'
                            }}>
                                ⚠️ 剩餘容量不足 {contract.remaining_capacity.toFixed(0)} PF
                            </div>
                        )}
                    </div>
                    
                    {/* 合約期限 */}
                    {player.energy_settings?.contract_remaining > 0 && (
                        <div>
                            <div style={{ 
                                fontSize: '0.8rem', 
                                color: '#888', 
                                marginBottom: '4px' 
                            }}>
                                📅 合約期限
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#fff' }}>
                                剩餘 {player.energy_settings.contract_remaining} 季
                            </div>
                        </div>
                    )}
                    
                    {/* 操作按鈕 */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '8px',
                        marginTop: '8px'
                    }}>
                        <button
                            onClick={() => onSwitchContract && onSwitchContract()}
                            disabled={disabled}
                            style={{
                                flex: 1,
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #00f5ff, #0088ff)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#000',
                                fontWeight: 600,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                opacity: disabled ? 0.5 : 1
                            }}
                        >
                            更換合約
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * 合約切換對話框
 */
function ContractSelectionDialog({ player, onConfirm, onCancel }) {
    const [selectedContract, setSelectedContract] = React.useState(null);
    const EnergyEng = window.EnergyPriceEngine || {};
    
    // 取得可用合約
    const availableContracts = EnergyEng.getAvailablePowerContracts ? 
        EnergyEng.getAvailablePowerContracts(player.tier || 1) : [];
    
    const currentContractId = player.energy_settings?.power_contract || 'grid_default';
    
    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                border: '2px solid #00f5ff',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'auto'
            }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#00f5ff' }}>
                    選擇電力合約
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {availableContracts.map(contract => {
                        const isCurrent = contract.id === currentContractId;
                        const isSelected = selectedContract === contract.id;
                        
                        return (
                            <div
                                key={contract.id}
                                onClick={() => setSelectedContract(contract.id)}
                                style={{
                                    padding: '16px',
                                    background: isSelected ? 'rgba(0,245,255,0.2)' : 
                                               isCurrent ? 'rgba(0,255,136,0.1)' : 
                                               'rgba(255,255,255,0.05)',
                                    border: isSelected ? '2px solid #00f5ff' :
                                           isCurrent ? '2px solid #00ff88' :
                                           '1px solid #444',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    marginBottom: '8px'
                                }}>
                                    <span style={{ 
                                        fontSize: '1.1rem', 
                                        fontWeight: 600,
                                        color: '#fff'
                                    }}>
                                        {contract.display_name || contract.name}
                                        {isCurrent && ' (當前)'}
                                    </span>
                                </div>
                                
                                <div style={{ 
                                    fontSize: '0.85rem',
                                    color: '#aaa',
                                    marginBottom: '8px'
                                }}>
                                    {contract.description}
                                </div>
                                
                                <div style={{ 
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '8px',
                                    fontSize: '0.8rem'
                                }}>
                                    <div>
                                        💰 ${contract.price_per_pflops.toFixed(2)}/PF/季
                                    </div>
                                    <div>
                                        ⚡ 上限 {contract.capacity} PF
                                    </div>
                                    <div>
                                        📅 {contract.contract_term > 0 ? 
                                            `${contract.contract_term}季合約` : 
                                            '無期限'}
                                    </div>
                                    <div>
                                        💵 簽約金 ${contract.upfront_cost}M
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    gap: '12px',
                    marginTop: '16px'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#444',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        取消
                    </button>
                    <button
                        onClick={() => selectedContract && onConfirm(selectedContract)}
                        disabled={!selectedContract}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: selectedContract ? 
                                'linear-gradient(135deg, #00f5ff, #0088ff)' : 
                                '#333',
                            border: 'none',
                            borderRadius: '6px',
                            color: selectedContract ? '#000' : '#666',
                            fontWeight: 600,
                            cursor: selectedContract ? 'pointer' : 'not-allowed'
                        }}
                    >
                        確認切換
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// 商品系統相關組件
// ============================================

/**
 * 商品開發面板
 * @param {Object} props - 組件屬性
 * @param {Object} props.player - 玩家狀態
 * @param {Object} props.derived - 派生狀態
 * @param {Function} props.onAction - 動作回調
 * @param {Function} props.onOpenCatalog - 開啟目錄回調
 */
function ProductDevelopmentPanel({ player, derived, onAction, onOpenCatalog }) {
    const [showCatalog, setShowCatalog] = React.useState(false);
    const isLocked = player.mp_tier < 1;
    const productState = player.product_state;
    const masteryLevel = productState?.mastery_level || 0;
    const masteryInfo = GameConfig.MASTERY_LEVELS[masteryLevel];
    const nextLevel = GameConfig.MASTERY_LEVELS[masteryLevel + 1];

    if (isLocked) {
        return (
            <Panel title="商品開發" icon="📦" color="var(--text-muted)">
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.5 }}>🔒</div>
                    <p>完成 Tier 1 里程碑後解鎖商品開發系統</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                        當前 MP: {player.model_power.toFixed(1)} / 需要: 25
                    </p>
                </div>
            </Panel>
        );
    }

    const fulfillmentPct = (derived.product_fulfillment || 1) * 100;
    const fulfillmentColor = fulfillmentPct < 50 ? 'var(--accent-red)' : 
                             fulfillmentPct < 80 ? 'var(--accent-yellow)' : 'var(--accent-green)';

    return (
        <Panel title="商品開發" icon="📦" color="var(--accent-cyan)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>專精度</div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--accent-magenta)' }}>{masteryInfo?.name || "入門"}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>開發中</div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--accent-yellow)' }}>{productState?.developing?.length || 0}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>已完成</div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--accent-green)' }}>{productState?.completed?.length || 0}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>商品收益</div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>${(productState?.product_revenue || 0).toFixed(1)}M</div>
                </div>
            </div>

            {nextLevel && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                            專精度經驗 (MP+{((masteryInfo?.mp_bonus || 0) * 100).toFixed(0)}%)
                        </span>
                        <span style={{ color: 'var(--accent-magenta)' }}>
                            {productState?.mastery_exp || 0} / {nextLevel.exp_required}
                        </span>
                    </div>
                    <ProgressBar value={productState?.mastery_exp || 0} max={nextLevel.exp_required} color="var(--accent-magenta)" height={6} showLabel={false} />
                </div>
            )}

            <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>服務滿足率 {fulfillmentPct < 80 && '⚠️'}</span>
                    <span style={{ color: fulfillmentColor }}>{fulfillmentPct.toFixed(0)}%</span>
                </div>
                <ProgressBar value={Math.min(fulfillmentPct, 100)} max={100} color={fulfillmentColor} height={6} showLabel={false} />
                {fulfillmentPct < 80 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginTop: '4px' }}>滿足率過低將導致社群流失！</div>
                )}
            </div>

            {productState?.developing?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>開發中 ({productState.developing.length})</div>
                    {productState.developing.map((dev) => (
                        <div key={dev.id} style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{dev.name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{dev.progress.toFixed(0)}%</span>
                            </div>
                            <ProgressBar value={dev.progress} max={100} color="var(--accent-cyan)" height={4} showLabel={false} />
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <GlowButton variant="primary" onClick={() => setShowCatalog(true)} icon="📋">開啟商品目錄</GlowButton>
            </div>

            <ProductCatalogModal 
                isOpen={showCatalog}
                onClose={() => setShowCatalog(false)}
                player={player}
                onStartDev={(productId) => {
                    onAction('startProductDev', { productId });
                    setShowCatalog(false);
                }}
                onAssignSenior={(productId, count) => {
                    onAction('assignSenior', { productId, count });
                }}
                onUnlockProduct={(productId) => {
                    onAction('unlockWithTuring', { productId });
                }}
            />
        </Panel>
    );
}



/**
 * 商品目錄彈窗
 * @param {Object} props - 組件屬性
 * @param {boolean} props.isOpen - 是否開啟
 * @param {Function} props.onClose - 關閉回調
 * @param {Object} props.player - 玩家狀態
 * @param {Function} props.onStartDev - 開始開發回調
 */


/**
 * Doom 量表組件
 * @param {Object} props - 組件屬性
 * @param {string} props.name - Doom 類型名稱
 * @param {number} props.value - Doom 值
 * @param {number} props.consecutive - 連續次數
 */

/**
 * 算力分配視覺化組件
 * @param {Object} props - 組件屬性
 * @param {Object} props.derived - 派生狀態
 * @param {Object} props.player - 玩家狀態（用於計算鎖定算力）
 */
function ComputeAllocationDisplay({ derived, player }) {
    // 計算各類鎖定/無法使用的算力
    const lockedPflops = player?.locked_pflops || 0;
    const rentedPflops = (player?.rented_pflops_contracts || [])
        .reduce((sum, c) => sum + (c.amount || 0), 0);
    const absPledged = (player?.abs_loans || [])
        .reduce((sum, loan) => sum + (loan.pledged_pflops || 0), 0);
    const unavailablePflops = lockedPflops + rentedPflops + absPledged;
    
    // 總算力儲備（自有 + 雲端）
    const totalReserve = (player?.pflops || 0) + (player?.cloud_pflops || 0);
    // 可用算力 = 總儲備 - 無法使用
    const totalAvailable = Math.max(0, totalReserve - unavailablePflops);
    
    // 用於顯示的總量包含無法使用的部分
    const displayTotal = totalReserve || 1;
    
    // 計算各項百分比（基於總儲備）
    const unavailablePct = (unavailablePflops / displayTotal * 100) || 0;
    const productPct = ((derived.productPflops || 0) / displayTotal * 100) || 0;
    const trainingPct = ((derived.trainingPflops || 0) / displayTotal * 100) || 0;
    const inferencePct = ((derived.inferencePflops || 0) / displayTotal * 100) || 0;
    
    // 閒置算力 = 可用算力 - 已分配
    const usedPflops = (derived.productPflops || 0) + (derived.trainingPflops || 0) + (derived.inferencePflops || 0);
    const idlePflops = Math.max(0, totalAvailable - usedPflops);
    const idlePct = (idlePflops / displayTotal * 100) || 0;

    return (
        <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                算力分配 (總計: {totalReserve.toFixed(1)} PFLOPS, 可用: {totalAvailable.toFixed(1)})
            </div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                {/* 無法使用的算力（鎖定+出租+抵押） */}
                {unavailablePct > 0 && (
                    <div style={{ width: unavailablePct + '%', background: '#555555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#aaa', fontWeight: 600 }}>
                        {unavailablePct > 10 ? '🔒' : ''}
                    </div>
                )}
                {/* 商品開發 */}
                <div style={{ width: productPct + '%', background: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#000', fontWeight: 600 }}>
                    {productPct > 15 ? '📦' : ''}
                </div>
                {/* 模型訓練（MP研發） */}
                <div style={{ width: trainingPct + '%', background: 'var(--accent-magenta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>
                    {trainingPct > 15 ? '🔬' : ''}
                </div>
                {/* 用戶推論（社群） */}
                <div style={{ width: inferencePct + '%', background: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#000', fontWeight: 600 }}>
                    {inferencePct > 15 ? '👥' : ''}
                </div>
                {/* 閒置算力 */}
                {idlePct > 0 && (
                    <div style={{ width: idlePct + '%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {idlePct > 15 ? '💤' : ''}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px', fontSize: '0.7rem' }}>
                {unavailablePflops > 0 && (
                    <span style={{ color: '#888' }}>🔒 鎖定 {unavailablePflops.toFixed(1)}</span>
                )}
                <span style={{ color: 'var(--accent-yellow)' }}>📦 商品開發</span>
                <span style={{ color: 'var(--accent-magenta)' }}>🔬 模型訓練</span>
                <span style={{ color: 'var(--accent-cyan)' }}>👥 用戶推論</span>
                {idlePflops > 0.1 && (
                    <span style={{ color: 'var(--text-muted)' }}>💤 閒置 {idlePflops.toFixed(1)}</span>
                )}
            </div>
        </div>
    );
}

/**
 * 統計數值組件
 * @param {Object} props - 組件屬性
 * @param {string} props.label - 標籤
 * @param {number|string} props.value - 數值
 * @param {string} props.icon - 圖示
 * @param {string} props.color - 顏色
 * @param {number} props.trend - 趨勢值
 * @param {string} props.suffix - 後綴
 * @param {string} props.prefix - 前綴
 */



function StatValue({ label, value, icon, color = 'var(--accent-cyan)', trend = null, suffix = '', prefix = '' }) {
    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    };

    const labelStyle = {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    };

    const valueStyle = {
        fontSize: '1.5rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        color: color,
        textShadow: `0 0 20px ${color}44`,
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px'
    };

    const trendStyle = {
        fontSize: '0.8rem',
        color: trend > 0 ? 'var(--accent-green)' : trend < 0 ? 'var(--accent-red)' : 'var(--text-muted)',
        marginLeft: '8px'
    };

    return (
        <div style={containerStyle}>
            <div style={labelStyle}>
                {icon && <span>{icon}</span>}
                {label}
            </div>
            <div style={valueStyle}>
                <span style={{ fontSize: '1rem', opacity: 0.7 }}>{prefix}</span>
                {typeof value === 'number' ? formatNumber(value) : value}
                <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{suffix}</span>
                {trend !== null && <span style={trendStyle}>{trend > 0 ? '▲' : trend < 0 ? '▼' : '–'}</span>}
            </div>
        </div>
    );
}





// ============================================
// 遊戲 UI 組件集合
// ============================================

const GameUI = {
    ProductDevelopmentPanel,
    ProductCatalogModal,
    ComputeAllocationDisplay,
    StatValue,
    TIER_UNLOCK_CONFIG,
    PowerContractPanel,        // ← 新增
    ContractSelectionDialog,   // ← 新增
    ProductComponents: {
        ProductDevelopmentPanel,
        ProductCatalogModal
    }


};

window.GameUI = GameUI;  // ← 新增全域掛載
console.log('Game UI components loaded');

// 只有在 ui_products.jsx 尚未載入時才設定 ProductComponents
// 優先使用 ui_products.jsx 的新版組件
if (!window.ProductComponents) {
    window.ProductComponents = GameUI.ProductComponents;
    console.log('GameUI: Using legacy ProductComponents');
} else {
    console.log('GameUI: Using ui_products.jsx ProductComponents (preferred)');
}


