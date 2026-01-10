// ============================================
// 資產執行引擎
// ============================================

/**
 * 執行資產管理行動
 * @param {Object} player - 玩家狀態
 * @param {string} actionId - 資產行動ID
 * @param {Object} params - 行動參數
 * @param {Object} globalParams - 全局參數（可選，用於價格計算）
 * @returns {Object} 結果對象，包含新玩家狀態和訊息
 */
function executeAssetAction(player, actionId, params = {}, globalParams = { P_GPU: 1.0 }) {
    // 深拷貝玩家狀態
    let newPlayer = JSON.parse(JSON.stringify(player));
    let message = '';
    let messageType = 'info';
    
    const { COSTS } = GameConfig;
    
    // 初始化必要的狀態
    if (!newPlayer.talent) {
        newPlayer.talent = { turing: 0, senior: 0, junior: 0 };
    }
    if (!newPlayer.tech_levels) {
        newPlayer.tech_levels = {
            "Scaling Law": 0, "Multimodal": 0, "Efficiency": 0,
            "Embodied": 0, "OpenSource": 0, "Military": 0
        };
    }
    
    // 根據行動類型處理
    switch (actionId) {
        case 'buyPflops': {
            const quantity = parseFloat(params.quantity || 0);
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定有效的購買數量',
                    type: 'warning'
                };
            }
            
            // 計算成本（考慮GPU價格指數）
            const unitPrice = COSTS.PFLOPS_UNIT_PRICE * globalParams.P_GPU;
            const totalCost = quantity * unitPrice;
            
            if (newPlayer.cash < totalCost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${totalCost.toFixed(1)}M (${quantity} × $${unitPrice.toFixed(1)}M)`,
                    type: 'danger'
                };
            }
            
            newPlayer.cash -= totalCost;
            newPlayer.pflops += quantity;
            
            // 購買算力可能增加炒作度
            newPlayer.hype = Math.min(200, (newPlayer.hype || 0) + quantity * 0.5);
            
            message = `採購 ${quantity} PFLOPS！花費 $${totalCost.toFixed(1)}M`;
            messageType = 'success';
            break;
        }
        
        case 'rentCloud': {
            const quantity = parseFloat(params.quantity || 0);
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定有效的租賃數量',
                    type: 'warning'
                };
            }
            newPlayer.cloud_pflops += quantity;
            
            // 雲端租賃增加靈活性（但成本在季度財務中計算）
            message = `租賃雲端算力 +${quantity} PFLOPS`;
            messageType = 'info';
            break;
        }  
            
        case 'cancelCloud': {
            const quantity = parseFloat(params.quantity || 0);
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定有效的解約數量',
                    type: 'warning'
                };
            }
            newPlayer.cloud_pflops -= quantity;
            
            // 解約雲端租賃（季度財務成本下降）
            message = `解租雲端算力 -${quantity} PFLOPS`;
            messageType = 'info';
            break;
        } 
     
        
        case 'rentOutPflops': {
            const quantity = parseFloat(params.quantity || 0);
            const turns = parseInt(params.turns || 1);
    
            if (quantity <= 0) {
                return {
                    success: false,
                 player: player,
                 message: '請指定有效的出租數量',
                type: 'warning'
                };
            }

                // 計算可出租的閒置算力（排除鎖定和已出租的算力）
                const lockedPflops = newPlayer.locked_pflops || 0;
                const rentedContracts = newPlayer.rented_pflops_contracts || [];
                const alreadyRented = rentedContracts.reduce((sum, c) => sum + (c.amount || 0), 0);
    
                const availableToRent = newPlayer.pflops - lockedPflops - alreadyRented;
                const qty = Math.min(quantity, availableToRent);
    
                if (qty <= 0) {
                    return {
                        success: false,
                        player: player,
                        message: `沒有可出租的閒置算力（可用: ${availableToRent.toFixed(1)}, 鎖定: ${lockedPflops}, 已出租: ${alreadyRented.toFixed(1)}）`,
                        type: 'danger'
                    };
                }
                // 確保不會過度出租
                if (qty < quantity) {
                    return {
                        success: false,
                        player: player,
                        message: `出租數量超過可用閒置算力，最多可出租 ${availableToRent.toFixed(1)} PF`,
                        type: 'warning'
                    };
                }
                    // 建立出租合約
                    const rentContract = {
                        amount: qty,
                        start_turn: newPlayer.turn_count,
                        return_turn: newPlayer.turn_count + turns,
                        rent_per_turn_per_pflops: 5, // 每季每PF租金 5M
                        contract_id: Date.now() + Math.random().toString(36).substr(2, 9) // 唯一合約ID
                    };
    
                    // 更新玩家數據
                    if (!Array.isArray(newPlayer.rented_pflops_contracts)) {
                        newPlayer.rented_pflops_contracts = [];
                    }
                    newPlayer.rented_pflops_contracts.push(rentContract);
    
                    // 計算租金收入（每季）
                    const rentPerTurn = qty * 5; // 5M/PF/季
    
                    return {
                        success: true,
                        player: newPlayer,
                        message: `成功出租 ${qty.toFixed(1)} PF 算力，合約 ${turns} 季，每季租金收入 $${rentPerTurn.toFixed(1)}M`,
                        type: 'success',
                        rent_contract: rentContract,
                        rent_per_turn: rentPerTurn
                    };
                }        
        
        case 'sellPflops': {
            const quantity = parseFloat(params.quantity || 0);
            if (quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定有效的出售數量',
                    type: 'warning'
                };
            }
            
            // 計算可出售的算力（排除鎖定和租賃合約中的算力）
            const lockedPflops = newPlayer.locked_pflops || 0;
            const rentedContracts = newPlayer.rented_pflops_contracts || [];
            const rentedLocked = rentedContracts.reduce((sum, c) => sum + (c.amount || 0), 0);
            
            const sellable = newPlayer.pflops - lockedPflops - rentedLocked;
            const qty = Math.min(quantity, sellable);
            
            if (qty <= 0) {
                return {
                    success: false,
                    player: player,
                    message: `沒有可出售的算力（可用: ${sellable}, 鎖定: ${lockedPflops}, 租賃: ${rentedLocked}）`,
                    type: 'danger'
                };
            }
            
            // 計算收益（二手折價）
            const resaleRate = COSTS.PFLOPS_RESALE_RATE;
            const unitValue = COSTS.PFLOPS_UNIT_PRICE * resaleRate;
            const totalGain = qty * unitValue;
            
            newPlayer.cash += totalGain;
            newPlayer.pflops -= qty;
            
            // 出售資產可能降低炒作度
            newPlayer.hype = Math.max(0, (newPlayer.hype || 0) - qty * 0.3);
            
            message = `出售 ${qty} PFLOPS，獲得 $${totalGain.toFixed(1)}M (二手價 $${unitValue.toFixed(1)}M/單位)`;
            messageType = 'success';
            break;
        }
        
        case 'hireTalent': {
            const type = params.type;
            if (!['turing', 'senior', 'junior'].includes(type)) {
                return {
                    success: false,
                    player: player,
                    message: '無效的人才類型，請選擇 turing, senior 或 junior',
                    type: 'danger'
                };
            }
            
            // 招聘成本
            const costs = {
                turing: COSTS.TURING_RECRUIT_PRICE,
                senior: COSTS.SENIOR_SALARY * 3, // 3倍年薪作為招募成本
                junior: COSTS.JUNIOR_SALARY * 2  // 2倍年薪作為招募成本
            };
            
            const cost = costs[type];
            
            if (newPlayer.cash < cost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${cost}M`,
                    type: 'danger'
                };
            }
            
            newPlayer.cash -= cost;
            newPlayer.talent[type] = (newPlayer.talent[type] || 0) + 1;
            
            // 人才招聘的額外效果
            let extraEffects = '';
            switch (type) {
                case 'turing':
                    newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + 5);
                    extraEffects = '，信任度+5';
                    break;
                case 'senior':
                    newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + 2);
                    extraEffects = '，信任度+2';
                    break;
                case 'junior':
                    newPlayer.hype = Math.min(200, (newPlayer.hype || 0) + 3);
                    extraEffects = '，炒作度+3';
                    break;
            }
            
            message = `招聘 ${getTalentTypeName(type)} +1，花費 $${cost}M${extraEffects}`;
            messageType = 'success';
            break;
        }

        case 'fireTalent': {
            const type = params.type;
            const quantity = parseInt(params.quantity) || 1;
            
            if (!['turing', 'senior', 'junior'].includes(type)) {
                return {
                    success: false,
                    player: player,
                    message: '無效的人才類型，請選擇 turing, senior 或 junior',
                    type: 'danger'
                };
            }
            
            const currentCount = newPlayer.talent[type] || 0;
            if (currentCount <= 0) {
                return {
                    success: false,
                    player: player,
                    message: `沒有可解聘的${getTalentTypeName(type)}工程師`,
                    type: 'warning'
                };
            }
            
            const actualFire = Math.min(quantity, currentCount);
            
            // 解聘邏輯：減少人才，降低忠誠度
            newPlayer.talent[type] -= actualFire;
            newPlayer.loyalty = Math.max(0, (newPlayer.loyalty || 50) - (5 * actualFire));
            
            // 根據人才類型給予不同的補償金額（遣散費）
            const severanceCosts = {
                turing: COSTS.TURING_RECRUIT_PRICE * 0.3,
                senior: COSTS.SENIOR_SALARY * 0.5,
                junior: COSTS.JUNIOR_SALARY * 0.3
            };
            
            message = `解聘 ${getTalentTypeName(type)} ×${actualFire}，忠誠度 -${5 * actualFire}`;
            messageType = 'warning';
            break;
        }
        

        // ==========================================
        // 統一數據購買（buyDataByType 整合 buyHighData/buyLowData）
        // ==========================================
        
        case 'buyHighData':
        case 'buyLowData':
        case 'buyDataByType': {
            const DataInt = window.DataIntegration;
            const DataConfig = window.DataConfig;
            const quantity = parseFloat(params.quantity || 0);
            
            // 兼容舊 action：自動轉換為對應的數據類型
            let dataType = params.dataType;
            if (actionId === 'buyHighData' && !dataType) {
                dataType = 'legal_high_broad';
            } else if (actionId === 'buyLowData' && !dataType) {
                dataType = 'legal_low';
            }
            
            if (!dataType || quantity <= 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定有效的數據類型和數量',
                    type: 'warning'
                };
            }
            
            // 獲取數據類型配置
            const typeConfig = DataConfig?.DATA_TYPES?.[dataType];
            if (!typeConfig) {
                return {
                    success: false,
                    player: player,
                    message: `未知的數據類型: ${dataType}`,
                    type: 'danger'
                };
            }
            
            // 只允許購買合法數據
            if (typeConfig.compliance !== 'legal') {
                return {
                    success: false,
                    player: player,
                    message: '只能購買合規數據，灰色數據需透過爬蟲獲取',
                    type: 'warning'
                };
            }
            
            // 計算價格（優先使用 DataConfig，後備使用 COSTS）
            let unitPrice = typeConfig.base_price;
            if (unitPrice === undefined) {
                if (typeConfig.quality === 'high') {
                    unitPrice = COSTS.HIGH_DATA_UNIT_PRICE || 2;
                } else {
                    unitPrice = COSTS.LOW_DATA_UNIT_PRICE || 0.5;
                }
            }
            const totalCost = quantity * unitPrice;
            
            if (newPlayer.cash < totalCost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${totalCost.toFixed(1)}M`,
                    type: 'danger'
                };
            }
            
            // 如果有 DataIntegration，使用它來處理
            if (DataInt && typeof DataInt.purchaseDataByType === 'function') {
                const result = DataInt.purchaseDataByType(newPlayer, dataType, quantity);
                if (result.success) {
                    // 補充原 buyHighData/buyLowData 的副作用
                    if (typeConfig.quality === 'high') {
                        const trustGain = 1 * (quantity / 50);
                        const riskGain = 3 * (quantity / 100);
                        result.player.trust = Math.min(100, (result.player.trust || 0) + trustGain);
                        result.player.compliance_risk = Math.min(100, (result.player.compliance_risk || 0) + riskGain);
                        result.message += `，信任度+${trustGain.toFixed(1)}，合規風險+${riskGain.toFixed(1)}`;
                    } else if (typeConfig.quality === 'low') {
                        const entropyGain = 2 * (quantity / 100);
                        result.player.entropy = Math.min(100, (result.player.entropy || 0) + entropyGain);
                        result.message += `，熵值+${entropyGain.toFixed(1)}`;
                    }
                    return {
                        success: true,
                        player: result.player,
                        message: result.message,
                        type: 'success'
                    };
                } else {
                    return {
                        success: false,
                        player: player,
                        message: result.message,
                        type: 'warning'
                    };
                }
            }
            
            // 後備：直接處理
            newPlayer.cash -= totalCost;
            
            // 初始化數據存儲
            if (!newPlayer.data_inventory) {
                newPlayer.data_inventory = {};
            }
            newPlayer.data_inventory[dataType] = (newPlayer.data_inventory[dataType] || 0) + quantity;
            
            // 同步到舊字段並處理副作用
            if (dataType === 'legal_high_broad' || dataType === 'legal_high_focused') {
                newPlayer.high_data = (newPlayer.high_data || 0) + quantity;
                const trustGain = 1 * (quantity / 50);
                const riskGain = 3 * (quantity / 100);
                newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + trustGain);
                newPlayer.compliance_risk = Math.min(100, (newPlayer.compliance_risk || 0) + riskGain);
                message = `採購 ${typeConfig.name} +${quantity} TB，花費 $${totalCost.toFixed(1)}M，信任度+${trustGain.toFixed(1)}，合規風險+${riskGain.toFixed(1)}`;
            } else if (dataType === 'legal_low') {
                newPlayer.low_data = (newPlayer.low_data || 0) + quantity;
                const entropyGain = 2 * (quantity / 100);
                newPlayer.entropy = Math.min(100, (newPlayer.entropy || 0) + entropyGain);
                message = `採購 ${typeConfig.name} +${quantity} TB，花費 $${totalCost.toFixed(1)}M，熵值+${entropyGain.toFixed(1)}`;
            } else {
                message = `採購 ${typeConfig.name} +${quantity} TB，花費 $${totalCost.toFixed(1)}M`;
            }
            
            messageType = 'success';
            break;
        }
        
        case 'scrapeData': {
            const DataInt = window.DataIntegration;
            const DataConfig = window.DataConfig;
            const dataType = params.dataType;
            const intensity = params.intensity || 1;
            
            if (!dataType) {
                return {
                    success: false,
                    player: player,
                    message: '請指定數據類型',
                    type: 'warning'
                };
            }
            
            // 獲取數據類型配置
            const typeConfig = DataConfig?.DATA_TYPES?.[dataType];
            if (!typeConfig) {
                return {
                    success: false,
                    player: player,
                    message: `未知的數據類型: ${dataType}`,
                    type: 'danger'
                };
            }
            
            // 只允許爬取灰色數據
            if (typeConfig.compliance !== 'gray') {
                return {
                    success: false,
                    player: player,
                    message: '只能爬取灰色數據，合規數據需透過購買獲得',
                    type: 'warning'
                };
            }
            
            // 檢查路線是否禁止灰色數據
            const routeMod = DataConfig?.ROUTE_MODIFIERS?.[newPlayer.route] || {};
            if (routeMod.gray_data_forbidden) {
                return {
                    success: false,
                    player: player,
                    message: '您的技術路線禁止使用灰色數據',
                    type: 'warning'
                };
            }
            
            // 如果有 DataIntegration，使用它來處理
            if (DataInt && typeof DataInt.scrapeData === 'function') {
                const result = DataInt.scrapeData(newPlayer, dataType, intensity);
                if (result.success) {
                    return {
                        success: true,
                        player: result.player,
                        message: result.message,
                        type: result.discovered ? 'warning' : 'success'
                    };
                } else {
                    return {
                        success: false,
                        player: player,
                        message: result.message,
                        type: 'warning'
                    };
                }
            }
            
            // 後備：使用現有的 scrapeData 邏輯
            if (DataInt && typeof DataInt.executeScraping === 'function') {
                const result = DataInt.executeScraping(newPlayer, intensity);
                if (result.success) {
                    return {
                        success: true,
                        player: result.player,
                        message: result.message,
                        type: result.discovered ? 'warning' : 'success'
                    };
                } else {
                    return {
                        success: false,
                        player: player,
                        message: result.message,
                        type: 'warning'
                    };
                }
            }
            
            // 最後後備：簡單處理
            const baseAmount = dataType === 'gray_high' ? 20 : 50;
            const amount = baseAmount * intensity;
            const riskIncrease = dataType === 'gray_high' ? 5 * intensity : 2 * intensity;
            
            // 初始化數據存儲
            if (!newPlayer.data_inventory) {
                newPlayer.data_inventory = {};
            }
            newPlayer.data_inventory[dataType] = (newPlayer.data_inventory[dataType] || 0) + amount;
            
            // 增加風險
            newPlayer.compliance_risk = Math.min(100, (newPlayer.compliance_risk || 0) + riskIncrease);
            newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + 2);
            
            message = `爬取 ${typeConfig.name} +${amount} TB，合規風險 +${riskIncrease}`;
            messageType = 'success';
            break;
        }

        
        case 'upgradeTech': {
            const tech = params.tech;
            if (!tech || !newPlayer.tech_levels[tech]) {
                return {
                    success: false,
                    player: player,
                    message: '無效的技術路線',
                    type: 'danger'
                };
            }
            
            // 升級成本：現金和數據
            const cashCost = 50;
            const dataCost = 50;
            
            // 計算總數據點（高質量數據權重更高）
            const totalDataPoints = (newPlayer.high_data || 0) * 2.0 + (newPlayer.low_data || 0) * 0.5;
            
            if (newPlayer.cash < cashCost) {
                return {
                    success: false,
                    player: player,
                    message: `現金不足，需要 $${cashCost}M`,
                    type: 'danger'
                };
            }
            
            if (totalDataPoints < dataCost) {
                return {
                    success: false,
                    player: player,
                    message: `數據不足，需要 ${dataCost}數據點（高級數據權重更高）`,
                    type: 'danger'
                };
            }
            
            // 優先消耗低質量數據
            let remainingDataCost = dataCost;
            if (newPlayer.low_data > 0) {
                const lowDataUsed = Math.min(newPlayer.low_data, remainingDataCost / 0.5);
                newPlayer.low_data -= lowDataUsed;
                remainingDataCost -= lowDataUsed * 0.5;
            }
            
            // 如果低質量數據不足，使用高質量數據
            if (remainingDataCost > 0 && newPlayer.high_data > 0) {
                const highDataUsed = Math.min(newPlayer.high_data, remainingDataCost / 2.0);
                newPlayer.high_data -= highDataUsed;
                remainingDataCost -= highDataUsed * 2.0;
            }
            
            // 支付現金成本
            newPlayer.cash -= cashCost;
            
            // 升級技術
            const currentLevel = newPlayer.tech_levels[tech] || 0;
            newPlayer.tech_levels[tech] = currentLevel + 1;
            
            // 升級效果
            newPlayer.model_power = Math.min(1000, (newPlayer.model_power || 0) + 1);
            newPlayer.hype = (newPlayer.hype || 0) + 5;
            
            // 技術路線特定效果
            let techSpecificEffect = '';
            switch (tech) {
                case 'Scaling Law':
                    newPlayer.entropy = Math.min(100, (newPlayer.entropy || 0) + 3);
                    techSpecificEffect = '，熵值+3（擴張風險）';
                    break;
                case 'Multimodal':
                    newPlayer.compliance_risk = Math.min(100, (newPlayer.compliance_risk || 0) + 5);
                    techSpecificEffect = '，合規風險+5（多模態挑戰）';
                    break;
                case 'Efficiency':
                    newPlayer.alignment = Math.min(100, (newPlayer.alignment || 0) + 3);
                    techSpecificEffect = '，對齊度+3（效率優化）';
                    break;
                case 'Embodied':
                    newPlayer.trust = Math.max(0, (newPlayer.trust || 0) - 2);
                    techSpecificEffect = '，信任度-2（硬體風險）';
                    break;
                case 'OpenSource':
                    newPlayer.trust = Math.min(100, (newPlayer.trust || 0) + 5);
                    techSpecificEffect = '，信任度+5（開放協作）';
                    break;
                case 'Military':
                    newPlayer.regulation = Math.min(100, (newPlayer.regulation || 0) + 5);
                    techSpecificEffect = '，監管壓力+5（軍事應用）';
                    break;
            }
            
            message = `${tech} 升級至 Lv.${newPlayer.tech_levels[tech]}！MP +1${techSpecificEffect}`;
            messageType = 'success';
            break;
        }
        
        case 'investRival': {
            const rivalName = params.rivalName;
            const amount = params.amount || 0;
            
            if (!rivalName || amount === 0) {
                return {
                    success: false,
                    player: player,
                    message: '請指定競爭對手名稱和投資金額',
                    type: 'warning'
                };
            }
            
            // 初始化投資記錄
            if (!newPlayer.rival_investments) {
                newPlayer.rival_investments = {};
            }
            
            const currentInvestment = newPlayer.rival_investments[rivalName] || 0;
            
            if (amount > 0) {
                // 投資
                if (newPlayer.cash < amount) {
                    return {
                        success: false,
                        player: player,
                        message: `現金不足，需要 $${amount}M`,
                        type: 'danger'
                    };
                }
                
                newPlayer.cash -= amount;
                newPlayer.rival_investments[rivalName] = currentInvestment + amount;
                
                message = `投資 ${rivalName} $${amount}M`;
                messageType = 'info';
            } else if (amount < 0) {
                // 贖回（負數表示贖回）
                const redeemAmount = Math.min(Math.abs(amount), currentInvestment);
                
                if (redeemAmount <= 0) {
                    return {
                        success: false,
                        player: player,
                        message: `沒有對 ${rivalName} 的投資可以贖回`,
                        type: 'warning'
                    };
                }
                
                // 贖回有10%的損失
                const cashReturn = redeemAmount * 0.9;
                newPlayer.cash += cashReturn;
                newPlayer.rival_investments[rivalName] = currentInvestment - redeemAmount;
                
                message = `從 ${rivalName} 贖回 $${redeemAmount}M，獲得 $${cashReturn.toFixed(1)}M（10%手續費）`;
                messageType = 'info';
            }
            break;
        }
        
        
        
        case 'synthesizeData': {
            const DataInt = window.DataIntegration;
            if (!DataInt) {
                return { success: false, player: player, message: '數據系統未載入', type: 'danger' };
            }
            
            const methodId = params.methodId;
            if (!methodId) {
                return { success: false, player: player, message: '請指定合成方法', type: 'warning' };
            }
            
            const result = DataInt.synthesizeData(newPlayer, methodId);
            
            if (result.success) {
                newPlayer = result.player;
                message = result.message;
                messageType = 'success';
            } else {
                return { success: false, player: player, message: result.message, type: 'warning' };
            }
            break;
        }
        
        case 'startCleaning': {
            const DataInt = window.DataIntegration;
            if (!DataInt) {
                return { success: false, player: player, message: '數據系統未載入', type: 'danger' };
            }
            
            const taskType = params.taskType;
            const amount = params.amount || null;
            
            if (!taskType) {
                return { success: false, player: player, message: '請指定清洗類型', type: 'warning' };
            }
            
            const result = DataInt.startCleaningTask(newPlayer, taskType, amount);
            
            if (result.success) {
                newPlayer = result.player;
                message = result.message;
                messageType = 'success';
            } else {
                return { success: false, player: player, message: result.message, type: 'warning' };
            }
            break;
        }
        
        case 'signDataContract': {
            const DataInt = window.DataIntegration;
            if (!DataInt) {
                return { success: false, player: player, message: '數據系統未載入', type: 'danger' };
            }
            
            const dataType = params.dataType;
            if (!dataType) {
                return { success: false, player: player, message: '請指定數據類型', type: 'warning' };
            }
            
            const result = DataInt.signDataContract(newPlayer, dataType);
            
            if (result.success) {
                newPlayer = result.player;
                message = result.message;
                messageType = 'success';
            } else {
                return { success: false, player: player, message: result.message, type: 'warning' };
            }
            break;
        }

        
        default:
            return {
                success: false,
                player: player,
                message: '未知的資產行動',
                type: 'danger'
            };
    }
    
    return {
        success: true,
        player: newPlayer,
        message: message,
        type: messageType,
        actionId: actionId
    };
}

// ============================================
// 輔助函數
// ============================================

/**
 * 獲取人才類型的中文名稱
 */
function getTalentTypeName(type) {
    const names = {
        turing: '圖靈級',
        senior: '資深',
        junior: '初級'
    };
    return names[type] || type;
}

/**
 * 檢查玩家是否有足夠資源執行資產行動
 */
function canAffordAssetAction(player, actionId, params, globalParams = {}) {
    const { COSTS } = GameConfig;
    
    switch (actionId) {
        case 'buyPflops': {
            const quantity = params.quantity || 0;
            const unitPrice = COSTS.PFLOPS_UNIT_PRICE * (globalParams.P_GPU || 1);
            const totalCost = quantity * unitPrice;
            return player.cash >= totalCost;
        }
        
        case 'hireTalent': {
            const type = params.type;
            const costs = {
                turing: COSTS.TURING_RECRUIT_PRICE,
                senior: COSTS.SENIOR_SALARY * 3,
                junior: COSTS.JUNIOR_SALARY * 2
            };
            return player.cash >= (costs[type] || 0);
        }
        
        case 'buyHighData':
        case 'buyLowData':
        case 'buyDataByType': {
            const DataConfig = window.DataConfig;
            const quantity = params.quantity || 0;
            let dataType = params.dataType;
            
            // 兼容舊 action
            if (actionId === 'buyHighData' && !dataType) {
                dataType = 'legal_high_broad';
            } else if (actionId === 'buyLowData' && !dataType) {
                dataType = 'legal_low';
            }
            
            // 獲取價格
            const typeConfig = DataConfig?.DATA_TYPES?.[dataType];
            let unitPrice = typeConfig?.base_price;
            if (unitPrice === undefined) {
                unitPrice = (dataType && dataType.includes('high')) ? COSTS.HIGH_DATA_UNIT_PRICE : COSTS.LOW_DATA_UNIT_PRICE;
            }
            
            const totalCost = quantity * unitPrice;
            return player.cash >= totalCost;
        }
        
        case 'upgradeTech': {
            const cashCost = 50;
            const dataCost = 50;
            const totalDataPoints = (player.high_data || 0) * 2.0 + (player.low_data || 0) * 0.5;
            return player.cash >= cashCost && totalDataPoints >= dataCost;
        }
        
        default:
            return true; // 其他行動通常不需要預檢查
    }
}

/**
 * 獲取資產行動的成本估算
 */
function estimateAssetActionCost(actionId, params, globalParams = {}) {
    const { COSTS } = GameConfig;
    
    switch (actionId) {
        case 'buyPflops': {
            const quantity = params.quantity || 1;
            const unitPrice = COSTS.PFLOPS_UNIT_PRICE * (globalParams.P_GPU || 1);
            return quantity * unitPrice;
        }
        
        case 'hireTalent': {
            const type = params.type;
            const costs = {
                turing: COSTS.TURING_RECRUIT_PRICE,
                senior: COSTS.SENIOR_SALARY * 3,
                junior: COSTS.JUNIOR_SALARY * 2
            };
            return costs[type] || 0;
        }
        
        case 'buyHighData':
        case 'buyLowData':
        case 'buyDataByType': {
            const DataConfig = window.DataConfig;
            const quantity = params.quantity || 0;
            let dataType = params.dataType;
            
            // 兼容舊 action
            if (actionId === 'buyHighData' && !dataType) {
                dataType = 'legal_high_broad';
            } else if (actionId === 'buyLowData' && !dataType) {
                dataType = 'legal_low';
            }
            
            // 獲取價格
            const typeConfig = DataConfig?.DATA_TYPES?.[dataType];
            let unitPrice = typeConfig?.base_price;
            if (unitPrice === undefined) {
                unitPrice = (dataType && dataType.includes('high')) ? COSTS.HIGH_DATA_UNIT_PRICE : COSTS.LOW_DATA_UNIT_PRICE;
            }
            
            const totalCost = quantity * unitPrice;
            return player.cash >= totalCost;
        }
        
        case 'upgradeTech':
            return 50; // 現金成本
            
        default:
            return 0;
    }
}

// ============================================
// 資產引擎自我註冊
// ============================================

(function() {
    'use strict';
    
    // 註冊資產引擎到全局
    window.AssetEngine = {
        executeAssetAction,
        canAffordAssetAction,
        estimateAssetActionCost,
        getTalentTypeName
    };
    
    // 如果 GameEngine 已存在，也掛載到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.executeAssetAction = executeAssetAction;
        window.GameEngine.canAffordAssetAction = canAffordAssetAction;
        window.GameEngine.estimateAssetActionCost = estimateAssetActionCost;
        window.GameEngine.getTalentTypeName = getTalentTypeName;
    }
    
    console.log('✓ Asset Engine loaded');
    })();