// ============================================
// 併購系統 UI (Acquisition UI)
// ============================================
// 設計：純介面組件，不包含業務邏輯計算
// 功能：顯示併購機會、執行併購、整合進度

const AcquisitionUI = {

    // ==========================================
    // 主渲染入口
    // ==========================================

    /**
     * 渲染併購面板（嵌入 Finance Panel）
     * @param {Object} player - 玩家狀態
     * @param {Object} globalParams - 全球參數
     * @param {Function} onAction - 動作回調
     * @returns {React.Element|null}
     */
    renderAcquisitionPanel(player, globalParams, onAction) {
        const config = window.AcquisitionConfig;
        const integration = window.AcquisitionIntegration;
        
        // 檢查是否解鎖
        if (!integration?.isUnlocked(player)) {
            return this.renderLockedState(player);
        }

        const summary = integration.getSummary(player);
        if (!summary) return null;

        return React.createElement('div', {
            className: 'acquisition-panel',
            style: {
                background: 'rgba(138,43,226,0.08)',
                border: '1px solid rgba(138,43,226,0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem'
            }
        },
            // 標題列
            React.createElement('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }
            },
                React.createElement('h4', {
                    style: { margin: 0, fontSize: '1rem', color: '#8a2be2' }
                }, '🏢 併購中心'),
                React.createElement('div', {
                    style: { display: 'flex', gap: '0.5rem', alignItems: 'center' }
                },
                    // 冷卻指示
                    summary.cooldown > 0 && React.createElement('span', {
                        style: {
                            fontSize: '0.75rem',
                            color: 'var(--accent-red)',
                            padding: '0.2rem 0.5rem',
                            background: 'rgba(255,68,68,0.2)',
                            borderRadius: '4px'
                        }
                    }, `⏳ ${summary.cooldown} 回合`),
                    // 機會計數
                    React.createElement('span', {
                        style: {
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            padding: '0.2rem 0.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px'
                        }
                    }, `📋 ${summary.available_count} 機會`)
                )
            ),

            // 整合中列表
            summary.integrating_count > 0 && this.renderIntegratingUnits(summary.integrating, player),

            // 可用機會
            this.renderAvailableOpportunities(summary.opportunities, player, globalParams, onAction, summary),

            // 已完成單位
            summary.acquired_count > 0 && this.renderAcquiredUnits(summary.acquired, summary.synergies),

            // 效果摘要
            this.renderEffectsSummary(summary.effects)
        );
    },

    // ==========================================
    // 鎖定狀態
    // ==========================================

    renderLockedState(player) {
        const config = window.AcquisitionConfig;
        const requiredTier = config?.SYSTEM?.unlock_tier || 4;
        const currentTier = player.mp_tier || 0;

        return React.createElement('div', {
            style: {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem',
                textAlign: 'center'
            }
        },
            React.createElement('div', {
                style: { fontSize: '0.9rem', color: 'var(--text-secondary)' }
            }, '🔒 併購功能'),
            React.createElement('div', {
                style: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }
            }, `需要達到 Tier ${requiredTier}（當前 Tier ${currentTier}）`)
        );
    },

    // ==========================================
    // 整合中單位
    // ==========================================

    renderIntegratingUnits(integrating, player) {
        const config = window.AcquisitionConfig;

        return React.createElement('div', {
            style: {
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(255,213,0,0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255,213,0,0.2)'
            }
        },
            React.createElement('div', {
                style: { fontSize: '0.8rem', color: 'var(--accent-yellow)', marginBottom: '0.5rem' }
            }, '🔄 整合中'),
            
            integrating.map(unit => {
                const target = config?.getTarget(unit.target_id);
                const progress = 1 - (unit.remaining_turns / unit.total_turns);
                
                return React.createElement('div', {
                    key: unit.target_id,
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }
                },
                    // 圖示
                    React.createElement('span', {
                        style: { fontSize: '1.2rem' }
                    }, target?.icon || '🏢'),
                    
                    // 資訊
                    React.createElement('div', { style: { flex: 1 } },
                        React.createElement('div', {
                            style: { fontSize: '0.85rem', color: 'var(--text-primary)' }
                        }, target?.name || unit.target_id),
                        
                        // 進度條
                        React.createElement('div', {
                            style: {
                                height: '4px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '2px',
                                marginTop: '0.25rem',
                                overflow: 'hidden'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    width: `${progress * 100}%`,
                                    height: '100%',
                                    background: progress >= 0.5 ? 'var(--accent-green)' : 'var(--accent-yellow)',
                                    transition: 'width 0.3s ease'
                                }
                            })
                        )
                    ),
                    
                    // 剩餘回合
                    React.createElement('div', {
                        style: {
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            textAlign: 'right'
                        }
                    }, `${unit.remaining_turns} 季`)
                );
            })
        );
    },

    // ==========================================
    // 可用機會
    // ==========================================

    renderAvailableOpportunities(opportunities, player, globalParams, onAction, summary) {
        if (!opportunities || opportunities.length === 0) {
            return React.createElement('div', {
                style: {
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem'
                }
            }, '暫無可用的併購機會');
        }

        const canAcquire = summary.cooldown <= 0 && 
                          summary.integrating_count < summary.max_pending;

        return React.createElement('div', {
            style: { marginBottom: '1rem' }
        },
            React.createElement('div', {
                style: { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }
            }, '📋 可用機會'),
            
            React.createElement('div', {
                style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
            },
                opportunities.map(opp => this.renderOpportunityCard(opp, player, canAcquire, onAction))
            )
        );
    },

    renderOpportunityCard(opportunity, player, canAcquire, onAction) {
        const target = opportunity.target;
        const config = window.AcquisitionConfig;
        const typeColor = config?.UI_CONFIG?.type_colors?.[target.type] || '#4488ff';
        
        const canAfford = (player.cash || 0) >= opportunity.cost.final;
        const available = canAcquire && canAfford;

        return React.createElement('div', {
            key: opportunity.target_id,
            style: {
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${available ? typeColor + '44' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '6px',
                padding: '0.75rem',
                opacity: available ? 1 : 0.7
            }
        },
            // 標題行
            React.createElement('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                }
            },
                React.createElement('div', {
                    style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }
                },
                    React.createElement('span', { style: { fontSize: '1.1rem' } }, target.icon),
                    React.createElement('span', {
                        style: { fontWeight: 'bold', color: 'var(--text-primary)' }
                    }, target.name),
                    React.createElement('span', {
                        style: {
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.4rem',
                            background: typeColor + '33',
                            color: typeColor,
                            borderRadius: '3px'
                        }
                    }, target.type === 'department' ? '部門' : '子公司')
                ),
                React.createElement('span', {
                    style: {
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)'
                    }
                }, `⏱ ${opportunity.expires_in} 季`)
            ),

            // 描述
            React.createElement('div', {
                style: { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }
            }, target.description),

            // 詳情行
            React.createElement('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                }
            },
                // 成本
                React.createElement('div', null,
                    React.createElement('div', {
                        style: { fontSize: '0.7rem', color: 'var(--text-secondary)' }
                    }, '成本'),
                    React.createElement('div', {
                        style: {
                            fontWeight: 'bold',
                            color: canAfford ? 'var(--accent-green)' : 'var(--accent-red)'
                        }
                    }, `$${opportunity.cost.final}M`)
                ),
                // 整合期
                React.createElement('div', null,
                    React.createElement('div', {
                        style: { fontSize: '0.7rem', color: 'var(--text-secondary)' }
                    }, '整合期'),
                    React.createElement('div', {
                        style: { fontWeight: 'bold', color: 'var(--text-primary)' }
                    }, `${opportunity.integration_turns.final} 季`)
                ),
                // 每季收益
                target.effects?.ongoing?.quarterly_revenue && React.createElement('div', null,
                    React.createElement('div', {
                        style: { fontSize: '0.7rem', color: 'var(--text-secondary)' }
                    }, '每季收益'),
                    React.createElement('div', {
                        style: { fontWeight: 'bold', color: 'var(--accent-cyan)' }
                    }, `+$${target.effects.ongoing.quarterly_revenue}M`)
                )
            ),

            // 效果預覽
            this.renderEffectPreview(target),

            // 併購按鈕
            React.createElement('button', {
                style: {
                    width: '100%',
                    padding: '0.6rem',
                    background: available ? `linear-gradient(135deg, ${typeColor}, ${typeColor}88)` : 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '4px',
                    color: available ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    cursor: available ? 'pointer' : 'not-allowed',
                    marginTop: '0.5rem'
                },
                onClick: () => available && onAction('executeAcquisition', {
                    targetId: opportunity.target_id,
                    opportunity: opportunity
                }),
                disabled: !available
            }, 
                !canAfford ? `資金不足（需 $${opportunity.cost.final}M）` :
                !canAcquire ? '併購冷卻中或已達上限' :
                `🤝 啟動併購`
            )
        );
    },

    renderEffectPreview(target) {
        const effects = [];
        
        // 親和度變化
        if (target.effects?.immediate?.affinity_changes) {
            for (const [industry, value] of Object.entries(target.effects.immediate.affinity_changes)) {
                effects.push({
                    icon: '🤝',
                    text: `${industry} 親和度 ${value > 0 ? '+' : ''}${value}`,
                    color: value > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                });
            }
        }

        // 持續效果
        if (target.effects?.ongoing) {
            const ongoing = target.effects.ongoing;
            if (ongoing.capacity_bonus) {
                effects.push({ icon: '📦', text: `容量 +${(ongoing.capacity_bonus * 100).toFixed(0)}%`, color: 'var(--accent-cyan)' });
            }
            if (ongoing.compute_efficiency) {
                effects.push({ icon: '⚡', text: `算力效率 +${(ongoing.compute_efficiency * 100).toFixed(0)}%`, color: 'var(--accent-cyan)' });
            }
            if (ongoing.energy_cost_reduction) {
                effects.push({ icon: '💡', text: `能源成本 -${(ongoing.energy_cost_reduction * 100).toFixed(0)}%`, color: 'var(--accent-green)' });
            }
            if (ongoing.esg_bonus) {
                effects.push({ icon: '🌱', text: `ESG +${ongoing.esg_bonus}`, color: 'var(--accent-green)' });
            }
        }

        if (effects.length === 0) return null;

        return React.createElement('div', {
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.3rem',
                marginBottom: '0.5rem'
            }
        },
            effects.slice(0, 4).map((effect, idx) =>
                React.createElement('span', {
                    key: idx,
                    style: {
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.4rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '3px',
                        color: effect.color
                    }
                }, `${effect.icon} ${effect.text}`)
            )
        );
    },

    // ==========================================
    // 已完成單位
    // ==========================================

    renderAcquiredUnits(acquired, synergies) {
        const config = window.AcquisitionConfig;

        return React.createElement('div', {
            style: {
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(0,255,136,0.08)',
                borderRadius: '6px',
                border: '1px solid rgba(0,255,136,0.2)'
            }
        },
            React.createElement('div', {
                style: { fontSize: '0.8rem', color: 'var(--accent-green)', marginBottom: '0.5rem' }
            }, '🏆 已完成併購'),
            
            // 單位列表
            React.createElement('div', {
                style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }
            },
                acquired.map(unit => {
                    const target = config?.getTarget(unit.target_id);
                    return React.createElement('div', {
                        key: unit.target_id,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.6rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px',
                            fontSize: '0.8rem'
                        }
                    },
                        React.createElement('span', null, target?.icon || '🏢'),
                        React.createElement('span', {
                            style: { color: 'var(--text-primary)' }
                        }, target?.name || unit.target_id)
                    );
                })
            ),

            // 協同效應
            synergies && synergies.length > 0 && React.createElement('div', {
                style: {
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(138,43,226,0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(138,43,226,0.2)'
                }
            },
                React.createElement('div', {
                    style: { fontSize: '0.75rem', color: '#8a2be2', marginBottom: '0.3rem' }
                }, '✨ 協同效應'),
                synergies.map(syn =>
                    React.createElement('div', {
                        key: syn.id,
                        style: {
                            fontSize: '0.75rem',
                            color: 'var(--text-primary)',
                            padding: '0.15rem 0'
                        }
                    }, `• ${syn.name}`)
                )
            )
        );
    },

    // ==========================================
    // 效果摘要
    // ==========================================

    renderEffectsSummary(effects) {
        if (!effects) return null;

        const hasEffects = Object.values(effects).some(v => v !== 0);
        if (!hasEffects) return null;

        return React.createElement('div', {
            style: {
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '4px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }
        },
            effects.quarterly_revenue > 0 && React.createElement('span', null,
                `💰 收益 +$${effects.quarterly_revenue}M/季`
            ),
            effects.capacity_bonus > 0 && React.createElement('span', null,
                `📦 容量 +${(effects.capacity_bonus * 100).toFixed(0)}%`
            ),
            effects.compute_efficiency > 0 && React.createElement('span', null,
                `⚡ 算力 +${(effects.compute_efficiency * 100).toFixed(0)}%`
            ),
            effects.energy_cost_reduction > 0 && React.createElement('span', null,
                `💡 能源 -${(effects.energy_cost_reduction * 100).toFixed(0)}%`
            ),
            effects.operating_efficiency_penalty < 0 && React.createElement('span', {
                style: { color: 'var(--accent-red)' }
            },
                `⚠️ 效率 ${(effects.operating_efficiency_penalty * 100).toFixed(0)}%`
            )
        );
    },

    // ==========================================
    // 併購確認彈窗
    // ==========================================

    renderAcquisitionConfirmModal(opportunity, player, onConfirm, onCancel) {
        const target = opportunity.target;
        const config = window.AcquisitionConfig;
        const typeColor = config?.UI_CONFIG?.type_colors?.[target.type] || '#4488ff';

        return React.createElement('div', {
            className: 'modal-overlay',
            style: {
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }
        },
            React.createElement('div', {
                className: 'acquisition-confirm-modal',
                style: {
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    maxWidth: '450px',
                    width: '90%',
                    border: `1px solid ${typeColor}`
                }
            },
                // 標題
                React.createElement('h2', {
                    style: { margin: '0 0 1rem 0', color: typeColor, textAlign: 'center' }
                }, `🤝 確認併購`),

                // 目標資訊
                React.createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }
                },
                    React.createElement('span', { style: { fontSize: '2rem' } }, target.icon),
                    React.createElement('div', null,
                        React.createElement('div', {
                            style: { fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }
                        }, target.name),
                        React.createElement('div', {
                            style: { fontSize: '0.85rem', color: 'var(--text-secondary)' }
                        }, target.description)
                    )
                ),

                // 交易詳情
                React.createElement('div', {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        marginBottom: '1rem'
                    }
                },
                    React.createElement('div', {
                        style: {
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '6px',
                            textAlign: 'center'
                        }
                    },
                        React.createElement('div', {
                            style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                        }, '💰 併購成本'),
                        React.createElement('div', {
                            style: { fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-red)' }
                        }, `$${opportunity.cost.final}M`)
                    ),
                    React.createElement('div', {
                        style: {
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '6px',
                            textAlign: 'center'
                        }
                    },
                        React.createElement('div', {
                            style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                        }, '⏱ 整合期'),
                        React.createElement('div', {
                            style: { fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-yellow)' }
                        }, `${opportunity.integration_turns.final} 季`)
                    )
                ),

                // 整合期間影響
                React.createElement('div', {
                    style: {
                        padding: '0.75rem',
                        background: 'rgba(255,68,68,0.1)',
                        borderRadius: '6px',
                        marginBottom: '1rem'
                    }
                },
                    React.createElement('div', {
                        style: { fontSize: '0.8rem', color: 'var(--accent-red)', marginBottom: '0.25rem' }
                    }, '⚠️ 整合期間影響'),
                    React.createElement('div', {
                        style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                    }, '• 營運效率 -15%'),
                    React.createElement('div', {
                        style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                    }, '• 人員忠誠度每季 -2')
                ),

                // 併購後收益
                target.effects?.ongoing && React.createElement('div', {
                    style: {
                        padding: '0.75rem',
                        background: 'rgba(0,255,136,0.1)',
                        borderRadius: '6px',
                        marginBottom: '1rem'
                    }
                },
                    React.createElement('div', {
                        style: { fontSize: '0.8rem', color: 'var(--accent-green)', marginBottom: '0.25rem' }
                    }, '✨ 整合完成後'),
                    target.effects.ongoing.quarterly_revenue && React.createElement('div', {
                        style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                    }, `• 每季收益 +$${target.effects.ongoing.quarterly_revenue}M`),
                    target.effects.ongoing.capacity_bonus && React.createElement('div', {
                        style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }
                    }, `• 空間容量 +${(target.effects.ongoing.capacity_bonus * 100).toFixed(0)}%`)
                ),

                // 按鈕
                React.createElement('div', { style: { display: 'flex', gap: '0.75rem' } },
                    React.createElement('button', {
                        style: {
                            flex: 1,
                            padding: '0.9rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        },
                        onClick: onCancel
                    }, '取消'),
                    React.createElement('button', {
                        style: {
                            flex: 1,
                            padding: '0.9rem',
                            background: `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`,
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        },
                        onClick: () => onConfirm()
                    }, '🤝 確認併購')
                )
            )
        );
    }
};

// 全域註冊
window.AcquisitionUI = AcquisitionUI;
console.log('✓ Acquisition UI loaded');
