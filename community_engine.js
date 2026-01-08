// ============================================
// 社群系統引擎 - Community Engine
// ============================================
// 功能：處理社群三指標的計算邏輯
// 設計：純函數式，僅接收數據參數/返回計算結果

/**
 * 取得社群規模等級
 * @param {number} size - 社群人數
 * @returns {Object} 規模等級配置
 */
function getCommunityTier(size) {
    const { SIZE_TIERS } = window.COMMUNITY_CONFIG || {};
    if (!SIZE_TIERS) return null;
    
    if (size <= SIZE_TIERS.SMALL.max) return { key: 'SMALL', ...SIZE_TIERS.SMALL };
    if (size <= SIZE_TIERS.MEDIUM.max) return { key: 'MEDIUM', ...SIZE_TIERS.MEDIUM };
    return { key: 'LARGE', ...SIZE_TIERS.LARGE };
}

/**
 * 取得情緒等級
 * @param {number} sentiment - 情緒值 (0-100)
 * @returns {Object} 情緒等級配置
 */
function getSentimentLevel(sentiment) {
    const { SENTIMENT } = window.COMMUNITY_CONFIG || {};
    if (!SENTIMENT) return null;
    
    const levels = SENTIMENT.LEVELS;
    if (sentiment <= levels.HOSTILE.max) return { key: 'HOSTILE', ...levels.HOSTILE };
    if (sentiment <= levels.NEGATIVE.max) return { key: 'NEGATIVE', ...levels.NEGATIVE };
    if (sentiment <= levels.NEUTRAL.max) return { key: 'NEUTRAL', ...levels.NEUTRAL };
    if (sentiment <= levels.POSITIVE.max) return { key: 'POSITIVE', ...levels.POSITIVE };
    return { key: 'DEVOTED', ...levels.DEVOTED };
}

/**
 * 取得活躍度等級
 * @param {number} engagement - 活躍度值 (0-100)
 * @returns {Object} 活躍度等級配置
 */
function getEngagementLevel(engagement) {
    const { ENGAGEMENT } = window.COMMUNITY_CONFIG || {};
    if (!ENGAGEMENT) return null;
    
    const levels = ENGAGEMENT.LEVELS;
    if (engagement <= levels.DEAD.max) return { key: 'DEAD', ...levels.DEAD };
    if (engagement <= levels.LOW.max) return { key: 'LOW', ...levels.LOW };
    if (engagement <= levels.MODERATE.max) return { key: 'MODERATE', ...levels.MODERATE };
    if (engagement <= levels.ACTIVE.max) return { key: 'ACTIVE', ...levels.ACTIVE };
    return { key: 'VIRAL', ...levels.VIRAL };
}

/**
 * 取得路線的社群偏好係數
 * @param {string} route - 技術路線名稱
 * @returns {Object} 路線偏好配置
 */
function getRoutePreference(route) {
    const { ROUTE_PREFERENCES } = window.COMMUNITY_CONFIG || {};
    if (!ROUTE_PREFERENCES || !ROUTE_PREFERENCES[route]) {
        return {
            community_dependency: 0.5,
            sentiment_sensitivity: 0.5,
            engagement_sensitivity: 0.5,
            description: '標準社群依賴'
        };
    }
    return ROUTE_PREFERENCES[route];
}

/**
 * 計算社群帶來的收入加成 (communityRevenue)
 * @param {Object} communityState - 社群狀態 { size, sentiment, engagement }
 * @param {string} route - 技術路線
 * @returns {number} 收入加成 (M)
 */
