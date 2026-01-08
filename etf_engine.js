// ============================================
// ETF 投資引擎
// ============================================
// 設計：純函數式，僅接收數據參數/返回計算結果
// 整合市場擾動效果

/**
 * 計算ETF當前價格
 * @param {string} etfId - ETF ID
 * @param {Object} globalMarket - 全球市場狀態（優先）或舊版globalParams
 * @param {number} turnCount - 當前回合數（用於引入隨機波動）
 * @param {Object} marketContext - 可選的市場上下文（含擾動資訊）
 * @returns {Object} 價格信息
 */
function calculateETFPrice(etfId, globalMarket, turnCount = 0, marketContext = null) {
    const config = window.ETF_CONFIG?.ETF_PRODUCTS?.[etfId];
    if (!config) {
        return { price: 0, change: 0, changePercent: 0 };
    }
    
    const basePrice = config.basePrice;
    const driver = config.priceDriver;
    const legacyDriver = config.legacyDriver;
    const volatility = config.volatility;
    
    // 從 GlobalMarket 獲取驅動因子值
    let driverValue = 1.0;
    
    if (globalMarket && globalMarket.indices) {
        // 新格式：直接從 GlobalMarket indices 讀取
        const indexValue = globalMarket.indices[driver]?.value;
        if (indexValue !== undefined) {
            driverValue = indexValue / 100;  // 標準化：100 = 1.0
        }
    } else if (globalMarket) {
        // 舊格式：嘗試用 legacyDriver 或 driver
        driverValue = globalMarket[legacyDriver] ?? globalMarket[driver] ?? 1.0;
    }
    
    // 基於驅動因子計算價格
    let priceFactor;
    if (config.inverseCorrelation) {
        // 債券：利率上升，價格下跌
        priceFactor = 2 - driverValue; // 當R_base=1時為1，R_base=1.5時為0.5
    } else {
        // 正相關：GPU價格上升，科技ETF上升
        priceFactor = driverValue;
    }
    
    // 引入隨機波動（基於回合數的偽隨機）
    const seed = (turnCount * 7 + etfId.length * 13) % 100;
    const randomFactor = 1 + (seed - 50) / 500 * volatility;
    
    // 市場擾動加成（如果有）
    let perturbationFactor = 1.0;
    let perturbationReason = '';
    if (marketContext && window.MarketPerturbationEngine) {
        const pertEffect = window.MarketPerturbationEngine.calculateEtfPerturbationEffect(
            etfId, 
            marketContext.perturbations || {}
        );
        perturbationFactor = 1 + (pertEffect.adjustment || 0);
        perturbationReason = pertEffect.reason || '';
    }
    
    const currentPrice = basePrice * priceFactor * randomFactor * perturbationFactor;
    
    // 計算相對基準價格的變化
    const change = currentPrice - basePrice;
    const changePercent = ((currentPrice - basePrice) / basePrice) * 100;
    
    return {
        price: Math.max(1, currentPrice), // 價格最低為1
        change: change,
        changePercent: changePercent,
        driverValue: driverValue,
        driverName: driver,
        perturbationFactor: perturbationFactor,
        perturbationReason: perturbationReason
    };
}

/**
 * 獲取所有ETF的當前價格
 * @param {Object} globalParams - 全球參數
 * @param {number} turnCount - 當前回合數
 * @returns {Object} 所有ETF價格
 */
function getAllETFPrices(globalParams, turnCount = 0) {
    const config = window.ETF_CONFIG?.ETF_PRODUCTS || {};
    const prices = {};
    
    Object.keys(config).forEach(etfId => {
        prices[etfId] = calculateETFPrice(etfId, globalParams, turnCount);
    });
    
    return prices;
}

/**
 * 執行ETF買入
 * @param {Object} player - 玩家狀態
 * @param {string} etfId - ETF ID
 * @param {number} amount - 買入金額（$M）
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 執行結果
 */
