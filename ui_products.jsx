// ============================================
// 奇點競速 - 商品開發系統 UI 組件
// 純介面層：僅負責視覺呈現，不包含業務邏輯
// ============================================

// ============================================
// 輔助組件
// ============================================

function ProductStatValue({ label, value, icon, color = 'var(--accent-cyan)', suffix = '', prefix = '' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                {icon && <span>{icon}</span>}{label}
            </div>
            <div style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: color, textShadow: `0 0 15px ${color}44` }}>
                {prefix}{typeof value === 'number' ? value.toFixed(1) : value}{suffix}
            </div>
        </div>
    );
}

function EffectTag({ icon, value, color, label }) {
    return (
        <span style={{ padding: '2px 8px', background: `${color}22`, borderRadius: '4px', fontSize: '0.7rem', color: color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {icon} {label ? `${label}: ` : ''}{value > 0 ? '+' : ''}{value}
        </span>
    );
}

// ============================================
// 算力分配橫條圖（新增）
// ============================================

function ComputeAllocationBar({ player, derived }) {
    // 從 derived 或 ComputeEngine 獲取分配數據
    const allocation = derived?.computeAllocation || {};
    const demands = allocation.demands || {};
    const allocated = allocation.allocated || {};
    const fulfillment = allocation.fulfillment || {};
    
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
    const totalAvailable = allocation.totalAvailable || Math.max(0, totalReserve - unavailablePflops);
    
    const strategyName = player.product_state?.compute_strategy || 'Balanced';
    const strategyConfig = window.ProductConfig?.COMPUTE_STRATEGIES?.[strategyName] || {};
    
    // 計算各項佔比（基於總儲備，讓鎖定算力可見）
    const displayTotal = totalReserve || 1;
    const unavailableWidth = (unavailablePflops / displayTotal) * 100;
    
    const inferenceAlloc = allocated.inference || 0;
    const trainingAlloc = allocated.training || 0;
    const productDevAlloc = allocated.productDev || 0;
    const totalAlloc = inferenceAlloc + trainingAlloc + productDevAlloc;
    
    const inferenceWidth = (inferenceAlloc / displayTotal) * 100;
    const trainingWidth = (trainingAlloc / displayTotal) * 100;
    const productDevWidth = (productDevAlloc / displayTotal) * 100;
    const unusedWidth = Math.max(0, 100 - unavailableWidth - inferenceWidth - trainingWidth - productDevWidth);
    
    // 滿足率顏色
    const getColor = (ratio) => {
        if (ratio >= 1) return 'var(--accent-green)';
        if (ratio >= 0.7) return 'var(--accent-yellow)';
        return 'var(--accent-red)';
    };

    
    return (
        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>⚡ 算力分配</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        總計 {totalReserve.toFixed(1)} | 可用 {totalAvailable.toFixed(1)} PFLOPS
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {strategyConfig.icon} {strategyConfig.name || strategyName}
                    </span>
                </div>
            </div>
            
            {/* 橫條圖 */}
            <div style={{ height: '24px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
                {/* 鎖定算力 */}
                {unavailableWidth > 0 && (
                    <div style={{ 
                        width: `${unavailableWidth}%`, 
                        height: '100%', 
                        background: '#555555',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#aaa',
                        minWidth: unavailableWidth > 5 ? 'auto' : '0',
                        overflow: 'hidden'
                    }}>
                        {unavailableWidth > 10 && '🔒'}
                    </div>
                )}
                {/* 推論服務 */}
                {inferenceWidth > 0 && (
                    <div style={{ 
                        width: `${inferenceWidth}%`, 
                        height: '100%', 
                        background: 'var(--accent-purple)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#fff',
                        minWidth: inferenceWidth > 10 ? 'auto' : '0',
                        overflow: 'hidden'
                    }}>
                        {inferenceWidth > 15 && '推論'}
                    </div>
                )}
                {/* MP研發 */}
                {trainingWidth > 0 && (
                    <div style={{ 
                        width: `${trainingWidth}%`, 
                        height: '100%', 
                        background: 'var(--accent-cyan)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#fff',
                        minWidth: trainingWidth > 10 ? 'auto' : '0',
                        overflow: 'hidden'
                    }}>
                        {trainingWidth > 15 && '研發'}
                    </div>
                )}
                {/* 商品開發 */}
                {productDevWidth > 0 && (
                    <div style={{ 
                        width: `${productDevWidth}%`, 
                        height: '100%', 
                        background: 'var(--accent-orange)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#fff',
                        minWidth: productDevWidth > 10 ? 'auto' : '0',
                        overflow: 'hidden'
                    }}>
                        {productDevWidth > 15 && '開發'}
                    </div>
                )}
                {/* 閒置 */}
                {unusedWidth > 5 && (
                    <div style={{ 
                        width: `${unusedWidth}%`, 
                        height: '100%', 
                        background: 'var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)'
                    }}>
                        {unusedWidth > 15 && '閒置'}
                    </div>
                )}
            </div>
            
            {/* 詳細數據 */}
            <div style={{ display: 'grid', gridTemplateColumns: unavailablePflops > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '8px', fontSize: '0.7rem' }}>
                {unavailablePflops > 0 && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#888', marginBottom: '2px' }}>🔒 鎖定</div>
                        <div style={{ fontFamily: 'var(--font-mono)', color: '#888' }}>
                            {unavailablePflops.toFixed(1)}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                            {lockedPflops > 0 && `合約${lockedPflops.toFixed(1)}`}
                            {rentedPflops > 0 && ` 出租${rentedPflops.toFixed(1)}`}
                            {absPledged > 0 && ` 抵押${absPledged.toFixed(1)}`}
                        </div>
                    </div>
                )}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-purple)', marginBottom: '2px' }}>🌐 商品營運</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: getColor(fulfillment.inference || 1) }}>
                        {inferenceAlloc.toFixed(1)} / {(demands.inference || 0).toFixed(1)}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>{((fulfillment.inference || 1) * 100).toFixed(0)}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-cyan)', marginBottom: '2px' }}>🔬 MP研發</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: getColor(fulfillment.training || 1) }}>
                        {trainingAlloc.toFixed(1)} / {(demands.training || 0).toFixed(1)}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>{((fulfillment.training || 1) * 100).toFixed(0)}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-orange)', marginBottom: '2px' }}>📦 產品開發</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: getColor(fulfillment.productDev || 1) }}>
                        {productDevAlloc.toFixed(1)} / {(demands.productDev || 0).toFixed(1)}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>{((fulfillment.productDev || 1) * 100).toFixed(0)}%</div>
                </div>
            </div>
            
            {/* 警告訊息 */}
            {allocation.shortage?.any && (
                <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--accent-red)11', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--accent-red)' }}>
                    ⚠️ 算力不足：
                    {allocation.shortage.inference && ' 商品營運受限'}
                    {allocation.shortage.training && ' MP研發停滯'}
                    {allocation.shortage.productDev && ' 產品開發減速'}
                </div>
            )}
        </div>
    );
}

