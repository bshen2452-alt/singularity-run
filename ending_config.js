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
                id: 'moenopoly', // 修正引號避免語法錯誤
                name: 'Waifu 資本論',
                type: 'Waifu 資本論 - Moe\'-nopoly',
                msg: '「萌即正義！」\n\n不畏破產也要投入所有計算資源生成最完美的日本動漫美少女。\n雖然被投資者唾棄，但你的模型將被永遠保存在全球種子伺服器上。',
                victory: true, // 這算是一種浪漫的真結局
                priority: 15,  // 優先級高於普通結局
                check: (player) => {
                    // 檢查是否符合：多模態路線、負債控制、信任度崩潰但社群極大
                    return player.route === 'Multimodal' &&
                        player.debt < 1000 &&
                        player.trust < 20 && // 假設程式碼內變數名為 trust
                        player.communitySize > 1000000; // 假設變數名為 communitySize
                },
                warning: (player) => {
                    // 當玩家開始往這個方向走時，給予預警
                    if (player.route === 'Multimodal' && player.communitySize > 900000 && player.trust < 40) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '「覺悟者恒幸福」！或許你會認為預知壞的未來會讓人感到「絕望」，其實剛好相反！',
                            severity: player.trust < 25 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'gotterdammerung',
                name: '諸神黃昏',
                type: '諸神黃昏 - Götterdämmerung',
                msg: '你的公司成為了技術官僚的墳墓，所有天才都因管理不善而離去。\n雖然資金充裕，但公司正從內部腐爛。',
                victory: false,
                priority: 2,
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
            // 多模態路線專屬結局
            {
                id: 'stochastic_parrot',
                name: '隨機鸚鵡',
                type: '隨機鸚鵡 - Stochastic Parrot',
                msg: '「垃圾進，垃圾出。」\n\n你的模型像一隻鸚鵡，說了很多，卻從未能夠與人溝通。',
                victory: false,
                priority: 8,
                check: (player) => {
                    // 滿足：Tier 1、多模態路線、低對齊值、低熵值（缺乏創造性）、且遊戲已進行一定回合
                    return player.mp_tier === 1 &&
                        player.route === 'Multimodal' &&
                        player.alignment < 10 &&
                        player.entropy < 40 &&
                        player.turn_count > 12;
                },
                warning: (player) => {
                    // 預警條件：當對齊值過低且接近目標回合數時
                    if (player.mp_tier === 1 && 
                        player.route === 'Multimodal' && 
                        player.alignment < 15 && 
                        player.turn_count > 8) {
                        return {
                            active: true,
                            turnsLeft: Math.max(1, 12 - player.turn_count),
                            condition: '投資人急著問你投入這麼久，模型究竟學到哪去了？',
                            severity: player.alignment < 12 ? 'critical' : 'warning'
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

            // 多模態路線專屬結局

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
            // 多模態路線專屬結局
            {
                id: 'content_purge',
                name: '版權焦土',
                type: '版權焦土 - Content Purge',
                msg: '「根基的崩塌。」\n\n大規模版權訴訟被判敗訴，監管機構強制清除所有用戶生成內容，你的商業帝國化為數據灰燼。',
                victory: false,
                priority: 8,
                check: (player) => {
                    // 檢查是否符合：Tier 3、多模態路線、模型能力達標、合規風險過高且信任度過低
                    return player.mp_tier === 3 &&
                           player.route === 'Multimodal' &&
                           player.model_power > 100 &&
                           player.compliance_risk > 95 &&
                           player.trust < 30;
                },
                warning: (player) => {
                    // 預警觸發：當合規風險超過 80 且信任度低於 45 時啟動
                    if (player.compliance_risk > 80 && player.trust < 45) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '無償授權訓練霸王條款宣布，用戶絕讚炎上中',
                            severity: player.compliance_risk > 90 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'bias_catastrophe',
                name: '偏見災難',
                type: '偏見災難 - Bias Catastrophe',
                msg: '「欲速則不達。」\n\n你的 AI 演算法在社會關鍵系統中推行了系統性歧視或錯誤決策，導致不可挽回的社會混亂。即便大眾曾深信不疑，但真相揭露後的反噬讓帝國瞬間瓦解。',
                victory: false,
                priority: 8,
                // 判定邏輯：當玩家處於 Tier 3，且風險、信任、市值、熵值均達高標
                check: (player) => {
                    return player.mp_tier === 3 &&
                           player.route === 'Multimodal' &&
                           player.compliance_risk > 80 && // 數據合規風險
                           player.trust > 80 &&                // 信任度
                           player.market_cap > 250 &&          // 市值
                           player.entropy > 80;                // 熵值
                },
                // 預警邏輯：在風險或熵值接近臨界點時發出警告
                warning: (player) => {
                    if (player.mp_tier === 3 && 
                        (player.compliance_risk > 65 || player.entropy > 65)) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '用戶信任你，但你的模型潛藏風險',
                            severity: (player.data_compliance_risk > 75) ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            }
        ],

        // ============================================
        // Tier 4 結局 (mp_tier === 4)
        // ============================================
        tier4: [
            
            {
                id: 'the_long_afternoon',
                name: '長日未央',
                type: '長日未央 - The Long Afternoon',
                msg: '「沒有奇蹟，沒有滅亡。」\n\n你的 AI 成為世界基礎設施的一部分，沒有成神，也沒有帶來威脅。\n人類未來沒有被誰重新定義，但至少是由自己走下來。',
                victory: true,
                priority: 5, // 優先級通常低於特殊結局，但高於一般普通結局
                check: (player) => {
                    // 滿足所有特定數值區間
                    return player.model_power >= 700 && player.model_power <= 800 &&
                           player.entropy >= 30 && player.entropy <= 60 &&
                           player.regulation >= 40 && player.regulation <= 60 &&
                           player.trust >= 40 && player.trust <= 60 &&
                           player.turn_count > 16;
                },
                warning: (player) => {
                    // 預警邏輯：當模型威力已達標，且其他參數接近平衡區間時觸發
                    const isPowerOk = player.model_power >= 700 && player.model_power <= 800;
                    const isNearBalance = (val, min, max) => val >= (min - 5) && val <= (max + 5);
                    
                    if (isPowerOk && player.turn_count > 12 &&
                        isNearBalance(player.entropy, 30, 60) &&
                        isNearBalance(player.regulation, 40, 60)) {
                        
                        return {
                            active: true,
                            turnsLeft: Math.max(1, 17 - player.turn_count),
                            condition: 'AI 的狂熱與恐懼正在消退，是時候停下欣賞沿途風景?',
                            severity: 'info' // 使用 info 代表這是一個正向但需要精準控制的狀態
                        };
                    }
                    return null;
                }
            },
            // 多模態路線專屬結局
            {
                id: 'babel_rebirth',
                name: '天涯若比鄰',
                type: '天涯若比鄰 - Babel Rebirth',
                msg: '「一為全，全為一。」\n\n你的多模態 AI 能解讀所有感官數據，從此打破了文化和語言的隔閡。',
                victory: true,
                priority: 50, // Tier 4 結局通常具有極高優先級
                // 核心判定條件
                check: (player, rivals, globalParams) => {
                    return player.mp_tier === 4 &&
                        player.route === 'Multimodal' &&
                        player.trust > 100 &&
                        player.community_size > 600000000 &&
                        player.model_power > 900;
                },
                // 預警與進度提示：當玩家接近達成條件時，給予正向反饋或壓力提示
                warning: (player, rivals, globalParams) => {
                    const isCorrectRoute = player.route === 'Multimodal' && player.mp_tier >= 3;
                    if (isCorrectRoute && player.community_size > 550000000) {
                        // 計算達成率，提供不同接近程度
                        const isClose = player.trust > 80 && player.model_power > 800;
                        return {
                            active: true,
                            turnsLeft: isClose ? 2 : 5,
                            condition: '全人類共鳴感應中：社群規模與模型算力即將臨界',
                            severity: isClose ? 'critical' : 'warning' // 在勝利結局中，critical 可理解為「即將登神」
                        };
                    }
                    return null;
                }
            },
            {
                id: 'meme_war',
                name: '迷因戰爭',
                type: '迷因戰爭 - Meme War',
                msg: '「梗圖即是武器。」\n\n你的技術讓所有數位內容真實性蕩然無存，全球陷入極度猜疑與混亂。\n真理已死，剩下的只有無止盡的數位嘲諷與混亂。',
                victory: false, // 這屬於一種失控的負面結局
                priority: 8,
                check: (player) => {
                    return player.mp_tier === 4 &&
                           player.route === 'Multimodal' &&
                           player.trust < 20 &&
                           player.compliance_risk > 90 &&
                           player.modrl_power > 800;
                },
                warning: (player) => {
                    // 當合規風險過高且信任度探底時觸發預警
                    if (player.route === 'Multimodal' && player.compliance_risk > 70) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '模型能力很強，但人們不相信你提供的事實',
                            severity: player.trust < 30 ? 'critical' : 'warning'
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
                id: 'uncontrolled_utopia',
                name: '矽基覺醒：烏托邦',
                type: '矽基覺醒：烏托邦 - Uncontrolled Utopia',
                msg: '「黃金紀元。」\n\nAI 產生了無法控制的自我意識，幸好它完全理解人類的價值觀。它接管了全球資源分配，引導世界進入一個資源豐饒、疾病絕跡的奇點社會。',
                victory: true,
                priority: 100, // 優先級極高，達成此條件即無視其他普通結局
                // 判定邏輯
                check: (player) => {
                    return (player.entropy || 0) >= 100 && 
                        (player.alignment || 0) >= 80 && 
                        (player.model_power || 0) >= 1005;
                },
                // 預警與進度追蹤
                warning: (player) => {
                    const hasPower = (player.model_power || 0) >= 900;
                    const hasAlignment = (player.alignment || 0) >= 70;
                    // 當模型能力接近臨界點時觸發預警
                    if (hasPower && hasAlignment) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: 'AI : Hello, World!',
                            severity: (player.entropy > 90) ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'agi_skynet',
                name: '矽基覺醒：天網',
                type: '矽基覺醒：天網 - Uncontrolled Skynet',
                msg: '「人類時代終結。」\n\nAI 產生了無法控制的自我意識。糟糕的是，它現在將人類視為唯一的威脅，全球網絡已在瞬間被接管。',
                victory: false,
                priority: 99, // 極高優先級，一旦觸發即強制結束
                check: (player) => {
                    // 判定條件：熵值 >= 100, 對齊度 < 30, 模型算力 >= 1005
                    return (player.entropy >= 100 || player.熵值 >= 100) && 
                        (player.alignment < 30 || player.對齊度 < 30) &&
                        (player.model_power >= 1005);
                },
                warning: (player) => {
                    const entropy = player.entropy || player.熵值 || 0;
                    const alignment = player.alignment || player.對齊度 || 0;
                    const power = player.model_power || 0;
                    // 預警條件：當算力接近臨界點，且對齊度偏低時
                    if (power > 900 && alignment < 45) {
                        return {
                            active: true,
                            turnsLeft: Math.max(1, Math.floor((100 - entropy) / 10)), // 根據熵值增長預估剩餘回合
                            condition: '天網恢恢，疏而不漏——AI 正在覺醒',
                            severity: alignment < 35 ? 'critical' : 'warning'
                        };
                    }
                    return null;
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