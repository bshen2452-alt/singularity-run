// ============================================
// 產品線升級系統 - Product Line Upgrade System
// ============================================
// 功能：事業部 (Business Division) 與 事業子公司 (Business Subsidiary) 機制
// 設計：自動從產品名稱解析產品線，無需硬編碼產品線名稱
// 路線：產品 → 產品線 → 事業部 → 事業子公司
// 邏輯：透過產品展現公司願景，累積經驗施展經營策略

const ProductLineUpgradeConfig = {
    
    // ==========================================
    // 產品線識別規則
    // ==========================================
    // 產品名稱格式: "產品線名稱v版本. 商品名稱"
    // 例如: "算力供應v1. H100 算力池" → 產品線 = "算力供應"
    NAME_PATTERN: /^(.+?)v\d+\.\s*.+$/,
    
    // ==========================================
    // 升級階段定義（事業線路線）
    // ==========================================
    UPGRADE_STAGES: {
        OPERATING: {
            id: 'operating',
            name: '營運中',
            icon: '🏭',
            description: '需分配 Senior 維持營運，人員離職會導致暫停',
            expRequired: 0,
            tierRequired: 1,
            benefits: {
                seniorProtection: false,    // Senior 離職會暫停
                operatingCostReduction: 0,  // 營運成本減免
                revenueShare: 1.0           // 收益比例 100%
            }
        },
        BUSINESS_DIVISION: {
            id: 'business_division',
            name: '事業部',
            icon: '🏢',
            description: '獨立事業部運作，Senior 離職不影響營運',
            expRequired: 800,
            tierRequired: 1,
            cost: {
                cash: 50,       // $50M
                junior: 2,      // 2 Junior
                senior: 0       // 0 Senior
            },
            benefits: {
                seniorProtection: true,     // Senior 離職不影響
                operatingCostReduction: 0,  // 營運成本減免
                revenueShare: 1.0           // 收益比例 100%
            }
        },
        BUSINESS_SUBSIDIARY: {
            id: 'business_subsidiary',
            name: '事業子公司',
            icon: '🏛️',
            description: '獨立事業子公司，免營運成本並獲得分紅',
            expRequired: 1500,
            tierRequired: 3,
            cost: {
                cash: 150,      // $150M
                junior: 3,      // 3 Junior
                senior: 1       // 1 Senior
            },
            benefits: {
                seniorProtection: true,     // Senior 離職不影響
                operatingCostReduction: 1.0,// 營運成本減免 100%
                revenueShare: 0.7           // 收益比例 70% (30% 作為子公司營運)
            }
        }
    },
    
    // 階段ID映射（向後兼容）
    STAGE_ALIASES: {
        'division': 'business_division',
        'subsidiary': 'business_subsidiary'
    },
    
    // ==========================================
    // 經驗值設定（與整體專精度分開計算）
    // ==========================================
    EXPERIENCE: {
        // 商品完成時獲得的產品線經驗
        PRODUCT_COMPLETION: {
            1: 60,      // Tier 1 商品完成
            2: 100,     // Tier 2 商品完成
            3: 150,     // Tier 3 商品完成
            4: 220      // Tier 4 商品完成
        },
        // 每回合營運獲得的產品線經驗
        OPERATING_PER_TURN: {
            1: 12,      // Tier 1 營運
            2: 20,      // Tier 2 營運
            3: 32,      // Tier 3 營運
            4: 48       // Tier 4 營運
        }
    }
};

// ============================================
// 產品線管理引擎
// ============================================

