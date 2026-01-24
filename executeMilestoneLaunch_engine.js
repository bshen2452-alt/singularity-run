// ============================================
// 里程碑系統引擎 (重新設計版)
// ============================================
// 設計邏輯：
// 1. checkMilestones 在玩家行動「前」檢查，返回 MP 上限
// 2. 當 MP 被門檻卡住時，自動設置 milestone_launch_ready
// 3. 玩家點擊發布按鈕執行 executeMilestoneLaunch

/**
 * 檢查下一個里程碑門檻，返回當前可達到的 MP 上限
 * 此函數應在「行動執行前」調用
 * @param {Object} player - 玩家狀態
 * @returns {Object} - { nextTier, mpCap, tierName, isCapped }
 */
function checkMilestones(player) {
    const MODEL_TIERS = GameConfig.COSTS.MODEL_TIERS;
    
    // 預設 player.mp_milestones 為空物件，避免讀取 undefined 屬性
    const playerMilestones = player.mp_milestones || {};
    
    // 找出下一個未完成的里程碑
    for (let tier = 1; tier <= 5; tier++) {
        const tierData = MODEL_TIERS[tier];
        if (!tierData) continue;
        
        // 檢查此里程碑是否已完成 (使用安全取值)
        if (playerMilestones[tier]) {
             continue; // 已完成，繼續檢查下一個
        }
        
        // 找到下一個未完成的里程碑
        return {
            nextTier: tier,
            mpCap: tierData.mp,
            tierName: tierData.name,
            // isCapped 判斷可以保留，但主要決策流程應仰賴 applyMPCapAndCheck 的計算
            isCapped: player.model_power >= tierData.mp 
        };
    }
    
    // 所有里程碑都完成了
    return {
        nextTier: null,
        // 如果所有里程碑都完成了，MP 上限應為最高值（例如 1000），確保不會被舊門檻鎖住
        mpCap: 1005, 
        tierName: null,
        isCapped: false
    };
}

/**
 * 計算行動後的 MP，並應用里程碑上限
 * @param {Object} player - 玩家狀態
 * @param {number} mpGrowth - 預計的 MP 增長量
 * @returns {Object} - { finalMP, actualGrowth, cappedByMilestone, nextTier }
 */
function applyMPCapAndCheck(player, mpGrowth) {
    const milestoneStatus = checkMilestones(player);
    const currentMP = player.model_power || 0;
    const projectedMP = currentMP + mpGrowth;
    
    let finalMP = projectedMP;
    let actualGrowth = mpGrowth;
    let cappedByMilestone = false;
    let shouldUnlockLaunch = false;
    
    // 檢查是否有下一個未完成的里程碑
    if (milestoneStatus.nextTier) {
        const mpCap = milestoneStatus.mpCap;

        // 條件 A: 尚未達到門檻，但本次行動會達到或超過門檻 (觸發鎖定)
        if (currentMP < mpCap && projectedMP >= mpCap) {
            finalMP = mpCap;
            actualGrowth = mpCap - currentMP; // 實際增長量只到門檻
            cappedByMilestone = true;
            shouldUnlockLaunch = true;

        // 條件 B: MP 已經在門檻或超過門檻，且本次行動嘗試增加 MP (MP 增加被阻止)
        } else if (currentMP >= mpCap && mpGrowth > 0) {
            // 已經被鎖住，嘗試增加 MP，實際增長量為 0
            finalMP = mpCap;
            actualGrowth = 0;
            cappedByMilestone = true;
            shouldUnlockLaunch = true; // 保持按鈕可發布

        // 條件 C: MP 已經被鎖住，但本次行動是減少 MP (允許減少)
        } else if (currentMP >= mpCap && mpGrowth < 0) {
            // MP 允許減少，但發布狀態不變
            shouldUnlockLaunch = true; 
            // finalMP 和 actualGrowth 已經被初始化為 projectedMP 和 mpGrowth，無需修改
        }
    }
    
    // 確保 finalMP 不會低於 0（除非遊戲機制允許負 MP）
    finalMP = Math.max(0, finalMP);
    
    return {
        finalMP: Math.max(currentMP, finalMP),  // 確保不會減少
        actualGrowth: Math.max(0, actualGrowth),
        cappedByMilestone,
        shouldUnlockLaunch,
        nextTier: milestoneStatus.nextTier,
        tierName: milestoneStatus.tierName,
        mpCap: milestoneStatus.mpCap
    };
}



