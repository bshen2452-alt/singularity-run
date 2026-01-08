// ============================================
// 策略藍圖系統配置 - Strategy Blueprint Config
// ============================================
// 功能：定義策略藍圖技能池的配置數據
// 設計：純數據配置，無邏輯混雜
// 資源：共用商品系統的熟練度 (mastery)

const STRATEGY_BLUEPRINT_CONFIG = {
    
    // ==========================================
    // 系統設定
    // ==========================================
    SYSTEM: {
        mastery_source: 'product_mastery',    // 共用商品系統熟練度
        skill_permanent: true,                 // 技能啟用後永久生效，無法取消
        max_skills_per_route: 18,
        categories_per_route: 3
    },

    // ==========================================
    // 技能類別定義
    // ==========================================
    SKILL_CATEGORIES: {
        internal: {
            id: 'internal',
            name: '內部經營',
            icon: '🏢',
            description: '組織管理與人才發展',
            color: '#00f5ff'
        },
        external: {
            id: 'external', 
            name: '外部公關',
            icon: '🤝',
            description: '市場關係與輿論操作',
            color: '#ff00aa'
        },
        risk: {
            id: 'risk',
            name: '風險管理',
            icon: '🛡️',
            description: '危機預防與損害控制',
            color: '#ffd000'
        }
    },

    // ==========================================
    // 路線專精定義
    // ==========================================
    ROUTE_SPECIALIZATIONS: {
        OpenSource: {
            id: 'OpenSource',
            name: '開源路線',
            core_resource: 'trust',
            core_resource_name: '信任度',
            icon: '🌐',
            color: '#aa44ff',
            theme: '動員社群 vs. 駕馭失控',
            specialization_bonuses: [
                { threshold: 6,  effect: { trust_gain_mult: 1.10 }, desc: '信任度獲取+10%' },
                { threshold: 12, effect: { trust_gain_mult: 1.25 }, desc: '信任度獲取+25%' },
                { threshold: 18, effect: { trust_decay_mult: 0.5 }, desc: '信任度流失-50%' }
            ]
        },
        Military: {
            id: 'Military',
            name: '軍工路線',
            core_resource: 'regulation',
            core_resource_name: '監管壓力',
            icon: '🎖️',
            color: '#ff3366',
            theme: '國家力量 vs. 公眾監督',
            specialization_bonuses: [
                { threshold: 6,  effect: { regulation_resistance: 0.10 }, desc: '監管壓力抵抗+10%' },
                { threshold: 12, effect: { regulation_resistance: 0.25 }, desc: '監管壓力抵抗+25%' },
                { threshold: 18, effect: { regulation_immunity: true }, desc: '免疫監管壓力負面事件' }
            ]
        },
        Multimodal: {
            id: 'Multimodal',
            name: '多模態路線',
            core_resource: 'hype',
            core_resource_name: '炒作度',
            icon: '🎨',
            color: '#ff00aa',
            theme: '話題熱度 vs. 泡沫風險',
            specialization_bonuses: [
                { threshold: 6,  effect: { hype_gain_mult: 1.15 }, desc: '炒作度獲取+15%' },
                { threshold: 12, effect: { hype_crash_resist: 0.3 }, desc: '炒作崩盤傷害-30%' },
                { threshold: 18, effect: { hype_to_valuation: 0.5 }, desc: '炒作度轉化市值效率+50%' }
            ]
        },
        Embodied: {
            id: 'Embodied',
            name: '具身智慧路線',
            core_resource: 'space_power',
            core_resource_name: '空間/電力',
            icon: '🤖',
            color: '#ffd000',
            theme: '實體擴張 vs. 資源瓶頸',
            specialization_bonuses: [
                { threshold: 6,  effect: { power_cost_mult: 0.90 }, desc: '電力成本-10%' },
                { threshold: 12, effect: { space_efficiency: 1.20 }, desc: '空間使用效率+20%' },
                { threshold: 18, effect: { facility_build_speed: 1.5 }, desc: '設施建造速度+50%' }
            ]
        },
        Efficiency: {
            id: 'Efficiency',
            name: '技術優化路線',
            core_resource: 'loyalty',
            core_resource_name: '忠誠度',
            icon: '⚙️',
            color: '#00ff88',
            theme: '精益求精 vs. 人才流失',
            specialization_bonuses: [
                { threshold: 6,  effect: { loyalty_decay_mult: 0.85 }, desc: '忠誠度流失-15%' },
                { threshold: 12, effect: { talent_efficiency: 1.20 }, desc: '人才產出效率+20%' },
                { threshold: 18, effect: { elite_retention: true }, desc: '頂級人才不會離職' }
            ]
        },
        'Scaling Law': {
            id: 'Scaling Law',
            name: 'Scaling Law路線',
            core_resource: 'cash',
            core_resource_name: '現金',
            icon: '📈',
            color: '#00f5ff',
            theme: '規模擴張 vs. 資金斷鏈',
            specialization_bonuses: [
                { threshold: 6,  effect: { revenue_mult: 1.10 }, desc: '收入+10%' },
                { threshold: 12, effect: { cost_mult: 0.90 }, desc: '營運成本-10%' },
                { threshold: 18, effect: { cash_crisis_shield: true }, desc: '現金危機時自動獲得緊急融資' }
            ]
        }
    },

    // ==========================================
    // 技能定義 - 開源路線 (OpenSource)
    // ==========================================
    SKILLS: {
        
        // ------------------------------------------
        // 開源路線 - 內部經營 (6個)
        // ------------------------------------------
        
        os_internal_001: {
            id: 'os_internal_001',
            route: 'OpenSource',
            category: 'internal',
            name: '數位佈道者',
            name_en: 'Evangelism',
            cost: 400,
            description: '傳遞願景並建立形象，讓人們自發匯聚。',
            effects: {
                hire_cost_mult: 0.85,           // 招聘成本 -15%
                loyalty_per_turn: 2             // 每回合忠誠度 +2
            }
        },

        os_internal_002: {
            id: 'os_internal_002',
            route: 'OpenSource',
            category: 'internal',
            name: '代碼分叉控制',
            name_en: 'Fork Management',
            cost: 600,
            description: '當社群意見分歧時，強制整合不同版本，保持標準制定的權威性。',
            effects: {
                community_risk_reduction: 0.30  // 社群規模觸發的風險事件影響 -30%
            }
        },

        os_internal_003: {
            id: 'os_internal_003',
            route: 'OpenSource',
            category: 'internal',
            name: '共識驅動決策',
            name_en: 'Consensus Governance',
            cost: 500,
            description: '經營社群討論決定未來發展。',
            effects: {
                engagement_per_turn: 3,         // 每回合活躍度 +3
                sentiment_per_turn: 2,          // 每回合情緒 +2
                mp_growth_mult: 0.95            // MP成長 -5%
            }
        },

        os_internal_004: {
            id: 'os_internal_004',
            route: 'OpenSource',
            category: 'internal',
            name: '賞金獵人機制',
            name_en: 'Bounty Program',
            cost: 700,
            description: '將特定的研發任務外包給社群，加速研究進展。',
            effects: {
                cash_per_turn: -5,              // 每回合消耗 $5M
                mp_per_turn: 0.8,               // 每回合 MP +0.8
                entropy_per_turn: 2             // 每回合熵值 +2
            }
        },

        os_internal_005: {
            id: 'os_internal_005',
            route: 'OpenSource',
            category: 'internal',
            name: '黑客松衝刺',
            name_en: 'Hackathon Sprint',
            cost: 550,
            description: '活躍社群帶來產品充分討論的活力。',
            effects: {
                alignment_per_engagement: 0.05  // 每點活躍度提供 0.05 對齊度
            }
        },

        os_internal_006: {
            id: 'os_internal_006',
            route: 'OpenSource',
            category: 'internal',
            name: '代幣獎勵',
            name_en: 'Tokenomics Governance',
            cost: 800,
            description: '以虛擬貨幣獎勵社群開發者。',
            effects: {
                salary_cost_mult: 0.80,         // 薪資成本 -20%
                loyalty_trust_penalty: {        // 信任度<30時，忠誠度懲罰
                    trust_threshold: 30,
                    loyalty_penalty_per_turn: -3
                }
            }
        },

        // ------------------------------------------
        // 開源路線 - 外部公關 (6個)
        // ------------------------------------------

        os_external_001: {
            id: 'os_external_001',
            route: 'OpenSource',
            category: 'external',
            name: '道德高地',
            name_en: 'Moral High Ground',
            cost: 600,
            description: '透過輿論壓力迫使政府放棄審查。',
            effects: {
                regulation_reduction_per_1k_community: 0.1  // 每1000社群成員抵銷 0.1 監管壓力
            }
        },

        os_external_002: {
            id: 'os_external_002',
            route: 'OpenSource',
            category: 'external',
            name: '壟斷戰術',
            name_en: 'Format War',
            cost: 750,
            description: '要求所有入駐社群的第三方廠商遵守標準。',
            effects: {
                product_category_bonus: {
                    category: 'standard_setting',  // 標準制定類產品
                    revenue_mult: 1.25             // 收入 +25%
                },
                hype_per_turn: 3,               // 每回合炒作度 +3
                sentiment_per_turn: -2          // 每回合情緒 -2
            }
        },

        os_external_003: {
            id: 'os_external_003',
            route: 'OpenSource',
            category: 'external',
            name: '反壟斷旗手',
            name_en: 'Antitrust Evangelist',
            cost: 700,
            description: '發起輿論攻擊，大幅增加公眾對閉源模型的警覺。',
            effects: {
                product_category_bonus: {
                    category: 'decentralized',     // 去中心化類產品
                    revenue_mult: 1.30             // 收入 +30%
                },
                hype_per_turn: 4,               // 每回合炒作度 +4
                community_growth_mult: 1.10     // 社群成長 +10%
            }
        },

        os_external_004: {
            id: 'os_external_004',
            route: 'OpenSource',
            category: 'external',
            name: '市場合作協議',
            name_en: 'Market Partnership',
            cost: 500,
            description: '與業界攜手合作，完善對方產品並獲得開發經驗。',
            effects: {
                hype_per_turn: -5,              // 每回合炒作度 -5
                mp_per_turn: 0.5                // 每回合 MP +0.5
            }
        },

        os_external_005: {
            id: 'os_external_005',
            route: 'OpenSource',
            category: 'external',
            name: '透明度報告',
            name_en: 'Radical Transparency',
            cost: 650,
            description: '定期公開所有模型的訓練細節、權重與數據源。',
            effects: {
                trust_per_turn: 3,              // 每回合信任度 +3
                regulation_per_turn: -2         // 每回合監管壓力 -2
            }
        },

        os_external_006: {
            id: 'os_external_006',
            route: 'OpenSource',
            category: 'external',
            name: '有限開源策略',
            name_en: 'Selective Openness',
            cost: 450,
            description: '只要尚未公開，就不能證明其存在。',
            effects: {
                trust_per_turn: -1,             // 每回合信任度 -1
                compliance_risk_mult: 0.85      // 合規風險 -15%
            }
        },

        // ------------------------------------------
        // 開源路線 - 風險管理 (6個)
        // ------------------------------------------

        os_risk_001: {
            id: 'os_risk_001',
            route: 'OpenSource',
            category: 'risk',
            name: '數據避難所',
            name_en: 'Data Sanctuary',
            cost: 800,
            description: '在被政府查封前，自動將數據資源備份至全球P2P網絡。',
            effects: {
                regulation_penalty_mult: 0.60   // 監管壓力負面效果 -40%
            }
        },

        os_risk_002: {
            id: 'os_risk_002',
            route: 'OpenSource',
            category: 'risk',
            name: '聯邦訓練',
            name_en: 'Distributed Training',
            cost: 900,
            description: '讓全球用戶的顯卡在閒置時幫你跑訓練。',
            effects: {
                pflops_per_10k_community: 0.1,  // 每1萬社群成員提供 0.1 PFLOPS
                engagement_per_turn: -2         // 每回合活躍度 -2
            }
        },

        os_risk_003: {
            id: 'os_risk_003',
            route: 'OpenSource',
            category: 'risk',
            name: '眾包審核',
            name_en: 'Crowd Alignment',
            cost: 700,
            description: '讓全球用戶參與對齊工作，解決開源模型「容易學壞」的通病。',
            effects: {
                alignment_no_compute: true,     // 對齊研究不消耗算力
                compliance_risk_per_turn: -3    // 每回合合規風險 -3
            }
        },

        os_risk_004: {
            id: 'os_risk_004',
            route: 'OpenSource',
            category: 'risk',
            name: '混沌演算法',
            name_en: 'Chaos Engineering',
            cost: 1000,
            description: '接受模型的不可預測性。',
            effects: {
                entropy_emergence: {
                    threshold: 70,              // 熵值 >70 時觸發
                    mp_bonus_min: 1,            // 最小MP獎勵
                    mp_bonus_max: 100             // 最大MP獎勵
                }
            }
        },

        os_risk_005: {
            id: 'os_risk_005',
            route: 'OpenSource',
            category: 'risk',
            name: '開源洗白術',
            name_en: 'Open-washing',
            cost: 600,
            description: '我只是公開一個產品，被別人拿去誤用了干我什麼事？',
            effects: {
                trust_per_turn: -4,             // 每回合信任度 -4
                regulation_per_turn: -8,        // 每回合監管壓力 -8
                engagement_per_turn: -3         // 每回合活躍度 -3
            }
        },

        os_risk_006: {
            id: 'os_risk_006',
            route: 'OpenSource',
            category: 'risk',
            name: '毒丸授權',
            name_en: 'Poison Pill Licensing',
            cost: 850,
            description: '定型化契約條款寫明，任何使用你技術的閉源公司，必須回饋其數據。',
            effects: {
                product_category_bonus: {
                    category: 'mass_adoption',     // 普及推廣類產品
                    data_gain_mult: 1.50           // 數據獲取 +50%
                },
                compliance_risk_per_turn: 2     // 每回合合規風險 +2
            }
        },
    
        // ==========================================
        // 多模態路線 - 內部經營 (6個)
        // ==========================================
        
        mm_internal_001: {
            id: 'mm_internal_001',
            route: 'Multimodal',
            category: 'internal',
            name: '多巴胺開發環境',
            name_en: 'Dopamine Engineering',
            cost: 500,
            description: '利用 AI 優化辦公環境的視聽回饋，讓研發人員進入極致的「心流」狀態。',
            effects: {
                mp_growth_mult: 1.15,           // MP研發效率 +15%
                loyalty_per_turn: 3,            // 每回合忠誠度 +3
                cash_per_turn: -3,              // 每回合維護費 -$3M
                loyalty_cash_dependency: {       // 現金流依賴
                    check_condition: 'cash_negative', // 當現金流為負時
                    loyalty_penalty: -8          // 忠誠度懲罰
                }
            }
        },

        mm_internal_002: {
            id: 'mm_internal_002',
            route: 'Multimodal',
            category: 'internal',
            name: '跨模態語義對齊',
            name_en: 'Cross-Modal Alignment',
            cost: 700,
            description: '強行統一文字、影像、神經訊號的邏輯框架，讓產出變得規矩但無趣。',
            effects: {
                entropy_per_turn: -5,           // 每回合熵值 -5
                alignment_per_turn: 3,          // 每回合對齊度 +3
                hype_per_turn: -2               // 每回合炒作度 -2
            }
        },

        mm_internal_003: {
            id: 'mm_internal_003',
            route: 'Multimodal',
            category: 'internal',
            name: '亞文化探測雷達',
            name_en: 'Subculture Pulse',
            cost: 600,
            description: '建立實時爬蟲與分析系統，從全球社交媒體挖掘即將爆發的亞文化與迷因趨勢。',
            effects: {
                hype_to_mp_conversion: {         // 炒作度轉MP機制
                    hype_cost_per_turn: 5,       // 每回合消耗 5 炒作度
                    mp_gain_per_turn: 1.0        // 每回合獲得 1 MP
                }
            }
        },

        mm_internal_004: {
            id: 'mm_internal_004',
            route: 'Multimodal',
            category: 'internal',
            name: '數位煉金術',
            name_en: 'Digital Alchemy',
            cost: 550,
            description: '將廢棄的內容殘餘數據重新洗滌，作為研發模型的基礎噪音。',
            effects: {
                data_consumption_mult: 0.70,    // 數據消耗 -30%
                alignment_per_turn: -1          // 每回合對齊度 -1
            }
        },

        mm_internal_005: {
            id: 'mm_internal_005',
            route: 'Multimodal',
            category: 'internal',
            name: 'IP 矩陣聯動',
            name_en: 'Cross-Media Synergy',
            cost: 900,
            description: '將同一個 AI 邏輯同時應用於各類產品間，產生協同效應。',
            effects: {
                product_dev_cost_mult: 0.75,    // 產品研發成本 -25%
                product_hype_bonus: 10,         // 新產品發布時炒作度額外 +10
                route_restriction: 'Multimodal' // 僅限多模態路線產品
            }
        },

        mm_internal_006: {
            id: 'mm_internal_006',
            route: 'Multimodal',
            category: 'internal',
            name: '感官超頻工作室',
            name_en: 'Sensory Overdrive Studio',
            cost: 650,
            description: '建立專門的感官設計團隊，將每一個輸出都調校到最具衝擊力的狀態。',
            effects: {
                senior_efficiency_mult: 1.20,   // Senior 效率 +20%
                entropy_per_turn: 2,            // 每回合熵值 +2
                hype_per_turn: 3                // 每回合炒作度 +3
            }
        },

        // ==========================================
        // 多模態路線 - 外部公關 (6個)
        // ==========================================

        mm_external_001: {
            id: 'mm_external_001',
            route: 'Multimodal',
            category: 'external',
            name: '感官溢價策略',
            name_en: 'Sensory Premium',
            cost: 800,
            description: '讓產品產出的視覺與音效具備生理上的成癮性，用戶欲罷不能。',
            effects: {
                product_category_bonus: {
                    categories: ['entertainment', 'interaction'], // 娛樂創作與人機互動類
                    revenue_hype_scaling: {      // 收入隨炒作度倍增
                        base_mult: 1.0,
                        hype_threshold: 50,      // 炒作度 >50 時生效
                        bonus_per_10_hype: 0.15  // 每 10 點炒作度額外 +15% 收入
                    }
                },
                trust_per_turn: -2              // 每回合信任度 -2
            }
        },

        mm_external_002: {
            id: 'mm_external_002',
            route: 'Multimodal',
            category: 'external',
            name: '迴聲屏障',
            name_en: 'Echo Chamber Construction',
            cost: 750,
            description: '在社群媒體精準推送，將質疑聲浪隔離在小眾圈子，代價是系統混亂。',
            effects: {
                regulation_to_entropy_conversion: {  // 監管壓力轉熵值
                    hype_cost_per_turn: 10,          // 每回合消耗 10 炒作度
                    regulation_reduction: 5,          // 減少 5 監管壓力
                    entropy_gain: 3                   // 增加 3 熵值
                }
            }
        },

        mm_external_003: {
            id: 'mm_external_003',
            route: 'Multimodal',
            category: 'external',
            name: '情感認證標章',
            name_en: 'Emotional Wellness Certification',
            cost: 650,
            description: '與權威心理學機構合作，推動心理道德認證，提升產品正當性。',
            effects: {
                sentiment_to_compliance_shield: {    // 社群情緒抵銷合規風險
                    sentiment_threshold: 60,          // 情緒 >60 時生效
                    compliance_reduction_rate: 0.30   // 合規風險影響 -30%
                }
            }
        },

        mm_external_004: {
            id: 'mm_external_004',
            route: 'Multimodal',
            category: 'external',
            name: '開放式敘事工坊',
            name_en: 'Open Narrative Workshop',
            cost: 700,
            description: '邀請用戶深度體驗自家的生成式產品，創造病毒式傳播。',
            effects: {
                hype_per_turn: 8,               // 每回合炒作度 +8
                engagement_per_turn: 5,         // 每回合社群活躍度 +5
                compliance_risk_per_turn: -2    // 每回合合規風險 -2
            }
        },

        mm_external_005: {
            id: 'mm_external_005',
            route: 'Multimodal',
            category: 'external',
            name: '情緒稅',
            name_en: 'Emotional Rent',
            cost: 850,
            description: '讓 AI 伴侶在用戶最孤獨、情緒最脆弱時進行產品推廣。',
            effects: {
                product_category_bonus: {
                    categories: ['interaction'],     // 人機互動類
                    revenue_hype_conditional: {      // 條件式收入加成
                        hype_threshold: 70,          // 炒作度 >70 時生效
                        revenue_mult: 2.0            // 收入 +100%
                    }
                },
                sentiment_risk: {                    // 情緒崩盤風險
                    trigger_chance_per_turn: 0.15,   // 每回合 15% 機率
                    sentiment_penalty: -10           // 社群情緒 -10
                }
            }
        },

        mm_external_006: {
            id: 'mm_external_006',
            route: 'Multimodal',
            category: 'external',
            name: '沉浸式發布會',
            name_en: 'Immersive Launch Event',
            cost: 600,
            description: '每次產品發布都變成一場感官盛宴，讓媒體爭相報導。',
            effects: {
                product_launch_bonus: {
                    hype_gain: 20,                   // 產品發布時炒作度 +20
                    community_growth: 500,           // 社群成長 +500
                    cash_cost: 15                    // 花費 $15M
                }
            }
        },

        // ==========================================
        // 多模態路線 - 風險管理 (6個)
        // ==========================================

        mm_risk_001: {
            id: 'mm_risk_001',
            route: 'Multimodal',
            category: 'risk',
            name: '倫理濾鏡',
            name_en: 'Ethics Filter',
            cost: 700,
            description: '在模型輸出前，由一組輕量級 AI 進行人類價值觀過濾。',
            effects: {
                alignment_per_turn: 4,          // 每回合對齊度 +4
                mp_growth_mult: 0.90            // MP研發獲得 -10%
            }
        },

        mm_risk_002: {
            id: 'mm_risk_002',
            route: 'Multimodal',
            category: 'risk',
            name: '現實錨點',
            name_en: 'Reality Anchor',
            cost: 650,
            description: '強制在所有虛擬內容中植入無法磨滅的數位浮水印，證明其非現實。',
            effects: {
                regulation_per_turn: -4,        // 每回合監管壓力 -4
                hype_per_turn: -3               // 每回合炒作度 -3
            }
        },

        mm_risk_003: {
            id: 'mm_risk_003',
            route: 'Multimodal',
            category: 'risk',
            name: '認知免疫機制',
            name_en: 'Cognitive Immunity System',
            cost: 600,
            description: '設計一套內置的「防沉迷」系統，誘導用戶維持心理健康平衡。',
            effects: {
                compliance_risk_per_turn: -4,   // 每回合合規風險 -4
                engagement_per_turn: -3         // 每回合社群活躍度 -3
            }
        },

        mm_risk_004: {
            id: 'mm_risk_004',
            route: 'Multimodal',
            category: 'risk',
            name: '動態倫理邊界測試',
            name_en: 'Dynamic Ethics Boundary Testing',
            cost: 800,
            description: '用極具爭議性的邊界案例去測試和挑戰自家系統，並即時調整輸出過濾器。',
            effects: {
                entropy_per_turn: 3,            // 每回合熵值 +3
                regulation_per_turn: -5         // 每回合監管壓力 -5
            }
        },

        mm_risk_005: {
            id: 'mm_risk_005',
            route: 'Multimodal',
            category: 'risk',
            name: '感官斷路器',
            name_en: 'Sensory Circuit Breaker',
            cost: 1000,
            description: '當 AI 輸出內容出現偏差時，瞬間過濾所有違規訊號，代價是效能損失。',
            effects: {
                emergency_reset: {               // 緊急重置機制
                    mp_sacrifice_rate: 0.20,     // 犧牲 20% 當前 MP
                    compliance_risk_reduction: 0.50, // 合規風險降低 50%
                    entropy_reduction: 0.50,     // 熵值降低 50%
                    trust_penalty: -5            // 信任度 -5
                },
                trigger_condition: 'manual'      // 手動觸發
            }
        },

        mm_risk_006: {
            id: 'mm_risk_006',
            route: 'Multimodal',
            category: 'risk',
            name: '群體潛意識對齊',
            name_en: 'Subliminal Alignment',
            cost: 950,
            description: '不修改 AI，而是透過暗示與環境誘導，讓人類「覺得」AI 的行為是正常的。',
            effects: {
                entropy_cap_increase: 20,       // 熵值上限 +20
                entropy_catastrophe: {           // 熵值災難機制
                    entropy_threshold: 85,       // 熵值 >85 時有機率觸發
                    trigger_chance: 0.25,        // 25% 機率
                    event_name: '精神污染事件',
                    effects: {
                        trust_penalty: -25,      // 信任度 -25
                        hype_penalty: -15,       // 炒作度 -15
                        sentiment_penalty: -20   // 社群情緒 -20
                    }
                }
            }
        },

        // ==========================================
        // 軍工路線 - 內部經營 (6個)
        // ==========================================
        
        mi_internal_001: {
            id: 'mi_internal_001',
            route: 'Military',
            category: 'internal',
            name: '旋轉門機制',
            name_en: 'Revolving Door',
            cost: 500,
            description: '聘請退役將領與政府官員擔任顧問，打通軍政體系。',
            effects: {
                senior_hire_cost_mult: 0.50,    // 高級人員招聘成本 -50%
                high_data_per_turn: 20          // 每回合獲得 20 高級數據
            }
        },

        mi_internal_002: {
            id: 'mi_internal_002',
            route: 'Military',
            category: 'internal',
            name: '國防政策補助',
            name_en: 'Blank Check Policy',
            cost: 800,
            description: '錢能解決的問題都不是問題。國防預算可轉化為各類稀缺資源。',
            effects: {
                cash_to_resource_conversion: {   // 現金轉資源機制
                    enabled: true,
                    options: [
                        { target: 'senior', ratio: 20, desc: '花 $20M 招聘 1 名高級人員' },
                        { target: 'high_data', ratio: 0.2, desc: '花 $1M 獲得 5 高級數據' },
                        { target: 'pflops', ratio: 15, desc: '花 $15M 獲得 1 PFLOPS' }
                    ]
                },
                regulation_per_use: 3            // 每次使用監管壓力 +3
            }
        },

        mi_internal_003: {
            id: 'mi_internal_003',
            route: 'Military',
            category: 'internal',
            name: '數據脫敏特權',
            name_en: 'Data Sanitization Privilege',
            cost: 600,
            description: '獲准利用脫敏的國家數據庫訓練 AI 模型。',
            effects: {
                data_gain_mult: 1.30,           // 數據獲取效率 +30%
                alignment_per_turn: -2          // 每回合對齊度 -2
            }
        },

        mi_internal_004: {
            id: 'mi_internal_004',
            route: 'Military',
            category: 'internal',
            name: '逆向工程實驗室',
            name_en: 'Reverse Engineering Lab',
            cost: 700,
            description: '專門「研究」從各種非正規渠道獲取的競爭對手或敵對國家的硬件與軟體。',
            effects: {
                product_category_bonus: {
                    categories: ['drone_swarm', 'cyber_security'],  // 無人集群與網路資安類
                    dev_cost_mult: 0.70          // 開發成本 -30%
                },
                compliance_risk_per_turn: 3      // 每回合合規風險 +3
            }
        },

        mi_internal_005: {
            id: 'mi_internal_005',
            route: 'Military',
            category: 'internal',
            name: '幽靈供應鏈',
            name_en: 'Ghost Supply Chain',
            cost: 750,
            description: '建立一條完全隱蔽、不受制裁和審計影響的關鍵零部件供應鏈。',
            effects: {
                cash_per_turn: -5,              // 每回合維護費 -$5M
                product_category_bonus: {
                    categories: ['drone_swarm'],
                    compliance_risk_mult: 0.60   // 無人集群類合規風險 -40%
                }
            }
        },

        mi_internal_006: {
            id: 'mi_internal_006',
            route: 'Military',
            category: 'internal',
            name: '隔離開發',
            name_en: 'Black Site Operations',
            cost: 650,
            description: '在極密基地進行研發，員工與世隔絕，完全規避監管審查。',
            effects: {
                product_dev_compliance_immunity: true,  // 研發產品時合規風險不增加
                loyalty_per_turn: -3            // 每回合忠誠度 -3
            }
        },

        // ==========================================
        // 軍工路線 - 外部公關 (6個)
        // ==========================================

        mi_external_001: {
            id: 'mi_external_001',
            route: 'Military',
            category: 'external',
            name: '愛國者法案',
            name_en: 'Patriot Privilege',
            cost: 700,
            description: '宣稱 AI 是國防基石，任何對公司的市場競爭都是對國家的威脅。',
            effects: {
                regulation_per_turn: -5,        // 每回合監管壓力 -5
                cash_per_turn: 10,              // 每回合國防補貼 +$10M
                trust_per_turn: -2,             // 每回合信任度 -2
                data_gain_mult: 0.85            // 數據獲取效率 -15%
            }
        },

        mi_external_002: {
            id: 'mi_external_002',
            route: 'Military',
            category: 'external',
            name: '技術禁運',
            name_en: 'Tech Embargo',
            cost: 600,
            description: '游說政府將特定技術列為出口管制，人為製造稀缺性。',
            effects: {
                global_mp_growth_penalty: 0.90, // 全局研發速度 -10%（包括自己）
                hype_per_turn: 5                // 每回合炒作度 +5（稀缺溢價）
            }
        },

        mi_external_003: {
            id: 'mi_external_003',
            route: 'Military',
            category: 'external',
            name: '威懾敘事',
            name_en: 'Deterrence Rhetoric',
            cost: 550,
            description: '對外宣傳 AI 的強大破壞力以維持和平——沒人敢輕易罰你。',
            effects: {
                trust_per_turn: -3,             // 每回合信任度 -3
                compliance_risk_penalty_mult: 0.50  // 合規風險的負面效果 -50%
            }
        },

        mi_external_004: {
            id: 'mi_external_004',
            route: 'Military',
            category: 'external',
            name: '危機製造者',
            name_en: 'Crisis Manufacturing',
            cost: 900,
            description: '透過 AI 預測（或誘導）一場小規模衝突，證明產品的必要性。',
            effects: {
                instant_effect: {                // 即時效果（手動觸發）
                    hype_gain: 30,               // 炒作度 +30
                    cash_gain: 50,               // 緊急訂單 +$50M
                    trust_risk: {
                        trigger_chance: 0.35,    // 35% 機率
                        trust_penalty: -20       // 信任度 -20
                    }
                },
                cooldown_turns: 8                // 冷卻 8 回合
            }
        },

        mi_external_005: {
            id: 'mi_external_005',
            route: 'Military',
            category: 'external',
            name: '民用溢出神話',
            name_en: 'Civilian Spin-off',
            cost: 500,
            description: '宣傳軍事技術如何改善民生（如 GPS 或網際網路），緩解社會敵意。',
            effects: {
                product_trust_bonus: 3,         // 所有產品額外提供 +3 信任度
                sentiment_per_turn: 2           // 每回合社群情緒 +2
            }
        },

        mi_external_006: {
            id: 'mi_external_006',
            route: 'Military',
            category: 'external',
            name: '戰略模糊',
            name_en: 'Strategic Ambiguity',
            cost: 650,
            description: '模糊產品的真實用途，對外宣稱為「救援」或「勘測」工具。',
            effects: {
                regulation_per_turn: -3,        // 每回合監管壓力 -3
                compliance_risk_per_turn: -2,   // 每回合合規風險 -2
                alignment_per_turn: -1,         // 每回合對齊度 -1
                mp_growth_mult: 0.95            // MP研發 -5%
            }
        },

        // ==========================================
        // 軍工路線 - 風險管理 (6個)
        // ==========================================

        mi_risk_001: {
            id: 'mi_risk_001',
            route: 'Military',
            category: 'risk',
            name: '焦土政策',
            name_en: 'Scorched Earth Protocol',
            cost: 1000,
            description: '遭駭客入侵或監管調查時，立刻物理毀滅伺服器與數據。',
            effects: {
                emergency_purge: {               // 緊急清除（手動觸發）
                    compliance_risk_reset: true, // 合規風險歸零
                    regulation_reset: true,      // 監管壓力歸零
                    data_loss_rate: 0.30,        // 損失 30% 數據
                    cash_cost: 30                // 花費 $30M
                },
                trigger_condition: 'manual'
            }
        },

        mi_risk_002: {
            id: 'mi_risk_002',
            route: 'Military',
            category: 'risk',
            name: '終極啟動碼',
            name_en: 'Kill-Switch Sovereign',
            cost: 850,
            description: '為所有無人機與系統內建物理層級的強制關閉權，確保最終控制。',
            effects: {
                alignment_crisis_immunity: {     // 對齊度危機免疫
                    alignment_threshold: 20,     // 對齊度 <20 時不觸發負面事件
                    product_shutdown_turns: 3    // 但產品線暫停 3 回合
                }
            }
        },

        mi_risk_003: {
            id: 'mi_risk_003',
            route: 'Military',
            category: 'risk',
            name: '外交豁免權',
            name_en: 'Diplomatic Immunity',
            cost: 900,
            description: '產品在全球範圍內引發爭議時，由國家出面背書。',
            effects: {
                compliance_crisis_immunity: {    // 合規危機免疫
                    compliance_threshold: 80,    // 合規風險 >80 時不觸發負面事件
                    trust_penalty: -10           // 但信任度 -10
                }
            }
        },

        mi_risk_004: {
            id: 'mi_risk_004',
            route: 'Military',
            category: 'risk',
            name: '特洛伊協議',
            name_en: 'Trojan Protocol',
            cost: 750,
            description: '在所有外銷的資安產品中預留只有你能控制的漏洞。',
            effects: {
                product_category_bonus: {
                    categories: ['cyber_security'],
                    regulation_reduction_per_product: 3  // 每個網路資安產品減少 3 監管壓力
                }
            }
        },

        mi_risk_005: {
            id: 'mi_risk_005',
            route: 'Military',
            category: 'risk',
            name: '灰色行動小組',
            name_en: 'Gray Operations Unit',
            cost: 950,
            description: '動用國家級情報力量，解決公關危機的影子手段。',
            effects: {
                covert_operation: {              // 秘密行動（手動觸發）
                    cash_cost: 40,               // 花費 $40M
                    senior_cost: 1,              // 消耗 1 名高級員工
                    options: [
                        { 
                            target: 'regulation',
                            reduction: 25,       // 監管壓力 -25
                            fail_chance: 0.20,   // 20% 失敗機率
                            fail_penalty: { trust: -15 }
                        },
                        { 
                            target: 'compliance_risk',
                            reduction: 30,       // 合規風險 -30
                            fail_chance: 0.25,   // 25% 失敗機率
                            fail_penalty: { trust: -20 }
                        }
                    ]
                },
                cooldown_turns: 6
            }
        },

        mi_risk_006: {
            id: 'mi_risk_006',
            route: 'Military',
            category: 'risk',
            name: '替罪羊計劃',
            name_en: 'False Flag Operation',
            cost: 800,
            description: '將 AI 造成的事故嫁禍給敵對勢力或駭客組織。',
            effects: {
                scapegoat_protocol: {            // 替罪羊協議（手動觸發）
                    alignment_cost: 5,           // 對齊度 -5
                    trust_gain: 10,              // 信任度 +10
                    cash_gain: 20,               // 額外國防預算 +$20M
                    hype_gain: 8                 // 炒作度 +8
                },
                cooldown_turns: 5
            }
        },

        // ==========================================
        // 具身智慧路線 - 內部經營 (6個)
        // ==========================================
        
        em_internal_001: {
            id: 'em_internal_001',
            route: 'Embodied',
            category: 'internal',
            name: '模組化硬體架構',
            name_en: 'Modular Hardware Architecture',
            cost: 500,
            description: '採用統一的、可熱插拔的模組化設計，使機器人與設備均可快速更換與升級。',
            effects: {
                product_maintenance_cost_mult: 0.70,  // 產品線維護成本 -30%
                product_upgrade_cost_mult: 0.75       // 升級成本 -25%
            }
        },

        em_internal_002: {
            id: 'em_internal_002',
            route: 'Embodied',
            category: 'internal',
            name: '垂直整合產業鏈',
            name_en: 'Vertical Integration',
            cost: 800,
            description: '從稀土採掘到伺服馬達組裝的全產業鏈一手掌握。',
            effects: {
                product_category_bonus: {
                    categories: ['industrial_robot'],  // 工業機器人類
                    operation_cost_mult: 0.65          // 營運損耗 -35%
                },
                space_requirement_mult: 1.15           // 空間需求 +15%
            }
        },

        em_internal_003: {
            id: 'em_internal_003',
            route: 'Embodied',
            category: 'internal',
            name: '數位孿生訓練',
            name_en: 'Digital Twin Training',
            cost: 600,
            description: '在虛擬環境中模擬實體運作，減少硬體磨損。',
            effects: {
                power_consumption_mult: 0.85,         // 電力消耗 -15%
                cash_per_turn: 3                      // 每回合節省 +$3M
            }
        },

        em_internal_004: {
            id: 'em_internal_004',
            route: 'Embodied',
            category: 'internal',
            name: '邊緣協作學習',
            name_en: 'Edge Swarm Training',
            cost: 700,
            description: '讓終端機器人在執行任務時相互交換環境數據。',
            effects: {
                data_gain_mult: 1.25,                 // 數據獲取效率 +25%
                mp_per_operating_product: {           // MP隨產品線數量增益
                    base_bonus: 0.2,                  // 每個營運中產品線 +0.2 MP/回合
                    max_products: 6                   // 最多計算6個
                }
            }
        },

        em_internal_005: {
            id: 'em_internal_005',
            route: 'Embodied',
            category: 'internal',
            name: '能源套利策略',
            name_en: 'Energy Arbitrage',
            cost: 900,
            description: '讓所有聯網的機器人在非運作期間作為「分佈式電池」參與電網調度。',
            effects: {
                power_consumption_mult: 0.60,         // 電力消耗 -40%
                energy_arbitrage_revenue: {           // 能源套利收益
                    base_cash_per_turn: 2,            // 基礎 +$2M/回合
                    energy_price_sensitivity: 0.5     // 電價每漲10%額外 +$0.5M
                },
                product_wear_mult: 1.20               // 產品線損耗 +20%
            }
        },

        em_internal_006: {
            id: 'em_internal_006',
            route: 'Embodied',
            category: 'internal',
            name: '矽基勞動力改革',
            name_en: 'Silicon Workforce Reform',
            cost: 750,
            description: '重新定義勞資概念，將維修機器人也納入組織架構。',
            effects: {
                junior_requirement_mult: 0.70,        // Junior員工需求 -30%
                pflops_per_turn: -0.5                 // 每回合消耗 0.5 PFLOPS 維持管理
            }
        },

        // ==========================================
        // 具身智慧路線 - 外部公關 (6個)
        // ==========================================

        em_external_001: {
            id: 'em_external_001',
            route: 'Embodied',
            category: 'external',
            name: '基礎設施夥伴關係',
            name_en: 'Infrastructure Entrenchment',
            cost: 850,
            description: '與政府簽訂排他性協議，將智慧物流融入城市物流邏輯。',
            effects: {
                high_data_per_turn: 50,               // 每回合獲得 50 高級數據
                hype_per_turn: 4                      // 每回合炒作度 +4
            }
        },

        em_external_002: {
            id: 'em_external_002',
            route: 'Embodied',
            category: 'external',
            name: '地理圍欄鎖死',
            name_en: 'Geo-Fencing Anchor',
            cost: 500,
            description: '限制機器人離開特定授權區域，否則自動斷電。',
            effects: {
                compliance_risk_per_turn: -4,         // 每回合合規風險 -4
                product_revenue_mult: 0.85            // 產品收入 -15%
            }
        },

        em_external_003: {
            id: 'em_external_003',
            route: 'Embodied',
            category: 'external',
            name: '物流管理費',
            name_en: 'Logistics Toll',
            cost: 700,
            description: '所有在你的系統上運行的第三方載具，都必須支付管理費。',
            effects: {
                product_category_bonus: {
                    categories: ['smart_logistics'],   // 智慧物流類
                    revenue_mult: 1.30                 // 收入 +30%
                },
                regulation_per_turn: 3                 // 每回合監管壓力 +3
            }
        },

        em_external_004: {
            id: 'em_external_004',
            route: 'Embodied',
            category: 'external',
            name: '實體公益捐贈',
            name_en: 'Robot Charity',
            cost: 600,
            description: '定期派遣機器人參與災後救援或基礎建設維修。',
            effects: {
                cash_per_turn: -8,                    // 每回合花費 $8M
                trust_per_turn: 5,                    // 每回合信任度 +5
                space_bonus_per_5_turns: 10           // 每5回合獲得政府配額 +10 空間單位
            }
        },

        em_external_005: {
            id: 'em_external_005',
            route: 'Embodied',
            category: 'external',
            name: '物理安全標章',
            name_en: 'Physical Safety Certification',
            cost: 650,
            description: '推動全球一致的機器人物理安全與碰撞保護標準。',
            effects: {
                alignment_per_turn: 3,                // 每回合對齊度 +3
                regulation_per_turn: -4               // 每回合監管壓力 -4
            }
        },

        em_external_006: {
            id: 'em_external_006',
            route: 'Embodied',
            category: 'external',
            name: '黑盒事故記錄儀',
            name_en: 'Solid-State Log',
            cost: 550,
            description: '在機器人內部設置黑盒子，記錄所有物理行為數據。',
            effects: {
                cash_per_turn: -2,                    // 每回合維護費 $2M
                trust_decay_mult: 0.60                // 信任度跌幅 -40%
            }
        },

        // ==========================================
        // 具身智慧路線 - 風險管理 (6個)
        // ==========================================

        em_risk_001: {
            id: 'em_risk_001',
            route: 'Embodied',
            category: 'risk',
            name: '緊急回收指令',
            name_en: 'Panic Recall',
            cost: 700,
            description: '物理層級的強制收回隔離，防止機器人傷人。',
            effects: {
                emergency_recall: {                   // 緊急回收（手動觸發）
                    hype_cost: 15,                    // 消耗 15 炒作度
                    trust_preserved: 10,              // 維持 10 信任度
                    regulation_reduction: 8           // 監管壓力 -8
                },
                cooldown_turns: 4
            }
        },

        em_risk_002: {
            id: 'em_risk_002',
            route: 'Embodied',
            category: 'risk',
            name: '分佈式意識備份',
            name_en: 'Swarm Redundancy',
            cost: 800,
            description: '讓群體中的機器人互相監控邏輯異常。',
            effects: {
                entropy_reduction_per_product: {      // 熵值隨產品線減少
                    reduction_per_product: 1,         // 每個營運產品線 -1 熵值/回合
                    max_reduction: 5                  // 最多減少 5
                }
            }
        },

        em_risk_003: {
            id: 'em_risk_003',
            route: 'Embodied',
            category: 'risk',
            name: '環境數據洗滌',
            name_en: 'Environmental Data Scrubbing',
            cost: 650,
            description: '修正機器人在複雜物理環境中採集到的錯誤噪點。',
            effects: {
                entropy_per_turn: -3,                 // 每回合熵值 -3
                data_quality_upgrade: {               // 數據品質升級
                    low_to_high_conversion: 0.15      // 15% 低級數據轉為高級數據
                }
            }
        },

        em_risk_004: {
            id: 'em_risk_004',
            route: 'Embodied',
            category: 'risk',
            name: '緊急休眠指令',
            name_en: 'The Last Anchor',
            cost: 750,
            description: '設計機器人故障反應機制，避免產生連鎖效應。',
            effects: {
                product_operation_cost_mult: 1.15,    // 產品線營運成本 +15%
                trust_per_turn: 2                     // 每回合信任度 +2
            }
        },

        em_risk_005: {
            id: 'em_risk_005',
            route: 'Embodied',
            category: 'risk',
            name: 'MR 專家協作系統',
            name_en: 'MR Expert Collaboration',
            cost: 600,
            description: '結合專家駐點或遠端提供服務，第一時間處理機器人故障。',
            effects: {
                senior_per_operating_product: 0.5,    // 每個營運產品線需要額外 0.5 Senior
                alignment_per_turn: 4                 // 每回合對齊度 +4
            }
        },

        em_risk_006: {
            id: 'em_risk_006',
            route: 'Embodied',
            category: 'risk',
            name: '自動化資產折舊',
            name_en: 'Autonomous Depreciation',
            cost: 850,
            description: '讓機器人自主進行自我保修與零件回收。',
            effects: {
                product_depreciation_cost_mult: 0.40, // 產品線折舊損失 -60%
                cash_recovery_per_retired_product: 15 // 產品退役時回收 $15M
            }
        },

        // ==========================================
        // 效率優化路線 - 內部經營 (6個)
        // ==========================================
        
        ef_internal_001: {
            id: 'ef_internal_001',
            route: 'Efficiency',
            category: 'internal',
            name: '極簡主義辦公室',
            name_en: 'Minimalist Infrastructure',
            cost: 500,
            description: '透過程式工具最佳化業務流程，縮減公司實體運營需求。',
            effects: {
                space_requirement_mult: 0.80,         // 空間需求 -20%
                power_consumption_mult: 0.80,         // 電力消耗 -20%
                hype_per_turn: -2                     // 每回合炒作度 -2
            }
        },

        ef_internal_002: {
            id: 'ef_internal_002',
            route: 'Efficiency',
            category: 'internal',
            name: '沙盒化生產環境',
            name_en: 'Sandboxed Production',
            cost: 650,
            description: '將激進的研究部署在「邏輯沙盒」，與主系統分開。',
            effects: {
                pflops_per_turn: -1,                  // 每回合消耗 1 PFLOPS
                entropy_penalty_mult: 0.60            // 熵值負面影響 -40%
            }
        },

        ef_internal_003: {
            id: 'ef_internal_003',
            route: 'Efficiency',
            category: 'internal',
            name: '人才算力槓桿',
            name_en: 'Brain-Compute Lever',
            cost: 800,
            description: '研發時，天才有能力手動優化算法來替代部分算力需求。',
            effects: {
                turing_compute_leverage: {            // 頂級人員算力槓桿
                    pflops_reduction_per_turing: 2,   // 每名 Turing 減少 2 PFLOPS 消耗
                    max_reduction: 10                 // 最多減少 10 PFLOPS
                }
            }
        },

        ef_internal_004: {
            id: 'ef_internal_004',
            route: 'Efficiency',
            category: 'internal',
            name: '知識傳承體系',
            name_en: 'Knowledge Legacy',
            cost: 700,
            description: '建立導師制，讓頂級人員的經驗留存於系統中。',
            effects: {
                senior_efficiency_mult: 1.30          // 高級人員研發效果 +30%
            }
        },

        ef_internal_005: {
            id: 'ef_internal_005',
            route: 'Efficiency',
            category: 'internal',
            name: '企業叛逆文化',
            name_en: 'Corporate Rebellion Culture',
            cost: 600,
            description: '獎勵員工進行挑戰當前主流方向、看似離經叛道的技術探索。',
            effects: {
                mp_growth_mult: 1.12,                 // MP研發 +12%
                loyalty_per_turn: 3,                  // 每回合忠誠度 +3
                entropy_per_turn: 2                   // 每回合熵值 +2
            }
        },

        ef_internal_006: {
            id: 'ef_internal_006',
            route: 'Efficiency',
            category: 'internal',
            name: '基準測試屠榜者',
            name_en: 'Benchmark Dominator',
            cost: 750,
            description: '集中所有天才員工，專攻各類AI基準測試以提升公司知名度。',
            effects: {
                hype_per_turn: 6,                     // 每回合炒作度 +6
                cash_per_turn: 5,                     // 每回合現金 +$5M（贊助/獎金）
                mp_growth_mult: 0.85                  // MP研發速度 -15%
            }
        },

        // ==========================================
        // 效率優化路線 - 外部公關 (6個)
        // ==========================================

        ef_external_001: {
            id: 'ef_external_001',
            route: 'Efficiency',
            category: 'external',
            name: '綠色算力認證',
            name_en: 'Green Compute Standard',
            cost: 700,
            description: '推動全球 AI 節能標準，將「能效比」定義為衡量 AI 優劣的首要指標。',
            effects: {
                product_category_bonus: {
                    categories: ['extreme_efficiency'],  // 極致效率類
                    revenue_mult: 1.25                   // 收入 +25%
                },
                trust_per_turn: 3                     // 每回合信任度 +3
            }
        },

        ef_external_002: {
            id: 'ef_external_002',
            route: 'Efficiency',
            category: 'external',
            name: '論文即產品',
            name_en: 'Paper as Product',
            cost: 600,
            description: '重大突破以學術論文形式，發表在最頂級的期刊或會議上。',
            effects: {
                trust_per_turn: 4,                    // 每回合信任度 +4
                high_data_per_turn: 30                // 每回合獲得 30 高級數據
            }
        },

        ef_external_003: {
            id: 'ef_external_003',
            route: 'Efficiency',
            category: 'external',
            name: '演算法專利叢林',
            name_en: 'Patent Thicket',
            cost: 900,
            description: '有策略地申請大量防禦性專利，構建令競爭者寸步難行的知識產權迷宮。',
            effects: {
                cash_per_turn: 8,                     // 每回合專利授權 +$8M
                rival_mp_penalty: 0.10                // 全局對手 MP研發 -10%
            }
        },

        ef_external_004: {
            id: 'ef_external_004',
            route: 'Efficiency',
            category: 'external',
            name: '低延遲溢價',
            name_en: 'Low-Latency Premium',
            cost: 650,
            description: '針對需要瞬時反應的產業收取高額授權費。',
            effects: {
                product_category_bonus: {
                    categories: ['edge_computing'],    // 邊緣運算類
                    revenue_mult: 1.35                 // 收入 +35%
                }
            }
        },

        ef_external_005: {
            id: 'ef_external_005',
            route: 'Efficiency',
            category: 'external',
            name: '算法審計權補償',
            name_en: 'Algorithm Audit Compensation',
            cost: 550,
            description: '因為模型天才設計難以解釋，提供給監管機構一套簡化版模擬器來理解。',
            effects: {
                regulation_per_turn: -4,              // 每回合監管壓力 -4
                compliance_risk_per_turn: 2           // 每回合合規風險 +2
            }
        },

        ef_external_006: {
            id: 'ef_external_006',
            route: 'Efficiency',
            category: 'external',
            name: '產學合作專案',
            name_en: 'Academia Partnership',
            cost: 500,
            description: '與頂尖大學和實驗室建立獨特合作，提供學生實習機會。',
            effects: {
                senior_hire_cost_mult: 0.70,          // 高級人員招聘成本 -30%
                senior_salary_mult: 0.85,             // 高級人員薪資 -15%
                mp_growth_mult: 0.95                  // MP研發效率 -5%
            }
        },

        // ==========================================
        // 效率優化路線 - 風險管理 (6個)
        // ==========================================

        ef_risk_001: {
            id: 'ef_risk_001',
            route: 'Efficiency',
            category: 'risk',
            name: '遞迴審計系統',
            name_en: 'Recursive Auditor',
            cost: 700,
            description: '設計一套專門監控程式迭代的二級 AI，防止邏輯逃逸。',
            effects: {
                pflops_per_turn: -0.5,                // 每回合消耗 0.5 PFLOPS
                alignment_per_turn: 4                 // 每回合對齊度 +4
            }
        },

        ef_risk_002: {
            id: 'ef_risk_002',
            route: 'Efficiency',
            category: 'risk',
            name: '自癒代碼協議',
            name_en: 'Self-Healing Sandbox',
            cost: 750,
            description: '模型運行發現異常時，自動回滾到前一個版本。',
            effects: {
                entropy_growth_mult: 0.70,            // 熵值增長速度 -30%
                mp_growth_mult: 0.92                  // MP研發 -8%
            }
        },

        ef_risk_003: {
            id: 'ef_risk_003',
            route: 'Efficiency',
            category: 'risk',
            name: '最小可行對齊',
            name_en: 'Minimum Viable Alignment',
            cost: 600,
            description: '重新定義對齊度為「在給定的能耗與硬體邊界內，完成指定計算任務」。',
            effects: {
                alignment_penalty_mult: 0.60,         // 對齊度低的影響 -40%
                entropy_per_turn: 1                   // 每回合熵值 +1
            }
        },

        ef_risk_004: {
            id: 'ef_risk_004',
            route: 'Efficiency',
            category: 'risk',
            name: '技術債轉移',
            name_en: 'Technical Debt Transfer',
            cost: 800,
            description: '將自身不夠穩定、對齊度低的優化算法，包裝成「突破性解決方案」專利授權。',
            effects: {
                tech_debt_transfer: {                 // 技術債轉移（手動觸發）
                    cash_gain: 25,                    // 獲得 $25M 授權金
                    entropy_reduction: 15,            // 熵值 -15
                    trust_penalty: -8                 // 信任度 -8
                },
                cooldown_turns: 6
            }
        },

        ef_risk_005: {
            id: 'ef_risk_005',
            route: 'Efficiency',
            category: 'risk',
            name: '冷啟動協議',
            name_en: 'Cold Start Protocol',
            cost: 650,
            description: '在系統失控前，將所有運算狀態快照並降頻運行。',
            effects: {
                regulation_penalty_mult: 0.65,        // 監管壓力懲罰 -35%
                compliance_penalty_mult: 0.65         // 合規風險懲罰 -35%
            }
        },

        ef_risk_006: {
            id: 'ef_risk_006',
            route: 'Efficiency',
            category: 'risk',
            name: '熵值熱沉機制',
            name_en: 'Entropy Heat Sink',
            cost: 950,
            description: '將系統中混亂、不可解釋的邏輯丟入特定運算區，防止其干擾核心模型。',
            effects: {
                entropy_heat_sink: {                  // 熵值熱沉（手動觸發）
                    power_cost_mult: 2.0,             // 電力消耗翻倍（該回合）
                    entropy_reduction: 30,            // 熵值 -30
                    cash_cost: 10                     // 花費 $10M
                },
                cooldown_turns: 4
            }           
        },

        // ==========================================
        // Scaling Law路線 - 內部經營 (6個)
        // ==========================================
        
        sl_internal_001: {
            id: 'sl_internal_001',
            route: 'Scaling Law',
            category: 'internal',
            name: '人才黑洞效應',
            name_en: 'Talent Black Hole',
            cost: 600,
            description: '利用規模化帶來的鉅額收入，以高薪與福利吸引市場上各種人才。',
            effects: {
                all_hire_cost_mult: 1.30,             // 所有員工招募成本 +30%
                all_salary_mult: 1.20,                // 所有薪資 +20%
                loyalty_per_turn: 5                   // 每回合忠誠度 +5
            }
        },

        sl_internal_002: {
            id: 'sl_internal_002',
            route: 'Scaling Law',
            category: 'internal',
            name: '超規模負載預測AI',
            name_en: 'Hyperscale Load Predictor',
            cost: 900,
            description: '開發一個專用於管理你自身巨型基建的AI，能預測全球局勢對自家數據中心的影響。',
            effects: {
                pflops_capacity_mult: 1.20,           // 算力容量 +20%
                power_capacity_mult: 1.15,            // 電力容量 +15%
                space_capacity_mult: 1.15,            // 空間容量 +15%
                cash_per_turn: -8,                    // 每回合維護費 -$8M
                senior_requirement_add: 2             // 需要額外 2 名高級員工
            }
        },

        sl_internal_003: {
            id: 'sl_internal_003',
            route: 'Scaling Law',
            category: 'internal',
            name: '大數定律管理',
            name_en: 'Law of Large Numbers',
            cost: 700,
            description: '接受模型中存在局部錯誤，只要整體參數規模夠大，錯誤會被稀釋。',
            effects: {
                alignment_pflops_scaling: {           // 對齊度隨算力波動
                    pflops_threshold: 20,             // 算力 >20 PFLOPS 時生效
                    alignment_variance: {
                        min: -10,                     // 最低 -10%
                        max: 20                       // 最高 +20%
                    }
                }
            }
        },

        sl_internal_004: {
            id: 'sl_internal_004',
            route: 'Scaling Law',
            category: 'internal',
            name: '數位殖民主義',
            name_en: 'Digital Colonialism',
            cost: 800,
            description: '建立大型數據中心，以體量獲取當地基礎設施的控制權。',
            effects: {
                space_cost_mult: 0.65,                // 空間成本 -35%
                power_cost_mult: 0.70,                // 電力成本 -30%
                regulation_per_turn: 4                // 每回合監管壓力 +4
            }
        },

        sl_internal_005: {
            id: 'sl_internal_005',
            route: 'Scaling Law',
            category: 'internal',
            name: '算力優先權調度',
            name_en: 'Compute Priority Scheduling',
            cost: 650,
            description: '彈性關閉非核心業務，將所有資源集中於單一模型的衝刺。',
            effects: {
                product_category_bonus: {
                    categories: ['general_model'],     // 通用模型類
                    revenue_mult: 1.35                 // 收入 +35%
                },
                loyalty_per_turn: -3                  // 每回合忠誠度 -3
            }
        },

        sl_internal_006: {
            id: 'sl_internal_006',
            route: 'Scaling Law',
            category: 'internal',
            name: '規模經濟飛輪',
            name_en: 'Scale Economy Flywheel',
            cost: 750,
            description: '用戶越多、數據越多、模型越強、收入越高——形成正向循環。',
            effects: {
                revenue_community_scaling: {          // 收入隨社群規模加成
                    per_10k_community: 0.02,          // 每1萬社群 +2% 收入
                    max_bonus: 0.30                   // 最高 +30%
                }
            }
        },

        // ==========================================
        // Scaling Law路線 - 外部公關 (6個)
        // ==========================================

        sl_external_001: {
            id: 'sl_external_001',
            route: 'Scaling Law',
            category: 'external',
            name: '規模護城河',
            name_en: 'Scale Moat',
            cost: 600,
            description: '公開透明營運資源消耗數據，通過令人咋舌的算力建設計畫嚇阻競爭者。',
            effects: {
                hype_per_turn: 5,                     // 每回合炒作度 +5
                regulation_per_turn: -3,              // 每回合監管壓力 -3
                trust_per_turn: -2                    // 每回合信任度 -2
            }
        },

        sl_external_002: {
            id: 'sl_external_002',
            route: 'Scaling Law',
            category: 'external',
            name: '萬能模型訂閱制',
            name_en: 'The Everything Subscription',
            cost: 850,
            description: '讓全球各行各業都依賴你的基座模型，使其「大到不能倒」。',
            effects: {
                product_category_bonus: {
                    categories: ['general_model'],
                    revenue_hype_exponential: {       // 收入隨炒作度指數加成
                        base_mult: 1.0,
                        hype_exponent: 0.015          // 每點炒作度 +1.5% 複利
                    }
                },
                regulation_per_turn: -2               // 每回合監管壓力 -2
            }
        },

        sl_external_003: {
            id: 'sl_external_003',
            route: 'Scaling Law',
            category: 'external',
            name: '數據主權收購',
            name_en: 'Data Sovereignty M&A',
            cost: 1000,
            description: '透過商業併購直接買下出版商、社交媒體或圖書館的數位所有權。',
            effects: {
                data_acquisition: {                   // 數據收購（手動觸發）
                    cash_cost: 80,                    // 花費 $80M
                    high_data_gain: 500,              // 獲得 500 高級數據
                    low_data_gain: 1000               // 獲得 1000 低級數據
                },
                cooldown_turns: 8
            }
        },

        sl_external_004: {
            id: 'sl_external_004',
            route: 'Scaling Law',
            category: 'external',
            name: '摩爾定律挑戰狀',
            name_en: 'Moore\'s Law Challenge',
            cost: 750,
            description: '與頂級晶片製造商、能源集團簽訂超長期、排他性的協議。',
            effects: {
                pflops_cost_mult: 0.80,               // 算力成本 -20%
                power_cost_mult: 0.80,                // 電力成本 -20%
                debt_per_turn: 5                      // 每回合債務 +$5M
            }
        },

        sl_external_005: {
            id: 'sl_external_005',
            route: 'Scaling Law',
            category: 'external',
            name: '算力證券化',
            name_en: 'Compute Financing',
            cost: 700,
            description: '將未來的算力產能打包成金融衍生品進行預售，換取當前的建設現金。',
            effects: {
                compute_securitization: {             // 算力證券化（手動觸發）
                    cash_gain: 60,                    // 獲得 $60M
                    pflops_penalty_turns: 8,          // 未來 8 回合
                    pflops_penalty_rate: 0.10         // 算力減少 10%
                },
                cooldown_turns: 12
            }
        },

        sl_external_006: {
            id: 'sl_external_006',
            route: 'Scaling Law',
            category: 'external',
            name: '算力稅收協定',
            name_en: 'Compute Taxation',
            cost: 650,
            description: '規定所有租用你算力的第三方開發者，必須貢獻部分算力用於你的核心模型訓練。',
            effects: {
                pflops_per_turn: 1.5,                 // 每回合獲得 1.5 PFLOPS
                hype_per_turn: -2,                    // 每回合炒作度 -2
                trust_per_turn: -1                    // 每回合信任度 -1
            }
        },

        // ==========================================
        // Scaling Law路線 - 風險管理 (6個)
        // ==========================================

        sl_risk_001: {
            id: 'sl_risk_001',
            route: 'Scaling Law',
            category: 'risk',
            name: '對齊度暴力破解',
            name_en: 'Brute-force Alignment',
            cost: 800,
            description: '投入海量算力進行大規模人類回饋強化學習（RLHF）。',
            effects: {
                brute_force_alignment: {              // 暴力對齊（手動觸發）
                    pflops_cost: 5,                   // 消耗 5 PFLOPS
                    alignment_gain: 15                // 對齊度 +15
                },
                cooldown_turns: 3
            }
        },

        sl_risk_002: {
            id: 'sl_risk_002',
            route: 'Scaling Law',
            category: 'risk',
            name: '分散式集中化架構',
            name_en: 'Distributed Centralization',
            cost: 750,
            description: '將單一巨型模型在物理上分散多個數據中心運行，但在邏輯上仍保持統一。',
            effects: {
                power_per_turn: -2,                   // 每回合額外電力消耗（單位）
                pflops_per_turn: -1,                  // 每回合額外算力消耗
                product_depreciation_mult: 0.70,      // 產品線損耗 -30%
                entropy_per_turn: 2                   // 每回合熵值 +2
            }
        },

        sl_risk_003: {
            id: 'sl_risk_003',
            route: 'Scaling Law',
            category: 'risk',
            name: '合成數據洗滌劑',
            name_en: 'Data Purifier',
            cost: 650,
            description: '研發專門檢測「AI 生成痕跡」的工具，防止訓練數據陷入自我循環導致的模型退化。',
            effects: {
                synthetic_data_entropy_mult: 0.50     // 合成數據帶來的熵值增加 -50%
            }
        },

        sl_risk_004: {
            id: 'sl_risk_004',
            route: 'Scaling Law',
            category: 'risk',
            name: '訓練集群崩潰模擬',
            name_en: 'Cluster Crash Simulation',
            cost: 700,
            description: '建立一套全自動、可迅速徹底重建整個訓練集群的災難響應系統。',
            effects: {
                cash_per_turn: -5,                    // 每回合維護費 -$5M
                power_shortage_penalty_mult: 0.50     // 電力不足負面影響 -50%
            }
        },

        sl_risk_005: {
            id: 'sl_risk_005',
            route: 'Scaling Law',
            category: 'risk',
            name: '大到不能倒',
            name_en: 'Too Big to Fail',
            cost: 950,
            description: '讓公司的債務與國家銀行深度綁定。',
            effects: {
                emergency_bailout: {                  // 緊急救助（自動觸發）
                    trigger_condition: 'cash_negative', // 當現金為負時
                    cash_injection: 100,              // 自動獲得 $100M
                    regulation_penalty: 20            // 監管壓力 +20
                }
            }
        },

        sl_risk_006: {
            id: 'sl_risk_006',
            route: 'Scaling Law',
            category: 'risk',
            name: '多神經元投票',
            name_en: 'Multi-Neuron Voting',
            cost: 850,
            description: '同時運行數個相同的模型，當其中一個失控時，以其他模型的演算結果將其覆蓋。',
            effects: {
                pflops_per_turn: -3,                  // 每回合消耗 3 PFLOPS
                compliance_risk_per_turn: -5          // 每回合合規風險 -5
            }
        }
    }
};

    