function calculateCommunityRevenue(communityState, route) {
    const config = window.COMMUNITY_CONFIG || {};
    const { size = 0, sentiment = 50, engagement = 30 } = communityState;
    
    if (size <= 0) return 0;
    
    // 取得各等級
    const sizeTier = getCommunityTier(size);
    const sentimentLevel = getSentimentLevel(sentiment);
    const engagementLevel = getEngagementLevel(engagement);
    const routePref = getRoutePreference(route);
    
    if (!sizeTier || !sentimentLevel || !engagementLevel) return 0;
    
    // 基礎收益 = 用戶數 × 每用戶收益
    const baseRevenue = size * config.REVENUE_PARAMS.BASE_REVENUE_PER_USER;
    
    // 情緒加成
    const sentimentMult = config.REVENUE_PARAMS.SENTIMENT_REVENUE_MULT[sentimentLevel.key] || 1.0;
    
    // 活躍度加成
    const engagementMult = config.ENGAGEMENT.EFFECT_MULTIPLIERS[engagementLevel.key] || 1.0;
    
    // 路線依賴度加成
    const routeMult = routePref.community_dependency;
    
    // 最終收益 = 基礎 × 情緒 × 活躍度 × 路線依賴
    let revenue = baseRevenue * sentimentMult * engagementMult * routeMult;
    
    // 應用規模上限
    const maxBonus = sizeTier.revenue_bonus_cap * 100; // 轉換為絕對值上限
    revenue = Math.min(revenue, maxBonus);
    
    return Math.round(revenue * 100) / 100;
}

/**
 * 計算社群產出的數據資源
 * @param {Object} communityState - 社群狀態
 * @returns {Object} { high_data, low_data }
 */
function calculateCommunityDataOutput(communityState) {
    const config = window.COMMUNITY_CONFIG || {};
    const { size = 0, sentiment = 50, engagement = 30 } = communityState;
    
    if (size <= 0) return { high_data: 0, low_data: 0 };
    
    // 取得等級
    const sizeTier = getCommunityTier(size);
    const sentimentLevel = getSentimentLevel(sentiment);
    const engagementLevel = getEngagementLevel(engagement);
    
    if (!sizeTier || !sentimentLevel || !engagementLevel) {
        return { high_data: 0, low_data: 0 };
    }
    
    // 基礎產出量 = (用戶數/10000) × 基礎產出 × 規模係數
    const baseOutput = (size / 10000) * 
        config.DATA_OUTPUT_PARAMS.BASE_DATA_PER_10K_USERS * 
        sizeTier.data_output_mult;
    
    // 活躍度影響產出總量
    const engagementMult = config.DATA_OUTPUT_PARAMS.ENGAGEMENT_OUTPUT_MULT[engagementLevel.key] || 1.0;
    const totalOutput = baseOutput * engagementMult;
    
    // 情緒決定高低級數據比例
    const qualityWeights = config.SENTIMENT.DATA_QUALITY_WEIGHTS[sentimentLevel.key] || 
        { high_ratio: 0.4, low_ratio: 0.6 };
    
    return {
        high_data: Math.round(totalOutput * qualityWeights.high_ratio),
        low_data: Math.round(totalOutput * qualityWeights.low_ratio)
    };
}

/**
 * 計算情緒變動（考慮規模阻力）
 * @param {Object} communityState - 社群狀態
 * @param {number} baseDelta - 基礎變動量
 * @returns {number} 實際變動量
 */
function calculateSentimentChange(communityState, baseDelta) {
    const { size = 0 } = communityState;
    const sizeTier = getCommunityTier(size);
    
    if (!sizeTier) return baseDelta;
    
    // 規模越大，情緒越難改變
    const resistance = sizeTier.sentiment_resistance;
    return baseDelta / resistance;
}

/**
 * 執行社群戰略
 * @param {Object} player - 玩家狀態
 * @param {string} strategyId - 戰略ID
 * @returns {Object} { success, player, message, type }
 */
