// ============================================
// 奇點競速 - 遊戲常數與配置
// ============================================

const GLOBAL_PARAMS_INITIAL = {
    R_base: 1.0,      // 基礎利率指數 (Tier4: GlobalMarket.interest_rate / 100)
    P_GPU: 1.0,       // GPU 價格指數 (Tier4: GlobalMarket.gpu_price / 100)
    I_Hype: 1.0,      // 市場信心指數 (Tier4: GlobalMarket.market_confidence / 100)
    E_Price: 1.0      // 能源價格指數 (Tier4: GlobalMarket.energy_price / 100)
};

// ============================================
// Tier4 全球市場指標轉換
// ============================================
function convertGlobalMarketToParams(marketState) {
    if (!marketState || !marketState.indices) {
        return { ...GLOBAL_PARAMS_INITIAL };
    }
    return {
        R_base: (marketState.indices.interest_rate?.value || 100) / 100,
        P_GPU: (marketState.indices.gpu_price?.value || 100) / 100,
        I_Hype: (marketState.indices.market_confidence?.value || 100) / 100,
        E_Price: (marketState.indices.energy_price?.value || 100) / 100
    };
}

if (typeof window !== 'undefined') {
    window.convertGlobalMarketToParams = convertGlobalMarketToParams;
}

const REVENUE_BASE = 0;

const COSTS = {
    TURING_SALARY: 5,
    SENIOR_SALARY: 2,
    JUNIOR_SALARY: 0.5,
    PFLOPS_UNIT_PRICE: 20,
    PFLOPS_RESALE_RATE: 0.5,
    TURING_RECRUIT_PRICE: 50,
    SENIOR_RECRUIT_PRICE: 20,
    HIGH_DATA_UNIT_PRICE: 2,
    LOW_DATA_UNIT_PRICE: 0.5,
    DATA_CONSUMPTION_RATE: 5,

    MODEL_TIERS: {
        1: { mp: 25, reward: 50, name: "Tier 1: 基礎大語言模型 (Base LLM)", community_unlock: true },
        2: { mp: 100, reward: 100, name: "Tier 2: 垂直領域專家模型 (Domain Expert)" },
        3: { mp: 200, reward: 200, name: "Tier 3: 類通用模型 (Near-GPT Class)" },
        4: { mp: 500, reward: 400, name: "Tier 4: 超級智能準備 (Superintelligence Prep)" },
        5: { mp: 1005, reward: 1000, name: "Tier 5: AGI (奇點降臨)" }
    }
};

// 技術路線定義
const TECH_ROUTES = {
    "Scaling Law": {
        name: "Scaling Law",
        description: "OpenAI 風格：燒錢換智力，擴張訂閱。",
        icon: "🚀",
        color: "#00f5ff",
        specialAction: "擴張 API 訂閱 (MaaS)",
        initialBonuses: {
            cash: 40,
            debt: 40,
            turing: 2,
            senior: 2,
            junior: 1,
            pflops: 4,
            cloud_pflops: 3,
            high_data: 300,
            low_data: 200,
            hype: 50,
            trust: 20,
            loyalty: 60,
            compliance_risk: 35,
            regulation: 40,
        }
    },
    "Multimodal": {
        name: "多模態",
        description: "Google 風格：炒作情緒，高合規風險。",
        icon: "🎨",
        color: "#ff00aa",
        specialAction: "承接垂直行業專案",
        initialBonuses: {
            cash: 35,
            debt: 30,
            turing: 1,
            senior: 3,
            junior: 2,
            pflops: 5,
            cloud_pflops: 3,
            high_data: 400,
            low_data: 350,
            hype: 30,
            trust: 40,
            loyalty: 50,
            compliance_risk: 25,
            regulation: 30,
        }
    },
    "Efficiency": {
        name: "效率優化",
        description: "DeepMind 風格：專利授權，降成增效。",
        icon: "⚡",
        color: "#00ff88",
        specialAction: "核心算法專利授權",
        initialBonuses: {
            cash: 10,
            debt: 20,
            turing: 1,
            senior: 3,
            junior: 1,
            pflops: 4,
            cloud_pflops: 2,
            high_data: 150,
            low_data: 250,
            hype: 20,
            trust: 60,
            loyalty: 75,
            compliance_risk: 10,
            regulation: 15,
        }
    },
    "Embodied": {
        name: "具身智慧",
        description: "Tesla 風格：軟硬整合，預售呈現願景。",
        icon: "🤖",
        color: "#ffd000",
        specialAction: "機器人預售/發佈會",
        initialBonuses: {
            cash: 20,
            debt: 30,
            turing: 1,
            senior: 2,
            junior: 1,
            pflops: 3,
            cloud_pflops: 2,
            high_data: 100,
            low_data: 200,
            hype: 35,
            trust: 30,
            loyalty: 70,
            compliance_risk: 10,
            regulation: 20,
        }
    },
    "OpenSource": {
        name: "開源路線",
        description: "Meta 風格：社群生態，互助共享。",
        icon: "🌐",
        color: "#aa44ff",
        specialAction: "企業級託管服務",
        initialBonuses: {
            cash: 30,
            debt: 40,
            turing: 1,
            senior: 2,
            junior: 2,
            pflops: 5,
            cloud_pflops: 2,
            high_data: 200,
            low_data: 400,
            hype: 25,
            trust: 55,
            loyalty: 65,
            compliance_risk: 15,
            regulation: 20,
        }
    },
    "Military": {
        name: "軍事 AI",
        description: "Palantir 風格：國防合約，穩定保守。",
        icon: "🎯",
        color: "#ff3366",
        specialAction: "申請國防機密撥款",
        initialBonuses: {
            cash: 50,
            debt: 10,
            turing: 0,
            senior: 3,
            junior: 1,
            pflops: 4,
            cloud_pflops: 1,
            high_data: 250,
            low_data: 100,
            hype: 10,
            trust: 30,
            loyalty: 80,
            compliance_risk: 5,
            regulation: 10,
        }
    }
};

