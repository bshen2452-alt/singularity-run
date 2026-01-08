// ============================================
// 信用評級引擎 (Credit Rating Engine)
// ============================================
// 設計：純函數式，僅接收數據參數/返回計算結果
// 功能：計算信用評級、動態利率、財務行動修正

/**
 * 計算信用評級分數
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 評級分數詳情
 */
function calculateCreditScore(player, globalParams) {
    const config = window.CreditConfig;
    if (!config) {
        console.warn('CreditConfig not loaded, using defaults');
        return { score: 50, rating: 'BBB', details: {} };
    }
    
    const factors = config.RATING_FACTORS;
    const weights = factors.weights;
    
    // === 1. 債務/市值比 (越低越好) ===
    const debt = player.debt || 0;
    const marketCap = Math.max(100, player.market_cap || 100);
    const debtRatio = debt / marketCap;
    
    // 債務比評分：0% = 100分, 50% = 70分, 100% = 40分, 150%+ = 0分
    let debtScore;
    if (debtRatio <= 0) {
        debtScore = 100;
    } else if (debtRatio <= 0.5) {
        debtScore = 100 - (debtRatio * 60);  // 0-50%: 100-70分
    } else if (debtRatio <= 1.0) {
        debtScore = 70 - ((debtRatio - 0.5) * 60);  // 50-100%: 70-40分
    } else if (debtRatio <= 1.5) {
        debtScore = 40 - ((debtRatio - 1.0) * 80);  // 100-150%: 40-0分
    } else {
        debtScore = 0;
    }
    
    // === 2. 現金流狀況 ===
    const cash = player.cash || 0;
    const quarterlyBurn = estimateQuarterlyBurn(player);
    const runwayMonths = quarterlyBurn > 0 ? (cash / quarterlyBurn) * 3 : 12;
    
    // 現金流評分：12+月 = 100分, 6月 = 60分, 3月 = 30分, 0月 = 0分
    let cashFlowScore;
    if (runwayMonths >= 12) {
        cashFlowScore = 100;
    } else if (runwayMonths >= 6) {
        cashFlowScore = 60 + ((runwayMonths - 6) / 6) * 40;
    } else if (runwayMonths >= 3) {
        cashFlowScore = 30 + ((runwayMonths - 3) / 3) * 30;
    } else {
        cashFlowScore = (runwayMonths / 3) * 30;
    }
    
    // === 3. 企業形象 ===
    const hype = Math.min(100, player.hype || 0);
    const trust = Math.min(100, player.trust || 0);
    const corporateImage = hype * 0.4 + trust * 0.6;
    const imageScore = corporateImage;  // 直接使用 0-100
    
    // === 4. 盈利能力 ===
    // 估算淨利潤率
    const revenue = estimateQuarterlyRevenue(player);
    const expenses = quarterlyBurn;
    const profitMargin = revenue > 0 ? (revenue - expenses) / revenue : -1;
    
    // 盈利評分：50%+ = 100分, 0% = 50分, -50%+ = 0分
    let profitScore;
    if (profitMargin >= 0.5) {
        profitScore = 100;
    } else if (profitMargin >= 0) {
        profitScore = 50 + (profitMargin * 100);
    } else if (profitMargin >= -0.5) {
        profitScore = 50 + (profitMargin * 100);  // 0到-0.5 = 50到0
    } else {
        profitScore = 0;
    }
    
    // === 5. 技術實力 (MP Tier) ===
    const mpTier = player.mp_tier || 0;
    const mpScore = Math.min(100, mpTier * 20);  // Tier 0-5 = 0-100分
    
    // === 6. 階段加成 ===
    const tierModifier = factors.tierModifiers[mpTier] || 0;
    
    // === 計算加權總分 ===
    const rawScore = 
        debtScore * weights.debtToMarketCap +
        cashFlowScore * weights.cashFlow +
        imageScore * weights.corporateImage +
        profitScore * weights.profitability +
        mpScore * weights.modelPower;
    
    // 階段修正（直接加減分）
    const finalScore = Math.max(0, Math.min(100, rawScore + tierModifier));
    
    // === 確定評級 ===
    const rating = scoreToRating(finalScore, factors.thresholds);
    
    return {
        score: Math.round(finalScore * 10) / 10,
        rating: rating,
        details: {
            debtRatio: Math.round(debtRatio * 1000) / 10,  // 百分比
            debtScore: Math.round(debtScore),
            runwayMonths: Math.round(runwayMonths * 10) / 10,
            cashFlowScore: Math.round(cashFlowScore),
            corporateImage: Math.round(corporateImage),
            imageScore: Math.round(imageScore),
            profitMargin: Math.round(profitMargin * 1000) / 10,  // 百分比
            profitScore: Math.round(profitScore),
            mpTier: mpTier,
            mpScore: Math.round(mpScore),
            tierModifier: tierModifier,
            rawScore: Math.round(rawScore * 10) / 10,
        }
    };
}

