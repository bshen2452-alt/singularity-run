// ============================================
// 競爭對手投資引擎
// ============================================

/**
 * 執行競爭對手投資行動
 * @param {Object} player - 玩家狀態
 * @param {string} rivalName - 競爭對手名稱
 * @param {number} amount - 投資金額（正數為投資，負數為贖回）
 * @returns {Object} 結果對象，包含新玩家狀態和訊息
 */
function executeRivalInvestment(player, rivalName, amount) {
    // 深拷貝玩家狀態
    let newPlayer = JSON.parse(JSON.stringify(player));
    let message = '';
    let messageType = 'info';
    
    // 參數驗證
    if (!rivalName || rivalName.trim() === '') {
        return {
            success: false,
            player: player,
            message: '請指定競爭對手名稱',
            type: 'danger'
        };
    }
    
    if (amount === 0 || isNaN(amount)) {
        return {
            success: false,
            player: player,
            message: '請指定有效的投資金額',
            type: 'warning'
        };
    }
    
    // 初始化投資記錄
    if (!newPlayer.rival_investments) {
        newPlayer.rival_investments = {};
    }
    
    const currentInvestment = newPlayer.rival_investments[rivalName] || 0;
    
    if (amount > 0) {
        // === 投資競爭對手 ===
        if (newPlayer.cash < amount) {
            return {
                success: false,
                player: player,
                message: `現金不足，需要 $${amount}M 進行投資`,
                type: 'danger'
            };
        }
        
        // 檢查投資上限（基於公司規模）
        const maxInvestmentPerRival = (newPlayer.market_cap || 100) * 0.2; // 最多投資市值的20%
        const proposedTotal = currentInvestment + amount;
        
        if (proposedTotal > maxInvestmentPerRival) {
            return {
                success: false,
                player: player,
                message: `投資額度超限！最多可投資 $${maxInvestmentPerRival.toFixed(1)}M（市值的20%）`,
                type: 'warning'
            };
        }
        
        // 執行投資
        newPlayer.cash -= amount;
        newPlayer.rival_investments[rivalName] = currentInvestment + amount;
        
        // 投資效果
        const investmentEffects = calculateInvestmentEffects(newPlayer, rivalName, amount, 'invest');
        
        // 更新玩家參數
        if (investmentEffects.trustChange) {
            newPlayer.trust = Math.max(-50, Math.min(100, (newPlayer.trust || 0) + investmentEffects.trustChange));
        }
        
        if (investmentEffects.hypeChange) {
            newPlayer.hype = Math.min(200, (newPlayer.hype || 0) + investmentEffects.hypeChange);
        }
        
        message = `投資 ${rivalName} $${amount}M${investmentEffects.messageSuffix}`;
        messageType = 'info';
        
    } else if (amount < 0) {
        // === 贖回投資 ===
        const redeemAmount = Math.min(Math.abs(amount), currentInvestment);
        
        if (redeemAmount <= 0) {
            return {
                success: false,
                player: player,
                message: `沒有對 ${rivalName} 的投資可以贖回`,
                type: 'warning'
            };
        }
        
        // 計算贖回收益（有10%手續費損失）
        const redemptionFeeRate = 0.10; // 10%手續費
        const cashReturn = redeemAmount * (1 - redemptionFeeRate);
        
        // 贖回效果計算
        const redemptionEffects = calculateInvestmentEffects(newPlayer, rivalName, -redeemAmount, 'redeem');
        
        // 執行贖回
        newPlayer.cash += cashReturn;
        newPlayer.rival_investments[rivalName] = currentInvestment - redeemAmount;
        
        // 如果贖回後投資為0，清理記錄
        if (newPlayer.rival_investments[rivalName] <= 0) {
            delete newPlayer.rival_investments[rivalName];
        }
        
        // 更新玩家參數
        if (redemptionEffects.trustChange) {
            newPlayer.trust = Math.max(-50, Math.min(100, (newPlayer.trust || 0) + redemptionEffects.trustChange));
        }
        
        if (redemptionEffects.hypeChange) {
            newPlayer.hype = Math.min(200, (newPlayer.hype || 0) + redemptionEffects.hypeChange);
        }
        
        message = `從 ${rivalName} 贖回 $${redeemAmount}M，獲得 $${cashReturn.toFixed(1)}M（10%手續費）${redemptionEffects.messageSuffix}`;
        messageType = 'info';
    }
    
    return {
        success: true,
        player: newPlayer,
        message: message,
        type: messageType,
        rivalName: rivalName,
        amount: Math.abs(amount),
        isInvestment: amount > 0,
        currentInvestment: newPlayer.rival_investments[rivalName] || 0
    };
}

