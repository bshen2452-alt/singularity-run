// ============================================
// 市場擾動引擎 (Market Perturbation Engine)
// ============================================
// 設計：玩家與對手行為對全球參數的影響
// 實現方案 B (債券ETF與利率循環) 和 方案 C (科技ETF與AI產業連動)

/**
 * 計算市場擾動效果
 * 基於玩家和對手的行為累積影響全球參數
 * @param {Object} player - 玩家狀態
 * @param {Array} rivals - 競爭對手陣列
 * @param {Object} globalMarket - 當前全球市場狀態
 * @returns {Object} 擾動結果（使用 GlobalMarket 索引名稱）
 */
function calculateMarketPerturbation(player, rivals, globalMarket) {
    // 使用 GlobalMarket 的索引名稱
    const perturbations = {
        interest_rate: 0,       // 利率指數擾動
        gpu_price: 0,           // GPU價格擾動
        market_confidence: 0,   // 市場信心擾動
        energy_price: 0         // 能源價格擾動
    };
    
    // 同時維護舊格式（向下兼容）
    const legacyPerturbations = {
        R_base: 0,
        P_GPU: 0,
        I_Hype: 0,
        E_Price: 0
    };
    
    const events = [];
    const config = window.MarketPerturbationConfig || getDefaultConfig();
    
    // === 1. 玩家規模效應 ===
    const playerInfluence = calculatePlayerInfluence(player);
    
    // === 2. 方案 B: 債務行為影響利率 ===
    const debtPerturbation = calculateDebtPerturbation(player, rivals, playerInfluence, config);
    perturbations.interest_rate += debtPerturbation.delta;
    legacyPerturbations.R_base += debtPerturbation.delta;
    if (debtPerturbation.event) events.push(debtPerturbation.event);
    
    // === 3. 方案 C: 算力需求影響 GPU價格 ===
    const gpuPerturbation = calculateGpuPerturbation(player, rivals, playerInfluence, config);
    perturbations.gpu_price += gpuPerturbation.delta;
    legacyPerturbations.P_GPU += gpuPerturbation.delta;
    if (gpuPerturbation.event) events.push(gpuPerturbation.event);
    
    // === 4. 里程碑成就影響市場信心 ===
    const hypePerturbation = calculateHypePerturbation(player, rivals, config);
    perturbations.market_confidence += hypePerturbation.delta;
    legacyPerturbations.I_Hype += hypePerturbation.delta;
    if (hypePerturbation.event) events.push(hypePerturbation.event);
    
    // === 5. 能源消耗影響能源價格 ===
    const energyPerturbation = calculateEnergyPerturbation(player, rivals, config);
    perturbations.energy_price += energyPerturbation.delta;
    legacyPerturbations.E_Price += energyPerturbation.delta;
    if (energyPerturbation.event) events.push(energyPerturbation.event);
    
    // === 6. 限制擾動範圍 ===
    const maxDelta = config.maxPerturbationPerTurn || 0.1;
    Object.keys(perturbations).forEach(key => {
        perturbations[key] = Math.max(-maxDelta, Math.min(maxDelta, perturbations[key]));
    });
    Object.keys(legacyPerturbations).forEach(key => {
        legacyPerturbations[key] = Math.max(-maxDelta, Math.min(maxDelta, legacyPerturbations[key]));
    });
    
    return {
        perturbations,              // 新格式（GlobalMarket indices）
        legacyPerturbations,        // 舊格式（向下兼容）
        events,
        playerInfluence,
        details: {
            debt: debtPerturbation,
            gpu: gpuPerturbation,
            hype: hypePerturbation,
            energy: energyPerturbation
        }
    };
}

/**
 * 計算玩家市場影響力
 * Tier 2+ 開始有影響力，規模越大影響越大
 */
function calculatePlayerInfluence(player) {
    const mpTier = player.mp_tier || 0;
    const marketCap = player.market_cap || 100;
    
    // Tier 0-1: 無影響力
    if (mpTier < 2) {
        return { level: 0, multiplier: 0, description: '新創階段，市場影響微弱' };
    }
    
    // 基礎影響力基於 Tier
    let baseInfluence = (mpTier - 1) * 0.15;  // Tier 2 = 0.15, Tier 5 = 0.6
    
    // 市值加成
    let marketCapBonus = 0;
    if (marketCap > 5000) marketCapBonus = 0.2;
    else if (marketCap > 2000) marketCapBonus = 0.1;
    else if (marketCap > 1000) marketCapBonus = 0.05;
    
    // 上市公司加成
    const publicBonus = player.is_public ? 0.1 : 0;
    
    const totalInfluence = Math.min(1.0, baseInfluence + marketCapBonus + publicBonus);
    
    let description;
    if (totalInfluence >= 0.7) description = '產業龍頭，足以影響市場走向';
    else if (totalInfluence >= 0.4) description = '主要玩家，市場關注度高';
    else if (totalInfluence >= 0.2) description = '新興力量，開始引起注意';
    else description = '小型參與者，影響有限';
    
    return {
        level: totalInfluence,
        multiplier: totalInfluence,
        description,
        components: { baseInfluence, marketCapBonus, publicBonus }
    };
}