/**
 * 分數轉評級
 */
function scoreToRating(score, thresholds) {
    const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];
    for (const rating of ratings) {
        if (score >= thresholds[rating]) {
            return rating;
        }
    }
    return 'D';
}

/**
 * 估算季度燒錢率
 */
function estimateQuarterlyBurn(player) {
    const COSTS = window.GameConfig?.COSTS || {
        TURING_SALARY: 5,
        SENIOR_SALARY: 2,
        JUNIOR_SALARY: 0.5,
        CLOUD_PFLOPS_RENT_QUARTERLY: 3
    };
    
    const talent = player.talent || {};
    const talentCost = 
        (talent.turing || 0) * COSTS.TURING_SALARY +
        (talent.senior || 0) * COSTS.SENIOR_SALARY +
        (talent.junior || 0) * COSTS.JUNIOR_SALARY;
    
    const cloudCost = (player.cloud_pflops || 0) * (COSTS.CLOUD_PFLOPS_RENT_QUARTERLY || 3);
    const maintenanceCost = (player.pflops || 0) * 0.1;
    
    // 使用動態利率計算利息（如果已有評級）
    const interestRate = player.credit_interest_rate || 0.05;
    const interestCost = (player.debt || 0) * interestRate;
    
    return talentCost + cloudCost + maintenanceCost + interestCost;
}

/**
 * 估算季度收入
 */
function estimateQuarterlyRevenue(player) {
    let revenue = 0;
    
    // 基礎模型收入
    if (player.mp_tier >= 1) {
        revenue += (player.model_power || 0) * 0.5;
    }
    
    // 社群收入
    revenue += player.community_revenue || 0;
    
    // 產品收入
    if (player.product_state) {
        revenue += player.product_state.product_revenue || 0;
    }
    
    // 合約收入
    revenue += player.revenue_bonus || 0;
    
    return revenue;
}

/**
 * 計算動態利率
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 利率資訊
 */
function calculateDynamicInterestRate(player, globalParams) {
    const config = window.CreditConfig;
    if (!config) {
        return { rate: 0.05, breakdown: {} };
    }
    
    const rateConfig = config.INTEREST_RATE_MODIFIERS;
    const creditResult = calculateCreditScore(player, globalParams);
    const ratingConfig = config.CREDIT_RATINGS[creditResult.rating];
    
    // 基礎利率（來自信用評級）
    let baseRate = ratingConfig?.baseInterestRate || 0.05;
    
    // 全球利率乘數
    const globalMultiplier = globalParams?.[rateConfig.globalRateMultiplier] || 1.0;
    baseRate *= globalMultiplier;
    
    // 市值修正
    const marketCap = player.market_cap || 100;
    let marketCapModifier = 0;
    for (const tier of rateConfig.marketCapTiers) {
        if (marketCap > tier.threshold) {
            marketCapModifier = tier.modifier;
            break;
        }
    }
    
    // Hype 修正
    const hype = player.hype || 0;
    let hypeModifier = 0;
    if (hype > rateConfig.hypeEffect.highThreshold) {
        hypeModifier = rateConfig.hypeEffect.highModifier;
    } else if (hype < rateConfig.hypeEffect.lowThreshold) {
        hypeModifier = rateConfig.hypeEffect.lowModifier;
    }
    
    // 最終利率
    let finalRate = baseRate + marketCapModifier + hypeModifier;
    finalRate = Math.max(rateConfig.minRate, Math.min(rateConfig.maxRate, finalRate));
    
    return {
        rate: Math.round(finalRate * 10000) / 10000,  // 保留4位小數
        annualRate: Math.round(finalRate * 4 * 1000) / 10,  // 年化百分比
        breakdown: {
            baseRate: ratingConfig?.baseInterestRate || 0.05,
            globalMultiplier: globalMultiplier,
            adjustedBase: baseRate,
            marketCapModifier: marketCapModifier,
            hypeModifier: hypeModifier,
            creditRating: creditResult.rating,
        }
    };
}

