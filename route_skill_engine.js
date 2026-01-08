// ============================================
// 路線專屬技能引擎 - Route Skill Engine
// ============================================
// 功能：處理路線專屬技能的冷卻與執行邏輯
// 設計：純函數式，僅接收數據/返回結果
// 獨立於核心策略系統

const RouteSkillEngine = {
    
    // ==========================================
    // 冷卻機制
    // ==========================================
    
    /**
     * 初始化玩家的路線技能冷卻狀態
     * @param {Object} player - 玩家狀態
     * @returns {Object} 更新後的玩家狀態
     */
    initCooldowns: function(player) {
        if (!player.route_skill_cooldowns) {
            player.route_skill_cooldowns = {};
        }
        return player;
    },
    
    /**
     * 檢查技能是否可用（冷卻完成）
     * @param {Object} player - 玩家狀態
     * @param {string} skillId - 技能ID
     * @returns {boolean}
     */
    isSkillReady: function(player, skillId) {
        if (!player.route_skill_cooldowns) return true;
        const cooldown = player.route_skill_cooldowns[skillId] || 0;
        return cooldown <= 0;
    },
    
    /**
     * 取得技能剩餘冷卻回合
     * @param {Object} player - 玩家狀態
     * @param {string} skillId - 技能ID
     * @returns {number}
     */
    getRemainingCooldown: function(player, skillId) {
        if (!player.route_skill_cooldowns) return 0;
        return Math.max(0, player.route_skill_cooldowns[skillId] || 0);
    },
    
    /**
     * 設定技能進入冷卻
     * @param {Object} player - 玩家狀態
     * @param {string} skillId - 技能ID
     * @param {number} cooldownTurns - 冷卻回合數
     * @returns {Object} 更新後的玩家狀態
     */
    startCooldown: function(player, skillId, cooldownTurns) {
        const newPlayer = { ...player };
        if (!newPlayer.route_skill_cooldowns) {
            newPlayer.route_skill_cooldowns = {};
        }
        newPlayer.route_skill_cooldowns[skillId] = cooldownTurns;
        return newPlayer;
    },
    
    /**
     * 回合結束時更新所有冷卻
     * @param {Object} player - 玩家狀態
     * @returns {Object} 更新後的玩家狀態
     */
    tickCooldowns: function(player) {
        if (!player.route_skill_cooldowns) return player;
        
        const newPlayer = { ...player };
        newPlayer.route_skill_cooldowns = { ...player.route_skill_cooldowns };
        
        Object.keys(newPlayer.route_skill_cooldowns).forEach(skillId => {
            if (newPlayer.route_skill_cooldowns[skillId] > 0) {
                newPlayer.route_skill_cooldowns[skillId]--;
            }
        });
        
        return newPlayer;
    },
    
    // ==========================================
    // 技能執行
    // ==========================================
    
    /**
     * 執行路線基礎技能 (原 specialAction)
     * @param {Object} player - 玩家狀態
     * @param {Object} config - ROUTE_SKILL_CONFIG
     * @returns {Object} { newPlayer, message, messageType }
     */
    executeBaseSkill: function(player, config) {
        const route = player.route;
        const skillConfig = config.BASE_SKILLS[route];
        
        if (!skillConfig) {
            return {
                newPlayer: player,
                message: '無效的路線技能',
                messageType: 'error'
            };
        }
        
        // 檢查冷卻
        if (!this.isSkillReady(player, skillConfig.id)) {
            const remaining = this.getRemainingCooldown(player, skillConfig.id);
            return {
                newPlayer: player,
                message: `技能冷卻中，還需 ${remaining} 回合`,
                messageType: 'warning'
            };
        }
        
        let newPlayer = { ...player };
        let message = skillConfig.success_message;
        const messageType = skillConfig.message_type;
        
        // 應用效果
        const effects = skillConfig.effects;
        
        // 處理動態公式 (Embodied 路線)
        if (effects.cash_formula) {
            const hype = newPlayer.hype || 0;
            const techLevel = newPlayer.tech_levels?.[route] || 0;
            const amount = hype * 2 + techLevel * 10;
            newPlayer.cash = (newPlayer.cash || 0) + amount;
            message = skillConfig.success_message.replace('${amount}', amount.toFixed(1));
        } else if (effects.cash !== undefined) {
            newPlayer.cash = (newPlayer.cash || 0) + effects.cash;
        }
        
        if (effects.revenue_bonus !== undefined) {
            newPlayer.revenue_bonus = (newPlayer.revenue_bonus || 0) + effects.revenue_bonus;
        }
        
        if (effects.model_power !== undefined) {
            newPlayer.model_power = Math.max(1, (newPlayer.model_power || 0) + effects.model_power);
        }
        
        if (effects.compliance_risk !== undefined) {
            newPlayer.compliance_risk = Math.min(100, Math.max(0, 
                (newPlayer.compliance_risk || 0) + effects.compliance_risk));
        }
        
        if (effects.trust !== undefined) {
            newPlayer.trust = Math.max(0, (newPlayer.trust || 0) + effects.trust);
        }
        
        if (effects.hype !== undefined) {
            newPlayer.hype = Math.max(0, (newPlayer.hype || 0) + effects.hype);
        }
        
        if (effects.regulation !== undefined) {
            newPlayer.regulation = Math.min(100, Math.max(0,
                (newPlayer.regulation || 0) + effects.regulation));
        }
        
        // 數據資源
        if (effects.high_data !== undefined) {
            newPlayer.high_data = Math.max(0, (newPlayer.high_data || 0) + effects.high_data);
        }
        
        if (effects.low_data !== undefined) {
            newPlayer.low_data = Math.max(0, (newPlayer.low_data || 0) + effects.low_data);
        }
        
        // 模型算力 (MP)
        if (effects.mp !== undefined) {
            newPlayer.model_power = Math.max(0, (newPlayer.model_power || 0) + effects.mp);
        }
        
        // 設定冷卻
        newPlayer = this.startCooldown(newPlayer, skillConfig.id, skillConfig.cooldown);
        
        return {
            newPlayer,
            message,
            messageType
        };
    },
    
    /**
     * 執行藍圖解鎖的主動技能
     * @param {Object} player - 玩家狀態
     * @param {string} skillId - 技能ID
     * @param {Object} blueprintConfig - STRATEGY_BLUEPRINT_CONFIG
     * @param {Object} routeConfig - ROUTE_SKILL_CONFIG
     * @returns {Object} { newPlayer, message, messageType }
     */
    executeBlueprintSkill: function(player, skillId, blueprintConfig, routeConfig) {
        // 檢查技能是否已解鎖
        if (!player.blueprint_skills?.includes(skillId)) {
            return {
                newPlayer: player,
                message: '技能尚未解鎖',
                messageType: 'error'
            };
        }
        
        const skill = blueprintConfig.getSkill(skillId);
        if (!skill) {
            return {
                newPlayer: player,
                message: '無效的技能',
                messageType: 'error'
            };
        }
        
        // 檢查冷卻
        if (!this.isSkillReady(player, skillId)) {
            const remaining = this.getRemainingCooldown(player, skillId);
            return {
                newPlayer: player,
                message: `${skill.name} 冷卻中，還需 ${remaining} 回合`,
                messageType: 'warning'
            };
        }
        
        let newPlayer = { ...player };
        let message = `${skill.name} 發動成功！`;
        let messageType = 'success';
        
        // 依據技能類型處理效果
        // 這裡需要根據具體藍圖技能的 effects 結構來處理
        const effects = skill.effects || {};
        
        // 處理通用效果
        if (effects.cash_gain) {
            newPlayer.cash = (newPlayer.cash || 0) + effects.cash_gain;
            message += ` 現金 +$${effects.cash_gain}M`;
        }
        
        if (effects.alignment_gain) {
            newPlayer.alignment = Math.min(100, (newPlayer.alignment || 0) + effects.alignment_gain);
            message += ` 對齊度 +${effects.alignment_gain}`;
        }
        
        if (effects.trust_gain) {
            newPlayer.trust = (newPlayer.trust || 0) + effects.trust_gain;
            message += ` 信任度 +${effects.trust_gain}`;
        }
        
        if (effects.hype_gain) {
            newPlayer.hype = (newPlayer.hype || 0) + effects.hype_gain;
            message += ` 炒作度 +${effects.hype_gain}`;
        }
        
        // 處理消耗
        if (effects.pflops_cost) {
            // 需要檢查算力是否足夠
            const derived = window.GameEngine?.calculateDerived?.(newPlayer) || {};
            if ((derived.active_pflops || 0) < effects.pflops_cost) {
                return {
                    newPlayer: player,
                    message: `算力不足，需要 ${effects.pflops_cost} PFLOPS`,
                    messageType: 'error'
                };
            }
            // 算力消耗由其他系統處理
        }
        
        if (effects.cash_cost) {
            if ((newPlayer.cash || 0) < effects.cash_cost) {
                return {
                    newPlayer: player,
                    message: `現金不足，需要 $${effects.cash_cost}M`,
                    messageType: 'error'
                };
            }
            newPlayer.cash -= effects.cash_cost;
        }
        
        // 設定冷卻
        const cooldownTurns = effects.cooldown_turns || routeConfig.SYSTEM.default_cooldown;
        newPlayer = this.startCooldown(newPlayer, skillId, cooldownTurns);
        
        return {
            newPlayer,
            message,
            messageType
        };
    },
    
    // ==========================================
    // 輔助查詢
    // ==========================================
    
    /**
     * 取得所有技能的冷卻狀態
     * @param {Object} player - 玩家狀態
     * @param {Object} routeConfig - ROUTE_SKILL_CONFIG
     * @returns {Array} 技能冷卻狀態列表
     */
    getAllSkillStates: function(player, routeConfig) {
        const route = player.route;
        const availableSkills = routeConfig.getAvailableSkills(
            route, 
            player.blueprint_skills || []
        );
        
        return availableSkills.map(skill => ({
            ...skill,
            ready: this.isSkillReady(player, skill.id),
            cooldownRemaining: this.getRemainingCooldown(player, skill.id)
        }));
    }
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.RouteSkillEngine = RouteSkillEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteSkillEngine;
}

console.log('✓ Route Skill Engine loaded');