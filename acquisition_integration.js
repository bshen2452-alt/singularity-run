// ============================================
// 併購系統整合 (Acquisition Integration)
// ============================================
// 設計：整合併購系統與現有遊戲機制
// 功能：註冊到遊戲引擎、處理跨系統交互

(function() {
    'use strict';

    const AcquisitionIntegration = {

        // ==========================================
        // 初始化狀態
        // ==========================================

        /**
         * 在玩家初始狀態中加入併購系統
         * @param {Object} player - 初始玩家狀態
         * @returns {Object} 更新後的玩家狀態
         */
        initializePlayerState(player) {
            const engine = window.AcquisitionEngine;
            if (!engine) return player;

            if (!player.acquisition_state) {
                player.acquisition_state = engine.createInitialState();
            }

            return player;
        },

        // ==========================================
        // 每季處理
        // ==========================================

        /**
         * 處理每季併購更新
         * @param {Object} player - 玩家狀態
         * @param {Object} globalParams - 全球參數
         * @returns {Object} 更新結果 { player, messages }
         */
        processQuarterlyUpdate(player, globalParams) {
            const engine = window.AcquisitionEngine;
            if (!engine) return { player, messages: [] };

            return engine.processQuarterlyUpdate(player, globalParams);
        },

        // ==========================================
        // 併購效果應用
        // ==========================================

        /**
         * 獲取併購對營運的影響
         * @param {Object} player - 玩家狀態
         * @returns {Object} 營運影響
         */
        getOperatingEffects(player) {
            const engine = window.AcquisitionEngine;
            if (!engine) return {};

            return engine.calculateOngoingEffects(player);
        },

        /**
         * 應用併購效果到每季營收
         * @param {Object} player - 玩家狀態
         * @param {Object} baseRevenue - 基礎營收
         * @returns {Object} 修正後營收
         */
        applyRevenueEffects(player, baseRevenue) {
            const effects = this.getOperatingEffects(player);
            const revenue = { ...baseRevenue };

            // 加入併購單位的固定收益
            if (effects.quarterly_revenue > 0) {
                revenue.acquisition_revenue = effects.quarterly_revenue;
                revenue.total = (revenue.total || 0) + effects.quarterly_revenue;
            }

            // 效率懲罰（整合中）
            if (effects.operating_efficiency_penalty !== 0) {
                const penalty = effects.operating_efficiency_penalty;
                revenue.efficiency_penalty_mult = 1 + penalty;
                // 不直接修改 total，讓 products_engine 處理
            }

            return revenue;
        },

        /**
         * 應用併購效果到資源
         * @param {Object} player - 玩家狀態
         * @param {Object} resources - 資源狀態
         * @returns {Object} 修正後資源
         */
        applyResourceEffects(player, resources) {
            const effects = this.getOperatingEffects(player);
            const result = { ...resources };

            // 空間容量加成
            if (effects.capacity_bonus > 0) {
                result.capacity_mult = (result.capacity_mult || 1) * (1 + effects.capacity_bonus);
            }

            // 算力效率加成
            if (effects.compute_efficiency > 0) {
                result.compute_efficiency_mult = (result.compute_efficiency_mult || 1) * (1 + effects.compute_efficiency);
            }

            // 能源成本減免
            if (effects.energy_cost_reduction > 0) {
                result.energy_cost_mult = (result.energy_cost_mult || 1) * (1 - effects.energy_cost_reduction);
            }

            return result;
        },

        // ==========================================
        // 與忠誠度系統整合
        // ==========================================

        /**
         * 獲取整合期的忠誠度流失
         * @param {Object} player - 玩家狀態
         * @returns {number} 忠誠度流失量
         */
        getLoyaltyDrain(player) {
            const effects = this.getOperatingEffects(player);
            return effects.loyalty_drain || 0;
        },

        // ==========================================
        // 與建設系統整合
        // ==========================================

        /**
         * 獲取建設速度加成
         * @param {Object} player - 玩家狀態
         * @returns {number} 速度乘數
         */
        getConstructionSpeedMult(player) {
            const effects = this.getOperatingEffects(player);
            return 1 + (effects.construction_speed || 0);
        },

        /**
         * 獲取建設成本修正
         * @param {Object} player - 玩家狀態
         * @returns {number} 成本乘數
         */
        getConstructionCostMult(player) {
            const effects = this.getOperatingEffects(player);
            return 1 + (effects.construction_cost || 0);  // construction_cost 通常是負數
        },

        // ==========================================
        // 與 ESG 系統整合
        // ==========================================

        /**
         * 獲取 ESG 加成
         * @param {Object} player - 玩家狀態
         * @returns {number} ESG 加成值
         */
        getESGBonus(player) {
            const effects = this.getOperatingEffects(player);
            return effects.esg_bonus || 0;
        },

        // ==========================================
        // 動作處理
        // ==========================================

        /**
         * 處理併購相關動作
         * @param {Object} player - 玩家狀態
         * @param {string} action - 動作類型
         * @param {Object} payload - 動作參數
         * @returns {Object|null} 處理結果或 null（非併購動作）
         */
        handleAction(player, action, payload) {
            const engine = window.AcquisitionEngine;
            if (!engine) return null;

            switch (action) {
                case 'executeAcquisition':
                    return engine.executeAcquisition(player, payload.targetId, payload.opportunity);

                case 'refreshAcquisitionOpportunities':
                    return this.refreshOpportunities(player, payload.globalParams);

                default:
                    return null;
            }
        },

        /**
         * 強制刷新併購機會
         */
        refreshOpportunities(player, globalParams) {
            const engine = window.AcquisitionEngine;
            if (!engine) return { success: false };

            const newPlayer = JSON.parse(JSON.stringify(player));
            
            if (!newPlayer.acquisition_state) {
                newPlayer.acquisition_state = engine.createInitialState();
            }

            const opportunities = engine.generateOpportunities(newPlayer, globalParams);
            newPlayer.acquisition_state.available_opportunities = opportunities;
            newPlayer.acquisition_state.last_refresh_turn = newPlayer.turn_count || 0;

            return {
                success: true,
                player: newPlayer,
                opportunities_count: opportunities.length
            };
        },

        // ==========================================
        // 查詢接口
        // ==========================================

        /**
         * 檢查併購功能是否解鎖
         * @param {Object} player - 玩家狀態
         * @returns {boolean}
         */
        isUnlocked(player) {
            const config = window.AcquisitionConfig;
            if (!config) return false;
            return (player.mp_tier || 0) >= config.SYSTEM.unlock_tier;
        },

        /**
         * 獲取併購狀態摘要
         * @param {Object} player - 玩家狀態
         * @returns {Object} 摘要資訊
         */
        getSummary(player) {
            const engine = window.AcquisitionEngine;
            if (!engine) return null;
            return engine.getAcquisitionSummary(player);
        },

        /**
         * 檢查特定目標是否可併購
         * @param {Object} player - 玩家狀態
         * @param {string} targetId - 目標ID
         * @returns {Object} 可用性資訊
         */
        checkTargetAvailability(player, targetId) {
            const config = window.AcquisitionConfig;
            const engine = window.AcquisitionEngine;
            if (!config || !engine) return { available: false };

            const target = config.getTarget(targetId);
            if (!target) return { available: false, reason: '目標不存在' };

            // 檢查是否已擁有
            if (engine.hasUnit(player, targetId)) {
                return { available: false, reason: '已擁有此單位' };
            }

            // 檢查是否在整合中
            const state = player.acquisition_state || {};
            if (state.integrating_units?.some(u => u.target_id === targetId)) {
                return { available: false, reason: '正在整合中' };
            }

            return engine.checkAvailability(player, target, {});
        }
    };

    // ==========================================
    // 註冊到遊戲系統
    // ==========================================

    // 等待 GameEngine 載入後註冊
    const registerToGameEngine = () => {
        if (window.GameEngine) {
            // 註冊為 turnUpdate 處理器
            const originalProcessTurnUpdates = window.GameEngine.processTurnUpdates;
            if (originalProcessTurnUpdates) {
                window.GameEngine.processTurnUpdates = function(player, globalParams) {
                    let result = originalProcessTurnUpdates.call(this, player, globalParams);
                    
                    // 執行併購更新
                    const acqResult = AcquisitionIntegration.processQuarterlyUpdate(result.player, globalParams);
                    result.player = acqResult.player;
                    result.messages = [...(result.messages || []), ...(acqResult.messages || [])];
                    
                    return result;
                };
            }

            console.log('✓ Acquisition Integration registered to GameEngine');
        } else {
            // 延遲重試
            setTimeout(registerToGameEngine, 100);
        }
    };

    // 啟動註冊
    if (document.readyState === 'complete') {
        registerToGameEngine();
    } else {
        window.addEventListener('load', registerToGameEngine);
    }

    // ==========================================
    // 全局暴露
    // ==========================================
    window.AcquisitionIntegration = AcquisitionIntegration;

    console.log('✓ Acquisition Integration loaded');

})();