// ============================================
// 服務滿足率顯示
// ============================================

function ServiceFulfillmentDisplay({ fulfillment, demand, supply }) {
    const pct = (fulfillment || 1) * 100;
    const color = pct >= 100 ? 'var(--accent-green)' : pct >= 80 ? 'var(--accent-cyan)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    
    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📊 服務滿足率</span>
                <span style={{ fontSize: '0.85rem', color: color, fontFamily: 'var(--font-mono)' }}>{pct.toFixed(0)}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: '4px', transition: 'width 0.5s ease-out', boxShadow: `0 0 10px ${color}66` }} />
            </div>
            {pct < 80 && <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginTop: '6px' }}>⚠️ 服務不足將導致社群流失</div>}
            {pct >= 100 && <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '6px' }}>✨ 服務充足，社群自然成長</div>}
        </div>
    );
}

// ============================================
// 專精度進度顯示（更新：支援新經驗值系統）
// ============================================

function MasteryProgressDisplay({ mastery, player }) {
    const masteryLevels = window.ProductConfig?.MASTERY_LEVELS || {};
    const currentLevel = mastery?.level || 0;
    const currentInfo = masteryLevels[currentLevel] || { name: '入門', mp_bonus: 0, milestone_bonus: 0, inference_reduction: 0, exp_required: 0 };
    const nextInfo = masteryLevels[currentLevel + 1];
    
    // 從 player.product_state 獲取實時數據
    const ps = player?.product_state;
    const experience = ps?.mastery?.experience || 0;
    
    // 計算完成的產品數量與營運中數量
    let completedCount = 0;
    let operatingCount = 0;
    if (ps?.products) {
        Object.values(ps.products).forEach(state => {
            if (state.status === 'completed' || state.status === 'operating' || state.status === 'suspended') {
                completedCount++;
            }
            if (state.status === 'operating' && state.assignedSenior > 0) {
                operatingCount++;
            }
        });
    }
    
    // 計算當前等級內的進度（支援新經驗值門檻）
    const currentThreshold = currentInfo.exp_required || 0;
    const nextThreshold = nextInfo?.exp_required || currentThreshold;
    const progressInLevel = experience - currentThreshold;
    const levelRange = nextThreshold - currentThreshold;
    const progressPct = levelRange > 0 ? Math.min(100, (progressInLevel / levelRange) * 100) : 100;
    
    // 取得經驗值配置（若有新系統則使用）
    const expConfig = window.MASTERY_EXPERIENCE_CONFIG;
    const hasNewExpSystem = !!expConfig;
    
    // 計算每回合營運經驗產出
    let perTurnExp = 0;
    if (hasNewExpSystem && ps?.products) {
        Object.values(ps.products).forEach(state => {
            if (state.status === 'operating' && state.assignedSenior > 0) {
                const tier = state.tier || 1;
                perTurnExp += expConfig.EXPERIENCE_PER_TURN_OPERATING?.[tier] || 0;
            }
        });
    }
    
    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem' }}>⭐</span>
                    <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-yellow)' }}>
                            Lv.{currentLevel} {currentInfo.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            MP +{(currentInfo.mp_bonus * 100).toFixed(0)}% | 
                            里程碑 +{currentInfo.milestone_bonus}% | 
                            產品線 -{((currentInfo.inference_reduction || 0) * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>
                {/* 經驗值顯示 */}
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                    <div>{experience} EXP</div>
                    {nextInfo && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            下一級: {nextThreshold}
                        </div>
                    )}
                </div>
            </div>
            {nextInfo && (
                <React.Fragment>
                    <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progressPct}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, var(--accent-yellow), var(--accent-orange))', 
                            borderRadius: '3px',
                            transition: 'width 0.5s ease-out'
                        }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        下一級：{nextInfo.name}（產品線營運需求 -{((nextInfo.inference_reduction || 0) * 100).toFixed(0)}%）
                    </div>
                </React.Fragment>
            )}
            {/* 專精度成長說明 */}
            <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {hasNewExpSystem ? (
                    <React.Fragment>
                        <div>💡 經驗來源：商品完成 +{expConfig.EXPERIENCE_PER_PRODUCT?.[1] || 80}~{expConfig.EXPERIENCE_PER_PRODUCT?.[4] || 250} | 每回合營運 +{expConfig.EXPERIENCE_PER_TURN_OPERATING?.[1] || 15}~{expConfig.EXPERIENCE_PER_TURN_OPERATING?.[4] || 60}/產品</div>
                        {perTurnExp > 0 && (
                            <div style={{ color: 'var(--accent-green)', marginTop: '4px' }}>
                                📈 當前每回合營運產出：+{perTurnExp} 經驗（{operatingCount} 個產品營運中）
                            </div>
                        )}
                    </React.Fragment>
                ) : (
                    `💡 專精度成長：每完成一項商品開發 +1 經驗值（目前已完成 ${completedCount} 項）`
                )}
            </div>
        </div>
    );
}


// ============================================
// 開發中商品列表（動態更新）
// ============================================

