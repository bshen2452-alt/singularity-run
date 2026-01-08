// ============================================
// 設施升級UI組件 (ui_facility_upgrade.jsx)
// ============================================
// 設計原則：純介面，不包含業務邏輯
// ============================================

const FacilityUpgradeUI = {
    
    // ==========================================
    // 升級產品卡片
    // ==========================================
    
    UpgradeProductCard: function({ product, player, onStartResearch, onViewDetails }) {
        const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        const status = product.status;
        
        // 狀態顏色
        const statusColors = {
            locked: 'bg-gray-700',
            unlocked: 'bg-blue-900',
            researching: 'bg-yellow-900',
            constructing: 'bg-orange-900',
            completed: 'bg-green-900',
            operating: 'bg-green-800'
        };
        
        const statusLabels = {
            locked: '🔒 未解鎖',
            unlocked: '✓ 可研發',
            researching: '🔬 研發中',
            constructing: '🏗️ 施工中',
            completed: '✓ 已完成',
            operating: '⚡ 運作中'
        };
        
        const bgColor = statusColors[status] || 'bg-gray-700';
        
        return React.createElement('div', {
            className: `${bgColor} rounded-lg p-4 border border-gray-600 hover:border-gray-400 transition-colors`
        }, [
            // 標題列
            React.createElement('div', {
                key: 'header',
                className: 'flex justify-between items-start mb-3'
            }, [
                React.createElement('div', { key: 'title', className: 'flex items-center gap-2' }, [
                    React.createElement('span', { key: 'icon', className: 'text-2xl' }, product.icon),
                    React.createElement('div', { key: 'info' }, [
                        React.createElement('div', { key: 'name', className: 'font-bold text-white' }, product.name),
                        React.createElement('div', { key: 'path', className: 'text-xs text-gray-400' },
                            `${product.upgrade_path.type} / ${product.upgrade_path.path} Lv.${product.upgrade_path.target_level}`
                        )
                    ])
                ]),
                React.createElement('span', {
                    key: 'status',
                    className: 'text-xs px-2 py-1 rounded bg-black/30'
                }, statusLabels[status] || status)
            ]),
            
            // 描述
            React.createElement('p', {
                key: 'desc',
                className: 'text-sm text-gray-300 mb-3'
            }, product.description),
            
            // 進度條（研發中或施工中時顯示）
            (status === 'researching' || status === 'constructing') &&
            React.createElement('div', { key: 'progress', className: 'mb-3' }, [
                React.createElement('div', { key: 'label', className: 'text-xs text-gray-400 mb-1' },
                    status === 'researching' 
                        ? `研發進度：${Math.floor(product.research_progress)}/${product.research_total} 季`
                        : `施工進度：${product.construction_progress}/${product.construction_total} 季`
                ),
                React.createElement('div', { key: 'bar', className: 'h-2 bg-gray-600 rounded' },
                    React.createElement('div', {
                        className: `h-full rounded ${status === 'researching' ? 'bg-yellow-500' : 'bg-orange-500'}`,
                        style: { 
                            width: `${(status === 'researching' 
                                ? product.research_progress / product.research_total 
                                : product.construction_progress / product.construction_total) * 100}%` 
                        }
                    })
                )
            ]),
            
            // 成本與效果
            React.createElement('div', {
                key: 'costs',
                className: 'grid grid-cols-2 gap-2 mb-3 text-xs'
            }, [
                React.createElement('div', { key: 'research', className: 'bg-black/20 rounded p-2' }, [
                    React.createElement('div', { key: 'label', className: 'text-gray-400' }, '研發'),
                    React.createElement('div', { key: 'value', className: 'text-white' }, 
                        `$${product.research_cost}M / ${product.research_total}季`
                    )
                ]),
                React.createElement('div', { key: 'construct', className: 'bg-black/20 rounded p-2' }, [
                    React.createElement('div', { key: 'label', className: 'text-gray-400' }, '施工'),
                    React.createElement('div', { key: 'value', className: 'text-white' }, 
                        `$${product.construction_cost}M / ${product.construction_total}季`
                    )
                ])
            ]),
            
            // 效果預覽
            React.createElement('div', { key: 'effects', className: 'mb-3' }, [
                React.createElement('div', { key: 'title', className: 'text-xs text-gray-400 mb-1' }, '完成效果'),
                React.createElement('div', { key: 'list', className: 'flex flex-wrap gap-1' },
                    product.pros?.map((pro, i) =>
                        React.createElement('span', {
                            key: i,
                            className: 'text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded'
                        }, pro)
                    )
                )
            ]),
            
            // 施工影響警告
            product.construction_impact && status !== 'operating' &&
            React.createElement('div', {
                key: 'warning',
                className: 'text-xs text-orange-400 bg-orange-900/30 rounded p-2 mb-3'
            }, [
                React.createElement('span', { key: 'icon' }, '⚠️ '),
                `施工期間：${product.construction_impact.description}`,
                product.construction_impact.capacity_loss_percent && 
                    ` (容量-${product.construction_impact.capacity_loss_percent * 100}%)`,
                product.construction_impact.compute_loss_percent && 
                    ` (算力-${product.construction_impact.compute_loss_percent * 100}%)`,
                product.construction_impact.power_loss_percent && 
                    ` (電力-${product.construction_impact.power_loss_percent * 100}%)`
            ]),
            
            // 部門解鎖預覽
            product.department_benefits &&
            React.createElement('div', {
                key: 'dept',
                className: 'text-xs bg-purple-900/30 text-purple-300 rounded p-2 mb-3'
            }, [
                React.createElement('div', { key: 'title', className: 'font-bold mb-1' },
                    `🏢 解鎖：${product.department_benefits.name}`
                ),
                React.createElement('ul', { key: 'benefits', className: 'list-disc list-inside' },
                    product.department_benefits.benefits?.map((b, i) =>
                        React.createElement('li', { key: i }, b)
                    )
                )
            ]),
            
            // 操作按鈕
            React.createElement('div', { key: 'actions', className: 'flex gap-2' }, [
                status === 'unlocked' && product.canUnlock &&
                React.createElement('button', {
                    key: 'start',
                    className: 'flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm',
                    onClick: () => onStartResearch && onStartResearch(product.id)
                }, `開始研發 ($${product.research_cost}M)`),
                
                status === 'locked' && !product.canUnlock &&
                React.createElement('div', {
                    key: 'locked',
                    className: 'flex-1 text-center text-gray-400 text-sm py-2'
                }, product.unlockReason),
                
                React.createElement('button', {
                    key: 'details',
                    className: 'px-4 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded text-sm',
                    onClick: () => onViewDetails && onViewDetails(product.id)
                }, '詳情')
            ])
        ]);
    },
    
    // ==========================================
    // 施工影響面板
    // ==========================================
    
    ConstructionImpactPanel: function({ player }) {
        const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
        if (!FacilityUpgradeEngine) return null;
        
        const impact = FacilityUpgradeEngine.calculateConstructionImpact(player);
        const hasImpact = impact.capacity_loss_percent > 0 || 
                          impact.power_loss_percent > 0 || 
                          impact.compute_loss_percent > 0;
        
        if (!hasImpact) return null;
        
        return React.createElement('div', {
            className: 'bg-orange-900/40 border border-orange-700 rounded-lg p-4 mb-4'
        }, [
            React.createElement('div', {
                key: 'title',
                className: 'font-bold text-orange-300 mb-2'
            }, '🏗️ 施工中 - 產能受影響'),
            
            React.createElement('div', {
                key: 'impacts',
                className: 'grid grid-cols-3 gap-4 text-sm'
            }, [
                impact.capacity_loss_percent > 0 &&
                React.createElement('div', { key: 'cap', className: 'text-center' }, [
                    React.createElement('div', { key: 'label', className: 'text-gray-400' }, '容量損失'),
                    React.createElement('div', { key: 'value', className: 'text-orange-400 text-lg' },
                        `-${(impact.capacity_loss_percent * 100).toFixed(0)}%`
                    )
                ]),
                impact.power_loss_percent > 0 &&
                React.createElement('div', { key: 'power', className: 'text-center' }, [
                    React.createElement('div', { key: 'label', className: 'text-gray-400' }, '電力損失'),
                    React.createElement('div', { key: 'value', className: 'text-orange-400 text-lg' },
                        `-${(impact.power_loss_percent * 100).toFixed(0)}%`
                    )
                ]),
                impact.compute_loss_percent > 0 &&
                React.createElement('div', { key: 'compute', className: 'text-center' }, [
                    React.createElement('div', { key: 'label', className: 'text-gray-400' }, '算力損失'),
                    React.createElement('div', { key: 'value', className: 'text-orange-400 text-lg' },
                        `-${(impact.compute_loss_percent * 100).toFixed(0)}%`
                    )
                ])
            ]),
            
            impact.descriptions.length > 0 &&
            React.createElement('div', {
                key: 'desc',
                className: 'mt-2 text-xs text-gray-400'
            }, impact.descriptions.join('、'))
        ]);
    },
    
    // ==========================================
    // 進行中項目列表
    // ==========================================
    
    ActiveProjectsList: function({ player }) {
        const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
        if (!FacilityUpgradeEngine) return null;
        
        const activeProjects = FacilityUpgradeEngine.getActiveProjects(player);
        
        if (activeProjects.length === 0) return null;
        
        return React.createElement('div', {
            className: 'bg-gray-800 rounded-lg p-4 mb-4'
        }, [
            React.createElement('div', {
                key: 'title',
                className: 'font-bold text-white mb-3'
            }, '📋 進行中的升級項目'),
            
            React.createElement('div', {
                key: 'list',
                className: 'space-y-2'
            }, activeProjects.map(project =>
                React.createElement('div', {
                    key: project.productId,
                    className: 'flex items-center gap-3 bg-gray-700/50 rounded p-2'
                }, [
                    React.createElement('span', { key: 'icon', className: 'text-xl' }, project.icon),
                    React.createElement('div', { key: 'info', className: 'flex-1' }, [
                        React.createElement('div', { key: 'name', className: 'text-sm text-white' }, project.name),
                        React.createElement('div', {
                            key: 'status',
                            className: 'text-xs text-gray-400'
                        }, project.isResearching 
                            ? `🔬 研發中 ${Math.floor(project.research_progress)}/${project.research_total}季`
                            : `🏗️ 施工中 ${project.construction_progress}/${project.construction_total}季`
                        )
                    ]),
                    React.createElement('div', {
                        key: 'progress',
                        className: 'w-24 h-2 bg-gray-600 rounded overflow-hidden'
                    },
                        React.createElement('div', {
                            className: `h-full ${project.isResearching ? 'bg-yellow-500' : 'bg-orange-500'}`,
                            style: {
                                width: `${(project.isResearching
                                    ? project.research_progress / project.research_total
                                    : project.construction_progress / project.construction_total) * 100}%`
                            }
                        })
                    )
                ])
            ))
        ]);
    },
    
    // ==========================================
    // 升級類型選擇面板
    // ==========================================
    
    UpgradeTypePanel: function({ player, selectedType, onSelectType, onStartResearch }) {
        const types = [
            { id: 'space', name: '空間設施', icon: '🏢' },
            { id: 'power', name: '電力設施', icon: '⚡' },
            { id: 'compute', name: '算力設施', icon: '💻' }
        ];
        
        const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
        const summaries = FacilityUpgradeEngine?.getAllUpgradeSummaries(player) || {};
        const currentSummary = summaries[selectedType] || {};
        
        return React.createElement('div', { className: 'space-y-4' }, [
            // 類型選擇
            React.createElement('div', {
                key: 'tabs',
                className: 'flex gap-2'
            }, types.map(type =>
                React.createElement('button', {
                    key: type.id,
                    className: `flex-1 py-2 px-4 rounded text-center transition-colors ${
                        selectedType === type.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`,
                    onClick: () => onSelectType && onSelectType(type.id)
                }, [
                    React.createElement('span', { key: 'icon', className: 'mr-2' }, type.icon),
                    type.name
                ])
            )),
            
            // 施工影響警告
            React.createElement(FacilityUpgradeUI.ConstructionImpactPanel, {
                key: 'impact',
                player
            }),
            
            // 進行中項目
            React.createElement(FacilityUpgradeUI.ActiveProjectsList, {
                key: 'active',
                player
            }),
            
            // 升級產品列表
            React.createElement('div', {
                key: 'products',
                className: 'grid gap-4'
            }, Object.values(currentSummary).map(product =>
                React.createElement(FacilityUpgradeUI.UpgradeProductCard, {
                    key: product.id,
                    product,
                    player,
                    onStartResearch
                })
            ))
        ]);
    }
};

// 全局暴露
if (typeof window !== 'undefined') {
    window.FacilityUpgradeUI = FacilityUpgradeUI;
}

console.log('✓ Facility Upgrade UI loaded');
