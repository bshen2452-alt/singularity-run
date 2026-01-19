// ============================================
// 自營能源整合模組 (energy_products_integration.js)
// ============================================
// 整合接口：
//   1. AssetCardConfig.POWER_UPGRADES.renewable 解鎖判定
//   2. EnergyPriceEngine 電費計算整合
//   3. processTurnUpdates 回合更新整合
//   4. InitialState 初始化整合
// ============================================

(function() {
    'use strict';

    const EnergyProductsIntegration = {
        
        // ==========================================
        // 與 AssetCardConfig 的整合
        // ==========================================
        
        /**
         * 檢查玩家的 renewable 升級等級
         * 用於判斷可解鎖的能源產品
         */
        getRenewableUpgradeLevel(player) {
            return player.asset_upgrades?.power?.renewable || 0;
        },
        
        /**
         * 當 renewable 升級時，檢查新解鎖的能源產品
         * 應在 facility_upgrade_engine.js 的升級邏輯中調用
         */
        onRenewableUpgrade(player, newLevel) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            if (!config) return [];
            
            const newlyUnlocked = [];
            
            for (const [productId, product] of Object.entries(config.PRODUCTS)) {
                if (product.unlock.upgrade_level === newLevel) {
                    newlyUnlocked.push({
                        id: productId,
                        name: product.name,
                        icon: product.icon,
                        description: product.description
                    });
                }
            }
            
            return newlyUnlocked;
        },
        
        // ==========================================
        // 與 EnergyPriceEngine 的整合
        // ==========================================
        
        /**
         * 計算整合後的電費
         * 考慮自營能源的自供電部分
         */
        calculateIntegratedEnergyCost(player, globalMarket = {}, turnCount = 0, regionId = null) {
            const energyEngine = window.EnergyPriceEngine;
            const productsEngine = window.EnergyProductsEngine;
            
            if (!energyEngine) {
                return { error: 'EnergyPriceEngine 未載入' };
            }
            
            // 1. 取得原始電費計算
            const baseEnergyCost = energyEngine.calculateEnergyPrice(
                player, globalMarket, turnCount, regionId
            );
            
            // 2. 如果沒有自營能源，直接返回原始結果
            if (!productsEngine || !player.energy_products_state) {
                return baseEnergyCost;
            }
            
            // 3. 取得自營能源的供電情況
            const state = player.energy_products_state;
            const selfSupply = state.stats?.self_consumption || 0;
            const totalDemand = baseEnergyCost.contract_info?.capacity_used || 0;
            
            // 4. 計算從電網購買的電量
            const gridPurchase = Math.max(0, totalDemand - selfSupply);
            
            // 5. 重新計算電網電費（僅針對未自供的部分）
            const gridCostRatio = totalDemand > 0 ? gridPurchase / totalDemand : 1;
            const adjustedCost = baseEnergyCost.total_cost * gridCostRatio;
            
            // 6. 返回整合結果
            return {
                ...baseEnergyCost,
                
                // 覆蓋成本
                total_cost: Math.round(adjustedCost * 100) / 100,
                
                // 新增自營能源資訊
                self_supply: {
                    amount: selfSupply,
                    percentage: totalDemand > 0 ? 
                        Math.round((selfSupply / totalDemand) * 100) : 0,
                    savings: Math.round((baseEnergyCost.total_cost - adjustedCost) * 100) / 100
                },
                
                // 電網購買
                grid_purchase: {
                    amount: gridPurchase,
                    percentage: totalDemand > 0 ? 
                        Math.round((gridPurchase / totalDemand) * 100) : 100
                }
            };
        },
        
        // ==========================================
        // 與 processTurnUpdates 的整合
        // ==========================================
        
        /**
         * 回合更新入口
         * 應在 processTurnUpdates_engine.js 中調用
         */
        processTurn(player, globalMarket = {}, turnCount = 0) {
            const productsEngine = window.EnergyProductsEngine;
            
            if (!productsEngine) {
                return { processed: false, reason: 'EnergyProductsEngine 未載入' };
            }
            
            // 執行自營能源回合更新
            const result = productsEngine.processTurnUpdate(player, globalMarket, turnCount);
            
            // 生成回合報告條目
            if (result.processed) {
                return {
                    processed: true,
                    report: this.generateTurnReport(result),
                    result: result
                };
            }
            
            return { processed: false };
        },
        
        /**
         * 生成回合報告
         */
        generateTurnReport(updateResult) {
            const report = [];
            
            // 發電報告
            if (updateResult.generation.total_generation > 0) {
                report.push({
                    type: 'energy_generation',
                    icon: '⚡',
                    text: `自營電廠發電 ${updateResult.generation.total_generation} 單位`,
                    details: updateResult.generation.facilities
                });
            }
            
            // 售電報告
            if (updateResult.sales.revenue > 0) {
                report.push({
                    type: 'energy_sales',
                    icon: '💰',
                    text: `售電收入 +$${updateResult.sales.revenue}M`,
                    cash_change: updateResult.sales.revenue
                });
            }
            
            // 維護報告
            if (updateResult.maintenance.total > 0) {
                report.push({
                    type: 'energy_maintenance',
                    icon: '🔧',
                    text: `電廠維護 -$${updateResult.maintenance.total}M`,
                    cash_change: -updateResult.maintenance.total
                });
            }
            
            // 建設完成報告
            for (const update of updateResult.development_updates) {
                if (update.completed) {
                    report.push({
                        type: 'facility_completed',
                        icon: '🏭',
                        text: update.message,
                        highlight: true
                    });
                }
            }
            
            // 節省電費報告
            if (updateResult.saved_cost > 0) {
                report.push({
                    type: 'energy_savings',
                    icon: '📉',
                    text: `自供電節省 $${updateResult.saved_cost}M 電費`
                });
            }
            
            return report;
        },
        
        // ==========================================
        // 與 InitialState 的整合
        // ==========================================
        
        /**
         * 初始化玩家的自營能源狀態
         * 應在 InitialState_engine.js 的 createPlayer 中調用
         */
        initializePlayerState(player) {
            const productsEngine = window.EnergyProductsEngine;
            
            if (productsEngine) {
                player.energy_products_state = productsEngine.createInitialState();
            }
            
            return player;
        },
        
        // ==========================================
        // 與 Dashboard 的整合
        // ==========================================
        
        /**
         * 取得儀表板顯示數據
         */
        getDashboardData(player) {
            const productsEngine = window.EnergyProductsEngine;
            const config = window.ENERGY_PRODUCTS_CONFIG;
            
            if (!productsEngine || !config) {
                return null;
            }
            
            const summary = productsEngine.getFacilitySummary(player);
            const independence = productsEngine.calculateEnergyIndependence(player);
            const renewableLevel = this.getRenewableUpgradeLevel(player);
            
            // 取得可建設的產品
            const availableProducts = config.getAvailableProducts(player);
            const canBuild = availableProducts.filter(p => p.canUnlock);
            
            return {
                // 當前狀態
                renewable_level: renewableLevel,
                energy_independence: independence,
                
                // 設施概況
                developing_count: summary.developing.length,
                operating_count: summary.operating.length,
                total_capacity: summary.stats.total_capacity,
                
                // 本季數據
                generation: summary.stats.total_generation,
                self_consumption: summary.stats.self_consumption,
                power_sold: summary.stats.power_sold,
                sales_revenue: summary.stats.sales_revenue,
                
                // 可建設項目
                can_build: canBuild.length,
                available_products: canBuild.map(p => ({
                    id: p.id,
                    name: p.name,
                    icon: p.icon,
                    cost: p.development.base_cost
                })),
                
                // 詳細列表
                facilities: {
                    developing: summary.developing,
                    operating: summary.operating
                }
            };
        },
        
        // ==========================================
        // 效果整合（ESG、Hype 等）
        // ==========================================
        
        /**
         * 計算自營能源對各項指標的影響
         */
        calculateEffects(player) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            const state = player.energy_products_state;
            
            if (!config || !state) {
                return { esg: 0, hype: 0, regulation: 0, energy_independence: 0 };
            }
            
            let totalESG = 0;
            let totalHype = 0;
            let totalRegulation = 0;
            let totalIndependence = 0;
            
            for (const facility of Object.values(state.facilities)) {
                if (facility.status !== 'operating') continue;
                
                const product = config.PRODUCTS[facility.productId];
                if (!product?.effects) continue;
                
                totalESG += product.effects.esg_score || 0;
                totalHype += product.effects.hype || 0;
                totalRegulation += product.effects.regulation || 0;
                totalIndependence += product.effects.energy_independence || 0;
            }
            
            return {
                esg: totalESG,
                hype: totalHype,
                regulation: totalRegulation,
                energy_independence: Math.min(1.0, totalIndependence)
            };
        }
    };

    // ==========================================
    // 自動整合到現有系統
    // ==========================================
    
    // 整合到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.EnergyProductsIntegration = EnergyProductsIntegration;
        
        // 擴展 calculateEnergyPrice（如果存在）
        if (window.GameEngine.calculateEnergyPrice) {
            const originalFn = window.GameEngine.calculateEnergyPrice;
            window.GameEngine.calculateEnergyPrice = function(player, globalMarket, turnCount, regionId) {
                return EnergyProductsIntegration.calculateIntegratedEnergyCost(
                    player, globalMarket, turnCount, regionId
                );
            };
        }
    }
    
    // 全局註冊
    window.EnergyProductsIntegration = EnergyProductsIntegration;
    
    console.log('✓ Energy Products Integration loaded');

})();
