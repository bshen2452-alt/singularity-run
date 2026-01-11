// ============================================
// 奇點競速 - 數據資源系統配置 (Data Config)
// ============================================
// 純數據配置，無邏輯混雜
// Tier 解鎖：Tier0 顯示 / Tier1 三維屬性+來源+衰減 / Tier2 清洗+合成

const DataConfig = {

    // ==========================================
    // 系統解鎖階段
    // ==========================================
    UNLOCK_TIERS: {
        DISPLAY: 0,      // Tier 0: 僅顯示 high_data/low_data
        BASIC: 1,        // Tier 1: 三維屬性、來源選擇、衰減機制
        ADVANCED: 2      // Tier 2: 清洗轉化、合成數據
    },

    // ==========================================
    // 數據品質定義
    // ==========================================
    QUALITY: {
        HIGH: {
            key: 'high',
            name: '高品質',
            icon: '🔷',
            color: '#00d4ff',
            research_efficiency: 1.3,    // 研發效率加成
            entropy_risk: 0.02,          // 使用時熵值增加風險
            decay_rate: 0.10             // 每季衰減率（變成低品質）
        },
        LOW: {
            key: 'low',
            name: '低品質',
            icon: '🔹',
            color: '#888888',
            research_efficiency: 0.7,    // 研發效率懲罰
            entropy_risk: 0.08,          // 較高熵值風險
            decay_rate: 0                // 低品質不再衰減
        }
    },

    // ==========================================
    // 數據合規性定義
    // ==========================================
    COMPLIANCE: {
        LEGAL: {
            key: 'legal',
            name: '合法',
            icon: '✓',
            color: '#44cc88',
            compliance_risk_per_use: 0,      // 使用時合規風險增加
            regulation_pressure: 0,          // 監管壓力
            trust_modifier: 0                // 信任度影響
        },
        GRAY: {
            key: 'gray',
            name: '灰色',
            icon: '⚠',
            color: '#ff9944',
            compliance_risk_per_use: 2,      // 每次使用增加合規風險
            regulation_pressure: 3,          // 每季累積監管壓力
            trust_modifier: -1               // 被發現時信任度損失
        }
    },

    // ==========================================
    // 數據多樣性定義
    // ==========================================
    DIVERSITY: {
        BROAD: {
            key: 'broad',
            name: '廣泛',
            icon: '🌐',
            color: '#aa44ff',
            versatility: 1.0,           // 可用於所有研發
            specialization_bonus: 0,    // 專精加成
            description: '通用型數據，適用所有產品開發'
        },
        FOCUSED: {
            key: 'focused',
            name: '專精',
            icon: '🎯',
            color: '#ff6644',
            versatility: 0.5,           // 僅適用特定領域
            specialization_bonus: 0.3,  // 匹配領域時+30%效率
            description: '垂直領域數據，匹配時效率更高'
        }
    },

    // ==========================================
    // 數據類型定義（6種實際存儲類型）
    // ==========================================
    DATA_TYPES: {
        // 合法高品質廣泛（頂級）
        legal_high_broad: {
            id: 'legal_high_broad',
            name: '優質通用數據',
            quality: 'high',
            compliance: 'legal',
            diversity: 'broad',
            icon: '💎',
            color: '#00f5ff',
            base_price: 5,              // 購買單價
            description: '頂級數據資源，合法取得且適用廣泛'
        },
        // 合法高品質專精
        legal_high_focused: {
            id: 'legal_high_focused',
            name: '專業領域數據',
            quality: 'high',
            compliance: 'legal',
            diversity: 'focused',
            icon: '📊',
            color: '#44aaff',
            base_price: 4,
            description: '特定領域的高品質數據'
        },
        // 合法低品質（不區分多樣性）
        legal_low: {
            id: 'legal_low',
            name: '基礎合規數據',
            quality: 'low',
            compliance: 'legal',
            diversity: 'broad',
            icon: '📁',
            color: '#88aa88',
            base_price: 1,
            description: '合法但品質一般的公開數據'
        },
        // 灰色高品質
        gray_high: {
            id: 'gray_high',
            name: '敏感高價值數據',
            quality: 'high',
            compliance: 'gray',
            diversity: 'broad',
            icon: '🔶',
            color: '#ffaa00',
            base_price: 2,              // 便宜但有風險
            description: '來源存疑但價值極高的數據'
        },
        // 灰色低品質
        gray_low: {
            id: 'gray_low',
            name: '爬蟲採集數據',
            quality: 'low',
            compliance: 'gray',
            diversity: 'broad',
            icon: '🕷️',
            color: '#aa6600',
            base_price: 0,              // 免費但風險高
            description: '大量爬取的未授權數據'
        },
        // 合成數據
        synthetic: {
            id: 'synthetic',
            name: '合成數據',
            quality: 'medium',          // 品質取決於合成方法
            compliance: 'legal',
            diversity: 'broad',
            icon: '🧬',
            color: '#aa44ff',
            base_price: 0,              // 無法購買，只能自產
            description: '透過AI模型生成的結構化數據'
        }
    },

    // ==========================================
    // 數據來源定義
    // ==========================================
    DATA_SOURCES: {
        // 社群數據（Tier 1）
        community: {
            id: 'community',
            name: '社群數據',
            icon: '👥',
            unlock_tier: 1,
            cost_type: 'free',
            output_types: ['legal_high_broad', 'legal_low'],  // 依情緒決定比例
            description: '用戶互動產生的數據，品質受社群情緒影響',
            effects: {
                compliance: 'legal',
                quality_factor: 'sentiment'    // 品質由社群情緒決定
            }
        },
        // 第三方購買（Tier 1）
        purchase: {
            id: 'purchase',
            name: '第三方購買',
            icon: '💰',
            unlock_tier: 1,
            cost_type: 'cash',
            output_types: ['legal_high_broad', 'legal_high_focused', 'legal_low'],
            description: '向數據供應商購買合規數據',
            effects: {
                compliance: 'legal',
                instant: true                  // 即時取得
            }
        },
        // 灰色爬蟲（Tier 0 基礎 / Tier 1 完整）
        scraping: {
            id: 'scraping',
            name: '網路爬蟲',
            icon: '🕷️',
            unlock_tier: 0,                    // Tier 0 即可使用
            max_intensity_by_tier: {
                0: 2,                          // Tier 0: 最高「積極」(intensity 2)
                1: 3,                          // Tier 1+: 開放「瘋狂」(intensity 3)
                2: 3
            },
            cost_type: 'free',
            output_types: ['gray_high', 'gray_low'],
            description: '大量爬取公開網站數據，存在法律風險',
            effects: {
                compliance: 'gray',
                volume_multiplier: 3.0,        // 數量是正規來源的3倍
                compliance_risk_add: 5,        // 每次操作增加合規風險
                regulation_add: 3,             // 增加監管壓力
                trust_loss: 2                  // 被發現時損失信任
            },
            discovery_chance: 0.15             // 每季被發現的機率
        },
        // 合成數據（Tier 2）
        synthesis: {
            id: 'synthesis',
            name: '數據合成',
            icon: '🧬',
            unlock_tier: 2,
            cost_type: 'compute',              // 消耗算力
            output_types: ['synthetic'],
            description: '使用AI模型生成訓練數據',
            effects: {
                compliance: 'legal',
                quality_factor: 'mp'           // 品質由MP決定
            }
        }
    },

    // ==========================================
    // 合成數據方法（需先研發 DATA_UPGRADES.synthesis 解鎖）
    // 對應關係：
    //   synthesis Lv1 (基礎GAN) → 解鎖 logical
    //   synthesis Lv2 (物理模擬) → 解鎖 generative
    //   synthesis Lv3 (因果模型) → 解鎖 causal, differential需額外研究
    // ==========================================
    SYNTHESIS_METHODS: {
        logical: {
            id: 'logical',
            name: '邏輯運算合成',
            icon: '🔢',
            description: '基於規則的數據生成，成本低但品質有限',
            // 解鎖條件
            unlock_upgrade: { type: 'data', path: 'synthesis', level: 1 },
            mp_requirement: 25,
            costs: {
                compute_ratio: 0.05,
                energy_ratio: 0.03,
                cash: 5
            },
            output: {
                base_amount: 50,
                quality_base: 0.3,
                quality_mp_scaling: 0.002,
                max_quality: 0.6
            },
            effects: {
                alignment_add: 2,
                entropy_add: 0,
                compliance_risk: 0
            }
        },
        generative: {
            id: 'generative',
            name: '生成式AI合成',
            icon: '🤖',
            description: '使用大模型生成高品質數據，消耗大量算力',
            // 解鎖條件
            unlock_upgrade: { type: 'data', path: 'synthesis', level: 2 },
            mp_requirement: 100,
            costs: {
                compute_ratio: 0.15,
                energy_ratio: 0.10,
                cash: 20
            },
            output: {
                base_amount: 30,
                quality_base: 0.6,
                quality_mp_scaling: 0.003,
                max_quality: 0.95
            },
            effects: {
                alignment_add: 0,
                entropy_add: 3,
                compliance_risk: 0
            }
        },
        causal: {
            id: 'causal',
            name: '因果模型合成',
            icon: '🔗',
            description: '基於因果推理生成數據，頂級合成技術',
            // 解鎖條件
            unlock_upgrade: { type: 'data', path: 'synthesis', level: 3 },
            mp_requirement: 200,
            costs: {
                compute_ratio: 0.20,
                energy_ratio: 0.15,
                cash: 35
            },
            output: {
                base_amount: 25,
                quality_base: 0.75,
                quality_mp_scaling: 0.002,
                max_quality: 0.98
            },
            effects: {
                alignment_add: 3,
                entropy_add: 2,
                compliance_risk: 0
            }
        },
        differential: {
            id: 'differential',
            name: '差分隱私合成',
            icon: '🛡️',
            description: '加入隱私保護的合成方法，需研發解鎖',
            // 複合解鎖條件：需要 Lv3 升級 + 特定研究
            unlock_upgrade: { type: 'data', path: 'synthesis', level: 3 },
            unlock_research: 'differential_privacy',
            mp_requirement: 100,
            costs: {
                compute_ratio: 0.10,
                energy_ratio: 0.08,
                cash: 15
            },
            output: {
                base_amount: 40,
                quality_base: 0.5,
                quality_mp_scaling: 0.0025,
                max_quality: 0.8
            },
            effects: {
                alignment_add: 1,
                entropy_add: 1,
                compliance_risk: -5,
                regulation_reduction: 3
            }
        }
    },

    // ==========================================
    // 數據清洗配置（Tier 2）
    // ==========================================
    DATA_CLEANING: {
        // 低品質 → 高品質
        quality_upgrade: {
            id: 'quality_upgrade',
            name: '數據清洗',
            icon: '🧹',
            description: '清洗低品質數據，提升為高品質',
            unlock_tier: 2,
            input: {
                type: 'low',                   // 輸入低品質
                amount: 10                     // 每次處理10單位
            },
            output: {
                type: 'high',                  // 輸出高品質
                amount: 6                      // 產出6單位（40%損耗）
            },
            costs: {
                cash: 5,
                junior_required: 1             // 需要1個Junior
            },
            duration: 1                        // 1回合完成
        },
        // 灰色 → 合法
        compliance_upgrade: {
            id: 'compliance_upgrade',
            name: '合規化處理',
            icon: '📋',
            description: '將灰色數據轉為合規數據',
            unlock_tier: 2,
            input: {
                compliance: 'gray',
                amount: 20
            },
            output: {
                compliance: 'legal',
                amount: 12                     // 40%損耗
            },
            costs: {
                cash: 15,
                senior_required: 1             // 需要Senior審核
            },
            duration: 2,                       // 2回合完成
            effects: {
                compliance_risk_reduction: 10  // 降低合規風險
            }
        },
        // 專精組合 → 廣泛
        diversity_merge: {
            id: 'diversity_merge',
            name: '數據整合',
            icon: '🔀',
            description: '合併多種專精數據為通用數據',
            unlock_tier: 2,
            input: {
                diversity: 'focused',
                types_required: 2,             // 需要2種不同專精
                amount_each: 15
            },
            output: {
                diversity: 'broad',
                amount: 20
            },
            costs: {
                cash: 10,
                senior_required: 1
            },
            duration: 1
        }
    },

    // ==========================================
    // 數據衰減配置
    // ==========================================
    DECAY: {
        enabled_tier: 1,                       // Tier 1 開始啟用衰減
        // 高品質數據衰減
        high_quality: {
            rate: 0.10,                        // 每季10%降級為低品質
            minimum_threshold: 10,             // 低於10單位不衰減
            message: '部分高品質數據因過時而降級'
        },
        // 灰色數據累積風險
        gray_data: {
            regulation_per_turn: 2,            // 每季增加監管壓力
            audit_chance_base: 0.05,           // 基礎審計機率
            audit_chance_per_100: 0.02,        // 每100單位灰色數據增加的審計機率
            audit_penalty: {
                compliance_risk: 15,
                trust_loss: 10,
                cash_fine_ratio: 0.05          // 罰款為現金的5%
            }
        },
        // 合成數據不衰減
        synthetic: {
            rate: 0,
            description: '結構化數據不會過時'
        }
    },

    // ==========================================
    // 數據購買配置
    // ==========================================
    PURCHASE_OPTIONS: {
        // 單次購買
        spot: {
            id: 'spot',
            name: '現貨購買',
            icon: '🛒',
            price_multiplier: 1.0,
            min_amount: 10,
            max_amount: 500,
            available_types: ['legal_high_broad', 'legal_high_focused', 'legal_low']
        },
        // 長期合約（Tier 2）
        contract: {
            id: 'contract',
            name: '數據訂閱合約',
            icon: '📝',
            unlock_tier: 2,
            price_multiplier: 0.7,             // 7折
            duration: 4,                       // 4季合約
            delivery_per_turn: 50,             // 每季交付50單位
            available_types: ['legal_high_broad', 'legal_low'],
            cancellation_fee: 0.3              // 提前解約罰30%
        }
    },

        // ==========================================
    // 數據販賣配置（需 marketplace 研發解鎖）
    // ==========================================
    SELL_OPTIONS: {
        // 售價設定（購買價的折扣）
        price_multiplier: 0.6,                 // 售價為購買價的60%
        min_amount: 10,                        // 最低販賣量
        // 各類型售價（由低到高）
        type_prices: {
            legal_low: 0.6,                    // $0.6M/TB (購買價 $1M)
            legal_high_broad: 3.0,             // $3.0M/TB (購買價 $5M)
            legal_high_focused: 2.4            // $2.4M/TB (購買價 $4M)
        },
        // 販賣效果
        effects: {
            compliance_risk_reduction_per_100: 2,   // 每販賣100TB降低合規風險2點
            regulation_increase_per_sale: 1,        // 每次販賣增加監管壓力1點
            trust_loss_per_sale: 0                  // 販賣不影響信任度
        },
        // 解鎖條件（依 marketplace 等級）
        unlock_by_marketplace_level: {
            1: ['legal_low'],                       // Lv1: 僅可販賣 legal_low
            2: ['legal_low', 'legal_high_broad'],   // Lv2: 可販賣 legal_low + legal_high_broad
            3: ['legal_low', 'legal_high_broad', 'legal_high_focused']  // Lv3: 全部可販賣
        }
    },

    // ==========================================
    // 路線特化配置
    // ==========================================
    ROUTE_MODIFIERS: {
        'Scaling Law': {
            synthesis_efficiency: 1.2,         // 合成效率+20%
            decay_rate_modifier: 1.0,
            gray_data_tolerance: 0.8,          // 灰色數據懲罰-20%
            description: '擅長大規模數據處理'
        },
        'Efficiency': {
            synthesis_efficiency: 1.0,
            decay_rate_modifier: 0.5,          // 衰減速度-50%
            gray_data_tolerance: 1.2,          // 對灰色數據更敏感
            description: '數據保鮮能力強'
        },
        'OpenSource': {
            synthesis_efficiency: 0.9,
            decay_rate_modifier: 1.0,
            community_data_bonus: 1.5,         // 社群數據產出+50%
            gray_data_tolerance: 1.0,
            description: '社群數據來源豐富'
        },
        'Multimodal': {
            synthesis_efficiency: 1.1,
            decay_rate_modifier: 1.0,
            focused_data_bonus: 1.3,           // 專精數據效率+30%
            gray_data_tolerance: 1.0,
            description: '垂直領域數據專精'
        },
        'Embodied': {
            synthesis_efficiency: 1.0,
            decay_rate_modifier: 0.8,          // 衰減-20%
            gray_data_tolerance: 1.1,
            description: '實體數據穩定性高'
        },
        'Military': {
            synthesis_efficiency: 1.0,
            decay_rate_modifier: 1.0,
            gray_data_forbidden: true,         // 禁止使用灰色數據
            compliance_bonus: 1.5,             // 合規數據效率+50%
            description: '僅能使用合規數據'
        }
    },

    // ==========================================
    // 研發消耗配置
    // ==========================================
    RESEARCH_CONSUMPTION: {
        // 消耗優先順序
        priority: ['legal_high_broad', 'legal_high_focused', 'synthetic', 'legal_low', 'gray_high', 'gray_low'],
        // 品質對研發效率的影響
        quality_multipliers: {
            high: 1.3,
            medium: 1.0,    // 合成數據
            low: 0.7
        },
        // 合規性對風險的影響
        compliance_effects: {
            legal: { compliance_risk: 0, trust: 0 },
            gray: { compliance_risk: 2, trust: -1 }
        },
        // ==========================================
        // MP 成長的數據消耗曲線（模擬AI訓練的數據困難）
        // 公式：baseConsumption * (1 + mpScaling * sqrt(currentMP))
        // 低 MP 時消耗少，高 MP 時消耗快速增長但有上限
        // ==========================================
        mp_scaling: {
            base_consumption_per_mp: 3.0,    // 每1點MP成長基礎消耗3單位數據
            mp_scaling_factor: 0.08,         // MP影響係數（sqrt曲線）
            max_multiplier: 4.0,             // 最大消耗倍率（防止過於困難）
            min_consumption: 1,              // 最小消耗量
            // 里程碑跳變：每個Tier門檻前消耗略增
            tier_thresholds: {
                1: { mp: 25, consumption_boost: 1.1 },
                2: { mp: 60, consumption_boost: 1.2 },
                3: { mp: 120, consumption_boost: 1.3 },
                4: { mp: 200, consumption_boost: 1.5 },
                5: { mp: 350, consumption_boost: 1.8 }
            }
        }
    },

    // ==========================================
    // UI 顯示配置
    // ==========================================
    UI: {
        // 數據面板分類
        categories: [
            { key: 'legal', name: '合規數據', types: ['legal_high_broad', 'legal_high_focused', 'legal_low'] },
            { key: 'gray', name: '灰色數據', types: ['gray_high', 'gray_low'] },
            { key: 'synthetic', name: '合成數據', types: ['synthetic'] }
        ],
        // 警告閾值
        warnings: {
            low_data_threshold: 50,            // 數據不足警告
            high_gray_ratio: 0.3,              // 灰色數據佔比警告
            decay_warning: true                // 顯示衰減預警
        }
    }
};

// 導出到全局
window.DataConfig = DataConfig;

console.log('✓ Data Config loaded');
