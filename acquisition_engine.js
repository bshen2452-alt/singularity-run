// ============================================
// 併購系統引擎 (Acquisition Engine)
// ============================================
// 設計：純函數式，僅接收數據參數/返回計算結果
// 功能：計算併購機會、執行併購、處理整合期

(function() {
    'use strict';

    const AcquisitionEngine = {

        // ==========================================
        // 初始化
        // ==========================================

        /**
         * 創建併購系統初始狀態
         * @returns {Object} 初始狀態
         */
        createInitialState() {
            return {
                // 可用的併購機會（每季刷新）
                available_opportunities: [],
                
                // 正在整合中的單位
                integrating_units: [],
                
                // 已完成併購的單位
                acquired_units: [],
                
                // 冷卻計時器
                cooldown: 0,
                
                // 併購歷史
                history: [],
                
                // 上次刷新回合
                last_refresh_turn: 0
            };
        },

        // ==========================================
        // 併購機會生成
        // ==========================================

        /**
         * 生成可用的併購機會
         * @param {Object} player - 玩家狀態
         * @param {Object} globalParams - 全球參數
         * @returns {Array} 可用的併購機會列表
         */
        generateOpportunities(player, globalParams) {
            const config = window.AcquisitionConfig;
            if (!config) return [];

            const mpTier = player.mp_tier || 0;
            const affinityState = player.industry_affinity_state;
            const acquisitionState = player.acquisition_state || this.createInitialState();
            
            // 檢查 Tier 門檻
            if (mpTier < config.SYSTEM.unlock_tier) {
                return [];
            }

            const opportunities = [];
            const allTargets = config.getAllTargets();

            for (const [targetId, target] of Object.entries(allTargets)) {
                // 跳過已擁有的單位
                if (this.hasUnit(player, targetId)) {
                    continue;
                }

                // 跳過正在整合的單位
                if (acquisitionState.integrating_units?.some(u => u.target_id === targetId)) {
                    continue;
                }

                // 檢查出現條件
                const availability = this.checkAvailability(player, target, globalParams);
                if (!availability.available) {
                    continue;
                }

                // 計算實際成本
                const cost = this.calculateCost(player, target, globalParams);
                
                // 計算整合期
                const integrationTurns = this.calculateIntegrationTurns(player, target);

                opportunities.push({
                    target_id: targetId,
                    target: target,
                    cost: cost,
                    integration_turns: integrationTurns,
                    availability: availability,
                    expires_in: 2  // 機會持續 2 回合
                });
            }

            return opportunities;
        },

        /**
         * 檢查單位是否可用
         * @param {Object} player - 玩家狀態
         * @param {Object} target - 目標配置
         * @param {Object} globalParams - 全球參數
         * @returns {Object} 可用性資訊
         */
        checkAvailability(player, target, globalParams) {
            const avail = target.availability;
            const affinityState = player.industry_affinity_state;

            // 檢查 Tier
            if ((player.mp_tier || 0) < avail.min_tier) {
                return { available: false, reason: `需要 Tier ${avail.min_tier}` };
            }

            // 檢查親和度
            if (avail.required_affinity) {
                const industry = avail.required_affinity.industry;
                const currentAffinity = affinityState?.affinity?.[industry] || 0;
                if (currentAffinity < avail.required_affinity.min_value) {
                    return { 
                        available: false, 
                        reason: `${industry} 親和度需達 ${avail.required_affinity.min_value}（當前 ${currentAffinity}）` 
                    };
                }
            }

            // 檢查前置部門
            if (target.requires_department) {
                if (!this.hasUnit(player, target.requires_department)) {
                    return { 
                        available: false, 
                        reason: `需要先擁有 ${target.requires_department}` 
                    };
                }
            }

            // 基於機率判定是否出現
            const baseChance = avail.random_chance || 0.3;
            const affinityBonus = this.getAffinityBonus(player, target);
            const finalChance = Math.min(0.9, baseChance + affinityBonus);

            // 使用回合數作為隨機種子確保一致性
            const turnSeed = player.turn_count || 0;
            const targetSeed = target.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            const randomValue = this.seededRandom(turnSeed * 1000 + targetSeed);

            if (randomValue > finalChance) {
                return { available: false, reason: '本季未出現', chance: finalChance };
            }

            return { available: true, chance: finalChance };
        },

        /**
         * 偽隨機數生成
         */
        seededRandom(seed) {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        },

        /**
         * 獲取親和度加成
         */
        getAffinityBonus(player, target) {
            const affinityState = player.industry_affinity_state;
            if (!target.availability?.required_affinity) return 0;
            
            const industry = target.availability.required_affinity.industry;
            const affinity = affinityState?.affinity?.[industry] || 0;
            
            // 每 10 點親和度增加 5% 機率
            return Math.floor(affinity / 10) * 0.05;
        },

        // ==========================================
        // 成本計算
        // ==========================================

        /**
         * 計算併購成本
         * @param {Object} player - 玩家狀態
         * @param {Object} target - 目標配置
         * @param {Object} globalParams - 全球參數
         * @returns {Object} 成本詳情
         */
        calculateCost(player, target, globalParams) {
            const config = window.AcquisitionConfig;
            const modifiers = config.COST_MODIFIERS;
            
            const baseCost = target.cost.base;
            const variance = target.cost.variance;
            
            // 基礎浮動
            const turnSeed = (player.turn_count || 0) + target.id.length;
            const varianceMult = 1 + (this.seededRandom(turnSeed * 100) - 0.5) * 2 * variance;
            
            let finalCost = baseCost * varianceMult;
            let modifierBreakdown = [];

            // 親和度折扣
            if (target.availability?.required_affinity) {
                const industry = target.availability.required_affinity.industry;
                const affinity = player.industry_affinity_state?.affinity?.[industry] || 0;
                const affinityDiscount = Math.floor(affinity / 10) * modifiers.affinity_per_10;
                if (affinityDiscount !== 0) {
                    finalCost *= (1 + affinityDiscount);
                    modifierBreakdown.push({ name: '親和度折扣', value: affinityDiscount });
                }
            }

            // 市場狀況
            const marketTrend = globalParams?.market_trend || 'neutral';
            const marketMod = modifiers.market_conditions[marketTrend] || 1;
            if (marketMod !== 1) {
                finalCost *= marketMod;
                modifierBreakdown.push({ name: '市場狀況', value: marketMod - 1 });
            }

            // 已有相關資產
            if (target.related_facility_upgrade) {
                const upgrades = player.facility_upgrades || {};
                if (upgrades[target.related_facility_upgrade]?.status === 'operating') {
                    finalCost *= (1 + modifiers.existing_assets.related_facility);
                    modifierBreakdown.push({ name: '已有相關設施', value: modifiers.existing_assets.related_facility });
                }
            }

            return {
                base: baseCost,
                final: Math.round(finalCost),
                modifiers: modifierBreakdown
            };
        },

        // ==========================================
        // 整合期計算
        // ==========================================

        /**
         * 計算整合期
         * @param {Object} player - 玩家狀態
         * @param {Object} target - 目標配置
         * @returns {Object} 整合期詳情
         */
        calculateIntegrationTurns(player, target) {
            const config = window.AcquisitionConfig;
            const sysConfig = config.SYSTEM.integration;
            const factors = config.INTEGRATION_FACTORS;
            
            // 基礎整合期
            const baseTurns = target.integration?.base_turns || sysConfig.base_turns[target.type] || 4;
            let finalTurns = baseTurns;
            let accelerationBreakdown = [];

            // 親和度加速
            if (target.availability?.required_affinity) {
                const industry = target.availability.required_affinity.industry;
                const affinity = player.industry_affinity_state?.affinity?.[industry] || 0;
                const affinityAccel = Math.floor(affinity / 10) * factors.affinity_acceleration_per_10;
                if (affinityAccel > 0) {
                    finalTurns *= (1 - affinityAccel);
                    accelerationBreakdown.push({ name: '親和度', value: -affinityAccel });
                }
            }

            // 人才加速
            const requiredSkill = target.integration?.skill_required;
            if (requiredSkill) {
                const hasSkill = this.checkTalentAvailable(player, requiredSkill);
                if (hasSkill) {
                    const talentAccel = factors.talent_acceleration[requiredSkill] || 0;
                    finalTurns *= (1 - talentAccel);
                    accelerationBreakdown.push({ name: '人才加速', value: -talentAccel });
                }
            }

            // 經驗加速（已有同類部門）
            const acquisitionState = player.acquisition_state || {};
            const acquiredUnits = acquisitionState.acquired_units || [];
            const hasSameType = acquiredUnits.some(u => {
                const uTarget = config.getTarget(u.target_id);
                return uTarget && uTarget.type === target.type;
            });
            if (hasSameType) {
                finalTurns *= (1 - factors.experience_bonus);
                accelerationBreakdown.push({ name: '併購經驗', value: -factors.experience_bonus });
            }

            // 最短整合期
            finalTurns = Math.max(sysConfig.min_turns, Math.ceil(finalTurns));

            return {
                base: baseTurns,
                final: finalTurns,
                accelerations: accelerationBreakdown
            };
        },

        /**
         * 檢查是否有所需人才
         */
        checkTalentAvailable(player, skillLevel) {
            if (skillLevel === 'turing') {
                return (player.turing_count || 0) > 0;
            }
            if (skillLevel === 'senior') {
                return (player.senior_count || 0) > 0;
            }
            return true;
        },

        // ==========================================
        // 執行併購
        // ==========================================

        /**
         * 執行併購
         * @param {Object} player - 玩家狀態
         * @param {string} targetId - 目標ID
         * @param {Object} opportunity - 併購機會資訊
         * @returns {Object} 執行結果
         */
        executeAcquisition(player, targetId, opportunity) {
            const config = window.AcquisitionConfig;
            const target = config.getTarget(targetId);
            
            if (!target) {
                return { success: false, message: '無效的併購目標' };
            }

            // 檢查資金
            const cost = opportunity?.cost?.final || this.calculateCost(player, target, {}).final;
            if ((player.cash || 0) < cost) {
                return { success: false, message: `資金不足（需要 $${cost}M）` };
            }

            // 檢查是否已擁有
            if (this.hasUnit(player, targetId)) {
                return { success: false, message: '已擁有此單位' };
            }

            // 檢查同時整合數量
            const acquisitionState = player.acquisition_state || this.createInitialState();
            if ((acquisitionState.integrating_units?.length || 0) >= config.SYSTEM.max_pending) {
                return { success: false, message: '已達最大同時整合數量' };
            }

            // 檢查冷卻
            if (acquisitionState.cooldown > 0) {
                return { success: false, message: `併購冷卻中（剩餘 ${acquisitionState.cooldown} 回合）` };
            }

            // 建立新狀態
            const newPlayer = JSON.parse(JSON.stringify(player));
            
            // 扣除資金
            newPlayer.cash -= cost;
            
            // 更新併購狀態
            if (!newPlayer.acquisition_state) {
                newPlayer.acquisition_state = this.createInitialState();
            }
            
            const integrationTurns = opportunity?.integration_turns?.final || 
                this.calculateIntegrationTurns(player, target).final;

            // 加入整合中列表
            const integrationRecord = {
                target_id: targetId,
                start_turn: player.turn_count || 0,
                total_turns: integrationTurns,
                remaining_turns: integrationTurns,
                cost: cost,
                status: 'integrating'
            };
            
            newPlayer.acquisition_state.integrating_units.push(integrationRecord);
            
            // 設定冷卻
            newPlayer.acquisition_state.cooldown = config.SYSTEM.base_cooldown;
            
            // 移除機會
            newPlayer.acquisition_state.available_opportunities = 
                (newPlayer.acquisition_state.available_opportunities || [])
                    .filter(o => o.target_id !== targetId);
            
            // 記錄歷史
            newPlayer.acquisition_state.history.push({
                type: 'acquisition_started',
                target_id: targetId,
                cost: cost,
                turn: player.turn_count || 0,
                timestamp: Date.now()
            });

            // 立即效果：親和度變化
            if (target.effects?.immediate?.affinity_changes) {
                const affinityEngine = window.IndustryAffinityEngine;
                if (affinityEngine && newPlayer.industry_affinity_state) {
                    newPlayer.industry_affinity_state = affinityEngine.batchModifyAffinity(
                        newPlayer.industry_affinity_state,
                        target.effects.immediate.affinity_changes,
                        `併購: ${target.name}`
                    );
                }
            }

            return {
                success: true,
                player: newPlayer,
                message: `成功啟動併購 ${target.name}，整合期 ${integrationTurns} 季`,
                cost: cost,
                integration_turns: integrationTurns
            };
        },

        // ==========================================
        // 每季更新
        // ==========================================

        /**
         * 處理每季併購系統更新
         * @param {Object} player - 玩家狀態
         * @param {Object} globalParams - 全球參數
         * @returns {Object} 更新結果
         */
        processQuarterlyUpdate(player, globalParams) {
            const config = window.AcquisitionConfig;
            if (!config) return { player, messages: [] };

            const mpTier = player.mp_tier || 0;
            if (mpTier < config.SYSTEM.unlock_tier) {
                return { player, messages: [] };
            }

            let newPlayer = JSON.parse(JSON.stringify(player));
            const messages = [];

            // 確保狀態存在
            if (!newPlayer.acquisition_state) {
                newPlayer.acquisition_state = this.createInitialState();
            }

            const state = newPlayer.acquisition_state;

            // 1. 更新冷卻
            if (state.cooldown > 0) {
                state.cooldown--;
            }

            // 2. 處理整合中的單位
            const completed = [];
            for (const unit of state.integrating_units) {
                unit.remaining_turns--;
                
                // 整合期懲罰
                const penalty = config.SYSTEM.integration_penalty;
                
                // 忠誠度流失
                if (penalty.loyalty_drain) {
                    newPlayer.loyalty = Math.max(0, (newPlayer.loyalty || 50) - penalty.loyalty_drain);
                }

                // 檢查里程碑
                const progress = 1 - (unit.remaining_turns / unit.total_turns);
                if (progress >= 0.5 && !unit.halfway_reached) {
                    unit.halfway_reached = true;
                    const target = config.getTarget(unit.target_id);
                    messages.push({
                        text: `${target?.name || unit.target_id} 整合進度過半`,
                        type: 'info'
                    });
                }

                // 整合完成
                if (unit.remaining_turns <= 0) {
                    completed.push(unit);
                    unit.status = 'completed';
                    unit.completion_turn = newPlayer.turn_count || 0;
                }
            }

            // 3. 處理完成的整合
            for (const unit of completed) {
                // 從整合中移除
                state.integrating_units = state.integrating_units.filter(u => u.target_id !== unit.target_id);
                
                // 加入已完成列表
                state.acquired_units.push({
                    target_id: unit.target_id,
                    acquisition_turn: unit.start_turn,
                    completion_turn: unit.completion_turn,
                    cost: unit.cost
                });

                const target = config.getTarget(unit.target_id);
                if (target) {
                    // 完成獎勵
                    const milestone = config.INTEGRATION_MILESTONES.complete;
                    
                    // 親和度獎勵
                    if (milestone.affinity_bonus && target.availability?.required_affinity) {
                        const industry = target.availability.required_affinity.industry;
                        if (newPlayer.industry_affinity_state?.affinity) {
                            newPlayer.industry_affinity_state.affinity[industry] = 
                                Math.min(100, (newPlayer.industry_affinity_state.affinity[industry] || 0) + milestone.affinity_bonus);
                        }
                    }

                    messages.push({
                        text: `🎉 ${target.name} 整合完成！`,
                        type: 'success'
                    });

                    // 記錄歷史
                    state.history.push({
                        type: 'acquisition_completed',
                        target_id: unit.target_id,
                        turn: newPlayer.turn_count || 0,
                        timestamp: Date.now()
                    });
                }
            }

            // 4. 更新機會過期
            state.available_opportunities = (state.available_opportunities || [])
                .map(o => ({ ...o, expires_in: (o.expires_in || 2) - 1 }))
                .filter(o => o.expires_in > 0);

            // 5. 生成新機會（每 2 回合）
            const currentTurn = newPlayer.turn_count || 0;
            if (currentTurn - (state.last_refresh_turn || 0) >= 2) {
                const newOpportunities = this.generateOpportunities(newPlayer, globalParams);
                
                // 合併新機會（不重複）
                const existingIds = state.available_opportunities.map(o => o.target_id);
                for (const opp of newOpportunities) {
                    if (!existingIds.includes(opp.target_id)) {
                        state.available_opportunities.push(opp);
                    }
                }
                
                state.last_refresh_turn = currentTurn;

                if (newOpportunities.length > 0) {
                    messages.push({
                        text: `發現 ${newOpportunities.length} 個新的併購機會`,
                        type: 'info'
                    });
                }
            }

            // 6. 計算協同效應
            const synergies = this.calculateActiveSynergies(newPlayer);
            state.active_synergies = synergies;

            return {
                player: newPlayer,
                messages
            };
        },

        // ==========================================
        // 效果計算
        // ==========================================

        /**
         * 計算併購帶來的每季效果
         * @param {Object} player - 玩家狀態
         * @returns {Object} 效果匯總
         */
        calculateOngoingEffects(player) {
            const config = window.AcquisitionConfig;
            if (!config) return {};

            const acquisitionState = player.acquisition_state || {};
            const acquiredUnits = acquisitionState.acquired_units || [];
            const integratingUnits = acquisitionState.integrating_units || [];

            const effects = {
                quarterly_revenue: 0,
                capacity_bonus: 0,
                compute_efficiency: 0,
                energy_cost_reduction: 0,
                construction_speed: 0,
                construction_cost: 0,
                esg_bonus: 0,
                operating_efficiency_penalty: 0,
                loyalty_drain: 0
            };

            // 整合中單位的懲罰
            for (const unit of integratingUnits) {
                const penalty = config.SYSTEM.integration_penalty;
                
                // 檢查是否過半
                const progress = 1 - (unit.remaining_turns / unit.total_turns);
                const penaltyMult = progress >= 0.5 ? 0.5 : 1;  // 過半後懲罰減半
                
                effects.operating_efficiency_penalty += penalty.operating_efficiency * penaltyMult;
                effects.loyalty_drain += penalty.loyalty_drain * penaltyMult;
            }

            // 已完成單位的收益
            for (const unit of acquiredUnits) {
                const target = config.getTarget(unit.target_id);
                if (!target?.effects?.ongoing) continue;

                const ongoing = target.effects.ongoing;
                
                if (ongoing.quarterly_revenue) effects.quarterly_revenue += ongoing.quarterly_revenue;
                if (ongoing.capacity_bonus) effects.capacity_bonus += ongoing.capacity_bonus;
                if (ongoing.compute_efficiency) effects.compute_efficiency += ongoing.compute_efficiency;
                if (ongoing.energy_cost_reduction) effects.energy_cost_reduction += ongoing.energy_cost_reduction;
                if (ongoing.construction_speed) effects.construction_speed += ongoing.construction_speed;
                if (ongoing.construction_cost) effects.construction_cost += ongoing.construction_cost;
                if (ongoing.esg_bonus) effects.esg_bonus += ongoing.esg_bonus;
            }

            // 協同效應加成
            const synergies = this.calculateActiveSynergies(player);
            for (const synergy of synergies) {
                if (synergy.bonus.quarterly_revenue) effects.quarterly_revenue += synergy.bonus.quarterly_revenue;
                if (synergy.bonus.efficiency) effects.compute_efficiency += synergy.bonus.efficiency;
                if (synergy.bonus.energy_cost) effects.energy_cost_reduction += Math.abs(synergy.bonus.energy_cost);
                if (synergy.bonus.esg_bonus) effects.esg_bonus += synergy.bonus.esg_bonus;
            }

            return effects;
        },

        /**
         * 計算啟用的協同效應
         */
        calculateActiveSynergies(player) {
            const config = window.AcquisitionConfig;
            if (!config) return [];

            const acquisitionState = player.acquisition_state || {};
            const acquiredUnits = (acquisitionState.acquired_units || []).map(u => u.target_id);
            
            return config.getSynergy(acquiredUnits);
        },

        // ==========================================
        // 查詢函數
        // ==========================================

        /**
         * 檢查是否擁有單位
         */
        hasUnit(player, targetId) {
            const acquisitionState = player.acquisition_state || {};
            const acquiredUnits = acquisitionState.acquired_units || [];
            
            // 檢查已併購的
            if (acquiredUnits.some(u => u.target_id === targetId)) {
                return true;
            }
            
            // 檢查通過設施升級成立的部門
            const config = window.AcquisitionConfig;
            const target = config?.getTarget(targetId);
            if (target?.related_facility_upgrade) {
                const facilityState = player.facility_upgrade_state || {};
                const departmentState = facilityState.departments || {};
                if (departmentState[targetId]?.established) {
                    return true;
                }
            }

            return false;
        },

        /**
         * 獲取併購摘要（供 UI 顯示）
         */
        getAcquisitionSummary(player) {
            const config = window.AcquisitionConfig;
            if (!config) return null;

            const state = player.acquisition_state || this.createInitialState();
            const effects = this.calculateOngoingEffects(player);
            const synergies = this.calculateActiveSynergies(player);

            return {
                available_count: state.available_opportunities?.length || 0,
                integrating_count: state.integrating_units?.length || 0,
                acquired_count: state.acquired_units?.length || 0,
                cooldown: state.cooldown || 0,
                max_pending: config.SYSTEM.max_pending,
                effects: effects,
                synergies: synergies,
                opportunities: state.available_opportunities || [],
                integrating: state.integrating_units || [],
                acquired: state.acquired_units || []
            };
        }
    };

    // ==========================================
    // 全局暴露
    // ==========================================
    window.AcquisitionEngine = AcquisitionEngine;

    console.log('✓ Acquisition Engine loaded');

})();
