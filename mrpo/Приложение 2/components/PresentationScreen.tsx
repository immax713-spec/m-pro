import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Presentation, ProgressCategory, SubProgressCategory, Slide, Observation, Status, StatusLevel, SheetPayload, SheetMonthAggregate } from '../types';

declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

// Helpers for date normalization and display
const normalizeDateKey = (s: string) => {
    const str = String(s || '').trim();
    const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const d = new Date(str);
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return str || '';
};
const formatDateRU = (s: string) => {
    const str = String(s || '').trim();
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    }
    return str || '';
};
// --- Icons ---
// FIX: Updated ChevronUpIcon to accept className prop to fix type error.
const ChevronUpIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
);
// FIX: Updated ChevronDownIcon to accept className prop to fix type error.
const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);
const PhotoIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);
const CalendarIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 12.75h.008v.008H12v-.008z" />
    </svg>
);
const UserIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);
const HardHatIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.474-4.474c-.049-.58-.198-1.193-.44-1.743m-2.9-2.9a4.5 4.5 0 00-4.474 4.474c.049.58.198 1.193.44 1.743m0 0l-2.9-2.9m-4.655 5.653l-5.653 4.655" />
    </svg>
);
const WarningIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);
const ReplaceIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 12h7a4 4 0 014 4v3a4 4 0 01-4 4h-2a4 4 0 01-4-4v-1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 8l3 3-3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 16l-3-3 3-3" />
    </svg>
);
const CloseIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const UploadIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);
const RefreshIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);



// --- Components ---
const EditableInput = ({ value, onChange, className = '', tag: Tag = 'input', ...props }: { value: string | number, onChange: (val: string) => void, className?: string, tag?: 'input' | 'textarea', [key: string]: any }) => {
    const ref = useRef<any>(null);
    useEffect(() => {
        if (Tag === 'textarea' && ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = ref.current.scrollHeight + 'px';
        }
    }, [value, Tag]);
    return (
        <Tag
            ref={ref}
            type="text"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)}
            className={`w-full p-1 bg-transparent rounded-md border border-transparent hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors ${className}`}
            style={Tag === 'textarea' ? { overflow: 'hidden' } : undefined}
            rows={Tag === 'textarea' ? (props.rows ?? 2) : undefined}
            {...props}
        />
    );
};


const handleNumericChange = (value: string, setter: (num: number) => void) => {
    let numValue = parseInt(value, 10);
    if (isNaN(numValue)) numValue = 0;
    if (numValue < 0) numValue = 0;
    if (numValue > 100) numValue = 100;
    setter(numValue);
};


interface ProgressDynamicsBarProps {
    previous: number;
    current: number;
    onPreviousChange: (val: number) => void;
    onCurrentChange: (val: number) => void;
    isSubItem?: boolean;
}
const ProgressDynamicsBar: React.FC<ProgressDynamicsBarProps> = ({ previous, current, onPreviousChange, onCurrentChange, isSubItem = false }) => {

    const previousStyle = {
        width: `${previous}%`,
        backgroundImage: 'linear-gradient(to right, #fee2e2, #f87171)', // red-100 to red-400
    };

    const currentStyle = {
        width: `${current}%`,
        backgroundImage: 'linear-gradient(to right, #dcfce7, #34d399)', // green-100 to green-400
    };

    const barHeight = isSubItem ? 'h-2.5' : 'h-3.5';
    const textClass = isSubItem ? 'text-xs' : 'text-sm';

    return (
        <div className={`flex-grow flex flex-col gap-2 ${isSubItem ? 'py-0' : 'py-2'}`}>
            <div className="flex items-center gap-3">
                {!isSubItem && <span className="text-sm text-slate-500 w-10">Было</span>}
                <div className={`w-full bg-slate-200/70 rounded-full ${barHeight} shadow-inner`}>
                    <div className="h-full rounded-full" style={previousStyle} />
                </div>
                <div className="w-16 text-right">
                    <EditableInput value={`${previous}%`} onChange={(v) => handleNumericChange(v.replace('%', ''), onPreviousChange)} className={`${textClass} font-semibold text-red-500 text-right`} />
                </div>
            </div>
            <div className="flex items-center gap-3">
                {!isSubItem && <span className="text-sm text-slate-500 w-10">Стало</span>}
                <div className={`w-full bg-slate-200/70 rounded-full ${barHeight} shadow-inner`}>
                    <div className="h-full rounded-full transition-all duration-500 ease-out" style={currentStyle} />
                </div>
                <div className="w-16 text-right">
                    <EditableInput value={`${current}%`} onChange={(v) => handleNumericChange(v.replace('%', ''), onCurrentChange)} className={`${textClass} font-semibold text-green-500 text-right`} />
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ label, value, icon }: { label: React.ReactNode, value: React.ReactNode, icon?: React.ReactNode }) => (
    <div className="grid grid-cols-[40%,1fr] items-start gap-x-4 py-1.5 border-b border-slate-200/80 last:border-b-0">
        <div className="flex items-start text-xs text-slate-500 pt-0.5">
            {icon && <span className="mr-2 text-slate-400 shrink-0">{icon}</span>}
            <span className="break-words leading-snug">{label}</span>
        </div>
        <div className="text-sm font-semibold text-slate-800 min-w-0">
            {value}
        </div>
    </div>
);

const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short' });

