// ============================================
// 奇點競速 - 數據系統整合補丁 (Data System Patch)
// ============================================
// 功能：將 DataEngine 整合到現有遊戲機制
// 載入順序：在 data_engine.js 之後、UI 組件之前
// 合併內容：data_integration + turn_update_patch + products_patch

// ============================================
// Part 1: DataIntegration 接口層
// ============================================

const DataIntegration = {

    // ==========================================
    // 初始化整合
    // ==========================================

    integrateInitialState(player) {
        const DataEng = window.DataEngine;
        if (!DataEng) {
            console.warn('DataIntegration: DataEngine 未載入');
            return player;
        }
        player = DataEng.initializePlayerDataState(player);
        return player;
    },

    // ==========================================
    // 回合更新整合
    // ==========================================

    processTurnUpdate(player, globalParams) {
        const DataEng = window.DataEngine;
        const messages = [];

        if (!DataEng) {
            return { player, messages };
        }

        player = DataEng.initializePlayerDataState(player);

        // 1. 處理數據衰減（Tier 1+）
        if (DataEng.isFeatureUnlocked(player, 'decay')) {
            const decayResult = DataEng.processDecay(player);
            if (decayResult.messages) {
                messages.push(...decayResult.messages);
            }
        }

        // 2. 處理清洗任務進度（Tier 2+）
        if (DataEng.isFeatureUnlocked(player, 'cleaning')) {
            const cleaningResult = DataEng.processCleaningTasks(player);
            if (cleaningResult.messages) {
                messages.push(...cleaningResult.messages);
            }
        }

        // 3. 處理數據合約交付（Tier 2+）
        if (DataEng.isFeatureUnlocked(player, 'contracts')) {
            const contractResult = DataEng.processContracts(player);
            if (contractResult.messages) {
                messages.push(...contractResult.messages);
            }
        }

        return { player, messages };
    },

    // ==========================================
    // 社群數據產出整合
    // ==========================================

    processCommunityDataOutput(player, communityOutput) {
        const DataEng = window.DataEngine;

        if (!DataEng || !DataEng.isFeatureUnlocked(player, 'sources')) {
            player.high_data = (player.high_data || 0) + (communityOutput.high_data || 0);
            player.low_data = (player.low_data || 0) + (communityOutput.low_data || 0);
            return { player, added: communityOutput };
        }

        return DataEng.processCommunityDataOutput(player, communityOutput);
    },

    // ==========================================
    // 研發數據消耗整合
    // ==========================================

    consumeDataForResearch(player, amount) {
        const DataEng = window.DataEngine;

        if (!DataEng || !DataEng.isFeatureUnlocked(player, 'sources')) {
            const totalData = (player.high_data || 0) + (player.low_data || 0);
            if (totalData < amount) {
                return {
                    success: false,
                    message: `數據不足（現有 ${totalData}，需要 ${amount}）`,
                    efficiency: 0
                };
            }

            if (player.low_data >= amount) {
                player.low_data -= amount;
            } else {
                const remaining = amount - player.low_data;
                player.low_data = 0;
                player.high_data = Math.max(0, player.high_data - remaining);
            }

            return { success: true, player, efficiency: 1.0, message: `消耗了 ${amount} 單位數據` };
        }

        const result = DataEng.consumeDataForResearch(player, amount);
        return {
            success: result.success,
            player: result.player || player,
            efficiency: result.efficiency || 1.0,
            message: result.message || '',
            effects: result.effects
        };
    },

    hasEnoughData(player, amount) {
        const DataEng = window.DataEngine;
        if (!DataEng) {
            return (player.high_data || 0) + (player.low_data || 0) >= amount;
        }
        return DataEng.hasEnoughData(player, amount);
    },

    // ==========================================
    // 數據購買整合
    // ==========================================

    purchaseData(player, dataType, amount) {
        const DataEng = window.DataEngine;
        const config = window.DataConfig || {};

        let actualType = dataType;
        if (dataType === 'high') actualType = 'legal_high_broad';
        else if (dataType === 'low') actualType = 'legal_low';

        if (!DataEng || !DataEng.isFeatureUnlocked(player, 'sources')) {
            const COSTS = window.GameConfig?.COSTS || {};
            const unitPrice = dataType === 'high' 
                ? (COSTS.HIGH_DATA_UNIT_PRICE || 2)
                : (COSTS.LOW_DATA_UNIT_PRICE || 0.5);
            const totalCost = unitPrice * amount;

            if (player.cash < totalCost) {
                return { success: false, message: `現金不足（需要 $${totalCost}M）` };
            }

            player.cash -= totalCost;
            if (dataType === 'high') {
                player.high_data = (player.high_data || 0) + amount;
            } else {
                player.low_data = (player.low_data || 0) + amount;
            }

            return {
                success: true,
                player,
                message: `購買了 ${amount} 單位${dataType === 'high' ? '高' : '低'}品質數據`,
                cost: totalCost
            };
        }

        return DataEng.purchaseData(player, actualType, amount);
    },

    // ==========================================
    // 數據報告整合
    // ==========================================

    getDataSummary(player) {
        const DataEng = window.DataEngine;
        if (!DataEng) {
            return {
                high_data: player.high_data || 0,
                low_data: player.low_data || 0,
                total: (player.high_data || 0) + (player.low_data || 0),
                legal_total: (player.high_data || 0) + (player.low_data || 0),
                gray_total: 0,
                synthetic_total: 0
            };
        }
        return DataEng.getDataSummary(player);
    },

    getDetailedReport(player) {
        const DataEng = window.DataEngine;
        if (!DataEng) {
            return {
                summary: this.getDataSummary(player),
                gray_ratio: 0,
                gray_warning: false,
                decay_estimate: { high_decay: 0, gray_risk: false },
                processing_tasks: [],
                contracts: []
            };
        }
        return DataEng.getDetailedReport(player);
    },

    getUnlockedFeatures(player) {
        const DataEng = window.DataEngine;
        if (!DataEng) {
            return {
                display: true, sources: false, decay: false,
                scraping: false, cleaning: false, synthesis: false, contracts: false
            };
        }
        return DataEng.getUnlockedFeatures(player);
    },

    // ==========================================
    // 灰色數據操作
    // ==========================================

    executeScraping(player, intensity = 1) {
        const DataEng = window.DataEngine;
        if (!DataEng || !DataEng.isFeatureUnlocked(player, 'scraping')) {
            return { success: false, message: '此功能尚未解鎖' };
        }
        return DataEng.executeScraping(player, intensity);
    },

    // ==========================================
    // 數據合成操作（Tier 2+）
    // ==========================================

    getAvailableSynthesisMethods(player) {
        const DataEng = window.DataEngine;
        if (!DataEng || !DataEng.isFeatureUnlocked(player, 'synthesis')) {
            return [];
        }
        return DataEng.getAvailableSynthesisMethods(player);
    },

    synthesizeData(player, methodId) {
        const DataEng = window.DataEngine;
        if (!DataEng || !DataEng.isFeatureUnlocked(player, 'synthesis')) {
            return { success: false, message: '需要達成 Tier 2 里程碑解鎖此功能' };
        }
        return DataEng.synthesizeData(player, methodId);
    },

    // ==========================================
    // 數據清洗操作（Tier 2+）
    // ==========================================

    startCleaningTask(player, taskType, amount = null) {
        const DataEng = window.DataEngine;
        if (!DataEng || !DataEng.isFeatureUnlocked(player, 'cleaning')) {
            return { success: false, message: '需要達成 Tier 2 里程碑解鎖此功能' };
        }
        return DataEng.startCleaningTask(player, taskType, amount);
    },

    // ==========================================
    // 數據合約操作（Tier 2+）
    // ==========================================

    signDataContract(player, dataType) {
        const DataEng = window.DataEngine;
        if (!DataEng || !DataEng.isFeatureUnlocked(player, 'contracts')) {
            return { success: false, message: '需要達成 Tier 2 里程碑解鎖此功能' };
        }
        return DataEng.signDataContract(player, dataType);
    }
};

