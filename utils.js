// ============================================
// 奇點競速 - 工具函數與通用 Hooks
// ============================================


/**
 * 自定義 Local Storage Hook
 */
function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            return initialValue;
        }
    });

    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}

/**
 * 格式化數字顯示 (千位數簡化)
 */
function formatNumber(num, decimals = 1) {
    if (num === undefined || num === null) return '0';
    if (Math.abs(num) >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return Number(num).toFixed(decimals);
}

/**
 * 根據值獲取狀態顏色
 */
function getStatusColor(value, thresholds = { danger: 30, warning: 60 }) {
    if (value <= thresholds.danger) return 'var(--accent-red)';
    if (value <= thresholds.warning) return 'var(--accent-yellow)';
    return 'var(--accent-green)';
}

/**
 * 獲取 Doom 量表顏色
 */
function getDoomColor(value) {
    if (value >= 70) return 'var(--accent-red)';
    if (value >= 40) return 'var(--accent-orange)';
    if (value >= 20) return 'var(--accent-yellow)';
    return 'var(--accent-green)';
}

/**
 * 計算 Doom 量表標籤資訊
 */
function getDoomLabelInfo(doomType) {
    const labels = {
        commercial_ruin: { name: '商業崩潰', icon: '💰', threshold: 3 },
        internal_unraveling: { name: '內部失控', icon: '🔥', threshold: 4 },
        external_sanction: { name: '外部制裁', icon: '⚖️', threshold: 5 },
        // Tier2 空間系統指標
        facility_capacity: { name: '設施負載', icon: '🏢', threshold: null, isTier2: true, invert: false },
        power_stability: { name: '供電穩定', icon: '⚡', threshold: null, isTier2: true, invert: true },
        operations_staff: { name: '營運Junior人力', icon: '👷', threshold: null, isTier2: true, invert: true }
    };
    return labels[doomType] || { name: doomType, icon: '⚠️', threshold: 3 };
}

/**
 * 消息類型顏色映射
 */
function getMessageTypeColors() {
    return {
        info: 'var(--accent-cyan)',
        success: 'var(--accent-green)',
        warning: 'var(--accent-yellow)',
        danger: 'var(--accent-red)',
        event: 'var(--accent-magenta)'
    };
}

/**
 * 對話框類型顏色映射
 */
function getDialogTypeColors() {
    return {
        warning: 'var(--accent-yellow)',
        danger: 'var(--accent-red)',
        info: 'var(--accent-cyan)',
        success: 'var(--accent-green)'
    };
}

/**
 * 確認對話框類型圖示
 */
function getDialogIcon(type) {
    const icons = {
        warning: '⚠️',
        danger: '🚨',
        info: 'ℹ️',
        success: '✅'
    };
    return icons[type] || icons.info;
}

/**
 * 計算進度條百分比
 */
function calculatePercentage(value, max = 100) {
    return Math.min(100, Math.max(0, (value / max) * 100));
}

/**
 * 獲取 Modal 尺寸配置
 */
function getModalSize(size) {
    const sizes = {
        small: '400px',
        medium: '600px',
        large: '800px',
        full: '90vw'
    };
    return sizes[size] || sizes.medium;
}

// ============================================
// 匯出所有工具函數
// ============================================

const Utils = {
    // Hooks
    useLocalStorage,
    
    // 格式化函數
    formatNumber,
    
    // 顏色相關
    getStatusColor,
    getDoomColor,
    getDoomLabelInfo,
    getMessageTypeColors,
    getDialogTypeColors,
    getDialogIcon,
    
    // 計算函數
    calculatePercentage,
    
    // 配置函數
    getModalSize
};

// 掛載到全局 window 對象
window.Utils = Utils;

// 確認工具函數已載入
console.log('✓ Utility functions loaded');

// 支援模組化環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}