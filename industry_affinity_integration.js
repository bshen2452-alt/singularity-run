// ============================================
// 產業親和度整合模組 (Industry Affinity Integration)
// ============================================
// 設計：被動掛載方式，自動攔截/包裝現有引擎函數
// 載入順序：必須在所有其他引擎之後載入

(function() {
    'use strict';

    // 等待 DOM 和其他引擎載入完成
    const initializeIntegration = function() {
        
        const Config = window.IndustryAffinityConfig;
        const Engine = window.IndustryAffinityEngine;
        
        if (!Config || !Engine) {
            console.warn('IndustryAffinityConfig or Engine not loaded, skipping integration');
            return;
        }

        console.log('🔗 Industry Affinity Integration: Starting auto-hookup...');

        // ==========================================
        // 工具函數
        // ==========================================

        /**
         * 確保玩家有親和度狀態
         */
        function ensureAffinityState(player) {
            if (!player.industry_affinity_state) {
                player.industry_affinity_state = Engine.createInitialState(
                    player.tech_route || 'Scaling Law'
                );
            }
            return player;
        }

        /**
         * 獲取成本修正係數（通用）
         */
        function getCostModifier(player, resourceType) {
            if (!player.industry_affinity_state) return 1.0;
            
            let modifier = Engine.calculateResourceCostModifier(
                player.industry_affinity_state, 
                resourceType
            );

            // 加入戰略合約折扣
            const contractEffects = Engine.getActiveContractEffects(player.industry_affinity_state);
            
            const discountMap = {
                'gpu_cost': 'gpu_discount',
                'cloud_cost': 'cloud_discount',
                'power_cost': 'power_discount',
                'data_cost': 'data_discount'
            };
            
            const discountKey = discountMap[resourceType];
            if (discountKey && contractEffects[discountKey]) {
                modifier *= (1 - contractEffects[discountKey]);
            }

            return modifier;
        }

        // ==========================================
        // 1. 掛載到 executeAssetAction (資源購買)
        // ==========================================

        if (window.AssetEngine && window.AssetEngine.executeAssetAction) {
            const originalExecuteAssetAction = window.AssetEngine.executeAssetAction;
            
            window.AssetEngine.executeAssetAction = function(player, actionId, params, globalParams) {
                // 確保親和度狀態存在
                let modifiedPlayer = ensureAffinityState(JSON.parse(JSON.stringify(player)));
                let modifiedGlobalParams = globalParams ? { ...globalParams } : { P_GPU: 1.0 };

                // 根據行動類型應用親和度修正
                switch (actionId) {
                    case 'buyPflops': {
                        // GPU 採購成本修正
                        const gpuMod = getCostModifier(modifiedPlayer, 'gpu_cost');
                        modifiedGlobalParams.P_GPU = (modifiedGlobalParams.P_GPU || 1.0) * gpuMod;
                        break;
                    }
                    
                    case 'rentCloud': {
                        // 雲端租賃成本（通過 globalParams 傳遞修正）
                        const cloudMod = getCostModifier(modifiedPlayer, 'cloud_cost');
                        modifiedGlobalParams._affinity_cloud_modifier = cloudMod;
                        break;
                    }
                    
                    case 'buyHighData':
                    case 'buyLowData':
                    case 'buyDataByType': {
                        // 檢查灰色數據禁令
                        const contractEffects = Engine.getActiveContractEffects(modifiedPlayer.industry_affinity_state);
                        if (contractEffects.gray_data_forbidden) {
                            const dataType = params.dataType || (actionId === 'buyHighData' ? 'legal_high_broad' : 'legal_low');
                            if (dataType.startsWith('gray')) {
                                return {
                                    success: false,
                                    player: player,
                                    message: '戰略合約禁止使用灰色數據',
                                    type: 'warning'
                                };
                            }
                        }
                        // 數據採購成本修正
                        const dataMod = getCostModifier(modifiedPlayer, 'data_cost');
                        modifiedGlobalParams._affinity_data_modifier = dataMod;
                        break;
                    }
                    
                    case 'hireTalent': {
                        // 人才招募成本修正
                        const talentMod = getCostModifier(modifiedPlayer, 'talent_cost');
                        modifiedGlobalParams._affinity_talent_modifier = talentMod;
                        break;
                    }
                }

                // 調用原始函數
                const result = originalExecuteAssetAction(modifiedPlayer, actionId, params, modifiedGlobalParams);
                
                // 如果成功，保留親和度狀態
                if (result.success && result.player) {
                    result.player.industry_affinity_state = modifiedPlayer.industry_affinity_state;
                }

                return result;
            };

            // 同步到全局
            if (window.executeAssetAction) {
                window.executeAssetAction = window.AssetEngine.executeAssetAction;
            }
            
            console.log('  ✓ Hooked: AssetEngine.executeAssetAction');
        }

        // ==========================================
        // 2. 掛載到 executeFinance (財務行動)
        // ==========================================

        if (typeof window.executeFinance === 'function') {
            const originalExecuteFinance = window.executeFinance;
            
            window.executeFinance = function(player, actionId, params) {
                let modifiedPlayer = ensureAffinityState(JSON.parse(JSON.stringify(player)));

                // 獎助金成功率加成
                if (actionId === 'applyGrant') {
                    const state = modifiedPlayer.industry_affinity_state;
                    const defenseAffinity = state.affinity.defense || 0;
                    
                    // 計算親和度加成
                    let affinityBonus = defenseAffinity * 0.005;
                    
                    // 戰略合約加成
                    const contractEffects = Engine.getActiveContractEffects(state);
                    if (contractEffects.grant_bonus) {
                        affinityBonus += contractEffects.grant_bonus;
                    }
                    
                    // 傳遞加成（通過 params）
                    params = params || {};
                    params._affinity_grant_bonus = Math.max(-0.3, Math.min(0.5, affinityBonus));
                }

                // 戰略融資行動
                if (actionId.startsWith('strategic_') || Config.STRATEGIC_FINANCING[actionId]) {
                    return executeStrategicFinancing(modifiedPlayer, actionId, params);
                }

                const result = originalExecuteFinance(modifiedPlayer, actionId, params);
                
                if (result.success && result.player) {
                    result.player.industry_affinity_state = modifiedPlayer.industry_affinity_state;
                }

                return result;
            };

            console.log('  ✓ Hooked: executeFinance');
        }

        // ==========================================
        // 3. 掛載到 processTurnUpdates (回合結束)
        // ==========================================

        if (window.TurnUpdateEngine && window.TurnUpdateEngine.processTurnUpdates) {
            const originalProcessTurnUpdates = window.TurnUpdateEngine.processTurnUpdates;
            
            window.TurnUpdateEngine.processTurnUpdates = function(player, rivals, globalParams) {
                // 確保親和度狀態
                let modifiedPlayer = ensureAffinityState(JSON.parse(JSON.stringify(player)));
                
                // 調用原始回合處理
                const result = originalProcessTurnUpdates(modifiedPlayer, rivals, globalParams);
                
                // 處理親和度的每季更新
                if (result.player) {
                    const affinityResult = Engine.processQuarterlyUpdate(result.player);
                    result.player = affinityResult.player;
                    
                    // 合併親和度訊息
                    if (affinityResult.messages && affinityResult.messages.length > 0) {
                        result.messages = result.messages || [];
                        result.messages.push(...affinityResult.messages);
                    }
                }

                return result;
            };

            // 同步到 processTurnUpdates 全局函數
            if (typeof window.processTurnUpdates === 'function') {
                window.processTurnUpdates = window.TurnUpdateEngine.processTurnUpdates;
            }

            console.log('  ✓ Hooked: TurnUpdateEngine.processTurnUpdates');
        }

        // ==========================================
        // 4. 掛載到 FacilityUpgradeEngine (設施升級)
        // ==========================================

        if (window.FacilityUpgradeEngine && window.FacilityUpgradeEngine.completeConstruction) {
            const originalCompleteConstruction = window.FacilityUpgradeEngine.completeConstruction;
            
            window.FacilityUpgradeEngine.completeConstruction = function(player, productId) {
                const result = originalCompleteConstruction(player, productId);
                
                if (result.success && result.newState) {
                    // 從 productId 解析資產類型和路徑
                    const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
                    if (config) {
                        const product = config.getUpgradeProduct(productId);
                        if (product && product.upgrade_path) {
                            const [assetType, upgradePath] = product.upgrade_path.split('.');
                            const level = product.level || 1;
                            
                            // 應用親和度變化
                            result.newState = ensureAffinityState(result.newState);
                            result.newState.industry_affinity_state = Engine.applyFacilityUpgradeAffinity(
                                result.newState.industry_affinity_state,
                                assetType,
                                upgradePath,
                                level
                            );
                        }
                    }
                }

                return result;
            };

            console.log('  ✓ Hooked: FacilityUpgradeEngine.completeConstruction');
        }

        // ==========================================
        // 5. 掛載到能源系統 (電力合約)
        // ==========================================

        // 假設有 signPowerContract 函數
        if (window.EnergyPriceEngine && window.EnergyPriceEngine.signContract) {
            const originalSignContract = window.EnergyPriceEngine.signContract;
            
            window.EnergyPriceEngine.signContract = function(player, contractId) {
                const result = originalSignContract(player, contractId);
                
                if (result.success && result.player) {
                    result.player = ensureAffinityState(result.player);
                    result.player.industry_affinity_state = Engine.applyPowerContractAffinity(
                        result.player.industry_affinity_state,
                        contractId,
                        true
                    );
                }

                return result;
            };

            console.log('  ✓ Hooked: EnergyPriceEngine.signContract');
        }

        // ==========================================
        // 6. 掛載到數據系統 (數據合約)
        // ==========================================

        if (window.DataIntegration && window.DataIntegration.signDataContract) {
            const originalSignDataContract = window.DataIntegration.signDataContract.bind(window.DataIntegration);
            
            window.DataIntegration.signDataContract = function(player, dataType) {
                const result = originalSignDataContract(player, dataType);
                
                if (result.success && result.player) {
                    result.player = ensureAffinityState(result.player);
                    result.player.industry_affinity_state = Engine.applyDataContractAffinity(
                        result.player.industry_affinity_state,
                        true
                    );
                }

                return result;
            };

            console.log('  ✓ Hooked: DataIntegration.signDataContract');
        }

        // ==========================================
        // 7. 產品收入修正掛載
        // ==========================================

        if (window.ProductEngine && window.ProductEngine.calculateProductRevenue) {
            const originalCalculateProductRevenue = window.ProductEngine.calculateProductRevenue.bind(window.ProductEngine);
    
            window.ProductEngine.calculateProductRevenue = function(player, globalParams) {
                const baseRevenue = originalCalculateProductRevenue(player, globalParams);
                
                if (!player.industry_affinity_state) return baseRevenue;
                
                // 計算 ToC/ToB 收入修正
                const consumerAffinity = player.industry_affinity_state.affinity.consumer || 0;
                const enterpriseAffinity = player.industry_affinity_state.affinity.enterprise || 0;
                
                // 假設收入中 ToC 和 ToB 各佔一半
                const tocMod = 1 + (consumerAffinity / 200);
                const tobMod = 1 + (enterpriseAffinity / 200);
                const avgMod = (tocMod + tobMod) / 2;
                
                return baseRevenue * avgMod;
            };

            console.log('  ✓ Hooked: ProductEngine.calculateProductRevenue');
        }

        // ==========================================
        // 8. ETF 投資整合
        // ==========================================

        if (window.ETFEngine && window.ETFEngine.buyETF) {
            const originalBuyETF = window.ETFEngine.buyETF;
            
            window.ETFEngine.buyETF = function(player, etfId, amount) {
                const result = originalBuyETF(player, etfId, amount);
                
                if (result.success && result.player) {
                    result.player = ensureAffinityState(result.player);
                    
                    // 大額投資影響親和度
                    const marketCap = result.player.market_cap || 100;
                    const investmentRatio = amount / marketCap;
                    
                    if (investmentRatio >= 0.03) {
                        // 找出 ETF 對應的產業
                        for (const [industryId, industry] of Object.entries(Config.INDUSTRIES)) {
                            if (industry.related_etf === etfId) {
                                const affinityGain = Math.floor(investmentRatio * 50);
                                result.player.industry_affinity_state = Engine.modifyAffinity(
                                    result.player.industry_affinity_state,
                                    industryId,
                                    affinityGain,
                                    `ETF投資: ${etfId}`
                                );
                                break;
                            }
                        }
                    }
                }

                return result;
            };

            console.log('  ✓ Hooked: ETFEngine.buyETF');
        }

        // ==========================================
        // 戰略融資執行函數
        // ==========================================

        function executeStrategicFinancing(player, financingId, params) {
            return Engine.executeStrategicFinancing(player, financingId);
        }

        // ==========================================
        // 暴露查詢接口（供 UI 使用）
        // ==========================================

        window.IndustryAffinityIntegration = {
            // 初始化
            initializePlayerAffinity: function(player) {
                return ensureAffinityState(JSON.parse(JSON.stringify(player)));
            },

            // 成本修正查詢
            getGpuCostModifier: function(player) {
                return getCostModifier(player, 'gpu_cost');
            },
            getCloudCostModifier: function(player) {
                return getCostModifier(player, 'cloud_cost');
            },
            getPowerCostModifier: function(player) {
                return getCostModifier(player, 'power_cost');
            },
            getDataCostModifier: function(player) {
                return getCostModifier(player, 'data_cost');
            },
            getTalentCostModifier: function(player) {
                return getCostModifier(player, 'talent_cost');
            },

            // 收入修正查詢
            getTocRevenueModifier: function(player) {
                if (!player.industry_affinity_state) return 1.0;
                const affinity = player.industry_affinity_state.affinity.consumer || 0;
                return 1 + (affinity / 200);
            },
            getTobRevenueModifier: function(player) {
                if (!player.industry_affinity_state) return 1.0;
                const affinity = player.industry_affinity_state.affinity.enterprise || 0;
                return 1 + (affinity / 200);
            },

            // 獎助金加成
            getGrantSuccessBonus: function(player) {
                if (!player.industry_affinity_state) return 0;
                
                const state = player.industry_affinity_state;
                const defenseAffinity = state.affinity.defense || 0;
                let bonus = defenseAffinity * 0.005;
                
                const contractEffects = Engine.getActiveContractEffects(state);
                if (contractEffects.grant_bonus) {
                    bonus += contractEffects.grant_bonus;
                }
                
                return Math.max(-0.3, Math.min(0.5, bonus));
            },

            // 摘要查詢
            getAffinitySummary: function(player) {
                if (!player.industry_affinity_state) return null;
                return Engine.getAffinitySummary(player.industry_affinity_state);
            },

            getCostModifiersSummary: function(player) {
                return {
                    gpu: this.getGpuCostModifier(player),
                    cloud: this.getCloudCostModifier(player),
                    power: this.getPowerCostModifier(player),
                    data: this.getDataCostModifier(player),
                    talent: this.getTalentCostModifier(player),
                    toc_revenue: this.getTocRevenueModifier(player),
                    tob_revenue: this.getTobRevenueModifier(player),
                    grant_bonus: this.getGrantSuccessBonus(player)
                };
            },

            // 戰略融資選項
            getAvailableStrategicFinancing: function(player) {
                const tier = player.mp_tier || 0;
                return Config.getAvailableFinancing(tier);
            },

            // 執行戰略融資
            executeStrategicFinancing: executeStrategicFinancing,

            // 限制檢查
            isGrayDataForbidden: function(player) {
                if (!player.industry_affinity_state) return false;
                const effects = Engine.getActiveContractEffects(player.industry_affinity_state);
                return effects.gray_data_forbidden === true;
            },

            hasExportRestriction: function(player) {
                if (!player.industry_affinity_state) return false;
                const effects = Engine.getActiveContractEffects(player.industry_affinity_state);
                return effects.export_restriction === true;
            },

            // 併購機會
            getAvailableAcquisitions: function(player) {
                if (!player.industry_affinity_state) return [];
                
                const opportunities = [];
                const acqTypes = Config.ACQUISITION_CONFIG.acquisition_types;

                for (const [typeId, typeConfig] of Object.entries(acqTypes)) {
                    const opportunity = Engine.checkAcquisitionOpportunity(
                        player.industry_affinity_state,
                        typeConfig.primary_industry
                    );

                    if (opportunity.available && Math.random() < opportunity.chance) {
                        opportunities.push({
                            type: typeId,
                            name: typeConfig.name,
                            industry: typeConfig.primary_industry,
                            cost_modifier: opportunity.cost_modifier,
                            integration_turns: Math.ceil(
                                opportunity.base_integration_turns * opportunity.integration_modifier
                            ),
                            base_cost: typeConfig.cost_range[0] + 
                                      Math.random() * (typeConfig.cost_range[1] - typeConfig.cost_range[0]),
                            effects: typeConfig.effects
                        });
                    }
                }

                return opportunities;
            }
        };

        // 簡短別名
        window.AffinityInt = window.IndustryAffinityIntegration;

        console.log('✓ Industry Affinity Integration: All hooks installed successfully');
    };

    // ==========================================
    // 延遲初始化，確保其他引擎已載入
    // ==========================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializeIntegration, 100);
        });
    } else {
        // DOM 已載入，延遲執行確保其他腳本已執行
        setTimeout(initializeIntegration, 100);
    }

})();
