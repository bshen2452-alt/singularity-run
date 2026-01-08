// ============================================
// 區域系統配置 (Region Config)
// ============================================
// 設計原則：
//   1. 純數據配置，無邏輯混雜
//   2. 定義 Tier4 階段的七大區域特性
//   3. 定義區域准入評分權重與親和度
// ============================================

const RegionConfig = {
    
    // ==========================================
    // 系統設定
    // ==========================================
    SYSTEM: {
        unlock_tier: 4,
        home_region: 'north_america',          // 玩家母國
        max_offices_per_region: 3,             // 每區最多辦公室數
        office_setup_turns: 1,                 // 辦公室建立所需回合
        base_approval_turns: 2,                // 基礎審批回合
        fast_track_threshold: 1.5,             // 分數超過門檻此倍數可快速通道
        extended_review_threshold: 0.8,        // 分數低於門檻此倍數需延長審查
        max_concurrent_applications: 2         // 同時最多進行中的申請數
    },
    
    // ==========================================
    // 評分維度定義
    // ==========================================
    SCORING_DIMENSIONS: {
        finance: {
            id: 'finance',
            name: '財務實力',
            icon: '💰',
            description: '企業資本規模與信用評級',
            source: ['cash', 'credit_rating'],
            weight_range: { min: 0.05, max: 0.35 }
        },
        tech: {
            id: 'tech',
            name: '技術聲望',
            icon: '🔬',
            description: '研發能力與技術里程碑',
            source: ['mp', 'milestones', 'tech_level'],
            weight_range: { min: 0.10, max: 0.30 }
        },
        market: {
            id: 'market',
            name: '市場影響力',
            icon: '📣',
            description: '用戶基礎與社群聲量',
            source: ['subscribers', 'community', 'hype'],
            weight_range: { min: 0.10, max: 0.30 }
        },
        scale: {
            id: 'scale',
            name: '營運規模',
            icon: '🏢',
            description: '組織成熟度與業務範圍',
            source: ['departments', 'subsidiaries', 'product_lines'],
            weight_range: { min: 0.05, max: 0.20 }
        },
        safety: {
            id: 'safety',
            name: '安全合規',
            icon: '🛡️',
            description: '負責任AI形象與合規紀錄',
            source: ['safety_index', 'alignment_progress', 'trust'],
            weight_range: { min: 0.05, max: 0.35 }
        },
        local: {
            id: 'local',
            name: '在地連結',
            icon: '🤝',
            description: '區域內已有據點與合作關係',
            source: ['regional_offices', 'local_partners', 'regional_presence'],
            weight_range: { min: 0.05, max: 0.30 }
        }
    },
    
    // ==========================================
    // 七大區域定義
    // ==========================================
    REGIONS: {
        north_america: {
            id: 'north_america',
            name: '北美',
            icon: '🇺🇸',
            description: '玩家母國，科技生態完整',
            is_home: true,
            
            // 不需要評分（母國）
            scoring_weights: null,
            base_threshold: 0,
            approval_turns: 0,
            
            // 區域特性
            characteristics: {
                energy_cost_mult: 1.2,          // 能源競爭激烈
                compute_cost_mult: 1.0,
                talent_cost_mult: 1.3,          // 人才成本高
                market_size: 'large',
                regulatory_intensity: 'medium',
                infrastructure_quality: 'excellent'
            },
            
            // 優勢與劣勢
            advantages: [
                { type: 'tech_ecosystem', value: 1.2, description: '科技生態加成 +20%' },
                { type: 'talent_pool', value: 1.15, description: '人才招募效率 +15%' },
                { type: 'funding_access', value: 1.25, description: '融資機會 +25%' }
            ],
            disadvantages: [
                { type: 'energy_competition', value: 1.2, description: '能源成本 +20%' },
                { type: 'talent_war', value: 1.3, description: '人力成本 +30%' }
            ],
            
            // 特殊機制
            special: {
                type: 'global_epicenter',
                description: '全球指數波動的震央，事件影響首先在此體現'
            }
        },
        
        europe: {
            id: 'europe',
            name: '歐洲',
            icon: '🇪🇺',
            description: '監管嚴格但人才素質高',
            is_home: false,
            
            // 評分權重
            scoring_weights: {
                finance: 0.10,
                tech: 0.15,
                market: 0.10,
                scale: 0.10,
                safety: 0.35,      // 極重視安全合規
                local: 0.20
            },
            base_threshold: 60,
            approval_turns: 4,     // 官僚程序繁瑣
            
            characteristics: {
                energy_cost_mult: 1.15,
                compute_cost_mult: 1.1,
                talent_cost_mult: 1.2,
                market_size: 'large',
                regulatory_intensity: 'very_high',
                infrastructure_quality: 'excellent'
            },
            
            advantages: [
                { type: 'talent_quality', value: 1.2, description: '人才素質 +20%' },
                { type: 'market_stability', value: 1.15, description: '市場穩定度 +15%' },
                { type: 'trust_bonus', value: 1.1, description: '信任度增長 +10%' }
            ],
            disadvantages: [
                { type: 'regulatory_cost', value: 1.4, description: '合規成本 +40%' },
                { type: 'approval_delay', value: 1.5, description: '審批時間 +50%' },
                { type: 'gdpr_events', value: 1.3, description: 'GDPR類事件機率 +30%' }
            ],
            
            special: {
                type: 'gdpr_zone',
                description: 'GDPR 合規要求，隱私技術部門可獲得額外加成'
            }
        },
        
        east_asia: {
            id: 'east_asia',
            name: '東亞',
            icon: '🇯🇵',
            description: '供應鏈優勢與製造生態',
            is_home: false,
            
            scoring_weights: {
                finance: 0.15,
                tech: 0.25,       // 看重技術實力
                market: 0.15,
                scale: 0.20,     // 看重商業規模
                safety: 0.10,
                local: 0.15
            },
            base_threshold: 55,
            approval_turns: 2,    // 效率導向
            
            characteristics: {
                energy_cost_mult: 1.1,
                compute_cost_mult: 0.85,      // 供應鏈優勢
                talent_cost_mult: 1.0,
                market_size: 'very_large',
                regulatory_intensity: 'medium',
                infrastructure_quality: 'excellent'
            },
            
            advantages: [
                { type: 'supply_chain', value: 0.85, description: '硬體成本 -15%' },
                { type: 'manufacturing', value: 1.2, description: '製造效率 +20%' },
                { type: 'gpu_access', value: 1.15, description: 'GPU取得優先度 +15%' }
            ],
            disadvantages: [
                { type: 'geopolitical_risk', value: 1.3, description: '地緣政治風險 +30%' },
                { type: 'policy_uncertainty', value: 1.25, description: '政策不確定性 +25%' }
            ],
            
            special: {
                type: 'supply_chain_hub',
                description: '硬體設計部門與製造相關子公司可獲得供應鏈加成'
            }
        },
        
        middle_east: {
            id: 'middle_east',
            name: '中東',
            icon: '🇦🇪',
            description: '能源便宜且政府補貼積極',
            is_home: false,
            
            scoring_weights: {
                finance: 0.35,    // 極重視資本
                tech: 0.10,
                market: 0.10,
                scale: 0.20,
                safety: 0.05,    // 相對不重視
                local: 0.20
            },
            base_threshold: 65,
            approval_turns: 2,    // 資本說話
            
            characteristics: {
                energy_cost_mult: 0.5,         // 能源極便宜
                compute_cost_mult: 1.0,
                talent_cost_mult: 1.5,         // 需要外派人才
                market_size: 'medium',
                regulatory_intensity: 'low',
                infrastructure_quality: 'good'
            },
            
            advantages: [
                { type: 'energy_cost', value: 0.5, description: '能源成本 -50%' },
                { type: 'government_subsidy', value: 1.3, description: '政府補貼 +30%' },
                { type: 'tax_benefit', value: 0.8, description: '稅負 -20%' }
            ],
            disadvantages: [
                { type: 'talent_import', value: 1.5, description: '人才成本 +50%' },
                { type: 'cultural_adaptation', value: 1.2, description: '文化適應成本 +20%' }
            ],
            
            special: {
                type: 'energy_haven',
                description: '能源相關部門可享受大幅成本減免'
            }
        },
        
        australia: {
            id: 'australia',
            name: '澳洲',
            icon: '🇦🇺',
            description: '穩定低風險的成熟市場',
            is_home: false,
            
            scoring_weights: {
                finance: 0.15,
                tech: 0.15,
                market: 0.15,
                scale: 0.10,
                safety: 0.30,    // 重視安全
                local: 0.15
            },
            base_threshold: 50,
            approval_turns: 3,    // 穩健審慎
            
            characteristics: {
                energy_cost_mult: 1.0,
                compute_cost_mult: 1.1,
                talent_cost_mult: 1.15,
                market_size: 'small',
                regulatory_intensity: 'medium_high',
                infrastructure_quality: 'good'
            },
            
            advantages: [
                { type: 'stability', value: 1.3, description: '營運穩定度 +30%' },
                { type: 'no_extreme_events', value: 0.5, description: '極端事件機率 -50%' },
                { type: 'english_market', value: 1.1, description: '英語系市場接軌 +10%' }
            ],
            disadvantages: [
                { type: 'market_size', value: 0.7, description: '市場規模 -30%' },
                { type: 'distance_cost', value: 1.15, description: '物流距離成本 +15%' }
            ],
            
            special: {
                type: 'safe_haven',
                description: '全球危機時可作為避風港，營運不受極端事件影響'
            }
        },
        
        south_southeast_asia: {
            id: 'south_southeast_asia',
            name: '東南亞與南亞',
            icon: '🇸🇬',
            description: '成本低且市場成長快速',
            is_home: false,
            
            scoring_weights: {
                finance: 0.10,
                tech: 0.10,
                market: 0.25,    // 看重市場開發
                scale: 0.15,
                safety: 0.10,
                local: 0.30     // 重視在地經營
            },
            base_threshold: 45,
            approval_turns: 2,    // 發展優先
            
            characteristics: {
                energy_cost_mult: 0.85,
                compute_cost_mult: 1.05,
                talent_cost_mult: 0.6,         // 人力便宜
                market_size: 'very_large',
                regulatory_intensity: 'low',
                infrastructure_quality: 'developing'
            },
            
            advantages: [
                { type: 'labor_cost', value: 0.6, description: '人力成本 -40%' },
                { type: 'market_growth', value: 1.4, description: '市場成長率 +40%' },
                { type: 'user_acquisition', value: 1.3, description: '用戶獲取效率 +30%' }
            ],
            disadvantages: [
                { type: 'infrastructure_gap', value: 1.3, description: '基建不足成本 +30%' },
                { type: 'quality_control', value: 1.2, description: '品質控管成本 +20%' }
            ],
            
            special: {
                type: 'growth_engine',
                description: '用戶成長與數據標註業務可獲得額外加成'
            }
        },
        
        latam_africa: {
            id: 'latam_africa',
            name: '拉美與非洲',
            icon: '🇧🇷',
            description: '藍海市場與新興機會',
            is_home: false,
            
            scoring_weights: {
                finance: 0.10,
                tech: 0.10,
                market: 0.20,    // 看重市場承諾
                scale: 0.10,
                safety: 0.15,
                local: 0.35     // 極重視在地合作
            },
            base_threshold: 40,
            approval_turns: 3,    // 政策不穩定
            
            characteristics: {
                energy_cost_mult: 0.9,
                compute_cost_mult: 1.2,
                talent_cost_mult: 0.7,
                market_size: 'large',
                regulatory_intensity: 'variable',
                infrastructure_quality: 'basic'
            },
            
            advantages: [
                { type: 'blue_ocean', value: 1.5, description: '藍海市場加成 +50%' },
                { type: 'low_competition', value: 1.3, description: '競爭壓力 -30%' },
                { type: 'esg_opportunity', value: 1.4, description: 'ESG投資機會 +40%' }
            ],
            disadvantages: [
                { type: 'infrastructure_poor', value: 1.5, description: '基建成本 +50%' },
                { type: 'political_instability', value: 1.4, description: '政局不穩風險 +40%' },
                { type: 'currency_risk', value: 1.25, description: '匯率風險 +25%' }
            ],
            
            special: {
                type: 'frontier_market',
                description: '高風險高報酬，綠能與社會影響力專案可獲得額外機會'
            }
        }
    },
    
    // ==========================================
    // 技術路線親和度
    // ==========================================
    ROUTE_AFFINITY: {
        'Scaling Law': {
            europe: 0,
            east_asia: 10,
            middle_east: 5,
            australia: 0,
            south_southeast_asia: 0,
            latam_africa: 0
        },
        'Multimodal': {
            europe: 0,
            east_asia: 5,
            middle_east: 0,
            australia: 0,
            south_southeast_asia: 10,
            latam_africa: 5
        },
        'Efficiency': {
            europe: 10,
            east_asia: 5,
            middle_east: 0,
            australia: 5,
            south_southeast_asia: 0,
            latam_africa: 0
        },
        'Embodied': {
            europe: 0,
            east_asia: 5,
            middle_east: 0,
            australia: 0,
            south_southeast_asia: 5,
            latam_africa: 10
        },
        'OpenSource': {
            europe: 5,
            east_asia: 0,
            middle_east: -5,
            australia: 10,
            south_southeast_asia: 5,
            latam_africa: 5
        },
        'Military': {
            europe: -10,
            east_asia: 0,
            middle_east: 10,
            australia: -5,
            south_southeast_asia: 0,
            latam_africa: 5
        }
    },
    
    // ==========================================
    // 資產類型親和度（區分兩條路線）
    // ==========================================
    ASSET_AFFINITY: {
        // ========================================
        // 事業線親和度（Business Line）
        // 來源：產品 → 產品線 → 事業部 → 事業子公司
        // ========================================
        business: {
            // 事業部/事業子公司親和度（根據技術路線）
            routes: {
                "Scaling Law": {
                    north_america: 10,
                    east_asia: 8,
                    europe: 5
                },
                "Agent": {
                    europe: 10,
                    australia: 8,
                    north_america: 5
                },
                "World Model": {
                    east_asia: 12,
                    south_southeast_asia: 8
                },
                "Embodied": {
                    east_asia: 15,
                    south_southeast_asia: 10,
                    middle_east: 5
                },
                "BCI": {
                    europe: 12,
                    north_america: 10,
                    australia: 5
                },
                "Efficiency": {
                    south_southeast_asia: 15,
                    latam_africa: 12,
                    middle_east: 8
                },
                "Military": {
                    middle_east: 15,
                    north_america: 10,
                    east_asia: 5
                }
            }
        },
        
        // ========================================
        // 職能線親和度（Functional Line）
        // 來源：設施升級 → 職能部 → 職能子公司
        // ========================================
        functional: {
            // 職能部親和度
            depts: {
                datacenter_services: {
                    middle_east: 10,
                    east_asia: 5
                },
                infrastructure_consulting: {
                    europe: 5,
                    australia: 5
                },
                ai_operations: {
                    east_asia: 5,
                    south_southeast_asia: 5
                },
                energy_trading: {
                    middle_east: 15,
                    latam_africa: 5
                },
                smart_grid: {
                    europe: 10,
                    middle_east: 10
                },
                green_energy: {
                    latam_africa: 15,
                    europe: 10
                },
                compute_rental: {
                    east_asia: 10,
                    middle_east: 5
                },
                cloud_services: {
                    south_southeast_asia: 15,
                    east_asia: 5
                },
                hardware_design: {
                    east_asia: 15
                },
                enterprise_consulting: {
                    australia: 10,
                    europe: 10
                },
                synthetic_data: {
                    south_southeast_asia: 10,
                    latam_africa: 5
                },
                data_exchange: {
                    east_asia: 5,
                    south_southeast_asia: 5
                },
                privacy_tech: {
                    europe: 15,
                    australia: 5
                }
            },
            
            // 職能子公司親和度（通常比職能部高）
            subsidiaries: {
                datacenter_subsidiary: {
                    middle_east: 12,
                    east_asia: 8
                },
                infra_consulting_subsidiary: {
                    europe: 8,
                    australia: 8
                },
                aiops_subsidiary: {
                    east_asia: 10,
                    south_southeast_asia: 8
                },
                energy_subsidiary: {
                    middle_east: 20,
                    latam_africa: 10
                },
                grid_subsidiary: {
                    europe: 12,
                    middle_east: 12
                },
                green_subsidiary: {
                    latam_africa: 20,
                    europe: 12
                },
                compute_subsidiary: {
                    east_asia: 12,
                    middle_east: 8
                },
                cloud_subsidiary: {
                    south_southeast_asia: 18,
                    latam_africa: 10
                },
                hardware_subsidiary: {
                    east_asia: 20
                },
                consulting_subsidiary: {
                    australia: 12,
                    europe: 12
                },
                synth_subsidiary: {
                    south_southeast_asia: 12,
                    latam_africa: 8
                },
                exchange_subsidiary: {
                    south_southeast_asia: 10,
                    east_asia: 8
                },
                privacy_subsidiary: {
                    europe: 20,
                    australia: 8
                }
            }
        },
        
        // 向後兼容：保留舊結構別名
        departments: null,  // 已移至 functional.depts
        subsidiaries: null  // 已移至 functional.subsidiaries
    },
    
    // ==========================================
    // 全球指數對區域門檻的修正
    // ==========================================
    INDEX_THRESHOLD_MODIFIERS: {
        interest_rate: {
            // 利率高時，高財務權重區域門檻上升
            affected_regions: {
                middle_east: { weight: 'finance', factor: 0.1 },
                europe: { weight: 'finance', factor: 0.05 }
            }
        },
        energy_price: {
            // 能源貴時，中東更歡迎
            affected_regions: {
                middle_east: { direct: -0.1 },      // 門檻降低
                north_america: { direct: 0.05 },
                east_asia: { direct: 0.05 }
            }
        },
        gpu_price: {
            // GPU貴時，東亞供應鏈價值提升
            affected_regions: {
                east_asia: { weight: 'tech', factor: 0.05 }
            }
        },
        market_confidence: {
            // 信心低時，高安全要求區域更挑剔
            affected_regions: {
                europe: { weight: 'safety', factor: 0.15 },
                australia: { weight: 'safety', factor: 0.1 }
            }
        }
    },
    
    // ==========================================
    // 區域辦公室配置
    // ==========================================
    OFFICE_LEVELS: {
        liaison: {
            level: 1,
            name: '聯絡處',
            icon: '📍',
            setup_cost: 20,
            maintenance_cost: 5,
            local_bonus: 5,
            capabilities: ['scout', 'basic_intel']
        },
        branch: {
            level: 2,
            name: '分公司',
            icon: '🏢',
            setup_cost: 80,
            maintenance_cost: 15,
            local_bonus: 15,
            upgrade_from: 'liaison',
            upgrade_cost: 60,
            capabilities: ['scout', 'intel', 'negotiate', 'basic_operations']
        },
        regional_hq: {
            level: 3,
            name: '區域總部',
            icon: '🏛️',
            setup_cost: 200,
            maintenance_cost: 35,
            local_bonus: 30,
            upgrade_from: 'branch',
            upgrade_cost: 120,
            capabilities: ['scout', 'intel', 'negotiate', 'full_operations', 'coordinate']
        }
    }
};

