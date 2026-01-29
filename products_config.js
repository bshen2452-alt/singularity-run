// ============================================
// 奇點競速 - 商品系統配置 (Products Config)
// ============================================
// 純數據配置，無邏輯混雜

const ProductConfig = {
    
    // ==========================================
    // 算力分配策略（與 ComputeConfig.STRATEGY_ALLOCATION 同步）
    // ==========================================
    // 注意：實際分配邏輯在 ComputeEngine，這裡提供 UI 顯示用的配置
    COMPUTE_STRATEGIES: {
        "ResearchFocus": {
            name: "研發優先",
            icon: "🔬",
            description: "最大化模型訓練算力，犧牲服務品質與商品開發",
            // UI 顯示用的分配比例說明
            allocation: { inference: 0.5, training: 0.35, product: 0.15 },
            // 效果說明（實際效果由 ComputeEngine 計算）
            effects: { 
                product_speed: 0.5,      // 商品開發較慢
                service_quality: 0.6,    // 服務品質較低
                mp_growth: 1.2           // MP成長較快
            },
            warnings: ["推論服務可能不足", "社群可能流失"]
        },
        "ProductFocus": {
            name: "服務優先",
            icon: "📦",
            description: "優先保障推論服務品質，大幅降低研發速度",
            allocation: { inference: 0.8, training: 0.05, product: 0.15 },
            effects: { 
                product_speed: 0.8,
                service_quality: 1.2, 
                mp_growth: 0.3 
            },
            warnings: ["MP成長緩慢"]
        },
        "Balanced": {
            name: "平衡發展",
            icon: "⚖️",
            description: "均衡分配算力資源",
            allocation: { inference: 0.6, training: 0.25, product: 0.15 },
            effects: { 
                product_speed: 1.0, 
                service_quality: 1.0, 
                mp_growth: 1.0 
            },
            warnings: []
        },
        "CloudBursting": {
            name: "雲端租賃",
            icon: "☁️",
            description: "自動租用雲端算力滿足推論需求，成本較高",
            allocation: { inference: 1.0, training: 0.3, product: 0.2 },
            effects: { 
                product_speed: 1.1, 
                service_quality: 1.3, 
                mp_growth: 0.9, 
                cloud_cost_mult: 1.5 
            },
            warnings: ["營運成本增加"]
        }
    },
    
    // 專精度等級
    // inference_reduction: 推論需求減免百分比
    MASTERY_LEVELS: {
        0: { name: "入門", exp_required: 0, mp_bonus: 0, milestone_bonus: 0, inference_reduction: 0, unlock_skills: 0 },
        1: { name: "熟練", exp_required: 2, mp_bonus: 0.05, milestone_bonus: 5, inference_reduction: 0.05, unlock_skills: 1 },
        2: { name: "專家", exp_required: 5, mp_bonus: 0.10, milestone_bonus: 10, inference_reduction: 0.10, unlock_skills: 2 },
        3: { name: "大師", exp_required: 9, mp_bonus: 0.15, milestone_bonus: 15, inference_reduction: 0.15, unlock_skills: 3 },
        4: { name: "傳奇", exp_required: 14, mp_bonus: 0.20, milestone_bonus: 20, inference_reduction: 0.20, unlock_skills: 4 },
        5: { name: "神話", exp_required: 20, mp_bonus: 0.25, milestone_bonus: 25, inference_reduction: 0.25, unlock_skills: 5 }
    },
    
    // 各技術路線的產品線定義
    // 每個Tier有3個產品：里程碑產品(milestone) + 2個可開發產品(unlockable)
    PRODUCT_LINES: {
        "Scaling Law": {
            tier1: {
                mastery_bonus: { mp_growth: 0.05, milestone_success: 5 },
                products: [
                    {
                        id: "sl_t1_milestone",
                        name: "通用模型v1. Giant-Chat 通用基座",
                        type: "milestone",
                        icon: "💬",
                        description: "算力堆疊的起點，目標是理解語法。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 100, hype: 10, trust: 5, revenue_base: 5 },
                        risks: { entropy: 5, compliance_risk: 5 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "sl_t1_native",
                        name: "場景原生 v1. 工作流程對話助手",
                        type: "unlockable",
                        icon: "📱",
                        description: "貼近用戶辦公室情境，建立初步社群。",
                        devCost: { cash: 30, data: 100 },
                        devTurns: 2,
                        effects: { community: 50, hype: 5, revenue_base: 8, revenue_bonus: 10 },
                        risks: { compliance_risk: 3 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "sl_t1_vertical",
                        name: "垂直專家 v1. 法律/醫療診斷助手",
                        type: "unlockable",
                        icon: "⚖️",
                        description: "針對特定領域小規模訓練，建立專業信任。",
                        devCost: { cash: 40, data: 80 },
                        devTurns: 3,
                        effects: { trust: 10, revenue_base: 12, revenue_bonus: 15 },
                        risks: { regulation: 5 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier2: {
                mastery_bonus: { mp_growth: 0.08, milestone_success: 8 },
                products: [
                    {
                        id: "sl_t2_milestone",
                        name: "通用模型 v2. 多模態湧現基座 (70B)",
                        type: "milestone",
                        icon: "🖼️",
                        description: "模型湧現邏輯推理能力，解決各種問題。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 500, hype: 25, trust: 10, revenue_base: 20 },
                        risks: { entropy: 10, compliance_risk: 10 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "sl_t2_native",
                        name: "場景原生 v2. 智慧工作流整合",
                        type: "unlockable",
                        icon: "🔧",
                        description: "將 AI 嵌入企業 ERP，產生大量用戶反饋數據。",
                        devCost: { cash: 60, data: 150 },
                        devTurns: 3,
                        effects: { community: 200, hype: 15, revenue_bonus: 20 },
                        risks: { compliance_risk: 8 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "sl_t2_vertical",
                        name: "垂直專家 v2. 行業私有化部署",
                        type: "unlockable",
                        icon: "🏭",
                        description: "灌注專精資料，實現具體情境零幻覺輸出。",
                        devCost: { cash: 80, data: 200 },
                        devTurns: 4,
                        effects: { community: 150, revenue_base: 25, trust: -5 },
                        risks: { entropy: 8, regulation: 10 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier3: {
                mastery_bonus: { mp_growth: 0.12, milestone_success: 12 },
                products: [
                    {
                        id: "sl_t3_milestone",
                        name: "通用模型 v3. 思考鏈邏輯模型 (SCoT)",
                        type: "milestone",
                        icon: "🧩",
                        description: "導入強化學習，模型具備自我修正與深思熟慮能力。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 2000, hype: 40, trust: 15, revenue_base: 50 },
                        risks: { entropy: 15, compliance_risk: 15, regulation: 10 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "sl_t3_native",
                        name: "場景原生 v3. 自主代理人生態",
                        type: "unlockable",
                        icon: "🔬",
                        description: "AI 自主作業，解放人類時間與精力。",
                        devCost: { cash: 100, data: 300 },
                        devTurns: 4,
                        effects: { trust: 20, revenue_base: 30, alignment: 10 },
                        risks: { compliance_risk: 5 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "sl_t3_vertical",
                        name: "垂直專家 v3. 科研/製藥模擬器",
                        type: "unlockable",
                        icon: "🧬",
                        description: "在微觀領域超越人類專家，掌握核心技術產權。",
                        devCost: { cash: 120, data: 250 },
                        devTurns: 3,
                        effects: { community: 500, revenue_bonus: 30, hype: 20 },
                        risks: { trust: -10 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier4: {
                mastery_bonus: { mp_growth: 0.15, milestone_success: 15 },
                products: [
                    {
                        id: "sl_t4_milestone",
                        name: "通用模型v4. The-Core 萬能核心",
                        type: "milestone",
                        icon: "🛐",
                        description: "具備自我意識雛形的巨型模型，能理解萬物。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 10000, hype: 80, trust: 20, revenue_base: 100 },
                        risks: { entropy: 25, compliance_risk: 25, regulation: 20 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "sl_t4_native",
                        name: "場景原生 v4. 現實控制界面",
                        type: "unlockable",
                        icon: "🌄",
                        description: "依靠虛擬運算預測現實，消除數位與實體的邊界。",
                        devCost: { cash: 200, data: 500 },
                        devTurns: 5,
                        effects: { revenue_base: 80, revenue_bonus: 50, hype: 30 },
                        risks: { entropy: 15, regulation: 15 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "sl_t4_vertical",
                        name: "垂直專家 v4. 全知學科聖殿",
                        type: "unlockable",
                        icon: "🏛️",
                        description: "積累所有知識，解決所有已知的科學難題。",
                        devCost: { cash: 150, data: 400 },
                        devTurns: 4,
                        effects: { trust: 30, alignment: 20, compliance_risk: -15 },
                        risks: {},
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            }
        },
        
        "Multimodal": {
            tier1: {
                mastery_bonus: { mp_growth: 0.05, milestone_success: 5 },
                products: [
                    {
                        id: "mm_t1_milestone",
                        name: "娛樂創作v1. Text-to-Image 文字藝術師",
                        type: "milestone",
                        icon: "🎨",
                        description: "文字轉圖像AI產品",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 150, hype: 15, revenue_base: 6 },
                        risks: { entropy: 3, compliance_risk: 8 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "mm_t1_int",
                        name: "人機互動v1. Soul-Mate 虛擬筆友",
                        type: "unlockable",
                        icon: "♥️",
                        description: "AI生成互動文本，提供情緒價值",
                        devCost: { cash: 35, data: 120 },
                        devTurns: 2,
                        effects: { community: 80, trust: 10, revenue_base: 7 },
                        risks: { compliance_risk: 5 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "mm_t1_sci",
                        name: "科研協作v1. Molecule-Reader 論文摘要",
                        type: "unlockable",
                        icon: "✏️",
                        description: "自動總結論文摘要",
                        devCost: { cash: 30, data: 90 },
                        devTurns: 2,
                        effects: { trust: 8, revenue_base: 8, revenue_bonus: 8 },
                        risks: { compliance_risk: 3 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier2: {
                mastery_bonus: { mp_growth: 0.08, milestone_success: 8 },
                products: [
                    {
                        id: "mm_t2_milestone",
                        name: "娛樂創作v2. Virtuoso 虛擬編導",
                        type: "milestone",
                        icon: "🎥",
                        description: "理解劇本邏輯的自主剪輯工具",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 600, hype: 30, revenue_base: 18 },
                        risks: { entropy: 8, compliance_risk: 12 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "mm_t2_int",
                        name: "人機互動v2. Empathy-Core 情感解析器",
                        type: "unlockable",
                        icon: "👼",
                        description: "精確判讀人類微表情與潛台詞",
                        devCost: { cash: 50, data: 180 },
                        devTurns: 3,
                        effects: { community: 200, true: 20, revenue_bonus: 15 },
                        risks: { compliance_risk: 10 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "mm_t2_sci",
                        name: "科研協作v2. Synthesis-Lab 實驗推演",
                        type: "unlockable",
                        icon: "🧪",
                        description: "預測化學反應與物理實驗結果，減少實體實驗",
                        devCost: { cash: 70, data: 220 },
                        devTurns: 4,
                        effects: { community: 100, revenue_base: 22, trust: 15 },
                        risks: { compliance_risk: 6 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier3: {
                mastery_bonus: { mp_growth: 0.12, milestone_success: 12 },
                products: [
                    {
                        id: "mm_t3_milestone",
                        name: "娛樂創作v3. Meta-Manager 虛擬經紀人",
                        type: "milestone",
                        icon: "🤹",
                        description: "AI 自主經營虛擬偶像",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 2500, hype: 50, revenue_base: 45 },
                        risks: { entropy: 12, compliance_risk: 18, regulation: 8 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "mm_t3_int",
                        name: "人機互動v3. Society-Glue 社會黏合劑",
                        type: "unlockable",
                        icon: "🚥",
                        description: "在社群平台自主調節衝突、引導輿論的 AI 代理",
                        devCost: { cash: 90, data: 280 },
                        devTurns: 4,
                        effects: { community: 400, trust: 35, revenue_base: 28 },
                        risks: { compliance_risk: 8 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "mm_t3_sci",
                        name: "科研協作v3. Auto-Lab 實驗室負責人",
                        type: "unlockable",
                        icon: "🧑‍🔬",
                        description: "AI 自主設計、營運實體實驗",
                        devCost: { cash: 110, data: 350 },
                        devTurns: 5,
                        effects: { revenue_bonus: 35, trust: 28 },
                        risks: { compliance_risk: 15, regulation: 12 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier4: {
                mastery_bonus: { mp_growth: 0.15, milestone_success: 15 },
                products: [
                    {
                        id: "mm_t4_milestone",
                        name: "娛樂創作v4.Synesthesia-World 聯覺世界",
                        type: "milestone",
                        icon: "🧠",
                        description: "電腦連通人腦，神經訊號轉化為虛擬現實",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 8000, hype: 90, trust: 15, revenue_base: 90 },
                        risks: { entropy: 20, compliance_risk: 22, regulation: 18 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "mm_t4_int",
                        name: "人機互動v4. Social-Construction 社會建構工程",
                        type: "unlockable",
                        icon: "🔮",
                        description: "透由 AI 對人性的洞察，引導人類社會和諧",
                        devCost: { cash: 180, data: 450 },
                        devTurns: 5,
                        effects: { revenue_base: 70, trust: 40, community: 2000 },
                        risks: { compliance_risk: 18 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "mm_t4_sci",
                        name: "科研協作v4. Theorem-Hunter 定理獵人",
                        type: "unlockable",
                        icon: "🧬",
                        description: "AI 自行探索研究、發現人類未知的守則與技術",
                        devCost: { cash: 200, data: 500 },
                        devTurns: 6,
                        effects: { trust: 30, alignment: 15 },
                        risks: { entropy: 18, regulation: 20 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            }
        },
        
        "Efficiency": {
            tier1: {
                mastery_bonus: { mp_growth: 0.05, milestone_success: 5 },
                products: [
                    {
                        id: "ef_t1_milestone",
                        name: "前沿演算v1. 神經元剪枝",
                        type: "milestone",
                        icon: "⚡",
                        description: "初步演算法優化，提升模型反應速度。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 80, hype: 8, trust: 12, revenue_base: 4 },
                        risks: { entropy: 2, compliance_risk: 2 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "ef_t1_sdk",
                        name: "極致效率v1. Cooling-Mind 蒸餾器",
                        type: "unlockable",
                        icon: "📚",
                        description: "將大模型能力濃縮，降低推論成本。",
                        devCost: { cash: 25, data: 60 },
                        devTurns: 2,
                        effects: { community: 60, trust: 8, revenue_base: 5 },
                        risks: {},
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "ef_t1_lic",
                        name: "邊緣運算v1. Tiny-Brain 嵌入模組",
                        type: "unlockable",
                        icon: "🛠️",
                        description: "功能簡單的物聯網模組",
                        devCost: { cash: 20, data: 40 },
                        devTurns: 1,
                        effects: { revenue_bonus: 12, trust: 5 },
                        risks: { trust: -3 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier2: {
                mastery_bonus: { mp_growth: 0.08, milestone_success: 8 },
                products: [
                    {
                        id: "ef_t2_milestone",
                        name: "前沿演算v2. 跨模態融合架構",
                        type: "milestone",
                        icon: "💾",
                        description: "知識蒸餾與模型壓縮",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 200, hype: 15, trust: 18, revenue_base: 12 },
                        risks: { entropy: 4, compliance_risk: 4 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "ef_t2_sdk",
                        name: "極致效率v2. Carbon-Neutral 節能中樞",
                        type: "unlockable",
                        icon: "🔲",
                        description: "更節能的硬體設計",
                        devCost: { cash: 80, data: 100 },
                        devTurns: 4,
                        effects: { revenue_bonus: 25, trust: 10 },
                        risks: { compliance_risk: 5 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "ef_t2_lic",
                        name: "邊緣運算v2. Local-Brain 離線個人助理",
                        type: "unlockable",
                        icon: "🖥️",
                        description: "優化模型在本機的運行效率，無需聯網。",
                        devCost: { cash: 50, data: 120 },
                        devTurns: 3,
                        effects: { community: 100, revenue_base: 15, trust: 8 },
                        risks: {},
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier3: {
                mastery_bonus: { mp_growth: 0.12, milestone_success: 12 },
                products: [
                    {
                        id: "ef_t3_milestone",
                        name: "前沿演算v3. Self-Refactor 自我重構",
                        type: "milestone",
                        icon: "🔍",
                        description: "AI 代理人能根據當前任務，自主編寫更高效的程式碼來執行",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 800, hype: 25, trust: 25, revenue_base: 30 },
                        risks: { entropy: 8, compliance_risk: 6 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "ef_t3_sdk",
                        name: "極致效率v3.Energy-Arbitrator 能源仲裁者",
                        type: "unlockable",
                        icon: "🌡️",
                        description: "極致的算力調度，大幅降低營運成本。",
                        devCost: { cash: 100, data: 200 },
                        devTurns: 4,
                        effects: { community: 300, revenue_base: 25, hype: 15 },
                        risks: { compliance_risk: 8 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "ef_t3_lic",
                        name: "邊緣運算v3. Edge-Sovereign 邊緣主權",
                        type: "unlockable",
                        icon: "🚗",
                        description: "斷網的設備也能具備強大的 AI 代理能力",
                        devCost: { cash: 60, data: 150 },
                        devTurns: 3,
                        effects: { trust: 20, alignment: 15 },
                        risks: {},
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier4: {
                mastery_bonus: { mp_growth: 0.15, milestone_success: 15 },
                products: [
                    {
                        id: "ef_t4_milestone",
                        name: "前沿演算v4. Post-Silicon 矽後計算",
                        type: "milestone",
                        icon: "⚛️",
                        description: "放棄矽晶圓，轉向生物 DNA 或光子計算的全新架構",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 3000, hype: 60, trust: 30, revenue_base: 60 },
                        risks: { entropy: 12, compliance_risk: 10 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "ef_t4_sdk",
                        name: "極致效率v4. Entropy-Zero 零熵演算法",
                        type: "unlockable",
                        icon: "🔬",
                        description: "實現近乎無損的運算，業界終極標準。",
                        devCost: { cash: 180, data: 300 },
                        devTurns: 5,
                        effects: { revenue_base: 50, revenue_bonus: 40, hype: 30 },
                        risks: { compliance_risk: 8 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "ef_t4_lic",
                        name: "邊緣運算v4. Gaia-Pulse 蓋婭脈動",
                        type: "unlockable",
                        icon: "🌱",
                        description: "利用環境中的微弱信號進行運算，讓整顆星球變成最大的模型運轉",
                        devCost: { cash: 100, data: 200 },
                        devTurns: 3,
                        effects: { trust: 35, compliance_risk: -20 },
                        risks: {},
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            }
        },
        
        "Embodied": {
            tier1: {
                mastery_bonus: { mp_growth: 0.05, milestone_success: 5 },
                products: [
                    {
                        id: "em_t1_milestone",
                        name: "人形機器人v1. Servo-OS 硬體控制元件",
                        type: "milestone",
                        icon: "📢",
                        description: "讓機器人具備基礎語言理解力",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 60, hype: 12, trust: 8, revenue_base: 5 },
                        risks: { entropy: 3, compliance_risk: 3 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "em_t1_industrial",
                        name: "工業機器人v1. Pick-Logic 視覺分析",
                        type: "unlockable",
                        icon: "😶",
                        description: "讓機器人能以視覺辨別環境",
                        devCost: { cash: 40, data: 80 },
                        devTurns: 3,
                        effects: { hype: 15, revenue_base: 8 },
                        risks: { compliance_risk: 8, regulation: 5 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "em_t1_logistics",
                        name: "智慧物流v1. Last-Mile 配送小車",
                        type: "unlockable",
                        icon: "🚛",
                        description: "在封閉園區內進行末端配送，採集基礎路況數據。",
                        devCost: { cash: 35, data: 70 },
                        devTurns: 2,
                        effects: { trust: 10, revenue_bonus: 10 },
                        risks: { compliance_risk: 4 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier2: {
                mastery_bonus: { mp_growth: 0.08, milestone_success: 8 },
                products: [
                    {
                        id: "em_t2_milestone",
                        name: "人形機器人v2. General-Worker 泛用靈巧手",
                        type: "milestone",
                        icon: "👏",
                        description: "突破手部自由度，可操作 90% 的人類工具。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 400, hype: 30, trust: 12, revenue_base: 15 },
                        risks: { entropy: 6, compliance_risk: 8 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "em_t2_industrial",
                        name: "工業機器人v2. Adaptive-Line 自適應產線",
                        type: "unlockable",
                        icon: "🧑‍🏭",
                        description: "具備視覺反饋的動態產線，與人類員工安全共存。",
                        devCost: { cash: 70, data: 150 },
                        devTurns: 3,
                        effects: { revenue_base: 20, revenue_bonus: 18 },
                        risks: { compliance_risk: 5 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "em_t2_logistics",
                        name: "智慧物流v2. Urban-Flow 無人機隊",
                        type: "unlockable",
                        icon: "🛸",
                        description: "跨越地形障礙，獲取大量城市環境長尾數據。",
                        devCost: { cash: 60, data: 130 },
                        devTurns: 3,
                        effects: { community: 150, hype: 18, revenue_base: 12 },
                        risks: { regulation: 8 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier3: {
                mastery_bonus: { mp_growth: 0.12, milestone_success: 12 },
                products: [
                    {
                        id: "人形機器人v3. em_t3_milestone",
                        name: "Civil-Servant 服務大師",
                        type: "milestone",
                        icon: "👨‍👩‍👧",
                        description: "語言與動作對齊，進入養老、照護與基層服務領域。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 1500, hype: 50, trust: 15, revenue_base: 40 },
                        risks: { entropy: 12, compliance_risk: 15, regulation: 10 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "em_t3_industrial",
                        name: "工業機器人v3. Black-Factory 黑燈代理",
                        type: "unlockable",
                        icon: "🏭",
                        description: "無需照明與空調的完全自主工廠，產能極致化。",
                        devCost: { cash: 120, data: 250 },
                        devTurns: 5,
                        effects: { trust: 25, revenue_base: 35 },
                        risks: { compliance_risk: 12, regulation: 15 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "em_t3_logistics",
                        name: "智慧物流v3. City-Vortex 全自動配送網",
                        type: "unlockable",
                        icon: "🌀",
                        description: "城市級別的資源調度，實現物流即時化。",
                        devCost: { cash: 100, data: 200 },
                        devTurns: 4,
                        effects: { revenue_bonus: 30, hype: 20 },
                        risks: { compliance_risk: 10 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier4: {
                mastery_bonus: { mp_growth: 0.15, milestone_success: 15 },
                products: [
                    {
                        id: "em_t4_milestone",
                        name: "人形機器人v4. Self-Assembly 自組裝維修者",
                        type: "milestone",
                        icon: "💪",
                        description: "具備自我修復與自我進化能力的仿生人",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 5000, hype: 70, trust: 10, revenue_base: 80 },
                        risks: { entropy: 18, compliance_risk: 20, regulation: 25 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "em_t4_industrial",
                        name: "工業機器人v4. Self-replicating 自我複製蜂巢",
                        type: "unlockable",
                        icon: "🚀",
                        description: "AI 自主在極端環境（深海、月球）建設全自動工廠",
                        devCost: { cash: 200, data: 400 },
                        devTurns: 6,
                        effects: { hype: 50, trust: 20, revenue_base: 60 },
                        risks: { compliance_risk: 8 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "em_t4_logistics",
                        name: "智慧物流v4. Hyper-Loop 全球脈絡",
                        type: "unlockable",
                        icon: "🌍",
                        description: "結合超音速管道與演算法的全球物流網",
                        devCost: { cash: 150, data: 350 },
                        devTurns: 5,
                        effects: { community: 3000, revenue_bonus: 45 },
                        risks: { trust: -15, regulation: 18 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            }
        },
        
        "OpenSource": {
            tier1: {
                mastery_bonus: { mp_growth: 0.05, milestone_success: 5 },
                products: [
                    {
                        id: "os_t1_milestone",
                        name: "普及推廣v1. Lite-Chat 微型對話核",
                        type: "milestone",
                        icon: "📞",
                        description: "低階手機可用的免費AI",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 200, hype: 12, revenue_base: 2 },
                        risks: { entropy: 5, compliance_risk: 2 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "os_t1_decentral",
                        name: "去中心化v1. P2P 知識節點",
                        type: "unlockable",
                        icon: "📨",
                        description: "利用用戶閒置硬體進行分散式推理。",
                        devCost: { cash: 20, data: 50 },
                        devTurns: 2,
                        effects: { community: 500, revenue_base: 6, trust: 15, data: 50 },
                        risks: { entropy: 20, regulation: 10 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "os_t1_standard",
                        name: "標準制定v1. Schema-One 語義標準",
                        type: "unlockable",
                        icon: "📕",
                        description: "定義 AI 交換格式，讓所有開源模型能互相溝通。",
                        devCost: { cash: 15, data: 30 },
                        devTurns: 1,
                        effects: { revenue_bonus: 10, trust: 20, alignment: 5 },
                        risks: { regulation: 5 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier2: {
                mastery_bonus: { mp_growth: 0.08, milestone_success: 8 },
                products: [
                    {
                        id: "os_t2_milestone",
                        name: "普及推廣v2. Logic-Mesh 協作推理網路",
                        type: "milestone",
                        icon: "👥",
                        description: "多裝置協作，將低品質數據轉化為實用功能。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 800, trust: 22, revenue_base: 8 },
                        risks: { entropy: 20, regulation: 5 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "os_t2_decentral",
                        name: "去中心化v2. Open-Oracle 市場預測系統",
                        type: "unlockable",
                        icon: "🛒",
                        description: "無審查的預測模型，社群共同治理。",
                        devCost: { cash: 40, data: 100 },
                        devTurns: 3,
                        effects: { community: 800, revenue_base: 12, hype: 10, data: 100 },
                        risks: { compliance_risk: 6, regulation: 10 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "os_t2_standard",
                        name: "標準制定v2. Inter-Model 協議 2.0",
                        type: "unlockable",
                        icon: "🔗",
                        description: "跨廠商協作標準，確立品牌權威。",
                        devCost: { cash: 50, data: 120 },
                        devTurns: 3,
                        effects: { trust: 18, revenue_bonus: 15, alignment: 8 },
                        risks: { regulation: 3 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier3: {
                mastery_bonus: { mp_growth: 0.12, milestone_success: 12 },
                products: [
                    {
                        id: "os_t3_milestone",
                        name: "普及推廣v3. DAO-Governor 自治協議",
                        type: "milestone",
                        icon: "🕸️",
                        description: "讓百萬用戶參與標記，自動產生通用數據。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 3000, hype: 35,  revenue_base: 25 },
                        risks: { entropy: 20, compliance_risk: 8 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "os_t3_decentral",
                        name: "去中心化v3. Logic-Cloud 共享大腦",
                        type: "unlockable",
                        icon: "⚖️",
                        description: "透過全球閒置算力網路建立 24 小時個人 AI 特助",
                        devCost: { cash: 60, data: 150 },
                        devTurns: 3,
                        effects: { community: 500, trust: 28 },
                        risks: { regulation: 18 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "os_t3_standard",
                        name: "標準制定v3. Universal-Action 標準行為模式",
                        type: "unlockable",
                        icon: "🏆",
                        description: "定義 AI 操作所有軟硬體的終極行為規範。",
                        devCost: { cash: 40, data: 80 },
                        devTurns: 2,
                        effects: { trust: 25, alignment: 15, compliance_risk: -10 },
                        risks: {},
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier4: {
                mastery_bonus: { mp_growth: 0.15, milestone_success: 15 },
                products: [
                    {
                        id: "os_t4_milestone",
                        name: "普及推廣v4. Open-Science 知識湧現平台",
                        type: "milestone",
                        icon: "💡",
                        description: "全球協作，技術民主化。",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 15000, hype: 80, trust: 40, revenue_base: 40 },
                        risks: { entropy: 20, compliance_risk: 12 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "os_t4_decentral",
                        name: "去中心化v4. Swarm-Intelligence 集體智慧",
                        type: "unlockable",
                        icon: "🌍",
                        description: "連接全球裝置，無需核心伺服器的超智能體。",
                        devCost: { cash: 100, data: 200 },
                        devTurns: 4,
                        effects: { trust: 40 },
                        risks: { regulation: 25 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "os_t4_universal",
                        name: "標準制定v4. Evolution-Standard 進化協議",
                        type: "unlockable",
                        icon: "🏛️",
                        description: "制定 AI 技術自我迭代的標準規則。",
                        devCost: { cash: 80, data: 180 },
                        devTurns: 4,
                        effects: { community: 5000, trust: 30, alignment: 25, revenue_bonus: 25 },
                        risks: { regulation: 15 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            }
        },
        
        "Military": {
            tier1: {
                mastery_bonus: { mp_growth: 0.05, milestone_success: 5 },
                products: [
                    {
                        id: "mi_t1_milestone",
                        name: "戰場決策v1. War-Room 兵棋助手",
                        type: "milestone",
                        icon: "📊",
                        description: "分析歷史情報數據，提供軍事建議",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 30, hype: 5, trust: 5, revenue_base: 10 },
                        risks: { entropy: 3, compliance_risk: 5, regulation: 3 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "mi_t1_drone",
                        name: "無人集群v1. Eagle-Eye 影像標註員",
                        type: "unlockable",
                        icon: "🔍",
                        description: "優異的衛星圖像辨識工具",
                        devCost: { cash: 50, data: 100 },
                        devTurns: 3,
                        effects: { trust: 12, revenue_base: 15 },
                        risks: { regulation: 5 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "mi_t1_cyber",
                        name: "網路資安v1. Ghost-Wall 代碼審計員",
                        type: "unlockable",
                        icon: "📟",
                        description: "自動掃描系統漏洞",
                        devCost: { cash: 40, data: 80 },
                        devTurns: 2,
                        effects: { revenue_bonus: 15, trust: 8 },
                        risks: { compliance_risk: 3 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier2: {
                mastery_bonus: { mp_growth: 0.08, milestone_success: 8 },
                products: [
                    {
                        id: "mi_t2_milestone",
                        name: "戰場決策v2. Grand-Strategist 戰區司令",
                        type: "milestone",
                        icon: "🗺️",
                        description: "即時模擬多方博弈，計算戰場最優解",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 50, hype: 10, trust: 10, revenue_base: 25 },
                        risks: { entropy: 6, compliance_risk: 10, regulation: 8 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "mi_t2_drone",
                        name: "無人集群v2. Swarm-Commander 蜂群意識",
                        type: "unlockable",
                        icon: "🐝",
                        description: "具備自主戰術配合能力的無人機群",
                        devCost: { cash: 80, data: 180 },
                        devTurns: 4,
                        effects: { hype: 20, revenue_base: 30 },
                        risks: { trust: -10, regulation: 12 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "mi_t2_cyber",
                        name: "網路資安v2. Zero-Day Hunter 漏洞獵人",
                        type: "unlockable",
                        icon: "🎯",
                        description: "AI 主動推導並發現網路系統未知漏洞",
                        devCost: { cash: 60, data: 150 },
                        devTurns: 3,
                        effects: { trust: 15, revenue_bonus: 20 },
                        risks: { compliance_risk: 6 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier3: {
                mastery_bonus: { mp_growth: 0.12, milestone_success: 12 },
                products: [
                    {
                        id: "mi_t3_milestone",
                        name: "戰場決策v3. Theater-Commander 戰區代理人",
                        type: "milestone",
                        icon: "⚔️",
                        description: "AI 自主指揮全域行動，人類僅需做最終決定權",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 100, hype: 25, trust: -10, revenue_base: 60 },
                        risks: { entropy: 15, compliance_risk: 20, regulation: 20 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "mi_t3_drone",
                        name: "無人集群v3. Hunter-Seeker 獵殺者",
                        type: "unlockable",
                        icon: "🧿",
                        description: "具備長期潛伏與自主識別目標能力的微型無人機",
                        devCost: { cash: 100, data: 250 },
                        devTurns: 4,
                        effects: { trust: 20, revenue_base: 40 },
                        risks: { compliance_risk: 12 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "mi_t3_cyber",
                        name: "網路資安v3. Cyber-Centurion 網路百夫長",
                        type: "unlockable",
                        icon: "🎖️",
                        description: "自主修補漏洞並主動反擊駭客的資安系統",
                        devCost: { cash: 90, data: 200 },
                        devTurns: 4,
                        effects: { revenue_bonus: 35, alignment: 5 },
                        risks: { regulation: 10 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            },
            tier4: {
                mastery_bonus: { mp_growth: 0.15, milestone_success: 15 },
                products: [
                    {
                        id: "mi_t4_milestone",
                        name: "戰場決策v4. Future-Sight 戰略預測機",
                        type: "milestone",
                        icon: "🏰",
                        description: "精準預測數年跨度的政治與地緣衝突",
                        devCost: { cash: 0, data: 0 },
                        devTurns: 0,
                        effects: { community: 200, hype: 40, trust: -5, revenue_base: 120 },
                        risks: { entropy: 20, compliance_risk: 25, regulation: 25 },
                        requiresTuring: false,
                        requiresSenior: true
                    },
                    {
                        id: "mi_t4_drone",
                        name: "無人集群v4. AI威懾系統",
                        type: "unlockable",
                        icon: "☢️",
                        description: "具備自我修復能力的奈米級無人機集群",
                        devCost: { cash: 200, data: 450 },
                        devTurns: 5,
                        effects: { revenue_base: 80, trust: 10 },
                        risks: { regulation: 20 },
                        requiresTuring: true,
                        requiresSenior: true
                    },
                    {
                        id: "mi_t4_cyber",
                        name: "網路資安v4. Quantum-Wall 量子防火牆",
                        type: "unlockable",
                        icon: "💎",
                        description: "基於量子演算終結所有形式的網路攻擊",
                        devCost: { cash: 150, data: 350 },
                        devTurns: 5,
                        effects: { trust: 30, alignment: 20 },
                        risks: { compliance_risk: 15, regulation: 15 },
                        requiresTuring: true,
                        requiresSenior: true
                    }
                ]
            }
        }
    },
    
    // 產品狀態類型
    PRODUCT_STATUS: {
        LOCKED: "locked",           // 未解鎖（需要通過里程碑或Turing）
        UNLOCKED: "unlocked",       // 已解鎖但未開發
        DEVELOPING: "developing",   // 開發中
        COMPLETED: "completed",     // 開發完成但未營運
        OPERATING: "operating",     // 營運中（有Senior分配）
        SUSPENDED: "suspended"      // 暫停營運（無Senior）
    }
};

// 導出到全局
window.ProductConfig = ProductConfig;

console.log('✓ Products Config loaded');

// 在 ProductConfig 載入完成後，觸發整合到 GameConfig
if (typeof integrateProductConfig === 'function') {
    integrateProductConfig();
}