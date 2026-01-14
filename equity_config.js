// ============================================
// 股權機制配置 (Equity Config)
// ============================================
// 設計：純數據配置與常量定義
// 功能：定義股權結構、IPO參數、持股效果

(function() {
    'use strict';

    const EquityConfig = {

        // ==========================================
        // 股權結構常量
        // ==========================================
        SHARE_TYPES: {
            founder: {
                id: 'founder',
                name: '創辦人持股',
                description: '創辦人/管理層持股，代表對企業的直接掌控力',
                icon: '👤',
                color: '#00f5ff'
            },
            investor: {
                id: 'investor',
                name: '投資人持股',
                description: '外部投資人持股，透過戰略融資增減',
                icon: '🏦',
                color: '#ffd000'
            },
            public: {
                id: 'public',
                name: '公開市場股份',
                description: 'IPO後公開流通股份，股價由社群指標決定',
                icon: '📈',
                color: '#00ff88'
            }
        },

        // ==========================================
        // 初始股權分配（依技術路線）
        // ==========================================
        INITIAL_EQUITY: {
            // 預設（IPO前100%創辦人持股）
            default: {
                founder_shares: 100,
                investor_shares: 0,
                public_shares: 0
            },
            // 各路線可有不同起始（透過初期融資歷史）
            'Scaling Law': {
                founder_shares: 85,
                investor_shares: 15,
                public_shares: 0
            },
            'Multimodal': {
                founder_shares: 90,
                investor_shares: 10,
                public_shares: 0
            },
            'Efficiency': {
                founder_shares: 95,
                investor_shares: 5,
                public_shares: 0
            },
            'Embodied': {
                founder_shares: 88,
                investor_shares: 12,
                public_shares: 0
            },
            'OpenSource': {
                founder_shares: 92,
                investor_shares: 8,
                public_shares: 0
            },
            'Military': {
                founder_shares: 80,
                investor_shares: 20,
                public_shares: 0
            }
        },

        // ==========================================
        // IPO 配置
        // ==========================================
        IPO: {
            // 發行規模選項
            SCALE_OPTIONS: {
                small: {
                    id: 'small',
                    name: '精選募資案',
                    description: '保守發行，維持較高控制權',
                    icon: '📉',
                    dilution: 0.10,          // 稀釋10%
                    cash_multiplier: 0.15,    // 市值×15%現金
                    hype_change: 15,
                    regulation_change: 10
                },
                medium: {
                    id: 'medium',
                    name: '中規模 IPO',
                    description: '平衡資金與控制權',
                    icon: '📊',
                    dilution: 0.20,          // 稀釋20%
                    cash_multiplier: 0.25,
                    hype_change: 25,
                    regulation_change: 20
                },
                large: {
                    id: 'large',
                    name: '大規模 IPO',
                    description: '積極融資，大幅稀釋股權',
                    icon: '📈',
                    dilution: 0.35,          // 稀釋35%
                    cash_multiplier: 0.40,
                    hype_change: 40,
                    regulation_change: 35
                }
            },
            // 發行定價選項
            PRICING_OPTIONS: {
                low: {
                    id: 'low',
                    name: '低定價',
                    description: '保守定價，快速完成認購',
                    icon: '💵',
                    cash_modifier: 0.8,      // 現金×0.8
                    hype_modifier: -10,      // 炒作-10
                    success_rate: 1.0        // 100%成功
                },
                high: {
                    id: 'high',
                    name: '高定價',
                    description: '激進定價，風險與收益並存',
                    icon: '💎',
                    cash_modifier: 1.3,      // 現金×1.3
                    hype_modifier: 15,       // 炒作+15
                    success_rate: 0.75       // 75%成功率
                }
            },
            // IPO基礎需求
            REQUIREMENTS: {
                min_tier: 2,
                min_market_cap: 200,
                min_trust: 20
            }
        },

        // ==========================================
        // 增發/回購配置
        // ==========================================
        SECONDARY_OFFERINGS: {
            // 增發新股
            stock_issue: {
                id: 'stock_issue',
                name: '增發新股',
                description: '向公開市場增發股份籌資',
                icon: '📈',
                min_cooldown: 3,
                options: {
                    small: {
                        dilution: 0.05,
                        cash_multiplier: 0.08,
                        founder_loss: 2.5,    // 創辦人持股-2.5%
                        public_gain: 5        // 公開股份+5%
                    },
                    large: {
                        dilution: 0.12,
                        cash_multiplier: 0.15,
                        founder_loss: 6,
                        public_gain: 12
                    }
                }
            },
            // 股票回購
            stock_buyback: {
                id: 'stock_buyback',
                name: '股票回購',
                description: '從公開市場回購股份',
                icon: '🔄',
                min_cooldown: 2,
                options: {
                    small: {
                        cash_cost_multiplier: 0.05,  // 市值×5%
                        founder_gain: 2,
                        public_loss: 2,
                        hype_change: 8
                    },
                    large: {
                        cash_cost_multiplier: 0.12,
                        founder_gain: 5,
                        public_loss: 5,
                        hype_change: 15
                    }
                }
            }
        },

        // ==========================================
        // 融資系統（影響 investor_shares）
        // ==========================================
        STRATEGIC_FUNDING: {
            // ==========================================
            // 一次性輪次融資（必須按順序完成：種子→A輪→B輪）
            // ==========================================
            FUNDING_ROUNDS: {
                seed: {
                    id: 'seed',
                    name: '種子輪',
                    description: '早期投資，小額高稀釋',
                    tier_required: 0,
                    order: 1,                       // 順序編號
                    one_time: true,                 // 一次性
                    cash_range: [20, 40],
                    dilution_range: [8, 15],
                    affinity_industries: ['research'],
                    affinity_bonus: 5
                },
                series_a: {
                    id: 'series_a',
                    name: 'A輪融資',
                    description: '成長期融資',
                    tier_required: 1,
                    order: 2,
                    one_time: true,
                    prerequisite: 'seed',           // 需先完成種子輪
                    cash_range: [50, 100],
                    dilution_range: [10, 18],
                    affinity_industries: ['enterprise', 'cloud_infra'],
                    affinity_bonus: 8
                },
                series_b: {
                    id: 'series_b',
                    name: 'B輪融資',
                    description: '擴張期融資',
                    tier_required: 2,
                    order: 3,
                    one_time: true,
                    prerequisite: 'series_a',       // 需先完成A輪
                    cash_range: [100, 200],
                    dilution_range: [8, 15],
                    affinity_industries: ['semiconductor', 'energy'],
                    affinity_bonus: 10
                }
            },
            
            // ==========================================
            // 可重複戰略投資
            // ==========================================
            STRATEGIC_INVESTMENT: {
                id: 'strategic',
                name: '戰略投資',
                description: '產業巨頭戰略入股，可多次進行',
                tier_required: 1,
                repeatable: true,                   // 可重複
                cooldown: 2,                        // 冷卻回合
                cash_range: [80, 180],
                dilution_range: [6, 12],
                affinity_industries: ['all'],       // 可選擇任一產業
                affinity_bonus: 10
            },
            
            // ==========================================
            // 合併所有類型（供引擎使用）
            // ==========================================
            TYPES: {
                seed: {
                    id: 'seed',
                    name: '種子輪',
                    description: '早期投資，小額高稀釋',
                    tier_required: 0,
                    order: 1,
                    one_time: true,
                    cash_range: [20, 40],
                    dilution_range: [8, 15],
                    affinity_industries: ['research'],
                    affinity_bonus: 5
                },
                series_a: {
                    id: 'series_a',
                    name: 'A輪融資',
                    description: '成長期融資',
                    tier_required: 1,
                    order: 2,
                    one_time: true,
                    prerequisite: 'seed',
                    cash_range: [50, 100],
                    dilution_range: [10, 18],
                    affinity_industries: ['enterprise', 'cloud_infra'],
                    affinity_bonus: 8
                },
                series_b: {
                    id: 'series_b',
                    name: 'B輪融資',
                    description: '擴張期融資',
                    tier_required: 2,
                    order: 3,
                    one_time: true,
                    prerequisite: 'series_a',
                    cash_range: [100, 200],
                    dilution_range: [8, 15],
                    affinity_industries: ['semiconductor', 'energy'],
                    affinity_bonus: 10
                },
                strategic: {
                    id: 'strategic',
                    name: '戰略投資',
                    description: '產業巨頭戰略入股',
                    tier_required: 2,
                    cash_range: [150, 300],
                    dilution_range: [10, 20],
                    affinity_industries: ['all'],  // 可選擇任一產業
                    affinity_bonus: 15,
                    requires_affinity: 20,          // 需已有20親和度
                    cooldown: 2  
                }
            },
            // 投資人類型（影響產業親和度）
            INVESTOR_PROFILES: {
                tech_vc: {
                    id: 'tech_vc',
                    name: '科技創投',
                    industries: ['semiconductor', 'cloud_infra'],
                    affinity_mult: 1.2
                },
                energy_fund: {
                    id: 'energy_fund',
                    name: '能源基金',
                    industries: ['energy'],
                    affinity_mult: 1.5
                },
                defense_contractor: {
                    id: 'defense_contractor',
                    name: '國防承包商',
                    industries: ['defense'],
                    affinity_mult: 1.3,
                    regulation_change: 10
                },
                consumer_giant: {
                    id: 'consumer_giant',
                    name: '消費巨頭',
                    industries: ['consumer', 'data_provider'],
                    affinity_mult: 1.2
                },
                sovereign_fund: {
                    id: 'sovereign_fund',
                    name: '主權基金',
                    industries: ['enterprise', 'research'],
                    affinity_mult: 1.0,
                    cash_mult: 1.3
                }
            }
        },

        // ==========================================
        // 持股效果配置
        // ==========================================
        SHARE_EFFECTS: {
            // 創辦人持股效果
            founder: {
                // 控制力：抵銷監管壓力
                regulation_resistance: {
                    base: 0.3,              // 基礎30%抵抗
                    per_10_percent: 0.05    // 每10%持股+5%抵抗
                },
                // 忠誠度維護
                loyalty_bonus: {
                    threshold: 50,          // 50%以上有加成
                    per_10_percent: 2       // 每超過10%，忠誠度+2
                },
                // 決策自由度（未來擴充）
                decision_freedom: {
                    high_control: 70,       // 70%以上完全自由
                    medium_control: 50,     // 50-70%大部分自由
                    low_control: 30         // 30%以下受限
                }
            },
            // 投資人持股效果
            investor: {
                // 產業親和度加成
                affinity_bonus: {
                    per_5_percent: 3        // 每5%投資人持股，親和度+3
                },
                // 融資效率
                funding_efficiency: {
                    per_10_percent: 0.05    // 每10%持股，融資效率+5%
                },
                // 監管壓力
                regulation_pressure: {
                    threshold: 30,          // 30%以上增加監管
                    per_10_percent: 2
                }
            },
            // 公開市場股份效果
            public: {
                // 信任度加成（公眾監督）
                trust_bonus: {
                    per_10_percent: 3       // 每10%公開股份，信任+3
                },
                // 股價波動（基於社群指標）
                price_volatility: {
                    sentiment_weight: 0.4,
                    engagement_weight: 0.3,
                    size_weight: 0.3
                },
                // Hype乘數
                hype_sensitivity: {
                    per_10_percent: 0.1     // 每10%公開股份，hype影響×1.1
                }
            }
        },

        // ==========================================
        // 股價計算配置（IPO後）
        // ==========================================
        STOCK_PRICE: {
            // 基礎股價 = 市值 / 總股數（簡化為市值相關）
            base_from_market_cap: true,
            
            // 社群指標權重
            community_weights: {
                sentiment: 0.40,    // 情緒佔40%
                engagement: 0.35,   // 活躍度佔35%
                size: 0.25          // 規模佔25%
            },
            
            // 情緒對股價影響
            sentiment_multipliers: {
                HOSTILE: 0.6,
                NEGATIVE: 0.8,
                NEUTRAL: 1.0,
                POSITIVE: 1.2,
                DEVOTED: 1.5
            },
            
            // 活躍度對股價影響
            engagement_multipliers: {
                DEAD: 0.7,
                LOW: 0.85,
                MODERATE: 1.0,
                ACTIVE: 1.15,
                VIRAL: 1.35
            },
            
            // 規模對股價影響
            size_tiers: {
                small: { max: 10000, mult: 0.9 },
                medium: { max: 100000, mult: 1.0 },
                large: { max: Infinity, mult: 1.15 }
            }
        },

        // ==========================================
        // UI 顯示配置
        // ==========================================
        UI: {
            // 持股比例顏色閾值
            SHARE_COLORS: {
                founder: {
                    high: { threshold: 60, color: '#00ff88' },
                    medium: { threshold: 40, color: '#ffd000' },
                    low: { threshold: 0, color: '#ff4444' }
                }
            },
            // 控制力等級
            CONTROL_LEVELS: {
                absolute: { min: 80, name: '絕對控制', icon: '👑' },
                majority: { min: 50, name: '多數控制', icon: '✊' },
                minority: { min: 30, name: '少數控制', icon: '🤝' },
                passive: { min: 0, name: '被動持股', icon: '📉' }
            }
        }
    };

    // 全域註冊
    window.EquityConfig = EquityConfig;
    console.log('✓ Equity Config loaded');

})();