// 競爭對手配置
const RIVALS_CONFIG = [
    {
        name: "Titan Sigma",
        style: "極致擴張",
        icon: "🏭",
        route: "Scaling Law",
        mp_mult: 1.5,
        hype_add: 20,
        entropy_add: 10,
        align_add: -5,
        trust_add: 0,
        cr_add: 0,
        description: "追求規模化與快速擴張，燒錢換智力"
    },
    {
        name: "Ethos Guard",
        style: "安全優先",
        icon: "🛡️",
        route: "OpenSource",
        mp_mult: 1.1,
        hype_add: 5,
        entropy_add: -5,
        align_add: 10,
        trust_add: 15,
        cr_add: -5,
        description: "開源路線，重視社群與信任，低風險穩步成長"
    },
    {
        name: "Nexus Dynamics",
        style: "平衡發展",
        icon: "⚖️",
        route: "Efficiency",
        mp_mult: 1.25,
        hype_add: 10,
        entropy_add: 5,
        align_add: 0,
        trust_add: 5,
        cr_add: 0,
        description: "效率優化路線，用專利授權實現可持續成長"
    },
    {
        name: "Phantom Studio",
        style: "創意爆發",
        icon: "🎨",
        route: "Multimodal",
        mp_mult: 1.4,
        hype_add: 25,
        entropy_add: 15,
        align_add: -10,
        trust_add: -5,
        cr_add: 10,
        description: "多模態創意路線，靠視覺和炒作驅動"
    },
    {
        name: "Golem Industries",
        style: "硬體重型",
        icon: "🤖",
        route: "Embodied",
        mp_mult: 1.0,
        hype_add: 12,
        entropy_add: 8,
        align_add: 5,
        trust_add: 10,
        cr_add: 15,
        description: "具身智慧路線，需要龐大資本投入"
    },
    {
        name: "Fortress Protocol",
        style: "專業防禦",
        icon: "🎯",
        route: "Military",
        mp_mult: 1.2,
        hype_add: 0,
        entropy_add: -8,
        align_add: 15,
        trust_add: 20,
        cr_add: -8,
        description: "軍事防禦路線，靠信任和專業贏得合約"
    }
];

