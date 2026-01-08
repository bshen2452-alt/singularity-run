// ============================================
// 事件引擎 - 全球事件 / 隨機事件 / Doom Gauge
// ============================================
// Tier1-3: 使用 GLOBAL_EVENTS 傳統事件池
// Tier4: 整合 GlobalMarketEngine 事件系統
// ============================================

/**
 * 產生全球事件
 * - Tier1-3: 基於 GameConfig.GLOBAL_EVENTS
 * - Tier4: 整合 GlobalMarketEngine 事件
 * @param {Object} playerState - 玩家狀態（用於判斷 Tier）
 */
function generateGlobalEvent(playerState) {
    const currentTier = playerState?.mp_tier || 0;
    
    // Tier4+: 使用全球市場系統的事件
    if (currentTier >= 4 && playerState?.global_market) {
        return generateTier4GlobalEvent(playerState);
    }
    
    // Tier1-3: 使用傳統事件池
    if (!GameConfig || !GameConfig.GLOBAL_EVENTS) {
        console.warn("generateGlobalEvent(): GLOBAL_EVENTS 未定義");
        return null;
    }

    const events = GameConfig.GLOBAL_EVENTS;

    // 80% 觸發一般事件
    if (Math.random() < 0.8) {
        return events[Math.floor(Math.random() * (events.length - 1))];
    }

    // 20% 機率平靜的一季（最後一項）
    return events[events.length - 1];
}

/**
 * Tier4 全球事件產生（從 GlobalMarketEngine 獲取）
 * @param {Object} playerState - 玩家狀態
 */
function generateTier4GlobalEvent(playerState) {
    const marketState = playerState.global_market;
    if (!marketState) return null;
    
    // 檢查進行中的全球市場事件
    const activeEvents = marketState.active_events || [];
    
    if (activeEvents.length > 0) {
        // 回傳最新的活躍事件作為本季全球事件
        const latestEvent = activeEvents[activeEvents.length - 1];
        const eventConfig = window.GlobalMarketConfig?.EVENT_IMPACTS?.[latestEvent.id];
        
        return {
            title: getEventTitle(latestEvent.id),
            desc: eventConfig?.description || getEventDescription(latestEvent.id),
            effect: convertMarketEventToEffect(latestEvent),
            source: 'global_market',
            event_id: latestEvent.id,
            remaining_turns: latestEvent.remaining
        };
    }
    
    // 無活躍事件時，有機率產生傳統事件
    if (Math.random() < 0.3 && GameConfig?.GLOBAL_EVENTS) {
        const events = GameConfig.GLOBAL_EVENTS;
        return events[Math.floor(Math.random() * events.length)];
    }
    
    // 平靜的一季
    return {
        title: "全球市場穩定",
        desc: "本季全球市場相對平穩，無重大事件。",
        effect: {},
        source: 'global_market'
    };
}

/**
 * 取得全球市場事件標題
 */
function getEventTitle(eventId) {
    const titles = {
        geopolitical_tension: "地緣政治緊張",
        energy_crisis: "能源危機",
        chip_shortage: "晶片短缺",
        central_bank_pivot: "央行政策轉向",
        ai_bubble_concern: "AI 泡沫擔憂",
        tech_optimism_wave: "科技樂觀浪潮",
        renewable_breakthrough: "綠能技術突破"
    };
    return titles[eventId] || "全球市場事件";
}

/**
 * 取得全球市場事件描述
 */
function getEventDescription(eventId) {
    const descriptions = {
        geopolitical_tension: "國際局勢緊張，供應鏈與市場信心受到衝擊。",
        energy_crisis: "能源供應緊縮，電力成本大幅上升。",
        chip_shortage: "半導體產能不足，GPU 價格飆漲。",
        central_bank_pivot: "主要央行調整貨幣政策，影響融資環境。",
        ai_bubble_concern: "市場對 AI 產業估值產生質疑，投資趨於保守。",
        tech_optimism_wave: "科技股迎來新一波樂觀情緒，投資熱度上升。",
        renewable_breakthrough: "綠能技術取得重大突破，能源成本有望下降。"
    };
    return descriptions[eventId] || "全球市場發生變化。";
}

/**
 * 將全球市場事件轉換為傳統效果格式
 */
function convertMarketEventToEffect(marketEvent) {
    const effect = {};
    
    // 將市場指數變化轉換為玩家可感知的效果
    if (marketEvent.effects) {
        Object.entries(marketEvent.effects).forEach(([indexId, value]) => {
            switch (indexId) {
                case 'gpu_price':
                    effect.P_GPU_change = value / 100;
                    break;
                case 'energy_price':
                    effect.E_Price_change = value / 100;
                    break;
                case 'interest_rate':
                    effect.R_base_change = value / 100;
                    break;
                case 'market_confidence':
                    effect.I_Hype_change = value / 100;
                    if (value < 0) {
                        effect.hype = Math.round(value / 2);
                    }
                    break;
            }
        });
    }
    
    return effect;
}


