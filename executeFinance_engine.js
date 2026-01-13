// ============================================
// 財務執行引擎 (Finance Engine)
// ============================================
// 設計：純函數式，僅接收數據參數/返回計算結果
// 功能：執行財務行動，整合信用評級與股權機制

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
    
    // 支持 window.GameConfig 或全局 GameConfig
    const config = window.GameConfig || (typeof GameConfig !== 'undefined' ? GameConfig : null);
    const FINANCE_ACTIONS = config?.FINANCE_ACTIONS;
    const COSTS = config?.COSTS;
    
    if (!FINANCE_ACTIONS) {
        console.error('FINANCE_ACTIONS not found in GameConfig');
        return { success: false, player, message: '遊戲配置未載入', type: 'danger' };
    }
    
    // 初始化財務系統
    if (!newPlayer.finance_cooldowns) newPlayer.finance_cooldowns = {};
    if (!newPlayer.poc_contracts) newPlayer.poc_contracts = [];
    if (!newPlayer.industry_contracts) newPlayer.industry_contracts = [];
    if (!newPlayer.rival_investments) newPlayer.rival_investments = {};
    
    // Junior人才加成計算
    const juniorCount = newPlayer.talent?.junior || 0;
    const juniorBonus = Math.min(juniorCount * 0.05, 0.25);
    const bonusMultiplier = 1 + juniorBonus;
    
    // 獲取信用評級資訊
    const globalParams = params.globalParams || {};
    const creditInfo = window.CreditEngine?.getCreditRatingInfo(newPlayer, globalParams) || {};
    
    // 查找行動配置
    let actionConfig = null;
    for (const tier of ['tier0', 'tier1', 'tier2', 'tier3']) {
        if (FINANCE_ACTIONS[tier] && FINANCE_ACTIONS[tier][actionId]) {
            actionConfig = FINANCE_ACTIONS[tier][actionId];
            break;
        }
    }
    
    if (!actionConfig || !actionId) {
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
            message: (actionConfig.name || actionId) + ' 配置錯誤',
            type: 'danger'
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
        // ==========================================
        // Tier 0 - 基礎行動
        // ==========================================
        
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
            
            // 根據信用評級調整債務
            const bondPremium = creditInfo.bondPremium || 0;
            const baseDebt = effects.debt || (effects.cash * 1.5);
            const actualDebt = baseDebt * (1 + bondPremium);
            
            newPlayer.cash += effects.cash;
            newPlayer.debt = (newPlayer.debt || 0) + actualDebt;
            
            message = `緊急貸款！現金 +$${effects.cash}M，債務 +$${actualDebt.toFixed(0)}M`;
            messageType = 'danger';
            break;
        }
        
        case 'repayDebt': {
            const repayAmount = params.amount || Math.min(newPlayer.cash, newPlayer.debt || 0);
            
            if (repayAmount <= 0 || newPlayer.cash < repayAmount) {
                return {
                    success: false,
                    player: player,
                    message: '現金不足以償還債務',
                    type: 'warning'
                };
            }
            
            if ((newPlayer.debt || 0) <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '沒有需要償還的債務',
                    type: 'info'
                };
            }
            
            const actualRepay = Math.min(repayAmount, newPlayer.debt);
            newPlayer.cash -= actualRepay;
            newPlayer.debt = Math.max(0, (newPlayer.debt || 0) - actualRepay);
            
            message = `償還債務 $${actualRepay.toFixed(0)}M，剩餘債務 $${newPlayer.debt.toFixed(0)}M`;
            messageType = 'success';
            break;
        }

        // ==========================================
        // Tier 1 - 債券類（整合信用評級）
        // ==========================================
        
        case 'corporateBond': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            // 信用評級影響
            const bondPremium = creditInfo.bondPremium || 0;
            
            if (creditInfo.junkBondOnly) {
                return {
                    success: false,
                    player: player,
                    message: '信用評級過低，只能發行垃圾債券',
                    type: 'warning'
                };
            }
            
            const actualDebt = effects.debt * (1 + bondPremium);
            newPlayer.cash += cashGain;
            newPlayer.debt = (newPlayer.debt || 0) + actualDebt;
            
            const premiumText = bondPremium > 0 ? ` (含${(bondPremium * 100).toFixed(0)}%信用溢價)` : '';
            message = `發行公司債！現金 +$${cashGain.toFixed(0)}M，債務 +$${actualDebt.toFixed(0)}M${premiumText}`;
            messageType = 'success';
            break;
        }
        
        case 'convertibleBond': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            if (actionConfig.requiresIPO && !newPlayer.is_public && !newPlayer.equity_state?.is_public) {
                return {
                    success: false,
                    player: player,
                    message: '需要先完成IPO才能發行可轉債',
                    type: 'warning'
                };
            }
            
            const bondPremium = creditInfo.bondPremium || 0;
            const actualDebt = effects.debt * (1 + bondPremium * 0.7); // 可轉債溢價較低
            
            newPlayer.cash += cashGain;
            newPlayer.debt = (newPlayer.debt || 0) + actualDebt;
            
            // 股權稀釋效果
            if (effects.stock_dilution && newPlayer.equity_state) {
                const dilutionPercent = (effects.stock_dilution - 1) * 100;
                newPlayer.equity_state.founder_shares *= (2 - effects.stock_dilution);
                newPlayer.equity_state = normalizeEquityShares(newPlayer.equity_state);
            }
            
            message = `發行可轉債！現金 +$${cashGain.toFixed(0)}M，債務 +$${actualDebt.toFixed(0)}M`;
            messageType = 'success';
            break;
        }
        
        case 'absLoan': {
            const effects = actionConfig.effects;
            const pflops = newPlayer.pflops || 0;
            const availablePflops = pflops - (newPlayer.locked_pflops || 0);
            
            if (availablePflops <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '沒有可用算力作為抵押',
                    type: 'danger'
                };
            }
            
            const cashGain = availablePflops * effects.cash_per_pflops * bonusMultiplier;
            const debtGain = availablePflops * effects.debt_per_pflops;
            
            newPlayer.cash += cashGain;
            newPlayer.debt = (newPlayer.debt || 0) + debtGain;
            newPlayer.locked_pflops = pflops; // 全部鎖定
            
            message = `ABS貸款！現金 +$${cashGain.toFixed(0)}M，債務 +$${debtGain.toFixed(0)}M`;
            messageType = 'warning';
            break;
        }
        
        case 'junkBond': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            // 垃圾債的溢價計算
            const bondPremium = creditInfo.bondPremium || 0;
            const junkPremium = Math.max(bondPremium * 0.5, 0.2); // 垃圾債至少有20%溢價
            const actualDebt = effects.debt * (1 + junkPremium);
            
            newPlayer.cash += cashGain;
            newPlayer.debt = (newPlayer.debt || 0) + actualDebt;
            newPlayer.hype = Math.max(0, (newPlayer.hype || 0) - 5);
            
            message = `發行垃圾債券！現金 +$${cashGain.toFixed(0)}M，債務 +$${actualDebt.toFixed(0)}M ⚠️高風險`;
            messageType = 'danger';
            break;
        }

        // ==========================================
        // Tier 2 - 股票類（委託給EquityEngine）
        // ==========================================
        
        case 'ipo': {
            // 委託給股權引擎處理
            if (window.EquityEngine?.executeIPO) {
                const scale = params.scale || 'medium';
                const pricing = params.pricing || 'low';
                return window.EquityEngine.executeIPO(newPlayer, scale, pricing);
            }
            
            // Fallback: 使用舊邏輯
            const effects = actionConfig.effects;
            const marketCap = newPlayer.market_cap || 100;
            const ipoMultiplier = creditInfo.ipoMultiplier || 1;
            const cashGain = marketCap * (effects.cash_multiplier || 0.25) * ipoMultiplier;
            
            newPlayer.cash += cashGain;
            newPlayer.is_public = true;
            newPlayer.hype = Math.min(100, (newPlayer.hype || 0) + (effects.hype || 0));
            newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + (effects.regulation || 0));
            
            // 初始化股權狀態
            if (!newPlayer.equity_state) {
                newPlayer.equity_state = {
                    founder_shares: 80,
                    investor_shares: 0,
                    public_shares: 20,
                    is_public: true,
                    stock_price: marketCap / 100,
                    stock_price_history: [],
                    total_dilution: 20,
                    total_raised: cashGain
                };
            } else {
                newPlayer.equity_state.is_public = true;
                newPlayer.equity_state.public_shares = 20;
                newPlayer.equity_state.founder_shares -= 20;
            }
            
            message = `IPO成功！募資 $${cashGain.toFixed(0)}M`;
            messageType = 'success';
            break;
        }
        
        case 'stockIssue': {
            // 委託給股權引擎處理
            if (window.EquityEngine?.executeStockIssue) {
                const size = params.size || 'small';
                return window.EquityEngine.executeStockIssue(newPlayer, size);
            }
            
            // Fallback
            if (!newPlayer.is_public && !newPlayer.equity_state?.is_public) {
                return { success: false, player, message: '需要先完成IPO', type: 'warning' };
            }
            
            const effects = actionConfig.effects;
            const marketCap = newPlayer.market_cap || 100;
            const stockMult = creditInfo.stockIssueMultiplier || 1;
            const cashGain = marketCap * (effects.cash_multiplier || 0.12) * stockMult;
            
            newPlayer.cash += cashGain;
            
            if (newPlayer.equity_state) {
                const dilution = 5;
                newPlayer.equity_state.founder_shares = Math.max(10, newPlayer.equity_state.founder_shares - dilution);
                newPlayer.equity_state.public_shares += dilution;
            }
            
            message = `增發新股！募資 $${cashGain.toFixed(0)}M`;
            messageType = 'success';
            break;
        }
        
        case 'stockBuyback': {
            // 委託給股權引擎處理
            if (window.EquityEngine?.executeStockBuyback) {
                const size = params.size || 'small';
                return window.EquityEngine.executeStockBuyback(newPlayer, size);
            }
            
            // Fallback
            if (!newPlayer.is_public && !newPlayer.equity_state?.is_public) {
                return { success: false, player, message: '需要先完成IPO', type: 'warning' };
            }
            
            const effects = actionConfig.effects;
            const cost = effects.cash_cost || 80;
            
            if (newPlayer.cash < cost) {
                return { success: false, player, message: `現金不足，需要 $${cost}M`, type: 'danger' };
            }
            
            newPlayer.cash -= cost;
            newPlayer.hype = Math.min(100, (newPlayer.hype || 0) + (effects.hype || 0));
            
            if (newPlayer.equity_state) {
                const buyback = 2;
                newPlayer.equity_state.public_shares = Math.max(0, newPlayer.equity_state.public_shares - buyback);
                newPlayer.equity_state.founder_shares += buyback;
            }
            
            message = `股票回購！花費 $${cost}M，Hype +${effects.hype || 0}`;
            messageType = 'success';
            break;
        }

        // ==========================================
        // Tier 3 - 商業功能
        // ==========================================
        
        case 'acquisition': {
            const effects = actionConfig.effects;
            const cost = effects.cash_cost || 120;
            
            if (newPlayer.cash < cost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${cost}M`,
                    type: 'danger'
                };
            }
            
            newPlayer.cash -= cost;
            newPlayer.model_power = (newPlayer.model_power || 0) + (effects.mp_boost || 0);
            
            if (!newPlayer.talent) newPlayer.talent = {};
            newPlayer.talent.senior = (newPlayer.talent.senior || 0) + (effects.senior || 0);
            newPlayer.talent.junior = (newPlayer.talent.junior || 0) + (effects.junior || 0);
            
            message = `併購成功！MP +${effects.mp_boost || 0}，獲得人才`;
            messageType = 'success';
            break;
        }
        
        case 'industryContract': {
            const effects = actionConfig.effects;
            
            // 檢查可用算力
            const availablePflops = newPlayer.pflops - (newPlayer.locked_pflops || 0);
            if (availablePflops < (effects.pflops_lock || 0)) {
                return {
                    success: false,
                    player: player,
                    message: `可用算力不足，需要 ${effects.pflops_lock} PFLOPS`,
                    type: 'danger'
                };
            }
            
            const incomePerQuarter = (effects.cash_per_quarter || 25) * bonusMultiplier;
            
            newPlayer.industry_contracts.push({
                remaining: effects.duration || 6,
                bonus: incomePerQuarter
            });
            newPlayer.revenue_bonus = (newPlayer.revenue_bonus || 0) + incomePerQuarter;
            newPlayer.locked_pflops = (newPlayer.locked_pflops || 0) + (effects.pflops_lock || 0);
            
            message = `簽訂產業合約！每季收入 +$${incomePerQuarter.toFixed(0)}M，持續${effects.duration || 6}季`;
            messageType = 'success';
            break;
        }
        
        case 'licensingDeal': {
            const effects = actionConfig.effects;
            const cashGain = effects.cash * bonusMultiplier;
            
            newPlayer.cash += cashGain;
            newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + (effects.trust || 0));
            
            message = `技術授權成功！現金 +$${cashGain.toFixed(0)}M，信任度 +${effects.trust || 0}`;
            messageType = 'success';
            break;
        }
        
        // ==========================================
        // 戰略融資（委託給EquityEngine）
        // ==========================================
        
        case 'strategicFunding': {
            if (window.EquityEngine?.executeStrategicFunding) {
                const fundingType = params.fundingType;
                const investorProfile = params.investorProfile || 'tech_vc';
                return window.EquityEngine.executeStrategicFunding(newPlayer, fundingType, investorProfile);
            }
            
            return {
                success: false,
                player: player,
                message: '股權引擎未載入',
                type: 'danger'
            };
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

/**
 * 正規化股權比例（確保總和100%）
 */
function normalizeEquityShares(equityState) {
    const total = equityState.founder_shares + 
                 equityState.investor_shares + 
                 equityState.public_shares;
    
    if (Math.abs(total - 100) < 0.01) return equityState;
    
    const factor = 100 / total;
    return {
        ...equityState,
        founder_shares: Math.round(equityState.founder_shares * factor * 10) / 10,
        investor_shares: Math.round(equityState.investor_shares * factor * 10) / 10,
        public_shares: Math.round(equityState.public_shares * factor * 10) / 10
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
// 利息計算函數
// ============================================

/**
 * 計算並扣除季度利息
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 包含利息金額和更新後狀態
 */
function processQuarterlyInterest(player, globalParams) {
    const newPlayer = JSON.parse(JSON.stringify(player));
    const debt = newPlayer.debt || 0;
    
    if (debt <= 0) {
        return { player: newPlayer, interest: 0, message: null };
    }
    
    // 獲取動態利率
    let interestRate = 0.05; // 預設5%
    if (window.CreditEngine?.calculateDynamicInterestRate) {
        const rateInfo = window.CreditEngine.calculateDynamicInterestRate(newPlayer, globalParams);
        interestRate = rateInfo.rate || 0.05;
    }
    
    const interest = debt * interestRate;
    newPlayer.cash -= interest;
    
    // 更新玩家的利率記錄
    newPlayer.credit_interest_rate = interestRate;
    
    return {
        player: newPlayer,
        interest: interest,
        rate: interestRate,
        message: `債務利息: -$${interest.toFixed(1)}M (利率 ${(interestRate * 100).toFixed(1)}%)`
    };
}

// ============================================
// 財務狀態檢查函數
// ============================================

/**
 * 檢查財務健康狀態
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 財務健康報告
 */
function checkFinancialHealth(player, globalParams) {
    const debt = player.debt || 0;
    const cash = player.cash || 0;
    const marketCap = Math.max(100, player.market_cap || 100);
    const debtRatio = debt / marketCap;
    
    const report = {
        debtRatio: debtRatio,
        debtRatioPercent: (debtRatio * 100).toFixed(1),
        cash: cash,
        debt: debt,
        runway: 0,
        status: 'healthy',
        warnings: [],
        crisisLevel: null
    };
    
    // 估算燒錢率
    const quarterlyBurn = window.CreditEngine?.estimateQuarterlyBurn?.(player) || 10;
    report.runway = quarterlyBurn > 0 ? Math.floor(cash / quarterlyBurn) : 99;
    
    // 檢查危機等級
    const crisisConfig = window.CreditConfig?.DEBT_CRISIS || {
        warningRatio: 0.8,
        criticalRatio: 1.2,
        defaultRatio: 1.5
    };
    
    if (debtRatio >= crisisConfig.defaultRatio) {
        report.status = 'default';
        report.crisisLevel = 'default';
        report.warnings.push('💀 技術性違約！公司面臨重組或破產');
    } else if (debtRatio >= crisisConfig.criticalRatio) {
        report.status = 'critical';
        report.crisisLevel = 'critical';
        report.warnings.push('🚨 債務危機！債權人施壓，營運受限');
    } else if (debtRatio >= crisisConfig.warningRatio) {
        report.status = 'warning';
        report.crisisLevel = 'warning';
        report.warnings.push('⚠️ 債務水平偏高，信用評級可能下調');
    }
    
    // 檢查現金流
    if (report.runway <= 1) {
        report.warnings.push('💸 現金即將耗盡！');
    } else if (report.runway <= 3) {
        report.warnings.push('⚠️ 現金流緊張');
    }
    
    // 獲取信用評級
    if (window.CreditEngine?.getCreditRatingInfo) {
        const creditInfo = window.CreditEngine.getCreditRatingInfo(player, globalParams);
        report.creditRating = creditInfo.rating;
        report.creditScore = creditInfo.score;
    }
    
    return report;
}

// ============================================
// 可用財務行動檢查
// ============================================

/**
 * 獲取當前可用的財務行動列表
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Array} 可用行動列表
 */
function getAvailableFinanceActions(player, globalParams) {
    const config = window.GameConfig || (typeof GameConfig !== 'undefined' ? GameConfig : null);
    const FINANCE_ACTIONS = config?.FINANCE_ACTIONS || {};
    const mpTier = player.mp_tier || 0;
    const isPublic = player.is_public || player.equity_state?.is_public || false;
    const cooldowns = player.finance_cooldowns || {};
    const creditInfo = window.CreditEngine?.getCreditRatingInfo?.(player, globalParams) || {};
    
    const available = [];
    
    // Tier 0 行動（始終可用）
    if (FINANCE_ACTIONS.tier0) {
        Object.entries(FINANCE_ACTIONS.tier0).forEach(([id, action]) => {
            const isOnCooldown = (cooldowns[id] || 0) > 0;
            let canUse = !isOnCooldown;
            let reason = isOnCooldown ? `冷卻中 (${cooldowns[id]}回合)` : null;
            
            // 特殊條件檢查
            if (id === 'emergencyLoan' && player.cash > 30) {
                canUse = false;
                reason = '現金需低於$30M';
            }
            
            available.push({
                ...action,
                tier: 0,
                available: canUse,
                reason: reason,
                cooldown: cooldowns[id] || 0
            });
        });
    }
    
    // Tier 1 行動（需要一定發展）
    if (FINANCE_ACTIONS.tier1 && mpTier >= 1) {
        Object.entries(FINANCE_ACTIONS.tier1).forEach(([id, action]) => {
            const isOnCooldown = (cooldowns[id] || 0) > 0;
            let canUse = !isOnCooldown;
            let reason = isOnCooldown ? `冷卻中 (${cooldowns[id]}回合)` : null;
            
            // 信用評級限制
            if (id === 'corporateBond' && creditInfo.junkBondOnly) {
                canUse = false;
                reason = '信用評級過低';
            }
            
            // IPO 要求
            if (action.requiresIPO && !isPublic) {
                canUse = false;
                reason = '需要先完成IPO';
            }
            
            available.push({
                ...action,
                tier: 1,
                available: canUse,
                reason: reason,
                cooldown: cooldowns[id] || 0
            });
        });
    }
    
    // Tier 2 行動
    if (FINANCE_ACTIONS.tier2 && mpTier >= 2) {
        Object.entries(FINANCE_ACTIONS.tier2).forEach(([id, action]) => {
            const isOnCooldown = (cooldowns[id] || 0) > 0;
            let canUse = !isOnCooldown;
            let reason = isOnCooldown ? `冷卻中 (${cooldowns[id]}回合)` : null;
            
            // IPO 特殊處理
            if (id === 'ipo') {
                if (isPublic) {
                    canUse = false;
                    reason = '已完成IPO';
                } else {
                    const eligibility = window.EquityEngine?.checkIPOEligibility?.(player) || { canIPO: false, reasons: ['引擎未載入'] };
                    canUse = eligibility.canIPO;
                    reason = eligibility.reasons?.[0] || null;
                }
            }
            
            // IPO 後才能用的行動
            if (action.requiresIPO && !isPublic) {
                canUse = false;
                reason = '需要先完成IPO';
            }
            
            available.push({
                ...action,
                tier: 2,
                available: canUse,
                reason: reason,
                cooldown: cooldowns[id] || 0
            });
        });
    }
    
    // Tier 3 行動
    if (FINANCE_ACTIONS.tier3 && mpTier >= 3) {
        Object.entries(FINANCE_ACTIONS.tier3).forEach(([id, action]) => {
            const isOnCooldown = (cooldowns[id] || 0) > 0;
            let canUse = !isOnCooldown;
            let reason = isOnCooldown ? `冷卻中 (${cooldowns[id]}回合)` : null;
            
            available.push({
                ...action,
                tier: 3,
                available: canUse,
                reason: reason,
                cooldown: cooldowns[id] || 0
            });
        });
    }
    
    return available;
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
        processQuarterlyInterest,
        checkFinancialHealth,
        getAvailableFinanceActions,
        normalizeEquityShares
    };
    
    // 如果 GameEngine 已存在，也掛載到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.executeFinance = executeFinance;
        window.GameEngine.updateFinanceCooldowns = updateFinanceCooldowns;
        window.GameEngine.processQuarterlyContracts = processQuarterlyContracts;
        window.GameEngine.processQuarterlyInterest = processQuarterlyInterest;
    }
    
    console.log('✓ Finance Engine loaded');
})();