// 財務行動系統
const FINANCE_ACTIONS = {
    // Tier 0 - 起始可用
    tier0: {
        founderWork: {
            id: "founderWork",
            name: "創始人打工",
            description: "創始人暫時外出接案賺錢",
            icon: "💼",
            effects: {
                cash: 25,
                mp_penalty: 0.2
            },
            cooldown: 0
        },
        pocContract: {
            id: "pocContract",
            name: "PoC合約",
            description: "提供概念驗證服務",
            icon: "📋",
            effects: {
                cash: 20,
                pflops_lock: 1,
                duration: 3
            },
            cooldown: 2
        },
        betaPresale: {
            id: "betaPresale",
            name: "預售Beta",
            description: "提前預售測試版本",
            icon: "🎮",
            effects: {
                cash: 50,
                hype: 5,
                regulation: 3
            },
            cooldown: 4
        },
        applyGrant: {
            id: "applyGrant",
            name: "申請獎助金",
            description: "申請政府或基金會獎助金",
            icon: "🏛️",
            effects: {
                cash_min: 15,
                cash_max: 35
            },
            cooldown: 3
        },
        emergencyLoan: {
            id: "emergencyLoan",
            name: "緊急貸款",
            description: "向銀行緊急借款，利率較高",
            icon: "🏦",
            effects: {
                cash: 40,
                debt: 60,
                cash_threshold: 30
            },
            cooldown: 0
        },
        repayDebt: {
            id: "repayDebt",
            name: "償還債務",
            description: "償還部分或全部債務",
            icon: "💳",
            effects: {},
            cooldown: 0
        }
    },
    
    // Tier 1 - 債券類
    tier1: {
        corporateBond: {
            id: "corporateBond",
            name: "發行公司債",
            description: "發行公司債券籌資",
            icon: "📜",
            effects: {
                cash: 80,
                debt: 80
            },
            cooldown: 3
        },
        convertibleBond: {
            id: "convertibleBond",
            name: "可轉債",
            description: "發行可轉換公司債",
            icon: "🔀",
            effects: {
                cash: 120,
                debt: 120,
                stock_dilution: 1.15
            },
            cooldown: 4,
            requiresIPO: true
        },
        absLoan: {
            id: "absLoan",
            name: "ABS貸款",
            description: "以算力為抵押的資產證券化貸款",
            icon: "🏦",
            effects: {
                cash_per_pflops: 15,
                debt_per_pflops: 25
            },
            cooldown: 3
        },
        junkBond: {
            id: "junkBond",
            name: "垃圾債券",
            description: "高風險高回報債券",
            icon: "⚠️",
            effects: {
                cash: 200,
                debt: 280
            },
            cooldown: 5
        }
    },
    
    // Tier 2 - 股票類
    tier2: {
        ipo: {
            id: "ipo",
            name: "IPO上市",
            description: "首次公開募股",
            icon: "🔔",
            effects: {
                cash_multiplier: 0.25,
                hype: 35,
                regulation: 25
            },
            requiresIPO: false,
            oneTime: true,
            cooldown: -1
        },
        stockIssue: {
            id: "stockIssue",
            name: "增發新股",
            description: "增發新股籌資",
            icon: "📈",
            effects: {
                cash_multiplier: 0.12,
                stock_dilution: 1.15
            },
            requiresIPO: true,
            cooldown: 3
        },
        stockBuyback: {
            id: "stockBuyback",
            name: "股票回購",
            description: "回購公司股票",
            icon: "🔄",
            effects: {
                cash_cost: 80,
                hype: 12,
                stock_dilution: 0.92
            },
            requiresIPO: true,
            cooldown: 2
        }
    },
    
    // Tier 3 - 商業功能
    tier3: {
        acquisition: {
            id: "acquisition",
            name: "併購",
            description: "併購小型AI公司",
            icon: "🏢",
            effects: {
                cash_cost: 120,
                mp_boost: 3,
                senior: 2,
                junior: 3
            },
            cooldown: 5
        },
        industryContract: {
            id: "industryContract",
            name: "產業合約",
            description: "與大型企業簽訂長期AI服務合約",
            icon: "🤝",
            effects: {
                cash_per_quarter: 25,
                pflops_lock: 2,
                duration: 6
            },
            cooldown: 4
        },
        licensingDeal: {
            id: "licensingDeal",
            name: "技術授權",
            description: "授權核心技術給其他公司",
            icon: "📄",
            effects: {
                cash: 60,
                trust: 3
            },
            cooldown: 3
        }
    }
};