function DevelopingProductsList({ player, route }) {
    const productLines = window.ProductConfig?.PRODUCT_LINES || {};
    const routeConfig = productLines[route];
    const ps = player?.product_state;
    
    // 從 player.product_state 獲取實時開發中產品
    const developingProducts = [];
    if (ps?.products) {
        Object.entries(ps.products).forEach(([productId, state]) => {
            if (state.status === 'developing') {
                developingProducts.push({
                    productId,
                    tier: state.tier,
                    progress: state.progress || 0,
                    costRemaining: state.costRemaining
                });
            }
        });
    }
    
    if (developingProducts.length === 0) {
        return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔨 目前沒有開發中的商品</div>;
    }
    
    const getProductInfo = (productId, tier) => {
        if (!routeConfig) return null;
        const products = routeConfig[`tier${tier}`]?.products || [];
        return products.find(p => p.id === productId);
    };
    
    return (
        <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>🔨 開發中商品 ({developingProducts.length})</h4>
            {developingProducts.map(dev => {
                const product = getProductInfo(dev.productId, dev.tier);
                if (!product) return null;
                const progressPct = (dev.progress || 0) * 100;
                return (
                    <div key={dev.productId} style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--accent-cyan)22' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>{product.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{product.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tier {dev.tier} • 預計 {product.devTurns} 季度</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '1rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{progressPct.toFixed(0)}%</div>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-magenta))', borderRadius: '3px', transition: 'width 0.5s ease-out' }} />
                        </div>
                        {dev.costRemaining && <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}><span>💰 剩餘: ${dev.costRemaining.cash}M</span><span>📊 剩餘: {dev.costRemaining.data}</span></div>}
                    </div>
                );
            })}
        </div>
    );
}


// ============================================
// 已完成商品列表（動態更新）
// ============================================