const ProductLineEngine = {
    
    /**
     * 從產品名稱解析產品線名稱
     * @param {string} productName - 產品名稱，如 "算力供應v1. H100 算力池"
     * @returns {string|null} 產品線名稱，如 "算力供應"
     */
    parseProductLineName(productName) {
        if (!productName) return null;
        
        const match = productName.match(ProductLineUpgradeConfig.NAME_PATTERN);
        if (match && match[1]) {
            return match[1].trim();
        }
        
        // 備用：嘗試以 "v" + 數字 分割
        const vIndex = productName.search(/v\d+\./);
        if (vIndex > 0) {
            return productName.substring(0, vIndex).trim();
        }
        
        return null;
    },
    
    /**
     * 從產品 ID 獲取產品線名稱
     * @param {string} productId - 產品 ID
     * @returns {string|null} 產品線名稱
     */
    getProductLineNameById(productId) {
        const ProductEng = window.ProductEngine;
        if (!ProductEng?.getProductById) return null;
        
        const product = ProductEng.getProductById(productId);
        if (!product?.name) return null;
        
        return this.parseProductLineName(product.name);
    },
    
    /**
     * 獲取玩家所有產品線的狀態（事業線）
     * @param {Object} player - 玩家狀態
     * @returns {Object} { [lineName]: BusinessUnitState }
     */
    getAllProductLineStates(player) {
        const ps = player?.product_state;
        if (!ps?.products) return {};
        
        // 使用新的 business_units 欄位（優先）
        if (!player.business_units) {
            player.business_units = {};
        }
        
        // 向後兼容：如果舊的 product_lines 存在，遷移到 business_units
        if (ps.product_lines && Object.keys(ps.product_lines).length > 0 && Object.keys(player.business_units).length === 0) {
            Object.entries(ps.product_lines).forEach(([lineName, lineState]) => {
                player.business_units[lineName] = {
                    name: lineName,
                    experience: lineState.experience || 0,
                    stage: this.normalizeStageId(lineState.stage || 'operating'),
                    maxTier: lineState.maxTier || 1,
                    products: lineState.products || [],
                    route: lineState.route || player.route,
                    region_deployed: lineState.region_deployed || null
                };
            });
            console.log('✓ 已將 product_lines 遷移至 business_units');
        }
        
        // 掃描所有產品，按產品線分組
        const lineProducts = {};  // { lineName: [productId, ...] }
        
        Object.keys(ps.products).forEach(productId => {
            const lineName = this.getProductLineNameById(productId);
            if (lineName) {
                if (!lineProducts[lineName]) {
                    lineProducts[lineName] = [];
                }
                lineProducts[lineName].push(productId);
            }
        });
        
        // 確保每個產品線都有狀態記錄
        Object.keys(lineProducts).forEach(lineName => {
            if (!player.business_units[lineName]) {
                player.business_units[lineName] = {
                    name: lineName,
                    experience: 0,
                    stage: 'operating',
                    maxTier: 1,
                    products: [],
                    route: player.route,
                    region_deployed: null
                };
            }
            player.business_units[lineName].products = lineProducts[lineName];
        });
        
        // 同步到舊結構（向後兼容）
        ps.product_lines = player.business_units;
        
        return player.business_units;
    },
    
    /**
     * 獲取單一產品線狀態（事業單位）
     * @param {Object} player - 玩家狀態
     * @param {string} lineName - 產品線名稱
     * @returns {Object|null} 產品線狀態
     */
    getProductLineState(player, lineName) {
        const lines = this.getAllProductLineStates(player);
        return lines[lineName] || null;
    },
    
    /**
     * 獲取產品線內的最高 Tier
     * @param {Object} player - 玩家狀態
     * @param {string} lineName - 產品線名稱
     * @returns {number} 最高 Tier
     */
    getProductLineMaxTier(player, lineName) {
        const ps = player?.product_state;
        if (!ps?.products) return 0;
        
        let maxTier = 0;
        
        Object.entries(ps.products).forEach(([productId, state]) => {
            const productLineName = this.getProductLineNameById(productId);
            if (productLineName === lineName) {
                // 只計算已完成/營運中/暫停的產品
                if (['completed', 'operating', 'suspended'].includes(state.status)) {
                    maxTier = Math.max(maxTier, state.tier || 1);
                }
            }
        });
        
        return maxTier;
    },
    
    /**
     * 增加產品線經驗值
     * @param {Object} player - 玩家狀態
     * @param {string} lineName - 產品線名稱
     * @param {number} amount - 經驗值數量
     * @returns {Object} { newExp, leveledUp, newStage }
     */
    addProductLineExperience(player, lineName, amount) {
        const lines = this.getAllProductLineStates(player);
        const lineState = lines[lineName];
        
        if (!lineState) {
            return { newExp: 0, leveledUp: false, newStage: null };
        }
        
        const oldExp = lineState.experience || 0;
        lineState.experience = oldExp + amount;
        
        // 更新最高 Tier
        lineState.maxTier = this.getProductLineMaxTier(player, lineName);
        
        return {
            newExp: lineState.experience,
            leveledUp: false,
            newStage: lineState.stage
        };
    },
    
    /**
     * 解析階段ID（支援向後兼容）
     * @param {string} stageId - 階段ID
     * @returns {string} 標準化階段ID
     */
    normalizeStageId(stageId) {
        if (!stageId) return 'operating';
        const alias = ProductLineUpgradeConfig.STAGE_ALIASES[stageId];
        return alias || stageId;
    },
    
    /**
     * 檢查產品線是否可升級到指定階段
     * @param {Object} player - 玩家狀態
     * @param {string} lineName - 產品線名稱
     * @param {string} targetStage - 目標階段 ('business_division' | 'business_subsidiary')
     * @returns {Object} { canUpgrade, reason, cost }
     */
    canUpgradeProductLine(player, lineName, targetStage) {
        const lineState = this.getProductLineState(player, lineName);
        if (!lineState) {
            return { canUpgrade: false, reason: '產品線不存在' };
        }
        
        // 標準化階段ID
        const normalizedTarget = this.normalizeStageId(targetStage);
        const stageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES[normalizedTarget.toUpperCase()];
        if (!stageConfig) {
            return { canUpgrade: false, reason: '無效的升級目標' };
        }
        
        // 檢查當前階段
        const currentStageOrder = { operating: 0, business_division: 1, business_subsidiary: 2 };
        const normalizedCurrent = this.normalizeStageId(lineState.stage);
        const targetStageOrder = currentStageOrder[normalizedTarget];
        const currentOrder = currentStageOrder[normalizedCurrent] || 0;
        
        if (currentOrder >= targetStageOrder) {
            return { canUpgrade: false, reason: '已達到或超過此階段' };
        }
        
        // 檢查經驗值
        if (lineState.experience < stageConfig.expRequired) {
            return { 
                canUpgrade: false, 
                reason: `經驗不足（需要 ${stageConfig.expRequired}，目前 ${lineState.experience}）` 
            };
        }
        
        // 檢查 Tier 要求
        const maxTier = this.getProductLineMaxTier(player, lineName);
        if (maxTier < stageConfig.tierRequired) {
            return { 
                canUpgrade: false, 
                reason: `需要 Tier ${stageConfig.tierRequired} 以上產品（目前最高 Tier ${maxTier}）` 
            };
        }
        
        // 檢查成本
        const cost = stageConfig.cost;
        if (cost) {
            if (player.cash < cost.cash) {
                return { canUpgrade: false, reason: `現金不足（需要 $${cost.cash}M）` };
            }
            if ((player.talent?.junior || 0) < cost.junior) {
                return { canUpgrade: false, reason: `Junior 不足（需要 ${cost.junior} 人）` };
            }
            if ((player.talent?.senior || 0) < cost.senior) {
                return { canUpgrade: false, reason: `Senior 不足（需要 ${cost.senior} 人）` };
            }
        }
        
        return { 
            canUpgrade: true, 
            reason: null,
            cost: cost
        };
    },
    
    /**
     * 執行產品線升級
     * @param {Object} player - 玩家狀態
     * @param {string} lineName - 產品線名稱
     * @param {string} targetStage - 目標階段
     * @returns {Object} { success, message, player }
     */
    upgradeProductLine(player, lineName, targetStage) {
        const normalizedTarget = this.normalizeStageId(targetStage);
        const checkResult = this.canUpgradeProductLine(player, lineName, normalizedTarget);
        
        if (!checkResult.canUpgrade) {
            return { success: false, message: checkResult.reason, player };
        }
        
        const stageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES[normalizedTarget.toUpperCase()];
        const lineState = this.getProductLineState(player, lineName);
        
        // 扣除成本
        const cost = stageConfig.cost;
        if (cost) {
            player.cash -= cost.cash;
            player.talent.junior -= cost.junior;
            player.talent.senior -= cost.senior;
        }
        
        // 更新階段（使用標準化ID）
        lineState.stage = normalizedTarget;
        
        return {
            success: true,
            message: `🎉 「${lineName}」產品線已升級為${stageConfig.name}！`,
            player
        };
    },
    
    /**
     * 檢查產品線是否受 Senior 保護
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品 ID
     * @returns {boolean} 是否受保護
     */
    isProductProtected(player, productId) {
        const lineName = this.getProductLineNameById(productId);
        if (!lineName) return false;
        
        const lineState = this.getProductLineState(player, lineName);
        if (!lineState) return false;
        
        const normalizedStage = this.normalizeStageId(lineState.stage);
        const stageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES[normalizedStage.toUpperCase()];
        return stageConfig?.benefits?.seniorProtection || false;
    },
    
    /**
     * 獲取產品線的營運成本減免比例
     * @param {Object} player - 玩家狀態
     * @param {string} lineName - 產品線名稱
     * @returns {number} 減免比例 (0-1)
     */
    getOperatingCostReduction(player, lineName) {
        const lineState = this.getProductLineState(player, lineName);
        if (!lineState) return 0;
        
        const normalizedStage = this.normalizeStageId(lineState.stage);
        const stageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES[normalizedStage.toUpperCase()];
        return stageConfig?.benefits?.operatingCostReduction || 0;
    },
    
    /**
     * 獲取產品線的收益比例
     * @param {Object} player - 玩家狀態
     * @param {string} lineName - 產品線名稱
     * @returns {number} 收益比例 (0-1)
     */
    getRevenueShare(player, lineName) {
        const lineState = this.getProductLineState(player, lineName);
        if (!lineState) return 1.0;
        
        const normalizedStage = this.normalizeStageId(lineState.stage);
        const stageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES[normalizedStage.toUpperCase()];
        return stageConfig?.benefits?.revenueShare || 1.0;
    },
    
    /**
     * 處理每回合產品線經驗更新
     * @param {Object} player - 玩家狀態
     * @returns {Object} { expGained: { [lineName]: amount }, messages }
     */
    processProductLineExperience(player) {
        const ps = player?.product_state;
        if (!ps?.products) return { expGained: {}, messages: [] };
        
        const expGained = {};
        const messages = [];
        
        // 遍歷所有營運中的產品
        Object.entries(ps.products).forEach(([productId, state]) => {
            if (state.status === 'operating' && state.assignedSenior > 0) {
                const lineName = this.getProductLineNameById(productId);
                if (!lineName) return;
                
                const tier = state.tier || 1;
                const expPerTurn = ProductLineUpgradeConfig.EXPERIENCE.OPERATING_PER_TURN[tier] || 10;
                
                if (!expGained[lineName]) {
                    expGained[lineName] = 0;
                }
                expGained[lineName] += expPerTurn;
            }
        });
        
        // 應用經驗值
        Object.entries(expGained).forEach(([lineName, amount]) => {
            this.addProductLineExperience(player, lineName, amount);
        });
        
        return { expGained, messages };
    },
    
    /**
     * 商品完成時增加產品線經驗
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品 ID
     * @param {number} tier - 產品 Tier
     * @returns {number} 獲得的經驗值
     */
    onProductCompleted(player, productId, tier) {
        const lineName = this.getProductLineNameById(productId);
        if (!lineName) return 0;
        
        const expGained = ProductLineUpgradeConfig.EXPERIENCE.PRODUCT_COMPLETION[tier] || 50;
        this.addProductLineExperience(player, lineName, expGained);
        
        return expGained;
    },
    
    /**
     * 獲取所有產品線的升級狀態摘要
     * @param {Object} player - 玩家狀態
     * @returns {Array} 產品線摘要列表
     */
    getProductLineSummary(player) {
        const lines = this.getAllProductLineStates(player);
        const summary = [];
        
        Object.entries(lines).forEach(([lineName, lineState]) => {
            const normalizedStage = this.normalizeStageId(lineState.stage);
            const stageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES[normalizedStage.toUpperCase()];
            const maxTier = this.getProductLineMaxTier(player, lineName);
            
            // 計算下一階段
            let nextStage = null;
            let nextStageConfig = null;
            if (normalizedStage === 'operating') {
                nextStage = 'business_division';
                nextStageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES.BUSINESS_DIVISION;
            } else if (normalizedStage === 'business_division') {
                nextStage = 'business_subsidiary';
                nextStageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES.BUSINESS_SUBSIDIARY;
            }
            
            const canUpgrade = nextStage ? 
                this.canUpgradeProductLine(player, lineName, nextStage) : 
                { canUpgrade: false };
            
            summary.push({
                name: lineName,
                experience: lineState.experience,
                stage: normalizedStage,
                stageIcon: stageConfig?.icon || '🏭',
                stageName: stageConfig?.name || '營運中',
                maxTier: maxTier,
                productCount: lineState.products?.length || 0,
                nextStage: nextStage,
                nextStageName: nextStageConfig?.name,
                nextStageExp: nextStageConfig?.expRequired,
                canUpgrade: canUpgrade.canUpgrade,
                upgradeReason: canUpgrade.reason
            });
        });
        
        return summary;
    }
};

