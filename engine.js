// ============================================
// 奇點競速 - 遊戲引擎統一入口
// ============================================
// 功能：整合所有子系統引擎，提供統一接口
// 設計：只負責路由和接口暴露，不包含業務邏輯

(function() {
    'use strict';
    
    console.log('🔧 Loading GameEngine unified interface...');
    
    // 檢查必要的子系統引擎是否已載入
    const requiredEngines = [
        'StrategyEngine',
        'FinanceEngine',
        'AssetEngine',
        'MilestoneEngine',
        'RivalInvestmentEngine',
        'TurnUpdateEngine',   // <-- 核心回合更新引擎
        'ProductEngine',
        'EndingEngine',
        'InitialStateEngine',
        'ComputeEngine'  // 新增算力系統引擎
        // 'processTurnUpdates' <-- 移除，這是一個函式，不是一個獨立引擎
    ];
    

    // 等待所有引擎載入完成 (checkEnginesReady 函式不變)
    function checkEnginesReady() {
        const missing = requiredEngines.filter(name => !window[name]);
        // 同時檢查 TurnUpdateEngine 內的關鍵功能是否載入
        const turnUpdateReady = !!window.TurnUpdateEngine?.handleEndTurn && !!window.TurnUpdateEngine?.processTurnUpdates;
        if (!turnUpdateReady && requiredEngines.includes('TurnUpdateEngine')) {
             missing.push('TurnUpdateEngine functions');
        }
        
        if (missing.length > 0) {
            console.warn('⚠️  Waiting for engines:', missing.join(', '));
            return false;
        }
        return true;
    }
    
    // 如果引擎尚未完全載入，延遲初始化 (邏輯不變)
    if (!checkEnginesReady()) {
        console.log('⏳ Some engines not loaded yet, will initialize when ready');
    }
    
    /**
     * 遊戲引擎統一接口
     * 整合所有子系統，提供統一的訪問入口
     */
    const GameEngine = {
        
        // ==========================================
        // 開局系統 (InitialState engine)
        // ==========================================
        get createInitialPlayerState() { return window.InitialStateEngine?.createInitialPlayerState; },

        // ==========================================
        // 策略系統 (Strategy Engine)
        // ==========================================        
        get executeStrategy() { return window.StrategyEngine?.executeStrategy; },
        get createInitialRivalsState() { return window.StrategyEngine?.createInitialRivalsState; },

        
        // ==========================================
        // 財務系統 (Finance Engine)
        // ==========================================
        get executeFinance() { return window.FinanceEngine?.executeFinance; },
        get updateFinanceCooldowns() { return window.FinanceEngine?.updateFinanceCooldowns; },
        get processQuarterlyContracts() { return window.FinanceEngine?.processQuarterlyContracts; },
        get calculateQuarterlyFinances() { return window.FinanceEngine?.calculateQuarterlyFinances; },
        
        // ==========================================
        // 資產系統 (Asset Engine)
        // ==========================================
        get executeAssetAction() { return window.AssetEngine?.executeAssetAction; },
        get getTalentTypeName() { return window.AssetEngine?.getTalentTypeName; },
        get canAffordAssetAction() { return window.AssetEngine?.canAffordAssetAction; },
        get estimateAssetActionCost() { return window.AssetEngine?.estimateAssetActionCost; },
        
        // ==========================================
        // 里程碑系統 (Milestone Engine)
        // ==========================================
        get executeMilestoneLaunch() { return window.MilestoneEngine?.executeMilestoneLaunch; },
        get checkMilestones() { return window.MilestoneEngine?.checkMilestones; },

        // ==========================================
        // 事件系統 (Event Engine)
        // ==========================================
        get generateGlobalEvent() { return window.EventEngine?.generateGlobalEvent; },
        get generateRandomEvent() { return window.EventEngine?.generateRandomEvent; },  
        get calculateDoomGauge() { return window.EventEngine?.calculateDoomGauge; },
        
        // ==========================================
        // 競爭對手系統 (Rival Investment Engine)
        // ==========================================
        get executeRivalInvestment() { return window.RivalInvestmentEngine?.executeRivalInvestment; },
        get calculateInvestmentEffects() { return window.RivalInvestmentEngine?.calculateInvestmentEffects; },
        get calculateInvestmentReturns() { return window.RivalInvestmentEngine?.calculateInvestmentReturns; },
        get getRivalInvestmentInfo() { return window.RivalInvestmentEngine?.getRivalInvestmentInfo; },
        get getInvestmentRecommendations() { return window.RivalInvestmentEngine?.getInvestmentRecommendations; },
        get updateRival() { return window.RivalInvestmentEngine?.updateRival; },
        
        // ==========================================
        // 回合更新系統 (Turn Update Engine) <-- 修正重點
        // ==========================================
        
        // 核心流程：回合總控接口
        get handleEndTurn() { 
            return window.TurnUpdateEngine?.handleEndTurn; 
        },

        // 核心邏輯：內部狀態計算接口 (暴露以供調試或特定流程調用)
        get processTurnUpdates() { 
            return window.TurnUpdateEngine?.processTurnUpdates; 
        },

        // 衍生狀態計算 (保留 fallback 邏輯)
        get calculateDerivedStats() { 
            return window.StrategyEngine?.calculateDerivedStats || 
                   window.TurnUpdateEngine?.calculateDerivedStats; 
        },
        
        // ==========================================
        // 商品系統 (Product Engine)
        // ==========================================
        get createInitialProductState() { return window.ProductEngine?.createInitialProductState; },
        get getComputeStrategy() { return window.ProductEngine?.getComputeStrategy; },
        get getMasteryLevel() { return window.ProductEngine?.getMasteryLevel; },
        get getMasteryMPBonus() { return window.ProductEngine?.getMasteryMPBonus; },
        get getMasteryMilestoneBonus() { return window.ProductEngine?.getMasteryMilestoneBonus; },
        get getMasteryInferenceReduction() { 
            // 新增：獲取 mastery 的推論需求減免
            return (masteryLevel) => {
                const mastery = window.ProductEngine?.getMasteryLevel(masteryLevel);
                return mastery?.inference_reduction || 0;
            };
        },
        get checkMasteryLevelUp() { return window.ProductEngine?.checkMasteryLevelUp; },
        get calculateProductDemand() { return window.ProductEngine?.calculateProductDemand; },
        get calculateProductFulfillment() { return window.ProductEngine?.calculateProductFulfillment; },
        get calculateComputeAllocation() { return window.ProductEngine?.calculateComputeAllocation; },
        get getRouteProducts() { return window.ProductEngine?.getRouteProducts; },
        get getTierProducts() { return window.ProductEngine?.getTierProducts; },
        get getProductById() { return window.ProductEngine?.getProductById; },
        get canStartProduct() { return window.ProductEngine?.canStartProduct; },
        get startProductDevelopment() { return window.ProductEngine?.startProductDevelopment; },
        get updateProductDevelopment() { return window.ProductEngine?.updateProductDevelopment; },
        get completeProduct() { return window.ProductEngine?.completeProduct; },
        get applyProductEffects() { return window.ProductEngine?.applyProductEffects; },
        get applyFulfillmentEffects() { return window.ProductEngine?.applyFulfillmentEffects; },
        get calculateProductRevenue() { return window.ProductEngine?.calculateProductRevenue; },
        get setComputeStrategy() { return window.ProductEngine?.setComputeStrategy; },
        get getProductSummary() { return window.ProductEngine?.getProductSummary; },
        
        // ==========================================
        // 算力系統 (Compute Engine) - 新增
        // ==========================================
        get calculateTrainingDemand() { return window.ComputeEngine?.calculateTrainingDemand; },
        get calculateProductDevDemand() { return window.ComputeEngine?.calculateProductDevDemand; },
        get calculateInferenceDemand() { return window.ComputeEngine?.calculateInferenceDemand; },
        get getComputeAllocation() { return window.ComputeEngine?.calculateComputeAllocation; },
        get applyShortageEffects() { return window.ComputeEngine?.applyShortageEffects; },
        get calculateProductDevSpeed() { return window.ComputeEngine?.calculateProductDevSpeed; },
        get getComputeSummary() { return window.ComputeEngine?.getComputeSummary; },

         // ==========================================
        // 能源價格系統 (Energy Price Engine)
        // ==========================================
        get calculateEnergyPrice() { return window.EnergyPriceEngine?.calculateEnergyPrice; },
        get getEnergyPriceSummary() { return window.EnergyPriceEngine?.getEnergyPriceSummary; },
        get getCurrentSeason() { return window.EnergyPriceEngine?.getCurrentSeason; },
        get initializeEnergySettings() { return window.EnergyPriceEngine?.initializeEnergySettings; },

        // ==========================================
        // 社群系統 (Community Engine)
        // ==========================================
        get executeCommunityStrategy() { return window.CommunityEngine?.executeCommunityStrategy; },
        get processCommunityTurnUpdate() { return window.CommunityEngine?.processCommunityTurnUpdate; },
        get getCommunitySummary() { return window.CommunityEngine?.getCommunitySummary; },
        get initializeCommunityState() { return window.CommunityEngine?.initializeCommunityState; },
        get getCommunityTier() { return window.CommunityEngine?.getCommunityTier; },
        get getSentimentLevel() { return window.CommunityEngine?.getSentimentLevel; },
        get getEngagementLevel() { return window.CommunityEngine?.getEngagementLevel; },
        get calculateCommunityRevenue() { return window.CommunityEngine?.calculateCommunityRevenue; },
        get calculateCommunityDataOutput() { return window.CommunityEngine?.calculateCommunityDataOutput; },
        
        // ==========================================
        // 結局與事件系統 (Ending Engine)
        // ==========================================
        get checkEndingConditions() { return window.EndingEngine?.checkEndingConditions; },
        get checkGameEnding() { return window.EndingEngine?.checkGameEnding; },
        get generateGlobalEvent() { return window.EndingEngine?.generateGlobalEvent; },
        get generateRandomEvent() { return window.EndingEngine?.generateRandomEvent; },
        get calculateDoomGauge() { return window.EndingEngine?.calculateDoomGauge; },
        
        // ==========================================
        // 統一執行接口 (Action Router)
        // ==========================================
        /**
         * 統一的行動執行路由
         * @param {string} category - 行動類別
         * @param {string} actionId - 行動ID
         * @param {Object} context - 執行上下文
         * @returns {Object} 執行結果
         */
        executeAction(category, actionId, context) {
            const { player, rivals, globalParams, params } = context;
            
            switch (category) {
                case 'strategy':
                    return this.executeStrategy(player, actionId, globalParams, params);
                
                case 'finance':
                    return this.executeFinance(player, actionId, params);
                
                case 'asset':
                    return this.executeAssetAction(player, actionId, params, globalParams);
                
                case 'milestone':
                    const tier = params?.tier || parseInt(actionId.replace('tier_', ''));
                    return this.executeMilestoneLaunch(player, tier);
                
                case 'rival_investment':
                    return this.executeRivalInvestment(player, params?.rivalName, params?.amount);
                
                case 'turn_update':
                    return this.processTurnUpdates(player, rivals, globalParams);
                
                case 'check_ending':
                    return this.checkEndingConditions(player, rivals);
                
                default:
                    return {
                        success: false,
                        message: `未知的行動類別: ${category}`,
                        type: 'danger'
                    };
            }
        },
        
        // ==========================================
        // 系統狀態檢查
        // ==========================================
        /**
         * 檢查所有子系統是否已載入
         * @returns {Object} 各子系統載入狀態
         */
        checkSystemStatus() {
            return {
                StrategyEngine: !!window.StrategyEngine,
                FinanceEngine: !!window.FinanceEngine,
                AssetEngine: !!window.AssetEngine,
                MilestoneEngine: !!window.MilestoneEngine,
                RivalInvestmentEngine: !!window.RivalInvestmentEngine,
                TurnUpdateEngine: !!window.TurnUpdateEngine,
                ProductEngine: !!window.ProductEngine,
                EndingEngine: !!window.EndingEngine,
                InitialStateEngine: !!window.InitialStateEngine,
                ComputeEngine: !!window.ComputeEngine,
                processTurnUpdates: !!window.GameEngine?.processTurnUpdates,
                allReady: checkEnginesReady()
            };
        }
    };
    
    // 掛載到全局
    window.GameEngine = GameEngine;
    
    // 輸出載入狀態 (邏輯不變)
    const status = GameEngine.checkSystemStatus ? GameEngine.checkSystemStatus() : null;
    console.log('✓ GameEngine unified interface created');
    console.log('📊 System Status:', status);
    
    if (status.allReady) {
        console.log('✅ All engines ready!');
    } else {
        console.warn('⚠️  Some engines not loaded yet');
    }
})();