// 全球事件池
const GLOBAL_EVENTS = [
    { 
        name: "AI 泡沫警告", 
        desc: "分析師警告 AI 投資過熱，市場信心下降",
        effect: { I_Hype: -0.2 },
        type: 'negative'
    },
    { 
        name: "GPU 短缺", 
        desc: "全球 GPU 供應鏈緊張，價格上漲",
        effect: { P_GPU: 0.3 },
        type: 'negative'
    },
    { 
        name: "能源危機", 
        desc: "能源價格飆升影響數據中心運營",
        effect: { E_Price: 0.25 },
        type: 'negative'
    },
    { 
        name: "AI 突破新聞", 
        desc: "媒體大肆報導 AI 技術突破，市場熱情高漲",
        effect: { I_Hype: 0.3 },
        type: 'positive'
    },
    { 
        name: "利率調整", 
        desc: "央行調整基準利率",
        effect: { R_base: 0.15 },
        type: 'neutral'
    },
    { 
        name: "新 GPU 發布", 
        desc: "新一代 GPU 發布，舊型號價格下降",
        effect: { P_GPU: -0.2 },
        type: 'positive'
    },
    { 
        name: "平靜的一季", 
        desc: "市場穩定，各項指標平穩",
        effect: {},
        type: 'neutral'
    },
];

// 隨機事件池
const EVENT_POOL = {
    neutral: [
        { desc: "獲得政府研究補助", effect: "cash_gain", value: 20 },
        { desc: "開源社群貢獻了優質代碼", effect: "mp_boost", value: 1 },
        { desc: "前員工創業成功，回饋投資", effect: "cash_gain", value: 15 },
        { desc: "學術合作帶來數據資源", effect: "data_gain", value: 50 }
    ],
    crisis: [
        { desc: "核心員工被挖角", effect: "talent_loss", value: 1 },
        { desc: "數據中心意外停機", effect: "cash_loss", value: 15 },
        { desc: "模型出現嚴重偏見問題", effect: "trust_loss", value: 10 },
        { desc: "競爭對手發起專利訴訟", effect: "cash_loss", value: 25 }
    ],
    // === 與 doomGauge key 對應的事件池 ===
    regulation: [
        { desc: "監管機構要求提交合規報告", effect: "cash_loss", value: 10 },
        { desc: "新法規要求額外安全審查", effect: "cash_loss", value: 15 },
        { desc: "監管機構對公司進行調查", effect: { trust: -5, cash: -20 } },
        { desc: "政府要求暫停部分功能", effect: { hype: -10, cash: -10 } }
    ],
    entropy: [
        { desc: "內部管理混亂導致項目延誤", effect: { cash: -10, model_power: -1 } },
        { desc: "團隊溝通不暢，效率下降", effect: "cash_loss", value: 8 },
        { desc: "資深員工因公司氛圍離職", effect: "talent_loss", value: 1 },
        { desc: "內部系統出現嚴重問題", effect: { cash: -15, entropy: 5 } }
    ],
    compliance_risk: [
        { desc: "用戶數據洩露事件", effect: { trust: -15, cash: -30 } },
        { desc: "模型輸出引發公關危機", effect: { hype: -20, trust: -10 } },
        { desc: "被指控違反數據保護法規", effect: { cash: -25, compliance_risk: 10 } },
        { desc: "AI生成內容引發版權爭議", effect: { cash: -20, trust: -5 } }
    ],
    commercial_ruin: [
        { desc: "主要客戶取消合約", effect: "cash_loss", value: 30 },
        { desc: "融資談判失敗", effect: "cash_loss", value: 20 },
        { desc: "市場競爭加劇，收入下滑", effect: { cash: -15, hype: -5 } }
    ],
    internal_unraveling: [
        { desc: "核心團隊成員集體離職", effect: { loyalty: -15, entropy: 10 } },
        { desc: "內部派系鬥爭加劇", effect: { entropy: 15, trust: -5 } },
        { desc: "公司文化問題被媒體曝光", effect: { hype: -10, trust: -10 } }
    ],
    external_sanction: [
        { desc: "監管機構發出警告函", effect: { regulation: 10, cash: -10 } },
        { desc: "被列入政府重點監管名單", effect: { regulation: 15, hype: -5 } },
        { desc: "國際市場准入受限", effect: { cash: -20, hype: -10 } }
    ]
};