/**
 * 執行里程碑發布
 * @param {Object} player - 玩家狀態
 * @param {number} tier - 里程碑等級 (1-5)
 * @returns {Object} - 執行結果
 */
function executeMilestoneLaunch(player, tier) {
    const updatedPlayer = JSON.parse(JSON.stringify(player));
    
    const data = GameConfig.COSTS.MODEL_TIERS[tier];
    if (!data) {
        return {
            success: false,
            message: `無效的里程碑等級: ${tier}`,
            updatedPlayer: player,
            globalBonus: null
        };
    }

    // 檢查是否已完成此里程碑
    if (updatedPlayer.mp_milestones && updatedPlayer.mp_milestones[tier]) {
        return {
            success: false,
            message: `里程碑 Tier ${tier} 已經完成`,
            updatedPlayer: player,
            globalBonus: null
        };
    }

    // 直接檢查 MP 是否達到門檻（移除對 milestone_launch_ready 的依賴）
    if (updatedPlayer.model_power < data.mp) {
        return {
            success: false,
            message: `MP 未達門檻（需要 ${data.mp}，當前 ${updatedPlayer.model_power.toFixed(1)}）`,
            updatedPlayer: player,
            globalBonus: null
        };
    }

    // 檢查前置里程碑
    if (tier > 1 && (!updatedPlayer.mp_milestones || !updatedPlayer.mp_milestones[tier - 1])) {
        return {
            success: false,
            message: `需要先完成 Tier ${tier - 1} 里程碑`,
            updatedPlayer: player,
            globalBonus: null
        };
    }

    // 計算成本（考慮失敗次數懲罰）
    if (!updatedPlayer.milestone_fail_count) {
        updatedPlayer.milestone_fail_count = {};
    }
    const failMult = 1 + (updatedPlayer.milestone_fail_count[tier] || 0) * 0.1;
    const costCash = 100 * failMult;
    const costData = 100 * failMult;

    // 檢查資源
    const totalData = (updatedPlayer.high_data || 0) + (updatedPlayer.low_data || 0);
    if (updatedPlayer.cash < costCash || totalData < costData) {
        return {
            success: false,
            message: `資源不足！需要 $${costCash.toFixed(1)}M 現金和 ${costData.toFixed(0)} 數據點`,
            updatedPlayer: player,
            globalBonus: null
        };
    }

    // 扣除資源
    updatedPlayer.cash -= costCash;
    // 優先消耗低品質數據
    const lowDataUsed = Math.min(updatedPlayer.low_data || 0, costData);
    updatedPlayer.low_data = Math.max(0, (updatedPlayer.low_data || 0) - lowDataUsed);
    const remainingCost = costData - lowDataUsed;
    if (remainingCost > 0) {
        updatedPlayer.high_data = Math.max(0, (updatedPlayer.high_data || 0) - remainingCost);
    }

    // 計算成功機率
    let baseProb = 60;
    const trustBonus = Math.min(20, ((updatedPlayer.trust || 0) / 100) * 10);
    const alignBonus = Math.min(20, ((updatedPlayer.alignment || 0) / 100) * 10);
    const entropyPenalty = Math.min(20, ((updatedPlayer.entropy || 0) / 100) * 20);
    const crPenalty = Math.min(20, ((updatedPlayer.compliance_risk || 0) / 100) * 15);
    
    // 商品專精度加成（如果有）
    let masteryBonus = 0;
    if (updatedPlayer.product_state?.mastery_level) {
        const ProductEng = window.ProductEngine || {};
        if (ProductEng.getMasteryMilestoneBonus) {
            masteryBonus = ProductEng.getMasteryMilestoneBonus(updatedPlayer.product_state.mastery_level);
        }
    }
    
    const successProb = Math.max(10, Math.min(95, 
        baseProb + trustBonus + alignBonus + masteryBonus - entropyPenalty - crPenalty
    ));

    const roll = Math.random() * 100;

    if (roll <= successProb) {
        // === 發布成功 ===
        if (!updatedPlayer.mp_milestones) {
            updatedPlayer.mp_milestones = {};
        }
        updatedPlayer.mp_milestones[tier] = true;
        updatedPlayer.milestone_launch_ready[tier] = false;  // 重置準備狀態
        updatedPlayer.milestone_fail_count[tier] = 0;
        updatedPlayer.mp_tier = tier;
        
        // 獎勵
        updatedPlayer.cash += data.reward;
        updatedPlayer.trust = Math.min(100, (updatedPlayer.trust || 0) + 10);
        updatedPlayer.hype = (updatedPlayer.hype || 0) + 15;
        updatedPlayer.revenue_bonus = (updatedPlayer.revenue_bonus || 0) + 20;
        updatedPlayer.market_cap = (updatedPlayer.market_cap || 100) * 1.15;

        // 全局加成
        const globalBonus = {
            I_Hype: 0.05 * tier,
            
            description: `${updatedPlayer.company_name || '玩家'} 發布 ${data.name}，市場信心提升！`
        };

        // Tier 1 特殊：初始化社群系統
        if (tier === 1) {
            if (window.CommunityEngine?.initializeCommunityState) {
                const communityInitResult = window.CommunityEngine.initializeCommunityState(updatedPlayer);
                updatedPlayer.community = communityInitResult.community;
                updatedPlayer.community_size = communityInitResult.community_size;
            } else {
                updatedPlayer.community = { size: 500, sentiment: 50, engagement: 40 };
                updatedPlayer.community_size = 500;
            }
        }
        
        // Tier 2 特殊：初始化空間系統
        if (tier === 2) {
            if (window.SpaceEngine?.initializeSpaceState) {
                const spaceResult = window.SpaceEngine.initializeSpaceState(updatedPlayer);
                if (spaceResult.space_state) {
                    updatedPlayer.space_state = spaceResult.space_state;
                }
                console.log('✓ Space system initialized for Tier 2');
            }
        }
        
        // 所有 Tier 的社群增長（Tier 1 已在上方處理）
        if (tier > 1) {
            const communityGains = { 2: 1500, 3: 5000, 4: 10000, 5: 25000 };
            const gain = communityGains[tier] || 0;
            if (updatedPlayer.community) {
                updatedPlayer.community.size = (updatedPlayer.community.size || 0) + gain;
                updatedPlayer.community_size = updatedPlayer.community.size;
            } else {
                updatedPlayer.community_size = (updatedPlayer.community_size || 0) + gain;
            }
        }
        

        return {
            success: true,
            updatedPlayer,
            message: `🎉 里程碑 Tier ${tier} (${data.name}) 發布成功！獲得 $${data.reward}M 獎金`,
            type: 'success',
            globalBonus,
            tierUnlocked: tier  // 標記解鎖的Tier等級
        };
        
    } else {
        // === 發布失敗 ===
        updatedPlayer.milestone_fail_count[tier] = (updatedPlayer.milestone_fail_count[tier] || 0) + 1;
        // 失敗不重置 milestone_launch_ready，玩家可以再試
        updatedPlayer.hype = Math.max(0, (updatedPlayer.hype || 0) - 20);
        updatedPlayer.trust = Math.max(0, (updatedPlayer.trust || 0) - 10);
        updatedPlayer.entropy = Math.min(100, (updatedPlayer.entropy || 0) + 15);

        return {
            success: false,
            message: `❌ 里程碑 Tier ${tier} (${data.name}) 發布失敗！資源已消耗，下次成本增加 10%`,
            updatedPlayer,
            type: 'danger',
            globalBonus: null
        };
    }
}

