// ============================================
// 能源價格系統配置（階段式設計）
// ============================================
// Tier2: 簡化為合約選項（供電量、價格、期限）
// Tier3: 加入地理布局的地熱/風力選項

const ENERGY_CONFIG = {
    // ============================================
    // 基本電價係數 (供電方式)
    // ============================================
    BASE_ELECTRICITY_OPTIONS: {
        market: {
            id: 'market',
            name: '市場電價',
            description: '使用區域電網的市場電價，價格隨供需波動',
            multiplier: 1.0,
            unlock_tier: 1,
            stability: 0.0
        }
    },

    // ============================================
    // 季節係數（背景運作，玩家不可見）
    // ============================================
    SEASONAL_DEMAND: {
        spring: {
            name: '春季',
            demand_multiplier: 0.92,
            description: '氣候宜人，用電需求低',
            source_performance: {
                solar: 1.05, wind: 0.95, hydro: 1.10,
                nuclear: 1.0, gas: 1.0, coal: 1.0, geothermal: 1.0
            }
        },
        summer: {
            name: '夏季',
            demand_multiplier: 1.18,
            description: '酷暑高溫，冷氣用電高峰',
            source_performance: {
                solar: 1.25, wind: 0.85, hydro: 0.85,
                nuclear: 0.95, gas: 1.0, coal: 0.98, geothermal: 1.0
            }
        },
        autumn: {
            name: '秋季',
            demand_multiplier: 0.88,
            description: '氣候涼爽，用電需求最低',
            source_performance: {
                solar: 0.95, wind: 1.05, hydro: 0.90,
                nuclear: 1.0, gas: 1.0, coal: 1.0, geothermal: 1.0
            }
        },
        winter: {
            name: '冬季',
            demand_multiplier: 1.12,
            description: '寒冷季節，暖氣用電增加',
            source_performance: {
                solar: 0.75, wind: 1.15, hydro: 0.95,
                nuclear: 1.0, gas: 1.0, coal: 1.0, geothermal: 1.0
            }
        }
    },

    SEASON_CYCLE: ['spring', 'summer', 'autumn', 'winter'],

    // ============================================
    // Tier2: 電力合約選項（簡化呈現）
    // ============================================
    POWER_CONTRACTS: {
        grid_default: {
            id: 'grid_default',
            name: '電網市電',
            description: '使用區域電網標準供電，無需簽約',
            display_name: '市電',
            
            // === 玩家可見資訊 ===
            contract_term: 0,           // 無合約期限
            price_per_pflops: 1.0,      // 每 PF 每季成本係數
            capacity: 9999,             // 供電容量（PF）
            upfront_cost: 0,
            
            // === 背景運作（玩家不可見）===
            composition: {
                coal: 0.35, gas: 0.30, nuclear: 0.15,
                hydro: 0.10, solar: 0.05, wind: 0.05
            },
            base_cost_multiplier: 1.0,
            carbon_intensity: 0.75,
            reliability: 0.95,
            seasonal_volatility: 0.08,
            
            unlock_tier: 1
        },
        
        // === Tier2 選項 ===
        renewable_contract: {
            id: 'renewable_contract',
            name: '綠能合約',
            description: '與綠能供應商簽訂購電合約，鎖定綠電價格',
            display_name: '綠能購電協議(PPA)',
            
            // === 玩家可見資訊 ===
            contract_term: 20,          // 20季合約
            price_per_pflops: 1.15,     // 略高於市電
            capacity: 100,              // 供電上限 100 PF
            upfront_cost: 300,          // 簽約金
            
            // 合約特性（玩家可見）
            stability: 0.3,             // 價格穩定性
            renewable_ratio: 0.85,      // 再生能源比例
            
            // === 背景運作 ===
            composition: {
                solar: 0.45, wind: 0.30, hydro: 0.10, gas: 0.15
            },
            base_cost_multiplier: 1.15,
            carbon_intensity: 0.15,
            reliability: 0.88,
            seasonal_volatility: 0.15,
            best_season: 'summer',
            esg_bonus: 0.05,
            
            unlock_tier: 2
        },
        
        nuclear_contract: {
            id: 'nuclear_contract',
            name: '核電合約',
            description: '與核電廠簽訂長期供電合約，價格穩定且低廉',
            display_name: '核電長期合約',
            
            // === 玩家可見資訊 ===
            contract_term: 40,          // 40季長約
            price_per_pflops: 0.80,     // 長期成本最低
            capacity: 200,              // 供電上限 200 PF
            upfront_cost: 800,          // 高額簽約金
            
            // 合約特性
            stability: 0.5,             // 高度穩定
            renewable_ratio: 0.0,       // 非再生能源
            low_carbon: true,           // 低碳排
            
            // 風險提示
            requires_license: true,     // 需要核能許可
            public_risk: 0.2,           // 公眾反對風險
            
            // === 背景運作 ===
            composition: {
                nuclear: 0.70, gas: 0.20, hydro: 0.10
            },
            base_cost_multiplier: 0.80,
            carbon_intensity: 0.10,
            reliability: 0.98,
            seasonal_volatility: 0.02,
            
            unlock_tier: 2
        },
        
        gas_contract: {
            id: 'gas_contract',
            name: '燃氣合約',
            description: '與燃氣電廠簽訂彈性供電合約，應對需求變化',
            display_name: '燃氣彈性合約',
            
            // === 玩家可見資訊 ===
            contract_term: 12,          // 12季短約
            price_per_pflops: 1.00,     // 與市電相當
            capacity: 150,              // 供電上限 150 PF
            upfront_cost: 150,
            
            // 合約特性
            stability: 0.2,
            renewable_ratio: 0.0,
            flexible: true,             // 彈性調整
            
            // === 背景運作 ===
            composition: {
                gas: 0.70, solar: 0.15, wind: 0.15
            },
            base_cost_multiplier: 1.00,
            carbon_intensity: 0.40,
            reliability: 0.93,
            seasonal_volatility: 0.08,
            
            unlock_tier: 2
        }
        
        // === Tier3 選項（地理布局時啟用）===
        // geothermal_contract: { ... }
        // offshore_wind_contract: { ... }
    },

    // ============================================
    // 預設配置
    // ============================================
    DEFAULT_SETTINGS: {
        base_electricity: 'market',
        power_contract: 'grid_default'
    },

    // ============================================
    // 價格計算參數
    // ============================================
    PRICE_PARAMETERS: {
        base_price: 1.0,
        min_price: 0.5,
        max_price: 2.0,
        event_impact_weight: 1.0,
        seasonal_impact_weight: 1.0
    },

    // ============================================
    // 空間-電力綁定配置（Tier2/3）
    // ============================================
    SPACE_POWER_BINDING: {
        // 每個空間可獨立選擇電力合約
        // 格式: { space_id: contract_id }
        // 範例: { 'datacenter_1': 'renewable_contract', 'datacenter_2': 'nuclear_contract' }
        
        // 預設規則
        default_contract: 'grid_default',
        
        // 合約容量檢查
        enforce_capacity: true,         // 是否強制容量限制
        
        // 空間電力需求計算
        power_per_pflops: 1.0,          // 每PF算力對應的電力需求
        power_unit: 'MW'                // 電力單位
    }
};

window.ENERGY_CONFIG = ENERGY_CONFIG;
console.log('✓ Energy Config (階段式設計 - Tier2合約/Tier3地理) loaded');

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ENERGY_CONFIG;
}
