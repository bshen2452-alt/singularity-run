// ============================================
// 設施升級產品配置 (facility_upgrade_products_config.js)
// ============================================
// 設計原則：
//   1. 設施升級視為產品開發項目，需研發期+施工期
//   2. 施工期間該設施區域容量/算力/電力停擺
//   3. renewable升級整合至energy_products
//   4. 達到開發門檻後可升級為部門
// ============================================

(function() {
    'use strict';

    const FACILITY_UPGRADE_PRODUCTS_CONFIG = {
        
        // ==========================================
        // 系統設定
        // ==========================================
        SYSTEM: {
            category: 'infrastructure',
            sub_category: 'facility_upgrade',
            unlock_tier: 3,  // 與原AssetCardConfig.SYSTEM.upgrade_unlock_tier一致
            
            // 施工期間的產能損失
            construction_penalty: {
                space: {
                    capacity_loss_percent: 0.20,  // 施工區佔總容量20%停擺
                    description: '施工區域暫停使用'
                },
                power: {
                    power_loss_percent: 0.15,  // 電力設施施工期間15%產能損失
                    description: '電力設施翻修中'
                },
                compute: {
                    compute_loss_percent: 0.25,  // 算力設施施工期間25%損失
                    description: '運算節點升級中'
                }
            },
            
            // 部門解鎖條件（產品開發完成後）
            department_unlock: {
                required_level: 2,  // 升級到Lv.2才能成立部門
                mastery_threshold: 100  // 部門熟練度100可升級為子公司
            }
        },
        
        // ==========================================
        // 空間設施升級產品
        // ==========================================
        SPACE_UPGRADE_PRODUCTS: {
            // 冷卻系統升級線
            cooling_lv1: {
                id: 'cooling_lv1',
                name: '高效風冷系統研發',
                upgrade_path: { type: 'space', path: 'cooling', target_level: 1 },
                icon: '❄️',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    cash_minimum: 80
                },
                
                development: {
                    research_turns: 2,      // 研發期2季
                    construction_turns: 1,  // 施工期1季
                    base_cost: 50,          // 研發成本
                    construction_cost: 30,  // 施工成本
                    turing_boost: 0.10,
                    senior_boost: 0.05
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.10,
                    description: '部分機房區域施工中'
                },
                
                completion_effects: {
                    benefits: { capacity_mult: 1.15 },
                    costs: { maintenance_mult: 1.05 }
                },
                
                description: '研發高效風冷系統，提升設施容量15%。需2季研發+1季施工。',
                pros: ['設施容量+15%', '研發期較短'],
                cons: ['維運成本+5%', '施工期間10%容量停擺']
            },
            
            cooling_lv2: {
                id: 'cooling_lv2',
                name: '液冷迴路技術研發',
                upgrade_path: { type: 'space', path: 'cooling', target_level: 2 },
                icon: '❄️',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    previous_upgrade: 'cooling_lv1',
                    cash_minimum: 180
                },
                
                development: {
                    research_turns: 4,
                    construction_turns: 2,
                    base_cost: 120,
                    construction_cost: 60,
                    turing_boost: 0.12,
                    senior_boost: 0.06
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.15,
                    description: '大規模管線翻修中'
                },
                
                completion_effects: {
                    benefits: { capacity_mult: 1.35 },
                    costs: { maintenance_mult: 1.15 },
                    unlocks_department: 'datacenter_services'
                },
                
                department_benefits: {
                    id: 'datacenter_services',
                    name: '數據中心服務部',
                    icon: '🏢',
                    benefits: [
                        '每季基礎收益 $5M',
                        '可承接外部託管業務',
                        '熟練度累積可升級為子公司'
                    ]
                },
                
                description: '研發液冷迴路技術，大幅提升容量並解鎖數據中心服務部。',
                pros: ['設施容量+35%', '解鎖數據中心服務部'],
                cons: ['維運成本+15%', '施工期間15%容量停擺', '研發期較長']
            },
            
            cooling_lv3: {
                id: 'cooling_lv3',
                name: '浸沒式相變冷卻研發',
                upgrade_path: { type: 'space', path: 'cooling', target_level: 3 },
                icon: '❄️',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 4,
                    previous_upgrade: 'cooling_lv2',
                    cash_minimum: 400,
                    turing_required: 1
                },
                
                development: {
                    research_turns: 6,
                    construction_turns: 3,
                    base_cost: 280,
                    construction_cost: 150,
                    turing_boost: 0.15,
                    senior_boost: 0.08,
                    requires_turing: true
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.25,
                    description: '全面浸沒式改造'
                },
                
                completion_effects: {
                    benefits: { capacity_mult: 1.6 },
                    costs: { maintenance_mult: 1.25 }
                },
                
                description: '革命性浸沒式相變冷卻技術，需Turing級人才主導研發。',
                pros: ['設施容量+60%', '業界領先技術'],
                cons: ['維運成本+25%', '施工期間25%容量停擺', '需Turing人才']
            },
            
            // 模組化建造升級線
            modular_lv1: {
                id: 'modular_lv1',
                name: '預製中心模組研發',
                upgrade_path: { type: 'space', path: 'modular', target_level: 1 },
                icon: '🧱',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    cash_minimum: 60
                },
                
                development: {
                    research_turns: 2,
                    construction_turns: 1,
                    base_cost: 40,
                    construction_cost: 20,
                    turing_boost: 0.08,
                    senior_boost: 0.04
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.08,
                    description: '模組安裝中'
                },
                
                completion_effects: {
                    benefits: { build_speed_mult: 1.3 },
                    costs: { power_consumption_mult: 1.05 }
                },
                
                description: '研發預製模組技術，加速未來擴建速度30%。',
                pros: ['建造速度+30%', '快速部署'],
                cons: ['電力消耗+5%']
            },
            
            modular_lv2: {
                id: 'modular_lv2',
                name: '可重組功能模塊研發',
                upgrade_path: { type: 'space', path: 'modular', target_level: 2 },
                icon: '🧱',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    previous_upgrade: 'modular_lv1',
                    cash_minimum: 150
                },
                
                development: {
                    research_turns: 4,
                    construction_turns: 2,
                    base_cost: 100,
                    construction_cost: 50,
                    turing_boost: 0.10,
                    senior_boost: 0.05
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.12,
                    description: '功能模塊改造中'
                },
                
                completion_effects: {
                    benefits: { build_speed_mult: 1.6 },
                    costs: { power_consumption_mult: 1.12 },
                    unlocks_department: 'infrastructure_consulting'
                },
                
                department_benefits: {
                    id: 'infrastructure_consulting',
                    name: '基建顧問部',
                    icon: '🏗️',
                    benefits: [
                        '每季基礎收益 $8M',
                        '可承接外部數據中心建置顧問',
                        '縮短自身建設週期'
                    ]
                },
                
                description: '可重組模塊設計，解鎖基建顧問服務。',
                pros: ['建造速度+60%', '解鎖基建顧問部'],
                cons: ['電力消耗+12%']
            },
            
            modular_lv3: {
                id: 'modular_lv3',
                name: '垂直擴建技術研發',
                upgrade_path: { type: 'space', path: 'modular', target_level: 3 },
                icon: '🧱',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 4,
                    previous_upgrade: 'modular_lv2',
                    cash_minimum: 350
                },
                
                development: {
                    research_turns: 5,
                    construction_turns: 3,
                    base_cost: 220,
                    construction_cost: 120,
                    turing_boost: 0.12,
                    senior_boost: 0.06
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.20,
                    description: '結構強化施工中'
                },
                
                completion_effects: {
                    benefits: { build_speed_mult: 2.0, land_efficiency: 1.5 },
                    costs: { power_consumption_mult: 1.20 }
                },
                
                description: '突破性垂直擴建技術，土地效率提升50%。',
                pros: ['建造速度+100%', '土地效率+50%'],
                cons: ['電力消耗+20%', '大規模施工']
            },
            
            // 自動化運維升級線
            automation_lv1: {
                id: 'automation_lv1',
                name: '基礎監控系統研發',
                upgrade_path: { type: 'space', path: 'automation', target_level: 1 },
                icon: '🤖',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    cash_minimum: 55
                },
                
                development: {
                    research_turns: 2,
                    construction_turns: 1,
                    base_cost: 35,
                    construction_cost: 20,
                    turing_boost: 0.08,
                    senior_boost: 0.04
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.05,
                    description: '感測器部署中'
                },
                
                completion_effects: {
                    benefits: { maintenance_cost_mult: 0.85, junior_required_mult: 0.9 },
                    costs: { compute_overhead: 0.02 }
                },
                
                description: '部署基礎監控系統，降低維護成本與人力需求。',
                pros: ['維護成本-15%', 'Junior需求-10%'],
                cons: ['佔用2%算力']
            },
            
            automation_lv2: {
                id: 'automation_lv2',
                name: '預測性維護AI研發',
                upgrade_path: { type: 'space', path: 'automation', target_level: 2 },
                icon: '🤖',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    previous_upgrade: 'automation_lv1',
                    cash_minimum: 140
                },
                
                development: {
                    research_turns: 4,
                    construction_turns: 2,
                    base_cost: 90,
                    construction_cost: 50,
                    turing_boost: 0.12,
                    senior_boost: 0.06
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.10,
                    description: 'AI系統整合中'
                },
                
                completion_effects: {
                    benefits: { maintenance_cost_mult: 0.70, junior_required_mult: 0.75 },
                    costs: { compute_overhead: 0.05 },
                    unlocks_department: 'ai_operations'
                },
                
                department_benefits: {
                    id: 'ai_operations',
                    name: 'AI運維部',
                    icon: '🤖',
                    benefits: [
                        '每季基礎收益 $6M',
                        '可對外銷售AI運維解決方案',
                        '進一步降低內部運維成本'
                    ]
                },
                
                description: '預測性維護AI，解鎖AI運維服務能力。',
                pros: ['維護成本-30%', 'Junior需求-25%', '解鎖AI運維部'],
                cons: ['佔用5%算力']
            },
            
            automation_lv3: {
                id: 'automation_lv3',
                name: '全自主機器人運維研發',
                upgrade_path: { type: 'space', path: 'automation', target_level: 3 },
                icon: '🤖',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 4,
                    previous_upgrade: 'automation_lv2',
                    cash_minimum: 320,
                    turing_required: 1
                },
                
                development: {
                    research_turns: 6,
                    construction_turns: 3,
                    base_cost: 200,
                    construction_cost: 100,
                    turing_boost: 0.15,
                    senior_boost: 0.08,
                    requires_turing: true
                },
                
                construction_impact: {
                    capacity_loss_percent: 0.15,
                    description: '機器人系統部署中'
                },
                
                completion_effects: {
                    benefits: { maintenance_cost_mult: 0.50, junior_required_mult: 0.5 },
                    costs: { compute_overhead: 0.10 }
                },
                
                description: '全自主機器人運維系統，需Turing人才主導。',
                pros: ['維護成本-50%', 'Junior需求-50%'],
                cons: ['佔用10%算力', '需Turing人才']
            }
        },
        
        // ==========================================
        // 電力設施升級產品
        // ==========================================
        POWER_UPGRADE_PRODUCTS: {
            // 儲能技術升級線
            storage_lv1: {
                id: 'storage_lv1',
                name: '鋰電池備援系統研發',
                upgrade_path: { type: 'power', path: 'storage', target_level: 1 },
                icon: '🔋',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    cash_minimum: 100
                },
                
                development: {
                    research_turns: 2,
                    construction_turns: 1,
                    base_cost: 60,
                    construction_cost: 40,
                    turing_boost: 0.08,
                    senior_boost: 0.04
                },
                
                construction_impact: {
                    power_loss_percent: 0.08,
                    description: '電池陣列安裝中'
                },
                
                completion_effects: {
                    benefits: { power_stability: 0.2, peak_shaving: 0.1 },
                    costs: { upfront_cost: 30 }
                },
                
                description: '鋰電池備援系統，提升電力穩定性。',
                pros: ['電力穩定性+20%', '尖峰削減10%'],
                cons: ['施工期間8%電力損失']
            },
            
            storage_lv2: {
                id: 'storage_lv2',
                name: '液流電池陣列研發',
                upgrade_path: { type: 'power', path: 'storage', target_level: 2 },
                icon: '🔋',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    previous_upgrade: 'storage_lv1',
                    cash_minimum: 230
                },
                
                development: {
                    research_turns: 4,
                    construction_turns: 2,
                    base_cost: 150,
                    construction_cost: 80,
                    turing_boost: 0.10,
                    senior_boost: 0.05
                },
                
                construction_impact: {
                    power_loss_percent: 0.12,
                    description: '大型儲能設施建置中'
                },
                
                completion_effects: {
                    benefits: { power_stability: 0.5, peak_shaving: 0.25, energy_cost_mult: 0.9 },
                    costs: { upfront_cost: 80 },
                    unlocks_department: 'energy_trading'
                },
                
                department_benefits: {
                    id: 'energy_trading',
                    name: '能源交易部',
                    icon: '📈',
                    benefits: [
                        '每季基礎收益 $10M',
                        '可進行電力套利交易',
                        '參與需量反應獲取補貼'
                    ]
                },
                
                description: '液流電池大規模儲能，解鎖能源交易能力。',
                pros: ['電力穩定性+50%', '電力成本-10%', '解鎖能源交易部'],
                cons: ['施工期間12%電力損失']
            },
            
            storage_lv3: {
                id: 'storage_lv3',
                name: '超導儲能系統研發',
                upgrade_path: { type: 'power', path: 'storage', target_level: 3 },
                icon: '🔋',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 4,
                    previous_upgrade: 'storage_lv2',
                    cash_minimum: 550,
                    turing_required: 1
                },
                
                development: {
                    research_turns: 8,
                    construction_turns: 4,
                    base_cost: 350,
                    construction_cost: 200,
                    turing_boost: 0.15,
                    senior_boost: 0.08,
                    requires_turing: true
                },
                
                construction_impact: {
                    power_loss_percent: 0.20,
                    description: '超導設施建置中'
                },
                
                completion_effects: {
                    benefits: { power_stability: 0.9, peak_shaving: 0.5, energy_cost_mult: 0.75 },
                    costs: { upfront_cost: 200 }
                },
                
                description: '革命性超導儲能技術，需Turing人才主導。',
                pros: ['電力穩定性+90%', '尖峰削減50%', '電力成本-25%'],
                cons: ['高額建置成本', '需Turing人才']
            },
            
            // 微電網升級線
            microgrid_lv1: {
                id: 'microgrid_lv1',
                name: '本地電網優化研發',
                upgrade_path: { type: 'power', path: 'microgrid', target_level: 1 },
                icon: '🔌',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    cash_minimum: 70
                },
                
                development: {
                    research_turns: 2,
                    construction_turns: 1,
                    base_cost: 45,
                    construction_cost: 25,
                    turing_boost: 0.08,
                    senior_boost: 0.04
                },
                
                construction_impact: {
                    power_loss_percent: 0.05,
                    description: '電網改造中'
                },
                
                completion_effects: {
                    benefits: { grid_efficiency: 1.1 },
                    costs: { compute_overhead: 0.01 }
                },
                
                description: '優化本地電網配置，提升整體效率。',
                pros: ['電網效率+10%'],
                cons: ['佔用1%算力']
            },
            
            microgrid_lv2: {
                id: 'microgrid_lv2',
                name: '智慧電網介面研發',
                upgrade_path: { type: 'power', path: 'microgrid', target_level: 2 },
                icon: '🔌',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    previous_upgrade: 'microgrid_lv1',
                    cash_minimum: 170
                },
                
                development: {
                    research_turns: 4,
                    construction_turns: 2,
                    base_cost: 110,
                    construction_cost: 60,
                    turing_boost: 0.10,
                    senior_boost: 0.05
                },
                
                construction_impact: {
                    power_loss_percent: 0.10,
                    description: '智慧電網整合中'
                },
                
                completion_effects: {
                    benefits: { grid_efficiency: 1.25, demand_response: true },
                    costs: { compute_overhead: 0.03 },
                    unlocks_department: 'smart_grid'
                },
                
                department_benefits: {
                    id: 'smart_grid',
                    name: '智慧電網部',
                    icon: '🔌',
                    benefits: [
                        '每季基礎收益 $7M',
                        '可對外提供電網優化服務',
                        '參與需量反應計劃'
                    ]
                },
                
                description: '智慧電網整合，解鎖電網服務能力。',
                pros: ['電網效率+25%', '需量反應功能', '解鎖智慧電網部'],
                cons: ['佔用3%算力']
            },
            
            microgrid_lv3: {
                id: 'microgrid_lv3',
                name: '自組織能源網路研發',
                upgrade_path: { type: 'power', path: 'microgrid', target_level: 3 },
                icon: '🔌',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 4,
                    previous_upgrade: 'microgrid_lv2',
                    cash_minimum: 380
                },
                
                development: {
                    research_turns: 6,
                    construction_turns: 3,
                    base_cost: 250,
                    construction_cost: 130,
                    turing_boost: 0.12,
                    senior_boost: 0.06
                },
                
                construction_impact: {
                    power_loss_percent: 0.15,
                    description: '自組織網路部署中'
                },
                
                completion_effects: {
                    benefits: { grid_efficiency: 1.5, can_sell_power: true },
                    costs: { compute_overhead: 0.06 }
                },
                
                description: '自組織能源網路，可對外售電。',
                pros: ['電網效率+50%', '可對外售電'],
                cons: ['佔用6%算力']
            }
        },
        
        // ==========================================
        // 多元能源升級整合至 energy_products
        // ==========================================
        // 注意：renewable升級路線整合至 energy_products_config.js
        // 此處僅保留參照
        RENEWABLE_INTEGRATION: {
            note: 'renewable升級已整合至energy_products系統',
            mapping: {
                'renewable_lv1': 'renewable_farm',  // 對應綠能發電場
                'renewable_lv2': 'renewable_farm',  // 擴展綠能發電場
                'renewable_lv3': 'nuclear_plant'    // 核聚變實驗堆對應核電站
            },
            department: {
                id: 'green_energy',
                unlock_condition: 'renewable_farm完成開發後解鎖'
            }
        },
        
        // ==========================================
        // 算力設施升級產品
        // ==========================================
        COMPUTE_UPGRADE_PRODUCTS: {
            // 架構迭代升級線
            architecture_lv1: {
                id: 'architecture_lv1',
                name: '多核GPU集群研發',
                upgrade_path: { type: 'compute', path: 'architecture', target_level: 1 },
                icon: '🔧',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    cash_minimum: 110
                },
                
                development: {
                    research_turns: 3,
                    construction_turns: 1,
                    base_cost: 70,
                    construction_cost: 40,
                    turing_boost: 0.10,
                    senior_boost: 0.05
                },
                
                construction_impact: {
                    compute_loss_percent: 0.15,
                    description: 'GPU節點升級中'
                },
                
                completion_effects: {
                    benefits: { compute_efficiency: 1.15, training_speed: 1.1 },
                    costs: { power_consumption_mult: 1.08 }
                },
                
                description: '部署多核GPU集群，提升運算效能。',
                pros: ['運算效率+15%', '訓練速度+10%'],
                cons: ['電力消耗+8%', '施工期間15%算力損失']
            },
            
            architecture_lv2: {
                id: 'architecture_lv2',
                name: '異構計算架構研發',
                upgrade_path: { type: 'compute', path: 'architecture', target_level: 2 },
                icon: '🔧',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 3,
                    previous_upgrade: 'architecture_lv1',
                    cash_minimum: 250
                },
                
                development: {
                    research_turns: 5,
                    construction_turns: 2,
                    base_cost: 160,
                    construction_cost: 90,
                    turing_boost: 0.12,
                    senior_boost: 0.06
                },
                
                construction_impact: {
                    compute_loss_percent: 0.20,
                    description: '架構大規模改造中'
                },
                
                completion_effects: {
                    benefits: { compute_efficiency: 1.35, training_speed: 1.25, inference_speed: 1.2 },
                    costs: { power_consumption_mult: 1.18 },
                    unlocks_department: 'compute_rental'
                },
                
                department_benefits: {
                    id: 'compute_rental',
                    name: '算力租賃部',
                    icon: '🖥️',
                    benefits: [
                        '每季基礎收益 $12M',
                        '可對外出租閒置算力',
                        '彈性調配訓練/推論資源'
                    ]
                },
                
                description: '異構計算架構，解鎖算力租賃服務。',
                pros: ['運算效率+35%', '訓練速度+25%', '解鎖算力租賃部'],
                cons: ['電力消耗+18%', '施工期間20%算力損失']
            },
            
            architecture_lv3: {
                id: 'architecture_lv3',
                name: '神經擬態/量子光子混合架構研發',
                upgrade_path: { type: 'compute', path: 'architecture', target_level: 3 },
                icon: '🔧',
                category: 'infrastructure',
                sub_category: 'facility_upgrade',
                
                unlock_requirements: {
                    mp_tier: 4,
                    previous_upgrade: 'architecture_lv2',
                    cash_minimum: 700,
                    turing_required: 1
                },
                
                development: {
                    research_turns: 8,
                    construction_turns: 4,
                    base_cost: 500,
                    construction_cost: 250,
                    turing_boost: 0.15,
                    senior_boost: 0.08,
                    requires_turing: true
                },
                
                construction_impact: {
                    compute_loss_percent: 0.30,
                    description: '革命性架構導入中'
                },
                
                completion_effects: {
                    benefits: { compute_efficiency: 1.8, training_speed: 1.5, inference_speed: 1.6, mp_growth_bonus: 0.1 },
                    costs: { power_consumption_mult: 1.30 }
                },
                
                description: '革命性神經擬態/量子光子混合架構，需Turing人才主導。',
                pros: ['運算效率+80%', '訓練速度+50%', 'MP成長+10%'],
                cons: ['電力消耗+30%', '施工期間30%算力損失', '需Turing人才']
            }
        },
        
        // ==========================================
        // 升級產品狀態類型
        // ==========================================
        UPGRADE_STATUS: {
            LOCKED: 'locked',              // 未解鎖（需前置升級或Tier）
            UNLOCKED: 'unlocked',          // 已解鎖可開發
            RESEARCHING: 'researching',    // 研發中
            CONSTRUCTING: 'constructing',  // 施工中
            COMPLETED: 'completed',        // 已完成
            OPERATING: 'operating'         // 效果生效中
        }
    };
    
    // ==========================================
    // 輔助函數
    // ==========================================
    
    FACILITY_UPGRADE_PRODUCTS_CONFIG.getAllUpgradeProducts = function() {
        return {
            ...this.SPACE_UPGRADE_PRODUCTS,
            ...this.POWER_UPGRADE_PRODUCTS,
            ...this.COMPUTE_UPGRADE_PRODUCTS
        };
    };
    
    FACILITY_UPGRADE_PRODUCTS_CONFIG.getUpgradeProduct = function(productId) {
        return this.getAllUpgradeProducts()[productId] || null;
    };
    
    FACILITY_UPGRADE_PRODUCTS_CONFIG.getUpgradesByType = function(assetType) {
        const key = `${assetType.toUpperCase()}_UPGRADE_PRODUCTS`;
        return this[key] || {};
    };
    
    FACILITY_UPGRADE_PRODUCTS_CONFIG.getUpgradePath = function(productId) {
        const product = this.getUpgradeProduct(productId);
        return product ? product.upgrade_path : null;
    };
    
    // ==========================================
    // 全局暴露
    // ==========================================
    window.FACILITY_UPGRADE_PRODUCTS_CONFIG = FACILITY_UPGRADE_PRODUCTS_CONFIG;
    
    console.log('✓ Facility Upgrade Products Config loaded');
    
})();
