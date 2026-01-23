// ============================================
// 對手行為配置 (Rival Behavior Config)
// ============================================
// 設計：純數據配置，定義6條路線的行為模式
// 核心概念：對手根據自身狀態選擇行為，而非固定成長

const RivalBehaviorConfig = {

    // ==========================================
    // 行為類型定義
    // ==========================================
    BEHAVIOR_TYPES: {
        // 研發衝刺：高MP成長，高風險累積
        research_sprint: {
            id: 'research_sprint',
            name: '研發衝刺',
            icon: '🚀',
            mp_growth_mult: 1.5,
            effects: {
                entropy: { add: 3 },
                compliance_risk: { add: 2 },
                hype: { add: 2 }
            },
            global_market_action: null
        },
        
        // 穩健研發：正常MP成長，低風險
        steady_research: {
            id: 'steady_research',
            name: '穩健研發',
            icon: '📊',
            mp_growth_mult: 1.0,
            effects: {
                entropy: { add: 1 },
                trust: { add: 1 }
            },
            global_market_action: null
        },
        
        // 安全對齊：暫停MP成長，降低風險
        safety_alignment: {
            id: 'safety_alignment',
            name: '安全對齊',
            icon: '🛡️',
            mp_growth_mult: 0,
            effects: {
                entropy: { add: -8 },
                alignment: { add: 5 },
                trust: { add: 3 },
                hype: { add: -2 }
            },
            global_market_action: {
                type: 'rival_safety_focus',
                market_confidence: 2
            }
        },
        
        // 合規整改：MP減速，降低合規風險
        compliance_reform: {
            id: 'compliance_reform',
            name: '合規整改',
            icon: '📋',
            mp_growth_mult: 0.3,
            effects: {
                compliance_risk: { add: -10 },
                trust: { add: 5 },
                hype: { add: -5 },
                entropy: { add: -3 }
            },
            global_market_action: {
                type: 'rival_compliance_action',
                market_confidence: 1
            }
        },
        
        // 公關修復：MP減速，修復信任
        pr_recovery: {
            id: 'pr_recovery',
            name: '公關修復',
            icon: '📢',
            mp_growth_mult: 0.5,
            effects: {
                trust: { add: 8 },
                hype: { add: 5 },
                compliance_risk: { add: -2 }
            },
            global_market_action: null
        },
        
        // 里程碑衝刺：全力衝刺里程碑
        milestone_sprint: {
            id: 'milestone_sprint',
            name: '里程碑衝刺',
            icon: '🎯',
            mp_growth_mult: 2.0,
            effects: {
                entropy: { add: 5 },
                compliance_risk: { add: 3 },
                hype: { add: 5 }
            },
            global_market_action: {
                type: 'tech_breakthrough',
                scale: 0.3
            }
        },
        
        // 內部重組：里程碑失敗後的恢復
        internal_restructure: {
            id: 'internal_restructure',
            name: '內部重組',
            icon: '🔧',
            mp_growth_mult: 0,
            effects: {
                entropy: { add: -5 },
                trust: { add: -3 },
                hype: { add: -8 }
            },
            global_market_action: {
                type: 'rival_restructure',
                market_confidence: -2
            }
        },
        
        // 市場擴張：增加市值和hype
        market_expansion: {
            id: 'market_expansion',
            name: '市場擴張',
            icon: '📈',
            mp_growth_mult: 0.5,
            effects: {
                hype: { add: 10 },
                market_cap_mult: 1.05,
                compliance_risk: { add: 2 }
            },
            global_market_action: {
                type: 'rival_expansion',
                gpu_price: 1
            }
        },
        
        // 算力囤積：影響GPU價格
        compute_stockpile: {
            id: 'compute_stockpile',
            name: '算力囤積',
            icon: '🖥️',
            mp_growth_mult: 0.8,
            effects: {
                entropy: { add: 2 }
            },
            global_market_action: {
                type: 'massive_compute_purchase',
                scale: 0.5
            }
        },
        
        // 保守防禦：低成長，高穩定
        defensive_stance: {
            id: 'defensive_stance',
            name: '保守防禦',
            icon: '🏰',
            mp_growth_mult: 0.6,
            effects: {
                trust: { add: 2 },
                entropy: { add: -2 },
                compliance_risk: { add: -2 }
            },
            global_market_action: null
        }
    },

    // ==========================================
    // 路線行為風格定義
    // ==========================================
    ROUTE_BEHAVIOR_STYLES: {
        // Scaling Law - 激進擴張風格
        'Scaling Law': {
            style_key: 'aggressive_expansion',
            description: '追求規模化，高風險高回報',
            
            // 行為優先順序（正常狀態）
            default_behavior: 'research_sprint',
            
            // 行為選擇權重
            behavior_weights: {
                research_sprint: 0.4,
                steady_research: 0.2,
                milestone_sprint: 0.2,
                market_expansion: 0.15,
                compute_stockpile: 0.05
            },
            
            // 風險閾值（觸發防禦行為的條件）
            risk_thresholds: {
                entropy: { warning: 50, critical: 70 },
                compliance_risk: { warning: 45, critical: 65 },
                trust: { warning: 30, critical: 15 }
            },
            
            // 風險反應行為
            risk_responses: {
                high_entropy: { behavior: 'safety_alignment', probability: 0.6 },
                critical_entropy: { behavior: 'safety_alignment', probability: 0.9 },
                high_compliance: { behavior: 'compliance_reform', probability: 0.5 },
                critical_compliance: { behavior: 'compliance_reform', probability: 0.85 },
                low_trust: { behavior: 'pr_recovery', probability: 0.7 },
                critical_trust: { behavior: 'pr_recovery', probability: 0.95 }
            },
            
            // 里程碑相關
            milestone_behavior: {
                near_threshold: 'milestone_sprint',  // 接近門檻時
                after_success: 'market_expansion',   // 成功後
                after_failure: 'internal_restructure' // 失敗後
            },
            
            // 基礎成長參數
            base_mp_growth: 1.8,
            mp_variance: 0.5  // 成長隨機變異
        },
        
        // OpenSource - 穩健安全風格
        'OpenSource': {
            style_key: 'safety_first',
            description: '開源路線，重視社群與信任',
            
            default_behavior: 'steady_research',
            
            behavior_weights: {
                steady_research: 0.45,
                safety_alignment: 0.25,
                pr_recovery: 0.15,
                market_expansion: 0.1,
                research_sprint: 0.05
            },
            
            risk_thresholds: {
                entropy: { warning: 40, critical: 55 },
                compliance_risk: { warning: 35, critical: 50 },
                trust: { warning: 40, critical: 25 }
            },
            
            risk_responses: {
                high_entropy: { behavior: 'safety_alignment', probability: 0.8 },
                critical_entropy: { behavior: 'safety_alignment', probability: 1.0 },
                high_compliance: { behavior: 'compliance_reform', probability: 0.7 },
                critical_compliance: { behavior: 'compliance_reform', probability: 0.95 },
                low_trust: { behavior: 'pr_recovery', probability: 0.85 },
                critical_trust: { behavior: 'pr_recovery', probability: 1.0 }
            },
            
            milestone_behavior: {
                near_threshold: 'steady_research',
                after_success: 'pr_recovery',
                after_failure: 'safety_alignment'
            },
            
            base_mp_growth: 1.2,
            mp_variance: 0.2
        },
        
        // Efficiency - 平衡效率風格
        'Efficiency': {
            style_key: 'balanced_growth',
            description: '效率優化，平衡風險與回報',
            
            default_behavior: 'steady_research',
            
            behavior_weights: {
                steady_research: 0.35,
                research_sprint: 0.2,
                safety_alignment: 0.15,
                defensive_stance: 0.15,
                market_expansion: 0.15
            },
            
            risk_thresholds: {
                entropy: { warning: 45, critical: 60 },
                compliance_risk: { warning: 40, critical: 55 },
                trust: { warning: 35, critical: 20 }
            },
            
            risk_responses: {
                high_entropy: { behavior: 'safety_alignment', probability: 0.7 },
                critical_entropy: { behavior: 'safety_alignment', probability: 0.95 },
                high_compliance: { behavior: 'compliance_reform', probability: 0.65 },
                critical_compliance: { behavior: 'compliance_reform', probability: 0.9 },
                low_trust: { behavior: 'pr_recovery', probability: 0.75 },
                critical_trust: { behavior: 'pr_recovery', probability: 0.95 }
            },
            
            milestone_behavior: {
                near_threshold: 'research_sprint',
                after_success: 'steady_research',
                after_failure: 'defensive_stance'
            },
            
            base_mp_growth: 1.4,
            mp_variance: 0.25
        },
        
        // Multimodal - 創意爆發風格
        'Multimodal': {
            style_key: 'creative_burst',
            description: '多模態創意，高波動高炒作',
            
            default_behavior: 'research_sprint',
            
            behavior_weights: {
                research_sprint: 0.3,
                market_expansion: 0.25,
                milestone_sprint: 0.2,
                steady_research: 0.15,
                compute_stockpile: 0.1
            },
            
            risk_thresholds: {
                entropy: { warning: 55, critical: 75 },
                compliance_risk: { warning: 50, critical: 70 },
                trust: { warning: 25, critical: 10 }
            },
            
            risk_responses: {
                high_entropy: { behavior: 'safety_alignment', probability: 0.5 },
                critical_entropy: { behavior: 'safety_alignment', probability: 0.8 },
                high_compliance: { behavior: 'compliance_reform', probability: 0.45 },
                critical_compliance: { behavior: 'compliance_reform', probability: 0.75 },
                low_trust: { behavior: 'pr_recovery', probability: 0.6 },
                critical_trust: { behavior: 'pr_recovery', probability: 0.85 }
            },
            
            milestone_behavior: {
                near_threshold: 'milestone_sprint',
                after_success: 'market_expansion',
                after_failure: 'pr_recovery'
            },
            
            base_mp_growth: 1.6,
            mp_variance: 0.6  // 高波動
        },
        
        // Embodied - 硬體資本密集風格
        'Embodied': {
            style_key: 'hardware_heavy',
            description: '具身智慧，資本密集穩定成長',
            
            default_behavior: 'steady_research',
            
            behavior_weights: {
                steady_research: 0.35,
                compute_stockpile: 0.2,
                defensive_stance: 0.2,
                research_sprint: 0.15,
                market_expansion: 0.1
            },
            
            risk_thresholds: {
                entropy: { warning: 45, critical: 60 },
                compliance_risk: { warning: 45, critical: 60 },
                trust: { warning: 35, critical: 20 }
            },
            
            risk_responses: {
                high_entropy: { behavior: 'defensive_stance', probability: 0.7 },
                critical_entropy: { behavior: 'safety_alignment', probability: 0.9 },
                high_compliance: { behavior: 'compliance_reform', probability: 0.6 },
                critical_compliance: { behavior: 'compliance_reform', probability: 0.85 },
                low_trust: { behavior: 'pr_recovery', probability: 0.65 },
                critical_trust: { behavior: 'pr_recovery', probability: 0.9 }
            },
            
            milestone_behavior: {
                near_threshold: 'research_sprint',
                after_success: 'compute_stockpile',
                after_failure: 'defensive_stance'
            },
            
            base_mp_growth: 1.1,
            mp_variance: 0.2
        },
        
        // Military - 專業防禦風格
        'Military': {
            style_key: 'professional_defense',
            description: '軍事AI，高合規低風險',
            
            default_behavior: 'defensive_stance',
            
            behavior_weights: {
                defensive_stance: 0.35,
                steady_research: 0.3,
                safety_alignment: 0.2,
                research_sprint: 0.1,
                compliance_reform: 0.05
            },
            
            risk_thresholds: {
                entropy: { warning: 35, critical: 50 },
                compliance_risk: { warning: 30, critical: 45 },
                trust: { warning: 45, critical: 30 }
            },
            
            risk_responses: {
                high_entropy: { behavior: 'safety_alignment', probability: 0.85 },
                critical_entropy: { behavior: 'safety_alignment', probability: 1.0 },
                high_compliance: { behavior: 'compliance_reform', probability: 0.9 },
                critical_compliance: { behavior: 'compliance_reform', probability: 1.0 },
                low_trust: { behavior: 'pr_recovery', probability: 0.8 },
                critical_trust: { behavior: 'pr_recovery', probability: 1.0 }
            },
            
            milestone_behavior: {
                near_threshold: 'steady_research',
                after_success: 'defensive_stance',
                after_failure: 'safety_alignment'
            },
            
            base_mp_growth: 1.3,
            mp_variance: 0.15
        }
    },

    // ==========================================
    // 全球市場行為影響定義
    // ==========================================
    GLOBAL_MARKET_IMPACTS: {
        // 對手安全對齊行為
        rival_safety_focus: {
            market_confidence: 2,
            description: '對手強化安全措施，市場信心微升'
        },
        
        // 對手合規整改
        rival_compliance_action: {
            market_confidence: 1,
            interest_rate: -1,
            description: '對手配合監管，市場環境改善'
        },
        
        // 對手內部重組
        rival_restructure: {
            market_confidence: -2,
            description: '對手內部動盪，市場信心下降'
        },
        
        // 對手市場擴張
        rival_expansion: {
            gpu_price: 1,
            market_confidence: 1,
            description: '對手擴張推高算力需求'
        },
        
        // 對手大規模算力採購
        rival_compute_purchase: {
            gpu_price: 3,
            energy_price: 1,
            description: '對手囤積算力，推高GPU價格'
        },
        
        // 對手里程碑成功
        rival_milestone_success: {
            market_confidence: 5,
            gpu_price: 2,
            description: '對手技術突破，市場熱度上升'
        },
        
        // 對手里程碑失敗
        rival_milestone_failure: {
            market_confidence: -3,
            description: '對手研發受挫，市場信心動搖'
        },
        
        // 對手安全事故（entropy過高觸發）
        rival_safety_incident: {
            market_confidence: -8,
            interest_rate: 2,
            description: '對手發生安全事故，監管壓力上升'
        }
    },

    // ==========================================
    // 資源約束參數
    // ==========================================
    RESOURCE_CONSTRAINTS: {
        // 市值對MP成長的限制
        market_cap_mp_ratio: {
            base_cap: 100,        // 基礎市值
            mp_per_100_cap: 2.5,  // 每100市值允許的最大MP成長
            min_growth: 0.5       // 最低保底成長
        },
        
        // 全球市場對成長的影響
        global_market_effects: {
            gpu_price: {
                base: 100,
                penalty_per_10: 0.05  // GPU每高10點，成長-5%
            },
            market_confidence: {
                base: 100,
                bonus_per_10: 0.03    // 信心每高10點，成長+3%
            }
        }
    },

    // ==========================================
    // 輔助函數
    // ==========================================
    
    /**
     * 獲取路線行為風格
     */
    getRouteStyle: function(route) {
        return this.ROUTE_BEHAVIOR_STYLES[route] || this.ROUTE_BEHAVIOR_STYLES['Efficiency'];
    },
    
    /**
     * 獲取行為定義
     */
    getBehavior: function(behaviorId) {
        return this.BEHAVIOR_TYPES[behaviorId] || this.BEHAVIOR_TYPES['steady_research'];
    },
    
    /**
     * 獲取全球市場影響
     */
    getGlobalMarketImpact: function(impactId) {
        return this.GLOBAL_MARKET_IMPACTS[impactId] || null;
    }
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.RivalBehaviorConfig = RivalBehaviorConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RivalBehaviorConfig;
}

console.log('✓ Rival Behavior Config loaded');