/**
 * 計算 Doom Gauge（可自訂你的判定邏輯）
 * @param {Object} player - 玩家狀態
 * @returns {Object} doomGauge - { risk1: %, risk2: %, ... }
 */
function calculateDoomGauge(player) {
    if (!player) return {};

    const baseGauge = {
        regulation: player.regulation,          // 法規風險
        entropy: player.entropy,                // 混亂風險
        compliance_risk: player.compliance_risk // 合規風險
    };
    
    // Tier4: 加入全球市場健康度影響
    if (player.mp_tier >= 4 && player.global_market && window.GlobalMarketEngine) {
        const marketHealth = window.GlobalMarketEngine.getMarketHealth(player.global_market);
        
        // 市場壓力時增加外部制裁風險
        if (marketHealth.level === 'stressed') {
            baseGauge.external_sanction_pressure = 10;
        } else if (marketHealth.level === 'crisis') {
            baseGauge.external_sanction_pressure = 25;
        }
    }

    return baseGauge;
}


/**
 * 產生隨機事件（基於 Doom Gauge）
 * - 若無風險超過 50 → 小機率觸發中性事件
 * - 若某項風險 > 50 → 有機率觸發此風險對應的事件池
 */
function generateRandomEvent(player, doomGauge) {
    if (!GameConfig || !GameConfig.EVENT_POOL) {
        console.warn("generateRandomEvent(): EVENT_POOL 未定義");
        return null;
    }

    const eventPool = GameConfig.EVENT_POOL;
    
    // 收集所有高風險因子（閾值 > 50）
    const highRiskFactors = [];
    
    // 檢查 doomGauge 中的風險指標
    if (doomGauge) {
        for (const [key, value] of Object.entries(doomGauge)) {
            if (typeof value === 'number' && value > 50) {
                highRiskFactors.push({ key, value });
            }
        }
    }
    
    // 也檢查玩家狀態中的風險指標
    const playerRiskKeys = ['regulation', 'entropy', 'compliance_risk'];
    for (const key of playerRiskKeys) {
        const value = player ? player[key] : 0;
        if (typeof value === 'number' && value > 50 && !highRiskFactors.find(f => f.key === key)) {
            highRiskFactors.push({ key, value });
        }
    }

    // 若沒有高風險 → 小機率觸發中性事件
    if (highRiskFactors.length === 0) {
        if (Math.random() < 0.15) {
            const neutralPool = eventPool.neutral;
            if (neutralPool && neutralPool.length > 0) {
                return {
                    type: "neutral",
                    event: neutralPool[Math.floor(Math.random() * neutralPool.length)]
                };
            }
        }
        return null;
    }

    // 找出最高風險因子
    highRiskFactors.sort((a, b) => b.value - a.value);
    const maxRisk = highRiskFactors[0];

    // 觸發機率：20% + (風險-50) * 1.5%
    const triggerProb = 0.2 + (maxRisk.value - 50) * 0.015;

    if (Math.random() < triggerProb) {
        // 嘗試找到對應的事件池
        let pool = eventPool[maxRisk.key];
        
        // 如果沒有對應的事件池，使用 crisis 池作為後備
        if (!pool || pool.length === 0) {
            pool = eventPool.crisis;
        }
        
        if (pool && pool.length > 0) {
            return {
                type: maxRisk.key,
                event: pool[Math.floor(Math.random() * pool.length)]
            };
        }
    }

    return null;
}


// ============================================
// 事件引擎自我註冊
// ============================================

(function () {
    'use strict';

    // 註冊到全域 namespace
    window.EventEngine = {
        generateGlobalEvent,
        generateTier4GlobalEvent,
        generateRandomEvent,
        calculateDoomGauge,
        getEventTitle,
        getEventDescription,
        convertMarketEventToEffect
    };

    // 若 GameEngine 已存在 → 一併掛載
    if (window.GameEngine) {
        window.GameEngine.generateGlobalEvent = generateGlobalEvent;
        window.GameEngine.generateRandomEvent = generateRandomEvent;
        window.GameEngine.calculateDoomGauge = calculateDoomGauge;
    }

    // 若 EndingEngine 存在 → 與其整合
    if (window.EndingEngine) {
        window.EndingEngine.generateGlobalEvent = generateGlobalEvent;
        window.EndingEngine.generateRandomEvent = generateRandomEvent;
        window.EndingEngine.calculateDoomGauge = calculateDoomGauge;
    }

    console.log("✓ Event Engine loaded (with Tier4 Global Market integration)");
})();