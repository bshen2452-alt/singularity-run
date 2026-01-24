// ============================================
// 回合更新處理器 - 玩家狀態計算（純數據處理）
// ============================================
// 職責：專注於玩家狀態的數據計算與更新
// 不處理：對手更新、里程碑檢查、全球市場、事件系統（由 handleEndTurn 編排）

/**
 * 計算衍生狀態數據
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} - 衍生數據
 */
function calculateDerivedStats(player, globalParams) {
    const { COSTS } = window.GameConfig || { COSTS: { TURING_SALARY: 5, SENIOR_SALARY: 2, JUNIOR_SALARY: 0.5 }};

    // 總鎖定算力
    const rented_locked = player.rented_pflops_contracts ? player.rented_pflops_contracts.reduce((sum, c) => sum + c.amount, 0) : 0;
    const total_locked_pflops = (player.locked_pflops || 0) + rented_locked;

    // 總儲備與可用算力
    const total_pflops_reserve = (player.pflops || 0) + (player.cloud_pflops || 0);
    const total_available_pflops = Math.max(0, total_pflops_reserve - total_locked_pflops);

    // 總數據點
    const total_data_points = (player.high_data || 0) + (player.low_data || 0);

    // === 使用 ComputeEngine 計算算力分配 ===
    const ComputeEng = window.ComputeEngine || {};
    let computeAllocation = null;
    let mpGrowthBlocked = false;
    let productDevBlocked = false;
    let inferenceShortage = false;
    
    if (ComputeEng.calculateComputeAllocation) {
        computeAllocation = ComputeEng.calculateComputeAllocation(player, globalParams);
        mpGrowthBlocked = computeAllocation.shortage.training;
        productDevBlocked = computeAllocation.shortage.productDev;
        inferenceShortage = computeAllocation.shortage.inference;
    }

    // === 從算力分配中提取數據 ===
    let inference_demand = 0;
    let inference_pflops_used = 0;
    let trainingPflops = total_available_pflops;
    let productPflops = 0;
    let trainingDemand = 0;
    let productDevDemand = 0;
    let cloud_rental_cost = 0;
    let inference_fulfillment_ratio = 1.0;
    let productDevSpeedMult = 1.0;
    
    if (computeAllocation) {
        inference_demand = computeAllocation.demands.inference;
        inference_pflops_used = computeAllocation.allocated.inference;
        trainingDemand = computeAllocation.demands.training;
        trainingPflops = computeAllocation.allocated.training;
        productDevDemand = computeAllocation.demands.productDev;
        productPflops = computeAllocation.allocated.productDev;
        cloud_rental_cost = computeAllocation.cloudRentalCost || 0;
        inference_fulfillment_ratio = computeAllocation.fulfillment.inference;
        
        if (ComputeEng.calculateProductDevSpeed) {
            productDevSpeedMult = ComputeEng.calculateProductDevSpeed(computeAllocation);
        }
    } else {
        // 回退邏輯
        const turing_count = (player.talent && player.talent.turing) || 0;
        const senior_count = (player.talent && player.talent.senior) || 0;
        const efficiency_level = (player.tech_levels && player.tech_levels["Efficiency"]) || 0;
        
        trainingDemand = (turing_count + senior_count * 0.5) * ((player.model_power || 1) / 100 * 2);
        if (efficiency_level > 0) {
            trainingDemand *= 0.5;
        }
        
        const BASE_DEMAND_COEFF = 0.05;
        const mp_factor = Math.max(1.0, (player.model_power || 1) / 10.0);
        inference_demand = (player.community_size || 0) * BASE_DEMAND_COEFF * mp_factor;
        if (efficiency_level > 0) {
            inference_demand *= (1 - efficiency_level * 0.05);
        }
        
        inference_pflops_used = Math.min(total_available_pflops, inference_demand);
        trainingPflops = Math.max(0, total_available_pflops - inference_pflops_used);
        inference_fulfillment_ratio = inference_demand > 0 ? inference_pflops_used / inference_demand : 1.0;
    }

    // === 算力利用率計算 ===
    const turing_count = (player.talent && player.talent.turing) || 0;
    const senior_count = (player.talent && player.talent.senior) || 0;
    const commercial_demand = ((player.hype || 0) * 0.075 + (player.model_power || 1) * 0.025);
    const total_demand = trainingDemand + commercial_demand + rented_locked;
    const abs_locked = player.locked_pflops || 0;
    const total_supply = total_pflops_reserve - abs_locked;
    const compute_utilization = total_supply > 0 ? total_demand / total_supply : 0;

    // === 人事成本 ===
    const efficiency_level = (player.tech_levels && player.tech_levels["Efficiency"]) || 0;
    let hr_cost = (turing_count * COSTS.TURING_SALARY) +
        (senior_count * COSTS.SENIOR_SALARY) +
        ((player.talent && player.talent.junior || 0) * COSTS.JUNIOR_SALARY);
    if (efficiency_level > 0) {
        hr_cost *= (1.0 - (0.2 * efficiency_level / 5));
    }

    // 企業形象
    const corporate_image = ((player.hype || 0) * 0.4) + ((player.trust || 0) * 0.6);

    // 有效合規風險
    const effective_compliance_risk = Math.max(0, (player.compliance_risk || 0) - (player.trust || 0) * 0.2);

    // 財務評級
    let finance_rating, base_rate, credit_score;
    const CreditEng = window.CreditEngine || {};
    
    if (CreditEng.getCreditRatingInfo) {
        const creditInfo = CreditEng.getCreditRatingInfo(player, null);
        finance_rating = creditInfo.rating + ' (' + creditInfo.ratingName + ')';
        base_rate = creditInfo.interestRate;
        credit_score = creditInfo.score;
    } else {
        const score = corporate_image * 0.6;
        if (score > 85) { finance_rating = "A+ (Prime)"; base_rate = 0.05; }
        else if (score > 70) { finance_rating = "A (Stable)"; base_rate = 0.07; }
        else if (score > 50) { finance_rating = "B (Watch)"; base_rate = 0.09; }
        else if (score > 30) { finance_rating = "C (Junk)"; base_rate = 0.13; }
        else { finance_rating = "D (Distressed)"; base_rate = 0.20; }
        credit_score = score;
    }

    // === 商品系統指標 ===
    let product_demand = 0;
    let product_fulfillment = 1.0;

    if ((player.mp_tier || 0) >= 1 && player.product_state) {
        const ProductEng = window.ProductEngine || {};
        if (ProductEng.calculateProductDemand) {
            product_demand = ProductEng.calculateProductDemand(player);
        }
        product_fulfillment = inference_fulfillment_ratio;
    }

    return {
        // 算力基礎
        total_locked_pflops,
        total_pflops_reserve,
        total_available_pflops,
        total_data_points,
        
        // 推論相關
        inference_demand,
        inference_pflops_used,
        inference_fulfillment_ratio,
        
        // 訓練相關
        active_pflops: trainingPflops,
        pflops_demand: trainingDemand,
        trainingPflops,
        trainingDemand,
        
        // 商品開發相關
        productPflops,
        productDevDemand,
        productDevSpeedMult,
        
        // 效率指標
        compute_utilization,
        
        // 財務
        hr_cost,
        cloud_rental_cost,
        
        // 企業形象
        corporate_image,
        effective_compliance_risk,
        finance_rating,
        base_rate,
        
        // 商品系統
        inferencePflops: inference_pflops_used,
        product_demand,
        product_fulfillment,
        
        // 算力系統整合
        computeAllocation,
        mpGrowthBlocked,
        productDevBlocked,
        inferenceShortage
    };
}

