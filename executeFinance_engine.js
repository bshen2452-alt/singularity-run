// ============================================
// 財務執行引擎
// ============================================

/**
 * 執行財務行動
 * @param {Object} player - 玩家狀態
 * @param {string} actionId - 財務行動ID
 * @param {Object} params - 行動參數
 * @returns {Object} 結果對象，包含新玩家狀態和訊息
 */
function executeFinance(player, actionId, params = {}) {
    // 深拷貝玩家狀態
    let newPlayer = JSON.parse(JSON.stringify(player));
    let message = '';
    let messageType = 'info';
    
    const { COSTS, FINANCE_ACTIONS } = GameConfig;
    
    // 初始化財務系統
    if (!newPlayer.finance_cooldowns) {
        newPlayer.finance_cooldowns = {};
    }
    if (!newPlayer.poc_contracts) {
        newPlayer.poc_contracts = [];
    }
    if (!newPlayer.industry_contracts) {
        newPlayer.industry_contracts = [];
    }
    if (!newPlayer.rival_investments) {
        newPlayer.rival_investments = {};
    }
    
    // Junior人才加成計算
    const juniorCount = newPlayer.talent?.junior || 0;
    const juniorBonus = Math.min(juniorCount * 0.05, 0.25);
    const bonusMultiplier = 1 + juniorBonus;
    
    // 查找行動配置
    let actionConfig = null;
    for (const tier of ['tier0', 'tier1', 'tier2', 'tier3']) {
        if (FINANCE_ACTIONS[tier] && FINANCE_ACTIONS[tier][actionId]) {
            actionConfig = FINANCE_ACTIONS[tier][actionId];
            break;
        }
    }
    
    if (!actionConfig || !actionId){
        return {
            success: false,
            player: player,
            message: '未知的財務行動',
            type: 'danger'
        };
    }
    
    // 安全檢查：確保 effects 存在
    if (!actionConfig.effects) {
        return {
            success: false,
            player: player,
            message: (actionConfig.name || actionId) + " 配置錯誤",
            type: "danger"
        };
    }

    // 檢查冷卻時間
    if (newPlayer.finance_cooldowns[actionId] > 0) {
        return {
            success: false,
            player: player,
            message: `${actionConfig.name} 正在冷卻中，還剩 ${newPlayer.finance_cooldowns[actionId]} 回合`,
            type: 'warning'
        };
    }
    
    // 執行財務行動
    switch (actionId) {
        case 'founderWork': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            newPlayer.cash += cashGain;
            newPlayer.mp_penalty_next = effects.mp_penalty;
            
            message = `創始人打工！現金 +$${cashGain.toFixed(0)}M，下季MP成長降低`;
            messageType = 'warning';
            break;
        }
        
        case 'pocContract': {
            const effects = actionConfig.effects;
            // 安全取得收入值（支援兩種欄位名稱）
            const baseCash = effects.cash_per_quarter || effects.cash || 0;
            const incomePerQuarter = baseCash * bonusMultiplier;
            
            // 檢查可用算力
            const availablePflops = newPlayer.pflops - (newPlayer.locked_pflops || 0);
            if (availablePflops < effects.pflops_lock) {
                return {
                    success: false,
                    player: player,
                    message: `可用算力不足，需要 ${effects.pflops_lock} PFLOPS`,
                    type: 'danger'
                };
            }
            
            newPlayer.poc_contracts.push({
                remaining: effects.duration,
                income: incomePerQuarter,
                pflops_locked: effects.pflops_lock
            });
            newPlayer.locked_pflops = (newPlayer.locked_pflops || 0) + effects.pflops_lock;
            
            message = `簽訂PoC合約！每季收入 $${incomePerQuarter.toFixed(0)}M，持續${effects.duration}季`;
            messageType = 'success';
            break;
        }
        
        case 'betaPresale': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            newPlayer.cash += cashGain;
            newPlayer.hype = (newPlayer.hype || 0) + effects.hype;
            newPlayer.regulation = (newPlayer.regulation || 0) + effects.regulation;
            
            message = `預售Beta成功！現金 +$${cashGain.toFixed(0)}M`;
            messageType = 'success';
            break;
        }
        
        case 'applyGrant': {
            const effects = actionConfig.effects;
            const trustFactor = Math.min(100, newPlayer.trust || 0) / 100;
            const baseSuccessRate = 0.3 + trustFactor * 0.5;
            const juniorSuccessBonus = juniorCount * 0.02;
            const finalSuccessRate = Math.min(0.9, baseSuccessRate + juniorSuccessBonus);
            
            const success = Math.random() < finalSuccessRate;
            
            if (success) {
                const grantAmount = effects.cash_min + Math.random() * (effects.cash_max - effects.cash_min);
                const finalAmount = grantAmount * bonusMultiplier;
                newPlayer.cash += finalAmount;
                message = `獎助金申請成功！獲得 $${finalAmount.toFixed(0)}M`;
                messageType = 'success';
            } else {
                message = '獎助金申請失敗，下次再試吧';
                messageType = 'warning';
            }
            break;
        }
        
        case 'emergencyLoan': {
            const effects = actionConfig.effects;
            
            // 檢查使用條件（現金低於30M）
            if (newPlayer.cash > 30) {
                return {
                    success: false,
                    player: player,
                    message: '只有在現金低於$30M時才能使用緊急貸款',
                    type: 'warning'
                };
            }
            
            const debtReduction = juniorCount * 3; // Junior人才減免
            const finalDebt = Math.max(0, effects.debt - debtReduction);
            
            newPlayer.cash += effects.cash;
            newPlayer.debt += finalDebt;
            
            message = `緊急貸款！現金 +$${effects.cash}M，債務 +$${finalDebt}M`;
            messageType = 'danger';
            break;
        }
        
        case 'fundraise': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            newPlayer.cash += cashGain;
            newPlayer.hype = (newPlayer.hype || 0) + effects.hype;
            newPlayer.regulation = (newPlayer.regulation || 0) + effects.regulation;
            newPlayer.stock_dilution = (newPlayer.stock_dilution || 1) * effects.stock_dilution;
            
            message = `融資成功！現金 +$${cashGain.toFixed(0)}M`;
            messageType = 'success';
            break;
        }
        
        case 'corporateBond': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            // 計算信用溢價
            let bondPremium = 0;
            const CreditEng = window.CreditEngine || {};
            if (CreditEng.getCreditRatingInfo) {
                const creditInfo = CreditEng.getCreditRatingInfo(newPlayer, params.globalParams);
                bondPremium = creditInfo.bondPremium || 0;
                if (creditInfo.junkBondOnly) {
                    return {
                        success: false,
                        player: player,
                        message: '信用評級過低，只能發行垃圾債券',
                        type: 'warning'
                    };
                }
            }
            
            const actualDebt = effects.debt * (1 + bondPremium);
            newPlayer.cash += cashGain;
            newPlayer.debt = (newPlayer.debt || 0) + actualDebt;
            
            const premiumText = bondPremium > 0 ? ' (含信用溢價)' : '';
            message = '公司債發行！現金 +$' + cashGain.toFixed(0) + 'M，債務 +$' + actualDebt.toFixed(0) + 'M' + premiumText;
            messageType = 'warning';
            break;
        }

        case 'junkBond': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            let bondPremium2 = 0;
            const CreditEng2 = window.CreditEngine || {};
            if (CreditEng2.getCreditRatingInfo) {
                const creditInfo2 = CreditEng2.getCreditRatingInfo(newPlayer, params.globalParams);
                bondPremium2 = (creditInfo2.bondPremium || 0) * 0.5;
            }
            
            const actualDebt2 = effects.debt * (1 + bondPremium2);
            newPlayer.cash += cashGain;
            newPlayer.debt = (newPlayer.debt || 0) + actualDebt2;
            newPlayer.hype = Math.max(0, (newPlayer.hype || 0) - 5);
            
            message = '垃圾債發行！現金 +$' + cashGain.toFixed(0) + 'M，債務 +$' + actualDebt2.toFixed(0) + 'M，Hype -5';
            messageType = 'danger';
            break;
        }
        

        case 'absLoan': {
            const effects = actionConfig.effects;
            const absAmount = params.amount || 1;
            const maxPflops = newPlayer.pflops - (newPlayer.locked_pflops || 0);
            const actualAmount = Math.min(absAmount, maxPflops);
            
            if (actualAmount <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '沒有可用算力進行抵押',
                    type: 'danger'
                };
            }
            
            const cashGain = actualAmount * effects.cash_per_pflops;
            const debtGain = actualAmount * effects.debt_per_pflops;
            
            newPlayer.cash += cashGain;
            newPlayer.debt = (newPlayer.debt || 0) + debtGain;
            newPlayer.locked_pflops = (newPlayer.locked_pflops || 0) + actualAmount;
            
            message = `ABS貸款！現金 +$${cashGain.toFixed(0)}M，鎖定${actualAmount}PFLOPS`;
            messageType = 'warning';
            break;
        }
        
        case 'ipo': {
            if (newPlayer.is_public) {
                return {
                    success: false,
                    player: player,
                    message: '公司已經上市',
                    type: 'warning'
                };
            }
            
            const effects = actionConfig.effects;
            
            // 整合信用評級對IPO的影響
            let ipoMultiplier = 1.0;
            const CreditEngIPO = window.CreditEngine || {};
            if (CreditEngIPO.getCreditRatingInfo) {
                const creditInfoIPO = CreditEngIPO.getCreditRatingInfo(newPlayer, params.globalParams);
                ipoMultiplier = creditInfoIPO.ipoMultiplier || 1.0;
                if (!creditInfoIPO.canIPO || ipoMultiplier <= 0) {
                    return {
                        success: false,
                        player: player,
                        message: '信用評級過低（' + creditInfoIPO.rating + '），無法進行IPO',
                        type: 'danger'
                    };
                }
            }
            
            const ipoAmount = (newPlayer.market_cap || 500) * effects.cash_multiplier * ipoMultiplier * bonusMultiplier;
            
            newPlayer.cash += ipoAmount;
            newPlayer.hype = (newPlayer.hype || 0) + effects.hype;
            newPlayer.regulation = (newPlayer.regulation || 0) + (effects.regulation || 0);
            newPlayer.is_public = true;
            
            const ratingBonus = ipoMultiplier > 1 ? ' (信用加成)' : (ipoMultiplier < 1 ? ' (信用折扣)' : '');
            message = 'IPO上市成功！獲得 $' + ipoAmount.toFixed(0) + 'M' + ratingBonus + '，股票功能開啟！';
            messageType = 'success';
            break;
        }
        
        case 'stockIssue': {
            if (!newPlayer.is_public) {
                return {
                    success: false,
                    player: player,
                    message: '公司尚未上市，無法增發新股',
                    type: 'warning'
                };
            }
            
            const effects = actionConfig.effects;
            const issueAmount = (newPlayer.market_cap || 500) * effects.cash_multiplier;
            
            newPlayer.cash += issueAmount;
            newPlayer.stock_dilution = (newPlayer.stock_dilution || 1) * effects.stock_dilution;
            newPlayer.hype = Math.max(0, (newPlayer.hype || 0) + effects.hype);
            
            message = `增發新股！現金 +$${issueAmount.toFixed(0)}M`;
            messageType = 'success';
            break;
        }
        
        case 'stockBuyback': {
            if (!newPlayer.is_public) {
                return {
                    success: false,
                    player: player,
                    message: '公司尚未上市，無法回購股票',
                    type: 'warning'
                };
            }
            
            const effects = actionConfig.effects;
            if (newPlayer.cash < effects.cash_cost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${effects.cash_cost}M`,
                    type: 'danger'
                };
            }
            
            const hypeBonus = juniorCount * 3;
            
            newPlayer.cash -= effects.cash_cost;
            newPlayer.hype = (newPlayer.hype || 0) + effects.hype + hypeBonus;
            newPlayer.stock_dilution = (newPlayer.stock_dilution || 1) * effects.stock_dilution;
            
            message = `股票回購！Hype +${effects.hype + hypeBonus}`;
            messageType = 'success';
            break;
        }
        
        case 'convertibleBond': {
            if (!newPlayer.is_public) {
                return {
                    success: false,
                    player: player,
                    message: '公司尚未上市，無法發行可轉債',
                    type: 'warning'
                };
            }
            
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            newPlayer.cash += cashGain;
            newPlayer.debt = (newPlayer.debt || 0) + effects.debt;
            newPlayer.stock_dilution = (newPlayer.stock_dilution || 1) * effects.stock_dilution;
            
            message = `可轉債發行！現金 +$${cashGain.toFixed(0)}M`;
            messageType = 'warning';
            break;
        }
        
        case 'acquisition': {
            const effects = actionConfig.effects;
            const costReduction = juniorCount * 10;
            const finalCost = Math.max(0, effects.cash_cost - costReduction);
            
            if (newPlayer.cash < finalCost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${finalCost}M`,
                    type: 'danger'
                };
            }
            
            newPlayer.cash -= finalCost;
            newPlayer.model_power = (newPlayer.model_power || 0) + effects.mp_boost;
            newPlayer.talent.senior = (newPlayer.talent.senior || 0) + effects.senior;
            newPlayer.talent.junior = (newPlayer.talent.junior || 0) + effects.junior;
            
            message = `併購成功！MP +${effects.mp_boost}，獲得 ${effects.senior}名資深、${effects.junior}名初級人才`;
            messageType = 'success';
            break;
        }
        
        case 'industryContract': {
            const effects = actionConfig.effects;
            const revenueBonus = effects.revenue_bonus * bonusMultiplier;
            
            newPlayer.revenue_bonus = (newPlayer.revenue_bonus || 0) + revenueBonus;
            newPlayer.trust = (newPlayer.trust || 0) + effects.trust;
            
            newPlayer.industry_contracts.push({
                remaining: effects.duration,
                bonus: revenueBonus
            });
            
            message = `產業合約簽訂！收入加成 +$${revenueBonus.toFixed(0)}M/季，持續${effects.duration}季`;
            messageType = 'success';
            break;
        }
        
        case 'repayDebt': {
            const repayAmt = Math.min(params.amount || 0, newPlayer.cash, newPlayer.debt);
            
            if (repayAmt <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '無法償還債務，檢查金額、現金或債務',
                    type: 'warning'
                };
            }
            
            newPlayer.cash -= repayAmt;
            newPlayer.debt -= repayAmt;
            
            // 償還債務時解鎖部分算力
            if (newPlayer.locked_pflops > 0 && newPlayer.debt > 0) {
                const unlock = Math.min(repayAmt / 20, newPlayer.locked_pflops);
                newPlayer.locked_pflops = Math.max(0, newPlayer.locked_pflops - unlock);
            }
            
            message = `償還債務 $${repayAmt.toFixed(1)}M`;
            messageType = 'success';
            break;
        }
        
        case 'buyPflops': {
            const quantity = params.quantity || 0;
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定購買數量',
                    type: 'warning'
                };
            }
            
            const cost = quantity * COSTS.PFLOPS_UNIT_PRICE * (globalParams?.P_GPU || 1);
            if (newPlayer.cash < cost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${cost.toFixed(1)}M`,
                    type: 'danger'
                };
            }
            
            newPlayer.cash -= cost;
            newPlayer.pflops += quantity;
            
            message = `採購 ${quantity} PFLOPS！`;
            messageType = 'success';
            break;
        }
        
        case 'rentCloud': {
            const quantity = params.quantity || 0;
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定租賃數量',
                    type: 'warning'
                };
            }
            
            newPlayer.cloud_pflops += quantity;
            message = `租賃雲端算力 +${quantity} PFLOPS`;
            messageType = 'info';
            break;
        }
        
        case 'sellPflops': {
            const quantity = params.quantity || 0;
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定出售數量',
                    type: 'warning'
                };
            }
            
            const sellable = newPlayer.pflops - (newPlayer.locked_pflops || 0) - 
                           (newPlayer.rented_pflops_contracts?.reduce((s, c) => s + c.amount, 0) || 0);
            const qty = Math.min(quantity, sellable);
            
            if (qty <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '沒有可出售的算力',
                    type: 'warning'
                };
            }
            
            const gain = qty * COSTS.PFLOPS_UNIT_PRICE * COSTS.PFLOPS_RESALE_RATE;
            newPlayer.cash += gain;
            newPlayer.pflops -= qty;
            
            message = `出售 ${qty} PFLOPS，獲得 $${gain.toFixed(1)}M`;
            messageType = 'success';
            break;
        }
        
        case 'hireTalent': {
            const type = params.type;
            if (!['turing', 'senior', 'junior'].includes(type)) {
                return {
                    success: false,
                    player: player,
                    message: '無效的人才類型',
                    type: 'danger'
                };
            }
            
            const costs = { turing: 50, senior: 10, junior: 2 };
            const cost = costs[type];
            
            if (newPlayer.cash < cost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${cost}M`,
                    type: 'danger'
                };
            }
            
            newPlayer.cash -= cost;
            newPlayer.talent[type] = (newPlayer.talent[type] || 0) + 1;
            
            message = `招聘 ${type} +1`;
            messageType = 'success';
            break;
        }
        
        case 'buyHighData': {
            const quantity = params.quantity || 0;
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定購買數量',
                    type: 'warning'
                };
            }
            
            const cost = quantity * COSTS.HIGH_DATA_UNIT_PRICE;
            if (newPlayer.cash < cost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${cost.toFixed(1)}M`,
                    type: 'danger'
                };
            }
            
            newPlayer.cash -= cost;
            newPlayer.high_data += quantity;
            newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + 1 * (quantity / 50));
            newPlayer.compliance_risk = Math.min(100, (newPlayer.compliance_risk || 0) + 3 * (quantity / 100));
            
            message = `採購高級數據 +${quantity}`;
            messageType = 'success';
            break;
        }
        
        case 'buyLowData': {
            const quantity = params.quantity || 0;
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定購買數量',
                    type: 'warning'
                };
            }
            
            const cost = quantity * COSTS.LOW_DATA_UNIT_PRICE;
            if (newPlayer.cash < cost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${cost.toFixed(1)}M`,
                    type: 'danger'
                };
            }
            
            newPlayer.cash -= cost;
            newPlayer.low_data += quantity;
            newPlayer.entropy = Math.min(100, (newPlayer.entropy || 0) + 2 * (quantity / 100));
            
            message = `採購低級數據 +${quantity}`;
            messageType = 'success';
            break;
        }
        
        default:
            return {
                success: false,
                player: player,
                message: '未知的財務行動',
                type: 'danger'
            };
    }
    
    // 設置冷卻時間
    if (actionConfig.cooldown > 0) {
        newPlayer.finance_cooldowns[actionId] = actionConfig.cooldown;
    }
    
    return {
        success: true,
        player: newPlayer,
        message: message,
        type: messageType,
        actionId: actionId,
        cooldown: actionConfig.cooldown || 0
    };
}

