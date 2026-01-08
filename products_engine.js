// ============================================
// 奇點競速 - 商品開發系統引擎 (Products Engine)
// ============================================
// 純邏輯引擎，不操作DOM
// 修改：支援新算力系統的速度係數參數

const ProductEngine = {
    
    // ==========================================
    // 初始化與狀態管理
    // ==========================================
    
    // 初始化商品狀態 (加入 player 初始化時調用)
    createInitialProductState() {
        return {
            compute_strategy: "Balanced",
            // 產品線狀態：每個產品ID對應其狀態
            products: {},  // { productId: { status, progress, assignedSenior, completedTurn, ... } }
            // 人才分配
            talent_assignment: {
                unassigned_seniors: 0,  // 未分配的Senior數量
                product_assignments: {} // { productId: seniorCount }
            },
            // 專精度
            mastery: {
                level: 0,
                experience: 0,
                products_by_tier: { 1: 0, 2: 0, 3: 0, 4: 0 }
            },
            // 運營數據
            product_demand: 0,
            product_fulfillment: 1.0,
            product_revenue: 0,
            // Turing 解鎖記錄
            turing_unlocks: []  // 已用於解鎖產品的記錄
        };
    },

    // ==========================================
    // MP 上限檢查系統
    // ==========================================
    
    /**
     * 獲取當前MP成長上限
     * 若未通過里程碑，MP不會增長超過該里程碑所需的MP
     * @param {Object} player - 玩家狀態
     * @returns {number} MP上限值
     */
    getMPCap(player) {
        const { COSTS } = window.GameConfig || {};
        if (!COSTS || !COSTS.MODEL_TIERS) return 110;
        
        const currentTier = player.mp_tier || 0;
        const nextTier = currentTier + 1;
        
        // 如果已經是最高Tier，無上限
        if (nextTier > 5) return 1000;
        
        // 返回下一個里程碑的MP閾值
        const nextTierData = COSTS.MODEL_TIERS[nextTier];
        return nextTierData ? nextTierData.mp : 1000;
    },
    
    /**
     * 應用MP成長上限
     * @param {Object} player - 玩家狀態
     * @param {number} newMP - 預計新MP值
     * @returns {number} 實際MP值（受上限限制）
     */
    applyMPCap(player, newMP) {
        const cap = this.getMPCap(player);
        return Math.min(newMP, cap);
    },
    
    /**
     * 檢查MP是否被上限卡住
     * @param {Object} player - 玩家狀態
     * @returns {Object} { isCapped: boolean, cap: number, message: string }
     */
    checkMPCapStatus(player) {
        const cap = this.getMPCap(player);
        const isCapped = player.model_power >= cap;
        const nextTier = (player.mp_tier || 0) + 1;
        
        return {
            isCapped,
            cap,
            nextTier,
            message: isCapped ? 
                `MP 已達上限 ${cap}，需通過 Tier ${nextTier} 里程碑才能繼續成長` : 
                null
        };
    },

    // ==========================================
    // 產品解鎖與狀態管理
    // ==========================================
    
    /**
     * 獲取產品的當前狀態
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品ID
     * @returns {Object} 產品狀態
     */
    getProductStatus(player, productId) {
        const ps = player.product_state;
        if (!ps || !ps.products) return null;
        
        return ps.products[productId] || null;
    },
    
    /**
     * 初始化某個Tier的產品狀態
     * 通過里程碑時自動調用
     * @param {Object} player - 玩家狀態
     * @param {number} tier - 里程碑Tier
     * @returns {Object} 更新後的玩家狀態
     */
    initializeTierProducts(player, tier) {
        const route = player.route;
        const tierConfig = ProductConfig.PRODUCT_LINES[route]?.[`tier${tier}`];
        if (!tierConfig) return player;
        
        const ps = player.product_state || this.createInitialProductState();
        
        tierConfig.products.forEach(product => {
            if (!ps.products[product.id]) {
                if (product.type === "milestone") {
                    // 里程碑產品：通過里程碑即解鎖，但需要Senior營運
                    ps.products[product.id] = {
                        status: ProductConfig.PRODUCT_STATUS.UNLOCKED,
                        type: product.type,
                        tier: tier,
                        progress: 1,  // 已完成（不需開發）
                        assignedSenior: 0,
                        completedTurn: player.turn_count || 0
                    };
                } else {
                    // 可開發產品：需要Turing解鎖
                    ps.products[product.id] = {
                        status: ProductConfig.PRODUCT_STATUS.LOCKED,
                        type: product.type,
                        tier: tier,
                        progress: 0,
                        assignedSenior: 0,
                        turingUnlocked: false
                    };
                }
            }
        });
        
        player.product_state = ps;
        return player;
    },
    
    /**
     * 使用Turing人才解鎖產品
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 要解鎖的產品ID
     * @returns {Object} { success, message, player }
     */
    unlockProductWithTuring(player, productId) {
        const ps = player.product_state;
        const product = this.getProductById(productId);
        
        if (!product) {
            return { success: false, message: "產品不存在" };
        }
        
        if (!product.requiresTuring) {
            return { success: false, message: "此產品不需要Turing解鎖" };
        }
        
        // 檢查產品所屬 Tier 是否已解鎖
        const tier = this.getProductTier(productId);
        if (tier > (player.mp_tier || 0)) {
            return { success: false, message: `需要先達成 Tier ${tier} 里程碑` };
        }
        
        // 如果產品狀態不存在，自動初始化為 LOCKED
        if (!ps.products[productId]) {
            ps.products[productId] = {
                status: ProductConfig.PRODUCT_STATUS.LOCKED,
                type: product.type || 'unlockable',
                tier: tier,
                progress: 0,
                assignedSenior: 0,
                turingUnlocked: false
            };
        }
        
        const productState = ps.products[productId];
        
        if (productState.status !== ProductConfig.PRODUCT_STATUS.LOCKED) {
            return { success: false, message: "產品已解鎖或正在開發" };
        }
        
        // 檢查是否有可用的Turing
        const turingCount = player.talent?.turing || 0;
        const usedTuring = ps.turing_unlocks?.length || 0;
        
        if (usedTuring >= turingCount) {
            return { 
                success: false, 
                message: `Turing人才不足。目前有 ${turingCount} 位，已用於解鎖 ${usedTuring} 項產品` 
            };
        }
        
        // 確保 turing_unlocks 陣列存在
        if (!ps.turing_unlocks) {
            ps.turing_unlocks = [];
        }
        
        // 解鎖產品
        productState.status = ProductConfig.PRODUCT_STATUS.UNLOCKED;
        productState.turingUnlocked = true;
        ps.turing_unlocks.push(productId);
        
        return {
            success: true,
            message: `🔓 產品「${product.name}」已解鎖！可以開始研發`,
            player: player
        };
    },

    // ==========================================
    // 產品開發系統
    // ==========================================
    
    /**
     * 檢查是否可以開始開發產品
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品ID
     * @returns {Object} { can, reason, product }
     */
    canStartDevelopment(player, productId) {
        const product = this.getProductById(productId);
        if (!product) {
            return { can: false, reason: "產品不存在" };
        }
        
        // 確保 product_state 存在
        if (!player.product_state) {
            player.product_state = this.createInitialProductState();
        }
        
        const ps = player.product_state;
        
        // 確保 products 物件存在
        if (!ps.products) {
            ps.products = {};
        }
        
        // 如果產品狀態不存在，根據類型初始化
        if (!ps.products[productId]) {
            ps.products[productId] = {
                status: product.requiresTuring ? 
                    (ProductConfig.PRODUCT_STATUS?.LOCKED || "locked") : 
                    (ProductConfig.PRODUCT_STATUS?.UNLOCKED || "unlocked"),
                type: product.type,
                tier: this.getProductTier ? this.getProductTier(productId) : 1,
                progress: 0,
                assignedSenior: 0
            };
        }
        
        const productState = ps.products[productId];
        const UNLOCKED = ProductConfig.PRODUCT_STATUS?.UNLOCKED || "unlocked";
        const LOCKED = ProductConfig.PRODUCT_STATUS?.LOCKED || "locked";
        const DEVELOPING = ProductConfig.PRODUCT_STATUS?.DEVELOPING || "developing";
        const COMPLETED = ProductConfig.PRODUCT_STATUS?.COMPLETED || "completed";
        const OPERATING = ProductConfig.PRODUCT_STATUS?.OPERATING || "operating";
        
        if (productState.status !== UNLOCKED) {
            if (productState.status === LOCKED) {
                return { can: false, reason: "需要Turing人才解鎖此產品" };
            }
            if (productState.status === DEVELOPING) {
                return { can: false, reason: "產品正在開發中" };
            }
            if (productState.status === COMPLETED || productState.status === OPERATING) {
                return { can: false, reason: "產品已完成" };
            }
            return { can: false, reason: "產品狀態為 " + productState.status };
        }
        
        // 里程碑產品不需要開發
        if (product.type === "milestone") {
            return { can: false, reason: "里程碑產品無需開發" };
        }
        
        // 檢查資源
        const startCash = (product.devCost?.cash || 0) * 0.5;
        const startData = (product.devCost?.data || 0) * 0.5;
        const totalData = (player.high_data || 0) + (player.low_data || 0);
        
        if (player.cash < startCash) {
            return { can: false, reason: "現金不足（需要 $" + startCash + "M）" };
        }
        if (totalData < startData) {
            return { can: false, reason: "數據不足（需要 " + startData + "）" };
        }
        
        return { can: true, product };
    },
    
    /**
     * 獲取產品所屬的 Tier
     */
    getProductTier(productId) {
        if (!ProductConfig || !ProductConfig.PRODUCT_LINES) return 1;
        for (const route in ProductConfig.PRODUCT_LINES) {
            const routeConfig = ProductConfig.PRODUCT_LINES[route];
            for (let tier = 1; tier <= 4; tier++) {
                const tierKey = "tier" + tier;
                if (routeConfig[tierKey] && routeConfig[tierKey].products) {
                    const found = routeConfig[tierKey].products.find(function(p) { return p.id === productId; });
                    if (found) return tier;
                }
            }
        }
        return 1;
    },

    
    /**
     * 開始開發產品
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品ID
     * @returns {Object} { success, message, player }
     */
    startDevelopment(player, productId) {
        const check = this.canStartDevelopment(player, productId);
        if (!check.can) {
            return { success: false, message: check.reason };
        }
        
        const product = check.product;
        const startCash = product.devCost.cash * 0.5;
        const startData = product.devCost.data * 0.5;
        
        // 扣除啟動成本
        player.cash -= startCash;
        
        // 優先消耗 low_data
        if (player.low_data >= startData) {
            player.low_data -= startData;
        } else {
            const remaining = startData - player.low_data;
            player.low_data = 0;
            player.high_data = Math.max(0, player.high_data - remaining);
        }
        
        // 更新產品狀態
        const ps = player.product_state;
        ps.products[productId].status = ProductConfig.PRODUCT_STATUS.DEVELOPING;
        ps.products[productId].progress = 0;
        ps.products[productId].devStartTurn = player.turn_count || 0;
        ps.products[productId].costRemaining = {
            cash: product.devCost.cash * 0.5,
            data: product.devCost.data * 0.5
        };
        
        return {
            success: true,
            message: `🔨 開始研發「${product.name}」`,
            player
        };
    },
    
    /**
     * 更新所有開發中產品的進度（每回合調用）
     * @param {Object} player - 玩家狀態
     * @param {number} productPflops - 分配給產品開發的算力
     * @param {number} externalSpeedMult - 外部速度係數（來自算力系統，可選）
     * @returns {Object} { completedProducts, messages }
     */

    updateAllDevelopment(player, productPflops, externalSpeedMult) {
        const ps = player.product_state;
        const completed = [];
        const messages = [];
        
        const strategy = this.getComputeStrategy(ps.compute_strategy);
        const baseSpeedMult = strategy.effects.product_speed;
        
        // 如果提供了外部速度係數（來自新算力系統），則使用它
        let speedMult;
        if (typeof externalSpeedMult === 'number') {
            speedMult = baseSpeedMult * externalSpeedMult;
        } else {
            // 舊系統：基於算力量計算
            const pflopBonus = 1 + productPflops * 0.05;
            speedMult = baseSpeedMult * Math.min(2, pflopBonus);
        }
        
        // 如果速度係數為0，所有開發停滯
        if (speedMult <= 0) {
            messages.push("⚠️ 商品開發因算力不足而停滯");
            return { completedProducts: completed, messages };
        }
        
        Object.entries(ps.products).forEach(([productId, state]) => {
            if (state.status !== ProductConfig.PRODUCT_STATUS.DEVELOPING) return;
            
            const product = this.getProductById(productId);
            if (!product || product.devTurns <= 0) return;
            
            const progressPerTurn = (1 / product.devTurns) * speedMult;
            state.progress = Math.min(1, state.progress + progressPerTurn);
            
            if (state.progress >= 1) {
                if (state.costRemaining) {
                    player.cash -= state.costRemaining.cash;
                    if (player.low_data >= state.costRemaining.data) {
                        player.low_data -= state.costRemaining.data;
                    } else {
                        const remaining = state.costRemaining.data - player.low_data;
                        player.low_data = 0;
                        player.high_data = Math.max(0, player.high_data - remaining);
                    }
                }
                
                state.status = ProductConfig.PRODUCT_STATUS.COMPLETED;
                state.progress = 1;
                state.completedTurn = player.turn_count || 0;
                delete state.costRemaining;
                
                ps.mastery.experience++;
                ps.mastery.products_by_tier[state.tier] = 
                    (ps.mastery.products_by_tier[state.tier] || 0) + 1;
                
                if (this.checkMasteryLevelUp(ps)) {
                    const newLevel = this.getMasteryLevel(ps.mastery.level);
                    messages.push(`⭐ 專精度提升至：${newLevel.name}`);
                }
                
                completed.push(product);
                messages.push(`🎉 產品完成：${product.name}`);
            }
        });
        
        return { completedProducts: completed, messages };
    },

    // ==========================================
    // Senior 人才分配系統
    // ==========================================
    
    /**
     * 計算可分配的Senior數量
     * @param {Object} player - 玩家狀態
     * @returns {Object} { total, assigned, available }
     */
    getAvailableSeniors(player) {
        const totalSeniors = player.talent?.senior || 0;
        const ps = player.product_state;
        
        let assignedCount = 0;
        if (ps && ps.products) {
            Object.values(ps.products).forEach(state => {
                if (state.assignedSenior > 0) {
                    assignedCount += state.assignedSenior;
                }
            });
        }
        
        return {
            total: totalSeniors,
            assigned: assignedCount,
            available: Math.max(0, totalSeniors - assignedCount)
        };
    },
    
    /**
     * 分配Senior到產品營運
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品ID
     * @returns {Object} { success, message, player }
     */
    assignSeniorToProduct(player, productId) {
        const ps = player.product_state;
        const product = this.getProductById(productId);
        
        if (!product) {
            return { success: false, message: "產品配置不存在" };
        }
        
        // 如果產品狀態不存在，嘗試自動初始化（特別針對里程碑產品）
        if (!ps.products[productId]) {
            if (product.type === "milestone") {
                // 檢查對應的里程碑是否達成
                const tier = this.getProductTier(productId);
                if (!player.mp_milestones?.[tier]) {
                    return { success: false, message: `需要先達成 Tier ${tier} 里程碑` };
                }
                // 自動初始化里程碑產品狀態
                ps.products[productId] = {
                    status: ProductConfig.PRODUCT_STATUS.UNLOCKED,
                    type: product.type,
                    tier: tier,
                    progress: 1,
                    assignedSenior: 0,
                    completedTurn: player.turn_count || 0
                };
            } else {
                return { success: false, message: "產品狀態未初始化" };
            }
        }
        
        const productState = ps.products[productId];
        
        // 檢查產品是否可以營運（需要已完成或是里程碑產品）
        const validStatus = [
            ProductConfig.PRODUCT_STATUS.COMPLETED,
            ProductConfig.PRODUCT_STATUS.UNLOCKED,
            ProductConfig.PRODUCT_STATUS.SUSPENDED
        ];
        
        // 里程碑產品在UNLOCKED狀態也可以分配
        if (product.type !== "milestone" && productState.status === ProductConfig.PRODUCT_STATUS.UNLOCKED) {
            return { success: false, message: "產品尚未完成開發" };
        }
        
        if (!validStatus.includes(productState.status) && productState.status !== ProductConfig.PRODUCT_STATUS.OPERATING) {
            return { success: false, message: `產品狀態不允許分配營運（當前：${productState.status}）` };
        }
        
        // 檢查可用Senior
        const seniors = this.getAvailableSeniors(player);
        if (seniors.available <= 0) {
            return { success: false, message: `沒有可分配的Senior人才（${seniors.assigned}/${seniors.total}已分配）` };
        }
        
        // 每個產品只需要一位Senior
        if (productState.assignedSenior >= 1) {
            return { success: false, message: "此產品已有Senior營運" };
        }
        
        // 分配Senior
        productState.assignedSenior = 1;
        productState.status = ProductConfig.PRODUCT_STATUS.OPERATING;
        
        // 應用產品效果（首次營運時）
        if (!productState.effectsApplied) {
            this.applyProductEffects(player, product);
            productState.effectsApplied = true;
        }
        
        return {
            success: true,
            message: `👤 已分配Senior營運「${product.name}」`,
            player
        };
    },
    
    /**
     * 從產品移除Senior
     * @param {Object} player - 玩家狀態
     * @param {string} productId - 產品ID
     * @returns {Object} { success, message, player }
     */
    removeSeniorFromProduct(player, productId) {
        const ps = player.product_state;
        const productState = ps.products[productId];
        const product = this.getProductById(productId);
        
        if (!productState || !product) {
            return { success: false, message: "產品不存在" };
        }
        
        if (productState.assignedSenior <= 0) {
            return { success: false, message: "此產品沒有分配Senior" };
        }
        
        // 移除Senior
        productState.assignedSenior = 0;
        productState.status = ProductConfig.PRODUCT_STATUS.SUSPENDED;
        
        return {
            success: true,
            message: `👤 已從「${product.name}」移除Senior（產品收入暫停）`,
            player
        };
    },

    // ==========================================
    // 產品收益與效果
    // ==========================================
    
    /**
     * 應用產品效果（完成時一次性）
     * @param {Object} player - 玩家狀態
     * @param {Object} product - 產品配置
     */
    applyProductEffects(player, product) {
        if (!product || !product.effects) return;
        
        const effects = product.effects;
        
        if (effects.community) {
            player.community_size = (player.community_size || 0) + effects.community;
        }
        if (effects.hype) {
            player.hype = Math.min(200, (player.hype || 0) + effects.hype);
        }
        if (effects.trust) {
            player.trust = Math.max(0, Math.min(100, (player.trust || 0) + effects.trust));
        }
        if (effects.alignment) {
            player.alignment = Math.max(0, Math.min(100, (player.alignment || 50) + effects.alignment));
        }
        if (effects.revenue_base) {
            player.revenue_bonus = (player.revenue_bonus || 0) + effects.revenue_base;
        }
        
        const risks = product.risks || {};
        if (risks.entropy) {
            player.entropy = Math.min(100, (player.entropy || 0) + risks.entropy);
        }
        if (risks.compliance_risk) {
            player.compliance_risk = Math.min(100, (player.compliance_risk || 0) + risks.compliance_risk);
        }
        if (risks.regulation) {
            player.regulation = Math.min(100, (player.regulation || 0) + risks.regulation);
        }
    },

    applyFulfillmentEffects(player, fulfillment) {
        if (!player.product_state) return;
        
        player.product_state.product_fulfillment = fulfillment;
        
        if (fulfillment < 0.5) {
            player.trust = Math.max(0, (player.trust || 0) - 3);
            player.community_size = Math.max(0, (player.community_size || 0) * 0.95);
        } else if (fulfillment < 0.8) {
            player.trust = Math.max(0, (player.trust || 0) - 1);
        } else if (fulfillment > 1.2) {
            player.trust = Math.min(100, (player.trust || 0) + 1);
        }
    },

    /**
     * 計算所有營運中產品的每季收益
     * @param {Object} player - 玩家狀態
     * @returns {number} 產品總收益
     */
    calculateProductRevenue(player) {
        const ps = player.product_state;
        if (!ps || !ps.products) return 0;
        
        let totalRevenue = 0;
        
        Object.entries(ps.products).forEach(([productId, state]) => {
            // 只有營運中的產品才產生收入
            if (state.status !== ProductConfig.PRODUCT_STATUS.OPERATING) return;
            
            const product = this.getProductById(productId);
            if (!product) return;
            
            const baseRevenue = product.effects?.revenue_base || 0;
            
            // 服務品質影響收入
            const fulfillment = ps.product_fulfillment || 1.0;
            const fulfillmentMult = Math.max(0.5, Math.min(1.2, fulfillment));
            
            // 社群規模加成
            const communityFactor = Math.log10(Math.max(10, player.community_size || 10)) / 3;
            
            totalRevenue += baseRevenue * fulfillmentMult * communityFactor;
        });
        
        return totalRevenue;
    },
    
    /**
     * 獲取營運中產品數量
     * @param {Object} player - 玩家狀態
     * @returns {number}
     */
    getOperatingProductCount(player) {
        const ps = player.product_state;
        if (!ps || !ps.products) return 0;
        
        return Object.values(ps.products).filter(
            state => state.status === ProductConfig.PRODUCT_STATUS.OPERATING
        ).length;
    },

    // ==========================================
    // 輔助函數
    // ==========================================
    
    // 獲取算力策略
    getComputeStrategy(strategyName) {
        return ProductConfig.COMPUTE_STRATEGIES[strategyName] || 
               ProductConfig.COMPUTE_STRATEGIES["Balanced"];
    },
    
    // 獲取專精度等級資訊
    getMasteryLevel(level) {
        if (!ProductConfig || !ProductConfig.MASTERY_LEVELS) {
            return { mp_bonus: 0, milestone_bonus: 0, inference_reduction: 0, name: "無", exp_required: 0 };
        }
        return ProductConfig.MASTERY_LEVELS[Math.min(5, Math.max(0, level || 0))] || 
               { mp_bonus: 0, milestone_bonus: 0, inference_reduction: 0, name: "無", exp_required: 0 };
    },
    
    // 計算專精度 MP 加成
    getMasteryMPBonus(masteryLevel) {
        const mastery = this.getMasteryLevel(masteryLevel || 0);
        return mastery?.mp_bonus || 0;
    },
    
    // 計算專精度里程碑加成
    getMasteryMilestoneBonus(masteryLevel) {
        const mastery = this.getMasteryLevel(masteryLevel || 0);
        return mastery?.milestone_bonus || 0;
    },
    
    // 檢查專精度升級
    checkMasteryLevelUp(productState) {
        const currentLevel = productState.mastery.level;
        if (currentLevel >= 5) return false;
        
        const nextLevel = ProductConfig.MASTERY_LEVELS[currentLevel + 1];
        if (productState.mastery.experience >= nextLevel.exp_required) {
            productState.mastery.level = currentLevel + 1;
            return true;
        }
        return false;
    },
    
    // 獲取路線商品配置
    getRouteProducts(route) {
        return ProductConfig.PRODUCT_LINES[route] || null;
    },
    
    // 獲取特定 Tier 的商品列表
    getTierProducts(route, tier) {
        const routeConfig = this.getRouteProducts(route);
        if (!routeConfig) return [];
        
        const tierKey = `tier${tier}`;
        return routeConfig[tierKey]?.products || [];
    },
    
    // 根據ID獲取產品配置
    getProductById(productId) {
        for (const route in ProductConfig.PRODUCT_LINES) {
            const routeConfig = ProductConfig.PRODUCT_LINES[route];
            for (let tier = 1; tier <= 4; tier++) {
                const tierKey = `tier${tier}`;
                if (routeConfig[tierKey]) {
                    const product = routeConfig[tierKey].products.find(p => p.id === productId);
                    if (product) return product;
                }
            }
        }
        return null;
    },
    
    // 設定算力策略
    setComputeStrategy(player, strategyName) {
        if (!ProductConfig.COMPUTE_STRATEGIES[strategyName]) {
            return { success: false, message: "無效的策略" };
        }
        
        player.product_state.compute_strategy = strategyName;
        const strategy = ProductConfig.COMPUTE_STRATEGIES[strategyName];
        return { success: true, message: `算力策略切換為：${strategy.name}` };
    },
    
    // 計算產品需求
    calculateProductDemand(player) {
        if ((player.mp_tier || 0) < 1) return 0;
        
        const operatingCount = this.getOperatingProductCount(player);
        if (operatingCount === 0) return 0;
        
        const baseDemand = (player.community_size || 0) * 0.03;
        const mpFactor = Math.max(1, (player.model_power || 1) / 20);
        const productFactor = 1 + operatingCount * 0.1;
        const tierFactor = 1 + (player.mp_tier || 0) * 0.2;
        
        return baseDemand * mpFactor * productFactor * tierFactor;
    },

    // 計算產品滿足率
    calculateProductFulfillment(player, inferencePflops) {
        const demand = this.calculateProductDemand(player);
        if (demand <= 0) return 1.0;
        
        const strategy = this.getComputeStrategy(player.product_state?.compute_strategy);
        const efficiencyLevel = player.tech_levels?.["Efficiency"] || 0;
        const efficiencyBonus = 1 + efficiencyLevel * 0.1;
        
        return Math.min(1.5, (inferencePflops / demand) * strategy.effects.service_quality * efficiencyBonus);
    },
    
    // 獲取商品開發狀態摘要
    getProductSummary(player) {
        const ps = player.product_state;
        if (!ps) return null;
        
        const mastery = this.getMasteryLevel(ps.mastery?.level || 0);
        const seniors = this.getAvailableSeniors(player);
        
        // 統計各狀態產品數量
        let developing = 0;
        let operating = 0;
        let suspended = 0;
        let completed = 0;
        
        if (ps.products) {
            Object.values(ps.products).forEach(state => {
                switch (state.status) {
                    case ProductConfig.PRODUCT_STATUS.DEVELOPING: developing++; break;
                    case ProductConfig.PRODUCT_STATUS.OPERATING: operating++; break;
                    case ProductConfig.PRODUCT_STATUS.SUSPENDED: suspended++; break;
                    case ProductConfig.PRODUCT_STATUS.COMPLETED: completed++; break;
                }
            });
        }
        
        return {
            strategy: this.getComputeStrategy(ps.compute_strategy),
            developing,
            operating,
            suspended,
            completed: completed + operating + suspended,
            mastery: {
                level: ps.mastery?.level || 0,
                name: mastery.name,
                experience: ps.mastery?.experience || 0,
                mpBonus: mastery.mp_bonus,
                milestoneBonus: mastery.milestone_bonus,
                inferenceReduction: mastery.inference_reduction || 0  // 推論需求減免
            },
            seniors: seniors,
            demand: ps.product_demand || 0,
            fulfillment: ps.product_fulfillment || 1.0,
            serviceQuality: ps.service_quality || 1.0,
            revenue: ps.product_revenue || 0,
            mpCapStatus: this.checkMPCapStatus(player)
        };
    }
};

// 導出
window.ProductEngine = ProductEngine;

console.log('✓ Products Engine loaded');