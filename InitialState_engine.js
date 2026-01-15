// ============================================
// 初始狀態引擎 - Initial State Engine
// ============================================
// 功能：根據玩家選擇的技術路線，生成遊戲開局的初始狀態。

/**
 * 根據選擇的技術路線創建玩家的初始狀態
 * @param {string} routeName - 玩家選擇的技術路線名稱 (對應 GameConfig.TECH_ROUTES 的 Key)
 * @returns {Object} - 玩家的初始狀態物件
 */
function createInitialPlayerState(routeName) {
    'use strict';
    
    // 確保 GameConfig 已載入
    if (typeof GameConfig === 'undefined' || !GameConfig.TECH_ROUTES) {
        console.error('致命錯誤：GameConfig 或 TECH_ROUTES 未載入');
        return {};
    }

    var routeConfig = GameConfig.TECH_ROUTES[routeName];

    if (!routeConfig) {
        console.error('無效的技術路線名稱: ' + routeName);
        // 返回一個最小化的基礎狀態，避免遊戲崩潰
        return {
            route: 'Default',
            cash: 10,
            debt: 0,
            market_cap: 100,
            revenue_bonus: 0,
            community_size: 0,
            hype: 0,
            trust: 0,
            loyalty: 0,
            compliance_risk: 0,
            regulation: 0,
            // 加入策略藍圖初始化：
            blueprint_state: {
                activated_skills: [],
                total_mastery_spent: 0,
                activation_history: [],
            }, 
        };
    }

    // 安全取得初始獎勵
    var initialBonuses = routeConfig.initialBonuses || {};
    var talentBonuses = initialBonuses.talent || {};

    // 基礎初始狀態
    var baseState = {
        // 核心屬性 (預設值)
        route: routeName,
        quarter: 1, // 從第 1 季開始
        turn_count: 1, // 回合計數（與quarter同步）
        last_mp: 10, // 上一回合的MP（用於計算忠誠度）
        stock_dilution: 1, // 股票稀釋率
        cash: 50, // 初始現金 (單位：M)
        debt: 0, // 初始債務 (單位：M)
        market_cap: 100, // 初始市值 (單位：M)
        
        // 資源
        pflops: 0, // 自有算力 (PFLOPS)
        cloud_pflops: 0, // 雲端租賃算力 (PFLOPS)
        locked_pflops: 0, // 鎖定/抵押的算力 (PFLOPS)
        high_data: 0, // 高質量數據點
        low_data: 0, // 低質量數據點

        // 人才
        talent: {
            turing: talentBonuses.turing || 0,
            senior: talentBonuses.senior || 0,
            junior: talentBonuses.junior || 0
        },

        // 模型屬性
        model_power: 10, // 初始模型算力 (Model Power)
        mp_tier: 0, // 當前已達成里程碑的等級 (0-5)
        mp_milestones: { 1: false, 2: false, 3: false, 4: false, 5: false }, // 里程碑解鎖狀態
        milestone_launch_ready: { 1: false, 2: false, 3: false, 4: false, 5: false }, // 里程碑發布準備狀態
        milestone_fail_count: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, // 里程碑失敗次數
        
        // 公眾與監管
        hype: 0, // 炒作/熱度 (0-100)
        trust: 0, // 公眾信任 (0-100)
        loyalty: 0, // 內部忠誠度 (0-100)
        alignment: 0, // AI 對齊度 (0-100)
        entropy: 5, // 模型熵值/不穩定性 (0-100)
        compliance_risk: 0, // 合規風險 (0-100)
        regulation: 0, // 監管壓力 (0-100)

        // 社群系統（Tier 1 解鎖後初始化）
        community: null, // { size, sentiment, engagement }
        community_revenue: 0, // 社群帶來的收益
        community_strategy: null, // 當季選擇的社群戰略

        // 財務/經濟
        revenue_bonus: 0, // 收入獎勵百分比
        community_size: 0, // 社群規模
        ipo_done: false, // 是否已完成 IPO
        
        // 產品系統 - 使用正確的結構
        product_state: {
            compute_strategy: "Balanced",
            products: {},
            talent_assignment: {
                unassigned_seniors: 0,
                product_assignments: {}
            },
            mastery: {
                level: 0,
                experience: 0,
                products_by_tier: { 1: 0, 2: 0, 3: 0, 4: 0 }
            },
            product_demand: 0,
            product_fulfillment: 1.0,
            product_revenue: 0,
            turing_unlocks: [],
            developing: [],
            completed: []
        },

        // 財務行動冷卻時間
        finance_cooldowns: {},       

        // Doom Gauge
        doom_gauge: {
            commercial_ruin: 0,
            internal_unraveling: 0,
            external_sanction: 0        
        },

        // Doom 量表連續計數
        doom_consecutive_turns: {
            commercial_ruin: 0,
            internal_unraveling: 0,
            external_sanction: 0
        },

        // 資產升級系統（Tier 3 解鎖後生效）
        asset_upgrades: {
            space: { cooling: 0, modular: 0, automation: 0 },
            power: { storage: 0, microgrid: 0, renewable: 0 },
            compute: { architecture: 0, cluster: 0, specialization: 0 },
            talent: { productivity: 0 },
            data: { synthesis: 0, marketplace: 0, privacy: 0 }
        },
        
        // ========================================
        // 事業線（Business Line）
        // 路線：產品 → 產品線 → 事業部 → 事業子公司
        // ========================================
        business_units: {},  // { "產品線名稱": { stage, experience, products, route, region_deployed } }
        
        // ========================================
        // 職能線（Functional Line）
        // 路線：設施升級 Lv.2 → 職能部 → 職能子公司
        // ========================================
        functional_depts: [],                    // ['datacenter_services', ...]
        functional_dept_mastery: {},             // { datacenter_services: 45, ... }
        functional_subsidiaries: [],             // ['energy_subsidiary', ...]
        
        // 向後兼容別名（將在後續版本移除）
        departments: [],                         // @deprecated → 使用 functional_depts
        department_mastery: {},                  // @deprecated → 使用 functional_dept_mastery
        subsidiaries: [],                        // @deprecated → 使用 functional_subsidiaries
        
        // Tier4 全球市場狀態（Tier4 解鎖後初始化）
        global_market: null,
        
        // Tier4 區域系統狀態（Tier4 解鎖後初始化）
        region_system: null

    };

    // 應用技術路線的初始獎勵（手動合併避免覆蓋）
    var initialState = {};
    var key;
    for (key in baseState) {
        if (baseState.hasOwnProperty(key)) {
            initialState[key] = baseState[key];
        }
    }
    for (key in initialBonuses) {
        if (initialBonuses.hasOwnProperty(key) && key !== 'talent') {
            initialState[key] = initialBonuses[key];
        }
    }
    
    // 確保talent正確合併（從initialBonuses直接讀取）
    initialState.talent = {
        turing: initialBonuses.turing || 0,
        senior: initialBonuses.senior || 0,
        junior: initialBonuses.junior || 0
    };

    // 確保不會出現負值，並且處理特別的初始化邏輯
    initialState.cash = Math.max(0, initialState.cash);
    initialState.hype = Math.min(100, initialState.hype);
    initialState.trust = Math.min(100, initialState.trust);

    console.log('Initial state created for route: ' + routeName);

    // 初始化能源設定（Tier2準備）
    if (window.EnergyPriceEngine && window.EnergyPriceEngine.initializeEnergySettings) {
        initialState = window.EnergyPriceEngine.initializeEnergySettings(initialState);
    }
    
    // 初始化全球市場狀態（所有Tier都啟用，波動率依Tier調整）
    if (window.GlobalMarketEngine && !initialState.global_market) {
        initialState.global_market = window.GlobalMarketEngine.createInitialState();
        console.log('✓ Global Market initialized at game start');
    }
    
    // 初始化產業親和度狀態
    if (window.IndustryAffinityEngine && !initialState.industry_affinity_state) {
        initialState.industry_affinity_state = window.IndustryAffinityEngine.createInitialState(routeName);
        console.log('✓ Industry Affinity initialized for route: ' + routeName);
    }
    
    return initialState;
}

