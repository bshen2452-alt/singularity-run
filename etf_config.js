// ============================================
// ETF 投資系統配置
// ============================================
// 設計：純數據配置，無邏輯混雜
// 整合市場擾動系統：玩家與對手行為影響ETF價格

const ETF_CONFIG = {
    // ETF 產品定義
    ETF_PRODUCTS: {
        energy_etf: {
            id: 'energy_etf',
            name: '能源ETF',
            icon: '⚡',
            color: '#ff6600',
            description: '追蹤能源市場，價格受全球能源價格影響。大規模算力設施會推升能源需求。',
            basePrice: 100,           // 基準價格
            priceDriver: 'energy_price',   // GlobalMarket 索引名稱
            legacyDriver: 'E_Price',       // 舊版兼容
            volatility: 0.15,         // 波動率
            dividendYield: 0.02,      // 每季分紅率
            riskLevel: 'medium',
            marketSensitivity: {
                description: '受產業規模和設施擴張影響',
                factors: ['算力規模', '設施建設', '對手發展']
            }
        },
        tech_etf: {
            id: 'tech_etf',
            name: '科技ETF',
            icon: '💻',
            color: '#00f5ff',
            description: '追蹤AI/GPU產業，價格受GPU價格指數影響。Scaling Law路線會推升GPU需求。',
            basePrice: 100,
            priceDriver: 'gpu_price',
            legacyDriver: 'P_GPU',
            volatility: 0.25,         // 科技股波動較大
            dividendYield: 0.005,     // 低分紅，高成長
            riskLevel: 'high',
            marketSensitivity: {
                description: '受算力採購和技術路線影響',
                factors: ['算力採購', '技術路線', '產業里程碑']
            }
        },
        bond_etf: {
            id: 'bond_etf',
            name: '債券ETF',
            icon: '📊',
            color: '#00ff88',
            description: '追蹤債券市場，價格與利率反向。可對沖借貸成本上升風險。',
            basePrice: 100,
            priceDriver: 'interest_rate',
            legacyDriver: 'R_base',
            volatility: 0.05,         // 債券波動較小
            dividendYield: 0.03,      // 較高分紅
            riskLevel: 'low',
            inverseCorrelation: true, // 利率上升時債券價格下跌
            marketSensitivity: {
                description: '受信用風險和市場槓桿影響',
                factors: ['企業信用', '市場債務', '違約風險']
            }
        }
    },
    
    // 交易費用
    TRANSACTION_COSTS: {
        buyFee: 0.001,      // 買入手續費 0.1%
        sellFee: 0.001,     // 賣出手續費 0.1%
        minTransaction: 10  // 最小交易金額 $10M
    },
    
    // 投資限制
    INVESTMENT_LIMITS: {
        maxPerEtf: 0.30,           // 單一ETF最多佔投資組合30%
        maxTotalEtf: 0.50,         // ETF總投資最多佔市值50%
        cooldownTurns: 0           // 交易冷卻（0表示無冷卻）
    },
    
    // 價格歷史配置
    PRICE_HISTORY: {
        maxLength: 20,             // 保留最近20季價格歷史
        showTrend: true            // 顯示趨勢線
    },
    
    // 市場擾動配置
    MARKET_PERTURBATION: {
        enabled: true,
        minPlayerInfluence: 0.2,   // 玩家影響力門檻
        maxDeltaPerTurn: 0.1,      // 每回合最大變動
        displayMessages: true       // 顯示市場擾動訊息
    }
};

// 全局配置對象
window.ETF_CONFIG = ETF_CONFIG;

console.log('✓ ETF Config loaded');

// 支援模組化環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ETF_CONFIG;
}