// ============================================
// 奇點競速 - 主遊戲應用
// ============================================
const handleAction = useCallback((action, params = {}) => {
    if (!player) return;

    const context = { player, rivals, globalParams, params };
    
    // 處理結果的通用函數
    const processResult = (result) => {
        if (result) {
            if (result.message) {
                addMessage(result.message, result.type || (result.success ? 'success' : 'warning'));
            }
            
            if (result.success) {
                // 統一處理玩家狀態更新 (處理 player 和 updatedPlayer 兩種返回格式)
                const updatedPlayer = result.player || result.updatedPlayer;
                if (updatedPlayer) {
                    setPlayer(updatedPlayer);
                }
            }
        }
    };
    
    // 處理可能是Promise的結果
    const handleResult = (result) => {
        if (result && typeof result.then === 'function') {
            // 是Promise
            result.then(processResult).catch(err => {
                console.error('Action error:', err);
                addMessage(`執行失敗: ${err.message}`, 'danger');
            });
        } else {
            // 是同步結果
            processResult(result);
        }
    };

    let result = null;

    // 策略行動（包含商品開發啟動）
    if (['research', 'alignment', 'marketing', 'special', 'setComputeStrategy', 'startProductDev'].includes(action)) {
        result = GameEngine.executeAction('strategy', action, context);
        handleResult(result);
        return;
    }
    
    // 路線專屬技能（獨立冷卻機制）
    else if (action === 'routeSkill') {
        const { skillId, skillType } = params;
        const config = window.ROUTE_SKILL_CONFIG;
        const engine = window.RouteSkillEngine;
        
        if (!config || !engine) {
            result = { success: false, message: '路線技能系統未載入' };
        } else if (skillType === 'base') {
            const skillResult = engine.executeBaseSkill(player, config);
            result = {
                success: true,
                player: skillResult.newPlayer,
                message: skillResult.message,
                type: skillResult.messageType
            };
        } else if (skillType === 'blueprint') {
            const skillResult = engine.executeBlueprintSkill(
                player, 
                skillId, 
                window.STRATEGY_BLUEPRINT_CONFIG, 
                config
            );
            result = {
                success: true,
                player: skillResult.newPlayer,
                message: skillResult.message,
                type: skillResult.messageType
            };
        } else {
            result = { success: false, message: '無效的技能類型' };
        }
        handleResult(result);
        return;
    }
    // 財務行動
    else if (action === 'financeAction' || action === 'repayDebt') {
        const actionId = action === 'repayDebt' ? 'repayDebt' : params.actionId;
        result = GameEngine.executeAction('finance', actionId, context);
        handleResult(result);
        return;
    }
    // 資產行動
    else if (['buyPflops', 'rentCloud', 'cancelCloud', 'rentOutPflops', 'sellPflops', 'hireTalent', 'fireTalent', 'buyDataByType', 'scrapeData', 'sellDataByType', 'upgradeTech', 'investRival', 'synthesizeData', 'startCleaning', 'signDataContract'].includes(action)) {
        result = GameEngine.executeAction('asset', action, context);
        handleResult(result);
        return;
    }
    // 里程碑發布
    else if (action === 'milestone') {
        result = GameEngine.executeAction('milestone', `tier_${params.tier}`, context);
        handleResult(result);
        return;
    }

    
    // ========================================
    // 空間與電力系統行動 (Tier2+)
    // ========================================
    else if (action === 'buildFacility') {
        const SpaceEng = window.SpaceEngine;
        if (SpaceEng && SpaceEng.startConstruction) {
            result = SpaceEng.startConstruction(
                player, 
                params.type || params.spaceType, 
                params.name, 
                params.capacity, 
                params.powerContract
            );
            if (result.success && result.newState) {
                result.player = result.newState;
            }
        } else {
            result = { success: false, message: '空間系統未載入' };
        }
    }
    else if (action === 'expandFacility') {
        const SpaceEng = window.SpaceEngine;
        if (SpaceEng && SpaceEng.expandFacility) {
            result = SpaceEng.expandFacility(player, params.facilityId);
            if (result.success && result.newState) {
                result.player = result.newState;
            }
        } else {
            result = { success: false, message: '空間系統未載入' };
        }
    }
    else if (action === 'rentColocation') {
        const SpaceEng = window.SpaceEngine;
        if (SpaceEng && SpaceEng.rentColocation) {
            result = SpaceEng.rentColocation(player, params.capacity, params.name);
            if (result.success && result.newState) {
                result.player = result.newState;
            }
        } else {
            result = { success: false, message: '空間系統未載入' };
        }
    }
    else if (action === 'cancelColocation') {
        const SpaceEng = window.SpaceEngine;
        if (SpaceEng && SpaceEng.cancelColocation) {
            result = SpaceEng.cancelColocation(player, params.rentalId);
            if (result.success && result.newState) {
                result.player = result.newState;
            }
        } else {
            result = { success: false, message: '空間系統未載入' };
        }
    }
    // 切換全局電力合約（舊版，保留兼容）
    else if (action === 'switchPowerContract') {
        const updatedPlayer = JSON.parse(JSON.stringify(player));
        if (!updatedPlayer.energy_settings) {
            updatedPlayer.energy_settings = {};
        }
        
        const energyConfig = window.ENERGY_CONFIG?.POWER_CONTRACTS || {};
        const contract = energyConfig[params.contractId];
        
        if (contract) {
            if (contract.upfront_cost && contract.upfront_cost > 0) {
                if (updatedPlayer.cash < contract.upfront_cost) {
                    result = { success: false, message: `資金不足，簽約需要 $${contract.upfront_cost}M` };
                } else {
                    updatedPlayer.cash -= contract.upfront_cost;
                    updatedPlayer.energy_settings.power_contract = params.contractId;
                    updatedPlayer.energy_settings.contract_remaining = contract.contract_term || 0;
                    result = {
                        success: true,
                        player: updatedPlayer,
                        message: `⚡ 已切換至 ${contract.display_name || contract.name}，支付簽約金 $${contract.upfront_cost}M`
                    };
                }
            } else {
                updatedPlayer.energy_settings.power_contract = params.contractId;
                updatedPlayer.energy_settings.contract_remaining = contract.contract_term || 0;
                result = {
                    success: true,
                    player: updatedPlayer,
                    message: `⚡ 已切換至 ${contract.display_name || contract.name}`
                };
            }
        } else {
            result = { success: false, message: '無效的電力合約' };
        }
    }
    // 切換設施電力合約（新版，設施層級）
    else if (action === 'switchFacilityPowerContract') {
        const updatedPlayer = JSON.parse(JSON.stringify(player));
        const energyConfig = window.ENERGY_CONFIG?.POWER_CONTRACTS || {};
        const contract = energyConfig[params.contractId];
        
        if (!contract) {
            result = { success: false, message: '無效的電力合約' };
        } else if (!updatedPlayer.space_state || !updatedPlayer.space_state.facilities) {
            result = { success: false, message: '空間系統未初始化' };
        } else {
            // 找到目標設施
            const facilityIndex = updatedPlayer.space_state.facilities.findIndex(f => f.id === params.facilityId);
            
            if (facilityIndex === -1) {
                result = { success: false, message: '找不到指定設施' };
            } else {
                const facility = updatedPlayer.space_state.facilities[facilityIndex];
                const currentContract = facility.power_contract || 'grid_default';
                
                // 如果是同一個合約，不需要切換
                if (currentContract === params.contractId) {
                    result = { success: false, message: '已經是此電力合約' };
                } else {
                    // 檢查簽約金
                    if (contract.upfront_cost && contract.upfront_cost > 0) {
                        if (updatedPlayer.cash < contract.upfront_cost) {
                            result = { success: false, message: `資金不足，簽約需要 $${contract.upfront_cost}M` };
                        } else {
                            updatedPlayer.cash -= contract.upfront_cost;
                            updatedPlayer.space_state.facilities[facilityIndex].power_contract = params.contractId;
                            
                            // 同時更新全局設定
                            if (!updatedPlayer.energy_settings) {
                                updatedPlayer.energy_settings = {};
                            }
                            updatedPlayer.energy_settings.power_contract = params.contractId;
                            updatedPlayer.energy_settings.contract_remaining = contract.contract_term || 0;
                            
                            result = {
                                success: true,
                                player: updatedPlayer,
                                message: `⚡ ${facility.name} 已切換至 ${contract.display_name || contract.name}，支付簽約金 $${contract.upfront_cost}M`
                            };
                        }
                    } else {
                        updatedPlayer.space_state.facilities[facilityIndex].power_contract = params.contractId;
                        
                        // 同時更新全局設定
                        if (!updatedPlayer.energy_settings) {
                            updatedPlayer.energy_settings = {};
                        }
                        updatedPlayer.energy_settings.power_contract = params.contractId;
                        updatedPlayer.energy_settings.contract_remaining = contract.contract_term || 0;
                        
                        result = {
                            success: true,
                            player: updatedPlayer,
                            message: `⚡ ${facility.name} 已切換至 ${contract.display_name || contract.name}`
                        };
                    }
                }
            }
        }
    }
    
    // ========================================
    // 產品系統行動（新增）
    // ========================================
    else if (action === 'unlockWithTuring') {
        // 使用 Turing 解鎖產品
        const ProductEng = window.ProductEngine;
        if (ProductEng && ProductEng.unlockProductWithTuring) {
            result = ProductEng.unlockProductWithTuring(player, params.productId);
        } else {
            result = { success: false, message: '產品系統未載入' };
        }
    }
    else if (action === 'assignSenior') {
        // 分配或撤回 Senior（根據 count 參數決定）
        const ProductEng = window.ProductEngine;
        const count = params.count || 1;
        
        if (ProductEng) {
            if (count > 0 && ProductEng.assignSeniorToProduct) {
                result = ProductEng.assignSeniorToProduct(player, params.productId);
            } else if (count < 0 && ProductEng.removeSeniorFromProduct) {
                result = ProductEng.removeSeniorFromProduct(player, params.productId);
            } else {
                result = { success: false, message: '無效的操作' };
            }
        } else {
            result = { success: false, message: '產品系統未載入' };
        }
    }
    else if (action === 'removeSenior') {
        // 從產品移除 Senior
        const ProductEng = window.ProductEngine;
        if (ProductEng && ProductEng.removeSeniorFromProduct) {
            result = ProductEng.removeSeniorFromProduct(player, params.productId);
        } else {
            result = { success: false, message: '產品系統未載入' };
        }
    }
    else if (action === 'recruitTuring') {
        // 招募 Turing 人才
        const Integration = window.ProductIntegration;
        if (Integration && Integration.recruitTuring) {
            result = Integration.recruitTuring(player);
        } else {
            // 回退處理
            const COSTS = window.GameConfig?.COSTS || {};
            const recruitCost = COSTS.TURING_RECRUIT_PRICE || 50;
            
            if (player.cash < recruitCost) {
                result = { success: false, message: `資金不足，需要 $${recruitCost}M` };
            } else {
                const updatedPlayer = JSON.parse(JSON.stringify(player));
                updatedPlayer.cash -= recruitCost;
                if (!updatedPlayer.talent) {
                    updatedPlayer.talent = { turing: 0, senior: 0, junior: 0 };
                }
                updatedPlayer.talent.turing = (updatedPlayer.talent.turing || 0) + 1;
                result = {
                    success: true,
                    message: `🧠 成功招募 Turing 級工程師！(共 ${updatedPlayer.talent.turing} 位)`,
                    player: updatedPlayer
                };
            }
        }
    }
    else if (action === 'allocateSenior') {
        // 分配 Senior 工程師到各部門
        const Integration = window.ProductIntegration;
        if (Integration && Integration.allocateSeniors) {
            result = Integration.allocateSeniors(player, params);
        } else {
            // 回退處理
            const updatedPlayer = JSON.parse(JSON.stringify(player));
            const totalSenior = updatedPlayer.talent?.senior || 0;
            const allocated = (params.research || 0) + (params.product || 0) + (params.ops || 0);
            
            if (allocated > totalSenior) {
                result = { success: false, message: `分配人數超過 Senior 總數` };
            } else {
                updatedPlayer.senior_allocation = {
                    research: params.research || 0,
                    product: params.product || 0,
                    ops: params.ops || 0
                };
                result = {
                    success: true,
                    message: `👨‍💻 Senior 分配更新完成`,
                    player: updatedPlayer
                };
            }
        }
    }
    else if (action === 'setProductComputeStrategy') {
        // 設定算力分配策略
        const ProductEng = window.ProductEngine;
        if (ProductEng && ProductEng.setComputeStrategy) {
            result = ProductEng.setComputeStrategy(player, params.strategy);
        } else {
            result = { success: false, message: '產品系統未載入' };
        }
    }
    else if (action === 'cancelProductDev') {
        // 取消開發中的產品
        const ProductEng = window.ProductEngine;
        if (ProductEng && ProductEng.cancelDevelopment) {
            result = ProductEng.cancelDevelopment(player, params.productId);
        } else {
            result = { success: false, message: '產品系統未載入' };
        }
    }
    
    // ========================================
    // 策略藍圖行動 (Tier1+)
    // ========================================
    else if (action === 'activateBlueprintSkill') {
        const BlueprintInt = window.BlueprintIntegration;
        if (BlueprintInt && BlueprintInt.executeAction) {
            result = BlueprintInt.executeAction(player, action, params);
        } else {
            result = { success: false, message: '策略藍圖系統未載入' };
        }
    }

    // ========================================
    // 資產升級系統行動 (Tier3+)
    // ========================================
    else if (action === 'upgradeAsset') {
        const AssetCardEng = window.AssetCardEngine;
        if (AssetCardEng && AssetCardEng.performUpgrade) {
            result = AssetCardEng.performUpgrade(player, params.assetType, params.pathId);
            if (result.success && result.newState) {
                result.player = result.newState;
                if (result.departmentUnlocked) {
                    result.message += ` | 🏢 解鎖: ${result.departmentUnlocked.icon} ${result.departmentUnlocked.name}`;
                }
            }
        } else {
            result = { success: false, message: '資產卡片系統未載入' };
        }
    }
    else if (action === 'establishDepartment') {
        const AssetCardEng = window.AssetCardEngine;
        if (AssetCardEng && AssetCardEng.establishDepartment) {
            result = AssetCardEng.establishDepartment(player, params.departmentId);
            if (result.success && result.newState) {
                result.player = result.newState;
            }
        } else {
            result = { success: false, message: '部門系統未載入' };
        }
    }

        // 產品線升級為事業部/事業子公司
    else if (action === 'upgradeProductLine') {
        const ProductLineEng = window.ProductLineEngine;
        if (ProductLineEng && ProductLineEng.upgradeProductLine) {
            result = ProductLineEng.upgradeProductLine(player, params.lineName, params.targetStage);
            if (result.success) {
                result.player = player;
            }
        } else {
            result = { success: false, message: '產品線升級系統未載入' };
        }
    }
    
    // 職能部門升級為職能子公司
    else if (action === 'evolveDeptToSubsidiary') {
        const AssetCardEng = window.AssetCardEngine;
        if (AssetCardEng && AssetCardEng.evolveDeptToSubsidiary) {
            result = AssetCardEng.evolveDeptToSubsidiary(player, params.departmentId);
            if (result.success && result.newState) {
                result.player = result.newState;
            }
        } else {
            result = { success: false, message: '子公司升級系統未載入' };
        }
    }
    
    else if (action === 'applyUpgrade' || action === 'performAssetUpgrade') {
        // 舊版升級系統（保留兼容）
        const UpgradeInt = window.AssetUpgradeIntegration;
        if (UpgradeInt && UpgradeInt.handleAction) {
            const newGameState = UpgradeInt.handleAction({ player, rivals, globalParams, messages: [] }, action, params);
            if (newGameState && newGameState.player) {
                result = {
                    success: true,
                    player: newGameState.player,
                    message: newGameState.messages?.[0]?.text || '升級成功'
                };
            } else {
                result = { success: false, message: '升級處理失敗' };
            }
        } else {
            result = { success: false, message: '資產升級系統未載入' };
        }
    }
    // 打開特定面板的處理
    else if (action === 'openSpacePanel' || action === 'openDataPanel') {
        // 這些是 UI 切換操作，不需要後端處理
        // 由 UI 層直接處理
        result = { success: true, message: '' };
    }

    // ========================================
    // 設施技術施工行動 (Tier3+)
    // ========================================
    else if (action === 'startFacilityTechConstruction') {
        const SpaceEng = window.SpaceEngine;
        if (SpaceEng && SpaceEng.startFacilityTechConstruction) {
            result = SpaceEng.startFacilityTechConstruction(player, params.facilityId, params.pathId);
            if (result.success && result.newState) {
                result.player = result.newState;
            }
        } else {
            result = { success: false, message: '設施技術系統未載入' };
        }
    }

    // ========================================
    else {
        addMessage('未知的行動類型: ' + action, 'danger');
        return;
    }

    // 統一處理同步結果
    handleResult(result);
}, [player, rivals, globalParams, addMessage]);