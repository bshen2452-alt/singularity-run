// ============================================
// 回合更新補丁 - 整合空間建設、設施升級、數據處理進度
// ============================================
// 在 processTurnUpdates 調用後執行此補丁

(function() {
    'use strict';
    
    // 儲存原始的 processTurnUpdates 函數
    var originalProcessTurnUpdates = window.TurnUpdateEngine?.processTurnUpdates;
    
    /**
     * 增強版回合更新處理器
     * 整合：空間建設、設施升級、數據清洗進度
     */
    function enhancedProcessTurnUpdates(player, rivals, globalParams) {
        // 先執行原始處理
        var result;
        if (originalProcessTurnUpdates) {
            result = originalProcessTurnUpdates(player, rivals, globalParams);
        } else {
            // 如果原始函數不存在，創建基礎返回結構
            result = {
                player: JSON.parse(JSON.stringify(player)),
                rivals: rivals,
                globalParams: globalParams,
                messages: []
            };
        }
        
        var messages = result.messages || [];
        
        // ==========================================
        // 1. 處理空間建設進度
        // ==========================================
        var SpaceConstructionPatch = window.SpaceConstructionPatch;
        if (SpaceConstructionPatch && SpaceConstructionPatch.processSpaceConstruction) {
            var spaceResult = SpaceConstructionPatch.processSpaceConstruction(result.player);
            
            if (spaceResult.player) {
                result.player = spaceResult.player;
            }
            
            if (spaceResult.messages && spaceResult.messages.length > 0) {
                messages = messages.concat(spaceResult.messages);
            }
        }
        
        // 處理設施維護成本
        if (SpaceConstructionPatch && SpaceConstructionPatch.calculateMaintenanceCost) {
            var maintenanceCost = SpaceConstructionPatch.calculateMaintenanceCost(result.player);
            result.player.space_maintenance_cost = maintenanceCost;
            
            if (maintenanceCost > 0) {
                result.player.cash = (result.player.cash || 0) - maintenanceCost;
            }
        }
        
        // 處理託管服務租金
        if (SpaceConstructionPatch && SpaceConstructionPatch.calculateColocationRent) {
            var colocationRent = SpaceConstructionPatch.calculateColocationRent(result.player);
            result.player.colocation_rent = colocationRent;
            
            if (colocationRent > 0) {
                result.player.cash = (result.player.cash || 0) - colocationRent;
            }
        }
        
        // ==========================================
        // 2. 處理設施升級進度（研發 + 施工）
        // ==========================================
        var FacilityUpgradeEngine = window.FacilityUpgradeEngine;
        var facilityConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        
        if (FacilityUpgradeEngine && facilityConfig && result.player.facility_upgrade_state) {
            var facilityState = result.player.facility_upgrade_state;
            var newPlayer = result.player;
            
            // 處理研發進度
            var upgradeProducts = facilityState.upgrade_products || {};
            for (var productId in upgradeProducts) {
                if (upgradeProducts.hasOwnProperty(productId)) {
                    var state = upgradeProducts[productId];
                    
                    if (state.status === 'researching') {
                        var researchResult = FacilityUpgradeEngine.processResearchProgress(
                            newPlayer,
                            productId,
                            state.assigned_senior || 0,
                            state.assigned_turing || 0
                        );
                        
                        if (researchResult.success && researchResult.newState) {
                            newPlayer = researchResult.newState;
                            
                            if (researchResult.research_completed) {
                                messages.push({
                                    text: '🔬 ' + researchResult.message,
                                    type: 'success'
                                });
                            }
                        }
                    }
                }
            }
            
            // 注意：施工進度由 space_construction_patch.js 在 processSpaceConstruction 中處理
            // 不需要在這裡單獨處理
            
            // 同步已完成研發到所有設施（更新 available 狀態）
            if (SpaceConstructionPatch && SpaceConstructionPatch.syncCompletedResearchToFacilities) {
                newPlayer = SpaceConstructionPatch.syncCompletedResearchToFacilities(newPlayer);
            }
            
            result.player = newPlayer;
        }
        
        // ==========================================
        // 3. 處理數據清洗進度
        // ==========================================
        var DataEngine = window.DataEngine;
        if (DataEngine && result.player.data_state) {
            // 處理清洗任務
            if (DataEngine.processCleaningTasks) {
                var cleaningResult = DataEngine.processCleaningTasks(result.player);
                if (cleaningResult.player) {
                    result.player = cleaningResult.player;
                }
                if (cleaningResult.messages && cleaningResult.messages.length > 0) {
                    for (var j = 0; j < cleaningResult.messages.length; j++) {
                        messages.push({
                            text: cleaningResult.messages[j],
                            type: 'info'
                        });
                    }
                }
            }
            
            // 處理數據合約
            if (DataEngine.processContracts) {
                var contractResult = DataEngine.processContracts(result.player);
                if (contractResult.player) {
                    result.player = contractResult.player;
                }
                if (contractResult.messages && contractResult.messages.length > 0) {
                    for (var k = 0; k < contractResult.messages.length; k++) {
                        messages.push({
                            text: contractResult.messages[k],
                            type: 'info'
                        });
                    }
                }
            }
            
            // 處理數據衰減
            if (DataEngine.applyDecay) {
                var decayResult = DataEngine.applyDecay(result.player);
                if (decayResult.player) {
                    result.player = decayResult.player;
                }
                if (decayResult.messages && decayResult.messages.length > 0) {
                    for (var m = 0; m < decayResult.messages.length; m++) {
                        messages.push({
                            text: decayResult.messages[m],
                            type: 'warning'
                        });
                    }
                }
            }
        }
        
        result.messages = messages;
        return result;
    }
    
    // 註冊增強版處理器
    if (window.TurnUpdateEngine) {
        window.TurnUpdateEngine.processTurnUpdatesWithSpace = enhancedProcessTurnUpdates;
        
        // 自動替換原始函數
        window.TurnUpdateEngine.processTurnUpdates = enhancedProcessTurnUpdates;
    }
    
    console.log('✓ Turn Update Patch (Space + Facility + Data) loaded');
    
})();