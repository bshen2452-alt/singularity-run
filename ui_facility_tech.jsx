// ============================================
// 設施技術 UI 組件 (ui_facility_tech.jsx)
// ============================================
// 設計原則：
//   1. 純介面層，不包含業務邏輯
//   2. 整合到 ui_space.jsx 的現有設施面板
//   3. 顯示技術等級狀態並提供施工操作
// ============================================

// ============================================
// 技術等級指示器（小圓點）
// ============================================

function TechLevelDots({ level, maxLevel, color }) {
    return React.createElement('div', {
        style: { display: 'flex', gap: '2px', alignItems: 'center' }
    }, 
        Array.from({ length: maxLevel }, function(_, i) {
            return React.createElement('div', {
                key: i,
                style: {
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: i < level ? color : 'var(--bg-secondary)',
                    border: '1px solid ' + (i < level ? color : 'var(--border-color)')
                }
            });
        })
    );
}

// ============================================
// 設施技術徽章（顯示在設施標題旁）
// ============================================

function FacilityTechBadges({ facility }) {
    var SpaceEng = window.SpaceEngine;
    if (!SpaceEng || !facility.tech_levels) {
        return null;
    }
    
    var techPaths = SpaceEng.FACILITY_TECH_PATHS || {};
    var levels = facility.tech_levels.levels || {};
    var constructing = facility.tech_levels.constructing || [];
    
    var categoryColors = {
        space: 'var(--accent-purple)',
        power: 'var(--accent-yellow)',
        compute: 'var(--accent-cyan)'
    };
    
    var badges = [];
    
    Object.keys(levels).forEach(function(pathId) {
        var pathData = levels[pathId];
        var pathConfig = techPaths[pathId] || {};
        
        if (pathData.current > 0) {
            badges.push(
                React.createElement('span', {
                    key: pathId,
                    style: {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '1px 4px',
                        background: (categoryColors[pathConfig.category] || 'var(--text-muted)') + '22',
                        borderRadius: '3px',
                        fontSize: '0.6rem',
                        color: categoryColors[pathConfig.category] || 'var(--text-muted)'
                    },
                    title: pathConfig.name + ' Lv.' + pathData.current
                },
                    pathConfig.icon || '🔧',
                    React.createElement('span', { 
                        style: { fontFamily: 'var(--font-mono)' } 
                    }, pathData.current)
                )
            );
        }
    });
    
    if (constructing.length > 0) {
        badges.push(
            React.createElement('span', {
                key: 'constructing',
                style: {
                    padding: '1px 4px',
                    background: 'var(--accent-orange)22',
                    borderRadius: '3px',
                    fontSize: '0.6rem',
                    color: 'var(--accent-orange)'
                }
            }, '🔧' + constructing.length)
        );
    }
    
    if (badges.length === 0) return null;
    
    return React.createElement('div', {
        style: { display: 'flex', gap: '3px', flexWrap: 'wrap' }
    }, badges);
}

// ============================================
// 單項技術路線卡片
// ============================================

function TechPathCard({ pathData, facilityId, player, onAction }) {
    var isConstructing = pathData.status === 'constructing';
    var isMaxed = pathData.currentLevel >= pathData.maxLevel;
    var canUpgrade = pathData.canUpgrade;
    
    var levelColors = ['var(--text-muted)', 'var(--accent-green)', 'var(--accent-cyan)', 'var(--accent-purple)'];
    var levelColor = levelColors[Math.min(pathData.currentLevel, 3)];
    
    return React.createElement('div', {
        style: {
            padding: '8px',
            background: isConstructing ? 'var(--accent-orange)11' : 'var(--bg-secondary)',
            borderRadius: '6px',
            border: '1px solid ' + (isConstructing ? 'var(--accent-orange)33' : 'var(--border-color)')
        }
    },
        React.createElement('div', {
            style: { 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '6px'
            }
        },
            React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '6px' }
            },
                React.createElement('span', { style: { fontSize: '1rem' } }, pathData.icon),
                React.createElement('span', { 
                    style: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }
                }, pathData.name)
            ),
            React.createElement(TechLevelDots, {
                level: pathData.currentLevel,
                maxLevel: pathData.maxLevel,
                color: levelColor
            })
        ),
        
        isConstructing && React.createElement('div', {
            style: { marginBottom: '6px' }
        },
            React.createElement('div', {
                style: { 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.65rem',
                    marginBottom: '3px'
                }
            },
                React.createElement('span', { style: { color: 'var(--accent-orange)' } }, '🔧 升級中'),
                React.createElement('span', { 
                    style: { color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }
                }, '剩餘 ' + pathData.constructionRemaining + ' 季')
            ),
            React.createElement('div', {
                style: {
                    width: '100%',
                    height: '3px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }
            },
                React.createElement('div', {
                    style: {
                        width: ((1 - pathData.constructionRemaining / (pathData.upgradeTurns || 1)) * 100) + '%',
                        height: '100%',
                        background: 'var(--accent-orange)'
                    }
                })
            )
        ),
        
        !isConstructing && !isMaxed && React.createElement('div', null,
            canUpgrade ? React.createElement('button', {
                onClick: function() { 
                    onAction('startFacilityTechConstruction', {
                        facilityId: facilityId,
                        pathId: pathData.id
                    });
                },
                disabled: player.cash < pathData.upgradeCost,
                style: {
                    width: '100%',
                    padding: '5px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    background: player.cash >= pathData.upgradeCost ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                    color: player.cash >= pathData.upgradeCost ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: player.cash >= pathData.upgradeCost ? 'pointer' : 'not-allowed'
                }
            }, '施工 $' + pathData.upgradeCost + 'M / ' + pathData.upgradeTurns + '季')
            : React.createElement('div', {
                style: { 
                    fontSize: '0.6rem', 
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    fontStyle: 'italic'
                }
            }, pathData.upgradeReason || '無法升級')
        ),
        
        isMaxed && React.createElement('div', {
            style: { 
                fontSize: '0.65rem', 
                color: 'var(--accent-purple)',
                textAlign: 'center'
            }
        }, '✨ 已達最高等級')
    );
}

