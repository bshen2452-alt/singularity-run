// ============================================
// 併購系統配置 (Acquisition Config)
// ============================================
// 設計：純數據配置，無邏輯混雜
// 功能：定義可併購目標、成本、整合期、效果

(function() {
    'use strict';

    const AcquisitionConfig = {

        // ==========================================
        // 系統設定
        // ==========================================
        SYSTEM: {
            unlock_tier: 4,           // Tier 4 解鎖併購功能
            max_pending: 2,           // 最多同時進行2個併購整合
            base_cooldown: 2,         // 每次併購後冷卻2回合
            
            // 整合期設定
            integration: {
                base_turns: {
                    department: 3,    // 部門併購基礎整合期 3 季
                    subsidiary: 6     // 子公司併購基礎整合期 6 季
                },
                // 親和度減少整合期（每10點親和度減少1回合）
                affinity_reduction_per_10: 1,
                // 整合期最短
                min_turns: 1
            },
            
            // 整合期間影響
            integration_penalty: {
                operating_efficiency: -0.15,  // 營運效率 -15%
                loyalty_drain: 2,             // 每季忠誠度流失 2 點
                department_output: -0.20      // 該部門產出 -20%
            }
        },

        // ==========================================
        // 可併購的職能單位目標
        // ==========================================
        // 對應 asset_card_config.FUNCTIONAL_DEPTS 的部門/子公司
        ACQUISITION_TARGETS: {
            // ==========================================
            // 部門併購（對應 FUNCTIONAL_DEPTS）
            // ==========================================
            
            // 算力租賃部
            compute_rental: {
                id: 'compute_rental',
                name: '算力租賃服務商',
                type: 'department',
                icon: '🖥️',
                description: '專業雲端算力租賃與託管服務公司',
                
                // 對應 asset_card_config.FUNCTIONAL_DEPTS.compute_rental
                related_functional_dept: 'compute_rental',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'cloud_infra',
                        min_value: 25
                    },
                    random_chance: 0.30
                },
                
                cost: {
                    base: 200,
                    variance: 0.25
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            cloud_infra: 12,
                            semiconductor: 8
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 25,
                        compute_utilization_bonus: 0.15,
                        compute_rental_enabled: true
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: 'senior'
                }
            },

            // 能源科技部
            energy_tech: {
                id: 'energy_tech',
                name: '能源科技服務商',
                type: 'department',
                icon: '⚡',
                description: '結合儲能與微電網技術的能源解決方案公司',
                
                related_functional_dept: 'energy_tech',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'energy',
                        min_value: 25
                    },
                    random_chance: 0.32
                },
                
                cost: {
                    base: 180,
                    variance: 0.20
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            energy: 15,
                            consumer: 5
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 22,
                        energy_cost_reduction: 0.10,
                        esg_bonus: 8,
                        energy_trading_enabled: true
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: 'senior'
                }
            },

            // 硬體設計部
            hardware_design: {
                id: 'hardware_design',
                name: 'AI晶片設計公司',
                type: 'department',
                icon: '🔧',
                description: '專業AI晶片架構設計與IP授權公司',
                
                related_functional_dept: 'hardware_design',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'semiconductor',
                        min_value: 35
                    },
                    random_chance: 0.25
                },
                
                cost: {
                    base: 280,
                    variance: 0.25
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            semiconductor: 20,
                            research: 10
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 45,
                        chip_design_enabled: true,
                        licensing_income: true,
                        compute_efficiency_bonus: 0.15
                    }
                },
                
                integration: {
                    base_turns: 5,
                    skill_required: 'turing'
                }
            },

            // 數據交易部
            data_exchange: {
                id: 'data_exchange',
                name: '數據交易平台',
                type: 'department',
                icon: '📊',
                description: '營運數據交易平台與合成數據服務',
                
                related_functional_dept: 'data_exchange',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'data_provider',
                        min_value: 25
                    },
                    random_chance: 0.35
                },
                
                cost: {
                    base: 150,
                    variance: 0.20
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            data_provider: 15,
                            research: 8
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 20,
                        data_exchange_enabled: true,
                        synthetic_data_enabled: true,
                        data_quality_bonus: 0.10
                    }
                },
                
                integration: {
                    base_turns: 3,
                    skill_required: 'senior'
                }
            },

            // 企業顧問部
            enterprise_consulting: {
                id: 'enterprise_consulting',
                name: 'AI導入顧問公司',
                type: 'department',
                icon: '💼',
                description: '提供AI導入與數位轉型顧問服務',
                
                related_functional_dept: 'enterprise_consulting',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'enterprise',
                        min_value: 20
                    },
                    random_chance: 0.38
                },
                
                cost: {
                    base: 120,
                    variance: 0.15
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            enterprise: 12,
                            consumer: 5
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 18,
                        consulting_enabled: true,
                        enterprise_solutions: true,
                        trust_bonus: 5
                    }
                },
                
                integration: {
                    base_turns: 3,
                    skill_required: null
                }
            },

            // 量化投資部
            quant_trading: {
                id: 'quant_trading',
                name: '量化投資公司',
                type: 'department',
                icon: '📈',
                description: '運用AI算力與數據進行量化交易策略',
                
                related_functional_dept: 'quant_trading',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'finance',
                        min_value: 30
                    },
                    random_chance: 0.25
                },
                
                cost: {
                    base: 250,
                    variance: 0.30
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            finance: 18,
                            data_provider: 8
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 35,
                        quant_trading_enabled: true,
                        market_analysis: true,
                        revenue_volatility: 0.3
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: 'turing'
                }
            },

            // 社群營運部
            community_platform: {
                id: 'community_platform',
                name: '開發者社群平台',
                type: 'department',
                icon: '👥',
                description: '經營AI開發者與用戶社群平台',
                
                related_functional_dept: 'community_platform',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'consumer',
                        min_value: 20
                    },
                    random_chance: 0.40
                },
                
                cost: {
                    base: 100,
                    variance: 0.15
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            consumer: 10,
                            research: 5
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 15,
                        community_enabled: true,
                        network_effect: 0.05,
                        talent_attraction_bonus: 0.10
                    }
                },
                
                integration: {
                    base_turns: 2,
                    skill_required: null
                }
            },

            // 研究智庫部
            research_institute: {
                id: 'research_institute',
                name: 'AI研究智庫',
                type: 'department',
                icon: '🔬',
                description: '進行前沿AI研究與政策諮詢',
                
                related_functional_dept: 'research_institute',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'research',
                        min_value: 25
                    },
                    random_chance: 0.28
                },
                
                cost: {
                    base: 180,
                    variance: 0.20
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            research: 15,
                            defense: 5
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 18,
                        research_enabled: true,
                        reputation_bonus: 10,
                        breakthrough_chance: 0.05
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: 'senior'
                }
            },

            // ==========================================
            // 子公司併購（對應 FUNCTIONAL_SUBSIDIARIES）
            // ==========================================
            
            // 算力租賃公司
            compute_rental_subsidiary: {
                id: 'compute_rental_subsidiary',
                name: '算力租賃公司',
                type: 'subsidiary',
                icon: '🖥️',
                description: '獨立運營的雲端算力服務商',
                
                related_functional_dept: 'compute_rental',
                requires_department: 'compute_rental',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'cloud_infra',
                        min_value: 50
                    },
                    random_chance: 0.20
                },
                
                cost: {
                    base: 400,
                    variance: 0.25
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            cloud_infra: 20,
                            semiconductor: 12
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 70,
                        compute_rental_premium: 0.25,
                        enterprise_contracts: true
                    }
                },
                
                integration: {
                    base_turns: 6,
                    skill_required: 'turing'
                }
            },

            // 能源科技公司
            energy_tech_subsidiary: {
                id: 'energy_tech_subsidiary',
                name: '能源科技公司',
                type: 'subsidiary',
                icon: '⚡',
                description: '綠色能源與儲能解決方案供應商',
                
                related_functional_dept: 'energy_tech',
                requires_department: 'energy_tech',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'energy',
                        min_value: 50
                    },
                    random_chance: 0.22
                },
                
                cost: {
                    base: 350,
                    variance: 0.25
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            energy: 25,
                            consumer: 10
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 65,
                        energy_cost_reduction: 0.15,
                        esg_bonus: 15,
                        gov_subsidy_eligible: true
                    }
                },
                
                integration: {
                    base_turns: 6,
                    skill_required: 'senior'
                }
            },

            // 硬體設計公司
            hardware_design_subsidiary: {
                id: 'hardware_design_subsidiary',
                name: '硬體設計公司',
                type: 'subsidiary',
                icon: '🔧',
                description: 'AI晶片設計與IP授權公司',
                
                related_functional_dept: 'hardware_design',
                requires_department: 'hardware_design',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'semiconductor',
                        min_value: 60
                    },
                    random_chance: 0.15
                },
                
                cost: {
                    base: 550,
                    variance: 0.30
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            semiconductor: 30,
                            research: 15
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 120,
                        licensing_income_mult: 1.5,
                        compute_efficiency_bonus: 0.20,
                        foundry_partnership: true
                    }
                },
                
                integration: {
                    base_turns: 7,
                    skill_required: 'turing'
                }
            },

            // 數據交易商
            data_exchange_subsidiary: {
                id: 'data_exchange_subsidiary',
                name: '數據交易商',
                type: 'subsidiary',
                icon: '📊',
                description: '數據資產交易與合成數據平台',
                
                related_functional_dept: 'data_exchange',
                requires_department: 'data_exchange',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'data_provider',
                        min_value: 50
                    },
                    random_chance: 0.22
                },
                
                cost: {
                    base: 320,
                    variance: 0.22
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            data_provider: 22,
                            enterprise: 10
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 55,
                        data_monetization_mult: 1.4,
                        platform_fee_rate: 0.08,
                        data_network_effect: 0.15
                    }
                },
                
                integration: {
                    base_turns: 5,
                    skill_required: 'senior'
                }
            },

            // 企業顧問
            enterprise_consulting_subsidiary: {
                id: 'enterprise_consulting_subsidiary',
                name: '企業顧問',
                type: 'subsidiary',
                icon: '💼',
                description: 'AI導入與數位轉型顧問服務公司',
                
                related_functional_dept: 'enterprise_consulting',
                requires_department: 'enterprise_consulting',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'enterprise',
                        min_value: 45
                    },
                    random_chance: 0.25
                },
                
                cost: {
                    base: 250,
                    variance: 0.20
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            enterprise: 18,
                            consumer: 8
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 50,
                        consulting_premium: 0.30,
                        trust_bonus: 10,
                        enterprise_pipeline: true
                    }
                },
                
                integration: {
                    base_turns: 5,
                    skill_required: 'senior'
                }
            },

            // 量化投資
            quant_trading_subsidiary: {
                id: 'quant_trading_subsidiary',
                name: '量化投資',
                type: 'subsidiary',
                icon: '📈',
                description: 'AI驅動的量化交易與資產管理公司',
                
                related_functional_dept: 'quant_trading',
                requires_department: 'quant_trading',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'finance',
                        min_value: 55
                    },
                    random_chance: 0.18
                },
                
                cost: {
                    base: 480,
                    variance: 0.30
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            finance: 25,
                            data_provider: 12
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 100,
                        investment_returns: true,
                        revenue_volatility: 0.4,
                        alpha_generation: 0.25
                    }
                },
                
                integration: {
                    base_turns: 6,
                    skill_required: 'turing'
                }
            },

            // 社群平台
            community_platform_subsidiary: {
                id: 'community_platform_subsidiary',
                name: '社群平台',
                type: 'subsidiary',
                icon: '👥',
                description: 'AI開發者與用戶社群生態平台',
                
                related_functional_dept: 'community_platform',
                requires_department: 'community_platform',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'consumer',
                        min_value: 45
                    },
                    random_chance: 0.25
                },
                
                cost: {
                    base: 220,
                    variance: 0.20
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            consumer: 18,
                            research: 8
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 40,
                        talent_attraction_mult: 1.3,
                        community_growth_rate: 0.10,
                        developer_ecosystem: true
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: 'senior'
                }
            },

            // 研究智庫
            research_institute_subsidiary: {
                id: 'research_institute_subsidiary',
                name: '研究智庫',
                type: 'subsidiary',
                icon: '🔬',
                description: '獨立AI研究機構與政策智庫',
                
                related_functional_dept: 'research_institute',
                requires_department: 'research_institute',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'research',
                        min_value: 50
                    },
                    random_chance: 0.20
                },
                
                cost: {
                    base: 350,
                    variance: 0.25
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            research: 22,
                            defense: 10
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 45,
                        reputation_mult: 1.5,
                        breakthrough_chance: 0.08,
                        policy_influence: true,
                        talent_quality_bonus: 0.15
                    }
                },
                
                integration: {
                    base_turns: 6,
                    skill_required: 'turing'
                }
            },

            // ==========================================
            // 能源供應商併購（對應 energy_products_config.PRODUCTS）
            // ==========================================
            
            // 燃氣電廠供應商
            energy_gas_supplier: {
                id: 'energy_gas_supplier',
                name: '燃氣發電供應商',
                type: 'department',
                icon: '🔥',
                description: '專業燃氣發電廠營運商，可獲得穩定電力供應',
                
                // 對應 energy_products_config.PRODUCTS.gas_plant
                related_energy_product: 'gas_plant',
                acquisition_category: 'energy_supplier',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'energy',
                        min_value: 25
                    },
                    random_chance: 0.30
                },
                
                cost: {
                    base: 280,
                    variance: 0.20
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            energy: 15,
                            enterprise: 5
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 8,
                        energy_cost_reduction: 0.15,
                        power_capacity_bonus: 200       // 200 PF 電力容量
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: 'senior'
                }
            },

            // 綠能電廠供應商
            energy_renewable_supplier: {
                id: 'energy_renewable_supplier',
                name: '綠能發電供應商',
                type: 'department',
                icon: '🌱',
                description: '專業太陽能與風力發電營運商，ESG加分',
                
                related_energy_product: 'renewable_farm',
                acquisition_category: 'energy_supplier',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'energy',
                        min_value: 30
                    },
                    random_chance: 0.28
                },
                
                cost: {
                    base: 350,
                    variance: 0.22
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            energy: 18,
                            consumer: 8        // ESG 形象
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 6,
                        energy_cost_reduction: 0.18,
                        esg_bonus: 10,
                        power_capacity_bonus: 150
                    }
                },
                
                integration: {
                    base_turns: 5,
                    skill_required: 'senior'
                }
            },

            // 核能電廠供應商（高門檻）
            energy_nuclear_supplier: {
                id: 'energy_nuclear_supplier',
                name: '模組化核電供應商',
                type: 'subsidiary',
                icon: '⚛️',
                description: '專業SMR核電站營運商，極高穩定性與大容量',
                
                related_energy_product: 'nuclear_smr',
                acquisition_category: 'energy_supplier',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'energy',
                        min_value: 50
                    },
                    random_chance: 0.15
                },
                
                cost: {
                    base: 800,
                    variance: 0.25
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            energy: 30,
                            defense: 10        // 能源安全
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 15,
                        energy_cost_reduction: 0.30,
                        power_stability: 0.95,
                        power_capacity_bonus: 400
                    }
                },
                
                integration: {
                    base_turns: 8,
                    skill_required: 'turing'
                }
            },

            // ==========================================
            // 數據供應商併購（對應 data_config.DATA_TYPES）
            // ==========================================
            
            // 基礎數據供應商（legal_low）
            data_basic_supplier: {
                id: 'data_basic_supplier',
                name: '基礎數據供應商',
                type: 'department',
                icon: '📁',
                description: '大型公開數據集供應商，提供基礎合規數據',
                
                // 對應 data_config.DATA_TYPES.legal_low
                related_data_type: 'legal_low',
                acquisition_category: 'data_supplier',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'data_provider',
                        min_value: 15
                    },
                    random_chance: 0.40
                },
                
                cost: {
                    base: 100,
                    variance: 0.15
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            data_provider: 10,
                            research: 5
                        },
                        data_grant: {
                            type: 'legal_low',
                            amount: 200
                        }
                    },
                    ongoing: {
                        quarterly_data: {
                            type: 'legal_low',
                            amount: 50
                        },
                        data_cost_reduction: 0.10
                    }
                },
                
                integration: {
                    base_turns: 2,
                    skill_required: null
                }
            },

            // 優質通用數據供應商（legal_high_broad）
            data_premium_supplier: {
                id: 'data_premium_supplier',
                name: '優質數據供應商',
                type: 'department',
                icon: '💎',
                description: '頂級通用數據供應商，提供高品質廣泛數據',
                
                related_data_type: 'legal_high_broad',
                acquisition_category: 'data_supplier',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'data_provider',
                        min_value: 30
                    },
                    random_chance: 0.28
                },
                
                cost: {
                    base: 220,
                    variance: 0.20
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            data_provider: 18,
                            research: 8
                        },
                        data_grant: {
                            type: 'legal_high_broad',
                            amount: 100
                        }
                    },
                    ongoing: {
                        quarterly_data: {
                            type: 'legal_high_broad',
                            amount: 30
                        },
                        data_cost_reduction: 0.15,
                        research_efficiency: 0.05
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: 'senior'
                }
            },

            // 專業領域數據供應商（legal_high_focused）
            data_specialized_supplier: {
                id: 'data_specialized_supplier',
                name: '專業數據供應商',
                type: 'department',
                icon: '📊',
                description: '垂直領域數據專家，提供專精高品質數據',
                
                related_data_type: 'legal_high_focused',
                acquisition_category: 'data_supplier',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'data_provider',
                        min_value: 25
                    },
                    random_chance: 0.32
                },
                
                cost: {
                    base: 180,
                    variance: 0.18
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            data_provider: 15,
                            enterprise: 5
                        },
                        data_grant: {
                            type: 'legal_high_focused',
                            amount: 80
                        }
                    },
                    ongoing: {
                        quarterly_data: {
                            type: 'legal_high_focused',
                            amount: 25
                        },
                        data_cost_reduction: 0.12,
                        focused_data_bonus: 0.15        // 專精數據效率+15%
                    }
                },
                
                integration: {
                    base_turns: 3,
                    skill_required: 'senior'
                }
            },

            // 數據集團子公司（需先有基礎數據部門）
            data_conglomerate: {
                id: 'data_conglomerate',
                name: '數據服務集團',
                type: 'subsidiary',
                icon: '🏛️',
                description: '大型數據服務集團，整合多種數據資源',
                
                acquisition_category: 'data_supplier',
                requires_department: 'data_basic_supplier',  // 需先有基礎數據部門
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'data_provider',
                        min_value: 50
                    },
                    random_chance: 0.18
                },
                
                cost: {
                    base: 450,
                    variance: 0.25
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            data_provider: 30,
                            enterprise: 15,
                            research: 10
                        },
                        data_grant: {
                            type: 'legal_high_broad',
                            amount: 200
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 12,
                        quarterly_data: {
                            type: 'legal_high_broad',
                            amount: 50
                        },
                        data_cost_reduction: 0.25,
                        data_contract_discount: 0.20    // 數據合約折扣20%
                    }
                },
                
                integration: {
                    base_turns: 6,
                    skill_required: 'turing'
                }
            }
        },

        // ==========================================
        // 併購成本修正因子
        // ==========================================
        COST_MODIFIERS: {
            // 親和度影響（每 10 點親和度）
            affinity_per_10: -0.05,          // -5% 成本
            
            // 市場狀態
            market_conditions: {
                bull: 1.15,                   // 牛市 +15%
                neutral: 1.0,
                bear: 0.85                    // 熊市 -15%
            },
            
            // 競爭對手涸購
            rival_competition: {
                none: 1.0,
                low: 1.10,
                high: 1.25
            },
            
            // 已有相關資產
            existing_assets: {
                related_department: -0.10,    // 已有相關部門 -10%
                related_facility: -0.15       // 已有相關設施 -15%
            }
        },

        // ==========================================
        // 整合成功因素
        // ==========================================
        INTEGRATION_FACTORS: {
            // 人才加速
            talent_acceleration: {
                turing: 0.25,                 // Turing 人才 -25% 整合期
                senior: 0.15,                 // Senior 人才 -15% 整合期
                none: 0
            },
            
            // 親和度加速（每 10 點）
            affinity_acceleration_per_10: 0.08,
            
            // 同類經驗加速（已有同類部門）
            experience_bonus: 0.20
        },

        // ==========================================
        // 整合里程碑獎勵
        // ==========================================
        INTEGRATION_MILESTONES: {
            // 整合期 50% 時
            halfway: {
                efficiency_recovery: 0.5,     // 效率懲罰減半
                loyalty_recovery: 1           // 忠誠度流失減半
            },
            // 整合完成時
            complete: {
                efficiency_bonus: 0.05,       // 額外效率 +5%
                affinity_bonus: 5,            // 相關產業親和度 +5
                unlock_synergies: true        // 解鎖協同效應
            }
        },

        // ==========================================
        // 協同效應定義
        // ==========================================
        SYNERGY_EFFECTS: {
            // 算力與數據組合
            compute_data: {
                required: ['compute_rental', 'data_exchange'],
                bonus: {
                    quarterly_revenue: 12,
                    efficiency: 0.10
                },
                name: '算力數據整合'
            },
            
            // 能源與算力組合
            energy_compute: {
                required: ['energy_tech', 'compute_rental'],
                bonus: {
                    energy_cost: -0.15,
                    esg_bonus: 8
                },
                name: '綠色算力中心'
            },
            
            // 全棧基礎設施
            full_stack: {
                required: ['compute_rental', 'energy_tech', 'data_exchange'],
                bonus: {
                    quarterly_revenue: 25,
                    all_costs: -0.10,
                    reputation: 10
                },
                name: '全線基礎設施'
            },

            // 能源供應商協同
            energy_portfolio: {
                required: ['energy_gas_supplier', 'energy_renewable_supplier'],
                bonus: {
                    energy_cost: -0.20,
                    power_stability: 0.10,
                    quarterly_revenue: 10
                },
                name: '多元能源組合'
            },

            energy_independence: {
                required: ['energy_renewable_supplier', 'energy_nuclear_supplier'],
                bonus: {
                    energy_cost: -0.35,
                    esg_bonus: 15,
                    power_stability: 0.15
                },
                name: '清潔能源自主'
            },

            // 數據供應商協同
            data_coverage: {
                required: ['data_basic_supplier', 'data_premium_supplier'],
                bonus: {
                    data_cost: -0.20,
                    quarterly_data_bonus: 30,
                    research_efficiency: 0.08
                },
                name: '數據廣度覆蓋'
            },

            data_excellence: {
                required: ['data_premium_supplier', 'data_specialized_supplier'],
                bonus: {
                    data_cost: -0.15,
                    research_efficiency: 0.15,
                    focused_data_bonus: 0.20
                },
                name: '數據品質領先'
            },

            data_empire: {
                required: ['data_basic_supplier', 'data_premium_supplier', 'data_conglomerate'],
                bonus: {
                    quarterly_revenue: 20,
                    data_cost: -0.30,
                    research_efficiency: 0.12,
                    data_contract_discount: 0.30
                },
                name: '數據帝國'
            },

            // 跨領域協同
            ai_infrastructure: {
                required: ['compute_rental', 'data_premium_supplier', 'energy_renewable_supplier'],
                bonus: {
                    quarterly_revenue: 25,
                    compute_efficiency: 0.15,
                    research_efficiency: 0.10,
                    esg_bonus: 10
                },
                name: 'AI基礎設施整合'
            },

            // 研究與社群協同
            research_community: {
                required: ['research_institute', 'community_platform'],
                bonus: {
                    reputation_bonus: 15,
                    talent_attraction_bonus: 0.20,
                    breakthrough_chance: 0.03
                },
                name: '開放研究生態'
            },

            // 企業服務組合
            enterprise_suite: {
                required: ['enterprise_consulting', 'data_exchange'],
                bonus: {
                    quarterly_revenue: 15,
                    enterprise_pipeline: true,
                    trust_bonus: 8
                },
                name: '企業服務套件'
            },

            // 金融科技組合
            fintech_synergy: {
                required: ['quant_trading', 'data_premium_supplier'],
                bonus: {
                    quarterly_revenue: 18,
                    alpha_generation: 0.10,
                    volatility_reduction: 0.15
                },
                name: '金融科技整合'
            }
        },

        // ==========================================
        // UI 配置
        // ==========================================
        UI_CONFIG: {
            // 顯示設定
            show_probability: true,           // 顯示出現機率
            show_integration_estimate: true,  // 顯示預估整合期
            
            // 狀態圖示
            status_icons: {
                available: '✅',
                integrating: '🔄',
                completed: '🏆',
                unavailable: '🔒'
            },
            
            // 類型顏色
            type_colors: {
                department: '#4488ff',
                subsidiary: '#00ff88'
            }
        }
    };

    // ==========================================
    // 輔助函數
    // ==========================================

    /**
     * 獲取所有併購目標
     */
    AcquisitionConfig.getAllTargets = function() {
        return this.ACQUISITION_TARGETS;
    };

    /**
     * 獲取特定類型的併購目標
     */
    AcquisitionConfig.getTargetsByType = function(type) {
        const targets = {};
        for (const [id, target] of Object.entries(this.ACQUISITION_TARGETS)) {
            if (target.type === type) {
                targets[id] = target;
            }
        }
        return targets;
    };

    /**
     * 獲取單一目標配置
     */
    AcquisitionConfig.getTarget = function(targetId) {
        return this.ACQUISITION_TARGETS[targetId] || null;
    };

    /**
     * 獲取協同效應
     */
    AcquisitionConfig.getSynergy = function(ownedUnits) {
        const synergies = [];
        for (const [id, synergy] of Object.entries(this.SYNERGY_EFFECTS)) {
            if (synergy.required.every(req => ownedUnits.includes(req))) {
                synergies.push({ id, ...synergy });
            }
        }
        return synergies;
    };

    /**
     * 檢查目標是否對應 FUNCTIONAL_DEPTS
     */
    AcquisitionConfig.isLinkedToFunctionalDept = function(targetId) {
        const target = this.ACQUISITION_TARGETS[targetId];
        return target && target.related_functional_dept ? true : false;
    };

    /**
     * 獲取對應的 FUNCTIONAL_DEPT ID
     */
    AcquisitionConfig.getLinkedFunctionalDeptId = function(targetId) {
        const target = this.ACQUISITION_TARGETS[targetId];
        return target ? target.related_functional_dept : null;
    };

    // ==========================================
    // 全局暴露
    // ==========================================
    window.AcquisitionConfig = AcquisitionConfig;

    console.log('✓ Acquisition Config loaded');

})();