// ==========================================
// 輔助函數
// ==========================================

/**
 * 依路線取得技能列表
 * @param {string} routeId - 路線ID
 * @returns {Array} 技能列表
 */
STRATEGY_BLUEPRINT_CONFIG.getSkillsByRoute = function(routeId) {
    return Object.values(this.SKILLS).filter(s => s.route === routeId);
};

/**
 * 依路線與類別取得技能列表
 * @param {string} routeId - 路線ID
 * @param {string} categoryId - 類別ID
 * @returns {Array} 技能列表
 */
STRATEGY_BLUEPRINT_CONFIG.getSkillsByCategory = function(routeId, categoryId) {
    return Object.values(this.SKILLS).filter(s => s.route === routeId && s.category === categoryId);
};

/**
 * 取得單一技能配置
 * @param {string} skillId - 技能ID
 * @returns {Object|null} 技能配置
 */
STRATEGY_BLUEPRINT_CONFIG.getSkill = function(skillId) {
    return this.SKILLS[skillId] || null;
};

/**
 * 取得路線專精配置
 * @param {string} routeId - 路線ID
 * @returns {Object|null} 路線專精配置
 */
STRATEGY_BLUEPRINT_CONFIG.getRouteSpecialization = function(routeId) {
    return this.ROUTE_SPECIALIZATIONS[routeId] || null;
};