/**
 * 處理玩家回合更新（純數據處理）
 * 注意：不處理對手、不處理里程碑、不處理全球市場
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} - 更新後的玩家狀態和處理數據
 */
function processTurnUpdates(player, globalParams) {
    const updatedPlayer = JSON.parse(JSON.stringify(player));
    const messages = [];

    // === 1. 處理財務行動冷卻 ===
    if (updatedPlayer.finance_cooldowns) {
        Object.keys(updatedPlayer.finance_cooldowns).forEach(actionId => {
            if (updatedPlayer.finance_cooldowns[actionId] > 0) {
                updatedPlayer.finance_cooldowns[actionId]--;
                if (updatedPlayer.finance_cooldowns[actionId] <= 0) {
                    delete updatedPlayer.finance_cooldowns[actionId];
                }
            }
        });
    }

    // === 1.1 處理股權系統冷卻 ===
    if (updatedPlayer.equity_state?.equity_cooldowns) {
        Object.keys(updatedPlayer.equity_state.equity_cooldowns).forEach(key => {
            if (updatedPlayer.equity_state.equity_cooldowns[key] > 0) {
                updatedPlayer.equity_state.equity_cooldowns[key]--;
            }
        });
    }

    // === 1.5 處理路線專屬技能冷卻 ===
    if (window.RouteSkillEngine && window.RouteSkillEngine.tickCooldowns) {
        const cooledPlayer = window.RouteSkillEngine.tickCooldowns(updatedPlayer);
        if (cooledPlayer.route_skill_cooldowns) {
            updatedPlayer.route_skill_cooldowns = cooledPlayer.route_skill_cooldowns;
        }
    }

    // === 1.6 設施技術回合處理 ===
    const FacilityTechProcessor = window.FacilityTechTurnProcessor;
    if (FacilityTechProcessor && FacilityTechProcessor.process) {
        const techResult = FacilityTechProcessor.process(updatedPlayer);
        Object.assign(updatedPlayer, techResult.newState);
        techResult.messages.forEach(msg => messages.push(msg));
    }

    // === 2. 處理PoC合約收入與到期 ===
    let totalPocIncome = 0;
    if (updatedPlayer.poc_contracts && updatedPlayer.poc_contracts.length > 0) {
        updatedPlayer.poc_contracts = updatedPlayer.poc_contracts.filter(contract => {
            if (contract.remaining > 0) {
                totalPocIncome += contract.income;
                contract.remaining--;
                
                if (contract.remaining <= 0) {
                    updatedPlayer.locked_pflops = Math.max(0, (updatedPlayer.locked_pflops || 0) - contract.pflops_locked);
                    return false;
                }
                return true;
            }
            return false;
        });
    }
    
    if (totalPocIncome > 0) {
        updatedPlayer.cash += totalPocIncome;
    }

    // === 2.5 處理算力出租合約收入與到期 ===
    let totalRentOutIncome = 0;
    let expiredRentOutContracts = [];
    if (updatedPlayer.rented_pflops_contracts && updatedPlayer.rented_pflops_contracts.length > 0) {
        updatedPlayer.rented_pflops_contracts = updatedPlayer.rented_pflops_contracts.filter(contract => {
            const rentIncome = contract.amount * (contract.rent_per_turn_per_pflops || 5);
            totalRentOutIncome += rentIncome;
            
            if (updatedPlayer.turn_count >= contract.return_turn) {
                expiredRentOutContracts.push(contract);
                return false;
            }
            return true;
        });
    }
    
    if (totalRentOutIncome > 0) {
        updatedPlayer.cash += totalRentOutIncome;
    }

    // === 2.6 處理對手投資收益 ===
    let rivalInvestmentIncome = 0;
    let investmentDetails = [];

    if (window.RivalInvestmentEngine && window.RivalInvestmentEngine.calculateInvestmentReturns) {
        // 注意：這裡需要 rivals 參數，但我們改為從 player 的投資記錄計算
        // 實際對手數據由 handleEndTurn 傳入
        const investmentResult = window.RivalInvestmentEngine.calculateInvestmentReturnsFromPlayer 
            ? window.RivalInvestmentEngine.calculateInvestmentReturnsFromPlayer(updatedPlayer)
            : { totalIncome: 0, details: [] };
    
        if (investmentResult.totalIncome > 0) {
            rivalInvestmentIncome = investmentResult.totalIncome;
            investmentDetails = investmentResult.details;
            updatedPlayer.cash = (updatedPlayer.cash || 0) + rivalInvestmentIncome;
        }
    }

    // === 3. 處理產業合約到期 ===
    let expiredIndustryContracts = [];
    if (updatedPlayer.industry_contracts && updatedPlayer.industry_contracts.length > 0) {
        updatedPlayer.industry_contracts = updatedPlayer.industry_contracts.filter(contract => {
            contract.remaining--;
            
            if (contract.remaining <= 0) {
                updatedPlayer.revenue_bonus = Math.max(0, (updatedPlayer.revenue_bonus || 0) - contract.bonus);
                expiredIndustryContracts.push(contract);
                return false;
            }
            return true;
        });
    }

    // === 4. 處理MP懲罰 ===
    if (updatedPlayer.mp_penalty_next) {
        delete updatedPlayer.mp_penalty_next;
    }

    // === 5. 計算衍生狀態 ===
    const derived = calculateDerivedStats(updatedPlayer, globalParams);
    
    // === 5.1 應用算力不足懲罰 ===
    const ComputeEng = window.ComputeEngine || {};
    
    if (derived.computeAllocation && ComputeEng.applyShortageEffects) {
        const shortageResult = ComputeEng.applyShortageEffects(updatedPlayer, derived.computeAllocation);
        if (shortageResult.messages) {
            shortageResult.messages.forEach(msg => messages.push(msg));
        }
    }
    
    // 應用雲端租用成本
    if (derived.cloud_rental_cost > 0) {
        updatedPlayer.cash -= derived.cloud_rental_cost;
    }
    
    // === 5.2 忠誠度更新 ===
    const mpGrowth = updatedPlayer.model_power - (updatedPlayer.last_mp || updatedPlayer.model_power);
    let loyaltyChange = 0;
    
    if (mpGrowth > 5) loyaltyChange += 5;
    if (derived.compute_utilization >= 0.7 && derived.compute_utilization <= 0.9) loyaltyChange += 3;
    if (updatedPlayer.cash < 0) loyaltyChange -= 5;
    if (updatedPlayer.fire_penalty_turns > 0) loyaltyChange -= 5;
    if (updatedPlayer.regulation > 50) loyaltyChange -= 5;
    if (updatedPlayer.route === 'OpenSource') loyaltyChange += 5;
    
    updatedPlayer.loyalty = Math.max(0, Math.min(100, (updatedPlayer.loyalty || 50) + loyaltyChange));
    updatedPlayer.last_mp = updatedPlayer.model_power;

    // === 6. 商品系統處理 ===
    if (updatedPlayer.mp_tier >= 1 && updatedPlayer.product_state) {
        const ProductEng = window.ProductEngine || {};
        
        // 更新商品開發進度
        if (ProductEng.updateAllDevelopment) {
            const effectiveSpeedMult = derived.productDevBlocked ? 0 : derived.productDevSpeedMult;
            const devResult = ProductEng.updateAllDevelopment(updatedPlayer, derived.productPflops, effectiveSpeedMult);
            const completedProducts = devResult?.completedProducts || [];
            
            if (ProductEng.applyProductEffects) {
                completedProducts.forEach(prod => {
                    ProductEng.applyProductEffects(updatedPlayer, prod);
                });
            }
            
            if (devResult?.messages) {
                devResult.messages.forEach(msg => {
                    messages.push({ text: msg, type: 'success' });
                });
            }
        }

        // 應用服務滿足度效果
        if (ProductEng.applyFulfillmentEffects) {
            ProductEng.applyFulfillmentEffects(updatedPlayer, derived.product_fulfillment);
        }
        
        // 計算商品收益
        if (ProductEng.calculateProductRevenue) {
            const productRevenue = ProductEng.calculateProductRevenue(updatedPlayer);
            updatedPlayer.product_state.product_revenue = productRevenue;
            updatedPlayer.cash += productRevenue;
        }

        // === 6.5 營運中商品每回合熟練度增長 ===
        const MasteryUtils = window.MasteryExperienceUtils;
        if (MasteryUtils && MasteryUtils.calculateOperatingExperience) {
            const operatingResult = MasteryUtils.calculateOperatingExperience(updatedPlayer);
            
            if (operatingResult.totalExp > 0) {
                updatedPlayer.product_state.mastery.experience = 
                    (updatedPlayer.product_state.mastery.experience || 0) + operatingResult.totalExp;
                
                if (ProductEng.checkMasteryLevelUp) {
                    const oldLevel = updatedPlayer.product_state.mastery.level || 0;
                    if (ProductEng.checkMasteryLevelUp(updatedPlayer.product_state)) {
                        const newLevel = ProductEng.getMasteryLevel(updatedPlayer.product_state.mastery.level);
                        messages.push({
                            text: `⭐ 專精度提升至：${newLevel.name}（Lv.${updatedPlayer.product_state.mastery.level}）`,
                            type: 'success'
                        });
                    }
                }
            }
        }
    }

    // === 7. 社群系統更新 ===
    let communityEvents = [];
    if (updatedPlayer.mp_tier >= 1) {
        const CommunityEng = window.CommunityEngine || {};
        if (CommunityEng.processCommunityTurnUpdate) {
            const communityResult = CommunityEng.processCommunityTurnUpdate(updatedPlayer, globalParams);
            if (communityResult) {
                if (communityResult.player) {
                    Object.assign(updatedPlayer, communityResult.player);
                }
                if (communityResult.events && communityResult.events.length > 0) {
                    communityEvents = communityResult.events;
                }
            }
        } else {
            // 回退邏輯
            if (updatedPlayer.community_size > 0) {
                const baseGrowthRate = 0.02;
                const fulfillment = derived.inference_fulfillment_ratio;
                const growthFactor = Math.max(0, (updatedPlayer.hype || 0) + (updatedPlayer.trust || 0)) / 100;
                const serviceMult = Math.max(0.01, Math.min(1, 2 * fulfillment));
                const delta = updatedPlayer.community_size * baseGrowthRate * growthFactor * serviceMult;
                updatedPlayer.community_size += delta;

                if (fulfillment < 1) {
                    const loss = updatedPlayer.community_size * (1 - fulfillment) * 0.2;
                    updatedPlayer.community_size = Math.max(0, updatedPlayer.community_size - loss);
                }
            }
        }
    }
    
    // === 7.5 職能部門熟練度更新 ===
    if (window.StateMigrationEngine && window.StateMigrationEngine.processFunctionalDeptMastery) {
        const deptMasteryResult = window.StateMigrationEngine.processFunctionalDeptMastery(updatedPlayer);
        if (deptMasteryResult.messages && deptMasteryResult.messages.length > 0) {
            deptMasteryResult.messages.forEach(msg => messages.push(msg));
        }
    }
    
    // === 7.6 產品線經驗更新 ===
    if (window.ProductLineEngine && window.ProductLineEngine.processProductLineExperience) {
        window.ProductLineEngine.processProductLineExperience(updatedPlayer);
    }

    // === 7.7 併購系統更新 ===
    const AcqInt = window.AcquisitionIntegration;
    if (AcqInt && AcqInt.processQuarterlyUpdate) {
        const acqResult = AcqInt.processQuarterlyUpdate(updatedPlayer, globalParams);
        if (acqResult.player) {
            Object.assign(updatedPlayer, acqResult.player);
        }
        if (acqResult.messages) {
            messages.push(...acqResult.messages);
        }
    }

    // === 7.8 產業親和度每季更新 ===
    const AffinityEngine = window.IndustryAffinityEngine;
    if (AffinityEngine && AffinityEngine.processQuarterlyUpdate) {
        const affinityResult = AffinityEngine.processQuarterlyUpdate(updatedPlayer);
        if (affinityResult.player) {
            Object.assign(updatedPlayer, affinityResult.player);
        }
        if (affinityResult.messages && affinityResult.messages.length > 0) {
            affinityResult.messages.forEach(msg => messages.push(msg));
        }
    }

    // === 8. 市值更新 ===
    const calcFinances = window.calculateQuarterlyFinances || 
                         window.FinanceEngine?.calculateQuarterlyFinances ||
                         function() { return { net_cash_flow: 0 }; };
    const finances = calcFinances(updatedPlayer, [], globalParams);
    
    const safeHype = Number(updatedPlayer.hype) || 0;
    const safeDebt = Number(updatedPlayer.debt) || 0;
    const safeMarketCap = Number(updatedPlayer.market_cap) || 100;
    const safeRegulation = Number(updatedPlayer.regulation) || 0;
    const safeModelPower = Number(updatedPlayer.model_power) || 10;
    const safeStockDilution = Number(updatedPlayer.stock_dilution) || 1;
    const safeIHype = Number(globalParams?.I_Hype) || 1;
    
    const scaledHype = Math.min(100, safeHype) + Math.max(0, Math.log2(Math.max(1, safeHype / 100)) * 50);
    const debtRatio = (safeDebt / Math.max(1, safeMarketCap)) * 100;
    const regPenalty = safeRegulation * 0.5;
    let stockVal = (safeModelPower + (scaledHype * safeIHype) - debtRatio - regPenalty) / safeStockDilution;
    
    if (finances.net_cash_flow > 0) stockVal += 10;
    updatedPlayer.market_cap = Math.max(10, stockVal * 10);

    // === 9. 信用評級更新 ===
    const CreditEng = window.CreditEngine || {};
    if (CreditEng.applyCreditRatingEffects) {
        const creditResult = CreditEng.applyCreditRatingEffects(updatedPlayer, globalParams);
        updatedPlayer.credit_rating = creditResult.player.credit_rating;
        updatedPlayer.credit_score = creditResult.player.credit_score;
        updatedPlayer.credit_interest_rate = creditResult.player.credit_interest_rate;
        if (creditResult.player.hype !== updatedPlayer.hype) {
            updatedPlayer.hype = creditResult.player.hype;
        }
        if (creditResult.player.trust !== updatedPlayer.trust) {
            updatedPlayer.trust = creditResult.player.trust;
        }
        if (creditResult.player.regulation !== updatedPlayer.regulation) {
            updatedPlayer.regulation = creditResult.player.regulation;
        }
        if (creditResult.messages && creditResult.messages.length > 0) {
            creditResult.messages.forEach(msg => messages.push(msg));
        }
    }

    // === 10. 回合計數遞增 ===
    updatedPlayer.turn_count++;

    // === 11. 返回數據 ===
    return {
        player: updatedPlayer,
        messages: messages,
        processData: {
            totalPocIncome,
            totalRentOutIncome,
            rivalInvestmentIncome,
            investmentDetails,
            expiredRentOutContracts,
            expiredIndustryContracts,
            loyaltyChange,
            productRevenue: updatedPlayer.mp_tier >= 1 ? (updatedPlayer.product_state?.product_revenue || 0) : 0,
            updatedMarketCap: updatedPlayer.market_cap,
            communityRevenue: updatedPlayer.community_revenue || 0,
            communityEvents: communityEvents,
            // 算力系統數據
            computeAllocation: derived.computeAllocation,
            mpGrowthBlocked: derived.mpGrowthBlocked,
            productDevBlocked: derived.productDevBlocked,
            inferenceShortage: derived.inferenceShortage,
            productDevSpeedMult: derived.productDevSpeedMult,
            derived: derived
        }
    };
}

// ============================================
// 引擎註冊
// ============================================
(function() {
    'use strict';
    
    window.TurnUpdateEngine = window.TurnUpdateEngine || {};
    window.TurnUpdateEngine.processTurnUpdates = processTurnUpdates;
    window.TurnUpdateEngine.calculateDerivedStats = calculateDerivedStats;
    
    // 兼容舊名稱
    window.ProcessTurnUpdates = window.TurnUpdateEngine;

    console.log('✓ TurnUpdate Engine (Process) loaded - player state processing only');
})();