// ==========================================
// 輔助函數
// ==========================================

/**
 * 取得區域配置
 */
RegionConfig.getRegion = function(regionId) {
    return this.REGIONS[regionId] || null;
};

/**
 * 取得所有非母國區域
 */
RegionConfig.getExpansionRegions = function() {
    return Object.values(this.REGIONS).filter(r => !r.is_home);
};

/**
 * 取得區域評分權重
 */
RegionConfig.getScoringWeights = function(regionId) {
    const region = this.getRegion(regionId);
    return region ? region.scoring_weights : null;
};

/**
 * 取得技術路線對區域的親和度
 */
RegionConfig.getRouteAffinity = function(routeId, regionId) {
    const routeAffinities = this.ROUTE_AFFINITY[routeId];
    return routeAffinities ? (routeAffinities[regionId] || 0) : 0;
};

/**
 * 取得事業線資產對區域的親和度（Business Line）
 * @param {string} routeId - 技術路線ID
 * @param {string} regionId - 區域ID
 * @returns {number} 親和度加成
 */
RegionConfig.getBusinessAffinity = function(routeId, regionId) {
    const routeAffinities = this.ASSET_AFFINITY.business?.routes?.[routeId];
    return routeAffinities ? (routeAffinities[regionId] || 0) : 0;
};