function executeCommunityStrategy(player, strategyId) {
    const config = window.COMMUNITY_CONFIG || {};
    const strategy = config.STRATEGIES[strategyId];
    
    if (!strategy) {
        return {
            success: false,
            player: player,
            message: '未知的社群戰略',
            type: 'danger'
        };
    }
    
    // 深拷貝玩家狀態
    let newPlayer = JSON.parse(JSON.stringify(player));
    
    // 確保社群狀態存在
    if (!newPlayer.community) {
        newPlayer.community = {
            size: newPlayer.community_size || 0,
            sentiment: config.SENTIMENT.DEFAULT,
            engagement: config.ENGAGEMENT.DEFAULT
        };
    }
    
    // 檢查前置條件
    if (strategy.requires) {
        if (strategy.requires.min_engagement && 
            newPlayer.community.engagement < strategy.requires.min_engagement) {
            return {
                success: false,
                player: newPlayer,
                message: `需要活躍度達到 ${strategy.requires.min_engagement}`,
                type: 'warning'
            };
        }
    }
    
    // 檢查費用
    if (strategy.costs && strategy.costs.cash) {
        if (newPlayer.cash < strategy.costs.cash) {
            return {
                success: false,
                player: newPlayer,
                message: `現金不足，需要 $${strategy.costs.cash}M`,
                type: 'warning'
            };
        }
        newPlayer.cash -= strategy.costs.cash;
    }
    
    // 特殊處理：壓制輿論有成功機率
    let effects = strategy.effects;
    if (strategyId === 'suppress_sentiment' && strategy.success_chance) {
        if (Math.random() < strategy.success_chance) {
            effects = strategy.success_effects;
        }
    }
    
    // 應用效果
    const messages = [];
    
    // 規模增長（改用 MarketingEngine 如果有定義 marketing_investment）
    if (effects.marketing_investment && window.MarketingEngine) {
        // 新機制：通過行銷引擎計算增長
        const growthResult = window.MarketingEngine.calculateQuarterlyGrowth(
            newPlayer.community,
            effects.marketing_investment
        );
        newPlayer.community.size += growthResult.marketingGain;
        messages.push(`行銷帶來 ${growthResult.marketingGain.toLocaleString()} 新粉絲`);
    } else if (effects.size_growth_rate) {
        // 舊機制：百分比增長（保留向後兼容）
        const growth = Math.round(newPlayer.community.size * effects.size_growth_rate);
        newPlayer.community.size += growth;
        messages.push(`社群增長 ${growth.toLocaleString()} 人`);
    }
    
    // 情緒變化
    if (effects.sentiment_change) {
        const actualChange = calculateSentimentChange(newPlayer.community, effects.sentiment_change);
        newPlayer.community.sentiment = Math.max(0, Math.min(100, 
            newPlayer.community.sentiment + actualChange));
        messages.push(`情緒 ${actualChange >= 0 ? '+' : ''}${actualChange.toFixed(1)}`);
    }
    
    // 活躍度變化
    if (effects.engagement_change) {
        newPlayer.community.engagement = Math.max(0, Math.min(100,
            newPlayer.community.engagement + effects.engagement_change));
        messages.push(`活躍度 ${effects.engagement_change >= 0 ? '+' : ''}${effects.engagement_change}`);
    }
    
    // Hype 變化
    if (effects.hype_change) {
        newPlayer.hype = Math.max(0, newPlayer.hype + effects.hype_change);
    }
    
    // Trust 變化
    if (effects.trust_change) {
        newPlayer.trust = Math.max(0, Math.min(100, newPlayer.trust + effects.trust_change));
    }
    
    // 數據獲得
    if (effects.high_data_gain) {
        newPlayer.high_data = (newPlayer.high_data || 0) + effects.high_data_gain;
    }
    if (effects.low_data_gain) {
        newPlayer.low_data = (newPlayer.low_data || 0) + effects.low_data_gain;
    }
    
    // MP 提升
    if (effects.mp_boost) {
        newPlayer.model_power = Math.min(110, newPlayer.model_power + effects.mp_boost);
    }
    
    // 合規風險
    if (effects.compliance_risk_change) {
        newPlayer.regulation = Math.max(0, Math.min(100, 
            newPlayer.regulation + effects.compliance_risk_change));
    }
    
    // 同步舊欄位
    newPlayer.community_size = newPlayer.community.size;
    
    return {
        success: true,
        player: newPlayer,
        message: `${strategy.name}：${messages.join('、')}`,
        type: 'success'
    };
}

/**
 * 處理社群每季自動更新
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全局參數
 * @returns {Object} { player, dataGained, revenueGained, events }
 */
