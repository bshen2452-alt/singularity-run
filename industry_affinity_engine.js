// ============================================
// 產業親和度引擎 (Industry Affinity Engine)
// ============================================
// 設計：純函數式，僅接收數據參數/返回計算結果
// 功能：計算親和度變化、效果應用、與其他系統整合

(function() {
    'use strict';

    const IndustryAffinityEngine = {

        // ==========================================
        // 初始化
        // ==========================================

        /**
         * 創建初始親和度狀態
         * @param {string} route - 玩家選擇的路線
         * @returns {Object} 初始親和度狀態
         */
        createInitialState(route) {
            const config = window.IndustryAffinityConfig;
            if (!config) {
                console.warn('IndustryAffinityConfig not loaded');
                return this.getEmptyState();
            }

            const initialAffinity = config.ROUTE_INITIAL_AFFINITY[route] || {};
            
            return {
                // 各產業親和度
                affinity: {
                    semiconductor: initialAffinity.semiconductor || 0,
                    cloud_infra: initialAffinity.cloud_infra || 0,
                    energy: initialAffinity.energy || 0,
                    data_provider: initialAffinity.data_provider || 0,
                    defense: initialAffinity.defense || 0,
                    consumer: initialAffinity.consumer || 0,
                    enterprise: initialAffinity.enterprise || 0,
                    research: initialAffinity.research || 0
                },
                
                // 戰略合約
                strategic_contracts: [],
                
                // 親和度歷史記錄
                history: [],
                
                // 上次更新回合
                last_update_turn: 0
            };
        },

        /**
         * 獲取空狀態
         */
        getEmptyState() {
            return {
                affinity: {
                    semiconductor: 0, cloud_infra: 0, energy: 0, data_provider: 0,
                    defense: 0, consumer: 0, enterprise: 0, research: 0
                },
                strategic_contracts: [],
                history: [],
                last_update_turn: 0
            };
        },

        // ==========================================
        // 親和度變更
        // ==========================================

        /**
         * 修改單一產業親和度
         * @param {Object} state - 當前親和度狀態
         * @param {string} industry - 產業ID
         * @param {number} delta - 變化量
         * @param {string} reason - 變化原因
         * @returns {Object} 新狀態
         */
        modifyAffinity(state, industry, delta, reason = '') {
            const newState = JSON.parse(JSON.stringify(state));
            
            if (!newState.affinity.hasOwnProperty(industry)) {
                console.warn(`Unknown industry: ${industry}`);
                return newState;
            }

            const oldValue = newState.affinity[industry];
            const newValue = Math.max(-100, Math.min(100, oldValue + delta));
            newState.affinity[industry] = newValue;

            // 記錄歷史
            newState.history.push({
                industry,
                oldValue,
                newValue,
                delta: newValue - oldValue,
                reason,
                timestamp: Date.now()
            });

            // 限制歷史長度
            if (newState.history.length > 50) {
                newState.history = newState.history.slice(-50);
            }

            return newState;
        },

        /**
         * 批量修改親和度
         * @param {Object} state - 當前狀態
         * @param {Object} changes - 變化對象 { industry: delta, ... }
         * @param {string} reason - 變化原因
         * @returns {Object} 新狀態
         */
        batchModifyAffinity(state, changes, reason = '') {
            let newState = JSON.parse(JSON.stringify(state));
            
            for (const [industry, delta] of Object.entries(changes)) {
                if (delta !== 0) {
                    newState = this.modifyAffinity(newState, industry, delta, reason);
                }
            }

            return newState;
        },

        // ==========================================
        // 戰略融資處理
        // ==========================================

        /**
         * 執行戰略融資
         * @param {Object} player - 玩家狀態
         * @param {string} financingId - 融資類型ID
         * @returns {Object} 執行結果
         */
        executeStrategicFinancing(player, financingId) {
            const config = window.IndustryAffinityConfig;
            if (!config) {
                return { success: false, message: '配置未載入' };
            }

            const financing = config.STRATEGIC_FINANCING[financingId];
            if (!financing) {
                return { success: false, message: '未知的融資類型' };
            }

            // 檢查解鎖條件
            if ((player.mp_tier || 0) < financing.unlock_tier) {
                return { 
                    success: false, 
                    message: `需要 Tier ${financing.unlock_tier} 解鎖` 
                };
            }

            const newPlayer = JSON.parse(JSON.stringify(player));
            
            // 確保親和度狀態存在
            if (!newPlayer.industry_affinity_state) {
                newPlayer.industry_affinity_state = this.createInitialState(newPlayer.tech_route);
            }

            const terms = financing.terms;
            const effects = financing.immediate_effects;

            // 計算融資金額
            const marketCap = newPlayer.market_cap || 100;
            let cashGain = terms.cash_base + (marketCap * terms.cash_market_cap_ratio);
            cashGain *= (effects.cash_multiplier || 1.0);

            // 應用立即效果
            newPlayer.cash += cashGain;
            
            if (effects.pflops) {
                newPlayer.pflops = (newPlayer.pflops || 0) + effects.pflops;
            }
            if (effects.cloud_pflops) {
                newPlayer.cloud_pflops = (newPlayer.cloud_pflops || 0) + effects.cloud_pflops;
            }
            if (effects.high_data) {
                newPlayer.high_data = (newPlayer.high_data || 0) + effects.high_data;
            }
            if (effects.trust) {
                newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + effects.trust);
            }

            // 應用股權稀釋
            const dilution = terms.dilution;
            newPlayer.founder_shares = (newPlayer.founder_shares || 1.0) * (1 - dilution);

            // 應用親和度變化
            if (financing.affinity_changes) {
                newPlayer.industry_affinity_state = this.batchModifyAffinity(
                    newPlayer.industry_affinity_state,
                    financing.affinity_changes,
                    `戰略融資: ${financing.name}`
                );
            }

            // 建立戰略合約
            if (financing.contract_effects && financing.contract_effects.duration > 0) {
                const contract = {
                    id: `${financingId}_${Date.now()}`,
                    type: financingId,
                    name: financing.name,
                    start_turn: newPlayer.turn_count || 0,
                    duration: financing.contract_effects.duration,
                    remaining: financing.contract_effects.duration,
                    effects: financing.contract_effects,
                    lock_period: terms.lock_period
                };
                
                newPlayer.industry_affinity_state.strategic_contracts.push(contract);
            }

            return {
                success: true,
                player: newPlayer,
                message: `${financing.name}完成！獲得 $${cashGain.toFixed(0)}M，股權稀釋 ${(dilution * 100).toFixed(1)}%`,
                financing: financing,
                cashGain: cashGain,
                dilution: dilution
            };
        },

        // ==========================================
        // 設施升級影響
        // ==========================================

        /**
         * 應用設施升級的親和度效果
         * @param {Object} state - 當前親和度狀態
         * @param {string} assetType - 資產類型 (space/power/compute)
         * @param {string} upgradePath - 升級路徑ID
         * @param {number} newLevel - 新等級
         * @returns {Object} 新狀態
         */
        applyFacilityUpgradeAffinity(state, assetType, upgradePath, newLevel) {
            const config = window.IndustryAffinityConfig;
            if (!config) return state;

            const facilityEffects = config.FACILITY_AFFINITY_EFFECTS[assetType];
            if (!facilityEffects || !facilityEffects[upgradePath]) return state;

            const pathConfig = facilityEffects[upgradePath];
            const levelEffects = pathConfig.level_effects[newLevel];
            
            if (!levelEffects) return state;

            return this.batchModifyAffinity(
                state, 
                levelEffects, 
                `設施升級: ${assetType}.${upgradePath} Lv${newLevel}`
            );
        },

        // ==========================================
        // 電力合約影響
        // ==========================================

        /**
         * 應用電力合約的親和度效果
         * @param {Object} state - 當前親和度狀態
         * @param {string} contractId - 合約ID
         * @param {boolean} isNewContract - 是否為新簽合約
         * @returns {Object} 新狀態
         */
        applyPowerContractAffinity(state, contractId, isNewContract = true) {
            const config = window.IndustryAffinityConfig;
            if (!config) return state;

            const contractConfig = config.POWER_CONTRACT_AFFINITY[contractId];
            if (!contractConfig) return state;

            // 新簽合約時應用一次性變化
            if (isNewContract && contractConfig.affinity_change) {
                return this.batchModifyAffinity(
                    state,
                    contractConfig.affinity_change,
                    `簽訂電力合約: ${contractId}`
                );
            }

            return state;
        },

        /**
         * 處理電力合約的每季效果
         */
        processQuarterlyPowerContractAffinity(state, activeContracts) {
            const config = window.IndustryAffinityConfig;
            if (!config) return state;

            let newState = JSON.parse(JSON.stringify(state));

            for (const contractId of activeContracts) {
                const contractConfig = config.POWER_CONTRACT_AFFINITY[contractId];
                if (contractConfig && contractConfig.per_quarter) {
                    newState = this.batchModifyAffinity(
                        newState,
                        contractConfig.per_quarter,
                        `電力合約持續效果: ${contractId}`
                    );
                }
            }

            return newState;
        },

        // ==========================================
        // 數據合約影響
        // ==========================================

        /**
         * 應用數據合約的親和度效果
         */
        applyDataContractAffinity(state, isNewContract = true) {
            const config = window.IndustryAffinityConfig;
            if (!config) return state;

            const contractConfig = config.DATA_CONTRACT_AFFINITY.data_subscription;
            
            if (isNewContract && contractConfig.affinity_change) {
                return this.batchModifyAffinity(
                    state,
                    contractConfig.affinity_change,
                    '簽訂數據訂閱合約'
                );
            }

            return state;
        },

        /**
         * 檢查並應用灰色數據使用的負面效果
         */
        applyGrayDataPenalty(state, grayDataRatio) {
            const config = window.IndustryAffinityConfig;
            if (!config) return state;

            const grayConfig = config.DATA_CONTRACT_AFFINITY.gray_data_usage;
            
            if (grayDataRatio * 100 >= grayConfig.compliance_threshold) {
                return this.batchModifyAffinity(
                    state,
                    grayConfig.affinity_change,
                    '大量使用灰色數據'
                );
            }

            return state;
        },

        // ==========================================
        // 產品/業務影響
        // ==========================================

        /**
         * 計算產品運營的親和度效果
         * @param {Object} state - 當前親和度狀態
         * @param {Object} player - 玩家狀態
         * @returns {Object} 親和度變化
         */
        calculateProductAffinityEffects(state, player) {
            const config = window.IndustryAffinityConfig;
            if (!config) return {};

            const effects = {};
            const productState = player.product_state;
            const route = player.tech_route;

            if (!productState) return effects;

            // 路線基礎效果
            const routeEffects = config.PRODUCT_AFFINITY_EFFECTS.by_route[route];
            if (routeEffects && routeEffects.operating_effects) {
                for (const [industry, value] of Object.entries(routeEffects.operating_effects)) {
                    effects[industry] = (effects[industry] || 0) + value;
                }
            }

            // 檢查運營中的產品
            const ProductConfig = window.ProductConfig;
            if (ProductConfig && productState.products) {
                for (const [productId, pState] of Object.entries(productState.products)) {
                    if (pState.status === ProductConfig.PRODUCT_STATUS.OPERATING) {
                        // 檢查特殊產品效果
                        const specialEffects = config.PRODUCT_AFFINITY_EFFECTS.special_products[productId];
                        if (specialEffects) {
                            for (const [industry, value] of Object.entries(specialEffects)) {
                                effects[industry] = (effects[industry] || 0) + value;
                            }
                        }
                    }
                }
            }

            return effects;
        },

        /**
         * 應用產品運營的親和度效果（每季調用）
         */
        applyProductAffinityEffects(state, player) {
            const effects = this.calculateProductAffinityEffects(state, player);
            
            if (Object.keys(effects).length === 0) return state;

            return this.batchModifyAffinity(state, effects, '產品運營效果');
        },

        // ==========================================
        // 效果計算
        // ==========================================

        /**
         * 計算產業親和度對資源成本的修正
         * @param {Object} state - 親和度狀態
         * @param {string} resourceType - 資源類型
         * @returns {number} 成本修正係數 (< 1 = 折扣, > 1 = 加價)
         */
        calculateResourceCostModifier(state, resourceType) {
            const config = window.IndustryAffinityConfig;
            if (!config || !state) return 1.0;

            // 找出影響此資源的產業
            const industryResources = config.AFFINITY_EFFECTS.industry_resources;
            
            for (const [industry, resources] of Object.entries(industryResources)) {
                if (resources.primary === resourceType || resources.secondary === resourceType) {
                    const affinity = state.affinity[industry] || 0;
                    const modifier = config.calculateCostModifier(affinity);
                    return 1 + modifier;
                }
            }

            return 1.0;
        },

        /**
         * 獲取所有成本修正
         * @param {Object} state - 親和度狀態
         * @returns {Object} 各資源的成本修正
         */
        getAllCostModifiers(state) {
            const config = window.IndustryAffinityConfig;
            if (!config || !state) return {};

            const modifiers = {};
            const industryResources = config.AFFINITY_EFFECTS.industry_resources;

            for (const [industry, resources] of Object.entries(industryResources)) {
                const affinity = state.affinity[industry] || 0;
                const modifier = 1 + config.calculateCostModifier(affinity);
                
                modifiers[resources.primary] = modifier;
                if (resources.secondary) {
                    modifiers[resources.secondary] = modifier;
                }
            }

            return modifiers;
        },

        /**
         * 獲取戰略合約效果
         * @param {Object} state - 親和度狀態
         * @returns {Object} 合併後的合約效果
         */
        getActiveContractEffects(state) {
            if (!state || !state.strategic_contracts) return {};

            const effects = {
                gpu_discount: 0,
                cloud_discount: 0,
                power_discount: 0,
                data_discount: 0,
                grant_bonus: 0,
                priority_supply: false,
                burst_capacity: false,
                gray_data_forbidden: false,
                export_restriction: false
            };

            for (const contract of state.strategic_contracts) {
                if (contract.remaining > 0 && contract.effects) {
                    const ce = contract.effects;
                    
                    if (ce.gpu_discount) effects.gpu_discount = Math.max(effects.gpu_discount, ce.gpu_discount);
                    if (ce.cloud_discount) effects.cloud_discount = Math.max(effects.cloud_discount, ce.cloud_discount);
                    if (ce.power_discount) effects.power_discount = Math.max(effects.power_discount, ce.power_discount);
                    if (ce.data_discount) effects.data_discount = Math.max(effects.data_discount, ce.data_discount);
                    if (ce.grant_bonus) effects.grant_bonus = Math.max(effects.grant_bonus, ce.grant_bonus);
                    if (ce.priority_supply) effects.priority_supply = true;
                    if (ce.burst_capacity) effects.burst_capacity = true;
                    if (ce.gray_data_forbidden) effects.gray_data_forbidden = true;
                    if (ce.export_restriction) effects.export_restriction = true;
                }
            }

            return effects;
        },

        // ==========================================
        // 每季處理
        // ==========================================

        /**
         * 處理每季親和度更新
         * @param {Object} player - 玩家狀態
         * @returns {Object} 更新後的玩家狀態和訊息
         */
        processQuarterlyUpdate(player) {
            const config = window.IndustryAffinityConfig;
            if (!config) {
                return { player, messages: [] };
            }

            let newPlayer = JSON.parse(JSON.stringify(player));
            const messages = [];

            // 確保親和度狀態存在
            if (!newPlayer.industry_affinity_state) {
                newPlayer.industry_affinity_state = this.createInitialState(newPlayer.tech_route);
            }

            let state = newPlayer.industry_affinity_state;

            // 1. 應用自然衰減
            const decayConfig = config.DECAY_CONFIG.quarterly_decay;
            for (const industry of Object.keys(state.affinity)) {
                const current = state.affinity[industry];
                if (current !== 0) {
                    const decay = current * decayConfig.rate;
                    state.affinity[industry] = Math.max(
                        decayConfig.min_value,
                        Math.min(decayConfig.max_value, current - decay)
                    );
                }
            }

            // 2. 處理戰略合約
            for (const contract of state.strategic_contracts) {
                if (contract.remaining > 0) {
                    contract.remaining--;
                    
                    if (contract.remaining === 0) {
                        messages.push({
                            text: `戰略合約到期：${contract.name}`,
                            type: 'warning'
                        });
                    }
                }
            }
            
            // 移除過期合約
            state.strategic_contracts = state.strategic_contracts.filter(c => c.remaining > 0);

            // 3. 應用產品運營效果
            state = this.applyProductAffinityEffects(state, newPlayer);

            // 4. 檢查灰色數據使用
            const totalData = (newPlayer.high_data || 0) + (newPlayer.low_data || 0);
            const grayData = (newPlayer.data_inventory?.gray_high || 0) + (newPlayer.data_inventory?.gray_low || 0);
            if (totalData > 0) {
                const grayRatio = grayData / totalData;
                state = this.applyGrayDataPenalty(state, grayRatio);
            }

            // 5. ETF投資維持親和度
            if (newPlayer.etf_investments) {
                const ETF_CONFIG = window.ETF_CONFIG;
                const IndustryConfig = config;
                
                for (const [etfId, investment] of Object.entries(newPlayer.etf_investments)) {
                    if (investment.shares > 0) {
                        // 找出此ETF對應的產業
                        for (const [industryId, industry] of Object.entries(IndustryConfig.INDUSTRIES)) {
                            if (industry.related_etf === etfId) {
                                const holdingValue = investment.shares * (investment.avg_price || 100);
                                const marketCap = newPlayer.market_cap || 100;
                                
                                if (holdingValue / marketCap >= config.DECAY_CONFIG.maintenance_actions.etf_investment.threshold) {
                                    state = this.modifyAffinity(
                                        state, 
                                        industryId, 
                                        config.DECAY_CONFIG.maintenance_actions.etf_investment.affinity_maintain,
                                        'ETF投資維護'
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // 6. 投資人持股維持產業親和度
            const equityState = newPlayer.equity_state;
            if (equityState && equityState.investor_records && equityState.investor_records.length > 0) {
                const EquityConfig = window.EquityConfig;
                const investorProfiles = EquityConfig?.STRATEGIC_FUNDING?.INVESTOR_PROFILES || {};
                const shareEffectConfig = EquityConfig?.SHARE_EFFECTS?.investor?.affinity_bonus || { per_5_percent: 3 };
                const maintenanceConfig = EquityConfig?.SHARE_EFFECTS?.investor?.affinity_maintenance || { quarterly_factor: 0.3, min_shares: 1 };
                
                // 遍歷每個投資人記錄
                equityState.investor_records.forEach(record => {
                    const profile = investorProfiles[record.profile];
                    if (profile && profile.industries && record.shares >= maintenanceConfig.min_shares) {
                        // 根據持股比例計算親和度維持量
                        // 公式：每5%持股提供基礎親和度，乘以維持係數
                        const baseAffinity = (record.shares / 5) * shareEffectConfig.per_5_percent;
                        // 套用投資人類型的親和度乘數和每季維持係數
                        const affinityMult = profile.affinity_mult || 1.0;
                        const affinityMaintain = Math.floor(baseAffinity * affinityMult * maintenanceConfig.quarterly_factor);
                        
                        if (affinityMaintain > 0) {
                            profile.industries.forEach(industryId => {
                                if (industryId !== 'all' && state.affinity.hasOwnProperty(industryId)) {
                                    state = this.modifyAffinity(
                                        state,
                                        industryId,
                                        affinityMaintain,
                                        profile.name + '持股維護 (' + record.shares.toFixed(1) + '%)'
                                    );
                                }
                            });
                        }
                    }
                });
            }

            // 更新回合
            state.last_update_turn = newPlayer.turn_count || 0;
            newPlayer.industry_affinity_state = state;

            return {
                player: newPlayer,
                messages: messages
            };
        },

        // ==========================================
        // 查詢函數
        // ==========================================

        /**
         * 獲取親和度摘要（供UI顯示）
         * @param {Object} state - 親和度狀態
         * @returns {Object} 摘要信息
         */
        getAffinitySummary(state) {
            const config = window.IndustryAffinityConfig;
            if (!config || !state) return null;

            const summary = {
                industries: [],
                top_positive: [],
                top_negative: [],
                active_contracts: [],
                contract_effects: this.getActiveContractEffects(state)
            };

            // 處理各產業
            for (const [industryId, affinity] of Object.entries(state.affinity)) {
                const industry = config.INDUSTRIES[industryId];
                const level = config.getAffinityLevel(affinity);
                
                summary.industries.push({
                    id: industryId,
                    name: industry?.name || industryId,
                    icon: industry?.icon || '❓',
                    color: industry?.color || '#888888',
                    affinity: affinity,
                    level: level.name,
                    levelIcon: level.icon,
                    levelColor: level.color
                });
            }

            // 排序
            summary.industries.sort((a, b) => b.affinity - a.affinity);
            
            // 取前N個正面/負面
            const topN = config.UI_CONFIG.display_top_n;
            summary.top_positive = summary.industries.filter(i => i.affinity > 0).slice(0, topN);
            summary.top_negative = summary.industries.filter(i => i.affinity < 0).slice(-topN).reverse();

            // 活躍合約
            for (const contract of (state.strategic_contracts || [])) {
                if (contract.remaining > 0) {
                    summary.active_contracts.push({
                        name: contract.name,
                        remaining: contract.remaining,
                        total: contract.duration
                    });
                }
            }

            return summary;
        },

        /**
         * 檢查併購機會
         * @param {Object} state - 親和度狀態
         * @param {string} industryId - 目標產業
         * @returns {Object} 併購可行性資訊
         */
        checkAcquisitionOpportunity(state, industryId) {
            const config = window.IndustryAffinityConfig;
            if (!config || !state) return { available: false };

            const acqConfig = config.ACQUISITION_CONFIG.affinity_effects;
            const affinity = state.affinity[industryId] || 0;

            // 親和度太低不提供併購機會
            if (affinity < acqConfig.target_availability.min_affinity) {
                return { 
                    available: false, 
                    reason: '產業關係過於疏遠' 
                };
            }

            // 計算出現機率
            const chance = acqConfig.target_availability.base_chance + 
                          (affinity * acqConfig.target_availability.affinity_bonus);

            // 計算成本修正
            const costMod = acqConfig.cost_modifier.base + 
                           (affinity * acqConfig.cost_modifier.per_affinity);

            // 計算整合難度修正
            const integrationMod = 1 - (affinity * acqConfig.integration.affinity_reduction);

            return {
                available: true,
                chance: Math.max(0, Math.min(1, chance)),
                cost_modifier: Math.max(0.5, costMod),
                integration_modifier: Math.max(0.5, integrationMod),
                base_integration_turns: acqConfig.integration.base_turns
            };
        }
    };

    // ==========================================
    // 全局暴露
    // ==========================================
    window.IndustryAffinityEngine = IndustryAffinityEngine;

    console.log('✓ Industry Affinity Engine loaded');

})();
