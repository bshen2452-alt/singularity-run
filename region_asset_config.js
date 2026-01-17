// ============================================
// 區域資產派駐配置 (Region Asset Config)
// ============================================
// 設計原則：
//   1. 純數據配置，無邏輯混雜
//   2. 定義派駐成本、效果、限制等
//   3. 與 RegionAssetEngine 配合使用
// ============================================

(function() {
    'use strict';

    const RegionAssetConfig = {
        
        // ==========================================
        // 系統設定
        // ==========================================
        SYSTEM: {
            unlock_tier: 4,                    // 解鎖所需 Tier
            max_assets_per_region: 5,          // 每區域最大派駐數
            transfer_cooldown_turns: 2,        // 轉移冷卻回合
            recall_cost_ratio: 0.5,            // 撤回成本比例
            deployment_approval_turns: 0       // 派駐審批回合（0 = 即時）
        },
        
        // ==========================================
        // 派駐成本定義
        // ==========================================
        DEPLOYMENT_COSTS: {
            // 事業部
            business_division: {
                cash: 30,
                description: '派駐事業部至海外區域'
            },
            // 事業子公司
            business_subsidiary: {
                cash: 50,
                description: '派駐事業子公司至海外區域'
            },
            // 職能部
            functional_dept: {
                cash: 20,
                description: '派駐職能部至海外區域'
            },
            // 職能子公司
            functional_subsidiary: {
                cash: 40,
                description: '派駐職能子公司至海外區域'
            }
        },
        
        // ==========================================
        // 派駐效果定義
        // ==========================================
        DEPLOYMENT_EFFECTS: {
            // 基礎效果：親和度轉換為在地分數
            affinity_to_local_score: 1.0,      // 1 親和度 = 1 在地分數
            
            // 收益效果
            revenue_share_overseas: 0.3,       // 海外營運收益佔比 30%
            affinity_revenue_multiplier: 0.01, // 每點親和度增加 1% 收益
            
            // 區域特殊效果（與 RegionConfig.REGIONS.special 對應）
            region_specials: {
                // 中東：能源優勢
                energy_haven: {
                    applicable_types: ['functional_dept', 'functional_subsidiary'],
                    applicable_ids: ['energy_tech', 'energy_tech_subsidiary'],
                    bonus: {
                        revenue_mult: 1.3,
                        energy_cost_reduction: 0.2
                    },
                    description: '能源相關單位在中東享受 30% 收益加成'
                },
                // 東亞：供應鏈優勢
                supply_chain_hub: {
                    applicable_types: ['functional_dept', 'functional_subsidiary'],
                    applicable_ids: ['hardware_design', 'hardware_design_subsidiary'],
                    bonus: {
                        revenue_mult: 1.25,
                        production_cost_reduction: 0.15
                    },
                    description: '硬體設計單位在東亞享受供應鏈加成'
                },
                // 歐洲：GDPR 區域
                gdpr_zone: {
                    applicable_types: ['functional_dept', 'functional_subsidiary'],
                    applicable_ids: ['data_exchange', 'data_exchange_subsidiary', 'research_institute', 'research_institute_subsidiary'],
                    bonus: {
                        trust_bonus: 10,
                        compliance_bonus: 0.15
                    },
                    description: '數據與研究單位在歐洲獲得信任度加成'
                },
                // 澳洲：穩定市場
                stable_market: {
                    applicable_types: ['business_division', 'business_subsidiary'],
                    applicable_ids: null,  // 所有事業單位
                    bonus: {
                        revenue_stability: 0.2,
                        risk_reduction: 0.1
                    },
                    description: '事業單位在澳洲享受穩定市場優勢'
                },
                // 南亞東南亞：成本優勢
                cost_arbitrage: {
                    applicable_types: ['functional_dept', 'functional_subsidiary'],
                    applicable_ids: ['compute_rental', 'compute_rental_subsidiary', 'enterprise_consulting', 'enterprise_consulting_subsidiary'],
                    bonus: {
                        operating_cost_reduction: 0.25,
                        talent_cost_reduction: 0.2
                    },
                    description: '算力與顧問單位在南亞東南亞享受成本優勢'
                },
                // 拉美非洲：新興市場
                emerging_potential: {
                    applicable_types: ['business_division', 'business_subsidiary'],
                    applicable_ids: null,
                    bonus: {
                        growth_potential: 0.3,
                        community_growth_bonus: 0.2
                    },
                    description: '事業單位在新興市場有更高成長潛力'
                }
            }
        },
        
        // ==========================================
        // 資產類型顯示配置
        // ==========================================
        ASSET_TYPE_DISPLAY: {
            business_division: {
                name: '事業部',
                icon: '🏢',
                color: '#00f5ff',
                description: '從產品線升級而來的事業部門'
            },
            business_subsidiary: {
                name: '事業子公司',
                icon: '🏛️',
                color: '#00ff88',
                description: '獨立運營的事業子公司'
            },
            functional_dept: {
                name: '職能部',
                icon: '🏭',
                color: '#ffd000',
                description: '從設施升級解鎖的職能部門'
            },
            functional_subsidiary: {
                name: '職能子公司',
                icon: '🏗️',
                color: '#ff00aa',
                description: '獨立運營的職能子公司'
            }
        },
        
        // ==========================================
        // 派駐狀態顯示配置
        // ==========================================
        DEPLOYMENT_STATUS_DISPLAY: {
            available: {
                name: '可派駐',
                icon: '✅',
                color: '#00ff88'
            },
            deployed: {
                name: '已派駐',
                icon: '🌍',
                color: '#00f5ff'
            },
            in_transit: {
                name: '轉移中',
                icon: '✈️',
                color: '#ffd000'
            },
            locked: {
                name: '鎖定',
                icon: '🔒',
                color: '#666688'
            }
        },
        
        // ==========================================
        // 親和度等級定義（供 UI 顯示）
        // ==========================================
        AFFINITY_LEVELS: {
            excellent: { min: 15, label: '極佳', color: '#00ff88', icon: '⭐⭐⭐' },
            good: { min: 10, label: '良好', color: '#00f5ff', icon: '⭐⭐' },
            moderate: { min: 5, label: '普通', color: '#ffd000', icon: '⭐' },
            low: { min: 1, label: '較低', color: '#ff9966', icon: '☆' },
            none: { min: 0, label: '無', color: '#666688', icon: '-' }
        },
        
        // ==========================================
        // 輔助函數
        // ==========================================
        
        /**
         * 獲取派駐成本配置
         * @param {string} assetType - 資產類型
         * @returns {Object|null} 成本配置
         */
        getDeploymentCost(assetType) {
            return this.DEPLOYMENT_COSTS[assetType] || null;
        },
        
        /**
         * 獲取資產類型顯示配置
         * @param {string} assetType - 資產類型
         * @returns {Object|null} 顯示配置
         */
        getAssetTypeDisplay(assetType) {
            return this.ASSET_TYPE_DISPLAY[assetType] || null;
        },
        
        /**
         * 獲取親和度等級
         * @param {number} affinity - 親和度分數
         * @returns {Object} 等級配置
         */
        getAffinityLevel(affinity) {
            if (affinity >= this.AFFINITY_LEVELS.excellent.min) return this.AFFINITY_LEVELS.excellent;
            if (affinity >= this.AFFINITY_LEVELS.good.min) return this.AFFINITY_LEVELS.good;
            if (affinity >= this.AFFINITY_LEVELS.moderate.min) return this.AFFINITY_LEVELS.moderate;
            if (affinity >= this.AFFINITY_LEVELS.low.min) return this.AFFINITY_LEVELS.low;
            return this.AFFINITY_LEVELS.none;
        },
        
        /**
         * 獲取區域特殊效果配置
         * @param {string} specialType - 區域特殊類型
         * @returns {Object|null} 效果配置
         */
        getRegionSpecialEffect(specialType) {
            return this.DEPLOYMENT_EFFECTS.region_specials[specialType] || null;
        },
        
        /**
         * 檢查資產是否適用於區域特殊效果
         * @param {string} specialType - 區域特殊類型
         * @param {string} assetType - 資產類型
         * @param {string} assetId - 資產ID
         * @returns {boolean} 是否適用
         */
        isAssetApplicableForSpecial(specialType, assetType, assetId) {
            const special = this.getRegionSpecialEffect(specialType);
            if (!special) return false;
            
            // 檢查類型是否適用
            if (!special.applicable_types.includes(assetType)) return false;
            
            // 如果 applicable_ids 為 null，表示該類型所有資產都適用
            if (special.applicable_ids === null) return true;
            
            // 檢查特定 ID
            return special.applicable_ids.includes(assetId);
        }
    };
    
    // ==========================================
    // 全局暴露
    // ==========================================
    window.RegionAssetConfig = RegionAssetConfig;
    
    console.log('✓ Region Asset Config loaded');
    
})();
