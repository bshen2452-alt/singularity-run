// ============================================
// 設施技術回合處理擴展 (processTurnUpdates_facility_tech.js)
// ============================================
// 擴展 processTurnUpdates 以處理設施技術施工進度
// 載入順序：在 processTurnUpdates_engine.js 之後
// ============================================

(function() {
    'use strict';
    
    /**
     * 處理設施技術的回合更新
     * 供 processTurnUpdates 調用
     * 
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { newState, messages }
     */
    function processFacilityTechTurn(playerState) {
        var SpaceEng = window.SpaceEngine;
        
        if (!SpaceEng || !SpaceEng.processFacilityTechConstruction) {
            return { newState: playerState, messages: [] };
        }
        
        // 只有 Tier3+ 處理設施技術
        if ((playerState.mp_tier || 0) < 3) {
            return { newState: playerState, messages: [] };
        }
        
        // 確保所有設施都有 tech_levels
        playerState = ensureFacilityTechState(playerState);
        
        // 處理施工進度
        var result = SpaceEng.processFacilityTechConstruction(playerState);
        
        return {
            newState: result.newState,
            messages: result.messages || []
        };
    }
    
    /**
     * 確保所有設施都有 tech_levels 結構（遷移舊存檔）
     */
    function ensureFacilityTechState(playerState) {
        var SpaceEng = window.SpaceEngine;
        var spaceState = playerState.space_state;
        
        if (!spaceState || !spaceState.facilities || !SpaceEng) {
            return playerState;
        }
        
        var needsUpdate = false;
        var newFacilities = spaceState.facilities.map(function(facility) {
            if (!facility.tech_levels && SpaceEng.createFacilityTechState) {
                needsUpdate = true;
                return Object.assign({}, facility, {
                    tech_levels: SpaceEng.createFacilityTechState(facility.type)
                });
            }
            return facility;
        });
        
        if (needsUpdate) {
            return Object.assign({}, playerState, {
                space_state: Object.assign({}, spaceState, { 
                    facilities: newFacilities 
                })
            });
        }
        
        return playerState;
    }
    
    /**
     * 同步已完成的研發到設施（遷移用）
     * 在遊戲載入時調用，確保研發狀態正確同步到設施
     */
    function syncCompletedResearchToFacilities(playerState) {
        var SpaceEng = window.SpaceEngine;
        var upgradeConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        
        if (!SpaceEng || !SpaceEng.syncResearchToFacilities || !upgradeConfig) {
            return playerState;
        }
        
        var facilityState = playerState.facility_upgrade_state;
        if (!facilityState || !facilityState.upgrade_products) {
            return playerState;
        }
        
        var newState = playerState;
        var STATUS = upgradeConfig.UPGRADE_STATUS || {};
        
        // 找出所有已完成研發的產品並同步
        Object.keys(facilityState.upgrade_products).forEach(function(productId) {
            var productState = facilityState.upgrade_products[productId];
            if (productState.status === STATUS.COMPLETED || 
                productState.status === STATUS.OPERATING ||
                productState.status === 'research_completed') {
                newState = SpaceEng.syncResearchToFacilities(newState, productId);
            }
        });
        
        return newState;
    }
    
    // 註冊到全局
    window.FacilityTechTurnProcessor = {
        process: processFacilityTechTurn,
        ensureState: ensureFacilityTechState,
        syncResearch: syncCompletedResearchToFacilities
    };
    
    console.log('✓ Facility Tech Turn Processor loaded');
    
})();