function CompletedProductsDisplay({ player, route, onAssignSenior }) {
    const productLines = window.ProductConfig?.PRODUCT_LINES || {};
    const routeConfig = productLines[route];
    const ps = player?.product_state;
    
    // 計算 Senior 狀態
    const totalSeniors = player?.talent?.senior || 0;
    let assignedCount = 0;
    if (ps?.products) {
        Object.values(ps.products).forEach(state => {
            if (state.status === 'operating') {
                assignedCount += state.assignedSenior || 0;
            }
        });
    }
    const availableSeniors = Math.max(0, totalSeniors - assignedCount);
    
    // 從 player.product_state 獲取實時完成產品
    const completedProducts = [];
    if (ps?.products) {
        Object.entries(ps.products).forEach(([productId, state]) => {
            if (state.status === 'completed' || state.status === 'operating' || state.status === 'suspended') {
                completedProducts.push({
                    productId,
                    tier: state.tier,
                    status: state.status,
                    assignedSenior: state.assignedSenior || 0
                });
            }
        });
    }
    
    if (completedProducts.length === 0) return null;
    
    const getProductInfo = (productId, tier) => {
        if (!routeConfig) return null;
        return routeConfig[`tier${tier}`]?.products?.find(p => p.id === productId);
    };
    
    // Senior分配按鈕組件
    const SeniorControls = ({ productId, assignedSenior, status }) => {
        const isOperating = status === 'operating';
        const canAdd = availableSeniors > 0;
        const canRemove = assignedSenior > 0;
        
        const buttonStyle = (enabled) => ({
            width: '22px',
            height: '22px',
            border: 'none',
            borderRadius: '4px',
            cursor: enabled ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
        });
        
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                    style={{
                        ...buttonStyle(canRemove),
                        background: canRemove ? 'var(--accent-red)33' : 'var(--bg-secondary)',
                        color: canRemove ? 'var(--accent-red)' : 'var(--text-muted)',
                        opacity: canRemove ? 1 : 0.5
                    }}
                    disabled={!canRemove}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (canRemove && onAssignSenior) onAssignSenior(productId, -1);
                    }}
                    title="撤回 Senior"
                >−</button>
                <span style={{ 
                    minWidth: '20px', 
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: isOperating ? 'var(--accent-green)' : 'var(--text-muted)'
                }}>{assignedSenior}</span>
                <button
                    style={{
                        ...buttonStyle(canAdd),
                        background: canAdd ? 'var(--accent-green)33' : 'var(--bg-secondary)',
                        color: canAdd ? 'var(--accent-green)' : 'var(--text-muted)',
                        opacity: canAdd ? 1 : 0.5
                    }}
                    disabled={!canAdd}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (canAdd && onAssignSenior) onAssignSenior(productId, 1);
                    }}
                    title="派遣 Senior"
                >+</button>
            </div>
        );
    };
    
    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>✅ 已完成商品 ({completedProducts.length})</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>👨‍💻 可用: {availableSeniors}/{totalSeniors}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {completedProducts.map(comp => {
                    const product = getProductInfo(comp.productId, comp.tier);
                    if (!product) return null;
                    const statusColor = comp.status === 'operating' ? 'var(--accent-green)' : 
                                       comp.status === 'suspended' ? 'var(--accent-yellow)' : 'var(--text-muted)';
                    return (
                        <div key={comp.productId} style={{ 
                            padding: '8px 12px', 
                            background: `${statusColor}11`, 
                            border: `1px solid ${statusColor}33`, 
                            borderRadius: '6px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px' 
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>{product.icon}</span>
                            <div style={{ minWidth: '60px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{product.name}</div>
                            </div>
                            <SeniorControls 
                                productId={comp.productId}
                                assignedSenior={comp.assignedSenior}
                                status={comp.status}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}



// ============================================
// 商品目錄彈窗
// ============================================

function ProductCatalogModal({ isOpen, onClose, player, onStartDev, onAssignSenior, onUnlockProduct }) {
    if (!isOpen || !player || !player.route) {
        return <Modal isOpen={false} onClose={onClose} title="商品" size="large"></Modal>;
    }

    const route = player.route;
    // 使用 ProductConfig 而非 GameConfig
    const productLine = window.ProductConfig?.PRODUCT_LINES?.[route];
    const productState = player.product_state;

    if (!productLine) {
        return <Modal isOpen={false} onClose={onClose} title="商品" size="large"></Modal>;
    }

    const masteryInfo = GameConfig.MASTERY_LEVELS[productState?.mastery_level || 0];
    
    // 修正: 使用 tier1, tier2 等格式而非 tiers[tier]
    const availableTiers = [1, 2, 3, 4].filter(tier => productLine[`tier${tier}`]);
    
    // 檢查產品是否為里程碑產品
    const isMilestoneProduct = (product) => product.type === 'milestone' || product.id?.includes('_milestone');
    
    // 檢查里程碑是否已達成
    const isMilestoneAchieved = (tier) => player.mp_milestones?.[tier] || false;
    
    // 使用 ProductIntegration 獲取人才狀態
    const turingStatus = window.ProductIntegration?.getTuringStatus(player) || {
        total: player.talent?.turing || 0,
        usedForUnlock: productState?.turing_unlocks?.length || 0,
        available: Math.max(0, (player.talent?.turing || 0) - (productState?.turing_unlocks?.length || 0))
    };
    
    const seniorStatus = window.ProductIntegration?.getSeniorStatus(player) || {
        total: player.talent?.senior || 0,
        assignedToProducts: 0,
        available: player.talent?.senior || 0
    };
    if (!window.ProductIntegration) {
        let assigned = 0;
        if (productState?.products) {
            Object.values(productState.products).forEach(ps => {
                if (ps.assignedSenior > 0) assigned += ps.assignedSenior;
            });
        }
        seniorStatus.assignedToProducts = assigned;
        seniorStatus.available = Math.max(0, seniorStatus.total - assigned);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${productLine.name} - 商品目錄`} size="large">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{productLine.description}</p>

            {masteryInfo && (masteryInfo.mp_bonus > 0 || masteryInfo.milestone_bonus > 0) && (
                <div style={{ padding: '10px', background: 'var(--accent-magenta)11', border: '1px solid var(--accent-magenta)33', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--accent-magenta)' }}>✨ 專精度加成：</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        MP 成長 +{(masteryInfo.mp_bonus * 100).toFixed(0)}% | 里程碑成功率 +{(masteryInfo.milestone_bonus * 100).toFixed(0)}%
                    </span>
                </div>
            )}
            
            {/* 人才狀態面板 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: 'var(--accent-magenta)11', border: '1px solid var(--accent-magenta)33', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--accent-magenta)', marginBottom: '4px' }}>🧠 Turing 工程師</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>總數: {turingStatus.total}</span>
                        <span style={{ color: 'var(--text-muted)' }}>已解鎖: {turingStatus.usedForUnlock}</span>
                        <span style={{ color: turingStatus.available > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>可用: {turingStatus.available}</span>
                    </div>
                </div>
                <div style={{ padding: '10px', background: 'var(--accent-cyan)11', border: '1px solid var(--accent-cyan)33', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--accent-cyan)', marginBottom: '4px' }}>👨‍💻 Senior 工程師</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>總數: {seniorStatus.total}</span>
                        <span style={{ color: 'var(--text-muted)' }}>營運中: {seniorStatus.assignedToProducts}</span>
                        <span style={{ color: seniorStatus.available > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>可用: {seniorStatus.available}</span>
                    </div>
                </div>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {availableTiers.map(tier => {
                    const tierUnlocked = tier <= player.mp_tier;
                    // 修正: 使用 tier1.products 格式
                    const tierData = productLine[`tier${tier}`];
                    const products = tierData?.products || [];
                    const milestoneAchieved = isMilestoneAchieved(tier);
                    
                    return (
                        <div key={tier} style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '8px 12px', background: tierUnlocked ? 'var(--accent-cyan)11' : 'var(--bg-tertiary)', borderRadius: '6px', border: `1px solid ${tierUnlocked ? 'var(--accent-cyan)33' : 'var(--border-color)'}` }}>
                                <span style={{ fontSize: '1.2rem' }}>{tierUnlocked ? '🔓' : '🔒'}</span>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: tierUnlocked ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>Tier {tier}</span>
                                {milestoneAchieved && <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', padding: '2px 8px', background: 'var(--accent-green)22', borderRadius: '4px' }}>✓ 里程碑達成</span>}
                                {!tierUnlocked && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>需要達成 Tier {tier} 里程碑解鎖</span>}
                            </div>
                            <div style={{ display: 'grid', gap: '12px', opacity: tierUnlocked ? 1 : 0.5 }}>
                                {products.map(product => {
                                    if (!product) return null;
                                    const productStatus = productState?.products?.[product.id];
                                    const isMilestone = isMilestoneProduct(product);
                                    
                                    // 里程碑產品特殊處理：達成里程碑後自動視為完成
                                    const isCompleted = productStatus?.status === 'completed' || productStatus?.status === 'operating' || productStatus?.status === 'suspended' || (isMilestone && milestoneAchieved);
                                    const isDeveloping = productStatus?.status === 'developing';
                                    // 修正: 如果 productStatus 不存在或沒有狀態，需要 Turing 的產品視為 locked
                                    const isLocked = productStatus?.status === 'locked' || (!productStatus && product.requiresTuring);
                                    // 如果 productStatus 不存在且不需要 Turing，視為可以直接開發
                                    const isUnlocked = productStatus?.status === 'unlocked' || (!productStatus && !product.requiresTuring && !isMilestone);
                                    
                                    const developingProgress = productStatus?.progress || 0;
                                    // 里程碑產品不需要開發成本，添加安全檢查
                                    const devCost = product.devCost || product.cost || { cash: 0, data: 0 };
                                    const devCostCash = devCost.cash || 0;
                                    const devCostData = devCost.data || 0;
                                    const canAfford = player.cash >= (devCostCash * 0.5) && (player.high_data + player.low_data) >= devCostData;
                                    const canOperate = isMilestone ? milestoneAchieved : isCompleted;
                                    const assignedSenior = productState?.talent_assignment?.product_assignments?.[product.id] || productStatus?.assignedSenior || 0;
                                    const isOperating = assignedSenior > 0;
                                    
                                    const requiresTuring = product.requiresTuring === true;
                                    const needsTuringUnlock = requiresTuring && isLocked;
                                    const canUnlockWithTuring = needsTuringUnlock && turingStatus.available > 0;
                                    // 產品效果，添加安全檢查
                                    const effects = product.effects || {};
                                    
                                    const statusColor = isOperating ? 'var(--accent-green)' : canOperate ? 'var(--accent-cyan)' : isDeveloping ? 'var(--accent-yellow)' : needsTuringUnlock ? 'var(--accent-magenta)' : canAfford ? 'var(--accent-cyan)' : 'var(--text-muted)';

                                    return (
                                        <div key={product.id} style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid ' + statusColor + '33', borderRadius: '8px', opacity: tierUnlocked ? 1 : 0.6 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '1rem', fontWeight: 600, color: statusColor, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        {product.name}
                                                        {isMilestone && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent-magenta)22', color: 'var(--accent-magenta)', borderRadius: '4px' }}>里程碑</span>}
                                                        {needsTuringUnlock && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent-magenta)22', color: 'var(--accent-magenta)', borderRadius: '4px' }}>🔒 需 Turing</span>}
                                                        {isOperating && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent-green)22', color: 'var(--accent-green)', borderRadius: '4px' }}>營運中 ({assignedSenior}👨‍💻)</span>}
                                                        {canOperate && !isOperating && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent-yellow)22', color: 'var(--accent-yellow)', borderRadius: '4px' }}>待營運</span>}
                                                        {isDeveloping && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent-cyan)22', color: 'var(--accent-cyan)', borderRadius: '4px' }}>開發中 {(developingProgress * 100).toFixed(0)}%</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                        {isMilestone ? '達成里程碑自動解鎖' : `開發時間: ${product.devTurns || 0} 季`}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    {/* Turing 解鎖按鈕：僅當需要 Turing 解鎖時顯示 */}
                                                    {needsTuringUnlock && tierUnlocked && (
                                                        <GlowButton variant={canUnlockWithTuring ? "secondary" : "ghost"} size="small" disabled={!canUnlockWithTuring} onClick={() => onUnlockProduct && onUnlockProduct(product.id)}>
                                                            {canUnlockWithTuring ? '🔓 解鎖' : 'Turing 不足'}
                                                        </GlowButton>
                                                    )}
                                                    {/* Senior 分配按鈕：可營運時顯示 */}
                                                    {canOperate && tierUnlocked && (
                                                        <GlowButton variant={isOperating ? "success" : "warning"} size="small" disabled={!isOperating && seniorStatus.available <= 0} onClick={() => onAssignSenior && onAssignSenior(product.id, isOperating ? -1 : 1)}>
                                                            {isOperating ? '撤回 Senior' : (seniorStatus.available > 0 ? '派遣 Senior' : 'Senior 不足')}
                                                        </GlowButton>
                                                    )}
                                                    {/* 開發按鈕：非里程碑、非鎖定、非開發中、非已完成時顯示 */}
                                                    {!isMilestone && !needsTuringUnlock && !isDeveloping && !canOperate && isUnlocked && tierUnlocked && (
                                                        <GlowButton variant={canAfford ? "primary" : "ghost"} size="small" disabled={!canAfford} onClick={() => onStartDev(product.id)}>
                                                            {canAfford ? '開發' : '資源不足'}
                                                        </GlowButton>
                                                    )}
                                                </div>
                                            </div>
                                            {/* 開發成本顯示：非里程碑、非可營運、非鎖定時顯示 */}
                                            {!isMilestone && !canOperate && !needsTuringUnlock && isUnlocked && (
                                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.85rem' }}>
                                                    <span style={{ color: player.cash >= (devCost.cash * 0.5) ? 'var(--accent-green)' : 'var(--accent-red)' }}>💰 ${(devCost.cash * 0.5).toFixed(1)}M (50% 啟動)</span>
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                效果：
                                                {effects.revenue_bonus && <span style={{ marginLeft: '8px', color: 'var(--accent-green)' }}>收入 +${effects.revenue_bonus}M/季</span>}
                                                {effects.revenue_base && <span style={{ marginLeft: '8px', color: 'var(--accent-green)' }}>基礎收入 +${effects.revenue_base}M/季</span>}
                                                {effects.community && <span style={{ marginLeft: '8px', color: 'var(--accent-cyan)' }}>社群 +{effects.community}</span>}
                                                {effects.hype && <span style={{ marginLeft: '8px', color: 'var(--accent-yellow)' }}>Hype +{effects.hype}</span>}
                                                {effects.trust && <span style={{ marginLeft: '8px', color: 'var(--accent-magenta)' }}>Trust {effects.trust > 0 ? '+' : ''}{effects.trust}</span>}
                                                {effects.mp_boost && <span style={{ marginLeft: '8px', color: 'var(--accent-red)' }}>MP +{effects.mp_boost}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}


// ============================================
// Turing 解鎖面板
// ============================================

function TuringUnlockPanel({ player, onRecruit, onUnlock }) {
    const costs = window.GameConfig?.COSTS || {};
    const turingStatus = window.ProductIntegration?.getTuringStatus(player) || {
        total: player.talent?.turing || 0,
        usedForUnlock: player.product_state?.turing_unlocks?.length || 0,
        available: 0
    };
    turingStatus.available = Math.max(0, turingStatus.total - turingStatus.usedForUnlock);
    
    const getUnlockableProducts = () => {
        const ps = player.product_state;
        if (!ps || !ps.products) return [];
        return Object.entries(ps.products)
            .filter(([_, state]) => state.status === 'locked')
            .map(([productId, state]) => {
                const productInfo = window.ProductEngine?.getProductById(productId);
                return productInfo ? { id: productId, ...productInfo, tier: state.tier } : null;
            })
            .filter(Boolean);
    };
    
    const unlockableProducts = getUnlockableProducts();
    
    return (
        <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--accent-magenta)33' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '2rem' }}>🧠</span>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--accent-magenta)', fontSize: '1rem' }}>Turing 工程師</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>每位可解鎖一項進階產品</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-magenta)' }}>{turingStatus.total}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>薪資: ${costs.TURING_SALARY || 5}M/季/人</div>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-magenta)' }}>{turingStatus.total}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>總人數</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-yellow)' }}>{turingStatus.usedForUnlock}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>已用於解鎖</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: turingStatus.available > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{turingStatus.available}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>可解鎖</div>
                </div>
            </div>
            
            {unlockableProducts.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent-magenta)', marginBottom: '8px' }}>🔒 可解鎖產品：</div>
                    <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {unlockableProducts.map(product => (
                            <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1.3rem' }}>{product.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{product.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tier {product.tier}</div>
                                    </div>
                                </div>
                                <GlowButton 
                                    variant={turingStatus.available > 0 ? "secondary" : "ghost"} 
                                    size="small" 
                                    onClick={() => onUnlock && onUnlock(product.id)} 
                                    disabled={turingStatus.available <= 0}
                                >
                                    {turingStatus.available > 0 ? '🔓 解鎖' : '人數不足'}
                                </GlowButton>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div style={{ padding: '10px', background: 'var(--accent-magenta)11', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '4px', color: 'var(--accent-magenta)' }}>效果：</div>
                <div>• 每位可解鎖一項進階產品</div>
                <div>• MP 成長 +15% / 人</div>
            </div>
        </div>
    );
}


// ============================================
// Senior 工程師分配介面（修正：持續顯示按鈕）
// ============================================

function SeniorAllocationPanel({ player, onAssignToProduct, onRemoveFromProduct }) {
    const costs = window.GameConfig?.COSTS || {};
    const ps = player.product_state;
    
    // 計算 Senior 狀態
    const totalSeniors = player.talent?.senior || 0;
    let assignedCount = 0;
    
    // 計算已分配的數量
    if (ps?.products) {
        Object.values(ps.products).forEach(state => {
            if (state.status === 'operating') {
                assignedCount += state.assignedSenior || 0;
            }
        });
    }
    
    const availableSeniors = Math.max(0, totalSeniors - assignedCount);
    
    // 獲取可分配和營運中的產品
    const getProductsForSenior = () => {
        if (!ps || !ps.products) return { assignable: [], operating: [] };
        const assignable = [], operating = [];
        
        Object.entries(ps.products).forEach(([productId, state]) => {
            const productInfo = window.ProductEngine?.getProductById(productId);
            if (!productInfo) return;
            
            const item = { 
                id: productId, 
                ...productInfo, 
                tier: state.tier,
                assignedSenior: state.assignedSenior || 0,
                status: state.status
            };
            
            // 營運中的產品（可以撤回）
            if (state.status === 'operating') {
                operating.push(item);
            }
            
            // 可分配的產品：已完成、已暫停、或里程碑產品
            if (state.status === 'completed' || 
                state.status === 'suspended' || 
                (productInfo.type === 'milestone' && state.status === 'unlocked')) {
                assignable.push(item);
            }
        });
        
        return { assignable, operating };
    };
    
    const { assignable, operating } = getProductsForSenior();
    
    return (
        <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--accent-cyan)33' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '2rem' }}>👨‍💻</span>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '1rem' }}>Senior 工程師</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>每位可維護一條產品線</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{totalSeniors}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>薪資: ${costs.SENIOR_SALARY || 2}M/季/人</div>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{totalSeniors}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>總人數</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-yellow)' }}>{assignedCount}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>營運中</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: availableSeniors > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{availableSeniors}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>可分配</div>
                </div>
            </div>
            
            {/* 營運中的產品 - 可以撤回 */}
            {operating.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', marginBottom: '8px' }}>🟢 營運中（{operating.length}）：</div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {operating.map(product => (
                            <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--accent-green)11', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1.3rem' }}>{product.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{product.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            已分配 {product.assignedSenior} 位 Senior
                                        </div>
                                    </div>
                                </div>
                                <GlowButton 
                                    variant="ghost" 
                                    size="small" 
                                    onClick={() => onRemoveFromProduct && onRemoveFromProduct(product.id)}
                                >
                                    撤回
                                </GlowButton>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* 可分配的產品 */}
            {assignable.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '8px' }}>📦 可分配（{assignable.length}）：</div>
                    <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {assignable.map(product => (
                            <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1.3rem' }}>{product.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{product.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {product.status === 'suspended' ? '已暫停' : '待分配'}
                                        </div>
                                    </div>
                                </div>
                                <GlowButton 
                                    variant={availableSeniors > 0 ? "primary" : "ghost"} 
                                    size="small" 
                                    onClick={() => onAssignToProduct && onAssignToProduct(product.id)} 
                                    disabled={availableSeniors <= 0}
                                >
                                    {availableSeniors > 0 ? '指派' : '人數不足'}
                                </GlowButton>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {assignable.length === 0 && operating.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    尚無可分配的產品，請先完成產品開發
                </div>
            )}
        </div>
    );
}


// ============================================
// 里程碑產品面板
// ============================================

function MilestoneProductPanel({ player, onLaunchMilestone }) {
    const costs = window.GameConfig?.COSTS || {};
    const modelTiers = costs.MODEL_TIERS || {};
    const currentTier = player.mp_tier || 0;
    const nextTier = modelTiers[currentTier + 1];
    
    if (!nextTier) {
        return (
            <Panel title="里程碑進度" icon="🏆" color="var(--accent-magenta)">
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
                    <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>已達成最高里程碑！</div>
                </div>
            </Panel>
        );
    }
    
    const progress = (player.model_power / nextTier.mp) * 100;
    const canLaunch = player.model_power >= nextTier.mp;
    
    return (
        <Panel title="里程碑進度" icon="🏆" color="var(--accent-magenta)">
            <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tier {currentTier + 1}</span>
                    <span style={{ color: canLaunch ? 'var(--accent-green)' : 'var(--accent-magenta)', fontFamily: 'var(--font-mono)' }}>{player.model_power.toFixed(1)} / {nextTier.mp}</span>
                </div>
                <div style={{ height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, progress)}%`, height: '100%', background: canLaunch ? 'var(--accent-green)' : 'var(--accent-magenta)', borderRadius: '6px' }} />
                </div>
            </div>
            {canLaunch && <div style={{ textAlign: 'center' }}><GlowButton variant="success" onClick={() => onLaunchMilestone(currentTier + 1)}>🚀 發布里程碑</GlowButton></div>}
        </Panel>
    );
}



// ============================================
// 主商品開發面板
// ============================================

function ProductDevelopmentPanel({ player, derived, onAction }) {
    const [showCatalog, setShowCatalog] = React.useState(false);
    const [showTuringPanel, setShowTuringPanel] = React.useState(false);
    const [showSeniorPanel, setShowSeniorPanel] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('products'); // 'products' | 'organization'
    const ps = player.product_state;
    
    if (player.mp_tier < 1) {
        return (
            <Panel title="商品開發" icon="📦" color="var(--text-muted)">
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.5 }}>🔒</div>
                    <p>完成 Tier 1 里程碑後解鎖商品開發系統</p>
                </div>
            </Panel>
        );
    }
    
    // 從 player.product_state 動態計算數據
    const masteryLevels = window.ProductConfig?.MASTERY_LEVELS || {};
    const mastery = masteryLevels[ps?.mastery?.level || 0] || { name: '入門' };
    
    // 計算產品數量
    let developingCount = 0, operatingCount = 0;
    if (ps?.products) {
        Object.values(ps.products).forEach(state => {
            if (state.status === 'developing') developingCount++;
            if (state.status === 'operating') operatingCount++;
        });
    }
    
    const turingStatus = window.ProductIntegration?.getTuringStatus(player) || { total: 0, available: 0 };
    
    // 計算 Senior 狀態
    const totalSeniors = player.talent?.senior || 0;
    let assignedSeniors = 0;
    if (ps?.products) {
        Object.values(ps.products).forEach(state => {
            if (state.status === 'operating') {
                assignedSeniors += state.assignedSenior || 0;
            }
        });
    }
    const availableSeniors = Math.max(0, totalSeniors - assignedSeniors);
    
    // 檢查是否有組織架構內容可顯示
    const orgConfig = window.AssetCardConfig;
    const ProductLineEng = window.ProductLineEngine;
    const hasUnlockableDepts = orgConfig?.getUnlockableDepartments ? 
        orgConfig.getUnlockableDepartments(player.asset_upgrades).length > 0 : false;
    const hasActiveDepts = (player.functional_depts?.length || 0) > 0;
    const hasSubsidiaries = (player.functional_subsidiaries?.length || 0) > 0;
    const hasProductLines = ProductLineEng?.getProductLineSummary ? 
        ProductLineEng.getProductLineSummary(player).length > 0 : false;
    const hasOrgContent = hasUnlockableDepts || hasActiveDepts || hasSubsidiaries || hasProductLines;
    
    // 頁籤按鈕樣式
    const tabStyle = (isActive) => ({
        flex: 1,
        padding: '10px 8px',
        fontSize: '0.85rem',
        fontWeight: 600,
        background: isActive ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
        color: isActive ? '#f8f8f8' : 'var(--text-secondary)',
        border: 'none',
        borderRadius: '6px 6px 0 0',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
    });
    
    return (
        <Panel title="商品開發中心" icon="📦" color="var(--accent-purple)">
            {/* 頁籤切換 */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '2px solid var(--border-color)' }}>
                <button 
                    style={tabStyle(activeTab === 'products')}
                    onClick={() => setActiveTab('products')}
                >
                    <span>🛒</span> 商品營運
                </button>
                {hasOrgContent && (
                    <button 
                        style={tabStyle(activeTab === 'organization')}
                        onClick={() => setActiveTab('organization')}
                    >
                        <span>🏢</span> 組織架構
                    </button>
                )}
            </div>
            
            {/* 商品營運頁籤內容 */}
            {activeTab === 'products' && (
                <>
                    {/* 統計數據 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                        <ProductStatValue label="專精度" value={`Lv.${ps?.mastery?.level || 0}`} icon="⭐" color="var(--accent-yellow)" />
                        <ProductStatValue label="開發中" value={developingCount} icon="🔨" color="var(--accent-cyan)" />
                        <ProductStatValue label="營運中" value={operatingCount} icon="✅" color="var(--accent-green)" />
                        <ProductStatValue label="商品收益" value={ps?.product_revenue || 0} prefix="$" suffix="M" icon="💰" color="var(--accent-yellow)" />
                    </div>
                    
                    {/* 人才狀態快覽 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'var(--accent-magenta)11', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-magenta)' }}>🧠 Turing</div>
                            <div style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>{turingStatus.total} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>（可用 {turingStatus.available}）</span></div>
                        </div>
                        <div style={{ padding: '10px', background: 'var(--accent-cyan)11', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>💼 Senior</div>
                            <div style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>{totalSeniors} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>（可用 {availableSeniors}）</span></div>
                        </div>
                    </div>
                    
                    {/* 算力分配橫條圖 */}
                    <ComputeAllocationBar player={player} derived={derived} />
                    
                    {/* 專精度進度 */}
                    <MasteryProgressDisplay mastery={ps?.mastery} player={player} />
                    
                    {/* 服務滿足率 */}
                    <ServiceFulfillmentDisplay fulfillment={ps?.product_fulfillment || ps?.service_quality} demand={ps?.product_demand} supply={derived?.inferencePflops} />
                    
                    {/* 開發中商品列表 */}
                    <DevelopingProductsList player={player} route={player.route} />
                    
                    {/* 已完成商品列表 */}
                    <CompletedProductsDisplay player={player} route={player.route} onAssignSenior={(productId, count) => onAction('assignSenior', { productId, count })} />
                    
                    {/* 操作按鈕 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
                        <GlowButton variant="primary" size="small" onClick={() => setShowCatalog(true)}>📋 商品目錄</GlowButton>
                        <GlowButton variant="secondary" size="small" onClick={() => setShowTuringPanel(true)}>🧠 Turing</GlowButton>
                        <GlowButton variant="warning" size="small" onClick={() => setShowSeniorPanel(true)}>👨‍💻 Senior</GlowButton>
                    </div>
                </>
            )}
            
            {/* 組織架構頁籤內容 */}
            {activeTab === 'organization' && hasOrgContent && (
                <div style={{ minHeight: '200px' }}>
                    {window.OrganizationComponents?.OrganizationPanel && (
                        <window.OrganizationComponents.OrganizationPanel 
                            player={player} 
                            onAction={onAction}
                        />
                    )}
                </div>
            )}
            
            {/* 彈窗 */}
            <ProductCatalogModal 
                isOpen={showCatalog} 
                onClose={() => setShowCatalog(false)} 
                player={player} 
                onStartDev={(productId) => { onAction('startProductDev', { productId }); setShowCatalog(false); }}
                onAssignSenior={(productId, count) => { onAction('assignSenior', { productId, count }); }}
                onUnlockProduct={(productId) => { onAction('unlockWithTuring', { productId }); }}
            />
            <Modal isOpen={showTuringPanel} onClose={() => setShowTuringPanel(false)} title="Turing 工程師管理" size="medium">
                <TuringUnlockPanel 
                    player={player} 
                    onRecruit={() => { onAction('recruitTuring'); }} 
                    onUnlock={(productId) => { onAction('unlockWithTuring', { productId }); }}
                />
            </Modal>
            <Modal isOpen={showSeniorPanel} onClose={() => setShowSeniorPanel(false)} title="Senior 工程師分配" size="medium">
                <SeniorAllocationPanel 
                    player={player} 
                    onAssignToProduct={(productId) => { onAction('assignSenior', { productId, count: 1 }); }} 
                    onRemoveFromProduct={(productId) => { onAction('assignSenior', { productId, count: -1 }); }}
                />
            </Modal>
        </Panel>
    );
}

// ============================================
// 產品線升級狀態顯示
// ============================================

function ProductLineUpgradePanel({ player, onUpgrade }) {
    const [selectedLine, setSelectedLine] = React.useState(null);
    
    const ProductLineEng = window.ProductLineEngine;
    if (!ProductLineEng) {
        return null;
    }
    
    const lineSummary = ProductLineEng.getProductLineSummary(player);
    
    if (lineSummary.length === 0) {
        return null;
    }
    
    const stages = window.ProductLineUpgradeConfig?.UPGRADE_STAGES || {};
    
    return (
        <div style={{ marginTop: '16px' }}>
            <div style={{ 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                color: 'var(--accent-purple)', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span>🏢</span> 產品線管理
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lineSummary.map(line => {
                    const nextStageConfig = line.nextStage ? stages[line.nextStage.toUpperCase()] : null;
                    const progressPct = nextStageConfig ? 
                        Math.min(100, (line.experience / nextStageConfig.expRequired) * 100) : 100;
                    
                    return (
                        <div 
                            key={line.name}
                            style={{ 
                                padding: '10px 12px', 
                                background: 'var(--bg-tertiary)', 
                                borderRadius: '6px',
                                border: line.canUpgrade ? '1px solid var(--accent-green)' : '1px solid transparent'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1.1rem' }}>{line.stageIcon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {line.name}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {line.stageName} · {line.productCount} 個產品 · 最高 T{line.maxTier}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                                        {line.experience} EXP
                                    </div>
                                    {nextStageConfig && (
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            / {nextStageConfig.expRequired}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* 進度條 */}
                            {nextStageConfig && (
                                <div style={{ marginBottom: '6px' }}>
                                    <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${progressPct}%`, 
                                            height: '100%', 
                                            background: line.canUpgrade ? 
                                                'linear-gradient(90deg, var(--accent-green), var(--accent-cyan))' : 
                                                'linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))',
                                            transition: 'width 0.3s ease-out'
                                        }} />
                                    </div>
                                </div>
                            )}
                            
                            {/* 升級按鈕或狀態 */}
                            {line.nextStage && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        下一階段：{line.nextStageName}
                                        {nextStageConfig?.tierRequired > 1 && ` (需 T${nextStageConfig.tierRequired}+)`}
                                    </div>
                                    {line.canUpgrade ? (
                                        <button
                                            onClick={() => onUpgrade && onUpgrade(line.name, line.nextStage)}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '0.7rem',
                                                background: 'var(--accent-green)',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 600
                                            }}
                                        >
                                            🚀 升級
                                        </button>
                                    ) : (
                                        <div style={{ fontSize: '0.65rem', color: 'var(--accent-yellow)' }}>
                                            {line.upgradeReason}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* 最高階段顯示 */}
                            {!line.nextStage && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', textAlign: 'center' }}>
                                    ✨ 已達最高階段
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* 升級說明 */}
            <div style={{ 
                marginTop: '12px', 
                padding: '8px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '4px', 
                fontSize: '0.7rem', 
                color: 'var(--text-muted)' 
            }}>
                <div>🏢 <b>部門</b>：經驗 ≥800，Senior 離職不影響營運</div>
                <div>🏛️ <b>子公司</b>：經驗 ≥1500 + T3，免營運成本、30% 收益分紅</div>
            </div>
        </div>
    );
}


// ============================================
// 導出組件
// ============================================

window.ProductComponents = {
    ProductLineUpgradePanel,
    ProductDevelopmentPanel,
    MilestoneProductPanel,
    ProductCatalogModal,
    ServiceFulfillmentDisplay,
    MasteryProgressDisplay,
    DevelopingProductsList,
    CompletedProductsDisplay,
    TuringUnlockPanel,
    SeniorAllocationPanel,
    ProductStatValue,
    EffectTag,
    ComputeAllocationBar
};

console.log('âœ“ Product UI components loaded (with compute allocation bar)');