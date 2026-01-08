// ============================================
// GameEngine 核心整合管理器
// ============================================

// 在文件頂部添加
if (!window.GameConfig) {
  console.error('GameConfig not loaded!');
  // 可以加載默認配置或等待
}

// 確保必要的配置存在
window.GameConfig = window.GameConfig || {
  COSTS: {},
  TECH_ROUTES: {},
  RIVALS_CONFIG: [],
  FINANCE_ACTIONS: {}
};

// 初始化全局 GameEngine，如果尚未存在
window.GameEngine = window.GameEngine || {};

/**
 * GameEngine 核心類別 - 負責協調所有子引擎
 */
class GameEngineCore {
    constructor() {
        this.initialized = false;
        this.engines = {
            strategy: null,
            asset: null,
            finance: null,
            rivalInvestment: null,
            milestone: null,
            turnUpdate: null,
            product: null,
            ending: null
        };
        
        this._initEventSystem();
    }
    
    /**
     * 初始化 GameEngine，註冊所有子引擎
     */
    initialize() {
        if (this.initialized) return;
        
        // 註冊策略引擎
        this.registerEngine('strategy', {
            executeStrategy: window.GameEngine.executeStrategy || this._fallbackStrategy,
            // 其他策略函數...
        });
        
        // 註冊資產引擎
        this.registerEngine('asset', {
            executeAssetAction: window.GameEngine.executeAssetAction,
            canAffordAssetAction: window.GameEngine.canAffordAssetAction,
            estimateAssetActionCost: window.GameEngine.estimateAssetActionCost
        });
        
        // 註冊財務引擎
        this.registerEngine('finance', {
            executeFinance: window.GameEngine.executeFinance,
            updateFinanceCooldowns: window.GameEngine.updateFinanceCooldowns,
            processQuarterlyContracts: window.GameEngine.processQuarterlyContracts
        });
        
        // 註冊競爭對手投資引擎
        this.registerEngine('rivalInvestment', {
            executeRivalInvestment: window.GameEngine.executeRivalInvestment,
            calculateInvestmentReturns: window.GameEngine.calculateInvestmentReturns,
            getRivalInvestmentInfo: window.GameEngine.getRivalInvestmentInfo,
            getInvestmentRecommendations: window.GameEngine.getInvestmentRecommendations
        });
        
        // 註冊里程碑引擎
        this.registerEngine('milestone', {
            executeMilestoneLaunch: window.GameEngine.executeMilestoneLaunch || this._fallbackMilestone
        });
        
        // 註冊回合更新引擎
        this.registerEngine('turnUpdate', {
            processTurnUpdates: window.GameEngine.processTurnUpdates || this._fallbackTurnUpdate
        });
        
        // 註冊結局引擎
        this.registerEngine('ending', {
            evaluate: window.EndingEngine ? window.EndingEngine.evaluate.bind(window.EndingEngine) : null,
            checkGameEnding: window.GameEngine.checkGameEnding
        });
        
        // 檢查核心函數
        this._ensureCoreFunctions();
        
        this.initialized = true;
        console.log('GameEngine Core initialized successfully');
    }
    
    /**
     * 註冊子引擎
     */
    registerEngine(name, engineFunctions) {
        this.engines[name] = engineFunctions;
        
        // 同時掛載到全局 GameEngine
        Object.assign(window.GameEngine, engineFunctions);
    }
    
    /**
     * 執行行動 - 中央路由函數
     * @param {string} actionType - 行動類型 (strategy, asset, finance, milestone, etc)
     * @param {string} actionId - 行動ID
     * @param {Object} context - 執行上下文 { player, rivals, globalParams, params }
     * @returns {Object} 執行結果
     */
    async executeAction(actionType, actionId, context) {
        try {
            const { player, rivals, globalParams, params } = context;
            
            switch (actionType) {
                case 'strategy':
                    return await this._executeStrategyAction(actionId, player, globalParams, params);
                    
                case 'asset':
                    return await this._executeAssetAction(actionId, player, params, globalParams);
                    
                case 'finance':
                    return await this._executeFinanceAction(actionId, player, params);
                    
                case 'milestone':
                    return await this._executeMilestoneAction(actionId, player, params);
                    
                case 'rival_investment':
                    return await this._executeRivalInvestment(actionId, player, params);
                    
                case 'turn_update':
                    return await this._executeTurnUpdate(player, rivals, globalParams);
                    
                case 'check_ending':
                    return await this._executeEndingCheck(player, rivals);
                    
                default:
                    throw new Error(`未知的行動類型: ${actionType}`);
            }
        } catch (error) {
            console.error(`執行行動時出錯 (${actionType}.${actionId}):`, error);
            return {
                success: false,
                message: `執行失敗: ${error.message}`,
                error: error
            };
        }
    }
    