/**
 * 計算投資/贖回的效果
 */
function calculateInvestmentEffects(player, rivalName, amount, actionType) {
    const effects = {
        trustChange: 0,
        hypeChange: 0,
        messageSuffix: ''
    };
    
    // 根據競爭對手類型產生不同效果
    const rivalConfig = GameConfig.RIVALS_CONFIG?.find(r => r.name === rivalName);
    
    if (rivalConfig) {
        switch (rivalConfig.style) {
            case '極致擴張': // Titan Sigma
                if (actionType === 'invest') {
                    effects.hypeChange = amount * 0.05; // 5%炒作加成
                    effects.messageSuffix = '（高風險高回報）';
                } else {
                    effects.trustChange = -3; // 贖回可能被視為缺乏信心
                }
                break;
                
            case '安全優先': // Ethos Guard
                if (actionType === 'invest') {
                    effects.trustChange = amount * 0.03; // 3%信任加成
                    effects.messageSuffix = '（穩健投資）';
                } else {
                    effects.trustChange = -1; // 小幅信任損失
                }
                break;
                
            case '平衡發展': // Nexus Dynamics
                if (actionType === 'invest') {
                    effects.trustChange = amount * 0.015;
                    effects.hypeChange = amount * 0.015;
                    effects.messageSuffix = '（平衡策略）';
                }
                break;
                
            case '創意爆發': // Phantom Studio
                if (actionType === 'invest') {
                    effects.hypeChange = amount * 0.08; // 8%炒作加成
                    effects.trustChange = -amount * 0.02; // 2%信任損失
                    effects.messageSuffix = '（高炒作投資）';
                } else {
                    effects.hypeChange = -5; // 贖回降低炒作
                }
                break;
                
            case '硬體重型': // Golem Industries
                if (actionType === 'invest') {
                    effects.trustChange = amount * 0.04; // 4%信任加成
                    effects.messageSuffix = '（實體投資）';
                }
                break;
                
            case '專業防禦': // Fortress Protocol
                if (actionType === 'invest') {
                    effects.trustChange = amount * 0.06; // 6%信任加成
                    effects.hypeChange = -amount * 0.01; // 1%炒作降低
                    effects.messageSuffix = '（專業投資）';
                } else {
                    effects.trustChange = -5; // 較大信任損失
                }
                break;
        }
    }
    
    // 玩家路線的影響
    const playerRoute = player.route;
    switch (playerRoute) {
        case 'OpenSource':
            if (actionType === 'invest') {
                effects.trustChange += amount * 0.01; // 開源路線信任加成
            }
            break;
        case 'Military':
            if (actionType === 'invest') {
                effects.trustChange -= amount * 0.02; // 軍事路線信任懲罰
            }
            break;
    }
    
    // 數值限制
    effects.trustChange = Math.max(-10, Math.min(10, Math.floor(effects.trustChange)));
    effects.hypeChange = Math.max(-10, Math.min(10, Math.floor(effects.hypeChange)));
    
    return effects;
}

