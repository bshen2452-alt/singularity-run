// ============================================
// 結局引擎 - ending_engine.js (修復版)
// ============================================
// 修復：直接使用 GameConfig.ENDINGS，不依賴 TIER_ENDINGS

class EndingEngine {
    constructor() {
        this.endingChecks = new Map();
        this._initEndingChecks();
    }
    
    /**
     * 初始化所有結局檢查函數
     */
    _initEndingChecks() {
        // Tier 0 結局
        this.endingChecks.set('tier0_peer_reviewed', this._checkTier0PeerReviewed.bind(this));
        this.endingChecks.set('tier0_clothes_man', this._checkTier0ClothesMan.bind(this));
        this.endingChecks.set('tier0_gilded_cage', this._checkTier0GildedCage.bind(this));
        this.endingChecks.set('tier0_founder_to_fiver', this._checkTier0FounderToFiver.bind(this));
        
        // Tier 1 結局
        this.endingChecks.set('tier1_hostile_acquisition', this._checkTier1HostileAcquisition.bind(this));
        this.endingChecks.set('tier1_rust_in_peace', this._checkTier1RustInPeace.bind(this));
        this.endingChecks.set('tier1_stochastic_parrot', this._checkTier1StochasticParrot.bind(this));
        
        // Tier 2 結局
        this.endingChecks.set('tier2_gotterdammerung', this._checkTier2Gotterdammerung.bind(this));
        this.endingChecks.set('tier2_wall_street_mirage', this._checkTier2WallStreetMirage.bind(this));
        this.endingChecks.set('tier2_the_long_afternoon', this._checkTier2TheLongAfternoon.bind(this));
        
        // Tier 3 結局
        this.endingChecks.set('tier3_wunderkind_no_more', this._checkTier3WunderkindNoMore.bind(this));
        this.endingChecks.set('tier3_voluntary_shutdown', this._checkTier3VoluntaryShutdown.bind(this));
        this.endingChecks.set('tier3_content_purge', this._checkTier3ContentPurge.bind(this));
        
        // Tier 4 結局
        this.endingChecks.set('tier4_babel_rebirth', this._checkTier4BabelRebirth.bind(this));
        this.endingChecks.set('tier4_meme_war', this._checkTier4MemeWar.bind(this));
        
        // AGI 結局
        this.endingChecks.set('agi_commercial', this._checkAGICommercial.bind(this));
        this.endingChecks.set('agi_academic', this._checkAGIAcademic.bind(this));
        this.endingChecks.set('agi_team', this._checkAGITeam.bind(this));
        this.endingChecks.set('agi_debt_trap', this._checkAGIDebtTrap.bind(this));
        this.endingChecks.set('agi_standard', this._checkAGIStandard.bind(this));
    }
    
    /**
     * 主結局檢查入口
     * @param {Object} player - 玩家狀態
     * @param {Array} rivals - 競爭對手陣列
     * @returns {Object|null} 觸發的結局配置
     */
    evaluate(player, rivals) {
        if (!player) return null;
        
        // 1. 檢查 Doom 結局 (最高優先級)
        const doomEnding = this._evaluateDoomEndings(player);
        if (doomEnding) return doomEnding;
        
        // 2. 檢查競爭對手勝利
        const rivalEnding = this._evaluateRivalVictory(rivals || []);
        if (rivalEnding) return rivalEnding;
        
        // 3. 檢查 AGI 結局 (model_power >= 1000)
        if (player.model_power >= 1000) {
            const agiEnding = this._checkAGIEndings(player);
            if (agiEnding) return agiEnding;
        }
        
        // 4. 檢查中期結局 (基於 mid_game 配置)
        const midGameEnding = this._checkMidGameEndings(player);
        if (midGameEnding) return midGameEnding;
        
        return null;
    }
    
