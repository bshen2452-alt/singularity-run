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
        // 僅限設施升級可成立的部門/子公司
        ACQUISITION_TARGETS: {
            // 數據中心服務部（來自 cooling_lv2）
            datacenter_services: {
                id: 'datacenter_services',
                name: '數據中心服務商',
                type: 'department',          // 'department' 或 'subsidiary'
                icon: '🏢',
                description: '專業數據中心託管服務公司',
                
                // 對應的設施升級產品
                related_facility_upgrade: 'cooling_lv2',
                
                // 出現條件
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'cloud_infra',
                        min_value: 20
                    },
                    random_chance: 0.35       // 基礎出現機率
                },
                
                // 成本範圍（M）
                cost: {
                    base: 150,
                    variance: 0.20            // ±20% 浮動
                },
                
                // 併購效果
                effects: {
                    immediate: {
                        affinity_changes: {
                            cloud_infra: 10,
                            enterprise: 5
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 5,     // 每季基礎收益 $5M
                        capacity_bonus: 0.10      // 空間容量 +10%
                    }
                },
                
                // 整合期設定
                integration: {
                    base_turns: 3,
                    skill_required: null          // 不需特殊人才
                }
            },

            // 算力租賃部（來自 architecture_lv2）
            compute_rental: {
                id: 'compute_rental',
                name: '雲端算力服務商',
                type: 'department',
                icon: '🖥️',
                description: '專業算力租賃與託管服務',
                
                related_facility_upgrade: 'architecture_lv2',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'semiconductor',
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
                            semiconductor: 12,
                            cloud_infra: 8
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 12,
                        compute_efficiency: 0.08
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: 'senior'
                }
            },

            // 設施管理部（來自 modular_lv2）
            facility_management: {
                id: 'facility_management',
                name: '模組化設施供應商',
                type: 'department',
                icon: '🧱',
                description: '專業模組化數據中心建造商',
                
                related_facility_upgrade: 'modular_lv2',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'enterprise',
                        min_value: 15
                    },
                    random_chance: 0.40
                },
                
                cost: {
                    base: 120,
                    variance: 0.15
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            enterprise: 8,
                            cloud_infra: 5
                        }
                    },
                    ongoing: {
                        construction_speed: 0.15,     // 建設速度 +15%
                        construction_cost: -0.10     // 建設成本 -10%
                    }
                },
                
                integration: {
                    base_turns: 3,
                    skill_required: null
                }
            },

            // 綠電開發部（來自 solar_lv2）
            green_energy: {
                id: 'green_energy',
                name: '綠電開發商',
                type: 'department',
                icon: '☀️',
                description: '專業再生能源開發公司',
                
                related_facility_upgrade: 'solar_lv2',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'energy',
                        min_value: 20
                    },
                    random_chance: 0.35
                },
                
                cost: {
                    base: 180,
                    variance: 0.20
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            energy: 15,
                            consumer: 5        // ESG 形象提升
                        }
                    },
                    ongoing: {
                        energy_cost_reduction: 0.12,
                        esg_bonus: 5
                    }
                },
                
                integration: {
                    base_turns: 4,
                    skill_required: null
                }
            },

            // 數據中心服務子公司（進階版）
            datacenter_subsidiary: {
                id: 'datacenter_subsidiary',
                name: '區域數據中心運營商',
                type: 'subsidiary',
                icon: '🏗️',
                description: '大型區域數據中心運營子公司',
                
                related_facility_upgrade: 'cooling_lv2',  // 需已有部門
                requires_department: 'datacenter_services',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'cloud_infra',
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
                            cloud_infra: 20,
                            enterprise: 10
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 15,
                        capacity_bonus: 0.25,
                        external_contracts: true    // 可接外部合約
                    }
                },
                
                integration: {
                    base_turns: 6,
                    skill_required: 'turing'
                }
            },

            // 算力服務子公司
            compute_subsidiary: {
                id: 'compute_subsidiary',
                name: '算力即服務供應商',
                type: 'subsidiary',
                icon: '💻',
                description: '大型雲端算力服務子公司',
                
                related_facility_upgrade: 'architecture_lv2',
                requires_department: 'compute_rental',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'semiconductor',
                        min_value: 55
                    },
                    random_chance: 0.18
                },
                
                cost: {
                    base: 400,
                    variance: 0.30
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            semiconductor: 25,
                            cloud_infra: 15
                        }
                    },
                    ongoing: {
                        quarterly_revenue: 20,
                        compute_efficiency: 0.15,
                        priority_supply: true       // GPU 優先供應
                    }
                },
                
                integration: {
                    base_turns: 7,
                    skill_required: 'turing'
                }
            },

            // 能源子公司
            energy_subsidiary: {
                id: 'energy_subsidiary',
                name: '獨立電力供應商',
                type: 'subsidiary',
                icon: '⚡',
                description: '獨立發電與電網管理子公司',
                
                related_facility_upgrade: 'solar_lv2',
                requires_department: 'green_energy',
                
                availability: {
                    min_tier: 4,
                    required_affinity: {
                        industry: 'energy',
                        min_value: 45
                    },
                    random_chance: 0.22
                },
                
                cost: {
                    base: 320,
                    variance: 0.25
                },
                
                effects: {
                    immediate: {
                        affinity_changes: {
                            energy: 25,
                            defense: 5             // 能源安全
                        }
                    },
                    ongoing: {
                        energy_cost_reduction: 0.25,
                        power_stability: 0.98,
                        esg_bonus: 10
                    }
                },
                
                integration: {
                    base_turns: 6,
                    skill_required: 'senior'
                }
            }
        },

        // ==========================================
        // 併購成本修正因子
        // ==========================================
        COST_MODIFIERS: {
            // 親和度影響（每 10 點親和度）
            affinity_per_10: -0.05,          // -5% 成本
            
            // 市場狀況
            market_conditions: {
                bull: 1.15,                   // 牛市 +15%
                neutral: 1.0,
                bear: 0.85                    // 熊市 -15%
            },
            
            // 競爭對手搶購
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
            // 擁有多個相關單位的加成
            datacenter_compute: {
                required: ['datacenter_services', 'compute_rental'],
                bonus: {
                    quarterly_revenue: 8,
                    efficiency: 0.10
                },
                name: '算力基礎設施整合'
            },
            
            energy_datacenter: {
                required: ['green_energy', 'datacenter_services'],
                bonus: {
                    energy_cost: -0.15,
                    esg_bonus: 8
                },
                name: '綠色數據中心'
            },
            
            full_stack: {
                required: ['datacenter_services', 'compute_rental', 'green_energy'],
                bonus: {
                    quarterly_revenue: 15,
                    all_costs: -0.10,
                    reputation: 10
                },
                name: '全棧基礎設施'
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

    // ==========================================
    // 全局暴露
    // ==========================================
    window.AcquisitionConfig = AcquisitionConfig;

    console.log('✓ Acquisition Config loaded');

})();
