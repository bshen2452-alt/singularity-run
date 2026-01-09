// ============================================
// 結局引擎 - ending_engine.js (v3.0 MVC重構版)
// ============================================
// 純邏輯：結局評估、預警計算
// 數據配置已分離至 ending_config.js
// ============================================

const EndingEngine = (function() {
    'use strict';

    // ============================================
    // 結局註冊表 (運行時填充)
    // ============================================
    const ENDING_REGISTRY = {
        special: [],
        tier0: [],
        tier1: [],
        tier2: [],
        tier3: [],
        tier4: [],
        agi: []
    };

    // ============================================
    // 輔助函數 (供結局檢查使用)
    // ============================================
    
    /**
     * 檢查連續條件
     */
    function checkConsecutiveCondition(history, condition, requiredCount) {
        if (!history || history.length < requiredCount) return false;

        let count = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (condition(history[i], i, history)) {
                count++;
                if (count >= requiredCount) return true;
            } else {
                break;
            }
        }
        return false;
    }

    /**
     * 估算達到條件的剩餘回合數
     */
    function estimateTurnsToCondition(currentValue, targetValue, growthRate) {
        if (growthRate <= 0) return Infinity;
        const remaining = targetValue - currentValue;
        if (remaining <= 0) return 0;
        return Math.ceil(remaining / growthRate);
    }

    // 工具函數包 (傳遞給結局檢查函數)
    const utils = {
        checkConsecutiveCondition,
        estimateTurnsToCondition
    };

    // ============================================
    // 結局註冊
    // ============================================
    
    /**
     * 註冊結局
     * @param {string} tier - 所屬tier (special/tier0-4/agi)
     * @param {Object} ending - 結局配置
     */
    function registerEnding(tier, ending) {
        if (!ENDING_REGISTRY[tier]) {
            console.warn(`Invalid tier: ${tier}`);
            return;
        }
        ENDING_REGISTRY[tier].push({
            id: ending.id,
            name: ending.name,
            type: ending.type,
            msg: ending.msg,
            victory: ending.victory || false,
            priority: ending.priority || 0,
            check: ending.check,
            warning: ending.warning || null
        });
        // 按優先級排序
        ENDING_REGISTRY[tier].sort((a, b) => b.priority - a.priority);
    }

    /**
     * 從配置初始化所有結局
     */
    function initializeFromConfig() {
        const config = window.EndingConfig;
        if (!config) {
            console.warn('EndingConfig not found, endings not initialized');
            return;
        }

        // 清空現有註冊
        Object.keys(ENDING_REGISTRY).forEach(tier => {
            ENDING_REGISTRY[tier] = [];
        });

        // 從配置註冊所有結局
        const tiers = config.getAllTiers();
        let totalCount = 0;

        tiers.forEach(tier => {
            const endings = config.getEndingsByTier(tier);
            endings.forEach(ending => {
                registerEnding(tier, ending);
                totalCount++;
            });
        });

        console.log(`✓ Ending Registry initialized with ${totalCount} endings from config`);
    }

    // ============================================
    // 核心：結局評估
    // ============================================
    
    function evaluate(player, rivals, globalParams) {
        if (!player) return null;

        const mpTier = player.mp_tier || 0;
        const modelPower = player.model_power || 0;

        // 1. 檢查特殊結局 (最高優先級)
        const specialEnding = checkTierEndings('special', player, rivals, globalParams);
        if (specialEnding) return specialEnding;

        // 2. 檢查對手勝利 (model_power >= 1000)
        const rivalEnding = checkRivalVictory(rivals);
        if (rivalEnding) return rivalEnding;

        // 3. 檢查 AGI 結局 (玩家 model_power >= 1000)
        if (modelPower >= 1000) {
            const agiEnding = checkTierEndings('agi', player, rivals, globalParams);
            if (agiEnding) return agiEnding;
        }

        // 4. 按當前 Tier 檢查對應結局
        const tierKey = `tier${mpTier}`;
        if (ENDING_REGISTRY[tierKey]) {
            const tierEnding = checkTierEndings(tierKey, player, rivals, globalParams);
            if (tierEnding) return tierEnding;
        }

        // 5. 向下檢查更低 Tier 的結局 (防止漏檢)
        for (let t = mpTier - 1; t >= 0; t--) {
            const lowerTierKey = `tier${t}`;
            const lowerEnding = checkTierEndings(lowerTierKey, player, rivals, globalParams);
            if (lowerEnding) return lowerEnding;
        }

        return null;
    }

    /**
     * 檢查指定 Tier 的所有結局
     */
    function checkTierEndings(tierKey, player, rivals, globalParams) {
        const endings = ENDING_REGISTRY[tierKey];
        if (!endings || endings.length === 0) return null;

        for (const ending of endings) {
            try {
                if (ending.check(player, rivals, globalParams, utils)) {
                    return formatEndingResult(ending);
                }
            } catch (e) {
                console.warn(`Ending check error [${ending.id}]:`, e);
            }
        }
        return null;
    }

    /**
     * 檢查對手勝利
     */
    function checkRivalVictory(rivals) {
        if (!rivals || !Array.isArray(rivals)) return null;

        const config = window.EndingConfig;
        const rivalVictoryConfig = config?.RIVAL_VICTORY || {
            id: 'also_ran',
            name: '敗者成塵',
            type: '敗者成塵 - Also-Ran',
            msgTemplate: (name) => `競爭對手 ${name} 率先達成 AGI`,
            victory: false
        };

        for (const rival of rivals) {
            const rivalMP = rival.model_power || rival.mp || 0;
            if (rivalMP >= 1000) {
                const msg = typeof rivalVictoryConfig.msgTemplate === 'function' 
                    ? rivalVictoryConfig.msgTemplate(rival.name)
                    : `競爭對手 ${rival.name} 率先達成 AGI`;

                return {
                    ending: {
                        msg: msg,
                        type: rivalVictoryConfig.type,
                        name: rivalVictoryConfig.name,
                        description: `競爭對手 ${rival.name} 率先達成 AGI`
                    },
                    id: rivalVictoryConfig.id,
                    victory: false,
                    checkId: 'rival_victory'
                };
            }
        }
        return null;
    }

    /**
     * 格式化結局結果
     */
    function formatEndingResult(ending) {
        return {
            ending: {
                msg: ending.msg,
                type: ending.type,
                name: ending.name,
                description: ending.msg
            },
            id: ending.id,
            victory: ending.victory,
            checkId: ending.id
        };
    }

    // ============================================
    // 預警系統
    // ============================================
    
    /**
     * 獲取所有活躍的結局預警
     * @returns {Array} 預警列表
     */
    function getActiveWarnings(player, rivals, globalParams) {
        const warnings = [];
        const mpTier = player.mp_tier || 0;

        // 檢查所有相關 Tier 的預警
        const tiersToCheck = ['special', `tier${mpTier}`];
        if (mpTier > 0) tiersToCheck.push(`tier${mpTier - 1}`);
        if (player.model_power >= 800) tiersToCheck.push('agi');

        for (const tierKey of tiersToCheck) {
            const endings = ENDING_REGISTRY[tierKey];
            if (!endings) continue;

            for (const ending of endings) {
                if (ending.warning) {
                    try {
                        const warningResult = ending.warning(player, rivals, globalParams, utils);
                        if (warningResult && warningResult.active) {
                            // 決定警示等級
                            let level = 'warning';
                            if (warningResult.severity === 'critical' || warningResult.turnsLeft <= 2) {
                                level = 'danger';
                            } else if (warningResult.severity === 'info') {
                                level = 'info';
                            }

                            // 決定圖標
                            let icon = ending.victory ? '🏆' : '⚠️';
                            if (level === 'danger') icon = '🚨';
                            if (warningResult.turnsLeft <= 1) icon = '💀';

                            warnings.push({
                                endingId: ending.id,
                                endingName: ending.name,
                                endingType: ending.type,
                                turnsLeft: warningResult.turnsLeft,
                                condition: warningResult.condition,
                                victory: ending.victory,
                                severity: warningResult.severity,
                                level: level,
                                icon: icon,
                                category: '結局預警',
                                text: `${ending.name}：${warningResult.condition}（${warningResult.turnsLeft} 回合後）`
                            });
                        }
                    } catch (e) {
                        console.warn(`Warning check error [${ending.id}]:`, e);
                    }
                }
            }
        }

        // 按剩餘回合數排序（最緊急的在前）
        warnings.sort((a, b) => a.turnsLeft - b.turnsLeft);
        return warnings;
    }

    // ============================================
    // Doom Gauge 計算 (純數據，不觸發結局)
    // ============================================
    
    function calculateDoomGauge(player) {
        if (!player) return { commercial_ruin: 0, internal_unraveling: 0, external_sanction: 0 };

        const cash = player.cash || 0;
        const debt = player.debt || 0;
        const marketCap = player.market_cap || 100;
        const entropy = player.entropy || 0;
        const alignment = player.alignment || 50;
        const compliance_risk = player.compliance_risk || 0;
        const regulation = player.regulation || 0;
        const loyalty = player.loyalty || 50;

        // Commercial Ruin: 財務風險
        let commercial_ruin = 0;
        if (cash < 0) {
            commercial_ruin = Math.min(100, Math.abs(cash) / 5);
        }
        const debtRatio = debt / Math.max(1, marketCap);
        commercial_ruin = Math.min(100, commercial_ruin + debtRatio * 50);

        // Internal Unraveling: 內部混亂風險
        const internal_unraveling = Math.min(100,
            entropy * 0.5 +
            (100 - alignment) * 0.2 +
            (100 - loyalty) * 0.3
        );

        // External Sanction: 外部制裁風險
        const external_sanction = Math.min(100,
            compliance_risk * 0.4 +
            regulation * 0.4 +
            (100 - (player.trust || 0)) * 0.2
        );

        return {
            commercial_ruin,
            internal_unraveling,
            external_sanction,
            regulation,
            entropy,
            compliance_risk
        };
    }

    // ============================================
    // Alert 格式轉換
    // ============================================
    
    /**
     * 將預警轉換為 Dashboard Alert 格式
     */
    function convertWarningsToAlerts(warnings) {
        if (!warnings || warnings.length === 0) return [];

        return warnings.map(warning => {
            let level = 'info';
            let icon = '⚠️';

            if (warning.severity === 'critical' || warning.turnsLeft <= 1) {
                level = 'danger';
                icon = '🚨';
            } else if (warning.severity === 'warning' || warning.turnsLeft <= 3) {
                level = 'warning';
                icon = '⚠️';
            } else {
                level = 'info';
                icon = 'ℹ️';
            }

            if (warning.victory) {
                icon = warning.turnsLeft <= 2 ? '🏆' : '🎯';
            }

            return {
                level: level,
                icon: icon,
                category: '結局預警',
                text: `${warning.endingName}：${warning.condition}`,
                turnsLeft: warning.turnsLeft,
                endingId: warning.endingId,
                endingType: warning.endingType,
                isEndingWarning: true,
                victory: warning.victory
            };
        });
    }

    /**
     * 獲取結局預警的 Dashboard Alert 格式
     */
    function getEndingAlerts(player, rivals, globalParams) {
        const warnings = getActiveWarnings(player, rivals, globalParams);
        return convertWarningsToAlerts(warnings);
    }

    // ============================================
    // 公開 API
    // ============================================
    return {
        // 初始化
        init: initializeFromConfig,

        // 評估結局
        evaluate: evaluate,
        checkEndingConditions: evaluate,

        // 預警系統
        getActiveWarnings: getActiveWarnings,
        getEndingAlerts: getEndingAlerts,
        convertWarningsToAlerts: convertWarningsToAlerts,

        // Doom Gauge
        calculateDoomGauge: calculateDoomGauge,

        // 工具函數
        checkConsecutiveCondition: checkConsecutiveCondition,
        estimateTurnsToCondition: estimateTurnsToCondition,

        // 註冊接口 (供擴展使用)
        registerEnding: registerEnding,

        // 獲取註冊表 (調試用)
        getRegistry: function() {
            return ENDING_REGISTRY;
        }
    };
})();

// ============================================
// 結局引擎自我註冊
// ============================================
(function() {
    'use strict';

    // 初始化結局註冊表
    EndingEngine.init();

    // 註冊到全域
    window.EndingEngine = {
        evaluate: EndingEngine.evaluate,
        checkEndingConditions: EndingEngine.checkEndingConditions,
        calculateDoomGauge: EndingEngine.calculateDoomGauge,
        getActiveWarnings: EndingEngine.getActiveWarnings,
        getEndingAlerts: EndingEngine.getEndingAlerts,
        convertWarningsToAlerts: EndingEngine.convertWarningsToAlerts,
        registerEnding: EndingEngine.registerEnding,
        checkConsecutiveCondition: EndingEngine.checkConsecutiveCondition,
        estimateTurnsToCondition: EndingEngine.estimateTurnsToCondition,
        // 保留舊接口兼容
        checkGameEnding: function(player, rivals) {
            return EndingEngine.evaluate(player, rivals);
        }
    };

    console.log('✓ Ending Engine v3.0 (MVC) loaded');
})();