/**
 * 方案 B: 債務行為對 R_base 的影響
 */
function calculateDebtPerturbation(player, rivals, playerInfluence, config) {
    let delta = 0;
    let event = null;
    
    const debtConfig = config.debtPerturbation || {};
    
    // 1. 玩家信用評級影響（大型企業違約風險傳導）
    if (playerInfluence.level >= 0.3) {
        const creditRating = player.credit_rating || 'BBB';
        const ratingRisk = {
            'AAA': -0.01, 'AA': -0.005, 'A': 0, 'BBB': 0,
            'BB': 0.01, 'B': 0.02, 'CCC': 0.03, 'D': 0.05
        };
        const riskDelta = (ratingRisk[creditRating] || 0) * playerInfluence.level;
        delta += riskDelta;
        
        if (riskDelta > 0.02) {
            event = {
                type: 'credit_risk_contagion',
                message: `📉 ${player.company_name || '玩家'}信用評級偏低，市場風險偏好下降`,
                param: 'R_base',
                delta: riskDelta
            };
        }
    }
    
    // 2. 大額垃圾債發行影響市場
    const recentJunkBond = player.recent_junk_bond || 0;  // 需要追蹤
    if (recentJunkBond > 0 && playerInfluence.level >= 0.2) {
        const junkBondEffect = (recentJunkBond / 500) * 0.02 * playerInfluence.level;
        delta += junkBondEffect;
    }
    
    // 3. 對手整體債務水平
    const totalRivalDebt = rivals.reduce((sum, r) => sum + (r.debt || 0), 0);
    const avgRivalMarketCap = rivals.reduce((sum, r) => sum + (r.market_cap || 500), 0) / Math.max(1, rivals.length);
    const marketDebtRatio = totalRivalDebt / (avgRivalMarketCap * rivals.length);
    
    if (marketDebtRatio > 0.8) {
        delta += 0.02;  // 整體市場高槓桿，利率上升
    } else if (marketDebtRatio < 0.3) {
        delta -= 0.01;  // 市場去槓桿，利率下降
    }
    
    return { delta, event, marketDebtRatio };
}

/**
 * 方案 C: 算力需求對 P_GPU 的影響
 */
function calculateGpuPerturbation(player, rivals, playerInfluence, config) {
    let delta = 0;
    let event = null;
    
    // 1. 玩家算力購買/擴張
    const playerPflops = (player.pflops || 0) + (player.cloud_pflops || 0);
    const previousPflops = player.previous_pflops || playerPflops;  // 需要追蹤
    const pflopsDelta = playerPflops - previousPflops;
    
    if (pflopsDelta > 0 && playerInfluence.level >= 0.2) {
        // 大量購買推升 GPU 價格
        const buyPressure = (pflopsDelta / 50) * 0.03 * playerInfluence.level;
        delta += buyPressure;
        
        if (buyPressure > 0.02) {
            event = {
                type: 'gpu_demand_surge',
                message: `📈 ${player.company_name || '玩家'}大規模採購算力，GPU需求上升`,
                param: 'P_GPU',
                delta: buyPressure
            };
        }
    }
    
    // 2. 對手算力擴張壓力
    const totalRivalPflops = rivals.reduce((sum, r) => sum + (r.pflops || 0), 0);
    const avgRivalMpTier = rivals.reduce((sum, r) => sum + (r.mp_tier || 0), 0) / Math.max(1, rivals.length);
    
    // 對手 Tier 提升帶來的算力需求
    if (avgRivalMpTier >= 3) {
        delta += 0.01 * (avgRivalMpTier - 2);  // Tier 3+ 的對手推升需求
    }
    
    // 3. 整體產業規模效應
    const totalIndustryPflops = playerPflops + totalRivalPflops;
    if (totalIndustryPflops > 200) {
        delta += 0.02;  // 產業擴張，GPU 供不應求
    } else if (totalIndustryPflops < 50) {
        delta -= 0.01;  // 產業萎縮，GPU 需求降低
    }
    
    // 4. 技術路線影響
    if (player.route === 'Scaling Law') {
        delta += 0.01 * playerInfluence.level;  // Scaling Law 路線推升算力需求
    } else if (player.route === 'Efficiency') {
        delta -= 0.005 * playerInfluence.level;  // 效率路線降低算力需求
    }
    
    return { delta, event, totalIndustryPflops };
}