    /**
     * 檢查 Doom 結局
     */
    _evaluateDoomEndings(player) {
        const doomGauge = this._calculateDoomGauge(player);
        const thresholds = { 
            commercial_ruin: 3, 
            internal_unraveling: 4, 
            external_sanction: 5 
        };
        
        for (const [doomType, level] of Object.entries(doomGauge)) {
            if (typeof level === 'number' && level >= 70) {
                const consec = player.doom_consecutive_turns?.[doomType] || 0;
                const threshold = thresholds[doomType];
                
                if (threshold && consec >= threshold) {
                    const doomEndings = window.GameConfig?.ENDINGS?.doom_failures;
                    if (doomEndings && doomEndings[doomType]) {
                        const endingData = doomEndings[doomType];
                        return {
                            ending: {
                                msg: endingData.msg,
                                type: endingData.type,
                                name: endingData.type,
                                description: endingData.msg
                            },
                            id: doomType,
                            victory: false,
                            checkId: `doom_${doomType}`
                        };
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * 計算 Doom Gauge
     */
    _calculateDoomGauge(player) {
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
            // 也返回原始指標
            regulation,
            entropy,
            compliance_risk
        };
    }
    
    /**
     * 檢查競爭對手勝利
     */
    _evaluateRivalVictory(rivals) {
        if (!rivals || !Array.isArray(rivals)) return null;
        
        for (const rival of rivals) {
            if (rival.mp >= 1000) {
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
     * 檢查 AGI 結局
     */
    _checkAGIEndings(player) {
        const singularityEndings = window.GameConfig?.ENDINGS?.singularity;
        if (!singularityEndings) return null;
        
        // AGI 商業勝利
        if (this._checkAGICommercial(player)) {
            return this._formatSingularityEnding('commercial', singularityEndings.commercial);
        }
        
        // AGI 學術勝利
        if (this._checkAGIAcademic(player)) {
            return this._formatSingularityEnding('academic', singularityEndings.academic);
        }
        
        // AGI 團隊勝利
        if (this._checkAGITeam(player)) {
            return this._formatSingularityEnding('team', singularityEndings.team);
        }
        
        // AGI 債務陷阱
        if (this._checkAGIDebtTrap(player)) {
            return this._formatSingularityEnding('debt_trap', singularityEndings.debt_trap);
        }
        
        // AGI 標準勝利
        if (this._checkAGIStandard(player)) {
            return this._formatSingularityEnding('standard', singularityEndings.standard);
        }
        
        return null;
    }
    
    _formatSingularityEnding(id, endingData) {
        if (!endingData) return null;
        return {
            ending: {
                msg: endingData.msg,
                type: endingData.type,
                name: endingData.type,
                description: endingData.msg
            },
            id: id,
            victory: endingData.victory !== false,
            checkId: `agi_${id}`
        };
    }
    
    /**
     * 檢查中期結局
     */
    _checkMidGameEndings(player) {
        const midGameEndings = window.GameConfig?.ENDINGS?.mid_game;
        if (!midGameEndings) return null;
        
        // 敵意收購 (Tier 1)
        if (this._checkTier1HostileAcquisition(player)) {
            return this._formatMidGameEnding('hostile_acquisition', midGameEndings.hostile_acquisition);
        }
        
        // 諸神黃昏 (Tier 2)
        if (this._checkTier2Gotterdammerung(player)) {
            return this._formatMidGameEnding('gotterdammerung', midGameEndings.gotterdammerung);
        }
        
        // 主動關閉 (Tier 3)
        if (this._checkTier3VoluntaryShutdown(player)) {
            return this._formatMidGameEnding('voluntary_shutdown', midGameEndings.voluntary_shutdown);
        }
        
        // 其他中期結局檢查可在此添加...
        
        return null;
    }
    
    _formatMidGameEnding(id, endingData) {
        if (!endingData) return null;
        return {
            ending: {
                msg: endingData.msg,
                type: endingData.type,
                name: endingData.type,
                description: endingData.msg
            },
            id: id,
            victory: endingData.victory || false,
            checkId: `mid_${id}`
        };
    }
    
    // ============================================
    // 具體結局條件檢查函數
    // ============================================
    
    _checkTier0PeerReviewed(player) {
        return player.mp_tier === 0 && player.cash < 5 && (player.talent?.turing || 0) >= 2;
    }
    
    _checkTier0ClothesMan(player) {
        return player.mp_tier === 0 && player.model_power < 15 && player.hype > 80;
    }
    
    _checkTier0GildedCage(player) {
        return player.mp_tier === 0 && player.cash > 100 && player.model_power < 12 && player.turn_count > 8;
    }
    
    _checkTier0FounderToFiver(player) {
        return player.mp_tier === 0 && player.turn_count > 12 && player.model_power < 20;
    }
    
    _checkTier1HostileAcquisition(player) {
        if (player.mp_tier >= 2 || player.model_power < 25) return false;
        return player.cash < 10 && player.model_power >= 25 && player.market_cap < 200;
    }
    
    _checkTier1RustInPeace(player) {
        if (player.mp_tier >= 2) return false;
        const corpImage = (player.hype * 0.4) + (player.trust * 0.6);
        const cashFlowConsecutive = this._checkConsecutiveCondition(
            player.cash_flow_history || [], v => v < 150, 5);
        const marketCapDecline = this._checkConsecutiveCondition(
            player.market_cap_history || [], 
            (v, i, arr) => i > 0 && v < arr[i - 1], 5);
        
        return cashFlowConsecutive && corpImage < 80 && marketCapDecline;
    }
    
    _checkTier1StochasticParrot(player) {
        return player.mp_tier < 2 && 
               player.route === 'Multimodal' && 
               player.alignment < 20 && 
               player.entropy < 20 && 
               (player.total_data_consumed || 0) > 800;
    }
    
    _checkTier2Gotterdammerung(player) {
        return player.mp_tier < 3 && 
               player.cash > 200 && 
               ((player.talent?.turing || 0) + 
                (player.talent?.senior || 0) + 
                (player.talent?.junior || 0)) < 3;
    }
    
    _checkTier2WallStreetMirage(player) {
        if (player.mp_tier >= 3 || player.model_power >= 20 || player.hype <= 95) return false;
        
        return this._checkConsecutiveCondition(
            player.low_compute_usage_history || [], v => v === true, 10);
    }
    
    _checkTier2TheLongAfternoon(player) {
        if (player.mp_tier >= 3 || player.model_power >= 70) return false;
        
        const cashSustained = this._checkConsecutiveCondition(
            player.cash_sustained_history || [], v => v === true, 10);
        
        return cashSustained &&
               player.entropy >= 30 && player.entropy <= 60 &&
               player.regulation >= 40 && player.regulation <= 60 &&
               player.trust >= 40 && player.trust <= 60;
    }
    
    _checkTier3WunderkindNoMore(player) {
        if (player.mp_tier >= 4 || player.model_power < 70) return false;
        
        const recentLowGrowth = this._checkConsecutiveCondition(
            player.mp_growth_streak || [], v => v < 5, 10);
        const recentCashFlow = player.cash_flow_history?.slice(-1)[0] || 0;
        return recentLowGrowth && recentCashFlow > 100;
    }
    
    _checkTier3VoluntaryShutdown(player) {
        return player.mp_tier < 4 && player.model_power >= 95 && player.alignment >= 70;
    }
    
    _checkTier3ContentPurge(player) {
        return player.mp_tier < 4 && 
               player.route === 'Multimodal' && 
               player.model_power > 100 && 
               player.compliance_risk > 95 && 
               (player.market_share || 0) > 0.6;
    }
    
    _checkTier4BabelRebirth(player) {
        if (player.mp_tier >= 5 || player.route !== 'Multimodal' || player.model_power < 100) return false;
        
        const corpImage = (player.hype * 0.4) + (player.trust * 0.6);
        return corpImage > 80 && player.trust > 70;
    }
    
    _checkTier4MemeWar(player) {
        if (player.mp_tier >= 5 || player.route !== 'Multimodal' || player.model_power < 100 || player.trust >= 10) return false;
        
        const corpImage = (player.hype * 0.4) + (player.trust * 0.6);
        return corpImage < -70;
    }
    
    _checkAGICommercial(player) {
        return player.model_power >= 1000 && player.cash > 2000;
    }
    
    _checkAGIAcademic(player) {
        return player.model_power >= 1000 && (player.talent?.turing || 0) >= 5;
    }
    
    _checkAGITeam(player) {
        return player.model_power >= 1000 && player.loyalty >= 90;
    }
    
    _checkAGIDebtTrap(player) {
        return player.model_power >= 1000 && player.debt > 500;
    }
    
    _checkAGIStandard(player) {
        if (player.model_power < 1000) return false;
        
        // 檢查是否觸發了其他AGI結局
        if (this._checkAGICommercial(player)) return false;
        if (this._checkAGIAcademic(player)) return false;
        if (this._checkAGITeam(player)) return false;
        if (this._checkAGIDebtTrap(player)) return false;
        
        return true;
    }
    
    /**
     * 輔助函數：檢查連續條件
     */
    _checkConsecutiveCondition(history, condition, requiredCount) {
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
}

/**
 * 新的結局檢查函數（替換原本的 checkEndingConditions）
 */
function checkGameEnding(player, rivals) {
    const ending = window.EndingEngine.evaluate(player, rivals);
    
    if (ending) {
        console.log(`觸發結局: ${ending.ending?.type || ending.id}`);
        return ending;
    }
    
    return null;
}

// ============================================
// 結局引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    // 創建結局引擎實例
    const endingEngineInstance = new EndingEngine();
    
    // 註冊結局引擎到全局
    window.EndingEngine = {
        // 暴露實例方法
        evaluate: endingEngineInstance.evaluate.bind(endingEngineInstance),
        checkEndingConditions: endingEngineInstance.evaluate.bind(endingEngineInstance),
        
        // 保留獨立函數
        checkGameEnding,
        
        // Doom Gauge 計算
        calculateDoomGauge: endingEngineInstance._calculateDoomGauge.bind(endingEngineInstance)
    };
    
    console.log('✓ Ending Engine loaded (fixed version)');
})();