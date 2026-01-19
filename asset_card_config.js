// ============================================
// 資產卡片系統配置 (Asset Card Config)
// ============================================
// 設計原則：
//   1. 每條升級有「增益」與「代價」，形成取捨
//   2. 不同路線可能相互牴觸
//   3. 全面發展=普通大企業，專精=有亮點
//   4. 技術達標 → 部門(多技術組合) → 子公司
// ============================================

const AssetCardConfig = {
    
    SYSTEM: {
        unlock_tier: 0,
        upgrade_unlock_tier: 3,
        max_upgrade_level: 3,
        department_unlock_level: 2,
        subsidiary_mastery_required: 100,
        generalist_penalty: {
            threshold: 10,
            revenue_mult: 0.85,
            description: '組織龐雜，缺乏專精優勢'
        }
    },
    
    // ==========================================
    // 空間升級路線
    // ==========================================
    SPACE_UPGRADES: {
        cooling: {
            id: 'cooling', name: '冷卻系統', icon: '❄️',
            description: '提升設施容量',
            benefit_summary: '設施容量 ↑', cost_summary: '維運成本 ↑',
            levels: [
                { level: 1, name: '高效風冷系統', benefits: { capacity_mult: 1.15 }, costs: { maintenance_mult: 1.05 }, upgrade_cost: { cash: 50, turns: 1 } },
                { level: 2, name: '液冷迴路', benefits: { capacity_mult: 1.35 }, costs: { maintenance_mult: 1.15 }, upgrade_cost: { cash: 120, turns: 2 } },
                { level: 3, name: '浸沒式相變冷卻', benefits: { capacity_mult: 1.6 }, costs: { maintenance_mult: 1.25 }, upgrade_cost: { cash: 280, turns: 3 } }
            ],
            conflicts_with: []
        },
        modular: {
            id: 'modular', name: '模組化建造', icon: '🧱',
            description: '提升擴建速度',
            benefit_summary: '建造速度 ↑', cost_summary: '電力消耗 ↑',
            levels: [
                { level: 1, name: '預製中心模組', benefits: { build_speed_mult: 1.3 }, costs: { power_consumption_mult: 1.05 }, upgrade_cost: { cash: 40, turns: 1 } },
                { level: 2, name: '可重組功能模塊', benefits: { build_speed_mult: 1.6 }, costs: { power_consumption_mult: 1.12 }, upgrade_cost: { cash: 100, turns: 2 } },
                { level: 3, name: '垂直擴建技術', benefits: { build_speed_mult: 2.0, land_efficiency: 1.5 }, costs: { power_consumption_mult: 1.20 }, upgrade_cost: { cash: 220, turns: 3 } }
            ],
            conflicts_with: []
        },
        automation: {
            id: 'automation', name: '自動化運維', icon: '🤖',
            description: '降低維護成本',
            benefit_summary: '維護成本 ↓', cost_summary: '算力消耗 ↑',
            levels: [
                { level: 1, name: '基礎監控系統', benefits: { maintenance_cost_mult: 0.85, junior_required_mult: 0.9 }, costs: { compute_overhead: 0.02 }, upgrade_cost: { cash: 35, turns: 1 } },
                { level: 2, name: '預測性維護AI', benefits: { maintenance_cost_mult: 0.70, junior_required_mult: 0.75 }, costs: { compute_overhead: 0.05 }, upgrade_cost: { cash: 90, turns: 2 } },
                { level: 3, name: '全自主機器人運維', benefits: { maintenance_cost_mult: 0.50, junior_required_mult: 0.5 }, costs: { compute_overhead: 0.10 }, upgrade_cost: { cash: 200, turns: 3 } }
            ],
            conflicts_with: ['compute.specialization']
        }
    },
    
    // ==========================================
    // 電力升級路線
    // ==========================================
    POWER_UPGRADES: {
        storage: {
            id: 'storage', name: '儲能技術', icon: '🔋',
            description: '維持電力供應穩定',
            benefit_summary: '電力穩定性 ↑', cost_summary: '建置成本 ↑',
            levels: [
                { level: 1, name: '鋰電池備援系統', benefits: { power_stability: 0.2, peak_shaving: 0.1 }, costs: { upfront_cost: 30 }, upgrade_cost: { cash: 60, turns: 1 } },
                { level: 2, name: '流體電池陣列', benefits: { power_stability: 0.5, peak_shaving: 0.25, energy_cost_mult: 0.9 }, costs: { upfront_cost: 80 }, upgrade_cost: { cash: 150, turns: 2 } },
                { level: 3, name: '超導儲能系統', benefits: { power_stability: 0.9, peak_shaving: 0.5, energy_cost_mult: 0.75 }, costs: { upfront_cost: 200 }, upgrade_cost: { cash: 350, turns: 4 } }
            ],
            conflicts_with: []
        },
        microgrid: {
            id: 'microgrid', name: '微電網', icon: '🔌',
            description: '提升電力營運彈性',
            benefit_summary: '營運彈性 ↑', cost_summary: '額外算力消耗',
            levels: [
                { level: 1, name: '本地電網優化', benefits: { grid_efficiency: 1.1 }, costs: { compute_overhead: 0.01 }, upgrade_cost: { cash: 45, turns: 1 } },
                { level: 2, name: '智慧電網接口', benefits: { grid_efficiency: 1.25, demand_response: true }, costs: { compute_overhead: 0.03 }, upgrade_cost: { cash: 110, turns: 2 } },
                { level: 3, name: '自組織能源網路', benefits: { grid_efficiency: 1.5, can_sell_power: true }, costs: { compute_overhead: 0.06 }, upgrade_cost: { cash: 250, turns: 3 } }
            ],
            conflicts_with: []
        },
        renewable: {
            id: 'renewable', name: '自營能源', icon: '🌱',
            description: '提升能源自主性',
            benefit_summary: 'ESG評分 ↑', cost_summary: '穩定性 ↓',
            levels: [
                { level: 1, name: '屋頂太陽能系統', benefits: { energy_cost_mult: 0.9, esg_bonus: 3 }, costs: { power_variance: 0.1 }, upgrade_cost: { cash: 55, turns: 1 } },
                { level: 2, name: '再生能源憑證', benefits: { energy_cost_mult: 0.75, esg_bonus: 8, green_percentage: 0.5 }, costs: { power_variance: 0.05 }, upgrade_cost: { cash: 130, turns: 2 } },
                { level: 3, name: '自有模組化核電站SMRs', benefits: { energy_cost_mult: 0.55, esg_bonus: 15, green_percentage: 0.9 }, costs: { land_required: 10 }, upgrade_cost: { cash: 400, turns: 4 } }
            ],
            conflicts_with: []
        }
    },
    
    // ==========================================
    // 算力升級路線
    // ==========================================
    COMPUTE_UPGRADES: {
        architecture: {
            id: 'architecture', name: '運算架構', icon: '🖥️',
            description: '提升通用運算效率',
            benefit_summary: '運算效率 ↑', cost_summary: '硬體成本 ↑',
            levels: [
                { level: 1, name: '異構運算優化', benefits: { compute_efficiency: 1.15 }, costs: { hardware_cost_mult: 1.1 }, upgrade_cost: { cash: 80, turns: 1 } },
                { level: 2, name: '分散式編排系統', benefits: { compute_efficiency: 1.35, multi_region: true }, costs: { hardware_cost_mult: 1.2 }, upgrade_cost: { cash: 180, turns: 2 } },
                { level: 3, name: '自適應工作流引擎', benefits: { compute_efficiency: 1.6, auto_scaling: true }, costs: { hardware_cost_mult: 1.35 }, upgrade_cost: { cash: 350, turns: 3 } }
            ],
            conflicts_with: []
        },
        cluster: {
            id: 'cluster', name: '叢集管理', icon: '🔗',
            description: '提升大規模訓練能力',
            benefit_summary: '訓練效率 ↑', cost_summary: '網路成本 ↑',
            levels: [
                { level: 1, name: 'GPU叢集互連', benefits: { training_speed: 1.2, max_model_size: 1.5 }, costs: { network_cost_mult: 1.15 }, upgrade_cost: { cash: 100, turns: 1 } },
                { level: 2, name: 'InfiniBand高速網路', benefits: { training_speed: 1.5, max_model_size: 3.0, parallel_jobs: 2 }, costs: { network_cost_mult: 1.35 }, upgrade_cost: { cash: 220, turns: 2 } },
                { level: 3, name: '光學互連超級叢集', benefits: { training_speed: 2.0, max_model_size: 10.0, parallel_jobs: 4 }, costs: { network_cost_mult: 1.6 }, upgrade_cost: { cash: 500, turns: 4 } }
            ],
            conflicts_with: []
        },
        specialization: {
            id: 'specialization', name: 'AI專用晶片', icon: '🎯',
            description: '發展專用推論硬體',
            benefit_summary: '推論效能 ↑', cost_summary: '通用性 ↓',
            levels: [
                { level: 1, name: '推論加速卡', benefits: { inference_efficiency: 1.3 }, costs: { general_compute_penalty: 0.1 }, upgrade_cost: { cash: 70, turns: 1 } },
                { level: 2, name: '自研TPU設計', benefits: { inference_efficiency: 1.8, custom_ops: true }, costs: { general_compute_penalty: 0.2 }, upgrade_cost: { cash: 200, turns: 3 } },
                { level: 3, name: '神經形態處理器', benefits: { inference_efficiency: 3.0, edge_deployment: true }, costs: { general_compute_penalty: 0.35 }, upgrade_cost: { cash: 450, turns: 4 } }
            ],
            conflicts_with: ['space.automation']
        }
    },
    
    // ==========================================
    // 人才升級路線
    // ==========================================
    TALENT_UPGRADES: {
        productivity: {
            id: 'productivity', name: '生產力工具', icon: '⚡',
            description: '提升人均產出',
            benefit_summary: '人均效率 ↑', cost_summary: '工具成本 ↑',
            levels: [
                { level: 1, name: 'AI輔助開發環境', benefits: { productivity_mult: 1.2 }, costs: { tool_cost_per_head: 0.5 }, upgrade_cost: { cash: 30, turns: 1 } },
                { level: 2, name: '自動化DevOps流程', benefits: { productivity_mult: 1.5, deploy_speed: 2.0 }, costs: { tool_cost_per_head: 1.0 }, upgrade_cost: { cash: 80, turns: 2 } },
                { level: 3, name: 'AI結對編程系統', benefits: { productivity_mult: 2.0, bug_reduction: 0.3 }, costs: { tool_cost_per_head: 2.0 }, upgrade_cost: { cash: 150, turns: 3 } }
            ],
            conflicts_with: []
        }
    },
    
    // ==========================================
    // 數據升級路線
    // ==========================================
    DATA_UPGRADES: {
        synthesis: {
            id: 'synthesis', name: '合成數據', icon: '🧬',
            description: '生成高品質訓練數據',
            benefit_summary: '數據產能 ↑', cost_summary: '品質風險 ↑',
            levels: [
                { level: 1, name: '基礎數據增強', benefits: { data_generation_rate: 1.3 }, costs: { quality_variance: 0.1 }, upgrade_cost: { cash: 40, turns: 1 }, unlocks_methods: ['logical'] },
                { level: 2, name: 'GAN數據合成', benefits: { data_generation_rate: 2.0, data_diversity: 1.5 }, costs: { quality_variance: 0.15 }, upgrade_cost: { cash: 100, turns: 2 }, unlocks_methods: ['logical', 'generative'] },
                { level: 3, name: '世界模型模擬器', benefits: { data_generation_rate: 4.0, scenario_simulation: true }, costs: { compute_requirement: 0.15 }, upgrade_cost: { cash: 250, turns: 3 }, unlocks_methods: ['logical', 'generative', 'causal'] }
            ],
            conflicts_with: ['data.privacy']
        },
        marketplace: {
            id: 'marketplace', name: '數據市集', icon: '🏪',
            description: '建立數據交易能力',
            benefit_summary: '數據變現 ↑', cost_summary: '隱私風險 ↑',
            levels: [
                { level: 1, name: '內部數據目錄', benefits: { data_reuse: 1.2, sell_enabled: ['legal_low'] }, costs: { compliance_overhead: 0.05 }, upgrade_cost: { cash: 25, turns: 1 } },
                { level: 2, name: '數據交易平台', benefits: { data_monetization: true, external_data_access: true, sell_enabled: ['legal_low', 'legal_high_broad'] }, costs: { compliance_overhead: 0.15 }, upgrade_cost: { cash: 90, turns: 2 } },
                { level: 3, name: '聯邦數據網路', benefits: { cross_org_training: true, data_network_effect: 1.5, sell_enabled: ['legal_low', 'legal_high_broad', 'legal_high_focused'] }, costs: { compliance_overhead: 0.25 }, upgrade_cost: { cash: 200, turns: 3 } }
            ],
            conflicts_with: ['data.privacy']
        },
        privacy: {
            id: 'privacy', name: '隱私計算', icon: '🔒',
            description: '保護數據安全',
            benefit_summary: '合規評分 ↑', cost_summary: '運算開銷 ↑',
            levels: [
                { level: 1, name: '差分隱私基礎', benefits: { compliance_score: 10, trust_bonus: 3 }, costs: { compute_overhead: 0.05 }, upgrade_cost: { cash: 35, turns: 1 } },
                { level: 2, name: '同態加密推論', benefits: { compliance_score: 25, trust_bonus: 8, enterprise_ready: true }, costs: { compute_overhead: 0.15 }, upgrade_cost: { cash: 120, turns: 2 } },
                { level: 3, name: '可信執行環境', benefits: { compliance_score: 50, trust_bonus: 15, gov_contracts: true }, costs: { compute_overhead: 0.25 }, upgrade_cost: { cash: 280, turns: 3 } }
            ],
            conflicts_with: ['data.synthesis', 'data.marketplace']
        }
    },

    // ==========================================
    // 部門定義（多技術組合條件）
    // ==========================================
    // 注意：技術路徑需對應實際的升級系統
    // - space: cooling, modular, automation (facility_upgrade)
    // - power: storage, microgrid, renewable (facility_upgrade + energy_products)
    // - compute: architecture (facility_upgrade)
    // - talent: productivity (asset_card 直接升級)
    // - data: synthesis, marketplace, privacy (asset_card 直接升級)
    // ==========================================
    FUNCTIONAL_DEPTS: {
        compute_rental: {
            id: 'compute_rental', name: '算力租賃部', icon: '🖥️',
            required_techs: [
                { type: 'compute', path: 'architecture', level: 2 },
                { type: 'space', path: 'cooling', level: 2 }
            ],
            description: '整合運算架構與冷卻系統，對外提供運算服務',
            base_operating_cost: 18, base_revenue: 25, mastery_gain_per_turn: 2,
            evolves_to: 'compute_rental_subsidiary',
            benefits_summary: ['📈 每季基礎收益 $25M', '💻 可對外出租閒置算力', '⚡ 算力利用率 +15%', '🎯 熟練度累積可升級為子公司'],
            passive_effects: { base_revenue: 25, compute_rental_enabled: true, compute_utilization_bonus: 0.15 },
            mastery_bonuses: { 25: { revenue_mult: 1.1, description: '收益 +10%' }, 50: { rental_premium: 0.10, description: '租賃溢價 +10%' }, 75: { utilization_bonus: 0.05, description: '利用率 +5%' }, 100: { evolve_ready: true, description: '可升級為子公司' } }
        },
        energy_tech: {
            id: 'energy_tech', name: '能源科技部', icon: '⚡',
            required_techs: [
                { type: 'power', path: 'storage', level: 2 },
                { type: 'power', path: 'microgrid', level: 2 }
            ],
            description: '結合儲能與微電網技術，發展能源解決方案',
            base_operating_cost: 20, base_revenue: 22, mastery_gain_per_turn: 2,
            evolves_to: 'energy_tech_subsidiary',
            benefits_summary: ['📈 每季基礎收益 $22M', '🔋 能源成本降低 10%', '🌱 ESG 評分 +8', '🎯 熟練度累積可升級為子公司'],
            passive_effects: { base_revenue: 22, energy_cost_reduction: 0.10, esg_bonus: 8, energy_trading_enabled: true },
            mastery_bonuses: { 25: { revenue_mult: 1.1, description: '收益 +10%' }, 50: { energy_efficiency: 0.05, description: '能源效率 +5%' }, 75: { green_premium: 0.15, description: '綠電溢價 +15%' }, 100: { evolve_ready: true, description: '可升級為子公司' } }
        },
        hardware_design: {
            id: 'hardware_design', name: '硬體設計部', icon: '🔧',
            required_techs: [
                { type: 'compute', path: 'architecture', level: 3 },
                { type: 'space', path: 'modular', level: 2 }
            ],
            description: '自研AI晶片架構，授權設計IP',
            base_operating_cost: 35, base_revenue: 45, mastery_gain_per_turn: 1,
            evolves_to: 'hardware_design_subsidiary',
            benefits_summary: ['📈 每季基礎收益 $45M', '🔧 AI晶片設計能力', '📜 晶片授權收入', '🎯 熟練度累積可升級為子公司'],
            passive_effects: { base_revenue: 45, chip_design_enabled: true, licensing_income: true, compute_efficiency_bonus: 0.15 },
            mastery_bonuses: { 25: { revenue_mult: 1.1, description: '收益 +10%' }, 50: { design_speed: 0.15, description: '設計速度 +15%' }, 75: { licensing_premium: 0.25, description: '授權溢價 +25%' }, 100: { evolve_ready: true, description: '可升級為子公司' } }
        },
        data_exchange: {
            id: 'data_exchange', name: '數據交易部', icon: '📊',
            required_techs: [
                { type: 'data', path: 'marketplace', level: 2 },
                { type: 'data', path: 'synthesis', level: 2 }
            ],
            description: '營運數據交易平台，提供合成數據服務',
            base_operating_cost: 15, base_revenue: 20, mastery_gain_per_turn: 2,
            evolves_to: 'data_exchange_subsidiary',
            benefits_summary: ['📈 每季基礎收益 $20M', '🏪 數據交易平台', '🧬 合成數據生成', '🎯 熟練度累積可升級為子公司'],
            passive_effects: { base_revenue: 20, data_exchange_enabled: true, synthetic_data_enabled: true, data_quality_bonus: 0.10 },
            mastery_bonuses: { 25: { revenue_mult: 1.1, description: '收益 +10%' }, 50: { platform_volume: 0.15, description: '交易量 +15%' }, 75: { data_premium: 0.10, description: '數據溢價 +10%' }, 100: { evolve_ready: true, description: '可升級為子公司' } }
        },
        enterprise_consulting: {
            id: 'enterprise_consulting', name: '企業顧問部', icon: '💼',
            required_techs: [
                { type: 'talent', path: 'productivity', level: 2 },
                { type: 'space', path: 'automation', level: 2 }
            ],
            description: '提供AI導入與數位轉型顧問服務',
            base_operating_cost: 12, base_revenue: 18, mastery_gain_per_turn: 3,
            evolves_to: 'enterprise_consulting_subsidiary',
            benefits_summary: ['📈 每季基礎收益 $18M', '🤝 企業AI導入顧問', '📋 數位轉型諮詢', '🎯 熟練度累積可升級為子公司'],
            passive_effects: { base_revenue: 18, consulting_enabled: true, enterprise_solutions: true, trust_bonus: 5 },
            mastery_bonuses: { 25: { revenue_mult: 1.1, description: '收益 +10%' }, 50: { contract_value: 0.15, description: '合約價值 +15%' }, 75: { referral_bonus: 0.10, description: '推薦獎金 +10%' }, 100: { evolve_ready: true, description: '可升級為子公司' } }
        },
        quant_trading: {
            id: 'quant_trading', name: '量化投資部', icon: '📈',
            required_techs: [
                { type: 'compute', path: 'architecture', level: 3 },
                { type: 'data', path: 'synthesis', level: 2 }
            ],
            description: '運用AI算力與數據進行量化交易策略',
            base_operating_cost: 25, base_revenue: 35, mastery_gain_per_turn: 1,
            evolves_to: 'quant_trading_subsidiary',
            benefits_summary: ['📈 每季基礎收益 $35M', '💹 量化交易策略', '🎲 收益波動性高', '🎯 熟練度累積可升級為子公司'],
            passive_effects: { base_revenue: 35, quant_trading_enabled: true, market_analysis: true, revenue_volatility: 0.3 },
            mastery_bonuses: { 25: { revenue_mult: 1.15, description: '收益 +15%' }, 50: { volatility_reduction: 0.10, description: '波動降低 10%' }, 75: { alpha_generation: 0.20, description: '超額收益 +20%' }, 100: { evolve_ready: true, description: '可升級為子公司' } }
        },
        community_platform: {
            id: 'community_platform', name: '社群營運部', icon: '👥',
            required_techs: [
                { type: 'data', path: 'marketplace', level: 2 },
                { type: 'talent', path: 'productivity', level: 2 }
            ],
            description: '經營AI開發者與用戶社群平台',
            base_operating_cost: 10, base_revenue: 15, mastery_gain_per_turn: 3,
            evolves_to: 'community_platform_subsidiary',
            benefits_summary: ['📈 每季基礎收益 $15M', '👥 開發者社群', '🌐 平台網絡效應', '🎯 熟練度累積可升級為子公司'],
            passive_effects: { base_revenue: 15, community_enabled: true, network_effect: 0.05, talent_attraction_bonus: 0.10 },
            mastery_bonuses: { 25: { revenue_mult: 1.1, description: '收益 +10%' }, 50: { network_growth: 0.10, description: '網絡成長 +10%' }, 75: { engagement_bonus: 0.15, description: '參與度 +15%' }, 100: { evolve_ready: true, description: '可升級為子公司' } }
        },
        research_institute: {
            id: 'research_institute', name: '研究智庫部', icon: '🔬',
            required_techs: [
                { type: 'data', path: 'privacy', level: 2 },
                { type: 'space', path: 'automation', level: 2 }
            ],
            description: '進行前沿AI研究與政策諮詢',
            base_operating_cost: 22, base_revenue: 18, mastery_gain_per_turn: 2,
            evolves_to: 'research_institute_subsidiary',
            benefits_summary: ['📈 每季基礎收益 $18M', '🔬 前沿研究能力', '📚 學術聲望累積', '🎯 熟練度累積可升級為子公司'],
            passive_effects: { base_revenue: 18, research_enabled: true, reputation_bonus: 10, breakthrough_chance: 0.05 },
            mastery_bonuses: { 25: { revenue_mult: 1.1, description: '收益 +10%' }, 50: { research_speed: 0.15, description: '研究速度 +15%' }, 75: { reputation_mult: 1.20, description: '聲望 +20%' }, 100: { evolve_ready: true, description: '可升級為子公司' } }
        }
    },
    
    // ==========================================
    // 子公司定義
    // ==========================================
    FUNCTIONAL_SUBSIDIARIES: {
        compute_rental_subsidiary: {
            id: 'compute_rental_subsidiary', name: '算力租賃公司', icon: '🖥️',
            from_dept: 'compute_rental',
            description: '獨立運營的雲端算力服務商',
            spectrum: { x: 0.3, y: 0.5 },
            base_operating_cost: 45, base_revenue: 70, revenue_mult: 2.8,
            resource_conversion: { compute: { consume_rate: 0.20, cash_per_unit: 1.2 } },
            special_ability: '可承接大型企業長約',
            passive_effects: { compute_rental_premium: 0.25, enterprise_contracts: true }
        },
        energy_tech_subsidiary: {
            id: 'energy_tech_subsidiary', name: '能源科技公司', icon: '⚡',
            from_dept: 'energy_tech',
            description: '綠色能源與儲能解決方案供應商',
            spectrum: { x: -0.2, y: 0.7 },
            base_operating_cost: 50, base_revenue: 65, revenue_mult: 3.0,
            resource_conversion: { energy_surplus: { consume_rate: 0.30, cash_per_unit: 0.8 } },
            special_ability: '政府綠能補貼加成',
            passive_effects: { energy_cost_reduction: 0.15, esg_bonus: 15, gov_subsidy_eligible: true }
        },
        hardware_design_subsidiary: {
            id: 'hardware_design_subsidiary', name: '硬體設計公司', icon: '🔧',
            from_dept: 'hardware_design',
            description: 'AI晶片設計與IP授權公司',
            spectrum: { x: -0.5, y: 0.9 },
            base_operating_cost: 80, base_revenue: 120, revenue_mult: 2.7,
            resource_conversion: { research_output: { consume_rate: 0.15, cash_per_unit: 5.0 } },
            special_ability: '晶片授權費持續收入',
            passive_effects: { licensing_income_mult: 1.5, compute_efficiency_bonus: 0.20, foundry_partnership: true }
        },
        data_exchange_subsidiary: {
            id: 'data_exchange_subsidiary', name: '數據交易商', icon: '📊',
            from_dept: 'data_exchange',
            description: '數據資產交易與合成數據平台',
            spectrum: { x: 0.6, y: -0.3 },
            base_operating_cost: 35, base_revenue: 55, revenue_mult: 2.8,
            resource_conversion: { data: { consume_rate: 0.25, cash_per_unit: 2.0 } },
            special_ability: '平台交易抽成收入',
            passive_effects: { data_monetization_mult: 1.4, platform_fee_rate: 0.08, data_network_effect: 0.15 }
        },
        enterprise_consulting_subsidiary: {
            id: 'enterprise_consulting_subsidiary', name: '企業顧問', icon: '💼',
            from_dept: 'enterprise_consulting',
            description: 'AI導入與數位轉型顧問服務公司',
            spectrum: { x: 0.4, y: -0.5 },
            base_operating_cost: 30, base_revenue: 50, revenue_mult: 2.8,
            resource_conversion: { talent_hours: { consume_rate: 0.10, cash_per_unit: 3.0 } },
            special_ability: '長期顧問合約',
            passive_effects: { consulting_premium: 0.30, trust_bonus: 10, enterprise_pipeline: true }
        },
        quant_trading_subsidiary: {
            id: 'quant_trading_subsidiary', name: '量化投資', icon: '📈',
            from_dept: 'quant_trading',
            description: 'AI驅動的量化交易與資產管理公司',
            spectrum: { x: 0.9, y: -0.2 },
            base_operating_cost: 60, base_revenue: 100, revenue_mult: 2.9,
            resource_conversion: { compute: { consume_rate: 0.15, cash_per_unit: 2.5 }, data: { consume_rate: 0.10, cash_per_unit: 1.5 } },
            special_ability: '績效費分潤',
            passive_effects: { investment_returns: true, revenue_volatility: 0.4, alpha_generation: 0.25 }
        },
        community_platform_subsidiary: {
            id: 'community_platform_subsidiary', name: '社群平台', icon: '👥',
            from_dept: 'community_platform',
            description: 'AI開發者與用戶社群生態平台',
            spectrum: { x: 0.2, y: -0.8 },
            base_operating_cost: 25, base_revenue: 40, revenue_mult: 2.7,
            resource_conversion: { content: { consume_rate: 0.20, reputation_per_unit: 0.5 } },
            special_ability: '網絡效應指數成長',
            passive_effects: { talent_attraction_mult: 1.3, community_growth_rate: 0.10, developer_ecosystem: true }
        },
        research_institute_subsidiary: {
            id: 'research_institute_subsidiary', name: '研究智庫', icon: '🔬',
            from_dept: 'research_institute',
            description: '獨立AI研究機構與政策智庫',
            spectrum: { x: -0.8, y: 0.2 },
            base_operating_cost: 55, base_revenue: 45, revenue_mult: 2.5,
            resource_conversion: { research_output: { consume_rate: 0.20, reputation_per_unit: 2.0 } },
            special_ability: '學術聲望與政策影響力',
            passive_effects: { reputation_mult: 1.5, breakthrough_chance: 0.08, policy_influence: true, talent_quality_bonus: 0.15 }
        }
    },
    
    // ==========================================
    // 衝突懲罰規則
    // ==========================================
    CONFLICT_PENALTIES: {
        'compute.architecture+compute.specialization': { description: '通用架構與專用晶片策略衝突', penalty: { compute_efficiency: 0.85 } },
        'data.synthesis+data.privacy': { description: '合成數據與隱私計算理念衝突', penalty: { trust_penalty: 5 } },
        'data.marketplace+data.privacy': { description: '數據交易與隱私保護策略衝突', penalty: { compliance_risk: 10 } },
        'space.automation+compute.specialization': { description: '自動化運維消耗算力，與專用晶片出租限制疊加', penalty: { rental_capacity_mult: 0.8 } },
        'talent.productivity+data.privacy': { description: '高度自動化與隱私計算的人力密集需求衝突', penalty: { hr_cost_mult: 1.1 } }
    },

    // ==========================================
    // 企業光譜設定
    // ==========================================
    COMPANY_SPECTRUM: {
        x_axis: { name: '經營理念', negative: { label: '科研理想派', icon: '🔬' }, positive: { label: '金融資本派', icon: '💰' } },
        y_axis: { name: '業務形態', negative: { label: '平台生態派', icon: '🌐' }, positive: { label: '硬體實業派', icon: '🏭' } },
        quadrants: {
            'research_hardware': { name: '硬科技先鋒', description: '專注突破性硬體研發', example: '如早期Intel、台積電研發部' },
            'research_platform': { name: '開源生態領袖', description: '建構開放技術社群', example: '如Linux基金會、OpenAI早期' },
            'capital_hardware': { name: '基礎設施巨頭', description: '規模化硬體服務商', example: '如AWS、Equinix' },
            'capital_platform': { name: '數據資本家', description: '數據與流量變現專家', example: '如Google、Meta' }
        }
    }
};

