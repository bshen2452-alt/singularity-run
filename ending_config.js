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
                        player.community_size > 1000000; // 假設變數名為 communitySize
                },
                warning: (player) => {
                    // 當玩家開始往這個方向走時，給予預警
                    if (player.route === 'Multimodal' && player.community_size > 900000 && player.trust < 40) {
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
                id: 'the_last_arbitrage',
                name: '最後的晚餐',
                type: '最後的晚餐 - The Last Arbitrage',
                msg: '「不勞而獲的冠軍。」\n\n雖然對手掌握了奇點，但你掌握了對手。\n不能解決問題，就買下能解決問題的人。',
                victory: true,
                priority: 150, // 極高優先級，因為這是在對手達到AGI時的特殊逆轉結局
                check: (player, rivals) => {
                    // 玩家自身未達AGI
                    if ((player.model_power || 0) >= 1005) return false;
                    
                    // 檢查是否有對手達到AGI且玩家在該對手身上投資超過1000
                    if (!rivals || rivals.length === 0) return false;
                    if (!player.rival_investments) return false;
                    
                    for (let i = 0; i < rivals.length; i++) {
                        const rival = rivals[i];
                        const rivalMP = rival.model_power || rival.mp || 0;
                        const playerInvestment = player.rival_investments[rival.name] || 0;
                        
                        // 對手達到AGI (mp >= 1005) 且玩家投資超過1000
                        if (rivalMP >= 1005 && playerInvestment >= 1000) {
                            return true;
                        }
                    }
                    return false;
                },
                warning: (player, rivals) => {
                    if (!rivals || rivals.length === 0) return null;
                    if (!player.rival_investments) return null;
                    
                    // 尋找最接近AGI且有大量投資的對手
                    let bestCandidate = null;
                    let highestProgress = 0;
                    
                    for (let i = 0; i < rivals.length; i++) {
                        const rival = rivals[i];
                        const rivalMP = rival.model_power || rival.mp || 0;
                        const playerInvestment = player.rival_investments[rival.name] || 0;
                        
                        // 對手接近AGI (mp >= 800) 且玩家投資接近門檻 (>= 800)
                        if (rivalMP >= 800 && playerInvestment >= 800) {
                            const progress = (rivalMP / 1005) * (playerInvestment / 1000);
                            if (progress > highestProgress) {
                                highestProgress = progress;
                                bestCandidate = rival;
                            }
                        }
                    }
                    
                    if (bestCandidate) {
                        const investment = player.rival_investments[bestCandidate.name] || 0;
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: `${bestCandidate.name} 即將突破奇點，你持有其 $${investment}M 股份`,
                            severity: investment >= 950 ? 'info' : 'warning'
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
                msg: '「學術的避風港？」\n\n你投了整年的獎助金申請書最終被一所頂尖大學的院長看到，他發現你的計劃書寫得好棒。\n現在你正在替他趕教學計畫。',
                victory: false,
                priority: 5,
                // 判定條件：MP 等級為 0、資金極低、回合數過半，且擁有多位頂尖人才
                check: (player) => {
                    const turingCount = player.talent?.turing || 0;
                    const applyGrantCount = player.finance_action_counts?.applyGrant || 0;
                    return player.mp_tier === 0 && 
                        player.cash < 5 && 
                        player.turn_count > 4 && 
                        turingCount >= 2 &&
                        applyGrantCount >= 4;
                },
                // 預警系統：當資金開始見底且空有大師時觸發
                warning: (player) => {
                    const turingCount = player.talent?.turing || 0;
                    const applyGrantCount = player.finance_action_counts?.applyGrant || 0;
                    if (player.mp_tier === 0 && player.cash < 15 && turingCount >= 2 && applyGrantCount >= 3) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '我們接到了您的申請，想請問您有沒有興趣挑戰新的機會?',
                            severity: player.cash < 20 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'clothes_man',
                name: '國王新衣',
                type: '國王新衣 - Clothes make the man',
                msg: '「只是套了一件衣服。」\n\n一位資深工程師用 5 行程式碼證明你的「創新模型」只是在調用某大廠 API。\n你的公司成為科技圈最大笑柄。',
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
                            condition: '比起你的模型進展，你個人似乎更加引人注目？',
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
                msg: '「誰愛幹誰幹。」\n\n你認為一技在手希望無窮，也認為興趣不能當飯吃。\n於是你緊抓著技術苦等希望，工作也沒興趣了。',
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
                    // 滿足：Tier 1、低對齊值、低熵值（缺乏創造性）、且遊戲已進行一定回合
                    return player.mp_tier === 1 &&
                        player.alignment < 10 &&
                        player.entropy < 40 &&
                        player.turn_count > 12;
                },
                warning: (player) => {
                    // 預警條件：當對齊值過低且接近目標回合數時
                    if (player.mp_tier === 1 &&
                        player.entropy < 50 && 
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
            // 開源路線專屬結局
            {
                id: 'the_fragmented_tower',
                name: '民主碎片',
                type: '民主碎片 - The Fragmented Tower',
                msg: '「人月神話。」\n\n你的技術被數百個相互競爭的社群版本分裂，\n潛力耗盡，最終被閉源巨頭超越。',
                victory: false,
                priority: 5,
                check: (player) => {
                    // 觸發條件：處於 Tier 2、走開源路線、信任度低於 20、
                    // 社群規模巨大 (10000+)、參與度飽和 (100) 但滿意度極低 (<=30)
                    return player.mp_tier === 2 &&
                        player.route === 'OpenSource' &&
                        player.trust < 20 &&
                        player.community_size >= 10000 &&
                        (player.community?.engagement || 0) >=95; 
                },
                warning: (player) => {
                    // 預警邏輯：當信任度開始滑落且參與度過高（代表社群爭議多）時觸發
                    if (player.route === 'OpenSource' && player.trust < 35 && (player.community?.engagement || 0) > 80) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '社群出現嚴重分歧，碎片化風險極高',
                            severity: player.trust < 30 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },

        ],

        // ============================================
        // Tier 3 結局 (mp_tier === 3)
        // ============================================
        tier3: [

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
                    if (player.route === 'Multimodal' && player.compliance_risk > 80 && player.trust < 45) {
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
                msg: '「欲速則不達。」\n\n你的 AI 演算法在社會關鍵系統中推行了系統性歧視或錯誤決策，導致不可挽回的社會混亂。',
                victory: false,
                priority: 8,
                // 判定邏輯：當玩家處於 Tier 3，且風險、信任、市值、熵值均達高標
                check: (player) => {
                    return player.mp_tier === 3 &&
                           player.route === 'Multimodal' &&
                           player.compliance_risk > 90 && // 數據合規風險
                           player.trust > 80 &&                // 信任度
                           player.market_cap > 500 &&          // 市值
                           player.entropy > 80;                // 熵值
                },
                // 預警邏輯：在風險或熵值接近臨界點時發出警告
                warning: (player) => {
                    if (player.route === 'Multimodal' && player.mp_tier === 3 && 
                        (player.compliance_risk > 75 || player.entropy > 65)) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '用戶信任你，但你的模型潛藏風險',
                            severity: (player.data_compliance_risk > 75) ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            // 開源路線專屬結局
{
                id: 'pandoras_fork',
                name: '十面埋伏',
                type: "十面埋伏 - Pandora's Fork",
                msg: '「潘朵拉的魔盒打開了。」\n\n你的模型很好用，路過的網路詐騙犯、暗網人士和恐怖份子都說讚。',
                victory: false,
                priority: 8, // 優先級高，因為這是一個特定路線的複合條件結局
                
                // 判定條件：達到 Tier 3、走開源路線、高信譽、大規模社群、極高監管風險、高民意
                check: (player) => {
                    return player.mp_tier === 3 &&
                           player.route === 'OpenSource' &&
                           player.trust >= 60 &&
                           player.community_size >= 50000 &&
                           player.regulation >= 90 && // 監管壓力爆表
                           (player.community?.sentiment || 0) >= 70;    // 但民眾反應竟然還不錯（諷刺）
                },
                // 預警系統：當監管指標接近臨界點時觸發
                warning: (player) => {
                    if (player.route === 'OpenSource' && player.regulation > 75) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '模型的惡意衍生版本正在暗網擴散，監管風暴即將來臨',
                            severity: player.regulation >= 85 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            // Scaling Law路線專屬結局
            {
                id: 'the_devourer',
                name: '饑餓爬蟲',
                type: '饑餓爬蟲 - The Devourer',
                msg: '「好餓好餓的毛毛蟲……」\n\n你對外界數據的渴望達到了偏執。\n而外界對你的模型回以全球範圍的隔離和抵制。',
                victory: false,
                priority: 8, // Tier 3 特殊結局通常具有較高優先權
                check: (player) => {
                    return player.mp_tier === 3 &&
                        player.route === 'Scaling Law' &&
                        player.trust < 20 &&
                        player.compliance_risk > 90 &&
                        player.regulation >= 100 && 
                        player.model_power > 400;
                },
                warning: (player) => {
                    // 當合規風險過高且信任度低於警戒線時觸發預警
                    if (player.route === 'Scaling Law' && 
                        player.compliance_risk > 70 && 
                        player.trust < 30) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '網路創作者、新聞媒體業與IP巨頭都被你惹毛了？',
                            severity: player.compliance_risk > 85 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'wunderkind_no_more',
                name: '小時了了',
                type: '小時了了 - Wunderkind no more',
                msg: '「組成社會的螺釘。」\n\n資金充裕、形象良好，但你的 AI 永遠無法突破下一個門檻。\n你成了兒時自己嫌棄無趣的大人。',
                victory: false,
                priority: 5,
                // 判定條件：達到 Tier 3 但模型實力不足、信任度高、資金極其充裕且遊戲已進入後期
                check: (player) => {
                    return player.mp_tier === 3 &&
                        (player.model_power || 0) < 150 && 
                        (player.trust || 0) >= 60 &&
                        (player.cash || 0) >= 500 &&
                        (player.turn_count || 0) > 40;
                },
                // 預警系統：偵測到技術停滯但公司穩定
                warning: (player) => {
                    if (player.mp_tier === 3 && 
                        (player.model_power || 0) < 150 && 
                        (player.cash || 0) > 400) {
                        return {
                            active: true,
                            turnsLeft: 5,
                            condition: '發展正步上軌道，拼勁卻悄悄遠去',
                            severity: 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'commercial_victory',
                name: '資本奴隸',
                type: '資本奴隸 - Commercial Victory',
                msg: '「黃金鑄造的牢籠。」\n\n你的算法是完美的市場脈搏，無所不在的推銷員。\n股東賺翻了，人類智慧卻停滯不前。',
                victory: true, // 雖然諷刺，但在商業標準下是勝利
                priority: 8,   // 高優先級，代表這是一個強力的商業終局
                check: (player, rivals, globalParams) => {
                    // 判定條件：

                    // 系統熵值極低 (代表完全失去創新活力，僅剩僵化的算法)
                    // 現金流極高 (超過 500,000)
                    // 社群好感度極低 (低於 30，大眾反感)
                    return player.mp_tier === 3 &&
                        player.entropy < 20 &&
                        (player.product_state?.product_revenue || 0) > 500000 &&
                        (player.community?.sentiment || 0) < 30;
                },
                warning: (player, rivals, globalParams) => {
                    const sentiment = player.community?.sentiment || 0;
                    // 預警條件：當現金流已經達標，但社群聲望持續下跌時
                    if (player.mp_tier >= 2 && (player.product_state?.product_revenuee || 0) > 400000 && sentiment < 40) {
                        return {
                            active: true,
                            turnsLeft: 5,
                            condition: '既然投入這麼多錢研發，何不多貼幾張廣告呢?',
                            severity: sentiment < 35 ? 'critical' : 'info'
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
                id: 'the_long_afternoon',
                name: '長日未央',
                type: '長日未央 - The Long Afternoon',
                msg: '「沒有奇蹟，沒有滅亡。」\n\n你的 AI 成為世界基礎設施的一部分，沒有成神，也沒有帶來威脅。\n人類未來沒有被誰重新定義，但至少是由自己走下去。',
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
                            severity: isClose ? 'critical' : 'info' // 在勝利結局中，critical 可理解為「即將登神」
                        };
                    }
                    return null;
                }
            },
            {
                id: 'meme_war',
                name: '迷因戰爭',
                type: '迷因戰爭 - Meme War',
                msg: '「梗圖即是武器。」\n\n你的技術讓所有數位內容真實性蕩然無存，全球陷入極度猜疑。\n真理已死，剩下的只有無止盡的網軍嘴砲與罵戰。',
                victory: false, // 這屬於一種失控的負面結局
                priority: 8,
                check: (player) => {
                    return player.mp_tier === 4 &&
                           player.route === 'Multimodal' &&
                           player.trust < 20 &&
                           player.compliance_risk > 90 &&
                           player.model_power > 800;
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
            // 開源路線專屬結局
            {
                id: 'one_for_all',
                name: '開源革命',
                type: '開源革命 - ONE FOR ALL',
                msg: '「人人為我，我為人人。」\n\n你創造了繁榮、去中心化的 AI 生態系統。\n技術不再服務於權力，而屬於每個人。',
                victory: true,
                priority: 100, // 作為最終結局，優先級極高
                check: (player) => {
                    // 判定條件：必須同時滿足階層、路線、信任度、社群規模與參與度
                    return player.mp_tier === 4 &&
                        player.route === 'OpenSource' &&
                        player.trust > 800 &&
                        player.community_size > 500000000 &&
                        (player.community?.engagement || 0) >= 90 && // 修正：原稿為賦值符號，改為判斷符號
                        (player.community?.sentiment || 0) > 90;
                },
                warning: (player) => {
                    // 預警/提示：當玩家接近達成此壯舉時觸發
                    const progress = (
                        (player.trust / 800) + 
                        (player.community_size / 500000000) + 
                        ((player.community?.sentiment || 0) / 90)
                    ) / 3;

                    if (player.route === 'OpenSource' && progress > 0.8) {
                        return {
                            active: true,
                            turnsLeft: 5,
                            condition: '大家都在等你呢',
                            severity: 'Info' 
                        };
                    }
                    return null;
                }
            },
            {
                id: 'Techno-Anarchy',
                name: '為了部落！',
                type: '為了部落！ - Techno-Anarchy',
                msg: '「朕即國家。」\n\n每個人都能擁有頂級的個人化 AI 助手、武器和製造能力，\n你創造了一個極端自由，但混亂無序的無政府世界。',
                victory: false, // 雖然技術強大，但因失去秩序被判定為非完美結局
                priority: 8,
                check: (player) => {
                    return player.mp_tier === 4 &&
                           player.route === 'OpenSource' &&
                           player.trust < 20 &&        // 信任度極低
                           player.compliance_risk < 30 &&    // 合規風險（秩序）極低
                           player.model_power > 800;    // 模型戰力極高
                },
                warning: (player) => {
                    // 當技術實力接近終點，但社會信任與合規性持續崩解時觸發預警
                    if (player.model_power > 700 && (player.trust < 30 || player.compliance_risk < 40)) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '要是人人都能輕易驅使AI，這世界豈不是會有一堆垃圾資訊滿天飛嗎？',
                            severity: player.trust < 20 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            // 技術優化路線專屬結局
            {
                id: 'ghost_in_the_machine',
                name: '機中幽靈',
                type: '機中幽靈 - Ghost in the Machine',
                msg: '「我揮一揮衣袖，不帶走一片雲彩。」\n\n當所有人還在堆砌硬體時，你的天才演算法悄無聲息地完成了進化。\n現在奇點的鑰匙在你手中。',
                victory: true,
                priority: 100, // 極致成就，優先級設為最高
                check: (player) => {
                    // 達成最高 MP 等級、走效率路線、且擁有 10 名以上圖靈級天才
                    // 備註：cash < 5,000,000 代表這不是靠錢砸出來的，而是純粹的技術突破
                    return player.mp_tier === 4 &&
                        player.cash < 5000000 &&
                        player.route === 'Efficiency' &&
        player.model_power > 800 &&
                        (player.talent?.turing || 0) >= 10;
                },
                warning: (player) => {
                    const turingCount = (player.talent?.turing || 0);
                    // 當條件接近（例如有 10 個圖靈級天才且 MP 等級已高）時給予預警
                    if (player.route === 'Efficiency' && turingCount >= 4 && player.mp_tier >= 3) {
                        return {
                            active: true,
                            turnsLeft: 2,
                            condition: '手握鑰匙，你已抵達門前',
                            severity: 'info' // 對於邁向勝利來說，這是「極其重要」的關鍵時刻
                        };
                    }
                    return null;
                }
            },
            {
                id: 'oracles_silence',
                name: '靜默神諭',
                type: '靜默神諭 - Oracle\'s Silence',
                msg: '「佛曰不可說。」\n\n你創造了一個無人能管理的數位神祇。\n當它不再給予回應，已無工程師能修復、理解那個超越人智的系統了。',
                victory: false,
                priority: 20, // Tier 4 高階結局，優先級設定較高
                check: (player) => {
                    return player.mp_tier === 4 &&
                        player.model_power > 800 &&
                        player.route === 'Efficiency' &&
                        player.entropy > 90;
                },
                warning: (player) => {
                    // 當熵值接近臨界點 (例如 > 75) 且模型強度已達標時觸發預警
                    if (player.model_power > 700 && player.entropy > 75 && player.route === 'Efficiency') {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '底層程式碼逐漸自我重構為不可理解的形態......',
                            severity: player.entropy > 85 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },


            // Scaling Law路線專屬結局
            {
                id: 'scaling_leviathan',
                name: '利維坦壟斷',
                type: '利維坦壟斷 - Scaling Leviathan',
                msg: '「以資本定義智慧。」\n\n你證明了 AI 果然是場燒錢大戰。因為你公司的龐大規模和債務，現在債主們不敢讓它倒下了。',
                victory: true,
                priority: 8, // 屬於高級別結局，但略低於特殊結局
                check: (player) => {
                    // 滿足所有壟斷條件：等級 > 3、指定路線、極高資金與債務、正向現金流及強大算力
                    return player.mp_tier > 3 &&
                        player.route === 'Scaling Law' &&
                        player.cash >= 70000 &&
                        player.debt >= 90000 &&
                        (player.product_state?.product_revenue || 0) >= 100 && 
                        player.model_power > 800;
                },
                warning: (player) => {
                    // 當玩家進入 Scaling Law 路線且資金/債務規模接近時觸發預警
                    if (player.route === 'Scaling Law' && 
                        (player.cash >= 850000000 || player.debt >= 850000000)) {
                        return {
                            active: true,
                            turnsLeft: 5,
                            condition: '不僅AI，貴公司的債務與資金也將突破奇點',
                            severity: (player.product_state?.product_revenue || 0) < 0 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'the_big_short',
                name: '大賣空',
                type: '大賣空 - The Big Short',
                msg: '「傳奇空頭買入大量看跌期權。」\n\n不幸的是，這次又被他給賭對了。',
                victory: false,
                priority: 8, // 高優先級，因為這通常發生在遊戲後期
                // 判定邏輯：技術極高、走 Scaling Law 路線，但財務結構極端脆弱
                check: (player) => {
                    return player.mp_tier > 3 &&
                           player.route === 'Scaling Law' &&
                           player.cash < 70000 &&
                           player.debt > 90000 &&
                           (player.product_state?.product_revenue || 0) < 1000000 && 
                           player.model_power > 800;
                },
                // 預警邏輯：當債務接近現金且現金流低於安全線時觸發
                warning: (player) => {
                    const isDebtHeavy = player.debt > player.cash * 0.8;
                    const isCashFlowLow = (player.product_state?.product_revenue || 0) < 2000000;
                    if (player.route === 'Scaling Law' && isDebtHeavy && isCashFlowLow) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '讓你陷入困境的通常不是你不了解的，而是你自認為太了解的。',
                            severity: (player.product_state?.product_revenue || 0) < 1500000 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'voluntary_shutdown',
                name: '下台一鞠躬',
                type: '下台一鞠躬 - One Giant Leap for Mankind',
                msg: '不是因為做不到，而是因為你選擇不去做。',
                victory: true,
                priority: 10,
                check: (player) => {
                    return player.mp_tier >= 4 &&
                           player.turn_count > 100 &&
                           player.model_power >= 990 &&
                           player.model_power <= 999;
                },
                warning: (player) => {
                    if (player.model_power >= 990 && player.model_power <= 999) {
                        return {
                            active: true,
                            turnsLeft: 12 - player.turn_count + 1,
                            condition: '一步之遙，一念之間',
                            severity: 'info'
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
                id: 'clutch_time',
                name: '決勝時刻',
                type: '決勝時刻 - clutch time',
                msg: '「市場終局MPV。」\n\n你公司 MP 突破了歷史紀錄，成為市場上不可撼動的冠軍。',
                victory: true,
                priority: 1, // 優先級最低，確保特殊結局優先判定
                // 判定邏輯
                check: (player) => {
                    return player.mp_tier >= 1005 && player.cash > 0; // 判定條件：MP 達到 1005 且仍在營運
                },
                // 預警與進度追蹤
                warning: (player) => {
                    if (player.mp_tier >= 950) {
                        return {
                            active: true,
                            turnsLeft: Math.max(1, Math.ceil((1005 - player.mp_tier) / 20)),
                            condition: '這是你的尖峰時刻',
                            severity: 'info' // 使用 info 等級，代表正面預警
                        };
                    }
                    return null;
                }
            },
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
                            severity: (player.entropy > 90) ? 'critical' : 'info'
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
                    return (player.entropy || 0) >= 100 && 
                        (player.alignment || 0) < 30 &&
                        (player.model_power || 0) >= 1005;
                },
                warning: (player) => {
                    const entropy = player.entropy ||  0;
                    const alignment = player.alignment ||  0;
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
                id: 'faustian_bargain',
                name: '禮崩樂壞',
                type: '禮崩樂壞 - Faustian Bargain',
                msg: '「不受信任的奇點。」\n\n追逐過程中拋棄了所有道德底線。現在你達成了AGI，沒人相信你能控制它。',
                victory: false,
                priority: 25, // 高優先級，因為這通常是遊戲後期的關鍵轉折
                check: (player) => {
                    // 達成條件：法規壓力滿載、對齊度極低、且模型算力達標
                    return (player.regulation || 0) >= 95 && 
                           (player.alignment || 0) < 10 && 
                           (player.model_power || 0) >= 1005;
                },
                warning: (player) => {
                    // 預警條件：當算力接近臨界點且對齊度堪憂時
                    const isPowerful = (player.model_power || 0) > 900;
                    const isUnstable = (player.alignment || 0) < 20;
                    if (isPowerful && isUnstable) {
                        return {
                            active: true,
                            turnsLeft: 3,
                            condition: '為了獲得聖杯，總要繼續抵抗全世界。',
                            severity: (player.regulation || 0) > 80 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'singularity_protocol',
                name: '奇點協議',
                type: '奇點協議 - Singularity Protocol',
                msg: '「新紀元的開端。」\n\n你並非最大最強的，但你說服競爭對手共同簽署「奇點協議」，確保技術為全人類服務。',
                victory: true,
                priority: 80, // 高優先級，代表外交型AGI勝利
                check: (player) => {
                    // 基礎條件：達到AGI
                    if ((player.model_power || 0) < 1005) return false;
                    
                    // 信任度 > 200
                    if ((player.trust || 0) <= 200) return false;
                    
                    // 炒作度 > 400
                    if ((player.hype || 0) <= 400) return false;
                    
                    // 檢查產業親和度：需要5個產業達到「戰略聯盟」等級（70+）
                    const affinityState = player.industry_affinity_state;
                    if (!affinityState || !affinityState.affinity) return false;
                    
                    const industries = Object.values(affinityState.affinity);
                    const allianceCount = industries.filter(value => value >= 70).length;
                    
                    return allianceCount >= 5;
                },
                warning: (player) => {
                    // 預警條件：接近達成
                    const mp = player.model_power || 0;
                    const trust = player.trust || 0;
                    const hype = player.hype || 0;
                    
                    // 檢查產業親和度進度
                    const affinityState = player.industry_affinity_state;
                    let allianceCount = 0;
                    let nearAllianceCount = 0;
                    
                    if (affinityState && affinityState.affinity) {
                        for (const value of Object.values(affinityState.affinity)) {
                            if (value >= 70) allianceCount++;
                            else if (value >= 55) nearAllianceCount++;
                        }
                    }
                    
                    // 當MP接近AGI且其他條件有一定進展時觸發預警
                    if (mp >= 800 && trust >= 150 && hype >= 300 && (allianceCount >= 3 || (allianceCount >= 2 && nearAllianceCount >= 2))) {
                        const progress = (
                            (Math.min(mp, 1005) / 1005) * 0.3 +
                            (Math.min(trust, 200) / 200) * 0.25 +
                            (Math.min(hype, 400) / 400) * 0.25 +
                            (allianceCount / 5) * 0.2
                        );
                        
                        return {
                            active: true,
                            turnsLeft: progress >= 0.9 ? 2 : 5,
                            condition: `產業聯盟進度：${allianceCount}/5，全球影響力正在匯聚`,
                            severity: progress >= 0.85 ? 'info' : 'warning'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'great_schism',
                name: '大分流',
                type: '大分流 - Great Schism',
                msg: '「時代的兩極。」\n\n你與主要對手分不出勝負又無法合作，世界的 AI 發展被兩股截然不同的哲學分裂。',
                victory: false, // 達成AGI但世界分裂，非完美結局
                priority: 75,
                check: (player) => {
                    // 基礎條件：達到AGI
                    if ((player.model_power || 0) < 1005) return false;

                    // 信任度 < 200 或 炒作度 < 400
                    const trust = player.trust || 0;
                    const hype = player.hype || 0;
                    if (!(trust < 200 || hype < 400)) return false;
                    
                    // 檢查產業親和度：需要5個產業達到「疏遠」等級（<= -30）
                    const affinityState = player.industry_affinity_state;
                    if (!affinityState || !affinityState.affinity) return false;
                    
                    const industries = Object.values(affinityState.affinity);
                    const alienatedCount = industries.filter(value => value <= -30).length;
                    
                    return alienatedCount >= 5;
                },
                warning: (player) => {
                    const mp = player.model_power || 0;
                    const trust = player.trust || 0;
                    const hype = player.hype || 0;
                    
                    // 檢查產業疏遠進度
                    const affinityState = player.industry_affinity_state;
                    let alienatedCount = 0;
                    let nearAlienatedCount = 0;
                    
                    if (affinityState && affinityState.affinity) {
                        for (const value of Object.values(affinityState.affinity)) {
                            if (value <= -30) alienatedCount++;
                            else if (value <= -15) nearAlienatedCount++;
                        }
                    }
                    
                    // 當MP接近AGI且產業關係惡化時觸發預警
                    if (mp >= 800 && (trust < 220 || hype > 350) && (alienatedCount >= 3 || (alienatedCount >= 2 && nearAlienatedCount >= 2))) {
                        return {
                            active: true,
                            turnsLeft: alienatedCount >= 4 ? 2 : 4,
                            condition: `產業疏遠警告：${alienatedCount}/5 個產業關係破裂`,
                            severity: alienatedCount >= 4 ? 'critical' : 'warning'
                        };
                    }
                    return null;
                }
            },
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
