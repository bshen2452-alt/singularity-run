// ============================================
// 奇點競速 - 算力系統配置 (Compute Config)
// ============================================
// 純數據配置，無邏輯混雜

const ComputeConfig = {
    
    // ==========================================
    // 算力分配優先級
    // ==========================================
    // 推論優先（維持服務）> 商品開發 > 研發MP
    ALLOCATION_PRIORITY: ['inference', 'product_dev', 'training'],
    
    // ==========================================
    // 研發MP算力需求
    // ==========================================
    // talent_demand = (turing * turing_weight + senior * senior_weight) * (mp / mp_base) * base_multiplier
    TRAINING_DEMAND: {
        turing_weight: 1.0,
        senior_weight: 0.5,
        mp_base: 100,
        base_multiplier: 2.0,
        efficiency_reduction: 0.5
    },
    
    // ==========================================
    // 推論服務算力需求（新設計）
    // ==========================================
    // inference_demand = community_size * base_per_user * operating_products * mp_scaling * mastery_reduction
    INFERENCE_DEMAND: {
        base_per_user: 0.00001,       // 每用戶基礎算力消耗
        product_multiplier: 0.2,     // 每個營運商品增加的倍率
        mp_scaling_base: 50,         // MP縮放基準
        mp_scaling_power: 1.5,       // MP縮放指數（MP越高，每用戶消耗越多）
        min_demand_with_product: 0.5,// 有1個營運商品時的最低推論需求
        min_demand_per_product: 0.3, // 每多一個營運商品增加的最低需求
        efficiency_reduction: 0.05,  // Efficiency每級減免5%
        mastery_reduction: 0.05      // Mastery每級減免5%推論需求
    },
    
    // ==========================================
    // 推論不足的懲罰
    // ==========================================
    INFERENCE_SHORTAGE: {
        // 服務品質 = fulfillment^quality_power
        quality_power: 0.7,
        // 社群流失率 = (1 - fulfillment) * churn_rate
        churn_rate: 0.1,
        // 收益折扣 = fulfillment^revenue_power  
        revenue_power: 0.8,
        // 信任損失
        trust_loss_threshold: 0.7,   // 低於70%滿足率開始損失信任
        trust_loss_per_turn: 2,
        // 嚴重不足門檻
        critical_threshold: 0.3,
        critical_churn_rate: 0.25,
        critical_trust_loss: 5
    },
    
    // ==========================================
    // 算力不足懲罰（研發與商品開發）
    // ==========================================
    COMPUTE_SHORTAGE_PENALTIES: {
        training: {
            mp_growth_halt: true,
            loyalty_loss_per_turn: 5,
            message: "⚠️ 研發算力不足！員工無法進行模型訓練，MP成長停滯。"
        },
        product_dev: {
            progress_halt: true,
            quality_penalty: 0.1,
            message: "⚠️ 開發算力不足！商品開發進度停滯。"
        },
        inference: {
            message: "⚠️ 推論算力不足！服務品質下降，社群開始流失。"
        }
    },
    
    // ==========================================
    // 算力策略
    // ==========================================
    STRATEGY_ALLOCATION: {
        "ResearchFocus": {
            inference_priority: 0.5,   // 推論只給50%（犧牲服務品質）
            training_priority: 0.35,
            product_priority: 0.15,
            description: "最大化研發算力，犧牲服務品質與商品開發"
        },
        "ProductFocus": {
            inference_priority: 0.8,   // 推論給80%（維持服務）
            training_priority: 0.05,
            product_priority: 0.15,
            description: "優先保障服務品質，大幅降低研發速度"
        },
        "Balanced": {
            inference_priority: 0.6,
            training_priority: 0.25,
            product_priority: 0.15,
            description: "均衡分配算力資源"
        },
        "CloudBursting": {
            inference_priority: 1.0,   // 推論需求全滿足
            training_priority: 0.3,
            product_priority: 0.2,
            cloud_auto_rent: true,
            cloud_cost_multiplier: 1.5,
            description: "自動租用雲端滿足推論需求，成本較高"
        }
    },
    
    // ==========================================
    // 商品開發速度
    // ==========================================
    PRODUCT_DEV_SPEED: {
        base_speed: 1.0,
        scaling_power: 0.8,
        min_speed: 0.0,
        max_speed: 1.5,
        min_pflops_ratio: 0.1
    },
    
    // ==========================================
    // 商品算力需求（開發中）
    // ==========================================
    PRODUCT_DEV_PFLOPS: {
        tier1: 2,
        tier2: 5,
        tier3: 10,
        tier4: 20
    },
    
    // ==========================================
    // 營運中商品的推論負載加成
    // ==========================================
    PRODUCT_INFERENCE_LOAD: {
        tier1: 1.0,   // Tier 1 商品的推論負載係數
        tier2: 1.5,
        tier3: 2.5,
        tier4: 4.0
    },
    
    // ==========================================
    // 算力使用率區間效果
    // ==========================================
    // 使用率 = 總需求 / 可用算力
    UTILIZATION_EFFECTS: {
        // === 閒置過多 (<30%) ===
        idle: {
            threshold: 0.30,
            effects: {
                hype_loss_per_turn: 2,        // 每季炒作度下降
                market_cap_penalty: 0.05,     // 市值下降5%（股東不滿）
                message: "📉 算力閒置過多！股東對資源配置效率不滿，股價承壓。"
            },
            // 連續閒置的額外懲罰
            consecutive_penalty: {
                turns_threshold: 2,           // 連續2季以上
                extra_hype_loss: 3,           // 額外炒作度損失
                investor_confidence_loss: 5,  // 投資者信心損失（影響融資）
                message: "⚠️ 長期算力閒置！投資者開始質疑公司戰略。"
            }
        },
        
        // === 正常範圍 (30%-90%) ===
        normal: {
            min_threshold: 0.30,
            max_threshold: 0.90,
            effects: {
                // 無負面效果
            },
            // 最佳使用率區間有正面效果
            optimal: {
                min: 0.60,
                max: 0.80,
                loyalty_bonus: 2,             // 忠誠度提升（員工感到充實）
                efficiency_bonus: 0.05        // 效率微幅提升
            }
        },
        
        // === 過載 (>90%) ===
        overload: {
            threshold: 0.90,
            effects: {
                negative_event_chance_bonus: 0.10,  // 負面事件機率+10%
                entropy_add: 1,                     // 每季熵值增加
                reliability_penalty: 0.05,          // 系統可靠性下降
                message: "⚠️ 算力接近滿載！系統故障風險增加。"
            },
            // 嚴重過載 (>100%)
            critical: {
                threshold: 1.0,
                negative_event_chance_bonus: 0.25,  // 負面事件機率+25%
                entropy_add: 3,
                loyalty_loss: 3,                    // 員工過勞導致忠誠度下降
                system_failure_chance: 0.05,        // 5% 系統故障機率
                message: "🔥 算力嚴重超載！系統不穩定，員工過勞！"
            }
        }
    }
};

// 導出到全局
window.ComputeConfig = ComputeConfig;

console.log('✓ Compute Config loaded');

// 導出到全局
window.ComputeConfig = ComputeConfig;

console.log('✓ Compute Config loaded');