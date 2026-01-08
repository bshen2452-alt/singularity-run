// ============================================
// 全球市場指標配置 (Global Market Config)
// ============================================
// 設計原則：
//   1. 純數據配置，無邏輯混雜
//   2. 定義 Tier4 階段的全球環境指標
//   3. 指標影響所有區域的基礎營運成本
// ============================================

const GlobalMarketConfig = {
    
    // ==========================================
    // 系統設定
    // ==========================================
    SYSTEM: {
        unlock_tier: 1,                    // Tier1 即啟用（簡化版）
        full_features_tier: 4,             // Tier4 啟用完整功能
        update_frequency: 'per_turn',      // 每回合更新
        volatility_base: 0.05,             // 基礎波動率 5%
        max_index_value: 200,              // 指標上限
        min_index_value: 20,               // 指標下限
        equilibrium_pull: 0.02,            // 均衡回歸力道
        
        // Tier 分級波動率
        tier_volatility_mult: {
            1: 0.2,   // Tier1-2: 20% 波動（幾乎穩定）
            2: 0.3,
            3: 0.5,   // Tier3: 50% 波動
            4: 1.0,   // Tier4+: 完整波動
            5: 1.2    // Tier5: 120% 波動（更劇烈）
        }
    },
    
    // ==========================================
    // 全球市場指標定義
    // ==========================================
    INDICES: {
        interest_rate: {
            id: 'interest_rate',
            name: '基礎利率指數',
            icon: '🏦',
            description: '影響借貸成本與融資難度',
            base_value: 100,
            unit: '%',
            display_formula: 'value / 20',  // 100 = 5% 利率
            
            // 影響層面
            effects: {
                credit_cost_mult: 'value / 100',           // 利率100=1x, 150=1.5x
                loan_approval_mult: '200 / (100 + value)', // 利率越高越難貸款
                investment_attractiveness: '150 / value'   // 利率越高外資越少
            },
            
            // 波動特性
            volatility: {
                base: 0.03,
                event_sensitivity: 0.8,      // 對事件敏感度
                player_action_weight: 0.1    // 玩家行為影響權重
            }
        },
        
        energy_price: {
            id: 'energy_price',
            name: '能源價格指數',
            icon: '⚡',
            description: '影響電力成本與資料中心營運',
            base_value: 100,
            unit: '點',
            
            effects: {
                power_cost_mult: 'value / 100',
                renewable_value: 'value / 80',             // 能源貴時綠能更有價值
                datacenter_margin: '180 / (80 + value)'    // 能源貴時利潤壓縮
            },
            
            volatility: {
                base: 0.06,
                event_sensitivity: 1.2,      // 能源對事件高度敏感
                player_action_weight: 0.15,
                seasonal_pattern: true       // 有季節性波動
            }
        },
        
        gpu_price: {
            id: 'gpu_price',
            name: 'GPU價格指數',
            icon: '🎮',
            description: '影響算力擴張成本與硬體投資',
            base_value: 100,
            unit: '點',
            
            effects: {
                compute_cost_mult: 'value / 100',
                hardware_investment_cost: 'value / 90',
                chip_design_revenue: 'value / 100'         // GPU貴時自研晶片更賺
            },
            
            volatility: {
                base: 0.08,
                event_sensitivity: 1.0,
                player_action_weight: 0.2,   // 玩家搶購影響大
                supply_chain_lag: 2          // 供應鏈延遲 2 回合
            }
        },
        
        market_confidence: {
            id: 'market_confidence',
            name: '市場信心指數',
            icon: '📊',
            description: '影響監管壓力與投資人態度',
            base_value: 100,
            unit: '點',
            
            effects: {
                regulation_pressure_mult: '180 / (80 + value)', // 信心低=監管壓力高
                fundraising_mult: 'value / 100',
                public_trust_recovery: 'value / 120'
            },
            
            volatility: {
                base: 0.04,
                event_sensitivity: 1.5,      // 對負面事件極度敏感
                player_action_weight: 0.25,  // 大公司行為影響市場信心
                momentum: true               // 有動量效應（漲跌會延續）
            }
        }
    },
    
    // ==========================================
    // 指標連動規則
    // ==========================================
    CORRELATIONS: {
        // 正相關
        positive: [
            { from: 'energy_price', to: 'gpu_price', strength: 0.3 },
            { from: 'interest_rate', to: 'market_confidence', strength: -0.2 }
        ],
        // 負相關
        negative: [
            { from: 'market_confidence', to: 'interest_rate', strength: 0.15 },
            { from: 'gpu_price', to: 'market_confidence', strength: 0.1 }
        ]
    },
    
    // ==========================================
    // 指標區間與狀態
    // ==========================================
    THRESHOLDS: {
        critical_low: 40,    // 極低：可能觸發特殊事件
        low: 70,             // 偏低
        normal_low: 90,      // 正常偏低
        normal_high: 110,    // 正常偏高
        high: 140,           // 偏高
        critical_high: 170   // 極高：可能觸發特殊事件
    },
    
    STATUS_LABELS: {
        critical_low: { label: '極低', color: '#22c55e', icon: '📉' },
        low: { label: '偏低', color: '#84cc16', icon: '↘️' },
        normal: { label: '正常', color: '#6b7280', icon: '➡️' },
        high: { label: '偏高', color: '#f59e0b', icon: '↗️' },
        critical_high: { label: '極高', color: '#ef4444', icon: '📈' }
    },
    
    // ==========================================
    // 玩家/對手行為對指標的影響
    // ==========================================
    ACTION_IMPACTS: {
        // 大規模算力採購
        massive_compute_purchase: {
            gpu_price: +5,
            energy_price: +2
        },
        // 能源設施建設
        energy_facility_construction: {
            energy_price: -2
        },
        // AI 安全事故
        ai_safety_incident: {
            market_confidence: -15,
            interest_rate: +3
        },
        // 成功 IPO
        successful_ipo: {
            market_confidence: +5
        },
        // 大規模裁員
        mass_layoff: {
            market_confidence: -3
        },
        // 監管處罰
        regulatory_penalty: {
            market_confidence: -8
        },
        // 技術突破公告
        tech_breakthrough: {
            market_confidence: +10,
            gpu_price: +3
        },
        // 新區域進駐（多家同時）
        region_expansion_rush: {
            energy_price: +3,
            gpu_price: +2
        }
    },
    
    // ==========================================
    // 隨機事件對指標的影響
    // ==========================================
    EVENT_IMPACTS: {
        // 地緣政治
        geopolitical_tension: {
            probability: 0.08,
            effects: {
                gpu_price: { min: +10, max: +25 },
                market_confidence: { min: -10, max: -5 },
                energy_price: { min: +5, max: +15 }
            },
            duration: 3
        },
        // 能源危機
        energy_crisis: {
            probability: 0.05,
            effects: {
                energy_price: { min: +20, max: +40 },
                gpu_price: { min: +5, max: +10 }
            },
            duration: 4
        },
        // 晶片短缺
        chip_shortage: {
            probability: 0.06,
            effects: {
                gpu_price: { min: +15, max: +35 }
            },
            duration: 5
        },
        // 央行政策轉向
        central_bank_pivot: {
            probability: 0.1,
            effects: {
                interest_rate: { min: -15, max: +20 }
            },
            duration: 6
        },
        // AI 泡沫擔憂
        ai_bubble_concern: {
            probability: 0.07,
            effects: {
                market_confidence: { min: -20, max: -10 },
                interest_rate: { min: +5, max: +10 }
            },
            duration: 3
        },
        // 技術樂觀浪潮
        tech_optimism_wave: {
            probability: 0.08,
            effects: {
                market_confidence: { min: +10, max: +20 },
                gpu_price: { min: +5, max: +10 }
            },
            duration: 2
        },
        // 綠能突破
        renewable_breakthrough: {
            probability: 0.04,
            effects: {
                energy_price: { min: -10, max: -20 }
            },
            duration: 4
        }
    },
    
    // ==========================================
    // 季節性調整（可選）
    // ==========================================
    SEASONAL_MODIFIERS: {
        energy_price: {
            Q1: 1.1,   // 冬季用電高峰
            Q2: 0.95,
            Q3: 1.05,  // 夏季冷氣
            Q4: 1.0
        }
    }
};

