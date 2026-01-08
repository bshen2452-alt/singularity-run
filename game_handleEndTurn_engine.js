//============================================
// 回合結束處理引擎
//============================================

/**
 * 處理回合結束的所有邏輯
 * @param {Object} player - 玩家狀態
 * @param {Array} rivals - 競爭對手列表
 * @param {Object} globalParams - 全局參數
 * @returns {Object} 完整的回合結束結果
 */

// ============================================
// 財務計算函數 - calculateQuarterlyFinances
// ============================================

/**
 * 計算季度財務狀況（安全版本）
 * @param {Object} player - 玩家狀態
 * @param {Array} rivals - 競爭對手列表  
 * @param {Object} globalParams - 全局參數
 * @returns {Object} 財務計算結果
 */
function calculateQuarterlyFinances(player, rivals, globalParams) {
    // 安全取得 COSTS 配置，提供完整後備值
    const COSTS = (window.GameConfig && window.GameConfig.COSTS) ? window.GameConfig.COSTS : {
        TURING_SALARY: 5,
        SENIOR_SALARY: 2,
        JUNIOR_SALARY: 0.5,
        CLOUD_PFLOPS_RENT_QUARTERLY: 3,
        PFLOPS_UNIT_PRICE: 20
    };
    
    // === 收入計算 ===
    let revenue = 0;
    
    // 1. 基礎模型收益 - 安全存取 model_power
    const baseModelRevenue = (player.model_power || 1) * 2;
    revenue += baseModelRevenue;
    

    
    // 2. 社群收益（整合新版三指標系統）
    let communityRevenue = 0;
    if (player.community && player.community.size > 0) {
        // 使用新版社群引擎計算收益
        if (window.CommunityEngine && window.CommunityEngine.calculateCommunityRevenue) {
            communityRevenue = window.CommunityEngine.calculateCommunityRevenue(
                player.community, 
                player.route
            );
        } else {
            // 回退到舊版計算
            communityRevenue = player.community.size * 0.0001;
        }
        revenue += communityRevenue;
    } else if (player.community_size > 0) {
        // 兼容舊版 community_size 欄位
        communityRevenue = player.community_size * 0.0001;
        revenue += communityRevenue;
    }
    
    // 3. 商品收益 - 安全存取
    let productRevenue = 0;
    if (player.product_state && player.product_state.product_revenue) {
        productRevenue = player.product_state.product_revenue || 0;
        revenue += productRevenue;
    }
    
    // 4. 產業合約收益加成 - 安全存取
    const revenueBonus = player.revenue_bonus || 0;
    if (revenueBonus > 0) {
        revenue += revenueBonus;
    }
    
    // 5. 算力出租收入（計算當前有效合約的預期收入，實際收入在processTurnUpdates中處理）
    let rentOutRevenue = 0;
    if (player.rented_pflops_contracts && Array.isArray(player.rented_pflops_contracts) && player.rented_pflops_contracts.length > 0) {
        const currentTurn = player.turn_count || 0;
        player.rented_pflops_contracts.forEach(contract => {
            // 只計算未到期的合約
            if (contract && currentTurn < (contract.return_turn || 0)) {
                const amount = contract.amount || 0;
                const rentRate = contract.rent_per_turn_per_pflops || 5;
                rentOutRevenue += amount * rentRate;
            }
        });
    }
    // 注意：rentOutRevenue 不加入 revenue，因為實際收入已在 processTurnUpdates 中處理
    // 這裡只用於顯示統計
    
    // === 支出計算 ===
    let opex = 0;
    
    // 1. 人才薪資 - 安全存取 talent 物件
    const talent = player.talent || { turing: 0, senior: 0, junior: 0 };
    const talentCost = ((talent.turing || 0) * COSTS.TURING_SALARY) +
                      ((talent.senior || 0) * COSTS.SENIOR_SALARY) +
                      ((talent.junior || 0) * COSTS.JUNIOR_SALARY);
    opex += talentCost;
    
    // 2. 雲端算力租金 - 安全存取
    const cloudPflops = player.cloud_pflops || 0;
    const cloudCost = cloudPflops * COSTS.CLOUD_PFLOPS_RENT_QUARTERLY;
    opex += cloudCost;
    
    // 3. 自有算力維護成本 - 安全存取
    const pflops = player.pflops || 0;
    const maintenanceCost = pflops * 0.1; // 每PF每季0.1M維護
    opex += maintenanceCost;
    
    // 4. 債務利息 - 使用信用評級動態利率
    const debt = player.debt || 0;
    let interestRate = player.credit_interest_rate || 0.05;
    if (window.CreditEngine && window.CreditEngine.calculateDynamicInterestRate) {
        const rateInfo = window.CreditEngine.calculateDynamicInterestRate(player, globalParams);
        interestRate = rateInfo.rate;
    }
    const interestCost = debt * interestRate;
    opex += interestCost;
    
    // === 淨現金流 ===
    const netCashFlow = revenue - opex;
    
    return {
        revenue: revenue,
        base_model_revenue: baseModelRevenue,
        community_revenue: communityRevenue,
        product_revenue: productRevenue,
        rent_out_revenue: rentOutRevenue,
        revenue_bonus: revenueBonus,
        
        total_opex: opex,
        talent_cost: talentCost,
        cloud_cost: cloudCost,
        maintenance_cost: maintenanceCost,
        interest_cost: interestCost,
        
        net_cash_flow: netCashFlow
    };
}