/**
 * 計算季度投資收益
 * @param {Object} player - 玩家狀態
 * @param {Array} rivals - 競爭對手陣列
 * @returns {Object} 收益計算結果
 */
function calculateInvestmentReturns(player, rivals) {
    if (!player.rival_investments || Object.keys(player.rival_investments).length === 0) {
        return {
            totalIncome: 0,
            details: [],
            rivalMap: {}
        };
    }
    
    let totalIncome = 0;
    const details = [];
    
    // 建立競爭對手映射
    const rivalMap = {};
    rivals.forEach(r => {
        rivalMap[r.name] = r;
    });
    
    // 計算每個對手的投資收益
    Object.entries(player.rival_investments).forEach(([name, amount]) => {
        if (amount > 0 && rivalMap[name]) {
            const rival = rivalMap[name];
            
            // 計算對手的財務健康度（0-100）
            const mpHealth = Math.min(100, rival.mp / 1.05); // MP轉換
            const trustHealth = Math.min(100, rival.trust);
            const hypeHealth = Math.min(100, rival.hype);
            const alignmentHealth = Math.min(100, rival.alignment);
            
            // 不同風格的投資者看重不同指標
            let financialHealth;
            switch (rival.style) {
                case '極致擴張': // 看重MP和炒作
                    financialHealth = (mpHealth * 0.4 + hypeHealth * 0.4 + trustHealth * 0.2) / 3;
                    break;
                case '安全優先': // 看重信任和對齊
                    financialHealth = (trustHealth * 0.5 + alignmentHealth * 0.4 + mpHealth * 0.1) / 3;
                    break;
                case '創意爆發': // 看重炒作
                    financialHealth = (hypeHealth * 0.7 + mpHealth * 0.3) / 2;
                    break;
                case '專業防禦': // 看重信任和對齊
                    financialHealth = (trustHealth * 0.6 + alignmentHealth * 0.4) / 2;
                    break;
                default: // 平衡發展
                    financialHealth = (mpHealth + trustHealth + hypeHealth + alignmentHealth) / 4;
            }
            
            // 基礎回報率（0-5%）
            const baseReturnRate = (financialHealth / 100) * 0.05;
            
            // 玩家路線加成
            let routeBonus = 0;
            switch (player.route) {
                case 'Scaling Law':
                    routeBonus = 0.005; // +0.5%
                    break;
                case 'Efficiency':
                    routeBonus = 0.003; // +0.3%
                    break;
                case 'OpenSource':
                    routeBonus = 0.004; // +0.4%
                    break;
            }
            
            // 信任度加成
            const trustBonus = Math.min(0.02, (player.trust || 0) * 0.0002); // 每點信任+0.02%
            
            const finalReturnRate = baseReturnRate + routeBonus + trustBonus;
            const income = amount * finalReturnRate;
            
            totalIncome += income;
            
            details.push({
                rivalName: name,
                amount: amount,
                healthScore: financialHealth.toFixed(1),
                returnRate: (finalReturnRate * 100).toFixed(2) + '%',
                income: income.toFixed(1)
            });
        }
    });
    
    return {
        totalIncome: totalIncome,
        details: details,
        rivalMap: rivalMap
    };
}

/**
 * 獲取可投資的競爭對手信息
 * @param {Array} rivals - 競爭對手陣列
 * @param {Object} player - 玩家狀態（可選）
 * @returns {Array} 投資信息
 */
