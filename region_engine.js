// ============================================
// 區域系統引擎 (Region Engine)
// ============================================
// 設計原則：
//   1. 純函數式設計，無副作用
//   2. 接收數據參數，返回計算結果
//   3. 不直接操作 DOM 或 UI 狀態
// ============================================

const RegionEngine = {
    
    // ==========================================
    // 初始化區域狀態
    // ==========================================
    
    /**
     * 建立初始區域狀態
     * @returns {Object} 初始狀態
     */
    createInitialState: function() {
        const config = window.RegionConfig;
        if (!config) {
            console.error('RegionConfig not found');
            return null;
        }
        
        const regions = {};
        Object.keys(config.REGIONS).forEach(regionId => {
            const regionConfig = config.getRegion(regionId);
            regions[regionId] = {
                unlocked: regionConfig.is_home,     // 母國預設解鎖
                offices: regionConfig.is_home ? [{
                    level: 'regional_hq',
                    established_turn: 0
                }] : [],
                assigned_assets: [],                 // 派駐的部門/子公司
                pending_applications: [],            // 進行中的申請
                local_score: regionConfig.is_home ? 100 : 0,
                events_history: [],
                competitor_presence: 0               // 對手在此區的存在度
            };
        });
        
        return {
            regions: regions,
            active_applications: [],
            global_expansion_count: 0,
            turn_updated: 0
        };
    },
    
    // ==========================================
    // 評分計算核心
    // ==========================================
    
    /**
     * 計算單一維度的原始分數
     * @param {string} dimensionId - 維度ID
     * @param {Object} playerState - 玩家狀態
     * @returns {number} 原始分數 (0-100)
     */
    calculateDimensionScore: function(dimensionId, playerState) {
        const config = window.RegionConfig;
        const dimension = config.getDimension(dimensionId);
        if (!dimension) return 0;
        
        // 信用評級字串轉數值的映射
        const CREDIT_RATING_VALUES = {
            'AAA': 100, 'AA': 90, 'A': 80, 'BBB': 70,
            'BB': 55, 'B': 40, 'CCC': 25, 'CC': 15, 'C': 10, 'D': 0
        };
        
        let score = 0;
        
        switch (dimensionId) {
            case 'finance':
                // 現金 + 信用評級 + 營收
                const cash = playerState.cash || 0;
                // 將信用評級字串轉換為數值
                const creditRatingStr = playerState.credit_rating || 'BBB';
                const creditRatingValue = CREDIT_RATING_VALUES[creditRatingStr] || 70;
                // 也考慮季度營收
                const revenue = playerState.revenue || 0;
                // cash/20 最高50分, creditRating/2 最高50分
                score = Math.min(100, (cash / 20) + (creditRatingValue * 0.4) + (revenue / 10));
                break;
                
            case 'tech':
                // MP + 里程碑 + 技術等級
                const mp = playerState.mp || 0;
                // 支援多種里程碑存儲格式
                let milestones = 0;
                if (typeof playerState.milestones_achieved === 'number') {
                    milestones = playerState.milestones_achieved;
                } else if (playerState.mp_milestones) {
                    milestones = Object.values(playerState.mp_milestones).filter(v => v === true).length;
                }
                const techLevel = playerState.tech_level || playerState.mp_tier || 1;
                score = Math.min(100, (mp / 5) + (milestones * 8) + (techLevel * 15));
                break;
                
            case 'market':
                // 社群規模 + 熱度 + 產品滿意度
                const communitySize = playerState.community_size || 
                    (playerState.community && playerState.community.size) || 0;
                const hype = playerState.hype || 0;
                // 從產品系統獲取產品滿意度
                const productState = playerState.product_state || {};
                const productFulfillment = (productState.product_fulfillment || 1.0) * 100;
                score = Math.min(100, (communitySize / 500) + (hype * 0.6) + (productFulfillment * 0.2));
                break;
                
            case 'scale':
                // 職能部門 + 職能子公司 + 事業單位
                // 支援新舊屬性名
                const funcDepts = (playerState.functional_depts || playerState.departments || []).length;
                const funcSubs = (playerState.functional_subsidiaries || playerState.subsidiaries || []).length;
                // business_units 是物件，需要計算鍵數量
                const businessUnits = playerState.business_units ? 
                    Object.keys(playerState.business_units).length : 0;
                // 也計算產品系統中的完成產品數
                const pState = playerState.product_state || {};
                const completedProducts = (pState.completed || []).length;
                score = Math.min(100, (funcDepts * 10) + (funcSubs * 18) + (businessUnits * 12) + (completedProducts * 3));
                break;
                
            case 'safety':
                // 對齊度 + 信任度 + 合規風險(反向) + 熵值(反向)
                const alignment = playerState.alignment || 0;
                const trust = playerState.trust || 50;
                const complianceRisk = playerState.compliance_risk || 0;
                const entropy = playerState.entropy || 5;
                // 低熵值和低合規風險會增加安全分數
                score = Math.min(100, (alignment * 0.4) + (trust * 0.5) + 
                    ((100 - complianceRisk) * 0.05) + ((100 - entropy) * 0.05));
                break;
                
            case 'local':
                // 由區域狀態計算，這裡返回 0，實際計算在 calculateRegionScore
                score = 0;
                break;
        }
        
        // 確保返回有效數字
        score = isNaN(score) ? 0 : score;
        return Math.round(score * 10) / 10;
    },
    
    /**
     * 計算在地連結分數
     * @param {Object} regionState - 區域狀態
     * @param {string} regionId - 區域ID
     * @returns {number} 在地連結分數 (0-100)
     */
    calculateLocalScore: function(regionState, regionId) {
        const config = window.RegionConfig;
        
        if (!regionState || !regionState.offices) return 0;
        
        let score = 0;
        
        // 辦公室加成
        regionState.offices.forEach(office => {
            const officeConfig = config.getOfficeLevel(office.level);
            if (officeConfig) {
                score += officeConfig.local_bonus;
            }
        });
        
        // 已派駐資產加成
        score += (regionState.assigned_assets || []).length * 5;
        
        // 時間累積加成（每在此區一回合 +0.5，上限 20）
        const presenceTurns = regionState.presence_turns || 0;
        score += Math.min(20, presenceTurns * 0.5);
        
        return Math.min(100, score);
    },
    
    /**
     * 計算玩家對特定區域的准入評分
     * @param {string} regionId - 區域ID
     * @param {Object} playerState - 玩家狀態
     * @param {Object} regionSystemState - 區域系統狀態
     * @param {Object} marketState - 全球市場狀態
     * @param {Object} options - 額外選項
     * @returns {Object} 評分結果
     */
    calculateRegionScore: function(regionId, playerState, regionSystemState, marketState, options = {}) {
        const config = window.RegionConfig;
        const region = config.getRegion(regionId);
        
        if (!region) {
            return { score: 0, breakdown: {}, eligible: false, reason: '無效區域' };
        }
        
        // 母國不需評分
        if (region.is_home) {
            return { 
                score: 100, 
                breakdown: {}, 
                eligible: true, 
                reason: '母國區域',
                threshold: 0
            };
        }
        
        const weights = region.scoring_weights;
        const breakdown = {};
        let totalScore = 0;
        
        // 1. 計算各維度分數
        config.getAllDimensionIds().forEach(dimId => {
            if (dimId === 'local') {
                // 在地連結特殊處理
                const regionState = regionSystemState.regions[regionId];
                breakdown[dimId] = {
                    raw: this.calculateLocalScore(regionState, regionId),
                    weight: weights[dimId],
                    weighted: 0
                };
            } else {
                breakdown[dimId] = {
                    raw: this.calculateDimensionScore(dimId, playerState),
                    weight: weights[dimId],
                    weighted: 0
                };
            }
            breakdown[dimId].weighted = breakdown[dimId].raw * breakdown[dimId].weight;
            totalScore += breakdown[dimId].weighted;
        });
        
        // 2. 技術路線親和度加成
        const routeId = playerState.route || playerState.selected_route;
        const routeAffinity = config.getRouteAffinity(routeId, regionId);
        if (routeAffinity !== 0) {
            breakdown.route_affinity = {
                route: routeId,
                bonus: routeAffinity
            };
            totalScore += routeAffinity;
        }
        
        // 3. 欲派駐資產親和度加成（支援兩條路線）
        if (options.targetAsset) {
            const assetLine = options.targetAsset.line;  // 'business' 或 'functional'
            const assetType = options.targetAsset.type;  // 'depts' 或 'subsidiaries'
            const assetId = options.targetAsset.id;
            
            let assetAffinity = 0;
            
            if (assetLine === 'business') {
                // 事業線：根據技術路線計算親和度
                const routeId = options.targetAsset.routeId || playerState.route;
                assetAffinity = config.getBusinessAffinity(routeId, regionId);
            } else if (assetLine === 'functional') {
                // 職能線：根據職能部/子公司ID計算親和度
                assetAffinity = config.getFunctionalAffinity(assetType, assetId, regionId);
            } else {
                // 向後兼容：舊的 departments/subsidiaries 格式
                assetAffinity = config.getAssetAffinity(assetType, assetId, regionId);
            }
            
            if (assetAffinity !== 0) {
                breakdown.asset_affinity = {
                    line: assetLine || 'legacy',
                    asset: assetId,
                    bonus: assetAffinity
                };
                totalScore += assetAffinity;
            }
        }
        
        // 4. 全球指數修正
        if (marketState && marketState.indices) {
            const indexModifiers = this.calculateIndexModifiers(regionId, marketState);
            if (indexModifiers.total !== 0) {
                breakdown.index_modifiers = indexModifiers;
                totalScore += indexModifiers.total;
            }
        }
        
        // 5. 競爭者存在度修正
        const regionState = regionSystemState.regions[regionId];
        if (regionState && regionState.competitor_presence > 0) {
            const competitorPenalty = -regionState.competitor_presence * 2;
            breakdown.competitor_penalty = competitorPenalty;
            totalScore += competitorPenalty;
        }
        
        totalScore = Math.round(totalScore * 10) / 10;
        
        // 6. 計算動態門檻
        const threshold = this.calculateDynamicThreshold(regionId, marketState, regionSystemState);
       
        
        // 7. 判定是否達標
        const eligible = totalScore >= threshold;
        
        return {
            score: totalScore,
            breakdown: breakdown,
            eligible: eligible,
            threshold: threshold,
            margin: totalScore - threshold,
            reason: eligible ? '符合准入條件' : `分數不足 (差 ${(threshold - totalScore).toFixed(1)} 分)`
        };
    },
    
    /**
     * 計算全球指數對區域門檻的修正
     * @param {string} regionId - 區域ID
     * @param {Object} marketState - 市場狀態
     * @returns {Object} 修正值
     */
    calculateIndexModifiers: function(regionId, marketState) {
        const config = window.RegionConfig;
        const modifiers = config.INDEX_THRESHOLD_MODIFIERS;
        
        let total = 0;
        const details = {};
        
        Object.entries(modifiers).forEach(([indexId, indexMod]) => {
            const regionMod = indexMod.affected_regions[regionId];
            if (!regionMod) return;
            
            const indexValue = marketState.indices[indexId]?.value || 100;
            const deviation = (indexValue - 100) / 100; // -0.8 到 +1.0
            
            if (regionMod.direct) {
                // 直接修正
                const mod = deviation * regionMod.direct * 100;
                details[indexId] = mod;
                total += mod;
            } else if (regionMod.weight && regionMod.factor) {
                // 權重修正（影響特定維度的有效權重）
                const mod = deviation * regionMod.factor * 100;
                details[indexId] = mod;
                total += mod;
            }
        });
        
        return {
            total: Math.round(total * 10) / 10,
            details: details
        };
    },
    
    /**
     * 計算動態門檻
     * @param {string} regionId - 區域ID
     * @param {Object} marketState - 市場狀態
     * @param {Object} regionSystemState - 區域系統狀態
     * @returns {number} 動態門檻
     */
    calculateDynamicThreshold: function(regionId, marketState, regionSystemState) {
        const config = window.RegionConfig;
        const region = config.getRegion(regionId);
        
        if (!region || region.is_home) return 0;
        
        let threshold = region.base_threshold;
        
        // 全球指數影響
        if (marketState && marketState.indices) {
            // 市場信心低時，所有門檻上升
            const confidence = marketState.indices.market_confidence?.value || 100;
            if (confidence < 80) {
                threshold += (80 - confidence) * 0.1;
            }
        }
        
        // 競爭者擁擠度
        const regionState = regionSystemState?.regions?.[regionId];
        if (regionState && regionState.competitor_presence > 3) {
            threshold += (regionState.competitor_presence - 3) * 3;
        }
        
        return Math.round(threshold * 10) / 10;
    },
    
    // ==========================================
    // 審批時間計算
    // ==========================================
    
    /**
     * 計算審批所需時間
     * @param {string} regionId - 區域ID
     * @param {number} playerScore - 玩家分數
     * @param {number} threshold - 門檻分數
     * @returns {Object} 審批資訊
     */
    calculateApprovalTime: function(regionId, playerScore, threshold) {
        const config = window.RegionConfig;
        const region = config.getRegion(regionId);
        
        if (!region) return { turns: 0, type: 'error' };
        if (region.is_home) return { turns: 0, type: 'home' };
        
        const baseTime = region.approval_turns;
        const ratio = playerScore / threshold;
        
        let turns = baseTime;
        let type = 'normal';
        
        if (ratio >= config.SYSTEM.fast_track_threshold) {
            // 快速通道
            turns = Math.max(1, baseTime - 2);
            type = 'fast_track';
        } else if (ratio < config.SYSTEM.extended_review_threshold) {
            // 延長審查
            turns = baseTime + 2;
            type = 'extended';
        }
        
        return {
            turns: turns,
            type: type,
            base_time: baseTime,
            ratio: Math.round(ratio * 100) / 100
        };
    },
    
    // ==========================================
    // 區域營運效果計算
    // ==========================================
    
    /**
     * 計算區域對資產的營運修正
     * @param {string} regionId - 區域ID
     * @param {Object} asset - 資產配置
     * @param {Object} marketState - 市場狀態
     * @returns {Object} 營運修正值
     */
    calculateOperationModifiers: function(regionId, asset, marketState) {
        const config = window.RegionConfig;
        const region = config.getRegion(regionId);
        
        if (!region) return this.getDefaultModifiers();
        
        const chars = region.characteristics;
        const modifiers = {
            energy_cost: chars.energy_cost_mult || 1,
            compute_cost: chars.compute_cost_mult || 1,
            talent_cost: chars.talent_cost_mult || 1,
            revenue_mult: 1,
            risk_mult: 1
        };
        
        // 應用區域優勢
        (region.advantages || []).forEach(adv => {
            this.applyAdvantageModifier(modifiers, adv, asset);
        });
        
        // 應用區域劣勢
        (region.disadvantages || []).forEach(disadv => {
            this.applyDisadvantageModifier(modifiers, disadv, asset);
        });
        
        // 應用全球指數影響
        if (marketState && marketState.indices) {
            const marketEngine = window.GlobalMarketEngine;
            if (marketEngine) {
                const costMults = marketEngine.getCostMultipliers(marketState);
                modifiers.energy_cost *= costMults.power;
                modifiers.compute_cost *= costMults.compute;
            }
        }
        
        // 資產與區域的特殊協同
        const specialBonus = this.calculateSpecialSynergy(regionId, asset);
        if (specialBonus) {
            Object.assign(modifiers, specialBonus);
        }
        
        return modifiers;
    },
    
    /**
     * 取得預設修正值
     */
    getDefaultModifiers: function() {
        return {
            energy_cost: 1,
            compute_cost: 1,
            talent_cost: 1,
            revenue_mult: 1,
            risk_mult: 1
        };
    },
    
    /**
     * 應用優勢修正
     */
    applyAdvantageModifier: function(modifiers, advantage, asset) {
        switch (advantage.type) {
            case 'energy_cost':
                modifiers.energy_cost *= advantage.value;
                break;
            case 'labor_cost':
                modifiers.talent_cost *= advantage.value;
                break;
            case 'supply_chain':
                modifiers.compute_cost *= advantage.value;
                break;
            case 'market_growth':
            case 'blue_ocean':
                modifiers.revenue_mult *= advantage.value;
                break;
            case 'stability':
            case 'no_extreme_events':
                modifiers.risk_mult *= advantage.value;
                break;
        }
    },
    
    /**
     * 應用劣勢修正
     */
    applyDisadvantageModifier: function(modifiers, disadvantage, asset) {
        switch (disadvantage.type) {
            case 'energy_competition':
                modifiers.energy_cost *= disadvantage.value;
                break;
            case 'talent_war':
            case 'talent_import':
                modifiers.talent_cost *= disadvantage.value;
                break;
            case 'regulatory_cost':
            case 'infrastructure_gap':
            case 'infrastructure_poor':
                modifiers.revenue_mult /= disadvantage.value;
                break;
            case 'geopolitical_risk':
            case 'political_instability':
            case 'currency_risk':
                modifiers.risk_mult *= disadvantage.value;
                break;
        }
    },
    
    /**
     * 計算區域特殊機制與資產的協同效果
     */
    calculateSpecialSynergy: function(regionId, asset) {
        const config = window.RegionConfig;
        const special = config.getRegionSpecial(regionId);
        
        if (!special || !asset) return null;
        
        const bonuses = {};
        
        switch (special.type) {
            case 'gdpr_zone':
                // 歐洲：隱私技術部門加成
                if (asset.id === 'privacy_tech' || asset.id === 'privacy_subsidiary') {
                    bonuses.revenue_mult = 1.2;
                    bonuses.trust_bonus = 5;
                }
                break;
                
            case 'supply_chain_hub':
                // 東亞：硬體相關加成
                if (asset.id === 'hardware_design' || asset.id === 'hardware_subsidiary') {
                    bonuses.compute_cost = 0.8;
                    bonuses.production_speed = 1.3;
                }
                break;
                
            case 'energy_haven':
                // 中東：能源部門大幅減免
                if (['energy_trading', 'green_energy', 'energy_subsidiary', 'green_subsidiary'].includes(asset.id)) {
                    bonuses.energy_cost = 0.3;
                    bonuses.revenue_mult = 1.3;
                }
                break;
                
            case 'safe_haven':
                // 澳洲：穩定度加成
                bonuses.risk_mult = 0.5;
                break;
                
            case 'growth_engine':
                // 東南亞：用戶成長加成
                if (['cloud_services', 'cloud_subsidiary', 'synthetic_data'].includes(asset.id)) {
                    bonuses.user_growth = 1.4;
                    bonuses.revenue_mult = 1.2;
                }
                break;
                
            case 'frontier_market':
                // 拉美非洲：ESG專案加成
                if (['green_energy', 'green_subsidiary'].includes(asset.id)) {
                    bonuses.esg_bonus = 20;
                    bonuses.revenue_mult = 1.5;
                }
                break;
        }
        
        return Object.keys(bonuses).length > 0 ? bonuses : null;
    },

    // ==========================================
    // 區域進入行動
    // ==========================================
    
    /**
     * 建立聯絡處（快速進入，需要資金）
     * @param {Object} playerState - 玩家狀態
     * @param {string} regionId - 區域ID
     * @returns {Object} 執行結果
     */
    establishLiaison: function(playerState, regionId) {
        console.log("🌍 [RegionEngine] establishLiaison called:", { regionId, playerCash: playerState?.cash });
        const config = window.RegionConfig;
        const region = config.getRegion(regionId);
        
        if (!region) {
            return { success: false, message: '無效區域' };
        }
        
        if (region.is_home) {
            return { success: false, message: '無法在母國建立聯絡處' };
        }
        
        // 檢查評分資格
        const regionSystemState = playerState.region_system || this.createInitialState();
        const scoreResult = this.calculateRegionScore(regionId, playerState, regionSystemState, playerState.global_market);
        
        if (!scoreResult.eligible) {
            return { 
                success: false, 
                message: `評分未達門檻（${scoreResult.score.toFixed(1)}/${scoreResult.threshold}）` 
            };
        }
        
        // 檢查是否已有辦公室
        const regionState = regionSystemState.regions[regionId];
        if (regionState && regionState.offices && regionState.offices.length > 0) {
            return { success: false, message: '該區域已有據點' };
        }
        
        // 檢查資金
        const liaisonConfig = config.OFFICE_LEVELS.liaison;
        const setupCost = liaisonConfig.setup_cost || 20;
        
        if (playerState.cash < setupCost) {
            return { 
                success: false, 
                message: `資金不足，需要 $${setupCost}M` 
            };
        }
        
        // 執行建立
        const newPlayer = JSON.parse(JSON.stringify(playerState));
        newPlayer.cash -= setupCost;
        
        // 確保 region_system 存在
        if (!newPlayer.region_system) {
            newPlayer.region_system = this.createInitialState();
        }
        
        // 更新區域狀態
        const newRegionState = newPlayer.region_system.regions[regionId];
        newRegionState.unlocked = true;
        newRegionState.offices = [{
            level: 'liaison',
            established_turn: playerState.turn_count || 1
        }];
        
        newPlayer.region_system.global_expansion_count++;
        
        return {
            success: true,
            newState: newPlayer,
            message: `📍 已在 ${region.icon} ${region.name} 建立聯絡處（-$${setupCost}M）`
        };
    },
    
    /**
     * 提交營運申請（需要審批時間）
     * @param {Object} playerState - 玩家狀態
     * @param {string} regionId - 區域ID
     * @returns {Object} 執行結果
     */
    submitApplication: function(playerState, regionId) {
        const config = window.RegionConfig;
        const region = config.getRegion(regionId);
        
        if (!region) {
            return { success: false, message: '無效區域' };
        }
        
        if (region.is_home) {
            return { success: false, message: '無法在母國申請' };
        }
        
        // 檢查評分資格
        const regionSystemState = playerState.region_system || this.createInitialState();
        const scoreResult = this.calculateRegionScore(regionId, playerState, regionSystemState, playerState.global_market);
        
        if (!scoreResult.eligible) {
            return { 
                success: false, 
                message: `評分未達門檻（${scoreResult.score.toFixed(1)}/${scoreResult.threshold}）` 
            };
        }
        
        // 檢查是否已有辦公室
        const regionState = regionSystemState.regions[regionId];
        if (regionState && regionState.offices && regionState.offices.length > 0) {
            return { success: false, message: '該區域已有據點' };
        }
        
        // 檢查是否已有進行中的申請
        if (regionState && regionState.pending_applications && regionState.pending_applications.length > 0) {
            return { success: false, message: '該區域已有進行中的申請' };
        }
        
        // 檢查同時申請數量上限
        const maxConcurrent = config.SYSTEM.max_concurrent_applications || 2;
        let totalPending = 0;
        Object.values(regionSystemState.regions).forEach(rs => {
            totalPending += (rs.pending_applications || []).length;
        });
        if (totalPending >= maxConcurrent) {
            return { 
                success: false, 
                message: `同時進行的申請數已達上限（${maxConcurrent}）` 
            };
        }
        
        // 計算審批時間
        const approvalTime = this.calculateApprovalTime(regionId, scoreResult.score, scoreResult.threshold);
        
        // 執行申請
        const newPlayer = JSON.parse(JSON.stringify(playerState));
        
        // 確保 region_system 存在
        if (!newPlayer.region_system) {
            newPlayer.region_system = this.createInitialState();
        }
        
        // 添加待審批申請
        const newRegionState = newPlayer.region_system.regions[regionId];
        if (!newRegionState.pending_applications) {
            newRegionState.pending_applications = [];
        }
        
        newRegionState.pending_applications.push({
            type: 'operation_license',
            submitted_turn: playerState.turn_count || 1,
            remaining_turns: approvalTime.turns,
            approval_type: approvalTime.type
        });
        
        return {
            success: true,
            newState: newPlayer,
            message: `📝 已向 ${region.icon} ${region.name} 提交營運申請（審批需 ${approvalTime.turns} 回合）`
        };
    },
    
    // ==========================================
    // 狀態更新
    // ==========================================
    
    /**
     * 處理回合結束時的區域狀態更新
     * @param {Object} regionSystemState - 區域系統狀態
     * @param {number} turn - 當前回合
     * @returns {Object} 更新後的狀態
     */
    processTurnEnd: function(regionSystemState, turn) {
        const newState = JSON.parse(JSON.stringify(regionSystemState));
        
        // 更新各區域
        Object.keys(newState.regions).forEach(regionId => {
            const regionState = newState.regions[regionId];
            
            // 累積存在時間
            if (regionState.offices.length > 0) {
                regionState.presence_turns = (regionState.presence_turns || 0) + 1;
            }
            
            // 處理進行中的申請
            regionState.pending_applications = regionState.pending_applications
                .map(app => ({
                    ...app,
                    remaining_turns: app.remaining_turns - 1
                }))
                .filter(app => {
                    if (app.remaining_turns <= 0) {
                        // 申請完成，加入已派駐資產
                        regionState.assigned_assets.push(app.asset);
                        return false;
                    }
                    return true;
                });
        });
        
        newState.turn_updated = turn;
        
        return newState;
    },
    
    // ==========================================
    // 查詢與分析
    // ==========================================
    
    /**
     * 取得玩家可擴張的區域列表
     * @param {Object} playerState - 玩家狀態
     * @param {Object} regionSystemState - 區域系統狀態
     * @param {Object} marketState - 市場狀態
     * @returns {Array} 可擴張區域資訊
     */
    getExpansionOptions: function(playerState, regionSystemState, marketState) {
        const config = window.RegionConfig;
        const options = [];
        
        config.getExpansionRegions().forEach(region => {
            const scoreResult = this.calculateRegionScore(
                region.id, 
                playerState, 
                regionSystemState, 
                marketState
            );
            
            const regionState = regionSystemState.regions[region.id];
            const hasOffice = regionState && regionState.offices.length > 0;
            
            options.push({
                id: region.id,
                name: region.name,
                icon: region.icon,
                score: scoreResult.score,
                threshold: scoreResult.threshold,
                eligible: scoreResult.eligible,
                margin: scoreResult.margin,
                has_office: hasOffice,
                approval_time: this.calculateApprovalTime(
                    region.id, 
                    scoreResult.score, 
                    scoreResult.threshold
                ),
                characteristics: region.characteristics,
                special: region.special
            });
        });
        
        // 按分數差距排序
        return options.sort((a, b) => b.margin - a.margin);
    },
    
    /**
     * 取得區域摘要資訊
     * @param {string} regionId - 區域ID
     * @param {Object} regionSystemState - 區域系統狀態
     * @returns {Object} 區域摘要
     */
    getRegionSummary: function(regionId, regionSystemState) {
        const config = window.RegionConfig;
        const region = config.getRegion(regionId);
        const regionState = regionSystemState?.regions?.[regionId];
        
        if (!region) return null;
        
        return {
            id: region.id,
            name: region.name,
            icon: region.icon,
            description: region.description,
            is_home: region.is_home,
            unlocked: regionState?.unlocked || false,
            offices: regionState?.offices || [],
            assigned_assets: regionState?.assigned_assets || [],
            pending_applications: regionState?.pending_applications || [],
            local_score: this.calculateLocalScore(regionState, regionId),
            advantages: region.advantages,
            disadvantages: region.disadvantages,
            special: region.special
        };
    },
    
    /**
     * 取得全球布局總覽
     * @param {Object} regionSystemState - 區域系統狀態
     * @returns {Object} 全球布局資訊
     */
    getGlobalOverview: function(regionSystemState) {
        const config = window.RegionConfig;
        
        const overview = {
            total_regions: Object.keys(config.REGIONS).length,
            unlocked_regions: 0,
            total_offices: 0,
            total_assets_deployed: 0,
            pending_applications: 0,
            regions: {}
        };
        
        Object.keys(config.REGIONS).forEach(regionId => {
            const regionState = regionSystemState.regions[regionId];
            const summary = this.getRegionSummary(regionId, regionSystemState);
            
            if (summary.unlocked) overview.unlocked_regions++;
            overview.total_offices += summary.offices.length;
            overview.total_assets_deployed += summary.assigned_assets.length;
            overview.pending_applications += summary.pending_applications.length;
            
            overview.regions[regionId] = summary;
        });
        
        return overview;
    }
};

// ==========================================
// 全局暴露
// ==========================================
if (typeof window !== 'undefined') {
    window.RegionEngine = RegionEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegionEngine;
}

console.log('✓ Region Engine loaded');
