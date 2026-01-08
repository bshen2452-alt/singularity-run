// ============================================
// 全球市場指標引擎 (Global Market Engine)
// ============================================
// 設計原則：
//   1. 純函數式設計，無副作用
//   2. 接收數據參數，返回計算結果
//   3. 不直接操作 DOM 或 UI 狀態
// ============================================

const GlobalMarketEngine = {
    
    // ==========================================
    // 初始化全球市場狀態
    // ==========================================
    
    /**
     * 建立初始全球市場狀態
     * @returns {Object} 初始狀態
     */
    createInitialState: function() {
        const config = window.GlobalMarketConfig;
        if (!config) {
            console.error('GlobalMarketConfig not found');
            return null;
        }
        
        const indices = {};
        config.getAllIndexIds().forEach(id => {
            const indexConfig = config.getIndex(id);
            indices[id] = {
                value: indexConfig.base_value,
                trend: 0,           // -1, 0, +1 表示趨勢
                momentum: 0,        // 動量累積
                event_modifier: 0,  // 事件造成的暫時修正
                event_duration: 0   // 事件持續回合
            };
        });
        
        return {
            indices: indices,
            active_events: [],      // 進行中的全球事件
            history: [],            // 歷史紀錄（用於圖表）
            turn_updated: 0
        };
    },
    
    // ==========================================
    // 指標更新計算
    // ==========================================
    
    /**
     * 計算單一指標的自然波動
     * @param {Object} indexState - 當前指標狀態
     * @param {Object} indexConfig - 指標配置
     * @param {number} randomSeed - 隨機種子 (0~1)
     * @returns {number} 波動值
     */
    calculateNaturalVolatility: function(indexState, indexConfig, randomSeed) {
        const config = window.GlobalMarketConfig;
        const baseVol = indexConfig.volatility.base;
        
        // 基礎隨機波動 (-1 to +1) * 波動率 * 基礎值
        let change = (randomSeed * 2 - 1) * baseVol * indexState.value;
        
        // 動量效應
        if (indexConfig.volatility.momentum) {
            change += indexState.momentum * 0.3;
        }
        
        // 均衡回歸
        const equilibrium = indexConfig.base_value;
        const deviation = indexState.value - equilibrium;
        const pullBack = -deviation * config.SYSTEM.equilibrium_pull;
        change += pullBack;
        
        return change;
    },
    
    /**
     * 應用玩家/對手行為的影響
     * @param {Object} marketState - 當前市場狀態
     * @param {Array} actions - 本回合發生的行為列表
     * @returns {Object} 各指標的影響值
     */
    calculateActionImpacts: function(marketState, actions) {
        const config = window.GlobalMarketConfig;
        const impacts = {};
        
        config.getAllIndexIds().forEach(id => {
            impacts[id] = 0;
        });
        
        if (!actions || !Array.isArray(actions)) return impacts;
        
        actions.forEach(action => {
            const actionImpact = config.getActionImpact(action.type);
            Object.entries(actionImpact).forEach(([indexId, value]) => {
                if (impacts[indexId] !== undefined) {
                    // 根據行為規模調整影響
                    const scale = action.scale || 1;
                    impacts[indexId] += value * scale;
                }
            });
        });
        
        return impacts;
    },
    
    /**
     * 處理指標間的連動關係
     * @param {Object} changes - 各指標的變動值
     * @returns {Object} 連動後的變動值
     */
    applyCorrelations: function(changes) {
        const config = window.GlobalMarketConfig;
        const correlatedChanges = { ...changes };
        
        // 正相關
        config.CORRELATIONS.positive.forEach(corr => {
            const sourceChange = changes[corr.from] || 0;
            correlatedChanges[corr.to] = (correlatedChanges[corr.to] || 0) + 
                sourceChange * corr.strength;
        });
        
        // 負相關
        config.CORRELATIONS.negative.forEach(corr => {
            const sourceChange = changes[corr.from] || 0;
            correlatedChanges[corr.to] = (correlatedChanges[corr.to] || 0) - 
                sourceChange * corr.strength;
        });
        
        return correlatedChanges;
    },
    
    /**
     * 檢查並觸發隨機事件
     * @param {Object} marketState - 當前市場狀態
     * @param {number} randomSeed - 隨機種子
     * @param {number} tier - 玩家Tier（Tier4+才有隨機事件）
     * @returns {Object|null} 觸發的事件或 null
     */
    checkForRandomEvent: function(marketState, randomSeed, tier = 1) {
        // Tier4 以下不觸發隨機事件
        if (tier < 4) return null;
        
        const config = window.GlobalMarketConfig;
        const events = config.EVENT_IMPACTS;
        
        // 避免事件堆疊過多
        if (marketState.active_events.length >= 3) return null;
        
        for (const [eventId, eventConfig] of Object.entries(events)) {
            // 檢查是否已有同類事件進行中
            const alreadyActive = marketState.active_events.some(e => e.id === eventId);
            if (alreadyActive) continue;
            
            if (randomSeed < eventConfig.probability) {
                // 計算事件影響值
                const effects = {};
                Object.entries(eventConfig.effects).forEach(([indexId, range]) => {
                    const magnitude = range.min + Math.random() * (range.max - range.min);
                    effects[indexId] = Math.round(magnitude);
                });
                
                return {
                    id: eventId,
                    effects: effects,
                    duration: eventConfig.duration,
                    remaining: eventConfig.duration
                };
            }
            
            // 使用新的隨機值檢查下一個事件
            randomSeed = Math.random();
        }
        
        return null;
    },
    
    /**
     * 更新全球市場狀態（單回合）
     * @param {Object} marketState - 當前市場狀態
     * @param {Object} params - 參數
     * @param {Array} params.actions - 本回合行為列表
     * @param {number} params.turn - 當前回合
     * @param {number} params.quarter - 當前季度 (1-4)
     * @param {number} params.tier - 玩家當前Tier（影響波動率）
     * @returns {Object} 新的市場狀態
     */
    updateMarket: function(marketState, params = {}) {
        const config = window.GlobalMarketConfig;
        const { actions = [], turn = 0, quarter = 1, tier = 1 } = params;
        
        // 取得 Tier 對應的波動率乘數
        const tierVolatilityMult = config.SYSTEM.tier_volatility_mult[Math.min(tier, 5)] || 0.2;
        
        // 複製狀態
        const newState = JSON.parse(JSON.stringify(marketState));
        
        // 1. 計算各指標變動
        const changes = {};
        config.getAllIndexIds().forEach(id => {
            changes[id] = 0;
        });
        
        // 1a. 自然波動（乘以 Tier 波動率）
        config.getAllIndexIds().forEach(id => {
            const indexConfig = config.getIndex(id);
            const indexState = newState.indices[id];
            const randomSeed = Math.random();
            const baseChange = this.calculateNaturalVolatility(indexState, indexConfig, randomSeed);
            changes[id] += baseChange * tierVolatilityMult;
        });
        
        // 1b. 行為影響
        const actionImpacts = this.calculateActionImpacts(marketState, actions);
        Object.entries(actionImpacts).forEach(([id, impact]) => {
            changes[id] += impact;
        });
        
        // 1c. 進行中事件的持續影響
        newState.active_events.forEach(event => {
            Object.entries(event.effects).forEach(([indexId, value]) => {
                // 事件影響逐漸衰減
                const decayFactor = event.remaining / event.duration;
                changes[indexId] += value * 0.3 * decayFactor;
            });
        });
        
        // 1d. 季節性調整
        config.getAllIndexIds().forEach(id => {
            const seasonal = config.SEASONAL_MODIFIERS[id];
            if (seasonal) {
                const qKey = `Q${quarter}`;
                const modifier = seasonal[qKey] || 1;
                const indexConfig = config.getIndex(id);
                changes[id] += (modifier - 1) * indexConfig.base_value * 0.1 * tierVolatilityMult;
            }
        });
        
        // 2. 應用連動關係
        const correlatedChanges = this.applyCorrelations(changes);
        
        // 3. 更新指標值
        config.getAllIndexIds().forEach(id => {
            const indexState = newState.indices[id];
            const oldValue = indexState.value;
            
            // 應用變動
            let newValue = oldValue + correlatedChanges[id];
            
            // 限制範圍
            newValue = Math.max(config.SYSTEM.min_index_value, newValue);
            newValue = Math.min(config.SYSTEM.max_index_value, newValue);
            newValue = Math.round(newValue * 10) / 10;
            
            // 更新趨勢
            indexState.trend = Math.sign(newValue - oldValue);
            
            // 更新動量
            const indexConfig = config.getIndex(id);
            if (indexConfig.volatility.momentum) {
                indexState.momentum = indexState.momentum * 0.7 + (newValue - oldValue) * 0.3;
            }
            
            indexState.value = newValue;
        });
        
        // 4. 處理進行中事件
        newState.active_events = newState.active_events
            .map(event => ({ ...event, remaining: event.remaining - 1 }))
            .filter(event => event.remaining > 0);
        
        // 5. 檢查新事件（Tier4+）
        const newEvent = this.checkForRandomEvent(newState, Math.random(), tier);
        if (newEvent) {
            newState.active_events.push(newEvent);
            
            // 新事件的即時衝擊
            Object.entries(newEvent.effects).forEach(([indexId, value]) => {
                if (newState.indices[indexId]) {
                    newState.indices[indexId].value += value * 0.5;
                    newState.indices[indexId].value = Math.max(
                        config.SYSTEM.min_index_value,
                        Math.min(config.SYSTEM.max_index_value, newState.indices[indexId].value)
                    );
                }
            });
        }
        
        // 6. 記錄歷史
        const historyEntry = {
            turn: turn,
            indices: {}
        };
        config.getAllIndexIds().forEach(id => {
            historyEntry.indices[id] = newState.indices[id].value;
        });
        newState.history.push(historyEntry);
        
        // 限制歷史長度
        if (newState.history.length > 50) {
            newState.history = newState.history.slice(-50);
        }
        
        newState.turn_updated = turn;
        
        return newState;
    },
    
    // ==========================================
    // 指標效果計算
    // ==========================================
    
    /**
     * 計算指標對特定效果的乘數
     * @param {Object} marketState - 市場狀態
     * @param {string} indexId - 指標ID
     * @param {string} effectKey - 效果鍵
     * @returns {number} 乘數值
     */
    calculateEffectMultiplier: function(marketState, indexId, effectKey) {
        const config = window.GlobalMarketConfig;
        const indexConfig = config.getIndex(indexId);
        if (!indexConfig || !indexConfig.effects[effectKey]) return 1;
        
        const value = marketState.indices[indexId].value;
        const formula = indexConfig.effects[effectKey];
        
        // 解析簡單公式
        try {
            // 替換 value 變數
            const expression = formula.replace(/value/g, value);
            // 安全計算（僅允許數字和基本運算）
            if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(expression)) {
                return eval(expression);
            }
        } catch (e) {
            console.warn('Effect formula error:', e);
        }
        
        return 1;
    },
    
    /**
     * 取得所有指標的當前效果乘數
     * @param {Object} marketState - 市場狀態
     * @returns {Object} 效果乘數集合
     */
    getAllEffectMultipliers: function(marketState) {
        const config = window.GlobalMarketConfig;
        const multipliers = {};
        
        config.getAllIndexIds().forEach(indexId => {
            const indexConfig = config.getIndex(indexId);
            Object.keys(indexConfig.effects).forEach(effectKey => {
                const mult = this.calculateEffectMultiplier(marketState, indexId, effectKey);
                multipliers[`${indexId}_${effectKey}`] = mult;
            });
        });
        
        return multipliers;
    },
    
    /**
     * 取得綜合成本乘數
     * @param {Object} marketState - 市場狀態
     * @returns {Object} 各類成本乘數
     */
    getCostMultipliers: function(marketState) {
        return {
            credit: this.calculateEffectMultiplier(marketState, 'interest_rate', 'credit_cost_mult'),
            power: this.calculateEffectMultiplier(marketState, 'energy_price', 'power_cost_mult'),
            compute: this.calculateEffectMultiplier(marketState, 'gpu_price', 'compute_cost_mult'),
            regulation: this.calculateEffectMultiplier(marketState, 'market_confidence', 'regulation_pressure_mult')
        };
    },
    
    // ==========================================
    // 查詢與分析
    // ==========================================
    
    /**
     * 取得指標摘要
     * @param {Object} marketState - 市場狀態
     * @returns {Array} 指標摘要列表
     */
    getIndicesSummary: function(marketState) {
        const config = window.GlobalMarketConfig;
        
        return config.getAllIndexIds().map(id => {
            const indexConfig = config.getIndex(id);
            const indexState = marketState.indices[id];
            const status = config.getStatusLabel(indexState.value);
            
            return {
                id: id,
                name: indexConfig.name,
                icon: indexConfig.icon,
                value: indexState.value,
                displayValue: config.getDisplayValue(id, indexState.value),
                unit: indexConfig.unit,
                trend: indexState.trend,
                status: status
            };
        });
    },
    
    /**
     * 取得市場整體健康度
     * @param {Object} marketState - 市場狀態
     * @returns {Object} 健康度評估
     */
    getMarketHealth: function(marketState) {
        const config = window.GlobalMarketConfig;
        let score = 100;
        const issues = [];
        
        config.getAllIndexIds().forEach(id => {
            const value = marketState.indices[id].value;
            const indexConfig = config.getIndex(id);
            
            if (value >= config.THRESHOLDS.critical_high) {
                score -= 20;
                issues.push(`${indexConfig.name} 過高`);
            } else if (value >= config.THRESHOLDS.high) {
                score -= 10;
            } else if (value <= config.THRESHOLDS.critical_low) {
                score -= 15;
                issues.push(`${indexConfig.name} 過低`);
            }
        });
        
        // 事件影響
        score -= marketState.active_events.length * 5;
        
        return {
            score: Math.max(0, score),
            level: score >= 80 ? 'healthy' : score >= 50 ? 'stressed' : 'crisis',
            issues: issues,
            active_events: marketState.active_events.map(e => e.id)
        };
    },
    
    /**
     * 預測指標趨勢
     * @param {Object} marketState - 市場狀態
     * @param {string} indexId - 指標ID
     * @param {number} turns - 預測回合數
     * @returns {Object} 預測結果
     */
    predictTrend: function(marketState, indexId, turns = 3) {
        const indexState = marketState.indices[indexId];
        const config = window.GlobalMarketConfig;
        const indexConfig = config.getIndex(indexId);
        
        // 簡單線性預測 + 均衡回歸
        const currentTrend = indexState.momentum || indexState.trend * 2;
        const equilibriumPull = (indexConfig.base_value - indexState.value) * config.SYSTEM.equilibrium_pull;
        
        const predictedChange = (currentTrend + equilibriumPull) * turns;
        const predictedValue = Math.round((indexState.value + predictedChange) * 10) / 10;
        
        return {
            current: indexState.value,
            predicted: Math.max(config.SYSTEM.min_index_value, 
                       Math.min(config.SYSTEM.max_index_value, predictedValue)),
            direction: Math.sign(predictedChange),
            confidence: marketState.active_events.length === 0 ? 'high' : 'low'
        };
    }
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.GlobalMarketEngine = GlobalMarketEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalMarketEngine;
}

console.log('✓ Global Market Engine loaded');