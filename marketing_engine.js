// ============================================
// 行銷增長引擎 - Marketing Engine
// ============================================
// 功能：處理社群規模增長的行銷邏輯
// 設計：純函數式，以季度為單位計算增長

/**
 * 計算行銷投資帶來的新粉絲數
 * 公式：新粉絲 = 投資金額 × 基礎轉換率 × 邊際遞減係數 × 市場飽和度
 * 
 * @param {number} investmentAmount - 行銷投資金額 (M)
 * @param {number} currentSize - 當前社群規模
 * @param {Object} marketingConfig - 行銷配置
 * @returns {number} 新增粉絲數
 */
function calculateMarketingGain(investmentAmount, currentSize, marketingConfig) {
    if (investmentAmount <= 0) return 0;
    
    const config = marketingConfig || window.MARKETING_CONFIG || {};
    const params = config.MARKETING_PARAMS || {};
    
    // 基礎轉換率：每 M 投資帶來的基礎粉絲數
    const baseConversionRate = params.BASE_CONVERSION_RATE || 10000;
    
    // 邊際遞減：隨著社群規模增大，相同投資效果遞減
    // 使用 log 函數使效果隨規模對數遞減
    const sizeThreshold = params.DIMINISHING_THRESHOLD || 10000;
    const diminishingFactor = currentSize <= sizeThreshold 
        ? 1.0 
        : 1 / Math.log10(currentSize / sizeThreshold + 1);
    
    // 市場飽和度：接近全球人口上限時收斂
    const globalPopulation = params.GLOBAL_POPULATION || 8000000000;
    const saturationFactor = 1 - (currentSize / globalPopulation);
    
    // 投資效率遞減：大額投資的邊際效益遞減
    // 使用平方根使大額投資效率降低
    const investmentEfficiency = Math.sqrt(investmentAmount);
    
    // 最終計算
    const rawGain = investmentEfficiency * baseConversionRate * diminishingFactor * saturationFactor;
    
    return Math.max(0, Math.round(rawGain));
}

/**
 * 計算口碑傳播帶來的自然增長
 * 公式：自然增長 = 現有粉絲 × 口碑係數 × 情緒加成 × 活躍度加成 × 市場飽和度
 * 
 * @param {Object} communityState - 社群狀態 { size, sentiment, engagement }
 * @param {Object} marketingConfig - 行銷配置
 * @returns {number} 口碑帶來的新粉絲數
 */
function calculateWordOfMouthGrowth(communityState, marketingConfig) {
    const { size = 0, sentiment = 50, engagement = 30 } = communityState;
    if (size <= 0) return 0;
    
    const config = marketingConfig || window.MARKETING_CONFIG || {};
    const params = config.WORD_OF_MOUTH_PARAMS || {};
    
    // 基礎口碑係數：每個粉絲每季帶來的平均新粉絲比例
    const baseRate = params.BASE_RATE || 0.001; // 0.1% 基礎轉換
    
    // 情緒加成：正面情緒提升口碑，負面情緒降低甚至變成負增長
    const sentimentMult = calculateSentimentMultiplier(sentiment, params);
    
    // 活躍度加成：活躍社群口碑效果更強
    const engagementMult = calculateEngagementMultiplier(engagement, params);
    
    // 市場飽和度
    const globalPopulation = params.GLOBAL_POPULATION || 8000000000;
    const saturationFactor = 1 - (size / globalPopulation);
    
    // 計算自然增長
    const growth = size * baseRate * sentimentMult * engagementMult * saturationFactor;
    
    return Math.round(growth);
}

/**
 * 計算情緒對口碑的影響乘數
 * @param {number} sentiment - 情緒值 (0-100)
 * @param {Object} params - 口碑參數
 * @returns {number} 情緒乘數
 */
function calculateSentimentMultiplier(sentiment, params) {
    const multipliers = params.SENTIMENT_MULTIPLIERS || {
        hostile: -0.5,    // 負面口碑，流失粉絲
        negative: 0,      // 無口碑效果
        neutral: 0.5,     // 微弱口碑
        positive: 1.5,    // 正面口碑
        devoted: 3.0      // 強力口碑傳播
    };
    
    if (sentiment <= 20) return multipliers.hostile;
    if (sentiment <= 40) return multipliers.negative;
    if (sentiment <= 60) return multipliers.neutral;
    if (sentiment <= 80) return multipliers.positive;
    return multipliers.devoted;
}

/**
 * 計算活躍度對口碑的影響乘數
 * @param {number} engagement - 活躍度 (0-100)
 * @param {Object} params - 口碑參數
 * @returns {number} 活躍度乘數
 */
function calculateEngagementMultiplier(engagement, params) {
    const multipliers = params.ENGAGEMENT_MULTIPLIERS || {
        dead: 0.1,
        low: 0.3,
        moderate: 1.0,
        active: 2.0,
        viral: 4.0
    };
    
    if (engagement <= 20) return multipliers.dead;
    if (engagement <= 40) return multipliers.low;
    if (engagement <= 60) return multipliers.moderate;
    if (engagement <= 80) return multipliers.active;
    return multipliers.viral;
}

/**
 * 計算單季度社群增長總量
 * 整合行銷投資 + 口碑傳播
 * 
 * @param {Object} communityState - 社群狀態
 * @param {number} marketingInvestment - 行銷投資金額 (M)
 * @param {Object} config - 行銷配置
 * @returns {Object} { totalGrowth, marketingGain, wordOfMouthGain, details }
 */
