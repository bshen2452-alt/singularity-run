// ============================================
// 奇點競速 - 儀表板引擎 (Dashboard Engine)
// ============================================
// 包含：警示生成 + 風險儀表板計算
// 風險分類：財務健康、營運穩定、技術風險、市場地位、合規監管

(function() {
    'use strict';

    const DashboardEngine = {};

    // ============================================
    // 風險等級定義
    // ============================================
    
    const RISK_LEVELS = {
        SAFE: { threshold: 30, label: '安全', color: '#00ff88' },
        WATCH: { threshold: 50, label: '注意', color: '#ffd000' },
        WARNING: { threshold: 70, label: '警戒', color: '#ff6600' },
        DANGER: { threshold: 85, label: '危險', color: '#ff3366' },
        CRITICAL: { threshold: 100, label: '危急', color: '#ff0000' }
    };

    function getRiskLevel(value) {
        if (value < RISK_LEVELS.SAFE.threshold) return RISK_LEVELS.SAFE;
        if (value < RISK_LEVELS.WATCH.threshold) return RISK_LEVELS.WATCH;
        if (value < RISK_LEVELS.WARNING.threshold) return RISK_LEVELS.WARNING;
        if (value < RISK_LEVELS.DANGER.threshold) return RISK_LEVELS.DANGER;
        return RISK_LEVELS.CRITICAL;
    }

    // ============================================
    // 1. 財務健康風險
    // ============================================
    
    function calculateFinancialHealth(player, derived) {
        const factors = [];
        let riskScore = 0;

        const cash = player.cash || 0;
        const debt = player.debt || 0;
        const marketCap = player.market_cap || 100;

        // 現金狀態 (權重 30%)
        if (cash < 0) {
            const severity = Math.min(40, Math.abs(cash) / 10);
            riskScore += severity;
            factors.push({ text: `現金為負 ($${cash.toFixed(0)}M)`, severity: 'danger' });
        } else if (cash < 30) {
            riskScore += 20;
            factors.push({ text: `現金偏低 ($${cash.toFixed(0)}M)`, severity: 'warning' });
        } else if (cash < 80) {
            riskScore += 8;
            factors.push({ text: `現金尚可`, severity: 'watch' });
        }

        // 負債比率 (權重 25%)
        const debtRatio = debt / Math.max(1, marketCap);
        if (debtRatio > 0.5) {
            const severity = Math.min(30, debtRatio * 40);
            riskScore += severity;
            factors.push({ text: `負債比率過高 (${(debtRatio * 100).toFixed(0)}%)`, severity: 'danger' });
        } else if (debtRatio > 0.3) {
            riskScore += 12;
            factors.push({ text: `負債比率偏高 (${(debtRatio * 100).toFixed(0)}%)`, severity: 'warning' });
        } else if (debt > 0) {
            riskScore += 5;
            factors.push({ text: `存在負債 ($${debt.toFixed(0)}M)`, severity: 'watch' });
        }

        // 現金流趨勢 (權重 25%)
        const netFlow = derived?.net_cash_flow || 0;
        if (netFlow < -50) {
            riskScore += 25;
            factors.push({ text: `現金流嚴重失血 (${netFlow.toFixed(0)}M/季)`, severity: 'danger' });
        } else if (netFlow < -20) {
            riskScore += 15;
            factors.push({ text: `現金流為負 (${netFlow.toFixed(0)}M/季)`, severity: 'warning' });
        } else if (netFlow < 0) {
            riskScore += 8;
            factors.push({ text: `現金流微虧`, severity: 'watch' });
        }

        // 收入來源多樣性 (權重 20%)
        let incomeStreams = 0;
        if ((player.product_state?.product_revenue || 0) > 0) incomeStreams++;
        if ((player.community_size || 0) > 1000) incomeStreams++;
        if ((player.poc_contracts?.length || 0) > 0) incomeStreams++;
        if ((player.rented_pflops_contracts?.length || 0) > 0) incomeStreams++;
        if ((player.rival_investments && Object.keys(player.rival_investments).length > 0)) incomeStreams++;

        if (incomeStreams === 0) {
            riskScore += 15;
            factors.push({ text: '無穩定收入來源', severity: 'warning' });
        } else if (incomeStreams === 1) {
            riskScore += 8;
            factors.push({ text: '收入來源單一', severity: 'watch' });
        }

        return {
            id: 'financial',
            name: '財務健康',
            icon: '💰',
            score: Math.min(100, riskScore),
            level: getRiskLevel(riskScore),
            factors: factors.filter(f => f.severity !== 'safe'),
            unlockTier: 0
        };
    }

    // ============================================
    // 2. 營運穩定風險 (Tier2+)
    // ============================================
    
    function calculateOperationalStability(player, derived) {
        const factors = [];
        let riskScore = 0;
        const tier = player.mp_tier || 0;

        // Tier2 前只顯示基本營運
        if (tier < 2) {
            // 基礎算力檢查
            if (derived?.mpGrowthBlocked) {
                riskScore += 35;
                factors.push({ text: '訓練算力不足，MP成長受阻', severity: 'danger' });
            }
            if (derived?.inferenceShortage) {
                riskScore += 20;
                factors.push({ text: '推論算力不足，服務品質下降', severity: 'warning' });
            }

            // 人力配置
            const totalStaff = (player.talent?.turing || 0) + (player.talent?.senior || 0) + (player.talent?.junior || 0);
            if (totalStaff < 3) {
                riskScore += 15;
                factors.push({ text: `人力不足 (${totalStaff}人)`, severity: 'warning' });
            }

            return {
                id: 'operational',
                name: '營運穩定',
                icon: '⚙️',
                score: Math.min(100, riskScore),
                level: getRiskLevel(riskScore),
                factors: factors,
                unlockTier: 0
            };
        }

        // Tier2+ 完整營運風險
        
        // 算力充足率 (權重 25%)
        if (derived?.mpGrowthBlocked) {
            riskScore += 30;
            factors.push({ text: '訓練算力嚴重不足', severity: 'danger' });
        } else if (derived?.productDevBlocked) {
            riskScore += 20;
            factors.push({ text: '開發算力不足，商品研發停滯', severity: 'warning' });
        }
        if (derived?.inferenceShortage) {
            riskScore += 15;
            factors.push({ text: '推論算力緊張', severity: 'warning' });
        }

        // 設施容量 (權重 25%)
        const spaceState = player.space_state;
        if (spaceState?.cache) {
            const capacityRatio = spaceState.cache.capacity_ratio || 0;
            if (capacityRatio > 0.95) {
                riskScore += 25;
                factors.push({ text: `設施容量已滿 (${(capacityRatio * 100).toFixed(0)}%)`, severity: 'danger' });
            } else if (capacityRatio > 0.85) {
                riskScore += 15;
                factors.push({ text: `設施容量緊張 (${(capacityRatio * 100).toFixed(0)}%)`, severity: 'warning' });
            } else if (capacityRatio > 0.7) {
                riskScore += 5;
                factors.push({ text: `設施容量偏高`, severity: 'watch' });
            }
        }

        // 電力穩定 (權重 25%)
        if (spaceState?.cache) {
            const powerStability = spaceState.cache.power_stability || 1;
            if (powerStability < 0.7) {
                riskScore += 25;
                factors.push({ text: `電力供應不穩定 (${(powerStability * 100).toFixed(0)}%)`, severity: 'danger' });
            } else if (powerStability < 0.85) {
                riskScore += 12;
                factors.push({ text: `電力供應偏緊`, severity: 'warning' });
            }
        }

        // 人力配置 (權重 25%)
        if (spaceState?.cache) {
            const workforceRatio = spaceState.cache.workforce_ratio || 1;
            if (workforceRatio < 0.5) {
                riskScore += 25;
                factors.push({ text: `營運人力嚴重不足 (${(workforceRatio * 100).toFixed(0)}%)`, severity: 'danger' });
            } else if (workforceRatio < 0.8) {
                riskScore += 12;
                factors.push({ text: `營運人力偏少`, severity: 'warning' });
            }
        }

        // 忠誠度影響
        const loyalty = player.loyalty || 50;
        if (loyalty < 30) {
            riskScore += 15;
            factors.push({ text: `員工忠誠度極低 (${loyalty}%)，可能集體離職`, severity: 'danger' });
        } else if (loyalty < 50) {
            riskScore += 8;
            factors.push({ text: `員工忠誠度偏低 (${loyalty}%)`, severity: 'warning' });
        }

        return {
            id: 'operational',
            name: '營運穩定',
            icon: '⚙️',
            score: Math.min(100, riskScore),
            level: getRiskLevel(riskScore),
            factors: factors,
            unlockTier: 0
        };
    }

    // ============================================
    // 3. 技術風險
    // ============================================
    
    function calculateTechRisk(player, derived, rivals) {
        const factors = [];
        let riskScore = 0;

        const entropy = player.entropy || 0;
        const alignment = player.alignment || 50;
        const mp = player.model_power || 1;

        // 熵值 (權重 40%)
        if (entropy > 85) {
            riskScore += 40;
            factors.push({ text: `熵值極高 (${entropy})，模型可能失控`, severity: 'danger' });
        } else if (entropy > 70) {
            riskScore += 25;
            factors.push({ text: `熵值過高 (${entropy})，穩定性下降`, severity: 'warning' });
        } else if (entropy > 50) {
            riskScore += 10;
            factors.push({ text: `熵值偏高 (${entropy})`, severity: 'watch' });
        }

        // 對齊度 (權重 30%)
        if (alignment < 20) {
            riskScore += 30;
            factors.push({ text: `對齊度極低 (${alignment})，安全隱患嚴重`, severity: 'danger' });
        } else if (alignment < 40) {
            riskScore += 18;
            factors.push({ text: `對齊度不足 (${alignment})`, severity: 'warning' });
        } else if (alignment < 60) {
            riskScore += 8;
            factors.push({ text: `對齊度偏低`, severity: 'watch' });
        }

        // 熵值+對齊度組合風險
        if (entropy > 60 && alignment < 40) {
            riskScore += 15;
            factors.push({ text: '高熵值+低對齊度，風險疊加', severity: 'danger' });
        }

        // MP成長停滯 (權重 20%)
        const lastMp = player.last_mp || mp;
        const mpGrowth = mp - lastMp;
        if (mpGrowth <= 0 && mp < 500) {
            riskScore += 15;
            factors.push({ text: 'MP成長停滯，技術落後風險', severity: 'warning' });
        }

        return {
            id: 'tech',
            name: '技術風險',
            icon: '🧠',
            score: Math.min(100, riskScore),
            level: getRiskLevel(riskScore),
            factors: factors,
            unlockTier: 0
        };
    }

    // ============================================
    // 4. 市場地位風險
    // ============================================
    
    function calculateMarketPosition(player, derived, rivals) {
        const factors = [];
        let riskScore = 0;

        const mp = player.model_power || 1;
        const hype = player.hype || 0;
        const trust = player.trust || 0;

        // 與對手MP差距 (權重 40%)
        if (rivals && rivals.length > 0) {
            const maxRivalMp = Math.max(...rivals.map(r => r.mp || 0));
            const mpGap = maxRivalMp - mp;
            const gapRatio = mpGap / Math.max(1, mp);

            if (gapRatio > 0.5) {
                riskScore += 35;
                factors.push({ text: `落後領先對手 ${mpGap.toFixed(0)} MP (${(gapRatio * 100).toFixed(0)}%)`, severity: 'danger' });
            } else if (gapRatio > 0.2) {
                riskScore += 20;
                factors.push({ text: `落後領先對手 ${mpGap.toFixed(0)} MP`, severity: 'warning' });
            } else if (gapRatio > 0) {
                riskScore += 8;
                factors.push({ text: '略落後於對手', severity: 'watch' });
            }

            // 檢查是否有對手接近勝利
            if (maxRivalMp > 800) {
                riskScore += 20;
                factors.push({ text: `對手接近AGI (${maxRivalMp.toFixed(0)} MP)！`, severity: 'danger' });
            }
        }

        // 炒作度泡沫風險 (權重 30%)
        const hypeToMpRatio = hype / Math.max(1, mp);
        if (hype > 100 && hypeToMpRatio > 3) {
            riskScore += 25;
            factors.push({ text: `炒作度泡沫 (Hype ${hype} vs MP ${mp.toFixed(0)})`, severity: 'danger' });
        } else if (hype > 80 && hypeToMpRatio > 2) {
            riskScore += 15;
            factors.push({ text: '炒作度與實力不符', severity: 'warning' });
        }

        // 信任度 (權重 30%)
        if (trust < 15) {
            riskScore += 25;
            factors.push({ text: `市場信任度極低 (${trust})`, severity: 'danger' });
        } else if (trust < 30) {
            riskScore += 15;
            factors.push({ text: `市場信任度偏低 (${trust})`, severity: 'warning' });
        } else if (trust < 50) {
            riskScore += 5;
            factors.push({ text: '市場信任度一般', severity: 'watch' });
        }

        return {
            id: 'market',
            name: '市場地位',
            icon: '📊',
            score: Math.min(100, riskScore),
            level: getRiskLevel(riskScore),
            factors: factors,
            unlockTier: 0
        };
    }

    // ============================================
    // 5. 合規監管風險
    // ============================================
    
    function calculateRegulatoryRisk(player, derived) {
        const factors = [];
        let riskScore = 0;

        const complianceRisk = player.compliance_risk || 0;
        const regulation = player.regulation || 0;

        // 合規風險 (權重 40%)
        if (complianceRisk > 80) {
            riskScore += 40;
            factors.push({ text: `合規風險極高 (${complianceRisk})，可能被調查`, severity: 'danger' });
        } else if (complianceRisk > 60) {
            riskScore += 25;
            factors.push({ text: `合規風險偏高 (${complianceRisk})`, severity: 'warning' });
        } else if (complianceRisk > 40) {
            riskScore += 10;
            factors.push({ text: '存在合規隱患', severity: 'watch' });
        }

        // 監管壓力 (權重 40%)
        if (regulation > 85) {
            riskScore += 40;
            factors.push({ text: `監管壓力極高 (${regulation})，面臨制裁風險`, severity: 'danger' });
        } else if (regulation > 70) {
            riskScore += 25;
            factors.push({ text: `監管壓力過高 (${regulation})`, severity: 'warning' });
        } else if (regulation > 50) {
            riskScore += 10;
            factors.push({ text: '監管關注度上升', severity: 'watch' });
        }

        // 灰色數據佔比 (權重 20%)
        const grayData = (player.gray_high || 0) + (player.gray_low || 0);
        const totalData = grayData + (player.high_data || 0) + (player.low_data || 0);
        if (totalData > 0) {
            const grayRatio = grayData / totalData;
            if (grayRatio > 0.5) {
                riskScore += 20;
                factors.push({ text: `灰色數據佔比過高 (${(grayRatio * 100).toFixed(0)}%)`, severity: 'danger' });
            } else if (grayRatio > 0.3) {
                riskScore += 12;
                factors.push({ text: `灰色數據佔比偏高 (${(grayRatio * 100).toFixed(0)}%)`, severity: 'warning' });
            } else if (grayRatio > 0.1) {
                riskScore += 5;
                factors.push({ text: '存在灰色數據', severity: 'watch' });
            }
        }

        return {
            id: 'regulatory',
            name: '合規監管',
            icon: '⚖️',
            score: Math.min(100, riskScore),
            level: getRiskLevel(riskScore),
            factors: factors,
            unlockTier: 0
        };
    }

    // ============================================
    // 計算完整風險儀表板
    // ============================================
    
    DashboardEngine.calculateRiskDashboard = function(player, derived, rivals) {
        const tier = player.mp_tier || 0;
        const risks = [];

        // 所有 Tier 都顯示
        risks.push(calculateFinancialHealth(player, derived));
        risks.push(calculateOperationalStability(player, derived));
        risks.push(calculateTechRisk(player, derived, rivals));
        risks.push(calculateMarketPosition(player, derived, rivals));
        risks.push(calculateRegulatoryRisk(player, derived));

        // 計算總體風險
        const avgScore = risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
        const maxScore = Math.max(...risks.map(r => r.score));

        return {
            risks: risks,
            overall: {
                score: Math.round((avgScore * 0.6) + (maxScore * 0.4)),  // 加權：平均60% + 最高40%
                level: getRiskLevel((avgScore * 0.6) + (maxScore * 0.4)),
                criticalCount: risks.filter(r => r.score >= 70).length,
                warningCount: risks.filter(r => r.score >= 50 && r.score < 70).length
            }
        };
    };

    // ============================================
    // 綜合風險儀表板
    // ============================================
    
    DashboardEngine.calculateRiskDashboard = function(player, derived, rivals) {
        const tier = player.mp_tier || 0;
        
        // 計算各類風險
        const risks = [
            calculateFinancialHealth(player, derived),
            calculateOperationalStability(player, derived),
            calculateTechRisk(player, derived, rivals),
            calculateMarketPosition(player, derived, rivals),
            calculateComplianceRisk(player, derived)
        ];

        // 計算總體風險分數 (加權平均)
        const weights = [0.25, 0.20, 0.25, 0.15, 0.15];
        const overallScore = risks.reduce((sum, risk, idx) => {
            return sum + risk.score * weights[idx];
        }, 0);

        // 根據 Tier 調整風險評估
        let tierAdjustment = 0;
        if (tier >= 4) {
            tierAdjustment = -5; // 高 Tier 容錯更高
        } else if (tier === 0) {
            tierAdjustment = 10; // 低 Tier 更脆弱
        }

        const adjustedScore = Math.min(100, Math.max(0, overallScore + tierAdjustment));

        return {
            overallScore: adjustedScore,
            overallLevel: getRiskLevel(adjustedScore),
            risks,
            tier,
            timestamp: Date.now()
        };
    };

    // ============================================
    // Doom Gauge 整合
    // ============================================
    
    DashboardEngine.getDoomGauge = function(player) {
        if (window.EndingEngine?.calculateDoomGauge) {
            return window.EndingEngine.calculateDoomGauge(player);
        }
        
        // Fallback 計算
        const cash = player.cash || 0;
        const debt = player.debt || 0;
        const marketCap = player.market_cap || 100;
        const entropy = player.entropy || 0;
        const alignment = player.alignment || 50;
        const compliance_risk = player.compliance_risk || 0;
        const regulation = player.regulation || 0;
        const loyalty = player.loyalty || 50;
        const trust = player.trust || 0;

        let commercial_ruin = 0;
        if (cash < 0) {
            commercial_ruin = Math.min(100, Math.abs(cash) / 5);
        }
        const debtRatio = debt / Math.max(1, marketCap);
        commercial_ruin = Math.min(100, commercial_ruin + debtRatio * 50);

        const internal_unraveling = Math.min(100,
            entropy * 0.5 +
            (100 - alignment) * 0.2 +
            (100 - loyalty) * 0.3
        );

        const external_sanction = Math.min(100,
            compliance_risk * 0.4 +
            regulation * 0.4 +
            (100 - trust) * 0.2
        );

        return { commercial_ruin, internal_unraveling, external_sanction };
    };

    // ============================================
    // 警示生成 (整合結局預警)
    // ============================================
    
    DashboardEngine.generateAlerts = function(player, derived, rivals, globalParams) {
        const alerts = [];
        const riskDashboard = DashboardEngine.calculateRiskDashboard(player, derived, rivals);

        // 1. 從各風險類別提取嚴重警示
        riskDashboard.risks.forEach(risk => {
            risk.factors.forEach(factor => {
                if (factor.severity === 'danger') {
                    alerts.push({
                        level: 'danger',
                        icon: risk.icon,
                        category: risk.name,
                        text: factor.text,
                        isRiskAlert: true
                    });
                } else if (factor.severity === 'warning' && risk.score >= 50) {
                    alerts.push({
                        level: 'warning',
                        icon: risk.icon,
                        category: risk.name,
                        text: factor.text,
                        isRiskAlert: true
                    });
                }
            });
        });

        // 2. 整合結局預警 (來自 EndingEngine)
        if (window.EndingEngine?.getEndingAlerts) {
            const endingAlerts = window.EndingEngine.getEndingAlerts(player, rivals, globalParams);
            if (endingAlerts && endingAlerts.length > 0) {
                // 結局預警放在最前面（更重要）
                alerts.unshift(...endingAlerts);
            }
        }

        // 3. 添加 Doom Gauge 相關警示
        const doomGauge = DashboardEngine.getDoomGauge(player);
        
        if (doomGauge.commercial_ruin >= 70) {
            alerts.push({
                level: doomGauge.commercial_ruin >= 85 ? 'danger' : 'warning',
                icon: '💸',
                category: '崩潰預警',
                text: `商業崩潰風險：${doomGauge.commercial_ruin.toFixed(0)}%`,
                isDoomWarning: true,
                doomType: 'commercial_ruin',
                doomValue: doomGauge.commercial_ruin
            });
        }
        
        if (doomGauge.internal_unraveling >= 70) {
            alerts.push({
                level: doomGauge.internal_unraveling >= 85 ? 'danger' : 'warning',
                icon: '🔥',
                category: '崩潰預警',
                text: `內部瓦解風險：${doomGauge.internal_unraveling.toFixed(0)}%`,
                isDoomWarning: true,
                doomType: 'internal_unraveling',
                doomValue: doomGauge.internal_unraveling
            });
        }
        
        if (doomGauge.external_sanction >= 70) {
            alerts.push({
                level: doomGauge.external_sanction >= 85 ? 'danger' : 'warning',
                icon: '🚫',
                category: '崩潰預警',
                text: `外部制裁風險：${doomGauge.external_sanction.toFixed(0)}%`,
                isDoomWarning: true,
                doomType: 'external_sanction',
                doomValue: doomGauge.external_sanction
            });
        }

        // 4. 按優先級排序：結局預警 > Doom預警 > 風險警示
        alerts.sort((a, b) => {
            // 結局預警最優先
            if (a.isEndingWarning && !b.isEndingWarning) return -1;
            if (!a.isEndingWarning && b.isEndingWarning) return 1;
            
            // Doom預警次之
            if (a.isDoomWarning && !b.isDoomWarning) return -1;
            if (!a.isDoomWarning && b.isDoomWarning) return 1;
            
            // 同類型按嚴重程度排序
            const levelOrder = { danger: 0, warning: 1, info: 2 };
            return (levelOrder[a.level] || 2) - (levelOrder[b.level] || 2);
        });

        return alerts;
    };

    // ============================================
    // 獲取結局預警摘要 (供 UI 單獨顯示)
    // ============================================
    
    DashboardEngine.getEndingWarningsSummary = function(player, rivals, globalParams) {
        if (!window.EndingEngine?.getActiveWarnings) {
            return { hasWarnings: false, warnings: [], criticalCount: 0 };
        }

        const warnings = window.EndingEngine.getActiveWarnings(player, rivals, globalParams);
        const criticalCount = warnings.filter(w => w.severity === 'critical' || w.turnsLeft <= 2).length;

        return {
            hasWarnings: warnings.length > 0,
            warnings: warnings,
            criticalCount: criticalCount,
            mostUrgent: warnings.length > 0 ? warnings[0] : null
        };
    };

    // ============================================
    // 導出到全局
    // ============================================
    
    window.DashboardEngine = DashboardEngine;
    console.log('✓ Dashboard Engine loaded (with Risk Dashboard + Ending Warnings)');

})();