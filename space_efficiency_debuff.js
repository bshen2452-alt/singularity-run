// ============================================
// 空間與電力效率減益補充 (Space Efficiency Debuff)
// ============================================
// 補充 space_engine.js 中缺少的效率減益計算
// 用於 MP 研發和商品開發營運效率

(function() {
    'use strict';
    
    // 確保 SpaceEngine 存在
    if (!window.SpaceEngine) {
        console.warn('SpaceEngine not loaded, efficiency debuff functions will be added later');
        return;
    }
    
    var SpaceEngine = window.SpaceEngine;
    
    // ==========================================
    // 效率減益計算
    // ==========================================
    
    /**
     * 計算空間不足的效率減益
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { penalty, reason, details }
     */
    SpaceEngine.calculateCapacityEfficiencyPenalty = function(playerState) {
        var spaceState = playerState.space_state;
        
        // Tier2 前不計算
        if ((playerState.mp_tier || 0) < 2 || !spaceState) {
            return { 
                penalty: 0, 
                multiplier: 1.0,
                reason: null, 
                details: null 
            };
        }
        
        var capacityStatus = SpaceEngine.getCapacityStatus(playerState);
        var config = window.SpaceConfig?.CAPACITY_SHORTAGE || {};
        
        var penalty = 0;
        var reason = null;
        
        if (capacityStatus.ratio >= (config.overload_threshold || 1.2)) {
            // 極度超載
            penalty = config.overload_effects?.efficiency_penalty || 0.4;
            reason = '設施嚴重超載';
        } else if (capacityStatus.ratio >= (config.critical_threshold || 1.0)) {
            // 容量不足
            penalty = config.critical_effects?.efficiency_penalty || 0.2;
            reason = '設施容量不足';
        }
        
        return {
            penalty: penalty,
            multiplier: 1.0 - penalty,
            reason: reason,
            details: {
                ratio: capacityStatus.ratio,
                used: capacityStatus.used,
                total: capacityStatus.total,
                status: capacityStatus.status
            }
        };
    };
    
    /**
     * 計算營運人力不足的效率減益
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { penalty, reason, details }
     */
    SpaceEngine.calculateWorkforceEfficiencyPenalty = function(playerState) {
        var spaceState = playerState.space_state;
        
        // Tier2 前不計算
        if ((playerState.mp_tier || 0) < 2 || !spaceState) {
            return { 
                penalty: 0, 
                multiplier: 1.0,
                reason: null, 
                details: null 
            };
        }
        
        var workforceStatus = SpaceEngine.getWorkforceStatus(playerState);
        var config = window.SpaceConfig?.WORKFORCE_SHORTAGE || {};
        
        var penalty = 0;
        var reason = null;
        
        if (workforceStatus.ratio < (config.emergency_threshold || 0.3)) {
            // 極度缺人
            penalty = config.emergency_effects?.efficiency_penalty || 0.5;
            reason = '營運人力極度短缺';
        } else if (workforceStatus.ratio < (config.critical_threshold || 0.5)) {
            // 嚴重不足
            penalty = config.critical_effects?.efficiency_penalty || 0.3;
            reason = '營運人力嚴重不足';
        } else if (workforceStatus.ratio < (config.warning_threshold || 0.7)) {
            // 輕微不足
            penalty = config.warning_effects?.efficiency_penalty || 0.1;
            reason = '營運人力不足';
        }
        
        return {
            penalty: penalty,
            multiplier: 1.0 - penalty,
            reason: reason,
            details: {
                ratio: workforceStatus.ratio,
                required: workforceStatus.required,
                actual: workforceStatus.actual,
                status: workforceStatus.status
            }
        };
    };
    
    /**
     * 計算供電不穩定的效率減益
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { penalty, reason, details }
     */
    SpaceEngine.calculatePowerEfficiencyPenalty = function(playerState) {
        var spaceState = playerState.space_state;
        
        // Tier2 前不計算
        if ((playerState.mp_tier || 0) < 2 || !spaceState) {
            return { 
                penalty: 0, 
                multiplier: 1.0,
                reason: null, 
                details: null 
            };
        }
        
        var powerStatus = SpaceEngine.getPowerStabilityStatus(playerState);
        
        var penalty = 0;
        var reason = null;
        
        if (powerStatus.stability < 0.5) {
            // 供電嚴重不穩
            penalty = 0.25;
            reason = '供電嚴重不穩定';
        } else if (powerStatus.stability < 0.7) {
            // 供電略有問題
            penalty = 0.1;
            reason = '供電穩定性不足';
        }
        
        return {
            penalty: penalty,
            multiplier: 1.0 - penalty,
            reason: reason,
            details: {
                stability: powerStatus.stability,
                status: powerStatus.status
            }
        };
    };
    
    /**
     * 獲取綜合效率減益（用於 MP 研發和商品開發）
     * @param {Object} playerState - 玩家狀態
     * @returns {Object} - { totalPenalty, multiplier, reasons, breakdown }
     */
    SpaceEngine.getTotalEfficiencyDebuff = function(playerState) {
        var capacityDebuff = SpaceEngine.calculateCapacityEfficiencyPenalty(playerState);
        var workforceDebuff = SpaceEngine.calculateWorkforceEfficiencyPenalty(playerState);
        var powerDebuff = SpaceEngine.calculatePowerEfficiencyPenalty(playerState);
        
        var reasons = [];
        if (capacityDebuff.reason) reasons.push(capacityDebuff.reason);
        if (workforceDebuff.reason) reasons.push(workforceDebuff.reason);
        if (powerDebuff.reason) reasons.push(powerDebuff.reason);
        
        // 減益疊加（但不超過80%）
        var totalPenalty = Math.min(0.8, 
            capacityDebuff.penalty + workforceDebuff.penalty + powerDebuff.penalty
        );
        
        return {
            totalPenalty: totalPenalty,
            multiplier: 1.0 - totalPenalty,
            hasDebuff: totalPenalty > 0,
            reasons: reasons,
            breakdown: {
                capacity: capacityDebuff,
                workforce: workforceDebuff,
                power: powerDebuff
            }
        };
    };
    
    /**
     * 檢查是否可以購買需要空間的資產
     * 重新定義 canPurchaseAsset 以包含更詳細的錯誤訊息
     * @param {Object} playerState - 玩家狀態
     * @param {number} requiredUnits - 需要的容量單位
     * @param {string} assetType - 資產類型 ('compute'|'data'|'talent')
     * @returns {Object} - { canPurchase, warning, reason }
     */
    SpaceEngine.canPurchaseAssetDetailed = function(playerState, requiredUnits, assetType) {
        // Tier2 前不限制
        if ((playerState.mp_tier || 0) < 2) {
            return { canPurchase: true, warning: null, reason: null };
        }
        
        var spaceState = playerState.space_state;
        if (!spaceState) {
            return { canPurchase: true, warning: null, reason: null };
        }
        
        var capacityStatus = SpaceEngine.getCapacityStatus(playerState);
        var afterRatio = (capacityStatus.used + requiredUnits) / capacityStatus.total;
        
        var config = window.SpaceConfig?.CAPACITY_SHORTAGE || {};
        
        // 雲端算力不受空間限制
        if (assetType === 'cloud_compute') {
            return { 
                canPurchase: true, 
                warning: afterRatio > 0.9 ? '建議擴充空間以容納更多資源' : null,
                reason: null 
            };
        }
        
        if (afterRatio > (config.critical_threshold || 1.0)) {
            return {
                canPurchase: false,
                warning: null,
                reason: `設施容量不足。當前: ${capacityStatus.used.toFixed(0)}/${capacityStatus.total.toFixed(0)} Units，購買後將超過上限。請先擴建空間或租賃託管服務。`
            };
        }
        
        if (afterRatio > (config.warning_threshold || 0.8)) {
            return {
                canPurchase: true,
                warning: `購買後設施容量將達 ${(afterRatio * 100).toFixed(0)}%，建議考慮擴建。`,
                reason: null
            };
        }
        
        return { canPurchase: true, warning: null, reason: null };
    };
    
    console.log('✓ Space Efficiency Debuff functions added');
    
})();