function buyETF(player, etfId, amount, globalParams) {
    const config = window.ETF_CONFIG?.ETF_PRODUCTS?.[etfId];
    const limits = window.ETF_CONFIG?.INVESTMENT_LIMITS || {};
    const costs = window.ETF_CONFIG?.TRANSACTION_COSTS || {};
    
    if (!config) {
        return { success: false, message: '無效的ETF', type: 'danger' };
    }
    
    // 檢查最小交易金額
    if (amount < (costs.minTransaction || 10)) {
        return { 
            success: false, 
            message: `最小交易金額為 $${costs.minTransaction || 10}M`, 
            type: 'warning' 
        };
    }
    
    // 檢查現金
    const totalCost = amount * (1 + (costs.buyFee || 0));
    if (player.cash < totalCost) {
        return { 
            success: false, 
            message: `現金不足，需要 $${totalCost.toFixed(1)}M（含手續費）`, 
            type: 'danger' 
        };
    }
    
    // 深拷貝玩家狀態
    const newPlayer = JSON.parse(JSON.stringify(player));
    
    // 初始化ETF投資記錄
    if (!newPlayer.etf_investments) {
        newPlayer.etf_investments = {};
    }
    
    // 計算當前價格和份額
    const priceInfo = calculateETFPrice(etfId, globalParams, player.turn_count || 0);
    const shares = amount / priceInfo.price;
    
    // 檢查投資上限
    const currentTotal = Object.values(newPlayer.etf_investments)
        .reduce((sum, inv) => sum + (inv.cost_basis || 0), 0);
    const maxTotal = (player.market_cap || 100) * (limits.maxTotalEtf || 0.5);
    
    if (currentTotal + amount > maxTotal) {
        return { 
            success: false, 
            message: `ETF總投資超限！最多 $${maxTotal.toFixed(0)}M（市值${(limits.maxTotalEtf || 0.5) * 100}%）`, 
            type: 'warning' 
        };
    }
    
    // 執行買入
    if (!newPlayer.etf_investments[etfId]) {
        newPlayer.etf_investments[etfId] = {
            shares: 0,
            cost_basis: 0,
            avg_price: 0
        };
    }
    
    const inv = newPlayer.etf_investments[etfId];
    const oldShares = inv.shares;
    const oldCost = inv.cost_basis;
    
    inv.shares = oldShares + shares;
    inv.cost_basis = oldCost + amount;
    inv.avg_price = inv.cost_basis / inv.shares;
    
    newPlayer.cash -= totalCost;
    
    return {
        success: true,
        player: newPlayer,
        message: `買入 ${config.name} ${shares.toFixed(2)} 股，花費 $${totalCost.toFixed(1)}M`,
        type: 'success',
        details: {
            etfId,
            shares,
            price: priceInfo.price,
            totalCost,
            fee: amount * (costs.buyFee || 0)
        }
    };
}

/**
 * 執行ETF賣出
 * @param {Object} player - 玩家狀態
 * @param {string} etfId - ETF ID
 * @param {number} shares - 賣出份額
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 執行結果
 */
function sellETF(player, etfId, shares, globalParams) {
    const config = window.ETF_CONFIG?.ETF_PRODUCTS?.[etfId];
    const costs = window.ETF_CONFIG?.TRANSACTION_COSTS || {};
    
    if (!config) {
        return { success: false, message: '無效的ETF', type: 'danger' };
    }
    
    const inv = player.etf_investments?.[etfId];
    if (!inv || inv.shares <= 0) {
        return { 
            success: false, 
            message: `沒有 ${config.name} 持倉`, 
            type: 'warning' 
        };
    }
    
    // 限制賣出數量
    const actualShares = Math.min(shares, inv.shares);
    
    // 深拷貝玩家狀態
    const newPlayer = JSON.parse(JSON.stringify(player));
    
    // 計算當前價格和收入
    const priceInfo = calculateETFPrice(etfId, globalParams, player.turn_count || 0);
    const grossProceeds = actualShares * priceInfo.price;
    const fee = grossProceeds * (costs.sellFee || 0);
    const netProceeds = grossProceeds - fee;
    
    // 計算盈虧
    const costBasisSold = (inv.cost_basis / inv.shares) * actualShares;
    const profitLoss = netProceeds - costBasisSold;
    
    // 更新持倉
    const newInv = newPlayer.etf_investments[etfId];
    newInv.shares -= actualShares;
    newInv.cost_basis -= costBasisSold;
    
    // 如果全部賣出，清除記錄
    if (newInv.shares <= 0.001) {
        delete newPlayer.etf_investments[etfId];
    }
    
    newPlayer.cash += netProceeds;
    
    const profitText = profitLoss >= 0 ? `盈利 $${profitLoss.toFixed(1)}M` : `虧損 $${Math.abs(profitLoss).toFixed(1)}M`;
    
    return {
        success: true,
        player: newPlayer,
        message: `賣出 ${config.name} ${actualShares.toFixed(2)} 股，獲得 $${netProceeds.toFixed(1)}M（${profitText}）`,
        type: profitLoss >= 0 ? 'success' : 'warning',
        details: {
            etfId,
            shares: actualShares,
            price: priceInfo.price,
            grossProceeds,
            netProceeds,
            fee,
            profitLoss
        }
    };
}

/**
 * 計算ETF分紅收益（每季度結算）
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 分紅結果
 */
