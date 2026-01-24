// ============================================
// 回合結束處理引擎 - 流程編排
// ============================================
// 職責：編排回合結束的所有流程，協調各引擎調用順序
// 處理：對手更新、里程碑檢查、全球市場、事件系統、訊息整合

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
    const COSTS = (window.GameConfig && window.GameConfig.COSTS) ? window.GameConfig.COSTS : {
        TURING_SALARY: 5,
        SENIOR_SALARY: 2,
        JUNIOR_SALARY: 0.5,
        CLOUD_PFLOPS_RENT_QUARTERLY: 3,
        PFLOPS_UNIT_PRICE: 20
    };
    
    // === 收入計算 ===
    let revenue = 0;
    
    // 1. 基礎模型收益
    const baseModelRevenue = 0;
    revenue += baseModelRevenue;
    
    // 2. 社群收益
    let communityRevenue = 0;
    if (player.community && player.community.size > 0) {
        if (window.CommunityEngine && window.CommunityEngine.calculateCommunityRevenue) {
            communityRevenue = window.CommunityEngine.calculateCommunityRevenue(
                player.community, 
                player.route
            );
        } else {
            communityRevenue = player.community.size * 0.0001;
        }
        revenue += communityRevenue;
    } else if (player.community_size > 0) {
        communityRevenue = player.community_size * 0.0001;
        revenue += communityRevenue;
    }
    
    // 3. 商品收益
    let productRevenue = 0;
    if (player.product_state && player.product_state.product_revenue) {
        productRevenue = player.product_state.product_revenue || 0;
        revenue += productRevenue;
    }
    
    // 4. 產業合約收益加成
    const revenueBonus = player.revenue_bonus || 0;
    if (revenueBonus > 0) {
        revenue += revenueBonus;
    }
    
    // 5. 算力出租收入（統計用）
    let rentOutRevenue = 0;
    if (player.rented_pflops_contracts && Array.isArray(player.rented_pflops_contracts) && player.rented_pflops_contracts.length > 0) {
        const currentTurn = player.turn_count || 0;
        player.rented_pflops_contracts.forEach(contract => {
            if (contract && currentTurn < (contract.return_turn || 0)) {
                const amount = contract.amount || 0;
                const rentRate = contract.rent_per_turn_per_pflops || 5;
                rentOutRevenue += amount * rentRate;
            }
        });
    }
    
    // === 支出計算 ===
    let opex = 0;
    
    // 1. 人才薪資
    const talent = player.talent || { turing: 0, senior: 0, junior: 0 };
    const talentCost = ((talent.turing || 0) * COSTS.TURING_SALARY) +
                      ((talent.senior || 0) * COSTS.SENIOR_SALARY) +
                      ((talent.junior || 0) * COSTS.JUNIOR_SALARY);
    opex += talentCost;
    
    // 2. 雲端算力租金
    const cloudPflops = player.cloud_pflops || 0;
    const cloudCost = cloudPflops * COSTS.CLOUD_PFLOPS_RENT_QUARTERLY;
    opex += cloudCost;
    
    // 3. 自有算力維護成本
    const pflops = player.pflops || 0;
    const maintenanceCost = pflops * 0.1;
    opex += maintenanceCost;
    
    // 4. 債務利息
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

/**
 * 處理回合結束的所有邏輯（流程編排）
 * @param {Object} player - 玩家狀態
 * @param {Array} rivals - 競爭對手列表
 * @param {Object} globalParams - 全局參數
 * @returns {Object} 完整的回合結束結果
 */
