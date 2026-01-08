// ============================================
// 資產卡片系統引擎 (Asset Card Engine)
// ============================================
// 功能：處理資產升級效果查詢與部門/子公司操作
// 設計：純函數式，僅接收數據/返回結果
// 注意：升級操作已移至 FacilityUpgradeEngine
// ============================================

const AssetCardEngine = {
    
    createInitialUpgradeState() {
        return {
            space: { cooling: 0, modular: 0, automation: 0 },
            power: { storage: 0, microgrid: 0, renewable: 0 },
            compute: { architecture: 0, cluster: 0, specialization: 0 },
            talent: { productivity: 0 },
            data: { synthesis: 0, marketplace: 0, privacy: 0 }
        };
    },
    
    // ==========================================
    // 查詢函數
    // ==========================================
    
    getUpgradeLevel(player, assetType, pathId) {
        return player.asset_upgrades?.[assetType]?.[pathId] || 0;
    },
    
    // ==========================================
    // 升級檢查（委託給 FacilityUpgradeEngine）
    // ==========================================
    
    canUpgrade(player, assetType, pathId) {
        const config = window.AssetCardConfig;
        if (!config) return { canUpgrade: false, reason: '配置未載入' };
        
        // 檢查 Tier 要求
        if ((player.mp_tier || 0) < config.SYSTEM.upgrade_unlock_tier) {
            return { canUpgrade: false, reason: `需要 Tier ${config.SYSTEM.upgrade_unlock_tier} 解鎖` };
        }
        
        const currentLevel = this.getUpgradeLevel(player, assetType, pathId);
        if (currentLevel >= config.SYSTEM.max_upgrade_level) {
            return { canUpgrade: false, reason: '已達最高等級' };
        }
        
        // 檢查 FACILITY_UPGRADE 系統
        const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
        const facilityConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        
        if (FacilityUpgradeEngine && facilityConfig) {
            const productId = `${pathId}_lv${currentLevel + 1}`;
            
            // 如果新系統有此產品，使用新系統檢查
            if (facilityConfig.getUpgradeProduct(productId)) {
                const result = FacilityUpgradeEngine.canUnlockUpgrade(player, productId);
                
                // 檢查是否已在研發/施工中
                const facilityState = player.facility_upgrade_state;
                const productState = facilityState?.upgrade_products?.[productId];
                if (productState) {
                    const status = productState.status;
                    if (status === 'researching') {
                        return { 
                            canUpgrade: false, 
                            reason: '研發中', 
                            inProgress: true, 
                            status, 
                            cost: result.cost,
                            productState 
                        };
                    }
                    if (status === 'constructing') {
                        return { 
                            canUpgrade: false, 
                            reason: '施工中', 
                            inProgress: true, 
                            status, 
                            cost: result.cost,
                            productState 
                        };
                    }
                    if (status === 'operating' || status === 'completed') {
                        // 已完成此級，檢查是否有下一級
                        const nextProductId = `${pathId}_lv${currentLevel + 2}`;
                        if (facilityConfig.getUpgradeProduct(nextProductId)) {
                            // 有下一級，但 currentLevel 應該已經更新了
                            // 如果到這裡代表狀態不同步
                            return { 
                                canUpgrade: false, 
                                reason: '已完成此級', 
                                completed: true, 
                                status,
                                nextLevel: currentLevel + 2
                            };
                        }
                        return { 
                            canUpgrade: false, 
                            reason: '已達此路線最高等級', 
                            completed: true, 
                            status 
                        };
                    }
                    if (status === 'research_completed') {
                        return { 
                            canUpgrade: false, 
                            reason: '研發完成，等待施工資金', 
                            awaitingConstruction: true, 
                            status 
                        };
                    }
                }
                
                return {
                    canUpgrade: result.canUnlock,
                    reason: result.reason,
                    useNewSystem: true,
                    productId: productId,
                    cost: result.cost
                };
            }
        }
        
        // 回退到舊邏輯（用於 talent/data 等未納入新系統的類型）
        const cost = config.getUpgradeCost(assetType, pathId, currentLevel);
        if (!cost) return { canUpgrade: false, reason: '無升級資料' };
        
        const missing = {};
        if (cost.cash && player.cash < cost.cash) missing.cash = cost.cash - player.cash;
        if (cost.senior && (player.talent?.senior || 0) < cost.senior) missing.senior = cost.senior - (player.talent?.senior || 0);
        if (cost.turing && (player.talent?.turing || 0) < cost.turing) missing.turing = cost.turing - (player.talent?.turing || 0);
        
        if (Object.keys(missing).length > 0) {
            const reasons = [];
            if (missing.cash) reasons.push(`現金不足 $${missing.cash.toFixed(0)}M`);
            if (missing.senior) reasons.push(`Senior 不足 ${missing.senior} 人`);
            if (missing.turing) reasons.push(`Turing 不足 ${missing.turing} 人`);
            return { canUpgrade: false, reason: reasons.join(', '), cost, missing };
        }
        
        const conflicts = config.checkConflicts(player.asset_upgrades, assetType, pathId);
        return { canUpgrade: true, cost, conflicts, hasConflictWarning: conflicts.length > 0 };
    },
    
    performUpgrade(player, assetType, pathId) {
        const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
        const facilityConfig = window.FACILITY_UPGRADE_PRODUCTS_CONFIG;
        const currentLevel = this.getUpgradeLevel(player, assetType, pathId);
        const productId = `${pathId}_lv${currentLevel + 1}`;
        
        // 如果 FACILITY_UPGRADE 系統有此產品，使用新系統
        if (FacilityUpgradeEngine && facilityConfig && facilityConfig.getUpgradeProduct(productId)) {
            return FacilityUpgradeEngine.startResearch(player, productId);
        }
        
        // 回退到舊邏輯
        const checkResult = this.canUpgrade(player, assetType, pathId);
        if (!checkResult.canUpgrade) {
            return { success: false, message: checkResult.reason };
        }
        
        const config = window.AssetCardConfig;
        const cost = checkResult.cost;
        const newLevel = currentLevel + 1;
        
        const newPlayer = JSON.parse(JSON.stringify(player));
        if (cost.cash) newPlayer.cash -= cost.cash;
        
        if (!newPlayer.asset_upgrades) {
            newPlayer.asset_upgrades = this.createInitialUpgradeState();
        }
        newPlayer.asset_upgrades[assetType] = newPlayer.asset_upgrades[assetType] || {};
        newPlayer.asset_upgrades[assetType][pathId] = newLevel;
        
        const path = config.getUpgradePath(assetType, pathId);
        const levelConfig = path.levels.find(l => l.level === newLevel);
        const effects = config.getUpgradeEffects(assetType, pathId, newLevel);
        
        return {
            success: true,
            newState: newPlayer,
            message: `${path.name} 升級至 Lv.${newLevel}: ${levelConfig.name}`,
            effects: effects,
            newLevel: newLevel
        };
    },
    
    // ==========================================
    // 綜合效果計算
    // ==========================================
    
    getAllBenefits(player) {
        const config = window.AssetCardConfig;
        const benefits = {};
        const upgradeTypes = ['space', 'power', 'compute', 'talent', 'data'];
        
        for (const assetType of upgradeTypes) {
            const upgrades = config.getUpgrades(assetType);
            if (!upgrades) continue;
            for (const pathId of Object.keys(upgrades)) {
                const effects = this.getUpgradeEffects(player, assetType, pathId);
                if (effects.benefits) {
                    Object.assign(benefits, effects.benefits);
                }
            }
        }
        return benefits;
    },
    
    getAllCosts(player) {
        const config = window.AssetCardConfig;
        const costs = {};
        const upgradeTypes = ['space', 'power', 'compute', 'talent', 'data'];
        
        for (const assetType of upgradeTypes) {
            const upgrades = config.getUpgrades(assetType);
            if (!upgrades) continue;
            for (const pathId of Object.keys(upgrades)) {
                const effects = this.getUpgradeEffects(player, assetType, pathId);
                if (effects.costs) {
                    Object.assign(costs, effects.costs);
                }
            }
        }
        return costs;
    },
    
    // ==========================================
    // 部門操作（多技術組合判定）
    // ==========================================
    
    getActiveFunctionalDepts(player) {
        return player.functional_depts || player.departments || [];
    },
    
    canEstablishFunctionalDept(player, deptId) {
        const config = window.AssetCardConfig;
        const dept = config.FUNCTIONAL_DEPTS[deptId];
        if (!dept) return { can: false, reason: '部門不存在' };
        
        const activeDepts = this.getActiveFunctionalDepts(player);
        if (activeDepts.includes(deptId)) {
            return { can: false, reason: '部門已成立' };
        }
        
        // 使用新的多技術組合判定
        const unlockCheck = config.checkDeptUnlockCondition(player.asset_upgrades, deptId);
        if (!unlockCheck.canUnlock) {
            // 生成友好的錯誤訊息
            if (unlockCheck.missingTechs && unlockCheck.missingTechs.length > 0) {
                const missingDesc = unlockCheck.missingTechs.map(t => {
                    const upgradePath = config.getUpgradePath(t.type, t.path);
                    const pathName = upgradePath ? upgradePath.name : `${t.type}.${t.path}`;
                    return `${pathName} Lv.${t.required}（目前 Lv.${t.current}）`;
                }).join('、');
                return { can: false, reason: `需要: ${missingDesc}`, missingTechs: unlockCheck.missingTechs };
            }
            return { can: false, reason: unlockCheck.reason };
        }
        
        return { can: true, dept };
    },
    
    // 向後兼容
    canEstablishDepartment(player, departmentId) {
        return this.canEstablishFunctionalDept(player, departmentId);
    },
    
    establishFunctionalDept(player, deptId) {
        const checkResult = this.canEstablishFunctionalDept(player, deptId);
        if (!checkResult.can) {
            return { success: false, message: checkResult.reason };
        }
        
        const config = window.AssetCardConfig;
        const dept = config.FUNCTIONAL_DEPTS[deptId];
        
        const newPlayer = JSON.parse(JSON.stringify(player));
        
        if (!newPlayer.functional_depts) newPlayer.functional_depts = [];
        newPlayer.functional_depts.push(deptId);
        
        // 向後兼容
        if (!newPlayer.departments) newPlayer.departments = [];
        if (!newPlayer.departments.includes(deptId)) {
            newPlayer.departments.push(deptId);
        }
        
        if (!newPlayer.functional_dept_mastery) newPlayer.functional_dept_mastery = {};
        newPlayer.functional_dept_mastery[deptId] = 0;
        
        // 向後兼容
        if (!newPlayer.department_mastery) newPlayer.department_mastery = {};
        newPlayer.department_mastery[deptId] = 0;
        
        return {
            success: true,
            newState: newPlayer,
            message: `成立部門 ${dept.icon} ${dept.name}`,
            functionalDept: dept
        };
    },
    
    // 向後兼容
    establishDepartment(player, departmentId) {
        return this.establishFunctionalDept(player, departmentId);
    },
    
    // ==========================================
    // 子公司操作
    // ==========================================
    
    canUpgradeToFunctionalSubsidiary(player, deptId) {
        const config = window.AssetCardConfig;
        const dept = config.FUNCTIONAL_DEPTS[deptId];
        if (!dept) return { can: false, reason: '部門不存在' };
        
        const activeDepts = this.getActiveFunctionalDepts(player);
        if (!activeDepts.includes(deptId)) {
            return { can: false, reason: '部門尚未成立' };
        }
        
        const mastery = player.functional_dept_mastery?.[deptId] || player.department_mastery?.[deptId] || 0;
        const requiredMastery = config.SYSTEM.subsidiary_mastery_required || 100;
        
        if (mastery < requiredMastery) {
            return { can: false, reason: `熟練度不足（需要 ${requiredMastery}，目前 ${mastery}）` };
        }
        
        const subsidiaryId = dept.evolves_to;
        if (!subsidiaryId) {
            return { can: false, reason: '此部門無對應子公司' };
        }
        
        const activeSubsidiaries = player.functional_subsidiaries || [];
        if (activeSubsidiaries.includes(subsidiaryId)) {
            return { can: false, reason: '子公司已成立' };
        }
        
        return { can: true, subsidiaryId };
    },
    
    upgradeToFunctionalSubsidiary(player, deptId) {
        const checkResult = this.canUpgradeToFunctionalSubsidiary(player, deptId);
        if (!checkResult.can) {
            return { success: false, message: checkResult.reason };
        }
        
        const config = window.AssetCardConfig;
        const subsidiary = config.FUNCTIONAL_SUBSIDIARIES[checkResult.subsidiaryId];
        
        const newPlayer = JSON.parse(JSON.stringify(player));
        
        if (!newPlayer.functional_subsidiaries) newPlayer.functional_subsidiaries = [];
        newPlayer.functional_subsidiaries.push(checkResult.subsidiaryId);
        
        return {
            success: true,
            newState: newPlayer,
            message: `🎉 部門升級為子公司 ${subsidiary.icon} ${subsidiary.name}！`,
            functionalSubsidiary: subsidiary
        };
    },

    // 別名
    evolveDeptToSubsidiary(player, departmentId) {
        return this.upgradeToFunctionalSubsidiary(player, departmentId);
    },
    
    // ==========================================
    // 部門/子公司收益計算
    // ==========================================
    
    calculateDeptRevenue(player, deptId) {
        const config = window.AssetCardConfig;
        const dept = config.FUNCTIONAL_DEPTS[deptId];
        if (!dept) return { revenue: 0, cost: 0, net: 0 };
        
        const mastery = player.functional_dept_mastery?.[deptId] || player.department_mastery?.[deptId] || 0;
        let revenueMult = 1.0;
        
        // 應用熟練度獎勵
        for (const [threshold, bonus] of Object.entries(dept.mastery_bonuses)) {
            if (mastery >= parseInt(threshold) && bonus.revenue_mult) {
                revenueMult = bonus.revenue_mult;
            }
        }
        
        const baseRevenue = dept.base_revenue || 0;
        const operatingCost = dept.base_operating_cost || 0;
        const revenue = baseRevenue * revenueMult;
        
        return {
            revenue: revenue,
            cost: operatingCost,
            net: revenue - operatingCost,
            mastery: mastery,
            revenueMult: revenueMult
        };
    },
    
    calculateSubsidiaryRevenue(player, subId) {
        const config = window.AssetCardConfig;
        const sub = config.FUNCTIONAL_SUBSIDIARIES[subId];
        if (!sub) return { revenue: 0, cost: 0, net: 0 };
        
        const baseRevenue = sub.base_revenue || 0;
        const operatingCost = sub.base_operating_cost || 0;
        
        // TODO: 實作資源轉換計算
        let conversionRevenue = 0;
        
        return {
            revenue: baseRevenue + conversionRevenue,
            cost: operatingCost,
            net: baseRevenue + conversionRevenue - operatingCost,
            resourceConversion: sub.resource_conversion
        };
    },
    
    calculateTotalDeptSubsidiaryRevenue(player) {
        const activeDepts = this.getActiveFunctionalDepts(player);
        const activeSubsidiaries = player.functional_subsidiaries || [];
        
        let totalRevenue = 0;
        let totalCost = 0;
        const breakdown = { depts: [], subsidiaries: [] };
        
        for (const deptId of activeDepts) {
            const result = this.calculateDeptRevenue(player, deptId);
            totalRevenue += result.revenue;
            totalCost += result.cost;
            breakdown.depts.push({ id: deptId, ...result });
        }
        
        for (const subId of activeSubsidiaries) {
            const result = this.calculateSubsidiaryRevenue(player, subId);
            totalRevenue += result.revenue;
            totalCost += result.cost;
            breakdown.subsidiaries.push({ id: subId, ...result });
        }
        
        return {
            totalRevenue,
            totalCost,
            totalNet: totalRevenue - totalCost,
            breakdown
        };
    },
    
    // ==========================================
    // 企業光譜計算
    // ==========================================
    
    getCompanySpectrum(player) {
        const config = window.AssetCardConfig;
        const activeSubsidiaries = player.functional_subsidiaries || [];
        return config.calculateCompanySpectrum(activeSubsidiaries);
    },
    
    // ==========================================
    // 卡片摘要（供 UI 顯示）
    // ==========================================
    
    getUpgradeSummary(player, assetType) {
        const config = window.AssetCardConfig;
        const upgrades = config.getUpgrades(assetType);
        if (!upgrades) return {};
        
        const summary = {};
        for (const [pathId, pathConfig] of Object.entries(upgrades)) {
            const level = this.getUpgradeLevel(player, assetType, pathId);
            const levelConfig = level > 0 ? pathConfig.levels.find(l => l.level === level) : null;
            const nextConfig = pathConfig.levels.find(l => l.level === level + 1);
            
            const FacilityUpgradeEngine = window.FacilityUpgradeEngine;
            let facilityStatus = null;
            if (FacilityUpgradeEngine) {
                const productId = `${pathId}_lv${level + 1}`;
                const facilityState = player.facility_upgrade_state;
                facilityStatus = facilityState?.upgrade_products?.[productId] || null;
            }
            
            summary[pathId] = {
                id: pathId,
                name: pathConfig.name,
                icon: pathConfig.icon,
                level: level,
                currentName: levelConfig?.name || '未升級',
                nextName: nextConfig?.name || null,
                nextCost: nextConfig?.upgrade_cost || null,
                benefits: levelConfig?.benefits || {},
                costs: levelConfig?.costs || {},
                benefit_summary: pathConfig.benefit_summary,
                cost_summary: pathConfig.cost_summary,
                facilityStatus: facilityStatus
            };
        }
        return summary;
    },
    
    getAllCardSummaries(player) {
        return {
            space: this.getUpgradeSummary(player, 'space'),
            power: this.getUpgradeSummary(player, 'power'),
            compute: this.getUpgradeSummary(player, 'compute'),
            talent: this.getUpgradeSummary(player, 'talent'),
            data: this.getUpgradeSummary(player, 'data')
        };
    },
    
    // 獲取所有部門狀態（含解鎖進度）
    getAllDeptStatus(player) {
        const config = window.AssetCardConfig;
        if (!config || !config.FUNCTIONAL_DEPTS) {
            console.warn("AssetCardConfig.FUNCTIONAL_DEPTS not loaded");
            return [];
        }
        
        const activeDepts = this.getActiveFunctionalDepts(player);
        const result = [];
        
        for (const [deptId, dept] of Object.entries(config.FUNCTIONAL_DEPTS)) {
            const isActive = activeDepts.includes(deptId);
            const unlockCheck = config.checkDeptUnlockCondition(player.asset_upgrades, deptId);
            const mastery = player.functional_dept_mastery?.[deptId] || player.department_mastery?.[deptId] || 0;
            const canUpgradeToSub = isActive ? this.canUpgradeToFunctionalSubsidiary(player, deptId) : { can: false };
            
            // 計算技術進度
            let techProgress = [];
            if (dept.required_techs) {
                for (const req of dept.required_techs) {
                    const currentLevel = player.asset_upgrades?.[req.type]?.[req.path] || 0;
                    const upgradePath = config.getUpgradePath(req.type, req.path);
                    techProgress.push({
                        type: req.type,
                        path: req.path,
                        name: upgradePath ? upgradePath.name : `${req.type}.${req.path}`,
                        required: req.level,
                        current: currentLevel,
                        met: currentLevel >= req.level
                    });
                }
            }
            
            result.push({
                id: deptId,
                name: dept.name,
                icon: dept.icon,
                description: dept.description,
                isActive,
                canUnlock: unlockCheck.canUnlock,
                techProgress,
                mastery,
                masteryRequired: config.SYSTEM.subsidiary_mastery_required || 100,
                canUpgradeToSubsidiary: canUpgradeToSub.can,
                evolvesTo: dept.evolves_to,
                benefits_summary: dept.benefits_summary || [],
                base_revenue: dept.base_revenue,
                base_operating_cost: dept.base_operating_cost
            });
        }
        
        return result;
    },
    
    getFunctionalDeptSummary(player) {
        const config = window.AssetCardConfig;
        const activeDepts = this.getActiveFunctionalDepts(player);
        const summary = [];
        
        for (const deptId of activeDepts) {
            const dept = config.FUNCTIONAL_DEPTS[deptId];
            if (!dept) continue;
            
            const mastery = player.functional_dept_mastery?.[deptId] || player.department_mastery?.[deptId] || 0;
            const canUpgrade = this.canUpgradeToFunctionalSubsidiary(player, deptId);
            const revenueCalc = this.calculateDeptRevenue(player, deptId);
            
            summary.push({
                id: deptId,
                name: dept.name,
                icon: dept.icon,
                mastery: mastery,
                masteryRequired: config.SYSTEM.subsidiary_mastery_required || 100,
                canUpgradeToSubsidiary: canUpgrade.can,
                upgradeReason: canUpgrade.reason,
                evolvesTo: dept.evolves_to,
                benefits_summary: dept.benefits_summary || [],
                passive_effects: dept.passive_effects || {},
                revenue: revenueCalc.revenue,
                operatingCost: revenueCalc.cost,
                netIncome: revenueCalc.net
            });
        }
        
        return summary;
    },
    
    // 獲取所有子公司狀態
    getSubsidiarySummary(player) {
        const config = window.AssetCardConfig;
        const activeSubsidiaries = player.functional_subsidiaries || [];
        const summary = [];
        
        for (const subId of activeSubsidiaries) {
            const sub = config.FUNCTIONAL_SUBSIDIARIES[subId];
            if (!sub) continue;
            
            const revenueCalc = this.calculateSubsidiaryRevenue(player, subId);
            
            summary.push({
                id: subId,
                name: sub.name,
                icon: sub.icon,
                description: sub.description,
                spectrum: sub.spectrum,
                special_ability: sub.special_ability,
                revenue: revenueCalc.revenue,
                operatingCost: revenueCalc.cost,
                netIncome: revenueCalc.net,
                passive_effects: sub.passive_effects || {}
            });
        }
        
        return summary;
    }
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    // 如果已存在舊版本，合併新版本的方法（新版本優先）
    if (window.AssetCardEngine) {
        // 將新版本的方法覆蓋到舊版本
        for (const key of Object.keys(AssetCardEngine)) {
            window.AssetCardEngine[key] = AssetCardEngine[key];
        }
    } else {
        window.AssetCardEngine = AssetCardEngine;
    }
}

console.log('✓ Asset Card Engine loaded (Multi-tech dept unlock + Subsidiary support)');