// ==========================================
// 輔助函數
// ==========================================

AssetCardConfig.getUpgrades = function(assetType) {
    const key = `${assetType.toUpperCase()}_UPGRADES`;
    return this[key] || null;
};

AssetCardConfig.getUpgradePath = function(assetType, pathId) {
    const upgrades = this.getUpgrades(assetType);
    return upgrades ? upgrades[pathId] : null;
};

AssetCardConfig.getUpgradeCost = function(assetType, pathId, currentLevel) {
    const path = this.getUpgradePath(assetType, pathId);
    if (!path || !path.levels) return null;
    const nextLevel = path.levels.find(l => l.level === currentLevel + 1);
    return nextLevel ? nextLevel.upgrade_cost : null;
};

AssetCardConfig.getUpgradeEffects = function(assetType, pathId, level) {
    const path = this.getUpgradePath(assetType, pathId);
    if (!path || !path.levels) return null;
    const levelConfig = path.levels.find(l => l.level === level);
    return levelConfig ? { benefits: levelConfig.benefits, costs: levelConfig.costs } : null;
};

AssetCardConfig.checkConflicts = function(playerUpgrades, assetType, pathId) {
    const path = this.getUpgradePath(assetType, pathId);
    if (!path || !path.conflicts_with) return [];
    const activeConflicts = [];
    for (const conflict of path.conflicts_with) {
        const [conflictType, conflictPath] = conflict.split('.');
        const conflictLevel = playerUpgrades?.[conflictType]?.[conflictPath] || 0;
        if (conflictLevel >= 2) {
            activeConflicts.push({ type: conflictType, path: conflictPath, level: conflictLevel });
        }
    }
    return activeConflicts;
};