    /**
     * 執行策略行動
     */
    async _executeStrategyAction(actionId, player, globalParams, params) {
        if (!this.engines.strategy || !this.engines.strategy.executeStrategy) {
            throw new Error('策略引擎未初始化');
        }
        
        const result = this.engines.strategy.executeStrategy(player, actionId, globalParams, params);
        
        // 發送策略行動事件
        this._emit('strategy:executed', {
            actionId,
            player: result.player,
            result
        });
        
        return result;
    }
    
    /**
     * 執行資產行動
     */
    async _executeAssetAction(actionId, player, params, globalParams) {
        if (!this.engines.asset || !this.engines.asset.executeAssetAction) {
            throw new Error('資產引擎未初始化');
        }
        
        const result = this.engines.asset.executeAssetAction(player, actionId, params, globalParams);
        
        // 發送資產行動事件
        this._emit('asset:executed', {
            actionId,
            player: result.player,
            result
        });
        
        return result;
    }
    
    /**
     * 執行財務行動
     */
    async _executeFinanceAction(actionId, player, params) {
        if (!this.engines.finance || !this.engines.finance.executeFinance) {
            throw new Error('財務引擎未初始化');
        }
        
        const result = this.engines.finance.executeFinance(player, actionId, params);
        
        // 發送財務行動事件
        this._emit('finance:executed', {
            actionId,
            player: result.player,
            result
        });
        
        return result;
    }
    
    /**
     * 執行里程碑行動
     */
    async _executeMilestoneAction(actionId, player, params) {
        if (!this.engines.milestone || !this.engines.milestone.executeMilestoneLaunch) {
            throw new Error('里程碑引擎未初始化');
        }
        
        const tier = params.tier || actionId;
        const result = this.engines.milestone.executeMilestoneLaunch(player, tier);
        
        // 發送里程碑事件
        this._emit('milestone:executed', {
            tier,
            player: result.updatedPlayer,
            result
        });
        
        return result;
    }
    
    /**
     * 執行競爭對手投資
     */
    async _executeRivalInvestment(actionId, player, params) {
        if (!this.engines.rivalInvestment || !this.engines.rivalInvestment.executeRivalInvestment) {
            throw new Error('競爭對手投資引擎未初始化');
        }
        
        const { rivalName, amount } = params;
        const result = this.engines.rivalInvestment.executeRivalInvestment(player, rivalName, amount);
        
        // 發送投資事件
        this._emit('investment:executed', {
            rivalName,
            amount,
            player: result.player,
            result
        });
        
        return result;
    }
    
    /**
     * 執行回合更新
     */
    async _executeTurnUpdate(player, rivals, globalParams) {
        if (!this.engines.turnUpdate || !this.engines.turnUpdate.processTurnUpdates) {
            throw new Error('回合更新引擎未初始化');
        }
        
        const result = this.engines.turnUpdate.processTurnUpdates(player, rivals, globalParams);
        
        // 發送回合更新事件
        this._emit('turn:updated', {
            player: result.player,
            rivals: result.rivals,
            processData: result.processData
        });
        
        return result;
    }
    
    /**
     * 執行結局檢查
     */
    async _executeEndingCheck(player, rivals) {
        if (!this.engines.ending) {
            throw new Error('結局引擎未初始化');
        }
        
        // 優先使用新的結局引擎
        if (this.engines.ending.evaluate) {
            const ending = this.engines.ending.evaluate(player, rivals);
            
            if (ending) {
                this._emit('ending:triggered', { ending });
            }
            
            return { ending };
        }
        // 回退到舊的檢查函數
        else if (this.engines.ending.checkGameEnding) {
            const ending = this.engines.ending.checkGameEnding(player, rivals);
            
            if (ending) {
                this._emit('ending:triggered', { ending });
            }
            
            return { ending };
        }
        
        return { ending: null };
    }
    
    /**
     * 確保核心函數存在
     */
    _ensureCoreFunctions() {
        // 檢查並確保必要的核心計算函數存在
        const requiredCoreFunctions = [
            'createInitialPlayerState',
            'createInitialRivalsState', 
            'calculateDerivedStats',
            'calculateQuarterlyFinances',
            'calculateDoomGauge',
            'checkMilestones'
        ];
        
        requiredCoreFunctions.forEach(funcName => {
            if (!window.GameEngine[funcName]) {
                console.warn(`警告: 核心函數 ${funcName} 未定義，將使用備用函數`);
                window.GameEngine[funcName] = this[`_fallback${funcName.charAt(0).toUpperCase() + funcName.slice(1)}`] || (() => {
                    console.error(`錯誤: 無法執行 ${funcName}`);
                    return null;
                });
            }
        });
    }
    
