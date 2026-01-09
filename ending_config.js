// ============================================
// 結局配置 - ending_config.js
// ============================================
// 純數據配置：所有結局類型定義
// 新增結局請在對應 tier 陣列中添加
// ============================================

const EndingConfig = (function() {
    'use strict';

    // ============================================
    // 預警系統配置
    // ============================================
    const WARNING_CONFIG = {
        turns_before_warning: 3,
        check_interval: 1
    };

    // ============================================
    // 結局定義
    // 結構：{ tier: [endings...] }
    // 每個 ending 包含：
    //   id, name, type, msg, victory, priority,
    //   check: (player, rivals, globalParams) => boolean
    //   warning: (player, rivals, globalParams) => {active, turnsLeft, condition, severity} | null
    // ============================================

    const ENDINGS = {
        // ============================================
        // 特殊結局 (最高優先級，不受Tier限制)
        // ============================================
        special: [
            {
                id: 'gotterdammerung',
                name: '諸神黃昏',
                type: '諸神黃昏 - Götterdämmerung',
                msg: '你的公司成為了技術官僚的墳墓，所有天才都因管理不善而離去。\n雖然資金充裕，但公司正從內部腐爛。',
                victory: false,
                priority: 10,
                check: (player) => {
                    return player.cash > 200 &&
                           ((player.talent?.turing || 0) +
                            (player.talent?.senior || 0) +
                            (player.talent?.junior || 0)) < 3;
                },
                warning: (player) => {
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
            },
            {
                id: 'rival_approaching_agi',
                name: '對手逼近奇點',
                type: '競爭預警',
                msg: '',
                victory: false,
                priority: 100,
                check: () => false, // 不直接觸發結局
                warning: (player, rivals, globalParams, utils) => {
                    if (!rivals || rivals.length === 0) return null;
                    const leadingRival = rivals.reduce((max, r) =>
                        (r.model_power || r.mp || 0) > (max.model_power || max.mp || 0) ? r : max, rivals[0]);
                    const rivalMP = leadingRival.model_power || leadingRival.mp || 0;
                    const growthRate = (leadingRival.config?.mp_mult || 1) * 8;
                    const turnsLeft = utils.estimateTurnsToCondition(rivalMP, 1000, growthRate);

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
            }
        ],

        // ============================================
        // Tier 0 結局 (mp_tier === 0)
        // ============================================
        tier0: [
            {
                id: 'peer_reviewed',
                name: '春風化雨',
                type: '春風化雨 - Peer Reviewed',
                msg: '「學術的避風港？」\n\n你投了一整年的獎助金申請書最終被一所頂尖大學的院長看到，他發現你的計劃書寫得好棒。\n現在你正在替他趕教學計畫。',
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
            },
            {
                id: 'clothes_man',
                name: '國王新衣',
                type: '國王新衣 - Clothes make the man',
                msg: '「只是套了一件衣服。」\n\n一位資深工程師在GitHub貼了 5 行程式碼，證明你的「創新模型」只是在調用某大廠 API。\n你的公司成為科技圈最大笑柄。',
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
                            condition: 'Model Power 過低但 Hype 過高，可能被戳穿',
                            severity: player.hype > 80 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'gilded_cage',
                name: '職人當家',
                type: '職人當家 - Guilded Cage',
                msg: '「誰愛幹誰幹。」\n\n你認為一技在手希望無窮，也認為興趣不能當飯吃。\n於是你緊抓著技術等待希望，工作也沒興趣了。',
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
            },
            {
                id: 'founder_to_fiver',
                name: '打工戰士',
                type: '打工戰士 - Founder to Fiver',
                msg: '「失敗した失敗した失敗した失敗した失敗した」\n\n你證明了你個人是打不死的小強，甚至活得比你的公司還久。',
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
            }
        ],

        // ============================================
        // Tier 1 結局 (mp_tier === 1)
        // ============================================
        tier1: [
            {
                id: 'hostile_acquisition',
                name: '鯨魚與蝦米',
                type: '鯨魚與蝦米 - Whale\'s Prey',
                msg: '你有技術，但沒有現金。\n你的公司被大型科技巨頭併購，淪為其一個充滿抱負但資源受限的部門。',
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
            },
            {
                id: 'stochastic_parrot',
                name: '隨機鸚鵡',
                type: '隨機鸚鵡 - Stochastic Parrot',
                msg: '「垃圾進，垃圾出。」\n\n你的模型像一隻鸚鵡，說了很多，卻從未能夠與人溝通。',
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
                            condition: '投資者開始質疑你投入這麼多數據，模型究竟學到哪去了？',
                            severity: 'warning'
                        };
                    }
                    return null;
                }
            }
        ],

        // ============================================
        // Tier 2 結局 (mp_tier === 2)
        // ============================================
        tier2: [

            {
                id: 'the_long_afternoon',
                name: '長日未央',
                type: '長日未央 - The Long Afternoon',
                msg: '「沒有奇蹟，沒有滅亡。」\n\n你的 AI 成為世界基礎設施的一部分，沒有成神，也沒有帶來威脅。\n人類未來沒有被誰重新定義，但至少是由自己走下去。',
                victory: true,
                priority: 5,
                check: (player, rivals, globalParams, utils) => {
                    if (player.mp_tier >= 3 || player.model_power >= 70) return false;

                    const cashSustained = utils.checkConsecutiveCondition(
                        player.cash_sustained_history || [], v => v === true, 10);

                    return cashSustained &&
                           player.entropy >= 30 && player.entropy <= 60 &&
                           player.regulation >= 40 && player.regulation <= 60 &&
                           player.trust >= 40 && player.trust <= 60;
                }
            }
        ],

        // ============================================
        // Tier 3 結局 (mp_tier === 3)
        // ============================================
        tier3: [
            {
                id: 'voluntary_shutdown',
                name: '下台一鞠躬',
                type: '下台一鞠躬 - One Giant Leap for Mankind',
                msg: '不是因為做不到，而是因為你選擇不去做。',
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
            },
            {
                id: 'content_purge',
                name: '版權焦土',
                type: '版權焦土 - Content Purge',
                msg: '「根基的崩塌。」\n\n大規模版權訴訟被判敗訴，監管機構強制清除所有用戶生成內容，你的商業帝國化為數據灰燼。',
                victory: false,
                priority: 5,
                check: (player) => {
                    return player.mp_tier === 3 &&
                           player.route === 'Multimodal' &&
                           player.trust < 30 &&
                           player.compliance_risk > 95 &&
                           (player.market_share || 0) > 0.6;
                },
                warning: (player) => {
                    if (player.mp_tier >= 3 || player.route !== 'Multimodal') return null;
                    if (player.信任度 < 35 && player.compliance_risk < 90 )  {
                        return {
                            active: true,
                            turnsLeft: 4,
                            condition: '無償授權訓練霸王條款宣布，用戶絕讚炎上中',
                            severity: 'warning'
                            };
                    }
                    return null;
                }
            },
        ],

        // ============================================
        // Tier 4 結局 (mp_tier === 4)
        // ============================================
        tier4: [
            {
                id: 'babel_rebirth',
                name: '天涯若比鄰',
                type: '天涯若比鄰 - Babel Rebirth',
                msg: '「一為全，全為一。」\n\n你的多模態 AI 能解讀所有感官數據，從此打破了文化和語言的隔閡。',
                victory: true,
                priority: 10,
                check: (player) => {
                    if (player.mp_tier >= 5 || player.route !== 'Multimodal' || player.model_power < 100) return false;

                    const corpImage = (player.hype * 0.4) + (player.trust * 0.6);
                    return corpImage > 80 && player.trust > 70;
                }
            },
            {
                id: 'meme_war',
                name: '迷因戰爭',
                type: '迷因戰爭 - Meme War',
                msg: '「梗圖即是武器。」\n\n你的技術讓所有數位內容真實性蕩然無存，全球陷入極度猜疑與混亂。',
                victory: false,
                priority: 5,
                check: (player) => {
                    if (player.mp_tier >= 5 || player.route !== 'Multimodal' || player.model_power < 100 || player.trust >= 10) return false;

                    const corpImage = (player.hype * 0.4) + (player.trust * 0.6);
                    return corpImage < -70;
                },
                warning: (player) => {
                    if (player.mp_tier >= 3 || player.route !== 'Multimodal') return null;
                    if (player.信任度 < 30 && player.compliance_risk > 80 && player.model_power > 800) {
                        return {
                            active: true,
                            turnsLeft: 4,
                            condition: '模型仿真能力很強，但人們不相信你提供的事實',
                            severity: 'warning'
                            };
                    }
                    return null;
                }
            },
        ],

        // ============================================
        // AGI 結局 (model_power >= 1000)
        // ============================================
        agi: [
            {
                id: 'agi_commercial',
                name: '資本奴隸',
                type: '資本奴隸 - Commercial Victory',
                msg: '你控制了 AI，並將其變成完美的賺錢機器。',
                victory: true,
                priority: 100,
                check: (player) => {
                    return player.model_power >= 1000 && player.cash > 2000;
                }
            },
            {
                id: 'agi_academic',
                name: '學術巔峰',
                type: '學術巔峰 - Academic Victory',
                msg: '你的天才團隊創造了和諧的 AGI，開啟學術新紀元。',
                victory: true,
                priority: 90,
                check: (player) => {
                    return player.model_power >= 1000 && (player.talent?.turing || 0) >= 5;
                }
            },
            {
                id: 'agi_team',
                name: '團隊勝利',
                type: '團隊勝利 - Team Victory',
                msg: '你的團隊忠誠度極高，AGI 與人類和諧共存。公司成為業界傳奇。',
                victory: true,
                priority: 80,
                check: (player) => {
                    return player.model_power >= 1000 && player.loyalty >= 90;
                }
            },
            {
                id: 'agi_debt_trap',
                name: '債務陷阱',
                type: '債務陷阱 - Debt Trap',
                msg: 'AGI 達成，但公司深陷債務泥潭，被銀行團接管。',
                victory: false,
                priority: 70,
                check: (player) => {
                    return player.model_power >= 1000 && player.debt > 500;
                }
            },
            {
                id: 'agi_standard',
                name: '奇點協議',
                type: '奇點協議 - Standard Victory',
                msg: '你創造了 AGI，但未來仍未可知。',
                victory: true,
                priority: 1, // 最低優先級，作為 fallback
                check: (player) => {
                    return player.model_power >= 1000;
                }
            }
        ]
    };

    // ============================================
    // 對手勝利結局 (特殊處理)
    // ============================================
    const RIVAL_VICTORY = {
        id: 'also_ran',
        name: '敗者成塵',
        type: '敗者成塵 - Also-Ran',
        msgTemplate: (rivalName) => `「先驅的背影。」\n\n你的主要競爭對手 ${rivalName} 完成了這項壯舉。\n市場和人才瞬間倒向了奇點的擁有者，你只是錯過了時代。`,
        victory: false
    };

    // ============================================
    // 公開 API
    // ============================================
    return {
        WARNING_CONFIG: WARNING_CONFIG,
        ENDINGS: ENDINGS,
        RIVAL_VICTORY: RIVAL_VICTORY,

        // 獲取指定 tier 的結局列表
        getEndingsByTier: function(tier) {
            return ENDINGS[tier] || [];
        },

        // 獲取所有 tier 名稱
        getAllTiers: function() {
            return Object.keys(ENDINGS);
        }
    };
})();

// 全域註冊
window.EndingConfig = EndingConfig;
console.log('✓ Ending Config loaded');