/**
 * 初始化 Tier4 全球市場與區域系統
 * @param {Object} playerState - 玩家狀態
 * @returns {Object} - 更新後的玩家狀態
 */
function initializeTier4Systems(playerState) {
    'use strict';
    
    if (!playerState) return playerState;
    
    var newState = Object.assign({}, playerState);
    
    // 初始化全球市場狀態
    if (window.GlobalMarketEngine && !newState.global_market) {
        newState.global_market = window.GlobalMarketEngine.createInitialState();
        console.log('✓ Global Market System initialized for Tier4');
    }
    
    // 初始化區域系統狀態
    if (window.RegionEngine && !newState.region_system) {
        newState.region_system = window.RegionEngine.createInitialState();
        console.log('✓ Region System initialized for Tier4');
    }
    
    return newState;
}

/**
 * 檢查並觸發 Tier4 系統初始化
 * @param {Object} playerState - 玩家狀態
 * @returns {Object} - 更新後的玩家狀態
 */
function checkAndInitializeTier4(playerState) {
    'use strict';
    
    if (!playerState) return playerState;
    
    // 檢查是否達到 Tier4
    var currentTier = playerState.mp_tier || 0;
    if (currentTier >= 4 && !playerState.global_market) {
        return initializeTier4Systems(playerState);
    }
    
    return playerState;
}


