// ============================================
// 狀態遷移引擎 - State Migration Engine
// ============================================
// 功能：提供 Phase 2 player state 結構的向後兼容層
// 策略：修改原始資料結構，但提供向後兼容的 getter/setter

const StateMigrationEngine = {
    
    // 版本號，用於判斷是否需要遷移
    CURRENT_VERSION: 2,
    
    /**
     * 檢查並遷移玩家狀態到新結構
     * @param {Object} player - 玩家狀態
     * @returns {Object} 遷移後的玩家狀態
     */
    migratePlayerState(player) {
        if (!player) return player;
        
        const stateVersion = player._state_version || 1;
        
        if (stateVersion >= this.CURRENT_VERSION) {
            return player; // 已是最新版本
        }
        
        console.log(`🔄 開始遷移玩家狀態: v${stateVersion} → v${this.CURRENT_VERSION}`);
        
        // 遷移事業線（Business Line）
        this._migrateBusinessUnits(player);
        
        // 遷移職能線（Functional Line）
        this._migrateFunctionalLine(player);
        
        // 標記版本
        player._state_version = this.CURRENT_VERSION;
        
        console.log('✓ 玩家狀態遷移完成');
        return player;
    },
    
    /**
     * 遷移事業線狀態
     * @private
     */
    _migrateBusinessUnits(player) {
        // 初始化 business_units
        if (!player.business_units) {
            player.business_units = {};
        }
        
        // 從舊的 product_state.product_lines 遷移
        const ps = player.product_state;
        if (ps?.product_lines && Object.keys(ps.product_lines).length > 0) {
            Object.entries(ps.product_lines).forEach(([lineName, lineState]) => {
                if (!player.business_units[lineName]) {
                    // 標準化 stage ID
                    let stage = lineState.stage || 'operating';
                    if (stage === 'division') stage = 'business_division';
                    if (stage === 'subsidiary') stage = 'business_subsidiary';
                    
                    player.business_units[lineName] = {
                        name: lineName,
                        experience: lineState.experience || 0,
                        stage: stage,
                        maxTier: lineState.maxTier || 1,
                        products: lineState.products || [],
                        route: lineState.route || player.route,
                        region_deployed: lineState.region_deployed || null
                    };
                }
            });
            console.log(`  - 遷移 ${Object.keys(ps.product_lines).length} 個產品線到 business_units`);
        }
    },
    
    /**
     * 遷移職能線狀態
     * @private
     */
    _migrateFunctionalLine(player) {
        // 初始化職能線欄位
        if (!player.functional_depts) {
            player.functional_depts = [];
        }
        if (!player.functional_dept_mastery) {
            player.functional_dept_mastery = {};
        }
        if (!player.functional_subsidiaries) {
            player.functional_subsidiaries = [];
        }
        
        // 從舊的 departments 遷移
        if (player.departments && player.departments.length > 0) {
            player.departments.forEach(deptId => {
                if (!player.functional_depts.includes(deptId)) {
                    player.functional_depts.push(deptId);
                }
            });
            console.log(`  - 遷移 ${player.departments.length} 個部門到 functional_depts`);
        }
        
        // 從舊的 department_mastery 遷移
        if (player.department_mastery && Object.keys(player.department_mastery).length > 0) {
            Object.entries(player.department_mastery).forEach(([deptId, mastery]) => {
                if (player.functional_dept_mastery[deptId] === undefined) {
                    player.functional_dept_mastery[deptId] = mastery;
                }
            });
            console.log(`  - 遷移 ${Object.keys(player.department_mastery).length} 個部門熟練度到 functional_dept_mastery`);
        }
        
        // 從舊的 subsidiaries 遷移
        if (player.subsidiaries && player.subsidiaries.length > 0) {
            player.subsidiaries.forEach(subId => {
                if (!player.functional_subsidiaries.includes(subId)) {
                    player.functional_subsidiaries.push(subId);
                }
            });
            console.log(`  - 遷移 ${player.subsidiaries.length} 個子公司到 functional_subsidiaries`);
        }
        
        // 同步回舊欄位（向後兼容）
        this._syncLegacyFields(player);
    },
    
    /**
     * 同步新欄位到舊欄位（向後兼容）
     * @private
     */
    _syncLegacyFields(player) {
        // 同步 functional_depts → departments
        player.departments = [...player.functional_depts];
        
        // 同步 functional_dept_mastery → department_mastery
        player.department_mastery = { ...player.functional_dept_mastery };
        
        // 同步 functional_subsidiaries → subsidiaries
        player.subsidiaries = [...player.functional_subsidiaries];
        
        // 同步 business_units → product_state.product_lines
        if (player.product_state) {
            player.product_state.product_lines = player.business_units;
        }
    },
    
    // ==========================================
    // 向後兼容的 Getter/Setter
    // ==========================================
    
    /**
     * 獲取職能部列表（統一接口）
     */
    getFunctionalDepts(player) {
        // 優先使用新欄位
        if (player.functional_depts && player.functional_depts.length > 0) {
            return player.functional_depts;
        }
        // 回退到舊欄位
        return player.departments || [];
    },
    
    /**
     * 設定職能部列表（統一接口）
     */
    setFunctionalDepts(player, depts) {
        player.functional_depts = depts;
        player.departments = depts; // 同步到舊欄位
    },
    
    /**
     * 新增職能部
     */
    addFunctionalDept(player, deptId) {
        if (!player.functional_depts) player.functional_depts = [];
        if (!player.departments) player.departments = [];
        
        if (!player.functional_depts.includes(deptId)) {
            player.functional_depts.push(deptId);
            player.departments.push(deptId);
        }
    },
    
    /**
     * 獲取職能部熟練度
     */
    getFunctionalDeptMastery(player, deptId) {
        // 優先使用新欄位
        if (player.functional_dept_mastery && player.functional_dept_mastery[deptId] !== undefined) {
            return player.functional_dept_mastery[deptId];
        }
        // 回退到舊欄位
        return player.department_mastery?.[deptId] || 0;
    },
    
    /**
     * 設定職能部熟練度
     */
    setFunctionalDeptMastery(player, deptId, value) {
        if (!player.functional_dept_mastery) player.functional_dept_mastery = {};
        if (!player.department_mastery) player.department_mastery = {};
        
        player.functional_dept_mastery[deptId] = value;
        player.department_mastery[deptId] = value; // 同步到舊欄位
    },
    
    /**
     * 增加職能部熟練度
     */
    addFunctionalDeptMastery(player, deptId, amount) {
        const current = this.getFunctionalDeptMastery(player, deptId);
        this.setFunctionalDeptMastery(player, deptId, current + amount);
        return current + amount;
    },
    
    /**
     * 獲取職能子公司列表
     */
    getFunctionalSubsidiaries(player) {
        if (player.functional_subsidiaries && player.functional_subsidiaries.length > 0) {
            return player.functional_subsidiaries;
        }
        return player.subsidiaries || [];
    },
    
    /**
     * 新增職能子公司
     */
    addFunctionalSubsidiary(player, subId) {
        if (!player.functional_subsidiaries) player.functional_subsidiaries = [];
        if (!player.subsidiaries) player.subsidiaries = [];
        
        if (!player.functional_subsidiaries.includes(subId)) {
            player.functional_subsidiaries.push(subId);
            player.subsidiaries.push(subId);
        }
    },
    
    /**
     * 獲取事業單位
     */
    getBusinessUnit(player, lineName) {
        return player.business_units?.[lineName] || null;
    },
    
    /**
     * 獲取所有事業單位
     */
    getAllBusinessUnits(player) {
        return player.business_units || {};
    },
    
    /**
     * 設定事業單位
     */
    setBusinessUnit(player, lineName, unitState) {
        if (!player.business_units) player.business_units = {};
        player.business_units[lineName] = unitState;
        
        // 同步到舊結構
        if (player.product_state) {
            if (!player.product_state.product_lines) player.product_state.product_lines = {};
            player.product_state.product_lines[lineName] = unitState;
        }
    },
    
    // ==========================================
    // 回合更新輔助函數
    // ==========================================
    
    /**
     * 處理每回合的職能部熟練度累積
     * @param {Object} player - 玩家狀態
     * @returns {Object} { masteryGained: {}, messages: [] }
     */
    processFunctionalDeptMastery(player) {
        const config = window.AssetCardConfig;
        if (!config) return { masteryGained: {}, messages: [] };
        
        const depts = this.getFunctionalDepts(player);
        const masteryGained = {};
        const messages = [];
        
        depts.forEach(deptId => {
            const deptConfig = config.FUNCTIONAL_DEPTS?.[deptId];
            if (!deptConfig) return;
            
            const gain = deptConfig.mastery_gain_per_turn || 2;
            const newMastery = this.addFunctionalDeptMastery(player, deptId, gain);
            masteryGained[deptId] = gain;
            
            // 檢查是否達到子公司解鎖門檻
            const requiredMastery = config.SYSTEM?.subsidiary_mastery_required || 100;
            if (newMastery >= requiredMastery && newMastery - gain < requiredMastery) {
                messages.push({
                    text: `🏛️ ${deptConfig.icon} ${deptConfig.name} 熟練度已達 ${requiredMastery}，可升級為子公司！`,
                    type: 'event'
                });
            }
        });
        
        return { masteryGained, messages };
    },
    
    /**
     * 處理每回合的事業單位收益計算
     * @param {Object} player - 玩家狀態
     * @returns {Object} { totalRevenue, revenueByUnit: {}, messages: [] }
     */
    processBusinessUnitRevenue(player) {
        const units = this.getAllBusinessUnits(player);
        let totalRevenue = 0;
        const revenueByUnit = {};
        const messages = [];
        
        const ProductLineUpgradeConfig = window.ProductLineUpgradeConfig;
        if (!ProductLineUpgradeConfig) return { totalRevenue, revenueByUnit, messages };
        
        Object.entries(units).forEach(([lineName, unitState]) => {
            if (unitState.stage === 'business_subsidiary') {
                // 事業子公司有基礎收益
                const stageConfig = ProductLineUpgradeConfig.UPGRADE_STAGES.BUSINESS_SUBSIDIARY;
                const revenueShare = stageConfig?.benefits?.revenueShare || 0.7;
                
                // 基礎收益（可根據產品數量和Tier調整）
                const baseRevenue = 10 * (unitState.products?.length || 1) * (unitState.maxTier || 1);
                const actualRevenue = Math.floor(baseRevenue * revenueShare);
                
                revenueByUnit[lineName] = actualRevenue;
                totalRevenue += actualRevenue;
            }
        });
        
        return { totalRevenue, revenueByUnit, messages };
    },
    
    /**
     * 處理每回合的職能子公司收益計算
     * @param {Object} player - 玩家狀態
     * @returns {Object} { totalRevenue, revenueBySubsidiary: {}, messages: [] }
     */
    processFunctionalSubsidiaryRevenue(player) {
        const config = window.AssetCardConfig;
        if (!config) return { totalRevenue: 0, revenueBySubsidiary: {}, messages: [] };
        
        const subsidiaries = this.getFunctionalSubsidiaries(player);
        let totalRevenue = 0;
        const revenueBySubsidiary = {};
        const messages = [];
        
        subsidiaries.forEach(subId => {
            const subConfig = config.FUNCTIONAL_SUBSIDIARIES?.[subId];
            if (!subConfig) return;
            
            // 找到對應的職能部
            const deptId = subConfig.from_dept;
            const deptConfig = config.FUNCTIONAL_DEPTS?.[deptId];
            if (!deptConfig) return;
            
            // 計算收益 = 基礎收益 × 收益倍率
            const baseRevenue = deptConfig.base_revenue || 5;
            const revenueMult = subConfig.revenue_mult || 2.0;
            const revenue = Math.floor(baseRevenue * revenueMult);
            
            revenueBySubsidiary[subId] = revenue;
            totalRevenue += revenue;
        });
        
        return { totalRevenue, revenueBySubsidiary, messages };
    }
};

// ============================================
// 全局暴露
// ============================================
if (typeof window !== 'undefined') {
    window.StateMigrationEngine = StateMigrationEngine;
}

console.log('✓ State Migration Engine loaded');
console.log('  - 支援 business_units (事業線)');
console.log('  - 支援 functional_depts/subsidiaries (職能線)');
