// ============================================
// 奇點競速 - 算力系統引擎 (Compute Engine)
// ============================================
// 純邏輯引擎，不操作DOM
// 負責：算力需求計算、分配、不足判定、懲罰應用

const ComputeEngine = {
    
    // ==========================================
    // 算力需求計算
    // ==========================================
    
    /**
     * 計算研發MP所需的算力（員工算力需求）
     * @param {Object} player - 玩家狀態
     * @returns {number} 所需PFLOPS
     */
    calculateTrainingDemand(player) {
        const config = window.ComputeConfig?.TRAINING_DEMAND || {};
        const turingCount = player.talent?.turing || 0;
        const seniorCount = player.talent?.senior || 0;
        const modelPower = player.model_power || 1;
        
        // 基礎算力需求
        let demand = (turingCount * (config.turing_weight || 1.0) + 
                      seniorCount * (config.senior_weight || 0.5)) * 
                     (modelPower / (config.mp_base || 100)) * 
                     (config.base_multiplier || 2.0);
        
        // Efficiency路線減免
        const efficiencyLevel = player.tech_levels?.["Efficiency"] || 0;
        if (efficiencyLevel > 0) {
            demand *= (config.efficiency_reduction || 0.5);
        }
        
        return Math.max(0, demand);
    },
    
    /**
     * 計算商品開發所需的算力
     * @param {Object} player - 玩家狀態
     * @returns {number} 所需PFLOPS
     */
    calculateProductDevDemand(player) {
        const ps = player.product_state;
        if (!ps || !ps.products) return 0;
        
        const tierReq = window.ComputeConfig?.PRODUCT_PFLOPS_REQUIREMENT || {
            tier1: 2, tier2: 5, tier3: 10, tier4: 20
        };
        
        let totalDemand = 0;
        
        // 統計所有開發中商品的算力需求
        Object.entries(ps.products).forEach(([productId, state]) => {
            if (state.status === 'developing') {
                const tier = state.tier || 1;
                const tierKey = `tier${tier}`;
                totalDemand += tierReq[tierKey] || tierReq.tier1;
            }
        });
        
        return totalDemand;
    },
    
    /**
     * 計算推論服務所需的算力
     * 新設計：推論需求 = 社群規模 × 營運中商品負載 × MP係數 × mastery減免
     * @param {Object} player - 玩家狀態
     * @returns {number} 所需PFLOPS
     */
    calculateInferenceDemand(player) {
        const config = window.ComputeConfig?.INFERENCE_DEMAND || {};
        const productLoad = window.ComputeConfig?.PRODUCT_INFERENCE_LOAD || {};
        
        // 計算營運中商品的總負載
        let totalProductLoad = 0;
        let operatingProductCount = 0;
        const ps = player.product_state;
        
        if (ps && ps.products) {
            Object.entries(ps.products).forEach(([productId, state]) => {
                if (state.status === 'operating') {
                    const tier = state.tier || 1;
                    const tierKey = `tier${tier}`;
                    totalProductLoad += productLoad[tierKey] || 1.0;
                    operatingProductCount++;
                }
            });
        }
        
        // 無營運商品 = 無推論需求（社群只是粉絲，沒產品可用）
        if (totalProductLoad === 0) {
            return 0;
        }
        
        // 基礎需求 = 社群規模 × 每用戶消耗
        const communitySize = player.community_size || 0;
        const basePerUser = config.base_per_user || 0.0001;
        let baseDemand = communitySize * basePerUser;
        
        // 商品負載加成
        const productMult = 1 + (totalProductLoad - 1) * (config.product_multiplier || 0.5);
        
        // MP縮放：MP越高，模型越大，推論成本越高
        const mp = player.model_power || 1;
        const mpBase = config.mp_scaling_base || 50;
        const mpPower = config.mp_scaling_power || 1.5;
        const mpScaling = Math.pow(mp / mpBase, mpPower);
        
        let demand = baseDemand * productMult * mpScaling;
        
        // 動態最低需求：根據營運中商品數量調整
        // 基礎 minDemand = 0.5，每多一個營運商品 +0.3
        const baseMinDemand = config.min_demand_with_product || 0.5;
        const minDemandPerProduct = config.min_demand_per_product || 0.3;
        const dynamicMinDemand = baseMinDemand + (operatingProductCount - 1) * minDemandPerProduct;
        demand = Math.max(dynamicMinDemand, demand);

        
        // Efficiency減免
        const efficiencyLevel = player.tech_levels?.["Efficiency"] || 0;
        if (efficiencyLevel > 0) {
            const effReduction = config.efficiency_reduction || 0.05;
            demand *= (1 - efficiencyLevel * effReduction);
        }
        
        // Mastery減免：專精度越高，產品優化越好，推論效率越高
        const masteryLevel = ps?.mastery?.level || 0;
        if (masteryLevel > 0) {
            const masteryReduction = config.mastery_reduction || 0.05;
            demand *= (1 - masteryLevel * masteryReduction);
        }
        
        return demand;
    },
    
    // ==========================================
    // 算力分配計算
    // ==========================================
    
    /**
     * 計算完整的算力分配情況
     * @param {Object} player - 玩家狀態
     * @param {Object} globalParams - 全球參數
     * @returns {Object} 算力分配詳情
     */
    calculateComputeAllocation(player, globalParams) {
        // 計算可用算力
        const rentedLocked = player.rented_pflops_contracts ? 
            player.rented_pflops_contracts.reduce((sum, c) => sum + c.amount, 0) : 0;
        const totalLocked = (player.locked_pflops || 0) + rentedLocked;
        const totalReserve = (player.pflops || 0) + (player.cloud_pflops || 0);
        const totalAvailable = Math.max(0, totalReserve - totalLocked);
        
        // 計算各項需求
        const inferenceDemand = this.calculateInferenceDemand(player);
        const trainingDemand = this.calculateTrainingDemand(player);
        const productDevDemand = this.calculateProductDevDemand(player);
        
        // 獲取當前策略
        const strategyName = player.product_state?.compute_strategy || 'Balanced';
        const strategyAlloc = window.ComputeConfig?.STRATEGY_ALLOCATION?.[strategyName] || 
            { training_priority: 0.5, product_priority: 0.5 };
        
        // === 第一步：分配推論算力 ===
        let inferenceAllocated = Math.min(totalAvailable, inferenceDemand);
        let remainingAfterInference = totalAvailable - inferenceAllocated;
        
        // CloudBursting策略：自動租用雲端補足推論缺口
        let cloudRentalCost = 0;
        if (strategyAlloc.cloud_auto_rent && inferenceDemand > totalAvailable) {
            const cloudNeeded = inferenceDemand - totalAvailable;
            cloudRentalCost = cloudNeeded * (globalParams?.P_GPU || 1) * 
                              (strategyAlloc.cloud_cost_multiplier || 1.5) * 5;
            inferenceAllocated = inferenceDemand;
            remainingAfterInference = 0;
        }
        
        // === 第二步：根據策略分配剩餘算力 ===
        const totalNonInferenceDemand = trainingDemand + productDevDemand;
        
        let trainingAllocated = 0;
        let productDevAllocated = 0;
        
        if (remainingAfterInference > 0 && totalNonInferenceDemand > 0) {
            // 根據策略優先級分配
            const trainingShare = strategyAlloc.training_priority || 0.5;
            const productShare = strategyAlloc.product_priority || 0.5;
            
            // 按需求和優先級計算分配
            const trainingWeight = trainingDemand * trainingShare;
            const productWeight = productDevDemand * productShare;
            const totalWeight = trainingWeight + productWeight;
            
            if (totalWeight > 0) {
                // 按權重比例分配可用算力
                trainingAllocated = Math.min(
                    trainingDemand,
                    remainingAfterInference * (trainingWeight / totalWeight)
                );
                productDevAllocated = Math.min(
                    productDevDemand,
                    remainingAfterInference * (productWeight / totalWeight)
                );
            }
        }
        
        // === 計算滿足率 ===
        const inferenceFulfillment = inferenceDemand > 0 ? 
            inferenceAllocated / inferenceDemand : 1.0;
        const trainingFulfillment = trainingDemand > 0 ? 
            trainingAllocated / trainingDemand : 1.0;
        const productDevFulfillment = productDevDemand > 0 ? 
            productDevAllocated / productDevDemand : 1.0;
        
        // === 判定是否有算力短缺 ===
        const trainingShortage = trainingDemand > 0 && trainingFulfillment < 1.0;
        const productDevShortage = productDevDemand > 0 && productDevFulfillment < 1.0;
        const inferenceShortage = inferenceDemand > 0 && inferenceFulfillment < 1.0;
        
        return {
            // 可用算力
            totalReserve,
            totalLocked,
            totalAvailable,
            
            // 需求
            demands: {
                inference: inferenceDemand,
                training: trainingDemand,
                productDev: productDevDemand,
                total: inferenceDemand + trainingDemand + productDevDemand
            },
            
            // 分配
            allocated: {
                inference: inferenceAllocated,
                training: trainingAllocated,
                productDev: productDevAllocated
            },
            
            // 滿足率
            fulfillment: {
                inference: inferenceFulfillment,
                training: trainingFulfillment,
                productDev: productDevFulfillment
            },
            
            // 短缺狀態
            shortage: {
                training: trainingShortage,
                productDev: productDevShortage,
                inference: inferenceShortage,
                any: trainingShortage || productDevShortage || inferenceShortage
            },
            
            // 額外成本
            cloudRentalCost,
            
            // 策略資訊
            strategy: strategyName
        };
    },
    
    // ==========================================
    // 懲罰應用
    // ==========================================
    
    /**
     * 應用算力不足的懲罰效果
     * @param {Object} player - 玩家狀態（會被修改）
     * @param {Object} allocation - 算力分配結果
     * @returns {Object} { player, messages, mpGrowthBlocked, productDevBlocked }
     */
    applyShortageEffects(player, allocation) {
        const penalties = window.ComputeConfig?.COMPUTE_SHORTAGE_PENALTIES || {};
        const inferenceConfig = window.ComputeConfig?.INFERENCE_SHORTAGE || {};
        const messages = [];
        let mpGrowthBlocked = false;
        let productDevBlocked = false;
        
        // === 研發算力不足 ===
        if (allocation.shortage.training) {
            const trainingPenalty = penalties.training || {};
            
            if (trainingPenalty.mp_growth_halt) {
                mpGrowthBlocked = true;
            }
            
            if (trainingPenalty.loyalty_loss_per_turn) {
                player.loyalty = Math.max(0, 
                    (player.loyalty || 0) - trainingPenalty.loyalty_loss_per_turn);
            }
            
            if (trainingPenalty.message) {
                messages.push({
                    text: trainingPenalty.message,
                    type: 'warning'
                });
            }
        }
        
        // === 商品開發算力不足 ===
        if (allocation.shortage.productDev) {
            const productPenalty = penalties.product_dev || {};
            
            if (productPenalty.progress_halt) {
                productDevBlocked = true;
            }
            
            if (productPenalty.message) {
                messages.push({
                    text: productPenalty.message,
                    type: 'warning'
                });
            }
        }
        
        // === 推論算力不足（新增）===
        if (allocation.shortage.inference && allocation.demands.inference > 0) {
            const fulfillment = allocation.fulfillment.inference;
            const critical = inferenceConfig.critical_threshold || 0.3;
            
            // 社群流失
            if (fulfillment < 1.0) {
                let churnRate;
                if (fulfillment < critical) {
                    // 嚴重不足
                    churnRate = inferenceConfig.critical_churn_rate || 0.25;
                    const trustLoss = inferenceConfig.critical_trust_loss || 5;
                    player.trust = Math.max(0, (player.trust || 0) - trustLoss);
                    messages.push({
                        text: `🔥 推論算力嚴重不足！服務品質極差，大量用戶流失。`,
                        type: 'danger'
                    });
                } else {
                    churnRate = (1 - fulfillment) * (inferenceConfig.churn_rate || 0.1);
                    
                    // 輕微不足的信任損失
                    if (fulfillment < (inferenceConfig.trust_loss_threshold || 0.7)) {
                        const trustLoss = inferenceConfig.trust_loss_per_turn || 2;
                        player.trust = Math.max(0, (player.trust || 0) - trustLoss);
                    }
                    
                    messages.push({
                        text: penalties.inference?.message || "⚠️ 推論算力不足！服務品質下降，社群開始流失。",
                        type: 'warning'
                    });
                }
                
                // 應用社群流失
                const communityLoss = (player.community_size || 0) * churnRate;
                player.community_size = Math.max(0, (player.community_size || 0) - communityLoss);
            }
            
            // 記錄服務品質到 product_state（供收益計算使用）
            if (player.product_state) {
                player.product_state.service_quality = fulfillment;
            }
        }
        
        // === 扣除雲端租用成本 ===
        if (allocation.cloudRentalCost > 0) {
            player.cash -= allocation.cloudRentalCost;
            messages.push({
                text: `☁️ 雲端算力租用費用：$${allocation.cloudRentalCost.toFixed(1)}M`,
                type: 'info'
            });
        }
        
        return {
            player,
            messages,
            mpGrowthBlocked,
            productDevBlocked
        };
    },
    
    // ==========================================
    // 商品開發速度計算
    // ==========================================
    
    /**
     * 計算商品開發速度係數
     * @param {Object} allocation - 算力分配結果
     * @returns {number} 速度係數 (0.0 ~ 1.5)
     */
    calculateProductDevSpeed(allocation) {
        const config = window.ComputeConfig?.PRODUCT_DEV_SPEED || {};
        const fulfillment = allocation.fulfillment.productDev;
        
        // 算力比例過低則完全停滯
        if (fulfillment < (config.min_pflops_ratio || 0.1)) {
            return config.min_speed || 0.0;
        }
        
        // 計算速度 = base_speed * (fulfillment)^scaling_power
        const scalingPower = config.scaling_power || 0.8;
        const baseSpeed = config.base_speed || 1.0;
        let speed = baseSpeed * Math.pow(fulfillment, scalingPower);
        
        // 限制在最小/最大範圍
        speed = Math.max(config.min_speed || 0.0, speed);
        speed = Math.min(config.max_speed || 1.5, speed);
        
        return speed;
    },
    
    /**
     * 計算單個商品的開發進度增量
     * @param {Object} product - 商品配置
     * @param {Object} productState - 商品狀態
     * @param {number} speedMultiplier - 速度係數
     * @returns {number} 進度增量 (0.0 ~ 1.0)
     */
    calculateProductProgress(product, productState, speedMultiplier) {
        if (!product || product.devTurns <= 0) return 0;
        
        // 基礎進度 = 1 / 開發回合數
        const baseProgress = 1 / product.devTurns;
        
        // 應用速度係數
        return baseProgress * speedMultiplier;
    },
    
    // ==========================================
    // 輔助函數
    // ==========================================
    
    /**
     * 獲取算力分配摘要（供UI顯示）
     * @param {Object} player - 玩家狀態
     * @param {Object} globalParams - 全球參數
     * @returns {Object} 摘要資訊
     */
    getComputeSummary(player, globalParams) {
        const allocation = this.calculateComputeAllocation(player, globalParams || {});
        const devSpeed = this.calculateProductDevSpeed(allocation);
        const inferenceConfig = window.ComputeConfig?.INFERENCE_SHORTAGE || {};
        
        // 計算服務品質（用於收益）
        const fulfillment = allocation.fulfillment.inference;
        const qualityPower = inferenceConfig.quality_power || 0.7;
        const serviceQuality = Math.pow(Math.max(0, Math.min(1, fulfillment)), qualityPower);
        
        return {
            // 總覽
            available: allocation.totalAvailable,
            totalDemand: allocation.demands.total,
            utilization: allocation.totalAvailable > 0 ? 
                Math.min(1, allocation.demands.total / allocation.totalAvailable) : 0,
            
            // 推論服務（新增詳細資訊）
            inference: {
                demand: allocation.demands.inference,
                allocated: allocation.allocated.inference,
                fulfillment: allocation.fulfillment.inference,
                fulfilled: allocation.fulfillment.inference >= 1.0,
                serviceQuality: serviceQuality,
                warning: allocation.shortage.inference
            },
            
            // 研發訓練
            training: {
                demand: allocation.demands.training,
                allocated: allocation.allocated.training,
                fulfillment: allocation.fulfillment.training,
                fulfilled: allocation.fulfillment.training >= 1.0,
                blocked: allocation.shortage.training
            },
            
            // 商品開發
            productDev: {
                demand: allocation.demands.productDev,
                allocated: allocation.allocated.productDev,
                fulfillment: allocation.fulfillment.productDev,
                fulfilled: allocation.fulfillment.productDev >= 1.0,
                blocked: allocation.shortage.productDev,
                speedMultiplier: devSpeed
            },
            
            // 策略
            strategy: allocation.strategy,
            
            // 警告
            hasWarning: allocation.shortage.any,
            warnings: this._generateWarnings(allocation)
        };
    },
    
    /**
     * 生成警告訊息列表
     * @private
     */
    _generateWarnings(allocation) {
        const warnings = [];
        
        if (allocation.shortage.inference) {
            const pct = Math.round(allocation.fulfillment.inference * 100);
            warnings.push(`推論服務僅 ${pct}% 滿足，社群可能流失`);
        }
        if (allocation.shortage.training) {
            warnings.push(`研發算力不足，MP成長停滯`);
        }
        if (allocation.shortage.productDev) {
            const pct = Math.round(allocation.fulfillment.productDev * 100);
            warnings.push(`商品開發僅 ${pct}% 效率`);
        }
        
        return warnings;
    },
    
    // ==========================================
    // 算力使用率效果計算
    // ==========================================
    
    /**
     * 計算算力使用率
     * @param {Object} player - 玩家狀態
     * @param {Object} allocation - 算力分配結果（可選）
     * @returns {Object} { utilization, status, percentage }
     */
    calculateUtilization(player, allocation) {
        // 如果沒有傳入 allocation，重新計算
        const alloc = allocation || this.calculateComputeAllocation(player, {});
        
        const totalDemand = alloc.demands.total;
        const totalAvailable = alloc.totalAvailable;
        
        const utilization = totalAvailable > 0 ? totalDemand / totalAvailable : 0;
        
        // 判定狀態
        const config = window.ComputeConfig?.UTILIZATION_EFFECTS || {};
        let status = 'normal';
        
        if (utilization < (config.idle?.threshold || 0.30)) {
            status = 'idle';
        } else if (utilization > (config.overload?.critical?.threshold || 1.0)) {
            status = 'critical';
        } else if (utilization > (config.overload?.threshold || 0.90)) {
            status = 'overload';
        } else {
            // 檢查是否在最佳範圍
            const optimal = config.normal?.optimal || {};
            if (utilization >= (optimal.min || 0.60) && utilization <= (optimal.max || 0.80)) {
                status = 'optimal';
            }
        }
        
        return {
            utilization: utilization,
            percentage: Math.round(utilization * 100),
            status: status,
            demand: totalDemand,
            available: totalAvailable
        };
    },
    
    /**
     * 應用算力使用率效果
     * @param {Object} player - 玩家狀態（會被修改）
     * @param {Object} utilizationResult - 使用率計算結果
     * @returns {Object} { player, messages, effects }
     */
    applyUtilizationEffects(player, utilizationResult) {
        const config = window.ComputeConfig?.UTILIZATION_EFFECTS || {};
        const messages = [];
        const effects = {
            hype_change: 0,
            market_cap_multiplier: 1.0,
            loyalty_change: 0,
            entropy_change: 0,
            negative_event_bonus: 0,
            efficiency_multiplier: 1.0
        };
        
        const status = utilizationResult.status;
        const utilization = utilizationResult.utilization;
        
        // === 閒置過多 (<30%) ===
        if (status === 'idle') {
            const idleConfig = config.idle?.effects || {};
            
            // 炒作度下降
            if (idleConfig.hype_loss_per_turn) {
                effects.hype_change -= idleConfig.hype_loss_per_turn;
                player.hype = Math.max(0, (player.hype || 0) - idleConfig.hype_loss_per_turn);
            }
            
            // 市值懲罰
            if (idleConfig.market_cap_penalty) {
                effects.market_cap_multiplier *= (1 - idleConfig.market_cap_penalty);
            }
            
            if (idleConfig.message) {
                messages.push({ text: idleConfig.message, type: 'warning' });
            }
            
            // 連續閒置檢查
            player.consecutive_idle_turns = (player.consecutive_idle_turns || 0) + 1;
            const consecutive = config.idle?.consecutive_penalty || {};
            
            if (player.consecutive_idle_turns >= (consecutive.turns_threshold || 2)) {
                if (consecutive.extra_hype_loss) {
                    effects.hype_change -= consecutive.extra_hype_loss;
                    player.hype = Math.max(0, (player.hype || 0) - consecutive.extra_hype_loss);
                }
                if (consecutive.investor_confidence_loss) {
                    // 影響融資利率或信用評級
                    player.investor_confidence = Math.max(0, 
                        (player.investor_confidence || 100) - consecutive.investor_confidence_loss);
                }
                if (consecutive.message) {
                    messages.push({ text: consecutive.message, type: 'danger' });
                }
            }
        } else {
            // 重置連續閒置計數
            player.consecutive_idle_turns = 0;
        }
        
        // === 最佳範圍 (60%-80%) ===
        if (status === 'optimal') {
            const optimalConfig = config.normal?.optimal || {};
            
            if (optimalConfig.loyalty_bonus) {
                effects.loyalty_change += optimalConfig.loyalty_bonus;
                player.loyalty = Math.min(100, (player.loyalty || 0) + optimalConfig.loyalty_bonus);
            }
            
            if (optimalConfig.efficiency_bonus) {
                effects.efficiency_multiplier *= (1 + optimalConfig.efficiency_bonus);
            }
        }
        
        // === 過載 (>90%) ===
        if (status === 'overload' || status === 'critical') {
            const overloadConfig = config.overload?.effects || {};
            
            // 負面事件機率增加
            if (overloadConfig.negative_event_chance_bonus) {
                effects.negative_event_bonus += overloadConfig.negative_event_chance_bonus;
            }
            
            // 熵值增加
            if (overloadConfig.entropy_add) {
                effects.entropy_change += overloadConfig.entropy_add;
                player.entropy = (player.entropy || 0) + overloadConfig.entropy_add;
            }
            
            if (overloadConfig.message) {
                messages.push({ text: overloadConfig.message, type: 'warning' });
            }
            
            // 記錄連續過載
            player.consecutive_overload_turns = (player.consecutive_overload_turns || 0) + 1;
        } else {
            player.consecutive_overload_turns = 0;
        }
        
        // === 嚴重過載 (>100%) ===
        if (status === 'critical') {
            const criticalConfig = config.overload?.critical || {};
            
            // 更高的負面事件機率
            if (criticalConfig.negative_event_chance_bonus) {
                effects.negative_event_bonus += criticalConfig.negative_event_chance_bonus;
            }
            
            // 更多熵值
            if (criticalConfig.entropy_add) {
                effects.entropy_change += criticalConfig.entropy_add;
                player.entropy = (player.entropy || 0) + criticalConfig.entropy_add;
            }
            
            // 忠誠度下降（員工過勞）
            if (criticalConfig.loyalty_loss) {
                effects.loyalty_change -= criticalConfig.loyalty_loss;
                player.loyalty = Math.max(0, (player.loyalty || 0) - criticalConfig.loyalty_loss);
            }
            
            // 系統故障機率
            if (criticalConfig.system_failure_chance && Math.random() < criticalConfig.system_failure_chance) {
                // 觸發系統故障事件
                const failureDamage = (player.pflops || 0) * 0.05; // 損失5%算力
                player.pflops = Math.max(0, (player.pflops || 0) - failureDamage);
                messages.push({ 
                    text: `💥 系統過載導致硬體故障！損失 ${failureDamage.toFixed(1)} PFLOPS`, 
                    type: 'danger' 
                });
            }
            
            if (criticalConfig.message) {
                messages.push({ text: criticalConfig.message, type: 'danger' });
            }
        }
        
        // 應用市值調整
        if (effects.market_cap_multiplier !== 1.0) {
            player.market_cap = (player.market_cap || 100) * effects.market_cap_multiplier;
        }
        
        return {
            player,
            messages,
            effects,
            utilizationStatus: status
        };
    },
    
    /**
     * 獲取使用率效果摘要（供 UI 顯示）
     * @param {Object} player - 玩家狀態
     * @param {Object} allocation - 算力分配結果
     * @returns {Object} 摘要資訊
     */
    getUtilizationSummary(player, allocation) {
        const utilResult = this.calculateUtilization(player, allocation);
        const config = window.ComputeConfig?.UTILIZATION_EFFECTS || {};
        
        let statusLabel = '';
        let statusColor = '';
        let statusIcon = '';
        let description = '';
        
        switch (utilResult.status) {
            case 'idle':
                statusLabel = '閒置過多';
                statusColor = 'var(--accent-yellow)';
                statusIcon = '📉';
                description = '股東對資源配置效率不滿';
                break;
            case 'optimal':
                statusLabel = '最佳運作';
                statusColor = 'var(--accent-green)';
                statusIcon = '✨';
                description = '算力配置效率最佳';
                break;
            case 'normal':
                statusLabel = '正常運作';
                statusColor = 'var(--accent-cyan)';
                statusIcon = '✓';
                description = '算力使用在正常範圍';
                break;
            case 'overload':
                statusLabel = '接近滿載';
                statusColor = 'var(--accent-orange)';
                statusIcon = '⚠️';
                description = '系統故障風險增加';
                break;
            case 'critical':
                statusLabel = '嚴重超載';
                statusColor = 'var(--accent-red)';
                statusIcon = '🔥';
                description = '系統不穩定，需立即擴充';
                break;
            default:
                statusLabel = '未知';
                statusColor = 'var(--text-muted)';
                statusIcon = '?';
        }
        
        return {
            ...utilResult,
            statusLabel,
            statusColor,
            statusIcon,
            description,
            consecutiveIdle: player.consecutive_idle_turns || 0,
            consecutiveOverload: player.consecutive_overload_turns || 0
        };
    }
};

// 導出到全局
window.ComputeEngine = ComputeEngine;

console.log('✓ Compute Engine loaded (with utilization effects)');