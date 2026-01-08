// ============================================
// 空間引擎設施技術擴展 (space_facility_tech_ext.js)
// ============================================
// 擴展 SpaceEngine，添加設施技術等級功能
// 載入順序：在 space_engine.js 之後
// ============================================

(function() {
    'use strict';
    
    // 等待 SpaceEngine 載入
    function waitForSpaceEngine(callback) {
        if (window.SpaceEngine) {
            callback();
        } else {
            setTimeout(function() { waitForSpaceEngine(callback); }, 50);
        }
    }
    
    waitForSpaceEngine(function() {
        var SpaceEngine = window.SpaceEngine;
        
        // ==========================================
        // 設施技術路線配置
        // ==========================================
        
        var FACILITY_TECH_PATHS = {
            // 空間技術
            cooling: { id: 'cooling', category: 'space', name: '冷卻系統', icon: '❄️', maxLevel: 3 },
            modular: { id: 'modular', category: 'space', name: '模組化建造', icon: '🧱', maxLevel: 3 },
            automation: { id: 'automation', category: 'space', name: '自動化運維', icon: '🤖', maxLevel: 3 },
            
            // 電力技術
            storage: { id: 'storage', category: 'power', name: '儲能系統', icon: '🔋', maxLevel: 3 },
            distribution: { id: 'distribution', category: 'power', name: '配電系統', icon: '🔌', maxLevel: 3 },
            
            // 算力技術
            architecture: { id: 'architecture', category: 'compute', name: '運算架構', icon: '🔧', maxLevel: 3 }
        };
        
        // 設施類型與可用技術路線的對應
        var FACILITY_TECH_COMPATIBILITY = {
            edge_node: ['cooling', 'architecture'],
            standard_campus: ['cooling', 'modular', 'automation', 'storage', 'distribution', 'architecture'],
            hyperscale_cluster: ['cooling', 'modular', 'automation', 'storage', 'distribution', 'architecture'],
            colocation: []  // 託管設施不支援技術升級
        };
        
        // ==========================================
        // 創建設施技術狀態
        // ==========================================
        
        /**
         * 為設施創建初始技術狀態
         * @param {string} facilityType - 設施類型
         * @returns {Object} - tech_levels 結構
         */
        SpaceEngine.createFacilityTechState = function(facilityType) {
            var availablePaths = FACILITY_TECH_COMPATIBILITY[facilityType] || [];
            
            if (availablePaths.length === 0) {
                return null;  // 不支援技術升級
            }
            
            var levels = {};
            availablePaths.forEach(function(pathId) {
                levels[pathId] = {
                    current: 0,           // 當前等級
                    available: 0,         // 可升級到的等級（研發完成後更新）
                    status: 'locked',     // locked/available/constructing/completed
                    construction_remaining: 0
                };
            });
            
            return {
                levels: levels,
                constructing: []  // 施工中的項目列表
            };
        };
        
        // ==========================================
        // 設施技術施工
        // ==========================================
        
        /**
         * 檢查設施是否可開始技術施工
         * @param {Object} playerState - 玩家狀態
         * @param {string} facilityId - 設施ID
         * @param {string} pathId - 技術路線ID
         * @returns {Object} - { canStart, reason, cost, turns }
         */
        SpaceEngine.canStartFacilityTechConstruction = function(playerState, facilityId, pathId) {
            var spaceState = playerState.space_state;
            if (!spaceState) {
                return { canStart: false, reason: '空間系統未初始化' };
            }
            
            // 找到設施
            var facility = null;
            var facilities = spaceState.facilities || [];
            for (var i = 0; i < facilities.length; i++) {
                if (facilities[i].id === facilityId) {
                    facility = facilities[i];
                    break;
                }
            }
            
            if (!facility) {
                return { canStart: false, reason: '找不到指定設施' };
            }
            
            // 確保設施有技術狀態
            if (!facility.tech_levels) {
                return { canStart: false, reason: '此設施不支援技術升級' };
            }
            
            var pathData = facility.tech_levels.levels[pathId];
            if (!pathData) {
                return { canStart: false, reason: '此設施不支援該技術路線' };
            }
            
            // 檢查狀態
            if (pathData.status === 'locked' || pathData.available <= pathData.current) {
                return { canStart: false, reason: '技術尚未研發，請先完成研究' };
            }
            
            if (pathData.status === 'constructing') {
                return { canStart: false, reason: '該技術正在施工中' };
            }
            
            // 檢查並行施工限制（每設施最多2項同時施工）
            var constructing = facility.tech_levels.constructing || [];
            if (constructing.length >= 2) {
                return { canStart: false, reason: '此設施同時施工項目已達上限(2)' };
            }
            
            // 從 facility_upgrade_products_config 獲取施工成本
            var targetLevel = pathData.current + 1;
            var productId = pathId + '_lv' + targetLevel;
            var upgradeConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            var product = upgradeConfig ? upgradeConfig.getUpgradeProduct(productId) : null;
            
            var constructionCost = product ? product.development.construction_cost : 30;
            var constructionTurns = product ? product.development.construction_turns : 1;
            
            if (playerState.cash < constructionCost) {
                return { 
                    canStart: false, 
                    reason: '資金不足，需要 $' + constructionCost + 'M',
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
        };
        
        /**
         * 開始設施技術施工
         * @param {Object} playerState - 玩家狀態
         * @param {string} facilityId - 設施ID
         * @param {string} pathId - 技術路線ID
         * @returns {Object} - { success, newState, message }
         */
        SpaceEngine.startFacilityTechConstruction = function(playerState, facilityId, pathId) {
            var check = this.canStartFacilityTechConstruction(playerState, facilityId, pathId);
            if (!check.canStart) {
                return { success: false, message: check.reason };
            }
            
            var newState = JSON.parse(JSON.stringify(playerState));
            newState.cash -= check.cost;
            
            // 找到設施並更新
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
                message: '🔧 開始施工：' + (pathConfig.name || pathId) + ' Lv.' + check.targetLevel + 
                         '（預計 ' + check.turns + ' 季完成）'
            };
        };
        
        // ==========================================
        // 回合處理：設施技術施工進度
        // ==========================================
        
        /**
         * 處理所有設施的技術施工進度
         * @param {Object} playerState - 玩家狀態
         * @returns {Object} - { newState, completedUpgrades, messages }
         */
        SpaceEngine.processFacilityTechConstruction = function(playerState) {
            var spaceState = playerState.space_state;
            if (!spaceState || !spaceState.facilities) {
                return { newState: playerState, completedUpgrades: [], messages: [] };
            }
            
            var newState = JSON.parse(JSON.stringify(playerState));
            var completedUpgrades = [];
            var messages = [];
            
            newState.space_state.facilities.forEach(function(facility) {
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
                        completedUpgrades.push({
                            facilityId: facility.id,
                            facilityName: facility.name,
                            pathId: project.pathId,
                            pathName: pathConfig.name || project.pathId,
                            level: project.targetLevel
                        });
                        
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
            
            return {
                newState: newState,
                completedUpgrades: completedUpgrades,
                messages: messages
            };
        };
        
        // ==========================================
        // 研發完成同步（由 facility_upgrade_engine 調用）
        // ==========================================
        
        /**
         * 當技術研發完成時，更新所有相容設施的可升級狀態
         * @param {Object} playerState - 玩家狀態
         * @param {string} productId - 完成的研發產品ID（如 cooling_lv1）
         * @returns {Object} - 更新後的玩家狀態
         */
        SpaceEngine.syncResearchToFacilities = function(playerState, productId) {
            var spaceState = playerState.space_state;
            if (!spaceState || !spaceState.facilities) {
                return playerState;
            }
            
            // 解析 productId（如 cooling_lv1 -> pathId: cooling, level: 1）
            var match = productId.match(/^(\w+)_lv(\d+)$/);
            if (!match) return playerState;
            
            var pathId = match[1];
            var level = parseInt(match[2], 10);
            
            var newState = JSON.parse(JSON.stringify(playerState));
            
            newState.space_state.facilities.forEach(function(facility) {
                if (!facility.tech_levels || !facility.tech_levels.levels[pathId]) return;
                
                var pathData = facility.tech_levels.levels[pathId];
                
                // 只有當研發等級高於當前可用等級時才更新
                if (level > pathData.available) {
                    pathData.available = level;
                    
                    // 如果當前等級低於可用等級且未在施工中，標記為可施工
                    if (pathData.current < level && pathData.status !== 'constructing') {
                        pathData.status = 'available';
                    }
                }
            });
            
            return newState;
        };
        
        // ==========================================
        // 計算設施技術效果
        // ==========================================
        
        /**
         * 計算單個設施的技術效果
         * @param {Object} facility - 設施數據
         * @returns {Object} - 合併後的效果
         */
        SpaceEngine.calculateFacilityTechEffects = function(facility) {
            if (!facility.tech_levels || !facility.tech_levels.levels) {
                return {};
            }
            
            var effects = {};
            var upgradeConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!upgradeConfig) return effects;
            
            Object.keys(facility.tech_levels.levels).forEach(function(pathId) {
                var pathData = facility.tech_levels.levels[pathId];
                if (pathData.current <= 0) return;
                
                var productId = pathId + '_lv' + pathData.current;
                var product = upgradeConfig.getUpgradeProduct(productId);
                if (!product || !product.completion_effects) return;
                
                var benefits = product.completion_effects.benefits || {};
                Object.keys(benefits).forEach(function(key) {
                    var value = benefits[key];
                    if (typeof value === 'number') {
                        if (key.endsWith('_mult')) {
                            effects[key] = (effects[key] || 1) * value;
                        } else {
                            effects[key] = (effects[key] || 0) + value;
                        }
                    }
                });
            });
            
            return effects;
        };
        
        /**
         * 計算設施施工中的容量損失
         * @param {Object} facility - 設施數據
         * @returns {number} - 容量損失百分比 (0-1)
         */
        SpaceEngine.calculateFacilityConstructionPenalty = function(facility) {
            if (!facility.tech_levels || !facility.tech_levels.constructing) {
                return 0;
            }
            
            var constructingCount = facility.tech_levels.constructing.length;
            if (constructingCount === 0) return 0;
            
            // 基礎損失15%，每多一項+10%
            return Math.min(0.15 + (constructingCount - 1) * 0.10, 0.50);
        };
        
        // ==========================================
        // UI 輔助函數
        // ==========================================
        
        /**
         * 獲取設施技術摘要（供UI顯示）
         * @param {Object} playerState - 玩家狀態
         * @param {string} facilityId - 設施ID
         * @returns {Object} - UI友好的技術狀態摘要
         */
        SpaceEngine.getFacilityTechSummary = function(playerState, facilityId) {
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
            
            if (!facility || !facility.tech_levels) {
                return { compatible: false };
            }
            
            var summary = {
                compatible: true,
                facilityId: facilityId,
                facilityName: facility.name,
                paths: [],
                constructingCount: facility.tech_levels.constructing ? facility.tech_levels.constructing.length : 0,
                constructionPenalty: this.calculateFacilityConstructionPenalty(facility)
            };
            
            var self = this;
            Object.keys(facility.tech_levels.levels).forEach(function(pathId) {
                var pathData = facility.tech_levels.levels[pathId];
                var pathConfig = FACILITY_TECH_PATHS[pathId] || {};
                var check = self.canStartFacilityTechConstruction(playerState, facilityId, pathId);
                
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
        };
        
        // 導出配置供 UI 使用
        SpaceEngine.FACILITY_TECH_PATHS = FACILITY_TECH_PATHS;
        SpaceEngine.FACILITY_TECH_COMPATIBILITY = FACILITY_TECH_COMPATIBILITY;
        
        console.log('✓ Space Engine Facility Tech Extension loaded');
    });
    
})();