// 註冊到全局
window.DataIntegration = DataIntegration;

// ============================================
// Part 2: 自動補丁（延遲執行確保依賴載入）
// ============================================

(function() {
    'use strict';

    function applyAllPatches() {
        let patchCount = 0;

        // ------------------------------------------
        // 補丁 1: InitialStateEngine
        // ------------------------------------------
        const InitStateEng = window.InitialStateEngine;
        if (InitStateEng && InitStateEng.createInitialPlayerState) {
            const original = InitStateEng.createInitialPlayerState;
            InitStateEng.createInitialPlayerState = function(routeName) {
                let player = original.call(this, routeName);
                player = DataIntegration.integrateInitialState(player);
                return player;
            };
            patchCount++;
            console.log('  ✓ Patched InitialStateEngine.createInitialPlayerState');
        }

        // ------------------------------------------
        // 補丁 2: CommunityEngine（社群數據產出）
        // ------------------------------------------
        const CommunityEng = window.CommunityEngine;
        if (CommunityEng && CommunityEng.processCommunityTurnUpdate) {
            const original = CommunityEng.processCommunityTurnUpdate;
            CommunityEng.processCommunityTurnUpdate = function(player, globalParams) {
                const result = original.call(this, player, globalParams);
                
                if (result && result.dataGained && window.DataEngine) {
                    const DataEng = window.DataEngine;
                    if (DataEng.isFeatureUnlocked(result.player, 'sources')) {
                        // 撤銷原始的數據增加
                        result.player.high_data -= result.dataGained.high_data;
                        result.player.low_data -= result.dataGained.low_data;
                        // 使用新系統處理
                        const dataResult = DataIntegration.processCommunityDataOutput(
                            result.player, result.dataGained
                        );
                        result.player = dataResult.player;
                        result.dataGained = dataResult.added;
                    }
                }
                return result;
            };
            patchCount++;
            console.log('  ✓ Patched CommunityEngine.processCommunityTurnUpdate');
        }

        // ------------------------------------------
        // 補丁 3: processTurnUpdates（回合更新）
        // ------------------------------------------
        if (typeof window.processTurnUpdates === 'function') {
            const original = window.processTurnUpdates;
            window.processTurnUpdates = function(player, rivals, globalParams) {
                const result = original(player, rivals, globalParams);
                
                const dataResult = DataIntegration.processTurnUpdate(result.updatedPlayer, globalParams);
                if (dataResult.messages && dataResult.messages.length > 0) {
                    if (!result.milestoneMessages) result.milestoneMessages = [];
                    dataResult.messages.forEach(msg => {
                        result.milestoneMessages.push({
                            text: msg,
                            type: msg.includes('⚖️') || msg.includes('📉') ? 'warning' : 'info'
                        });
                    });
                }
                return result;
            };
            patchCount++;
            console.log('  ✓ Patched processTurnUpdates');
        }

        // ------------------------------------------
        // 補丁 4: ProductEngine（研發數據消耗）
        // ------------------------------------------
        const ProductEng = window.ProductEngine;
        if (ProductEng) {
            // 補丁 canStartDevelopment
            if (ProductEng.canStartDevelopment) {
                const originalCan = ProductEng.canStartDevelopment;
                ProductEng.canStartDevelopment = function(player, productId) {
                    const result = originalCan.call(this, player, productId);
                    if (!result.can) return result;
                    
                    if (window.DataIntegration) {
                        const product = result.product;
                        const startData = (product.devCost?.data || 0) * 0.5;
                        if (!DataIntegration.hasEnoughData(player, startData)) {
                            return { can: false, reason: `數據不足（需要 ${startData} 單位）` };
                        }
                    }
                    return result;
                };
            }

            // 補丁 startDevelopment
            if (ProductEng.startDevelopment) {
                const originalStart = ProductEng.startDevelopment;
                ProductEng.startDevelopment = function(player, productId) {
                    const check = this.canStartDevelopment(player, productId);
                    if (!check.can) return { success: false, message: check.reason };
                    
                    const product = check.product;
                    const startCash = product.devCost.cash * 0.5;
                    const startData = product.devCost.data * 0.5;
                    
                    player.cash -= startCash;
                    
                    if (window.DataIntegration) {
                        const consumeResult = DataIntegration.consumeDataForResearch(player, startData);
                        if (!consumeResult.success) {
                            player.cash += startCash;
                            return { success: false, message: consumeResult.message };
                        }
                    } else {
                        if (player.low_data >= startData) {
                            player.low_data -= startData;
                        } else {
                            const remaining = startData - player.low_data;
                            player.low_data = 0;
                            player.high_data = Math.max(0, player.high_data - remaining);
                        }
                    }
                    
                    const ps = player.product_state;
                    const ProductConfig = window.ProductConfig || {};
                    ps.products[productId].status = ProductConfig.PRODUCT_STATUS?.DEVELOPING || 'developing';
                    ps.products[productId].progress = 0;
                    ps.products[productId].devStartTurn = player.turn_count || 0;
                    ps.products[productId].costRemaining = {
                        cash: product.devCost.cash * 0.5,
                        data: product.devCost.data * 0.5
                    };
                    
                    return { success: true, message: `🔨 開始研發「${product.name}」`, player };
                };
            }

            // 補丁 updateAllDevelopment
            if (ProductEng.updateAllDevelopment) {
                const originalUpdate = ProductEng.updateAllDevelopment;
                ProductEng.updateAllDevelopment = function(player, productPflops, externalSpeedMult) {
                    const ps = player.product_state;
                    const completed = [];
                    const messages = [];
                    const ProductConfig = window.ProductConfig || {};
                    
                    const strategy = this.getComputeStrategy(ps.compute_strategy);
                    const baseSpeedMult = strategy.effects.product_speed;
                    
                    let speedMult;
                    if (typeof externalSpeedMult === 'number') {
                        speedMult = baseSpeedMult * externalSpeedMult;
                    } else {
                        const pflopBonus = 1 + productPflops * 0.05;
                        speedMult = baseSpeedMult * Math.min(2, pflopBonus);
                    }
                    
                    if (speedMult <= 0) {
                        messages.push("⚠️ 商品開發因算力不足而停滯");
                        return { completedProducts: completed, messages };
                    }
                    
                    Object.entries(ps.products).forEach(([productId, state]) => {
                        const DEVELOPING = ProductConfig.PRODUCT_STATUS?.DEVELOPING || 'developing';
                        const COMPLETED = ProductConfig.PRODUCT_STATUS?.COMPLETED || 'completed';
                        
                        if (state.status !== DEVELOPING) return;
                        
                        const product = this.getProductById(productId);
                        if (!product || product.devTurns <= 0) return;
                        
                        const progressPerTurn = (1 / product.devTurns) * speedMult;
                        state.progress = Math.min(1, state.progress + progressPerTurn);
                        
                        if (state.progress >= 1) {
                            if (state.costRemaining) {
                                player.cash -= state.costRemaining.cash;
                                
                                if (window.DataIntegration) {
                                    DataIntegration.consumeDataForResearch(player, state.costRemaining.data);
                                } else {
                                    if (player.low_data >= state.costRemaining.data) {
                                        player.low_data -= state.costRemaining.data;
                                    } else {
                                        const remaining = state.costRemaining.data - player.low_data;
                                        player.low_data = 0;
                                        player.high_data = Math.max(0, player.high_data - remaining);
                                    }
                                }
                            }
                            
                            state.status = COMPLETED;
                            state.progress = 1;
                            state.completedTurn = player.turn_count || 0;
                            delete state.costRemaining;
                            
                            ps.mastery.experience++;
                            ps.mastery.products_by_tier[state.tier] = 
                                (ps.mastery.products_by_tier[state.tier] || 0) + 1;
                            
                            if (this.checkMasteryLevelUp(ps)) {
                                const newLevel = this.getMasteryLevel(ps.mastery.level);
                                messages.push(`⭐ 專精度提升至：${newLevel.name}`);
                            }
                            
                            completed.push(product);
                            messages.push(`🎉 產品完成：${product.name}`);
                        }
                    });
                    
                    return { completedProducts: completed, messages };
                };
            }

            patchCount++;
            console.log('  ✓ Patched ProductEngine (canStart/start/updateAll)');
        }

        return patchCount;
    }

    // 延遲執行補丁（確保所有依賴已載入）
    function tryApplyPatches() {
        const requiredModules = [
            'DataEngine',
            'InitialStateEngine', 
            'CommunityEngine',
            'ProductEngine',
            'processTurnUpdates'
        ];
        
        const missing = requiredModules.filter(m => {
            if (m === 'processTurnUpdates') return typeof window[m] !== 'function';
            return !window[m];
        });

        if (missing.length > 0) {
            console.log('Data System Patch: 等待依賴載入...', missing);
            setTimeout(tryApplyPatches, 50);
            return;
        }

        console.log('✓ Data System Patch: 開始應用補丁...');
        const count = applyAllPatches();
        console.log(`✓ Data System Patch: 完成 (${count} 個補丁)`);
    }

    // 開始嘗試應用補丁
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryApplyPatches);
    } else {
        setTimeout(tryApplyPatches, 10);
    }

})();

console.log('✓ Data System Patch loaded (waiting for dependencies...)');