/**
 * 獲取里程碑發布的預估資訊
 * @param {Object} player - 玩家狀態
 * @param {number} tier - 里程碑等級
 * @returns {Object} - 發布資訊
 */
function getMilestoneLaunchInfo(player, tier) {
    const data = GameConfig.COSTS.MODEL_TIERS[tier];
    if (!data) return null;
    
    const failCount = (player.milestone_fail_count && player.milestone_fail_count[tier]) || 0;
    const failMult = 1 + failCount * 0.5;
    
    // 成功率計算
    let baseProb = 60;
    const trustBonus = Math.min(20, ((player.trust || 0) / 100) * 10);
    const alignBonus = Math.min(20, ((player.alignment || 0) / 100) * 10);
    const entropyPenalty = Math.min(20, ((player.entropy || 0) / 100) * 20);
    const crPenalty = Math.min(20, ((player.compliance_risk || 0) / 100) * 15);
    
    let masteryBonus = 0;
    if (player.product_state?.mastery_level && window.ProductEngine?.getMasteryMilestoneBonus) {
        masteryBonus = window.ProductEngine.getMasteryMilestoneBonus(player.product_state.mastery_level);
    }
    
    const successProb = Math.max(10, Math.min(95,
        baseProb + trustBonus + alignBonus + masteryBonus - entropyPenalty - crPenalty
    ));
    
    return {
        tier,
        name: data.name,
        mpRequired: data.mp,
        reward: data.reward,
        cashCost: 100 * failMult,
        dataCost: 100 * failMult,
        successProb: Math.round(successProb),
        failCount,
        canLaunch: (player.model_power >= data.mp) && !(player.mp_milestones?.[tier]),
        isCompleted: player.mp_milestones?.[tier] || false
    };
}