/**
 * 計算路線已啟用技能數量
 * @param {Array} activatedSkills - 已啟用技能ID列表
 * @param {string} routeId - 路線ID
 * @returns {number} 已啟用技能數量
 */
STRATEGY_BLUEPRINT_CONFIG.countActivatedSkillsForRoute = function(activatedSkills, routeId) {
    if (!activatedSkills || !Array.isArray(activatedSkills)) return 0;
    return activatedSkills.filter(skillId => {
        const skill = this.SKILLS[skillId];
        return skill && skill.route === routeId;
    }).length;
};

/**
 * 取得路線當前專精獎勵
 * @param {Array} activatedSkills - 已啟用技能ID列表
 * @param {string} routeId - 路線ID
 * @returns {Array} 已達成的專精獎勵列表
 */
STRATEGY_BLUEPRINT_CONFIG.getActiveSpecializationBonuses = function(activatedSkills, routeId) {
    const count = this.countActivatedSkillsForRoute(activatedSkills, routeId);
    const spec = this.ROUTE_SPECIALIZATIONS[routeId];
    if (!spec || !spec.specialization_bonuses) return [];
    
    return spec.specialization_bonuses.filter(bonus => count >= bonus.threshold);
};

// ==========================================
// 全局配置暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.STRATEGY_BLUEPRINT_CONFIG = STRATEGY_BLUEPRINT_CONFIG;
}

// 支援模組化環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STRATEGY_BLUEPRINT_CONFIG;
}

console.log('✓ Strategy Blueprint Config loaded');