/**
 * 獲取完整的信用評級資訊
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 完整評級資訊
 */
function getCreditRatingInfo(player, globalParams) {
    const config = window.CreditConfig;
    if (!config) {
        return {
            rating: 'BBB',
            score: 50,
            interestRate: 0.05,
            ratingConfig: null,
            canIPO: true,
            canIssueBond: true,
            canIssueStock: true,
        };
    }
    
    const creditResult = calculateCreditScore(player, globalParams);
    const interestResult = calculateDynamicInterestRate(player, globalParams);
    const ratingConfig = config.CREDIT_RATINGS[creditResult.rating];
    
    // 檢查債務危機
    const debt = player.debt || 0;
    const marketCap = player.market_cap || 100;
    const debtRatio = debt / marketCap;
    const crisis = config.DEBT_CRISIS;
    
    let crisisLevel = null;
    if (debtRatio >= crisis.defaultRatio) {
        crisisLevel = 'default';
    } else if (debtRatio >= crisis.criticalRatio) {
        crisisLevel = 'critical';
    } else if (debtRatio >= crisis.warningRatio) {
        crisisLevel = 'warning';
    }
    
    // 能力檢查
    const canIPO = !player.is_public && 
                   ratingConfig.ipoMultiplier > 0 && 
                   crisisLevel !== 'default';
    const canIssueBond = !ratingConfig.emergencyOnly;
    const canIssueJunkBond = true;  // 垃圾債總是可以發
    const canIssueStock = player.is_public && 
                          ratingConfig.stockIssueMultiplier > 0;
    
    return {
        rating: creditResult.rating,
        ratingName: ratingConfig?.name || creditResult.rating,
        ratingTier: ratingConfig?.tier || 'unknown',
        score: creditResult.score,
        scoreDetails: creditResult.details,
        
        interestRate: interestResult.rate,
        annualRate: interestResult.annualRate,
        rateBreakdown: interestResult.breakdown,
        
        ratingConfig: ratingConfig,
        
        // 能力標記
        canIPO: canIPO,
        canIssueBond: canIssueBond,
        canIssueJunkBond: canIssueJunkBond,
        canIssueStock: canIssueStock,
        junkBondOnly: ratingConfig?.junkBondOnly || false,
        
        // 債務狀況
        debtRatio: Math.round(debtRatio * 1000) / 10,
        crisisLevel: crisisLevel,
        crisisMessage: crisisLevel ? crisis.effects[crisisLevel]?.message : null,
        
        // 融資能力
        ipoMultiplier: ratingConfig?.ipoMultiplier || 0,
        stockIssueMultiplier: ratingConfig?.stockIssueMultiplier || 0,
        bondPremium: ratingConfig?.bondPremium || 0,
        debtCapacity: (ratingConfig?.debtCapacity || 1.0) * marketCap,
    };
}

/**
 * 計算財務行動的實際數值（考慮信用評級）
 * @param {string} actionId - 財務行動ID
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 調整後的數值
 */