/**
 * 對手里程碑檢查（每回合自動執行）
 * 整合 RivalBehaviorEngine 的增強版
 */
function checkRivalMilestone(rival, globalParams) {
    // 優先使用 RivalBehaviorEngine
    if (window.RivalBehaviorEngine && window.RivalBehaviorEngine.processRivalMilestoneAttempt) {
        const result = window.RivalBehaviorEngine.processRivalMilestoneAttempt(rival);
        
        if (result.success === null) {
            return { rival: result.rival, milestoneEvent: null, globalBonus: null, marketAction: null };
        }
        
        let milestoneEvent = null;
        let globalBonus = null;
        const updatedRival = result.rival;
        
        // === 記錄里程碑事件到對手狀態 ===
        updatedRival.last_milestone_event = {
            type: result.success ? 'success' : 'failure',
            tier: result.tier,
            tierName: result.tierName,
            turn: rival.turn_count || 0
        };
        
        if (result.success) {
            globalBonus = {
                I_Hype: 0.03 * result.tier,
                description: `${rival.name} 發布 ${result.tierName}，市場信心提升`
            };
            
            milestoneEvent = {
                type: 'rival_milestone_success',
                rivalName: rival.name,
                tier: result.tier,
                tierName: result.tierName,
                message: `🏆 ${rival.name} 成功發布 ${result.tierName}！`,
                eventType: 'warning'
            };
        } else {
            milestoneEvent = {
                type: 'rival_milestone_fail',
                rivalName: rival.name,
                tier: result.tier,
                tierName: result.tierName,
                message: `⚠️ ${rival.name} 嘗試發布 ${result.tierName} 失敗`,
                eventType: 'info'
            };
        }
        
        return { rival: updatedRival, milestoneEvent, globalBonus, marketAction: result.marketAction };
    }
    
    // === 回退邏輯 ===
    const MODEL_TIERS = GameConfig.COSTS.MODEL_TIERS;
    let milestoneEvent = null;
    let globalBonus = null;
    
    if (!rival.mp_milestones) rival.mp_milestones = {};
    if (!rival.mp_tier) rival.mp_tier = 0;
    if (!rival.milestone_fail_count) rival.milestone_fail_count = {};
    
    const nextTier = rival.mp_tier + 1;
    if (nextTier > 5) return { rival, milestoneEvent: null, globalBonus: null };
    
    const tierData = MODEL_TIERS[nextTier];
    if (!tierData || rival.mp < tierData.mp) {
        return { rival, milestoneEvent: null, globalBonus: null };
    }
    
    // 對手達到門檻，自動嘗試發布
    const rivalStyle = rival.style || '平衡發展';
    let baseProb = 55;
    
    switch (rivalStyle) {
        case '極致擴張': baseProb = 50; break;
        case '安全優先': baseProb = 70; break;
        case '平衡發展': baseProb = 60; break;
        case '創意爆發': baseProb = 45; break;
        case '硬體重型': baseProb = 55; break;
        case '專業防禦': baseProb = 65; break;
    }
    
    const failCount = rival.milestone_fail_count[nextTier] || 0;
    const successProb = Math.max(20, baseProb - failCount * 10);
    const roll = Math.random() * 100;
    
    if (roll <= successProb) {
        rival.mp_milestones[nextTier] = true;
        rival.mp_tier = nextTier;
        rival.milestone_fail_count[nextTier] = 0;
        rival.hype = Math.min(150, (rival.hype || 0) + 10);
        rival.trust = Math.min(100, (rival.trust || 0) + 5);
        rival.market_cap = (rival.market_cap || 500) * 1.1;
        rival.just_achieved_milestone = true;  // 行為標記
        
        // === 記錄里程碑事件到對手狀態 ===
        rival.last_milestone_event = {
            type: 'success',
            tier: nextTier,
            tierName: tierData.name,
            turn: rival.turn_count || 0
        };
        
        globalBonus = {
            I_Hype: 0.03 * nextTier,
            description: `${rival.name} 發布 ${tierData.name}，市場信心提升`
        };
        
        milestoneEvent = {
            type: 'rival_milestone_success',
            rivalName: rival.name,
            tier: nextTier,
            tierName: tierData.name,
            message: `🏆 ${rival.name} 成功發布 ${tierData.name}！`,
            eventType: 'warning'
        };
    } else {
        rival.milestone_fail_count[nextTier] = failCount + 1;
        rival.mp = Math.max(tierData.mp, rival.mp - 1);  // 失敗後 MP 卡在門檻
        rival.hype = Math.max(0, (rival.hype || 0) - 10);
        rival.entropy = Math.min(100, (rival.entropy || 0) + 5);  // 失敗增加熵值
        rival.just_failed_milestone = true;  // 行為標記
        
        // === 記錄里程碑事件到對手狀態 ===
        rival.last_milestone_event = {
            type: 'failure',
            tier: nextTier,
            tierName: tierData.name,
            turn: rival.turn_count || 0
        };
        
        milestoneEvent = {
            type: 'rival_milestone_fail',
            rivalName: rival.name,
            tier: nextTier,
            tierName: tierData.name,
            message: `⚠️ ${rival.name} 嘗試發布 ${tierData.name} 失敗`,
            eventType: 'info'
        };
    }
    
    return { rival, milestoneEvent, globalBonus };
}

