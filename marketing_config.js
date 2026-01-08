// ============================================
// 行銷系統配置 - Marketing Config
// ============================================
// 功能：定義行銷增長公式的參數配置
// 設計：純數據配置，無邏輯混雜

const MARKETING_CONFIG = {
    // ==========================================
    // 行銷投資參數
    // ==========================================
    MARKETING_PARAMS: {
        // 基礎轉換率：每 √M 投資帶來的基礎粉絲數
        BASE_CONVERSION_RATE: 15000,
        
        // 邊際遞減起始門檻：超過此規模後效率開始下降
        DIMINISHING_THRESHOLD: 10000,
        
        // 全球人口上限（社群規模天花板）
        GLOBAL_POPULATION: 8000000000,
        
        // 最小有效投資額
        MIN_INVESTMENT: 1,
        
        // 單季最大有效投資額（超過此額度效率極低）
        MAX_EFFECTIVE_INVESTMENT: 500
    },
    
    // ==========================================
    // 口碑傳播參數
    // ==========================================
    WORD_OF_MOUTH_PARAMS: {
        // 基礎口碑係數：每個粉絲每季帶來新粉絲的基礎比例
        BASE_RATE: 0.002, // 0.2%
        
        // 全球人口上限
        GLOBAL_POPULATION: 8000000000,
        
        // 情緒對口碑的乘數
        SENTIMENT_MULTIPLIERS: {
            hostile: -0.5,    // 負面口碑，導致流失
            negative: 0,      // 幾乎無口碑效果
            neutral: 0.5,     // 微弱正面口碑
            positive: 1.5,    // 正常口碑傳播
            devoted: 3.0      // 狂熱傳播
        },
        
        // 活躍度對口碑的乘數
        ENGAGEMENT_MULTIPLIERS: {
            dead: 0.1,        // 死寂社群幾乎無口碑
            low: 0.3,
            moderate: 1.0,
            active: 2.0,
            viral: 4.0        // 病毒式傳播
        }
    },
    
    // ==========================================
    // 行銷行動預設選項
    // ==========================================
    INVESTMENT_PRESETS: [
        { amount: 5, label: '小規模', description: '試水溫行銷' },
        { amount: 15, label: '中規模', description: '穩定推廣' },
        { amount: 50, label: '大規模', description: '全力擴張' },
        { amount: 100, label: '豪華', description: '地毯式轟炸' },
        { amount: 200, label: '超大型', description: '全球級行銷' }
    ],
    
    // ==========================================
    // 規模里程碑（用於參考）
    // ==========================================
    SIZE_MILESTONES: {
        STARTUP: { size: 1000, name: '新創階段' },
        SMALL: { size: 10000, name: '小型社群' },
        GROWING: { size: 100000, name: '成長中' },
        MEDIUM: { size: 1000000, name: '中型社群' },
        LARGE: { size: 10000000, name: '大型社群' },
        MASSIVE: { size: 100000000, name: '巨型社群' },
        GLOBAL: { size: 1000000000, name: '全球級' }
    }
};

// ==========================================
// 全局配置暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.MARKETING_CONFIG = MARKETING_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MARKETING_CONFIG;
}

console.log('✓ Marketing Config loaded');
