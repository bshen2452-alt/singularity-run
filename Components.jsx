// ============================================
// 奇點競速 - React 通用 UI 組件
// ============================================


// ============================================
// 通用 UI 組件
// ============================================

// 發光按鈕組件
function GlowButton({ children, onClick, variant = 'primary', disabled = false, size = 'medium', icon, className = '' }) {
    const colors = {
        primary: { bg: 'var(--accent-cyan)', glow: 'var(--glow-cyan)' },
        secondary: { bg: 'var(--accent-magenta)', glow: 'var(--glow-magenta)' },
        success: { bg: 'var(--accent-green)', glow: '0 0 20px rgba(0, 255, 136, 0.4)' },
        danger: { bg: 'var(--accent-red)', glow: '0 0 20px rgba(255, 51, 102, 0.4)' },
        warning: { bg: 'var(--accent-yellow)', glow: '0 0 20px rgba(255, 208, 0, 0.4)' },
        ghost: { bg: 'transparent', glow: 'none' }
    };

    const sizes = {
        small: { padding: '8px 16px', fontSize: '0.85rem' },
        medium: { padding: '12px 24px', fontSize: '1rem' },
        large: { padding: '16px 32px', fontSize: '1.1rem' }
    };

    const style = {
        background: variant === 'ghost' ? 'transparent' : `linear-gradient(135deg, ${colors[variant].bg}22, ${colors[variant].bg}44)`,
        border: `1px solid ${colors[variant].bg}`,
        color: colors[variant].bg,
        padding: sizes[size].padding,
        fontSize: sizes[size].fontSize,
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.5 : 1,
        boxShadow: disabled ? 'none' : colors[variant].glow,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    };

    return (
        <button 
            style={style} 
            onClick={onClick} 
            disabled={disabled}
            className={className}
            onMouseEnter={(e) => {
                if (!disabled) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = `${colors[variant].glow}, 0 5px 20px rgba(0,0,0,0.3)`;
                }
            }}
            onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = colors[variant].glow;
            }}
        >
            {icon && <span>{icon}</span>}
            {children}
        </button>
    );
}

