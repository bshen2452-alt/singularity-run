// ============================================
// 奇點競速 - 組織架構 UI 組件
// 純介面層：整合部門、事業部、子公司管理
// 包含：UISubsidiary 企業光譜與子公司詳細介面
// ============================================

// ============================================
// 子公司介面模組 (原 UISubsidiary)
// ============================================

const UISubsidiary = {
    
    // 企業光譜圖表
    renderCompanySpectrum: function(player) {
        const AssetCardEngine = window.AssetCardEngine;
        const AssetCardConfig = window.AssetCardConfig;
        if (!AssetCardEngine || !AssetCardConfig) return null;
        
        const spectrum = AssetCardEngine.getCompanySpectrum(player);
        const spectrumConfig = AssetCardConfig.COMPANY_SPECTRUM;
        const activeSubsidiaries = player.functional_subsidiaries || [];
        
        if (!spectrumConfig) return null;
        
        const toCanvasX = (x) => 100 + x * 80;
        const toCanvasY = (y) => 100 - y * 80;
        
        return React.createElement('div', {
            style: {
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px'
            }
        }, [
            React.createElement('div', {
                key: 'title',
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }
            }, [
                React.createElement('div', { 
                    key: 'h3', 
                    style: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' } 
                }, [
                    React.createElement('span', { key: 'icon' }, '🎯'),
                    '企業形象光譜'
                ]),
                spectrum.quadrantInfo && React.createElement('span', {
                    key: 'quadrant',
                    style: { background: 'var(--accent-cyan)22', padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem', color: 'var(--accent-cyan)' }
                }, spectrum.quadrantInfo.name)
            ]),
            
            React.createElement('div', {
                key: 'chart',
                style: { position: 'relative', width: '180px', height: '180px', margin: '0 auto', background: 'var(--bg-tertiary)', borderRadius: '8px' }
            }, [
                // 座標軸
                React.createElement('div', { key: 'x-axis', style: { position: 'absolute', left: '10px', right: '10px', top: '50%', height: '1px', background: 'var(--border-color)' } }),
                React.createElement('div', { key: 'y-axis', style: { position: 'absolute', top: '10px', bottom: '10px', left: '50%', width: '1px', background: 'var(--border-color)' } }),
                // 軸標籤
                React.createElement('div', { key: 'label-left', style: { position: 'absolute', left: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' } }, spectrumConfig.x_axis?.negative?.icon || '🔬'),
                React.createElement('div', { key: 'label-right', style: { position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' } }, spectrumConfig.x_axis?.positive?.icon || '💰'),
                React.createElement('div', { key: 'label-top', style: { position: 'absolute', top: '5px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' } }, spectrumConfig.y_axis?.positive?.icon || '🏭'),
                React.createElement('div', { key: 'label-bottom', style: { position: 'absolute', bottom: '5px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' } }, spectrumConfig.y_axis?.negative?.icon || '🌐'),
                
                // 子公司點位
                ...activeSubsidiaries.map((subId, idx) => {
                    const sub = AssetCardConfig.FUNCTIONAL_SUBSIDIARIES[subId];
                    if (!sub || !sub.spectrum) return null;
                    return React.createElement('div', {
                        key: `sub-${idx}`,
                        title: sub.name,
                        style: { position: 'absolute', left: `${toCanvasX(sub.spectrum.x)}px`, top: `${toCanvasY(sub.spectrum.y)}px`, transform: 'translate(-50%, -50%)', fontSize: '1rem', cursor: 'pointer' }
                    }, sub.icon);
                }),
                
                // 公司平均位置
                activeSubsidiaries.length > 0 && React.createElement('div', {
                    key: 'center',
                    style: { position: 'absolute', left: `${toCanvasX(spectrum.x)}px`, top: `${toCanvasY(spectrum.y)}px`, transform: 'translate(-50%, -50%)', width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-magenta), var(--accent-purple))', border: '2px solid var(--text-primary)', boxShadow: '0 0 8px var(--accent-magenta)' }
                })
            ]),
            
            // 象限說明
            spectrum.quadrantInfo && React.createElement('div', {
                key: 'desc',
                style: { marginTop: '12px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }
            }, [
                React.createElement('div', { key: 'd1' }, spectrum.quadrantInfo.description),
                React.createElement('div', { key: 'd2', style: { marginTop: '4px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.65rem' } }, spectrum.quadrantInfo.example)
            ])
        ]);
    },
    
    // 收益總覽面板
    renderRevenueSummary: function(player) {
        const AssetCardEngine = window.AssetCardEngine;
        if (!AssetCardEngine || !AssetCardEngine.calculateTotalDeptSubsidiaryRevenue) return null;
        
        const total = AssetCardEngine.calculateTotalDeptSubsidiaryRevenue(player);
        
        return React.createElement('div', {
            style: { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }
        }, [
            React.createElement('div', {
                key: 'title',
                style: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }
            }, [
                React.createElement('span', { key: 'icon' }, '💰'),
                '部門/子公司收益總覽'
            ]),
            
            React.createElement('div', { key: 'stats', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' } }, [
                React.createElement('div', { key: 'revenue', style: { background: 'var(--accent-green)11', borderRadius: '6px', padding: '10px', textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.65rem' } }, '總收益'),
                    React.createElement('div', { key: 'value', style: { color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1rem', fontFamily: 'var(--font-mono)' } }, `$${total.totalRevenue.toFixed(1)}M`)
                ]),
                React.createElement('div', { key: 'cost', style: { background: 'var(--accent-red)11', borderRadius: '6px', padding: '10px', textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.65rem' } }, '營運成本'),
                    React.createElement('div', { key: 'value', style: { color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '1rem', fontFamily: 'var(--font-mono)' } }, `$${total.totalCost.toFixed(1)}M`)
                ]),
                React.createElement('div', { key: 'net', style: { background: total.totalNet >= 0 ? 'var(--accent-green)11' : 'var(--accent-red)11', borderRadius: '6px', padding: '10px', textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.65rem' } }, '淨利'),
                    React.createElement('div', { key: 'value', style: { color: total.totalNet >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 'bold', fontSize: '1rem', fontFamily: 'var(--font-mono)' } }, `$${total.totalNet.toFixed(1)}M`)
                ])
            ])
        ]);
    },
    
    // 部門詳細卡片（含技術進度）
    renderDeptDetailCard: function(dept, onEstablishDept, onUpgradeToSubsidiary) {
        const isActive = dept.isActive;
        const canUnlock = dept.canUnlock;
        
        return React.createElement('div', {
            key: `dept-${dept.id}`,
            style: {
                background: isActive ? 'var(--accent-green)08' : canUnlock ? 'var(--accent-cyan)08' : 'var(--bg-tertiary)',
                border: isActive ? '1px solid var(--accent-green)33' : canUnlock ? '1px solid var(--accent-cyan)33' : '1px solid var(--border-color)',
                borderRadius: '8px', padding: '12px', marginBottom: '8px'
            }
        }, [
            // 標題行
            React.createElement('div', { key: 'header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } }, [
                React.createElement('div', { key: 'name', style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
                    React.createElement('span', { key: 'icon', style: { fontSize: '1.1rem' } }, dept.icon),
                    React.createElement('span', { key: 'text', style: { color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' } }, dept.name),
                    isActive && React.createElement('span', { key: 'badge', style: { background: 'var(--accent-green)', color: '#000', padding: '2px 6px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 600 } }, '已成立')
                ]),
                // 操作按鈕
                !isActive && canUnlock && React.createElement('button', {
                    key: 'establish-btn',
                    onClick: () => onEstablishDept && onEstablishDept(dept.id),
                    style: { background: 'var(--accent-green)', border: 'none', borderRadius: '4px', padding: '4px 10px', color: '#000', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }
                }, '成立部門'),
                isActive && dept.canUpgradeToSubsidiary && React.createElement('button', {
                    key: 'upgrade-btn',
                    onClick: () => onUpgradeToSubsidiary && onUpgradeToSubsidiary(dept.id),
                    style: { background: 'var(--accent-yellow)', border: 'none', borderRadius: '4px', padding: '4px 10px', color: '#000', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }
                }, '🚀 升級子公司')
            ]),
            
            // 描述
            React.createElement('div', { key: 'desc', style: { color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '8px' } }, dept.description),
            
            // 技術需求進度（未成立時顯示）
            !isActive && dept.techProgress && React.createElement('div', { key: 'tech-progress', style: { marginBottom: '8px' } }, [
                React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '4px' } }, '技術需求:'),
                ...dept.techProgress.map((tech, tidx) => 
                    React.createElement('div', { key: `tech-${tidx}`, style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' } }, [
                        React.createElement('span', { key: 'check', style: { color: tech.met ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '0.7rem' } }, tech.met ? '✓' : '✗'),
                        React.createElement('span', { key: 'name', style: { color: 'var(--text-secondary)', fontSize: '0.7rem' } }, tech.name),
                        React.createElement('span', { key: 'level', style: { color: tech.met ? 'var(--accent-green)' : 'var(--accent-yellow)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' } }, `Lv.${tech.current}/${tech.required}`)
                    ])
                )
            ]),
            
            // 已成立部門的熟練度與收益
            isActive && React.createElement('div', { key: 'active-info', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '8px' } }, [
                React.createElement('div', { key: 'mastery', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.6rem' } }, '熟練度'),
                    React.createElement('div', { key: 'value', style: { color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' } }, `${dept.mastery}/${dept.masteryRequired}`)
                ]),
                React.createElement('div', { key: 'revenue', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.6rem' } }, '收益'),
                    React.createElement('div', { key: 'value', style: { color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' } }, `$${dept.base_revenue}M`)
                ]),
                React.createElement('div', { key: 'cost', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.6rem' } }, '成本'),
                    React.createElement('div', { key: 'value', style: { color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' } }, `$${dept.base_operating_cost}M`)
                ])
            ]),
            
            // 熟練度進度條
            isActive && React.createElement('div', { key: 'mastery-bar', style: { marginTop: '6px' } }, [
                React.createElement('div', { key: 'bar', style: { height: '3px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' } }, [
                    React.createElement('div', { key: 'fill', style: { width: `${Math.min(100, (dept.mastery / dept.masteryRequired) * 100)}%`, height: '100%', background: dept.canUpgradeToSubsidiary ? 'var(--accent-green)' : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))', transition: 'width 0.3s' } })
                ])
            ])
        ]);
    },
    
    // 子公司詳細卡片
    renderSubsidiaryDetailCard: function(sub) {
        return React.createElement('div', {
            key: `sub-${sub.id}`,
            style: { background: 'linear-gradient(135deg, var(--accent-yellow)08, var(--accent-green)05)', border: '1px solid var(--accent-yellow)33', borderRadius: '8px', padding: '12px', marginBottom: '8px' }
        }, [
            // 標題
            React.createElement('div', { key: 'header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } }, [
                React.createElement('div', { key: 'name', style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
                    React.createElement('span', { key: 'icon', style: { fontSize: '1.2rem' } }, sub.icon),
                    React.createElement('span', { key: 'text', style: { color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' } }, sub.name)
                ]),
                sub.special_ability && React.createElement('span', { key: 'ability', style: { background: 'var(--accent-yellow)22', padding: '3px 8px', borderRadius: '8px', fontSize: '0.6rem', color: 'var(--accent-yellow)' } }, sub.special_ability)
            ]),
            
            // 描述
            React.createElement('div', { key: 'desc', style: { color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '10px' } }, sub.description),
            
            // 財務數據
            React.createElement('div', { key: 'finance', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '10px' } }, [
                React.createElement('div', { key: 'revenue', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.6rem' } }, '季度收益'),
                    React.createElement('div', { key: 'value', style: { color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1rem', fontFamily: 'var(--font-mono)' } }, `$${sub.revenue}M`)
                ]),
                React.createElement('div', { key: 'cost', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.6rem' } }, '營運成本'),
                    React.createElement('div', { key: 'value', style: { color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '1rem', fontFamily: 'var(--font-mono)' } }, `$${sub.operatingCost}M`)
                ]),
                React.createElement('div', { key: 'net', style: { textAlign: 'center' } }, [
                    React.createElement('div', { key: 'label', style: { color: 'var(--text-muted)', fontSize: '0.6rem' } }, '淨利'),
                    React.createElement('div', { key: 'value', style: { color: sub.netIncome >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 'bold', fontSize: '1rem', fontFamily: 'var(--font-mono)' } }, `$${sub.netIncome}M`)
                ])
            ])
        ]);
    }
};

// ============================================
// 子公司詳細面板（整合 UISubsidiary）
// ============================================

function SubsidiaryDetailPanel({ player, onEstablishDept, onUpgradeToSubsidiary }) {
    const AssetCardEngine = window.AssetCardEngine;
    if (!AssetCardEngine) return null;
    
    const allDepts = AssetCardEngine.getAllDeptStatus ? AssetCardEngine.getAllDeptStatus(player) : [];
    const subsidiaries = AssetCardEngine.getSubsidiarySummary ? AssetCardEngine.getSubsidiarySummary(player) : [];
    const activeSubsidiaries = player.functional_subsidiaries || [];
    
    return React.createElement('div', null, [
        // 企業光譜（有子公司時顯示）
        activeSubsidiaries.length > 0 && React.createElement('div', { key: 'spectrum' }, UISubsidiary.renderCompanySpectrum(player)),
        
        // 收益總覽
        (allDepts.some(d => d.isActive) || subsidiaries.length > 0) && 
        React.createElement('div', { key: 'revenue' }, UISubsidiary.renderRevenueSummary(player)),
        
        // 子公司列表
        subsidiaries.length > 0 && React.createElement('div', {
            key: 'subsidiaries',
            style: { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }
        }, [
            React.createElement('div', { key: 'title', style: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-yellow)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' } }, [
                React.createElement('span', { key: 'icon' }, '🏛️'),
                '子公司'
            ]),
            ...subsidiaries.map(sub => UISubsidiary.renderSubsidiaryDetailCard(sub))
        ]),
        
        // 部門列表
        React.createElement('div', {
            key: 'depts',
            style: { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }
        }, [
            React.createElement('div', { key: 'title', style: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' } }, [
                React.createElement('span', { key: 'icon' }, '🏢'),
                '部門管理'
            ]),
            allDepts.length > 0 ? 
                allDepts.map(dept => UISubsidiary.renderDeptDetailCard(dept, onEstablishDept, onUpgradeToSubsidiary)) :
                React.createElement('div', { key: 'empty', style: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '20px' } }, '尚未解鎖任何部門，請先升級設施技術')
        ])
    ]);
}


// ============================================
// 功能部門概覽（資產升級解鎖的部門）- 簡化版
// ============================================

function FunctionalDeptOverview({ player, onEstablish }) {
    const config = window.AssetCardConfig;
    if (!config) return null;
    
    const deptConfig = config.FUNCTIONAL_DEPTS || {};
    const subsidiaryConfig = config.FUNCTIONAL_SUBSIDIARIES || {};
    
    const unlockableDepts = config.getUnlockableDepartments ? 
        config.getUnlockableDepartments(player.asset_upgrades) : [];
    
    const activeDepts = player.functional_depts || [];
    const activeSubsidiaries = player.functional_subsidiaries || [];
    
    const availableToEstablish = unlockableDepts.filter(
        deptId => !activeDepts.includes(deptId)
    );
    
    const getDeptMastery = (deptId) => {
        return player.functional_dept_mastery?.[deptId] || player.dept_mastery?.[deptId] || 0;
    };
    
    const canEvolveToSubsidiary = (deptId) => {
        const dept = deptConfig[deptId];
        if (!dept?.evolves_to) return false;
        if (activeSubsidiaries.includes(dept.evolves_to)) return false;
        const mastery = getDeptMastery(deptId);
        return mastery >= (config.SYSTEM?.subsidiary_mastery_required || 100);
    };
    
    if (availableToEstablish.length === 0 && activeDepts.length === 0 && activeSubsidiaries.length === 0) {
        return null;
    }
    
    return (
        <div style={{
            padding: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            marginBottom: '12px'
        }}>
            <div style={{ 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                color: 'var(--accent-cyan)', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span>🏛️</span> 功能部門（設施升級）
            </div>
            
            {/* 已成立的功能子公司 */}
            {activeSubsidiaries.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginBottom: '6px' }}>
                        🏢 功能子公司
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activeSubsidiaries.map(subId => {
                            const sub = subsidiaryConfig[subId];
                            if (!sub) return null;
                            return (
                                <div key={subId} style={{
                                    padding: '6px 10px',
                                    background: 'var(--accent-green)22',
                                    border: '1px solid var(--accent-green)44',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem'
                                }}>
                                    <span>{sub.icon}</span>
                                    <span>{sub.name}</span>
                                    <span style={{ 
                                        fontSize: '0.65rem', 
                                        color: 'var(--accent-green)',
                                        marginLeft: '4px'
                                    }}>
                                        ×{sub.revenue_mult}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* 已成立的功能部門 */}
            {activeDepts.length > 0 && (
                <div style={{ marginBottom: availableToEstablish.length > 0 ? '12px' : 0 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        🏢 已成立部門
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {activeDepts.map(deptId => {
                            const dept = deptConfig[deptId];
                            if (!dept) return null;
                            const mastery = getDeptMastery(deptId);
                            const masteryRequired = config.SYSTEM?.subsidiary_mastery_required || 100;
                            const canEvolve = canEvolveToSubsidiary(deptId);
                            
                            return (
                                <div key={deptId} style={{
                                    padding: '8px 10px',
                                    background: canEvolve ? 'var(--accent-cyan)11' : 'var(--bg-tertiary)',
                                    border: canEvolve ? '1px solid var(--accent-cyan)44' : '1px solid transparent',
                                    borderRadius: '6px'
                                }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        marginBottom: '4px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>{dept.icon}</span>
                                            <span style={{ fontSize: '0.8rem' }}>{dept.name}</span>
                                        </div>
                                        <div style={{ 
                                            fontSize: '0.7rem', 
                                            color: canEvolve ? 'var(--accent-green)' : 'var(--text-muted)',
                                            fontFamily: 'var(--font-mono)'
                                        }}>
                                            {mastery}/{masteryRequired}
                                        </div>
                                    </div>
                                    
                                    {/* 熟練度進度條 */}
                                    <div style={{ 
                                        height: '3px', 
                                        background: 'var(--bg-secondary)', 
                                        borderRadius: '2px', 
                                        overflow: 'hidden',
                                        marginBottom: canEvolve ? '6px' : 0
                                    }}>
                                        <div style={{ 
                                            width: `${Math.min(100, (mastery / masteryRequired) * 100)}%`, 
                                            height: '100%', 
                                            background: canEvolve ? 
                                                'var(--accent-green)' : 
                                                'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                                            transition: 'width 0.3s ease-out'
                                        }} />
                                    </div>
                                    
                                    {/* 升級為子公司按鈕 */}
                                    {canEvolve && dept.evolves_to && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => onEstablish && onEstablish('evolveToSubsidiary', deptId)}
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
                                                🚀 升級為子公司
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* 可成立的新部門 */}
            {availableToEstablish.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                        ✨ 可成立新部門
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {availableToEstablish.map(deptId => {
                            const dept = deptConfig[deptId];
                            if (!dept) return null;
                            return (
                                <button 
                                    key={deptId} 
                                    onClick={() => onEstablish && onEstablish('establishDepartment', deptId)} 
                                    style={{
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
                                    }}
                                >
                                    <span>{dept.icon}</span>
                                    <span>成立 {dept.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* 說明 */}
            <div style={{ 
                marginTop: '10px', 
                padding: '6px 8px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '4px', 
                fontSize: '0.65rem', 
                color: 'var(--text-muted)' 
            }}>
                💡 多項設施技術達標解鎖部門 · 熟練度達100可成立子公司
            </div>
        </div>
    );
}


// ============================================
// 事業部概覽（產品線升級的部門）
// ============================================

function BusinessUnitOverview({ player, onUpgrade }) {
    const ProductLineEng = window.ProductLineEngine;
    const config = window.ProductLineUpgradeConfig;
    
    if (!ProductLineEng || !config) return null;
    
    const lineSummary = ProductLineEng.getProductLineSummary(player);
    
    if (lineSummary.length === 0) return null;
    
    const stages = config.UPGRADE_STAGES || {};
    
    const operatingLines = lineSummary.filter(l => l.stage === 'operating');
    const divisionLines = lineSummary.filter(l => l.stage === 'business_division');
    const subsidiaryLines = lineSummary.filter(l => l.stage === 'business_subsidiary');
    
    return (
        <div style={{
            padding: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            marginBottom: '12px'
        }}>
            <div style={{ 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                color: 'var(--accent-purple)', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span>🏢</span> 事業單位（產品線）
            </div>
            
            {/* 事業子公司 */}
            {subsidiaryLines.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginBottom: '6px' }}>
                        🏛️ 事業子公司
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {subsidiaryLines.map(line => (
                            <BusinessLineCard key={line.name} line={line} stages={stages} onUpgrade={onUpgrade} />
                        ))}
                    </div>
                </div>
            )}
            
            {/* 事業部 */}
            {divisionLines.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                        🏢 事業部
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {divisionLines.map(line => (
                            <BusinessLineCard key={line.name} line={line} stages={stages} onUpgrade={onUpgrade} />
                        ))}
                    </div>
                </div>
            )}
            
            {/* 營運中產品線 */}
            {operatingLines.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        🏭 營運中產品線
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {operatingLines.map(line => (
                            <BusinessLineCard key={line.name} line={line} stages={stages} onUpgrade={onUpgrade} />
                        ))}
                    </div>
                </div>
            )}
            
            {/* 說明 */}
            <div style={{ 
                marginTop: '10px', 
                padding: '6px 8px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '4px', 
                fontSize: '0.65rem', 
                color: 'var(--text-muted)' 
            }}>
                <div>🏢 <b>事業部</b>：經驗 ≥800，Senior 離職不影響營運</div>
                <div>🏛️ <b>事業子公司</b>：經驗 ≥1500 + T3，免營運成本、30% 收益分紅</div>
            </div>
        </div>
    );
}


// ============================================
// 事業線卡片（單一產品線）
// ============================================

function BusinessLineCard({ line, stages, onUpgrade }) {
    const nextStageConfig = line.nextStage ? stages[line.nextStage.toUpperCase()] : null;
    const progressPct = nextStageConfig ? 
        Math.min(100, (line.experience / nextStageConfig.expRequired) * 100) : 100;
    
    const stageColor = line.stage === 'business_subsidiary' ? 'var(--accent-green)' :
                       line.stage === 'business_division' ? 'var(--accent-cyan)' :
                       'var(--text-muted)';
    
    return (
        <div style={{ 
            padding: '10px 12px', 
            background: line.canUpgrade ? 'var(--accent-green)11' : 'var(--bg-tertiary)', 
            borderRadius: '6px',
            border: line.canUpgrade ? '1px solid var(--accent-green)44' : '1px solid transparent'
        }}>
            {/* 標題行 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>{line.stageIcon}</span>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {line.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: stageColor }}>
                            {line.stageName} · {line.productCount} 個產品 · 最高 T{line.maxTier}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                        {line.experience} EXP
                    </div>
                    {nextStageConfig && (
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
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
}


// ============================================
// 整合組織面板（放在商品面板中）
// ============================================

function OrganizationPanel({ player, onAction }) {
    const [showDetailView, setShowDetailView] = React.useState(false);
    
    const handleEstablish = (actionType, id) => {
        if (actionType === 'establishDepartment') {
            onAction('establishDepartment', { departmentId: id });
        } else if (actionType === 'evolveToSubsidiary') {
            onAction('evolveDeptToSubsidiary', { departmentId: id });
        }
    };
    
    const handleUpgradeProductLine = (lineName, targetStage) => {
        onAction('upgradeProductLine', { lineName, targetStage });
    };
    
    const handleEstablishDept = (deptId) => {
        onAction('establishDepartment', { departmentId: deptId });
    };
    
    const handleUpgradeToSubsidiary = (deptId) => {
        onAction('evolveDeptToSubsidiary', { departmentId: deptId });
    };
    
    const config = window.AssetCardConfig;
    const ProductLineEng = window.ProductLineEngine;
    
    const hasUnlockableDepts = config?.getUnlockableDepartments ? 
        config.getUnlockableDepartments(player.asset_upgrades).length > 0 : false;
    const hasActiveDepts = (player.functional_depts?.length || 0) > 0;
    const hasSubsidiaries = (player.functional_subsidiaries?.length || 0) > 0;
    const hasProductLines = ProductLineEng?.getProductLineSummary ? 
        ProductLineEng.getProductLineSummary(player).length > 0 : false;
    
    if (!hasUnlockableDepts && !hasActiveDepts && !hasSubsidiaries && !hasProductLines) {
        return null;
    }
    
    return (
        <div style={{ marginTop: '16px' }}>
            <div style={{ 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                color: 'var(--accent-magenta)', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🗂️</span> 組織架構
                </div>
                
                {/* 切換詳細視圖按鈕 */}
                {(hasActiveDepts || hasSubsidiaries) && (
                    <button
                        onClick={() => setShowDetailView(!showDetailView)}
                        style={{
                            padding: '4px 10px',
                            fontSize: '0.7rem',
                            background: showDetailView ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                            color: showDetailView ? '#000' : 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {showDetailView ? '📋 簡易視圖' : '📊 詳細視圖'}
                    </button>
                )}
            </div>
            
            {showDetailView ? (
                // 詳細視圖（UISubsidiary 完整內容）
                <SubsidiaryDetailPanel 
                    player={player}
                    onEstablishDept={handleEstablishDept}
                    onUpgradeToSubsidiary={handleUpgradeToSubsidiary}
                />
            ) : (
                // 簡易視圖（原有內容）
                <>
                    {/* 功能部門（設施升級） */}
                    <FunctionalDeptOverview 
                        player={player} 
                        onEstablish={handleEstablish}
                    />
                    
                    {/* 事業單位（產品線） */}
                    <BusinessUnitOverview 
                        player={player} 
                        onUpgrade={handleUpgradeProductLine}
                    />
                </>
            )}
        </div>
    );
}


// ============================================
// 導出組件
// ============================================

window.OrganizationComponents = {
    FunctionalDeptOverview,
    BusinessUnitOverview,
    BusinessLineCard,
    OrganizationPanel,
    SubsidiaryDetailPanel,
    UISubsidiary
};

window.UISubsidiary = UISubsidiary;

console.log('✓ Organization UI components loaded');
console.log('  - FunctionalDeptOverview: 功能部門管理');
console.log('  - BusinessUnitOverview: 事業單位管理');
console.log('  - OrganizationPanel: 整合組織面板');
console.log('  - SubsidiaryDetailPanel: 子公司詳細面板');
console.log('  - UISubsidiary: 企業光譜與子公司介面');