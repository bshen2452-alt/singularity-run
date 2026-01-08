// ============================================
// 策略藍圖系統引擎 - Strategy Blueprint Engine
// ============================================
// 功能：處理策略藍圖技能的啟用、效果計算
// 設計：純函數式，僅接收數據參數/返回計算結果
// 資源：共用商品系統的熟練度 (mastery.experience)

const StrategyBlueprintEngine = {
    
    // ==========================================
    // 初始化
    // ==========================================
    
    /**
     * 建立初始策略藍圖狀態
     * @returns {Object} 初始狀態
     */
    createInitialState() {
        return {
            activated_skills: [],           // 已啟用的技能ID列表
            total_mastery_spent: 0,         // 總共消耗的熟練度
            activation_history: []          // 啟用歷史記錄 [{ skillId, turn, cost }]
        };
    },
    
    /**
     * 確保玩家有策略藍圖狀態
     * @param {Object} player - 玩家狀態
     * @returns {Object} 更新後的玩家狀態
     */
    ensureBlueprintState(player) {
        if (!player.blueprint_state) {
            player.blueprint_state = this.createInitialState();
        }
        return player;
    },
    
    // ==========================================
    // 熟練度管理
    // ==========================================
    
    /**
     * 取得玩家當前可用熟練度
     * @param {Object} player - 玩家狀態
     * @returns {number} 可用熟練度
     */
    getAvailableMastery(player) {
        const totalMastery = player.product_state?.mastery?.experience || 0;
        const spentMastery = player.blueprint_state?.total_mastery_spent || 0;
        return Math.max(0, totalMastery - spentMastery);
    },
    
    /**
     * 取得玩家總熟練度
     * @param {Object} player - 玩家狀態
     * @returns {number} 總熟練度
     */
    getTotalMastery(player) {
        return player.product_state?.mastery?.experience || 0;
    },
    
    /**
     * 取得已消耗熟練度
     * @param {Object} player - 玩家狀態
     * @returns {number} 已消耗熟練度
     */
    getSpentMastery(player) {
        return player.blueprint_state?.total_mastery_spent || 0;
    },
    
    // ==========================================
    // 技能啟用
    // ==========================================
    
    /**
     * 檢查技能是否可以啟用
     * @param {Object} player - 玩家狀態
     * @param {string} skillId - 技能ID
     * @returns {Object} { canActivate, reason }
     */
    canActivateSkill(player, skillId) {
        // Tier 2 以上才開放策略藍圖
        if ((player.mp_tier || 0) < 2) {
            return { canActivate: false, reason: '需要達成 Tier 2 里程碑才能使用策略藍圖' };
        }
        
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        if (!config) {
            return { canActivate: false, reason: '策略藍圖系統未載入' };
        }
        
        const skill = config.getSkill(skillId);
        if (!skill) {
            return { canActivate: false, reason: '技能不存在' };
        }
        
        // 確保有藍圖狀態
        this.ensureBlueprintState(player);
        
        // 檢查是否已啟用
        if (player.blueprint_state.activated_skills.includes(skillId)) {
            return { canActivate: false, reason: '技能已啟用' };
        }

        
        // 檢查熟練度是否足夠
        const available = this.getAvailableMastery(player);
        if (available < skill.cost) {
            return { 
                canActivate: false, 
                reason: `熟練度不足，需要 ${skill.cost}，目前可用 ${available}` 
            };
        }
        
        return { canActivate: true, reason: null };
    },
    
    /**
     * 啟用技能
     * @param {Object} player - 玩家狀態
     * @param {string} skillId - 技能ID
     * @returns {Object} { success, player, message, type }
     */
    activateSkill(player, skillId) {
        const check = this.canActivateSkill(player, skillId);
        if (!check.canActivate) {
            return {
                success: false,
                player: player,
                message: check.reason,
                type: 'warning'
            };
        }
        
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        const skill = config.getSkill(skillId);
        
        // 深拷貝玩家狀態
        const newPlayer = JSON.parse(JSON.stringify(player));
        this.ensureBlueprintState(newPlayer);
        
        // 消耗熟練度
        newPlayer.blueprint_state.total_mastery_spent += skill.cost;
        
        // 記錄啟用
        newPlayer.blueprint_state.activated_skills.push(skillId);
        newPlayer.blueprint_state.activation_history.push({
            skillId: skillId,
            turn: newPlayer.turn_count || 0,
            cost: skill.cost
        });
        
        // 檢查專精獎勵解鎖
        const specBonuses = config.getActiveSpecializationBonuses(
            newPlayer.blueprint_state.activated_skills,
            newPlayer.route
        );
        
        let bonusMessage = '';
        if (specBonuses.length > 0) {
            const latestBonus = specBonuses[specBonuses.length - 1];
            const prevCount = newPlayer.blueprint_state.activated_skills.length - 1;
            // 檢查是否是新達成的獎勵
            const prevBonuses = config.getActiveSpecializationBonuses(
                newPlayer.blueprint_state.activated_skills.slice(0, -1),
                newPlayer.route
            );
            if (specBonuses.length > prevBonuses.length) {
                bonusMessage = ` 🎖️ 解鎖專精獎勵: ${latestBonus.desc}`;
            }
        }
        
        return {
            success: true,
            player: newPlayer,
            message: `✅ 啟用技能「${skill.name}」，消耗 ${skill.cost} 熟練度${bonusMessage}`,
            type: 'success'
        };
    },
    
    // ==========================================
    // 效果計算 - 每回合效果
    // ==========================================
    
    /**
     * 計算所有已啟用技能的每回合效果
     * @param {Object} player - 玩家狀態
     * @returns {Object} 彙整的每回合效果
     */
    calculatePerTurnEffects(player) {
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        if (!config || !player.blueprint_state) {
            return this._createEmptyPerTurnEffects();
        }
        
        const effects = this._createEmptyPerTurnEffects();
        const activatedSkills = player.blueprint_state.activated_skills || [];
        
        activatedSkills.forEach(skillId => {
            const skill = config.getSkill(skillId);
            if (!skill || !skill.effects) return;
            
            const e = skill.effects;
            
            // 累加每回合效果
            if (e.loyalty_per_turn) effects.loyalty += e.loyalty_per_turn;
            if (e.trust_per_turn) effects.trust += e.trust_per_turn;
            if (e.hype_per_turn) effects.hype += e.hype_per_turn;
            if (e.regulation_per_turn) effects.regulation += e.regulation_per_turn;
            if (e.engagement_per_turn) effects.engagement += e.engagement_per_turn;
            if (e.sentiment_per_turn) effects.sentiment += e.sentiment_per_turn;
            if (e.cash_per_turn) effects.cash += e.cash_per_turn;
            if (e.mp_per_turn) effects.mp += e.mp_per_turn;
            if (e.entropy_per_turn) effects.entropy += e.entropy_per_turn;
            if (e.compliance_risk_per_turn) effects.compliance_risk += e.compliance_risk_per_turn;
        });
        
        return effects;
    },
    
    /**
     * 建立空的每回合效果物件
     * @private
     */
    _createEmptyPerTurnEffects() {
        return {
            loyalty: 0,
            trust: 0,
            hype: 0,
            regulation: 0,
            engagement: 0,
            sentiment: 0,
            cash: 0,
            mp: 0,
            entropy: 0,
            compliance_risk: 0
        };
    },
    
    // ==========================================
    // 效果計算 - 乘數效果
    // ==========================================
    
    /**
     * 計算所有已啟用技能的乘數效果
     * @param {Object} player - 玩家狀態
     * @returns {Object} 彙整的乘數效果
     */
    calculateMultiplierEffects(player) {
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        if (!config || !player.blueprint_state) {
            return this._createDefaultMultipliers();
        }
        
        const multipliers = this._createDefaultMultipliers();
        const activatedSkills = player.blueprint_state.activated_skills || [];
        
        activatedSkills.forEach(skillId => {
            const skill = config.getSkill(skillId);
            if (!skill || !skill.effects) return;
            
            const e = skill.effects;
            
            // 乘數效果（相乘）
            if (e.hire_cost_mult) multipliers.hire_cost *= e.hire_cost_mult;
            if (e.salary_cost_mult) multipliers.salary_cost *= e.salary_cost_mult;
            if (e.mp_growth_mult) multipliers.mp_growth *= e.mp_growth_mult;
            if (e.compliance_risk_mult) multipliers.compliance_risk *= e.compliance_risk_mult;
            if (e.community_growth_mult) multipliers.community_growth *= e.community_growth_mult;
            if (e.regulation_penalty_mult) multipliers.regulation_penalty *= e.regulation_penalty_mult;
            if (e.community_risk_reduction) {
                multipliers.community_risk *= (1 - e.community_risk_reduction);
            }
        });
        
        // 加入專精獎勵
        const specBonuses = config.getActiveSpecializationBonuses(
            activatedSkills,
            player.route
        );
        specBonuses.forEach(bonus => {
            if (bonus.effect) {
                if (bonus.effect.trust_gain_mult) multipliers.trust_gain *= bonus.effect.trust_gain_mult;
                if (bonus.effect.trust_decay_mult) multipliers.trust_decay *= bonus.effect.trust_decay_mult;
                if (bonus.effect.hype_gain_mult) multipliers.hype_gain *= bonus.effect.hype_gain_mult;
                if (bonus.effect.revenue_mult) multipliers.revenue *= bonus.effect.revenue_mult;
                if (bonus.effect.cost_mult) multipliers.cost *= bonus.effect.cost_mult;
                if (bonus.effect.loyalty_decay_mult) multipliers.loyalty_decay *= bonus.effect.loyalty_decay_mult;
                if (bonus.effect.talent_efficiency) multipliers.talent_efficiency *= bonus.effect.talent_efficiency;
                if (bonus.effect.power_cost_mult) multipliers.power_cost *= bonus.effect.power_cost_mult;
                if (bonus.effect.space_efficiency) multipliers.space_efficiency *= bonus.effect.space_efficiency;
            }
        });
        
        return multipliers;
    },
    
    /**
     * 建立預設乘數物件（全部為1）
     * @private
     */
    _createDefaultMultipliers() {
        return {
            hire_cost: 1,
            salary_cost: 1,
            mp_growth: 1,
            compliance_risk: 1,
            community_growth: 1,
            community_risk: 1,
            regulation_penalty: 1,
            trust_gain: 1,
            trust_decay: 1,
            hype_gain: 1,
            revenue: 1,
            cost: 1,
            loyalty_decay: 1,
            talent_efficiency: 1,
            power_cost: 1,
            space_efficiency: 1
        };
    },
    
    // ==========================================
    // 效果計算 - 特殊效果
    // ==========================================
    
    /**
     * 計算所有已啟用技能的特殊效果
     * @param {Object} player - 玩家狀態
     * @returns {Object} 特殊效果標記
     */
    calculateSpecialEffects(player) {
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        if (!config || !player.blueprint_state) {
            return this._createEmptySpecialEffects();
        }
        
        const special = this._createEmptySpecialEffects();
        const activatedSkills = player.blueprint_state.activated_skills || [];
        
        activatedSkills.forEach(skillId => {
            const skill = config.getSkill(skillId);
            if (!skill || !skill.effects) return;
            
            const e = skill.effects;
            
            // 特殊效果標記
            if (e.alignment_no_compute) special.alignment_no_compute = true;
            
            // 條件性效果
            if (e.alignment_per_engagement) {
                special.alignment_per_engagement += e.alignment_per_engagement;
            }
            if (e.regulation_reduction_per_1k_community) {
                special.regulation_reduction_per_1k_community += e.regulation_reduction_per_1k_community;
            }
            if (e.pflops_per_10k_community) {
                special.pflops_per_10k_community += e.pflops_per_10k_community;
            }
            if (e.loyalty_trust_penalty) {
                special.loyalty_trust_penalties.push(e.loyalty_trust_penalty);
            }
            if (e.entropy_emergence) {
                special.entropy_emergence = e.entropy_emergence;
            }
            if (e.product_category_bonus) {
                special.product_category_bonuses.push(e.product_category_bonus);
            }
        });
        
        // 加入專精獎勵的特殊效果
        const specBonuses = config.getActiveSpecializationBonuses(
            activatedSkills,
            player.route
        );
        specBonuses.forEach(bonus => {
            if (bonus.effect) {
                if (bonus.effect.elite_retention) special.elite_retention = true;
                if (bonus.effect.regulation_immunity) special.regulation_immunity = true;
                if (bonus.effect.cash_crisis_shield) special.cash_crisis_shield = true;
                if (bonus.effect.facility_build_speed) {
                    special.facility_build_speed *= bonus.effect.facility_build_speed;
                }
                if (bonus.effect.hype_crash_resist) {
                    special.hype_crash_resist += bonus.effect.hype_crash_resist;
                }
                if (bonus.effect.hype_to_valuation) {
                    special.hype_to_valuation += bonus.effect.hype_to_valuation;
                }
            }
        });
        
        return special;
    },
    
    /**
     * 建立空的特殊效果物件
     * @private
     */
    _createEmptySpecialEffects() {
        return {
            alignment_no_compute: false,
            alignment_per_engagement: 0,
            regulation_reduction_per_1k_community: 0,
            pflops_per_10k_community: 0,
            loyalty_trust_penalties: [],
            entropy_emergence: null,
            product_category_bonuses: [],
            elite_retention: false,
            regulation_immunity: false,
            cash_crisis_shield: false,
            facility_build_speed: 1,
            hype_crash_resist: 0,
            hype_to_valuation: 0
        };
    },
    
    // ==========================================
    // 回合處理
    // ==========================================
    
    /**
     * 處理策略藍圖的回合更新效果
     * @param {Object} player - 玩家狀態
     * @param {Object} globalParams - 全局參數
     * @returns {Object} { player, effects, messages }
     */
    processTurnUpdate(player, globalParams) {
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        if (!config || !player.blueprint_state) {
            return { player, effects: null, messages: [] };
        }
        
        const newPlayer = JSON.parse(JSON.stringify(player));
        const messages = [];
        
        // 取得各類效果
        const perTurnEffects = this.calculatePerTurnEffects(newPlayer);
        const specialEffects = this.calculateSpecialEffects(newPlayer);
        
        // 應用每回合效果
        if (perTurnEffects.loyalty !== 0) {
            newPlayer.loyalty = Math.max(0, Math.min(100, 
                (newPlayer.loyalty || 0) + perTurnEffects.loyalty
            ));
        }
        if (perTurnEffects.trust !== 0) {
            newPlayer.trust = Math.max(0, Math.min(100, 
                (newPlayer.trust || 0) + perTurnEffects.trust
            ));
        }
        if (perTurnEffects.hype !== 0) {
            newPlayer.hype = Math.max(0, 
                (newPlayer.hype || 0) + perTurnEffects.hype
            );
        }
        if (perTurnEffects.regulation !== 0) {
            newPlayer.regulation = Math.max(0, Math.min(100, 
                (newPlayer.regulation || 0) + perTurnEffects.regulation
            ));
        }
        if (perTurnEffects.cash !== 0) {
            newPlayer.cash = (newPlayer.cash || 0) + perTurnEffects.cash;
        }
        if (perTurnEffects.mp !== 0) {
            newPlayer.model_power = Math.min(1000, 
                (newPlayer.model_power || 0) + perTurnEffects.mp
            );
        }
        if (perTurnEffects.entropy !== 0) {
            newPlayer.entropy = Math.max(0, Math.min(100, 
                (newPlayer.entropy || 0) + perTurnEffects.entropy
            ));
        }
        if (perTurnEffects.compliance_risk !== 0) {
            newPlayer.compliance_risk = Math.max(0, Math.min(100, 
                (newPlayer.compliance_risk || 0) + perTurnEffects.compliance_risk
            ));
        }
        
        // 應用社群效果
        if (newPlayer.community) {
            if (perTurnEffects.engagement !== 0) {
                newPlayer.community.engagement = Math.max(0, Math.min(100, 
                    (newPlayer.community.engagement || 0) + perTurnEffects.engagement
                ));
            }
            if (perTurnEffects.sentiment !== 0) {
                newPlayer.community.sentiment = Math.max(0, Math.min(100, 
                    (newPlayer.community.sentiment || 0) + perTurnEffects.sentiment
                ));
            }
        }
        
        // 處理忠誠度信任懲罰
        specialEffects.loyalty_trust_penalties.forEach(penalty => {
            if ((newPlayer.trust || 0) < penalty.trust_threshold) {
                newPlayer.loyalty = Math.max(0, 
                    (newPlayer.loyalty || 0) + penalty.loyalty_penalty_per_turn
                );
                messages.push({
                    text: `⚠️ 信任度過低，忠誠度 ${penalty.loyalty_penalty_per_turn}`,
                    type: 'warning'
                });
            }
        });
        
        // 處理混沌演算法湧現
        if (specialEffects.entropy_emergence) {
            const ee = specialEffects.entropy_emergence;
            if ((newPlayer.entropy || 0) > ee.threshold) {
                const bonus = ee.mp_bonus_min + Math.random() * (ee.mp_bonus_max - ee.mp_bonus_min);
                newPlayer.model_power = Math.min(1000, (newPlayer.model_power || 0) + bonus);
                messages.push({
                    text: `⚡ 混沌湧現！MP +${bonus.toFixed(1)}`,
                    type: 'success'
                });
            }
        }
        
        // 處理社群算力貢獻
        if (specialEffects.pflops_per_10k_community > 0) {
            const communitySize = newPlayer.community?.size || newPlayer.community_size || 0;
            const bonusPflops = (communitySize / 10000) * specialEffects.pflops_per_10k_community;
            if (!newPlayer.blueprint_bonus_pflops) {
                newPlayer.blueprint_bonus_pflops = 0;
            }
            newPlayer.blueprint_bonus_pflops = bonusPflops;
        }
        
        // 處理社群規模對監管的抵銷
        if (specialEffects.regulation_reduction_per_1k_community > 0) {
            const communitySize = newPlayer.community?.size || newPlayer.community_size || 0;
            const reduction = (communitySize / 1000) * specialEffects.regulation_reduction_per_1k_community;
            newPlayer.regulation = Math.max(0, (newPlayer.regulation || 0) - reduction);
        }
        
        // 處理活躍度對齊加成
        if (specialEffects.alignment_per_engagement > 0) {
            const engagement = newPlayer.community?.engagement || 0;
            const alignmentBonus = engagement * specialEffects.alignment_per_engagement;
            newPlayer.alignment = Math.min(100, (newPlayer.alignment || 0) + alignmentBonus);
        }
        
        return {
            player: newPlayer,
            effects: {
                perTurn: perTurnEffects,
                multipliers: this.calculateMultiplierEffects(newPlayer),
                special: specialEffects
            },
            messages
        };
    },
    
    // ==========================================
    // 查詢功能
    // ==========================================
    
    /**
     * 取得玩家的策略藍圖摘要
     * @param {Object} player - 玩家狀態
     * @returns {Object|null} 策略藍圖摘要，若 Tier < 2 則返回 null
     */
    getBlueprintSummary(player) {
        // Tier 2 以上才開放策略藍圖
        if ((player.mp_tier || 0) < 2) {
            return null;
        }
        
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        this.ensureBlueprintState(player);
        
        const route = player.route;
        const activated = player.blueprint_state.activated_skills || [];
        const routeSpec = config?.getRouteSpecialization(route);
        
        // 計算各類別已啟用數量
        const categoryCount = {
            internal: 0,
            external: 0,
            risk: 0
        };
        
        activated.forEach(skillId => {
            const skill = config?.getSkill(skillId);
            if (skill && categoryCount[skill.category] !== undefined) {
                categoryCount[skill.category]++;
            }
        });
        
        // 取得專精獎勵狀態
        const specBonuses = config?.getActiveSpecializationBonuses(activated, route) || [];
        const allSpecBonuses = routeSpec?.specialization_bonuses || [];
        
        return {
            route: route,
            routeName: routeSpec?.name || route,
            routeIcon: routeSpec?.icon || '📋',
            routeColor: routeSpec?.color || '#ffffff',
            coreResource: routeSpec?.core_resource_name || '',
            theme: routeSpec?.theme || '',
            
            totalMastery: this.getTotalMastery(player),
            spentMastery: this.getSpentMastery(player),
            availableMastery: this.getAvailableMastery(player),
            
            activatedCount: activated.length,
            maxSkills: config?.SYSTEM?.max_skills_per_route || 18,
            categoryCount: categoryCount,
            
            activatedSkills: activated,
            
            specializationBonuses: {
                achieved: specBonuses,
                all: allSpecBonuses,
                nextThreshold: allSpecBonuses.find(b => !specBonuses.includes(b))?.threshold || null
            }
        };
    },
    
    /**
     * 取得可啟用的技能列表
     * @param {Object} player - 玩家狀態
     * @returns {Array} 可啟用技能列表（含狀態），若 Tier < 2 則返回空陣列
     */
    getAvailableSkills(player) {
        // Tier 2 以上才開放策略藍圖
        if ((player.mp_tier || 0) < 2) {
            return [];
        }
        
        const config = window.STRATEGY_BLUEPRINT_CONFIG;
        if (!config) return [];
        
        this.ensureBlueprintState(player);
        
        const playerRoute = player.route;
        const activated = player.blueprint_state.activated_skills || [];
        const available = this.getAvailableMastery(player);
        
        // 取得所有路線的技能（而非僅玩家路線）
        const allSkills = Object.values(config.SKILLS);
        
        console.log('[Blueprint] getAvailableSkills: 總技能數量 =', allSkills.length, '玩家路線 =', playerRoute);
        
        return allSkills.map(skill => {
            const isActivated = activated.includes(skill.id);
            const canAfford = available >= skill.cost;
            const isOwnRoute = skill.route === playerRoute;
            
            return {
                ...skill,
                isActivated,
                canAfford,
                isOwnRoute,
                canActivate: !isActivated && canAfford,
                reason: isActivated ? '已啟用' : 
                        !canAfford ? `需要 ${skill.cost} 熟練度` : null
            };
        });
    }
};

// ============================================
// 引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    window.StrategyBlueprintEngine = StrategyBlueprintEngine;
    
    // 如果 GameEngine 已存在，掛載接口
    if (window.GameEngine) {
        window.GameEngine.activateBlueprintSkill = StrategyBlueprintEngine.activateSkill.bind(StrategyBlueprintEngine);
        window.GameEngine.getBlueprintSummary = StrategyBlueprintEngine.getBlueprintSummary.bind(StrategyBlueprintEngine);
    }
    
    console.log('✓ Strategy Blueprint Engine loaded');
})();