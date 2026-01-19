// ============================================
// 自營能源產品引擎 (energy_products_engine.js)
// ============================================
// 純邏輯引擎，處理：
//   1. 能源產品開發進度
//   2. 營運中電廠的供電計算
//   3. 電力分配與售電收入
//   4. 與 EnergyPriceEngine 的整合
// ============================================

(function() {
    'use strict';

    const EnergyProductsEngine = {
        
        // ==========================================
        // 初始化
        // ==========================================
        
        /**
         * 初始化玩家的自營能源狀態
         */
        createInitialState() {
            return {
                // 能源設施狀態
                facilities: {},  // { facilityId: { productId, status, progress, ... } }
                
                // 電力分配設定
                power_allocation: {
                    strategy: 'self_priority',
                    custom_ratios: {}
                },
                
                // 售電合約
                sales_contracts: [],  // [{ type, start_turn, end_turn, committed_power }]
                
                // 統計數據
                stats: {
                    total_capacity: 0,
                    total_generation: 0,
                    self_consumption: 0,
                    power_sold: 0,
                    sales_revenue: 0,
                    consecutive_supply_turns: 0
                }
            };
        },
        
        /**
         * 確保玩家有能源產品狀態
         */
        ensureState(player) {
            if (!player.energy_products_state) {
                player.energy_products_state = this.createInitialState();
            }
            return player.energy_products_state;
        },
        
        // ==========================================
        // 解鎖與開發
        // ==========================================
        
        /**
         * 檢查是否可開始建設能源設施
         */
        canStartDevelopment(player, productId) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            if (!config) return { success: false, message: '能源產品配置未載入' };
            
            // 檢查解鎖條件
            const unlockCheck = config.canUnlockProduct(player, productId);
            if (!unlockCheck.canUnlock) {
                return { success: false, message: unlockCheck.reason };
            }
            
            const product = config.PRODUCTS[productId];
            const devCost = product.development.base_cost;
            
            // 檢查現金
            if ((player.cash || 0) < devCost) {
                return { success: false, message: `現金不足，需要 $${devCost}M` };
            }
            
            // 檢查是否已有相同類型設施在建
            const state = this.ensureState(player);
            const existingFacility = Object.values(state.facilities).find(
                f => f.productId === productId && f.status === 'developing'
            );
            if (existingFacility) {
                return { success: false, message: '已有相同類型設施正在建設中' };
            }
            
            return { success: true, cost: devCost };
        },
        
        /**
         * 開始建設能源設施
         */
        startDevelopment(player, productId) {
            const check = this.canStartDevelopment(player, productId);
            if (!check.success) {
                return check;
            }
            
            const config = window.ENERGY_PRODUCTS_CONFIG;
            const product = config.PRODUCTS[productId];
            const state = this.ensureState(player);
            
            // 生成設施ID
            const facilityId = `${productId}_${Date.now()}`;
            
            // 扣除開發成本
            player.cash -= check.cost;
            
            // 建立設施記錄
            state.facilities[facilityId] = {
                id: facilityId,
                productId: productId,
                name: product.name,
                icon: product.icon,
                status: 'developing',
                
                // 開發進度
                progress: 0,
                total_turns: product.development.development_turns,
                start_turn: player.turn_count || 0,
                
                // 分配的資源
                assigned_senior: 0,
                
                // 建設階段（如果有）
                current_phase: product.development.phases ? 0 : null,
                phases: product.development.phases || null
            };
            
            return {
                success: true,
                message: `開始建設 ${product.name}，預計 ${product.development.development_turns} 季完工`,
                facilityId: facilityId,
                cost: check.cost
            };
        },
        
        /**
         * 更新設施建設進度（每回合調用）
         */
        updateDevelopmentProgress(player, facilityId) {
            const state = this.ensureState(player);
            const facility = state.facilities[facilityId];
            
            if (!facility || facility.status !== 'developing') {
                return { updated: false };
            }
            
            const config = window.ENERGY_PRODUCTS_CONFIG;
            const product = config.PRODUCTS[facility.productId];
            
            // 計算進度加成
            let progressBoost = 1.0;
            
            // Senior 加成
            const seniorCount = facility.assigned_senior || 0;
            progressBoost += seniorCount * (product.development.senior_boost || 0.04);
            
            // Turing 加成
            const turingCount = player.talent?.turing || 0;
            if (turingCount > 0) {
                progressBoost += product.development.turing_boost || 0.08;
            }
            
            // 更新進度
            facility.progress += progressBoost;
            
            // 檢查是否完工
            if (facility.progress >= facility.total_turns) {
                facility.status = 'operating';
                facility.completed_turn = player.turn_count || 0;
                facility.operation_start = player.turn_count || 0;
                
                // 初始化營運數據
                facility.operation_data = {
                    total_generated: 0,
                    total_sold: 0,
                    total_revenue: 0,
                    maintenance_due: 0
                };
                
                return {
                    updated: true,
                    completed: true,
                    message: `${facility.name} 建設完成，開始營運！`
                };
            }
            
            return {
                updated: true,
                completed: false,
                progress: facility.progress,
                remaining: Math.ceil(facility.total_turns - facility.progress)
            };
        },
        
        // ==========================================
        // 營運與發電
        // ==========================================
        
        /**
         * 計算單一設施的當季發電量
         */
        calculateFacilityGeneration(facility, seasonId, globalMarket = {}) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            const product = config.PRODUCTS[facility.productId];
            
            if (!product || facility.status !== 'operating') {
                return { generation: 0, capacity: 0 };
            }
            
            const operation = product.operation;
            const baseCapacity = operation.power_capacity_pf;
            
            // 季節影響
            const seasonalMult = product.seasonal_performance?.[seasonId] || 1.0;
            
            // 可靠性影響（隨機波動）
            const reliabilityFactor = Math.random() < operation.reliability ? 1.0 : 0.7;
            
            // 天氣依賴（如果有）
            let weatherFactor = 1.0;
            if (operation.weather_dependency) {
                // 簡化：隨機波動
                weatherFactor = 1.0 + (Math.random() - 0.5) * operation.weather_dependency;
            }
            
            // 設施老化（簡化：每40季降低1%）
            const age = (facility.completed_turn || 0) - (facility.operation_start || 0);
            const ageFactor = Math.max(0.8, 1.0 - Math.floor(age / 40) * 0.01);
            
            const generation = baseCapacity * seasonalMult * reliabilityFactor * weatherFactor * ageFactor;
            
            return {
                generation: Math.round(generation * 10) / 10,
                capacity: baseCapacity,
                seasonal_mult: seasonalMult,
                reliability_factor: reliabilityFactor,
                weather_factor: weatherFactor,
                age_factor: ageFactor
            };
        },
        
        /**
         * 計算玩家所有設施的總發電量
         */
        calculateTotalGeneration(player, seasonId, globalMarket = {}) {
            const state = this.ensureState(player);
            
            let totalGeneration = 0;
            let totalCapacity = 0;
            const facilityDetails = [];
            
            for (const [facilityId, facility] of Object.entries(state.facilities)) {
                if (facility.status !== 'operating') continue;
                
                const gen = this.calculateFacilityGeneration(facility, seasonId, globalMarket);
                totalGeneration += gen.generation;
                totalCapacity += gen.capacity;
                
                facilityDetails.push({
                    id: facilityId,
                    name: facility.name,
                    ...gen
                });
            }
            
            return {
                total_generation: Math.round(totalGeneration * 10) / 10,
                total_capacity: totalCapacity,
                facilities: facilityDetails
            };
        },
        
        // ==========================================
        // 電力分配
        // ==========================================
        
        /**
         * 計算電力分配（自用 vs 售出）
         */
        allocatePower(player, totalGeneration, powerDemand) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            const state = this.ensureState(player);
            
            const strategyId = state.power_allocation?.strategy || 'self_priority';
            const strategy = config.POWER_ALLOCATION.strategies[strategyId];
            
            let selfConsumption = 0;
            let powerSold = 0;
            let gridPurchase = 0;
            
            if (strategy.self_ratio === 1.0 || strategy.sell_ratio === 'surplus') {
                // 自用優先策略
                selfConsumption = Math.min(totalGeneration, powerDemand);
                powerSold = Math.max(0, totalGeneration - powerDemand);
                gridPurchase = Math.max(0, powerDemand - totalGeneration);
            } else {
                // 固定比例策略
                const minSelfRatio = config.SYSTEM.min_self_supply_ratio;
                const actualSelfRatio = Math.max(minSelfRatio, strategy.self_ratio);
                
                selfConsumption = totalGeneration * actualSelfRatio;
                powerSold = totalGeneration * (1 - actualSelfRatio);
                gridPurchase = Math.max(0, powerDemand - selfConsumption);
            }
            
            return {
                strategy: strategyId,
                self_consumption: Math.round(selfConsumption * 10) / 10,
                power_sold: Math.round(powerSold * 10) / 10,
                grid_purchase: Math.round(gridPurchase * 10) / 10,
                self_sufficiency: powerDemand > 0 ? 
                    Math.round((selfConsumption / powerDemand) * 100) : 100
            };
        },
        
        /**
         * 設定電力分配策略
         */
        setAllocationStrategy(player, strategyId) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            
            if (!config.POWER_ALLOCATION.strategies[strategyId]) {
                return { success: false, message: '無效的分配策略' };
            }
            
            const state = this.ensureState(player);
            state.power_allocation.strategy = strategyId;
            
            return { 
                success: true, 
                message: `電力分配策略已設為：${config.POWER_ALLOCATION.strategies[strategyId].name}`
            };
        },
        
        // ==========================================
        // 售電收入
        // ==========================================
        
        /**
         * 計算售電收入
         */
        calculateSalesRevenue(player, powerSold, seasonId, marketPrice = 1.0) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            const state = this.ensureState(player);
            
            if (powerSold <= 0) {
                return { revenue: 0, power_sold: 0 };
            }
            
            // 取得當前售電合約類型
            const activeContract = state.sales_contracts?.find(
                c => c.end_turn > (player.turn_count || 0)
            );
            const contractType = activeContract?.type || 'spot';
            
            // 連續供電季數
            const consecutiveTurns = state.stats?.consecutive_supply_turns || 0;
            
            return config.calculateSalesRevenue(
                powerSold,
                marketPrice,
                seasonId,
                contractType,
                consecutiveTurns
            );
        },
        
        // ==========================================
        // 維護成本
        // ==========================================
        
        /**
         * 計算所有設施的維護成本
         */
        calculateMaintenanceCost(player) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            const state = this.ensureState(player);
            
            let totalMaintenance = 0;
            const maintenanceDetails = [];
            
            for (const [facilityId, facility] of Object.entries(state.facilities)) {
                if (facility.status !== 'operating') continue;
                
                const product = config.PRODUCTS[facility.productId];
                if (!product) continue;
                
                let maintenance = product.operation.maintenance_per_turn || 0;
                
                // 燃料成本波動（僅燃氣電廠）
                if (product.operation.fuel_cost_variance) {
                    const variance = product.operation.fuel_cost_variance;
                    const fuelFactor = 1 + (Math.random() - 0.5) * 2 * variance;
                    maintenance *= fuelFactor;
                }
                
                // 大修週期
                const age = (player.turn_count || 0) - (facility.operation_start || 0);
                const maintenanceInterval = config.SYSTEM.maintenance_interval || 4;
                if (age > 0 && age % maintenanceInterval === 0) {
                    maintenance *= 2;  // 大修季雙倍維護
                }
                
                totalMaintenance += maintenance;
                maintenanceDetails.push({
                    id: facilityId,
                    name: facility.name,
                    cost: Math.round(maintenance * 10) / 10
                });
            }
            
            return {
                total: Math.round(totalMaintenance * 10) / 10,
                details: maintenanceDetails
            };
        },
        
        // ==========================================
        // 回合更新（整合入口）
        // ==========================================
        
        /**
         * 執行回合更新
         * @param {Object} player - 玩家狀態
         * @param {Object} globalMarket - 全球市場狀態
         * @param {number} turnCount - 當前回合
         * @returns {Object} 更新結果
         */
        processTurnUpdate(player, globalMarket = {}, turnCount = 0) {
            const config = window.ENERGY_PRODUCTS_CONFIG;
            if (!config) return { processed: false };
            
            const state = this.ensureState(player);
            
            // 取得當前季節
            const seasonId = window.EnergyPriceEngine?.getCurrentSeason(turnCount)?.id || 'spring';
            
            // 取得市場電價
            const energyPrice = globalMarket?.indices?.energy_price?.value 
                ? globalMarket.indices.energy_price.value / 100 
                : 1.0;
            
            // 1. 更新建設中設施進度
            const developmentUpdates = [];
            for (const facilityId of Object.keys(state.facilities)) {
                const update = this.updateDevelopmentProgress(player, facilityId);
                if (update.updated) {
                    developmentUpdates.push({ facilityId, ...update });
                }
            }
            
            // 2. 計算總發電量
            const generation = this.calculateTotalGeneration(player, seasonId, globalMarket);
            
            // 3. 計算電力需求（從現有算力推算）
            const totalPflops = (player.pflops || 0) + (player.cloud_pflops || 0);
            const powerDemand = totalPflops;  // 簡化：1 PF = 1 單位電力需求
            
            // 4. 電力分配
            const allocation = this.allocatePower(player, generation.total_generation, powerDemand);
            
            // 5. 計算售電收入
            const salesResult = this.calculateSalesRevenue(
                player, 
                allocation.power_sold, 
                seasonId, 
                energyPrice
            );
            
            // 6. 計算維護成本
            const maintenance = this.calculateMaintenanceCost(player);
            
            // 7. 計算節省的電費（自供電的部分）
            const savedCost = allocation.self_consumption * energyPrice;
            
            // 8. 淨效益 = 售電收入 + 節省電費 - 維護成本
            const netBenefit = salesResult.revenue + savedCost - maintenance.total;
            
            // 9. 更新統計
            state.stats.total_capacity = generation.total_capacity;
            state.stats.total_generation = generation.total_generation;
            state.stats.self_consumption = allocation.self_consumption;
            state.stats.power_sold = allocation.power_sold;
            state.stats.sales_revenue = salesResult.revenue;
            
            // 連續供電追蹤
            if (allocation.power_sold > 0) {
                state.stats.consecutive_supply_turns = (state.stats.consecutive_supply_turns || 0) + 1;
            } else {
                state.stats.consecutive_supply_turns = 0;
            }
            
            // 10. 應用到玩家現金流
            player.cash = (player.cash || 0) + salesResult.revenue - maintenance.total;
            
            return {
                processed: true,
                season: seasonId,
                generation: generation,
                allocation: allocation,
                sales: salesResult,
                maintenance: maintenance,
                saved_cost: Math.round(savedCost * 10) / 10,
                net_benefit: Math.round(netBenefit * 10) / 10,
                development_updates: developmentUpdates
            };
        },
        
        // ==========================================
        // 查詢函數
        // ==========================================
        
        /**
         * 取得設施摘要
         */
        getFacilitySummary(player) {
            const state = this.ensureState(player);
            
            const developing = [];
            const operating = [];
            
            for (const [id, facility] of Object.entries(state.facilities)) {
                if (facility.status === 'developing') {
                    developing.push({
                        id,
                        name: facility.name,
                        icon: facility.icon,
                        progress: facility.progress,
                        total: facility.total_turns,
                        remaining: Math.ceil(facility.total_turns - facility.progress)
                    });
                } else if (facility.status === 'operating') {
                    const config = window.ENERGY_PRODUCTS_CONFIG;
                    const product = config?.PRODUCTS[facility.productId];
                    operating.push({
                        id,
                        name: facility.name,
                        icon: facility.icon,
                        capacity: product?.operation?.power_capacity_pf || 0,
                        age: (player.turn_count || 0) - (facility.operation_start || 0)
                    });
                }
            }
            
            return {
                developing,
                operating,
                stats: state.stats
            };
        },
        
        /**
         * 計算能源自主度
         */
        calculateEnergyIndependence(player) {
            const state = this.ensureState(player);
            const totalPflops = (player.pflops || 0) + (player.cloud_pflops || 0);
            
            if (totalPflops === 0) return 100;
            
            const selfSupply = state.stats?.self_consumption || 0;
            return Math.round((selfSupply / totalPflops) * 100);
        }
    };

    // ==========================================
    // 全局註冊
    // ==========================================
    window.EnergyProductsEngine = EnergyProductsEngine;
    
    // 整合到 GameEngine（如果存在）
    if (window.GameEngine) {
        window.GameEngine.EnergyProducts = EnergyProductsEngine;
    }
    
    console.log('✓ Energy Products Engine loaded');

})();