// ============================================
// 財務冷卻更新函數
// ============================================

/**
 * 更新財務行動的冷卻時間
 * @param {Object} player - 玩家狀態
 * @returns {Object} 更新後的玩家狀態
 */
function updateFinanceCooldowns(player) {
    const newPlayer = JSON.parse(JSON.stringify(player));
    
    if (!newPlayer.finance_cooldowns) {
        newPlayer.finance_cooldowns = {};
        return newPlayer;
    }
    
    // 減少所有冷卻時間
    Object.keys(newPlayer.finance_cooldowns).forEach(actionId => {
        if (newPlayer.finance_cooldowns[actionId] > 0) {
            newPlayer.finance_cooldowns[actionId]--;
        }
    });
    
    return newPlayer;
}

// ============================================
// 合約處理函數
// ============================================

/**
 * 處理季度合約結算
 * @param {Object} player - 玩家狀態
 * @returns {Object} 包含現金收入和更新後狀態的結果
 */
function processQuarterlyContracts(player) {
    const newPlayer = JSON.parse(JSON.stringify(player));
    let totalCashIncome = 0;
    const messages = [];
    
    // 處理PoC合約
    if (newPlayer.poc_contracts && newPlayer.poc_contracts.length > 0) {
        let pocIncome = 0;
        newPlayer.poc_contracts = newPlayer.poc_contracts.filter(contract => {
            if (contract.remaining > 0) {
                pocIncome += contract.income;
                contract.remaining--;
                
                if (contract.remaining <= 0) {
                    // 合約到期，解鎖算力
                    newPlayer.locked_pflops = Math.max(0, (newPlayer.locked_pflops || 0) - contract.pflops_locked);
                    messages.push(`PoC合約到期，解鎖${contract.pflops_locked} PFLOPS`);
                }
                return true;
            }
            return false;
        });
        
        if (pocIncome > 0) {
            totalCashIncome += pocIncome;
            messages.push(`PoC合約收入: +$${pocIncome.toFixed(0)}M`);
        }
    }
    
    // 處理產業合約
    if (newPlayer.industry_contracts && newPlayer.industry_contracts.length > 0) {
        newPlayer.industry_contracts = newPlayer.industry_contracts.filter(contract => {
            contract.remaining--;
            if (contract.remaining <= 0) {
                newPlayer.revenue_bonus = Math.max(0, (newPlayer.revenue_bonus || 0) - contract.bonus);
                messages.push(`產業合約到期，收入加成 -$${contract.bonus}M/季`);
                return false;
            }
            return true;
        });
    }
    
    // 應用現金收入
    newPlayer.cash += totalCashIncome;
    
    return {
        player: newPlayer,
        cashIncome: totalCashIncome,
        messages: messages
    };
}

// ============================================
// 財務引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    // 註冊財務引擎到全局
    window.FinanceEngine = {
        executeFinance,
        updateFinanceCooldowns,
        processQuarterlyContracts,

    };
    
    // 如果 GameEngine 已存在，也掛載到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.executeFinance = executeFinance;
        window.GameEngine.updateFinanceCooldowns = updateFinanceCooldowns;
        window.GameEngine.processQuarterlyContracts = processQuarterlyContracts;
    }
    
    console.log('✓ Finance Engine loaded');
})();