/**
 * 里程碑成就對 I_Hype 的影響
 */
function calculateHypePerturbation(player, rivals, config) {
    let delta = 0;
    let event = null;
    
    // 1. 玩家里程碑效應（在 executeMilestoneLaunch 中已處理，這裡補充累積效應）
    const playerTier = player.mp_tier || 0;
    
    // 2. 對手里程碑競爭效應
    const maxRivalTier = Math.max(...rivals.map(r => r.mp_tier || 0), 0);
    const tierGap = playerTier - maxRivalTier;
    
    if (tierGap >= 2) {
        // 玩家大幅領先，市場信心高
        delta += 0.02;
    } else if (tierGap <= -2) {
        // 玩家大幅落後，但可能引發「追趕敘事」
        delta += 0.01;  // 競爭激烈也能提振市場
    }
    
    // 3. 產業整體發展水平
    const avgTier = (playerTier + rivals.reduce((sum, r) => sum + (r.mp_tier || 0), 0)) / (1 + rivals.length);
    if (avgTier >= 3) {
        delta += 0.02;  // 產業進入成熟期，信心上升
    }
    
    // 4. 失敗事件的負面影響
    const totalFailCount = Object.values(player.milestone_fail_count || {}).reduce((a, b) => a + b, 0);
    if (totalFailCount > 3) {
        delta -= 0.01;  // 多次失敗打擊市場信心
    }
    
    return { delta, event, avgTier };
}

/**
 * 能源消耗對 E_Price 的影響
 */
function calculateEnergyPerturbation(player, rivals, config) {
    let delta = 0;
    let event = null;
    
    // 1. 玩家空間/設施能源需求
    const spaceState = player.space_state;
    if (spaceState && spaceState.facilities) {
        const totalCapacity = spaceState.facilities.reduce((sum, f) => sum + (f.capacity || 0), 0);
        
        if (totalCapacity > 300) {
            delta += 0.02;  // 大規模設施推升能源需求
        } else if (totalCapacity > 150) {
            delta += 0.01;
        }
    }
    
    // 2. 對手設施擴張
    const rivalsWithHighTier = rivals.filter(r => (r.mp_tier || 0) >= 3).length;
    delta += rivalsWithHighTier * 0.005;  // 每個高 Tier 對手增加能源壓力
    
    // 3. 整體算力規模與能源的關係
    const playerPflops = (player.pflops || 0);
    const totalRivalPflops = rivals.reduce((sum, r) => sum + (r.pflops || 0), 0);
    const totalPflops = playerPflops + totalRivalPflops;
    
    if (totalPflops > 150) {
        delta += 0.015;  // 算力規模推升能源消耗
    }
    
    return { delta, event, totalPflops };
}

/**
 * 應用市場擾動到全球市場狀態
 * @param {Object} globalMarket - GlobalMarket 狀態（含 indices）
 * @param {Object} perturbations - 擾動值（新格式）
 * @returns {Object} 更新後的全球市場狀態
 */
function applyMarketPerturbation(globalMarket, perturbations) {
    if (!globalMarket || !globalMarket.indices) {
        // 舊格式處理（向下兼容）
        const newParams = { ...globalMarket };
        const legacyPerturbations = perturbations.legacyPerturbations || perturbations;
        
        Object.entries(legacyPerturbations).forEach(([param, delta]) => {
            if (newParams[param] !== undefined && delta !== 0) {
                newParams[param] = Math.max(0.5, Math.min(2.0,
                    Math.round((newParams[param] + delta) * 100) / 100
                ));
            }
        });
        return newParams;
    }
    
    // 新格式：更新 GlobalMarket indices
    const newMarket = JSON.parse(JSON.stringify(globalMarket));
    const config = window.GlobalMarketConfig;
    
    // 使用新格式的 perturbations
    const indexPerturbations = perturbations.perturbations || perturbations;
    
    Object.entries(indexPerturbations).forEach(([indexId, delta]) => {
        if (newMarket.indices[indexId] && delta !== 0) {
            // 擾動以百分點計算（delta 0.1 = 10 點）
            const pointDelta = delta * 100;
            let newValue = newMarket.indices[indexId].value + pointDelta;
            
            // 限制範圍
            newValue = Math.max(config.SYSTEM.min_index_value, newValue);
            newValue = Math.min(config.SYSTEM.max_index_value, newValue);
            newValue = Math.round(newValue * 10) / 10;
            
            newMarket.indices[indexId].value = newValue;
        }
    });
    
    return newMarket;
}