AssetCardConfig.calculateConflictPenalties = function(playerUpgrades) {
    const penalties = {};
    for (const [key, config] of Object.entries(this.CONFLICT_PENALTIES)) {
        const [upgrade1, upgrade2] = key.split('+');
        const [type1, path1] = upgrade1.split('.');
        const [type2, path2] = upgrade2.split('.');
        const level1 = playerUpgrades?.[type1]?.[path1] || 0;
        const level2 = playerUpgrades?.[type2]?.[path2] || 0;
        if (level1 >= 2 && level2 >= 2) {
            Object.assign(penalties, config.penalty);
        }
    }
    return penalties;
};

// 檢查部門解鎖條件（多技術組合）
AssetCardConfig.checkDeptUnlockCondition = function(playerUpgrades, deptId) {
    const dept = this.FUNCTIONAL_DEPTS[deptId];
    if (!dept || !dept.required_techs) return { canUnlock: false, reason: '部門不存在' };
    
    const missingTechs = [];
    for (const req of dept.required_techs) {
        const currentLevel = playerUpgrades?.[req.type]?.[req.path] || 0;
        if (currentLevel < req.level) {
            missingTechs.push({ type: req.type, path: req.path, required: req.level, current: currentLevel });
        }
    }
    
    if (missingTechs.length > 0) {
        return { canUnlock: false, reason: '技術條件未滿足', missingTechs };
    }
    return { canUnlock: true };
};

