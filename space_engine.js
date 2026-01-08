// ============================================
// 空間系統引擎 (Space Engine)
// ============================================
// Tier2 解鎖後啟用
// 純函數式設計，僅接收數據參數/返回計算結果

(function() {
    'use strict';
    
    var SpaceEngine = {};
    
    // ==========================================
    // 輔助函數
    // ==========================================
    
    function getConfig() {
        return window.SpaceConfig || {};
    }
    
    function getEnergyConfig() {
        return window.ENERGY_CONFIG || {};
    }
    
    // ==========================================
    // 初始化空間狀態（進入Tier2時調用）
    // ==========================================
    
    /**
     * 初始化玩家的空間狀態
     * @param {Object} playerState - 當前玩家狀態
     * @returns {Object} - 包含 space_state 的更新狀態
     */
    SpaceEngine.initializeSpaceState = function(playerState) {
        var config = getConfig();
        var initial = config.TIER2_INITIAL_SPACE || {};
        
        var spaceState = {
            // 已建成的空間列表
            facilities: [
                {
                    id: 'initial_campus',
                    type: initial.type || 'standard_campus',
                    name: initial.name || '總部園區',
                    capacity: initial.capacity || 60,
                    power_contract: initial.power_contract || 'grid_default',
                    status: 'completed',
                    construction_remaining: 0,
                    expansions: 0
                }
            ],
            
            // 建設中的空間列表
            under_construction: [],
            
            // 租賃中的託管服務
            colocation_rentals: [],
            
            // 快取的計算結果（每回合更新）
            cache: {
                total_capacity: initial.capacity || 60,
                used_capacity: 0,
                capacity_ratio: 0,
                required_juniors: 0,
                actual_juniors: 0,
                workforce_ratio: 1.0,
                power_stability: 1.0
            }
        };
        
        return Object.assign({}, playerState, { space_state: spaceState });
    };
    
    // ==========================================
    // 容量計算
    // ==========================================
    
    /**
     * 計算玩家當前使用的容量
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { total, breakdown }
     */
    SpaceEngine.calculateUsedCapacity = function(playerState) {
        var config = getConfig();
        var units = config.CAPACITY_UNITS || {};
        
        var pflopsPerUnit = units.pflops_per_unit || 1;
        var dataPerUnit = units.data_per_unit || 100;
        var employeesPerUnit = units.employees_per_unit || 10;
        
        // 算力佔用
        var totalPflops = (playerState.pflops || 0) + (playerState.cloud_pflops || 0);
        var computeUnits = totalPflops / pflopsPerUnit;
        
        // 數據佔用（高質量 + 低質量）
        var totalData = (playerState.high_data || 0) + (playerState.low_data || 0);
        var dataUnits = totalData / dataPerUnit;
        
        // 員工佔用
        var talent = playerState.talent || {};
        var totalEmployees = (talent.turing || 0) + (talent.senior || 0) + (talent.junior || 0);
        var employeeUnits = totalEmployees / employeesPerUnit;
        
        var total = computeUnits + dataUnits + employeeUnits;
        
        return {
            total: total,
            breakdown: {
                compute: computeUnits,
                data: dataUnits,
                employees: employeeUnits
            }
        };
    };
    
    /**
     * 計算總可用容量
     * @param {Object} spaceState - 空間狀態
     * @returns {number} - 總容量
     */
    SpaceEngine.calculateTotalCapacity = function(spaceState) {
        if (!spaceState) return 0;
        
        var total = 0;
        
        // 已建成設施
        var facilities = spaceState.facilities || [];
        for (var i = 0; i < facilities.length; i++) {
            if (facilities[i].status === 'completed') {
                total += facilities[i].capacity || 0;
            }
        }
        
        // 租賃空間
        var rentals = spaceState.colocation_rentals || [];
        for (var j = 0; j < rentals.length; j++) {
            total += rentals[j].capacity || 0;
        }
        
        return total;
    };
    
    /**
     * 計算容量使用率
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { ratio, used, total, status }
     */
    SpaceEngine.getCapacityStatus = function(playerState) {
        var spaceState = playerState.space_state;
        if (!spaceState) {
            return { ratio: 0, used: 0, total: 0, status: 'unavailable' };
        }
        
        var config = getConfig();
        var shortage = config.CAPACITY_SHORTAGE || {};
        
        var used = SpaceEngine.calculateUsedCapacity(playerState).total;
        var total = SpaceEngine.calculateTotalCapacity(spaceState);
        var ratio = total > 0 ? used / total : 0;
        
        var status = 'normal';
        if (ratio >= (shortage.overload_threshold || 1.2)) {
            status = 'overload';
        } else if (ratio >= (shortage.critical_threshold || 1.0)) {
            status = 'critical';
        } else if (ratio >= (shortage.warning_threshold || 0.8)) {
            status = 'warning';
        }
        
        return {
            ratio: ratio,
            used: used,
            total: total,
            status: status,
            percentage: Math.round(ratio * 100)
        };
    };
    
    // ==========================================
    // 營運人力計算
    // ==========================================
    
    /**
     * 計算設施所需的 Junior 員工數
     * @param {Object} spaceState - 空間狀態
     * @returns {number} - 所需 Junior 數量
     */
    SpaceEngine.calculateRequiredJuniors = function(spaceState) {
        if (!spaceState) return 0;
        
        var config = getConfig();
        var spaceTypes = config.SPACE_TYPES || {};
        var totalRequired = 0;
        
        // 已建成設施
        var facilities = spaceState.facilities || [];
        for (var i = 0; i < facilities.length; i++) {
            var facility = facilities[i];
            if (facility.status === 'completed') {
                var typeConfig = spaceTypes[facility.type] || {};
                var ratio = typeConfig.junior_per_10_capacity || 1.0;
                totalRequired += (facility.capacity / 10) * ratio;
            }
        }
        
        // 租賃空間
        var colocationConfig = spaceTypes.colocation || {};
        var colocationRatio = colocationConfig.junior_per_10_capacity || 0.3;
        var rentals = spaceState.colocation_rentals || [];
        for (var j = 0; j < rentals.length; j++) {
            totalRequired += (rentals[j].capacity / 10) * colocationRatio;
        }
        
        return Math.ceil(totalRequired);
    };
    
    /**
     * 計算營運人力狀態
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { ratio, required, actual, status }
     */
    SpaceEngine.getWorkforceStatus = function(playerState) {
        var spaceState = playerState.space_state;
        if (!spaceState) {
            return { ratio: 1, required: 0, actual: 0, status: 'unavailable' };
        }
        
        var config = getConfig();
        var shortage = config.WORKFORCE_SHORTAGE || {};
        
        var required = SpaceEngine.calculateRequiredJuniors(spaceState);
        var talent = playerState.talent || {};
        var actual = talent.junior || 0;
        var ratio = required > 0 ? actual / required : 1;
        
        var status = 'normal';
        if (ratio < (shortage.emergency_threshold || 0.3)) {
            status = 'emergency';
        } else if (ratio < (shortage.critical_threshold || 0.5)) {
            status = 'critical';
        } else if (ratio < (shortage.warning_threshold || 0.7)) {
            status = 'warning';
        }
        
        return {
            ratio: Math.min(ratio, 1),  // 上限100%
            required: required,
            actual: actual,
            status: status,
            percentage: Math.round(Math.min(ratio, 1) * 100)
        };
    };
    
    // ==========================================
    // 供電穩定性計算
    // ==========================================
    
    /**
     * 計算供電穩定性
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { stability, status, details }
     */
    SpaceEngine.getPowerStabilityStatus = function(playerState) {
        var spaceState = playerState.space_state;
        if (!spaceState) {
            return { stability: 1, status: 'unavailable', details: [] };
        }
        
        var energyConfig = getEnergyConfig();
        var contracts = energyConfig.POWER_CONTRACTS || {};
        
        var facilities = spaceState.facilities || [];
        var totalCapacity = 0;
        var weightedStability = 0;
        var details = [];
        
        for (var i = 0; i < facilities.length; i++) {
            var facility = facilities[i];
            if (facility.status !== 'completed') continue;
            
            var contractId = facility.power_contract || 'grid_default';
            var contract = contracts[contractId] || contracts.grid_default || {};
            var stability = contract.stability || 0;
            var reliability = contract.reliability || 0.95;
            
            // 穩定性 = 合約穩定性 × 可靠性
            var facilityStability = (stability + reliability) / 2;
            
            totalCapacity += facility.capacity;
            weightedStability += facility.capacity * facilityStability;
            
            details.push({
                name: facility.name,
                contract: contract.name || contractId,
                stability: facilityStability
            });
        }
        
        var avgStability = totalCapacity > 0 ? weightedStability / totalCapacity : 1;
        
        var status = 'normal';
        if (avgStability < 0.5) {
            status = 'critical';
        } else if (avgStability < 0.7) {
            status = 'warning';
        }
        
        return {
            stability: avgStability,
            status: status,
            percentage: Math.round(avgStability * 100),
            details: details
        };
    };
    
    // ==========================================
    // 風險儀表板數據生成
    // ==========================================
    
    /**
     * 獲取 Tier2 風險儀表板指標
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { facility_capacity, power_stability, operations_staff }
     */
    SpaceEngine.getTier2RiskIndicators = function(playerState) {
        // 檢查是否已進入 Tier2
        if ((playerState.mp_tier || 0) < 2) {
            return null;  // Tier2 前不顯示
        }
        
        var capacityStatus = SpaceEngine.getCapacityStatus(playerState);
        var workforceStatus = SpaceEngine.getWorkforceStatus(playerState);
        var powerStatus = SpaceEngine.getPowerStabilityStatus(playerState);
        
        return {
            facility_capacity: {
                value: capacityStatus.percentage,
                ratio: capacityStatus.ratio,
                status: capacityStatus.status,
                display: capacityStatus.used.toFixed(0) + ' / ' + capacityStatus.total.toFixed(0) + ' Units'
            },
            power_stability: {
                value: powerStatus.percentage,
                ratio: powerStatus.stability,
                status: powerStatus.status,
                display: powerStatus.percentage + '% 穩定'
            },
            operations_staff: {
                value: workforceStatus.percentage,
                ratio: workforceStatus.ratio,
                status: workforceStatus.status,
                display: workforceStatus.actual + ' / ' + workforceStatus.required + ' 人'
            }
        };
    };
    
    // ==========================================
    // 空間操作
    // ==========================================
    
    /**
     * 檢查是否可以購買資產
     * @param {Object} playerState - 玩家狀態
     * @param {number} requiredCapacity - 需要的容量
     * @returns {Object} - { canPurchase, reason }
     */
    SpaceEngine.canPurchaseAsset = function(playerState, requiredCapacity) {
        // Tier2 前不限制
        if ((playerState.mp_tier || 0) < 2) {
            return { canPurchase: true, reason: null };
        }
        
        var capacityStatus = SpaceEngine.getCapacityStatus(playerState);
        var afterRatio = (capacityStatus.used + requiredCapacity) / capacityStatus.total;
        
        var config = getConfig();
        var shortage = config.CAPACITY_SHORTAGE || {};
        
        if (afterRatio > (shortage.critical_threshold || 1.0)) {
            return {
                canPurchase: false,
                reason: '設施容量不足，無法購買新資產。請先擴建空間或租賃託管服務。'
            };
        }
        
        if (afterRatio > (shortage.warning_threshold || 0.8)) {
            return {
                canPurchase: true,
                warning: '購買後設施容量將接近上限，建議考慮擴建。'
            };
        }
        
        return { canPurchase: true, reason: null };
    };
    
    /**
     * 開始建造新空間
     * @param {Object} playerState - 玩家狀態
     * @param {string} spaceType - 空間類型
     * @param {string} name - 設施名稱
     * @param {number} capacity - 容量（可選，使用預設）
     * @param {string} powerContract - 電力合約（可選）
     * @returns {Object} - { success, newState, message }
     */
    SpaceEngine.startConstruction = function(playerState, spaceType, name, capacity, powerContract) {
        var config = getConfig();
        var typeConfig = config.SPACE_TYPES[spaceType];
        
        if (!typeConfig) {
            return { success: false, message: '無效的空間類型' };
        }
        
        // 託管服務是租賃，不是建造
        if (spaceType === 'colocation') {
            return SpaceEngine.rentColocation(playerState, capacity, name);
        }
        
        var actualCapacity = capacity || typeConfig.default_capacity;
        var cost = typeConfig.base_cost;
        
        // 檢查資金
        if ((playerState.cash || 0) < cost) {
            return { success: false, message: '資金不足，需要 $' + cost + 'M' };
        }
        
        // 建立建設項目
        var constructionId = 'construction_' + Date.now();
        var newConstruction = {
            id: constructionId,
            type: spaceType,
            name: name || typeConfig.name + ' #' + ((playerState.space_state.facilities.length || 0) + 1),
            capacity: actualCapacity,
            power_contract: powerContract || 'grid_default',
            status: 'constructing',
            construction_remaining: typeConfig.construction_turns,
            total_construction_turns: typeConfig.construction_turns,
            cost: cost,
            expansions: 0
        };
        
        // 更新狀態
        var newSpaceState = Object.assign({}, playerState.space_state);
        newSpaceState.under_construction = (newSpaceState.under_construction || []).concat([newConstruction]);
        
        var newPlayerState = Object.assign({}, playerState, {
            cash: playerState.cash - cost,
            space_state: newSpaceState
        });
        
        return {
            success: true,
            newState: newPlayerState,
            message: '開始建造 ' + newConstruction.name + '，預計 ' + typeConfig.construction_turns + ' 季完工'
        };
    };
    
    /**
     * 租賃託管空間
     * @param {Object} playerState - 玩家狀態
     * @param {number} capacity - 租賃容量
     * @param {string} name - 名稱
     * @returns {Object} - { success, newState, message }
     */
    SpaceEngine.rentColocation = function(playerState, capacity, name) {
        var config = getConfig();
        var colocationConfig = config.SPACE_TYPES.colocation;
        
        if (!colocationConfig) {
            return { success: false, message: '託管服務配置未找到' };
        }
        
        var actualCapacity = capacity || colocationConfig.default_capacity;
        
        // 計算首季租金
        var rental = colocationConfig.rental || {};
        var baseRate = rental.base_rate_per_unit || 0.5;
        var firstQuarterRent = actualCapacity * baseRate;
        
        // 檢查資金
        if ((playerState.cash || 0) < firstQuarterRent) {
            return { success: false, message: '資金不足支付首季租金 $' + firstQuarterRent.toFixed(1) + 'M' };
        }
        
        var rentalId = 'colocation_' + Date.now();
        var newRental = {
            id: rentalId,
            name: name || '託管空間 #' + ((playerState.space_state.colocation_rentals || []).length + 1),
            capacity: actualCapacity,
            base_rate: baseRate,
            start_turn: playerState.turn_count || 1
        };
        
        var newSpaceState = Object.assign({}, playerState.space_state);
        newSpaceState.colocation_rentals = (newSpaceState.colocation_rentals || []).concat([newRental]);
        
        var newPlayerState = Object.assign({}, playerState, {
            cash: playerState.cash - firstQuarterRent,
            space_state: newSpaceState
        });
        
        return {
            success: true,
            newState: newPlayerState,
            message: '已租賃 ' + actualCapacity + ' Units 託管空間，每季租金約 $' + firstQuarterRent.toFixed(1) + 'M'
        };
    };
    
    /**
     * 取消租賃
     * @param {Object} playerState - 玩家狀態
     * @param {string} rentalId - 租賃ID
     * @returns {Object} - { success, newState, message }
     */
    SpaceEngine.cancelColocation = function(playerState, rentalId) {
        var spaceState = playerState.space_state;
        if (!spaceState || !spaceState.colocation_rentals) {
            return { success: false, message: '找不到租賃記錄' };
        }
        
        var rentals = spaceState.colocation_rentals;
        var index = -1;
        for (var i = 0; i < rentals.length; i++) {
            if (rentals[i].id === rentalId) {
                index = i;
                break;
            }
        }
        
        if (index === -1) {
            return { success: false, message: '找不到指定的租賃' };
        }
        
        var cancelled = rentals[index];
        var newRentals = rentals.slice(0, index).concat(rentals.slice(index + 1));
        
        var newSpaceState = Object.assign({}, spaceState, {
            colocation_rentals: newRentals
        });
        
        var newPlayerState = Object.assign({}, playerState, {
            space_state: newSpaceState
        });
        
        return {
            success: true,
            newState: newPlayerState,
            message: '已取消租賃 ' + cancelled.name
        };
    };
    
    // ==========================================
    // 回合處理
    // ==========================================
    
    /**
     * 處理建設進度（每回合調用）
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { newState, completedFacilities, messages }
     */
    SpaceEngine.processConstructionProgress = function(playerState) {
        var spaceState = playerState.space_state;
        if (!spaceState) {
            return { newState: playerState, completedFacilities: [], messages: [] };
        }
        
        var underConstruction = spaceState.under_construction || [];
        var facilities = (spaceState.facilities || []).slice();
        var completedFacilities = [];
        var stillConstructing = [];
        var messages = [];
        
        for (var i = 0; i < underConstruction.length; i++) {
            var project = Object.assign({}, underConstruction[i]);
            project.construction_remaining -= 1;
            
            if (project.construction_remaining <= 0) {
                project.status = 'completed';
                project.construction_remaining = 0;
                
                // 檢查是否為擴建項目
                if (project.type === 'expansion' && project.target_facility_id) {
                    var targetFound = false;
                    for (var j = 0; j < facilities.length; j++) {
                        if (facilities[j].id === project.target_facility_id) {
                            facilities[j] = Object.assign({}, facilities[j], {
                                capacity: (facilities[j].capacity || 0) + (project.capacity_add || 0)
                            });
                            messages.push('🎉 ' + facilities[j].name + ' 擴建完工！容量增加 ' + (project.capacity_add || 0) + ' Units');
                            targetFound = true;
                            break;
                        }
                    }
                    if (!targetFound) {
                        messages.push('⚠️ 擴建項目完工但找不到目標設施');
                    }
                } else {
                    facilities.push(project);
                    completedFacilities.push(project);
                    messages.push('🎉 ' + project.name + ' 建設完工！新增 ' + project.capacity + ' Units 容量');
                }
            } else {
                stillConstructing.push(project);
            }
        }
        
        var newSpaceState = Object.assign({}, spaceState, {
            facilities: facilities,
            under_construction: stillConstructing
        });
        
        var newPlayerState = Object.assign({}, playerState, {
            space_state: newSpaceState
        });
        
        return {
            newState: newPlayerState,
            completedFacilities: completedFacilities,
            messages: messages
        };
    };
    
    /**
     * 計算本季託管租金
     * @param {Object} playerState - 玩家狀態
     * @param {Object} globalParams - 全局參數（含 I_Hype, E_Price）
     * @returns {Object} - { totalRent, breakdown }
     */
    SpaceEngine.calculateColocationRent = function(playerState, globalParams) {
        var spaceState = playerState.space_state;
        if (!spaceState) {
            return { totalRent: 0, breakdown: [] };
        }
        
        var config = getConfig();
        var colocationConfig = config.SPACE_TYPES.colocation || {};
        var rental = colocationConfig.rental || {};
        
        var baseRate = rental.base_rate_per_unit || 0.5;
        var hypeSensitivity = rental.hype_sensitivity || 0.3;
        var energySensitivity = rental.energy_sensitivity || 0.2;
        
        // 市場調整
        var hypeMultiplier = 1 + ((globalParams.I_Hype || 1) - 1) * hypeSensitivity;
        var energyMultiplier = 1 + ((globalParams.E_Price || 1) - 1) * energySensitivity;
        var adjustedRate = baseRate * hypeMultiplier * energyMultiplier;
        
        var rentals = spaceState.colocation_rentals || [];
        var totalRent = 0;
        var breakdown = [];
        
        for (var i = 0; i < rentals.length; i++) {
            var r = rentals[i];
            var rent = r.capacity * adjustedRate;
            totalRent += rent;
            breakdown.push({
                name: r.name,
                capacity: r.capacity,
                rent: rent
            });
        }
        
        return {
            totalRent: totalRent,
            breakdown: breakdown,
            adjustedRate: adjustedRate
        };
    };
    
    /**
     * 計算維護成本
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { totalCost, breakdown }
     */
    SpaceEngine.calculateMaintenanceCost = function(playerState) {
        var spaceState = playerState.space_state;
        if (!spaceState) {
            return { totalCost: 0, breakdown: [] };
        }
        
        var config = getConfig();
        var spaceTypes = config.SPACE_TYPES || {};
        
        var facilities = spaceState.facilities || [];
        var totalCost = 0;
        var breakdown = [];
        
        for (var i = 0; i < facilities.length; i++) {
            var facility = facilities[i];
            if (facility.status !== 'completed') continue;
            
            var typeConfig = spaceTypes[facility.type] || {};
            var maintenanceRatio = typeConfig.maintenance_cost_ratio || 0.015;
            var cost = (facility.cost || typeConfig.base_cost || 0) * maintenanceRatio;
            
            totalCost += cost;
            breakdown.push({
                name: facility.name,
                cost: cost
            });
        }
        
        return {
            totalCost: totalCost,
            breakdown: breakdown
        };
    };
    
    /**
     * 應用空間相關效果（每回合）
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { effects, messages }
     */
    SpaceEngine.applySpaceEffects = function(playerState) {
        var spaceState = playerState.space_state;
        if (!spaceState) {
            return { effects: {}, messages: [] };
        }
        
        var config = getConfig();
        var spaceTypes = config.SPACE_TYPES || {};
        
        var effects = {
            hype: 0,
            regulation: 0,
            loyalty: 0,
            entropy: 0,
            compute_efficiency: 0
        };
        var messages = [];
        
        // 收集已建成設施的效果
        var facilities = spaceState.facilities || [];
        for (var i = 0; i < facilities.length; i++) {
            var facility = facilities[i];
            if (facility.status !== 'completed') continue;
            
            var typeConfig = spaceTypes[facility.type] || {};
            var typeEffects = typeConfig.effects || {};
            
            for (var key in typeEffects) {
                if (typeof typeEffects[key] === 'number') {
                    effects[key] = (effects[key] || 0) + typeEffects[key];
                }
            }
        }
        
        // 容量不足懲罰
        var capacityStatus = SpaceEngine.getCapacityStatus(playerState);
        var shortage = config.CAPACITY_SHORTAGE || {};
        
        if (capacityStatus.status === 'overload') {
            var overloadEffects = shortage.overload_effects || {};
            effects.entropy += overloadEffects.entropy_per_turn || 5;
            effects.loyalty -= overloadEffects.loyalty_loss_per_turn || 3;
            effects.compliance_risk = (effects.compliance_risk || 0) + (overloadEffects.compliance_risk_add || 5);
            messages.push(overloadEffects.message || '💥 設施嚴重超載！');
        } else if (capacityStatus.status === 'critical') {
            var criticalEffects = shortage.critical_effects || {};
            effects.entropy += criticalEffects.entropy_per_turn || 2;
            messages.push(criticalEffects.message || '🚨 設施容量不足！');
        }
        
        // 人力不足懲罰
        var workforceStatus = SpaceEngine.getWorkforceStatus(playerState);
        var workforceShortage = config.WORKFORCE_SHORTAGE || {};
        
        if (workforceStatus.status === 'emergency') {
            messages.push((workforceShortage.emergency_effects || {}).message || '💥 營運人力極度短缺！');
        } else if (workforceStatus.status === 'critical') {
            messages.push((workforceShortage.critical_effects || {}).message || '🚨 營運人力嚴重不足！');
        } else if (workforceStatus.status === 'warning') {
            messages.push((workforceShortage.warning_effects || {}).message || '⚠️ 營運人力不足');
        }
        
        return {
            effects: effects,
            messages: messages
        };
    };
    
    /**
     * 更新空間狀態快取（每回合調用）
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - 更新後的玩家狀態
     */
    SpaceEngine.updateSpaceCache = function(playerState) {
        var spaceState = playerState.space_state;
        if (!spaceState) return playerState;
        
        var capacityStatus = SpaceEngine.getCapacityStatus(playerState);
        var workforceStatus = SpaceEngine.getWorkforceStatus(playerState);
        var powerStatus = SpaceEngine.getPowerStabilityStatus(playerState);
        
        var newCache = {
            total_capacity: capacityStatus.total,
            used_capacity: capacityStatus.used,
            capacity_ratio: capacityStatus.ratio,
            required_juniors: workforceStatus.required,
            actual_juniors: workforceStatus.actual,
            workforce_ratio: workforceStatus.ratio,
            power_stability: powerStatus.stability
        };
        
        var newSpaceState = Object.assign({}, spaceState, { cache: newCache });
        
        return Object.assign({}, playerState, { space_state: newSpaceState });
    };
    
    // ==========================================
    // 擴建功能
    // ==========================================
    
    /**
     * 擴建現有設施
     * @param {Object} playerState - 玩家狀態
     * @param {string} facilityId - 設施ID
     * @returns {Object} - { success, newState, message }
     */
    SpaceEngine.expandFacility = function(playerState, facilityId) {
        var spaceState = playerState.space_state;
        console.log("🔧 expandFacility called:", { facilityId: facilityId, hasCash: playerState.cash });
        if (!spaceState) {
            console.log("❌ 失敗: 空間狀態未初始化");
            return { success: false, message: '空間狀態未初始化' };
        }
        
        var config = getConfig();
        var facilities = spaceState.facilities || [];
        var targetIndex = -1;
        var target = null;
        
        for (var i = 0; i < facilities.length; i++) {
            if (facilities[i].id === facilityId) {
                targetIndex = i;
                target = facilities[i];
                break;
            }
        }
        
        if (!target) {
            console.log("❌ 失敗: 找不到設施", facilityId);
            return { success: false, message: '找不到指定設施' };
        }
        console.log("🎯 找到設施:", target.id, target.type, target.name);
        
        var typeConfig = config.SPACE_TYPES[target.type];
        console.log("📝 typeConfig:", !!typeConfig, typeConfig?.expandable);

        if (!typeConfig || !typeConfig.expandable) {
            console.log("❌ 失敗: 設施不支援擴建");
            return { success: false, message: '此類型設施不支援擴建' };
        }
        
        var expansion = typeConfig.expansion || {};
        console.log("📊 expansion config:", expansion, "current expansions:", target.expansions);
        if (target.expansions >= (expansion.max_expansions || 0)) {
            console.log("❌ 失敗: 已達最大擴建次數");
            return { success: false, message: '已達最大擴建次數' };
        }
        
        var cost = expansion.cost || 0;
        console.log("💰 cost check:", cost, "player cash:", playerState.cash);
        if ((playerState.cash || 0) < cost) {
            console.log("❌ 失敗: 資金不足");
            return { success: false, message: '資金不足，需要 $' + cost + 'M' };
        }

        console.log("🔨 通過所有檢查，開始建立擴建項目...");
        
        // 建立擴建項目
        var expansionProject = {
            id: 'expand_' + facilityId + '_' + Date.now(),
            type: 'expansion',
            target_facility_id: facilityId,
            capacity_add: expansion.capacity_add || 0,
            construction_remaining: expansion.construction_turns || 2,
            total_construction_turns: expansion.construction_turns || 2,
            cost: cost
        };
        
        var newSpaceState = Object.assign({}, spaceState);
        newSpaceState.under_construction = (newSpaceState.under_construction || []).concat([expansionProject]);
        
        // 更新設施擴建計數
        var newFacilities = facilities.slice();
        newFacilities[targetIndex] = Object.assign({}, target, {
            expansions: (target.expansions || 0) + 1
        });
        newSpaceState.facilities = newFacilities;
        
        var newPlayerState = Object.assign({}, playerState, {
            cash: playerState.cash - cost,
            space_state: newSpaceState
        });
        
        console.log("✅ expandFacility 完成! 返回結果");
                
        return {
            success: true,
            newState: newPlayerState,
            message: '開始擴建 ' + target.name + '，預計 ' + expansion.construction_turns + ' 季完成，將新增 ' + expansion.capacity_add + ' Units 容量'
        };
    };
    
    // ==========================================
    // 註冊到全局
    // ==========================================
    
    window.SpaceEngine = SpaceEngine;
    
    console.log('✓ Space Engine loaded');
    
})();
