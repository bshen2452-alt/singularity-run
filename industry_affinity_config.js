// ============================================
// 產業親和度系統配置 (Industry Affinity Config)
// ============================================
// 設計：純數據配置，無邏輯混雜
// 功能：定義產業類型、親和度效果、整合規則

const IndustryAffinityConfig = {

    // ==========================================
    // 產業類型定義
    // ==========================================
    INDUSTRIES: {
        semiconductor: {
            id: 'semiconductor',
            name: '半導體',
            icon: '🏭',
            color: '#00f5ff',
            description: '晶片與GPU供應商生態',
            related_etf: 'tech_etf',
            affects: ['gpu_cost', 'pflops_availability'],
            key_players: ['NVIDIA', 'AMD', 'Intel', 'TSMC']
        },
        cloud_infra: {
            id: 'cloud_infra',
            name: '雲端基礎設施',
            icon: '☁️',
            color: '#4488ff',
            description: '雲端服務供應商',
            related_etf: 'tech_etf',
            affects: ['cloud_cost', 'cloud_capacity'],
            key_players: ['AWS', 'Azure', 'GCP']
        },
        energy: {
            id: 'energy',
            name: '能源',
            icon: '⚡',
            color: '#ffaa00',
            description: '電力與能源供應商',
            related_etf: 'energy_etf',
            affects: ['power_cost', 'power_contract_options'],
            key_players: ['電網公司', '綠能供應商', '核電廠']
        },
        data_provider: {
            id: 'data_provider',
            name: '數據供應',
            icon: '📊',
            color: '#aa44ff',
            description: '數據供應商與授權方',
            related_etf: null,
            affects: ['data_cost', 'data_quality', 'data_contract_options'],
            key_players: ['Getty', 'Bloomberg', '政府資料庫']
        },
        defense: {
            id: 'defense',
            name: '國防政府',
            icon: '🎖️',
            color: '#ff4444',
            description: '國防機構與政府採購',
            related_etf: null,
            affects: ['grant_success', 'defense_contract', 'regulation_tolerance'],
            key_players: ['國防部', '情報機構', '國家實驗室']
        },
        consumer: {
            id: 'consumer',
            name: '消費市場',
            icon: '🛒',
            color: '#00ff88',
            description: '消費者市場與ToC產品',
            related_etf: null,
            affects: ['toc_revenue', 'community_growth', 'brand_value'],
            key_players: ['一般用戶', '內容創作者', '中小企業']
        },
        enterprise: {
            id: 'enterprise',
            name: '企業服務',
            icon: '🏢',
            color: '#ff8800',
            description: '企業客戶與ToB市場',
            related_etf: null,
            affects: ['tob_revenue', 'industry_contract', 'enterprise_trust'],
            key_players: ['Fortune 500', '金融機構', '諮詢公司']
        },
        research: {
            id: 'research',
            name: '學術研究',
            icon: '🔬',
            color: '#44ffaa',
            description: '學術機構與研究社群',
            related_etf: null,
            affects: ['talent_cost', 'research_efficiency', 'collaboration_bonus'],
            key_players: ['頂尖大學', '研究機構', '基金會']
        }
    },

    // ==========================================
    // 路線初始親和度
    // ==========================================
    ROUTE_INITIAL_AFFINITY: {
        'Scaling Law': {
            semiconductor: 15,
            cloud_infra: 20,
            energy: 10,
            data_provider: 5,
            defense: 0,
            consumer: 10,
            enterprise: 15,
            research: 5
        },
        'Multimodal': {
            semiconductor: 5,
            cloud_infra: 10,
            energy: 0,
            data_provider: 15,
            defense: -10,
            consumer: 20,
            enterprise: 10,
            research: 10
        },
        'Efficiency': {
            semiconductor: 10,
            cloud_infra: 5,
            energy: 5,
            data_provider: 5,
            defense: 5,
            consumer: 5,
            enterprise: 10,
            research: 25
        },
        'Embodied': {
            semiconductor: 20,
            cloud_infra: 0,
            energy: 15,
            data_provider: 5,
            defense: 10,
            consumer: 15,
            enterprise: 10,
            research: 5
        },
        'OpenSource': {
            semiconductor: 5,
            cloud_infra: 10,
            energy: 0,
            data_provider: 5,
            defense: -5,
            consumer: 15,
            enterprise: -10,
            research: 20
        },
        'Military': {
            semiconductor: 10,
            cloud_infra: 5,
            energy: 10,
            data_provider: 5,
            defense: 30,
            consumer: -15,
            enterprise: 15,
            research: -10
        }
    },

    // ==========================================
    // 戰略融資類型定義
    // ==========================================
    STRATEGIC_FINANCING: {
        // 算力戰略投資
        compute_strategic: {
            id: 'compute_strategic',
            name: '算力戰略投資',
            icon: '💎',
            description: '與晶片/GPU供應商建立戰略合作',
            category: 'strategic',
            unlock_tier: 2,
            
            // 融資條件
            terms: {
                cash_base: 150,              // 基礎獲得現金
                cash_market_cap_ratio: 0.15, // 市值比例加成
                dilution: 0.12,              // 股權稀釋12%
                lock_period: 8               // 鎖定期8季
            },
            
            // 立即效果
            immediate_effects: {
                pflops: 2,                   // 贈送算力
                cash_multiplier: 1.0         // 現金乘數
            },
            
            // 親和度變化
            affinity_changes: {
                semiconductor: 25,
                cloud_infra: -10             // 與雲端競爭
            },
            
            // 長期合約效果
            contract_effects: {
                duration: 12,                // 合約期限12季
                gpu_discount: 0.25,          // GPU採購75折
                priority_supply: true,       // 優先供應
                exclusive_clause: false      // 非排他
            }
        },
        
        // 雲端戰略投資
        cloud_strategic: {
            id: 'cloud_strategic',
            name: '雲端戰略投資',
            icon: '☁️',
            description: '與雲端服務商建立長期合作',
            category: 'strategic',
            unlock_tier: 2,
            
            terms: {
                cash_base: 120,
                cash_market_cap_ratio: 0.12,
                dilution: 0.10,
                lock_period: 6
            },
            
            immediate_effects: {
                cloud_pflops: 5,
                cash_multiplier: 1.0
            },
            
            affinity_changes: {
                cloud_infra: 25,
                semiconductor: -10
            },
            
            contract_effects: {
                duration: 12,
                cloud_discount: 0.30,        // 雲端租賃7折
                burst_capacity: true,        // 彈性擴容
                exclusive_clause: false
            }
        },
        
        // 能源戰略投資
        energy_strategic: {
            id: 'energy_strategic',
            name: '能源戰略投資',
            icon: '⚡',
            description: '與能源供應商簽訂長期供電協議',
            category: 'strategic',
            unlock_tier: 2,
            
            terms: {
                cash_base: 100,
                cash_market_cap_ratio: 0.10,
                dilution: 0.08,
                lock_period: 12              // 能源合約鎖定期較長
            },
            
            immediate_effects: {
                cash_multiplier: 1.0
            },
            
            affinity_changes: {
                energy: 30
            },
            
            contract_effects: {
                duration: 20,                // 長期電力合約
                power_discount: 0.20,        // 電力8折
                price_stability: 0.5,        // 價格穩定度
                location_constraint: true    // 選址限制
            }
        },
        
        // 數據戰略投資
        data_strategic: {
            id: 'data_strategic',
            name: '數據戰略投資',
            icon: '📊',
            description: '與數據供應商建立獨家合作',
            category: 'strategic',
            unlock_tier: 2,
            
            terms: {
                cash_base: 80,
                cash_market_cap_ratio: 0.08,
                dilution: 0.08,
                lock_period: 4
            },
            
            immediate_effects: {
                high_data: 200,              // 贈送高品質數據
                cash_multiplier: 1.0
            },
            
            affinity_changes: {
                data_provider: 25,
                research: -5                 // 數據排他影響學術合作
            },
            
            contract_effects: {
                duration: 8,
                data_discount: 0.35,         // 數據採購65折
                data_per_quarter: 50,        // 每季免費數據
                gray_data_forbidden: true    // 禁止使用灰色數據
            }
        },
        
        // 政府/國防融資
        defense_strategic: {
            id: 'defense_strategic',
            name: '政府戰略投資',
            icon: '🎖️',
            description: '接受政府/國防機構投資',
            category: 'strategic',
            unlock_tier: 3,
            
            terms: {
                cash_base: 200,
                cash_market_cap_ratio: 0.20,
                dilution: 0.15,
                lock_period: 16
            },
            
            immediate_effects: {
                trust: 10,
                cash_multiplier: 1.2         // 政府投資通常較大方
            },
            
            affinity_changes: {
                defense: 35,
                consumer: -15,
                research: -10
            },
            
            contract_effects: {
                duration: 16,
                grant_bonus: 0.40,           // 獎助金成功率+40%
                defense_contract_priority: true,
                export_restriction: true,    // 出口限制
                audit_requirement: true      // 定期審計
            }
        },
        
        // 純財務投資
        financial_only: {
            id: 'financial_only',
            name: '純財務投資',
            icon: '💰',
            description: '無戰略綁定的財務投資',
            category: 'financial',
            unlock_tier: 1,
            
            terms: {
                cash_base: 100,
                cash_market_cap_ratio: 0.18, // 較高比例
                dilution: 0.15,              // 較高稀釋
                lock_period: 2               // 短鎖定期
            },
            
            immediate_effects: {
                cash_multiplier: 1.1
            },
            
            affinity_changes: {},            // 無親和度變化
            
            contract_effects: {
                duration: 0                  // 無長期綁定
            }
        }
    },

    // ==========================================
    // 設施升級對親和度的影響
    // ==========================================
    FACILITY_AFFINITY_EFFECTS: {
        // 空間升級
        space: {
            cooling: {
                level_effects: {
                    1: { energy: 2 },
                    2: { energy: 3, semiconductor: 2 },
                    3: { energy: 5, semiconductor: 3 }
                }
            },
            modular: {
                level_effects: {
                    1: { enterprise: 2 },
                    2: { enterprise: 3 },
                    3: { enterprise: 5, research: 2 }
                }
            },
            automation: {
                level_effects: {
                    1: { research: 2 },
                    2: { research: 3, enterprise: 2 },
                    3: { research: 5, semiconductor: 3 }
                }
            }
        },
        
        // 電力升級
        power: {
            storage: {
                level_effects: {
                    1: { energy: 3 },
                    2: { energy: 5 },
                    3: { energy: 8, enterprise: 3 }
                }
            },
            microgrid: {
                level_effects: {
                    1: { energy: 2, research: 1 },
                    2: { energy: 4, research: 2 },
                    3: { energy: 6, research: 4 }
                }
            },
            renewable: {
                level_effects: {
                    1: { energy: 2, consumer: 3 },
                    2: { energy: 4, consumer: 5 },
                    3: { energy: 8, consumer: 8, enterprise: 3 }
                }
            }
        },
        
        // 算力升級
        compute: {
            architecture: {
                level_effects: {
                    1: { semiconductor: 3 },
                    2: { semiconductor: 5, research: 2 },
                    3: { semiconductor: 8, research: 4 }
                }
            },
            cluster: {
                level_effects: {
                    1: { semiconductor: 2, cloud_infra: 2 },
                    2: { semiconductor: 4, cloud_infra: 3 },
                    3: { semiconductor: 6, cloud_infra: 5 }
                }
            },
            specialization: {
                level_effects: {
                    1: { semiconductor: 5 },
                    2: { semiconductor: 8, defense: 3 },
                    3: { semiconductor: 12, defense: 5, research: 3 }
                }
            }
        }
    },

    // ==========================================
    // 電力合約對親和度的影響
    // ==========================================
    POWER_CONTRACT_AFFINITY: {
        grid_default: {
            affinity_change: {}              // 無影響
        },
        renewable_contract: {
            affinity_change: { energy: 10, consumer: 5 },
            per_quarter: { energy: 1 }       // 每季增加
        },
        nuclear_contract: {
            affinity_change: { energy: 15, defense: 5 },
            per_quarter: { energy: 1, defense: 1 }
        },
        gas_contract: {
            affinity_change: { energy: 5 },
            per_quarter: {}
        }
    },

    // ==========================================
    // 數據合約對親和度的影響
    // ==========================================
    DATA_CONTRACT_AFFINITY: {
        // 簽訂數據訂閱合約
        data_subscription: {
            affinity_change: { data_provider: 8 },
            per_quarter: { data_provider: 1 }
        },
        // 使用灰色數據
        gray_data_usage: {
            affinity_change: { data_provider: -3, research: -2 },
            compliance_threshold: 50         // 超過50%灰色數據時觸發
        }
    },

    // ==========================================
    // 產品/業務對親和度的影響（每季累積）
    // ==========================================
    PRODUCT_AFFINITY_EFFECTS: {
        // 按產品類型分類
        by_product_type: {
            milestone: {
                // 里程碑產品通常提升多個產業關係
                base_effects: { consumer: 2, enterprise: 2 }
            },
            unlockable: {
                // 可開發產品依類型不同
                base_effects: { enterprise: 1 }
            }
        },
        
        // 按路線產品特性
        by_route: {
            'Scaling Law': {
                operating_effects: { semiconductor: 2, cloud_infra: 1 }
            },
            'Multimodal': {
                operating_effects: { consumer: 2, data_provider: 1 }
            },
            'Efficiency': {
                operating_effects: { research: 2, enterprise: 1 }
            },
            'Embodied': {
                operating_effects: { semiconductor: 2, energy: 1 }
            },
            'OpenSource': {
                operating_effects: { research: 2, consumer: 1 }
            },
            'Military': {
                operating_effects: { defense: 3, enterprise: 1 }
            }
        },
        
        // 特定產品的特殊效果
        special_products: {
            // Scaling Law 產品
            sl_t2_agents: { enterprise: 3 },
            sl_t3_milestone: { cloud_infra: 5, semiconductor: 3 },
            
            // Military 產品
            mi_t2_milestone: { defense: 5, consumer: -2 },
            mi_t3_milestone: { defense: 8, consumer: -5, research: -3 }
        }
    },

    // ==========================================
    // 親和度效果計算參數
    // ==========================================
    AFFINITY_EFFECTS: {
        // 成本修正公式參數
        cost_modifier: {
            max_discount: 0.50,              // 最大折扣50%
            max_premium: 0.50,               // 最大加價50%
            scale_factor: 200                // affinity / scale_factor = modifier
        },
        
        // 各產業影響的資源
        industry_resources: {
            semiconductor: {
                primary: 'gpu_cost',         // GPU採購成本
                secondary: 'pflops_availability'
            },
            cloud_infra: {
                primary: 'cloud_cost',       // 雲端租賃成本
                secondary: 'cloud_burst_limit'
            },
            energy: {
                primary: 'power_cost',       // 電力成本
                secondary: 'power_contract_options'
            },
            data_provider: {
                primary: 'data_cost',        // 數據採購成本
                secondary: 'data_quality_bonus'
            },
            defense: {
                primary: 'grant_success_rate', // 獎助金成功率
                secondary: 'regulation_tolerance'
            },
            consumer: {
                primary: 'toc_revenue_mult', // ToC收入乘數
                secondary: 'community_growth_bonus'
            },
            enterprise: {
                primary: 'tob_revenue_mult', // ToB收入乘數
                secondary: 'contract_value_bonus'
            },
            research: {
                primary: 'talent_cost',      // 人才招募成本
                secondary: 'research_efficiency'
            }
        },
        
        // 親和度等級描述
        level_descriptions: {
            90: { name: '核心夥伴', icon: '💎', color: '#00f5ff' },
            70: { name: '戰略聯盟', icon: '🤝', color: '#00ff88' },
            50: { name: '優質客戶', icon: '⭐', color: '#88ff00' },
            30: { name: '一般客戶', icon: '👤', color: '#888888' },
            0:  { name: '中立', icon: '➖', color: '#666666' },
            '-30': { name: '疏遠', icon: '📉', color: '#ff8800' },
            '-60': { name: '敵對', icon: '⚠️', color: '#ff4444' }
        }
    },

    // ==========================================
    // 併購相關配置
    // ==========================================
    ACQUISITION_CONFIG: {
        // 親和度對併購的影響
        affinity_effects: {
            // 併購目標出現機率
            target_availability: {
                base_chance: 0.1,            // 基礎出現機率
                affinity_bonus: 0.01,        // 每點親和度增加1%
                min_affinity: -20            // 低於此值不出現
            },
            
            // 併購成本
            cost_modifier: {
                base: 1.0,
                per_affinity: -0.005         // 每點親和度降低0.5%成本
            },
            
            // 整合難度
            integration: {
                base_turns: 4,
                affinity_reduction: 0.02     // 每點親和度減少2%整合期
            }
        },
        
        // 併購類型與產業對應
        acquisition_types: {
            talent_acquisition: {
                name: '人才併購',
                primary_industry: 'research',
                cost_range: [50, 100],
                effects: { talent_gain: true, mp_boost: 2 }
            },
            tech_acquisition: {
                name: '技術併購',
                primary_industry: 'semiconductor',
                cost_range: [100, 200],
                effects: { tech_boost: true, mp_boost: 5 }
            },
            market_acquisition: {
                name: '市場併購',
                primary_industry: 'enterprise',
                cost_range: [200, 500],
                effects: { subsidiary_gain: true, revenue_boost: true }
            }
        }
    },

    // ==========================================
    // 自然衰減與維護
    // ==========================================
    DECAY_CONFIG: {
        // 每季自然衰減
        quarterly_decay: {
            rate: 0.05,                      // 每季衰減5%
            min_value: -100,
            max_value: 100
        },
        
        // 維護親和度的方式
        maintenance_actions: {
            etf_investment: {
                // 投資相關ETF可維護親和度
                threshold: 0.05,             // 持倉佔比門檻
                affinity_maintain: 2         // 每季維持+2
            },
            active_contract: {
                // 有效合約維持親和度
                affinity_maintain: 1
            }
        }
    },

    // ==========================================
    // UI配置
    // ==========================================
    UI_CONFIG: {
        // 是否顯示具體數值（false = 只顯示等級描述）
        show_exact_values: false,
        
        // 顯示前N個最高/最低產業
        display_top_n: 4,
        
        // 警告閾值
        warning_thresholds: {
            low_affinity: -30,               // 低於此值顯示警告
            critical_affinity: -60           // 低於此值顯示嚴重警告
        }
    }
};

