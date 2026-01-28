// ============================================
// 設施升級引擎 (facility_upgrade_engine.js)
// ============================================
// 設計原則：
//   1. 純函數式設計，僅接收數據/返回結果
//   2. 只處理研發期（LOCKED → RESEARCHING → RESEARCH_COMPLETED）
//   3. 研發完成後標記為 'research_completed'，不直接修改設施狀態
//   4. 施工由 space_construction 系統負責
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
                upgrade_products: {},  // { productId: { status, research_progress, ... } }
                
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
                research_cost: dev.base_cost || 0,
                construction_cost: dev.construction_cost || 0,
                total: (dev.base_cost || 0) + (dev.construction_cost || 0),
                research_turns: dev.research_turns || 0,
                construction_turns: dev.construction_turns || 0
            };
            
            // 檢查是否已經開始或完成研發
            const facilityState = player.facility_upgrade_state || this.createInitialState();
            const currentStatus = facilityState.upgrade_products[productId];
            if (currentStatus) {
                const status = currentStatus.status;
                if (status === 'researching') {
                    return { canUnlock: false, reason: '研發進行中', cost };
                }
                if (status === 'research_completed') {
                    return { canUnlock: false, reason: '研發已完成，請前往設施施工', cost };
                }
                if (status === 'applied') {
                    return { canUnlock: false, reason: '此升級已應用', cost };
                }
            }
            
            // 檢查Tier要求
            if ((player.mp_tier || 0) < reqs.mp_tier) {
                return { canUnlock: false, reason: `需要 Tier ${reqs.mp_tier}`, cost };
            }
            
            // 檢查前置升級（只需研發完成即可，不需要施工完成）
            if (reqs.previous_upgrade) {
                const prevStatus = facilityState.upgrade_products[reqs.previous_upgrade];
                if (!prevStatus || (prevStatus.status !== 'research_completed' && 
                    prevStatus.status !== 'applied')) {
                    // 取得前置升級的名稱
                    const prevProduct = config.getUpgradeProduct(reqs.previous_upgrade);
                    const prevName = prevProduct ? prevProduct.name : reqs.previous_upgrade;
                    return { canUnlock: false, reason: `需要先完成研發：${prevName}`, cost };
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
                if (status === 'researching') {
                    return { success: false, message: '該項目研發中' };
                }
                if (status === 'research_completed') {
                    return { success: false, message: '研發已完成，請前往設施進行施工' };
                }
                if (status === 'applied') {
                    return { success: false, message: '該項目已完成，請研發下一階段' };
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
                status: 'researching',
                research_progress: 0,
                research_total: dev.research_turns,
                started_turn: player.turn_count || 0,
                progress_start_turn: (player.turn_count || 0) + 1,  // 下回合開始計算進度
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
            
            if (productState.status !== 'researching') {
                return { success: false, message: '項目非研發中狀態' };
            }
            
            // 檢查是否已到達進度開始回合（下回合才開始計算）
            const currentTurn = player.turn_count || 0;
            const progressStartTurn = productState.progress_start_turn || (productState.started_turn + 1);
            
            if (currentTurn < progressStartTurn) {
                return { 
                    success: true, 
                    newState: player, 
                    message: '研發準備中（下回合開始進度）' 
                };
            }
            
            const product = config.getUpgradeProduct(productId);
            if (!product) return { success: false, message: '產品配置不存在' };
            
            const dev = product.development;
            
            // 計算本回合加速
            let baseProgress = 1;
            let boost = 0;
            
            if (assignedSenior > 0) {
                boost += assignedSenior * (dev.senior_boost || 0);
            }
            if (assignedTuring > 0) {
                boost += assignedTuring * (dev.turing_boost || 0);
            }
            
            const progress = baseProgress + boost;
            
            // 更新狀態
            const newPlayer = JSON.parse(JSON.stringify(player));
            const newProductState = newPlayer.facility_upgrade_state.upgrade_products[productId];
            newProductState.research_progress += progress;
            newProductState.assigned_senior = assignedSenior;
            newProductState.assigned_turing = assignedTuring;
            
            // 檢查是否完成研發
            if (newProductState.research_progress >= newProductState.research_total) {
                newProductState.research_progress = newProductState.research_total;
                newProductState.status = 'research_completed';  // 標記為研發完成，等待施工
                newProductState.completed_turn = currentTurn;
                
                return {
                    success: true,
                    newState: newPlayer,
                    research_completed: true,
                    message: `🔬 ${product.name} 研發完成！可前往設施進行施工升級`,
                    product
                };
            }
            
            return {
                success: true,
                newState: newPlayer,
                message: `研發進度：${Math.floor(newProductState.research_progress)}/${newProductState.research_total}`
            };
        },
        
        // ==========================================
        // 獲取升級效果（供其他系統查詢已應用的升級）
        // ==========================================
        
        /**
         * 獲取所有已應用升級的效果（status === 'applied'）
         * 注意：這裡不包含 research_completed 狀態，因為那些還沒施工應用到設施
         */
        getAllActiveEffects(player) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return { benefits: {}, costs: {} };
            
            const facilityState = player.facility_upgrade_state;
            if (!facilityState) return { benefits: {}, costs: {} };
            
            const benefits = {};
            const costs = {};
            
            for (const [productId, state] of Object.entries(facilityState.upgrade_products)) {
                // 只計算已應用到設施的升級
                if (state.status !== 'applied') continue;
                
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
                            // _mult 類型用乘法合併，其他用加法
                            if (key.endsWith('_mult')) {
                                costs[key] = (costs[key] || 1) * value;
                            } else {
                                costs[key] = (costs[key] || 0) + value;
                            }
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
                
                // 確定正確的狀態
                let displayStatus = 'locked';
                if (state?.status) {
                    displayStatus = state.status;
                } else if (canUnlock.canUnlock) {
                    // 尚未開始但可以解鎖 -> unlocked
                    displayStatus = 'unlocked';
                }
                
                // 確保成本資訊總是可用
                const dev = product.development || {};
                const researchCost = dev.base_cost || 0;
                const constructionCost = dev.construction_cost || 0;
                const researchTurns = dev.research_turns || 0;
                const constructionTurns = dev.construction_turns || 0;
                
                summary[productId] = {
                    id: productId,
                    name: product.name,
                    icon: product.icon,
                    description: product.description,
                    upgrade_path: product.upgrade_path,
                    
                    // 狀態
                    status: displayStatus,
                    research_progress: state?.research_progress || 0,
                    research_total: researchTurns,
                    
                    // 成本 - 確保總是有數值
                    research_cost: researchCost,
                    construction_cost: constructionCost,
                    construction_turns: constructionTurns,
                    total_cost: researchCost + constructionCost,
                    
                    // 解鎖 - 根據狀態決定是否可以開始研發
                    canUnlock: displayStatus === 'unlocked' || (displayStatus === 'locked' && canUnlock.canUnlock),
                    unlockReason: canUnlock.reason,
                    
                    // 效果預覽
                    benefits: product.completion_effects?.benefits,
                    costs: product.completion_effects?.costs,
                    
                    // 部門
                    unlocks_department: product.completion_effects?.unlocks_department,
                    department_benefits: product.department_benefits,
                    
                    // 施工影響
                    construction_impact: product.construction_impact,
                    
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
         * 獲取進行中的項目（僅研發中）
         */
        getActiveProjects(player) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return [];
            
            const facilityState = player.facility_upgrade_state;
            if (!facilityState) return [];
            
            const active = [];
            
            for (const [productId, state] of Object.entries(facilityState.upgrade_products)) {
                if (state.status === 'researching') {
                    const product = config.getUpgradeProduct(productId);
                    active.push({
                        productId,
                        name: product?.name || productId,
                        icon: product?.icon || '🔧',
                        status: state.status,
                        research_progress: state.research_progress,
                        research_total: state.research_total,
                        isResearching: true
                    });
                }
            }
            
            return active;
        },
        
        /**
         * 獲取已完成研發但未施工的項目
         */
        getCompletedResearch(player) {
            const config = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
            if (!config) return [];
            
            const facilityState = player.facility_upgrade_state;
            if (!facilityState) return [];
            
            const completed = [];
            
            for (const [productId, state] of Object.entries(facilityState.upgrade_products)) {
                if (state.status === 'research_completed') {
                    const product = config.getUpgradeProduct(productId);
                    completed.push({
                        productId,
                        name: product?.name || productId,
                        icon: product?.icon || '🔧',
                        upgrade_path: product?.upgrade_path,
                        construction_cost: product?.development.construction_cost || 0,
                        construction_turns: product?.development.construction_turns || 0,
                        completed_turn: state.completed_turn
                    });
                }
            }
            
            return completed;
        },
        
        /**
         * 標記技術為已應用（由施工系統調用）
         */
        markAsApplied(player, productId) {
            const facilityState = player.facility_upgrade_state;
            if (!facilityState || !facilityState.upgrade_products[productId]) {
                return player;
            }
            
            const newPlayer = JSON.parse(JSON.stringify(player));
            newPlayer.facility_upgrade_state.upgrade_products[productId].status = 'applied';
            
            return newPlayer;
        }
    };
    
    // ==========================================
    // 全局暴露
    // ==========================================
    window.FacilityUpgradeEngine = FacilityUpgradeEngine;
    
    console.log('✓ Facility Upgrade Engine loaded (Research Only)');
    
})();