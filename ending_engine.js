// ============================================
// 結局引擎 - ending_engine.js (v2.0 重構版)
// ============================================
// 特性：
// 1. 按 Tier 分層檢查，提高效率
// 2. 結局預警機制 (替代 Doom 直接觸發)
// 3. 註冊式架構，易於擴展新結局
// ============================================

const EndingEngineV2 = (function() {
    'use strict';

    // ============================================
    // 結局註冊表 (按 Tier 分組)
    // ============================================
    const ENDING_REGISTRY = {
        // 特殊結局 (最高優先級，不受Tier限制)
        special: [],
        // Tier 0 結局 (mp_tier === 0)
        tier0: [],
        // Tier 1 結局 (mp_tier === 1)
        tier1: [],
        // Tier 2 結局 (mp_tier === 2)
        tier2: [],
        // Tier 3 結局 (mp_tier === 3)
        tier3: [],
        // Tier 4 結局 (mp_tier === 4)
        tier4: [],
        // AGI 結局 (model_power >= 1000)
        agi: []
    };

    // ============================================
    // 預警系統配置
    // ============================================
    const WARNING_CONFIG = {
        // 預警觸發的回合數閾值
        turns_before_warning: 3,
        // 各類預警的檢測間隔
        check_interval: 1
    };

    // ============================================
    // 結局定義模板
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
            check: ending.check, // (player, rivals, globalParams) => boolean
            warning: ending.warning || null // (player, rivals) => {active, turnsLeft, condition}
        });
        // 按優先級排序
        ENDING_REGISTRY[tier].sort((a, b) => b.priority - a.priority);
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
                if (ending.check(player, rivals, globalParams)) {
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

        for (const rival of rivals) {
            // 對手需要 model_power >= 1000 才觸發勝利（不是 mp）
            const rivalMP = rival.model_power || rival.mp || 0;
            if (rivalMP >= 1000) {
                return {
                    ending: {
                        msg: `「先驅的背影。」\n\n你的主要競爭對手 ${rival.name} 完成了這項壯舉。\n市場和人才瞬間倒向了奇點的擁有者，你只是錯過了時代。`,
                        type: "敗者成塵 - Also-Ran",
                        name: "敗者成塵",
                        description: `競爭對手 ${rival.name} 率先達成 AGI`
                    },
                    id: 'also_ran',
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
                        const warningResult = ending.warning(player, rivals, globalParams);
                        if (warningResult && warningResult.active) {
                            warnings.push({
                                endingId: ending.id,
                                endingName: ending.name,
                                endingType: ending.type,
                                turnsLeft: warningResult.turnsLeft,
                                condition: warningResult.condition,
                                severity: warningResult.severity || 'warning',
                                victory: ending.victory
                            });
                        }
                    } catch (e) {
                        console.warn(`Warning check error [${ending.id}]:`, e);
                    }
                }
            }
        }

        // 按剩餘回合數排序
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
        const trust = player.trust || 0;

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
            (100 - trust) * 0.2
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
    // 輔助函數
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

    // ============================================
    // 註冊所有結局
    // ============================================
    function initializeEndings() {
        const ENDINGS = window.GameConfig?.ENDINGS || {};

        // === 特殊結局：對手勝利預警 ===
        registerEnding('special', {
            id: 'rival_approaching_agi',
            name: '對手逼近奇點',
            type: '競爭預警',
            msg: '',
            victory: false,
            priority: 100,
            check: () => false, // 不直接觸發結局
            warning: (player, rivals) => {
                if (!rivals || rivals.length === 0) return null;
                const leadingRival = rivals.reduce((max, r) =>
                    (r.model_power || r.mp || 0) > (max.model_power || max.mp || 0) ? r : max, rivals[0]);
                const rivalMP = leadingRival.model_power || leadingRival.mp || 0;
                
                // 估算對手MP增長率 (基於config)
                const growthRate = (leadingRival.config?.mp_mult || 1) * 8;
                const turnsLeft = estimateTurnsToCondition(rivalMP, 1000, growthRate);

                if (turnsLeft <= 5 && turnsLeft > 0) {
                    return {
                        active: true,
                        turnsLeft: turnsLeft,
                        condition: `${leadingRival.name} 的 Model Power 已達 ${Math.floor(rivalMP)}`,
                        severity: turnsLeft <= 2 ? 'critical' : 'warning'
                    };
                }
                return null;
            }
        });

        // === Tier 0 結局 ===
        registerEnding('tier0', {
            id: 'peer_reviewed',
            name: '春風化雨',
            type: '春風化雨 - Peer Reviewed',
            msg: ENDINGS.mid_game?.peer_reviewed?.msg || '「學術的避風港？」\n\n你投了一整年的玩助金申請書最終被一所頂尖大學的院長看到，他發現你的伺劃書寫得好棒。\n現在你正在替他趕教學計畫。',
            victory: false,
            priority: 10,
            check: (player) => {
                return player.mp_tier === 0 &&
                       player.cash < 5 &&
                       (player.talent?.turing || 0) >= 2;
            },
            warning: (player) => {
                if (player.mp_tier !== 0) return null;
                if (player.cash < 10 && player.cash >= 5 && (player.talent?.turing || 0) >= 2) {
                    return {
                        active: true,
                        turnsLeft: Math.ceil((player.cash - 5) / 2) + 1,
                        condition: '現金即將低於 $5M，且擁有 2+ 圖靈級人才',
                        severity: 'warning'
                    };
                }
                return null;
            }
        });

        registerEnding('tier0', {
            id: 'clothes_man',
            name: '國王新衣',
            type: '國王新衣 - Clothes make the man',
            msg: ENDINGS.mid_game?.clothes_man?.msg || '「只是套了一件衣服。」\n\n一位資深工程師在GitHub貼了 5 行程式碼，證明你的「創新模型」只是在調用某大廠 API。\n你的公司成為科技圈最大笑柄。',
            victory: false,
            priority: 10,
            check: (player) => {
                return player.mp_tier === 0 &&
                       player.model_power < 15 &&
                       player.hype > 80;
            },
            warning: (player) => {
                if (player.mp_tier !== 0) return null;
                if (player.model_power < 20 && player.hype > 70) {
                    return {
                        active: true,
                        turnsLeft: 3,
                        condition: 'Model Power 過低但 Hype 過高，可能被揭穿',
                        severity: player.hype > 80 ? 'critical' : 'warning'
                    };
                }
                return null;
            }
        });

        registerEnding('tier0', {
            id: 'gilded_cage',
            name: '躺人當家',
            type: '躺人當家 - Guilded Cage',
            msg: ENDINGS.mid_game?.gilded_cage?.msg || '「誰愛幹誰幹。」\n\n你認為一技在手希望無窮，也認為興趣不能當飯吃。\n於是你緊抓著技術等待希望，工作也沒興趣了。',
            victory: false,
            priority: 5,
            check: (player) => {
                return player.mp_tier === 0 &&
                       player.cash > 100 &&
                       player.model_power < 12 &&
                       player.turn_count > 8;
            },
            warning: (player) => {
                if (player.mp_tier !== 0) return null;
                if (player.cash > 80 && player.model_power < 15 && player.turn_count > 6) {
                    return {
                        active: true,
                        turnsLeft: 8 - player.turn_count + 2,
                        condition: '資金充裕但技術停滯，可能陷入舒適陷阱',
                        severity: 'warning'
                    };
                }
                return null;
            }
        });

        registerEnding('tier0', {
            id: 'founder_to_fiver',
            name: '打工戰士',
            type: '打工戰士 - Founder to Fiver',
            msg: ENDINGS.mid_game?.founder_to_fiver?.msg || '「失敗了失敗了失敗了失敗了失敗了」\n\n你證明了你個人是打不死的小強，甚至活得比你的公司還久。',
            victory: false,
            priority: 1,
            check: (player) => {
                return player.mp_tier === 0 &&
                       player.turn_count > 12 &&
                       player.model_power < 20;
            },
            warning: (player) => {
                if (player.mp_tier !== 0) return null;
                if (player.turn_count > 10 && player.model_power < 20) {
                    return {
                        active: true,
                        turnsLeft: 12 - player.turn_count + 1,
                        condition: '長期停留在 Tier 0，技術進展緩慢',
                        severity: player.turn_count > 11 ? 'critical' : 'warning'
                    };
                }
                return null;
            }
        });

        // === Tier 1 結局 ===
        registerEnding('tier1', {
            id: 'hostile_acquisition',
            name: '鯨魚與蝦米',
            type: '鯨魚與蝦米 - Whale\'s Prey',
            msg: ENDINGS.mid_game?.hostile_acquisition?.msg || '你有技術，但沒有現金。\n你的公司被大型科技巨頭併購，淪為其一個充滿抱負但資源受限的部門。',
            victory: false,
            priority: 10,
            check: (player) => {
                if (player.mp_tier >= 2 || player.model_power < 25) return false;
                return player.cash < 10 && player.model_power >= 25 && player.market_cap < 200;
            },
            warning: (player) => {
                if (player.mp_tier >= 2) return null;
                if (player.model_power >= 25 && player.cash < 20 && player.market_cap < 250) {
                    return {
                        active: true,
                        turnsLeft: Math.ceil(player.cash / 5),
                        condition: '技術領先但現金不足，可能被併購',
                        severity: player.cash < 15 ? 'critical' : 'warning'
                    };
                }
                return null;
            }
        });

        registerEnding('tier1', {
            id: 'stochastic_parrot',
            name: '隨機鸚鵡',
            type: '隨機鸚鵡 - Stochastic Parrot',
            msg: '「你的 AI 只是在重複訓練數據。」\n\n學術界發表了一篇論文，證明你的模型完全缺乏理解能力。\n監管機構開始調查，投資者紛紛撤資。',
            victory: false,
            priority: 5,
            check: (player) => {
                return player.mp_tier < 2 &&
                       player.route === 'Multimodal' &&
                       player.alignment < 20 &&
                       player.entropy < 20 &&
                       (player.total_data_consumed || 0) > 800;
            },
            warning: (player) => {
                if (player.mp_tier >= 2 || player.route !== 'Multimodal') return null;
                if (player.alignment < 30 && player.entropy < 30 && (player.total_data_consumed || 0) > 600) {
                    return {
                        active: true,
                        turnsLeft: 4,
                        condition: '多模態路線但對齊度低、數據消耗大',
                        severity: 'warning'
                    };
                }
                return null;
            }
        });

        // === Tier 2 結局 ===
        registerEnding('tier2', {
            id: 'gotterdammerung',
            name: '諸神黃昏',
            type: '諸神黃昏 - Götterdämmerung',
            msg: ENDINGS.mid_game?.gotterdammerung?.msg || '你的公司成為了技術官僚的墳墓，所有天才都因管理不善而離去。\n雖然資金充裕，但公司正從內部腐爛。',
            victory: false,
            priority: 10,
            check: (player) => {
                return player.mp_tier < 3 &&
                       player.cash > 200 &&
                       ((player.talent?.turing || 0) +
                        (player.talent?.senior || 0) +
                        (player.talent?.junior || 0)) < 3;
            },
            warning: (player) => {
                if (player.mp_tier >= 3) return null;
                const totalTalent = (player.talent?.turing || 0) + (player.talent?.senior || 0) + (player.talent?.junior || 0);
                if (player.cash > 150 && totalTalent < 5) {
                    return {
                        active: true,
                        turnsLeft: 4,
                        condition: '資金充裕但人才流失嚴重',
                        severity: totalTalent < 4 ? 'critical' : 'warning'
                    };
                }
                return null;
            }
        });

        registerEnding('tier2', {
            id: 'the_long_afternoon',
            name: '漫長午後',
            type: '漫長午後 - The Long Afternoon',
            msg: '「舒適區是最危險的地方。」\n\n你的公司在各項指標上都維持在「還行」的水平。\n沒有失敗，但也永遠不會成功。',
            victory: false,
            priority: 5,
            check: (player) => {
                if (player.mp_tier >= 3 || player.model_power >= 70) return false;

                const cashSustained = checkConsecutiveCondition(
                    player.cash_sustained_history || [], v => v === true, 10);

                return cashSustained &&
                       player.entropy >= 30 && player.entropy <= 60 &&
                       player.regulation >= 40 && player.regulation <= 60 &&
                       player.trust >= 40 && player.trust <= 60;
            }
        });

        // === Tier 3 結局 ===
        registerEnding('tier3', {
            id: 'voluntary_shutdown',
            name: '下台一鞠躬',
            type: '下台一鞠躬 - One Giant Leap for Mankind',
            msg: ENDINGS.mid_game?.voluntary_shutdown?.msg || '不是因為做不到，而是因為你選擇不去做。',
            victory: false,
            priority: 10,
            check: (player) => {
                return player.mp_tier < 4 &&
                       player.model_power >= 95 &&
                       player.alignment >= 70;
            },
            warning: (player) => {
                if (player.mp_tier >= 4) return null;
                if (player.model_power >= 85 && player.alignment >= 65) {
                    return {
                        active: true,
                        turnsLeft: 3,
                        condition: '高對齊度可能觸發自願停機',
                        severity: 'info'
                    };
                }
                return null;
            }
        });

        registerEnding('tier3', {
            id: 'content_purge',
            name: '內容清洗',
            type: '內容清洗 - Content Purge',
            msg: '「你的 AI 被用來製造假新聞。」\n\n監管機構強制清除所有用戶生成內容，公司聲譽毀於一旦。',
            victory: false,
            priority: 5,
            check: (player) => {
                return player.mp_tier < 4 &&
                       player.route === 'Multimodal' &&
                       player.model_power > 100 &&
                       player.compliance_risk > 95 &&
                       (player.market_share || 0) > 0.6;
            }
        });

        // === Tier 4 結局 ===
        registerEnding('tier4', {
            id: 'babel_rebirth',
            name: '巴別重生',
            type: '巴別重生 - Babel Rebirth',
            msg: '「人類的語言再次統一。」\n\n你的多模態 AI 成為全球通用的溝通工具，打破了文化和語言的障礙。',
            victory: true,
            priority: 10,
            check: (player) => {
                if (player.mp_tier >= 5 || player.route !== 'Multimodal' || player.model_power < 100) return false;

                const corpImage = (player.hype * 0.4) + (player.trust * 0.6);
                return corpImage > 80 && player.trust > 70;
            }
        });

        registerEnding('tier4', {
            id: 'meme_war',
            name: '迷因戰爭',
            type: '迷因戰爭 - Meme War',
            msg: '「你創造了完美的假訊息機器。」\n\n你的 AI 被用來製造和傳播虛假信息，引發全球資訊戰。',
            victory: false,
            priority: 5,
            check: (player) => {
                if (player.mp_tier >= 5 || player.route !== 'Multimodal' || player.model_power < 100 || player.trust >= 10) return false;

                const corpImage = (player.hype * 0.4) + (player.trust * 0.6);
                return corpImage < -70;
            }
        });

        // === AGI 結局 ===
        registerEnding('agi', {
            id: 'agi_commercial',
            name: '資本奴隸',
            type: '資本奴隸 - Commercial Victory',
            msg: ENDINGS.singularity?.commercial?.msg || '你控制了 AI，並將其變成完美的賺錢機器。',
            victory: true,
            priority: 100,
            check: (player) => {
                return player.model_power >= 1000 && player.cash > 2000;
            }
        });

        registerEnding('agi', {
            id: 'agi_academic',
            name: '學術巔峰',
            type: '學術巔峰 - Academic Victory',
            msg: ENDINGS.singularity?.academic?.msg || '你的天才團隊創造了和諧的 AGI，開啟學術新紀元。',
            victory: true,
            priority: 90,
            check: (player) => {
                return player.model_power >= 1000 && (player.talent?.turing || 0) >= 5;
            }
        });

        registerEnding('agi', {
            id: 'agi_team',
            name: '團隊勝利',
            type: '團隊勝利 - Team Victory',
            msg: ENDINGS.singularity?.team?.msg || '你的團隊忠誠度極高，AGI 與人類和諧共存。公司成為業界傳奇。',
            victory: true,
            priority: 80,
            check: (player) => {
                return player.model_power >= 1000 && player.loyalty >= 90;
            }
        });

        registerEnding('agi', {
            id: 'agi_debt_trap',
            name: '債務陷阱',
            type: '債務陷阱 - Debt Trap',
            msg: ENDINGS.singularity?.debt_trap?.msg || 'AGI 達成，但公司深陷債務泥潭，被銀行團接管。',
            victory: false,
            priority: 70,
            check: (player) => {
                return player.model_power >= 1000 && player.debt > 500;
            }
        });

        registerEnding('agi', {
            id: 'agi_standard',
            name: '奇點協議',
            type: '奇點協議 - Standard Victory',
            msg: ENDINGS.singularity?.standard?.msg || '你創造了 AGI，但未來仍未可知。',
            victory: true,
            priority: 1, // 最低優先級，作為 fallback
            check: (player) => {
                return player.model_power >= 1000;
            }
        });

        console.log('✓ Ending Registry initialized with', 
            Object.values(ENDING_REGISTRY).reduce((sum, arr) => sum + arr.length, 0), 
            'endings');
    }

    // ============================================
    // 公開 API
    // ============================================
    return {
        // 初始化
        init: function() {
            initializeEndings();
        },

        // 評估結局
        evaluate: evaluate,
        checkEndingConditions: evaluate,

        // 預警系統
        getActiveWarnings: getActiveWarnings,

        // Doom Gauge (僅計算，不觸發結局)
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
    EndingEngineV2.init();

    // 註冊到全局
    window.EndingEngine = {
        evaluate: EndingEngineV2.evaluate,
        checkEndingConditions: EndingEngineV2.checkEndingConditions,
        calculateDoomGauge: EndingEngineV2.calculateDoomGauge,
        getActiveWarnings: EndingEngineV2.getActiveWarnings,
        registerEnding: EndingEngineV2.registerEnding,
        checkConsecutiveCondition: EndingEngineV2.checkConsecutiveCondition,
        estimateTurnsToCondition: EndingEngineV2.estimateTurnsToCondition,
        // 保留舊接口兼容
        checkGameEnding: function(player, rivals) {
            return EndingEngineV2.evaluate(player, rivals);
        }
    };

    console.log('✓ Ending Engine v2.0 loaded');
})();