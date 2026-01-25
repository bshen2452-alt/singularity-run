// ============================================
// 對手行為引擎 (Rival Behavior Engine)
// ============================================
// 設計：純函數式，接收數據參數/返回計算結果
// 功能：
//   1. 根據對手狀態選擇行為
//   2. 執行行為效果
//   3. 生成全球市場影響
//   4. 處理資源約束

(function() {
    'use strict';

    const RivalBehaviorEngine = {

        // ==========================================
        // 核心：評估對手當前風險狀態
        // ==========================================
        
        /**
         * 評估對手的風險狀態
         * @param {Object} rival - 對手狀態
         * @param {Object} routeStyle - 路線風格配置
         * @returns {Object} 風險評估結果
         */
        assessRiskState: function(rival, routeStyle) {
            const thresholds = routeStyle.risk_thresholds;
            const risks = {
                entropy: 'normal',
                compliance_risk: 'normal',
                trust: 'normal'
            };
            
            // 評估熵值風險
            const entropy = rival.entropy || 0;
            if (entropy >= thresholds.entropy.critical) {
                risks.entropy = 'critical';
            } else if (entropy >= thresholds.entropy.warning) {
                risks.entropy = 'warning';
            }
            
            // 評估合規風險
            const complianceRisk = rival.compliance_risk || 0;
            if (complianceRisk >= thresholds.compliance_risk.critical) {
                risks.compliance_risk = 'critical';
            } else if (complianceRisk >= thresholds.compliance_risk.warning) {
                risks.compliance_risk = 'warning';
            }
            
            // 評估信任度（反向：低於閾值才是風險）
            const trust = rival.trust || 50;
            if (trust <= thresholds.trust.critical) {
                risks.trust = 'critical';
            } else if (trust <= thresholds.trust.warning) {
                risks.trust = 'warning';
            }
            
            // 綜合風險等級
            const criticalCount = Object.values(risks).filter(r => r === 'critical').length;
            const warningCount = Object.values(risks).filter(r => r === 'warning').length;
            
            let overallRisk = 'low';
            if (criticalCount >= 2) {
                overallRisk = 'critical';
            } else if (criticalCount >= 1 || warningCount >= 2) {
                overallRisk = 'high';
            } else if (warningCount >= 1) {
                overallRisk = 'moderate';
            }
            
            return {
                entropy: risks.entropy,
                compliance_risk: risks.compliance_risk,
                trust: risks.trust,
                overall: overallRisk,
                details: {
                    entropy_value: entropy,
                    compliance_value: complianceRisk,
                    trust_value: trust
                }
            };
        },

        // ==========================================
        // 核心：選擇對手行為
        // ==========================================
        
        /**
         * 根據對手狀態選擇行為
         * @param {Object} rival - 對手狀態
         * @param {Object} player - 玩家狀態（用於比較）
         * @param {Object} globalMarket - 全球市場狀態
         * @returns {Object} 選擇的行為
         */
        selectBehavior: function(rival, player, globalMarket) {
            const config = window.RivalBehaviorConfig;
            if (!config) {
                console.warn('RivalBehaviorConfig not loaded');
                return { behaviorId: 'steady_research', reason: 'config_missing' };
            }
            
            const routeStyle = config.getRouteStyle(rival.route);
            const riskState = this.assessRiskState(rival, routeStyle);
            
            // === 階段1：檢查是否需要風險反應 ===
            const riskBehavior = this.checkRiskResponse(rival, routeStyle, riskState);
            if (riskBehavior) {
                return riskBehavior;
            }
            
            // === 階段2：檢查里程碑相關行為 ===
            const milestoneBehavior = this.checkMilestoneBehavior(rival, routeStyle);
            if (milestoneBehavior) {
                return milestoneBehavior;
            }
            
            // === 階段3：根據權重隨機選擇正常行為 ===
            return this.selectWeightedBehavior(rival, routeStyle, globalMarket);
        },
        
        /**
         * 檢查風險反應行為
         */
        checkRiskResponse: function(rival, routeStyle, riskState) {
            const responses = routeStyle.risk_responses;
            
            // 優先處理critical級別的風險
            if (riskState.entropy === 'critical') {
                const response = responses.critical_entropy;
                if (Math.random() < response.probability) {
                    return { 
                        behaviorId: response.behavior, 
                        reason: 'critical_entropy',
                        riskLevel: 'critical'
                    };
                }
            }
            
            if (riskState.compliance_risk === 'critical') {
                const response = responses.critical_compliance;
                if (Math.random() < response.probability) {
                    return { 
                        behaviorId: response.behavior, 
                        reason: 'critical_compliance',
                        riskLevel: 'critical'
                    };
                }
            }
            
            if (riskState.trust === 'critical') {
                const response = responses.critical_trust;
                if (Math.random() < response.probability) {
                    return { 
                        behaviorId: response.behavior, 
                        reason: 'critical_trust',
                        riskLevel: 'critical'
                    };
                }
            }
            
            // 然後處理warning級別
            if (riskState.entropy === 'warning') {
                const response = responses.high_entropy;
                if (Math.random() < response.probability) {
                    return { 
                        behaviorId: response.behavior, 
                        reason: 'high_entropy',
                        riskLevel: 'warning'
                    };
                }
            }
            
            if (riskState.compliance_risk === 'warning') {
                const response = responses.high_compliance;
                if (Math.random() < response.probability) {
                    return { 
                        behaviorId: response.behavior, 
                        reason: 'high_compliance',
                        riskLevel: 'warning'
                    };
                }
            }
            
            if (riskState.trust === 'warning') {
                const response = responses.low_trust;
                if (Math.random() < response.probability) {
                    return { 
                        behaviorId: response.behavior, 
                        reason: 'low_trust',
                        riskLevel: 'warning'
                    };
                }
            }
            
            return null;
        },
        
        /**
         * 檢查里程碑相關行為
         */
        checkMilestoneBehavior: function(rival, routeStyle) {
            const MODEL_TIERS = window.GameConfig?.COSTS?.MODEL_TIERS;
            if (!MODEL_TIERS) return null;
            
            const milestoneBehavior = routeStyle.milestone_behavior;
            const currentTier = rival.mp_tier || 0;
            const nextTier = currentTier + 1;
            
            if (nextTier > 5) return null;
            
            const nextThreshold = MODEL_TIERS[nextTier]?.mp || 9999;
            const distanceToThreshold = nextThreshold - (rival.mp || 0);
            
            // 檢查是否剛失敗（有重組標記）
            if (rival.just_failed_milestone) {
                return {
                    behaviorId: milestoneBehavior.after_failure,
                    reason: 'post_milestone_failure'
                };
            }
            
            // 檢查是否剛成功（有成功標記）
            if (rival.just_achieved_milestone) {
                return {
                    behaviorId: milestoneBehavior.after_success,
                    reason: 'post_milestone_success'
                };
            }
            
            // 檢查是否接近門檻（距離5點以內）
            if (distanceToThreshold > 0 && distanceToThreshold <= 5) {
                return {
                    behaviorId: milestoneBehavior.near_threshold,
                    reason: 'near_milestone_threshold',
                    distance: distanceToThreshold
                };
            }
            
            return null;
        },
        
        /**
         * 根據權重隨機選擇行為
         */
        selectWeightedBehavior: function(rival, routeStyle, globalMarket) {
            const weights = routeStyle.behavior_weights;
            const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
            
            let random = Math.random() * totalWeight;
            
            for (const [behaviorId, weight] of Object.entries(weights)) {
                random -= weight;
                if (random <= 0) {
                    return {
                        behaviorId: behaviorId,
                        reason: 'weighted_selection'
                    };
                }
            }
            
            // 保底返回默認行為
            return {
                behaviorId: routeStyle.default_behavior,
                reason: 'default_fallback'
            };
        },

        // ==========================================
        // 核心：執行行為效果
        // ==========================================
        
        /**
         * 執行對手行為並返回更新後的狀態
         * @param {Object} rival - 對手狀態
         * @param {Object} behaviorSelection - 行為選擇結果
         * @param {Object} globalMarket - 全球市場狀態
         * @returns {Object} { rival, marketActions, messages }
         */
        executeBehavior: function(rival, behaviorSelection, globalMarket) {
            const config = window.RivalBehaviorConfig;
            const behavior = config.getBehavior(behaviorSelection.behaviorId);
            const routeStyle = config.getRouteStyle(rival.route);
            
            const updatedRival = JSON.parse(JSON.stringify(rival));
            const marketActions = [];
            const messages = [];
            
            // === 計算MP成長 ===
            const mpGrowth = this.calculateMPGrowth(updatedRival, behavior, routeStyle, globalMarket);
            
            // 應用MP成長（但不超過里程碑門檻）
            const mpResult = this.applyMPGrowthWithCap(updatedRival, mpGrowth);
            updatedRival.mp = mpResult.newMP;
            
            // === 應用行為效果 ===
            if (behavior.effects) {
                // 熵值
                if (behavior.effects.entropy) {
                    updatedRival.entropy = Math.max(0, Math.min(100,
                        (updatedRival.entropy || 0) + behavior.effects.entropy.add
                    ));
                }
                
                // 對齊度
                if (behavior.effects.alignment) {
                    updatedRival.alignment = Math.max(0, Math.min(100,
                        (updatedRival.alignment || 50) + behavior.effects.alignment.add
                    ));
                }
                
                // 信任度
                if (behavior.effects.trust) {
                    updatedRival.trust = Math.max(0, Math.min(100,
                        (updatedRival.trust || 50) + behavior.effects.trust.add
                    ));
                }
                
                // 合規風險
                if (behavior.effects.compliance_risk) {
                    updatedRival.compliance_risk = Math.max(0, Math.min(100,
                        (updatedRival.compliance_risk || 0) + behavior.effects.compliance_risk.add
                    ));
                }
                
                // 炒作度
                if (behavior.effects.hype) {
                    updatedRival.hype = (updatedRival.hype || 0) + behavior.effects.hype.add;
                }
                
                // 市值倍率
                if (behavior.effects.market_cap_mult) {
                    updatedRival.market_cap = (updatedRival.market_cap || 500) * behavior.effects.market_cap_mult;
                }
            }
            
            // === 收集全球市場影響 ===
            if (behavior.global_market_action) {
                marketActions.push({
                    type: behavior.global_market_action.type,
                    scale: behavior.global_market_action.scale || 1,
                    source: rival.name
                });
            }
            
            // === 檢查是否觸發安全事故（熵值過高） ===
            if (updatedRival.entropy >= 80 && Math.random() < 0.3) {
                marketActions.push({
                    type: 'rival_safety_incident',
                    scale: 1,
                    source: rival.name
                });
                
                messages.push({
                    text: `⚠️ ${rival.name} 發生AI安全事故！`,
                    type: 'warning'
                });
                
                // 事故懲罰
                updatedRival.trust = Math.max(0, updatedRival.trust - 15);
                updatedRival.hype = Math.max(0, updatedRival.hype - 20);
                updatedRival.compliance_risk = Math.min(100, updatedRival.compliance_risk + 15);
            }
            
            // === 記錄行為 ===
            updatedRival.last_behavior = {
                id: behaviorSelection.behaviorId,
                reason: behaviorSelection.reason,
                riskLevel: behaviorSelection.riskLevel || 'normal',
                mp_growth: mpGrowth,
                turn: rival.turn_count || 0
            };
            
            // === 記錄里程碑事件（僅在尚未由 checkRivalMilestone 設置時） ===
            if (!updatedRival.last_milestone_event) {
                if (rival.just_achieved_milestone) {
                    const MODEL_TIERS = window.GameConfig?.COSTS?.MODEL_TIERS;
                    const tierName = MODEL_TIERS?.[rival.mp_tier]?.name || ('Tier ' + rival.mp_tier);
                    updatedRival.last_milestone_event = {
                        type: 'success',
                        tier: rival.mp_tier,
                        tierName: tierName,
                        turn: rival.turn_count || 0
                    };
                } else if (rival.just_failed_milestone) {
                    const MODEL_TIERS = window.GameConfig?.COSTS?.MODEL_TIERS;
                    const nextTier = (rival.mp_tier || 0) + 1;
                    const tierName = MODEL_TIERS?.[nextTier]?.name || ('Tier ' + nextTier);
                    updatedRival.last_milestone_event = {
                        type: 'failure',
                        tier: nextTier,
                        tierName: tierName,
                        turn: rival.turn_count || 0
                    };
                }
            }
            
            // 清除臨時標記
            delete updatedRival.just_failed_milestone;
            delete updatedRival.just_achieved_milestone;
            
            return {
                rival: updatedRival,
                marketActions: marketActions,
                messages: messages
            };
        },

        // ==========================================
        // MP成長計算
        // ==========================================
        
        /**
         * 計算MP成長值
         */
        calculateMPGrowth: function(rival, behavior, routeStyle, globalMarket) {
            const config = window.RivalBehaviorConfig;
            const constraints = config.RESOURCE_CONSTRAINTS;
            
            // 基礎成長
            let baseGrowth = routeStyle.base_mp_growth;
            
            // 行為乘數
            baseGrowth *= behavior.mp_growth_mult;
            
            // 路線配置乘數（從原始config）
            const rivalConfig = rival.config || {};
            baseGrowth *= (rivalConfig.mp_mult || 1);
            
            // 加入隨機變異
            const variance = routeStyle.mp_variance;
            const randomFactor = 1 + (Math.random() * 2 - 1) * variance;
            baseGrowth *= randomFactor;
            
            // === 資源約束 ===
            
            // 市值約束：市值越高，可成長越多（但有上限）
            const marketCap = rival.market_cap || 500;
            const marketCapRatio = constraints.market_cap_mp_ratio;
            const maxGrowthFromCap = marketCapRatio.min_growth + 
                (marketCap / marketCapRatio.base_cap) * marketCapRatio.mp_per_100_cap;
            
            // 風險懲罰：高風險狀態降低成長
            const riskPenalty = ((rival.entropy || 0) + (rival.compliance_risk || 0)) / 300;
            
            // 全球市場影響
            let marketMult = 1.0;
            if (globalMarket && globalMarket.indices) {
                const gmEffects = constraints.global_market_effects;
                
                // GPU價格影響
                const gpuPrice = globalMarket.indices.gpu_price?.value || 100;
                const gpuPenalty = Math.max(0, (gpuPrice - gmEffects.gpu_price.base) / 10) * gmEffects.gpu_price.penalty_per_10;
                
                // 市場信心影響
                const confidence = globalMarket.indices.market_confidence?.value || 100;
                const confidenceBonus = ((confidence - gmEffects.market_confidence.base) / 10) * gmEffects.market_confidence.bonus_per_10;
                
                marketMult = Math.max(0.5, 1 - gpuPenalty + confidenceBonus);
            }
            
            // 最終成長值
            let finalGrowth = baseGrowth * (1 - riskPenalty) * marketMult;
            finalGrowth = Math.min(finalGrowth, maxGrowthFromCap);
            finalGrowth = Math.max(0, finalGrowth);
            
            return Math.round(finalGrowth * 10) / 10;
        },
        
        /**
         * 應用MP成長（考慮里程碑門檻）
         */
        applyMPGrowthWithCap: function(rival, growth) {
            const MODEL_TIERS = window.GameConfig?.COSTS?.MODEL_TIERS;
            const currentMP = rival.mp || 10;
            const currentTier = rival.mp_tier || 0;
            const nextTier = currentTier + 1;
            
            let newMP = currentMP + growth;
            let cappedByMilestone = false;
            
            // 如果還有下一個里程碑，檢查門檻
            if (nextTier <= 5 && MODEL_TIERS && MODEL_TIERS[nextTier]) {
                const threshold = MODEL_TIERS[nextTier].mp;
                // 只有當 currentMP 還沒到達門檻時才限制
                // 如果 currentMP 已經 >= threshold（例如里程碑失敗後），允許繼續成長
                if (currentMP < threshold && newMP >= threshold) {
                    newMP = threshold;
                    cappedByMilestone = true;
                }
            }
            
            // 最終上限
            newMP = Math.min(1005, newMP);
            
            return {
                newMP: newMP,
                actualGrowth: newMP - currentMP,
                cappedByMilestone: cappedByMilestone
            };
        },

        // ==========================================
        // 市值更新
        // ==========================================
        
        /**
         * 更新對手市值
         */
        updateMarketCap: function(rival) {
            const mpRatio = (rival.mp || 10) / 1005;
            const hypeEffect = Math.min(50, (rival.hype || 0) * 0.5);
            const trustEffect = (rival.trust || 50) * 0.3;
            const entropyPenalty = (rival.entropy || 0) * 0.2;
            const crPenalty = (rival.compliance_risk || 0) * 0.15;
            
            const baseMarketCap = 500 + mpRatio * 2000;
            const modifiers = hypeEffect + trustEffect - entropyPenalty - crPenalty;
            
            return Math.max(100, baseMarketCap + modifiers * 5);
        },

        // ==========================================
        // 整合入口：處理所有對手的回合更新
        // ==========================================
        
        /**
         * 處理所有對手的行為和狀態更新
         * @param {Array} rivals - 對手陣列
         * @param {Object} player - 玩家狀態
         * @param {Object} globalMarket - 全球市場狀態
         * @returns {Object} { rivals, marketActions, messages }
         */
        processAllRivals: function(rivals, player, globalMarket) {
            const allMarketActions = [];
            const allMessages = [];
            
            const updatedRivals = rivals.map(rival => {
                // 選擇行為
                const behaviorSelection = this.selectBehavior(rival, player, globalMarket);
                
                // 執行行為
                const result = this.executeBehavior(rival, behaviorSelection, globalMarket);
                
                // 收集市場影響
                result.marketActions.forEach(action => allMarketActions.push(action));
                result.messages.forEach(msg => allMessages.push(msg));
                
                // 更新市值
                result.rival.market_cap = this.updateMarketCap(result.rival);
                
                // 自然衰減
                result.rival.entropy = Math.max(0, (result.rival.entropy || 0) * 0.97);
                result.rival.compliance_risk = Math.max(0, (result.rival.compliance_risk || 0) * 0.96);
                
                return result.rival;
            });
            
            return {
                rivals: updatedRivals,
                marketActions: allMarketActions,
                messages: allMessages
            };
        },

        // ==========================================
        // 里程碑處理增強
        // ==========================================
        
        /**
         * 處理對手里程碑嘗試（整合到現有checkRivalMilestone）
         * @param {Object} rival - 對手狀態
         * @returns {Object} 處理結果
         */
        processRivalMilestoneAttempt: function(rival) {
            const MODEL_TIERS = window.GameConfig?.COSTS?.MODEL_TIERS;
            if (!MODEL_TIERS) return { rival, success: null };
            
            const currentTier = rival.mp_tier || 0;
            const nextTier = currentTier + 1;
            
            if (nextTier > 5) return { rival, success: null };
            
            const tierData = MODEL_TIERS[nextTier];
            if (!tierData || rival.mp < tierData.mp) {
                return { rival, success: null };
            }
            
            // 對手達到門檻，計算成功率
            const config = window.RivalBehaviorConfig;
            const routeStyle = config?.getRouteStyle(rival.route);
            
            let baseProb = 55;
            
            // 路線影響成功率
            if (routeStyle) {
                switch (routeStyle.style_key) {
                    case 'aggressive_expansion': baseProb = 50; break;
                    case 'safety_first': baseProb = 70; break;
                    case 'balanced_growth': baseProb = 60; break;
                    case 'creative_burst': baseProb = 45; break;
                    case 'hardware_heavy': baseProb = 55; break;
                    case 'professional_defense': baseProb = 65; break;
                }
            }
            
            // 風險狀態影響成功率
            const entropyPenalty = Math.min(20, (rival.entropy || 0) / 5);
            const trustBonus = Math.min(15, (rival.trust || 50) / 7);
            const alignmentBonus = Math.min(10, (rival.alignment || 50) / 10);
            
            const failCount = (rival.milestone_fail_count && rival.milestone_fail_count[nextTier]) || 0;
            const failPenalty = failCount * 10;
            
            const successProb = Math.max(15, Math.min(85,
                baseProb - entropyPenalty + trustBonus + alignmentBonus - failPenalty
            ));
            
            const roll = Math.random() * 100;
            const updatedRival = JSON.parse(JSON.stringify(rival));
            
            if (!updatedRival.milestone_fail_count) {
                updatedRival.milestone_fail_count = {};
            }
            if (!updatedRival.mp_milestones) {
                updatedRival.mp_milestones = {};
            }
            
            if (roll <= successProb) {
                // 成功
                updatedRival.mp_milestones[nextTier] = true;
                updatedRival.mp_tier = nextTier;
                updatedRival.milestone_fail_count[nextTier] = 0;
                updatedRival.just_achieved_milestone = true;
                
                // 成功獎勵
                updatedRival.hype = Math.min(150, (updatedRival.hype || 0) + 10);
                updatedRival.trust = Math.min(100, (updatedRival.trust || 50) + 5);
                updatedRival.market_cap = (updatedRival.market_cap || 500) * 1.1;
                
                return {
                    rival: updatedRival,
                    success: true,
                    tier: nextTier,
                    tierName: tierData.name,
                    marketAction: {
                        type: 'rival_milestone_success',
                        scale: nextTier * 0.2
                    }
                };
            } else {
                // 失敗
                updatedRival.milestone_fail_count[nextTier] = failCount + 1;
                updatedRival.just_failed_milestone = true;
                
                // 失敗懲罰
                updatedRival.hype = Math.max(0, (updatedRival.hype || 0) - 10);
                updatedRival.entropy = Math.min(100, (updatedRival.entropy || 0) + 5);
                
                return {
                    rival: updatedRival,
                    success: false,
                    tier: nextTier,
                    tierName: tierData.name,
                    marketAction: {
                        type: 'rival_milestone_failure',
                        scale: 1
                    }
                };
            }
        }
    };

    // ==========================================
    // 全局暴露
    // ==========================================
    window.RivalBehaviorEngine = RivalBehaviorEngine;

    console.log('✓ Rival Behavior Engine loaded');

})();