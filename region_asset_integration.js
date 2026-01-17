// ============================================
// 區域資產整合模組 (Region Asset Integration)
// ============================================
// 設計原則：
//   1. 整合 RegionAssetEngine 與現有系統
//   2. 提供回合處理、區域評分的接口
//   3. 與 RegionEngine、processTurnUpdates 協作
// ============================================

(function() {
    'use strict';

    const RegionAssetIntegration = {
        
        // ==========================================
        // 初始化整合
        // ==========================================
        
        /**
         * 初始化區域資產系統（在 Tier4 解鎖時調用）
         * @param {Object} player - 玩家狀態
         * @returns {Object} 更新後的玩家狀態
         */
        initializeForTier4(player) {
            if (!player) return player;
            
            const RegionAssetEng = window.RegionAssetEngine;
            if (!RegionAssetEng) {
                console.warn('RegionAssetEngine not loaded');
                return player;
            }
            
            // 確保資產派駐狀態存在
            RegionAssetEng.ensureAssetDeploymentState(player);
            
            console.log('✓ Region Asset System initialized for Tier4');
            return player;
        },
        
        // ==========================================
        // 區域評分整合
        // ==========================================
        
        /**
         * 計算派駐資產對區域評分的加成
         * @param {Object} player - 玩家狀態
         * @param {string} regionId - 區域ID
         * @returns {Object} { local_bonus, detail }
         */
        calculateDeploymentScoreBonus(player, regionId) {
            const RegionAssetEng = window.RegionAssetEngine;
            if (!RegionAssetEng) return { local_bonus: 0, detail: [] };
            
            const effects = RegionAssetEng.calculateDeploymentEffects(player, regionId);
            
            return {
                local_bonus: effects.local_score_bonus,
                deployed_count: effects.deployed_count,
                detail: effects.special_effects
            };
        },
        
        /**
         * 增強版區域在地分數計算（整合派駐效果）
         * 設計為可被 RegionEngine.calculateLocalScore 調用
         * @param {Object} regionState - 區域狀態
         * @param {string} regionId - 區域ID
         * @param {Object} player - 玩家狀態
         * @returns {number} 增強後的在地分數
         */
        getEnhancedLocalScore(regionState, regionId, player) {
            const RegionEng = window.RegionEngine;
            if (!RegionEng) return 0;
            
            // 原始在地分數
            let baseScore = RegionEng.calculateLocalScore(regionState, regionId);
            
            // 加上派駐效果
            const deploymentBonus = this.calculateDeploymentScoreBonus(player, regionId);
            
            return baseScore + deploymentBonus.local_bonus;
        },
        
        // ==========================================
        // 回合處理整合
        // ==========================================
        
        /**
         * 處理每回合的派駐效果（在 processTurnUpdates 中調用）
         * @param {Object} player - 玩家狀態
         * @returns {Object} { revenue, messages, updatedPlayer }
         */
        processTurnDeploymentEffects(player) {
            const RegionAssetEng = window.RegionAssetEngine;
            if (!RegionAssetEng) {
                return { revenue: 0, messages: [], updatedPlayer: player };
            }
            
            // 確保派駐狀態存在
            RegionAssetEng.ensureAssetDeploymentState(player);
            
            // 處理派駐效果
            const result = RegionAssetEng.processTurnEnd(player);
            
            return {
                revenue: result.revenue_gained,
                messages: result.messages,
                effects_by_region: result.effects_by_region,
                updatedPlayer: player
            };
        },
        
        // ==========================================
        // Action 處理接口
        // ==========================================
        
        /**
         * 處理派駐相關 Action（供 game_handleAction 調用）
         * @param {Object} player - 玩家狀態
         * @param {string} actionType - 動作類型
         * @param {Object} actionData - 動作數據
         * @returns {Object} { success, message, newState }
         */
        handleDeploymentAction(player, actionType, actionData) {
            const RegionAssetEng = window.RegionAssetEngine;
            if (!RegionAssetEng) {
                return { success: false, message: '派駐系統未載入' };
            }
            
            switch (actionType) {
                case 'deploy_asset':
                    return RegionAssetEng.deployAsset(
                        player,
                        actionData.assetId,
                        actionData.assetCategory,
                        actionData.regionId
                    );
                    
                case 'recall_asset':
                    return RegionAssetEng.recallAsset(
                        player,
                        actionData.assetId,
                        actionData.assetCategory
                    );
                    
                default:
                    return { success: false, message: `未知的派駐動作: ${actionType}` };
            }
        },
        
        // ==========================================
        // UI 數據接口
        // ==========================================
        
        /**
         * 獲取區域派駐面板所需的完整數據
         * @param {Object} player - 玩家狀態
         * @param {string} regionId - 區域ID（可選，不提供則返回全局數據）
         * @returns {Object} UI 所需數據
         */
        getDeploymentPanelData(player, regionId = null) {
            const RegionAssetEng = window.RegionAssetEngine;
            const RegionAssetConf = window.RegionAssetConfig;
            const RegionConf = window.RegionConfig;
            
            if (!RegionAssetEng) {
                return { error: '系統未載入' };
            }
            
            // 獲取所有可派駐資產
            const assets = RegionAssetEng.getAllDeployableAssets(player);
            
            // 防禦性檢查：確保 assets 結構正確
            const businessAssets = Array.isArray(assets?.business) ? assets.business : [];
            const functionalAssets = Array.isArray(assets?.functional) ? assets.functional : [];
            
            // 為每個資產添加親和度信息（過濾掉無效資產）
            const enrichedAssets = {
                business: businessAssets
                    .filter(asset => asset && typeof asset === 'object')
                    .map(asset => this._enrichAssetData(asset, regionId)),
                functional: functionalAssets
                    .filter(asset => asset && typeof asset === 'object')
                    .map(asset => this._enrichAssetData(asset, regionId))
            };
            
            // 基礎數據
            const data = {
                assets: enrichedAssets,
                summary: assets.summary,
                config: {
                    max_per_region: RegionAssetConf?.SYSTEM?.max_assets_per_region || 5,
                    transfer_cooldown: RegionAssetConf?.SYSTEM?.transfer_cooldown_turns || 2
                }
            };
            
            // 如果指定了區域，添加區域特定數據
            if (regionId) {
                const region = RegionConf?.getRegion(regionId);
                const deployedInRegion = RegionAssetEng.getDeployedAssetsInRegion(player, regionId);
                const effects = RegionAssetEng.calculateDeploymentEffects(player, regionId);
                
                data.region = {
                    id: regionId,
                    name: region?.name,
                    icon: region?.icon,
                    special: region?.special,
                    deployed_assets: deployedInRegion,
                    deployed_count: deployedInRegion.length,
                    effects: effects,
                    can_add_more: deployedInRegion.length < data.config.max_per_region
                };
            }
            
            return data;
        },
        
        /**
         * 獲取資產詳情面板數據
         * @param {Object} player - 玩家狀態
         * @param {string} assetId - 資產ID
         * @param {string} assetCategory - 資產類別
         * @returns {Object} 資產詳情
         */
        getAssetDetailPanelData(player, assetId, assetCategory) {
            const RegionAssetEng = window.RegionAssetEngine;
            const RegionAssetConf = window.RegionAssetConfig;
            const RegionConf = window.RegionConfig;
            
            if (!RegionAssetEng) return null;
            
            const detail = RegionAssetEng.getAssetDetail(player, assetId, assetCategory);
            if (!detail) return null;
            
            // 增強區域推薦數據
            const recommendations = detail.recommended_regions.map(rec => {
                const region = rec.region;
                const canDeploy = RegionAssetEng.canDeployAsset(player, detail, rec.regionId);
                const affinityLevel = RegionAssetConf?.getAffinityLevel(rec.affinity);
                
                return {
                    ...rec,
                    region_name: region.name,
                    region_icon: region.icon,
                    region_special: region.special,
                    affinity_level: affinityLevel,
                    can_deploy: canDeploy.canDeploy,
                    deploy_reason: canDeploy.reason,
                    deploy_cost: canDeploy.cost
                };
            });
            
            return {
                ...detail,
                type_display: RegionAssetConf?.getAssetTypeDisplay(detail.type),
                status_display: RegionAssetConf?.DEPLOYMENT_STATUS_DISPLAY[detail.status],
                recommended_regions: recommendations
            };
        },
        
        /**
         * 內部：豐富資產數據
         * @private
         */
        _enrichAssetData(asset, targetRegionId) {
            // 防禦性檢查
            if (!asset || typeof asset !== 'object') {
                console.warn('_enrichAssetData: invalid asset', asset);
                return asset;
            }
            
            const RegionAssetEng = window.RegionAssetEngine;
            const RegionAssetConf = window.RegionAssetConfig;
            
            const enriched = { ...asset };
            
            // 添加顯示配置（使用可選鏈確保安全）
            enriched.type_display = RegionAssetConf?.getAssetTypeDisplay?.(asset.type) || null;
            enriched.status_display = RegionAssetConf?.DEPLOYMENT_STATUS_DISPLAY?.[asset.status] || null;
            
            // 如果指定了目標區域，添加該區域的親和度
            if (targetRegionId && RegionAssetEng) {
                const affinity = RegionAssetEng.getAssetRegionAffinity(asset, targetRegionId);
                enriched.target_affinity = affinity;
                enriched.affinity_level = RegionAssetConf?.getAffinityLevel?.(affinity) || null;
            }
            
            // 添加最佳推薦區域（親和度最高的）
            if (RegionAssetEng) {
                const recommendations = RegionAssetEng.getRecommendedRegions(asset);
                if (recommendations && recommendations.length > 0 && recommendations[0].region) {
                    enriched.best_region = {
                        id: recommendations[0].regionId,
                        name: recommendations[0].region.name,
                        icon: recommendations[0].region.icon,
                        affinity: recommendations[0].affinity
                    };
                }
            }
            
            return enriched;
        },
        
        // ==========================================
        // 與現有系統整合的 Hook
        // ==========================================
        
        /**
         * 整合到 RegionEngine（增強 calculateLocalScore）
         */
        integrateWithRegionEngine() {
            const RegionEng = window.RegionEngine;
            if (!RegionEng) {
                console.warn('RegionEngine not found, skipping integration');
                return;
            }
            
            // 保存原始方法
            const originalCalculateLocalScore = RegionEng.calculateLocalScore.bind(RegionEng);
            
            // 覆寫方法，加入派駐加成
            RegionEng.calculateLocalScore = function(regionState, regionId, player) {
                // 調用原始方法
                let baseScore = originalCalculateLocalScore(regionState, regionId);
                
                // 如果有 player 參數，計算派駐加成
                if (player && window.RegionAssetEngine) {
                    const deploymentBonus = window.RegionAssetIntegration.calculateDeploymentScoreBonus(player, regionId);
                    baseScore += deploymentBonus.local_bonus;
                }
                
                return Math.min(100, baseScore);
            };
            
            console.log('✓ RegionAssetIntegration hooked into RegionEngine.calculateLocalScore');
        },
        
        /**
         * 整合到回合處理系統
         * 返回一個可被 processTurnUpdates 調用的處理函數
         */
        getTurnProcessor() {
            return (player) => {
                return this.processTurnDeploymentEffects(player);
            };
        }
    };
    
    // ==========================================
    // 自動整合
    // ==========================================
    
    // 延遲執行，確保其他模組已載入
    setTimeout(() => {
        RegionAssetIntegration.integrateWithRegionEngine();
    }, 100);
    
    // ==========================================
    // 全局暴露
    // ==========================================
    window.RegionAssetIntegration = RegionAssetIntegration;
    
    console.log('✓ Region Asset Integration loaded');
    console.log('  - 區域評分整合：calculateDeploymentScoreBonus');
    console.log('  - 回合處理整合：processTurnDeploymentEffects');
    console.log('  - Action 處理：handleDeploymentAction');
    
})();