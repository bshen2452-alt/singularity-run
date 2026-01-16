// ============================================
// 奇點競速 - 遊戲狀態管理 Hook (優化版)
// ============================================
// 設計理念：
// 1. 直接調用各子系統 Engine，不依賴 GameEngine 統一入口
// 2. 使用配置化的行動路由表，易於擴展新機制
// 3. 提供靈活的錯誤處理和日誌系統
// 4. 支持中間件模式，方便追加全局邏輯

(function() {
const { useState, useCallback, useEffect, useMemo } = React;

// ============================================
// Action Routing 配置
// ============================================
const ACTION_ROUTES = {
    // 策略行動組
    strategy: {
        actions: ['research', 'alignment', 'marketing', 'special', 'setComputeStrategy', 'startProductDev'],
        engine: () => window.StrategyEngine,
        executor: (engine, player, action, globalParams, params) => {
            return engine.executeStrategy(player, action, globalParams, params);
        }
    },
    
    // 財務行動組
    finance: {
        actions: ['financeAction', 'takeLoan', 'repayDebt', 'issueEquity', 'signPocContract', 'signIndustryContract'],
        engine: () => window.FinanceEngine,
        executor: (engine, player, action, globalParams, params) => {
            const actionId = action === 'financeAction' ? params.actionId : action;
            // 優先使用 EquityIntegration 以支援 strategicFunding、IPO 等擴展財務行動
            if (window.EquityIntegration?.executeFinanceWithEquity) {
                return window.EquityIntegration.executeFinanceWithEquity(player, actionId, params);
            }
            return engine.executeFinance(player, actionId, params);
        }
    },
    
    // 資產行動組 [修復2 - 添加fireTalent]
    asset: {
        actions: ['buyPflops', 'rentCloud', 'cancelCloud', 'rentOutPflops', 'sellPflops', 'hireTalent', 'fireTalent', 'buyDataByType', 'upgradeTech', 'investRival', 'scrapeData', 'sellDataByType','synthesizeData', 'startCleaning', 'signDataContract'],
        engine: () => window.AssetEngine,
        executor: (engine, player, action, globalParams, params) => {
            return engine.executeAssetAction(player, action, params, globalParams);
        }
    },

    
    
    // 里程碑行動
    milestone: {
        actions: ['milestone'],
        engine: () => window.MilestoneEngine,
        executor: (engine, player, action, globalParams, params) => {
            return engine.executeMilestoneLaunch(player, params.tier);
        }
    },

    // 路線專屬技能（獨立冷卻）
    routeSkill: {
        actions: ['routeSkill'],
        engine: () => window.RouteSkillEngine,
        executor: (engine, player, action, globalParams, params) => {
            const config = window.ROUTE_SKILL_CONFIG;
            if (!config || !engine) {
                return { success: false, message: '路線技能系統未載入' };
            }
            
            const { skillId, skillType } = params;
            let result;
            
            if (skillType === 'base') {
                result = engine.executeBaseSkill(player, config);
            } else if (skillType === 'blueprint') {
                result = engine.executeBlueprintSkill(
                    player,
                    skillId,
                    window.STRATEGY_BLUEPRINT_CONFIG,
                    config
                );
            } else {
                return { success: false, message: '無效的技能類型' };
            }
            
            return {
                success: true,
                player: result.newPlayer,
                message: result.message,
                type: result.messageType
            };
        }
    },
    
    // 競爭對手投資
    rivalInvestment: {
        actions: ['investRival'],
        engine: () => window.RivalInvestmentEngine,
        executor: (engine, player, action, globalParams, params) => {
            return engine.executeRivalInvestment(player, params.rivalName, params.amount);
        }
    },
    
    // 商品開發行動組
    product: {
        actions: ['developProduct', 'startProductDev', 'upgradeProduct', 'launchProduct', 'unlockProduct', 'unlockWithTuring', 'assignSenior', 'recruitTuring', 'recruitSenior'],
        engine: () => window.ProductIntegration || window.ProductEngine,
        executor: (engine, player, action, globalParams, params) => {
            const integration = window.ProductIntegration;
            const productEngine = window.ProductEngine;
            
            switch(action) {
                case 'developProduct':
                case 'startProductDev':
                    return productEngine.startDevelopment(player, params.productId);
                case 'upgradeProduct':
                    return productEngine.updateAllDevelopment(player, params.productPflops || 0);
                case 'launchProduct':
                    return productEngine.launchProduct(player, params.productId);
                case 'unlockProduct':
                case 'unlockWithTuring':
                    if (integration) {
                        return integration.unlockProductWithTuring(player, params.productId);
                    }
                    return productEngine.unlockProductWithTuring(player, params.productId);
                case 'assignSenior':
                    if (params.count < 0) {
                        if (integration) return integration.removeSeniorFromProduct(player, params.productId);
                        return productEngine.removeSeniorFromProduct(player, params.productId);
                    } else {
                        if (integration) return integration.assignSeniorToProduct(player, params.productId);
                        return productEngine.assignSeniorToProduct(player, params.productId);
                    }
                case 'recruitTuring':
                    if (integration) return integration.recruitTuring(player);
                    return { success: false, message: 'ProductIntegration not loaded' };
                case 'recruitSenior':
                    if (integration) return integration.recruitSenior(player);
                    return { success: false, message: 'ProductIntegration not loaded' };
                default:
                    return { success: false, message: 'Unknown product action' };
            }
        }
    },

    // 社群戰略行動組
    community: {
        actions: ['communityStrategy'],
        engine: () => window.CommunityEngine,
        executor: (engine, player, action, globalParams, params) => {
            return engine.executeCommunityStrategy(player, params.strategyId);
        }
    },

    // ETF 投資行動組
    etf: {
        actions: ['buyETF', 'sellETF'],
        engine: () => window.ETFEngine,
        executor: (engine, player, action, globalParams, params) => {
            switch(action) {
                case 'buyETF':
                    return engine.buyETF(player, params.etfId, params.amount, globalParams);
                case 'sellETF':
                    return engine.sellETF(player, params.etfId, params.shares, globalParams);
                default:
                    return { success: false, message: '未知的ETF行動' };
            }
        }
    },

    // 策略藍圖行動組
    blueprint: {
        actions: ['activateBlueprintSkill'],
        engine: () => window.BlueprintIntegration,
        executor: (engine, player, action, globalParams, params) => {
            return engine.executeAction(player, action, params);
        }
    },

    // 資產卡片升級行動組
    assetCard: {
        actions: ['upgradeAsset', 'establishDepartment', 'evolveDeptToSubsidiary', 'openSpacePanel'],
        engine: () => window.AssetCardEngine,
        executor: (engine, player, action, globalParams, params) => {
            switch(action) {
                case 'upgradeAsset':
                    const upgradeResult = engine.performUpgrade(player, params.assetType, params.pathId);
                    if (upgradeResult.success && upgradeResult.newState) {
                        upgradeResult.player = upgradeResult.newState;
                    }
                    return upgradeResult;
                case 'establishDepartment':
                    const deptResult = engine.establishDepartment(player, params.departmentId);
                    if (deptResult.success && deptResult.newState) {
                        deptResult.player = deptResult.newState;
                    }
                    return deptResult;
                case 'evolveDeptToSubsidiary':
                    const evolveResult = engine.evolveDeptToSubsidiary(player, params.departmentId);
                    if (evolveResult.success && evolveResult.newState) {
                        evolveResult.player = evolveResult.newState;
                    }
                    return evolveResult;
                case 'openSpacePanel':
                    return { success: true, uiAction: 'openSpacePanel', message: '開啟空間管理面板' };
                default:
                    return { success: false, message: '未知的資產卡片行動' };
            }
        }
    },

    // 產品線升級行動組
    productLine: {
        actions: ['upgradeProductLine'],
        engine: () => window.ProductLineEngine,
        executor: (engine, player, action, globalParams, params) => {
            switch(action) {
                case 'upgradeProductLine':
                    const result = engine.upgradeProductLine(player, params.lineName, params.targetStage);
                    if (result.success) {
                        result.player = player;
                    }
                    return result;
                default:
                    return { success: false, message: '未知的產品線行動' };
            }
        }
    },
    
    // 空間系統行動組 (Tier2+)
    space: {
        actions: ['buildFacility', 'expandFacility', 'rentColocation', 'cancelColocation', 'switchPowerContract', 'switchFacilityPowerContract', 'startFacilityTechConstruction'],
        engine: () => window.SpaceEngine,
        executor: (engine, player, action, globalParams, params) => {
            switch(action) {
                case 'buildFacility':
                    const buildResult = engine.startConstruction(
                        player, 
                        params.type || params.spaceType, 
                        params.name, 
                        params.capacity, 
                        params.powerContract
                    );
                    if (buildResult.success && buildResult.newState) {
                        buildResult.player = buildResult.newState;
                    }
                    return buildResult;
                    
                case 'expandFacility':
                    console.log("🔧 [executor] expandFacility 開始");
                    const expandResult = engine.expandFacility(player, params.facilityId);
                    console.log("🔧 [executor] expandFacility 結果:", expandResult);
                    if (expandResult.success && expandResult.newState) {
                        expandResult.player = expandResult.newState;
                        console.log("🔧 [executor] 設置 player:", !!expandResult.player);
                    }
                    return expandResult;
                    
                case 'startFacilityTechConstruction':
                    if (!engine.startFacilityTechConstruction) {
                        return { success: false, message: '設施技術系統未載入' };
                    }
                    const techResult = engine.startFacilityTechConstruction(player, params.facilityId, params.pathId);
                    if (techResult.success && techResult.newState) {
                        techResult.player = techResult.newState;
                    }
                    return techResult;
                
                case 'rentColocation':
                    const rentResult = engine.rentColocation(player, params.capacity, params.name);
                    if (rentResult.success && rentResult.newState) {
                        rentResult.player = rentResult.newState;
                    }
                    return rentResult;
                    
                case 'cancelColocation':
                    const cancelResult = engine.cancelColocation(player, params.rentalId);
                    if (cancelResult.success && cancelResult.newState) {
                        cancelResult.player = cancelResult.newState;
                    }
                    return cancelResult;
                    
                case 'switchPowerContract':
                    const energyConfig = window.ENERGY_CONFIG?.POWER_CONTRACTS || {};
                    const contract = energyConfig[params.contractId];
                    
                    if (!contract) {
                        return { success: false, message: '無效的電力合約' };
                    }
                    
                    const updatedPlayer = JSON.parse(JSON.stringify(player));
                    if (!updatedPlayer.energy_settings) {
                        updatedPlayer.energy_settings = {};
                    }
                    
                    if (contract.upfront_cost && contract.upfront_cost > 0) {
                        if (updatedPlayer.cash < contract.upfront_cost) {
                            return { success: false, message: '資金不足，簽約需要 $' + contract.upfront_cost + 'M' };
                        }
                        updatedPlayer.cash -= contract.upfront_cost;
                    }
                    
                    updatedPlayer.energy_settings.power_contract = params.contractId;
                    updatedPlayer.energy_settings.contract_remaining = contract.contract_term || 0;
                    
                    return {
                        success: true,
                        player: updatedPlayer,
                        message: '⚡ 已切換至 ' + (contract.display_name || contract.name) + (contract.upfront_cost > 0 ? '，支付簽約金 $' + contract.upfront_cost + 'M' : '')
                    };

                case 'switchFacilityPowerContract':
                    // 切換設施電力合約
                    var facilityEnergyConfig = window.ENERGY_CONFIG?.POWER_CONTRACTS || {};
                    var facilityContract = facilityEnergyConfig[params.contractId];
                    
                    if (!facilityContract) {
                        return { success: false, message: '無效的電力合約' };
                    }
                    
                    var facilityUpdatedPlayer = JSON.parse(JSON.stringify(player));
                    var facilitySpaceState = facilityUpdatedPlayer.space_state;
                    
                    if (!facilitySpaceState || !facilitySpaceState.facilities) {
                        return { success: false, message: '空間狀態未初始化' };
                    }
                    
                    // 找到並更新設施的電力合約
                    var facilityId = params.facilityId;
                    var facilityFound = false;
                    
                    for (var i = 0; i < facilitySpaceState.facilities.length; i++) {
                        if (facilitySpaceState.facilities[i].id === facilityId) {
                            // 檢查簽約金
                            if (facilityContract.upfront_cost && facilityContract.upfront_cost > 0) {
                                if (facilityUpdatedPlayer.cash < facilityContract.upfront_cost) {
                                    return { success: false, message: '資金不足，簽約需要 $' + facilityContract.upfront_cost + 'M' };
                                }
                                facilityUpdatedPlayer.cash -= facilityContract.upfront_cost;
                            }
                            
                            facilitySpaceState.facilities[i].power_contract = params.contractId;
                            facilityFound = true;
                            break;
                        }
                    }
                    
                    if (!facilityFound) {
                        return { success: false, message: '找不到指定設施' };
                    }
                    
                    return {
                        success: true,
                        player: facilityUpdatedPlayer,
                        message: '設施電力合約已切換為: ' + facilityContract.name
                    };    
                    
                default:
                    return { success: false, message: '未知的空間行動' };
            }
        }
    },

    // 區域系統行動組 (Tier4+)
    region: {
        actions: ['establish_liaison', 'submit_application', 'upgrade_office', 'assign_asset'],
        engine: () => window.RegionEngine,
        executor: (engine, player, action, globalParams, params) => {
            switch(action) {
                case 'establish_liaison':
                    const liaisonResult = engine.establishLiaison(player, params.regionId);
                    if (liaisonResult.success && liaisonResult.newState) {
                        liaisonResult.player = liaisonResult.newState;
                    }
                    return liaisonResult;
                    
                case 'submit_application':
                    const appResult = engine.submitApplication(player, params.regionId);
                    if (appResult.success && appResult.newState) {
                        appResult.player = appResult.newState;
                    }
                    return appResult;
                    
                case 'upgrade_office':
                    if (!engine.upgradeOffice) {
                        return { success: false, message: '辦公室升級功能未實現' };
                    }
                    const upgradeResult = engine.upgradeOffice(player, params.regionId, params.officeIndex);
                    if (upgradeResult.success && upgradeResult.newState) {
                        upgradeResult.player = upgradeResult.newState;
                    }
                    return upgradeResult;
                    
                case 'assign_asset':
                    if (!engine.assignAsset) {
                        return { success: false, message: '資產派駐功能未實現' };
                    }
                    const assignResult = engine.assignAsset(player, params.regionId, params.assetId);
                    if (assignResult.success && assignResult.newState) {
                        assignResult.player = assignResult.newState;
                    }
                    return assignResult;
                    
                default:
                    return { success: false, message: '未知的區域行動' };
            }
        }
    }
};



// 里程碑行動路由
const MILESTONE_ACTION_ROUTING = {
    launchMilestone: {
        engine: () => window.MilestoneEngine,
        executor: (engine, player, milestoneId, rivals, globalParams) => {
            // 使用正確的函數名稱 executeMilestoneLaunch
            return engine.executeMilestoneLaunch(player, milestoneId);
        }
    }
};   



// ============================================
// 路由查找輔助函數
// ============================================

function findActionRoute(action) {
    for (const [groupName, group] of Object.entries(ACTION_ROUTES)) {
        if (group.actions.includes(action)) {
            return { groupName, group };
        }
    }
    return null;
}

// ============================================
// 路由查找輔助函數
// ============================================

function findActionRoute(action) {
    for (const [groupName, group] of Object.entries(ACTION_ROUTES)) {
        if (group.actions.includes(action)) {
            return { groupName, group };
        }
    }
    return null;
}

    
    // ==========================================
    // 工具方法
    // ==========================================
    
function useGameState() {
    // 狀態
    const [player, setPlayer] = useState(null);
    const [rivals, setRivals] = useState([]);
    const [globalParams, setGlobalParams] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [coreActionUsed, setCoreActionUsed] = useState(false);
    const [ending, setEnding] = useState(null);
    
    const [gamePhase, setGamePhase] = useState('setup'); // setup, playing, ended




    // 訊息管理
    const addMessage = useCallback((text, type = 'info') => {
        const id = Date.now() + Math.random();
        setMessages(prev => [...prev.slice(-9), { id, text, type }]);
        
        // 自動清除訊息
        //setTimeout(() => {
        //    setMessages(prev => prev.filter(m => m.id !== id));
        //}, 5000);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);
    
    // 初始化遊戲
    const initializeGame = useCallback((route = 'Consumer', rivalCount = 3) => {
        console.log('Initializing game with route:', route);
        
        // 檢查必要的引擎
        if (!window.GameEngine) {
            console.error('GameEngine not available');
            return false;
        }
        
        try {
            // 使用 InitialStateEngine 創建初始狀態
            let initialPlayer;
            if (window.InitialStateEngine && window.InitialStateEngine.createInitialPlayerState) {
                initialPlayer = window.InitialStateEngine.createInitialPlayerState(route);
            } else if (window.GameEngine.createInitialPlayerState) {
                initialPlayer = window.GameEngine.createInitialPlayerState(route);
            } else {
                console.error('No initial state creator available');
                return false;
            }
            
            // 初始化競爭對手
            let initialRivals = [];
            if (window.InitialStateEngine && window.InitialStateEngine.createInitialRivalsState) {
                initialRivals = window.InitialStateEngine.createInitialRivalsState(route, rivalCount);
            } else if (window.GameEngine.createInitialRivalsState) {
                initialRivals = window.GameEngine.createInitialRivalsState(route, rivalCount);
            }
            
            // 初始化全局參數
            let initialGlobalParams = { I_Hype: 1.0, P_GPU: 1.0, P_Data: 1.0, P_Energy: 1.0 };
            if (window.InitialStateEngine && window.InitialStateEngine.createInitialGlobalParams) {
                initialGlobalParams = window.InitialStateEngine.createInitialGlobalParams();
            } else if (window.GameEngine.createInitialGlobalParams) {
                initialGlobalParams = window.GameEngine.createInitialGlobalParams();
            }
            
            // 確保 product_state 被正確初始化
            if (!initialPlayer.product_state && window.ProductEngine) {
                initialPlayer.product_state = window.ProductEngine.createInitialProductState();
            }

            // Phase 2：執行狀態遷移（向後兼容）
            if (window.StateMigrationEngine && window.StateMigrationEngine.migratePlayerState) {
                initialPlayer = window.StateMigrationEngine.migratePlayerState(initialPlayer);
            }
            
            // 確保 community 狀態被初始化
            if (!initialPlayer.community && window.CommunityEngine) {
                initialPlayer.community = window.CommunityEngine.createInitialCommunityState 
                    ? window.CommunityEngine.createInitialCommunityState()
                    : { size: 0, engagement: 50, sentiment: 50 };
            }
            
            setPlayer(initialPlayer);
            setRivals(initialRivals);
            setGlobalParams(initialGlobalParams);
            setCoreActionUsed(false);
            setIsInitialized(true);
            setGamePhase('playing');
            
            addMessage(`遊戲開始！選擇路線: ${route}`, 'success');
            return true;
        } catch (error) {
            console.error('Game initialization error:', error);
            addMessage('遊戲初始化失敗: ' + error.message, 'danger');
            return false;
        }
    }, [addMessage]);

    // 執行行動（統一入口）
    const handleAction = useCallback((action, params = {}) => {
        console.log("🎮 handleAction called:", { action, params });
        
        if (!player) {
            addMessage("遊戲未初始化", "danger");
            return false;
        }
        
        // 查找行動路由
        const route = findActionRoute(action);
        
        if (!route) {
            addMessage(`未知的行動: ${action}`, 'danger');
            return false;
        }
        
        const { groupName, group } = route;
        const engine = group.engine();
        
        if (!engine) {
            addMessage(`${groupName} 引擎未載入`, 'danger');
            return false;
        }
        
        try {
            const result = group.executor(engine, player, action, globalParams, params);
            console.log("📦 Action result:", { action, success: result?.success, hasPlayer: !!(result?.player || result?.updatedPlayer), message: result?.message });
     
            if (result && result.success) {
                const newPlayer = result.player || result.updatedPlayer;
                console.log("✅ Updating player state:", !!newPlayer, newPlayer?.cash, newPlayer?.space_state?.under_construction?.length);
                if (newPlayer) { setPlayer(newPlayer); }

                // 核心策略行動標記
                if (groupName === 'strategy' && ['research', 'marketing', 'safety', 'scale'].includes(action)) {
                    setCoreActionUsed(true);
                }
                
                if (result.message) {
                    addMessage(result.message, result.type || 'success');
                }
                // 處理全局加成 (globalBonus) - 里程碑發布等
                if (result.globalBonus) {
                    setGlobalParams(prev => {
                        const updated = { ...prev };
                        if (result.globalBonus.I_Hype) {
                            updated.I_Hype = Math.min(2.0, (updated.I_Hype || 1.0) + result.globalBonus.I_Hype);
                        }
                        return updated;
                    });
                    if (result.globalBonus.description) {
                        addMessage(result.globalBonus.description, 'info');
                    }
                }                
                
                // 里程碑發布成功時觸發 Tier 解鎖通知
                if (action === 'milestone' && typeof window.onTierUpgrade === 'function') {
                    const unlockedTier = result.tierUnlocked || params.tier;
                    window.onTierUpgrade(unlockedTier);
                }
                
                // 處理額外的狀態更新
                if (result.globalParams) {
                    setGlobalParams(result.globalParams);
                }
                
                return true;
            } else {
                // 失敗時也可能需要更新玩家狀態（如里程碑發布失敗會扣資源）
                const failedPlayer = result?.player || result?.updatedPlayer;
                if (failedPlayer) {
                    setPlayer(failedPlayer);
                }
                addMessage(result?.message || '行動失敗', result?.type || 'warning');
                return false;
            }
        } catch (error) {
            console.error(`Action ${action} error:`, error);
            addMessage(`執行失敗: ${error.message}`, 'danger');
            return false;
        }
    }, [player, globalParams, addMessage]);

    // 執行里程碑發布
    const handleMilestoneLaunch = useCallback((milestoneId) => {
        if (!player) {
            addMessage('遊戲未初始化', 'danger');
            return false;
        }
        
        const routing = MILESTONE_ACTION_ROUTING.launchMilestone;
        const engine = routing.engine();
        
        if (!engine) {
            addMessage('里程碑引擎未載入', 'danger');
            return false;
        }
        
        try {
            const result = routing.executor(engine, player, milestoneId, rivals, globalParams);
            
            if (result && result.success) {
                // executeMilestoneLaunch 返回 updatedPlayer 而非 player
                setPlayer(result.updatedPlayer || result.player);
                
                if (result.rivals) {
                    setRivals(result.rivals);
                }
                
                // 處理全局加成 (globalBonus)
                if (result.globalBonus) {
                    setGlobalParams(prev => {
                        const updated = { ...prev };
                        if (result.globalBonus.I_Hype) {
                            updated.I_Hype = Math.min(2.0, (updated.I_Hype || 1.0) + result.globalBonus.I_Hype);
                        }
                        return updated;
                    });
                    // 顯示全局加成訊息
                    if (result.globalBonus.description) {
                        addMessage(result.globalBonus.description, 'info');
                    }
                }
                
                if (result.message) {
                    addMessage(result.message, result.type || 'success');
                }
                
                // 顯示額外的里程碑訊息
                if (result.effects) {
                    result.effects.forEach(effect => {
                        addMessage(effect, 'info');
                    });
                }
                
                // 觸發 Tier 解鎖通知彈窗
                // 使用 result.tierUnlocked（由 executeMilestoneLaunch 返回）或 milestoneId
                const unlockedTier = result.tierUnlocked || milestoneId;
                if (typeof window.onTierUpgrade === 'function') {
                    window.onTierUpgrade(unlockedTier);
                }
                
                return true;
            } else {
                // 失敗時也要更新玩家狀態（扣除資源、增加失敗計數等）
                if (result?.updatedPlayer) {
                    setPlayer(result.updatedPlayer);
                }
                addMessage(result?.message || '里程碑發布失敗', result?.type || 'warning');
                return false;
            }
        } catch (error) {
            console.error('Milestone launch error:', error);
            addMessage(`里程碑發布失敗: ${error.message}`, 'danger');
            return false;
        }
    }, [player, rivals, globalParams, addMessage]);   
    
    // ==========================================
    // 回合結束邏輯
    // ==========================================
    
    /**
     * 處理回合結束
     */
    const handleEndTurn = useCallback(() => {
        // 檢查是否有玩家
        if (!player) {
            addMessage('遊戲尚未初始化', 'danger');
            return;
        }
        
        // 檢查必要的 Engine
        if (!window.TurnUpdateEngine || !window.TurnUpdateEngine.handleEndTurn) {
            addMessage('回合系統未就緒', 'danger');
            console.error('TurnUpdateEngine.handleEndTurn not available');
            return;
        }
        
        // 直接調用 game_handleEndTurn_engine.js 的完整整合版本
        const result = window.TurnUpdateEngine.handleEndTurn(player, rivals, globalParams);
        // 儲存結果供其他組件使用 (如 index.html 的 lastTurnData)
        window.__lastTurnResult = result;
        
        // 檢查執行結果
        if (!result.success) {
            // 處理錯誤
            if (result.messages && result.messages.length > 0) {
                result.messages.forEach(msg => {
                    addMessage(msg.text, msg.type);
                });
            } else {
                addMessage('回合處理失敗', 'danger');
            }
            return;
        }
        
        // 更新 React 狀態
        setPlayer(result.player);
        setRivals(result.rivals);
        setGlobalParams(result.globalParams);
        
        // 重置核心行動
        setCoreActionUsed(false);
        
        // 顯示所有訊息
        if (result.messages && Array.isArray(result.messages)) {
            result.messages.forEach(msg => {
                addMessage(msg.text, msg.type);
            });
        }
        
        // 處理結局
        if (result.ending) {
            setEnding(result.ending);
            setGamePhase('ended');
        }

    }, [player, rivals, globalParams, addMessage]);

    // 計算衍生數據
    const derived = React.useMemo(() => {
        if (!player || !globalParams) {
            return {
                total_pflops_reserve: 0,
                total_available_pflops: 0,
                active_pflops: 0,
                hr_cost: 0,
                inference_demand: 0,
                corporate_image: 0,
                finance_rating: 'N/A'
            };
        }
        
        // 使用 TurnUpdateEngine 或 StrategyEngine 的計算函數
        const calcFn = window.TurnUpdateEngine?.calculateDerivedStats || 
                      window.StrategyEngine?.calculateDerivedStats;
        
        if (calcFn) {
            return calcFn(player, globalParams);
        }
        
        // 回退計算
        const COSTS = window.GameConfig?.COSTS || {
            TURING_SALARY: 5,
            SENIOR_SALARY: 2,
            JUNIOR_SALARY: 0.5
        };
        
        const rented_locked = player.rented_pflops_contracts 
            ? player.rented_pflops_contracts.reduce((sum, c) => sum + c.amount, 0) 
            : 0;
        const total_locked = (player.locked_pflops || 0) + rented_locked;
        const total_reserve = (player.pflops || 0) + (player.cloud_pflops || 0);
        const total_available = Math.max(0, total_reserve - total_locked);
        
        return {
            total_pflops_reserve: total_reserve,
            total_locked_pflops: total_locked,
            total_available_pflops: total_available,
            active_pflops: total_available,
            hr_cost: (player.talent?.turing || 0) * COSTS.TURING_SALARY +
                    (player.talent?.senior || 0) * COSTS.SENIOR_SALARY +
                    (player.talent?.junior || 0) * COSTS.JUNIOR_SALARY,
            inference_demand: 0,
            corporate_image: ((player.hype || 0) * 0.4) + ((player.trust || 0) * 0.6),
            finance_rating: 'B'
        };
    }, [player, globalParams]);

    // 調試信息
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__gameDebug = {
                player,
                rivals,
                globalParams,
                derived,
                engines: {
                    GameEngine: !!window.GameEngine,
                    TurnUpdateEngine: !!window.TurnUpdateEngine,
                    StrategyEngine: !!window.StrategyEngine,
                    FinanceEngine: !!window.FinanceEngine,
                    AssetEngine: !!window.AssetEngine,
                    ProductEngine: !!window.ProductEngine,
                    MilestoneEngine: !!window.MilestoneEngine,
                    CommunityEngine: !!window.CommunityEngine,
                    ETFEngine: !!window.ETFEngine,
                    ComputeEngine: !!window.ComputeEngine,  // 新增
                    processTurnUpdates: !!window.GameEngine?.processTurnUpdates,
                }
            };
        }
    }, [player, rivals, globalParams, derived]);

    // 檢查系統就緒
    const systemReady = React.useMemo(() => {
        return !!(
            window.GameEngine &&
            window.TurnUpdateEngine &&
            window.GameEngine?.processTurnUpdates &&
            window.StrategyEngine
        );
    }, [isInitialized]);



        

    // ==========================================
    // 系統狀態檢查
    // ==========================================
    
    /**
     * 檢查所有子系統是否就緒
     */
    const checkSystemStatus = useMemo(() => {
        return {
            InitialStateEngine: !!window.InitialStateEngine,
            processTurnUpdates: !!window.GameEngine?.processTurnUpdates,
            StrategyEngine: !!window.StrategyEngine,
            FinanceEngine: !!window.FinanceEngine,
            AssetEngine: !!window.AssetEngine,
            MilestoneEngine: !!window.MilestoneEngine,
            RivalInvestmentEngine: !!window.RivalInvestmentEngine,
            TurnUpdateEngine: !!window.TurnUpdateEngine,
            ProductEngine: !!window.ProductEngine,
            EndingEngine: !!window.EndingEngine,
            ETFEngine: !!window.ETFEngine,
            CommunityEngine: !!window.CommunityEngine,
            RegionEngine: !!window.RegionEngine,  // 區域系統
            EventEngine: !!window.EventEngine,
            ComputeEngine: !!window.ComputeEngine,  // 新增
            allReady: !!(
                window.InitialStateEngine &&        
                window.GameEngine?.processTurnUpdates &&
                window.StrategyEngine &&
                window.FinanceEngine &&
                window.AssetEngine &&
                window.MilestoneEngine &&
                window.RivalInvestmentEngine &&
                window.TurnUpdateEngine &&
                window.ProductEngine &&
                window.EndingEngine &&
                window.CommunityEngine &&
                window.ComputeEngine  // 新增
            )
        };
    }, []); // 空依賴，只在組件掛載時檢查一次
    
    // ==========================================
    // 工具方法
    // ==========================================
    
    const calculateDerivedStats = useCallback((playerState, params) => {
        if (!playerState) return null;
        const calcFn = window.TurnUpdateEngine?.calculateDerivedStats || 
                      window.StrategyEngine?.calculateDerivedStats;
        if (calcFn) {
            return calcFn(playerState, params || globalParams);
        }
        return null;
    }, [globalParams]);
    
    const calculateDoomGauge = useCallback((playerState, rivalsState) => {
        if (!playerState) return null;
        if (window.EndingEngine?.calculateDoomGauge) {
            return window.EndingEngine.calculateDoomGauge(playerState, rivalsState || rivals);
        }
        return { commercial_ruin: 0, internal_unraveling: 0, external_sanction: 0 };
    }, [rivals]);
    
    const findRouteForAction = useCallback((action) => {
        return findActionRoute(action);
    }, []);
    
    // ==========================================
    // 返回狀態和方法
    // ==========================================
    
    return {
        // 遊戲狀態
        player,
        rivals,
        derived,
        globalParams,
        messages,
        ending,
        gamePhase,
        isInitialized,
        coreActionUsed,
        systemReady,
        
        // 狀態設置方法（供特殊情況使用）
        setPlayer,
        setEnding,
        setRivals,
        setGlobalParams,
        setGamePhase,
        
        // 核心操作方法
        addMessage,
        handleAction,
        handleEndTurn,
        initializeGame,
        handleMilestoneLaunch,
        clearMessages,
        
        // 工具方法
        checkSystemStatus,
        calculateDerivedStats,
        calculateDoomGauge,
        findRouteForAction
    };
};


// 掛載到全局（供 index.html 使用）
window.useGameState = useGameState;

console.log('✓ useGameState Hook loaded - with milestone message handling');
})();