/**
 * 處理所有對手的里程碑檢查
 * 整合 RivalBehaviorEngine 的市場影響
 * @param {Array} rivals - 對手列表
 * @param {Object} globalParams - 全局參數
 * @returns {Object} - { rivals, events, globalBonuses, marketActions }
 */
function processRivalMilestones(rivals, globalParams) {
    const events = [];
    const globalBonuses = [];
    const marketActions = [];  // 收集市場影響
    
    const updatedRivals = rivals.map(rival => {
        const result = checkRivalMilestone({ ...rival }, globalParams);
        
        if (result.milestoneEvent) {
            events.push(result.milestoneEvent);
        }
        if (result.globalBonus) {
            globalBonuses.push(result.globalBonus);
        }
        // 收集市場影響（來自 RivalBehaviorEngine）
        if (result.marketAction) {
            marketActions.push(result.marketAction);
        }
        
        return result.rival;
    });
    
    return {
        rivals: updatedRivals,
        events: events,
        globalBonuses: globalBonuses,
        marketActions: marketActions
    };
}


/**
 * 獲取里程碑發布的預估成功率
 * @param {Object} player - 玩家狀態
 * @param {number} tier - 里程碑等級
 * @returns {Object} - { successProb, factors }
 */
function getMilestoneLaunchChance(player, tier) {
    let baseProb = 60;
    const trustBonus = Math.min(20, (player.trust / 100) * 10);
    const alignBonus = Math.min(20, ((player.alignment || 0) / 100) * 10);
    const entropyPenalty = Math.min(20, ((player.entropy || 0) / 100) * 20);
    const crPenalty = Math.min(20, ((player.compliance_risk || 0) / 100) * 15);
    
    const successProb = Math.max(10, Math.min(95, baseProb + trustBonus + alignBonus - entropyPenalty - crPenalty));
    
    return {
        successProb: successProb,
        factors: {
            base: baseProb,
            trustBonus: trustBonus,
            alignBonus: alignBonus,
            entropyPenalty: -entropyPenalty,
            crPenalty: -crPenalty
        }
    };
}

/**
 * 獲取里程碑發布的成本
 * @param {Object} player - 玩家狀態
 * @param {number} tier - 里程碑等級
 * @returns {Object} - { cashCost, dataCost, failMultiplier }
 */
function getMilestoneLaunchCost(player, tier) {
    const failCount = (player.milestone_fail_count && player.milestone_fail_count[tier]) || 0;
    const failMult = 1 + failCount * 0.5;
    
    return {
        cashCost: 100 * failMult,
        dataCost: 100 * failMult,
        failMultiplier: failMult,
        failCount: failCount
    };
}

// ============================================
// 里程碑引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    // 註冊里程碑引擎到全局
    window.MilestoneEngine = {
        // 核心功能
        checkMilestones,
        applyMPCapAndCheck,
        executeMilestoneLaunch,
        
        // 對手系統
        checkRivalMilestone,
        processRivalMilestones,
        
        // 輔助功能
        getMilestoneLaunchChance,
        getMilestoneLaunchCost
    };
    
    // 如果 GameEngine 已存在，也掛載到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.checkMilestones = checkMilestones;
        window.GameEngine.applyMPCapAndCheck = applyMPCapAndCheck;
        window.GameEngine.executeMilestoneLaunch = executeMilestoneLaunch;
        window.GameEngine.processRivalMilestones = processRivalMilestones;
    }
    
    console.log('✓ Milestone Engine loaded (with checkMilestones, rival milestones, global bonus)');
})();