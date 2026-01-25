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

        createInitialState() {
            return {
                available_opportunities: [],
                integrating_units: [],
                acquired_units: [],
                cooldown: 0,
                history: [],
                last_refresh_turn: 0
            };
        },

        // ==========================================
        // 併購機會生成
        // ==========================================

        generateOpportunities(player, globalParams) {
            const config = window.AcquisitionConfig;
            if (!config) return [];

            const mpTier = player.mp_tier || 0;
            const acquisitionState = player.acquisition_state || this.createInitialState();
            
            if (mpTier < config.SYSTEM.unlock_tier) {
                return [];
            }

            const opportunities = [];
            const allTargets = config.getAllTargets();

            for (const [targetId, target] of Object.entries(allTargets)) {
                if (this.hasUnit(player, targetId)) continue;
                if (acquisitionState.integrating_units?.some(u => u.target_id === targetId)) continue;

                const availability = this.checkAvailability(player, target, globalParams);
                if (!availability.available) continue;

                const cost = this.calculateCost(player, target, globalParams);
                const integrationTurns = this.calculateIntegrationTurns(player, target);

                opportunities.push({
                    target_id: targetId,
                    target: target,
                    cost: cost,
                    integration_turns: integrationTurns,
                    availability: availability,
                    expires_in: 2
                });
            }

            return opportunities;
        },

        checkAvailability(player, target, globalParams) {
            const avail = target.availability;
            const affinityState = player.industry_affinity_state;

            if ((player.mp_tier || 0) < avail.min_tier) {
                return { available: false, reason: `需要 Tier ${avail.min_tier}` };
            }

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

            if (target.requires_department) {
                if (!this.hasUnit(player, target.requires_department)) {
                    return { 
                        available: false, 
                        reason: `需要先擁有 ${target.requires_department}` 
                    };
                }
            }

            const baseChance = avail.random_chance || 0.3;
            const affinityBonus = this.getAffinityBonus(player, target);
            const finalChance = Math.min(0.9, baseChance + affinityBonus);

            const turnSeed = player.turn_count || 0;
            const targetSeed = target.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            const randomValue = this.seededRandom(turnSeed * 1000 + targetSeed);

            if (randomValue > finalChance) {
                return { available: false, reason: '本季未出現', chance: finalChance };
            }

            return { available: true, chance: finalChance };
        },

        seededRandom(seed) {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        },

        getAffinityBonus(player, target) {
            const affinityState = player.industry_affinity_state;
            if (!target.availability?.required_affinity) return 0;
            
            const industry = target.availability.required_affinity.industry;
            const affinity = affinityState?.affinity?.[industry] || 0;
            
            return Math.floor(affinity / 10) * 0.05;
        },

        // ==========================================
        // 成本計算
        // ==========================================

        calculateCost(player, target, globalParams) {
            const config = window.AcquisitionConfig;
            const modifiers = config.COST_MODIFIERS;
            
            const baseCost = target.cost.base;
            const variance = target.cost.variance;
            
            const turnSeed = (player.turn_count || 0) + target.id.length;
            const varianceMult = 1 + (this.seededRandom(turnSeed * 100) - 0.5) * 2 * variance;
            
            let finalCost = baseCost * varianceMult;
            let modifierBreakdown = [];

            if (target.availability?.required_affinity) {
                const industry = target.availability.required_affinity.industry;
                const affinity = player.industry_affinity_state?.affinity?.[industry] || 0;
                const affinityDiscount = Math.floor(affinity / 10) * modifiers.affinity_per_10;
                if (affinityDiscount !== 0) {
                    finalCost *= (1 + affinityDiscount);
                    modifierBreakdown.push({ name: '親和度折扣', value: affinityDiscount });
                }
            }

            const marketTrend = globalParams?.market_trend || 'neutral';
            const marketMod = modifiers.market_conditions[marketTrend] || 1;
            if (marketMod !== 1) {
                finalCost *= marketMod;
                modifierBreakdown.push({ name: '市場狀態', value: marketMod - 1 });
            }

            // 檢查是否已有對應的 FUNCTIONAL_DEPT
            if (target.related_functional_dept) {
                const assetCardState = player.asset_card_state || {};
                const departments = assetCardState.departments || {};
                if (departments[target.related_functional_dept]?.established) {
                    finalCost *= (1 + modifiers.existing_assets.related_department);
                    modifierBreakdown.push({ name: '已有相關部門', value: modifiers.existing_assets.related_department });
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

        calculateIntegrationTurns(player, target) {
            const config = window.AcquisitionConfig;
            const sysConfig = config.SYSTEM.integration;
            const factors = config.INTEGRATION_FACTORS;
            
            const baseTurns = target.integration?.base_turns || sysConfig.base_turns[target.type] || 4;
            let finalTurns = baseTurns;
            let accelerationBreakdown = [];

            if (target.availability?.required_affinity) {
                const industry = target.availability.required_affinity.industry;
                const affinity = player.industry_affinity_state?.affinity?.[industry] || 0;
                const affinityAccel = Math.floor(affinity / 10) * factors.affinity_acceleration_per_10;
                if (affinityAccel > 0) {
                    finalTurns *= (1 - affinityAccel);
                    accelerationBreakdown.push({ name: '親和度', value: -affinityAccel });
                }
            }

            const requiredSkill = target.integration?.skill_required;
            if (requiredSkill) {
                const hasSkill = this.checkTalentAvailable(player, requiredSkill);
                if (hasSkill) {
                    const talentAccel = factors.talent_acceleration[requiredSkill] || 0;
                    finalTurns *= (1 - talentAccel);
                    accelerationBreakdown.push({ name: '人才加速', value: -talentAccel });
                }
            }

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

            finalTurns = Math.max(sysConfig.min_turns, Math.ceil(finalTurns));

            return {
                base: baseTurns,
                final: finalTurns,
                accelerations: accelerationBreakdown
            };
        },

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

        executeAcquisition(player, targetId, opportunity) {
            const config = window.AcquisitionConfig;
            const target = config.getTarget(targetId);
            
            if (!target) {
                return { success: false, message: '無效的併購目標' };
            }

            const cost = opportunity?.cost?.final || this.calculateCost(player, target, {}).final;
            if ((player.cash || 0) < cost) {
                return { success: false, message: `資金不足（需要 $${cost}M）` };
            }

            if (this.hasUnit(player, targetId)) {
                return { success: false, message: '已擁有此單位' };
            }

            const acquisitionState = player.acquisition_state || this.createInitialState();
            if ((acquisitionState.integrating_units?.length || 0) >= config.SYSTEM.max_pending) {
                return { success: false, message: `最多同時整合 ${config.SYSTEM.max_pending} 個單位` };
            }

            if ((acquisitionState.cooldown || 0) > 0) {
                return { success: false, message: `冷卻中（${acquisitionState.cooldown} 回合）` };
            }

            // 執行併購
            const newPlayer = JSON.parse(JSON.stringify(player));
            
            newPlayer.cash -= cost;
            
            if (!newPlayer.acquisition_state) {
                newPlayer.acquisition_state = this.createInitialState();
            }
            
            const integrationTurns = opportunity?.integration_turns?.final || 
                this.calculateIntegrationTurns(player, target).final;

            newPlayer.acquisition_state.integrating_units.push({
                target_id: targetId,
                start_turn: player.turn_count || 0,
                remaining_turns: integrationTurns,
                total_turns: integrationTurns
            });

            newPlayer.acquisition_state.cooldown = config.SYSTEM.base_cooldown;
            
            // 移除此機會
            newPlayer.acquisition_state.available_opportunities = 
                (newPlayer.acquisition_state.available_opportunities || [])
                    .filter(o => o.target_id !== targetId);

            // 立即效果
            const immediateEffects = target.effects?.immediate;
            if (immediateEffects) {
                // 親和度變化
                if (immediateEffects.affinity_changes) {
                    if (!newPlayer.industry_affinity_state) {
                        newPlayer.industry_affinity_state = { affinity: {} };
                    }
                    for (const [industry, change] of Object.entries(immediateEffects.affinity_changes)) {
                        newPlayer.industry_affinity_state.affinity[industry] = 
                            (newPlayer.industry_affinity_state.affinity[industry] || 0) + change;
                    }
                }
                
                // 數據獎勵
                if (immediateEffects.data_grant) {
                    const dataType = immediateEffects.data_grant.type;
                    const amount = immediateEffects.data_grant.amount;
                    if (!newPlayer.data_inventory) {
                        newPlayer.data_inventory = {};
                    }
                    newPlayer.data_inventory[dataType] = (newPlayer.data_inventory[dataType] || 0) + amount;
                    
                    if (dataType === 'legal_low') {
                        newPlayer.low_data = (newPlayer.low_data || 0) + amount;
                    } else {
                        newPlayer.high_data = (newPlayer.high_data || 0) + amount;
                    }
                }
            }

            // 記錄歷史
            newPlayer.acquisition_state.history.push({
                target_id: targetId,
                cost: cost,
                turn: player.turn_count || 0,
                type: 'started'
            });

            return {
                success: true,
                player: newPlayer,
                message: `開始併購 ${target.name}，整合期 ${integrationTurns} 季`,
                cost: cost
            };
        },

        // ==========================================
        // 每季更新
        // ==========================================

        processQuarterlyUpdate(player, globalParams) {
            const config = window.AcquisitionConfig;
            if (!config) return { player, messages: [] };

            const newPlayer = JSON.parse(JSON.stringify(player));
            const messages = [];

            if (!newPlayer.acquisition_state) {
                newPlayer.acquisition_state = this.createInitialState();
            }

            // 更新冷卻
            if (newPlayer.acquisition_state.cooldown > 0) {
                newPlayer.acquisition_state.cooldown--;
            }

            // 更新整合進度
            const completedUnits = [];
            newPlayer.acquisition_state.integrating_units = 
                newPlayer.acquisition_state.integrating_units.filter(unit => {
                    unit.remaining_turns--;
                    if (unit.remaining_turns <= 0) {
                        completedUnits.push(unit);
                        return false;
                    }
                    return true;
                });

            // 處理完成的整合
            for (const unit of completedUnits) {
                const target = config.getTarget(unit.target_id);
                
                newPlayer.acquisition_state.acquired_units.push({
                    target_id: unit.target_id,
                    acquired_turn: newPlayer.turn_count || 0
                });

                // 整合完成獎勵
                const milestone = config.INTEGRATION_MILESTONES.complete;
                if (target.availability?.required_affinity && milestone.affinity_bonus) {
                    const industry = target.availability.required_affinity.industry;
                    if (!newPlayer.industry_affinity_state) {
                        newPlayer.industry_affinity_state = { affinity: {} };
                    }
                    newPlayer.industry_affinity_state.affinity[industry] = 
                        (newPlayer.industry_affinity_state.affinity[industry] || 0) + milestone.affinity_bonus;
                }

                // 同步到 asset_card_state（如果是對應 FUNCTIONAL_DEPTS 的目標）
                if (target.related_functional_dept) {
                    if (!newPlayer.asset_card_state) {
                        newPlayer.asset_card_state = { departments: {}, subsidiaries: {} };
                    }
                    if (!newPlayer.asset_card_state.departments) {
                        newPlayer.asset_card_state.departments = {};
                    }
                    
                    // 標記為已通過併購取得
                    newPlayer.asset_card_state.departments[target.related_functional_dept] = {
                        established: true,
                        established_turn: newPlayer.turn_count || 0,
                        mastery: 0,
                        acquired_via: 'acquisition'
                    };
                }

                newPlayer.acquisition_state.history.push({
                    target_id: unit.target_id,
                    turn: newPlayer.turn_count || 0,
                    type: 'completed'
                });

                messages.push({
                    text: `🏆 ${target?.name || unit.target_id} 整合完成！`,
                    type: 'success'
                });
            }

            // 刷新機會
            const currentTurn = newPlayer.turn_count || 0;
            if (currentTurn > newPlayer.acquisition_state.last_refresh_turn) {
                // 過期舊機會
                newPlayer.acquisition_state.available_opportunities = 
                    (newPlayer.acquisition_state.available_opportunities || [])
                        .filter(o => {
                            o.expires_in--;
                            return o.expires_in > 0;
                        });

                // 生成新機會
                const newOpportunities = this.generateOpportunities(newPlayer, globalParams);
                const existingIds = new Set(
                    newPlayer.acquisition_state.available_opportunities.map(o => o.target_id)
                );
                
                for (const opp of newOpportunities) {
                    if (!existingIds.has(opp.target_id)) {
                        newPlayer.acquisition_state.available_opportunities.push(opp);
                    }
                }

                newPlayer.acquisition_state.last_refresh_turn = currentTurn;

                if (newOpportunities.length > 0) {
                    messages.push({
                        text: `📋 發現 ${newOpportunities.length} 個新併購機會`,
                        type: 'info'
                    });
                }
            }

            // 應用持續效果（數據供應商）
            const effectsResult = this.applyOngoingDataEffects(newPlayer);
            if (effectsResult.messages) {
                messages.push(...effectsResult.messages);
            }

            return {
                player: effectsResult.player || newPlayer,
                messages
            };
        },

        /**
         * 應用數據供應商的持續效果
         */
        applyOngoingDataEffects(player) {
            const config = window.AcquisitionConfig;
            const newPlayer = JSON.parse(JSON.stringify(player));
            const messages = [];

            const acquisitionState = newPlayer.acquisition_state || {};
            const acquiredUnits = acquisitionState.acquired_units || [];

            const effects = this.calculateOngoingEffects(newPlayer);
            
            // 處理每季數據產出
            if (effects.quarterly_data) {
                let totalDataGained = 0;
                
                if (!newPlayer.data_inventory) {
                    newPlayer.data_inventory = {};
                }
                
                if (effects.quarterly_data.legal_low > 0) {
                    const amount = effects.quarterly_data.legal_low;
                    newPlayer.low_data = (newPlayer.low_data || 0) + amount;
                    newPlayer.data_inventory.legal_low = (newPlayer.data_inventory.legal_low || 0) + amount;
                    totalDataGained += amount;
                }
                if (effects.quarterly_data.legal_high_broad > 0) {
                    const amount = effects.quarterly_data.legal_high_broad;
                    newPlayer.high_data = (newPlayer.high_data || 0) + amount;
                    newPlayer.data_inventory.legal_high_broad = (newPlayer.data_inventory.legal_high_broad || 0) + amount;
                    totalDataGained += amount;
                }
                if (effects.quarterly_data.legal_high_focused > 0) {
                    const amount = effects.quarterly_data.legal_high_focused;
                    newPlayer.high_data = (newPlayer.high_data || 0) + amount;
                    newPlayer.data_inventory.legal_high_focused = (newPlayer.data_inventory.legal_high_focused || 0) + amount;
                    totalDataGained += amount;
                }
                
                if (totalDataGained > 0) {
                    messages.push({
                        text: `📊 數據供應商提供 ${totalDataGained} 單位數據`,
                        type: 'info'
                    });
                }
            }

            return {
                player: newPlayer,
                messages
            };
        },

        // ==========================================
        // 效果計算
        // ==========================================

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
                loyalty_drain: 0,
                power_capacity_bonus: 0,
                power_stability: 0,
                data_cost_reduction: 0,
                research_efficiency: 0,
                focused_data_bonus: 0,
                quarterly_data: {
                    legal_low: 0,
                    legal_high_broad: 0,
                    legal_high_focused: 0
                }
            };

            // 整合中單位的懲罰
            for (const unit of integratingUnits) {
                const penalty = config.SYSTEM.integration_penalty;
                const progress = 1 - (unit.remaining_turns / unit.total_turns);
                const penaltyMult = progress >= 0.5 ? 0.5 : 1;
                
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
                if (ongoing.compute_utilization_bonus) effects.compute_efficiency += ongoing.compute_utilization_bonus;
                if (ongoing.compute_efficiency_bonus) effects.compute_efficiency += ongoing.compute_efficiency_bonus;
                if (ongoing.energy_cost_reduction) effects.energy_cost_reduction += ongoing.energy_cost_reduction;
                if (ongoing.construction_speed) effects.construction_speed += ongoing.construction_speed;
                if (ongoing.construction_cost) effects.construction_cost += ongoing.construction_cost;
                if (ongoing.esg_bonus) effects.esg_bonus += ongoing.esg_bonus;
                
                if (ongoing.power_capacity_bonus) effects.power_capacity_bonus += ongoing.power_capacity_bonus;
                if (ongoing.power_stability) effects.power_stability = Math.max(effects.power_stability, ongoing.power_stability);
                
                if (ongoing.data_cost_reduction) effects.data_cost_reduction += ongoing.data_cost_reduction;
                if (ongoing.research_efficiency) effects.research_efficiency += ongoing.research_efficiency;
                if (ongoing.focused_data_bonus) effects.focused_data_bonus += ongoing.focused_data_bonus;
                
                if (ongoing.quarterly_data) {
                    const qd = ongoing.quarterly_data;
                    if (qd.type && qd.amount) {
                        if (effects.quarterly_data[qd.type] !== undefined) {
                            effects.quarterly_data[qd.type] += qd.amount;
                        }
                    }
                }
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
         * 修正：對應 asset_card_config.FUNCTIONAL_DEPTS
         */
        hasUnit(player, targetId) {
            const acquisitionState = player.acquisition_state || {};
            const acquiredUnits = acquisitionState.acquired_units || [];
            
            // 檢查已併購的
            if (acquiredUnits.some(u => u.target_id === targetId)) {
                return true;
            }
            
            // 檢查對應的 FUNCTIONAL_DEPTS（通過技術路線成立的部門）
            const config = window.AcquisitionConfig;
            const target = config?.getTarget(targetId);
            
            if (target?.related_functional_dept) {
                // 檢查 asset_card_state 中是否有此部門
                const assetCardState = player.asset_card_state || {};
                const departments = assetCardState.departments || {};
                if (departments[target.related_functional_dept]?.established) {
                    return true;
                }
            }
            
            // 子公司檢查
            if (target?.type === 'subsidiary' && target?.related_functional_dept) {
                const assetCardState = player.asset_card_state || {};
                const subsidiaries = assetCardState.subsidiaries || {};
                const subsidiaryId = targetId; // 子公司 ID 直接對應
                if (subsidiaries[subsidiaryId]?.established) {
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