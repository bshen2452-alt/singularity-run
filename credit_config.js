// ============================================
// 信用評級系統配置 (Credit Rating Config)
// ============================================
// 設計：參考 S&P/Moody's 評級體系
// 純數據配置，無邏輯混雜

const CreditConfig = {
    
    // ==========================================
    // 信用評級等級定義 (參考標準普爾)
    // ==========================================
    CREDIT_RATINGS: {
        // 投資級 (Investment Grade)
        'AAA': {
            id: 'AAA',
            name: '最高評級',
            description: '財務狀況極佳，違約風險極低',
            color: '#00ff88',
            icon: '💎',
            tier: 'investment',
            baseInterestRate: 0.02,      // 2% 季度利率
            bondPremium: 0,              // 發債無溢價
            ipoMultiplier: 1.3,          // IPO 獲得 130% 市值
            stockIssueMultiplier: 1.2,   // 增發股票 120% 效率
            debtCapacity: 3.0,           // 可承擔市值 300% 的債務
            marketCapBonus: 1.15,        // 市值加成 15%
        },
        'AA': {
            id: 'AA',
            name: '優質評級',
            description: '財務狀況優良，違約風險很低',
            color: '#44ff88',
            icon: '🌟',
            tier: 'investment',
            baseInterestRate: 0.03,
            bondPremium: 0.05,           // 發債溢價 5%
            ipoMultiplier: 1.1,
            stockIssueMultiplier: 1.1,
            debtCapacity: 2.5,
            marketCapBonus: 1.10,
        },
        'A': {
            id: 'A',
            name: '良好評級',
            description: '財務狀況良好，違約風險低',
            color: '#88ff88',
            icon: '✨',
            tier: 'investment',
            baseInterestRate: 0.04,
            bondPremium: 0.10,
            ipoMultiplier: 1.0,
            stockIssueMultiplier: 1.0,
            debtCapacity: 2.0,
            marketCapBonus: 1.05,
        },
        'BBB': {
            id: 'BBB',
            name: '中等評級',
            description: '財務狀況中等，違約風險適中',
            color: '#ffff00',
            icon: '⚡',
            tier: 'investment',
            baseInterestRate: 0.05,
            bondPremium: 0.15,
            ipoMultiplier: 0.9,
            stockIssueMultiplier: 0.9,
            debtCapacity: 1.5,
            marketCapBonus: 1.0,
        },
        
        // 投機級 (Speculative Grade / Junk)
        'BB': {
            id: 'BB',
            name: '投機評級',
            description: '財務存在不確定性，有一定違約風險',
            color: '#ffaa00',
            icon: '⚠️',
            tier: 'speculative',
            baseInterestRate: 0.07,
            bondPremium: 0.25,
            ipoMultiplier: 0.75,
            stockIssueMultiplier: 0.8,
            debtCapacity: 1.2,
            marketCapBonus: 0.95,
            junkBondOnly: false,         // 還可以發行普通債
        },
        'B': {
            id: 'B',
            name: '高風險評級',
            description: '財務狀況脆弱，違約風險較高',
            color: '#ff6600',
            icon: '🔥',
            tier: 'speculative',
            baseInterestRate: 0.10,
            bondPremium: 0.40,
            ipoMultiplier: 0.6,
            stockIssueMultiplier: 0.7,
            debtCapacity: 1.0,
            marketCapBonus: 0.90,
            junkBondOnly: true,          // 只能發行垃圾債
        },
        'CCC': {
            id: 'CCC',
            name: '極高風險',
            description: '財務狀況危險，高度違約風險',
            color: '#ff3300',
            icon: '💀',
            tier: 'distressed',
            baseInterestRate: 0.15,
            bondPremium: 0.60,
            ipoMultiplier: 0.4,
            stockIssueMultiplier: 0.5,
            debtCapacity: 0.8,
            marketCapBonus: 0.80,
            junkBondOnly: true,
            emergencyOnly: true,         // 只能使用緊急貸款
        },
        'D': {
            id: 'D',
            name: '違約/破產邊緣',
            description: '已違約或即將違約',
            color: '#990000',
            icon: '☠️',
            tier: 'default',
            baseInterestRate: 0.25,
            bondPremium: 1.0,            // 發債成本翻倍
            ipoMultiplier: 0,            // 無法 IPO
            stockIssueMultiplier: 0,     // 無法增發
            debtCapacity: 0.5,
            marketCapBonus: 0.60,
            junkBondOnly: true,
            emergencyOnly: true,
            bankruptcyRisk: true,        // 有破產風險
        }
    },
    
    // ==========================================
    // 信用評級計算參數
    // ==========================================
    RATING_FACTORS: {
        // 財務健康指標權重
        weights: {
            debtToMarketCap: 0.25,       // 債務/市值比
            cashFlow: 0.20,              // 現金流狀況
            corporateImage: 0.20,        // 企業形象 (hype*0.4 + trust*0.6)
            profitability: 0.15,         // 盈利能力
            modelPower: 0.10,            // 技術實力 (MP Tier)
            tierBonus: 0.10,             // 發展階段加成
        },
        
        // 分數門檻 (滿分 100)
        thresholds: {
            'AAA': 90,
            'AA': 80,
            'A': 70,
            'BBB': 60,
            'BB': 45,
            'B': 30,
            'CCC': 15,
            'D': 0
        },
        
        // Tier 階段對評級的影響
        tierModifiers: {
            0: -20,    // 種子期：高度不確定，評級懲罰
            1: -10,    // Tier1：仍在早期，小幅懲罰
            2: 0,      // Tier2：正常經營
            3: 10,     // Tier3：成熟企業，小幅加成
            4: 15,     // Tier4：行業領先
            5: 20,     // Tier5：AGI 達成
        }
    },
    
    // ==========================================
    // 動態利率計算參數
    // ==========================================
    INTEREST_RATE_MODIFIERS: {
        // 基礎利率受全球參數影響
        globalRateMultiplier: 'R_base',  // 使用全球基礎利率參數
        
        // 市值影響利率（大公司借錢更便宜）
        marketCapTiers: [
            { threshold: 5000, modifier: -0.02 },   // 市值 > 5000M: -2%
            { threshold: 2000, modifier: -0.01 },   // 市值 > 2000M: -1%
            { threshold: 1000, modifier: 0 },       // 市值 > 1000M: 無影響
            { threshold: 500, modifier: 0.01 },     // 市值 > 500M: +1%
            { threshold: 0, modifier: 0.02 },       // 市值 < 500M: +2%
        ],
        
        // Hype 影響（高炒作可降低融資成本，但有風險）
        hypeEffect: {
            highThreshold: 70,
            highModifier: -0.01,         // Hype > 70: -1%
            lowThreshold: 30,
            lowModifier: 0.01,           // Hype < 30: +1%
        },
        
        // 最低/最高利率限制
        minRate: 0.01,                   // 最低 1% 季度利率
        maxRate: 0.30,                   // 最高 30% 季度利率
    },
    
    // ==========================================
    // 財務行動金額配置 (強調投機與風險)
    // ==========================================
    FINANCE_AMOUNTS: {
        // Tier 0 - 創業初期（資金匱乏，高風險選項）
        tier0: {
            founderWork: {
                cash: 25,                // 創始人打工：$25M（辛苦錢）
                mpPenalty: 0.20,         // MP成長懲罰提高到20%
            },
            pocContract: {
                cashPerQuarter: 20,      // PoC合約：$20M/季
                pflopsLock: 1,
                duration: 3,
            },
            betaPresale: {
                cash: 50,                // 預售Beta：$50M（提前透支）
                hype: 8,
                regulation: 5,
                trustPenalty: 3,         // 信任度小幅下降
            },
            applyGrant: {
                cashMin: 15,             // 獎助金：$15-35M（不穩定）
                cashMax: 35,
                successRateBase: 0.25,   // 基礎成功率降到25%
            },
            emergencyLoan: {
                cash: 40,                // 緊急貸款：$40M
                debtMultiplier: 1.5,     // 產生 150% 債務 = $60M
                cashThreshold: 20,       // 現金低於$20M才能用
            },
        },
        
        // Tier 1 - 債務融資（高利率，風險積累）
        tier1: {
            corporateBond: {
                cash: 80,                // 公司債：$80M
                debtMultiplier: 1.0,     // 1:1 債務
                // 實際債務 = cash × (1 + 信用溢價)
            },
            convertibleBond: {
                cash: 120,               // 可轉債：$120M
                debtMultiplier: 1.0,
                stockDilution: 1.15,     // 15% 稀釋
            },
            absLoan: {
                cashPerPflops: 15,       // ABS：每PFLOPS $15M
                debtPerPflops: 20,       // 產生 $20M 債務
            },
            junkBond: {
                cash: 200,               // 垃圾債：$200M（大額高風險）
                debtMultiplier: 1.4,     // 產生 140% 債務 = $280M
            },
        },
        
        // Tier 2 - 股權融資（IPO是關鍵轉折點）
        tier2: {
            ipo: {
                // 資金 = 市值 × 基礎倍率 × 信用評級倍率
                baseMultiplier: 0.25,    // 基礎：市值的25%
                hype: 35,
                regulation: 25,
                // 高評級 IPO 可獲得市值 32.5%（AAA: 0.25 × 1.3）
                // 低評級 IPO 可能只有 10%（B: 0.25 × 0.4）
            },
            stockIssue: {
                baseMultiplier: 0.12,    // 增發：市值的12%
                stockDilution: 1.18,     // 18% 稀釋
                hypePenalty: 5,          // Hype -5（股東不滿）
            },
            stockBuyback: {
                cashCost: 80,            // 回購成本：$80M
                hype: 12,
                stockDilutionReduction: 0.92,  // 稀釋率降8%
            },
        },
        
        // Tier 3 - 商業擴張（需要大量資本）
        tier3: {
            acquisition: {
                baseCost: 150,           // 併購基礎：$150M
                mpBoost: 5,
                seniorGain: 3,
                juniorGain: 4,
            },
            industryContract: {
                cashPerQuarter: 30,      // 產業合約：$30M/季
                pflopsLock: 3,
                duration: 8,
                trustBonus: 5,
            },
        },
    },
    
    // ==========================================
    // Tier 2 實體經營成本參考
    // ==========================================
    TIER2_COST_REFERENCE: {
        // 提醒：這些成本遠超單次IPO
        spaceConstruction: {
            edgeNode: 50,               // $50M
            standardCampus: 200,        // $200M
            hyperscaleCluster: 800,     // $800M
        },
        // 典型 IPO（市值 $1000M，BBB評級）= $1000 × 0.25 × 0.9 = $225M
        // 只夠建一個標準園區，無法覆蓋超算集群
    },
    
    // ==========================================
    // 債務危機觸發條件
    // ==========================================
    DEBT_CRISIS: {
        // 債務/市值比警戒線
        warningRatio: 0.8,              // 80%：警告
        criticalRatio: 1.2,             // 120%：危機
        defaultRatio: 1.5,              // 150%：違約
        
        // 危機效果
        effects: {
            warning: {
                message: '⚠️ 債務水平偏高，信用評級可能下調',
                hypePenalty: 5,
            },
            critical: {
                message: '🚨 債務危機！債權人施壓，營運受限',
                hypePenalty: 15,
                trustPenalty: 10,
                actionRestrictions: ['stockIssue', 'acquisition'],
            },
            default: {
                message: '💀 技術性違約！公司面臨重組或破產',
                triggerEnding: 'debt_trap',
            }
        }
    },
    
    // ==========================================
    // 評級變動事件
    // ==========================================
    RATING_EVENTS: {
        upgrade: {
            message: '📈 信用評級上調至 {rating}！融資成本降低',
            hypeBonus: 5,
            trustBonus: 3,
        },
        downgrade: {
            message: '📉 信用評級下調至 {rating}！融資成本上升',
            hypePenalty: 8,
            trustPenalty: 5,
        },
        junkStatus: {
            message: '⚠️ 信用評級降至投機級（{rating}），部分融資管道受限',
            hypePenalty: 15,
            regulationAdd: 10,
        },
        investmentGrade: {
            message: '🌟 信用評級升至投資級（{rating}），解鎖優惠融資',
            hypeBonus: 10,
            trustBonus: 5,
        }
    }
};

// 全局配置對象
window.CreditConfig = CreditConfig;

console.log('✓ Credit Config loaded');

// 支援模組化環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreditConfig;
}
