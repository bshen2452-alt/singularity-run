// ============================================
// 股權機制整合 (Equity Integration)
// ============================================
// 功能：連接股權機制與現有遊戲系統
// 設計：僅處理接口對接，不包含核心邏輯

(function() {
    'use strict';

    const EquityIntegration = {

        // ==========================================
        // 初始化整合
        // ==========================================

        /**
         * 整合到玩家初始狀態
         * 呼叫時機：createInitialPlayerState 時
         * @param {Object} playerState - 現有玩家狀態
         * @param {string} route - 技術路線
         * @returns {Object} 包含股權狀態的玩家狀態
         */
        integrateInitialState(playerState, route) {
            const engine = window.EquityEngine;
            if (!engine) {
                console.warn('EquityEngine not loaded');
                return playerState;
            }

            const newState = { ...playerState };
            newState.equity_state = engine.createInitialState(route);
            newState.is_public = false;
            
            return newState;
        },

        // ==========================================
        // 財務行動整合
        // ==========================================

        /**
         * 包裝 executeFinance 以支援新IPO機制
         * @param {Object} player - 玩家狀態
         * @param {string} actionId - 財務行動ID
         * @param {Object} params - 行動參數
         * @returns {Object} 執行結果
         */
        executeFinanceWithEquity(player, actionId, params = {}) {
            const engine = window.EquityEngine;
            
            // 新IPO機制
            if (actionId === 'ipo' && engine) {
                const scale = params.scale || 'medium';
                const pricing = params.pricing || 'low';
                return engine.executeIPO(player, scale, pricing);
            }
            
            // 新增發機制
            if (actionId === 'stockIssue' && engine && player.equity_state?.is_public) {
                const size = params.size || 'small';
                return engine.executeStockIssue(player, size);
            }
            
            // 新回購機制
            if (actionId === 'stockBuyback' && engine && player.equity_state?.is_public) {
                const size = params.size || 'small';
                return engine.executeStockBuyback(player, size);
            }
            
            // 戰略融資
            if (actionId === 'strategicFunding' && engine) {
                const fundingType = params.fundingType;
                const investorProfile = params.investorProfile || 'tech_vc';
                return engine.executeStrategicFunding(player, fundingType, investorProfile);
            }
            
            // 其他行動走原有財務引擎
            if (window.FinanceEngine?.executeFinance) {
                return window.FinanceEngine.executeFinance(player, actionId, params);
            }
            
            return { success: false, message: '財務引擎未載入' };
        },

        // ==========================================
        // 回合更新整合
        // ==========================================

        /**
         * 每回合更新股權狀態
         * 呼叫時機：processTurnUpdates 時
         * @param {Object} player - 玩家狀態
         * @returns {Object} 更新後的玩家狀態
         */
        updateEquityOnTurn(player) {
            const engine = window.EquityEngine;
            if (!engine || !player.equity_state) {
                return player;
            }

            return engine.updateEquityState(player);
        },

        // ==========================================
        // Industry Affinity 整合
        // ==========================================

        /**
         * 根據投資人持股計算產業親和度加成
         * @param {Object} player - 玩家狀態
         * @returns {Object} 各產業親和度加成 { industry: bonus }
         */
        getInvestorAffinityBonuses(player) {
            const equityState = player.equity_state;
            if (!equityState?.investor_records?.length) {
                return {};
            }

            const bonuses = {};
            const config = window.EquityConfig?.SHARE_EFFECTS?.investor;
            
            equityState.investor_records.forEach(record => {
                const shareBonus = (record.shares / 5) * (config?.affinity_bonus?.per_5_percent || 3);
                record.industries.forEach(ind => {
                    if (ind !== 'all') {
                        bonuses[ind] = (bonuses[ind] || 0) + shareBonus;
                    }
                });
            });

            return bonuses;
        },

        /**
         * 應用投資人親和度加成
         * @param {Object} player - 玩家狀態
         * @param {Object} baseAffinityEffects - 基礎親和度效果
         * @returns {Object} 加成後的效果
         */
        applyInvestorAffinityBonus(player, baseAffinityEffects) {
            const bonuses = this.getInvestorAffinityBonuses(player);
            const enhanced = { ...baseAffinityEffects };

            Object.entries(bonuses).forEach(([industry, bonus]) => {
                if (enhanced[industry]) {
                    enhanced[industry] = {
                        ...enhanced[industry],
                        investor_bonus: bonus
                    };
                }
            });

            return enhanced;
        },

        // ==========================================
        // Community 系統整合
        // ==========================================

        /**
         * 計算公開股份對社群指標的影響
         * @param {Object} player - 玩家狀態
         * @returns {Object} 影響係數
         */
        getPublicShareCommunityEffects(player) {
            const publicShares = player.equity_state?.public_shares || 0;
            if (publicShares <= 0) {
                return { trust_mult: 1.0, hype_sensitivity: 1.0 };
            }

            const config = window.EquityConfig?.SHARE_EFFECTS?.public;
            if (!config) {
                return { trust_mult: 1.0, hype_sensitivity: 1.0 };
            }

            const trustBonus = (publicShares / 10) * config.trust_bonus.per_10_percent;
            const hypeSensitivity = 1 + (publicShares / 10) * config.hype_sensitivity.per_10_percent;

            return {
                trust_mult: 1 + trustBonus / 100,
                hype_sensitivity: hypeSensitivity,
                trust_bonus: trustBonus
            };
        },

        // ==========================================
        // 監管抵抗整合
        // ==========================================

        /**
         * 計算創辦人持股對監管的抵抗
         * @param {Object} player - 玩家狀態
         * @param {number} baseRegulation - 基礎監管壓力增量
         * @returns {number} 抵抗後的監管壓力增量
         */
        applyFounderRegulationResistance(player, baseRegulation) {
            const engine = window.EquityEngine;
            if (!engine || !player.equity_state) {
                return baseRegulation;
            }

            const effects = engine.calculateFounderEffects(player.equity_state);
            const resistance = effects.regulation_resistance || 0;
            
            // 只對正向監管壓力生效
            if (baseRegulation > 0) {
                return baseRegulation * (1 - resistance);
            }
            return baseRegulation;
        },

        // ==========================================
        // stock_dilution 兼容層
        // ==========================================

        /**
         * 從新股權系統計算等效 stock_dilution
         * @param {Object} player - 玩家狀態
         * @returns {number} 等效稀釋率
         */
        getEquivalentStockDilution(player) {
            const equityState = player.equity_state;
            if (!equityState) {
                return player.stock_dilution || 1;
            }

            const founderShares = equityState.founder_shares || 100;
            return 100 / founderShares;
        },

        /**
         * 同步 stock_dilution 到新股權系統
         * @param {Object} player - 玩家狀態
         * @returns {Object} 同步後的玩家狀態
         */
        syncStockDilutionToEquity(player) {
            if (!player.equity_state) return player;

            const newPlayer = JSON.parse(JSON.stringify(player));
            const oldDilution = player.stock_dilution || 1;
            
            const impliedFounderShares = 100 / oldDilution;
            const currentFounder = newPlayer.equity_state.founder_shares;
            
            if (Math.abs(impliedFounderShares - currentFounder) > 0.5) {
                const delta = currentFounder - impliedFounderShares;
                if (newPlayer.is_public) {
                    newPlayer.equity_state.founder_shares = impliedFounderShares;
                    newPlayer.equity_state.public_shares += delta;
                } else {
                    newPlayer.equity_state.founder_shares = impliedFounderShares;
                    newPlayer.equity_state.investor_shares += delta;
                }
                
                const engine = window.EquityEngine;
                if (engine) {
                    const normalized = engine.normalizeShares(newPlayer.equity_state);
                    newPlayer.equity_state.founder_shares = normalized.founder_shares;
                    newPlayer.equity_state.investor_shares = normalized.investor_shares;
                    newPlayer.equity_state.public_shares = normalized.public_shares;
                }
            }

            return newPlayer;
        },

        // ==========================================
        // Dashboard 資料提供
        // ==========================================

        /**
         * 取得股權面板所需資料
         * @param {Object} player - 玩家狀態
         * @returns {Object} 面板資料
         */
        getEquityDashboardData(player) {
            const engine = window.EquityEngine;
            const equityState = player.equity_state;

            if (!equityState) {
                return {
                    initialized: false,
                    message: '股權系統尚未初始化'
                };
            }

            const summary = engine?.getEquitySummary(equityState);
            const effects = engine?.getAllShareEffects(equityState);

            return {
                initialized: true,
                is_public: equityState.is_public,
                shares: {
                    founder: equityState.founder_shares,
                    investor: equityState.investor_shares,
                    public: equityState.public_shares
                },
                stock_price: equityState.stock_price,
                control: summary?.control,
                effects: {
                    regulation_resistance: effects?.founder?.regulation_resistance,
                    loyalty_bonus: effects?.founder?.loyalty_bonus,
                    affinity_bonus: effects?.investor?.affinity_bonus,
                    trust_bonus: effects?.public?.trust_bonus
                },
                funding_rounds: equityState.funding_rounds?.length || 0,
                total_raised: equityState.total_raised,
                total_dilution: equityState.total_dilution,
                can_ipo: engine?.checkIPOEligibility(player)?.canIPO || false,
                available_funding: engine?.getAvailableFundingOptions(player) || []
            };
        },

        // ==========================================
        // 事件觸發點
        // ==========================================

        /**
         * IPO 成功後的連鎖效果
         * @param {Object} player - 玩家狀態
         * @param {Object} ipoDetails - IPO 詳情
         * @returns {Object} 更新後的玩家狀態
         */
        onIPOComplete(player, ipoDetails) {
            const newPlayer = JSON.parse(JSON.stringify(player));

            if (newPlayer.community && window.CommunityEngine) {
                const sizeBoost = Math.floor(ipoDetails.dilution * 100);
                newPlayer.community.size = (newPlayer.community.size || 0) + sizeBoost;
                newPlayer.community.sentiment = Math.min(100, 
                    (newPlayer.community.sentiment || 50) + 5);
            }

            newPlayer._ipo_just_completed = true;
            return newPlayer;
        },

        /**
         * 融資完成後的連鎖效果
         * @param {Object} player - 玩家狀態
         * @param {Object} fundingDetails - 融資詳情
         * @returns {Object} 更新後的玩家狀態
         */
        onFundingComplete(player, fundingDetails) {
            const newPlayer = JSON.parse(JSON.stringify(player));

            if (window.IndustryAffinityEngine && newPlayer.industry_affinity) {
                const investorConfig = window.EquityConfig
                    ?.STRATEGIC_FUNDING?.INVESTOR_PROFILES?.[fundingDetails.investor];
                
                if (investorConfig?.industries) {
                    const bonus = window.EquityConfig?.STRATEGIC_FUNDING
                        ?.TYPES?.[fundingDetails.type]?.affinity_bonus || 5;
                    
                    investorConfig.industries.forEach(ind => {
                        if (ind !== 'all' && newPlayer.industry_affinity.affinity[ind] !== undefined) {
                            newPlayer.industry_affinity = window.IndustryAffinityEngine.modifyAffinity(
                                newPlayer.industry_affinity,
                                ind,
                                bonus,
                                `${fundingDetails.type} 融資`
                            );
                        }
                    });
                }
            }

            return newPlayer;
        }
    };

    // 全域註冊
    window.EquityIntegration = EquityIntegration;

    if (window.GameEngine) {
        window.GameEngine.EquityIntegration = EquityIntegration;
    }

    console.log('✓ Equity Integration loaded');

})();
