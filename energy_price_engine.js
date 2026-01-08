// ============================================
// 能源價格引擎（合約模式 - Tier2/3 階段式設計）
// ============================================
// Tier2: 單一合約模式
// Tier3: 空間分區合約模式（選配）

/**
 * 獲取當前季節
 */
function getCurrentSeason(turnCount) {
    const config = window.ENERGY_CONFIG;
    if (!config) return { id: 'spring', demand_multiplier: 1.0, source_performance: {} };

    const seasonCycle = config.SEASON_CYCLE || ['spring', 'summer', 'autumn', 'winter'];
    const seasonId = seasonCycle[turnCount % 4];
    const seasonData = config.SEASONAL_DEMAND[seasonId];

    return {
        id: seasonId,
        name: seasonData?.name || seasonId,
        demand_multiplier: seasonData?.demand_multiplier || 1.0,
        source_performance: seasonData?.source_performance || {},
        description: seasonData?.description || ''
    };
}

/**
 * 計算合約的實際電費（考慮季節影響）
 * @param {Object} contract - 合約配置
 * @param {Object} season - 當前季節
 * @param {number} usagePflops - 實際算力使用量
 * @returns {Object} { cost, capacity_used, capacity_total }
 */
function calculateContractCost(contract, season, usagePflops = 0) {
    if (!contract) return { cost: 0, capacity_used: 0, capacity_total: 9999 };
    
    // 基礎成本係數
    const baseCost = contract.base_cost_multiplier || 1.0;
    
    // 計算季節影響
    const composition = contract.composition || {};
    const seasonPerformance = season.source_performance || {};
    
    let weightedPerformance = 0;
    Object.keys(composition).forEach(source => {
        const weight = composition[source] || 0;
        const performance = seasonPerformance[source] || 1.0;
        weightedPerformance += weight * performance;
    });
    
    // 季節影響係數
    const volatility = contract.seasonal_volatility || 0.1;
    const seasonalImpact = (weightedPerformance - 1.0) * volatility + 1.0;
    
    // 最終成本 = 基礎成本 / 季節影響（性能好時成本低）
    const costMultiplier = baseCost / seasonalImpact;
    
    // 計算實際電費（按使用量計費，但不超過合約容量）
    const actualUsage = Math.min(usagePflops, contract.capacity || 9999);
    const cost = actualUsage * (contract.price_per_pflops || 1.0) * costMultiplier;
    
    return {
        cost: Math.max(0, cost),
        capacity_used: actualUsage,
        capacity_total: contract.capacity || 9999,
        cost_multiplier: costMultiplier
    };
}

/**
 * 計算玩家當前的總電費（Tier2: 單一合約模式）
 * @param {Object} player - 玩家狀態
 * @param {Object} globalMarket - 全球市場狀態（優先）或舊版globalParams
 * @param {number} turnCount - 當前回合數
 * @returns {Object} 電費詳情
 */
function calculateEnergyPrice(player, globalMarket = {}, turnCount = 0, regionId = null) {
    const config = window.ENERGY_CONFIG;
    if (!config) return { final_price: 1.0 };
    
    // 獲取季節資訊
    const season = getCurrentSeason(turnCount);
    
    // 獲取玩家當前合約
    const contractId = player.energy_settings?.power_contract || 
                       config.DEFAULT_SETTINGS.power_contract;
    const contract = config.POWER_CONTRACTS[contractId];
    
    if (!contract) {
        return { 
            final_price: 1.0,
            error: '找不到電力合約配置'
        };
    }
    
    // 計算總算力使用量
    const totalPflops = (player.pflops || 0) + (player.cloud_pflops || 0);
    
    // 計算合約成本
    const contractCost = calculateContractCost(contract, season, totalPflops);
    
    // 從 GlobalMarket 獲取能源價格指數
    let eventImpact = 1.0;
    
    if (globalMarket && globalMarket.indices) {
        // 新格式：從 GlobalMarket indices 讀取
        const energyIndex = globalMarket.indices.energy_price?.value;
        if (energyIndex !== undefined) {
            eventImpact = energyIndex / 100;  // 標準化：100 = 1.0
        }
    } else if (globalMarket && globalMarket.E_Price !== undefined) {
        // 舊格式：直接讀取 globalParams.E_Price
        eventImpact = globalMarket.E_Price;
    }
    
    // Tier4: 區域能源成本修正
    let regionModifier = 1.0;
    let regionInfo = null;
    
    if (regionId && player.mp_tier >= 4 && window.RegionConfig) {
        const region = window.RegionConfig.getRegion(regionId);
        if (region && region.characteristics) {
            regionModifier = region.characteristics.energy_cost_mult || 1.0;
            regionInfo = {
                id: regionId,
                name: region.name,
                energy_cost_mult: regionModifier
            };
        }
    }
    
    // 最終電費 = 合約成本 × 季節需求 × 事件影響 × 區域修正
    const finalCost = contractCost.cost * season.demand_multiplier * eventImpact * regionModifier;
    
    // 計算標準化的 E_Price（用於其他系統如 ETF）
    const normalizedPrice = (finalCost / Math.max(1, totalPflops)) || 1.0;
    
    return {
        final_price: Math.round(normalizedPrice * 100) / 100,
        total_cost: Math.round(finalCost * 100) / 100,
        
        contract_info: {
            id: contractId,
            name: contract.display_name || contract.name,
            price_per_pflops: contract.price_per_pflops,
            capacity_used: contractCost.capacity_used,
            capacity_total: contractCost.capacity_total,
            remaining_capacity: contractCost.capacity_total - contractCost.capacity_used
        },
        
        season_info: {
            name: season.name,
            demand_multiplier: season.demand_multiplier,
            description: season.description
        },
        
        region_info: regionInfo,
        
        breakdown: {
            base_cost: contractCost.cost,
            season_demand: season.demand_multiplier,
            event_impact: eventImpact,
            region_modifier: regionModifier,
            cost_multiplier: contractCost.cost_multiplier
        }
    };
}