// 獲取可解鎖的部門
AssetCardConfig.getUnlockableFunctionalDepts = function(playerUpgrades) {
    const unlockable = [];
    for (const deptId of Object.keys(this.FUNCTIONAL_DEPTS)) {
        const check = this.checkDeptUnlockCondition(playerUpgrades, deptId);
        if (check.canUnlock) unlockable.push(deptId);
    }
    return unlockable;
};

AssetCardConfig.getUnlockableDepartments = function(playerUpgrades) {
    return this.getUnlockableFunctionalDepts(playerUpgrades);
};

AssetCardConfig.getFunctionalDept = function(deptId) {
    return this.FUNCTIONAL_DEPTS[deptId] || null;
};

AssetCardConfig.getFunctionalSubsidiary = function(subId) {
    return this.FUNCTIONAL_SUBSIDIARIES[subId] || null;
};

AssetCardConfig.getSubsidiaryForDept = function(deptId) {
    const dept = this.FUNCTIONAL_DEPTS[deptId];
    if (!dept || !dept.evolves_to) return null;
    return this.FUNCTIONAL_SUBSIDIARIES[dept.evolves_to] || null;
};

AssetCardConfig.checkGeneralistPenalty = function(playerUpgrades) {
    let lv2Count = 0;
    const allUpgradeTypes = ['SPACE', 'POWER', 'COMPUTE', 'TALENT', 'DATA'];
    for (const type of allUpgradeTypes) {
        const upgrades = this[`${type}_UPGRADES`];
        if (!upgrades) continue;
        for (const pathId of Object.keys(upgrades)) {
            const level = playerUpgrades?.[type.toLowerCase()]?.[pathId] || 0;
            if (level >= 2) lv2Count++;
        }
    }
    if (lv2Count >= this.SYSTEM.generalist_penalty.threshold) {
        return { active: true, count: lv2Count, penalty: this.SYSTEM.generalist_penalty };
    }
    return { active: false, count: lv2Count };
};