// ============================================
// 設施技術面板（完整面板）
// ============================================

function FacilityTechPanel({ player, facilityId, onAction }) {
    var isExpandedState = React.useState(false);
    var isExpanded = isExpandedState[0];
    var setIsExpanded = isExpandedState[1];
    
    var SpaceEng = window.SpaceEngine;
    if (!SpaceEng || !SpaceEng.getFacilityTechSummary) return null;
    if ((player.mp_tier || 0) < 3) return null;
    
    var summary = SpaceEng.getFacilityTechSummary(player, facilityId);
    if (!summary || !summary.compatible) {
        return React.createElement('div', {
            style: {
                padding: '8px',
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                textAlign: 'center',
                marginTop: '10px'
            }
        }, '此設施類型不支援技術升級');
    }
    
    var categories = { space: [], power: [], compute: [] };
    var categoryNames = { space: '空間技術', power: '電力技術', compute: '算力技術' };
    var categoryIcons = { space: '🏢', power: '⚡', compute: '🖥️' };
    var categoryColors = { space: 'var(--accent-purple)', power: 'var(--accent-yellow)', compute: 'var(--accent-cyan)' };
    
    summary.paths.forEach(function(path) {
        if (categories[path.category]) {
            categories[path.category].push(path);
        }
    });
    
    return React.createElement('div', {
        style: {
            marginTop: '10px',
            padding: '10px',
            background: 'var(--accent-purple)08',
            borderRadius: '6px',
            border: '1px solid var(--accent-purple)22'
        }
    },
        React.createElement('div', {
            onClick: function() { setIsExpanded(!isExpanded); },
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: isExpanded ? '10px' : 0
            }
        },
            React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '6px' }
            },
                React.createElement('span', null, '🔬'),
                React.createElement('span', { 
                    style: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-purple)' }
                }, '技術升級'),
                summary.constructingCount > 0 && React.createElement('span', {
                    style: {
                        fontSize: '0.6rem',
                        padding: '1px 5px',
                        background: 'var(--accent-orange)33',
                        color: 'var(--accent-orange)',
                        borderRadius: '8px'
                    }
                }, '🔧 ' + summary.constructingCount + '/2')
            ),
            React.createElement('span', {
                style: {
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                }
            }, '▼')
        ),
        
        isExpanded && summary.constructionPenalty > 0 && React.createElement('div', {
            style: {
                padding: '6px',
                background: 'var(--accent-orange)11',
                borderRadius: '4px',
                marginBottom: '10px',
                fontSize: '0.65rem',
                color: 'var(--accent-orange)'
            }
        }, '⚠️ 施工期間設施容量 -' + (summary.constructionPenalty * 100).toFixed(0) + '%'),
        
        isExpanded && Object.keys(categories).map(function(catId) {
            var paths = categories[catId];
            if (paths.length === 0) return null;
            
            return React.createElement('div', {
                key: catId,
                style: { marginBottom: '8px' }
            },
                React.createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginBottom: '6px',
                        fontSize: '0.7rem',
                        color: categoryColors[catId]
                    }
                },
                    React.createElement('span', null, categoryIcons[catId]),
                    React.createElement('span', { style: { fontWeight: 600 } }, categoryNames[catId])
                ),
                React.createElement('div', {
                    style: { display: 'grid', gap: '6px' }
                },
                    paths.map(function(path) {
                        return React.createElement(TechPathCard, {
                            key: path.id,
                            pathData: path,
                            facilityId: facilityId,
                            player: player,
                            onAction: onAction
                        });
                    })
                )
            );
        }),
        
        !isExpanded && React.createElement('div', {
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '6px'
            }
        },
            summary.paths.map(function(path) {
                return React.createElement('div', {
                    key: path.id,
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 6px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '4px',
                        fontSize: '0.65rem'
                    }
                },
                    React.createElement('span', null, path.icon),
                    React.createElement(TechLevelDots, {
                        level: path.currentLevel,
                        maxLevel: path.maxLevel,
                        color: categoryColors[path.category] || 'var(--text-muted)'
                    })
                );
            })
        )
    );
}

// ============================================
// 導出組件
// ============================================

window.FacilityTechUIComponents = {
    FacilityTechPanel: FacilityTechPanel,
    FacilityTechBadges: FacilityTechBadges,
    TechPathCard: TechPathCard,
    TechLevelDots: TechLevelDots
};

window.FacilityTechPanel = FacilityTechPanel;
window.FacilityTechBadges = FacilityTechBadges;

console.log('✓ Facility Tech UI components loaded');