// ==========================================
// 輔助函數
// ==========================================

/**
 * 獲取親和度等級描述
 */
IndustryAffinityConfig.getAffinityLevel = function(value) {
    const levels = this.AFFINITY_EFFECTS.level_descriptions;
    const thresholds = Object.keys(levels).map(Number).sort((a, b) => b - a);
    
    for (const threshold of thresholds) {
        if (value >= threshold) {
            return levels[threshold];
        }
    }
    return levels['-60'];
};

/**
 * 計算成本修正係數
 */
IndustryAffinityConfig.calculateCostModifier = function(affinity) {
    const config = this.AFFINITY_EFFECTS.cost_modifier;
    const modifier = affinity / config.scale_factor;
    return Math.max(-config.max_discount, Math.min(config.max_premium, -modifier));
};

/**
 * 獲取戰略融資選項
 */
IndustryAffinityConfig.getAvailableFinancing = function(playerTier) {
    const available = [];
    for (const [id, config] of Object.entries(this.STRATEGIC_FINANCING)) {
        if (playerTier >= config.unlock_tier) {
            available.push({ id, ...config });
        }
    }
    return available;
};

/**
 * 獲取產業對應的ETF
 */
IndustryAffinityConfig.getIndustryETF = function(industryId) {
    const industry = this.INDUSTRIES[industryId];
    return industry ? industry.related_etf : null;
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.IndustryAffinityConfig = IndustryAffinityConfig;
}

console.log('✓ Industry Affinity Config loaded');

// 支援模組化環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndustryAffinityConfig;
}