function processCommunityTurnUpdate(player, globalParams) {
    const config = window.COMMUNITY_CONFIG || {};
    let newPlayer = JSON.parse(JSON.stringify(player));
    const events = [];
    
    // 確保社群狀態存在
    if (!newPlayer.community) {
        newPlayer.community = {
            size: newPlayer.community_size || 0,
            sentiment: config.SENTIMENT?.DEFAULT || 50,
            engagement: config.ENGAGEMENT?.DEFAULT || 30
        };
    }
    
    // 如果社群尚未解鎖（Tier 1 前），跳過處理
    if ((newPlayer.mp_tier || 0) < 1) {
        return { 
            player: newPlayer, 
            dataGained: { high_data: 0, low_data: 0 }, 
            revenueGained: 0, 
            events: [],
            wordOfMouthGain: 0
        };
    }
    
    const community = newPlayer.community;
    
    // === 1. 自然活躍度衰減 ===
    const engagementDecay = 2;
    community.engagement = Math.max(0, community.engagement - engagementDecay);
    
    // === 2. 情緒自然回歸中性 ===
    if (community.sentiment > 50) {
        community.sentiment = Math.max(50, community.sentiment - 1);
    } else if (community.sentiment < 50) {
        community.sentiment = Math.min(50, community.sentiment + 1);
    }
    
    // === 3. 計算社群收益 ===
    const revenueGained = calculateCommunityRevenue(community, newPlayer.route);
    newPlayer.community_revenue = revenueGained;
    
    // === 4. 計算數據產出 ===
    const dataGained = calculateCommunityDataOutput(community);
    newPlayer.high_data = (newPlayer.high_data || 0) + dataGained.high_data;
    newPlayer.low_data = (newPlayer.low_data || 0) + dataGained.low_data;
    
    // === 5. 口碑自然增長（使用 MarketingEngine） ===
    let wordOfMouthGain = 0;
    if (community.size > 0) {
        if (window.MarketingEngine) {
            // 新機制：使用行銷引擎計算口碑增長
            wordOfMouthGain = window.MarketingEngine.calculateWordOfMouthGrowth(community);
            community.size = Math.max(0, community.size + wordOfMouthGain);
        } else {
            // 舊機制備援：簡單的百分比增長
            const growthRate = 0.005; // 0.5% 基礎增長
            wordOfMouthGain = Math.round(community.size * growthRate);
            community.size = community.size + wordOfMouthGain;
        }
    }
    
    // === 6. 檢查事件觸發 ===
    const eventResult = checkCommunityEventTriggers(community);
    if (eventResult) {
        events.push(eventResult);
        // 應用事件效果
        if (eventResult.effects) {
            if (eventResult.effects.size_loss_rate) {
                const loss = Math.round(community.size * eventResult.effects.size_loss_rate);
                community.size = Math.max(0, community.size - loss);
            }
            if (eventResult.effects.size_growth_rate) {
                const growth = Math.round(community.size * eventResult.effects.size_growth_rate);
                community.size += growth;
            }
            if (eventResult.effects.hype) newPlayer.hype = Math.max(0, newPlayer.hype + eventResult.effects.hype);
            if (eventResult.effects.trust) newPlayer.trust = Math.max(0, Math.min(100, newPlayer.trust + eventResult.effects.trust));
            if (eventResult.effects.sentiment) community.sentiment = Math.max(0, Math.min(100, community.sentiment + eventResult.effects.sentiment));
            if (eventResult.effects.engagement) community.engagement = Math.max(0, Math.min(100, community.engagement + eventResult.effects.engagement));
            if (eventResult.effects.high_data) newPlayer.high_data += eventResult.effects.high_data;
            if (eventResult.effects.mp_boost) newPlayer.model_power = Math.min(110, newPlayer.model_power + eventResult.effects.mp_boost);
            if (eventResult.effects.regulation) newPlayer.regulation = Math.max(0, Math.min(100, newPlayer.regulation + eventResult.effects.regulation));
        }
    }
    
    // 同步舊欄位
    newPlayer.community_size = community.size;
    
    return {
        player: newPlayer,
        dataGained,
        revenueGained,
        events,
        wordOfMouthGain
    };
}

/**
 * 檢查社群事件觸發
 * @param {Object} community - 社群狀態
 * @returns {Object|null} 觸發的事件或 null
 */
