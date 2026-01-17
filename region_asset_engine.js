// ============================================
// 區域資產派駐引擎 (Region Asset Engine)
// ============================================
// 設計原則：
//   1. 純函數式設計，僅接收數據參數/返回計算結果
//   2. 統一管理事業單位(Business)與職能單位(Functional)的海外派駐
//   3. 與 RegionEngine、ProductLineEngine、StateMigrationEngine 協作
// ============================================
// 資產類型：
//   - business_division: 事業部（來自產品線升級）
//   - business_subsidiary: 事業子公司（來自產品線升級）
//   - functional_dept: 職能部（來自設施升級）
//   - functional_subsidiary: 職能子公司（來自職能部升級）
// ============================================

(function() {
    'use strict';

    const RegionAssetEngine = {
        
        // ==========================================
        // 常量定義
        // ==========================================
        
        ASSET_CATEGORIES: {
            BUSINESS: 'business',
            FUNCTIONAL: 'functional'
        },
        
        ASSET_TYPES: {
            BUSINESS_DIVISION: 'business_division',
            BUSINESS_SUBSIDIARY: 'business_subsidiary',
            FUNCTIONAL_DEPT: 'functional_dept',
            FUNCTIONAL_SUBSIDIARY: 'functional_subsidiary'
        },
        
        // 派駐狀態
        DEPLOYMENT_STATUS: {
            AVAILABLE: 'available',      // 可派駐
            DEPLOYED: 'deployed',        // 已派駐
            IN_TRANSIT: 'in_transit',    // 轉移中
            LOCKED: 'locked'             // 鎖定（不可派駐）
        },
        
        // 派駐配置
        DEPLOYMENT_CONFIG: {
            // 派駐成本（依資產類型）
            deployment_cost: {
                business_division: { cash: 30 },
                business_subsidiary: { cash: 50 },
                functional_dept: { cash: 20 },
                functional_subsidiary: { cash: 40 }
            },
            // 撤回成本（派駐成本的一半）
            recall_cost_ratio: 0.5,
            // 轉移冷卻（回合數）
            transfer_cooldown: 2,
            // 每區域最大派駐數
            max_assets_per_region: 5
        },
        
        // ==========================================
        // 初始化
        // ==========================================
        
        /**
         * 創建區域資產派駐的初始狀態
         * @returns {Object} 初始狀態
         */
        createInitialState() {
            return {
                // 職能單位派駐記錄 { assetId: { regionId, deployed_turn, status } }
                functional_deployments: {},
                // 派駐歷史記錄
                deployment_history: [],
                // 轉移冷卻 { assetId: cooldown_remaining }
                transfer_cooldowns: {}
            };
        },
        
        /**
         * 確保玩家狀態中有資產派駐相關欄位
         * @param {Object} player - 玩家狀態
         * @returns {Object} 更新後的玩家狀態
         */
        ensureAssetDeploymentState(player) {
            if (!player.asset_deployment_state) {
                player.asset_deployment_state = this.createInitialState();
            }
            return player;
        },
        
        // ==========================================
        // 可派駐資產查詢
        // ==========================================
        
        /**
         * 獲取所有可派駐的事業單位
         * @param {Object} player - 玩家狀態
         * @returns {Array} 可派駐的事業單位列表
         */
        getDeployableBusinessUnits(player) {
            const ProductLineEng = window.ProductLineEngine;
            if (!ProductLineEng) return [];
            
            const units = ProductLineEng.getAllProductLineStates(player);
            const deployable = [];
            
            Object.entries(units).forEach(([lineName, unitState]) => {
                const stage = ProductLineEng.normalizeStageId(unitState.stage);
                
                // 只有事業部或事業子公司可派駐
                if (stage !== 'business_division' && stage !== 'business_subsidiary') {
                    return;
                }
                
                // 檢查是否已派駐
                const isDeployed = unitState.region_deployed !== null && unitState.region_deployed !== undefined;
                
                deployable.push({
                    id: lineName,
                    name: lineName,
                    category: this.ASSET_CATEGORIES.BUSINESS,
                    type: stage,
                    icon: stage === 'business_subsidiary' ? '🏛️' : '🏢',
                    experience: unitState.experience || 0,
                    maxTier: unitState.maxTier || 1,
                    productCount: unitState.products?.length || 0,
                    route: unitState.route || player.route,
                    status: isDeployed ? this.DEPLOYMENT_STATUS.DEPLOYED : this.DEPLOYMENT_STATUS.AVAILABLE,
                    deployed_region: unitState.region_deployed || null
                });
            });
            
            return deployable;
        },
        
        /**
         * 獲取所有可派駐的職能單位
         * @param {Object} player - 玩家狀態
         * @returns {Array} 可派駐的職能單位列表
         */
        getDeployableFunctionalUnits(player) {
            const StateMigration = window.StateMigrationEngine;
            const AssetConfig = window.AssetCardConfig;
            if (!StateMigration || !AssetConfig) return [];
            
            this.ensureAssetDeploymentState(player);
            const deployments = player.asset_deployment_state.functional_deployments;
            const deployable = [];
            
            // 職能部
            const depts = StateMigration.getFunctionalDepts(player);
            depts.forEach(deptId => {
                const deptConfig = AssetConfig.FUNCTIONAL_DEPTS?.[deptId];
                if (!deptConfig) return;
                
                const deployment = deployments[deptId];
                const isDeployed = deployment && deployment.status === this.DEPLOYMENT_STATUS.DEPLOYED;
                const mastery = StateMigration.getFunctionalDeptMastery(player, deptId);
                
                deployable.push({
                    id: deptId,
                    name: deptConfig.name,
                    category: this.ASSET_CATEGORIES.FUNCTIONAL,
                    type: this.ASSET_TYPES.FUNCTIONAL_DEPT,
                    icon: deptConfig.icon,
                    mastery: mastery,
                    base_revenue: deptConfig.base_revenue || 0,
                    evolves_to: deptConfig.evolves_to,
                    status: isDeployed ? this.DEPLOYMENT_STATUS.DEPLOYED : this.DEPLOYMENT_STATUS.AVAILABLE,
                    deployed_region: deployment?.regionId || null
                });
            });
            
            // 職能子公司
            const subsidiaries = StateMigration.getFunctionalSubsidiaries(player);
            subsidiaries.forEach(subId => {
                const subConfig = AssetConfig.FUNCTIONAL_SUBSIDIARIES?.[subId];
                if (!subConfig) return;
                
                const deployment = deployments[subId];
                const isDeployed = deployment && deployment.status === this.DEPLOYMENT_STATUS.DEPLOYED;
                
                deployable.push({
                    id: subId,
                    name: subConfig.name,
                    category: this.ASSET_CATEGORIES.FUNCTIONAL,
                    type: this.ASSET_TYPES.FUNCTIONAL_SUBSIDIARY,
                    icon: subConfig.icon,
                    base_revenue: subConfig.base_revenue || 0,
                    revenue_mult: subConfig.revenue_mult || 1,
                    from_dept: subConfig.from_dept,
                    status: isDeployed ? this.DEPLOYMENT_STATUS.DEPLOYED : this.DEPLOYMENT_STATUS.AVAILABLE,
                    deployed_region: deployment?.regionId || null
                });
            });
            
            return deployable;
        },
        
        /**
         * 獲取所有可派駐資產（統一接口）
         * @param {Object} player - 玩家狀態
         * @returns {Object} { business: [...], functional: [...], all: [...] }
         */
        getAllDeployableAssets(player) {
            const business = this.getDeployableBusinessUnits(player);
            const functional = this.getDeployableFunctionalUnits(player);
            
            return {
                business,
                functional,
                all: [...business, ...functional],
                summary: {
                    total: business.length + functional.length,
                    available: [...business, ...functional].filter(a => a.status === this.DEPLOYMENT_STATUS.AVAILABLE).length,
                    deployed: [...business, ...functional].filter(a => a.status === this.DEPLOYMENT_STATUS.DEPLOYED).length
                }
            };
        },
        
        /**
         * 獲取特定區域已派駐的資產
         * @param {Object} player - 玩家狀態
         * @param {string} regionId - 區域ID
         * @returns {Array} 已派駐資產列表
         */
        getDeployedAssetsInRegion(player, regionId) {
            const allAssets = this.getAllDeployableAssets(player);
            return allAssets.all.filter(asset => 
                asset.status === this.DEPLOYMENT_STATUS.DEPLOYED && 
                asset.deployed_region === regionId
            );
        },
        
        // ==========================================
        // 親和度計算
        // ==========================================
        
        /**
         * 計算資產對特定區域的親和度
         * @param {Object} asset - 資產對象
         * @param {string} regionId - 區域ID
         * @returns {number} 親和度分數
         */
        getAssetRegionAffinity(asset, regionId) {
            const RegionConf = window.RegionConfig;
            if (!RegionConf) return 0;
            
            let affinity = 0;
            
            if (asset.category === this.ASSET_CATEGORIES.BUSINESS) {
                // 事業單位：根據技術路線查詢親和度
                affinity = RegionConf.getBusinessAffinity(asset.route, regionId);
            } else if (asset.category === this.ASSET_CATEGORIES.FUNCTIONAL) {
                // 職能單位：根據類型查詢親和度
                if (asset.type === this.ASSET_TYPES.FUNCTIONAL_DEPT) {
                    affinity = RegionConf.getFunctionalAffinity('depts', asset.id, regionId);
                } else if (asset.type === this.ASSET_TYPES.FUNCTIONAL_SUBSIDIARY) {
                    affinity = RegionConf.getFunctionalAffinity('subsidiaries', asset.id, regionId);
                }
            }
            
            return affinity;
        },
        
        /**
         * 獲取資產對所有區域的親和度
         * @param {Object} asset - 資產對象
         * @returns {Object} { regionId: affinity, ... }
         */
        getAssetAllRegionAffinities(asset) {
            const RegionConf = window.RegionConfig;
            if (!RegionConf) return {};
            
            const affinities = {};
            const regions = RegionConf.getExpansionRegions();
            
            regions.forEach(region => {
                affinities[region.id] = this.getAssetRegionAffinity(asset, region.id);
            });
            
            return affinities;
        },
        
        /**
         * 獲取最適合派駐的區域（依親和度排序）
         * @param {Object} asset - 資產對象
         * @returns {Array} 排序後的區域列表 [{ regionId, affinity, region }, ...]
         */
        getRecommendedRegions(asset) {
            const RegionConf = window.RegionConfig;
            if (!RegionConf) return [];
            
            const affinities = this.getAssetAllRegionAffinities(asset);
            const recommendations = [];
            
            Object.entries(affinities).forEach(([regionId, affinity]) => {
                const region = RegionConf.getRegion(regionId);
                if (region && !region.is_home) {
                    recommendations.push({
                        regionId,
                        affinity,
                        region
                    });
                }
            });
            
            // 按親和度降序排列
            recommendations.sort((a, b) => b.affinity - a.affinity);
            
            return recommendations;
        },
        
        // ==========================================
        // 派駐檢查
        // ==========================================
        
        /**
         * 檢查是否可以派駐資產到指定區域
         * @param {Object} player - 玩家狀態
         * @param {Object} asset - 資產對象
         * @param {string} regionId - 目標區域ID
         * @returns {Object} { canDeploy, reason, cost }
         */
        canDeployAsset(player, asset, regionId) {
            const RegionConf = window.RegionConfig;
            const RegionEng = window.RegionEngine;
            
            if (!RegionConf || !RegionEng) {
                return { canDeploy: false, reason: '系統未載入' };
            }
            
            // 檢查區域是否存在
            const region = RegionConf.getRegion(regionId);
            if (!region) {
                return { canDeploy: false, reason: '區域不存在' };
            }
            
            // 不能派駐到母國
            if (region.is_home) {
                return { canDeploy: false, reason: '無法派駐到母國區域' };
            }
            
            // 檢查區域是否已解鎖（有辦公室）
            const regionState = player.region_system?.regions?.[regionId];
            if (!regionState || !regionState.unlocked || regionState.offices.length === 0) {
                return { canDeploy: false, reason: '尚未在該區域建立據點' };
            }
            
            // 檢查資產是否可用
            if (asset.status === this.DEPLOYMENT_STATUS.DEPLOYED) {
                return { canDeploy: false, reason: '該資產已派駐至其他區域' };
            }
            
            // 檢查轉移冷卻
            this.ensureAssetDeploymentState(player);
            const cooldown = player.asset_deployment_state.transfer_cooldowns[asset.id];
            if (cooldown && cooldown > 0) {
                return { canDeploy: false, reason: `轉移冷卻中（剩餘 ${cooldown} 回合）` };
            }
            
            // 檢查區域派駐數量上限
            const deployedInRegion = this.getDeployedAssetsInRegion(player, regionId);
            if (deployedInRegion.length >= this.DEPLOYMENT_CONFIG.max_assets_per_region) {
                return { canDeploy: false, reason: `該區域已達派駐上限（${this.DEPLOYMENT_CONFIG.max_assets_per_region}）` };
            }
            
            // 計算派駐成本
            const costConfig = this.DEPLOYMENT_CONFIG.deployment_cost[asset.type] || { cash: 25 };
            
            // 檢查現金是否足夠
            if (player.cash < costConfig.cash) {
                return { canDeploy: false, reason: `現金不足，需要 $${costConfig.cash}M`, cost: costConfig };
            }
            
            return { 
                canDeploy: true, 
                reason: null, 
                cost: costConfig,
                affinity: this.getAssetRegionAffinity(asset, regionId)
            };
        },
        
        // ==========================================
        // 派駐執行
        // ==========================================
        
        /**
         * 執行資產派駐
         * @param {Object} player - 玩家狀態
         * @param {string} assetId - 資產ID
         * @param {string} assetCategory - 資產類別 ('business' 或 'functional')
         * @param {string} regionId - 目標區域ID
         * @returns {Object} { success, message, newState }
         */
        deployAsset(player, assetId, assetCategory, regionId) {
            // 獲取資產信息
            const allAssets = this.getAllDeployableAssets(player);
            const asset = allAssets.all.find(a => a.id === assetId && a.category === assetCategory);
            
            if (!asset) {
                return { success: false, message: '找不到指定資產' };
            }
            
            // 檢查是否可派駐
            const checkResult = this.canDeployAsset(player, asset, regionId);
            if (!checkResult.canDeploy) {
                return { success: false, message: checkResult.reason };
            }
            
            // 創建新狀態
            const newPlayer = JSON.parse(JSON.stringify(player));
            this.ensureAssetDeploymentState(newPlayer);
            
            // 扣除成本
            newPlayer.cash -= checkResult.cost.cash;
            
            // 更新派駐狀態
            if (assetCategory === this.ASSET_CATEGORIES.BUSINESS) {
                // 事業單位：更新 business_units
                if (newPlayer.business_units && newPlayer.business_units[assetId]) {
                    newPlayer.business_units[assetId].region_deployed = regionId;
                }
                // 同步到 product_state.product_lines
                if (newPlayer.product_state?.product_lines?.[assetId]) {
                    newPlayer.product_state.product_lines[assetId].region_deployed = regionId;
                }
            } else {
                // 職能單位：更新 functional_deployments
                newPlayer.asset_deployment_state.functional_deployments[assetId] = {
                    regionId: regionId,
                    deployed_turn: player.turn_count || 1,
                    status: this.DEPLOYMENT_STATUS.DEPLOYED
                };
            }
            
            // 更新區域的 assigned_assets
            if (!newPlayer.region_system) {
                newPlayer.region_system = window.RegionEngine?.createInitialState() || {};
            }
            if (!newPlayer.region_system.regions[regionId].assigned_assets) {
                newPlayer.region_system.regions[regionId].assigned_assets = [];
            }
            newPlayer.region_system.regions[regionId].assigned_assets.push({
                id: assetId,
                category: assetCategory,
                type: asset.type,
                deployed_turn: player.turn_count || 1
            });
            
            // 記錄歷史
            newPlayer.asset_deployment_state.deployment_history.push({
                action: 'deploy',
                assetId,
                assetCategory,
                regionId,
                turn: player.turn_count || 1,
                cost: checkResult.cost.cash
            });
            
            const RegionConf = window.RegionConfig;
            const region = RegionConf?.getRegion(regionId);
            const regionName = region ? `${region.icon} ${region.name}` : regionId;
            
            return {
                success: true,
                message: `✅ 已派駐「${asset.name}」至 ${regionName}（親和度 +${checkResult.affinity}）`,
                newState: newPlayer,
                affinity: checkResult.affinity
            };
        },
        
        /**
         * 撤回已派駐的資產
         * @param {Object} player - 玩家狀態
         * @param {string} assetId - 資產ID
         * @param {string} assetCategory - 資產類別
         * @returns {Object} { success, message, newState }
         */
        recallAsset(player, assetId, assetCategory) {
            // 獲取資產信息
            const allAssets = this.getAllDeployableAssets(player);
            const asset = allAssets.all.find(a => a.id === assetId && a.category === assetCategory);
            
            if (!asset) {
                return { success: false, message: '找不到指定資產' };
            }
            
            if (asset.status !== this.DEPLOYMENT_STATUS.DEPLOYED) {
                return { success: false, message: '該資產未派駐' };
            }
            
            const regionId = asset.deployed_region;
            
            // 計算撤回成本
            const baseCost = this.DEPLOYMENT_CONFIG.deployment_cost[asset.type]?.cash || 25;
            const recallCost = Math.floor(baseCost * this.DEPLOYMENT_CONFIG.recall_cost_ratio);
            
            if (player.cash < recallCost) {
                return { success: false, message: `現金不足，撤回需要 $${recallCost}M` };
            }
            
            // 創建新狀態
            const newPlayer = JSON.parse(JSON.stringify(player));
            this.ensureAssetDeploymentState(newPlayer);
            
            // 扣除成本
            newPlayer.cash -= recallCost;
            
            // 設置轉移冷卻
            newPlayer.asset_deployment_state.transfer_cooldowns[assetId] = this.DEPLOYMENT_CONFIG.transfer_cooldown;
            
            // 清除派駐狀態
            if (assetCategory === this.ASSET_CATEGORIES.BUSINESS) {
                if (newPlayer.business_units?.[assetId]) {
                    newPlayer.business_units[assetId].region_deployed = null;
                }
                if (newPlayer.product_state?.product_lines?.[assetId]) {
                    newPlayer.product_state.product_lines[assetId].region_deployed = null;
                }
            } else {
                delete newPlayer.asset_deployment_state.functional_deployments[assetId];
            }
            
            // 從區域的 assigned_assets 移除
            if (newPlayer.region_system?.regions?.[regionId]?.assigned_assets) {
                newPlayer.region_system.regions[regionId].assigned_assets = 
                    newPlayer.region_system.regions[regionId].assigned_assets.filter(
                        a => !(a.id === assetId && a.category === assetCategory)
                    );
            }
            
            // 記錄歷史
            newPlayer.asset_deployment_state.deployment_history.push({
                action: 'recall',
                assetId,
                assetCategory,
                from_regionId: regionId,
                turn: player.turn_count || 1,
                cost: recallCost
            });
            
            return {
                success: true,
                message: `📦 已撤回「${asset.name}」（冷卻 ${this.DEPLOYMENT_CONFIG.transfer_cooldown} 回合）`,
                newState: newPlayer
            };
        },
        
        // ==========================================
        // 派駐效果計算
        // ==========================================
        
        /**
         * 計算區域的派駐效果
         * @param {Object} player - 玩家狀態
         * @param {string} regionId - 區域ID
         * @returns {Object} { local_score_bonus, revenue_bonus, special_effects }
         */
        calculateDeploymentEffects(player, regionId) {
            const deployedAssets = this.getDeployedAssetsInRegion(player, regionId);
            
            let totalAffinityBonus = 0;
            let totalRevenueBonus = 0;
            const specialEffects = [];
            
            deployedAssets.forEach(asset => {
                const affinity = this.getAssetRegionAffinity(asset, regionId);
                totalAffinityBonus += affinity;
                
                // 計算收益加成
                if (asset.base_revenue) {
                    // 區域效果：親和度越高收益越高
                    const revenueMultiplier = 1 + (affinity / 100);
                    totalRevenueBonus += asset.base_revenue * revenueMultiplier * 0.3; // 30% 歸於海外營運
                }
                
                // 特殊效果（依據區域特性）
                const RegionConf = window.RegionConfig;
                const region = RegionConf?.getRegion(regionId);
                if (region?.special) {
                    specialEffects.push({
                        asset: asset.name,
                        region_special: region.special.type,
                        description: region.special.description
                    });
                }
            });
            
            return {
                deployed_count: deployedAssets.length,
                local_score_bonus: totalAffinityBonus,
                revenue_bonus: Math.floor(totalRevenueBonus),
                special_effects: specialEffects
            };
        },
        
        /**
         * 計算所有區域的派駐效果總和
         * @param {Object} player - 玩家狀態
         * @returns {Object} { total_revenue, by_region: { regionId: effects } }
         */
        calculateAllDeploymentEffects(player) {
            const RegionConf = window.RegionConfig;
            if (!RegionConf) return { total_revenue: 0, by_region: {} };
            
            let totalRevenue = 0;
            const byRegion = {};
            
            Object.keys(RegionConf.REGIONS).forEach(regionId => {
                const effects = this.calculateDeploymentEffects(player, regionId);
                if (effects.deployed_count > 0) {
                    byRegion[regionId] = effects;
                    totalRevenue += effects.revenue_bonus;
                }
            });
            
            return { total_revenue: totalRevenue, by_region: byRegion };
        },
        
        // ==========================================
        // 回合處理
        // ==========================================
        
        /**
         * 處理回合結束時的派駐狀態更新
         * @param {Object} player - 玩家狀態
         * @returns {Object} { revenue_gained, messages }
         */
        processTurnEnd(player) {
            this.ensureAssetDeploymentState(player);
            const messages = [];
            
            // 更新轉移冷卻
            const cooldowns = player.asset_deployment_state.transfer_cooldowns;
            Object.keys(cooldowns).forEach(assetId => {
                if (cooldowns[assetId] > 0) {
                    cooldowns[assetId]--;
                    if (cooldowns[assetId] === 0) {
                        delete cooldowns[assetId];
                    }
                }
            });
            
            // 計算派駐收益
            const effects = this.calculateAllDeploymentEffects(player);
            
            if (effects.total_revenue > 0) {
                messages.push({
                    text: `🌍 海外派駐收益：+$${effects.total_revenue}M`,
                    type: 'revenue'
                });
            }
            
            return {
                revenue_gained: effects.total_revenue,
                effects_by_region: effects.by_region,
                messages
            };
        },
        
        // ==========================================
        // 摘要與查詢
        // ==========================================
        
        /**
         * 獲取派駐系統摘要（供 UI 顯示）
         * @param {Object} player - 玩家狀態
         * @returns {Object} 摘要信息
         */
        getDeploymentSummary(player) {
            const assets = this.getAllDeployableAssets(player);
            const effects = this.calculateAllDeploymentEffects(player);
            
            return {
                // 資產統計
                total_assets: assets.summary.total,
                available_assets: assets.summary.available,
                deployed_assets: assets.summary.deployed,
                
                // 分類統計
                business_units: {
                    total: assets.business.length,
                    deployed: assets.business.filter(a => a.status === this.DEPLOYMENT_STATUS.DEPLOYED).length
                },
                functional_units: {
                    total: assets.functional.length,
                    deployed: assets.functional.filter(a => a.status === this.DEPLOYMENT_STATUS.DEPLOYED).length
                },
                
                // 效益統計
                total_revenue_bonus: effects.total_revenue,
                regions_with_assets: Object.keys(effects.by_region).length,
                
                // 詳細資產列表
                assets: assets
            };
        },
        
        /**
         * 獲取特定資產的詳細信息（供 UI 顯示）
         * @param {Object} player - 玩家狀態
         * @param {string} assetId - 資產ID
         * @param {string} assetCategory - 資產類別
         * @returns {Object|null} 資產詳細信息
         */
        getAssetDetail(player, assetId, assetCategory) {
            const assets = this.getAllDeployableAssets(player);
            const asset = assets.all.find(a => a.id === assetId && a.category === assetCategory);
            
            if (!asset) return null;
            
            return {
                ...asset,
                affinities: this.getAssetAllRegionAffinities(asset),
                recommended_regions: this.getRecommendedRegions(asset),
                deployment_cost: this.DEPLOYMENT_CONFIG.deployment_cost[asset.type]
            };
        }
    };
    
    // ==========================================
    // 全局暴露
    // ==========================================
    window.RegionAssetEngine = RegionAssetEngine;
    
    console.log('✓ Region Asset Engine loaded');
    console.log('  - 事業單位派駐：business_division, business_subsidiary');
    console.log('  - 職能單位派駐：functional_dept, functional_subsidiary');
    
})();