// 計算企業光譜位置（基於子公司分布）
AssetCardConfig.calculateCompanySpectrum = function(activeSubsidiaries) {
    if (!activeSubsidiaries || activeSubsidiaries.length === 0) {
        return { x: 0, y: 0, quadrant: null };
    }
    
    let totalX = 0, totalY = 0;
    for (const subId of activeSubsidiaries) {
        const sub = this.FUNCTIONAL_SUBSIDIARIES[subId];
        if (sub && sub.spectrum) {
            totalX += sub.spectrum.x;
            totalY += sub.spectrum.y;
        }
    }
    
    const avgX = totalX / activeSubsidiaries.length;
    const avgY = totalY / activeSubsidiaries.length;
    
    let quadrant;
    if (avgX < 0 && avgY > 0) quadrant = 'research_hardware';
    else if (avgX < 0 && avgY <= 0) quadrant = 'research_platform';
    else if (avgX >= 0 && avgY > 0) quadrant = 'capital_hardware';
    else quadrant = 'capital_platform';
    
    return { x: avgX, y: avgY, quadrant, quadrantInfo: this.COMPANY_SPECTRUM.quadrants[quadrant] };
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.AssetCardConfig = AssetCardConfig;
}

console.log('✓ Asset Card Config loaded (Multi-tech dept + Subsidiary spectrum)');