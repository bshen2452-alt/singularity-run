// ============================================
// 路線專屬技能配置 - Route Skill Config
// ============================================
// 功能：定義路線專屬主動技能（原 specialAction + 藍圖解鎖技能）
// 設計：純數據配置，無邏輯混雜
// 位置：獨立於核心策略，有專屬冷卻機制

const ROUTE_SKILL_CONFIG = {
    
    // ==========================================
    // 系統設定
    // ==========================================
    SYSTEM: {
        default_cooldown: 4,           // 預設冷卻回合數
        max_active_skills: 5,          // 最多同時啟用的主動技能數
        cooldown_reduction_cap: 0.5    // 冷卻縮減上限 (50%)
    },

    // ==========================================
    // 路線基礎技能 (原 specialAction)
    // 每條路線各一個，遊戲開始即可使用
    // ==========================================
    BASE_SKILLS: {
        'Scaling Law': {
            id: 'sl_base',
            name: '願景溢價會議',
            icon: '📈',
            cooldown: 4,
            description: '舉辦研討會，用你的願景換取資源',
            effects: {
                cash: 60,
                hype: 8
            },
            success_message: '獲得了募款！現金 +$60M',
            message_type: 'success'
        },
        
        'Multimodal': {
            id: 'mm_base',
            name: '互聯網專案開發',
            icon: '🎨',
            cooldown: 4,
            description: '為客戶開發方案，順便獲得數據素材',
            effects: {
                cash: 150,
                high_data: 200,
                compliance_risk: 15,
                trust: -5
            },
            success_message: '專案完成！現金 +$150M，高級數據+200，合規風險上升',
            message_type: 'warning'
        },
        
        'Efficiency': {
            id: 'ef_base',
            name: '核心算法專利授權',
            icon: '⚙️',
            cooldown: 4,
            description: '將優化技術授權給其他公司使用',
            effects: {
                cash: 80,
                hype: 5,
                trust: 2
            },
            success_message: '專利授權成功！現金 +$80M',
            message_type: 'success'
        },
        
        'Embodied': {
            id: 'eb_base',
            name: '機器人預售/發佈會',
            icon: '🤖',
            cooldown: 4,
            description: '舉辦盛大發佈會展示機器人產品',
            effects: {
                cash_formula: 'hype * 2 + tech_level * 10',  // 動態計算
                trust: -15,
                hype: 10
            },
            success_message: '機器人預售！現金 +${amount}M',
            message_type: 'success'
        },
        
        'OpenSource': {
            id: 'os_base',
            name: '志願者合作',
            icon: '🌐',
            cooldown: 4,
            description: '讓志願者助你一臂之力',
            effects: {
                low_data: 100,
                mp: 3,
                trust: 5,
                hype: 5
            },
            success_message: '合作結束！獲得低級數據 +100，MP +3',
            message_type: 'success'
        },
        
        'Military': {
            id: 'mi_base',
            name: '申請國防機密撥款',
            icon: '🎖️',
            cooldown: 4,
            description: '向國防部門申請機密專案研發經費',
            effects: {
                cash: 300,
                regulation: 10,
                trust: -20
            },
            success_message: '國防撥款到帳！現金 +$300M，監管壓力上升',
            message_type: 'warning'
        }
    },

    // ==========================================
    // 藍圖解鎖技能 (從 strategy_blueprint 引用)
    // 需要透過技術藍圖系統解鎖才能使用
    // ==========================================
    // 這些技能的定義在 strategy_blueprint_config.js
    // 此處僅定義哪些藍圖技能具有主動觸發能力
    BLUEPRINT_ACTIVE_SKILLS: {
        // 格式: skill_id -> 是否為主動技能
        // 這些技能需要在藍圖中解鎖後才會出現在技能欄
        
        // Multimodal 路線
        'mm_risk_005': true,     // 感官斷路器 (trigger_condition: manual)
        
        // Military 路線  
        'mi_external_004': true, // 危機製造者 (cooldown_turns: 8)
        'mi_risk_001': true,     // 焦土政策 (trigger_condition: manual)
        'mi_risk_005': true,     // 灰色行動小組 (cooldown_turns: 6)
        'mi_risk_006': true,     // 替罪羊計劃 (cooldown_turns: 5)
        
        // Embodied 路線
        'em_risk_001': true,     // 緊急回收指令 (cooldown_turns: 4)
        
        // Efficiency 路線
        'ef_risk_004': true,     // 技術債轉移 (cooldown_turns: 6)
        'ef_risk_006': true,     // 熵值熱沉機制 (cooldown_turns: 4)
        
        // Scaling Law 路線
        'sl_external_003': true, // 數據主權收購 (cooldown_turns: 8)
        'sl_external_005': true, // 算力證券化 (cooldown_turns: 12)
        'sl_risk_001': true      // 對齊度暴力破解 (cooldown_turns: 3)
    }
};

// ==========================================
// 輔助函數
// ==========================================

/**
 * 取得路線基礎技能
 * @param {string} routeId - 路線ID
 * @returns {Object|null} 基礎技能配置
 */
ROUTE_SKILL_CONFIG.getBaseSkill = function(routeId) {
    return this.BASE_SKILLS[routeId] || null;
};

/**
 * 檢查藍圖技能是否為主動技能
 * @param {string} skillId - 技能ID
 * @returns {boolean}
 */
ROUTE_SKILL_CONFIG.isActiveSkill = function(skillId) {
    return this.BLUEPRINT_ACTIVE_SKILLS[skillId] === true;
};

/**
 * 取得玩家可用的所有主動技能
 * @param {string} routeId - 路線ID
 * @param {Array} unlockedBlueprints - 已解鎖的藍圖技能ID列表
 * @returns {Array} 可用技能列表
 */
ROUTE_SKILL_CONFIG.getAvailableSkills = function(routeId, unlockedBlueprints = []) {
    const skills = [];
    
    // 加入基礎技能
    const baseSkill = this.getBaseSkill(routeId);
    if (baseSkill) {
        skills.push({
            ...baseSkill,
            type: 'base',
            source: 'route'
        });
    }
    
    // 加入已解鎖的藍圖主動技能（包含跨路線技能）
    if (unlockedBlueprints && Array.isArray(unlockedBlueprints)) {
        unlockedBlueprints.forEach(skillId => {
            if (this.isActiveSkill(skillId) && window.STRATEGY_BLUEPRINT_CONFIG) {
                const blueprintSkill = window.STRATEGY_BLUEPRINT_CONFIG.getSkill(skillId);
                if (blueprintSkill) {
                    const isOwnRoute = blueprintSkill.route === routeId;
                    skills.push({
                        ...blueprintSkill,
                        type: 'blueprint',
                        source: 'blueprint',
                        cooldown: blueprintSkill.effects?.cooldown_turns || this.SYSTEM.default_cooldown,
                        isOwnRoute: isOwnRoute,
                        effectMultiplier: isOwnRoute ? 1.0 : 0.5  // 跨路線效果減半
                    });
                }
            }
        });
    }
    
    return skills;
};

// ==========================================
// 全局配置暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.ROUTE_SKILL_CONFIG = ROUTE_SKILL_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ROUTE_SKILL_CONFIG;
}

console.log('✓ Route Skill Config loaded');