/**
 * 計算多空間的電費（Tier3: 空間分區合約模式）
 * @param {Object} player - 玩家狀態
 * @param {Object} globalParams - 全球參數
 * @param {number} turnCount - 當前回合數
 * @returns {Object} 分區電費詳情
 */
function calculateSpacePowerCosts(player, globalParams = {}, turnCount = 0) {
    const config = window.ENERGY_CONFIG;
    if (!config) return { total_cost: 0, spaces: [] };
    
    const season = getCurrentSeason(turnCount);
    const eventImpact = globalParams.E_Price || 1.0;
    
    // 獲取玩家的空間列表（假設在 player.spaces）
    const spaces = player.spaces || [];
    
    // 如果沒有空間資料，使用單一合約模式
    if (spaces.length === 0) {
        const singleResult = calculateEnergyPrice(player, globalParams, turnCount);
        return {
            total_cost: singleResult.total_cost,
            mode: 'single_contract',
            contract: singleResult.contract_info,
            spaces: []
        };
    }
    
    // 計算每個空間的電費
    const spaceCosts = spaces.map(space => {
        // 獲取該空間的合約（如果沒有則使用預設合約）
        const spaceContractId = space.power_contract || 
                               player.energy_settings?.power_contract ||
                               config.DEFAULT_SETTINGS.power_contract;
        
        const contract = config.POWER_CONTRACTS[spaceContractId];
        const spacePflops = space.pflops || 0;
        
        const contractCost = calculateContractCost(contract, season, spacePflops);
        const finalCost = contractCost.cost * season.demand_multiplier * eventImpact;
        
        return {
            space_id: space.id,
            space_name: space.name,
            contract_id: spaceContractId,
            contract_name: contract?.display_name || contract?.name,
            pflops: spacePflops,
            cost: Math.round(finalCost * 100) / 100,
            capacity_used: contractCost.capacity_used,
            capacity_total: contractCost.capacity_total
        };
    });
    
    // 總電費
    const totalCost = spaceCosts.reduce((sum, s) => sum + s.cost, 0);
    
    // 合約分組統計
    const contractGroups = {};
    spaceCosts.forEach(s => {
        if (!contractGroups[s.contract_id]) {
            contractGroups[s.contract_id] = {
                contract_name: s.contract_name,
                spaces: [],
                total_cost: 0,
                total_pflops: 0
            };
        }
        contractGroups[s.contract_id].spaces.push(s.space_name);
        contractGroups[s.contract_id].total_cost += s.cost;
        contractGroups[s.contract_id].total_pflops += s.pflops;
    });
    
    return {
        total_cost: Math.round(totalCost * 100) / 100,
        mode: 'multi_contract',
        spaces: spaceCosts,
        contract_groups: contractGroups,
        season: season.name
    };
}

/**
 * 取得能源價格摘要（供 UI 顯示）
 */
function getEnergyPriceSummary(player, globalParams = {}, turnCount = 0) {
    const config = window.ENERGY_CONFIG;
    
    // 檢查是否為多空間模式
    if (player.spaces && player.spaces.length > 0) {
        const multiResult = calculateSpacePowerCosts(player, globalParams, turnCount);
        return {
            mode: 'multi',
            total_cost: multiResult.total_cost,
            contract_groups: multiResult.contract_groups,
            season: multiResult.season
        };
    }
    
    // 單一合約模式
    const result = calculateEnergyPrice(player, globalParams, turnCount);
    return {
        mode: 'single',
        total_cost: result.total_cost,
        current_price: result.final_price,
        contract: result.contract_info,
        season: result.season_info.name
    };
}

/**
 * 初始化玩家的能源設定
 */
function initializeEnergySettings(player) {
    const config = window.ENERGY_CONFIG;
    if (!config) return player;

    const newPlayer = { ...player };
    
    if (!newPlayer.energy_settings) {
        newPlayer.energy_settings = {
            base_electricity: config.DEFAULT_SETTINGS.base_electricity,
            power_contract: config.DEFAULT_SETTINGS.power_contract,
            contract_start_turn: player.turn_count || 0,
            contract_remaining: 0  // 市電無期限
        };
    }

    return newPlayer;
}

