// ============================================
// 自營能源產品配置 (energy_products_config.js)
// ============================================
// 設計原則：
//   1. 配合 AssetCardConfig.POWER_UPGRADES.renewable 研發階段解鎖
//      - Level 1: 解鎖燃氣發電
//      - Level 2: 解鎖綠能發電
//      - Level 3: 解鎖核能發電
//   2. 整合 ENERGY_CONFIG 現有參數（季節影響、碳排、可靠性）
//   3. 供電自用 + 販售電力獲利雙功能
// ============================================

(function() {
    'use strict';

    const ENERGY_PRODUCTS_CONFIG = {
        // ==========================================
        // 系統設定
        // ==========================================
        SYSTEM: {
            category: 'infrastructure',
            sub_category: 'energy',
            
            // 解鎖條件綁定 POWER_UPGRADES.renewable
            unlock_source: 'power.renewable',
            
            // 電力單位轉換
            power_unit: 'MW',           // 發電容量單位
            pflops_per_mw: 1.0,         // 每 MW 可供應的 PF 算力
            
            // 電力販售設定
            grid_sell_enabled: true,     // 是否可販售至電網
            grid_sell_price_ratio: 0.7,  // 售電價格為市價的 70%
            min_self_supply_ratio: 0.3,  // 最低自用比例 30%
            
            // 維護週期
            maintenance_interval: 4      // 每4季大修一次
        },
        
        // ==========================================
        // 自營能源產品定義
        // ==========================================
        PRODUCTS: {
            // ==========================================
            // Level 1: 燃氣發電廠
            // ==========================================
            gas_plant: {
                id: 'gas_plant',
                name: '自營燃氣電廠',
                icon: '🔥',
                category: 'infrastructure',
                sub_category: 'energy',
                
                // 解鎖條件（綁定 renewable Level 1）
                unlock: {
                    upgrade_path: 'power.renewable',
                    upgrade_level: 1,
                    mp_tier: 2,
                    cash_minimum: 400
                },
                
                // 開發階段
                development: {
                    development_turns: 4,        // 4季開發期（1年）
                    base_cost: 400,              // 開發成本 $400M
                    senior_required: 1,          // 需要1位Senior監督
                    turing_boost: 0.08,          // Turing可加速8%
                    senior_boost: 0.04           // Senior可加速4%
                },
                
                // 營運階段 - 配合 ENERGY_CONFIG 參數
                operation: {
                    // 發電容量
                    power_capacity_mw: 200,      // 200 MW 容量
                    power_capacity_pf: 200,      // 可供應 200 PF 算力
                    
                    // 成本結構（對標 ENERGY_CONFIG.POWER_CONTRACTS.gas_contract）
                    cost_per_pf: 0.85,           // 每PF每季成本係數（比市電低15%）
                    maintenance_per_turn: 10,    // 每季基礎維護 $10M
                    fuel_cost_variance: 0.15,    // 燃料成本波動 ±15%
                    
                    // 發電特性（對標 ENERGY_CONFIG.SEASONAL_DEMAND.source_performance）
                    source_type: 'gas',
                    stability: 0.85,             // 85% 穩定性
                    reliability: 0.92,           // 92% 可靠性
                    carbon_intensity: 0.40,      // 中等碳排
                    
                    // 彈性輸出（燃氣優勢）
                    flexible_output: true,
                    min_output: 0.30,            // 最低輸出30%
                    max_output: 1.10,            // 最高輸出110%
                    ramp_speed: 'instant',       // 即時調整
                    
                    // 設計壽命
                    lifespan_turns: 120          // 30年（120季）
                },
                
                // 季節表現（對標 ENERGY_CONFIG.SEASONAL_DEMAND）
                seasonal_performance: {
                    spring: 1.0,
                    summer: 1.0,
                    autumn: 1.0,
                    winter: 1.0
                },
                
                // 風險與影響
                risks: {
                    requires_license: false,
                    regulation_risk: 0.10,
                    public_opinion_impact: -1,
                    fuel_price_exposure: 0.20    // 燃料價格曝險
                },
                
                // 效果影響（對接其他系統）
                effects: {
                    hype: 0,
                    regulation: 1,
                    esg_score: -3,
                    energy_independence: 0.3     // 能源自主度 +30%
                },
                
                description: '自營燃氣電廠建設期短（1年），投資門檻適中（$400M）。可彈性調整輸出應對算力需求變化，多餘電力可售回電網獲利。但受燃料價格波動影響，ESG有扣分。',
                
                pros: ['建設期短（4季）', '彈性輸出調整', '穩定供電', '可售電獲利'],
                cons: ['燃料成本波動', '中等碳排', 'ESG扣分（-3）']
            },
            
            // ==========================================
            // Level 2: 綠能發電場
            // ==========================================
            renewable_farm: {
                id: 'renewable_farm',
                name: '綠能發電場',
                icon: '🌱',
                category: 'infrastructure',
                sub_category: 'energy',
                
                // 解鎖條件（綁定 renewable Level 2）
                unlock: {
                    upgrade_path: 'power.renewable',
                    upgrade_level: 2,
                    mp_tier: 2,
                    cash_minimum: 600
                },
                
                // 開發階段
                development: {
                    development_turns: 6,        // 6季開發期（1.5年）
                    base_cost: 600,              // 開發成本 $600M
                    senior_required: 1,
                    turing_boost: 0.10,
                    senior_boost: 0.05
                },
                
                // 營運階段
                operation: {
                    power_capacity_mw: 150,      // 150 MW 容量
                    power_capacity_pf: 150,      // 可供應 150 PF
                    
                    // 成本結構
                    cost_per_pf: 0.70,           // 每PF成本係數（低於燃氣）
                    maintenance_per_turn: 6,     // 每季維護 $6M（低維護）
                    fuel_cost_variance: 0,       // 無燃料成本
                    
                    // 發電特性
                    source_type: 'renewable',    // 混合：solar + wind
                    composition: { solar: 0.6, wind: 0.4 },
                    stability: 0.60,             // 60% 穩定性（受天氣影響）
                    reliability: 0.85,           // 85% 可靠性
                    carbon_intensity: 0.05,      // 極低碳排
                    
                    // 輸出特性（受季節天氣影響）
                    flexible_output: false,
                    weather_dependency: 0.30,    // 30% 天氣依賴
                    seasonal_variance: 0.25,     // 季節波動 ±25%
                    
                    lifespan_turns: 100          // 25年（100季）
                },
                
                // 季節表現（對標 ENERGY_CONFIG.SEASONAL_DEMAND.source_performance）
                seasonal_performance: {
                    spring: 1.05,                // 春：適中
                    summer: 1.25,                // 夏：太陽能最佳
                    autumn: 0.95,                // 秋：略降
                    winter: 0.75                 // 冬：最低
                },
                
                risks: {
                    requires_license: false,
                    regulation_risk: 0.05,
                    public_opinion_impact: 5,
                    weather_dependency: 0.30
                },
                
                effects: {
                    hype: 3,
                    regulation: -2,
                    esg_score: 10,
                    loyalty: 2,
                    energy_independence: 0.25
                },
                
                description: '太陽能與風力混合發電場，環保形象極佳（ESG+10）。營運成本低但受季節影響大，夏季產能最高、冬季最低。適合搭配其他電源或儲能系統使用。',
                
                pros: ['ESG大加分（+10）', '正面公眾形象', '低維護成本', '無燃料成本'],
                cons: ['季節波動大（±25%）', '穩定性較低（60%）', '天氣依賴']
            },
            
            // ==========================================
            // Level 3: 模組化小型核電站 (SMR)
            // ==========================================
            nuclear_smr: {
                id: 'nuclear_smr',
                name: '模組化核電站(SMR)',
                icon: '⚛️',
                category: 'infrastructure',
                sub_category: 'energy',
                
                // 解鎖條件（綁定 renewable Level 3）
                unlock: {
                    upgrade_path: 'power.renewable',
                    upgrade_level: 3,
                    mp_tier: 3,
                    cash_minimum: 1500,
                    requires_license: true       // 需要核能許可
                },
                
                // 開發階段
                development: {
                    development_turns: 12,       // 12季開發期（3年）
                    base_cost: 1500,             // 開發成本 $1500M
                    senior_required: 2,          // 需要2位Senior
                    turing_boost: 0.15,
                    senior_boost: 0.05,
                    
                    // 分階段建設
                    phases: [
                        { name: '許可取得', turns: 2, cost_ratio: 0.1 },
                        { name: '基礎建設', turns: 4, cost_ratio: 0.3 },
                        { name: '反應爐安裝', turns: 4, cost_ratio: 0.4 },
                        { name: '測試與啟用', turns: 2, cost_ratio: 0.2 }
                    ]
                },
                
                // 營運階段
                operation: {
                    power_capacity_mw: 400,      // 400 MW 容量
                    power_capacity_pf: 400,      // 可供應 400 PF
                    
                    // 成本結構（對標 ENERGY_CONFIG.POWER_CONTRACTS.nuclear_contract）
                    cost_per_pf: 0.50,           // 最低營運成本
                    maintenance_per_turn: 15,    // 每季維護 $15M
                    fuel_cost_variance: 0.02,    // 極低燃料波動
                    
                    // 發電特性
                    source_type: 'nuclear',
                    stability: 0.95,             // 95% 極高穩定性
                    reliability: 0.98,           // 98% 極高可靠性
                    carbon_intensity: 0.10,      // 極低碳排
                    
                    // 輸出特性
                    flexible_output: false,      // 核電不適合頻繁調整
                    base_load: true,             // 適合基載運轉
                    min_output: 0.70,            // 最低輸出70%
                    max_output: 1.05,            // 最高輸出105%
                    
                    lifespan_turns: 160          // 40年（160季）
                },
                
                // 季節表現（核電幾乎不受季節影響）
                seasonal_performance: {
                    spring: 1.0,
                    summer: 0.95,                // 夏季略降（冷卻水溫）
                    autumn: 1.0,
                    winter: 1.0
                },
                
                risks: {
                    requires_license: true,
                    regulation_risk: 0.30,       // 高監管風險
                    public_opinion_impact: -5,   // 負面公眾形象
                    incident_probability: 0.005, // 0.5%/季 事故風險
                    incident_severity: 'catastrophic'
                },
                
                effects: {
                    hype: -3,
                    regulation: 5,
                    esg_score: -2,               // 部分ESG扣分（爭議性）
                    energy_independence: 0.6,
                    tech_reputation: 5           // 技術聲譽加分
                },
                
                description: '模組化小型核電站(SMR)提供最穩定、最低成本的電力供應。建設期較長（3年）且需要核能許可證，但長期營運效益極佳。需妥善管理監管風險與公眾觀感。',
                
                pros: ['最低營運成本（0.5x）', '極高穩定性（95%）', '大容量供電（400 PF）', '低碳排'],
                cons: ['高額初始投資（$1500M）', '長建設期（12季）', '需要核能許可', '公眾形象負面']
            }
        },
        
        // ==========================================
        // 電力販售配置
        // ==========================================
        POWER_SALES: {
            // 售電價格計算
            pricing: {
                // 基準價格 = 市電價格 × grid_sell_price_ratio
                base_ratio: 0.7,
                
                // 季節加成（配合 ENERGY_CONFIG.SEASONAL_DEMAND）
                seasonal_premium: {
                    spring: 0,
                    summer: 0.15,    // 夏季電價高，售電有額外收益
                    autumn: -0.05,
                    winter: 0.10
                },
                
                // 穩定供應獎勵（連續供電季數）
                stability_bonus: {
                    4: 0.02,         // 連續4季：+2%
                    8: 0.05,         // 連續8季：+5%
                    12: 0.08         // 連續12季：+8%
                }
            },
            
            // 容量合約選項
            capacity_contracts: {
                spot: {
                    name: '即期市場',
                    description: '依當季市價出售多餘電力',
                    price_volatility: 0.20,
                    commitment: 0
                },
                quarterly: {
                    name: '季度合約',
                    description: '鎖定1季售電量與價格',
                    price_volatility: 0.10,
                    commitment: 1,
                    price_premium: 0.05
                },
                annual: {
                    name: '年度合約',
                    description: '鎖定4季售電量與價格',
                    price_volatility: 0.02,
                    commitment: 4,
                    price_premium: 0.10
                }
            }
        },
        
        // ==========================================
        // 電力分配策略
        // ==========================================
        POWER_ALLOCATION: {
            strategies: {
                self_priority: {
                    id: 'self_priority',
                    name: '自用優先',
                    description: '優先滿足自身算力需求，剩餘電力售出',
                    self_ratio: 1.0,             // 自用比例動態計算
                    sell_ratio: 'surplus'        // 售出剩餘
                },
                balanced: {
                    id: 'balanced',
                    name: '平衡模式',
                    description: '固定70%自用、30%售出',
                    self_ratio: 0.7,
                    sell_ratio: 0.3
                },
                profit_max: {
                    id: 'profit_max',
                    name: '獲利優先',
                    description: '維持最低自用（30%），最大化售電收入',
                    self_ratio: 0.3,             // 最低自用
                    sell_ratio: 0.7,
                    requires_backup: true        // 需要備用電源
                }
            },
            
            default_strategy: 'self_priority'
        },
        
        // ==========================================
        // 比較表格數據
        // ==========================================
        COMPARISON_TABLE: {
            headers: ['項目', '燃氣電廠', '綠能發電場', '核電站(SMR)'],
            rows: [
                ['解鎖條件', 'Renewable Lv1', 'Renewable Lv2', 'Renewable Lv3'],
                ['開發成本', '$400M', '$600M', '$1500M'],
                ['建設期', '4季(1年)', '6季(1.5年)', '12季(3年)'],
                ['供電容量', '200 PF', '150 PF', '400 PF'],
                ['營運成本', '0.85x', '0.70x', '0.50x'],
                ['穩定性', '85%', '60%', '95%'],
                ['季節影響', '無', '±25%', '極小'],
                ['ESG影響', '-3', '+10', '-2'],
                ['彈性調整', '✓', '✗', '有限']
            ]
        }
    };

    // ==========================================
    // 輔助函數
    // ==========================================
    
    /**
     * 檢查玩家是否可解鎖特定能源產品
     */
    ENERGY_PRODUCTS_CONFIG.canUnlockProduct = function(player, productId) {
        const product = this.PRODUCTS[productId];
        if (!product) return { canUnlock: false, reason: '產品不存在' };
        
        const unlock = product.unlock;
        
        // 檢查 MP Tier
        if ((player.mp_tier || 0) < unlock.mp_tier) {
            return { canUnlock: false, reason: `需要達到 Tier ${unlock.mp_tier}` };
        }
        
        // 檢查現金
        if ((player.cash || 0) < unlock.cash_minimum) {
            return { canUnlock: false, reason: `需要至少 $${unlock.cash_minimum}M 現金` };
        }
        
        // 檢查升級路徑等級
        const [assetType, pathId] = unlock.upgrade_path.split('.');
        const upgradeLevel = player.asset_upgrades?.[assetType]?.[pathId] || 0;
        if (upgradeLevel < unlock.upgrade_level) {
            return { 
                canUnlock: false, 
                reason: `需要 ${assetType}.${pathId} 達到 Level ${unlock.upgrade_level}（目前 Level ${upgradeLevel}）`
            };
        }
        
        // 檢查核能許可
        if (unlock.requires_license && !player.nuclear_license) {
            return { canUnlock: false, reason: '需要核能許可證' };
        }
        
        return { canUnlock: true };
    };
    
    /**
     * 取得玩家可用的能源產品列表
     */
    ENERGY_PRODUCTS_CONFIG.getAvailableProducts = function(player) {
        const available = [];
        
        for (const [productId, product] of Object.entries(this.PRODUCTS)) {
            const check = this.canUnlockProduct(player, productId);
            available.push({
                id: productId,
                ...product,
                canUnlock: check.canUnlock,
                unlockReason: check.reason
            });
        }
        
        return available;
    };
    
    /**
     * 計算能源產品的季節產能
     */
    ENERGY_PRODUCTS_CONFIG.getSeasonalCapacity = function(productId, seasonId) {
        const product = this.PRODUCTS[productId];
        if (!product) return 0;
        
        const baseCapacity = product.operation.power_capacity_pf;
        const seasonalMult = product.seasonal_performance?.[seasonId] || 1.0;
        
        return Math.round(baseCapacity * seasonalMult);
    };
    
    /**
     * 計算售電收入
     */
    ENERGY_PRODUCTS_CONFIG.calculateSalesRevenue = function(
        surplusPower, 
        marketPrice, 
        seasonId, 
        contractType = 'spot',
        consecutiveSupplyTurns = 0
    ) {
        const pricing = this.POWER_SALES.pricing;
        const contract = this.POWER_SALES.capacity_contracts[contractType];
        
        // 基準售價
        let sellPrice = marketPrice * pricing.base_ratio;
        
        // 季節加成
        sellPrice *= (1 + (pricing.seasonal_premium[seasonId] || 0));
        
        // 合約加成
        sellPrice *= (1 + (contract?.price_premium || 0));
        
        // 穩定供應獎勵
        for (const [turns, bonus] of Object.entries(pricing.stability_bonus)) {
            if (consecutiveSupplyTurns >= parseInt(turns)) {
                sellPrice *= (1 + bonus);
            }
        }
        
        return {
            revenue: Math.round(surplusPower * sellPrice * 100) / 100,
            sell_price: Math.round(sellPrice * 100) / 100,
            surplus_power: surplusPower
        };
    };

    // ==========================================
    // 全局註冊
    // ==========================================
    window.ENERGY_PRODUCTS_CONFIG = ENERGY_PRODUCTS_CONFIG;
    
    // 整合到產品系統（如果存在）
    if (window.PRODUCTS_CONFIG) {
        if (!window.PRODUCTS_CONFIG.CATEGORIES) {
            window.PRODUCTS_CONFIG.CATEGORIES = {};
        }
        window.PRODUCTS_CONFIG.CATEGORIES.infrastructure = {
            name: '基礎設施',
            icon: '🏭',
            sub_categories: {
                energy: { name: '自營能源', icon: '⚡' }
            }
        };
        
        if (!window.PRODUCTS_CONFIG.PRODUCT_DEFINITIONS) {
            window.PRODUCTS_CONFIG.PRODUCT_DEFINITIONS = {};
        }
        Object.assign(
            window.PRODUCTS_CONFIG.PRODUCT_DEFINITIONS, 
            ENERGY_PRODUCTS_CONFIG.PRODUCTS
        );
        
        console.log('✓ 自營能源產品已整合至產品系統');
    }
    
    console.log('✓ Energy Products Config loaded (3 types: gas/renewable/nuclear_smr, linked to POWER_UPGRADES.renewable)');

})();