const formatMonthLabel = (key: string) => {
    const [year, month] = key.split('-').map(Number);
    if (!year || !month) return key;
    const date = new Date(year, month - 1, 1);
    return `${monthFormatter.format(date).replace('.', '')} ${String(year).slice(2)}`;
};

const MobilizationChart = ({ data, status }: { data?: SheetMonthAggregate[]; status: 'idle' | 'loading' | 'error'; }) => {
    if (status === 'loading') {
        return (
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 flex items-center justify-center min-h-[280px] sm:min-h-[320px] shadow-sm">
                <span className="text-sm text-slate-500 animate-pulse">Загрузка данных...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 flex items-center justify-center min-h-[280px] sm:min-h-[320px] shadow-sm">
                <span className="text-sm text-slate-500">Нет данных по мобилизации</span>
            </div>
        );
    }

    const displayData = data.length >= 5 ? data.slice(-5) : data;
    const validData = displayData.filter(item => item.manpower !== null && item.manpower !== undefined && item.manpower > 0);
    const maxValue = validData.length > 0
        ? Math.max(...validData.map(item => item.manpower ?? 0), 1)
        : 1;

    // Адаптивные размеры
    const svgWidth = 600;
    const svgHeight = 380;
    const padding = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const headroomRatio = 0.15;
    const scaleMax = Math.max(1, Math.ceil(maxValue * (1 + headroomRatio)));

    const getYCoord = (value: number) => {
        return padding.top + chartHeight - ((value) / scaleMax) * chartHeight;
    };

    const bands = Math.max(displayData.length, 1);
    const bandWidth = chartWidth / bands;
    const barWidth = Math.min(60, Math.max(20, bandWidth * 0.55));

    // Генерируем Y-тики
    const numTicks = 5;
    const yTicks: number[] = [];
    for (let i = 0; i <= numTicks; i++) {
        yTicks.push((scaleMax / numTicks) * (numTicks - i));
    }

    return (
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm">
            <h4 className="text-sm sm:text-base font-semibold text-slate-800 mb-3">Мобилизация трудовых ресурсов</h4>
            <div className="w-full overflow-x-auto">
                <div className="min-w-[280px] w-full" style={{ aspectRatio: '600/380', maxHeight: '380px' }}>
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                        className="overflow-visible"
                    >
                        <defs>
                            <linearGradient id="barGradientNew" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#4f46e5" />
                                <stop offset="50%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#818cf8" />
                            </linearGradient>
                            <filter id="barShadow">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                            </filter>
                        </defs>

                        {/* Фон */}
                        <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="#fafbfc" rx="6" />

                        {/* Сетка */}
                        <g stroke="#e5e7eb" strokeWidth="1" opacity="0.6">
                            {yTicks.map((t, i) => {
                                const y = getYCoord(t);
                                return <line key={i} x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} />;
                            })}
                        </g>

                        {/* Ось Y */}
                        <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={padding.top + chartHeight}
                            stroke="#d1d5db"
                            strokeWidth="1.5"
                        />

                        {/* Подписи оси Y */}
                        <g fill="#6b7280" fontWeight="500" style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif' }}>
                            {yTicks.map((t, i) => {
                                const y = getYCoord(t);
                                return (
                                    <text key={i} x={padding.left - 8} y={y + 3} textAnchor="end">
                                        {Math.round(t)}
                                    </text>
                                );
                            })}
                        </g>

                        {/* Столбцы */}
                        {displayData.map((item, index) => {
                            const manpowerValue = item.manpower !== null && item.manpower !== undefined ? Math.floor(item.manpower as number) : null;
                            const barHeight = manpowerValue !== null && manpowerValue > 0
                                ? ((manpowerValue / scaleMax) * chartHeight)
                                : 0;
                            const x = padding.left + index * bandWidth + (bandWidth - barWidth) / 2;
                            const y = padding.top + chartHeight - barHeight;
                            const cx = x + barWidth / 2;

                            return (
                                <g key={item.month + index}>
                                    {barHeight > 0 && (
                                        <>
                                            <rect
                                                x={x}
                                                y={y}
                                                width={barWidth}
                                                height={barHeight}
                                                fill="url(#barGradientNew)"
                                                rx="4"
                                                filter="url(#barShadow)"
                                            />
                                            <text
                                                x={cx}
                                                y={Math.max(padding.top + 12, y - 6)}
                                                fill="#1f2937"
                                                fontWeight="600"
                                                style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif' }}
                                                textAnchor="middle"
                                            >
                                                {manpowerValue}
                                            </text>
                                        </>
                                    )}
                                    <text
                                        x={cx}
                                        y={padding.top + chartHeight + 16}
                                        fill="#6b7280"
                                        fontWeight="500"
                                        style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif' }}
                                        textAnchor="middle"
                                    >
                                        {formatMonthLabel(item.month)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Ось X */}
                        <line
                            x1={padding.left}
                            y1={padding.top + chartHeight}
                            x2={svgWidth - padding.right}
                            y2={padding.top + chartHeight}
                            stroke="#d1d5db"
                            strokeWidth="1.5"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
};

const DynamicsChart = ({ data, status }: { data?: SheetMonthAggregate[]; status: 'idle' | 'loading' | 'error'; }) => {
    if (status === 'loading') {
        return (
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 flex items-center justify-center min-h-[280px] sm:min-h-[320px] shadow-sm">
                <span className="text-sm text-slate-500 animate-pulse">Загрузка данных...</span>
            </div>
        );
    }

    const displayData = data && data.length >= 5 ? data.slice(-5) : (data || []);
    const readinessPoints = displayData.filter(item => typeof item.readiness === 'number' && item.readiness !== null);

    if (!readinessPoints.length) {
        return (
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 flex items-center justify-center min-h-[280px] sm:min-h-[320px] shadow-sm">
                <span className="text-sm text-slate-500">Нет данных по готовности</span>
            </div>
        );
    }

    const yValues = readinessPoints.map(point => point.readiness ?? 0);
    const yMin = Math.max(0, Math.floor(Math.min(...yValues)) - 3);
    const yMax = Math.min(100, Math.ceil(Math.max(...yValues)) + 3);
    const yRange = yMax - yMin || 1;

    // Адаптивные размеры
    const svgWidth = 600;
    const svgHeight = 380;
    const padding = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const getCoords = (index: number, value: number) => {
        const x = padding.left + (index / Math.max(readinessPoints.length - 1, 1)) * chartWidth;
        const y = padding.top + chartHeight - ((value - yMin) / yRange) * chartHeight;
        return { x, y };
    };

    const getYCoord = (value: number) => {
        return padding.top + chartHeight - ((value - yMin) / yRange) * chartHeight;
    };

    const pathData = readinessPoints.map((point, index) => {
        const coords = getCoords(index, point.readiness ?? 0);
        return `${coords.x},${coords.y}`;
    }).join(' ');

    // Генерируем Y-тики
    const numGridLines = 5;
    const gridLines: number[] = [];
    for (let i = 0; i <= numGridLines; i++) {
        gridLines.push(yMin + (yRange / numGridLines) * i);
    }

    const formatPercent = (v: number) => {
        const r = parseFloat(v.toFixed(1));
        return Number.isInteger(r) ? String(Math.trunc(r)) : String(r);
    };

    return (
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm">
            <h4 className="text-sm sm:text-base font-semibold text-slate-800 mb-3">Динамика выполнения работ (%)</h4>
            <div className="w-full overflow-x-auto">
                <div className="min-w-[280px] w-full" style={{ aspectRatio: '600/380', maxHeight: '380px' }}>
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                        className="overflow-visible"
                    >
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="50%" stopColor="#a78bfa" />
                                <stop offset="100%" stopColor="#c4b5fd" />
                            </linearGradient>
                            <linearGradient id="areaGradientNew" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                            </linearGradient>
                            <filter id="pointShadow">
                                <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
                            </filter>
                        </defs>

                        {/* Фон */}
                        <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="#fafbfc" rx="6" />

                        {/* Сетка */}
                        <g stroke="#e5e7eb" strokeWidth="1" opacity="0.6">
                            {gridLines.map((yVal) => {
                                const y = getYCoord(yVal);
                                return <line key={yVal} x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} />;
                            })}
                        </g>

                        {/* Ось Y */}
                        <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={padding.top + chartHeight}
                            stroke="#d1d5db"
                            strokeWidth="1.5"
                        />

                        {/* Подписи оси Y */}
                        <g fill="#6b7280" fontWeight="500" style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif' }}>
                            {gridLines.map((yVal) => {
                                const y = getYCoord(yVal);
                                return (
                                    <text key={yVal} x={padding.left - 8} y={y + 3} textAnchor="end">
                                        {Math.round(yVal)}
                                    </text>
                                );
                            })}
                        </g>

                        {/* Область под линией */}
                        <polygon
                            fill="url(#areaGradientNew)"
                            points={`${padding.left},${padding.top + chartHeight} ${pathData} ${svgWidth - padding.right},${padding.top + chartHeight}`}
                        />

                        {/* Линия графика */}
                        <polyline
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={pathData}
                        />

                        {/* Точки данных */}
                        {readinessPoints.map((point, index) => {
                            const coords = getCoords(index, point.readiness ?? 0);
                            const readinessValue = point.readiness ?? 0;
                            return (
                                <g key={point.month}>
                                    {/* Внешний круг */}
                                    <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r="6"
                                        fill="white"
                                        opacity="0.9"
                                        filter="url(#pointShadow)"
                                    />
                                    {/* Основной круг */}
                                    <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r="5"
                                        fill="white"
                                        stroke="#8b5cf6"
                                        strokeWidth="2.5"
                                    />
                                    {/* Внутренний круг */}
                                    <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r="2.5"
                                        fill="#8b5cf6"
                                    />

                                    {/* Значение над точкой */}
                                    <text
                                        x={coords.x}
                                        y={coords.y - 12}
                                        fill="#1f2937"
                                        fontWeight="600"
                                        style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif' }}
                                        textAnchor="middle"
                                    >
                                        {formatPercent(readinessValue)}%
                                    </text>

                                    {/* Подпись месяца */}
                                    <text
                                        x={coords.x}
                                        y={padding.top + chartHeight + 16}
                                        fill="#6b7280"
                                        fontWeight="500"
                                        style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif' }}
                                        textAnchor="middle"
                                    >
                                        {formatMonthLabel(point.month)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Ось X */}
                        <line
                            x1={padding.left}
                            y1={padding.top + chartHeight}
                            x2={svgWidth - padding.right}
                            y2={padding.top + chartHeight}
                            stroke="#d1d5db"
                            strokeWidth="1.5"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
};

const getObservationNoun = (count: number): string => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'замечаний';
    }
    if (lastDigit === 1) {
        return 'замечание';
    }
    if ([2, 3, 4].includes(lastDigit)) {
        return 'замечания';
    }
    return 'замечаний';
};

const statusOptions: Status[] = [
    { text: 'Сорван', level: 'critical' },
    { text: 'Высокий', level: 'high' },
    { text: 'Низкий', level: 'low' },
    { text: 'Отсутствует', level: 'none' },
];

const statusColorClasses: Record<StatusLevel, string> = {
    critical: 'bg-red-700 text-white',
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
    none: 'bg-green-100 text-green-700',
};

const statusLabelByLevel: Record<StatusLevel, string> = {
    critical: 'Сорван',
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
    none: 'Отсутствует',
};


interface PresentationScreenProps {
    presentation: Presentation;
    sheetData: SheetPayload | null;
    sheetStatus: 'idle' | 'loading' | 'error';
    photosStatus: 'idle' | 'loading' | 'error';
    onUpdate: (updatedPresentation: Presentation) => void;
    onReturnToRegistry: () => void;
    onRefreshData?: () => void;
    onDelete?: (id: string) => void;
    onReloadPhotos?: () => void;
}

const PresentationScreen: React.FC<PresentationScreenProps> = ({ presentation, sheetData, sheetStatus, photosStatus, onUpdate, onReturnToRegistry, onRefreshData, onDelete, onReloadPhotos }) => {
    const presentationRef = useRef<HTMLDivElement>(null);
    const photoEditInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const [activeGallery, setActiveGallery] = useState<'main' | 'comments' | 'fence' | 'premises'>('main');
    const [mainSlideIndex, setMainSlideIndex] = useState(0);
    const [commentSlideIndex, setCommentSlideIndex] = useState(0);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isActualStateModalOpen, setIsActualStateModalOpen] = useState(false);
    const [isGalleryDropdownOpen, setIsGalleryDropdownOpen] = useState(false);
    const actualBadgeRef = useRef<HTMLButtonElement>(null);
    const [badgeWidth, setBadgeWidth] = useState<number>(0);
    useEffect(() => {
        const measure = () => {
            const w = actualBadgeRef.current?.offsetWidth || 0;
            if (w && w !== badgeWidth) setBadgeWidth(w);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [presentation.status.text]);


    const handleUpdate = useCallback(<K extends keyof Presentation>(key: K, value: Presentation[K]) => {
        onUpdate({ ...presentation, [key]: value });
    }, [presentation, onUpdate]);

    const handleObservationToggle = (observationId: string) => {
        const newObservations = presentation.observations.map(obs =>
            obs.id === observationId ? { ...obs, isActive: !obs.isActive } : obs
        );
        handleUpdate('observations', newObservations as Observation[]);
    };

    const handleProgressCategoryUpdate = (categoryId: string, field: keyof ProgressCategory, value: any) => {
        const newProgress = presentation.progress.map(p =>
            p.id === categoryId ? { ...p, [field]: value } : p
        );
        handleUpdate('progress', newProgress);
    };

    const handleSubItemUpdate = (categoryId: string, subItemId: string, field: keyof SubProgressCategory, value: any) => {
        const newProgress = presentation.progress.map(p => {
            if (p.id === categoryId && p.subItems) {
                const newSubItems = p.subItems.map(sub =>
                    sub.id === subItemId ? { ...sub, [field]: value } : sub
                );
                return { ...p, subItems: newSubItems };
            }
            return p;
        });
        handleUpdate('progress', newProgress);
    };

    const handleNestedChange = (path: (string | number)[], value: any) => {
        const newPresentation = JSON.parse(JSON.stringify(presentation));
        let current: any = newPresentation;
        path.slice(0, -1).forEach(key => {
            current = current[key];
        });
        current[path[path.length - 1]] = value;
        onUpdate(newPresentation);
    };

    const handleDownloadPdf = async () => {
        if (!presentationRef.current) return;
        setIsGeneratingPdf(true);
        try {
            const { jsPDF } = window.jspdf;
            const canvas = await window.html2canvas(presentationRef.current, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save('dashboard.pdf');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Could not generate PDF. Please try again.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const isMainGalleryActive = activeGallery === 'main';
    const isPhotoGallery = activeGallery === 'main' || activeGallery === 'comments';
    const activeSlides = isMainGalleryActive ? presentation.slides : presentation.commentSlides;
    const activeIndex = isMainGalleryActive ? mainSlideIndex : commentSlideIndex;
    const setActiveIndex = isMainGalleryActive ? setMainSlideIndex : setCommentSlideIndex;
    const selectedSlideImageUrl = activeSlides[activeIndex]?.imageUrl;

    // Сбрасываем индекс при переключении галереи, чтобы избежать показа старого фото
    useEffect(() => {
        if (activeGallery === 'main') {
            setMainSlideIndex(0);
        } else if (activeGallery === 'comments') {
            setCommentSlideIndex(0);
        }
    }, [activeGallery]);

    useEffect(() => {
        const hasCommentPhotos = (presentation.commentSlides || []).some(s => !!s.imageUrl);
        const hasMainPhotos = (presentation.slides || []).some(s => !!s.imageUrl);
        if (hasCommentPhotos && !hasMainPhotos) {
            setActiveGallery('comments');
        }
    }, [presentation.slides, presentation.commentSlides]);

    useEffect(() => {
        const dates = (sheetData?.availableDates || []).map(d => normalizeDateKey(d)).filter(Boolean);
        if (!dates.length) return;
        const params = new URLSearchParams(window.location.search);
        const hasPhoto = !!params.get('photo_date');
        if (!hasPhoto) {
            const last = dates[dates.length - 1];
            params.set('photo_date', last);
            const url = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState(null, '', url);
            if (onReloadPhotos) onReloadPhotos();
        }
    }, [sheetData?.availableDates]);

    const handlePhotoReplace = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const newImageUrl = reader.result as string;
            if (isMainGalleryActive) {
                const newSlides = [...presentation.slides];
                newSlides[activeIndex] = { ...newSlides[activeIndex], imageUrl: newImageUrl };
                handleUpdate('slides', newSlides as Slide[]);
            } else {
                const newCommentSlides = [...presentation.commentSlides];
                newCommentSlides[activeIndex] = { ...newCommentSlides[activeIndex], imageUrl: newImageUrl };
                handleUpdate('commentSlides', newCommentSlides);
            }
        };
        reader.readAsDataURL(file);
        if (event.target) {
            event.target.value = "";
        }
    };

    const visibleObservations = activeGallery === 'comments'
        ? presentation.observations.filter(o => !o.id.startsWith('perimeter-') && !o.id.startsWith('household-'))
        : activeGallery === 'fence'
            ? presentation.observations.filter(o => o.id.startsWith('perimeter-'))
            : activeGallery === 'premises'
                ? presentation.observations.filter(o => o.id.startsWith('household-'))
                : presentation.observations;
    const activeObservationsCount = visibleObservations.filter(o => o.isActive).length;

    return (
        <div className="bg-slate-50 rounded-lg shadow-xl animate-fade-in w-full">
            <input type="file" accept="image/*" ref={photoEditInputRef} onChange={handlePhotoReplace} className="hidden" />

            {/* Actual State Modal */}
            {isActualStateModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-down" onClick={() => setIsActualStateModalOpen(false)}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl relative" onClick={(e) => e.stopPropagation()}>
                        <header className="flex justify-between items-center p-4 border-b border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800">Фактическое состояние объекта</h3>
                            <button onClick={() => setIsActualStateModalOpen(false)} className="text-slate-500 hover:text-slate-800 transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </header>
                        <div className="p-4">
                            <textarea
                                value={presentation.actualStateNotes}
                                onChange={(e) => handleNestedChange(['actualStateNotes'], e.target.value)}
                                className="w-full h-80 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                                placeholder="Введите информацию о состоянии объекта..."
                            />
                        </div>
                        <footer className="p-4 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setIsActualStateModalOpen(false)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                            >
                                Закрыть
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center border-b border-slate-200 bg-white/70 backdrop-blur-sm rounded-t-lg">
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 bg-slate-200 rounded-sm flex items-center justify-center text-xs font-bold text-slate-500" title="Герб Москвы">ГМ</div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-700 hidden sm:block">ГРАДОСТРОИТЕЛЬНЫЙ КОМПЛЕКС МОСКВЫ</div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-end w-full sm:w-auto mt-2 sm:mt-0">
                    {onRefreshData && (
                        <button
                            onClick={onRefreshData}
                            disabled={sheetStatus === 'loading'}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-wait text-xs sm:text-sm flex items-center gap-2"
                            title="Обновить данные из таблицы"
                        >
                            <RefreshIcon className={`w-4 h-4 ${sheetStatus === 'loading' ? 'animate-spin' : ''}`} />
                            {sheetStatus === 'loading' ? 'Обновление...' : 'Обновить данные'}
                        </button>
                    )}
                    <button onClick={onReturnToRegistry} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors text-xs sm:text-sm">Вернуться к реестру</button>
                    {onDelete && (
                        <button onClick={() => onDelete(presentation.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors text-xs sm:text-sm">Удалить</button>
                    )}
                    <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-wait text-xs sm:text-sm">
                        {isGeneratingPdf ? 'Генерация...' : 'Скачать PDF'}
                    </button>
                </div>
            </header>

            <div ref={presentationRef} className="p-4 sm:p-6 bg-slate-100">
                {/* Object Info Badge */}
                <div className="bg-white rounded-lg shadow-md p-5 sm:p-7 mb-6 border border-slate-200 flex flex-col gap-3 sm:gap-4">
                    <EditableInput
                        value={presentation.title}
                        onChange={(v) => handleUpdate('title', v)}
                        className="text-xl sm:text-2xl font-bold text-slate-800 !p-0 leading-tight break-words w-full resize-none"
                        tag="textarea"
                        rows={1}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-center sm:justify-end">
                        <button
                            ref={actualBadgeRef}
                            onClick={() => setIsActualStateModalOpen(true)}
                            className="text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-full cursor-pointer transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex w-full sm:w-auto text-center items-center justify-center whitespace-nowrap sm:order-2"
                        >
                            Фактическое состояние объекта
                        </button>
                    </div>
                </div>

                {/* --- Top Row --- */}
                <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6 items-start">
                    {/* Left Column */}
                    <div className="flex flex-col gap-6">
                        {/* Photo Gallery */}
                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <div className={activeGallery === 'main'
                                ? 'flex items-center justify-between mb-4 gap-3'
                                : 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-3'}>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsGalleryDropdownOpen(!isGalleryDropdownOpen)}
                                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {activeGallery === 'main' && 'Общий фотоотчёт'}
                                        {activeGallery === 'comments' && 'Замечания по строительной площадке'}
                                        {activeGallery === 'fence' && 'Замечания периметрального ограждения'}
                                        {activeGallery === 'premises' && 'Замечания бытовых помещений'}
                                        <ChevronDownIcon />
                                    </button>
                                    {isGalleryDropdownOpen && (
                                        <div className="absolute mt-2 w-64 bg-white rounded-md shadow-lg border border-slate-200 z-10">
                                            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => { setActiveGallery('main'); setIsGalleryDropdownOpen(false); }}>Общий фотоотчёт</button>
                                            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => { setActiveGallery('comments'); setIsGalleryDropdownOpen(false); }}>Замечания по строительной площадке</button>
                                            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => { setActiveGallery('fence'); setIsGalleryDropdownOpen(false); }}>Замечания периметрального ограждения</button>
                                            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => { setActiveGallery('premises'); setIsGalleryDropdownOpen(false); }}>Замечания бытовых помещений</button>
                                        </div>
                                    )}
                                </div>
                                <div className={activeGallery === 'main' ? 'flex items-center gap-2 sm:ml-auto sm:justify-end' : 'flex items-center gap-2 sm:ml-auto sm:justify-end'}>
                                    <span className="text-xs sm:text-sm text-slate-600">Дата фото:</span>
                                    <select
                                        className="border border-slate-300 rounded-md p-1 text-xs sm:text-sm text-slate-700 bg-white min-w-[120px]"
                                        value={normalizeDateKey((new URLSearchParams(window.location.search)).get('photo_date') || '')}
                                        onChange={(e) => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('photo_date', e.target.value);
                                            const url = `${window.location.pathname}?${params.toString()}`;
                                            window.history.replaceState(null, '', url);
                                            if (onReloadPhotos) onReloadPhotos();
                                        }}
                                    >
                                        {(sheetData?.availableDates || []).map(d => {
                                            const val = normalizeDateKey(d);
                                            return <option key={`photo-${val}`} value={val}>{formatDateRU(val)}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>

                            {isPhotoGallery && (
                                <div className="w-full h-80 bg-slate-200 rounded-lg flex items-center justify-center mb-4 border border-slate-300 overflow-hidden relative">
                                    {selectedSlideImageUrl ? (
                                        <>
                                            <img src={selectedSlideImageUrl} alt={`Slide ${activeIndex + 1}`} className="object-cover w-full h-full" />
                                            {photosStatus === 'loading' && (
                                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                                                    <svg className="animate-spin h-12 w-12 text-white mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <p className="font-semibold text-white animate-pulse">Обновление фото...</p>
                                                </div>
                                            )}
                                        </>
                                    ) : photosStatus === 'loading' ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                            <svg className="animate-spin h-12 w-12 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <p className="font-semibold animate-pulse">Загрузка фотографий...</p>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => photoEditInputRef.current?.click()}
                                            className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:bg-slate-300/50 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                            title="Загрузить фото"
                                        >
                                            <UploadIcon className="w-16 h-16 mx-auto text-slate-400" />
                                            <p className="mt-2 font-semibold">Загрузить фотографию</p>
                                        </button>
                                    )}
                                    {selectedSlideImageUrl && (
                                        <button
                                            onClick={() => photoEditInputRef.current?.click()}
                                            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                                            title="Заменить фото"
                                        >
                                            <ReplaceIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeGallery === 'comments' && (
                                <div className="mb-4">
                                    <EditableInput
                                        tag="textarea"
                                        value={presentation.commentSlides[activeIndex]?.comment || ''}
                                        onChange={(v) => handleNestedChange(['commentSlides', activeIndex, 'comment'], v)}
                                        className="w-full text-sm"
                                        rows={2}
                                        placeholder="Добавьте комментарий к этому фото..."
                                    />
                                </div>
                            )}

                            {isPhotoGallery && (
                                <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
                                    {activeSlides.map((slide, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActiveIndex(index)}
                                            className={`flex-shrink-0 w-24 h-16 rounded-md overflow-hidden border-2 transition-colors focus:outline-none ${activeIndex === index ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent hover:border-slate-400'}`}
                                        >
                                            {slide.imageUrl ? (
                                                <img src={slide.imageUrl} alt={`Thumbnail ${index + 1}`} className="object-cover w-full h-full" onError={() => handleNestedChange([isMainGalleryActive ? 'slides' : 'commentSlides', index, 'imageUrl'], '')} />
                                            ) : (
                                                <div className="bg-slate-200 w-full h-full flex items-center justify-center">
                                                    <PhotoIcon className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info Block / Observations Checklist */}
                        <div key={activeGallery} className="animate-fade-in-down">
                            {isMainGalleryActive ? (
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">ИНФОРМАЦИОННАЯ СПРАВКА ПО ОБЪЕКТУ</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                        {/* Left Column */}
                                        <div className="flex flex-col">
                                            <InfoRow label="Заказчик:" icon={<CalendarIcon className="w-5 h-5" />} value={<EditableInput value={presentation.objectInfo.customer} onChange={(v) => handleNestedChange(['objectInfo', 'customer'], v)} />} />
                                            <InfoRow label="Генподрядчик:" icon={<UserIcon className="w-5 h-5" />} value={<EditableInput value={presentation.objectInfo.generalContractor} onChange={(v) => handleNestedChange(['objectInfo', 'generalContractor'], v)} />} />
                                            <InfoRow label="Дата заключения контракта:" icon={<CalendarIcon className="w-5 h-5" />} value={<EditableInput value={presentation.objectInfo.contractDate} onChange={(v) => handleNestedChange(['objectInfo', 'contractDate'], v)} />} />
                                            <InfoRow label={<>Продление по<br />контракту:</>} icon={<CalendarIcon className="w-5 h-5" />} value={<EditableInput value={presentation.objectInfo.contractExtension} onChange={(v) => handleNestedChange(['objectInfo', 'contractExtension'], v)} />} />
                                            <InfoRow label={<>Рабочий персонал на<br />момент мониторинга:</>} icon={<HardHatIcon className="w-5 h-5" />} value={<EditableInput value={presentation.objectInfo.personnel} onChange={(v) => handleNestedChange(['objectInfo', 'personnel'], v)} />} />
                                        </div>
                                        {/* Right Column */}
                                        <div className="flex flex-col">
                                            <InfoRow label="Срок исполнения по АИП:" value={<EditableInput value={presentation.objectInfo.aipCompletionDate} onChange={(v) => handleNestedChange(['objectInfo', 'aipCompletionDate'], v)} />} />
                                            <InfoRow label={<>Срок исполнения по директивному<br />графику:</>} value={<EditableInput value={presentation.objectInfo.directiveCompletionDate} onChange={(v) => handleNestedChange(['objectInfo', 'directiveCompletionDate'], v)} />} />
                                            <InfoRow label="Срок исполнения по контракту:" value={<EditableInput value={presentation.objectInfo.contractualCompletionDate} onChange={(v) => handleNestedChange(['objectInfo', 'contractualCompletionDate'], v)} />} />
                                            <InfoRow label="Прогноз фактического ввода:" value={<EditableInput value={presentation.objectInfo.forecastedCommissioningDate} onChange={(v) => handleNestedChange(['objectInfo', 'forecastedCommissioningDate'], v)} />} />
                                            <InfoRow label="Штрафные санкции, руб.:" value={<EditableInput value={presentation.objectInfo.penalties} onChange={(v) => handleNestedChange(['objectInfo', 'penalties'], v)} />} />
                                            <InfoRow label="ТЭП (кв. м.):" value={<EditableInput value={presentation.objectInfo.technicalEconomicIndicators} onChange={(v) => handleNestedChange(['objectInfo', 'technicalEconomicIndicators'], v)} />} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                                        {activeGallery === 'comments' && 'ЗАМЕЧАНИЯ ПО СТРОИТЕЛЬНОЙ ПЛОЩАДКЕ'}
                                        {activeGallery === 'fence' && 'ЗАМЕЧАНИЯ ПЕРИМЕТРАЛЬНОГО ОГРАЖДЕНИЯ'}
                                        {activeGallery === 'premises' && 'ЗАМЕЧАНИЯ БЫТОВЫХ ПОМЕЩЕНИЙ'}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-grow">
                                        {visibleObservations.map((obs) => (
                                            <button
                                                key={obs.id}
                                                onClick={() => handleObservationToggle(obs.id)}
                                                className={`p-3 text-left text-sm rounded-md border transition-all duration-200 h-full flex items-center ${obs.isActive
                                                    ? 'bg-red-50 border-red-200 text-red-700 font-semibold shadow-sm'
                                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                                    }`}
                                            >
                                                {obs.text}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4 bg-red-700 text-white rounded-lg flex items-center p-3 overflow-hidden shadow-lg">
                                        <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center -ml-2">
                                            <div className="absolute opacity-10 w-24 h-24 border-2 border-white rounded-full"></div>
                                            <div className="absolute opacity-20 w-16 h-16 border-2 border-white rounded-full"></div>
                                            <WarningIcon className="w-8 h-8 text-white relative" />
                                        </div>
                                        <div className="flex items-baseline gap-3 ml-2">
                                            <span className="text-5xl font-bold tracking-tighter">{activeObservationsCount}</span>
                                            <span className="text-xl font-semibold">{getObservationNoun(activeObservationsCount)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column */}
                    <div>
                        {/* Progress */}
                        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col w-full mt-2">
                            <div className="mb-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-between gap-2">
                                    <span className="text-base font-bold text-slate-800">Риск срыва сроков:</span>
                                    <div className="relative">
                                        <div
                                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                            className={`mt-2 sm:mt-0 w-full sm:w-auto text-xs sm:text-sm font-semibold px-3 py-1 rounded-full cursor-pointer transition-all ${statusColorClasses[presentation.status.level]} text-center inline-flex justify-center`}
                                            style={{ width: badgeWidth ? `${badgeWidth}px` : undefined }}
                                        >
                                            <EditableInput
                                                value={statusLabelByLevel[presentation.status.level]}
                                                onChange={(v) => handleNestedChange(['status', 'text'], v)}
                                                className="!p-0 text-center"
                                            />
                                        </div>
                                        {isStatusDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)}></div>
                                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-50 animate-fade-in-down">
                                                    {statusOptions.map(option => (
                                                        <button
                                                            key={option.level}
                                                            onClick={() => {
                                                                handleUpdate('status', option);
                                                                setIsStatusDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 first:rounded-t-md last:rounded-b-md"
                                                        >
                                                            <span className={`inline-block w-3 h-3 rounded-full mr-3 ${statusColorClasses[option.level]}`}></span>
                                                            {option.text}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <h3 className="text-base font-bold text-slate-800">Динамика готовности объекта</h3>
                                    {sheetStatus === 'error' && (
                                        <span className="text-xs text-red-500">Не удалось обновить данные из таблицы</span>
                                    )}
                                </div>
                                <div className="text-sm text-slate-600 flex items-center gap-2">
                                    <span>Период:</span>
                                    <select
                                        className="border border-slate-300 rounded-md p-1 text-red-600 font-semibold bg-white"
                                        value={normalizeDateKey(presentation.monitoringPeriod.start)}
                                        onChange={(e) => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('period_start', e.target.value);
                                            if (!params.get('period_end')) params.set('period_end', normalizeDateKey(presentation.monitoringPeriod.end));
                                            const url = `${window.location.pathname}?${params.toString()}`;
                                            window.history.replaceState(null, '', url);
                                            handleNestedChange(['monitoringPeriod', 'start'], formatDateRU(e.target.value));
                                            if (onRefreshData) onRefreshData();
                                        }}
                                    >
                                        {(sheetData?.availableDates || []).map(d => {
                                            const val = normalizeDateKey(d);
                                            return <option key={`start-${val}`} value={val}>{formatDateRU(val)}</option>;
                                        })}
                                    </select>
                                    <span>—</span>
                                    <select
                                        className="border border-slate-300 rounded-md p-1 text-green-600 font-semibold bg-white"
                                        value={normalizeDateKey(presentation.monitoringPeriod.end)}
                                        onChange={(e) => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('period_end', e.target.value);
                                            if (!params.get('period_start')) params.set('period_start', normalizeDateKey(presentation.monitoringPeriod.start));
                                            const url = `${window.location.pathname}?${params.toString()}`;
                                            window.history.replaceState(null, '', url);
                                            handleNestedChange(['monitoringPeriod', 'end'], formatDateRU(e.target.value));
                                            if (onRefreshData) onRefreshData();
                                        }}
                                    >
                                        {(sheetData?.availableDates || []).map(d => {
                                            const val = normalizeDateKey(d);
                                            return <option key={`end-${val}`} value={val}>{formatDateRU(val)}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar">
                                <div className="space-y-3 pr-2">
                                    {presentation.progress.map(p => {
                                        const change = p.current - p.previous;
                                        return (
                                            <div
                                                key={p.id}
                                                className="bg-slate-50/50 rounded-lg border border-slate-200/80 p-3 transition-all duration-300 cursor-pointer"
                                                onClick={() => handleProgressCategoryUpdate(p.id, 'isOpen', !p.isOpen)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-sm text-slate-700">{p.name}</h4>
                                                        <div className={`px-2 py-0.5 text-xs font-bold rounded-full ${change > 0 ? 'bg-green-100 text-green-800' : change === 0 ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-800'}`}>
                                                            {change >= 0 ? `+${change}%` : `${change}%`}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!p.isOpen && (
                                                    <div className="mt-2 flex items-center gap-3">
                                                        <div className="w-full bg-slate-200/70 rounded-full h-3.5 shadow-inner">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500 ease-out"
                                                                style={{
                                                                    width: `${p.current}%`,
                                                                    backgroundImage: (p.current - p.previous) > 0
                                                                        ? 'linear-gradient(to right, #dcfce7, #22c55e)'
                                                                        : 'linear-gradient(to right, #e5e7eb, #cbd5e1)'
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="w-12 text-right text-slate-800 font-bold">{p.current}%</div>
                                                    </div>
                                                )}
                                                {p.isOpen && (
                                                    <div className="pl-1 pr-1 pb-1 mt-2" onClick={(e) => e.stopPropagation()}>
                                                        <ProgressDynamicsBar
                                                            previous={p.previous}
                                                            current={p.current}
                                                            onPreviousChange={(v) => handleProgressCategoryUpdate(p.id, 'previous', v)}
                                                            onCurrentChange={(v) => handleProgressCategoryUpdate(p.id, 'current', v)}
                                                        />
                                                        {p.subItems && p.subItems.length > 0 && (
                                                            <div className="pl-5 pr-1 pb-2 border-l-2 border-slate-200 ml-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                                                                {p.subItems.map(sub => (
                                                                    <div key={sub.id}>
                                                                        <h5 className="text-xs font-semibold text-slate-600 mb-1">{sub.name}</h5>
                                                                        <ProgressDynamicsBar
                                                                            isSubItem={true}
                                                                            previous={sub.previous}
                                                                            current={sub.current}
                                                                            onPreviousChange={(v) => handleSubItemUpdate(p.id, sub.id, 'previous', v)}
                                                                            onCurrentChange={(v) => handleSubItemUpdate(p.id, sub.id, 'current', v)}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Bottom Row --- */}
                <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6 mt-4">
                    <div>
                        <MobilizationChart data={sheetData?.months?.slice(-5)} status={sheetStatus} />
                    </div>
                    <div>
                        <DynamicsChart data={sheetData?.months?.slice(-5)} status={sheetStatus} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PresentationScreen;
