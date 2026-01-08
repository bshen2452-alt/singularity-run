// ============================================
// 專精度經驗值計算修正 - Mastery Experience Fix
// ============================================
// 問題：目前每完成一個商品只獲得 1 點經驗值，
//       而策略藍圖技能成本動輒 400~1000，根本無法啟用
// 解決：
//   1. 商品完成開發時給予一次性經驗獎勵
//   2. 營運中的產品每回合持續產出經驗值
//   3. 等級門檻調整為合理的累積值

/**
 * 專精度經驗值配置
 */
const MASTERY_EXPERIENCE_CONFIG = {
    
    // ==========================================
    // 商品完成開發獲得的一次性經驗值
    // ==========================================
    EXPERIENCE_PER_PRODUCT: {
        1: 80,    // Tier 1 商品完成：80 經驗
        2: 120,   // Tier 2 商品完成：120 經驗
        3: 180,   // Tier 3 商品完成：180 經驗
        4: 250    // Tier 4 商品完成：250 經驗
    },
    
    // ==========================================
    // 營運中產品每回合產出的經驗值（核心機制）
    // 有 Senior 分配營運的產品，每回合穩定產出經驗
    // ==========================================
    EXPERIENCE_PER_TURN_OPERATING: {
        1: 15,    // Tier 1 產品營運：每回合 +15 經驗
        2: 25,    // Tier 2 產品營運：每回合 +25 經驗
        3: 40,    // Tier 3 產品營運：每回合 +40 經驗
        4: 60     // Tier 4 產品營運：每回合 +60 經驗
    },
    
    // ==========================================
    // 里程碑商品首次營運額外獎勵
    // ==========================================
    MILESTONE_FIRST_OPERATION_BONUS: {
        1: 50,    // Tier 1 里程碑首次營運：額外 +50 經驗
        2: 80,    // Tier 2 里程碑首次營運：額外 +80 經驗
        3: 120,   // Tier 3 里程碑首次營運：額外 +120 經驗
        4: 180    // Tier 4 里程碑首次營運：額外 +180 經驗
    },
    
    // ==========================================
    // 等級門檻（累積經驗值達到後升級）
    // 設計：Tier 2 解鎖策略藍圖時，玩家應有約 200-400 經驗
    //       足以啟用 1 個低成本技能 (400-500)
    // ==========================================
    LEVEL_THRESHOLDS: {
        0: { exp_required: 0,    name: "入門" },
        1: { exp_required: 150,  name: "熟練" },   // 約 2 回合營運 + 1 個商品完成
        2: { exp_required: 400,  name: "專家" },   // 約 5-6 回合營運
        3: { exp_required: 800,  name: "大師" },   // 約 10-12 回合營運
        4: { exp_required: 1500, name: "傳奇" },   // 穩定營運 + 多產品
        5: { exp_required: 2500, name: "神話" }    // 長期經營
    },
    
    // ==========================================
    // 等級獎勵
    // ==========================================
    LEVEL_BONUSES: {
        0: { mp_bonus: 0,    milestone_bonus: 0,  inference_reduction: 0,    unlock_skills: 0 },
        1: { mp_bonus: 0.05, milestone_bonus: 5,  inference_reduction: 0.05, unlock_skills: 1 },
        2: { mp_bonus: 0.10, milestone_bonus: 10, inference_reduction: 0.10, unlock_skills: 2 },
        3: { mp_bonus: 0.15, milestone_bonus: 15, inference_reduction: 0.15, unlock_skills: 3 },
        4: { mp_bonus: 0.20, milestone_bonus: 20, inference_reduction: 0.20, unlock_skills: 4 },
        5: { mp_bonus: 0.25, milestone_bonus: 25, inference_reduction: 0.25, unlock_skills: 5 }
    }
};

// ============================================
// 工具函數
// ============================================

/**
 * 計算商品完成獲得的經驗值
 */
function calculateProductCompletionExperience(tier) {
    return MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_PRODUCT[tier] || 50;
}

/**
 * 計算營運中產品每回合產出的經驗值
 */
function calculateOperatingExperiencePerTurn(tier) {
    return MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_TURN_OPERATING[tier] || 10;
}

/**
 * 計算里程碑首次營運獎勵
 */
function calculateMilestoneFirstOperationBonus(tier) {
    return MASTERY_EXPERIENCE_CONFIG.MILESTONE_FIRST_OPERATION_BONUS[tier] || 30;
}

/**
 * 根據經驗值計算當前等級
 */
function calculateMasteryLevel(experience) {
    const thresholds = MASTERY_EXPERIENCE_CONFIG.LEVEL_THRESHOLDS;
    let level = 0;
    
    for (let i = 5; i >= 0; i--) {
        if (experience >= thresholds[i].exp_required) {
            level = i;
            break;
        }
    }
    
    return level;
}

/**
 * 取得等級資訊
 */