function calculateFinanceActionValues(actionId, player, globalParams) {
    const config = window.CreditConfig;
    const amounts = config?.FINANCE_AMOUNTS;
    const creditInfo = getCreditRatingInfo(player, globalParams);
    
    // 找到對應的配置
    let actionAmounts = null;
    for (const tier of ['tier0', 'tier1', 'tier2', 'tier3']) {
        if (amounts?.[tier]?.[actionId]) {
            actionAmounts = amounts[tier][actionId];
            break;
        }
    }
    
    if (!actionAmounts) {
        return null;  // 使用原始配置
    }
    
    const result = { ...actionAmounts };
    const bondPremium = creditInfo.bondPremium;
    
    // 根據行動類型調整
    switch (actionId) {
        case 'ipo':
            // IPO 金額 = 市值 × 基礎倍率 × 評級倍率
            const marketCap = player.market_cap || 100;
            result.estimatedCash = marketCap * 
                (result.baseMultiplier || 0.25) * 
                (creditInfo.ipoMultiplier || 1.0);
            result.effectiveMultiplier = (result.baseMultiplier || 0.25) * 
                (creditInfo.ipoMultiplier || 1.0);
            break;
            
        case 'stockIssue':
            result.estimatedCash = (player.market_cap || 100) * 
                (result.baseMultiplier || 0.12) * 
                (creditInfo.stockIssueMultiplier || 1.0);
            result.effectiveMultiplier = (result.baseMultiplier || 0.12) * 
                (creditInfo.stockIssueMultiplier || 1.0);
            break;
            
        case 'corporateBond':
        case 'convertibleBond':
            // 債務 = 現金 × (1 + 信用溢價)
            result.effectiveDebt = (result.cash || 0) * 
                (result.debtMultiplier || 1.0) * 
                (1 + bondPremium);
            break;
            
        case 'junkBond':
            // 垃圾債的溢價更高
            result.effectiveDebt = (result.cash || 0) * 
                (result.debtMultiplier || 1.4) * 
                (1 + bondPremium * 0.5);  // 垃圾債溢價減半（本來就是高風險）
            break;
            
        case 'emergencyLoan':
            result.effectiveDebt = (result.cash || 0) * 
                (result.debtMultiplier || 1.5) * 
                (1 + bondPremium);
            break;
    }
    
    return result;
}

/**
 * 檢查評級變動並生成事件
 * @param {string} oldRating - 舊評級
 * @param {string} newRating - 新評級
 * @returns {Object|null} 評級變動事件
 */
function checkRatingChange(oldRating, newRating) {
    if (oldRating === newRating) {
        return null;
    }
    
    const config = window.CreditConfig;
    if (!config) return null;
    
    const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];
    const oldIndex = ratings.indexOf(oldRating);
    const newIndex = ratings.indexOf(newRating);
    
    const events = config.RATING_EVENTS;
    let event = null;
    
    if (newIndex < oldIndex) {
        // 升級
        event = { ...events.upgrade };
        event.message = event.message.replace('{rating}', newRating);
        event.direction = 'upgrade';
    } else {
        // 降級
        event = { ...events.downgrade };
        event.message = event.message.replace('{rating}', newRating);
        event.direction = 'downgrade';
    }
    
    // 檢查是否跨越投機/投資級界線
    const oldConfig = config.CREDIT_RATINGS[oldRating];
    const newConfig = config.CREDIT_RATINGS[newRating];
    
    if (oldConfig?.tier === 'investment' && newConfig?.tier !== 'investment') {
        // 降至投機級
        const junkEvent = { ...events.junkStatus };
        junkEvent.message = junkEvent.message.replace('{rating}', newRating);
        event.subEvent = junkEvent;
    } else if (oldConfig?.tier !== 'investment' && newConfig?.tier === 'investment') {
        // 升至投資級
        const gradeEvent = { ...events.investmentGrade };
        gradeEvent.message = gradeEvent.message.replace('{rating}', newRating);
        event.subEvent = gradeEvent;
    }
    
    event.oldRating = oldRating;
    event.newRating = newRating;
    
    return event;
}