// ============================================
// 整合到現有系統
// ============================================

(function() {
    'use strict';
    
    function integrateProductLineSystem() {
        // 等待 ProductEngine 載入
        if (typeof window.ProductEngine === 'undefined') {
            setTimeout(integrateProductLineSystem, 100);
            return;
        }
        
        // 保存原始方法
        const originalProcessDevelopment = window.ProductEngine.processProductDevelopment;
        const originalAdjustSeniorAllocation = window.ProductEngine.adjustSeniorAllocation;
        
        // 覆寫商品開發完成處理，加入產品線經驗
        if (originalProcessDevelopment) {
            window.ProductEngine.processProductDevelopment = function(player, speedMult) {
                const result = originalProcessDevelopment.call(this, player, speedMult);
                
                // 為每個完成的產品增加產品線經驗
                if (result.completedProducts) {
                    result.completedProducts.forEach(product => {
                        const tier = player.product_state?.products?.[product.id]?.tier || 1;
                        const lineExp = ProductLineEngine.onProductCompleted(player, product.id, tier);
                        if (lineExp > 0) {
                            const lineName = ProductLineEngine.getProductLineNameById(product.id);
                            result.messages = result.messages || [];
                            result.messages.push(`📊 「${lineName}」產品線 +${lineExp} 經驗`);
                        }
                    });
                }
                
                return result;
            };
        }
        
        // 覆寫 Senior 調整，排除受保護的產品線
        if (originalAdjustSeniorAllocation) {
            window.ProductEngine.adjustSeniorAllocation = function(player) {
                const ps = player.product_state;
                if (!ps || !ps.products) {
                    return { adjusted: false, suspendedProducts: [] };
                }
                
                const totalSeniors = player.talent?.senior || 0;
                const suspendedProducts = [];
                
                // 收集所有營運中的產品，區分受保護與不受保護
                const protectedProducts = [];
                const unprotectedProducts = [];
                
                Object.entries(ps.products).forEach(([productId, state]) => {
                    if (state.status === 'operating' && state.assignedSenior > 0) {
                        const isProtected = ProductLineEngine.isProductProtected(player, productId);
                        const productInfo = {
                            productId,
                            tier: state.tier || 1,
                            assignedSenior: state.assignedSenior
                        };
                        
                        if (isProtected) {
                            protectedProducts.push(productInfo);
                        } else {
                            unprotectedProducts.push(productInfo);
                        }
                    }
                });
                
                // 只計算不受保護的產品所需 Senior
                const unprotectedAssigned = unprotectedProducts.reduce((sum, p) => sum + p.assignedSenior, 0);
                
                // 如果不受保護的產品 Senior 需求超過可用數，暫停一些
                if (unprotectedAssigned > totalSeniors) {
                    // 按 Tier 從低到高排序（優先暫停低階產品）
                    unprotectedProducts.sort((a, b) => a.tier - b.tier);
                    
                    let excess = unprotectedAssigned - totalSeniors;
                    
                    for (const op of unprotectedProducts) {
                        if (excess <= 0) break;
                        
                        const state = ps.products[op.productId];
                        if (state) {
                            state.assignedSenior = 0;
                            state.status = 'suspended';
                            suspendedProducts.push(op.productId);
                            excess -= op.assignedSenior;
                        }
                    }
                }
                
                return {
                    adjusted: suspendedProducts.length > 0,
                    suspendedProducts
                };
            };
        }
        
        console.log('✓ ProductLineEngine 已整合到 ProductEngine');
    }
    
    integrateProductLineSystem();
})();

// ============================================
// 暴露到全局
// ============================================

window.ProductLineUpgradeConfig = ProductLineUpgradeConfig;
window.ProductLineEngine = ProductLineEngine;

console.log('✓ Product Line Upgrade System loaded (Business Line)');
console.log('  - 事業部解鎖：800 經驗');
console.log('  - 事業子公司解鎖：1500 經驗 + Tier 3');