// ==========================================
// 輔助函數
// ==========================================

/**
 * 取得指標配置
 */
GlobalMarketConfig.getIndex = function(indexId) {
    return this.INDICES[indexId] || null;
};

/**
 * 取得所有指標ID
 */
GlobalMarketConfig.getAllIndexIds = function() {
    return Object.keys(this.INDICES);
};

/**
 * 取得指標狀態標籤
 */
GlobalMarketConfig.getStatusLabel = function(value) {
    const t = this.THRESHOLDS;
    if (value <= t.critical_low) return this.STATUS_LABELS.critical_low;
    if (value <= t.low) return this.STATUS_LABELS.low;
    if (value <= t.normal_high) return this.STATUS_LABELS.normal;
    if (value <= t.high) return this.STATUS_LABELS.high;
    return this.STATUS_LABELS.critical_high;
};

/**
 * 取得行為對指標的影響
 */
GlobalMarketConfig.getActionImpact = function(actionId) {
    return this.ACTION_IMPACTS[actionId] || {};
};

/**
 * 取得事件配置
 */
GlobalMarketConfig.getEventImpact = function(eventId) {
    return this.EVENT_IMPACTS[eventId] || null;
};

/**
 * 計算指標顯示值
 */
GlobalMarketConfig.getDisplayValue = function(indexId, rawValue) {
    const index = this.getIndex(indexId);
    if (!index || !index.display_formula) return rawValue;
    
    // 簡單公式解析
    if (index.display_formula === 'value / 20') {
        return (rawValue / 20).toFixed(1);
    }
    return rawValue;
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.GlobalMarketConfig = GlobalMarketConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalMarketConfig;
}

console.log('✓ Global Market Config loaded');