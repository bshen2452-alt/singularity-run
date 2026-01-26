// ============================================
// 空間建設進度處理補丁 (space_construction_patch.js)
// ============================================
// 處理設施建設、擴建、技術升級施工的回合進度更新
// 應在 processTurnUpdates 中調用

(function() {
    'use strict';
    
    // ==========================================
    // 獲取設施技術配置（從 facility_upgrade 系統）
    // ==========================================
    
    /**
     * 獲取技術路徑配置（從 facility_upgrade_products_config）
     */
    function getTechPathConfig(pathId) {
        var upgradeConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        if (!upgradeConfig) return null;
        
        // 從產品配置中推導技術路徑資訊
        var allProducts = Object.assign({},
            upgradeConfig.SPACE_UPGRADE_PRODUCTS || {},
            upgradeConfig.POWER_UPGRADE_PRODUCTS || {},
            upgradeConfig.COMPUTE_UPGRADE_PRODUCTS || {}
        );
        
        // 找到該路徑的第一個產品以獲取基本資訊
        for (var productId in allProducts) {
            var product = allProducts[productId];
            if (product.upgrade_path && product.upgrade_path.path === pathId) {
                return {
                    id: pathId,
                    category: product.upgrade_path.type,
                    name: product.name.replace(/Lv\.\d+.*$/, '').trim(),
                    icon: product.icon,
                    maxLevel: 3  // 預設最高等級
                };
            }
        }
        return null;
    }
    
    /**
     * 獲取設施類型支援的技術路徑
     */
    function getFacilityTechCompatibility(facilityType) {
        // 根據設施類型返回支援的技術路徑
        var compatibility = {
            edge_node: ['cooling', 'architecture'],
            standard_campus: ['cooling', 'modular', 'automation', 'storage', 'distribution', 'architecture'],
            hyperscale_cluster: ['cooling', 'modular', 'automation', 'storage', 'distribution', 'architecture'],
            colocation: []
        };
        return compatibility[facilityType] || [];
    }
    
    // ==========================================
    // 設施技術狀態管理
    // ==========================================
    
    /**
     * 為設施創建初始技術狀態
     */
    function createFacilityTechState(facilityType) {
        var availablePaths = getFacilityTechCompatibility(facilityType);
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
        var availablePaths = getFacilityTechCompatibility(facility.type);
        if (!facility.tech_levels && availablePaths.length > 0) {
            facility.tech_levels = createFacilityTechState(facility.type);
        }
        return facility;
    }
    
    /**
     * 從 facility_upgrade_state 同步已完成研發到設施的 available 狀態
     * 注意：僅更新 available，不更新 current（由施工完成時更新）
     */
    function syncResearchToFacility(facility, playerState) {
        if (!facility.tech_levels) return facility;
        if (!playerState.facility_upgrade_state) return facility;
        
        var upgradeConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        if (!upgradeConfig) return facility;
        
        var STATUS = upgradeConfig.UPGRADE_STATUS || {};
        var upgradeProducts = playerState.facility_upgrade_state.upgrade_products || {};
        
        // 遍歷所有已完成研發的產品
        for (var productId in upgradeProducts) {
            var productState = upgradeProducts[productId];
            
            // 只處理研發已完成的產品（包括 research_completed, COMPLETED, OPERATING）
            if (productState.status !== 'research_completed' &&
                productState.status !== STATUS.COMPLETED && 
                productState.status !== STATUS.OPERATING) {
                continue;
            }
            
            // 解析產品 ID 獲取技術路徑和等級
            var match = productId.match(/^(\w+)_lv(\d+)$/);
            if (!match) continue;
            
            var pathId = match[1];
            var level = parseInt(match[2], 10);
            
            var pathData = facility.tech_levels.levels[pathId];
            if (!pathData) continue;
            
            // 更新 available（可施工等級），但不更新 current（實際應用等級）
            if (level > pathData.available) {
                pathData.available = level;
                // 只在沒有施工中且 current 低於 available 時標記為 available
                if (pathData.current < level && pathData.status !== 'constructing') {
                    pathData.status = 'available';
                }
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
        
        var pathConfig = getTechPathConfig(pathId);
        var pathName = pathConfig ? pathConfig.name : pathId;
        
        return {
            success: true,
            newState: newState,
            message: '🔧 開始施工：' + pathName + ' Lv.' + check.targetLevel
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
            var pathConfig = getTechPathConfig(pathId) || { name: pathId, icon: '🔧' };
            var check = canStartTechConstruction(playerState, facilityId, pathId);
            
            summary.paths.push({
                id: pathId,
                name: pathConfig.name,
                icon: pathConfig.icon,
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
                    // 施工完成：更新 current 等級
                    facility.tech_levels.levels[project.pathId].current = project.targetLevel;
                    facility.tech_levels.levels[project.pathId].status = 'completed';
                    facility.tech_levels.levels[project.pathId].construction_remaining = 0;
                    
                    var pathConfig = getTechPathConfig(project.pathId);
                    var pathName = pathConfig ? pathConfig.name : project.pathId;
                    
                    messages.push({
                        text: '✓ ' + facility.name + ' 完成技術升級：' + 
                              pathName + ' Lv.' + project.targetLevel,
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
     * 同步已完成研發到所有設施的 available 狀態
     * 注意：僅更新 available，不更新 current（由施工完成時更新）
     */
    function syncCompletedResearchToFacilities(playerState) {
        var upgradeConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        if (!upgradeConfig) return playerState;
        
        var facilityState = playerState.facility_upgrade_state;
        if (!facilityState || !facilityState.upgrade_products) return playerState;
        
        var spaceState = playerState.space_state;
        if (!spaceState || !spaceState.facilities) return playerState;
        
        var newState = JSON.parse(JSON.stringify(playerState));
        
        // 確保所有設施有技術狀態
        newState.space_state.facilities = newState.space_state.facilities.map(function(f) {
            return ensureFacilityTechState(f);
        });
        
        // 同步已完成的研發到所有設施
        newState.space_state.facilities = newState.space_state.facilities.map(function(f) {
            return syncResearchToFacility(f, newState);
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
        
        // 配置獲取函數
        getTechPathConfig: getTechPathConfig,
        getFacilityTechCompatibility: getFacilityTechCompatibility
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
        window.SpaceEngine.getTechPathConfig = getTechPathConfig;
        window.SpaceEngine.getFacilityTechCompatibility = getFacilityTechCompatibility;
    }
    
    console.log('✓ Space Construction Patch 已載入（含設施技術施工）');
    
})();