function getRivalInvestmentInfo(rivals, player = null) {
    return rivals.map(rival => {
        const info = {
            name: rival.name,
            style: rival.style,
            icon: rival.icon,
            mp: rival.mp,
            hype: rival.hype,
            trust: rival.trust,
            alignment: rival.alignment,
            description: rival.description,
            investmentPotential: 0,
            riskLevel: 'medium'
        };
        
        // 計算投資潛力（基於對手狀態）
        const growthScore = (rival.mp / 1005) * 50; // MP潛力
        const stabilityScore = ((rival.trust + rival.alignment) / 200) * 30; // 穩定性
        const hypeScore = (rival.hype / 200) * 20; // 炒作潛力
        
        info.investmentPotential = Math.min(100, growthScore + stabilityScore + hypeScore);
        
        // 風險評估
        if (rival.entropy > 70 || rival.compliance_risk > 80) {
            info.riskLevel = 'high';
        } else if (rival.mp < 30 && rival.hype > 100) {
            info.riskLevel = 'high'; // 炒作過高的早期公司
        } else if (rival.trust > 70 && rival.alignment > 70) {
            info.riskLevel = 'low';
        }
        
        // 如果提供玩家信息，計算當前投資
        if (player && player.rival_investments) {
            info.currentInvestment = player.rival_investments[rival.name] || 0;
            info.maxInvestment = (player.market_cap || 100) * 0.2; // 市值20%
        }
        
        return info;
    });
}

/**
 * 獲取投資建議
 * @param {Array} rivals - 競爭對手陣列
 * @param {Object} player - 玩家狀態
 * @returns {Array} 投資建議
 */
function getInvestmentRecommendations(rivals, player) {
    const investmentInfo = getRivalInvestmentInfo(rivals, player);
    
    // 根據玩家路線推薦
    const route = player.route;
    const recommendations = [];
    
    investmentInfo.forEach(rival => {
        let recommendation = null;
        
        switch (route) {
            case 'Scaling Law':
                if (rival.style === '極致擴張' || rival.hype > 80) {
                    recommendation = {
                        rival: rival.name,
                        reason: '擴張風格與你的路線相符',
                        priority: 'high'
                    };
                }
                break;
                
            case 'OpenSource':
                if (rival.style === '安全優先' || rival.trust > 70) {
                    recommendation = {
                        rival: rival.name,
                        reason: '信任度高，與開源理念相符',
                        priority: 'high'
                    };
                }
                break;
                
            case 'Efficiency':
                if (rival.style === '平衡發展' || (rival.entropy < 40 && rival.compliance_risk < 50)) {
                    recommendation = {
                        rival: rival.name,
                        reason: '風險較低，適合效率優先策略',
                        priority: 'medium'
                    };
                }
                break;
                
            case 'Military':
                if (rival.style === '專業防禦') {
                    recommendation = {
                        rival: rival.name,
                        reason: '專業防禦與軍事路線協同',
                        priority: 'high'
                    };
                }
                break;
                
            case 'Multimodal':
                if (rival.style === '創意爆發') {
                    recommendation = {
                        rival: rival.name,
                        reason: '創意路線與多模態協同',
                        priority: 'medium'
                    };
                }
                break;
                
            case 'Embodied':
                if (rival.style === '硬體重型') {
                    recommendation = {
                        rival: rival.name,
                        reason: '硬體路線與具身智慧協同',
                        priority: 'medium'
                    };
                }
                break;
        }
        
        if (recommendation) {
            recommendations.push(recommendation);
        }
    });
    
    return recommendations;
}

// ============================================
// 競爭對手投資引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    // 註冊競爭對手投資引擎到全局
    window.RivalInvestmentEngine = {
        executeRivalInvestment,
        calculateInvestmentEffects,
        calculateInvestmentReturns,
        getRivalInvestmentInfo,
        getInvestmentRecommendations,
    };
    
    // 如果 GameEngine 已存在，也掛載到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.executeRivalInvestment = executeRivalInvestment;
        window.GameEngine.calculateInvestmentEffects = calculateInvestmentEffects;
        window.GameEngine.calculateInvestmentReturns = calculateInvestmentReturns;
        window.GameEngine.getRivalInvestmentInfo = getRivalInvestmentInfo;
        window.GameEngine.getInvestmentRecommendations = getInvestmentRecommendations;
    }
    
    console.log('✓ Rival Investment Engine loaded');
})();