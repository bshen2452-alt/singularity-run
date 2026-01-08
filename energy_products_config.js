// ============================================
// 自營能源產品配置 (energy_products_config.js)
// ============================================
// 自營能源視為基礎設施類產品
// 歸類在商品系統，需要開發成本與等待期間
// Tier2 解鎖後可選擇開發

(function() {
    'use strict';

    var ENERGY_PRODUCTS_CONFIG = {
        // ==========================================
        // 產品類別
        // ==========================================
        CATEGORY: 'infrastructure',
        SUB_CATEGORY: 'energy',
        
        // ==========================================
        // 自營能源產品定義
        // ==========================================
        PRODUCTS: {
            // ==========================================
            // 核電站（長期投資型）
            // ==========================================
            nuclear_plant: {
                id: 'nuclear_plant',
                name: '自建核電站',
                icon: '⚛️',
                category: 'infrastructure',
                sub_category: 'energy',
                
                // 解鎖條件
                unlock_tier: 2,
                unlock_requirements: {
                    mp_tier: 2,
                    research_level: 50,
                    cash_minimum: 2000
                },
                
                // 開發階段
                development: {
                    research_required: 50,       // 需要研發投入
                    development_turns: 16,       // 16季開發期（4年）
                    base_cost: 2000,             // 基礎開發成本 $2000M
                    cost_scaling: 1.0,           // 無額外成本縮放
                    turing_boost: 0.15,          // Turing可加速15%
                    senior_boost: 0.05           // Senior可加速5%
                },
                
                // 營運階段
                operation: {
                    power_capacity: 500,         // 供電容量 500 PF
                    cost_per_pflops: 0.50,       // 營運成本係數（比合約低40%）
                    stability: 0.95,             // 極高穩定性
                    reliability: 0.98,           // 極高可靠性
                    maintenance_per_turn: 20,    // 每季維護 $20M
                    carbon_intensity: 0.10,      // 低碳排
                    lifespan_turns: 160          // 設計壽命40年(160季)
                },
                
                // 風險與影響
                risks: {
                    requires_license: true,      // 需要核能許可
                    regulation_risk: 0.30,       // 30%監管風險
                    public_opinion_impact: -5,   // 負面公眾形象
                    incident_probability: 0.01,  // 1%事故機率/季
                    incident_severity: 'catastrophic'
                },
                
                // 特殊效果
                effects: {
                    hype: -3,                    // 輕微負面炒作
                    regulation: 5,               // 增加監管壓力
                    esg_score: -2                // 部分ESG扣分
                },
                
                description: '自建核電站提供最穩定、最低成本的電力供應。需要大量前期投資（$2000M）和漫長的建設期（4年），但長期營運成本極低。需應對監管風險和公眾觀感問題。',
                
                pros: [
                    '最低營運成本（0.5x）',
                    '極高穩定性（95%）',
                    '大容量供電（500 PF）',
                    '低碳排放'
                ],
                cons: [
                    '高額初始投資',
                    '超長建設期',
                    '監管風險',
                    '公眾形象負面'
                ]
            },
            
            // ==========================================
            // 綠能發電場（環保形象型）
            // ==========================================
            renewable_farm: {
                id: 'renewable_farm',
                name: '綠能發電場',
                icon: '🌱',
                category: 'infrastructure',
                sub_category: 'energy',
                
                // 解鎖條件
                unlock_tier: 2,
                unlock_requirements: {
                    mp_tier: 2,
                    research_level: 30,
                    cash_minimum: 800
                },
                
                // 開發階段
                development: {
                    research_required: 30,
                    development_turns: 8,        // 8季開發期（2年）
                    base_cost: 800,              // 開發成本 $800M
                    cost_scaling: 1.0,
                    turing_boost: 0.10,
                    senior_boost: 0.05
                },
                
                // 營運階段
                operation: {
                    power_capacity: 150,         // 供電容量 150 PF
                    cost_per_pflops: 0.70,       // 營運成本係數
                    stability: 0.60,             // 中等穩定性
                    reliability: 0.85,           // 較高可靠性
                    maintenance_per_turn: 8,     // 每季維護 $8M
                    carbon_intensity: 0.05,      // 極低碳排
                    seasonal_variance: 0.25,     // 季節波動 ±25%
                    lifespan_turns: 100          // 設計壽命25年
                },
                
                // 季節影響
                seasonal_performance: {
                    spring: 1.05,
                    summer: 1.25,                // 夏季產能最高
                    autumn: 0.95,
                    winter: 0.75                 // 冬季產能最低
                },
                
                // 風險與影響
                risks: {
                    requires_license: false,
                    regulation_risk: 0.05,
                    public_opinion_impact: 5,    // 正面公眾形象
                    weather_dependency: 0.30     // 天氣依賴性
                },
                
                // 特殊效果
                effects: {
                    hype: 3,                     // 正面炒作
                    regulation: -2,              // 減少監管壓力
                    esg_score: 10,               // ESG大加分
                    loyalty: 2                   // 員工好感
                },
                
                description: '太陽能與風力混合發電場，環保形象極佳，ESG評分高。建設期較短（2年），投資適中。但受季節影響較大，夏季產能高、冬季產能低，供電容量有限。',
                
                pros: [
                    'ESG加分（+10）',
                    '正面公眾形象',
                    '較短建設期',
                    '低維護成本'
                ],
                cons: [
                    '季節波動大',
                    '供電容量有限',
                    '穩定性中等',
                    '天氣依賴'
                ]
            },
            
            // ==========================================
            // 燃氣電廠（彈性快速型）
            // ==========================================
            gas_plant: {
                id: 'gas_plant',
                name: '燃氣電廠',
                icon: '🔥',
                category: 'infrastructure',
                sub_category: 'energy',
                
                // 解鎖條件
                unlock_tier: 2,
                unlock_requirements: {
                    mp_tier: 2,
                    research_level: 20,
                    cash_minimum: 500
                },
                
                // 開發階段
                development: {
                    research_required: 20,
                    development_turns: 6,        // 6季開發期（1.5年）
                    base_cost: 500,              // 開發成本 $500M
                    cost_scaling: 1.0,
                    turing_boost: 0.08,
                    senior_boost: 0.04
                },
                
                // 營運階段
                operation: {
                    power_capacity: 250,         // 供電容量 250 PF
                    cost_per_pflops: 0.85,       // 營運成本係數
                    stability: 0.85,             // 較高穩定性
                    reliability: 0.92,           // 高可靠性
                    maintenance_per_turn: 12,    // 每季維護 $12M
                    carbon_intensity: 0.40,      // 中等碳排
                    fuel_cost_variance: 0.15,    // 燃料成本波動
                    flexible_output: true,       // 可彈性調整
                    lifespan_turns: 120          // 設計壽命30年
                },
                
                // 彈性調整能力
                flexibility: {
                    min_output: 0.30,            // 最低輸出30%
                    max_output: 1.10,            // 最高輸出110%
                    ramp_up_turns: 0,            // 即時升載
                    ramp_down_turns: 0           // 即時降載
                },
                
                // 風險與影響
                risks: {
                    requires_license: false,
                    regulation_risk: 0.10,
                    public_opinion_impact: -1,   // 輕微負面
                    fuel_price_exposure: 0.20    // 燃料價格曝險
                },
                
                // 特殊效果
                effects: {
                    hype: 0,
                    regulation: 1,
                    esg_score: -3                // ESG扣分
                },
                
                description: '燃氣電廠建設期最短（1.5年），投資門檻最低（$500M）。可彈性調整輸出以應對需求變化。但受燃料價格波動影響，且碳排放中等。',
                
                pros: [
                    '最短建設期',
                    '最低投資門檻',
                    '彈性輸出調整',
                    '較高穩定性'
                ],
                cons: [
                    '燃料成本波動',
                    '中等碳排放',
                    'ESG扣分',
                    '營運成本較高'
                ]
            }
        },
        
        // ==========================================
        // 比較表格數據
        // ==========================================
        COMPARISON_TABLE: {
            headers: ['項目', '核電站', '綠能發電場', '燃氣電廠'],
            rows: [
                ['開發成本', '$2000M', '$800M', '$500M'],
                ['建設期', '16季(4年)', '8季(2年)', '6季(1.5年)'],
                ['供電容量', '500 PF', '150 PF', '250 PF'],
                ['營運成本', '0.50x', '0.70x', '0.85x'],
                ['穩定性', '95%', '60%', '85%'],
                ['ESG影響', '-2', '+10', '-3'],
                ['公眾形象', '-5', '+5', '-1']
            ]
        }
    };

    // 註冊到全局
    window.ENERGY_PRODUCTS_CONFIG = ENERGY_PRODUCTS_CONFIG;
    
    // 整合到產品系統（如果存在）
    if (window.PRODUCTS_CONFIG) {
        // 添加類別
        if (!window.PRODUCTS_CONFIG.CATEGORIES) {
            window.PRODUCTS_CONFIG.CATEGORIES = {};
        }
        window.PRODUCTS_CONFIG.CATEGORIES.infrastructure = {
            name: '基礎設施',
            icon: '🏭',
            sub_categories: {
                energy: { name: '能源設施', icon: '⚡' }
            }
        };
        
        // 添加產品定義
        if (!window.PRODUCTS_CONFIG.PRODUCT_DEFINITIONS) {
            window.PRODUCTS_CONFIG.PRODUCT_DEFINITIONS = {};
        }
        Object.assign(
            window.PRODUCTS_CONFIG.PRODUCT_DEFINITIONS, 
            ENERGY_PRODUCTS_CONFIG.PRODUCTS
        );
        
        console.log('✓ 自營能源產品已整合至產品系統');
    }
    
    console.log('✓ Energy Products Config loaded (3 types: nuclear/renewable/gas)');

})();
