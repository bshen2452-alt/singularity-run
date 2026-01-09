// ============================================
// 策略執行引擎
// ============================================
console.log("executeStrategy_engine.js loaded");
/**
 * 執行玩家策略行動
 * @param {Object} player - 玩家狀態
 * @param {string} actionId - 行動ID
 * @param {Object} globalParams - 全局參數
 * @param {Object} params - 行動參數
 * @returns {Object} 結果對象，包含新玩家狀態和訊息
 */
function executeStrategy(player, actionId, globalParams, params = {}) {
    // 深拷貝玩家狀態，避免直接修改
    let newPlayer = JSON.parse(JSON.stringify(player));
    let message = '';
    let messageType = 'info';
    let milestoneUnlocked = null;  // 追蹤是否解鎖里程碑

    // 聲明依賴
    const GameEng = window.GameEngine || {};
    const calculateDerivedStats = GameEng.calculateDerivedStats;
    
    const { COSTS } = window.GameConfig || {};
    const MilestoneEng = window.MilestoneEngine || {};
    const ProductEng = window.ProductEngine || {};
    
    switch (actionId) {
        case 'research': {
            // 全力研發邏輯
            const derived = calculateDerivedStats(newPlayer, globalParams);
            if (derived.active_pflops <= 0) {
                return {
                    success: false,
                    player: newPlayer,
                    message: '訓練可用算力為零，無法研發！',
                    type: 'danger'
                };
            }

            // 基礎成長計算
            const baseGrowth = (newPlayer.talent.turing * 4) + (newPlayer.talent.senior * 1);
            let computeMult = 1 + (derived.active_pflops / 10);

            // Scaling Law 路線加成
            if (newPlayer.route === 'Scaling Law') {
                const pflopsReserve = newPlayer.pflops + newPlayer.cloud_pflops;
                computeMult = 1 + Math.pow(pflopsReserve / 10, 1.2);
            }

            let growth = baseGrowth * computeMult * 0.5;
            
            // 應用創始人打工懲罰
            if (newPlayer.mp_penalty_next > 0) {
                growth *= (1 - newPlayer.mp_penalty_next);
            }
            
            // 應用商品系統專精度加成
            if (newPlayer.product_state && ProductEng && ProductEng.getMasteryMPBonus) {
                const masteryBonus = ProductEng.getMasteryMPBonus(newPlayer.product_state.mastery?.level || 0);
                growth *= (1 + (masteryBonus || 0));
            }

            // *** 里程碑 MP 上限檢查 ***
            let actualGrowth = growth;
            let cappedMessage = '';
            
            if (MilestoneEng.applyMPCapAndCheck) {
                const capResult = MilestoneEng.applyMPCapAndCheck(newPlayer, growth);
                
                if (capResult.cappedByMilestone) {
                    // MP 被里程碑門檻限制
                    actualGrowth = capResult.actualGrowth;
                    
                    // 設置里程碑準備狀態
                    if (!newPlayer.milestone_launch_ready) {
                        newPlayer.milestone_launch_ready = {};
                    }
                    newPlayer.milestone_launch_ready[capResult.nextTier] = true;
                    
                    cappedMessage = ` (已達 Tier ${capResult.nextTier} 門檻 MP${capResult.mpCap}，請發布里程碑解鎖上限！)`;
                    milestoneUnlocked = capResult.nextTier;
                }
                
                // 使用計算後的最終 MP
                newPlayer.model_power = capResult.finalMP;
            } else {
                // 回退邏輯：沒有里程碑引擎時直接應用
                newPlayer.model_power = Math.min(1005, newPlayer.model_power + growth);
            }
            
            const entropyChg = 5 + (actualGrowth * 0.2);
            newPlayer.entropy = Math.min(100, newPlayer.entropy + entropyChg);

            // 數據消耗
            const dataConsumed = Math.min(newPlayer.low_data, actualGrowth * 5 * 0.7);
            newPlayer.low_data = Math.max(0, newPlayer.low_data - dataConsumed);

            message = `研發推進！MP +${actualGrowth.toFixed(1)}, 熵值 +${entropyChg.toFixed(1)}${cappedMessage}`;
            messageType = cappedMessage ? 'warning' : 'success';
            break;
        }

        case 'alignment': {
            const turingBonus = newPlayer.talent.turing * 3;
            const entropyReduction = 15 + turingBonus;
            let alignIncrease = 8;

            // Efficiency 路線調整
            if (newPlayer.route === 'Efficiency') {
                alignIncrease = 4;
            }

            newPlayer.entropy = Math.max(0, newPlayer.entropy - entropyReduction);
            newPlayer.alignment = Math.min(100, newPlayer.alignment + alignIncrease);
            newPlayer.compliance_risk = Math.max(0, newPlayer.compliance_risk - 5);
            
            // alignment 也會有少量 MP 增長，需要檢查上限
            let mpGain = 1;
            if (MilestoneEng.applyMPCapAndCheck) {
                const capResult = MilestoneEng.applyMPCapAndCheck(newPlayer, mpGain);
                newPlayer.model_power = capResult.finalMP;
                
                if (capResult.cappedByMilestone && capResult.shouldUnlockLaunch) {
                    if (!newPlayer.milestone_launch_ready) {
                        newPlayer.milestone_launch_ready = {};
                    }
                    newPlayer.milestone_launch_ready[capResult.nextTier] = true;
                    milestoneUnlocked = capResult.nextTier;
                }
            } else {
                newPlayer.model_power = Math.min(1005, newPlayer.model_power + mpGain);
            }

            message = `安全對齊完成！熵值 -${entropyReduction}, 對齊度 +${alignIncrease}`;
            messageType = 'success';
            break;
        }

        case 'marketing': {
            const juniorBonus = newPlayer.talent.junior * 0.2;
            newPlayer.hype = newPlayer.hype + 15 + juniorBonus;
            newPlayer.trust = newPlayer.trust + 5 + (newPlayer.talent.junior * 0.1);
            
            message = `市場活動成功！Hype +${(15 + juniorBonus).toFixed(1)}`;
            messageType = 'success';
            break;
        }

        case 'special': {
            const route = newPlayer.route;
            switch (route) {
                case 'Scaling Law':
                    newPlayer.revenue_bonus += 30;
                    newPlayer.model_power = Math.max(1, newPlayer.model_power - 2);
                    message = 'API 訂閱擴張！長期收入 +$30M/季';
                    messageType = 'success';
                    break;
                    
                case 'Multimodal':
                    newPlayer.cash += 150;
                    newPlayer.compliance_risk = Math.min(100, newPlayer.compliance_risk + 15);
                    newPlayer.trust = Math.max(0, newPlayer.trust - 5);
                    message = '垂直專案完成！現金 +$150M，合規風險上升';
                    messageType = 'warning';
                    break;
                    
                case 'Efficiency':
                    newPlayer.cash += 80;
                    newPlayer.trust = Math.max(0, newPlayer.trust - 2);
                    message = '專利授權成功！現金 +$80M';
                    messageType = 'success';
                    break;
                    
                case 'Embodied': {
                    const amt = newPlayer.hype * 2 + (newPlayer.tech_levels['Embodied'] || 0) * 10;
                    newPlayer.cash += amt;
                    newPlayer.trust = Math.max(0, newPlayer.trust - 15);
                    newPlayer.hype += 10;
                    message = `機器人預售！現金 +$${amt.toFixed(1)}M`;
                    messageType = 'success';
                    break;
                }
                    
                case 'OpenSource':
                    newPlayer.revenue_bonus += 10;
                    newPlayer.trust = Math.max(0, newPlayer.trust - 5);
                    newPlayer.hype += 5;
                    message = '託管服務上線！長期收入 +$10M/季';
                    messageType = 'success';
                    break;
                    
                case 'Military':
                    newPlayer.cash += 300;
                    newPlayer.regulation = Math.min(100, newPlayer.regulation + 10);
                    newPlayer.trust = Math.max(0, newPlayer.trust - 20);
                    message = '國防撥款到帳！現金 +$300M，監管壓力上升';
                    messageType = 'warning';
                    break;
                    
                default:
                    message = '未知的技術路線';
                    messageType = 'danger';
            }
            break;
        }

        case 'setComputeStrategy': {
            if (newPlayer.mp_tier < 1) {
                return {
                    success: false,
                    player: newPlayer,
                    message: '需要完成 Tier 1 解鎖算力策略',
                    type: 'warning'
                };
            }
            
            const strategy = params.strategy;
            const validStrategies = ['ResearchFocus', 'ProductFocus', 'Balanced', 'CloudBursting'];
            
            if (validStrategies.includes(strategy)) {
                // 確保 product_state 存在
                if (!newPlayer.product_state) {
                    newPlayer.product_state = ProductEng.createInitialProductState ? 
                        ProductEng.createInitialProductState() : 
                        { compute_strategy: 'Balanced' };
                }
                
                // 統一使用 product_state.compute_strategy
                newPlayer.product_state.compute_strategy = strategy;
                
                // 獲取策略名稱用於顯示
                const strategyConfig = window.ProductConfig?.COMPUTE_STRATEGIES?.[strategy];
                const strategyName = strategyConfig?.name || strategy;
                message = `算力策略切換至：${strategyName}`;
                messageType = 'info';
            } else {
                message = '無效的策略選擇';
                messageType = 'danger';
            }
            break;
        }

        case 'startProductDev': {
            if (newPlayer.mp_tier < 1) {
                return {
                    success: false,
                    player: newPlayer,
                    message: '需要完成 Tier 1 解鎖商品開發',
                    type: 'warning'
                };
            }
            
            const productId = params.productId;
            
            if (!productId) {
                return {
                    success: false,
                    player: newPlayer,
                    message: '缺少產品ID參數',
                    type: 'danger'
                };
            }
            
            // 使用 ProductEngine.startDevelopment
            if (!ProductEng || !ProductEng.startDevelopment) {
                return {
                    success: false,
                    player: newPlayer,
                    message: '商品系統未載入',
                    type: 'danger'
                };
            }
            
            const result = ProductEng.startDevelopment(newPlayer, productId);
            if (result.success && result.player) {
                newPlayer = result.player;
            }
            message = result.message;
            messageType = result.success ? 'success' : 'warning';
            break;
        }

        default:
            return {
                success: false,
                player: player,
                message: '未知的行動類型',
                type: 'danger'
            };
    }

    return {
        success: true,
        player: newPlayer,
        message: message,
        type: messageType,
        milestoneUnlocked: milestoneUnlocked  // 返回解鎖的里程碑 tier（如果有）
    };
}

// ============================================
// 策略引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    // 註冊策略引擎到全局
    window.StrategyEngine = {
        executeStrategy
    };
    
    // 如果 GameEngine 已存在，也掛載到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.executeStrategy = executeStrategy;
    }
    
    console.log('✓ Strategy Engine loaded (with milestone cap)');
})();