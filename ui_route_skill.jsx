// ============================================
// 路線專屬技能 UI - Route Skill UI
// ============================================

function RouteSkillPanel({ player, route, onUseSkill }) {
    const { GlowButton } = window.Components || {};
    
    if (!window.ROUTE_SKILL_CONFIG || !window.RouteSkillEngine) {
        return (
            <div style={{ color: 'var(--text-muted)', padding: '12px' }}>
                技能系統載入中...
            </div>
        );
    }
    
    const config = window.ROUTE_SKILL_CONFIG;
    const engine = window.RouteSkillEngine;
    
    const skillStates = engine.getAllSkillStates(player, config);
    const baseSkill = skillStates.find(s => s.type === 'base');
    const blueprintSkills = skillStates.filter(s => s.type === 'blueprint');
    
    const renderSkillButton = (skill) => {
        const isReady = skill.ready;
        const cooldown = skill.cooldownRemaining;
        
        const buttonStyle = {
            width: '100%',
            marginBottom: '8px',
            position: 'relative',
            opacity: isReady ? 1 : 0.6
        };
        
        return (
            <div style={{ position: 'relative' }}>
                {GlowButton ? (
                    <GlowButton
                        variant={skill.type === 'base' ? 'secondary' : 'primary'}
                        onClick={() => onUseSkill(skill.id, skill.type)}
                        icon={skill.icon}
                        disabled={!isReady}
                        style={buttonStyle}
                    >
                        {skill.name}
                    </GlowButton>
                ) : (
                    <button
                        onClick={() => onUseSkill(skill.id, skill.type)}
                        disabled={!isReady}
                        style={{ ...buttonStyle, padding: '8px 16px', cursor: isReady ? 'pointer' : 'not-allowed' }}
                    >
                        {skill.icon} {skill.name}
                    </button>
                )}
                {!isReady && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        pointerEvents: 'none'
                    }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem' }}>
                            ⏳ {cooldown}
                        </span>
                    </div>
                )}
            </div>
        );
    };
    
    return (
        <div style={{
            marginTop: '16px',
            padding: '16px',
            background: `${route.color}11`,
            borderRadius: '8px',
            border: `1px solid ${route.color}33`
        }}>
            {/* 標題 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <h4 style={{ 
                    color: route.color, 
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>{route.icon}</span>
                    路線專屬技能
                </h4>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    padding: '4px 8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '4px'
                }}>
                    獨立冷卻
                </span>
            </div>
            
            {/* 技能列表 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
            }}>
                {/* 基礎技能 */}
                {baseSkill && (
                    <div style={{
                        padding: '12px',
                        background: baseSkill.ready ? `${route.color}22` : 'var(--bg-tertiary)',
                        borderRadius: '8px',
                        border: `1px solid ${baseSkill.ready ? route.color : `${route.color}33`}`
                    }}>
                        {renderSkillButton(baseSkill)}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {baseSkill.description}
                        </div>
                    </div>
                )}
                
                {/* 藍圖解鎖技能 */}
                {blueprintSkills.map(skill => (
                    <div 
                        key={skill.id}
                        style={{
                            padding: '12px',
                            background: skill.ready ? 'var(--accent-cyan)22' : 'var(--bg-tertiary)',
                            borderRadius: '8px',
                            border: `1px solid ${skill.ready ? 'var(--accent-cyan)' : 'var(--accent-cyan)33'}`
                        }}
                    >
                        {renderSkillButton(skill)}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                background: 'var(--accent-cyan)33',
                                borderRadius: '4px',
                                marginRight: '6px',
                                fontSize: '0.65rem'
                            }}>
                                藍圖
                            </span>
                            {skill.description}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* 空狀態提示 */}
            {blueprintSkills.length === 0 && (
                <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                }}>
                    💡 Tier2解鎖技術藍圖，發展更多主動技能
                </div>
            )}
        </div>
    );
}

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.RouteSkillPanel = RouteSkillPanel;
}

console.log('✓ Route Skill UI loaded');