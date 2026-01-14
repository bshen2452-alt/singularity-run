// ============================================
// 股權機制引擎 (Equity Engine)
// ============================================
// 設計：純函數式，僅接收數據參數/返回計算結果
// 功能：處理股權結構計算、IPO執行、持股效果

(function() {
    'use strict';

    const EquityEngine = {

        // ==========================================
        // 初始化
        // ==========================================

        /**
         * 創建初始股權狀態
         * @param {string} route - 玩家技術路線
         * @returns {Object} 初始股權狀態
         */
        createInitialState(route) {
            const config = window.EquityConfig;
            if (!config) {
                console.warn('EquityConfig not loaded');
                return this.getDefaultState();
            }

            const initial = config.INITIAL_EQUITY[route] || config.INITIAL_EQUITY.default;

            return {
                // 持股比例 (%)
                founder_shares: initial.founder_shares,
                investor_shares: initial.investor_shares,
                public_shares: initial.public_shares,
                
                // IPO 狀態
                is_public: false,
                ipo_details: null,
                
                // 股價（IPO後生效）
                stock_price: 0,
                stock_price_history: [],
                
                // 投資人記錄
                investor_records: [],
                
                // 增發/回購冷卻
                equity_cooldowns: {
                    stock_issue: 0,
                    stock_buyback: 0
                },
                
                // 戰略融資歷史
                funding_rounds: [],
                
                // 統計
                total_dilution: 0,
                total_raised: 0
            };
        },

        /**
         * 取得預設狀態
         */
        getDefaultState() {
            return {
                founder_shares: 100,
                investor_shares: 0,
                public_shares: 0,
                is_public: false,
                ipo_details: null,
                stock_price: 0,
                stock_price_history: [],
                investor_records: [],
                equity_cooldowns: { stock_issue: 0, stock_buyback: 0 },
                funding_rounds: [],
                total_dilution: 0,
                total_raised: 0
            };
        },

        // ==========================================
        // 股權比例計算
        // ==========================================

        /**
         * 驗證股權總和（必須為100%）
         * @param {Object} equityState - 股權狀態
         * @returns {boolean} 是否有效
         */
        validateShares(equityState) {
            const total = equityState.founder_shares + 
                         equityState.investor_shares + 
                         equityState.public_shares;
            return Math.abs(total - 100) < 0.01;
        },

        /**
         * 調整股權比例（確保總和為100%）
         * @param {Object} equityState - 股權狀態
         * @param {string} changeType - 變化類型 ('founder', 'investor', 'public')
         * @param {number} delta - 變化量
         * @param {string} sourceType - 來源類型（從誰那裡轉移）
         * @returns {Object} 新股權狀態
         */
        adjustShares(equityState, changeType, delta, sourceType = 'founder') {
            const newState = JSON.parse(JSON.stringify(equityState));
            
            // 限制範圍
            const newValue = Math.max(0, Math.min(100, 
                newState[changeType + '_shares'] + delta));
            const actualDelta = newValue - newState[changeType + '_shares'];
            
            newState[changeType + '_shares'] = newValue;
            
            // 從來源扣除
            if (sourceType !== changeType && actualDelta !== 0) {
                newState[sourceType + '_shares'] = Math.max(0, 
                    newState[sourceType + '_shares'] - actualDelta);
            }
            
            // 驗證並正規化
            return this.normalizeShares(newState);
        },

        /**
         * 正規化股權比例（確保總和100%）
         * @param {Object} equityState - 股權狀態
         * @returns {Object} 正規化後狀態
         */
        normalizeShares(equityState) {
            const total = equityState.founder_shares + 
                         equityState.investor_shares + 
                         equityState.public_shares;
            
            if (Math.abs(total - 100) < 0.01) return equityState;
            
            // 按比例調整
            const factor = 100 / total;
            return {
                ...equityState,
                founder_shares: Math.round(equityState.founder_shares * factor * 10) / 10,
                investor_shares: Math.round(equityState.investor_shares * factor * 10) / 10,
                public_shares: Math.round(equityState.public_shares * factor * 10) / 10
            };
        },

        // ==========================================
        // IPO 執行
        // ==========================================

        /**
         * 檢查 IPO 可行性
         * @param {Object} player - 玩家狀態
         * @returns {Object} { canIPO, reasons }
         */
        checkIPOEligibility(player) {
            const config = window.EquityConfig?.IPO?.REQUIREMENTS;
            if (!config) return { canIPO: false, reasons: ['配置未載入'] };
            
            const reasons = [];
            
            if (player.mp_tier < config.min_tier) {
                reasons.push(`需達到 Tier ${config.min_tier}（目前 Tier ${player.mp_tier}）`);
            }
            if ((player.market_cap || 0) < config.min_market_cap) {
                reasons.push(`市值需達 $${config.min_market_cap}M（目前 $${player.market_cap || 0}M）`);
            }
            if ((player.trust || 0) < config.min_trust) {
                reasons.push(`信任度需達 ${config.min_trust}（目前 ${player.trust || 0}）`);
            }
            if (player.equity_state?.is_public || player.is_public) {
                reasons.push('已完成 IPO');
            }
            
            return {
                canIPO: reasons.length === 0,
                reasons
            };
        },

        /**
         * 執行 IPO
         * @param {Object} player - 玩家狀態
         * @param {string} scale - 發行規模 ('small'/'medium'/'large')
         * @param {string} pricing - 定價策略 ('low'/'high')
         * @returns {Object} { success, newPlayer, message, details }
         */
        executeIPO(player, scale, pricing) {
            const config = window.EquityConfig?.IPO;
            if (!config) {
                return { success: false, message: '配置未載入' };
            }

            // 檢查可行性
            const eligibility = this.checkIPOEligibility(player);
            if (!eligibility.canIPO) {
                return { 
                    success: false, 
                    message: 'IPO 條件不符：' + eligibility.reasons.join('；')
                };
            }

            const scaleConfig = config.SCALE_OPTIONS[scale];
            const pricingConfig = config.PRICING_OPTIONS[pricing];
            
            if (!scaleConfig || !pricingConfig) {
                return { success: false, message: '無效的 IPO 參數' };
            }

            // 高定價成功率檢查
            if (pricing === 'high') {
                const roll = Math.random();
                if (roll > pricingConfig.success_rate) {
                    return {
                        success: false,
                        message: 'IPO 定價過高，市場認購不足！',
                        type: 'warning'
                    };
                }
            }

            // 計算結果
            const newPlayer = JSON.parse(JSON.stringify(player));
            const dilution = scaleConfig.dilution * 100; // 轉為百分比
            const baseCash = (player.market_cap || 500) * scaleConfig.cash_multiplier;
            const finalCash = baseCash * pricingConfig.cash_modifier;
            
            // 整合信用評級影響
            let ipoMultiplier = 1.0;
            if (window.CreditEngine?.getCreditRatingInfo) {
                const creditInfo = window.CreditEngine.getCreditRatingInfo(player);
                ipoMultiplier = creditInfo.ipoMultiplier || 1.0;
            }
            
            const actualCash = finalCash * ipoMultiplier;

            // 更新股權狀態
            if (!newPlayer.equity_state) {
                newPlayer.equity_state = this.createInitialState(player.route);
            }
            
            const equityState = newPlayer.equity_state;
            
            // 公開股份來自創辦人持股
            equityState.public_shares = dilution;
            equityState.founder_shares = Math.max(0, equityState.founder_shares - dilution);
            equityState.is_public = true;
            equityState.ipo_details = {
                scale,
                pricing,
                dilution,
                cash_raised: actualCash,
                date: player.quarter,
                market_cap_at_ipo: player.market_cap
            };
            equityState.total_dilution += dilution;
            equityState.total_raised += actualCash;

            // 更新玩家狀態
            newPlayer.cash = (newPlayer.cash || 0) + actualCash;
            newPlayer.hype = (newPlayer.hype || 0) + scaleConfig.hype_change + pricingConfig.hype_modifier;
            newPlayer.regulation = (newPlayer.regulation || 0) + scaleConfig.regulation_change;
            newPlayer.is_public = true;
            
            // 計算初始股價
            equityState.stock_price = this.calculateStockPrice(newPlayer, equityState);
            equityState.stock_price_history.push({
                quarter: player.quarter,
                price: equityState.stock_price
            });

            return {
                success: true,
                player: newPlayer,
                message: `IPO 成功！籌得 $${actualCash.toFixed(0)}M，公開發行 ${dilution}% 股份`,
                type: 'success',
                details: {
                    cash_raised: actualCash,
                    dilution,
                    new_founder_shares: equityState.founder_shares,
                    stock_price: equityState.stock_price
                }
            };
        },

        // ==========================================
        // 增發/回購
        // ==========================================

        /**
         * 執行增發新股
         * @param {Object} player - 玩家狀態
         * @param {string} size - 'small' 或 'large'
         * @returns {Object} 執行結果
         */
        executeStockIssue(player, size = 'small') {
            const config = window.EquityConfig?.SECONDARY_OFFERINGS?.stock_issue;
            if (!config) return { success: false, message: '配置未載入' };
            
            if (!player.equity_state?.is_public) {
                return { success: false, message: '公司尚未上市' };
            }
            
            if ((player.equity_state.equity_cooldowns?.stock_issue || 0) > 0) {
                return { 
                    success: false, 
                    message: `增發冷卻中，剩餘 ${player.equity_state.equity_cooldowns.stock_issue} 回合` 
                };
            }

            const option = config.options[size];
            if (!option) return { success: false, message: '無效的增發規模' };

            const newPlayer = JSON.parse(JSON.stringify(player));
            const equityState = newPlayer.equity_state;
            
            // 計算現金
            const cashGain = (player.market_cap || 500) * option.cash_multiplier;
            
            // 調整股權
            equityState.founder_shares = Math.max(0, equityState.founder_shares - option.founder_loss);
            equityState.public_shares += option.public_gain;
            equityState.total_dilution += option.dilution * 100;
            equityState.total_raised += cashGain;
            
            // 正規化
            const normalized = this.normalizeShares(equityState);
            equityState.founder_shares = normalized.founder_shares;
            equityState.investor_shares = normalized.investor_shares;
            equityState.public_shares = normalized.public_shares;
            
            // 設置冷卻
            equityState.equity_cooldowns.stock_issue = config.min_cooldown;
            
            // 更新stock_dilution以兼容舊系統
            newPlayer.stock_dilution = (newPlayer.stock_dilution || 1) * (1 + option.dilution);
            newPlayer.cash = (newPlayer.cash || 0) + cashGain;

            return {
                success: true,
                player: newPlayer,
                message: `增發新股！籌得 $${cashGain.toFixed(0)}M，創辦人持股 -${option.founder_loss}%`,
                type: 'success'
            };
        },

        /**
         * 執行股票回購
         * @param {Object} player - 玩家狀態
         * @param {string} size - 'small' 或 'large'
         * @returns {Object} 執行結果
         */
        executeStockBuyback(player, size = 'small') {
            const config = window.EquityConfig?.SECONDARY_OFFERINGS?.stock_buyback;
            if (!config) return { success: false, message: '配置未載入' };
            
            if (!player.equity_state?.is_public) {
                return { success: false, message: '公司尚未上市' };
            }
            
            if ((player.equity_state.equity_cooldowns?.stock_buyback || 0) > 0) {
                return { 
                    success: false, 
                    message: `回購冷卻中，剩餘 ${player.equity_state.equity_cooldowns.stock_buyback} 回合` 
                };
            }

            const option = config.options[size];
            if (!option) return { success: false, message: '無效的回購規模' };

            const cost = (player.market_cap || 500) * option.cash_cost_multiplier;
            
            if ((player.cash || 0) < cost) {
                return { success: false, message: `現金不足，需要 $${cost.toFixed(0)}M` };
            }

            const newPlayer = JSON.parse(JSON.stringify(player));
            const equityState = newPlayer.equity_state;
            
            // 調整股權
            equityState.founder_shares = Math.min(100, equityState.founder_shares + option.founder_gain);
            equityState.public_shares = Math.max(0, equityState.public_shares - option.public_loss);
            
            // 正規化
            const normalized = this.normalizeShares(equityState);
            equityState.founder_shares = normalized.founder_shares;
            equityState.investor_shares = normalized.investor_shares;
            equityState.public_shares = normalized.public_shares;
            
            // 設置冷卻
            equityState.equity_cooldowns.stock_buyback = config.min_cooldown;
            
            // 更新stock_dilution
            newPlayer.stock_dilution = Math.max(0.5, (newPlayer.stock_dilution || 1) * 0.95);
            newPlayer.cash -= cost;
            newPlayer.hype = (newPlayer.hype || 0) + option.hype_change;

            return {
                success: true,
                player: newPlayer,
                message: `股票回購！花費 $${cost.toFixed(0)}M，創辦人持股 +${option.founder_gain}%，Hype +${option.hype_change}`,
                type: 'success'
            };
        },

        // ==========================================
        // 戰略融資
        // ==========================================

        /**
         * 取得可用融資選項
         * @param {Object} player - 玩家狀態
         * @returns {Array} 可用融資列表
         */
        getAvailableFundingOptions(player) {
            const config = window.EquityConfig?.STRATEGIC_FUNDING?.TYPES;
            if (!config) return [];

            const tier = player.mp_tier || 0;
            const options = [];

            Object.entries(config).forEach(([id, fundingType]) => {
                if (tier >= fundingType.tier_required) {
                    // 檢查是否已完成此輪
                    const completed = player.equity_state?.funding_rounds?.some(r => r.type === id);
                    if (!completed || id === 'strategic') { // 戰略投資可重複
                        options.push({
                            ...fundingType,
                            available: true
                        });
                    }
                }
            });

            return options;
        },

        /**
         * 執行戰略融資
         * @param {Object} player - 玩家狀態
         * @param {string} fundingType - 融資類型
         * @param {string} investorProfile - 投資人類型
         * @returns {Object} 執行結果
         */
        executeStrategicFunding(player, fundingType, investorProfile = 'tech_vc') {
            const typeConfig = window.EquityConfig?.STRATEGIC_FUNDING?.TYPES?.[fundingType];
            const investorConfig = window.EquityConfig?.STRATEGIC_FUNDING?.INVESTOR_PROFILES?.[investorProfile];
            
            if (!typeConfig) return { success: false, message: '無效的融資類型' };

            // 檢查Tier要求
            if ((player.mp_tier || 0) < typeConfig.tier_required) {
                return { success: false, message: `需達到 Tier ${typeConfig.tier_required}` };
            }

            // 計算融資金額和稀釋
            const cashRange = typeConfig.cash_range;
            const dilutionRange = typeConfig.dilution_range;
            
            const baseCash = cashRange[0] + Math.random() * (cashRange[1] - cashRange[0]);
            const baseDilution = dilutionRange[0] + Math.random() * (dilutionRange[1] - dilutionRange[0]);
            
            // 投資人修正
            const cashMult = investorConfig?.cash_mult || 1.0;
            const finalCash = baseCash * cashMult;
            const finalDilution = baseDilution;

            const newPlayer = JSON.parse(JSON.stringify(player));
            
            // 初始化股權狀態
            if (!newPlayer.equity_state) {
                newPlayer.equity_state = this.createInitialState(player.route);
            }
            
            const equityState = newPlayer.equity_state;

            // 調整股權（投資人股份來自創辦人）
            equityState.founder_shares = Math.max(0, equityState.founder_shares - finalDilution);
            equityState.investor_shares += finalDilution;
            equityState.total_dilution += finalDilution;
            equityState.total_raised += finalCash;

            // 記錄融資輪次
            equityState.funding_rounds.push({
                type: fundingType,
                investor_profile: investorProfile,
                cash: finalCash,
                dilution: finalDilution,
                quarter: player.quarter
            });

            // 記錄投資人
            equityState.investor_records.push({
                profile: investorProfile,
                shares: finalDilution,
                industries: investorConfig?.industries || [],
                quarter: player.quarter
            });

            // 更新玩家狀態
            newPlayer.cash = (newPlayer.cash || 0) + finalCash;
            newPlayer.stock_dilution = (newPlayer.stock_dilution || 1) * (1 + finalDilution / 100);

            // 產業親和度加成
            let affinityMessage = '';
            if (window.IndustryAffinityEngine && investorConfig?.industries) {
                const industries = investorConfig.industries;
                const affinityBonus = typeConfig.affinity_bonus * (investorConfig.affinity_mult || 1);
                
                if (newPlayer.industry_affinity) {
                    industries.forEach(ind => {
                        if (ind !== 'all' && newPlayer.industry_affinity.affinity[ind] !== undefined) {
                            newPlayer.industry_affinity = window.IndustryAffinityEngine.modifyAffinity(
                                newPlayer.industry_affinity,
                                ind,
                                affinityBonus,
                                `${typeConfig.name}（${investorConfig.name}）`
                            );
                        }
                    });
                    affinityMessage = `，${industries.join('/')} 親和度 +${affinityBonus}`;
                }
            }

            // 監管變化
            if (investorConfig?.regulation_change) {
                newPlayer.regulation = (newPlayer.regulation || 0) + investorConfig.regulation_change;
            }

            // 設置冷卻時間（strategic 類型使用 2 回合冷卻）
            if (!equityState.equity_cooldowns) {
                equityState.equity_cooldowns = {};
            }
            equityState.equity_cooldowns.strategic = typeConfig.cooldown || 2;


            return {
                success: true,
                player: newPlayer,
                message: `${typeConfig.name}完成！籌得 $${finalCash.toFixed(0)}M，稀釋 ${finalDilution.toFixed(1)}%${affinityMessage}`,
                type: 'success',
                details: {
                    cash: finalCash,
                    dilution: finalDilution,
                    investor: investorProfile
                }
            };
        },

        // ==========================================
        // 股價計算
        // ==========================================

        /**
         * 計算股價（基於社群指標）
         * @param {Object} player - 玩家狀態
         * @param {Object} equityState - 股權狀態
         * @returns {number} 股價
         */
        calculateStockPrice(player, equityState = null) {
            const config = window.EquityConfig?.STOCK_PRICE;
            if (!config) return 0;
            
            const equity = equityState || player.equity_state;
            if (!equity?.is_public) return 0;

            // 基礎股價（簡化為市值相關）
            const basePrice = (player.market_cap || 500) / 10;
            
            // 取得社群指標
            const community = player.community || {};
            const sentiment = community.sentiment || 50;
            const engagement = community.engagement || 30;
            const size = community.size || 0;

            // 取得等級
            const CommunityEngine = window.CommunityEngine;
            let sentimentMult = 1.0;
            let engagementMult = 1.0;
            let sizeMult = 1.0;

            if (CommunityEngine) {
                const sentimentLevel = CommunityEngine.getSentimentLevel?.(sentiment);
                const engagementLevel = CommunityEngine.getEngagementLevel?.(engagement);
                
                if (sentimentLevel?.key) {
                    sentimentMult = config.sentiment_multipliers[sentimentLevel.key] || 1.0;
                }
                if (engagementLevel?.key) {
                    engagementMult = config.engagement_multipliers[engagementLevel.key] || 1.0;
                }
            }

            // 規模乘數
            const sizeTiers = config.size_tiers;
            if (size <= sizeTiers.small.max) {
                sizeMult = sizeTiers.small.mult;
            } else if (size <= sizeTiers.medium.max) {
                sizeMult = sizeTiers.medium.mult;
            } else {
                sizeMult = sizeTiers.large.mult;
            }

            // 加權計算
            const weights = config.community_weights;
            const weightedMult = 
                sentimentMult * weights.sentiment +
                engagementMult * weights.engagement +
                sizeMult * weights.size;

            return Math.round(basePrice * weightedMult * 100) / 100;
        },

        // ==========================================
        // 持股效果計算
        // ==========================================

        /**
         * 計算創辦人持股效果
         * @param {Object} equityState - 股權狀態
         * @returns {Object} 效果
         */
        calculateFounderEffects(equityState) {
            const config = window.EquityConfig?.SHARE_EFFECTS?.founder;
            if (!config || !equityState) return {};

            const shares = equityState.founder_shares || 0;
            
            // 監管抵抗
            const regResist = config.regulation_resistance;
            const regulationResistance = regResist.base + 
                (shares / 10) * regResist.per_10_percent;

            // 忠誠度加成
            let loyaltyBonus = 0;
            if (shares > config.loyalty_bonus.threshold) {
                const excess = shares - config.loyalty_bonus.threshold;
                loyaltyBonus = (excess / 10) * config.loyalty_bonus.per_10_percent;
            }

            // 控制力等級
            let controlLevel = 'passive';
            const levels = window.EquityConfig?.UI?.CONTROL_LEVELS;
            if (levels) {
                if (shares >= levels.absolute.min) controlLevel = 'absolute';
                else if (shares >= levels.majority.min) controlLevel = 'majority';
                else if (shares >= levels.minority.min) controlLevel = 'minority';
            }

            return {
                regulation_resistance: Math.min(0.8, regulationResistance),
                loyalty_bonus: loyaltyBonus,
                control_level: controlLevel
            };
        },

        /**
         * 計算投資人持股效果
         * @param {Object} equityState - 股權狀態
         * @returns {Object} 效果
         */
        calculateInvestorEffects(equityState) {
            const config = window.EquityConfig?.SHARE_EFFECTS?.investor;
            if (!config || !equityState) return {};

            const shares = equityState.investor_shares || 0;
            
            // 產業親和度加成（由投資人記錄決定）
            const affinityBonus = (shares / 5) * config.affinity_bonus.per_5_percent;
            
            // 融資效率
            const fundingEfficiency = 1 + (shares / 10) * config.funding_efficiency.per_10_percent;
            
            // 監管壓力
            let regulationPressure = 0;
            if (shares > config.regulation_pressure.threshold) {
                const excess = shares - config.regulation_pressure.threshold;
                regulationPressure = (excess / 10) * config.regulation_pressure.per_10_percent;
            }

            return {
                affinity_bonus: affinityBonus,
                funding_efficiency: fundingEfficiency,
                regulation_pressure: regulationPressure
            };
        },

        /**
         * 計算公開股份效果
         * @param {Object} equityState - 股權狀態
         * @returns {Object} 效果
         */
        calculatePublicEffects(equityState) {
            const config = window.EquityConfig?.SHARE_EFFECTS?.public;
            if (!config || !equityState) return {};

            const shares = equityState.public_shares || 0;
            
            // 信任度加成
            const trustBonus = (shares / 10) * config.trust_bonus.per_10_percent;
            
            // Hype敏感度
            const hypeSensitivity = 1 + (shares / 10) * config.hype_sensitivity.per_10_percent;

            return {
                trust_bonus: trustBonus,
                hype_sensitivity: hypeSensitivity
            };
        },

        /**
         * 取得所有持股效果摘要
         * @param {Object} equityState - 股權狀態
         * @returns {Object} 效果摘要
         */
        getAllShareEffects(equityState) {
            return {
                founder: this.calculateFounderEffects(equityState),
                investor: this.calculateInvestorEffects(equityState),
                public: this.calculatePublicEffects(equityState)
            };
        },

        // ==========================================
        // 回合更新
        // ==========================================

        /**
         * 更新股權狀態（每回合調用）
         * @param {Object} player - 玩家狀態
         * @returns {Object} 更新後的玩家狀態
         */
        updateEquityState(player) {
            if (!player.equity_state) return player;
            
            const newPlayer = JSON.parse(JSON.stringify(player));
            const equityState = newPlayer.equity_state;

            // 減少冷卻時間
            Object.keys(equityState.equity_cooldowns).forEach(key => {
                if (equityState.equity_cooldowns[key] > 0) {
                    equityState.equity_cooldowns[key]--;
                }
            });

            // 更新股價
            if (equityState.is_public) {
                equityState.stock_price = this.calculateStockPrice(newPlayer, equityState);
                equityState.stock_price_history.push({
                    quarter: player.quarter,
                    price: equityState.stock_price
                });
                
                // 限制歷史記錄長度
                if (equityState.stock_price_history.length > 20) {
                    equityState.stock_price_history.shift();
                }
            }

            // 應用持股效果
            const effects = this.getAllShareEffects(equityState);
            
            // 信任度加成
            if (effects.public.trust_bonus > 0) {
                newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + effects.public.trust_bonus * 0.1);
            }
            
            // 忠誠度加成
            if (effects.founder.loyalty_bonus > 0) {
                newPlayer.loyalty = Math.min(100, (newPlayer.loyalty || 0) + effects.founder.loyalty_bonus * 0.1);
            }

            return newPlayer;
        },

        // ==========================================
        // 工具函數
        // ==========================================

        /**
         * 取得股權摘要資訊
         * @param {Object} equityState - 股權狀態
         * @returns {Object} 摘要資訊
         */
        getEquitySummary(equityState) {
            if (!equityState) return null;

            const effects = this.getAllShareEffects(equityState);
            const controlLevel = effects.founder.control_level;
            const levels = window.EquityConfig?.UI?.CONTROL_LEVELS;

            return {
                shares: {
                    founder: equityState.founder_shares,
                    investor: equityState.investor_shares,
                    public: equityState.public_shares
                },
                is_public: equityState.is_public,
                stock_price: equityState.stock_price,
                control: levels?.[controlLevel] || { name: '未知', icon: '❓' },
                effects,
                total_dilution: equityState.total_dilution,
                total_raised: equityState.total_raised,
                funding_rounds: equityState.funding_rounds?.length || 0
            };
        }
    };

    // 全域註冊
    window.EquityEngine = EquityEngine;
    
    // 如果 GameEngine 存在，也掛載
    if (window.GameEngine) {
        window.GameEngine.EquityEngine = EquityEngine;
    }

    console.log('✓ Equity Engine loaded');

})();
