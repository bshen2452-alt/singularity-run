// ============================================
// 區域資產派駐 UI (ui_region_asset.jsx)
// ============================================
// 設計原則：
//   1. 純介面層，不包含業務邏輯計算
//   2. 數據來自 RegionAssetIntegration
//   3. 與 ui_region.jsx 配合使用
// ============================================

(function() {
    'use strict';

    const { useState, useMemo, useCallback } = React;

    // ============================================
    // 樣式常量
    // ============================================
    
    const C = {
        pos: '#00ff88', neg: '#ff3366', warn: '#ffd000', 
        cyan: '#00f5ff', magenta: '#ff00aa', muted: '#a0a0b0',
        business: '#00f5ff',
        functional: '#ffd000'
    };

    const cardStyle = {
        background: 'rgba(20, 20, 30, 0.95)',
        border: '1px solid rgba(0, 245, 255, 0.3)',
        borderRadius: '8px',
        padding: '16px',
        backdropFilter: 'blur(10px)'
    };

    // ============================================
    // 輔助函數
    // ============================================
    
    const fmt = (num, dec = 0) => {
        if (num === undefined || num === null || isNaN(num)) return '0';
        return num.toFixed(dec);
    };

    const fmtCash = (num) => {
        if (num === undefined || num === null || isNaN(num)) return '$0M';
        return (num < 0 ? '-' : '') + '$' + fmt(Math.abs(num)) + 'M';
    };

    // ============================================
    // 資產卡片組件
    // ============================================
    
    function AssetCard({ asset, targetRegionId, onSelect, isSelected }) {
        const RegionAssetConf = window.RegionAssetConfig;
        
        // 防禦性檢查 - 確保 asset 存在且有必要屬性
        if (!asset || typeof asset !== 'object') {
            console.warn('RegionAssetCard: asset is undefined or invalid');
            return null;
        }
        
        // 安全取得顯示配置，確保所有值都有預設
        const typeDisplay = (asset.type_display || RegionAssetConf?.getAssetTypeDisplay?.(asset.type)) || {
            name: asset.type || '未知',
            icon: '📦',
            color: '#888888'
        };
        const statusDisplay = (asset.status_display || RegionAssetConf?.DEPLOYMENT_STATUS_DISPLAY?.[asset.status]) || {
            name: asset.status || '未知',
            icon: '❓',
            color: '#888888'
        };
        const affinityLevel = asset.affinity_level || RegionAssetConf?.getAffinityLevel?.(asset.target_affinity || 0) || {
            color: '#888888',
            icon: '',
            label: ''
        };
        
        const isDeployed = asset.status === 'deployed';
        const borderColor = asset.category === 'business' ? C.business : C.functional;
        
        return (
            <div
                onClick={() => !isDeployed && onSelect?.(asset)}
                style={{
                    ...cardStyle,
                    borderColor: isSelected ? C.pos : (isDeployed ? C.muted : borderColor),
                    opacity: isDeployed ? 0.6 : 1,
                    cursor: isDeployed ? 'not-allowed' : 'pointer',
                    marginBottom: '8px',
                    transition: 'all 0.2s ease'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {/* 左側：資產信息 */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '1.3rem' }}>{asset.icon || typeDisplay.icon}</span>
                            <span style={{ fontWeight: 600, color: typeDisplay.color || '#fff' }}>
                                {asset.name}
                            </span>
                            <span style={{
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                background: `${borderColor}22`,
                                borderRadius: '4px',
                                color: borderColor
                            }}>
                                {typeDisplay.name}
                            </span>
                        </div>
                        
                        {/* 狀態 */}
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: statusDisplay.color || C.muted,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <span>{statusDisplay.icon}</span>
                            <span>{statusDisplay.name}</span>
                            {isDeployed && asset.deployed_region && (
                                <span style={{ color: C.muted }}>
                                    → {getRegionName(asset.deployed_region)}
                                </span>
                            )}
                        </div>
                        
                        {/* 額外信息 */}
                        {asset.base_revenue > 0 && (
                            <div style={{ fontSize: '0.75rem', color: C.pos, marginTop: '4px' }}>
                                💰 基礎收益 {fmtCash(asset.base_revenue)}/季
                            </div>
                        )}
                    </div>
                    
                    {/* 右側：親和度（如果有目標區域） */}
                    {targetRegionId && !isDeployed && (
                        <div style={{ 
                            textAlign: 'right',
                            padding: '8px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '6px'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: C.muted }}>親和度</div>
                            <div style={{ 
                                fontSize: '1.2rem', 
                                fontWeight: 600,
                                color: affinityLevel?.color || C.muted
                            }}>
                                +{asset.target_affinity || 0}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: affinityLevel?.color }}>
                                {affinityLevel?.icon} {affinityLevel?.label}
                            </div>
                        </div>
                    )}
                    
                    {/* 最佳區域推薦（無目標區域時） */}
                    {!targetRegionId && !isDeployed && asset.best_region && (
                        <div style={{ 
                            textAlign: 'right',
                            padding: '8px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '6px'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: C.muted }}>最佳區域</div>
                            <div style={{ fontSize: '1rem' }}>
                                {asset.best_region.icon} {asset.best_region.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: C.pos }}>
                                +{asset.best_region.affinity}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 獲取區域名稱
    function getRegionName(regionId) {
        const RegionConf = window.RegionConfig;
        const region = RegionConf?.getRegion(regionId);
        return region ? `${region.icon} ${region.name}` : regionId;
    }

    // ============================================
    // 派駐確認面板
    // ============================================
    
    function DeploymentConfirmPanel({ asset, regionId, player, onConfirm, onCancel }) {
        const RegionAssetEng = window.RegionAssetEngine;
        const RegionConf = window.RegionConfig;
        
        if (!asset || !regionId || !RegionAssetEng) return null;
        
        const region = RegionConf?.getRegion(regionId);
        const checkResult = RegionAssetEng.canDeployAsset(player, asset, regionId);
        const affinity = checkResult.affinity || 0;
        
        return (
            <div style={{
                ...cardStyle,
                border: `2px solid ${checkResult.canDeploy ? C.pos : C.neg}`,
                marginTop: '16px'
            }}>
                <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>📋</span>
                    <span>確認派駐</span>
                </div>
                
                {/* 派駐摘要 */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem' }}>{asset.icon}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{asset.name}</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', color: C.cyan }}>→</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem' }}>{region?.icon}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{region?.name}</div>
                    </div>
                </div>
                
                {/* 派駐效果 */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '8px' }}>派駐效果</div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ 
                            flex: 1, 
                            padding: '8px', 
                            background: 'rgba(0,255,136,0.1)', 
                            borderRadius: '4px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: C.muted }}>在地分數</div>
                            <div style={{ fontSize: '1.1rem', color: C.pos }}>+{affinity}</div>
                        </div>
                        <div style={{ 
                            flex: 1, 
                            padding: '8px', 
                            background: 'rgba(255,208,0,0.1)', 
                            borderRadius: '4px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: C.muted }}>派駐成本</div>
                            <div style={{ fontSize: '1.1rem', color: C.warn }}>
                                {fmtCash(checkResult.cost?.cash || 0)}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* 區域特殊效果提示 */}
                {region?.special && (
                    <div style={{
                        padding: '8px',
                        background: 'rgba(0,245,255,0.1)',
                        borderRadius: '4px',
                        marginBottom: '16px',
                        fontSize: '0.8rem'
                    }}>
                        <span style={{ color: C.cyan }}>✨ 區域特效：</span>
                        <span style={{ color: C.muted }}>{region.special.description}</span>
                    </div>
                )}
                
                {/* 錯誤提示 */}
                {!checkResult.canDeploy && (
                    <div style={{
                        padding: '10px',
                        background: 'rgba(255,51,102,0.1)',
                        border: `1px solid ${C.neg}`,
                        borderRadius: '4px',
                        marginBottom: '16px',
                        color: C.neg,
                        fontSize: '0.85rem'
                    }}>
                        ⚠️ {checkResult.reason}
                    </div>
                )}
                
                {/* 按鈕 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: 'transparent',
                            border: `1px solid ${C.muted}`,
                            borderRadius: '6px',
                            color: C.muted,
                            cursor: 'pointer'
                        }}
                    >
                        取消
                    </button>
                    <button
                        onClick={() => checkResult.canDeploy && onConfirm()}
                        disabled={!checkResult.canDeploy}
                        style={{
                            flex: 2,
                            padding: '10px',
                            background: checkResult.canDeploy ? `linear-gradient(135deg, ${C.pos}44, ${C.pos}22)` : 'rgba(100,100,100,0.2)',
                            border: `2px solid ${checkResult.canDeploy ? C.pos : C.muted}`,
                            borderRadius: '6px',
                            color: checkResult.canDeploy ? C.pos : C.muted,
                            cursor: checkResult.canDeploy ? 'pointer' : 'not-allowed',
                            fontWeight: 600
                        }}
                    >
                        🚀 確認派駐 ({fmtCash(checkResult.cost?.cash || 0)})
                    </button>
                </div>
            </div>
        );
    }

    // ============================================
    // 主要派駐面板組件
    // ============================================
    
    function RegionAssetPanel({ player, regionId, onAction, onClose }) {
        const [selectedAsset, setSelectedAsset] = useState(null);
        const [activeTab, setActiveTab] = useState('all'); // 'all', 'business', 'functional'
        
        const RegionAssetInt = window.RegionAssetIntegration;
        const RegionConf = window.RegionConfig;
        
        // 獲取面板數據
        const panelData = useMemo(() => {
            if (!RegionAssetInt) return null;
            return RegionAssetInt.getDeploymentPanelData(player, regionId);
        }, [player, regionId]);
        
        if (!panelData || panelData.error) {
            return (
                <div style={{ ...cardStyle, textAlign: 'center', color: C.muted }}>
                    派駐系統載入中...
                </div>
            );
        }
        
        const region = regionId ? RegionConf?.getRegion(regionId) : null;
        
        // 過濾資產
        const filteredAssets = useMemo(() => {
            const all = [...(panelData.assets.business || []), ...(panelData.assets.functional || [])];
            if (activeTab === 'business') return panelData.assets.business || [];
            if (activeTab === 'functional') return panelData.assets.functional || [];
            return all;
        }, [panelData, activeTab]);
        
        // 處理派駐確認
        const handleConfirmDeploy = useCallback(() => {
            if (!selectedAsset || !regionId) return;
            
            onAction?.('deploy_asset', {
                assetId: selectedAsset.id,
                assetCategory: selectedAsset.category,
                regionId: regionId
            });
            
            setSelectedAsset(null);
        }, [selectedAsset, regionId, onAction]);
        
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '85vh',
                    background: 'rgba(15, 15, 25, 0.98)',
                    border: `1px solid ${C.cyan}44`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* 標題列 */}
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(0,245,255,0.1), transparent)',
                        borderBottom: `1px solid ${C.cyan}33`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                🌍 派駐資產 {region ? `至 ${region.icon} ${region.name}` : ''}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: C.muted }}>
                                可用 {panelData.summary.available} / 總計 {panelData.summary.total} 個單位
                                {regionId && panelData.region && (
                                    <span> | 已派駐 {panelData.region.deployed_count}/{panelData.config.max_per_region}</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: C.muted,
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                padding: '4px 8px'
                            }}
                        >
                            ×
                        </button>
                    </div>
                    
                    {/* Tab 切換 */}
                    <div style={{
                        display: 'flex',
                        padding: '8px 16px',
                        gap: '8px',
                        borderBottom: `1px solid ${C.cyan}22`
                    }}>
                        {[
                            { id: 'all', label: '全部', count: panelData.summary.total },
                            { id: 'business', label: '事業單位', count: panelData.assets.business?.length || 0, color: C.business },
                            { id: 'functional', label: '職能單位', count: panelData.assets.functional?.length || 0, color: C.functional }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '6px 12px',
                                    background: activeTab === tab.id ? `${tab.color || C.cyan}22` : 'transparent',
                                    border: `1px solid ${activeTab === tab.id ? (tab.color || C.cyan) : 'transparent'}`,
                                    borderRadius: '4px',
                                    color: activeTab === tab.id ? (tab.color || C.cyan) : C.muted,
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                    
                    {/* 資產列表 */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px'
                    }}>
                        {filteredAssets.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '40px', 
                                color: C.muted 
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
                                <div>尚無可派駐的單位</div>
                                <div style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                                    事業單位需升級為事業部/子公司<br/>
                                    職能單位需從設施升級解鎖
                                </div>
                            </div>
                        ) : (
                            filteredAssets.map(asset => (
                                <AssetCard
                                    key={`${asset.category}-${asset.id}`}
                                    asset={asset}
                                    targetRegionId={regionId}
                                    onSelect={setSelectedAsset}
                                    isSelected={selectedAsset?.id === asset.id && selectedAsset?.category === asset.category}
                                />
                            ))
                        )}
                        
                        {/* 派駐確認面板 */}
                        {selectedAsset && regionId && (
                            <DeploymentConfirmPanel
                                asset={selectedAsset}
                                regionId={regionId}
                                player={player}
                                onConfirm={handleConfirmDeploy}
                                onCancel={() => setSelectedAsset(null)}
                            />
                        )}
                    </div>
                    
                    {/* 已派駐資產預覽（如果有） */}
                    {regionId && panelData.region?.deployed_count > 0 && (
                        <div style={{
                            padding: '12px 16px',
                            borderTop: `1px solid ${C.cyan}22`,
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '8px' }}>
                                📍 已派駐至此區域 ({panelData.region.deployed_count})
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {panelData.region.deployed_assets?.map(asset => (
                                    <span key={`${asset.category}-${asset.id}`} style={{
                                        padding: '4px 8px',
                                        background: 'rgba(0,245,255,0.1)',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        color: C.cyan
                                    }}>
                                        {asset.icon} {asset.name}
                                    </span>
                                ))}
                            </div>
                            {panelData.region.effects?.revenue_bonus > 0 && (
                                <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: C.pos, 
                                    marginTop: '8px' 
                                }}>
                                    💰 區域收益加成：+{fmtCash(panelData.region.effects.revenue_bonus)}/季
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============================================
    // 已派駐資產摘要組件（供區域詳情使用）
    // ============================================
    
    function DeployedAssetsSummary({ player, regionId, onManage }) {
        const RegionAssetEng = window.RegionAssetEngine;
        
        const deployedAssets = useMemo(() => {
            if (!RegionAssetEng) return [];
            return RegionAssetEng.getDeployedAssetsInRegion(player, regionId);
        }, [player, regionId]);
        
        const effects = useMemo(() => {
            if (!RegionAssetEng) return null;
            return RegionAssetEng.calculateDeploymentEffects(player, regionId);
        }, [player, regionId]);
        
        if (deployedAssets.length === 0) {
            return (
                <div style={{
                    padding: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '8px' }}>
                        尚未派駐任何資產
                    </div>
                    <button
                        onClick={onManage}
                        style={{
                            padding: '8px 16px',
                            background: `linear-gradient(135deg, ${C.cyan}22, transparent)`,
                            border: `1px solid ${C.cyan}`,
                            borderRadius: '4px',
                            color: C.cyan,
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        + 派駐資產
                    </button>
                </div>
            );
        }
        
        return (
            <div style={{
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '6px'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '10px'
                }}>
                    <div style={{ fontSize: '0.8rem', color: C.muted }}>
                        📍 已派駐 ({deployedAssets.length})
                    </div>
                    <button
                        onClick={onManage}
                        style={{
                            padding: '4px 10px',
                            background: 'transparent',
                            border: `1px solid ${C.cyan}`,
                            borderRadius: '4px',
                            color: C.cyan,
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                        }}
                    >
                        管理
                    </button>
                </div>
                
                {/* 資產列表 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {deployedAssets.map(asset => (
                        <span key={`${asset.category}-${asset.id}`} style={{
                            padding: '4px 8px',
                            background: asset.category === 'business' ? `${C.business}15` : `${C.functional}15`,
                            border: `1px solid ${asset.category === 'business' ? C.business : C.functional}44`,
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: asset.category === 'business' ? C.business : C.functional
                        }}>
                            {asset.icon} {asset.name}
                        </span>
                    ))}
                </div>
                
                {/* 效果摘要 */}
                {effects && (
                    <div style={{ 
                        display: 'flex', 
                        gap: '12px',
                        fontSize: '0.75rem'
                    }}>
                        <span style={{ color: C.pos }}>
                            📊 在地 +{effects.local_score_bonus}
                        </span>
                        {effects.revenue_bonus > 0 && (
                            <span style={{ color: C.pos }}>
                                💰 收益 +{fmtCash(effects.revenue_bonus)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 全局暴露
    // ============================================
    window.RegionAssetPanel = RegionAssetPanel;
    window.DeployedAssetsSummary = DeployedAssetsSummary;
    // 使用更具體的名稱避免與 ui_assets.jsx 的 AssetCard 衝突
    window.RegionAssetCard = AssetCard;
    
    console.log('✓ Region Asset UI loaded');
    console.log('  - RegionAssetPanel: 派駐面板');
    console.log('  - DeployedAssetsSummary: 已派駐摘要');
    
})();
