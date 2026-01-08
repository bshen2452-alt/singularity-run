// ============================================
// 策略藍圖系統 UI - Strategy Blueprint UI
// ============================================
// 功能：策略藍圖技能池的視覺化介面
// 設計：純展示層，不包含業務邏輯計算
// 更新：支援跨路線技能選擇，本路線享專精獎勵

const StrategyBlueprintUI = (function() {
    'use strict';
    
    const { useState, useMemo, useCallback } = React;
    
    // ==========================================
    // 工具函數
    // ==========================================
    
    /**
     * 格式化熟練度數值
     */
    function formatMastery(value) {
        if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return Math.floor(value).toString();
    }
    
    // ==========================================
    // 技能卡片組件
    // ==========================================
    
    function SkillCard({ skill, onActivate, disabled }) {
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        const category = config?.SKILL_CATEGORIES?.[skill.category];
        const routeSpec = config?.ROUTE_SPECIALIZATIONS?.[skill.route];
        
        // 判斷是否為本路線
        const isOwnRoute = skill.isOwnRoute;
        
        const cardStyle = {
            background: skill.isActivated 
                ? 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,255,136,0.05))'
                : skill.canActivate
                    ? isOwnRoute
                        ? 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(0,245,255,0.02))'
                        : 'linear-gradient(135deg, rgba(255,153,68,0.08), rgba(255,153,68,0.02))'
                    : 'rgba(30,30,40,0.6)',
            border: `1px solid ${skill.isActivated ? '#00ff88' : skill.canActivate ? (isOwnRoute ? '#00f5ff44' : '#ff994444') : '#333'}`,
            borderRadius: '8px',
            padding: '12px',
            cursor: skill.canActivate && !disabled ? 'pointer' : 'default',
            opacity: skill.isActivated ? 1 : skill.canActivate ? 1 : 0.6,
            transition: 'all 0.2s ease',
            position: 'relative'
        };
        
        const handleClick = () => {
            if (skill.canActivate && !disabled && onActivate) {
                onActivate(skill.id);
            }
        };
        
        return (
            <div 
                style={cardStyle}
                onClick={handleClick}
                onMouseEnter={(e) => {
                    if (skill.canActivate && !disabled) {
                        e.currentTarget.style.borderColor = isOwnRoute ? '#00f5ff' : '#ff9944';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = skill.isActivated ? '#00ff88' : (isOwnRoute ? '#00f5ff44' : '#ff994444');
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                {/* 路線標籤 */}
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isOwnRoute ? 'rgba(0,255,136,0.2)' : 'rgba(255,153,68,0.2)',
                    color: isOwnRoute ? '#00ff88' : '#ff9944',
                    border: `1px solid ${isOwnRoute ? '#00ff8844' : '#ff994444'}`
                }}>
                    {routeSpec?.icon || '📋'} {isOwnRoute ? '本路線' : routeSpec?.name || skill.route}
                </div>
                
                {/* 標題行 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingRight: '70px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>{category?.icon || '📋'}</span>
                        <span style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 600, 
                            color: skill.isActivated ? '#00ff88' : '#fff'
                        }}>
                            {skill.name}
                        </span>
                    </div>
                    <div style={{ 
                        fontSize: '0.75rem', 
                        color: skill.canAfford ? '#ffd000' : '#ff6666',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        {skill.isActivated ? '✅ 已啟用' : `${skill.cost}`}
                    </div>
                </div>
                
                {/* 英文名稱 */}
                <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#666', 
                    marginBottom: '6px',
                    fontStyle: 'italic'
                }}>
                    {skill.name_en}
                </div>
                
                {/* 描述 */}
                <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    marginBottom: '8px'
                }}>
                    {skill.description}
                </div>
                
                {/* 效果預覽 */}
                <div style={{ 
                    fontSize: '0.75rem', 
                    color: isOwnRoute ? '#00f5ff' : '#ff9944',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    padding: '6px 8px'
                }}>
                    {formatEffects(skill.effects)}
                    {!isOwnRoute && (
                        <span style={{ color: '#ff6666', marginLeft: '8px' }}>
                            (效果×50%)
                        </span>
                    )}
                </div>
                
                {/* 非本路線警示 */}
                {!isOwnRoute && !skill.isActivated && (
                    <div style={{ 
                        fontSize: '0.7rem', 
                        color: '#ff9944',
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        ⚠️ 跨路線技能：效果減半，不計入專精獎勵
                    </div>
                )}
                
                {/* 無法啟用原因 */}
                {!skill.isActivated && !skill.canActivate && skill.reason && (
                    <div style={{ 
                        fontSize: '0.7rem', 
                        color: '#ff6666',
                        marginTop: '6px'
                    }}>
                        ⚠️ {skill.reason}
                    </div>
                )}
            </div>
        );
    }
    
    /**
     * 格式化效果為可讀文字
     */
    function formatEffects(effects) {
        if (!effects) return '無特殊效果';
        
        const lines = [];
        
        // 每回合效果
        if (effects.loyalty_per_turn) lines.push(`忠誠度 ${effects.loyalty_per_turn > 0 ? '+' : ''}${effects.loyalty_per_turn}/季`);
        if (effects.trust_per_turn) lines.push(`信任度 ${effects.trust_per_turn > 0 ? '+' : ''}${effects.trust_per_turn}/季`);
        if (effects.hype_per_turn) lines.push(`炒作度 ${effects.hype_per_turn > 0 ? '+' : ''}${effects.hype_per_turn}/季`);
        if (effects.regulation_per_turn) lines.push(`監管壓力 ${effects.regulation_per_turn > 0 ? '+' : ''}${effects.regulation_per_turn}/季`);
        if (effects.engagement_per_turn) lines.push(`活躍度 ${effects.engagement_per_turn > 0 ? '+' : ''}${effects.engagement_per_turn}/季`);
        if (effects.sentiment_per_turn) lines.push(`情緒 ${effects.sentiment_per_turn > 0 ? '+' : ''}${effects.sentiment_per_turn}/季`);
        if (effects.cash_per_turn) lines.push(`現金 ${effects.cash_per_turn > 0 ? '+' : ''}$${effects.cash_per_turn}M/季`);
        if (effects.mp_per_turn) lines.push(`MP ${effects.mp_per_turn > 0 ? '+' : ''}${effects.mp_per_turn}/季`);
        if (effects.entropy_per_turn) lines.push(`熵值 ${effects.entropy_per_turn > 0 ? '+' : ''}${effects.entropy_per_turn}/季`);
        if (effects.compliance_risk_per_turn) lines.push(`合規風險 ${effects.compliance_risk_per_turn > 0 ? '+' : ''}${effects.compliance_risk_per_turn}/季`);
        if (effects.alignment_per_turn) lines.push(`對齊度 ${effects.alignment_per_turn > 0 ? '+' : ''}${effects.alignment_per_turn}/季`);
        
        // 乘數效果
        if (effects.hire_cost_mult) lines.push(`招聘成本 ${Math.round((effects.hire_cost_mult - 1) * 100)}%`);
        if (effects.salary_cost_mult) lines.push(`薪資成本 ${Math.round((effects.salary_cost_mult - 1) * 100)}%`);
        if (effects.mp_growth_mult) lines.push(`MP成長 ${Math.round((effects.mp_growth_mult - 1) * 100)}%`);
        if (effects.compliance_risk_mult) lines.push(`合規風險 ${Math.round((effects.compliance_risk_mult - 1) * 100)}%`);
        if (effects.community_growth_mult) lines.push(`社群成長 +${Math.round((effects.community_growth_mult - 1) * 100)}%`);
        if (effects.regulation_penalty_mult) lines.push(`監管懲罰 ${Math.round((effects.regulation_penalty_mult - 1) * 100)}%`);
        if (effects.community_risk_reduction) lines.push(`社群風險 -${Math.round(effects.community_risk_reduction * 100)}%`);
        
        // 特殊效果
        if (effects.alignment_no_compute) lines.push('對齊研究不消耗算力');
        if (effects.alignment_per_engagement) lines.push(`每點活躍度 +${effects.alignment_per_engagement} 對齊`);
        if (effects.regulation_reduction_per_1k_community) lines.push(`每千社群 -${effects.regulation_reduction_per_1k_community} 監管`);
        if (effects.pflops_per_10k_community) lines.push(`每萬社群 +${effects.pflops_per_10k_community} PFLOPS`);
        if (effects.entropy_emergence) lines.push(`熵值>${effects.entropy_emergence.threshold} 時MP爆發`);
        if (effects.product_category_bonus) {
            const bonus = effects.product_category_bonus;
            if (bonus.revenue_mult) lines.push(`${bonus.category}產品收入 +${Math.round((bonus.revenue_mult - 1) * 100)}%`);
            if (bonus.data_gain_mult) lines.push(`${bonus.category}產品數據 +${Math.round((bonus.data_gain_mult - 1) * 100)}%`);
        }
        if (effects.loyalty_trust_penalty) {
            lines.push(`信任<${effects.loyalty_trust_penalty.trust_threshold} 時忠誠 ${effects.loyalty_trust_penalty.loyalty_penalty_per_turn}/季`);
        }
        
        return lines.length > 0 ? lines.join(' · ') : '被動效果';
    }
    
    // ==========================================
    // 類別標籤組件
    // ==========================================
    
    function CategoryTab({ category, isActive, count, onClick }) {
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        const categoryInfo = config?.SKILL_CATEGORIES?.[category];
        
        return (
            <button
                onClick={() => onClick(category)}
                style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: isActive ? `${categoryInfo?.color || '#00f5ff'}22` : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${categoryInfo?.color || '#00f5ff'}` : '2px solid transparent',
                    color: isActive ? (categoryInfo?.color || '#00f5ff') : 'var(--text-secondary)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}
            >
                <span>{categoryInfo?.icon || '📋'}</span>
                <span>{categoryInfo?.name || category}</span>
                <span style={{ 
                    fontSize: '0.7rem', 
                    background: isActive ? categoryInfo?.color : '#444',
                    color: isActive ? '#000' : '#888',
                    padding: '2px 6px',
                    borderRadius: '10px'
                }}>
                    {count}
                </span>
            </button>
        );
    }
    
    // ==========================================
    // 路線篩選標籤組件
    // ==========================================
    
    function RouteFilterTabs({ routes, activeRoute, playerRoute, onSelect }) {
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        
        return (
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '12px',
                flexWrap: 'wrap'
            }}>
                {/* 全部按鈕 */}
                <button
                    onClick={() => onSelect('all')}
                    style={{
                        padding: '6px 12px',
                        background: activeRoute === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        border: `1px solid ${activeRoute === 'all' ? '#fff' : '#444'}`,
                        borderRadius: '16px',
                        color: activeRoute === 'all' ? '#fff' : '#888',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    🌐 全部路線
                </button>
                
                {/* 本路線優先 */}
                <button
                    onClick={() => onSelect(playerRoute)}
                    style={{
                        padding: '6px 12px',
                        background: activeRoute === playerRoute ? 'rgba(0,255,136,0.2)' : 'transparent',
                        border: `1px solid ${activeRoute === playerRoute ? '#00ff88' : '#444'}`,
                        borderRadius: '16px',
                        color: activeRoute === playerRoute ? '#00ff88' : '#888',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ⭐ 本路線 (享專精獎勵)
                </button>
                
                {/* 其他路線 */}
                {routes.filter(r => r !== playerRoute).map(routeId => {
                    const routeSpec = config?.ROUTE_SPECIALIZATIONS?.[routeId];
                    return (
                        <button
                            key={routeId}
                            onClick={() => onSelect(routeId)}
                            style={{
                                padding: '6px 12px',
                                background: activeRoute === routeId ? `${routeSpec?.color || '#666'}22` : 'transparent',
                                border: `1px solid ${activeRoute === routeId ? (routeSpec?.color || '#666') : '#444'}`,
                                borderRadius: '16px',
                                color: activeRoute === routeId ? (routeSpec?.color || '#888') : '#666',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {routeSpec?.icon || '📋'} {routeSpec?.name || routeId}
                        </button>
                    );
                })}
            </div>
        );
    }
    
    // ==========================================
    // 專精進度組件
    // ==========================================
    
    function SpecializationProgress({ summary, ownRouteSkillCount }) {
        const { specializationBonuses, routeColor } = summary;
        const { all, achieved, nextThreshold } = specializationBonuses;
        
        // 使用本路線技能數計算專精進度
        const skillCount = ownRouteSkillCount !== undefined ? ownRouteSkillCount : summary.activatedCount;
        
        return (
            <div style={{ 
                background: 'rgba(0,0,0,0.3)', 
                borderRadius: '8px', 
                padding: '12px',
                marginBottom: '16px'
            }}>
                <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>🎖️ 專精進度（僅計本路線技能）</span>
                    <span style={{ color: routeColor }}>
                        {skillCount} / {all.length > 0 ? all[all.length - 1].threshold : 18} 技能
                    </span>
                </div>
                
                {/* 進度條 */}
                <div style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    marginBottom: '8px' 
                }}>
                    {all.map((bonus, idx) => {
                        const isAchieved = achieved.includes(bonus);
                        const progress = Math.min(1, skillCount / bonus.threshold);
                        
                        return (
                            <div key={idx} style={{ flex: 1 }}>
                                <div style={{
                                    height: '6px',
                                    background: '#333',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${isAchieved ? 100 : (idx === achieved.length ? progress * 100 : 0)}%`,
                                        height: '100%',
                                        background: isAchieved ? '#00ff88' : routeColor,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ 
                                    fontSize: '0.65rem', 
                                    color: isAchieved ? '#00ff88' : '#666',
                                    textAlign: 'center',
                                    marginTop: '2px'
                                }}>
                                    {bonus.threshold}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* 獎勵列表 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {all.map((bonus, idx) => {
                        const isAchieved = achieved.includes(bonus);
                        return (
                            <div 
                                key={idx}
                                style={{
                                    fontSize: '0.75rem',
                                    color: isAchieved ? '#00ff88' : '#666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>{isAchieved ? '✅' : '🔒'}</span>
                                <span style={{ color: '#888' }}>{bonus.threshold}技能:</span>
                                <span>{bonus.desc}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    
    // ==========================================
    // 藍圖 Tab 內容組件（供 ActionMenu 使用）
    // ==========================================
    
    function BlueprintTabContent({ player, onAction }) {
        const [activeCategory, setActiveCategory] = useState('internal');
        const [activeRoute, setActiveRoute] = useState('all'); // 'all', playerRoute, 或其他路線ID
        
        const engine = window.StrategyBlueprintEngine;
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        
        if (!engine || !config) {
            return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                策略藍圖系統載入中...
            </div>;
        }
        
        const summary = engine.getBlueprintSummary(player);
        if (!summary) {
            return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                策略藍圖尚未開放（需達成 Tier 2）
            </div>;
        }
        
        // 取得所有技能（所有路線）
        const availableSkills = engine.getAvailableSkills(player);
        
        // 取得所有路線ID
        const allRoutes = Object.keys(config.ROUTE_SPECIALIZATIONS);
        const playerRoute = player.route;
        
        // 計算本路線已啟用技能數（用於專精進度）
        const ownRouteSkillCount = availableSkills.filter(s => s.isOwnRoute && s.isActivated).length;
        
        // 根據選擇的路線篩選技能
        const filteredByRoute = activeRoute === 'all' 
            ? availableSkills 
            : availableSkills.filter(s => s.route === activeRoute);
        
        // 按類別分組
        const skillsByCategory = { internal: [], external: [], risk: [] };
        filteredByRoute.forEach(skill => {
            if (skillsByCategory[skill.category]) skillsByCategory[skill.category].push(skill);
        });
        
        // 對技能排序：本路線優先
        Object.keys(skillsByCategory).forEach(cat => {
            skillsByCategory[cat].sort((a, b) => {
                if (a.isOwnRoute && !b.isOwnRoute) return -1;
                if (!a.isOwnRoute && b.isOwnRoute) return 1;
                return 0;
            });
        });
        
        const categories = [
            { id: 'internal', name: '內部經營', icon: '🏢', color: '#00f5ff' },
            { id: 'external', name: '外部公關', icon: '🤝', color: '#ff00aa' },
            { id: 'risk', name: '風險管理', icon: '🛡️', color: '#ffd000' }
        ];
        
        const handleActivateSkill = (skillId) => {
            if (onAction) onAction('activateBlueprintSkill', { skillId });
        };
        
        return (
            <div>
                {/* 頂部資訊欄 */}
                <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '16px', padding: '12px 16px',
                    background: `linear-gradient(90deg, ${summary.routeColor}22, transparent)`,
                    borderRadius: '8px', border: `1px solid ${summary.routeColor}33`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{summary.routeIcon}</span>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: summary.routeColor }}>
                                {summary.routeName} 策略藍圖
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {summary.theme}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>可用熟練度</div>
                            <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffd000' }}>
                                {formatMastery(summary.availableMastery)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>已啟用</div>
                            <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#00ff88' }}>
                                {summary.activatedCount}/{summary.maxSkills}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* 專精進度（只計本路線技能） */}
                <SpecializationProgress summary={summary} ownRouteSkillCount={ownRouteSkillCount} />
                
                {/* 路線篩選標籤 */}
                <RouteFilterTabs 
                    routes={allRoutes}
                    activeRoute={activeRoute}
                    playerRoute={playerRoute}
                    onSelect={setActiveRoute}
                />
                
                {/* 類別標籤 */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
                    {categories.map(cat => {
                        const count = skillsByCategory[cat.id].filter(s => s.isActivated).length;
                        const total = skillsByCategory[cat.id].length;
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                style={{
                                    flex: 1, padding: '10px 12px',
                                    background: isActive ? `${cat.color}22` : 'transparent',
                                    border: 'none',
                                    borderBottom: isActive ? `2px solid ${cat.color}` : '2px solid transparent',
                                    color: isActive ? cat.color : 'var(--text-secondary)',
                                    fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                                <span style={{ fontSize: '0.7rem', background: isActive ? cat.color : '#444', color: isActive ? '#000' : '#888', padding: '2px 6px', borderRadius: '10px' }}>
                                    {count}/{total}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
                {/* 技能列表 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {skillsByCategory[activeCategory].map(skill => (
                        <SkillCard key={skill.id} skill={skill} onActivate={handleActivateSkill} category={categories.find(c => c.id === skill.category)} />
                    ))}
                </div>
                
                {skillsByCategory[activeCategory].length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        {activeRoute === 'all' ? '此類別尚無可用技能' : `此路線無${categories.find(c => c.id === activeCategory)?.name || ''}技能`}
                    </div>
                )}
                
                {/* 說明 */}
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.75rem', color: '#888' }}>
                    <div style={{ marginBottom: '4px', color: '#aaa' }}>💡 跨路線技能系統</div>
                    <div>• <span style={{ color: '#00ff88' }}>本路線技能</span>：效果100%，計入專精獎勵</div>
                    <div>• <span style={{ color: '#ff9944' }}>跨路線技能</span>：效果50%，不計入專精獎勵</div>
                    <div style={{ color: '#ff9944', marginTop: '4px' }}>⚠️ 啟用技能將永久消耗熟練度，無法取消</div>
                </div>
            </div>
        );
    }
    
    return { BlueprintTabContent, SkillCard, SpecializationProgress, RouteFilterTabs, formatEffects, formatMastery };
})();

window.StrategyBlueprintUI = StrategyBlueprintUI;
console.log('✓ Strategy Blueprint UI loaded');