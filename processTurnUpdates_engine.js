// ============================================
// 回合更新處理器
// ============================================
// 整合新的 ComputeEngine 算力系統

/**
 * 處理回合更新，協調所有與時間推進相關的狀態變革
 * @param {Object} player - 玩家狀態
 * @param {Array} rivals - 競爭對手陣列
 * @param {Object} globalParams - 全球參數
 * @returns {Object} - 更新後的玩家狀態和相關數據
 */

function calculateDerivedStats(player, globalParams) {
    // 假設 GameConfig 已在全局載入 (由 config.js 提供)
    const { COSTS } = GameConfig;

    // 總鎖定算力
    const rented_locked = player.rented_pflops_contracts ? player.rented_pflops_contracts.reduce((sum, c) => sum + c.amount, 0) : 0;
    const total_locked_pflops = (player.locked_pflops || 0) + rented_locked;

    // 總儲備與可用算力
    const total_pflops_reserve = (player.pflops || 0) + (player.cloud_pflops || 0);
    const total_available_pflops = Math.max(0, total_pflops_reserve - total_locked_pflops);

    // 總數據點
    const total_data_points = (player.high_data || 0) + (player.low_data || 0);

    // === 使用新的 ComputeEngine 計算算力分配 ===
    const ComputeEng = window.ComputeEngine || {};
    let computeAllocation = null;
    let mpGrowthBlocked = false;
    let productDevBlocked = false;
    let inferenceShortage = false;
    
    // 優先使用新算力系統
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
        
        // 計算商品開發速度
        if (ComputeEng.calculateProductDevSpeed) {
            productDevSpeedMult = ComputeEng.calculateProductDevSpeed(computeAllocation);
        }
    } else {
        // === 回退邏輯（ComputeEngine 未載入時）===
        const turing_count = (player.talent && player.talent.turing) || 0;
        const senior_count = (player.talent && player.talent.senior) || 0;
        const efficiency_level = (player.tech_levels && player.tech_levels["Efficiency"]) || 0;
        
        trainingDemand = (turing_count + senior_count * 0.5) * ((player.model_power || 1) / 100 * 2);
        if (efficiency_level > 0) {
            trainingDemand *= 0.5;
        }
        
        // 簡單的推論需求計算（舊邏輯）
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

    // 財務評級 - 使用 CreditEngine 或回退到舊邏輯
    let finance_rating, base_rate, credit_score;
    const CreditEng = window.CreditEngine || {};
    
    if (CreditEng.getCreditRatingInfo) {
        const creditInfo = CreditEng.getCreditRatingInfo(player, null);
        finance_rating = creditInfo.rating + ' (' + creditInfo.ratingName + ')';
        base_rate = creditInfo.interestRate;
        credit_score = creditInfo.score;
    } else {
        // 回退到舊的簡化邏輯
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
        // 服務品質基於推論滿足率
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
 * 更新競爭對手狀態（AI行動）
 * @param {Array} rivals - 競爭對手陣列
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Array} - 更新後的競爭對手陣列
 */
function updateRivalsState(rivals, player, globalParams) {
    return rivals.map(rival => {
        const updated = { ...rival };
        const config = rival.config || {};
        
        // 基礎MP成長（根據風格不同）
        let mpGrowth = 0;
        const baseMPGrowth = 1.5; // 每季基礎成長
        
        // 優先使用 style_key（英文），fallback 到 config.style_key
        const styleKey = rival.style_key || config.style_key || 'default';
        
        switch (styleKey) {
            case 'aggressive_expansion': // Titan Sigma - 激進成長
                mpGrowth = baseMPGrowth * (config.mp_mult || 1.5) * (1 + Math.random() * 0.5);
                updated.hype = Math.min(150, (updated.hype || 0) + 3);
                updated.entropy = Math.min(100, (updated.entropy || 0) + 2);
                break;
                
            case 'safety_first': // Ethos Guard - 穩健成長
                mpGrowth = baseMPGrowth * (config.mp_mult || 1.1) * (0.8 + Math.random() * 0.2);
                updated.trust = Math.min(100, (updated.trust || 0) + 2);
                updated.alignment = Math.min(100, (updated.alignment || 50) + 1);
                break;
                
            case 'balanced_growth': // Nexus Dynamics - 均衡成長
                mpGrowth = baseMPGrowth * (config.mp_mult || 1.25) * (0.9 + Math.random() * 0.2);
                updated.trust = Math.min(100, (updated.trust || 0) + 1);
                updated.hype = Math.min(100, (updated.hype || 0) + 1);
                break;
                
            case 'creative_burst': // Phantom Studio - 高波動成長
                mpGrowth = baseMPGrowth * (config.mp_mult || 1.4) * (0.5 + Math.random() * 1.0);
                updated.hype = Math.min(200, (updated.hype || 0) + 5);
                updated.entropy = Math.min(100, (updated.entropy || 0) + 3);
                updated.compliance_risk = Math.min(100, (updated.compliance_risk || 0) + 2);
                break;
                
            case 'hardware_heavy': // Golem Industries - 資本密集慢成長
                mpGrowth = baseMPGrowth * (config.mp_mult || 1.0) * (0.7 + Math.random() * 0.3);
                updated.trust = Math.min(100, (updated.trust || 0) + 1);
                updated.market_cap = (updated.market_cap || 500) * 1.02; // 市值穩定成長
                break;
                
            case 'professional_defense': // Fortress Protocol - 防禦型穩定成長
                mpGrowth = baseMPGrowth * (config.mp_mult || 1.2) * (0.85 + Math.random() * 0.15);
                updated.trust = Math.min(100, (updated.trust || 0) + 3);
                updated.alignment = Math.min(100, (updated.alignment || 50) + 2);
                updated.compliance_risk = Math.max(0, (updated.compliance_risk || 0) - 1);
                break;
                
            default: // 預設成長 - 使用 config 中的數值
                mpGrowth = baseMPGrowth * (config.mp_mult || 1.0) * (0.8 + Math.random() * 0.4);
                // 應用 config 中的加成
                if (config.hype_add) {
                    updated.hype = Math.min(200, (updated.hype || 0) + config.hype_add * 0.1);
                }
                if (config.trust_add) {
                    updated.trust = Math.min(100, (updated.trust || 0) + config.trust_add * 0.1);
                }
                if (config.entropy_add) {
                    updated.entropy = Math.min(100, (updated.entropy || 0) + config.entropy_add * 0.1);
                }
        }
        
        // 全球參數影響
        const hypeBoost = (globalParams.I_Hype || 1) - 1;
        mpGrowth *= (1 + hypeBoost * 0.2);
        
        // 玩家領先影響（追趕機制）
        if (player.model_power > updated.mp * 1.2) {
            // 玩家領先20%以上，對手加速追趕
            mpGrowth *= 1.15;
        } else if (updated.mp > player.model_power * 1.2) {
            // 對手領先20%以上，稍微減速
            mpGrowth *= 0.9;
        }
        
        // 應用成長
        updated.mp = Math.min(1005, (updated.mp || 10) + mpGrowth);
        
        // 市值更新（基於MP和狀態）
        const mpRatio = updated.mp / 1005;
        const hypeEffect = Math.min(50, (updated.hype || 0) * 0.5);
        const trustEffect = (updated.trust || 0) * 0.3;
        updated.market_cap = Math.max(100, 500 + mpRatio * 2000 + hypeEffect * 10 + trustEffect * 5);
        
        // 熵值和合規風險的自然衰減
        updated.entropy = Math.max(0, (updated.entropy || 0) * 0.98);
        updated.compliance_risk = Math.max(0, (updated.compliance_risk || 0) * 0.97);
        
        return updated;
    });
}

function processTurnUpdates(player, rivals, globalParams) {
    // 創建副本以避免直接修改
    const updatedPlayer = JSON.parse(JSON.stringify(player));
    let updatedGlobalParams = { ...globalParams };
    
    // === 0. 更新競爭對手狀態（AI行動）===
    let updatedRivals = updateRivalsState(rivals, player, globalParams);
    
    // 里程碑相關訊息收集
    let milestoneMessages = [];
    
    // === 1. 處理財務行動冷卻 ===
    if (updatedPlayer.finance_cooldowns) {
        Object.keys(updatedPlayer.finance_cooldowns).forEach(actionId => {
            if (updatedPlayer.finance_cooldowns[actionId] > 0) {
                updatedPlayer.finance_cooldowns[actionId]--;
                // 清除已歸零的冷卻項目
                if (updatedPlayer.finance_cooldowns[actionId] <= 0) {
                    delete updatedPlayer.finance_cooldowns[actionId];
                }
            }
        });
    }

    // === 1.1 處理股權系統冷卻（strategic funding 等）===
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

    // 設施技術回合處理
    let FacilityTechProcessor = window.FacilityTechTurnProcessor;
    if (FacilityTechProcessor && FacilityTechProcessor.process) {
        const techResult = FacilityTechProcessor.process(updatedPlayer);
        Object.assign(updatedPlayer, techResult.newState);
        techResult.messages.forEach(msg => milestoneMessages.push(msg));
    }


    // === 2. 處理PoC合約收入與到期 ===
    let totalPocIncome = 0;
    if (updatedPlayer.poc_contracts && updatedPlayer.poc_contracts.length > 0) {
        updatedPlayer.poc_contracts = updatedPlayer.poc_contracts.filter(contract => {
            if (contract.remaining > 0) {
                totalPocIncome += contract.income;
                contract.remaining--;
                
                // 合約到期時解鎖算力
                if (contract.remaining <= 0) {
                    updatedPlayer.locked_pflops = Math.max(0, (updatedPlayer.locked_pflops || 0) - contract.pflops_locked);
                    return false; // 移除到期的合約
                }
                return true; // 保留未到期的合約
            }
            return false; // 移除無效合約
        });
    }
    
    // 應用PoC收入
    if (totalPocIncome > 0) {
        updatedPlayer.cash += totalPocIncome;
    }

        // === 2.5 處理算力出租合約收入與到期 ===
    let totalRentOutIncome = 0;
    let expiredRentOutContracts = [];
    if (updatedPlayer.rented_pflops_contracts && updatedPlayer.rented_pflops_contracts.length > 0) {
        updatedPlayer.rented_pflops_contracts = updatedPlayer.rented_pflops_contracts.filter(contract => {
            // 計算本季租金收入
            const rentIncome = contract.amount * (contract.rent_per_turn_per_pflops || 5);
            totalRentOutIncome += rentIncome;
            
            // 檢查合約是否到期
            if (updatedPlayer.turn_count >= contract.return_turn) {
                expiredRentOutContracts.push(contract);
                return false; // 移除到期的合約
            }
            return true; // 保留未到期的合約
        });
    }
    
    // 應用算力出租收入
    if (totalRentOutIncome > 0) {
        updatedPlayer.cash += totalRentOutIncome;
    }

    // === 2.6 處理對手投資收益 === ← 新增
    let rivalInvestmentIncome = 0;
    let investmentDetails = [];

    if (window.RivalInvestmentEngine && window.RivalInvestmentEngine.calculateInvestmentReturns) {
        const investmentResult = window.RivalInvestmentEngine.calculateInvestmentReturns(
            updatedPlayer, 
            rivals
        );
    
        if (investmentResult.totalIncome > 0) {
            rivalInvestmentIncome = investmentResult.totalIncome;
            investmentDetails = investmentResult.details;
        
            // 應用投資收益
            updatedPlayer.cash = (updatedPlayer.cash || 0) + rivalInvestmentIncome;
        }
    }

    // === 3. 處理產業合約到期 ===
    let expiredIndustryContracts = [];
    if (updatedPlayer.industry_contracts && updatedPlayer.industry_contracts.length > 0) {
        updatedPlayer.industry_contracts = updatedPlayer.industry_contracts.filter(contract => {
            contract.remaining--;
            
            if (contract.remaining <= 0) {
                // 合約到期，移除收入加成
                updatedPlayer.revenue_bonus = Math.max(0, (updatedPlayer.revenue_bonus || 0) - contract.bonus);
                expiredIndustryContracts.push(contract);
                return false; // 移除到期的合約
            }
            return true; // 保留未到期的合約
        });
    }

    // === 4. 處理MP懲罰（創始人打工效果） ===
    if (updatedPlayer.mp_penalty_next) {
        delete updatedPlayer.mp_penalty_next;
    }

    // === 5. 計算衍生狀態（含新算力系統）===
    const derived = calculateDerivedStats(updatedPlayer, globalParams);
    
    // === 5.1 應用算力不足懲罰 ===
    const ComputeEng = window.ComputeEngine || {};
    
    if (derived.computeAllocation && ComputeEng.applyShortageEffects) {
        const shortageResult = ComputeEng.applyShortageEffects(updatedPlayer, derived.computeAllocation);
        if (shortageResult.messages) {
            shortageResult.messages.forEach(msg => {
                milestoneMessages.push(msg);
            });
        }
    }
    
    // 應用雲端租用成本
    if (derived.cloud_rental_cost > 0) {
        updatedPlayer.cash -= derived.cloud_rental_cost;
    }
    
    // === 5.2 忠誠度更新 ===
    const mpGrowth = updatedPlayer.model_power - updatedPlayer.last_mp;
    let loyaltyChange = 0;
    
    // 忠誠度影響因素
    if (mpGrowth > 5) loyaltyChange += 5;
    if (derived.compute_utilization >= 0.7 && derived.compute_utilization <= 0.9) loyaltyChange += 3;
    if (updatedPlayer.cash < 0) loyaltyChange -= 5;
    if (updatedPlayer.fire_penalty_turns > 0) loyaltyChange -= 5;
    if (updatedPlayer.regulation > 50) loyaltyChange -= 5;
    if (updatedPlayer.route === 'OpenSource') loyaltyChange += 5;
    
    // 算力不足額外懲罰（已在applyShortageEffects中處理，這裡不重複）
    
    // 應用忠誠度變化
    updatedPlayer.loyalty = Math.max(0, Math.min(100, updatedPlayer.loyalty + loyaltyChange));
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
                    milestoneMessages.push({ text: msg, type: 'success' });
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
                // 增加經驗值
                updatedPlayer.product_state.mastery.experience = 
                    (updatedPlayer.product_state.mastery.experience || 0) + operatingResult.totalExp;
                
                // 檢查升級
                if (ProductEng.checkMasteryLevelUp) {
                    const oldLevel = updatedPlayer.product_state.mastery.level || 0;
                    if (ProductEng.checkMasteryLevelUp(updatedPlayer.product_state)) {
                        const newLevel = ProductEng.getMasteryLevel(updatedPlayer.product_state.mastery.level);
                        milestoneMessages.push({
                            text: `⭐ 專精度提升至：${newLevel.name}（Lv.${updatedPlayer.product_state.mastery.level}）`,
                            type: 'success'
                        });
                    }
                }
            }
        }
    }

    // === 7. 社群系統更新 (新版三指標系統) ===
    let communityEvents = [];
    if (updatedPlayer.mp_tier >= 1) {
        const CommunityEng = window.CommunityEngine || {};
        if (CommunityEng.processCommunityTurnUpdate) {
            const communityResult = CommunityEng.processCommunityTurnUpdate(updatedPlayer, globalParams);
            if (communityResult) {
                // ✅ 更新 updatedPlayer 屬性，而不是重新指派
                if (communityResult.player) {
                    Object.assign(updatedPlayer, communityResult.player);
                }

                // ✅ 記錄社群事件
                if (communityResult.events && communityResult.events.length > 0) {
                    communityEvents = communityResult.events;
                    communityResult.events.forEach(evt => {
                        console.log('社群事件:', evt.name, evt.desc);
                    });
                }
            }
        } else {
            // 回退到舊版社群增長邏輯
            if (updatedPlayer.community_size > 0) {
                const baseGrowthRate = 0.02;
                const fulfillment = derived.inference_fulfillment_ratio;
                const growthFactor = Math.max(0, updatedPlayer.hype + updatedPlayer.trust) / 100;
                const serviceMult = Math.max(0.01, Math.min(1, 2 * fulfillment));
                const delta = updatedPlayer.community_size * baseGrowthRate * growthFactor * serviceMult;
                updatedPlayer.community_size += delta;

                // 服務不足導致流失
                if (fulfillment < 1) {
                    const loss = updatedPlayer.community_size * (1 - fulfillment) * 0.2;
                    updatedPlayer.community_size = Math.max(0, updatedPlayer.community_size - loss);
                }
            }
        }
    }
    
    // === 7.5 職能部熟練度更新（Phase 2）===
    if (window.StateMigrationEngine && window.StateMigrationEngine.processFunctionalDeptMastery) {
        const deptMasteryResult = window.StateMigrationEngine.processFunctionalDeptMastery(updatedPlayer);
        if (deptMasteryResult.messages && deptMasteryResult.messages.length > 0) {
            deptMasteryResult.messages.forEach(msg => {
                milestoneMessages.push(msg);
            });
        }
    }
    
    // === 7.6 產品線經驗更新（事業線）===
    if (window.ProductLineEngine && window.ProductLineEngine.processProductLineExperience) {
        const lineExpResult = window.ProductLineEngine.processProductLineExperience(updatedPlayer);
        // 產品線經驗訊息已在 engine 內處理
    }

    // === 7.7 併購系統更新
    const AcqInt = window.AcquisitionIntegration;
    if (AcqInt && AcqInt.processQuarterlyUpdate) {
        const acqResult = AcqInt.processQuarterlyUpdate(newPlayer, globalParams);
        if (acqResult.player) {
            newPlayer = acqResult.player;
        }
        if (acqResult.messages) {
            messages.push(...acqResult.messages);
        }
    }


    // === 8. 市值更新 ===
    const calcFinances = window.calculateQuarterlyFinances || 
                         window.FinanceEngine?.calculateQuarterlyFinances ||
                         function() { return { net_cash_flow: 0 }; };
    const finances = calcFinances(updatedPlayer, updatedRivals, globalParams);
    
    // 確保所有數值都有安全的預設值，避免 NaN
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

    // === 9. 玩家里程碑檢查 ===
    let newPlayerMilestones = [];
    const MilestoneEng = window.MilestoneEngine || {};
    
    if (MilestoneEng.checkMilestones) {
        newPlayerMilestones = MilestoneEng.checkMilestones(updatedPlayer);
        if (newPlayerMilestones && newPlayerMilestones.length > 0) {
            newPlayerMilestones.forEach(m => {
                milestoneMessages.push({
                    text: `🎯 里程碑研發完成：${m.name}，可進行發布！`,
                    type: 'event'
                });
                console.log('玩家達成里程碑門檻:', m.name);
            });
        }
    }

    // === 9.5 對手里程碑檢查 ===
    if (MilestoneEng.processRivalMilestones) {
        const rivalMilestoneResult = MilestoneEng.processRivalMilestones(updatedRivals, globalParams);
        updatedRivals = rivalMilestoneResult.rivals;
        
        // 處理對手里程碑事件訊息
        if (rivalMilestoneResult.events && rivalMilestoneResult.events.length > 0) {
            rivalMilestoneResult.events.forEach(evt => {
                milestoneMessages.push({
                    text: evt.message,
                    type: evt.eventType || 'info'
                });
                console.log('對手里程碑事件:', evt.message);
            });
        }
        
        // 應用全局加成（里程碑成功時的市場影響）
        if (rivalMilestoneResult.globalBonuses && rivalMilestoneResult.globalBonuses.length > 0) {
            rivalMilestoneResult.globalBonuses.forEach(bonus => {
                if (bonus.I_Hype) {
                    updatedGlobalParams.I_Hype = Math.min(2.0, 
                        Math.round((updatedGlobalParams.I_Hype + bonus.I_Hype) * 100) / 100
                    );
                }
                if (bonus.description) {
                    milestoneMessages.push({
                        text: `📈 ${bonus.description}`,
                        type: 'info'
                    });
                }
            });
        }
    }

    // === 9.8 信用評級更新 ===
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
            creditResult.messages.forEach(msg => {
                milestoneMessages.push(msg);
            });
        }
    }

    // === 9.9 Tier4 全球市場與區域系統更新 ===
    if (updatedPlayer.mp_tier >= 4) {
        // 檢查並初始化 Tier4 系統
        if (window.InitialStateEngine && window.InitialStateEngine.checkAndInitializeTier4) {
            const tier4State = window.InitialStateEngine.checkAndInitializeTier4(updatedPlayer);
            if (tier4State.global_market && !updatedPlayer.global_market) {
                updatedPlayer.global_market = tier4State.global_market;
                milestoneMessages.push({
                    text: '🌐 全球市場系統已啟動！',
                    type: 'event'
                });
            }
            if (tier4State.region_system && !updatedPlayer.region_system) {
                updatedPlayer.region_system = tier4State.region_system;
                milestoneMessages.push({
                    text: '🗺️ 區域營運系統已啟動！',
                    type: 'event'
                });
            }
        }
        
        // 更新全球市場狀態
        if (updatedPlayer.global_market && window.GlobalMarketEngine) {
            // 收集本回合的行為影響
            const turnActions = [];
            
            // 玩家大規模算力變動
            const pflopsChange = (updatedPlayer.pflops || 0) - (player.pflops || 0);
            if (pflopsChange > 20) {
                turnActions.push({ type: 'massive_compute_purchase', scale: pflopsChange / 50 });
            }
            
            // 對手行為影響
            updatedRivals.forEach(function(rival) {
                const rivalMpChange = rival.mp - (rivals.find(function(r) { return r.name === rival.name; })?.mp || rival.mp);
                if (rivalMpChange > 10) {
                    turnActions.push({ type: 'tech_breakthrough', scale: 0.3 });
                }
            });
            
            // 計算當前季度 (1-4)
            const currentQuarter = ((updatedPlayer.turn_count - 1) % 4) + 1;
            
            // 更新全球市場
            updatedPlayer.global_market = window.GlobalMarketEngine.updateMarket(
                updatedPlayer.global_market,
                {
                    actions: turnActions,
                    turn: updatedPlayer.turn_count,
                    quarter: currentQuarter
                }
            );
            
            // 將全球市場指標同步到 globalParams
            if (window.convertGlobalMarketToParams) {
                const marketParams = window.convertGlobalMarketToParams(updatedPlayer.global_market);
                Object.assign(updatedGlobalParams, marketParams);
            }
            
            // 檢查新的全球市場事件
            const activeEvents = updatedPlayer.global_market.active_events || [];
            activeEvents.forEach(function(evt) {
                if (evt.remaining === evt.duration) {
                    milestoneMessages.push({
                        text: '📰 全球事件：' + (window.EventEngine && window.EventEngine.getEventTitle ? window.EventEngine.getEventTitle(evt.id) : evt.id),
                        type: 'warning'
                    });
                }
            });
        }
        
        // 更新區域系統狀態
        if (updatedPlayer.region_system && window.RegionEngine) {
            updatedPlayer.region_system = window.RegionEngine.processTurnEnd(
                updatedPlayer.region_system,
                updatedPlayer.turn_count
            );
        }
        
        // 處理區域資產派駐效果
        let deploymentRevenue = 0;
        if (updatedPlayer.region_system && window.RegionAssetIntegration) {
            const deploymentResult = window.RegionAssetIntegration.processTurnDeploymentEffects(updatedPlayer);
            deploymentRevenue = deploymentResult.revenue || 0;
            updatedPlayer.cash += deploymentRevenue;
            
            // 添加派駐收益訊息
            if (deploymentResult.messages && deploymentResult.messages.length > 0) {
                deploymentResult.messages.forEach(msg => {
                    milestoneMessages.push(msg);
                });
            }
        }
    }
    
    // === 10. 回合計數遞增 ===
    updatedPlayer.turn_count++;


    // === 11. 準備返回數據 ===
    return {
        player: updatedPlayer,
        rivals: updatedRivals,  // 修復：返回更新後的對手
        globalParams: updatedGlobalParams,  // 使用更新後的全球參數
        messages: milestoneMessages,
        processData: {
            totalPocIncome,
            totalRentOutIncome,
            rivalInvestmentIncome,        // ← 新增
            investmentDetails,             // ← 新增
            expiredRentOutContracts,
            expiredIndustryContracts,
            loyaltyChange,
            productRevenue: updatedPlayer.mp_tier >= 1 ? (updatedPlayer.product_state?.product_revenue || 0) : 0,
            updatedMarketCap: updatedPlayer.market_cap,
            // 社群系統數據
            communityRevenue: updatedPlayer.community_revenue || 0,
            communityEvents: communityEvents,
            // 里程碑數據
            newPlayerMilestones: newPlayerMilestones,
            milestoneMessages: milestoneMessages,
            // 算力系統數據
            computeAllocation: derived.computeAllocation,
            mpGrowthBlocked: derived.mpGrowthBlocked,
            productDevBlocked: derived.productDevBlocked,
            inferenceShortage: derived.inferenceShortage,
            productDevSpeedMult: derived.productDevSpeedMult
        },
        // 額外提供訊息陣列供 UI 層使用
        messages: milestoneMessages
    };
}

// ============================================
// 回合更新引擎自我註冊 (修正名稱)
// ============================================

(function() {
    'use strict';
    
    // 使用安全寫法初始化或取得 TurnUpdateEngine
    window.TurnUpdateEngine = window.TurnUpdateEngine || {};
    
    // 註冊核心功能到 TurnUpdateEngine
    window.TurnUpdateEngine.processTurnUpdates = processTurnUpdates;
    
    // 假設 calculateDerivedStats 位於此檔案，將其也掛載上去
    if (typeof calculateDerivedStats !== 'undefined') {
        window.TurnUpdateEngine.calculateDerivedStats = calculateDerivedStats;
    }

    // 為了兼容性，註冊舊名稱 (如果需要)
    window.ProcessTurnUpdates = window.TurnUpdateEngine; 

    console.log('✓ TurnUpdate Engine (Process) loaded - with milestone check');
})();
