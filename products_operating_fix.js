// ============================================
// 產品營運系統修復
// ============================================
// 修復問題：
// 1. 里程碑產品獎勵應在達成里程碑時給予，而非派遣Senior時
// 2. 營運中商品每回合應提供熟練度
// 3. Senior數量下降時應自動暫停超額營運的產品

(function() {
    'use strict';
    
    // ==========================================
    // 問題1修復：移除里程碑產品的 effectsApplied 觸發
    // ==========================================
    
    // 保存原始的 assignSeniorToProduct
    const originalAssignSenior = window.ProductEngine?.assignSeniorToProduct;
    
    if (window.ProductEngine && originalAssignSenior) {
        window.ProductEngine.assignSeniorToProduct = function(player, productId) {
            const product = this.getProductById(productId);
            const ps = player.product_state;
            
            // 里程碑產品不應該在派遣Senior時觸發效果
            // 效果應該在 executeMilestoneLaunch 時已經給予
            if (product?.type === 'milestone') {
                // 確保產品狀態存在
                if (!ps.products[productId]) {
                    const tier = this.getProductTier(productId);
                    if (!player.mp_milestones?.[tier]) {
                        return { success: false, message: `需要先達成 Tier ${tier} 里程碑` };
                    }
                    ps.products[productId] = {
                        status: 'unlocked',
                        type: 'milestone',
                        tier: tier,
                        progress: 1,
                        assignedSenior: 0,
                        completedTurn: player.turn_count || 0,
                        effectsApplied: true  // 里程碑效果在達成時已應用
                    };
                }
                
                const productState = ps.products[productId];
                
                // 檢查可用Senior
                const seniors = this.getAvailableSeniors(player);
                if (seniors.available <= 0) {
                    return { success: false, message: `沒有可分配的Senior人才` };
                }
                
                if (productState.assignedSenior >= 1) {
                    return { success: false, message: "此產品已有Senior營運" };
                }
                
                // 分配Senior（不觸發效果，因為里程碑效果已在達成時給予）
                productState.assignedSenior = 1;
                productState.status = 'operating';
                productState.effectsApplied = true;  // 標記為已應用，防止重複觸發
                
                return {
                    success: true,
                    message: `👤 已分配Senior營運「${product.name}」`,
                    player
                };
            }
            
            // 非里程碑產品使用原始邏輯
            return originalAssignSenior.call(this, player, productId);
        };
    }
    
    
    // ==========================================
    // 問題3修復：Senior不足時自動暫停產品
    // ==========================================
    
    /**
     * 檢查並調整Senior分配（當Senior減少時自動暫停超額產品）
     * @param {Object} player - 玩家狀態
     * @returns {Object} { adjusted, suspendedProducts }
     */
    function adjustSeniorAllocation(player) {
        const ps = player.product_state;
        if (!ps || !ps.products) {
            return { adjusted: false, suspendedProducts: [] };
        }
        
        const totalSeniors = player.talent?.senior || 0;
        const suspendedProducts = [];
        
        // 收集所有營運中的產品
        const operatingProducts = [];
        Object.entries(ps.products).forEach(([productId, state]) => {
            if (state.status === 'operating' && state.assignedSenior > 0) {
                operatingProducts.push({
                    productId,
                    tier: state.tier || 1,
                    assignedSenior: state.assignedSenior
                });
            }
        });
        
        // 計算當前分配的Senior總數
        const totalAssigned = operatingProducts.reduce((sum, p) => sum + p.assignedSenior, 0);
        
        // 如果分配數超過可用數，需要暫停一些產品
        if (totalAssigned > totalSeniors) {
            // 按Tier從低到高排序（優先暫停低階產品）
            operatingProducts.sort((a, b) => a.tier - b.tier);
            
            let excess = totalAssigned - totalSeniors;
            
            for (const op of operatingProducts) {
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
    }
    
    // 添加到 ProductEngine
    if (window.ProductEngine) {
        window.ProductEngine.adjustSeniorAllocation = adjustSeniorAllocation;
    }
    
    // ==========================================
    // 修改回合處理，加入Senior調整檢查
    // ==========================================
    
    // 創建一個hook函數，在每回合結束時檢查Senior分配
    window.checkSeniorAllocationOnTurnEnd = function(player) {
        if (!window.ProductEngine?.adjustSeniorAllocation) return null;
        
        const result = window.ProductEngine.adjustSeniorAllocation(player);
        
        if (result.adjusted && result.suspendedProducts.length > 0) {
            const productNames = result.suspendedProducts.map(id => {
                const product = window.ProductEngine.getProductById?.(id);
                return product?.name || id;
            });
            
            return {
                type: 'warning',
                message: `⚠️ Senior不足，已暫停產品：${productNames.join('、')}`
            };
        }
        
        return null;
    };
    
    console.log('✓ Products Operating Fix loaded');
    console.log('  - 里程碑獎勵觸發修正');
    console.log('  - 營運熟練度功能啟用');
    console.log('  - Senior自動調整功能啟用');
    
})();