/**
 * 創建競爭對手初始狀態
 * @param {string} playerRoute - 玩家選擇的路線（用於排除）
 * @param {number} rivalCount - 對手數量 (1-6，預設3)
 * @returns {Array} - 競爭對手陣列
 */
function createInitialRivalsState(playerRoute, rivalCount) {
    'use strict';
    
    // 預設值處理
    if (typeof rivalCount !== 'number' || rivalCount < 1) {
        rivalCount = 3;
    }
    
    if (typeof GameConfig === 'undefined' || !GameConfig.RIVALS_CONFIG) {
        console.warn('createInitialRivalsState(): RIVALS_CONFIG 未定義');
        return [];
    }
    
    // 過濾掉與玩家相同路線的對手
    var availableRivals = [];
    var i;
    for (i = 0; i < GameConfig.RIVALS_CONFIG.length; i++) {
        var rival = GameConfig.RIVALS_CONFIG[i];
        availableRivals.push(rival);
    }
    
    // 限制對手數量（不超過可用對手數量）
    var actualCount = Math.min(rivalCount, availableRivals.length);
    
    // 隨機選擇指定數量的對手（Fisher-Yates shuffle）
    var shuffled = availableRivals.slice();
    for (i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    var selectedRivals = shuffled.slice(0, actualCount);
    
    // style 中文到英文的映射表
    var STYLE_KEY_MAP = {
        '極致擴張': 'aggressive_expansion',
        '安全優先': 'safety_first',
        '平衡發展': 'balanced_growth',
        '創意爆發': 'creative_burst',
        '硬體重型': 'hardware_heavy',
        '專業防禦': 'professional_defense'
    };
    
    // 建立對手初始狀態
    var result = [];
    for (i = 0; i < selectedRivals.length; i++) {
        var r = selectedRivals[i];
        // 獲取英文 style_key
        var styleKey = STYLE_KEY_MAP[r.style] || 'default';
        
        result.push({
            name: r.name,
            style: r.style,
            style_key: styleKey, // 添加英文 style_key
            icon: r.icon,
            route: r.route,
            mp: 10 * (r.mp_mult || 1), // 初始MP基於路線乘數
            market_cap: 500, // 初始市值
            hype: r.hype_add || 0,
            trust: r.trust_add || 0,
            alignment: (r.align_add || 0) + 50, // 添加alignment屬性，基礎50
            entropy: (r.entropy_add || 0) + 10, // 添加entropy屬性，基礎10
            compliance_risk: r.cr_add || 0, // 添加合規風險
            description: r.description || '',
            // 保存config以便後續成長計算
            config: {
                mp_mult: r.mp_mult || 1,
                hype_add: r.hype_add || 0,
                entropy_add: r.entropy_add || 0,
                align_add: r.align_add || 0,
                trust_add: r.trust_add || 0,
                cr_add: r.cr_add || 0,
                style_key: styleKey // 也保存到config中
            }
        });
    }
    
    return result;
}


// ============================================
// 初始狀態引擎自我註冊
// ============================================

(function() {
    'use strict';

    // 註冊初始狀態引擎到全局
    window.InitialStateEngine = {
        createInitialPlayerState: createInitialPlayerState,
        createInitialRivalsState: createInitialRivalsState,
        initializeTier4Systems: initializeTier4Systems,
        checkAndInitializeTier4: checkAndInitializeTier4
    };
    
    // 如果 GameEngine 已存在，也掛載到 GameEngine
    if (window.GameEngine) {
        window.GameEngine.createInitialPlayerState = createInitialPlayerState;
        window.GameEngine.createInitialRivalsState = createInitialRivalsState;
        window.GameEngine.initializeTier4Systems = initializeTier4Systems;
        window.GameEngine.checkAndInitializeTier4 = checkAndInitializeTier4;
    }

    console.log('✓ Initial State Engine loaded');
})();