function handleEndTurn(player, rivals, globalParams) {
    try {
        const messages = [];
        let newPlayer = { ...player };
        let newRivals = [...rivals];
        let newGlobalParams = { ...globalParams };
        let currentEvent = null;
        let ending = null;
        let processData = {};

        // 取得引擎引用
        const EventEng = window.EventEngine || {};
        const MilestoneEng = window.MilestoneEngine || {};
        const EndingEng = window.EndingEngine || {};
        const TurnEng = window.TurnUpdateEngine || {};

        // ============================================
        // 階段 1: 全球系統更新（在玩家/對手行動前）
        // ============================================

        // 1.1 全球事件處理
        const globalEvent = EventEng.generateGlobalEvent ? EventEng.generateGlobalEvent() : null;
        if (globalEvent) {
            if (globalEvent.effect) {
                Object.entries(globalEvent.effect).forEach(([param, delta]) => {
                    if (param === 'regulation') {
                        newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + delta);
                    } else if (newGlobalParams[param] !== undefined) {
                        newGlobalParams[param] = Math.max(0.5, Math.min(2.0,
                            Math.round((newGlobalParams[param] + delta) * 100) / 100
                        ));
                    }
                });
            } else if (globalEvent.param) {
                if (globalEvent.param === 'regulation') {
                    newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + globalEvent.delta);
                } else if (newGlobalParams[globalEvent.param] !== undefined) {
                    newGlobalParams[globalEvent.param] = Math.max(0.5, Math.min(2.0,
                        Math.round((newGlobalParams[globalEvent.param] + globalEvent.delta) * 100) / 100
                    ));
                }
            }
            
            messages.push({
                text: `🌐 全球事件：${globalEvent.desc || globalEvent.name || '市場波動'}`,
                type: 'event'
            });
        }

        // 1.2 全球市場系統更新
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
            
            // 同步到 globalParams
            if (updatedMarket.indices) {
                newGlobalParams.E_Price = (updatedMarket.indices.energy_price?.value || 100) / 100;
                newGlobalParams.P_GPU = (updatedMarket.indices.gpu_price?.value || 100) / 100;
                newGlobalParams.R_base = (updatedMarket.indices.interest_rate?.value || 100) / 100;
                newGlobalParams.I_Hype = (updatedMarket.indices.market_confidence?.value || 100) / 100;
            }
        }

        // 1.3 能源價格系統更新
        if (window.EnergyPriceEngine && window.EnergyPriceEngine.calculateEnergyPrice) {
            const energyPriceInfo = window.EnergyPriceEngine.calculateEnergyPrice(
                newPlayer,
                newPlayer.global_market || newGlobalParams,
                newPlayer.turn_count || 0
            );
            newGlobalParams.E_Price = energyPriceInfo.final_price;
        }

        // 1.4 市場擾動處理（上回合行為影響）
        if (window.MarketPerturbationEngine && window.MarketPerturbationEngine.calculateMarketPerturbation) {
            const perturbationResult = window.MarketPerturbationEngine.calculateMarketPerturbation(
                newPlayer,
                newRivals,
                newPlayer.global_market || newGlobalParams
            );            
            
            if (perturbationResult.perturbations && newPlayer.global_market) {
                newPlayer.global_market = window.MarketPerturbationEngine.applyMarketPerturbation(
                    newPlayer.global_market,
                    perturbationResult
                );
                
                if (newPlayer.global_market.indices) {
                    newGlobalParams.E_Price = (newPlayer.global_market.indices.energy_price?.value || 100) / 100;
                    newGlobalParams.P_GPU = (newPlayer.global_market.indices.gpu_price?.value || 100) / 100;
                    newGlobalParams.R_base = (newPlayer.global_market.indices.interest_rate?.value || 100) / 100;
                    newGlobalParams.I_Hype = (newPlayer.global_market.indices.market_confidence?.value || 100) / 100;
                }
            }
            
            if (perturbationResult.events && perturbationResult.events.length > 0) {
                perturbationResult.events.forEach(evt => {
                    messages.push({ text: evt.message, type: 'info' });
                });
            }
            
            newPlayer.market_context = {
                perturbations: perturbationResult.perturbations,
                playerInfluence: perturbationResult.playerInfluence
            };
        }

        // ============================================
        // 階段 2: 隨機事件處理
        // ============================================
        if (EventEng.generateRandomEvent) {
            const doomGauge = EndingEng.calculateDoomGauge 
                ? EndingEng.calculateDoomGauge(newPlayer, newRivals)
                : { commercial_ruin: 0, internal_unraveling: 0, external_sanction: 0 };
            
            const randomEvent = EventEng.generateRandomEvent(newPlayer, doomGauge);
            if (randomEvent && randomEvent.event) {
                currentEvent = randomEvent;
                const evt = randomEvent.event;
                
                // 處理事件效果
                if (evt.effect && typeof evt.effect === 'object') {
                    Object.keys(evt.effect).forEach(key => {
                        if (newPlayer.hasOwnProperty(key)) {
                            newPlayer[key] = (newPlayer[key] || 0) + evt.effect[key];
                        }
                    });
                } else if (evt.effect) {
                    const effectMap = {
                        'cash_gain': { key: 'cash', mult: 1 },
                        'cash_loss': { key: 'cash', mult: -1 },
                        'mp_boost': { key: 'model_power', mult: 1 },
                        'mp_loss': { key: 'model_power', mult: -1 },
                        'trust_loss': { key: 'trust', mult: -1 },
                        'data_gain': { key: 'high_data', mult: 1 }
                    };
                    
                    const mapping = effectMap[evt.effect];
                    if (mapping && newPlayer.hasOwnProperty(mapping.key)) {
                        newPlayer[mapping.key] = (newPlayer[mapping.key] || 0) + (evt.value || 0) * mapping.mult;
                    }
                }
                
                messages.push({
                    text: `⚡ ${randomEvent.type === 'neutral' ? '機會' : '危機'}：${evt.desc || evt.name || '意外事件'}`,
                    type: randomEvent.type === 'neutral' ? 'info' : 'warning'
                });
            }
        }

        // ============================================
        // 階段 3: 對手處理（統一在此處理，不在 processTurnUpdates 重複）
        // ============================================
        let rivalBehaviorResult = null;
        let rivalMilestoneResult = null;
        
        // 3.1 對手行為選擇與執行
        const RivalBehaviorEng = window.RivalBehaviorEngine;
        
        if (RivalBehaviorEng && RivalBehaviorEng.processAllRivals) {
            rivalBehaviorResult = RivalBehaviorEng.processAllRivals(
                newRivals,
                newPlayer,
                newPlayer.global_market || null
            );
            
            newRivals = rivalBehaviorResult.rivals;
            
            if (rivalBehaviorResult.messages && rivalBehaviorResult.messages.length > 0) {
                rivalBehaviorResult.messages.forEach(msg => {
                    messages.push({
                        text: msg.text || msg,
                        type: msg.type || 'info'
                    });
                });
            }
            
            // 應用市場影響
            if (rivalBehaviorResult.marketActions && rivalBehaviorResult.marketActions.length > 0) {
                if (newPlayer.global_market && window.GlobalMarketEngine) {
                    rivalBehaviorResult.marketActions.forEach(action => {
                        newPlayer.global_market = window.GlobalMarketEngine.updateMarket(
                            newPlayer.global_market,
                            { actions: [action], turn: newPlayer.turn_count || 0 }
                        );
                    });
                }
            }
        } else {
            // 回退邏輯
            const MODEL_TIERS = window.GameConfig?.COSTS?.MODEL_TIERS;
            
            newRivals = newRivals.map(rival => {
                const updated = JSON.parse(JSON.stringify(rival));
                const config = rival.config || {};
                const baseMPGrowth = 1.5;
                const styleKey = rival.style_key || config.style_key || 'default';
                let mpGrowth = baseMPGrowth * (config.mp_mult || 1.0) * (0.8 + Math.random() * 0.4);
                
                // 全球參數影響
                const hypeBoost = (newGlobalParams.I_Hype || 1) - 1;
                mpGrowth *= (1 + hypeBoost * 0.2);
                
                // 里程碑門檻限制
                const currentMP = updated.mp || 10;
                const currentTier = updated.mp_tier || 0;
                const nextTier = currentTier + 1;
                let newMP = currentMP + mpGrowth;
                
                if (nextTier <= 5 && MODEL_TIERS && MODEL_TIERS[nextTier]) {
                    const threshold = MODEL_TIERS[nextTier].mp;
                    if (newMP >= threshold) {
                        newMP = threshold;
                        updated.at_milestone_threshold = true;
                    }
                }
                
                updated.mp = Math.min(1005, newMP);
                
                // 市值更新
                const mpRatio = updated.mp / 1005;
                const hypeEffect = Math.min(50, (updated.hype || 0) * 0.5);
                const trustEffect = (updated.trust || 0) * 0.3;
                updated.market_cap = Math.max(100, 500 + mpRatio * 2000 + hypeEffect * 10 + trustEffect * 5);
                
                // 自然衰減
                updated.entropy = Math.max(0, (updated.entropy || 0) * 0.98);
                updated.compliance_risk = Math.max(0, (updated.compliance_risk || 0) * 0.97);
                
                return updated;
            });
        }
        
        // 3.2 對手里程碑檢查
        if (MilestoneEng.processRivalMilestones) {
            rivalMilestoneResult = MilestoneEng.processRivalMilestones(newRivals, newGlobalParams);
            newRivals = rivalMilestoneResult.rivals;
            
            if (rivalMilestoneResult.events && rivalMilestoneResult.events.length > 0) {
                rivalMilestoneResult.events.forEach(evt => {
                    messages.push({
                        text: evt.message,
                        type: evt.eventType || 'info'
                    });
                });
            }
            
            // 應用全局加成
            if (rivalMilestoneResult.globalBonuses && rivalMilestoneResult.globalBonuses.length > 0) {
                rivalMilestoneResult.globalBonuses.forEach(bonus => {
                    if (bonus.I_Hype) {
                        newGlobalParams.I_Hype = Math.min(2.0,
                            Math.round((newGlobalParams.I_Hype + bonus.I_Hype) * 100) / 100
                        );
                    }
                    if (bonus.description) {
                        messages.push({
                            text: '📈 ' + bonus.description,
                            type: 'info'
                        });
                    }
                });
            }
            
            // 整合市場影響
            if (rivalMilestoneResult.marketActions && rivalMilestoneResult.marketActions.length > 0) {
                if (newPlayer.global_market && window.GlobalMarketEngine) {
                    rivalMilestoneResult.marketActions.forEach(action => {
                        newPlayer.global_market = window.GlobalMarketEngine.updateMarket(
                            newPlayer.global_market,
                            { actions: [action], turn: newPlayer.turn_count || 0 }
                        );
                    });
                    
                    if (newPlayer.global_market.indices) {
                        newGlobalParams.E_Price = (newPlayer.global_market.indices.energy_price?.value || 100) / 100;
                        newGlobalParams.P_GPU = (newPlayer.global_market.indices.gpu_price?.value || 100) / 100;
                        newGlobalParams.R_base = (newPlayer.global_market.indices.interest_rate?.value || 100) / 100;
                        newGlobalParams.I_Hype = (newPlayer.global_market.indices.market_confidence?.value || 100) / 100;
                    }
                }
            }
        }

        // ============================================
        // 階段 4: 玩家狀態更新（調用 processTurnUpdates）
        // ============================================
        if (TurnEng.processTurnUpdates) {
            const turnResult = TurnEng.processTurnUpdates(newPlayer, newGlobalParams);
            
            if (!turnResult || !turnResult.player) {
                messages.push({ text: '回合處理失敗', type: 'danger' });
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
            processData = turnResult.processData || {};
            
            // 合併訊息
            if (turnResult.messages && turnResult.messages.length > 0) {
                turnResult.messages.forEach(msg => messages.push(msg));
            }
        }

        // ============================================
        // 階段 5: 計算衍生數據
        // ============================================
        const calcDerived = TurnEng.calculateDerivedStats;
        if (calcDerived) {
            calcDerived(newPlayer, newGlobalParams);
        }
        
        // ============================================
        // 階段 6: 計算季度財務並應用現金流
        // ============================================
        const finances = calculateQuarterlyFinances(newPlayer, newRivals, newGlobalParams);
        newPlayer.cash = (newPlayer.cash || 0) + finances.net_cash_flow;
        
        // 財務訊息
        messages.push({
            text: `【收入】基礎: $${finances.base_model_revenue.toFixed(1)}M, 社群: $${finances.community_revenue.toFixed(1)}M` +
                  (finances.product_revenue > 0 ? `, 商品: $${finances.product_revenue.toFixed(1)}M` : '') +
                  (finances.revenue_bonus > 0 ? `, 加成: $${finances.revenue_bonus.toFixed(1)}M` : ''),
            type: 'info'
        });
        
        messages.push({
            text: `【支出】人事: $${finances.talent_cost.toFixed(1)}M, 雲端: $${finances.cloud_cost.toFixed(1)}M, 維護: $${finances.maintenance_cost.toFixed(1)}M, 利息: $${finances.interest_cost.toFixed(1)}M`,
            type: 'warning'
        });
        
        const netSymbol = finances.net_cash_flow >= 0 ? '+' : '';
        messages.push({
            text: `【季度結算】淨現金流: ${netSymbol}$${finances.net_cash_flow.toFixed(1)}M，現金: $${newPlayer.cash.toFixed(1)}M`,
            type: finances.net_cash_flow >= 0 ? 'success' : 'danger'
        });

        // ============================================
        // 階段 7: 處理 processData 中的額外訊息
        // ============================================
        if (processData.totalPocIncome && processData.totalPocIncome > 0) {
            messages.push({
                text: `PoC合約收入 +$${processData.totalPocIncome.toFixed(0)}M`,
                type: 'info'
            });
        }
        
        if (processData.totalRentOutIncome && processData.totalRentOutIncome > 0) {
            messages.push({
                text: `算力出租收入 +$${processData.totalRentOutIncome.toFixed(1)}M`,
                type: 'success'
            });
        }
        
        if (processData.rivalInvestmentIncome && processData.rivalInvestmentIncome > 0) {
            messages.push({
                text: `【收入明細】對手投資收益: +$${processData.rivalInvestmentIncome.toFixed(1)}M`,
                type: 'success'
            });
        }
        
        if (processData.expiredRentOutContracts && processData.expiredRentOutContracts.length > 0) {
            const totalExpired = processData.expiredRentOutContracts.reduce((sum, c) => sum + (c.amount || 0), 0);
            messages.push({
                text: `算力出租合約到期，${totalExpired.toFixed(1)} PF 已歸還`,
                type: 'info'
            });
        }
        
        if (processData.expiredIndustryContracts && processData.expiredIndustryContracts.length > 0) {
            const expiredBonus = processData.expiredIndustryContracts[0].bonus || 0;
            messages.push({
                text: `產業合約到期，收入加成 -$${expiredBonus}M/季`,
                type: 'warning'
            });
        }

        // ============================================
        // 階段 8: 電力合約期限倒數
        // ============================================
        if (window.EnergyPriceEngine && window.EnergyPriceEngine.updateContractTerm) {
            const beforeUpdate = newPlayer.energy_settings?.contract_remaining || 0;
            newPlayer = window.EnergyPriceEngine.updateContractTerm(newPlayer);
            const afterUpdate = newPlayer.energy_settings?.contract_remaining || 0;
            
            if (beforeUpdate > 0 && afterUpdate === 0) {
                messages.push({
                    text: '⚡ 電力合約已到期，自動切換回市電',
                    type: 'warning'
                });
            }
        }

        // ============================================
        // 階段 9: 空間系統處理（Tier2+）
        // ============================================
        if ((newPlayer.mp_tier || 0) >= 2 && newPlayer.space_system) {
            if (window.SpaceEngine && window.SpaceEngine.processTurnUpdate) {
                const spaceResult = window.SpaceEngine.processTurnUpdate(newPlayer.space_system);
                newPlayer.space_system = spaceResult.space_system;
                
                if (spaceResult.messages && spaceResult.messages.length > 0) {
                    spaceResult.messages.forEach(msg => messages.push(msg));
                }
            }
        }

        // ============================================
        // 階段 10: ETF 系統更新（Tier3+）
        // ============================================
        if ((newPlayer.mp_tier || 0) >= 3 && window.ETFEngine && newPlayer.etf_holdings) {
            const etfResult = window.ETFEngine.processQuarterlyUpdate(
                newPlayer,
                newPlayer.global_market || newGlobalParams,
                newRivals
            );
            
            if (etfResult) {
                if (etfResult.holdings) {
                    newPlayer.etf_holdings = etfResult.holdings;
                }
                if (etfResult.messages && etfResult.messages.length > 0) {
                    etfResult.messages.forEach(msg => messages.push(msg));
                }
                if (typeof etfResult.totalValue === 'number') {
                    newPlayer.etf_total_value = etfResult.totalValue;
                }
            }
        }

        // ============================================
        // 階段 11: Tier4 全球市場與區域系統
        // ============================================
        if ((newPlayer.mp_tier || 0) >= 4) {
            // 檢查並初始化 Tier4 系統
            if (window.InitialStateEngine && window.InitialStateEngine.checkAndInitializeTier4) {
                const tier4State = window.InitialStateEngine.checkAndInitializeTier4(newPlayer);
                if (tier4State.global_market && !newPlayer.global_market) {
                    newPlayer.global_market = tier4State.global_market;
                    messages.push({ text: '🌐 全球市場系統已啟動！', type: 'event' });
                }
                if (tier4State.region_system && !newPlayer.region_system) {
                    newPlayer.region_system = tier4State.region_system;
                    messages.push({ text: '🗺️ 區域營運系統已啟動！', type: 'event' });
                }
            }
            
            // 更新區域系統狀態
            if (newPlayer.region_system && window.RegionEngine) {
                newPlayer.region_system = window.RegionEngine.processTurnEnd(
                    newPlayer.region_system,
                    newPlayer.turn_count
                );
            }
            
            // 處理區域資產派駐效果
            if (newPlayer.region_system && window.RegionAssetIntegration) {
                const deploymentResult = window.RegionAssetIntegration.processTurnDeploymentEffects(newPlayer);
                if (deploymentResult.revenue > 0) {
                    newPlayer.cash += deploymentResult.revenue;
                }
                if (deploymentResult.messages && deploymentResult.messages.length > 0) {
                    deploymentResult.messages.forEach(msg => messages.push(msg));
                }
            }
        }
        
        // ============================================
        // 階段 12: Doom Gauge 與警告
        // ============================================
        if (EndingEng.calculateDoomGauge) {
            const doomGauge = EndingEng.calculateDoomGauge(newPlayer, newRivals);
            
            if (!newPlayer.doom_consecutive_turns) {
                newPlayer.doom_consecutive_turns = {
                    commercial_ruin: 0,
                    internal_unraveling: 0,
                    external_sanction: 0
                };
            }
            
            const thresholds = { commercial_ruin: 4, internal_unraveling: 4, external_sanction: 3 };
            
            Object.keys(doomGauge).forEach(doomType => {
                if (doomGauge[doomType] >= 70) {
                    newPlayer.doom_consecutive_turns[doomType]++;
                    const consecutiveTurns = newPlayer.doom_consecutive_turns[doomType];
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
                    newPlayer.doom_consecutive_turns[doomType] = 0;
                }
            });
        }

        // ============================================
        // 階段 13: 玩家里程碑檢查
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
        // 階段 14: Senior 分配檢查
        // ============================================
        if (window.checkSeniorAllocationOnTurnEnd) {
            const seniorAdjustResult = window.checkSeniorAllocationOnTurnEnd(newPlayer);
            if (seniorAdjustResult) {
                messages.push(seniorAdjustResult);
            }
        }

        // ============================================
        // 階段 15: 破產檢查
        // ============================================
        if (newPlayer.cash < -100) {
            messages.push({
                text: '現金少於 -$100M，企業即將破產！',
                type: 'danger'
            });
        }

        // ============================================
        // 階段 16: 結局檢查
        // ============================================
        if (EndingEng.evaluate || EndingEng.checkEndingConditions) {
            const checkFunc = EndingEng.evaluate || EndingEng.checkEndingConditions;
            const endingCheck = checkFunc(newPlayer, newRivals);
            
            if (endingCheck && (endingCheck.ending || endingCheck)) {
                ending = endingCheck.ending || endingCheck;
                
                messages.push({ text: '遊戲結束！', type: 'event' });
                
                if (ending.name) {
                    messages.push({ text: ending.name, type: 'success' });
                }
                
                if (ending.description) {
                    messages.push({ text: ending.description, type: 'info' });
                }
            }
        }

        // ============================================
        // 階段 17: 返回完整結果
        // ============================================
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
// 引擎註冊
// ============================================
(function() {
    'use strict';
    
    window.TurnUpdateEngine = window.TurnUpdateEngine || {};
    window.TurnUpdateEngine.handleEndTurn = handleEndTurn;
    
    // 掛載財務計算函數
    window.calculateQuarterlyFinances = calculateQuarterlyFinances;
    if (!window.FinanceEngine) {
        window.FinanceEngine = {};
    }
    window.FinanceEngine.calculateQuarterlyFinances = calculateQuarterlyFinances;
    
    // 兼容舊名稱
    window.TurnEngine = window.TurnUpdateEngine;
    
    console.log('✓ TurnUpdate Engine (HandleEndTurn) loaded - flow orchestration');
})();