function checkCommunityEventTriggers(community) {
    const config = window.COMMUNITY_CONFIG || {};
    const triggers = config.EVENT_TRIGGERS || {};
    const pools = config.EVENT_POOLS || {};
    
    // 只有 20% 機率觸發事件
    if (Math.random() > 0.2) return null;
    
    let poolKey = null;
    
    // 檢查各觸發條件
    if (community.sentiment <= 20) {
        poolKey = 'community_negative';
    } else if (community.sentiment >= 80) {
        poolKey = 'community_positive';
    } else if (community.engagement >= 90) {
        poolKey = 'viral_events';
    } else if (community.engagement <= 10) {
        poolKey = 'community_decline';
    }
    
    if (!poolKey || !pools[poolKey] || pools[poolKey].length === 0) {
        return null;
    }
    
    // 隨機選擇事件
    const pool = pools[poolKey];
    const event = pool[Math.floor(Math.random() * pool.length)];
    
    return {
        ...event,
        pool: poolKey
    };
}

/**
 * 取得社群摘要資訊
 * @param {Object} player - 玩家狀態
 * @returns {Object} 社群摘要
 */
function getCommunitySummary(player) {
    const config = window.COMMUNITY_CONFIG || {};
    const community = player.community || {
        size: player.community_size || 0,
        sentiment: config.SENTIMENT?.DEFAULT || 50,
        engagement: config.ENGAGEMENT?.DEFAULT || 30
    };
    
    const sizeTier = getCommunityTier(community.size);
    const sentimentLevel = getSentimentLevel(community.sentiment);
    const engagementLevel = getEngagementLevel(community.engagement);
    const routePref = getRoutePreference(player.route);
    
    // 預估下季收益
    const estimatedRevenue = calculateCommunityRevenue(community, player.route);
    const estimatedData = calculateCommunityDataOutput(community);
    
    return {
        size: community.size,
        sizeTier: sizeTier,
        sentiment: community.sentiment,
        sentimentLevel: sentimentLevel,
        engagement: community.engagement,
        engagementLevel: engagementLevel,
        routePreference: routePref,
        estimatedRevenue: estimatedRevenue,
        estimatedData: estimatedData,
        // 計算效果強度
        effectMultiplier: config.ENGAGEMENT?.EFFECT_MULTIPLIERS?.[engagementLevel?.key] || 1.0
    };
}

/**
 * 初始化社群狀態（用於 Tier 1 解鎖時）
 * @param {Object} player - 玩家狀態
 * @returns {Object} 初始化後的玩家狀態
 */
function initializeCommunityState(player) {
    const config = window.COMMUNITY_CONFIG || {};
    const routePref = getRoutePreference(player.route);
    
    // 基於路線設定初始社群
    const baseSize = 1000;
    const routeBonus = routePref.community_dependency;
    
    const newPlayer = { ...player };
    newPlayer.community = {
        size: Math.round(baseSize * (0.5 + routeBonus)),
        sentiment: config.SENTIMENT?.DEFAULT || 50,
        engagement: config.ENGAGEMENT?.DEFAULT + (routeBonus * 20) || 30
    };
    newPlayer.community_size = newPlayer.community.size;
    
    return newPlayer;
}

// ============================================
// 社群引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    window.CommunityEngine = {
        // 等級取得
        getCommunityTier,
        getSentimentLevel,
        getEngagementLevel,
        getRoutePreference,
        
        // 收益計算
        calculateCommunityRevenue,
        calculateCommunityDataOutput,
        calculateSentimentChange,
        
        // 戰略執行
        executeCommunityStrategy,
        
        // 回合處理
        processCommunityTurnUpdate,
        checkCommunityEventTriggers,
        
        // 輔助功能
        getCommunitySummary,
        initializeCommunityState
    };
    
    // 如果 GameEngine 已存在，掛載接口
    if (window.GameEngine) {
        window.GameEngine.executeCommunityStrategy = executeCommunityStrategy;
        window.GameEngine.processCommunityTurnUpdate = processCommunityTurnUpdate;
        window.GameEngine.getCommunitySummary = getCommunitySummary;
        window.GameEngine.initializeCommunityState = initializeCommunityState;
    }
    
    console.log('✓ Community Engine loaded');
})();
