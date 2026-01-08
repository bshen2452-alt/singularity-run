// ============================================
// 設施升級引擎 (facility_upgrade_engine.js)
// ============================================
// 設計原則：
//   1. 純函數式設計，僅接收數據/返回結果
//   2. 處理研發期、施工期、完成邏輯
//   3. 計算施工期間的產能損失
//   4. 與產品系統整合接口
// ============================================

(function() {
    'use strict';

    const FacilityUpgradeEngine = {
        
        // ==========================================
        // 初始化
        // ==========================================
        
        createInitialState() {
            return {
                // 升級產品狀態
                upgrade_products: {},  // { productId: { status, research_progress, construction_progress, ... } }
                
                // 施工中的項目（影響產能）
                active_constructions: [],  // [{ productId, type, remaining_turns, impact }]
                
                // 已完成的升級（效果生效中）
                completed_upgrades: {},  // { type: { path: level } }
                
                // 解鎖的部門
                unlocked_departments: []
            };
        },
        
        // ==========================================
        // 解鎖檢查
        // ==========================================
        
        /**
         * 檢查升級產品是否可解鎖
         * 返回：{ canUnlock, reason, product, cost }
         */
        canUnlockUpgrade(player, productId) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return { canUnlock: false, reason: '配置未載入' };
            
            const product = config.getUpgradeProduct(productId);
            if (!product) return { canUnlock: false, reason: '升級項目不存在' };
            
            const reqs = product.unlock_requirements;
            const dev = product.development;
            
            // 組裝成本資訊（供UI顯示）
            const cost = {
                cash: dev.base_cost || 0,
                construction_cost: dev.construction_cost || 0,
                total: (dev.base_cost || 0) + (dev.construction_cost || 0),
                research_turns: dev.research_turns || 0,
                construction_turns: dev.construction_turns || 0
            };
            
            // 檢查Tier要求
            if ((player.mp_tier || 0) < reqs.mp_tier) {
                return { canUnlock: false, reason: `需要 Tier ${reqs.mp_tier}`, cost };
            }
            
            // 檢查前置升級
            if (reqs.previous_upgrade) {
                const facilityState = player.facility_upgrade_state || this.createInitialState();
                const prevStatus = facilityState.upgrade_products[reqs.previous_upgrade];
                if (!prevStatus || prevStatus.status !== config.UPGRADE_STATUS.COMPLETED && 
                    prevStatus.status !== config.UPGRADE_STATUS.OPERATING) {
                    return { canUnlock: false, reason: `需要先完成 ${reqs.previous_upgrade}`, cost };
                }
            }
            
            // 檢查現金
            if (reqs.cash_minimum && player.cash < reqs.cash_minimum) {
                return { canUnlock: false, reason: `現金不足 $${reqs.cash_minimum}M`, cost };
            }
            
            // 檢查Turing
            if (reqs.turing_required) {
                const turingCount = player.talent?.turing || 0;
                if (turingCount < reqs.turing_required) {
                    return { canUnlock: false, reason: `需要 ${reqs.turing_required} 位 Turing 人才`, cost };
                }
            }
            
            return { canUnlock: true, product, cost };
        },
        
        // ==========================================
        // 開始研發
        // ==========================================
        
        /**
         * 開始研發升級項目
         */
        startResearch(player, productId) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return { success: false, message: '配置未載入' };
            
            // 先檢查該產品是否已在進行中或已完成
            const facilityState = player.facility_upgrade_state || this.createInitialState();
            const currentStatus = facilityState.upgrade_products[productId];
            if (currentStatus) {
                const status = currentStatus.status;
                if (status === config.UPGRADE_STATUS.RESEARCHING) {
                    return { success: false, message: '該項目研發中' };
                }
                if (status === config.UPGRADE_STATUS.CONSTRUCTING) {
                    return { success: false, message: '該項目施工中' };
                }
                if (status === config.UPGRADE_STATUS.COMPLETED || status === config.UPGRADE_STATUS.OPERATING) {
                    return { success: false, message: '該項目已完成，請研發下一階段' };
                }
                if (status === 'research_completed') {
                    return { success: false, message: '研發已完成，等待施工資金' };
                }
            }
            
            const checkResult = this.canUnlockUpgrade(player, productId);
            if (!checkResult.canUnlock) {
                return { success: false, message: checkResult.reason };
            }
            
            const product = checkResult.product;
            const dev = product.development;
            
            // 扣除研發成本
            const newPlayer = JSON.parse(JSON.stringify(player));
            if (dev.base_cost > newPlayer.cash) {
                return { success: false, message: `研發成本不足 $${dev.base_cost}M` };
            }
            newPlayer.cash -= dev.base_cost;
            
            // 初始化設施升級狀態
            if (!newPlayer.facility_upgrade_state) {
                newPlayer.facility_upgrade_state = this.createInitialState();
            }
            
            // 設置研發狀態
            newPlayer.facility_upgrade_state.upgrade_products[productId] = {
                status: config.UPGRADE_STATUS.RESEARCHING,
                research_progress: 0,
                research_total: dev.research_turns,
                construction_progress: 0,
                construction_total: dev.construction_turns,
                started_turn: player.turn_count || 0,
                assigned_senior: 0,
                assigned_turing: 0
            };
            
            return {
                success: true,
                newState: newPlayer,
                message: `開始研發：${product.name}（預計 ${dev.research_turns} 季）`,
                product
            };
        },
        
        // ==========================================
        // 每回合處理研發進度
        // ==========================================
        
        /**
         * 處理研發進度（每回合調用）
         */
        processResearchProgress(player, productId, assignedSenior = 0, assignedTuring = 0) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return { success: false, message: '配置未載入' };
            
            const facilityState = player.facility_upgrade_state;
            if (!facilityState) return { success: false, message: '無升級狀態' };
            
            const productState = facilityState.upgrade_products[productId];
            if (!productState) return { success: false, message: '項目不存在' };
            
            if (productState.status !== config.UPGRADE_STATUS.RESEARCHING) {
                return { success: false, message: '項目非研發中狀態' };
            }
            
            const product = config.getUpgradeProduct(productId);
            const dev = product.development;
            
            // 計算加速
            let speedBoost = 1.0;
            if (assignedTuring > 0 && dev.turing_boost) {
                speedBoost += dev.turing_boost * assignedTuring;
            }
            if (assignedSenior > 0 && dev.senior_boost) {
                speedBoost += dev.senior_boost * Math.min(assignedSenior, 3);  // 最多3人加速
            }
            
            const newPlayer = JSON.parse(JSON.stringify(player));
            const newProductState = newPlayer.facility_upgrade_state.upgrade_products[productId];
            
            // 更新進度
            newProductState.research_progress += speedBoost;
            newProductState.assigned_senior = assignedSenior;
            newProductState.assigned_turing = assignedTuring;
            
            // 檢查是否研發完成
            if (newProductState.research_progress >= newProductState.research_total) {
                // 進入施工階段
                return this.startConstruction(newPlayer, productId);
            }
            
            return {
                success: true,
                newState: newPlayer,
                message: `研發進度：${Math.floor(newProductState.research_progress)}/${newProductState.research_total}`,
                progress: newProductState.research_progress / newProductState.research_total
            };
        },
        
        // ==========================================
        // 開始施工
        // ==========================================
        
        /**
         * 開始施工階段
         */
        startConstruction(player, productId) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            const product = config.getUpgradeProduct(productId);
            const dev = product.development;
            
            // 檢查施工成本
            if (dev.construction_cost > player.cash) {
                // 施工成本不足，暫停於研發完成狀態
                const newPlayer = JSON.parse(JSON.stringify(player));
                newPlayer.facility_upgrade_state.upgrade_products[productId].status = 'research_completed';
                return {
                    success: true,
                    newState: newPlayer,
                    message: `研發完成，但施工資金不足 $${dev.construction_cost}M`,
                    awaiting_construction: true
                };
            }
            
            const newPlayer = JSON.parse(JSON.stringify(player));
            newPlayer.cash -= dev.construction_cost;
            
            const newProductState = newPlayer.facility_upgrade_state.upgrade_products[productId];
            newProductState.status = config.UPGRADE_STATUS.CONSTRUCTING;
            newProductState.construction_progress = 0;
            
            // 添加到施工中列表
            newPlayer.facility_upgrade_state.active_constructions.push({
                productId,
                type: product.upgrade_path.type,
                remaining_turns: dev.construction_turns,
                impact: product.construction_impact
            });
            
            return {
                success: true,
                newState: newPlayer,
                message: `開始施工：${product.name}（${dev.construction_turns} 季），施工期間部分產能停擺`,
                construction_started: true
            };
        },
        
        // ==========================================
        // 處理施工進度
        // ==========================================
        
        /**
         * 處理施工進度（每回合調用）
         */
        processConstructionProgress(player) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return { success: false, changes: [] };
            
            const facilityState = player.facility_upgrade_state;
            if (!facilityState || !facilityState.active_constructions.length) {
                return { success: true, changes: [], message: '無施工中項目' };
            }
            
            const newPlayer = JSON.parse(JSON.stringify(player));
            const changes = [];
            const completedIds = [];
            
            for (const construction of newPlayer.facility_upgrade_state.active_constructions) {
                construction.remaining_turns -= 1;
                
                // 更新產品狀態
                const productState = newPlayer.facility_upgrade_state.upgrade_products[construction.productId];
                if (productState) {
                    productState.construction_progress += 1;
                }
                
                if (construction.remaining_turns <= 0) {
                    // 施工完成
                    completedIds.push(construction.productId);
                    const result = this.completeUpgrade(newPlayer, construction.productId);
                    if (result.success) {
                        Object.assign(newPlayer, result.newState);
                        changes.push({
                            productId: construction.productId,
                            type: 'completed',
                            message: result.message
                        });
                    }
                }
            }
            
            // 移除已完成的施工項目
            newPlayer.facility_upgrade_state.active_constructions = 
                newPlayer.facility_upgrade_state.active_constructions.filter(
                    c => !completedIds.includes(c.productId)
                );
            
            return {
                success: true,
                newState: newPlayer,
                changes
            };
        },
        
        // ==========================================
        // 完成升級
        // ==========================================
        
        /**
         * 完成升級，應用效果
         */
        completeUpgrade(player, productId) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            const product = config.getUpgradeProduct(productId);
            if (!product) return { success: false, message: '產品不存在' };
            
            const newPlayer = JSON.parse(JSON.stringify(player));
            const productState = newPlayer.facility_upgrade_state.upgrade_products[productId];
            
            // 更新狀態
            productState.status = config.UPGRADE_STATUS.OPERATING;
            productState.completed_turn = player.turn_count || 0;
            
            // 記錄已完成的升級
            const upgradePath = product.upgrade_path;
            if (!newPlayer.facility_upgrade_state.completed_upgrades[upgradePath.type]) {
                newPlayer.facility_upgrade_state.completed_upgrades[upgradePath.type] = {};
            }
            newPlayer.facility_upgrade_state.completed_upgrades[upgradePath.type][upgradePath.path] = upgradePath.target_level;
            
            // 同步到 asset_upgrades（與舊系統兼容）
            if (!newPlayer.asset_upgrades) {
                newPlayer.asset_upgrades = window.AssetCardEngine?.createInitialUpgradeState() || {};
            }
            if (!newPlayer.asset_upgrades[upgradePath.type]) {
                newPlayer.asset_upgrades[upgradePath.type] = {};
            }
            newPlayer.asset_upgrades[upgradePath.type][upgradePath.path] = upgradePath.target_level;
            
            // 檢查是否解鎖部門
            let departmentUnlocked = null;
            if (product.completion_effects.unlocks_department) {
                const deptId = product.completion_effects.unlocks_department;
                if (!newPlayer.facility_upgrade_state.unlocked_departments.includes(deptId)) {
                    newPlayer.facility_upgrade_state.unlocked_departments.push(deptId);
                    departmentUnlocked = product.department_benefits;
                }
            }
            
            // === 同步到設施技術狀態 ===
            // 研發完成後，所有相容設施都可以進行施工升級
            const SpaceEng = window.SpaceEngine;
            if (SpaceEng && SpaceEng.syncResearchToFacilities) {
                const syncedState = SpaceEng.syncResearchToFacilities(newPlayer, productId);
                Object.assign(newPlayer, syncedState);
            }
            
            return {
                success: true,
                newState: newPlayer,
                message: `✓ ${product.name} 研發完成！現在可在設施中進行施工升級`,
                effects: product.completion_effects,
                departmentUnlocked,
                facilitiesCanUpgrade: true  // 標記設施可升級
            };
        },
        
        // ==========================================
        // 計算施工期間產能損失
        // ==========================================
        
        /**
         * 計算當前施工對產能的影響
         */
        calculateConstructionImpact(player) {
            const facilityState = player.facility_upgrade_state;
            if (!facilityState || !facilityState.active_constructions.length) {
                return {
                    capacity_loss_percent: 0,
                    power_loss_percent: 0,
                    compute_loss_percent: 0,
                    descriptions: []
                };
            }
            
            const impact = {
                capacity_loss_percent: 0,
                power_loss_percent: 0,
                compute_loss_percent: 0,
                descriptions: []
            };
            
            for (const construction of facilityState.active_constructions) {
                const impactData = construction.impact;
                if (impactData) {
                    if (impactData.capacity_loss_percent) {
                        impact.capacity_loss_percent += impactData.capacity_loss_percent;
                    }
                    if (impactData.power_loss_percent) {
                        impact.power_loss_percent += impactData.power_loss_percent;
                    }
                    if (impactData.compute_loss_percent) {
                        impact.compute_loss_percent += impactData.compute_loss_percent;
                    }
                    if (impactData.description) {
                        impact.descriptions.push(impactData.description);
                    }
                }
            }
            
            return impact;
        },
        
        /**
         * 應用施工損失到實際數值
         */
        applyConstructionPenalty(baseValue, lossPercent) {
            return baseValue * (1 - Math.min(lossPercent, 0.5));  // 最多損失50%
        },
        
        // ==========================================
        // 獲取升級效果
        // ==========================================
        
        /**
         * 獲取所有生效中升級的效果
         */
        getAllActiveEffects(player) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return { benefits: {}, costs: {} };
            
            const facilityState = player.facility_upgrade_state;
            if (!facilityState) return { benefits: {}, costs: {} };
            
            const benefits = {};
            const costs = {};
            
            for (const [productId, state] of Object.entries(facilityState.upgrade_products)) {
                if (state.status !== config.UPGRADE_STATUS.OPERATING) continue;
                
                const product = config.getUpgradeProduct(productId);
                if (!product || !product.completion_effects) continue;
                
                // 合併效果
                if (product.completion_effects.benefits) {
                    for (const [key, value] of Object.entries(product.completion_effects.benefits)) {
                        if (typeof value === 'number') {
                            benefits[key] = (benefits[key] || 1) * value;
                        } else {
                            benefits[key] = value;
                        }
                    }
                }
                
                if (product.completion_effects.costs) {
                    for (const [key, value] of Object.entries(product.completion_effects.costs)) {
                        if (typeof value === 'number') {
                            costs[key] = (costs[key] || 0) + value;
                        } else {
                            costs[key] = value;
                        }
                    }
                }
            }
            
            return { benefits, costs };
        },
        
        // ==========================================
        // 狀態查詢
        // ==========================================
        
        /**
         * 獲取升級摘要（供UI顯示）
         */
        getUpgradeSummary(player, assetType) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return {};
            
            const products = config.getUpgradesByType(assetType);
            const facilityState = player.facility_upgrade_state || this.createInitialState();
            const summary = {};
            
            for (const [productId, product] of Object.entries(products)) {
                const state = facilityState.upgrade_products[productId];
                const canUnlock = this.canUnlockUpgrade(player, productId);
                
                summary[productId] = {
                    id: productId,
                    name: product.name,
                    icon: product.icon,
                    description: product.description,
                    upgrade_path: product.upgrade_path,
                    
                    // 狀態
                    status: state?.status || config.UPGRADE_STATUS.LOCKED,
                    research_progress: state?.research_progress || 0,
                    research_total: product.development.research_turns,
                    construction_progress: state?.construction_progress || 0,
                    construction_total: product.development.construction_turns,
                    
                    // 成本
                    research_cost: product.development.base_cost,
                    construction_cost: product.development.construction_cost,
                    total_cost: product.development.base_cost + product.development.construction_cost,
                    
                    // 解鎖
                    canUnlock: canUnlock.canUnlock,
                    unlockReason: canUnlock.reason,
                    
                    // 效果預覽
                    benefits: product.completion_effects.benefits,
                    costs: product.completion_effects.costs,
                    construction_impact: product.construction_impact,
                    
                    // 部門
                    unlocks_department: product.completion_effects.unlocks_department,
                    department_benefits: product.department_benefits,
                    
                    pros: product.pros,
                    cons: product.cons
                };
            }
            
            return summary;
        },
        
        /**
         * 獲取所有類型的升級摘要
         */
        getAllUpgradeSummaries(player) {
            return {
                space: this.getUpgradeSummary(player, 'space'),
                power: this.getUpgradeSummary(player, 'power'),
                compute: this.getUpgradeSummary(player, 'compute')
            };
        },
        
        /**
         * 獲取進行中的項目
         */
        getActiveProjects(player) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return [];
            
            const facilityState = player.facility_upgrade_state;
            if (!facilityState) return [];
            
            const active = [];
            
            for (const [productId, state] of Object.entries(facilityState.upgrade_products)) {
                if (state.status === config.UPGRADE_STATUS.RESEARCHING ||
                    state.status === config.UPGRADE_STATUS.CONSTRUCTING) {
                    
                    const product = config.getUpgradeProduct(productId);
                    active.push({
                        productId,
                        name: product?.name || productId,
                        icon: product?.icon || '🔧',
                        status: state.status,
                        research_progress: state.research_progress,
                        research_total: state.research_total,
                        construction_progress: state.construction_progress,
                        construction_total: state.construction_total,
                        isResearching: state.status === config.UPGRADE_STATUS.RESEARCHING,
                        isConstructing: state.status === config.UPGRADE_STATUS.CONSTRUCTING
                    });
                }
            }
            
            return active;
        }
    };
    
    // ==========================================
    // 全局暴露
    // ==========================================
    window.FacilityUpgradeEngine = FacilityUpgradeEngine;
    
    console.log('✓ Facility Upgrade Engine loaded');
    
})();