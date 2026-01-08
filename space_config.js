// ============================================
// 空間系統配置 (Space Config)
// ============================================
// Tier2 解鎖後啟用，管理設施容量、電力需求、營運人力
// 純數據配置，無邏輯混雜

const SpaceConfig = {
    
    // ==========================================
    // 容量單位換算
    // ==========================================
    // 統一為 Unit，玩家只需關注總量
    CAPACITY_UNITS: {
        pflops_per_unit: 1,        // 1 PFlops = 1 Unit
        data_per_unit: 100,        // 100 TB 數據 = 1 Unit
        employees_per_unit: 10     // 10 名員工 = 1 Unit
    },
    
    // ==========================================
    // Tier2 起始空間
    // ==========================================
    TIER2_INITIAL_SPACE: {
        type: 'standard_campus',   // 標準園區
        capacity: 60,              // 60 Units 固定值
        power_contract: 'grid_default',  // 使用市電
        construction_complete: true,     // 已建成
        name: '總部園區'
    },
    
    // ==========================================
    // 四種空間營運策略（平等關係）
    // ==========================================
    SPACE_TYPES: {
        // 邊緣節點 - 分散式輕量部署
        edge_node: {
            id: 'edge_node',
            name: '邊緣節點',
            icon: '📡',
            description: '分散式輕量部署，適合邊緣運算與低延遲服務',
            
            // === 建造參數 ===
            base_cost: 50,              // $50M 基礎成本
            construction_turns: 2,      // 2 季工期
            capacity_range: [20, 40],   // 容量範圍
            default_capacity: 30,       // 預設容量
            
            // === 營運參數 ===
            junior_per_10_capacity: 1.5,  // 每10容量需1.5 Junior（分散管理成本高）
            power_efficiency: 0.9,        // 電力效率（需要較多電力）
            maintenance_cost_ratio: 0.02, // 維護成本 = 建造成本 × 2% / 季
            
            // === 特性效果 ===
            effects: {
                entropy_add: 3,           // 分散式增加熵值
                regulation_reduction: 5,  // 降低監管壓力（分散難追蹤）
                latency_bonus: true       // 低延遲優勢（未來功能）
            },
            
            // === 擴建選項 ===
            expandable: false,            // 不可擴建，需建新節點
            
            // === 電力需求 ===
            min_power_tier: 'market',     // 市電即可滿足
            
            unlock_tier: 2
        },
        
        // 標準園區 - 通用均衡方案
        standard_campus: {
            id: 'standard_campus',
            name: '標準園區',
            icon: '🏢',
            description: '通用均衡方案，可依需求逐步擴建',
            
            // === 建造參數 ===
            base_cost: 200,             // $200M 基礎成本
            construction_turns: 4,      // 4 季工期
            capacity_range: [80, 150],  // 容量範圍
            default_capacity: 100,      // 預設容量
            
            // === 營運參數 ===
            junior_per_10_capacity: 1.0,  // 每10容量需1 Junior（標準）
            power_efficiency: 1.0,        // 標準電力效率
            maintenance_cost_ratio: 0.015,// 維護成本 1.5% / 季
            
            // === 特性效果 ===
            effects: {
                data_storage_bonus: 0.1   // 數據儲存效率+10%
            },
            
            // === 擴建選項 ===
            expandable: true,
            expansion: {
                cost: 80,                 // $80M 擴建成本
                capacity_add: 40,         // +40 容量
                construction_turns: 2,    // 2 季擴建工期
                max_expansions: 3         // 最多擴建3次
            },
            
            // === 電力需求 ===
            min_power_tier: 'market',     // 市電可用，但建議合約
            recommended_power: 'contract',// 建議簽訂電力合約
            
            unlock_tier: 2
        },
        
        // 超算集群 - 集中式規模化
        hyperscale_cluster: {
            id: 'hyperscale_cluster',
            name: '超算集群',
            icon: '🏭',
            description: '集中式規模化部署，適合大規模訓練與推論',
            
            // === 建造參數 ===
            base_cost: 800,             // $800M 基礎成本
            construction_turns: 8,      // 8 季工期
            capacity_range: [300, 500], // 容量範圍
            default_capacity: 400,      // 預設容量
            
            // === 營運參數 ===
            junior_per_10_capacity: 0.6,  // 每10容量需0.6 Junior（規模效益）
            power_efficiency: 1.2,        // 電力效率高（規模優勢）
            maintenance_cost_ratio: 0.01, // 維護成本 1% / 季
            
            // === 特性效果 ===
            effects: {
                hype_add: 10,             // 提升炒作度（企業形象）
                regulation_add: 8,        // 增加監管壓力（顯眼目標）
                loyalty_add: 5,           // 員工忠誠度提升（自豪感）
                compute_efficiency: 0.15  // 算力效率+15%
            },
            
            // === 擴建選項 ===
            expandable: true,
            expansion: {
                cost: 300,                // $300M 擴建成本
                capacity_add: 150,        // +150 容量
                construction_turns: 4,    // 4 季擴建工期
                max_expansions: 2         // 最多擴建2次
            },
            
            // === 電力需求 ===
            min_power_tier: 'contract',   // 必須簽訂電力合約
            recommended_power: 'nuclear_contract', // 建議核電長約
            self_power_option: true,      // 可選擇自營能源（Tier3）
            
            unlock_tier: 2
        },
        
        // 託管服務 - 第三方託管
        colocation: {
            id: 'colocation',
            name: '託管服務',
            icon: '☁️',
            description: '第三方託管，彈性付費，無需自建設施',
            
            // === 租賃參數（非建造）===
            base_cost: 0,               // 無建造成本
            construction_turns: 0,      // 即時可用
            capacity_range: [10, 200],  // 彈性容量
            default_capacity: 50,       // 預設租賃量
            
            // === 營運參數 ===
            junior_per_10_capacity: 0.3,  // 每10容量需0.3 Junior（外包管理）
            power_efficiency: 1.0,        // 電力含在租金內
            
            // === 租金計算 ===
            rental: {
                base_rate_per_unit: 0.5,  // $0.5M / Unit / 季 基礎租金
                hype_sensitivity: 0.3,    // 受市場炒作值影響 30%
                energy_sensitivity: 0.2,  // 受能源價格影響 20%
                min_contract_turns: 0,    // 無最短租期
                cancellation_fee: 0       // 無解約金
            },
            
            // === 特性效果 ===
            effects: {
                // 無額外效果，純彈性
            },
            
            // === 電力需求 ===
            power_included: true,         // 電力含在租金內
            
            unlock_tier: 2
        }
    },
    
    // ==========================================
    // 空間不足的影響
    // ==========================================
    CAPACITY_SHORTAGE: {
        // 輕微不足 (80-100% 使用率)
        warning_threshold: 0.8,
        warning_effects: {
            message: '⚠️ 設施容量接近上限，建議擴建或租賃空間',
            purchase_warning: true        // 購買資產時顯示警告
        },
        
        // 嚴重不足 (>100% 使用率)
        critical_threshold: 1.0,
        critical_effects: {
            message: '🚨 設施容量不足！無法購買新資產',
            block_purchase: true,         // 禁止購買新資產
            efficiency_penalty: 0.2,      // 營運效率-20%
            entropy_per_turn: 2,          // 每季增加熵值
            employee_overflow_penalty: true // 員工無處辦公，忠誠度下降
        },
        
        // 極度超載 (>120% 使用率) - 租賃空間可暫時超載
        overload_threshold: 1.2,
        overload_effects: {
            message: '💥 設施嚴重超載！營運陷入混亂',
            efficiency_penalty: 0.4,
            entropy_per_turn: 5,
            loyalty_loss_per_turn: 3,
            compliance_risk_add: 5
        }
    },
    
    // ==========================================
    // 營運人力不足的影響
    // ==========================================
    WORKFORCE_SHORTAGE: {
        // 輕微不足 (70-100% 人力配置)
        warning_threshold: 0.7,
        warning_effects: {
            message: '⚠️ 營運人力不足，部分設施效率下降',
            efficiency_penalty: 0.1
        },
        
        // 嚴重不足 (<70% 人力配置)
        critical_threshold: 0.5,
        critical_effects: {
            message: '🚨 營運人力嚴重不足！設施無法正常運作',
            efficiency_penalty: 0.3,
            facility_malfunction_chance: 0.1,  // 10% 設施故障機率
            data_quality_penalty: 0.15         // 數據品質下降
        },
        
        // 極度缺人 (<30% 人力配置)
        emergency_threshold: 0.3,
        emergency_effects: {
            message: '💥 營運人力極度短缺！設施瀕臨停擺',
            efficiency_penalty: 0.5,
            facility_malfunction_chance: 0.25,
            forced_capacity_reduction: 0.3     // 強制減少30%可用容量
        }
    },
    
    // ==========================================
    // 建設中空間狀態
    // ==========================================
    CONSTRUCTION_STATUS: {
        planning: {
            name: '規劃中',
            icon: '📋',
            cancellable: true,
            refund_ratio: 0.8           // 取消可退80%
        },
        constructing: {
            name: '建設中',
            icon: '🏗️',
            cancellable: true,
            refund_ratio: 0.5           // 取消可退50%
        },
        finishing: {
            name: '收尾中',
            icon: '🔧',
            cancellable: false          // 最後1季不可取消
        },
        completed: {
            name: '已完工',
            icon: '✅',
            cancellable: false
        }
    },
    
    // ==========================================
    // 風險儀表板顯示配置（Tier2+）
    // ==========================================
    RISK_DASHBOARD_INDICATORS: {
        facility_capacity: {
            id: 'facility_capacity',
            name: '設施負載',
            icon: '🏢',
            description: '已用容量 / 總容量',
            threshold_warning: 0.8,
            threshold_critical: 1.0,
            color_normal: 'var(--accent-green)',
            color_warning: 'var(--accent-yellow)',
            color_critical: 'var(--accent-red)'
        },
        power_stability: {
            id: 'power_stability',
            name: '供電穩定',
            icon: '⚡',
            description: '電力供應穩定性與成本效率',
            threshold_warning: 0.7,    // 穩定度低於70%警告
            threshold_critical: 0.5,
            color_normal: 'var(--accent-cyan)',
            color_warning: 'var(--accent-yellow)',
            color_critical: 'var(--accent-red)',
            invert_display: true       // 數值越高越好（與其他相反）
        },
        operations_staff: {
            id: 'operations_staff',
            name: '營運人力',
            icon: '👷',
            description: 'Junior員工 / 設施營運需求',
            threshold_warning: 0.7,
            threshold_critical: 0.5,
            color_normal: 'var(--accent-green)',
            color_warning: 'var(--accent-yellow)',
            color_critical: 'var(--accent-red)',
            invert_display: true       // 數值越高越好
        }
    }
};

// 導出到全局
window.SpaceConfig = SpaceConfig;

console.log('✓ Space Config loaded');

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpaceConfig;
}