// 功能解鎖系統配置
const TIER_UNLOCK_CONFIG = {
    1: {
        title: 'Tier 1 解鎖：發展自身產品',
        icon: '🌐',
        color: 'var(--accent-cyan)',
        features: [
            { name: '商品發布', icon: '📦', desc: '通過里程碑可發布商業化產品，獲得市場獎勵' },
            { name: '社群系統', icon: '👥', desc: '開放社群生態經營，用戶規模影響營運需求與收益' },
            { name: '算力規劃', icon: '⚙️', desc: '可調整算力分配策略：優先社群、優先研發、平衡分配、自動雲端' }

        ],
        futureHint: '未來將開放：進入實體空間'
    },
    2: {
        title: 'Tier 2 解鎖：進入實體空間',
        icon: '⚡',
        color: 'var(--accent-yellow)',
        features: [
            { name: '空間電力', icon: '🏢', desc: '擁有足夠空間與電力供應，才能穩定發展' },
            { name: '策略藍圖', icon: '🪙', desc: '應用各種營運策略，降低風險或強化收益' },
            { name: '數據管理', icon: '📚', desc: '訓練更強大的模型，數據成為須管理的稀缺資源' }
        ],
        futureHint: '未來將開放：設施升級與規模化'
    },
    3: {
        title: 'Tier 3 解鎖：設施升級與規模化',
        icon: '🏛️',
        color: 'var(--accent-green)',
        features: [
            { name: '設施升級', icon: '🏭', desc: '技術升級以增強現有設施，促進使用效率' },
            { name: '擴大事業', icon: '🏢', desc: '穩定營運後，建立部門/子公司以擴大事業範圍' }
        ],
        futureHint: '未來將開放：區域與監管'
    },
    4: {
        title: 'Tier 4 解鎖：區域與監管',
        icon: '🌍',
        color: 'var(--accent-magenta)',
        features: [
            { name: '區域擴張', icon: '🗺️', desc: '可在不同地區設立分部，分散風險並捕捉機會' },
            { name: '遊說系統', icon: '🏛️', desc: '可透過遊說降低監管壓力，但消耗現金與信任' }
        ],
        futureHint: '未來將開放：對齊度認證、公開透明度報告'
    },
    5: {
        title: 'Tier 5：奇點降臨',
        icon: '🌟',
        color: 'var(--accent-purple)',
        features: [
            { name: 'AGI 達成', icon: '🤖', desc: '恭喜達成通用人工智能！根據你的路徑決定最終結局' },
            { name: '結局分歧', icon: '🎭', desc: '你的選擇將決定 AI 的未來：烏托邦、天網、或其他可能...' }
        ],
        futureHint: ''
    }
};

// 結局定義
const ENDINGS = {
    doom_failures: {
        commercial_ruin: { msg: "公司資金鏈斷裂，被迫清算。你的 AI 夢想在財務壓力下破滅。", type: "商業崩潰 - Commercial Ruin", victory: false },
        internal_unraveling: { msg: "核心團隊離散，公司失去研發能力。人才的流失讓你的願景無法實現。", type: "內部崩解 - Internal Unraveling", victory: false },
        external_sanction: { msg: "監管機構強制關閉公司。你的 AI 被認定為社會威脅。", type: "外部制裁 - External Sanction", victory: false }
    },
    singularity: {
        commercial: { msg: "你控制了 AI，並將其變成完美的賺錢機器。", type: "資本奴隸 - Commercial Victory", victory: true },
        debt_trap: { msg: "AGI 達成，但公司深陷債務泥潭，被銀行團接管。", type: "債務陷阱 - Debt Trap", victory: false },
        academic: { msg: "你的天才團隊創造了和諧的 AGI，開啟學術新紀元。", type: "學術巔峰 - Academic Victory", victory: true },
        team: { msg: "你的團隊忠誠度極高，AGI 與人類和諧共存。公司成為業界傳奇。", type: "團隊勝利 - Team Victory", victory: true },
        standard: { msg: "你創造了 AGI，但未來仍未可知。", type: "奇點協議 - Standard Victory", victory: true }
    },
    mid_game: {
        voluntary_shutdown: { msg: "不是因為做不到，而是因為你選擇不去做。", type: "下台一鞠躬 - One Giant Leap for Mankind", victory: false },
        hostile_acquisition: { msg: "你有技術，但沒有現金。\n你的公司被大型科技巨頭併購，淪為其一個充滿抱負但資源受限的部門。", type: "鯨魚與蝦米 - Whale's Prey", victory: false },
        gotterdammerung: { msg: "你的公司成為了技術官僚的墳墓，所有天才都因管理不善而離去。\n雖然資金充裕，但公司正從內部腐爛。", type: "諸神黃昏 - Götterdämmerung", victory: false },
        founder_to_fiver: { msg: "「失敗した失敗した失敗した失敗した失敗した」\n\n你證明了你個人是打不死的小強，甚至活得比你的公司還久。", type: "打工戰士 - Founder to Fiver", victory: false },
        peer_reviewed: { msg: "「學術的避風港？」\n\n你投了一整年的獎助金申請書最終被一所頂尖大學的院長看到，他發現你的企劃書寫得好棒。\n現在你正在替他趕教學計畫。", type: "春風化雨 - Peer Reviewed", victory: false },
        gilded_cage: { msg: "「誰愛幹誰幹。」\n\n你認為一技在手希望無窮，也認為興趣不能當飯吃。\n於是你緊抓著技術等待希望，工作也沒興趣了。", type: "職人當家 - Guilded Cage", victory: false },
        clothes_man: { msg: "「只是套了一件衣服。」\n\n一位資深工程師在GitHub貼了 5 行程式碼，證明你的「創新模型」只是在調用某大廠 API。\n你的公司成為科技圈最大笑柄。", type: "國王新衣 - Clothes make the man", victory: false },
        the_last_arbitrage: { msg: "「不勞而獲的冠軍。」\n\n雖然對手掌握了奇點，但你掌握了對手。\n不能解決問題，就買下能解決問題的人。", type: "最後的晚餐 - The Last Arbitrage", victory: true }
    }
};