// 將函數掛載到全局，以便其他文件使用
if (typeof window !== 'undefined') {
    window.calculateQuarterlyFinances = calculateQuarterlyFinances;
    
    // 也掛載到FinanceEngine
    if (!window.FinanceEngine) {
        window.FinanceEngine = {};
    }
    window.FinanceEngine.calculateQuarterlyFinances = calculateQuarterlyFinances;
    
    console.log('✓ calculateQuarterlyFinances (安全版本) loaded');
}


function handleEndTurn(player, rivals, globalParams) {
    // 使用 try-catch 包裝整個流程，確保錯誤不會導致遊戲崩潰
    try {
        const messages = [];
        let newPlayer = { ...player };
        let newRivals = [...rivals];
        let newGlobalParams = { ...globalParams };
        let currentEvent = null;
        let ending = null;

        // 取得引擎引用（安全存取）
        const EventEng = window.EventEngine || {};
        const RivalEng = window.RivalInvestmentEngine || {};
        const TurnEng = window.TurnUpdateEngine || {};
        const MilestoneEng = window.MilestoneEngine || {};
        const EndingEng = window.EndingEngine || {};
        const StrategyEng = window.StrategyEngine || {};

        // ============================================
        // 1. 全球事件處理（影響全球參數）
        // ============================================
        const globalEvent = EventEng.generateGlobalEvent ? EventEng.generateGlobalEvent() : null;
        if (globalEvent) {
            // 處理 effect 物件格式（新格式）
            if (globalEvent.effect) {
                Object.entries(globalEvent.effect).forEach(([param, delta]) => {
                    if (param === 'regulation') {
                        newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + delta);
                    } else if (newGlobalParams[param] !== undefined) {
                        // 修復：添加上限 Math.min(2.0, ...)
                        newGlobalParams[param] = Math.max(0.5, Math.min(2.0,
                            Math.round((newGlobalParams[param] + delta) * 100) / 100
                        ));
                    }
                });
            }
            // 處理 param/delta 格式（舊格式兼容）
            else if (globalEvent.param) {
                if (globalEvent.param === 'regulation') {
                    newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + globalEvent.delta);
                } else if (newGlobalParams[globalEvent.param] !== undefined) {
                    // 修復：添加上限 Math.min(2.0, ...)
                    newGlobalParams[globalEvent.param] = Math.max(0.5, Math.min(2.0,
                        Math.round((newGlobalParams[globalEvent.param] + globalEvent.delta) * 100) / 100
                    ));
                }
            }
            
            messages.push({
                text: `🌍 全球事件：${globalEvent.desc || globalEvent.name || '市場波動'}`,
                type: 'event'
            });
        }

        // ============================================
        // 1.5 全球市場系統更新（統一數據源）
        // ============================================
        if (window.GlobalMarketEngine && newPlayer.global_market) {
            const updatedMarket = window.GlobalMarketEngine.updateMarket(
                newPlayer.global_market,
                {
                    turn: newPlayer.turn_count || 0,
                    quarter: ((newPlayer.turn_count || 0) % 4) + 1,
                    tier: newPlayer.mp_tier || 0
                }
            );
            newPlayer.global_market = updatedMarket;
            
            // 同步到 globalParams（向下兼容）
            if (updatedMarket.indices) {
                newGlobalParams.E_Price = (updatedMarket.indices.energy_price?.value || 100) / 100;
                newGlobalParams.P_GPU = (updatedMarket.indices.gpu_price?.value || 100) / 100;
                newGlobalParams.R_base = (updatedMarket.indices.interest_rate?.value || 100) / 100;
                newGlobalParams.I_Hype = (updatedMarket.indices.market_confidence?.value || 100) / 100;
            }
        }

        // ============================================
        // 1.6 能源價格系統更新（從GlobalMarket讀取）
        // ============================================
        if (window.EnergyPriceEngine && window.EnergyPriceEngine.calculateEnergyPrice) {
            const energyPriceInfo = window.EnergyPriceEngine.calculateEnergyPrice(
                newPlayer,
                newPlayer.global_market || newGlobalParams,
                newPlayer.turn_count || 0
            );
            
            // 更新 globalParams.E_Price 以保持向後兼容
            newGlobalParams.E_Price = energyPriceInfo.final_price;
        }

        // ============================================
        //  1.7 市場擾動處理（玩家與對手行為影響全球市場）
        // ============================================
        if (window.MarketPerturbationEngine && window.MarketPerturbationEngine.calculateMarketPerturbation) {
            const perturbationResult = window.MarketPerturbationEngine.calculateMarketPerturbation(
                newPlayer,
                newRivals,
                newPlayer.global_market || newGlobalParams
            );            
            
            // 應用擾動到全球市場（新格式）
            if (perturbationResult.perturbations && newPlayer.global_market) {
                newPlayer.global_market = window.MarketPerturbationEngine.applyMarketPerturbation(
                    newPlayer.global_market,
                    perturbationResult
                );
                
                // 同步更新 globalParams
                if (newPlayer.global_market.indices) {
                    newGlobalParams.E_Price = (newPlayer.global_market.indices.energy_price?.value || 100) / 100;
                    newGlobalParams.P_GPU = (newPlayer.global_market.indices.gpu_price?.value || 100) / 100;
                    newGlobalParams.R_base = (newPlayer.global_market.indices.interest_rate?.value || 100) / 100;
                    newGlobalParams.I_Hype = (newPlayer.global_market.indices.market_confidence?.value || 100) / 100;
                }
            } else if (perturbationResult.legacyPerturbations) {
                // 向下兼容：使用舊格式
                newGlobalParams = window.MarketPerturbationEngine.applyMarketPerturbation(
                    newGlobalParams,
                    perturbationResult.legacyPerturbations
                );
            }
            
            // 記錄擾動事件訊息
            if (perturbationResult.events && perturbationResult.events.length > 0) {
                perturbationResult.events.forEach(evt => {
                    messages.push({
                        text: evt.message,
                        type: 'info'
                    });
                });
            }
            
            // 儲存市場上下文供ETF使用
            newPlayer.market_context = {
                perturbations: perturbationResult.perturbations,
                playerInfluence: perturbationResult.playerInfluence
            };
        }
            

        // ============================================
        // 2. 隨機事件處理（基於 Doom Gauge，在 processTurnUpdates 之前執行）
        // ============================================
        if (EventEng.generateRandomEvent) {
            // 計算當前 Doom Gauge
            const doomGauge = EndingEng.calculateDoomGauge 
                ? EndingEng.calculateDoomGauge(newPlayer, newRivals)
                : (EventEng.calculateDoomGauge 
                    ? EventEng.calculateDoomGauge(newPlayer, newRivals)
                    : { commercial_ruin: 0, internal_unraveling: 0, external_sanction: 0 });
            
            const randomEvent = EventEng.generateRandomEvent(newPlayer, doomGauge);
            if (randomEvent && randomEvent.event) {
                currentEvent = randomEvent;
                const evt = randomEvent.event;
                
                // 支援三種事件效果格式
                
                // 格式 1: 物件格式 { effect: { cash: 20, model_power: 5 } }
                if (evt.effect && typeof evt.effect === 'object') {
                    Object.keys(evt.effect).forEach(key => {
                        if (newPlayer.hasOwnProperty(key)) {
                            newPlayer[key] = (newPlayer[key] || 0) + evt.effect[key];
                        }
                    });
                }
                // 格式 2: 字符串格式 { effect: "cash_gain", value: 20 }
                else if (evt.effect && evt.value) {
                    // effectMap 映射系統
                    const effectMap = {
                        'cash_gain': { key: 'cash', mult: 1 },
                        'cash_loss': { key: 'cash', mult: -1 },
                        'mp_boost': { key: 'model_power', mult: 1 },
                        'mp_loss': { key: 'model_power', mult: -1 },
                        'trust_loss': { key: 'trust', mult: -1 },
                        'data_gain': { key: 'high_data', mult: 1 },
                        'talent_loss': { key: 'talent.senior', mult: -1 }
                    };
                    
                    const mapping = effectMap[evt.effect];
                    if (mapping) {
                        // 處理巢狀屬性如 talent.senior
                        if (mapping.key.includes('.')) {
                            const [obj, prop] = mapping.key.split('.');
                            if (newPlayer[obj] && typeof newPlayer[obj][prop] === 'number') {
                                newPlayer[obj][prop] = Math.max(0, newPlayer[obj][prop] + evt.value * mapping.mult);
                            }
                        } 
                        // 處理普通屬性
                        else if (newPlayer.hasOwnProperty(mapping.key)) {
                            newPlayer[mapping.key] = (newPlayer[mapping.key] || 0) + evt.value * mapping.mult;
                        }
                    }
                }
                // 格式 3: switch case 格式（後備支援）
                else if (evt.effect) {
                    switch (evt.effect) {
                        case 'cash_loss': {
                            const loss = typeof evt.value === 'object' ?  
                                evt.value[0] + Math.random() * (evt.value[1] - evt.value[0]) : (evt.value || 0);
                            newPlayer.cash = (newPlayer.cash || 0) - loss;
                            break;
                        }
                        case 'cash_gain':
                            newPlayer.cash = (newPlayer.cash || 0) + (evt.value || 0);
                            break;
                        case 'revenue_bonus':
                            newPlayer.revenue_bonus = (newPlayer.revenue_bonus || 0) + (evt.value || 0);
                            break;
                        case 'mp_loss':
                            newPlayer.model_power = Math.max(1, (newPlayer.model_power || 1) - (evt.value || 0));
                            break;
                        case 'mp_boost':
                            newPlayer.model_power = (newPlayer.model_power || 1) + (evt.value || 0);
                            break;
                        case 'trust_loss':
                            newPlayer.trust = Math.max(0, (newPlayer.trust || 0) - (evt.value || 0));
                            break;
                        case 'data_gain':
                            newPlayer.high_data = (newPlayer.high_data || 0) + (evt.value || 0);
                            break;
                    }
                }
                
                // 添加事件訊息
                messages.push({
                    text: `⚡ ${randomEvent.type === 'neutral' ? '機遇' : '危機'}：${evt.desc || evt.name || '意外事件'}`,
                    type: randomEvent.type === 'neutral' ? 'info' : 'warning'
                });
            }
        }

        // ============================================
        // 3. 更新競爭對手
        // ============================================
        if (RivalEng.updateRival) {
            newRivals = newRivals.map(rival => {
                const result = RivalEng.updateRival(rival, newGlobalParams);
                return result.rival || rival;
            });
        }

        // ============================================
        // 4. 回合更新處理（核心邏輯）
        // ============================================
        let processData = {};
        let turnResult = null;
        
        if (TurnEng.processTurnUpdates) {
            turnResult = TurnEng.processTurnUpdates(newPlayer, newRivals, newGlobalParams);
            
            if (!turnResult || !turnResult.player) {
                // 錯誤處理
                messages.push({
                    text: '回合處理失敗',
                    type: 'danger'
                });
                return {
                    success: false,
                    player: newPlayer,
                    rivals: newRivals,
                    globalParams: newGlobalParams,
                    messages: messages,
                    error: 'processTurnUpdates failed'
                };
            }
            
            newPlayer = turnResult.player;
            processData = turnResult.processData || turnResult.data || {};
            
            // 如果 turnResult 有更新的 rivals，使用它
            if (turnResult.rivals) {
                newRivals = turnResult.rivals;
            }
            
            // 如果 turnResult 有更新的 globalParams，使用它
            if (turnResult.globalParams) {
                newGlobalParams = turnResult.globalParams;
            }
        }

        // ============================================
        // 5. 計算衍生數據（如果引擎提供）
        // ============================================
        const calcDerived = StrategyEng.calculateDerivedStats || TurnEng.calculateDerivedStats;
        if (calcDerived) {
            calcDerived(newPlayer, newGlobalParams);
        }
        
        // ============================================
        // 6. 計算季度財務並應用現金流
        // ============================================
        const finances = calculateQuarterlyFinances(newPlayer, newRivals, newGlobalParams);
        
        // 應用現金流
        newPlayer.cash = (newPlayer.cash || 0) + finances.net_cash_flow;
        
        // ============================================
        // 7. 構建詳細的財務訊息
        // ============================================
        
        // 收入明細
        messages.push({
            text: `【收入】基礎: $${finances.base_model_revenue.toFixed(1)}M, 社群: $${finances.community_revenue.toFixed(1)}M` +
                  (finances.product_revenue > 0 ? `, 商品: $${finances.product_revenue.toFixed(1)}M` : '') +
                  (finances.revenue_bonus > 0 ? `, 加成: $${finances.revenue_bonus.toFixed(1)}M` : ''),
            type: 'info'
        });
        
        // 支出明細
        messages.push({
            text: `【支出】人事: $${finances.talent_cost.toFixed(1)}M, 雲端: $${finances.cloud_cost.toFixed(1)}M, 維護: $${finances.maintenance_cost.toFixed(1)}M, 利息: $${finances.interest_cost.toFixed(1)}M`,
            type: 'warning'
        });
        
        // 季度結算總結
        const netSymbol = finances.net_cash_flow >= 0 ? '+' : '';
        messages.push({
            text: `【季度結算】淨現金流: ${netSymbol}$${finances.net_cash_flow.toFixed(1)}M，現金: $${newPlayer.cash.toFixed(1)}M`,
            type: finances.net_cash_flow >= 0 ? 'success' : 'danger'
        });
        
        // ============================================
        // 8. 處理 processData 中的額外訊息
        // ============================================
        
        // PoC 合約收入
        if (processData.totalPocIncome && processData.totalPocIncome > 0) {
            messages.push({
                text: `PoC合約收入 +$${processData.totalPocIncome.toFixed(0)}M`,
                type: 'info'
            });
        }
        
        // 算力出租收入
        if (processData.totalRentOutIncome && processData.totalRentOutIncome > 0) {
            messages.push({
                text: `算力出租收入 +$${processData.totalRentOutIncome.toFixed(1)}M`,
                type: 'success'
            });
        }
        
        // 對手投資收益（如果有）
        if (processData.rivalInvestmentIncome && processData.rivalInvestmentIncome > 0) {
            messages.push({
                text: `【收入明細】對手投資收益: +$${processData.rivalInvestmentIncome.toFixed(1)}M`,
                type: 'success'
            });
        }

        
        // 算力出租合約到期
        if (processData.expiredRentOutContracts && processData.expiredRentOutContracts.length > 0) {
            const totalExpired = processData.expiredRentOutContracts.reduce((sum, c) => sum + (c.amount || 0), 0);
            messages.push({
                text: `算力出租合約到期，${totalExpired.toFixed(1)} PF 已歸還`,
                type: 'info'
            });
        }
        
        // 產業合約到期
        if (processData.expiredIndustryContracts && processData.expiredIndustryContracts.length > 0) {
            const expiredBonus = processData.expiredIndustryContracts[0].bonus || 0;
            messages.push({
                text: `產業合約到期，收入加成 -$${expiredBonus}M/季`,
                type: 'warning'
            });
        }
        // ============================================
        // 8.5 電力合約期限倒數
        // ============================================
        if (window.EnergyPriceEngine && window.EnergyPriceEngine.updateContractTerm) {
            const beforeUpdate = newPlayer.energy_settings?.contract_remaining || 0;
            newPlayer = window.EnergyPriceEngine.updateContractTerm(newPlayer);
            const afterUpdate = newPlayer.energy_settings?.contract_remaining || 0;
            
            // 如果合約到期
            if (beforeUpdate > 0 && afterUpdate === 0) {
                messages.push({
                    text: '⚡ 電力合約已到期，自動切換回市電',
                    type: 'warning'
                });
            }
        }

        // ============================================
        // 8.6 空間系統處理（Tier2+）
        // ============================================
        if ((newPlayer.mp_tier || 0) >= 2 && newPlayer.space_state && window.SpaceEngine) {
            // 處理建設進度
            const constructionResult = window.SpaceEngine.processConstructionProgress(newPlayer);
            newPlayer = constructionResult.newState;
            
            // 添加完工訊息
            if (constructionResult.messages && constructionResult.messages.length > 0) {
                constructionResult.messages.forEach(msg => {
                    messages.push({ text: msg, type: 'success' });
                });
            }
            
            // 應用空間效果
            const spaceEffects = window.SpaceEngine.applySpaceEffects(newPlayer);
            if (spaceEffects.effects) {
                if (spaceEffects.effects.hype) {
                    newPlayer.hype = Math.min(100, (newPlayer.hype || 0) + spaceEffects.effects.hype);
                }
                if (spaceEffects.effects.regulation) {
                    newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + spaceEffects.effects.regulation);
                }
                if (spaceEffects.effects.loyalty) {
                    newPlayer.loyalty = Math.max(0, Math.min(100, (newPlayer.loyalty || 0) + spaceEffects.effects.loyalty));
                }
                if (spaceEffects.effects.entropy) {
                    newPlayer.entropy = Math.min(100, (newPlayer.entropy || 0) + spaceEffects.effects.entropy);
                }
            }
            
            // 添加警告訊息
            if (spaceEffects.messages && spaceEffects.messages.length > 0) {
                spaceEffects.messages.forEach(msg => {
                    messages.push({ text: msg, type: 'warning' });
                });
            }
            
            // 更新快取
            newPlayer = window.SpaceEngine.updateSpaceCache(newPlayer);
        }

        // ============================================
        // 8.7 空間效率減益處理（Tier2+）
        // ============================================
        if ((newPlayer.mp_tier || 0) >= 2 && window.SpaceEngine?.getTotalEfficiencyDebuff) {
            const debuff = window.SpaceEngine.getTotalEfficiencyDebuff(newPlayer);
            
            if (debuff.hasDebuff) {
                // 記錄減益資訊到玩家狀態
                newPlayer.spaceEfficiencyDebuff = debuff;
                
                // 添加警告訊息
                debuff.reasons.forEach(reason => {
                    messages.push({
                        text: `⚠️ 效率減損: ${reason}`,
                        type: 'warning'
                    });
                });
                
                // 總結訊息
                const penaltyPct = Math.round(debuff.totalPenalty * 100);
                messages.push({
                    text: `📉 本季研發/商品開發效率降低 ${penaltyPct}%`,
                    type: 'danger'
                });
            } else {
                // 清除舊的減益記錄
                delete newPlayer.spaceEfficiencyDebuff;
            }
        }

        // ============================================
        // 8.8 算力使用率效果處理
        // ============================================
        if (window.ComputeEngine?.calculateUtilization && 
            window.ComputeEngine?.applyUtilizationEffects) {
            
            // 計算使用率
            const utilResult = window.ComputeEngine.calculateUtilization(newPlayer);
            
            // 應用效果（會修改 player 的 hype, loyalty 等）
            const utilEffects = window.ComputeEngine.applyUtilizationEffects(
                newPlayer, 
                utilResult
            );
            
            // 記錄使用率狀態
            newPlayer.utilizationStatus = utilResult.status;
            newPlayer.utilizationPercentage = utilResult.percentage || utilResult.utilization;
            
            // 添加使用率訊息（避免重複）
            if (utilEffects.messages && utilEffects.messages.length > 0) {
                utilEffects.messages.forEach(msg => {
                    // 檢查是否已有相同訊息
                    const isDuplicate = messages.some(m => m.text === msg.text);
                    if (!isDuplicate) {
                        messages.push({
                            text: msg.text,
                            type: msg.type || 'info'
                        });
                    }
                });
            }
        }

        // ============================================
        // 9. 處理 turnResult.messages（來自 processTurnUpdates 的訊息）
        // ============================================
        if (turnResult && turnResult.messages && Array.isArray(turnResult.messages)) {
            turnResult.messages.forEach(msg => {
                if (typeof msg === 'string') {
                    messages.push({
                        text: msg,
                        type: 'info'
                    });
                } else if (msg && msg.text) {
                    messages.push({
                        text: msg.text,
                        type: msg.type || 'info'
                    });
                }
            });
        }

        // ============================================
        // 10. Doom Gauge 更新 + 連續回合計數
        // ============================================
        if (EndingEng.calculateDoomGauge) {
            newPlayer.doom_gauge = EndingEng.calculateDoomGauge(newPlayer, newRivals);
        } else if (EventEng.calculateDoomGauge) {
            newPlayer.doom_gauge = EventEng.calculateDoomGauge(newPlayer, newRivals);
        }
        
        // 更新 doom_consecutive_turns（追蹤連續高風險回合數）
        if (newPlayer.doom_gauge) {
            // 確保 doom_consecutive_turns 存在
            if (!newPlayer.doom_consecutive_turns) {
                newPlayer.doom_consecutive_turns = {
                    commercial_ruin: 0,
                    internal_unraveling: 0,
                    external_sanction: 0
                };
            }
            
            // 對每種 doom 類型，如果超過 70 則增加計數，否則重置
            const doomTypes = ['commercial_ruin', 'internal_unraveling', 'external_sanction'];
            doomTypes.forEach(doomType => {
                const level = newPlayer.doom_gauge[doomType] || 0;
                if (level >= 70) {
                    newPlayer.doom_consecutive_turns[doomType] = 
                        (newPlayer.doom_consecutive_turns[doomType] || 0) + 1;
                    
                    // 添加警告訊息
                    const consecutiveTurns = newPlayer.doom_consecutive_turns[doomType];
                    const thresholds = { commercial_ruin: 3, internal_unraveling: 4, external_sanction: 5 };
                    const remaining = thresholds[doomType] - consecutiveTurns;
                    
                    if (remaining > 0 && remaining <= 2) {
                        const doomNames = {
                            commercial_ruin: '商業崩潰',
                            internal_unraveling: '內部崩解',
                            external_sanction: '外部制裁'
                        };
                        messages.push({
                            text: `⚠️ ${doomNames[doomType]}風險持續！還有 ${remaining} 回合將觸發結局！`,
                            type: 'danger'
                        });
                    }
                } else {
                    // 風險降低，重置計數
                    newPlayer.doom_consecutive_turns[doomType] = 0;
                }
            });
        }


        // ============================================
        // 11. 玩家里程碑檢查（MP達標時觸發）
        // ============================================
        if (MilestoneEng.checkMilestones) {
            const newMilestones = MilestoneEng.checkMilestones(newPlayer);
            if (newMilestones && newMilestones.length > 0) {
                newMilestones.forEach(m => {
                    messages.push({
                        text: `🎯 里程碑研發完成：${m.name}，可進行發布！`,
                        type: 'event'
                    });
                });
            }
        }

        // ============================================
        // 12. 對手里程碑檢查（MP達標時自動嘗試發布）
        // ============================================
        if (MilestoneEng.processRivalMilestones) {
            const rivalMilestoneResult = MilestoneEng.processRivalMilestones(newRivals, newGlobalParams);
            newRivals = rivalMilestoneResult.rivals;
            
            // 處理對手里程碑事件訊息
            if (rivalMilestoneResult.events && rivalMilestoneResult.events.length > 0) {
                rivalMilestoneResult.events.forEach(evt => {
                    messages.push({
                        text: evt.message,
                        type: evt.eventType || 'info'
                    });
                });
            }
            
            // 應用全局加成（里程碑成功時的市場影響）
            if (rivalMilestoneResult.globalBonuses && rivalMilestoneResult.globalBonuses.length > 0) {
                rivalMilestoneResult.globalBonuses.forEach(bonus => {
                    if (bonus.I_Hype) {
                        newGlobalParams.I_Hype = Math.min(2.0, 
                            Math.round((newGlobalParams.I_Hype + bonus.I_Hype) * 100) / 100
                        );
                    }
                    if (bonus.description) {
                        messages.push({
                            text: `📈 ${bonus.description}`,
                            type: 'info'
                        });
                    }
                });
            }
        }

        // ============================================
        // 12.5 檢查 Senior 分配（人才減少時自動暫停產品）
        // ============================================
        if (window.checkSeniorAllocationOnTurnEnd) {
            const seniorAdjustResult = window.checkSeniorAllocationOnTurnEnd(newPlayer);
            if (seniorAdjustResult) {
                messages.push(seniorAdjustResult);
            }
        }

        // ============================================
        // 13. 破產檢查
        // ============================================
        if (newPlayer.cash < -100) {
            messages.push({
                text: 'âš ï¸ å…¬å¸ç€•è‡¨ç ´ç”¢ï¼ç¾é‡‘æµåš´é‡ä¸è¶³',
                type: 'danger'
            });
        }
        

        // ============================================
        // 14. 結局檢查
        // ============================================
        if (EndingEng.evaluate || EndingEng.checkEndingConditions) {
            const checkFunc = EndingEng.evaluate || EndingEng.checkEndingConditions;
            const endingCheck = checkFunc(newPlayer, newRivals);
            
            if (endingCheck && (endingCheck.ending || endingCheck)) {
                ending = endingCheck.ending || endingCheck;
                
                // 添加結局訊息
                messages.push({
                    text: '遊戲結束！',
                    type: 'event'
                });
                
                // 顯示結局名稱
                if (ending.name) {
                    messages.push({
                        text: ending.name,
                        type: 'success'
                    });
                }
                
                // 顯示結局描述
                if (ending.description) {
                    messages.push({
                        text: ending.description,
                        type: 'info'
                    });
                }
            }
        }

        // ============================================
        // 15. 返回完整結果
        // ============================================
        // 將事件資訊添加到 processData 供 UI 使用
        processData.globalEvent = globalEvent;
        processData.randomEvent = currentEvent;
       return {
            success: true,
            player: newPlayer,
            rivals: newRivals,
            globalParams: newGlobalParams,
            messages: messages,
            processData: processData,
            currentEvent: currentEvent,
            ending: ending
        };
        
    } catch (error) {
        // 完整的錯誤處理
        console.error('End turn error:', error);
        return {
            success: false,
            player: player,
            rivals: rivals,
            globalParams: globalParams,
            messages: [{
                text: `回合結算失敗: ${error.message}`,
                type: 'danger'
            }],
            error: error.message
        };
    }
}

// ============================================
// 回合引擎自我註冊 (修正名稱和邏輯)
// ============================================

(function() {
    'use strict';
    
    // 使用安全寫法初始化或取得 TurnUpdateEngine
    window.TurnUpdateEngine = window.TurnUpdateEngine || {};
    
    // 註冊核心流程功能
    window.TurnUpdateEngine.handleEndTurn = handleEndTurn;
    
    // 兼容舊版名稱
    window.TurnEngine = window.TurnUpdateEngine; 
    
    console.log('✓ TurnUpdate Engine (HandleEndTurn) loaded');
})();