function calculateETFDividends(player, globalParams) {
    const config = window.ETF_CONFIG?.ETF_PRODUCTS || {};
    const investments = player.etf_investments || {};
    
    let totalDividends = 0;
    const details = [];
    
    Object.entries(investments).forEach(([etfId, inv]) => {
        if (inv.shares > 0 && config[etfId]) {
            const etfConfig = config[etfId];
            const priceInfo = calculateETFPrice(etfId, globalParams, player.turn_count || 0);
            const value = inv.shares * priceInfo.price;
            const dividend = value * (etfConfig.dividendYield || 0);
            
            totalDividends += dividend;
            details.push({
                etfId,
                name: etfConfig.name,
                shares: inv.shares,
                value,
                dividendYield: etfConfig.dividendYield,
                dividend
            });
        }
    });
    
    return {
        totalDividends,
        details
    };
}

/**
 * 獲取玩家ETF投資組合摘要
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @returns {Object} 投資組合摘要
 */
function getETFPortfolioSummary(player, globalParams) {
    const config = window.ETF_CONFIG?.ETF_PRODUCTS || {};
    const investments = player.etf_investments || {};
    
    let totalValue = 0;
    let totalCost = 0;
    const holdings = [];
    
    Object.entries(investments).forEach(([etfId, inv]) => {
        if (inv.shares > 0 && config[etfId]) {
            const etfConfig = config[etfId];
            const priceInfo = calculateETFPrice(etfId, globalParams, player.turn_count || 0);
            const currentValue = inv.shares * priceInfo.price;
            const profitLoss = currentValue - inv.cost_basis;
            const profitLossPercent = (profitLoss / inv.cost_basis) * 100;
            
            totalValue += currentValue;
            totalCost += inv.cost_basis;
            
            holdings.push({
                etfId,
                name: etfConfig.name,
                icon: etfConfig.icon,
                color: etfConfig.color,
                shares: inv.shares,
                avgPrice: inv.avg_price,
                currentPrice: priceInfo.price,
                priceChange: priceInfo.changePercent,
                costBasis: inv.cost_basis,
                currentValue,
                profitLoss,
                profitLossPercent,
                weight: 0 // 稍後計算
            });
        }
    });
    
    // 計算權重
    holdings.forEach(h => {
        h.weight = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
    });
    
    return {
        totalValue,
        totalCost,
        totalProfitLoss: totalValue - totalCost,
        totalProfitLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
        holdings,
        holdingCount: holdings.length
    };
}

/**
 * 獲取競爭對手股票價格（基於RivalInvestmentEngine的健康度）
 * @param {Array} rivals - 競爭對手陣列
 * @param {Object} player - 玩家狀態
 * @returns {Array} 競爭對手股票資訊
 */
function getRivalStockPrices(rivals, player) {
    if (!rivals || !Array.isArray(rivals)) {
        return [];
    }
    
    return rivals.map(rival => {
        // 基於MP計算基礎股價
        const basePrice = 50 + (rival.mp || 0) * 2;
        
        // 健康度因子
        const trustFactor = ((rival.trust || 50) - 50) / 100;  // -0.5 to 0.5
        const hypeFactor = ((rival.hype || 50) - 50) / 200;    // -0.25 to 0.25
        const alignFactor = ((rival.alignment || 50) - 50) / 100;
        
        // 風險因子（熵和合規風險降低股價）
        const riskFactor = -((rival.entropy || 0) + (rival.compliance_risk || 0)) / 400;
        
        const priceFactor = 1 + trustFactor + hypeFactor + alignFactor + riskFactor;
        const currentPrice = Math.max(10, basePrice * priceFactor);
        
        // 玩家持有價值
        const invested = player?.rival_investments?.[rival.name] || 0;
        const estimatedShares = invested > 0 ? invested / (basePrice * 0.9) : 0; // 假設平均買入價略低
        const currentValue = estimatedShares * currentPrice;
        const profitLoss = currentValue - invested;
        
        return {
            name: rival.name,
            icon: rival.icon,
            style: rival.style,
            mp: rival.mp,
            basePrice,
            currentPrice,
            priceChange: ((currentPrice - basePrice) / basePrice) * 100,
            invested,
            estimatedShares,
            currentValue,
            profitLoss,
            profitLossPercent: invested > 0 ? (profitLoss / invested) * 100 : 0
        };
    });
}

// ============================================
// ETF 引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    window.ETFEngine = {
        calculateETFPrice,
        getAllETFPrices,
        buyETF,
        sellETF,
        calculateETFDividends,
        getETFPortfolioSummary,
        getRivalStockPrices
    };
    
    console.log('✓ ETF Engine loaded');
})();