function getMasteryLevelInfo(level) {
    const safeLevel = Math.min(5, Math.max(0, level || 0));
    const threshold = MASTERY_EXPERIENCE_CONFIG.LEVEL_THRESHOLDS[safeLevel];
    const bonus = MASTERY_EXPERIENCE_CONFIG.LEVEL_BONUSES[safeLevel];
    
    return {
        level: safeLevel,
        name: threshold.name,
        exp_required: threshold.exp_required,
        ...bonus
    };
}

/**
 * 計算所有營運中產品的每回合經驗產出總和
 * 注意：這個函數返回 totalExp 供 processTurnUpdates 使用
 */
function calculateTotalOperatingExperience(player) {
    const ps = player?.product_state;
    if (!ps || !ps.products) return 0;
    
    let totalExp = 0;
    
    Object.entries(ps.products).forEach(([productId, state]) => {
        // 只有營運中且有 Senior 分配的產品才產出經驗
        if (state.status === 'operating' && state.assignedSenior > 0) {
            const tier = state.tier || 1;
            totalExp += calculateOperatingExperiencePerTurn(tier);
        }
    });
    
    return totalExp;
}

/**
 * 計算營運經驗（供 processTurnUpdates 呼叫的接口）
 * 同時更新整體專精度與產品線經驗
 * 返回 { totalExp } 格式
 */
function calculateOperatingExperience(player) {
    const totalExp = calculateTotalOperatingExperience(player);
    
    // 同時更新產品線經驗（如果 ProductLineEngine 已載入）
    if (window.ProductLineEngine?.processProductLineExperience) {
        window.ProductLineEngine.processProductLineExperience(player);
    }
    
    return { totalExp };
}

// ============================================
// 覆寫 ProductConfig.MASTERY_LEVELS
// ============================================

(function() {
    'use strict';
    
    function patchMasteryLevels() {
        if (typeof ProductConfig === 'undefined') {
            setTimeout(patchMasteryLevels, 50);
            return;
        }
        
        ProductConfig.MASTERY_LEVELS = {};
        for (let i = 0; i <= 5; i++) {
            const threshold = MASTERY_EXPERIENCE_CONFIG.LEVEL_THRESHOLDS[i];
            const bonus = MASTERY_EXPERIENCE_CONFIG.LEVEL_BONUSES[i];
            ProductConfig.MASTERY_LEVELS[i] = {
                name: threshold.name,
                exp_required: threshold.exp_required,
                ...bonus
            };
        }
        
        console.log('✓ ProductConfig.MASTERY_LEVELS 已更新');
    }
    
    patchMasteryLevels();
})();

// ============================================
// 覆寫 ProductEngine 相關方法
// ============================================