function calculateQuarterlyGrowth(communityState, marketingInvestment, config) {
    const marketingConfig = config || window.MARKETING_CONFIG || {};
    const { size = 0 } = communityState;
    
    // 行銷投資帶來的增長
    const marketingGain = calculateMarketingGain(marketingInvestment, size, marketingConfig);
    
    // 口碑傳播帶來的增長
    const wordOfMouthGain = calculateWordOfMouthGrowth(communityState, marketingConfig);
    
    // 總增長（可能為負，如果口碑是負面的）
    const totalGrowth = marketingGain + wordOfMouthGain;
    
    // 確保社群不會變成負數
    const actualGrowth = Math.max(-size, totalGrowth);
    
    return {
        totalGrowth: actualGrowth,
        marketingGain,
        wordOfMouthGain,
        details: {
            investment: marketingInvestment,
            currentSize: size,
            newSize: size + actualGrowth
        }
    };
}

/**
 * 計算達到目標社群規模所需的行銷預算估算
 * 
 * @param {number} currentSize - 當前規模
 * @param {number} targetSize - 目標規模
 * @param {Object} config - 行銷配置
 * @returns {number} 估算所需投資 (M)
 */
function estimateMarketingBudget(currentSize, targetSize, config) {
    const marketingConfig = config || window.MARKETING_CONFIG || {};
    const params = marketingConfig.MARKETING_PARAMS || {};
    
    const targetGain = targetSize - currentSize;
    if (targetGain <= 0) return 0;
    
    const baseConversionRate = params.BASE_CONVERSION_RATE || 10000;
    const sizeThreshold = params.DIMINISHING_THRESHOLD || 10000;
    const globalPopulation = params.GLOBAL_POPULATION || 8000000000;
    
    // 反推所需投資（考慮遞減效應）
    const diminishingFactor = currentSize <= sizeThreshold 
        ? 1.0 
        : 1 / Math.log10(currentSize / sizeThreshold + 1);
    const saturationFactor = 1 - (currentSize / globalPopulation);
    
    const effectiveRate = baseConversionRate * diminishingFactor * saturationFactor;
    if (effectiveRate <= 0) return Infinity;
    
    // 反推投資額（平方根的反函數）
    const requiredEfficiency = targetGain / effectiveRate;
    const estimatedInvestment = Math.pow(requiredEfficiency, 2);
    
    return Math.round(estimatedInvestment * 100) / 100;
}

/**
 * 執行行銷行動
 * @param {Object} player - 玩家狀態
 * @param {number} investmentAmount - 投資金額 (M)
 * @returns {Object} { success, player, growth, message }
 */
function executeMarketingAction(player, investmentAmount) {
    const config = window.MARKETING_CONFIG || {};
    
    // 驗證投資金額
    if (investmentAmount <= 0) {
        return {
            success: false,
            player,
            growth: null,
            message: '投資金額必須大於 0',
            type: 'warning'
        };
    }
    
    // 檢查現金
    if (player.cash < investmentAmount) {
        return {
            success: false,
            player,
            growth: null,
            message: `現金不足，需要 $${investmentAmount}M`,
            type: 'warning'
        };
    }
    
    // 深拷貝
    let newPlayer = JSON.parse(JSON.stringify(player));
    
    // 確保社群狀態存在
    if (!newPlayer.community) {
        newPlayer.community = {
            size: newPlayer.community_size || 0,
            sentiment: 50,
            engagement: 30
        };
    }
    
    // 計算增長
    const growthResult = calculateQuarterlyGrowth(
        newPlayer.community,
        investmentAmount,
        config
    );
    
    // 扣除投資
    newPlayer.cash -= investmentAmount;
    
    // 應用增長
    newPlayer.community.size = Math.max(0, newPlayer.community.size + growthResult.marketingGain);
    newPlayer.community_size = newPlayer.community.size;
    
    // 行銷活動提升 hype
    const hypeGain = Math.min(20, Math.round(investmentAmount * 0.5));
    newPlayer.hype = Math.max(0, (newPlayer.hype || 0) + hypeGain);
    
    return {
        success: true,
        player: newPlayer,
        growth: growthResult,
        message: `行銷投資 $${investmentAmount}M，吸引 ${growthResult.marketingGain.toLocaleString()} 新粉絲`,
        type: 'success'
    };
}

/**
 * 處理季度自然口碑增長（在回合結束時調用）
 * @param {Object} player - 玩家狀態
 * @returns {Object} { player, wordOfMouthGain }
 */
function processQuarterlyWordOfMouth(player) {
    const config = window.MARKETING_CONFIG || {};
    let newPlayer = JSON.parse(JSON.stringify(player));
    
    if (!newPlayer.community || newPlayer.community.size <= 0) {
        return { player: newPlayer, wordOfMouthGain: 0 };
    }
    
    const wordOfMouthGain = calculateWordOfMouthGrowth(newPlayer.community, config);
    
    newPlayer.community.size = Math.max(0, newPlayer.community.size + wordOfMouthGain);
    newPlayer.community_size = newPlayer.community.size;
    
    return {
        player: newPlayer,
        wordOfMouthGain
    };
}

// ============================================
// 引擎自我註冊
// ============================================
(function() {
    'use strict';
    
    window.MarketingEngine = {
        // 核心計算
        calculateMarketingGain,
        calculateWordOfMouthGrowth,
        calculateQuarterlyGrowth,
        
        // 輔助計算
        calculateSentimentMultiplier,
        calculateEngagementMultiplier,
        estimateMarketingBudget,
        
        // 行動執行
        executeMarketingAction,
        processQuarterlyWordOfMouth
    };
    
    // 掛載到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.executeMarketingAction = executeMarketingAction;
        window.GameEngine.processQuarterlyWordOfMouth = processQuarterlyWordOfMouth;
    }
    
    console.log('✓ Marketing Engine loaded');
})();