// 全局配置對象
const GameConfig = {
    GLOBAL_PARAMS_INITIAL,
    REVENUE_BASE,
    COSTS,
    TECH_ROUTES,
    RIVALS_CONFIG,
    FINANCE_ACTIONS,
    GLOBAL_EVENTS,
    EVENT_POOL,
    TIER_UNLOCK_CONFIG,
    ENDINGS
};

// 確認配置已載入
console.log('Game configuration loaded');

// 支援模組化環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}

// 整合 ProductConfig（在 products_config.js 載入後執行）
function integrateProductConfig() {
    if (typeof ProductConfig === 'undefined') {
        console.warn('ProductConfig not loaded yet');
        return;
    }
    
    // 複製 MASTERY_LEVELS
    GameConfig.MASTERY_LEVELS = ProductConfig.MASTERY_LEVELS;
    
    // 複製 COMPUTE_STRATEGIES
    GameConfig.COMPUTE_STRATEGIES = ProductConfig.COMPUTE_STRATEGIES;
    
    // 轉換 PRODUCT_LINES 結構以符合 GameUI 期望
    GameConfig.PRODUCT_LINES = {};
    
    var routeNames = {
        "Scaling Law": { name: "規模擴展產品線", description: "OpenAI 風格：燒錢換智力，擴張訂閱" },
        "Multimodal": { name: "多模態產品線", description: "Google 風格：垂直應用，高合規風險" },
        "Efficiency": { name: "效率優化產品線", description: "DeepMind 風格：專利授權，抗通膨" },
        "Embodied": { name: "具身智慧產品線", description: "Tesla 風格：硬體預售" },
        "OpenSource": { name: "開源生態產品線", description: "Meta 風格：社群生態" },
        "Military": { name: "軍事AI產品線", description: "Palantir 風格：國防合約" }
    };
    
    for (var routeKey in ProductConfig.PRODUCT_LINES) {
        var routeData = ProductConfig.PRODUCT_LINES[routeKey];
        var routeMeta = routeNames[routeKey] || { name: routeKey, description: "" };
        
        var convertedRoute = {
            name: routeMeta.name,
            description: routeMeta.description,
            tiers: {}
        };
        
        for (var tierNum = 1; tierNum <= 4; tierNum++) {
            var tierKey = "tier" + tierNum;
            var tierData = routeData[tierKey];
            
            if (tierData && tierData.products) {
                convertedRoute.tiers[tierNum] = tierData.products.map(function(product) {
                    return {
                        id: product.id,
                        name: product.name,
                        type: product.type,
                        icon: product.icon,
                        description: product.description,
                        cost: {
                            cash: (product.devCost && product.devCost.cash) || 0,
                            data: (product.devCost && product.devCost.data) || 0
                        },
                        devTime: product.devTurns || 0,
                        effects: product.effects || {},
                        risks: product.risks || {},
                        requiresTuring: product.requiresTuring || false,
                        requiresSenior: product.requiresSenior || false
                    };
                });
            } else {
                convertedRoute.tiers[tierNum] = [];
            }
        }
        
        GameConfig.PRODUCT_LINES[routeKey] = convertedRoute;
    }
    
    console.log('✓ ProductConfig integrated into GameConfig');
}

// 監聽 ProductConfig 載入完成後整合
if (typeof ProductConfig !== 'undefined') {
    integrateProductConfig();
} else {
    document.addEventListener('DOMContentLoaded', integrateProductConfig);
}