(function() {
    'use strict';
    
    function patchProductEngine() {
        if (typeof ProductEngine === 'undefined') {
            setTimeout(patchProductEngine, 100);
            return;
        }
        
        // 保存原始方法
        const originalProcessDevelopment = ProductEngine.processProductDevelopment;
        const originalAssignSenior = ProductEngine.assignSeniorToProduct;
        
        /**
         * 覆寫：取得專精度等級資訊
         */
        ProductEngine.getMasteryLevel = function(level) {
            return getMasteryLevelInfo(level);
        };
        
        /**
         * 覆寫：檢查專精度升級
         */
        ProductEngine.checkMasteryLevelUp = function(productState) {
            const currentExp = productState.mastery.experience || 0;
            const newLevel = calculateMasteryLevel(currentExp);
            const oldLevel = productState.mastery.level || 0;
            
            if (newLevel > oldLevel) {
                productState.mastery.level = newLevel;
                return true;
            }
            return false;
        };
        
        /**
         * 覆寫：處理商品開發進度（商品完成時給經驗）
         */
        ProductEngine.processProductDevelopment = function(player, speedMult) {
            const ps = player.product_state;
            if (!ps || !ps.products) {
                return { completedProducts: [], messages: [] };
            }
            
            const completed = [];
            const messages = [];
            
            if (speedMult <= 0) {
                messages.push("⚠️ 商品開發因算力不足而停滯");
                return { completedProducts: completed, messages };
            }
            
            Object.entries(ps.products).forEach(([productId, state]) => {
                if (state.status !== ProductConfig.PRODUCT_STATUS.DEVELOPING) return;
                
                const product = this.getProductById(productId);
                if (!product || product.devTurns <= 0) return;
                
                const progressPerTurn = (1 / product.devTurns) * speedMult;
                state.progress = Math.min(1, state.progress + progressPerTurn);
                
                if (state.progress >= 1) {
                    // 扣除剩餘成本
                    if (state.costRemaining) {
                        player.cash -= state.costRemaining.cash;
                        if (player.low_data >= state.costRemaining.data) {
                            player.low_data -= state.costRemaining.data;
                        } else {
                            const remaining = state.costRemaining.data - player.low_data;
                            player.low_data = 0;
                            player.high_data = Math.max(0, player.high_data - remaining);
                        }
                    }
                    
                    state.status = ProductConfig.PRODUCT_STATUS.COMPLETED;
                    state.progress = 1;
                    state.completedTurn = player.turn_count || 0;
                    delete state.costRemaining;
                    
                    // ★ 商品完成經驗獎勵
                    const expGained = calculateProductCompletionExperience(state.tier);
                    ps.mastery.experience = (ps.mastery.experience || 0) + expGained;
                    
                    // ★ 同時增加產品線經驗
                    if (window.ProductLineEngine?.onProductCompleted) {
                        const lineExp = window.ProductLineEngine.onProductCompleted(player, productId, state.tier);
                        const lineName = window.ProductLineEngine.getProductLineNameById?.(productId);
                        if (lineName && lineExp > 0) {
                            messages.push(`📊 「${lineName}」產品線 +${lineExp} 經驗`);
                        }
                    }
                    
                    ps.mastery.products_by_tier[state.tier] = 
                        (ps.mastery.products_by_tier[state.tier] || 0) + 1;
                    
                    if (this.checkMasteryLevelUp(ps)) {
                        const newLevel = this.getMasteryLevel(ps.mastery.level);
                        messages.push(`⭐ 專精度提升至：${newLevel.name}（Lv.${ps.mastery.level}）`);
                    }
                    
                    completed.push(product);
                    messages.push(`🎉 商品完成：${product.name}（+${expGained} 經驗）`);
                }
            });
            
            return { completedProducts: completed, messages };
        };
        
        /**
         * 覆寫：分配 Senior 到產品營運（里程碑首次營運獎勵）
         */
        ProductEngine.assignSeniorToProduct = function(player, productId) {
            const ps = player.product_state;
            const product = this.getProductById(productId);
            
            const isFirstOperation = product && 
                                     product.type === 'milestone' && 
                                     ps.products[productId] && 
                                     !ps.products[productId].expAwarded;
            
            const result = originalAssignSenior.call(this, player, productId);
            
            if (result.success && isFirstOperation) {
                const tier = this.getProductTier(productId);
                const expGained = calculateMilestoneFirstOperationBonus(tier);
                
                ps.mastery.experience = (ps.mastery.experience || 0) + expGained;
                ps.products[productId].expAwarded = true;
                
                if (this.checkMasteryLevelUp(ps)) {
                    const newLevel = this.getMasteryLevel(ps.mastery.level);
                    result.message += ` ⭐ 專精度提升至：${newLevel.name}`;
                }
                
                result.message += `（+${expGained} 經驗）`;
            }
            
            return result;
        };
        
        /**
         * 新增：處理營運中產品的每回合經驗產出
         * 此方法應在每回合結束時被呼叫
         */
        ProductEngine.processOperatingExperience = function(player) {
            const ps = player.product_state;
            if (!ps || !ps.products) return { expGained: 0, messages: [] };
            
            const messages = [];
            let totalExpGained = 0;
            
            Object.entries(ps.products).forEach(([productId, state]) => {
                if (state.status === 'operating' && state.assignedSenior > 0) {
                    const tier = state.tier || 1;
                    const expPerTurn = calculateOperatingExperiencePerTurn(tier);
                    totalExpGained += expPerTurn;
                }
            });
            
            if (totalExpGained > 0) {
                ps.mastery.experience = (ps.mastery.experience || 0) + totalExpGained;
                
                if (this.checkMasteryLevelUp(ps)) {
                    const newLevel = this.getMasteryLevel(ps.mastery.level);
                    messages.push(`⭐ 專精度提升至：${newLevel.name}（Lv.${ps.mastery.level}）`);
                }
                
                messages.push(`📈 產品營運經驗：+${totalExpGained}`);
            }
            
            return { expGained: totalExpGained, messages };
        };
        
        console.log('✓ ProductEngine 專精度計算方法已覆寫（含營運經驗產出）');
    }
    
    patchProductEngine();
})();

// ============================================
// 暴露給全局
// ============================================

window.MASTERY_EXPERIENCE_CONFIG = MASTERY_EXPERIENCE_CONFIG;
window.MasteryExperienceUtils = {
    calculateProductCompletionExperience,
    calculateOperatingExperiencePerTurn,
    calculateMilestoneFirstOperationBonus,
    calculateMasteryLevel,
    getMasteryLevelInfo,
    calculateTotalOperatingExperience,
    calculateOperatingExperience  // 供 processTurnUpdates 呼叫
};

console.log('✓ Mastery Experience Fix loaded');
console.log('  經驗來源：');
console.log('  - 商品完成：T1 +' + MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_PRODUCT[1] + 
            ' | T2 +' + MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_PRODUCT[2] +
            ' | T3 +' + MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_PRODUCT[3] +
            ' | T4 +' + MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_PRODUCT[4]);
console.log('  - 每回合營運：T1 +' + MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_TURN_OPERATING[1] + 
            ' | T2 +' + MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_TURN_OPERATING[2] +
            ' | T3 +' + MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_TURN_OPERATING[3] +
            ' | T4 +' + MASTERY_EXPERIENCE_CONFIG.EXPERIENCE_PER_TURN_OPERATING[4]);