// ============================================
// 奇點競速 - 產品系統整合層 (Products Integration)
// ============================================
// 連接 ProductEngine 與遊戲核心系統
// 處理人才數量驗證、初始化、UI數據轉換

const ProductIntegration = {
    
    // ==========================================
    // 人才系統輔助函數
    // ==========================================
    
    /**
     * 獲取 Turing 人才狀態
     * @param {Object} player - 玩家狀態
     * @returns {Object} { total, usedForUnlock, available }
     */
    getTuringStatus(player) {
        const total = player.talent?.turing || 0;
        const usedForUnlock = player.product_state?.turing_unlocks?.length || 0;
        return {
            total: total,
            usedForUnlock: usedForUnlock,
            available: Math.max(0, total - usedForUnlock)
        };
    },
    
    /**
     * 檢查是否可用 Turing 解鎖產品
     * @param {Object} player - 玩家狀態
     * @returns {Object} { can, reason, turingStatus }
     */
    canUnlockWithTuring(player) {
        const status = this.getTuringStatus(player);
        if (status.available <= 0) {
            return {
                can: false,
                reason: `Turing 人才已全數用於解鎖產品（${status.usedForUnlock}/${status.total}）`,
                turingStatus: status
            };
        }
        return { can: true, turingStatus: status };
    },
    
    /**
     * 獲取 Senior 人才狀態
     * @param {Object} player - 玩家狀態
     * @returns {Object} { total, assignedToProducts, available }
     */
    getSeniorStatus(player) {
        const total = player.talent?.senior || 0;
        let assignedToProducts = 0;
        
        const ps = player.product_state;
        if (ps && ps.products) {
            Object.values(ps.products).forEach(state => {
                if (state.assignedSenior > 0) {
                    assignedToProducts += state.assignedSenior;
                }
            });
        }
        
        return {
            total: total,
            assignedToProducts: assignedToProducts,
            available: Math.max(0, total - assignedToProducts)
        };
    },
    
    /**
     * 檢查是否可分配 Senior 到產品
     * @param {Object} player - 玩家狀態
     * @returns {Object} { can, reason, seniorStatus }
     */
    canAssignSenior(player) {
        const status = this.getSeniorStatus(player);
        if (status.available <= 0) {
            return {
                can: false,
                reason: `Senior 人才已全數分配至產品營運（${status.assignedToProducts}/${status.total}）`,
                seniorStatus: status
            };
        }
        return { can: true, seniorStatus: status };
    },
    
    // ==========================================
    // 初始化函數
    // ==========================================
    
    /**
     * 初始化產品系統（Tier 1 里程碑通過時調用）
     * @param {Object} player - 玩家狀態
     * @returns {Object} 更新後的玩家狀態
     */
    initializeProductState(player) {
        if (!player.product_state) {
            player.product_state = window.ProductEngine.createInitialProductState();
        }
        
        // 確保 turing_unlocks 陣列存在
        if (!player.product_state.turing_unlocks) {
            player.product_state.turing_unlocks = [];
        }
        
        return player;
    },
    
    /**
     * 初始化特定 Tier 的產品（里程碑通過時調用）
     * @param {Object} player - 玩家狀態
     * @param {number} tier - 里程碑 Tier
     * @returns {Object} 更新後的玩家狀態
     */
    initializeTierProducts(player, tier) {
        // 確保 product_state 存在
        this.initializeProductState(player);
        
        // 調用 ProductEngine 初始化該 Tier 產品
        return window.ProductEngine.initializeTierProducts(player, tier);
    },
    
    // ==========================================
    // UI 數據轉換
    // ==========================================
    
    /**
     * 獲取 UI 顯示用的產品狀態
     * 將 products 物件轉換為分類陣列
     * @param {Object} player - 玩家狀態
     * @returns {Object} { developing_products, completed_products, operating_products, suspended_products }
     */
    getProductStateForUI(player) {
        const ps = player.product_state;
        if (!ps || !ps.products) {
            return {
                developing_products: [],
                completed_products: [],
                operating_products: [],
                suspended_products: [],
                locked_products: [],
                unlocked_products: []
            };
        }
        
        const STATUS = window.ProductConfig?.PRODUCT_STATUS || {
            LOCKED: "locked",
            UNLOCKED: "unlocked",
            DEVELOPING: "developing",
            COMPLETED: "completed",
            OPERATING: "operating",
            SUSPENDED: "suspended"
        };
        
        const result = {
            developing_products: [],
            completed_products: [],
            operating_products: [],
            suspended_products: [],
            locked_products: [],
            unlocked_products: []
        };
        
        Object.entries(ps.products).forEach(([productId, state]) => {
            const productInfo = window.ProductEngine?.getProductById(productId);
            const item = {
                productId: productId,
                tier: state.tier,
                progress: state.progress || 0,
                status: state.status,
                assignedSenior: state.assignedSenior || 0,
                completedTurn: state.completedTurn,
                turingUnlocked: state.turingUnlocked || false,
                costRemaining: state.costRemaining,
                totalTurns: productInfo?.devTurns || 4
            };
            
            switch (state.status) {
                case STATUS.LOCKED:
                    result.locked_products.push(item);
                    break;
                case STATUS.UNLOCKED:
                    result.unlocked_products.push(item);
                    break;
                case STATUS.DEVELOPING:
                    result.developing_products.push(item);
                    break;
                case STATUS.COMPLETED:
                    result.completed_products.push(item);
                    break;
                case STATUS.OPERATING:
                    result.operating_products.push(item);
                    break;
                case STATUS.SUSPENDED:
                    result.suspended_products.push(item);
                    break;
            }
        });
        
        return result;
    },
    
    // ==========================================
    // 動作執行（帶人才驗證）
    // ==========================================
    
    /**
     * 使用 Turing 解鎖產品（帶人數驗證）
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品ID
     * @returns {Object} { success, message, player }
     */
    unlockProductWithTuring(player, productId) {
        // 驗證 Turing 數量
        const check = this.canUnlockWithTuring(player);
        if (!check.can) {
            return { success: false, message: check.reason };
        }
        
        // 調用 ProductEngine 執行解鎖
        return window.ProductEngine.unlockProductWithTuring(player, productId);
    },
    
    /**
     * 分配 Senior 到產品（帶人數驗證）
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品ID
     * @returns {Object} { success, message, player }
     */
    assignSeniorToProduct(player, productId) {
        // 驗證 Senior 數量
        const check = this.canAssignSenior(player);
        if (!check.can) {
            return { success: false, message: check.reason };
        }
        
        // 調用 ProductEngine 執行分配
        return window.ProductEngine.assignSeniorToProduct(player, productId);
    },
    
    /**
     * 從產品移除 Senior
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品ID
     * @returns {Object} { success, message, player }
     */
    removeSeniorFromProduct(player, productId) {
        return window.ProductEngine.removeSeniorFromProduct(player, productId);
    },
    
    /**
     * 招募 Turing 人才
     * @param {Object} player - 玩家狀態
     * @returns {Object} { success, message, player }
     */
    recruitTuring(player) {
        const COSTS = window.GameConfig?.COSTS || {};
        const recruitPrice = COSTS.TURING_RECRUIT_PRICE || 50;
        
        if (player.cash < recruitPrice) {
            return { 
                success: false, 
                message: `資金不足，招募 Turing 需要 $${recruitPrice}M` 
            };
        }
        
        player.cash -= recruitPrice;
        if (!player.talent) player.talent = {};
        player.talent.turing = (player.talent.turing || 0) + 1;
        
        return {
            success: true,
            message: `🎓 成功招募 Turing 級工程師！目前共 ${player.talent.turing} 位`,
            player: player
        };
    },
    
    /**
     * 招募 Senior 人才
     * @param {Object} player - 玩家狀態
     * @returns {Object} { success, message, player }
     */
    recruitSenior(player) {
        const COSTS = window.GameConfig?.COSTS || {};
        const recruitPrice = COSTS.SENIOR_RECRUIT_PRICE || 20;
        
        if (player.cash < recruitPrice) {
            return { 
                success: false, 
                message: `資金不足，招募 Senior 需要 $${recruitPrice}M` 
            };
        }
        
        player.cash -= recruitPrice;
        if (!player.talent) player.talent = {};
        player.talent.senior = (player.talent.senior || 0) + 1;
        
        return {
            success: true,
            message: `👨‍💻 成功招募 Senior 工程師！目前共 ${player.talent.senior} 位`,
            player: player
        };
    },
    
    // ==========================================
    // 產品收益計算整合
    // ==========================================
    
    /**
     * 計算並更新產品系統相關數據
     * @param {Object} player - 玩家狀態
     * @param {number} inferencePflops - 推理算力
     * @returns {Object} { demand, fulfillment, revenue }
     */
    updateProductMetrics(player, inferencePflops) {
        const ps = player.product_state;
        if (!ps) return { demand: 0, fulfillment: 1.0, revenue: 0 };
        
        const demand = window.ProductEngine.calculateProductDemand(player);
        const fulfillment = window.ProductEngine.calculateProductFulfillment(player, inferencePflops);
        const revenue = window.ProductEngine.calculateProductRevenue(player);
        
        ps.product_demand = demand;
        ps.product_fulfillment = fulfillment;
        ps.product_revenue = revenue;
        
        return { demand, fulfillment, revenue };
    },
    
    // ==========================================
    // 人才系統預留擴展接口
    // ==========================================
    
    /**
     * 獲取完整人才狀態（預留未來擴展）
     * @param {Object} player - 玩家狀態
     * @returns {Object} 完整的人才狀態
     */
    getFullTalentStatus(player) {
        const turing = this.getTuringStatus(player);
        const senior = this.getSeniorStatus(player);
        
        return {
            turing: turing,
            senior: senior,
            junior: {
                total: player.talent?.junior || 0,
                // 預留：Junior 未來可能也有分配機制
                assigned: 0,
                available: player.talent?.junior || 0
            },
            // 預留：人才總薪資
            totalSalary: this.calculateTalentSalary(player),
            // 預留：人才效率加成
            efficiencyBonus: this.calculateTalentEfficiency(player)
        };
    },
    
    /**
     * 計算人才總薪資
     * @param {Object} player - 玩家狀態
     * @returns {number} 總薪資
     */
    calculateTalentSalary(player) {
        const COSTS = window.GameConfig?.COSTS || {
            TURING_SALARY: 5,
            SENIOR_SALARY: 2,
            JUNIOR_SALARY: 0.5
        };
        
        const talent = player.talent || {};
        return (talent.turing || 0) * COSTS.TURING_SALARY +
               (talent.senior || 0) * COSTS.SENIOR_SALARY +
               (talent.junior || 0) * COSTS.JUNIOR_SALARY;
    },
    
    /**
     * 計算人才效率加成（預留）
     * @param {Object} player - 玩家狀態
     * @returns {Object} 各項加成
     */
    calculateTalentEfficiency(player) {
        const talent = player.talent || {};
        const turing = talent.turing || 0;
        const senior = talent.senior || 0;
        
        return {
            // Turing 對 MP 成長的加成
            mpGrowthBonus: 1 + turing * 0.15,
            // Turing 對產品開發的加成
            productDevBonus: 1 + turing * 0.10,
            // Turing 對里程碑成功率的加成
            milestoneBonus: turing * 0.05,
            // Senior 對研發的加成
            researchBonus: 1 + senior * 0.05,
            // Senior 對服務品質的加成
            serviceQualityBonus: 1 + senior * 0.03
        };
    }
};

// 導出到全局
window.ProductIntegration = ProductIntegration;

// ==========================================
// 擴展 MilestoneEngine 以整合產品初始化
// ==========================================

(function() {
    // 保存原始函數
    const originalExecuteMilestoneLaunch = window.MilestoneEngine?.executeMilestoneLaunch;
    
    if (window.MilestoneEngine && originalExecuteMilestoneLaunch) {
        window.MilestoneEngine.executeMilestoneLaunch = function(player, tier) {
            // 執行原始里程碑邏輯
            const result = originalExecuteMilestoneLaunch.call(this, player, tier);
            
            // 如果成功，初始化產品系統
            if (result.success) {
                // Tier 1 時初始化整個產品系統
                if (tier === 1) {
                    ProductIntegration.initializeProductState(player);
                }
                // 初始化該 Tier 的產品
                ProductIntegration.initializeTierProducts(player, tier);
                
                // 添加產品系統訊息
                if (result.messages) {
                    result.messages.push(`📦 Tier ${tier} 產品線已解鎖！`);
                }
            }
            
            return result;
        };
    }
})();

console.log('✓ Products Integration loaded');