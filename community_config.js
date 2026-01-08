// ============================================
// 社群系統配置 - Community Config
// ============================================
// 功能：定義社群三指標（規模、情緒、活躍度）的配置數據
// 設計：純數據配置，無邏輯混雜

const COMMUNITY_CONFIG = {
    // ==========================================
    // 社群規模定義
    // ==========================================
    SIZE_TIERS: {
        SMALL: {
            name: '小型社群',
            min: 1,
            max: 10000,
            icon: '👥',
            // 情緒變動難度係數（越大越難改變）
            sentiment_resistance: 0.8,
            // 基礎數據產出係數
            data_output_mult: 1.0,
            // 收入加成上限
            revenue_bonus_cap: 0.15
        },
        MEDIUM: {
            name: '中型社群',
            min: 10001,
            max: 100000,
            icon: '🏘️',
            sentiment_resistance: 1.2,
            data_output_mult: 2.5,
            revenue_bonus_cap: 0.35
        },
        LARGE: {
            name: '大型社群',
            min: 100001,
            max: Infinity,
            icon: '🌆',
            sentiment_resistance: 2.0,
            data_output_mult: 5.0,
            revenue_bonus_cap: 0.60
        }
    },

    // ==========================================
    // 社群情緒定義 (0-100)
    // ==========================================
    SENTIMENT: {
        // 情緒等級閾值
        LEVELS: {
            HOSTILE: { name: '厭惡', min: 0, max: 20, icon: '😠', color: '#ff3366' },
            NEGATIVE: { name: '不滿', min: 21, max: 40, icon: '😒', color: '#ff9944' },
            NEUTRAL: { name: '中立', min: 41, max: 60, icon: '😐', color: '#aaaaaa' },
            POSITIVE: { name: '友善', min: 61, max: 80, icon: '😊', color: '#44cc88' },
            DEVOTED: { name: '死忠', min: 81, max: 100, icon: '🤩', color: '#00f5ff' }
        },
        // 情緒對數據品質的影響
        DATA_QUALITY_WEIGHTS: {
            HOSTILE: { high_ratio: 0.05, low_ratio: 0.95 },   // 幾乎全是低級數據
            NEGATIVE: { high_ratio: 0.20, low_ratio: 0.80 },
            NEUTRAL: { high_ratio: 0.40, low_ratio: 0.60 },
            POSITIVE: { high_ratio: 0.65, low_ratio: 0.35 },
            DEVOTED: { high_ratio: 0.85, low_ratio: 0.15 }    // 大量高級數據
        },
        // 初始值
        DEFAULT: 50
    },

    // ==========================================
    // 社群活躍度定義 (0-100)
    // ==========================================
    ENGAGEMENT: {
        // 活躍度等級閾值
        LEVELS: {
            DEAD: { name: '死寂', min: 0, max: 20, icon: '💀', color: '#444444' },
            LOW: { name: '低迷', min: 21, max: 40, icon: '😴', color: '#666666' },
            MODERATE: { name: '一般', min: 41, max: 60, icon: '👀', color: '#888888' },
            ACTIVE: { name: '活躍', min: 61, max: 80, icon: '🔥', color: '#ff9944' },
            VIRAL: { name: '關注', min: 81, max: 100, icon: '⚡', color: '#ffcc00' }
        },
        // 活躍度對效果強度的乘數
        EFFECT_MULTIPLIERS: {
            DEAD: 0.2,      // 效果極弱
            LOW: 0.5,
            MODERATE: 1.0,  // 標準效果
            ACTIVE: 1.5,
            VIRAL: 2.0      // 效果倍增
        },
        // 初始值
        DEFAULT: 30
    },

    // ==========================================
    // 技術路線對社群的偏好係數
    // ==========================================
    ROUTE_PREFERENCES: {
        'Scaling Law': {
            community_dependency: 0.6,    // 對社群依賴度 (0-1)
            sentiment_sensitivity: 0.8,   // 情緒敏感度
            engagement_sensitivity: 0.7,  // 活躍度敏感度
            description: '依賴API訂閱，社群是重要收入來源'
        },
        'Multimodal': {
            community_dependency: 0.5,
            sentiment_sensitivity: 0.9,
            engagement_sensitivity: 0.8,
            description: '垂直應用需要用戶反饋，社群口碑重要'
        },
        'Efficiency': {
            community_dependency: 0.4,
            sentiment_sensitivity: 0.5,
            engagement_sensitivity: 0.4,
            description: '專利授權為主，較不依賴社群'
        },
        'Embodied': {
            community_dependency: 0.5,
            sentiment_sensitivity: 0.7,
            engagement_sensitivity: 0.9,
            description: '硬體預售需要高活躍度社群支持'
        },
        'OpenSource': {
            community_dependency: 1.0,    // 完全依賴社群
            sentiment_sensitivity: 1.0,
            engagement_sensitivity: 1.0,
            description: '開源生態完全依靠社群貢獻與傳播'
        },
        'Military': {
            community_dependency: 0.1,    // 幾乎不依賴
            sentiment_sensitivity: 0.3,
            engagement_sensitivity: 0.2,
            description: '國防合約為主，社群影響極小'
        }
    },

    // ==========================================
    // 社群收益計算參數
    // ==========================================
    REVENUE_PARAMS: {
        // 基礎收益公式係數
        BASE_REVENUE_PER_USER: 0.0001,  // 每用戶每季基礎收入 (M)
        // 情緒對收益的影響係數
        SENTIMENT_REVENUE_MULT: {
            HOSTILE: 0.3,
            NEGATIVE: 0.6,
            NEUTRAL: 1.0,
            POSITIVE: 1.3,
            DEVOTED: 1.8
        }
    },

    // ==========================================
    // 社群數據產出參數
    // ==========================================
    DATA_OUTPUT_PARAMS: {
        // 每萬用戶每季產出數據點
        BASE_DATA_PER_10K_USERS: 50,
        // 活躍度對產出量的影響
        ENGAGEMENT_OUTPUT_MULT: {
            DEAD: 0.1,
            LOW: 0.4,
            MODERATE: 1.0,
            ACTIVE: 1.8,
            VIRAL: 3.0
        }
    },

    // ==========================================
    // 社群戰略定義
    // ==========================================
    STRATEGIES: {
        marketing_small: {
            id: 'marketing_small',
            name: '小型行銷',
            description: '投入 $10M 進行基礎推廣活動',
            icon: '📢',
            effects: {
                marketing_investment: 10,  // 使用新的行銷投資機制
                engagement_change: 3,
                hype_change: 5
            },
            costs: {
                cash: 10
            }
        },
        marketing_medium: {
            id: 'marketing_medium',
            name: '中型行銷',
            description: '投入 $30M 進行全方位市場推廣',
            icon: '📺',
            effects: {
                marketing_investment: 30,
                engagement_change: 8,
                hype_change: 12
            },
            costs: {
                cash: 30
            }
        },
        marketing_large: {
            id: 'marketing_large',
            name: '大型行銷',
            description: '投入 $80M 進行全球級行銷戰役',
            icon: '🌐',
            effects: {
                marketing_investment: 80,
                engagement_change: 15,
                hype_change: 25,
                trust_change: -3  // 過度行銷略降信任
            },
            costs: {
                cash: 80
            }
        },
        activate: {
            id: 'activate',
            name: '活化社群',
            description: '舉辦活動提升社群活躍度',
            icon: '🎯',
            effects: {
                engagement_change: 15,
                sentiment_change: 3,
                hype_change: 8
            },
            costs: {
                cash: 15
            }
        },
        improve_sentiment: {
            id: 'improve_sentiment',
            name: '改善風評',
            description: '透過公關和回饋改善社群情緒',
            icon: '💝',
            effects: {
                sentiment_change: 12,
                trust_change: 5,
                hype_change: -3
            },
            costs: {
                cash: 20
            }
        },
        suppress_sentiment: {
            id: 'suppress_sentiment',
            name: '壓制輿論',
            description: '控制負面訊息傳播，但可能適得其反',
            icon: '🔇',
            effects: {
                sentiment_change: -8,       // 短期可能降低（引發反彈）
                engagement_change: -10,     // 活躍度下降
                trust_change: -5,
                compliance_risk_change: 5
            },
            costs: {
                cash: 5
            },
            // 特殊：有機率成功壓制負面情緒
            success_chance: 0.6,
            success_effects: {
                sentiment_change: 10,
                engagement_change: -15
            }
        },
        community_feedback: {
            id: 'community_feedback',
            name: '社群回饋',
            description: '收集社群意見改進產品，獲得數據和信任',
            icon: '📝',
            effects: {
                high_data_gain: 100,
                low_data_gain: 200,
                sentiment_change: 5,
                trust_change: 8,
            },
            costs: {
                cash: 8
            },
            // 需要一定活躍度
            requires: {
                min_engagement: 40
            }
        }
    },

    // ==========================================
    // 社群相關隨機事件觸發條件
    // ==========================================
    EVENT_TRIGGERS: {
        // 情緒極端時觸發
        sentiment_crisis: {
            condition: 'sentiment <= 20',
            event_pool: 'community_negative'
        },
        sentiment_boom: {
            condition: 'sentiment >= 80',
            event_pool: 'community_positive'
        },
        // 活躍度極端時觸發
        viral_moment: {
            condition: 'engagement >= 90',
            event_pool: 'viral_events'
        },
        community_death: {
            condition: 'engagement <= 10',
            event_pool: 'community_decline'
        }
    },

    // ==========================================
    // 社群事件池
    // ==========================================
    EVENT_POOLS: {
        community_negative: [
            { 
                name: '用戶抵制潮', 
                desc: '社群發起抵制活動，大量用戶流失',
                effects: { size_loss_rate: 0.2, hype: -15, trust: -10 }
            },
            { 
                name: '負面評論風暴', 
                desc: '社交媒體上出現大量負面評論',
                effects: { hype: -20, sentiment: -5, regulation: 5 }
            },
            { 
                name: '核心用戶出走', 
                desc: '影響力用戶公開批評並離開社群',
                effects: { sentiment: -10, engagement: -15, trust: -8 }
            }
        ],
        community_positive: [
            { 
                name: '社群口碑傳播', 
                desc: '死忠用戶自發推廣，帶來大量新用戶',
                effects: { size_growth_rate: 0.25, hype: 15, trust: 5 }
            },
            { 
                name: '用戶貢獻突破', 
                desc: '社群成員貢獻了重要的數據或代碼',
                effects: { high_data: 200, mp_boost: 1, sentiment: 5 }
            },
            { 
                name: '正面媒體報導', 
                desc: '媒體報導社群的正面故事',
                effects: { hype: 20, trust: 10, size_growth_rate: 0.1 }
            }
        ],
        viral_events: [
            { 
                name: '病毒式傳播', 
                desc: '產品在社交媒體上爆紅',
                effects: { size_growth_rate: 0.5, hype: 30, engagement: -10 }
            },
            { 
                name: '意見領袖加持', 
                desc: '知名人物公開推薦產品',
                effects: { hype: 25, trust: 10, sentiment: 8 }
            }
        ],
        community_decline: [
            { 
                name: '社群萎縮', 
                desc: '缺乏活力的社群持續流失用戶',
                effects: { size_loss_rate: 0.15, hype: -10 }
            },
            { 
                name: '競品搶走用戶', 
                desc: '競爭對手吸引走了沉默的用戶',
                effects: { size_loss_rate: 0.1, sentiment: -5 }
            }
        ]
    }
};

// ==========================================
// 全局配置暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.COMMUNITY_CONFIG = COMMUNITY_CONFIG;
}

// 支援模組化環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = COMMUNITY_CONFIG;
}

console.log('✓ Community Config loaded');