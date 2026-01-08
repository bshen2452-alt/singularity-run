// ============================================
// 空間建設進度處理補丁 (space_construction_patch.js)
// ============================================
// 處理設施建設、擴建、技術升級施工的回合進度更新
// 應在 processTurnUpdates 中調用

(function() {
    'use strict';
    
    // ==========================================
    // 設施技術配置（整合自 facility_upgrade）
    // ==========================================
    
    var FACILITY_TECH_PATHS = {
        cooling: { id: 'cooling', category: 'space', name: '冷卻系統', icon: '❄️', maxLevel: 3 },
        modular: { id: 'modular', category: 'space', name: '模組化建造', icon: '🧱', maxLevel: 3 },
        automation: { id: 'automation', category: 'space', name: '自動化運維', icon: '🤖', maxLevel: 3 },
        storage: { id: 'storage', category: 'power', name: '儲能系統', icon: '🔋', maxLevel: 3 },
        distribution: { id: 'distribution', category: 'power', name: '配電系統', icon: '🔌', maxLevel: 3 },
        architecture: { id: 'architecture', category: 'compute', name: '運算架構', icon: '🔧', maxLevel: 3 }
    };
    
    var FACILITY_TECH_COMPATIBILITY = {
        edge_node: ['cooling', 'architecture'],
        standard_campus: ['cooling', 'modular', 'automation', 'storage', 'distribution', 'architecture'],
        hyperscale_cluster: ['cooling', 'modular', 'automation', 'storage', 'distribution', 'architecture'],
        colocation: []
    };
    
    // ==========================================
    // 設施技術狀態管理
    // ==========================================
    
    /**
     * 為設施創建初始技術狀態
     */
    function createFacilityTechState(facilityType) {
        var availablePaths = FACILITY_TECH_COMPATIBILITY[facilityType] || [];
        if (availablePaths.length === 0) return null;
        
        var levels = {};
        availablePaths.forEach(function(pathId) {
            levels[pathId] = {
                current: 0,
                available: 0,
                status: 'locked',
                construction_remaining: 0
            };
        });
        
        return { levels: levels, constructing: [] };
    }
    
    /**
     * 確保設施有技術狀態（遷移舊存檔）
     */
    function ensureFacilityTechState(facility) {
        if (!facility.tech_levels && FACILITY_TECH_COMPATIBILITY[facility.type]) {
            facility.tech_levels = createFacilityTechState(facility.type);
        }
        return facility;
    }
    
    /**
     * 研發完成時同步到設施
     */
    function syncResearchToFacility(facility, productId) {
        if (!facility.tech_levels) return facility;
        
        var match = productId.match(/^(\w+)_lv(\d+)$/);
        if (!match) return facility;
        
        var pathId = match[1];
        var level = parseInt(match[2], 10);
        
        var pathData = facility.tech_levels.levels[pathId];
        if (!pathData) return facility;
        
        if (level > pathData.available) {
            pathData.available = level;
            if (pathData.current < level && pathData.status !== 'constructing') {
                pathData.status = 'available';
            }
        }
        
        return facility;
    }
    
    // ==========================================
    // 設施技術施工
    // ==========================================
    
    /**
     * 檢查是否可開始設施技術施工
     */
    function canStartTechConstruction(playerState, facilityId, pathId) {
        var spaceState = playerState.space_state;
        if (!spaceState) return { canStart: false, reason: '空間系統未初始化' };
        
        var facility = null;
        var facilities = spaceState.facilities || [];
        for (var i = 0; i < facilities.length; i++) {
            if (facilities[i].id === facilityId) {
                facility = facilities[i];
                break;
            }
        }
        
        if (!facility) return { canStart: false, reason: '找不到指定設施' };
        if (!facility.tech_levels) return { canStart: false, reason: '此設施不支援技術升級' };
        
        var pathData = facility.tech_levels.levels[pathId];
        if (!pathData) return { canStart: false, reason: '此設施不支援該技術路線' };
        
        if (pathData.status === 'locked' || pathData.available <= pathData.current) {
            return { canStart: false, reason: '技術尚未研發完成' };
        }
        
        if (pathData.status === 'constructing') {
            return { canStart: false, reason: '該技術正在施工中' };
        }
        
        var constructing = facility.tech_levels.constructing || [];
        if (constructing.length >= 2) {
            return { canStart: false, reason: '此設施同時施工已達上限(2)' };
        }
        
        // 從 facility_upgrade_products_config 獲取成本
        var targetLevel = pathData.current + 1;
        var productId = pathId + '_lv' + targetLevel;
        var upgradeConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        var product = upgradeConfig ? upgradeConfig.getUpgradeProduct(productId) : null;
        
        var constructionCost = product ? product.development.construction_cost : 30;
        var constructionTurns = product ? product.development.construction_turns : 1;
        
        if (playerState.cash < constructionCost) {
            return { 
                canStart: false, 
                reason: '資金不足',
                cost: constructionCost,
                turns: constructionTurns
            };
        }
        
        return {
            canStart: true,
            cost: constructionCost,
            turns: constructionTurns,
            targetLevel: targetLevel,
            productId: productId
        };
    }
    
    /**
     * 開始設施技術施工
     */
    function startTechConstruction(playerState, facilityId, pathId) {
        var check = canStartTechConstruction(playerState, facilityId, pathId);
        if (!check.canStart) {
            return { success: false, message: check.reason };
        }
        
        var newState = JSON.parse(JSON.stringify(playerState));
        newState.cash -= check.cost;
        
        var facilities = newState.space_state.facilities;
        for (var i = 0; i < facilities.length; i++) {
            if (facilities[i].id === facilityId) {
                var techLevels = facilities[i].tech_levels;
                techLevels.levels[pathId].status = 'constructing';
                techLevels.levels[pathId].construction_remaining = check.turns;
                
                techLevels.constructing.push({
                    pathId: pathId,
                    targetLevel: check.targetLevel,
                    remaining: check.turns,
                    total: check.turns
                });
                break;
            }
        }
        
        var pathConfig = FACILITY_TECH_PATHS[pathId] || {};
        return {
            success: true,
            newState: newState,
            message: '🔧 開始施工：' + (pathConfig.name || pathId) + ' Lv.' + check.targetLevel
        };
    }
    
    /**
     * 計算設施施工期間的容量損失
     */
    function calculateTechConstructionPenalty(facility) {
        if (!facility.tech_levels || !facility.tech_levels.constructing) return 0;
        
        var count = facility.tech_levels.constructing.length;
        if (count === 0) return 0;
        
        return Math.min(0.15 + (count - 1) * 0.10, 0.50);
    }
    
    /**
     * 獲取設施技術摘要（供UI使用）
     */
    function getFacilityTechSummary(playerState, facilityId) {
        var spaceState = playerState.space_state;
        if (!spaceState) return null;
        
        var facility = null;
        var facilities = spaceState.facilities || [];
        for (var i = 0; i < facilities.length; i++) {
            if (facilities[i].id === facilityId) {
                facility = facilities[i];
                break;
            }
        }
        
        if (!facility) return { compatible: false };
        
        facility = ensureFacilityTechState(facility);
        if (!facility.tech_levels) return { compatible: false };
        
        var summary = {
            compatible: true,
            facilityId: facilityId,
            paths: [],
            constructingCount: facility.tech_levels.constructing ? facility.tech_levels.constructing.length : 0,
            constructionPenalty: calculateTechConstructionPenalty(facility)
        };
        
        Object.keys(facility.tech_levels.levels).forEach(function(pathId) {
            var pathData = facility.tech_levels.levels[pathId];
            var pathConfig = FACILITY_TECH_PATHS[pathId] || {};
            var check = canStartTechConstruction(playerState, facilityId, pathId);
            
            summary.paths.push({
                id: pathId,
                name: pathConfig.name || pathId,
                icon: pathConfig.icon || '🔧',
                category: pathConfig.category || 'other',
                currentLevel: pathData.current,
                availableLevel: pathData.available,
                maxLevel: pathConfig.maxLevel || 3,
                status: pathData.status,
                constructionRemaining: pathData.construction_remaining,
                canUpgrade: check.canStart,
                upgradeReason: check.reason,
                upgradeCost: check.cost,
                upgradeTurns: check.turns
            });
        });
        
        return summary;
    }
    
    // ==========================================
    // 回合處理：空間建設進度
    // ==========================================
    
    /**
     * 處理空間建設進度更新（含擴建、新建、技術施工）
     */
    function processSpaceConstruction(playerState) {
        console.log("🔄 processSpaceConstruction 開始執行");
        if (!playerState.space_state) {
            console.log("❌ 沒有 space_state");
            return { player: playerState, messages: [] };
        }
        
        var messages = [];
        var newPlayer = JSON.parse(JSON.stringify(playerState));
        var spaceState = newPlayer.space_state;
        var underConstruction = spaceState.under_construction || [];
        var facilities = spaceState.facilities || [];
        
        console.log("📊 under_construction 數量:", underConstruction.length, underConstruction.map(function(p) { return p.id + '(' + p.construction_remaining + ')'; }));
        
        // === 處理設施技術施工進度 ===
        facilities.forEach(function(facility) {
            if (!facility.tech_levels || !facility.tech_levels.constructing) return;
            
            var stillConstructing = [];
            
            facility.tech_levels.constructing.forEach(function(project) {
                project.remaining--;
                facility.tech_levels.levels[project.pathId].construction_remaining = project.remaining;
                
                if (project.remaining <= 0) {
                    // 施工完成
                    facility.tech_levels.levels[project.pathId].current = project.targetLevel;
                    facility.tech_levels.levels[project.pathId].status = 'completed';
                    facility.tech_levels.levels[project.pathId].construction_remaining = 0;
                    
                    var pathConfig = FACILITY_TECH_PATHS[project.pathId] || {};
                    messages.push({
                        text: '✓ ' + facility.name + ' 完成技術升級：' + 
                              (pathConfig.name || project.pathId) + ' Lv.' + project.targetLevel,
                        type: 'success'
                    });
                } else {
                    stillConstructing.push(project);
                }
            });
            
            facility.tech_levels.constructing = stillConstructing;
        });
        
        // === 處理擴建/新建進度 ===
        if (underConstruction.length === 0) {
            newPlayer.space_state = spaceState;
            return { player: newPlayer, messages: messages };
        }
        
        var completedProjects = [];
        var remainingProjects = [];
        
        for (var i = 0; i < underConstruction.length; i++) {
            var project = Object.assign({}, underConstruction[i]);
            project.construction_remaining = (project.construction_remaining || 1) - 1;
            
            if (project.construction_remaining <= 0) {
                completedProjects.push(project);
                
                if (project.type === 'expansion') {
                    console.log("🏗️ 處理擴建完成:", project.target_facility_id);
                    var targetIndex = -1;
                    for (var j = 0; j < facilities.length; j++) {
                        if (facilities[j].id === project.target_facility_id) {
                            targetIndex = j;
                            break;
                        }
                    }
                    
                    if (targetIndex >= 0) {
                        var oldCapacity = facilities[targetIndex].capacity || 0;
                        facilities[targetIndex] = Object.assign({}, facilities[targetIndex], {
                            capacity: oldCapacity + (project.capacity_add || 0)
                        });
                        console.log("✅ 擴建完成! 容量:", oldCapacity, "->", facilities[targetIndex].capacity);
                        
                        messages.push({
                            text: '🏗️ ' + (facilities[targetIndex].name || '設施') + ' 擴建完成！新增 ' + project.capacity_add + ' Units 容量',
                            type: 'success'
                        });
                    }
                } else {
                    var facilityType = project.facility_type || project.type;
                    var config = window.SpaceConfig || {};
                    var spaceTypes = config.SPACE_TYPES || {};
                    var typeConfig = spaceTypes[facilityType] || {};

                    var newFacility = {
                        id: project.id.replace('build_', 'facility_'),
                        type: project.facility_type,
                        name: project.name || typeConfig.name || '新設施',
                        capacity: project.capacity || typeConfig.default_capacity || 60,
                        power_contract: project.power_contract || 'grid_default',
                        status: 'completed',
                        construction_remaining: 0,
                        expansions: 0,
                        base_cost: project.cost || typeConfig.base_cost || 0,
                        built_turn: newPlayer.turn_count || 0,
                        tech_levels: createFacilityTechState(project.facility_type)
                    };
                    
                    facilities.push(newFacility);
                    
                    messages.push({
                        text: '🏢 ' + newFacility.name + ' 建設完成！新增 ' + newFacility.capacity + ' Units 容量',
                        type: 'success'
                    });
                }
            } else {
                remainingProjects.push(project);
            }
        }
        
        spaceState.under_construction = remainingProjects;
        spaceState.facilities = facilities;
        
        // 更新緩存
        if (window.SpaceEngine && window.SpaceEngine.getCapacityStatus) {
            var capacityStatus = window.SpaceEngine.getCapacityStatus(newPlayer);
            spaceState.cache = spaceState.cache || {};
            spaceState.cache.total_capacity = capacityStatus.total;
            spaceState.cache.used_capacity = capacityStatus.used;
            spaceState.cache.capacity_ratio = capacityStatus.ratio;
        }
        
        newPlayer.space_state = spaceState;
        
        return {
            player: newPlayer,
            messages: messages,
            completedProjects: completedProjects
        };
    }
    
    /**
     * 計算設施維護成本
     */
    function calculateMaintenanceCost(playerState) {
        if (!playerState.space_state || !playerState.space_state.facilities) {
            return 0;
        }
        
        var config = window.SpaceConfig || {};
        var spaceTypes = config.SPACE_TYPES || {};
        var facilities = playerState.space_state.facilities;
        var totalCost = 0;
        
        for (var i = 0; i < facilities.length; i++) {
            var facility = facilities[i];
            if (facility.status !== 'completed') continue;
            
            var typeConfig = spaceTypes[facility.type] || {};
            var maintenanceRatio = typeConfig.maintenance_cost_ratio || 0.015;
            var baseCost = facility.base_cost || typeConfig.base_cost || 0;
            
            totalCost += baseCost * maintenanceRatio;
        }
        
        return totalCost;
    }
    
    /**
     * 計算託管服務租金
     */
    function calculateColocationRent(playerState) {
        if (!playerState.space_state || !playerState.space_state.colocation_rentals) {
            return 0;
        }
        
        var config = window.SpaceConfig || {};
        var colocationConfig = (config.SPACE_TYPES || {}).colocation || {};
        var rentalConfig = colocationConfig.rental || {};
        var baseRate = rentalConfig.base_rate_per_unit || 0.5;
        
        var rentals = playerState.space_state.colocation_rentals;
        var totalRent = 0;
        
        for (var i = 0; i < rentals.length; i++) {
            totalRent += (rentals[i].capacity || 0) * baseRate;
        }
        
        return totalRent;
    }
    
    /**
     * 同步已完成研發到所有設施
     */
    function syncCompletedResearchToFacilities(playerState) {
        var upgradeConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        if (!upgradeConfig) return playerState;
        
        var facilityState = playerState.facility_upgrade_state;
        if (!facilityState || !facilityState.upgrade_products) return playerState;
        
        var spaceState = playerState.space_state;
        if (!spaceState || !spaceState.facilities) return playerState;
        
        var newState = JSON.parse(JSON.stringify(playerState));
        var STATUS = upgradeConfig.UPGRADE_STATUS || {};
        
        // 確保所有設施有技術狀態
        newState.space_state.facilities = newState.space_state.facilities.map(function(f) {
            return ensureFacilityTechState(f);
        });
        
        // 同步已完成的研發
        Object.keys(facilityState.upgrade_products).forEach(function(productId) {
            var productState = facilityState.upgrade_products[productId];
            if (productState.status === STATUS.COMPLETED || 
                productState.status === STATUS.OPERATING ||
                productState.status === 'research_completed') {
                newState.space_state.facilities = newState.space_state.facilities.map(function(f) {
                    return syncResearchToFacility(f, productId);
                });
            }
        });
        
        return newState;
    }
    
    // ==========================================
    // 註冊到全局
    // ==========================================
    
    window.SpaceConstructionPatch = {
        // 建設進度處理
        processSpaceConstruction: processSpaceConstruction,
        calculateMaintenanceCost: calculateMaintenanceCost,
        calculateColocationRent: calculateColocationRent,
        
        // 設施技術功能
        createFacilityTechState: createFacilityTechState,
        ensureFacilityTechState: ensureFacilityTechState,
        canStartTechConstruction: canStartTechConstruction,
        startTechConstruction: startTechConstruction,
        calculateTechConstructionPenalty: calculateTechConstructionPenalty,
        getFacilityTechSummary: getFacilityTechSummary,
        syncCompletedResearchToFacilities: syncCompletedResearchToFacilities,
        
        // 配置
        FACILITY_TECH_PATHS: FACILITY_TECH_PATHS,
        FACILITY_TECH_COMPATIBILITY: FACILITY_TECH_COMPATIBILITY
    };
    
    // 整合到 SpaceEngine
    if (window.SpaceEngine) {
        window.SpaceEngine.processConstruction = processSpaceConstruction;
        window.SpaceEngine.calculateMaintenanceCost = calculateMaintenanceCost;
        window.SpaceEngine.calculateColocationRent = calculateColocationRent;
        
        // 設施技術功能
        window.SpaceEngine.createFacilityTechState = createFacilityTechState;
        window.SpaceEngine.startFacilityTechConstruction = startTechConstruction;
        window.SpaceEngine.canStartFacilityTechConstruction = canStartTechConstruction;
        window.SpaceEngine.getFacilityTechSummary = getFacilityTechSummary;
        window.SpaceEngine.calculateTechConstructionPenalty = calculateTechConstructionPenalty;
        window.SpaceEngine.FACILITY_TECH_PATHS = FACILITY_TECH_PATHS;
        window.SpaceEngine.FACILITY_TECH_COMPATIBILITY = FACILITY_TECH_COMPATIBILITY;
    }
    
    console.log('✓ Space Construction Patch 已載入（含設施技術施工）');
    
})();