/**
 * 取得職能線資產對區域的親和度（Functional Line）
 * @param {string} assetType - 'depts' 或 'subsidiaries'
 * @param {string} assetId - 資產ID
 * @param {string} regionId - 區域ID
 * @returns {number} 親和度加成
 */
RegionConfig.getFunctionalAffinity = function(assetType, assetId, regionId) {
    const typeAffinities = this.ASSET_AFFINITY.functional?.[assetType];
    if (!typeAffinities) return 0;
    
    const assetAffinities = typeAffinities[assetId];
    return assetAffinities ? (assetAffinities[regionId] || 0) : 0;
};

/**
 * 取得資產對區域的親和度（向後兼容）
 * @deprecated 請改用 getBusinessAffinity 或 getFunctionalAffinity
 */
RegionConfig.getAssetAffinity = function(assetType, assetId, regionId) {
    // 向後兼容：嘗試從新結構取得
    if (assetType === 'departments') {
        return this.getFunctionalAffinity('depts', assetId, regionId);
    }
    if (assetType === 'subsidiaries') {
        return this.getFunctionalAffinity('subsidiaries', assetId, regionId);
    }
    
    // 舊結構已移除，返回0
    return 0;
};

/**
 * 取得評分維度
 */
RegionConfig.getDimension = function(dimensionId) {
    return this.SCORING_DIMENSIONS[dimensionId] || null;
};

/**
 * 取得所有評分維度ID
 */
RegionConfig.getAllDimensionIds = function() {
    return Object.keys(this.SCORING_DIMENSIONS);
};

/**
 * 取得辦公室等級配置
 */
RegionConfig.getOfficeLevel = function(levelId) {
    return this.OFFICE_LEVELS[levelId] || null;
};

/**
 * 取得區域特殊機制
 */
RegionConfig.getRegionSpecial = function(regionId) {
    const region = this.getRegion(regionId);
    return region ? region.special : null;
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.RegionConfig = RegionConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegionConfig;
}

console.log('✓ Region Config loaded (Business + Functional affinity)');