// 面板組件
function Panel({ title, icon, children, color = 'var(--accent-cyan)', className = '', collapsible = false, defaultCollapsed = false, collapsedInfo = null }) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    const panelStyle = {
        background: 'var(--bg-card)',
        border: `1px solid ${color}33`,
        borderRadius: '8px',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        boxShadow: `0 0 30px ${color}11, inset 0 1px 0 ${color}22`
    };

    const headerStyle = {
        background: `linear-gradient(90deg, ${color}22, transparent)`,
        borderBottom: collapsed ? 'none' : `1px solid ${color}22`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: collapsible ? 'pointer' : 'default'
    };

    const titleStyle = {
        fontFamily: 'var(--font-display)',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: color,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    };

    return (
        <div style={panelStyle} className={className}>
            <div style={headerStyle} onClick={() => collapsible && setCollapsed(!collapsed)}>
                <div style={titleStyle}>
                    {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
                    {title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* 收縮時顯示的額外訊息 */}
                    {collapsedInfo && (
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: collapsedInfo.color || 'var(--text-secondary)',
                            background: collapsedInfo.background || 'var(--bg-tertiary)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            animation: collapsedInfo.pulse ? 'pulse 2s infinite' : 'none'
                        }}>
                            {collapsedInfo.icon && <span style={{ marginRight: '4px' }}>{collapsedInfo.icon}</span>}
                            {collapsedInfo.text}
                        </div>
                    )}
                    {collapsible && (
                        <span style={{ color: color, transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
                            ▼
                        </span>
                    )}
                </div>
            </div>
            {!collapsed && (
                <div style={{ padding: '16px' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// 進度條組件
function ProgressBar({ value, max = 100, color = 'var(--accent-cyan)', height = 8, showLabel = true, label = '', glow = true }) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const containerStyle = {
        width: '100%',
        height: height,
        background: 'var(--bg-tertiary)',
        borderRadius: height / 2,
        overflow: 'hidden',
        position: 'relative'
    };

    const fillStyle = {
        width: `${percentage}%`,
        height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}aa)`,
        borderRadius: height / 2,
        transition: 'width 0.5s ease-out',
        boxShadow: glow ? `0 0 10px ${color}66` : 'none'
    };

    return (
        <div>
            {showLabel && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ color: color, fontFamily: 'var(--font-mono)' }}>{value.toFixed(1)}/{max.toFixed(1)}</span>
                </div>
            )}
            <div style={containerStyle}>
                <div style={fillStyle} />
            </div>
        </div>
    );
}

// 消息通知組件
function MessageLog({ messages }) {
    const logRef = useRef(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [messages]);

    const typeColors = {
        info: 'var(--accent-cyan)',
        success: 'var(--accent-green)',
        warning: 'var(--accent-yellow)',
        danger: 'var(--accent-red)',
        event: 'var(--accent-magenta)'
    };

    return (
        <div 
            ref={logRef}
            style={{
                maxHeight: '200px',
                overflowY: 'auto',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem'
            }}
        >
            {messages.map((msg, idx) => (
                <div 
                    key={idx} 
                    style={{ 
                        marginBottom: '8px', 
                        paddingLeft: '12px',
                        borderLeft: `2px solid ${typeColors[msg.type] || typeColors.info}`,
                        animation: idx === messages.length - 1 ? 'slide-in 0.3s ease-out' : 'none'
                    }}
                >
                    <span style={{ color: typeColors[msg.type] || typeColors.info }}>[{msg.turn || '-'}]</span>
                    <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>{msg.text}</span>
                </div>
            ))}
            {messages.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>等待事件...</div>
            )}
        </div>
    );
}

// 模態框組件
function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
    if (!isOpen) return null;

    const sizes = {
        small: '400px',
        medium: '600px',
        large: '800px',
        full: '90vw'
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)',
            animation: 'slide-in 0.2s ease-out'
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent-cyan)33',
                borderRadius: '12px',
                width: sizes[size],
                maxWidth: '95vw',
                maxHeight: '90vh',
                overflow: 'hidden',
                boxShadow: 'var(--glow-cyan), 0 20px 60px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{
                    background: 'linear-gradient(90deg, var(--accent-cyan)22, transparent)',
                    borderBottom: '1px solid var(--accent-cyan)22',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.1rem',
                        color: 'var(--accent-cyan)',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        margin: 0
                    }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0 8px'
                        }}
                    >×</button>
                </div>
                <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 60px)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// 輸入框組件
function Input({ label, value, onChange, type = 'text', min, max, step, placeholder, icon }) {
    return (
        <div style={{ marginBottom: '16px' }}>
            {label && (
                <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    {icon && <span style={{ marginRight: '6px' }}>{icon}</span>}
                    {label}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                min={min}
                max={max}
                step={step}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-cyan)';
                    e.target.style.boxShadow = '0 0 10px var(--accent-cyan)22';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                }}
            />
        </div>
    );
}

// 選擇卡片組件
function SelectCard({ selected, onClick, title, description, icon, color = 'var(--accent-cyan)', disabled = false }) {
    return (
        <div
            onClick={() => !disabled && onClick()}
            style={{
                padding: '16px',
                background: selected ? `${color}22` : 'var(--bg-tertiary)',
                border: `2px solid ${selected ? color : 'transparent'}`,
                borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.3s ease',
                boxShadow: selected ? `0 0 20px ${color}33` : 'none'
            }}
            onMouseEnter={(e) => {
                if (!disabled && !selected) {
                    e.currentTarget.style.borderColor = `${color}66`;
                    e.currentTarget.style.background = `${color}11`;
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled && !selected) {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                }
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                <span style={{ 
                    fontFamily: 'var(--font-display)', 
                    fontSize: '1rem', 
                    color: selected ? color : 'var(--text-primary)',
                    fontWeight: 600 
                }}>{title}</span>
            </div>
            <p style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)', 
                margin: 0,
                lineHeight: 1.5
            }}>{description}</p>
        </div>
    );
}

// Tab 組件
function Tabs({ tabs, activeTab, onChange }) {
    return (
        <div style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--bg-tertiary)',
            padding: '4px',
            borderRadius: '8px',
            marginBottom: '16px'
        }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: activeTab === tab.id ? 'var(--accent-cyan)22' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                >
                    {tab.icon && <span style={{ marginRight: '8px' }}>{tab.icon}</span>}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// 確認對話框
function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmText = '確認', cancelText = '取消', type = 'warning' }) {
    if (!isOpen) return null;

    const typeColors = {
        warning: 'var(--accent-yellow)',
        danger: 'var(--accent-red)',
        info: 'var(--accent-cyan)',
        success: 'var(--accent-green)'
    };

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title} size="small">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                    {type === 'warning' && '⚠️'}
                    {type === 'danger' && '🚨'}
                    {type === 'info' && 'ℹ️'}
                    {type === 'success' && '✅'}
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1rem', lineHeight: 1.6 }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <GlowButton variant="ghost" onClick={onCancel}>{cancelText}</GlowButton>
                    <GlowButton variant={type === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</GlowButton>
                </div>
            </div>
        </Modal>
    );
}

// ============================================
// 匯出通用 UI 組件
// ============================================

const Components = {
    // 基礎組件
    GlowButton,
    Panel,
    ProgressBar,
    MessageLog,
    Modal,
    Input,
    SelectCard,
    Tabs,
    ConfirmDialog
};

// 確認通用 UI 組件已載入
console.log('General UI components loaded');


// 掛載到全局 window 對象（關鍵修復）
window.Components = Components;

// 確認通用 UI 組件已載入
console.log('✓ General UI components loaded');

// 支持模組化環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Components;
}