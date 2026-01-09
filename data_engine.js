// ============================================
// 奇點競速 - 數據資源系統引擎 (Data Engine)
// ============================================
// 純邏輯引擎，不操作 DOM
// Tier 解鎖：Tier0 顯示 / Tier1 三維屬性+來源+衰減 / Tier2 清洗+合成

const DataEngine = {

    // ==========================================
    // 初始化與狀態管理
    // ==========================================

    /**
     * 創建數據系統初始狀態
     * @returns {Object} 數據系統狀態
     */
    createInitialDataState() {
        return {
            // 六種數據類型存儲
            inventory: {
                legal_high_broad: 0,
                legal_high_focused: 0,
                legal_low: 0,
                gray_high: 0,
                gray_low: 0,
                synthetic: 0
            },
            // 合成數據品質記錄（因為 synthetic 品質可變）
            synthetic_quality: 0.5,
            // 進行中的清洗/轉化任務
            processing_tasks: [],
            // 數據合約
            contracts: [],
            // 灰色數據累積風險
            gray_data_exposure: 0,
            // 統計數據
            statistics: {
                total_acquired: 0,
                total_consumed: 0,
                total_decayed: 0,
                total_synthesized: 0
            }
        };
    },

    /**
     * 初始化玩家的數據狀態（整合現有 high_data/low_data）
     * @param {Object} player - 玩家狀態
     * @returns {Object} 更新後的玩家狀態
     */
    initializePlayerDataState(player) {
        if (!player.data_state) {
            player.data_state = this.createInitialDataState();
            
            // 將現有的 high_data/low_data 轉換為新系統
            // 假設現有數據都是合法的
            if (player.high_data > 0) {
                player.data_state.inventory.legal_high_broad = Math.floor(player.high_data * 0.7);
                player.data_state.inventory.legal_high_focused = Math.floor(player.high_data * 0.3);
            }
            if (player.low_data > 0) {
                player.data_state.inventory.legal_low = player.low_data;
            }
        }
        return player;
    },

    // ==========================================
    // 功能解鎖檢查
    // ==========================================

    /**
     * 檢查功能是否已解鎖
     * @param {Object} player - 玩家狀態
     * @param {string} feature - 功能名稱
     * @returns {boolean}
     */
    isFeatureUnlocked(player, feature) {
        const config = window.DataConfig || {};
        const tier = player.mp_tier || 0;

        switch (feature) {
            case 'display':
                return true;  // 始終顯示
            case 'sources':
            case 'decay':
            case 'scraping':
                return tier >= config.UNLOCK_TIERS?.BASIC || tier >= 1;
            case 'cleaning':
            case 'synthesis':
            case 'contracts':
                return tier >= config.UNLOCK_TIERS?.ADVANCED || tier >= 2;
            default:
                return false;
        }
    },

    /**
     * 取得當前可用功能列表
     * @param {Object} player - 玩家狀態
     * @returns {Object} 各功能解鎖狀態
     */
    getUnlockedFeatures(player) {
        return {
            display: this.isFeatureUnlocked(player, 'display'),
            sources: this.isFeatureUnlocked(player, 'sources'),
            decay: this.isFeatureUnlocked(player, 'decay'),
            scraping: this.isFeatureUnlocked(player, 'scraping'),
            cleaning: this.isFeatureUnlocked(player, 'cleaning'),
            synthesis: this.isFeatureUnlocked(player, 'synthesis'),
            contracts: this.isFeatureUnlocked(player, 'contracts')
        };
    },

    // ==========================================
    // 數據查詢
    // ==========================================

    /**
     * 取得數據總量（兼容舊系統）
     * @param {Object} player - 玩家狀態
     * @returns {Object} { high_data, low_data, total }
     */
    getDataSummary(player) {
        const ds = player.data_state;
        
        // 如果還沒初始化新系統，使用舊數據
        if (!ds || !ds.inventory) {
            return {
                high_data: player.high_data || 0,
                low_data: player.low_data || 0,
                total: (player.high_data || 0) + (player.low_data || 0),
                legal_total: (player.high_data || 0) + (player.low_data || 0),
                gray_total: 0,
                synthetic_total: 0
            };
        }

        const inv = ds.inventory;
        const high = inv.legal_high_broad + inv.legal_high_focused + inv.gray_high;
        const low = inv.legal_low + inv.gray_low;
        const synthetic = inv.synthetic;

        return {
            high_data: high + Math.floor(synthetic * ds.synthetic_quality),
            low_data: low + Math.floor(synthetic * (1 - ds.synthetic_quality)),
            total: high + low + synthetic,
            legal_total: inv.legal_high_broad + inv.legal_high_focused + inv.legal_low,
            gray_total: inv.gray_high + inv.gray_low,
            synthetic_total: synthetic,
            // 詳細分類
            by_type: { ...inv },
            synthetic_quality: ds.synthetic_quality
        };
    },

    /**
     * 取得特定類型數據量
     * @param {Object} player - 玩家狀態
     * @param {string} typeId - 數據類型ID
     * @returns {number}
     */
    getDataAmount(player, typeId) {
        const ds = player.data_state;
        if (!ds || !ds.inventory) return 0;
        return ds.inventory[typeId] || 0;
    },

    /**
     * 取得數據詳細報告
     * @param {Object} player - 玩家狀態
     * @returns {Object} 詳細報告
     */
    getDetailedReport(player) {
        const config = window.DataConfig || {};
        const ds = player.data_state;
        const summary = this.getDataSummary(player);
        const routeMod = config.ROUTE_MODIFIERS?.[player.route] || {};

        // 計算灰色數據佔比
        const grayRatio = summary.total > 0 ? summary.gray_total / summary.total : 0;

        // 計算下季衰減預估
        const decayEstimate = this.estimateDecay(player);

        return {
            summary,
            gray_ratio: grayRatio,
            gray_warning: grayRatio > (config.UI?.warnings?.high_gray_ratio || 0.3),
            decay_estimate: decayEstimate,
            route_modifier: routeMod,
            processing_tasks: ds?.processing_tasks || [],
            contracts: ds?.contracts || [],
            statistics: ds?.statistics || {}
        };
    },

    // ==========================================
    // 數據來源操作
    // ==========================================

    /**
     * 購買數據
     * @param {Object} player - 玩家狀態
     * @param {string} dataType - 數據類型
     * @param {number} amount - 購買數量
     * @returns {Object} { success, player, message }
     */
    purchaseData(player, dataType, amount) {
        const config = window.DataConfig || {};
        const typeConfig = config.DATA_TYPES?.[dataType];

        if (!typeConfig) {
            return { success: false, message: '無效的數據類型' };
        }

        if (!this.isFeatureUnlocked(player, 'sources')) {
            return { success: false, message: '需要達成 Tier 1 里程碑解鎖此功能' };
        }

        // 檢查是否可購買
        const purchaseOpt = config.PURCHASE_OPTIONS?.spot;
        if (!purchaseOpt?.available_types?.includes(dataType)) {
            return { success: false, message: '此類型數據無法購買' };
        }

        // 計算成本
        const unitPrice = typeConfig.base_price || 1;
        const totalCost = unitPrice * amount;

        if (player.cash < totalCost) {
            return { success: false, message: `現金不足（需要 $${totalCost}M）` };
        }

        // 執行購買
        player = this.initializePlayerDataState(player);
        player.cash -= totalCost;
        player.data_state.inventory[dataType] += amount;
        player.data_state.statistics.total_acquired += amount;

        // 同步舊系統數據（向後兼容）
        this.syncLegacyData(player);

        return {
            success: true,
            player,
            message: `購買了 ${amount} 單位 ${typeConfig.name}`,
            cost: totalCost
        };
    },

    /**
     * 執行灰色爬蟲
     * @param {Object} player - 玩家狀態
     * @param {number} intensity - 強度 (1-3)
     * @returns {Object} { success, player, message, discovered }
     */
    executeScraping(player, intensity = 1) {
        const config = window.DataConfig || {};
        const sourceConfig = config.DATA_SOURCES?.scraping;

        if (!sourceConfig) {
            return { success: false, message: '爬蟲配置未載入' };
        }

        // 爬蟲從 Tier 0 即可使用（不需要 isFeatureUnlocked 檢查）
        
        // 檢查強度限制（依 Tier 決定最大強度）
        const tier = player.mp_tier || 0;
        const maxIntensityByTier = sourceConfig.max_intensity_by_tier || { 0: 2, 1: 3, 2: 3 };
        const maxIntensity = maxIntensityByTier[Math.min(tier, 2)] || 2;
        
        if (intensity > maxIntensity) {
            return { 
                success: false, 
                message: tier < 1 
                    ? '瘋狂模式需要達成 Tier 1 里程碑解鎖' 
                    : `當前最大強度為 ${maxIntensity}`
            };
        }

        // 檢查路線限制
        const routeMod = config.ROUTE_MODIFIERS?.[player.route] || {};
        if (routeMod.gray_data_forbidden) {
            return { success: false, message: '您的技術路線禁止使用灰色數據' };
        }

        player = this.initializePlayerDataState(player);

        // 計算產出（強度影響數量和風險）
        const baseAmount = 30 * intensity;
        const volumeMult = sourceConfig.effects?.volume_multiplier || 3.0;
        const totalAmount = Math.floor(baseAmount * volumeMult);

        // 高品質佔比隨機（10%-30%）
        const highRatio = 0.1 + Math.random() * 0.2;
        const highAmount = Math.floor(totalAmount * highRatio);
        const lowAmount = totalAmount - highAmount;

        // 增加數據
        player.data_state.inventory.gray_high += highAmount;
        player.data_state.inventory.gray_low += lowAmount;
        player.data_state.statistics.total_acquired += totalAmount;

        // 增加風險
        const riskAdd = (sourceConfig.effects?.compliance_risk_add || 5) * intensity;
        const regAdd = (sourceConfig.effects?.regulation_add || 3) * intensity;
        player.compliance_risk = Math.min(100, (player.compliance_risk || 0) + riskAdd);
        player.regulation = Math.min(100, (player.regulation || 0) + regAdd);
        player.data_state.gray_data_exposure += totalAmount;

        // 檢查是否被發現
        const discoveryChance = (sourceConfig.discovery_chance || 0.15) * intensity;
        const discovered = Math.random() < discoveryChance;

        if (discovered) {
            const trustLoss = sourceConfig.effects?.trust_loss || 2;
            player.trust = Math.max(0, (player.trust || 0) - trustLoss * 2);
            player.compliance_risk = Math.min(100, (player.compliance_risk || 0) + 10);
        }

        // 同步舊系統
        this.syncLegacyData(player);

        return {
            success: true,
            player,
            message: discovered 
                ? `⚠️ 爬取了 ${totalAmount} 單位數據，但被發現了！信任度下降`
                : `🕷️ 爬取了 ${totalAmount} 單位灰色數據`,
            amount: { high: highAmount, low: lowAmount },
            discovered
        };
    },

    // ==========================================
    // 數據合成（Tier 2）
    // ==========================================

    /**
     * 執行數據合成
     * @param {Object} player - 玩家狀態
     * @param {string} methodId - 合成方法ID
     * @returns {Object} { success, player, message }
     */
    synthesizeData(player, methodId) {
        const config = window.DataConfig || {};
        const method = config.SYNTHESIS_METHODS?.[methodId];

        if (!method) {
            return { success: false, message: '無效的合成方法' };
        }

        if (!this.isFeatureUnlocked(player, 'synthesis')) {
            return { success: false, message: '需要達成 Tier 2 里程碑解鎖此功能' };
        }

        // 檢查 MP 需求
        if ((player.model_power || 0) < method.mp_requirement) {
            return { success: false, message: `需要 MP ${method.mp_requirement} 以上` };
        }

        // 檢查特殊研究解鎖
        if (method.unlock_research) {
            // TODO: 整合研究系統
            const hasResearch = player.unlocked_research?.includes(method.unlock_research);
            if (!hasResearch) {
                return { success: false, message: `需要先研發「差分隱私技術」` };
            }
        }

        // 計算成本
        const costs = method.costs || {};
        const cashCost = costs.cash || 0;
        
        if (player.cash < cashCost) {
            return { success: false, message: `現金不足（需要 $${cashCost}M）` };
        }

        // 計算算力消耗
        const availablePflops = (player.pflops || 0) + (player.cloud_pflops || 0) - (player.locked_pflops || 0);
        const computeCost = availablePflops * (costs.compute_ratio || 0.1);

        if (computeCost > availablePflops * 0.5) {
            return { success: false, message: '可用算力不足，無法進行合成' };
        }

        player = this.initializePlayerDataState(player);

        // 扣除成本
        player.cash -= cashCost;

        // 計算產出
        const output = method.output || {};
        const routeMod = config.ROUTE_MODIFIERS?.[player.route] || {};
        const efficiencyMult = routeMod.synthesis_efficiency || 1.0;

        const baseAmount = output.base_amount || 30;
        const amount = Math.floor(baseAmount * efficiencyMult);

        // 計算品質（受 MP 影響）
        const qualityBase = output.quality_base || 0.5;
        const mpScaling = output.quality_mp_scaling || 0.002;
        const maxQuality = output.max_quality || 0.8;
        const quality = Math.min(maxQuality, qualityBase + (player.model_power || 0) * mpScaling);

        // 更新合成數據
        player.data_state.inventory.synthetic += amount;
        player.data_state.synthetic_quality = 
            (player.data_state.synthetic_quality * player.data_state.inventory.synthetic + quality * amount) /
            (player.data_state.inventory.synthetic + amount);
        player.data_state.statistics.total_synthesized += amount;

        // 應用效果
        const effects = method.effects || {};
        if (effects.alignment_add) {
            player.alignment = Math.min(100, (player.alignment || 0) + effects.alignment_add);
        }
        if (effects.entropy_add) {
            player.entropy = Math.min(100, (player.entropy || 0) + effects.entropy_add);
        }
        if (effects.compliance_risk) {
            player.compliance_risk = Math.max(0, (player.compliance_risk || 0) + effects.compliance_risk);
        }
        if (effects.regulation_reduction) {
            player.regulation = Math.max(0, (player.regulation || 0) - effects.regulation_reduction);
        }

        // 同步舊系統
        this.syncLegacyData(player);

        return {
            success: true,
            player,
            message: `🧬 合成了 ${amount} 單位數據（品質: ${Math.round(quality * 100)}%）`,
            amount,
            quality
        };
    },

    // ==========================================
    // 數據清洗轉化（Tier 2）
    // ==========================================

    /**
     * 開始數據清洗任務
     * @param {Object} player - 玩家狀態
     * @param {string} taskType - 任務類型
     * @param {number} amount - 處理數量（可選，使用配置預設值）
     * @returns {Object} { success, player, message }
     */
    startCleaningTask(player, taskType, amount = null) {
        const config = window.DataConfig || {};
        const taskConfig = config.DATA_CLEANING?.[taskType];

        if (!taskConfig) {
            return { success: false, message: '無效的清洗任務類型' };
        }

        if (!this.isFeatureUnlocked(player, 'cleaning')) {
            return { success: false, message: '需要達成 Tier 2 里程碑解鎖此功能' };
        }

        player = this.initializePlayerDataState(player);

        // 確定處理數量
        const processAmount = amount || taskConfig.input?.amount || 10;

        // 檢查輸入數據是否足夠
        const inputCheck = this.checkCleaningInput(player, taskType, processAmount);
        if (!inputCheck.sufficient) {
            return { success: false, message: inputCheck.message };
        }

        // 檢查成本
        const costs = taskConfig.costs || {};
        if (costs.cash && player.cash < costs.cash) {
            return { success: false, message: `現金不足（需要 $${costs.cash}M）` };
        }
        if (costs.junior_required) {
            const juniorCount = player.talent?.junior || 0;
            if (juniorCount < costs.junior_required) {
                return { success: false, message: `需要 ${costs.junior_required} 名 Junior` };
            }
        }
        if (costs.senior_required) {
            const seniorCount = player.talent?.senior || 0;
            if (seniorCount < costs.senior_required) {
                return { success: false, message: `需要 ${costs.senior_required} 名 Senior` };
            }
        }

        // 扣除成本和輸入數據
        if (costs.cash) player.cash -= costs.cash;
        this.deductCleaningInput(player, taskType, processAmount);

        // 創建任務
        const task = {
            id: `clean_${Date.now()}`,
            type: taskType,
            input_amount: processAmount,
            output_amount: Math.floor(processAmount * (taskConfig.output?.amount || 6) / (taskConfig.input?.amount || 10)),
            turns_remaining: taskConfig.duration || 1,
            started_turn: player.turn_count || 0
        };

        player.data_state.processing_tasks.push(task);

        return {
            success: true,
            player,
            message: `開始 ${taskConfig.name}，預計 ${task.turns_remaining} 回合完成`,
            task
        };
    },

    /**
     * 檢查清洗任務的輸入條件
     */
    checkCleaningInput(player, taskType, amount) {
        const config = window.DataConfig || {};
        const taskConfig = config.DATA_CLEANING?.[taskType];
        const inv = player.data_state?.inventory || {};

        switch (taskType) {
            case 'quality_upgrade':
                // 需要低品質數據
                const lowTotal = inv.legal_low + inv.gray_low;
                if (lowTotal < amount) {
                    return { sufficient: false, message: `低品質數據不足（現有 ${lowTotal}，需要 ${amount}）` };
                }
                break;
            case 'compliance_upgrade':
                // 需要灰色數據
                const grayTotal = inv.gray_high + inv.gray_low;
                if (grayTotal < amount) {
                    return { sufficient: false, message: `灰色數據不足（現有 ${grayTotal}，需要 ${amount}）` };
                }
                break;
            case 'diversity_merge':
                // 需要專精數據（暫時用 focused 類型）
                if (inv.legal_high_focused < amount) {
                    return { sufficient: false, message: `專精數據不足（現有 ${inv.legal_high_focused}，需要 ${amount}）` };
                }
                break;
        }

        return { sufficient: true };
    },

    /**
     * 扣除清洗任務的輸入數據
     */
    deductCleaningInput(player, taskType, amount) {
        const inv = player.data_state.inventory;

        switch (taskType) {
            case 'quality_upgrade':
                // 優先扣除合法低品質
                if (inv.legal_low >= amount) {
                    inv.legal_low -= amount;
                } else {
                    const remaining = amount - inv.legal_low;
                    inv.legal_low = 0;
                    inv.gray_low -= remaining;
                }
                break;
            case 'compliance_upgrade':
                // 優先扣除灰色高品質
                if (inv.gray_high >= amount) {
                    inv.gray_high -= amount;
                } else {
                    const remaining = amount - inv.gray_high;
                    inv.gray_high = 0;
                    inv.gray_low -= remaining;
                }
                break;
            case 'diversity_merge':
                inv.legal_high_focused -= amount;
                break;
        }
    },

    /**
     * 處理清洗任務進度（每回合調用）
     * @param {Object} player - 玩家狀態
     * @returns {Object} { player, completed_tasks, messages }
     */
    processCleaningTasks(player) {
        if (!player.data_state?.processing_tasks) {
            return { player, completed_tasks: [], messages: [] };
        }

        const completed = [];
        const messages = [];
        const config = window.DataConfig || {};

        player.data_state.processing_tasks = player.data_state.processing_tasks.filter(task => {
            task.turns_remaining--;

            if (task.turns_remaining <= 0) {
                // 任務完成，產出數據
                const taskConfig = config.DATA_CLEANING?.[task.type];
                this.applyCleaningOutput(player, task);
                completed.push(task);
                messages.push(`✅ ${taskConfig?.name || task.type} 完成！獲得 ${task.output_amount} 單位數據`);
                return false;  // 移除已完成任務
            }
            return true;
        });

        return { player, completed_tasks: completed, messages };
    },

    /**
     * 應用清洗任務產出
     */
    applyCleaningOutput(player, task) {
        const inv = player.data_state.inventory;

        switch (task.type) {
            case 'quality_upgrade':
                // 產出高品質合法數據
                inv.legal_high_broad += task.output_amount;
                break;
            case 'compliance_upgrade':
                // 產出合法數據（保留原品質）
                inv.legal_low += task.output_amount;
                // 降低合規風險
                player.compliance_risk = Math.max(0, (player.compliance_risk || 0) - 10);
                break;
            case 'diversity_merge':
                // 產出廣泛數據
                inv.legal_high_broad += task.output_amount;
                break;
        }

        this.syncLegacyData(player);
    },

    // ==========================================
    // 數據衰減處理
    // ==========================================

    /**
     * 預估下季衰減量
     * @param {Object} player - 玩家狀態
     * @returns {Object} 衰減預估
     */
    estimateDecay(player) {
        const config = window.DataConfig || {};
        const ds = player.data_state;
        
        if (!ds || !this.isFeatureUnlocked(player, 'decay')) {
            return { high_decay: 0, gray_risk: 0 };
        }

        const routeMod = config.ROUTE_MODIFIERS?.[player.route] || {};
        const decayMult = routeMod.decay_rate_modifier || 1.0;

        const inv = ds.inventory;
        const highTotal = inv.legal_high_broad + inv.legal_high_focused + inv.gray_high;
        const decayRate = config.DECAY?.high_quality?.rate || 0.10;
        const threshold = config.DECAY?.high_quality?.minimum_threshold || 10;

        const highDecay = highTotal > threshold 
            ? Math.floor(highTotal * decayRate * decayMult)
            : 0;

        const grayTotal = inv.gray_high + inv.gray_low;
        const grayRisk = grayTotal > 0;

        return {
            high_decay: highDecay,
            gray_risk: grayRisk,
            gray_total: grayTotal
        };
    },

    /**
     * 執行數據衰減（每回合結束調用）
     * @param {Object} player - 玩家狀態
     * @returns {Object} { player, messages }
     */
    processDecay(player) {
        const config = window.DataConfig || {};
        const messages = [];

        if (!this.isFeatureUnlocked(player, 'decay')) {
            return { player, messages };
        }

        player = this.initializePlayerDataState(player);
        const ds = player.data_state;
        const inv = ds.inventory;
        const routeMod = config.ROUTE_MODIFIERS?.[player.route] || {};
        const decayMult = routeMod.decay_rate_modifier || 1.0;

        // 高品質數據衰減
        const decayConfig = config.DECAY?.high_quality || {};
        const decayRate = (decayConfig.rate || 0.10) * decayMult;
        const threshold = decayConfig.minimum_threshold || 10;

        let totalDecayed = 0;

        // 各類高品質數據衰減
        ['legal_high_broad', 'legal_high_focused', 'gray_high'].forEach(type => {
            if (inv[type] > threshold) {
                const decay = Math.floor(inv[type] * decayRate);
                if (decay > 0) {
                    inv[type] -= decay;
                    // 降級為對應的低品質
                    const lowType = type.includes('gray') ? 'gray_low' : 'legal_low';
                    inv[lowType] += decay;
                    totalDecayed += decay;
                }
            }
        });

        if (totalDecayed > 0) {
            ds.statistics.total_decayed += totalDecayed;
            messages.push(`📉 ${totalDecayed} 單位高品質數據因過時而降級`);
        }

        // 灰色數據累積風險
        const grayTotal = inv.gray_high + inv.gray_low;
        if (grayTotal > 0) {
            const grayConfig = config.DECAY?.gray_data || {};
            const regAdd = grayConfig.regulation_per_turn || 2;
            player.regulation = Math.min(100, (player.regulation || 0) + regAdd);

            // 審計檢查
            const auditChance = (grayConfig.audit_chance_base || 0.05) + 
                (grayTotal / 100) * (grayConfig.audit_chance_per_100 || 0.02);
            
            if (Math.random() < auditChance) {
                const penalty = grayConfig.audit_penalty || {};
                player.compliance_risk = Math.min(100, (player.compliance_risk || 0) + (penalty.compliance_risk || 15));
                player.trust = Math.max(0, (player.trust || 0) - (penalty.trust_loss || 10));
                const fine = Math.floor(player.cash * (penalty.cash_fine_ratio || 0.05));
                player.cash -= fine;
                
                messages.push(`⚖️ 監管審計！發現灰色數據，罰款 $${fine}M，信任度下降`);
            }
        }

        // 同步舊系統
        this.syncLegacyData(player);

        return { player, messages };
    },

    // ==========================================
    // 數據消耗（研發使用）
    // ==========================================

    /**
     * 消耗數據進行研發
     * @param {Object} player - 玩家狀態
     * @param {number} amount - 需要消耗的數據量
     * @param {string} preferredQuality - 偏好品質 ('high', 'low', 'any')
     * @returns {Object} { success, player, consumed, efficiency, effects }
     */
    consumeDataForResearch(player, amount, preferredQuality = 'any') {
        player = this.initializePlayerDataState(player);
        const config = window.DataConfig || {};
        const ds = player.data_state;
        const inv = ds.inventory;

        // 消耗優先順序
        const priority = config.RESEARCH_CONSUMPTION?.priority || [
            'legal_high_broad', 'legal_high_focused', 'synthetic', 
            'legal_low', 'gray_high', 'gray_low'
        ];

        let remaining = amount;
        const consumed = {};
        let totalEfficiency = 0;
        let consumedCount = 0;
        const effects = { compliance_risk: 0, trust: 0 };

        // 按優先順序消耗
        for (const type of priority) {
            if (remaining <= 0) break;
            if (!inv[type] || inv[type] <= 0) continue;

            const toConsume = Math.min(remaining, inv[type]);
            inv[type] -= toConsume;
            consumed[type] = toConsume;
            remaining -= toConsume;
            consumedCount += toConsume;

            // 計算效率
            const typeConfig = config.DATA_TYPES?.[type];
            const quality = typeConfig?.quality || 'low';
            const qualityMult = config.RESEARCH_CONSUMPTION?.quality_multipliers?.[quality] || 1.0;
            totalEfficiency += toConsume * qualityMult;

            // 應用合規效果
            const compliance = typeConfig?.compliance || 'legal';
            const compEffects = config.RESEARCH_CONSUMPTION?.compliance_effects?.[compliance] || {};
            effects.compliance_risk += toConsume * (compEffects.compliance_risk || 0) / 10;
            effects.trust += toConsume * (compEffects.trust || 0) / 10;
        }

        // 計算平均效率
        const avgEfficiency = consumedCount > 0 ? totalEfficiency / consumedCount : 1.0;

        // 檢查是否消耗足夠
        if (remaining > 0) {
            return {
                success: false,
                message: `數據不足（還需要 ${remaining} 單位）`,
                consumed: {},
                efficiency: 0
            };
        }

        // 應用效果
        player.compliance_risk = Math.min(100, Math.max(0, (player.compliance_risk || 0) + effects.compliance_risk));
        player.trust = Math.min(100, Math.max(0, (player.trust || 0) + effects.trust));
        ds.statistics.total_consumed += consumedCount;

        // 同步舊系統
        this.syncLegacyData(player);

        return {
            success: true,
            player,
            consumed,
            efficiency: avgEfficiency,
            effects
        };
    },

    /**
     * 檢查是否有足夠數據
     * @param {Object} player - 玩家狀態
     * @param {number} amount - 需要的數據量
     * @returns {boolean}
     */
    hasEnoughData(player, amount) {
        const summary = this.getDataSummary(player);
        return summary.total >= amount;
    },

    // ==========================================
    // 社群數據整合
    // ==========================================

    /**
     * 處理社群產出的數據（與 CommunityEngine 整合）
     * @param {Object} player - 玩家狀態
     * @param {Object} communityOutput - 社群產出 { high_data, low_data }
     * @returns {Object} { player, added }
     */
    processCommunityDataOutput(player, communityOutput) {
        player = this.initializePlayerDataState(player);
        const config = window.DataConfig || {};
        const routeMod = config.ROUTE_MODIFIERS?.[player.route] || {};
        
        // 應用路線加成
        const communityBonus = routeMod.community_data_bonus || 1.0;
        const highData = Math.floor((communityOutput.high_data || 0) * communityBonus);
        const lowData = Math.floor((communityOutput.low_data || 0) * communityBonus);

        // 社群數據都是合法的
        player.data_state.inventory.legal_high_broad += highData;
        player.data_state.inventory.legal_low += lowData;
        player.data_state.statistics.total_acquired += highData + lowData;

        // 同步舊系統
        this.syncLegacyData(player);

        return {
            player,
            added: { high: highData, low: lowData }
        };
    },

    // ==========================================
    // 數據合約管理（Tier 2）
    // ==========================================

    /**
     * 簽訂數據訂閱合約
     * @param {Object} player - 玩家狀態
     * @param {string} dataType - 數據類型
     * @returns {Object} { success, player, message, contract }
     */
    signDataContract(player, dataType) {
        const config = window.DataConfig || {};
        const contractConfig = config.PURCHASE_OPTIONS?.contract;

        if (!contractConfig) {
            return { success: false, message: '合約配置未載入' };
        }

        if (!this.isFeatureUnlocked(player, 'contracts')) {
            return { success: false, message: '需要達成 Tier 2 里程碑解鎖此功能' };
        }

        if (!contractConfig.available_types?.includes(dataType)) {
            return { success: false, message: '此類型數據不支援合約訂閱' };
        }

        const typeConfig = config.DATA_TYPES?.[dataType];
        const unitPrice = (typeConfig?.base_price || 1) * (contractConfig.price_multiplier || 0.7);
        const perTurnCost = unitPrice * (contractConfig.delivery_per_turn || 50);
        const totalCost = perTurnCost * (contractConfig.duration || 4);

        // 檢查首期付款
        if (player.cash < perTurnCost) {
            return { success: false, message: `現金不足（首期需要 $${perTurnCost.toFixed(1)}M）` };
        }

        player = this.initializePlayerDataState(player);
        player.cash -= perTurnCost;

        const contract = {
            id: `contract_${Date.now()}`,
            data_type: dataType,
            delivery_per_turn: contractConfig.delivery_per_turn || 50,
            cost_per_turn: perTurnCost,
            turns_remaining: contractConfig.duration || 4,
            started_turn: player.turn_count || 0
        };

        player.data_state.contracts.push(contract);

        // 首期交付
        player.data_state.inventory[dataType] += contract.delivery_per_turn;
        player.data_state.statistics.total_acquired += contract.delivery_per_turn;

        this.syncLegacyData(player);

        return {
            success: true,
            player,
            message: `簽訂了 ${contractConfig.duration} 季的 ${typeConfig?.name} 訂閱合約`,
            contract
        };
    },

    /**
     * 處理合約交付（每回合調用）
     * @param {Object} player - 玩家狀態
     * @returns {Object} { player, deliveries, expired, messages }
     */
    processContracts(player) {
        if (!player.data_state?.contracts?.length) {
            return { player, deliveries: [], expired: [], messages: [] };
        }

        const deliveries = [];
        const expired = [];
        const messages = [];

        player.data_state.contracts = player.data_state.contracts.filter(contract => {
            contract.turns_remaining--;

            // 嘗試扣款
            if (player.cash >= contract.cost_per_turn) {
                player.cash -= contract.cost_per_turn;
                player.data_state.inventory[contract.data_type] += contract.delivery_per_turn;
                player.data_state.statistics.total_acquired += contract.delivery_per_turn;
                deliveries.push(contract);
                messages.push(`📦 合約交付: ${contract.delivery_per_turn} 單位數據`);
            } else {
                // 付款失敗，合約終止
                messages.push(`⚠️ 合約付款失敗，合約提前終止`);
                return false;
            }

            if (contract.turns_remaining <= 0) {
                expired.push(contract);
                messages.push(`📋 數據合約到期`);
                return false;
            }

            return true;
        });

        this.syncLegacyData(player);

        return { player, deliveries, expired, messages };
    },

    // ==========================================
    // 輔助函數
    // ==========================================

    /**
     * 同步新系統到舊的 high_data/low_data（向後兼容）
     * @param {Object} player - 玩家狀態
     */
    syncLegacyData(player) {
        const summary = this.getDataSummary(player);
        player.high_data = summary.high_data;
        player.low_data = summary.low_data;
    },

    /**
     * 取得數據類型配置
     * @param {string} typeId - 數據類型ID
     * @returns {Object|null}
     */
    getDataTypeConfig(typeId) {
        const config = window.DataConfig || {};
        return config.DATA_TYPES?.[typeId] || null;
    },

    /**
     * 取得可用的數據來源
     * @param {Object} player - 玩家狀態
     * @returns {Array} 可用來源列表
     */
    getAvailableSources(player) {
        const config = window.DataConfig || {};
        const tier = player.mp_tier || 0;
        const routeMod = config.ROUTE_MODIFIERS?.[player.route] || {};

        return Object.entries(config.DATA_SOURCES || {})
            .filter(([id, source]) => {
                if (source.unlock_tier > tier) return false;
                if (id === 'scraping' && routeMod.gray_data_forbidden) return false;
                return true;
            })
            .map(([id, source]) => ({ id, ...source }));
    },

    /**
     * 取得可用的合成方法
     * @param {Object} player - 玩家狀態
     * @returns {Array} 可用方法列表
     */
    getAvailableSynthesisMethods(player) {
        const config = window.DataConfig || {};
        const assetConfig = window.AssetCardConfig || {};
        // MP 不再作為解鎖條件，純粹依靠升級等級
        
        // 獲取當前升級等級
        const upgrades = player.asset_upgrades || player.upgrades || {};
        const synthesisLevel = upgrades.data?.synthesis || 0;
        
        // 如果未升級，返回空列表
        if (synthesisLevel === 0) {
            return [];
        }
        
        // 從 AssetCardConfig 獲取該等級解鎖的方法
        const synthesisPath = assetConfig.DATA_UPGRADES?.synthesis;
        const levelConfig = synthesisPath?.levels?.find(l => l.level === synthesisLevel);
        const unlockedMethods = levelConfig?.unlocks_methods || [];

        return Object.entries(config.SYNTHESIS_METHODS || {})
            .filter(([id, method]) => {
                // 檢查是否在解鎖列表中
                if (unlockedMethods.includes(id)) {
                    return true;  // 修復：在解鎖列表中時返回 true
                }
                // 特例：differential 需要額外研究且需 Lv3
                if (id === 'differential' && synthesisLevel >= 3) {
                    if (method.unlock_research) {
                        return player.unlocked_research?.includes(method.unlock_research);
                    }
                }
                return false;
            })
            .map(([id, method]) => ({ id, ...method }));
    }
};

// 導出到全局
window.DataEngine = DataEngine;

console.log('✓ Data Engine loaded');