/**
 * 計算 ETF 價格受市場擾動的影響
 * @param {string} etfId - ETF ID
 * @param {Object} perturbations - 當前擾動（新格式，使用 GlobalMarket 索引名稱）
 * @returns {Object} ETF 價格調整資訊
 */
function calculateEtfPerturbationEffect(etfId, perturbations) {
    const etfConfig = window.ETF_CONFIG?.ETF_PRODUCTS?.[etfId];
    if (!etfConfig) return { adjustment: 0, reason: '' };
    
    const driver = etfConfig.priceDriver;  // 新格式：energy_price, gpu_price, etc.
    const legacyDriver = etfConfig.legacyDriver;  // 舊格式：E_Price, P_GPU, etc.
    
    // 優先使用新格式，回退到舊格式
    const delta = perturbations[driver] || perturbations[legacyDriver] || 0;
    
    let adjustment = 0;
    let reason = '';
    
    if (delta !== 0) {
        if (etfConfig.inverseCorrelation) {
            // 債券 ETF: 利率上升，價格下跌
            adjustment = -delta * 0.5;  // 50% 傳導率
            if (delta > 0) {
                reason = '利率上升壓力，債券價格承壓';
            } else {
                reason = '利率下降，債券價格回升';
            }
        } else {
            // 正相關 ETF
            adjustment = delta * 0.3;  // 30% 傳導率
            if (etfId === 'tech_etf') {
                if (delta > 0) {
                    reason = 'GPU 需求上升，科技股受益';
                } else {
                    reason = 'GPU 需求放緩，科技股承壓';
                }
            } else if (etfId === 'energy_etf') {
                if (delta > 0) {
                    reason = '能源需求上升，能源股上漲';
                } else {
                    reason = '能源需求下降，能源股回落';
                }
            }
        }
    }
    
    return { adjustment, reason, driver, driverDelta: delta };
}

/**
 * 獲取市場狀況摘要
 */
function getMarketStatusSummary(globalParams, perturbations) {
    const status = [];
    
    // R_base 狀態
    if (globalParams.R_base > 1.3) {
        status.push({ param: 'R_base', level: 'high', message: '利率環境偏緊，借貸成本高' });
    } else if (globalParams.R_base < 0.8) {
        status.push({ param: 'R_base', level: 'low', message: '低利率環境，有利於融資' });
    }
    
    // P_GPU 狀態
    if (globalParams.P_GPU > 1.4) {
        status.push({ param: 'P_GPU', level: 'high', message: 'GPU 供不應求，算力成本高' });
    } else if (globalParams.P_GPU < 0.7) {
        status.push({ param: 'P_GPU', level: 'low', message: 'GPU 供應充足，有利於擴張' });
    }
    
    // I_Hype 狀態
    if (globalParams.I_Hype > 1.5) {
        status.push({ param: 'I_Hype', level: 'high', message: 'AI 熱潮，市場估值偏高' });
    } else if (globalParams.I_Hype < 0.7) {
        status.push({ param: 'I_Hype', level: 'low', message: '市場冷卻，估值承壓' });
    }
    
    // E_Price 狀態
    if (globalParams.E_Price > 1.3) {
        status.push({ param: 'E_Price', level: 'high', message: '能源價格高企，營運成本上升' });
    }
    
    return status;
}

/**
 * 預設配置
 */
function getDefaultConfig() {
    return {
        maxPerturbationPerTurn: 0.1,
        debtPerturbation: {
            junkBondThreshold: 200,
            marketDebtThreshold: 0.8
        },
        gpuPerturbation: {
            largePurchaseThreshold: 30,
            industryScaleThreshold: 150
        }
    };
}

// ============================================
// 市場擾動引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    window.MarketPerturbationEngine = {
        calculateMarketPerturbation,
        calculatePlayerInfluence,
        calculateDebtPerturbation,
        calculateGpuPerturbation,
        calculateHypePerturbation,
        calculateEnergyPerturbation,
        applyMarketPerturbation,
        calculateEtfPerturbationEffect,
        getMarketStatusSummary
    };
    
    console.log('✓ Market Perturbation Engine loaded');
})();