/**
 * 應用信用評級效果到玩家狀態
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 更新後的玩家狀態和訊息
 */
function applyCreditRatingEffects(player, globalParams) {
    const newPlayer = JSON.parse(JSON.stringify(player));
    const messages = [];
    
    const creditInfo = getCreditRatingInfo(newPlayer, globalParams);
    const oldRating = newPlayer.credit_rating || 'BBB';
    const newRating = creditInfo.rating;
    
    // 更新玩家的信用狀態
    newPlayer.credit_rating = newRating;
    newPlayer.credit_score = creditInfo.score;
    newPlayer.credit_interest_rate = creditInfo.interestRate;
    
    // 檢查評級變動
    const ratingEvent = checkRatingChange(oldRating, newRating);
    if (ratingEvent) {
        messages.push({
            text: ratingEvent.message,
            type: ratingEvent.direction === 'upgrade' ? 'success' : 'warning'
        });
        
        // 應用評級變動效果
        if (ratingEvent.direction === 'upgrade') {
            newPlayer.hype = Math.min(100, (newPlayer.hype || 0) + 
                (ratingEvent.hypeBonus || 0));
            newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + 
                (ratingEvent.trustBonus || 0));
        } else {
            newPlayer.hype = Math.max(0, (newPlayer.hype || 0) - 
                (ratingEvent.hypePenalty || 0));
            newPlayer.trust = Math.max(0, (newPlayer.trust || 0) - 
                (ratingEvent.trustPenalty || 0));
        }
        
        // 子事件（跨越投資/投機級）
        if (ratingEvent.subEvent) {
            messages.push({
                text: ratingEvent.subEvent.message,
                type: ratingEvent.subEvent.hypeBonus ? 'success' : 'danger'
            });
            
            if (ratingEvent.subEvent.hypeBonus) {
                newPlayer.hype = Math.min(100, (newPlayer.hype || 0) + 
                    ratingEvent.subEvent.hypeBonus);
            }
            if (ratingEvent.subEvent.hypePenalty) {
                newPlayer.hype = Math.max(0, (newPlayer.hype || 0) - 
                    ratingEvent.subEvent.hypePenalty);
            }
            if (ratingEvent.subEvent.regulationAdd) {
                newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + 
                    ratingEvent.subEvent.regulationAdd);
            }
        }
    }
    
    // 檢查債務危機
    if (creditInfo.crisisLevel) {
        const config = window.CreditConfig;
        const crisisEffect = config.DEBT_CRISIS.effects[creditInfo.crisisLevel];
        
        messages.push({
            text: crisisEffect.message,
            type: creditInfo.crisisLevel === 'default' ? 'danger' : 'warning'
        });
        
        if (crisisEffect.hypePenalty) {
            newPlayer.hype = Math.max(0, (newPlayer.hype || 0) - crisisEffect.hypePenalty);
        }
        if (crisisEffect.trustPenalty) {
            newPlayer.trust = Math.max(0, (newPlayer.trust || 0) - crisisEffect.trustPenalty);
        }
    }
    
    return {
        player: newPlayer,
        messages: messages,
        creditInfo: creditInfo,
        ratingChanged: oldRating !== newRating,
    };
}

// ============================================
// 信用引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    // 註冊到全局
    window.CreditEngine = {
        calculateCreditScore,
        calculateDynamicInterestRate,
        getCreditRatingInfo,
        calculateFinanceActionValues,
        checkRatingChange,
        applyCreditRatingEffects,
        // 工具函數
        estimateQuarterlyBurn,
        estimateQuarterlyRevenue,
        scoreToRating,
    };
    
    // 如果 FinanceEngine 已存在，掛載到 FinanceEngine
    if (window.FinanceEngine) {
        window.FinanceEngine.getCreditRatingInfo = getCreditRatingInfo;
        window.FinanceEngine.calculateDynamicInterestRate = calculateDynamicInterestRate;
    }
    
    console.log('✓ Credit Engine loaded');
})();
