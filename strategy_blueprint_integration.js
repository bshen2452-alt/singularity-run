// ============================================
// 策略藍圖系統整合 - Strategy Blueprint Integration
// ============================================
// 功能：將策略藍圖系統整合至現有遊戲機制
// 設計：僅處理系統間的接口整合

(function() {
    'use strict';
    
    const BlueprintIntegration = {
        
        // ==========================================
        // 初始化整合
        // ==========================================
        
        /**
         * 初始化策略藍圖系統
         * 在遊戲開始時調用
         * @param {Object} player - 玩家狀態
         * @returns {Object} 更新後的玩家狀態
         */
        initializeForPlayer(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine) {
                console.warn('StrategyBlueprintEngine not loaded');
                return player;
            }
            
            return engine.ensureBlueprintState(player);
        },
        
        // ==========================================
        // 行動路由整合
        // ==========================================
        
        /**
         * 處理策略藍圖相關行動
         * 供 useGameState 的 ACTION_ROUTES 調用
         * @param {Object} player - 玩家狀態
         * @param {string} action - 行動類型
         * @param {Object} params - 行動參數
         * @returns {Object} { success, player, message, type }
         */
        executeAction(player, action, params) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine) {
                return { 
                    success: false, 
                    player: player,
                    message: '策略藍圖系統未載入',
                    type: 'danger'
                };
            }
            
            switch(action) {
                case 'activateBlueprintSkill':
                    return engine.activateSkill(player, params.skillId);
                    
                default:
                    return { 
                        success: false, 
                        player: player,
                        message: '未知的策略藍圖行動',
                        type: 'warning'
                    };
            }
        },
        
        // ==========================================
        // 回合更新整合
        // ==========================================
        
        /**
         * 處理策略藍圖的回合更新
         * 供 processTurnUpdates 調用
         * @param {Object} player - 玩家狀態
         * @param {Object} globalParams - 全局參數
         * @returns {Object} { player, messages }
         */
        processTurnUpdate(player, globalParams) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) {
                return { player, messages: [] };
            }
            
            return engine.processTurnUpdate(player, globalParams);
        },
        
        // ==========================================
        // 效果修正器整合
        // ==========================================
        
        /**
         * 取得招聘成本修正
         * @param {Object} player - 玩家狀態
         * @returns {number} 招聘成本乘數
         */
        getHireCostMultiplier(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 1;
            
            const multipliers = engine.calculateMultiplierEffects(player);
            return multipliers.hire_cost;
        },
        
        /**
         * 取得薪資成本修正
         * @param {Object} player - 玩家狀態
         * @returns {number} 薪資成本乘數
         */
        getSalaryCostMultiplier(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 1;
            
            const multipliers = engine.calculateMultiplierEffects(player);
            return multipliers.salary_cost;
        },
        
        /**
         * 取得MP成長修正
         * @param {Object} player - 玩家狀態
         * @returns {number} MP成長乘數
         */
        getMPGrowthMultiplier(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 1;
            
            const multipliers = engine.calculateMultiplierEffects(player);
            return multipliers.mp_growth;
        },
        
        /**
         * 取得社群成長修正
         * @param {Object} player - 玩家狀態
         * @returns {number} 社群成長乘數
         */
        getCommunityGrowthMultiplier(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 1;
            
            const multipliers = engine.calculateMultiplierEffects(player);
            return multipliers.community_growth;
        },
        
        /**
         * 取得監管懲罰修正
         * @param {Object} player - 玩家狀態
         * @returns {number} 監管懲罰乘數
         */
        getRegulationPenaltyMultiplier(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 1;
            
            const multipliers = engine.calculateMultiplierEffects(player);
            return multipliers.regulation_penalty;
        },
        
        /**
         * 取得信任度增益修正
         * @param {Object} player - 玩家狀態
         * @returns {number} 信任度增益乘數
         */
        getTrustGainMultiplier(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 1;
            
            const multipliers = engine.calculateMultiplierEffects(player);
            return multipliers.trust_gain;
        },
        
        /**
         * 取得電力成本修正
         * @param {Object} player - 玩家狀態
         * @returns {number} 電力成本乘數
         */
        getPowerCostMultiplier(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 1;
            
            const multipliers = engine.calculateMultiplierEffects(player);
            return multipliers.power_cost;
        },
        
        // ==========================================
        // 特殊效果查詢
        // ==========================================
        
        /**
         * 檢查是否對齊研究不消耗算力
         * @param {Object} player - 玩家狀態
         * @returns {boolean}
         */
        hasAlignmentNoCompute(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return false;
            
            const special = engine.calculateSpecialEffects(player);
            return special.alignment_no_compute;
        },
        
        /**
         * 檢查是否免疫監管壓力負面事件
         * @param {Object} player - 玩家狀態
         * @returns {boolean}
         */
        hasRegulationImmunity(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return false;
            
            const special = engine.calculateSpecialEffects(player);
            return special.regulation_immunity;
        },
        
        /**
         * 檢查是否有現金危機護盾
         * @param {Object} player - 玩家狀態
         * @returns {boolean}
         */
        hasCashCrisisShield(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return false;
            
            const special = engine.calculateSpecialEffects(player);
            return special.cash_crisis_shield;
        },
        
        /**
         * 檢查是否頂級人才不離職
         * @param {Object} player - 玩家狀態
         * @returns {boolean}
         */
        hasEliteRetention(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return false;
            
            const special = engine.calculateSpecialEffects(player);
            return special.elite_retention;
        },
        
        /**
         * 取得社群貢獻的額外算力
         * @param {Object} player - 玩家狀態
         * @returns {number} 額外 PFLOPS
         */
        getCommunityBonusPflops(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 0;
            
            const special = engine.calculateSpecialEffects(player);
            if (special.pflops_per_10k_community <= 0) return 0;
            
            const communitySize = player.community?.size || player.community_size || 0;
            return (communitySize / 10000) * special.pflops_per_10k_community;
        },
        
        /**
         * 取得設施建造速度修正
         * @param {Object} player - 玩家狀態
         * @returns {number} 建造速度乘數
         */
        getFacilityBuildSpeedMultiplier(player) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) return 1;
            
            const special = engine.calculateSpecialEffects(player);
            return special.facility_build_speed;
        },
        
        /**
         * 取得產品類別加成
         * @param {Object} player - 玩家狀態
         * @param {string} category - 產品類別
         * @returns {Object} { revenue_mult, data_gain_mult }
         */
        getProductCategoryBonus(player, category) {
            const engine = window.StrategyBlueprintEngine;
            if (!engine || !player.blueprint_state) {
                return { revenue_mult: 1, data_gain_mult: 1 };
            }
            
            const special = engine.calculateSpecialEffects(player);
            let revenue_mult = 1;
            let data_gain_mult = 1;
            
            special.product_category_bonuses.forEach(bonus => {
                if (bonus.category === category) {
                    if (bonus.revenue_mult) revenue_mult *= bonus.revenue_mult;
                    if (bonus.data_gain_mult) data_gain_mult *= bonus.data_gain_mult;
                }
            });
            
            return { revenue_mult, data_gain_mult };
        }
    };
    
    // ==========================================
    // 全局掛載
    // ==========================================
    
    window.BlueprintIntegration = BlueprintIntegration;
    
    // ==========================================
    // 自動整合到 ACTION_ROUTES（如果 useGameState 已載入）
    // ==========================================
    
    // 這部分需要在 useGameState.js 中手動添加
    // 以下是需要添加的路由配置範例：
    /*
    blueprint: {
        actions: ['activateBlueprintSkill'],
        engine: () => window.BlueprintIntegration,
        executor: (engine, player, action, globalParams, params) => {
            return engine.executeAction(player, action, params);
        }
    }
    */
    
    console.log('✓ Strategy Blueprint Integration loaded');
    
})();