    /**
     * 備用函數
     */
    _fallbackStrategy() {
        return {
            success: false,
            message: '策略引擎未正確初始化',
            player: arguments[0]
        };
    }
    
    _fallbackMilestone(player, tier) {
        return {
            success: false,
            message: `里程碑 ${tier} 發布失敗: 引擎未初始化`,
            updatedPlayer: player
        };
    }
    
    _fallbackTurnUpdate(player, rivals, globalParams) {
        return {
            player,
            rivals,
            processData: {}
        };
    }
    
    /**
     * 事件系統
     */
    _initEventSystem() {
        this._listeners = {};
    }
    
    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this._listeners[event]) return;
        const index = this._listeners[event].indexOf(callback);
        if (index > -1) this._listeners[event].splice(index, 1);
    }
    
    _emit(event, data) {
        if (!this._listeners[event]) return;
        this._listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`事件處理器錯誤 (${event}):`, error);
            }
        });
    }
    
    /**
     * 批量執行行動
     */
    async executeBatch(actions) {
        const results = [];
        let currentPlayer = null;
        
        for (const action of actions) {
            if (!action || !action.type || !action.id) continue;
            
            // 如果提供了玩家狀態，使用它
            const context = action.context || {};
            if (currentPlayer) {
                context.player = currentPlayer;
            }
            
            const result = await this.executeAction(action.type, action.id, context);
            results.push(result);
            
            // 更新當前玩家狀態
            if (result.player) {
                currentPlayer = result.player;
            } else if (result.updatedPlayer) {
                currentPlayer = result.updatedPlayer;
            }
        }
        
        return {
            success: results.every(r => r.success !== false),
            results,
            finalPlayer: currentPlayer
        };
    }
    
    /**
     * 獲取引擎狀態
     */
    getEngineStatus() {
        return {
            initialized: this.initialized,
            engines: Object.keys(this.engines).reduce((status, engineName) => {
                status[engineName] = !!this.engines[engineName];
                return status;
            }, {})
        };
    }
}

// ============================================
// 初始化並導出
// ============================================

// 創建全局 GameEngineCore 實例
window.GameEngineCore = new GameEngineCore();

// 自動初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.GameEngineCore.initialize();
    });
} else {
    window.GameEngineCore.initialize();
}

// 導出全局訪問函數
window.GameEngine = {
    ...window.GameEngine,
    
    // 核心管理器函數
    executeAction: (...args) => window.GameEngineCore.executeAction(...args),
    executeBatch: (...args) => window.GameEngineCore.executeBatch(...args),
    on: (...args) => window.GameEngineCore.on(...args),
    off: (...args) => window.GameEngineCore.off(...args),
    getEngineStatus: () => window.GameEngineCore.getEngineStatus(),
    
    // 便利函數 - 自動路由到對應引擎
    executeStrategy: (player, actionId, globalParams, params) => 
        window.GameEngineCore.executeAction('strategy', actionId, { player, globalParams, params }),
    
    executeAsset: (player, actionId, params, globalParams) =>
        window.GameEngineCore.executeAction('asset', actionId, { player, params, globalParams }),
    
    executeFinance: (player, actionId, params) =>
        window.GameEngineCore.executeAction('finance', actionId, { player, params }),
    
    executeMilestone: (player, tier) =>
        window.GameEngineCore.executeAction('milestone', `tier_${tier}`, { player, params: { tier } }),
    
    executeRivalInvestment: (player, rivalName, amount) =>
        window.GameEngineCore.executeAction('rival_investment', 'invest', { 
            player, 
            params: { rivalName, amount } 
        }),
    
    processTurn: (player, rivals, globalParams) =>
        window.GameEngineCore.executeAction('turn_update', 'process', { player, rivals, globalParams }),
    
    checkEnding: (player, rivals) =>
        window.GameEngineCore.executeAction('check_ending', 'check', { player, rivals })
};

console.log('GameEngine Core Manager loaded successfully');

// ============================================
// 使用範例
// ============================================
/*
// 1. 訂閱事件
GameEngine.on('strategy:executed', (data) => {
    console.log('策略行動執行:', data);
});

// 2. 執行單個行動
const result = await GameEngine.executeStrategy(player, 'research', globalParams);

// 3. 批量執行
const batchResult = await GameEngine.executeBatch([
    { type: 'strategy', id: 'research', context: { player, globalParams } },
    { type: 'finance', id: 'founderWork', context: { player } },
    { type: 'asset', id: 'buyPflops', context: { player, params: { quantity: 10 }, globalParams } }
]);

// 4. 檢查引擎狀態
const status = GameEngine.getEngineStatus();
*/