/**
 * 取得可用的電力合約選項（根據 Tier 篩選）
 */
function getAvailablePowerContracts(tier = 1) {
    const config = window.ENERGY_CONFIG;
    if (!config || !config.POWER_CONTRACTS) return [];

    const contracts = config.POWER_CONTRACTS;
    return Object.keys(contracts)
        .filter(key => contracts[key].unlock_tier <= tier)
        .map(key => ({
            id: key,
            ...contracts[key]
        }));
}

/**
 * 切換電力合約（Tier2 功能）
 */
function switchPowerContract(player, contractId, spaceId = null) {
    const config = window.ENERGY_CONFIG;
    if (!config || !config.POWER_CONTRACTS) {
        return { success: false, message: '能源系統未初始化' };
    }

    const contract = config.POWER_CONTRACTS[contractId];
    if (!contract) {
        return { success: false, message: '無效的電力合約' };
    }

    // 檢查解鎖條件
    const currentTier = player.tier || 1;
    if (contract.unlock_tier > currentTier) {
        return { success: false, message: `需要達到 Tier ${contract.unlock_tier}` };
    }

    // 檢查特殊需求
    if (contract.requires_license && !player.nuclear_license) {
        return { success: false, message: '需要核能許可證' };
    }

    // 檢查簽約金
    const cost = contract.upfront_cost || 0;
    if (player.cash < cost) {
        return { success: false, message: `現金不足，需要 $${cost}M` };
    }

    // 檢查提前解約費用（如果有現有合約）
    let penaltyCost = 0;
    if (player.energy_settings?.contract_remaining > 0) {
        const currentContract = config.POWER_CONTRACTS[player.energy_settings.power_contract];
        if (currentContract && currentContract.contract_term > 0) {
            // 假設提前解約需支付剩餘期數 50% 的違約金
            penaltyCost = (player.energy_settings.contract_remaining || 0) * 
                         (currentContract.price_per_pflops || 1.0) * 
                         (player.pflops || 0) * 0.5;
        }
    }

    const totalCost = cost + penaltyCost;
    if (player.cash < totalCost) {
        return { 
            success: false, 
            message: `需支付簽約金 $${cost}M + 違約金 $${penaltyCost.toFixed(1)}M = $${totalCost.toFixed(1)}M` 
        };
    }

    // 執行切換
    const newPlayer = { ...player };
    newPlayer.cash -= totalCost;
    
    if (!newPlayer.energy_settings) {
        newPlayer.energy_settings = {};
    }
    
    // 如果是切換特定空間的合約（Tier3 功能）
    if (spaceId && newPlayer.spaces) {
        const space = newPlayer.spaces.find(s => s.id === spaceId);
        if (space) {
            space.power_contract = contractId;
        }
    } else {
        // 單一合約模式（Tier2）
        newPlayer.energy_settings.power_contract = contractId;
        newPlayer.energy_settings.contract_start_turn = player.turn_count || 0;
        newPlayer.energy_settings.contract_remaining = contract.contract_term || 0;
    }

    let message = `已切換至${contract.display_name || contract.name}`;
    if (penaltyCost > 0) {
        message += `，已支付違約金 $${penaltyCost.toFixed(1)}M`;
    }

    return {
        success: true,
        player: newPlayer,
        message: message,
        cost: totalCost
    };
}

/**
 * 回合更新：處理合約期限倒數
 */
function updateContractTerm(player) {
    if (!player.energy_settings || !player.energy_settings.contract_remaining) {
        return player;
    }
    
    const newPlayer = { ...player };
    newPlayer.energy_settings.contract_remaining = Math.max(0, 
        (newPlayer.energy_settings.contract_remaining || 0) - 1
    );
    
    // 如果合約到期，自動切換回市電
    if (newPlayer.energy_settings.contract_remaining === 0) {
        const config = window.ENERGY_CONFIG;
        newPlayer.energy_settings.power_contract = config?.DEFAULT_SETTINGS?.power_contract || 'grid_default';
    }
    
    return newPlayer;
}

// ============================================
// 能源價格引擎自我註冊
// ============================================

(function () {
    'use strict';

    window.EnergyPriceEngine = {
        calculateEnergyPrice,
        calculateSpacePowerCosts,
        getEnergyPriceSummary,
        getCurrentSeason,
        initializeEnergySettings,
        getAvailablePowerContracts,
        switchPowerContract,
        updateContractTerm
    };

    if (window.GameEngine) {
        window.GameEngine.calculateEnergyPrice = calculateEnergyPrice;
        window.GameEngine.calculateSpacePowerCosts = calculateSpacePowerCosts;
        window.GameEngine.getEnergyPriceSummary = getEnergyPriceSummary;
        window.GameEngine.initializeEnergySettings = initializeEnergySettings;
        window.GameEngine.getAvailablePowerContracts = getAvailablePowerContracts;
        window.GameEngine.switchPowerContract = switchPowerContract;
        window.GameEngine.updateContractTerm = updateContractTerm;
    }

    console.log("✓ Energy Price Engine (合約模式 - Tier2/3 階段式) loaded");
})();