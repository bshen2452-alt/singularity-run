// ============================================
// 設施升級系統整合補丁 (facility_upgrade_integration.js)
// ============================================
// 功能：
//   1. 整合 FacilityUpgradeEngine 到遊戲主循環（僅研發部分）
//   2. 連接 asset_card_engine 與新升級系統
//   3. 整合 renewable 到 energy_products
//   4. 施工相關邏輯由 space_construction 負責
// ============================================

(function() {
    'use strict';

    const FacilityUpgradeIntegration = {
        
        // ==========================================
        // 初始化整合
        // ==========================================
        
        init() {
            if (!window.FACILITY_UPGRADE_PRODUCTS_CONFIG || !window.FacilityUpgradeEngine) {
                console.warn('FacilityUpgradeIntegration: 等待配置載入...');
                return false;
            }
            
            this.extendAssetCardEngine();
            this.extendProcessTurnUpdates();
            this.integrateRenewableToEnergyProducts();
            
            console.log('✓ Facility Upgrade Integration initialized (Research Only)');
            return true;
        },
        
        // ==========================================
        // 擴展 AssetCardEngine
        // ==========================================
        
        extendAssetCardEngine() {
            const AssetCardEngine = window.AssetCardEngine;
            if (!AssetCardEngine) return;
            
            const originalCanUpgrade = AssetCardEngine.canUpgrade;
            const originalPerformUpgrade = AssetCardEngine.performUpgrade;
            
            // 替換 canUpgrade：重定向到新系統
            AssetCardEngine.canUpgrade = function(player, assetType, pathId) {
                const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
                const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
                
                const currentLevel = this.getUpgradeLevel(player, assetType, pathId);
                const targetLevel = currentLevel + 1;
                const productId = `${pathId}_lv${targetLevel}`;
                
                if (config && config.getUpgradeProduct(productId)) {
                    const result = FacilityUpgradeEngine.canUnlockUpgrade(player, productId);
                    
                    // 檢查是否已在研發中或已完成研發
                    const facilityState = player.facility_upgrade_state;
                    const productState = facilityState?.upgrade_products?.[productId];
                    if (productState) {
                        const status = productState.status;
                        if (status === 'researching') {
                            return { 
                                canUpgrade: false, 
                                reason: '研發中', 
                                inProgress: true, 
                                status, 
                                cost: result.cost,
                                productState,
                                useNewSystem: true,
                                productId
                            };
                        }
                        if (status === 'research_completed') {
                            return { 
                                canUpgrade: false, 
                                reason: '研發完成，請前往設施進行施工', 
                                researchCompleted: true, 
                                status, 
                                cost: result.cost,
                                productState,
                                useNewSystem: true,
                                productId
                            };
                        }
                        if (status === 'applied') {
                            return { 
                                canUpgrade: false, 
                                reason: '已應用', 
                                completed: true, 
                                status, 
                                cost: result.cost,
                                useNewSystem: true,
                                productId
                            };
                        }
                    }
                    
                    return {
                        canUpgrade: result.canUnlock,
                        reason: result.reason,
                        useNewSystem: true,
                        productId: productId,
                        cost: result.cost
                    };
                }
                
                return originalCanUpgrade.call(this, player, assetType, pathId);
            };
            
            // 替換 performUpgrade：重定向到新系統（開始研發）
            AssetCardEngine.performUpgrade = function(player, assetType, pathId) {
                const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
                const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
                
                const currentLevel = this.getUpgradeLevel(player, assetType, pathId);
                const targetLevel = currentLevel + 1;
                const productId = `${pathId}_lv${targetLevel}`;
                
                if (config && config.getUpgradeProduct(productId)) {
                    return FacilityUpgradeEngine.startResearch(player, productId);
                }
                
                return originalPerformUpgrade.call(this, player, assetType, pathId);
            };
            
            // 新增方法
            AssetCardEngine.getFacilityUpgradeSummary = function(player, assetType) {
                const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
                if (FacilityUpgradeEngine) {
                    return FacilityUpgradeEngine.getUpgradeSummary(player, assetType);
                }
                return this.getUpgradeSummary(player, assetType);
            };
        },
        
        // ==========================================
        // 擴展 processTurnUpdates（僅研發進度）
        // ==========================================
        
        extendProcessTurnUpdates() {
            if (!window._facilityUpgradeHooks) {
                window._facilityUpgradeHooks = [];
            }
            
            window._facilityUpgradeHooks.push({
                name: 'facility_upgrade_research',
                execute(player) {
                    const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
                    if (!FacilityUpgradeEngine) return player;
                    
                    const facilityState = player.facility_upgrade_state;
                    if (!facilityState) return player;
                    
                    let newPlayer = JSON.parse(JSON.stringify(player));
                    const messages = [];
                    
                    const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
                    for (const [productId, state] of Object.entries(facilityState.upgrade_products || {})) {
                        if (state.status === 'researching') {
                            const result = FacilityUpgradeEngine.processResearchProgress(
                                newPlayer, 
                                productId,
                                state.assigned_senior || 0,
                                state.assigned_turing || 0
                            );
                            
                            if (result.success) {
                                newPlayer = result.newState;
                                if (result.research_completed) {
                                    messages.push(result.message);
                                }
                            }
                        }
                    }
                    
                    if (messages.length > 0) {
                        if (!newPlayer.turn_log) newPlayer.turn_log = [];
                        for (const msg of messages) {
                            newPlayer.turn_log.push({
                                type: 'facility_upgrade',
                                message: msg,
                                turn: player.turn_count
                            });
                        }
                    }
                    
                    return newPlayer;
                }
            });
        },
        
        // ==========================================
        // Renewable 整合到 Energy Products
        // ==========================================
        
        integrateRenewableToEnergyProducts() {
            const EnergyProductsConfig = window.ENERGY_PRODUCTS_CONFIG;
            if (!EnergyProductsConfig) return;
            
            if (EnergyProductsConfig.PRODUCTS) {
                const renewableFarm = EnergyProductsConfig.PRODUCTS.renewable_farm;
                if (renewableFarm) {
                    renewableFarm.facility_prerequisite = {
                        type: 'power',
                        path: 'renewable',
                        min_level: 1,
                        description: '需先研發基礎多元能源技術'
                    };
                }
            }
            
            console.log('✓ Renewable integrated to Energy Products');
        },
        
        // ==========================================
        // 遊戲動作處理器
        // ==========================================
        
        handleStartResearch(gameState, productId) {
            const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
            if (!FacilityUpgradeEngine) {
                return { success: false, message: '系統未初始化' };
            }
            
            const result = FacilityUpgradeEngine.startResearch(gameState.player, productId);
            
            if (result.success) {
                return {
                    success: true,
                    newState: {
                        ...gameState,
                        player: result.newState
                    },
                    message: result.message,
                    actionType: 'START_FACILITY_RESEARCH'
                };
            }
            
            return result;
        },
        
        handleAssignResearchTalent(gameState, productId, seniorCount, turingCount) {
            const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
            if (!FacilityUpgradeEngine) {
                return { success: false, message: '系統未初始化' };
            }
            
            const newPlayer = JSON.parse(JSON.stringify(gameState.player));
            const productState = newPlayer.facility_upgrade_state?.upgrade_products?.[productId];
            
            if (!productState) {
                return { success: false, message: '項目不存在' };
            }
            
            productState.assigned_senior = seniorCount;
            productState.assigned_turing = turingCount;
            
            return {
                success: true,
                newState: {
                    ...gameState,
                    player: newPlayer
                },
                message: `已分配 ${seniorCount} Senior, ${turingCount} Turing 到研發項目`,
                actionType: 'ASSIGN_RESEARCH_TALENT'
            };
        }
    };
    
    // ==========================================
    // 註冊到 handleAction
    // ==========================================
    
    const originalHandleAction = window.handleAction;
    if (originalHandleAction) {
        window.handleAction = function(gameState, action) {
            switch (action.type) {
                case 'START_FACILITY_RESEARCH':
                    return FacilityUpgradeIntegration.handleStartResearch(
                        gameState, 
                        action.payload.productId
                    );
                    
                case 'ASSIGN_RESEARCH_TALENT':
                    return FacilityUpgradeIntegration.handleAssignResearchTalent(
                        gameState,
                        action.payload.productId,
                        action.payload.seniorCount,
                        action.payload.turingCount
                    );
                    
                default:
                    return originalHandleAction(gameState, action);
            }
        };
    }
    
    // ==========================================
    // 擴展 processTurnUpdates
    // ==========================================
    
    const originalProcessTurnUpdates = window.processTurnUpdates;
    if (originalProcessTurnUpdates) {
        window.processTurnUpdates = function(player) {
            let updatedPlayer = originalProcessTurnUpdates(player);
            
            // 執行設施升級 hooks
            if (window._facilityUpgradeHooks) {
                for (const hook of window._facilityUpgradeHooks) {
                    updatedPlayer = hook.execute(updatedPlayer);
                }
            }
            
            return updatedPlayer;
        };
    }
    
    // ==========================================
    // 全局暴露
    // ==========================================
    window.FacilityUpgradeIntegration = FacilityUpgradeIntegration;
    
    // 延遲初始化（確保其他模組已載入）
    if (document.readyState === 'complete') {
        FacilityUpgradeIntegration.init();
    } else {
        window.addEventListener('load', function() {
            setTimeout(function() {
                FacilityUpgradeIntegration.init();
            }, 100);
        });
    }
    
    console.log('✓ Facility Upgrade Integration loaded (Research Only)');
    
})();