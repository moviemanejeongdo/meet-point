import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { MidpointMode } from '../types';
import { MIDPOINT_MODES } from '../utils/midpoint';

interface MidpointModeSelectorProps {
  currentMode: MidpointMode;
  onSelectMode: (mode: MidpointMode) => void;
}

export const MidpointModeSelector: React.FC<MidpointModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeOption = MIDPOINT_MODES.find((m) => m.key === currentMode) || MIDPOINT_MODES[0];

  const handleSelect = (mode: MidpointMode) => {
    onSelectMode(mode);
    setIsOpen(false);
  };

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 콜랩스 헤더 바 (접기/펼치기 토글) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 16 }}>{activeOption.icon}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {activeOption.label}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 10,
                background: currentMode === 'transit' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: currentMode === 'transit' ? '#60a5fa' : 'var(--text-muted)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {activeOption.badge}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}>
          <span>{isOpen ? '접기' : '기준 변경'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* 콜랩스 내용 (기준 선택 목록) */}
      {isOpen && (
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            background: 'rgba(15, 23, 42, 0.85)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px', marginBottom: 2 }}>
            중간지점 계산 기준을 선택하세요
          </div>

          {MIDPOINT_MODES.map((option) => {
            const isSelected = option.key === currentMode;
            return (
              <div
                key={option.key}
                onClick={() => handleSelect(option.key)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 18, marginTop: 1 }}>{option.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#93c5fd' : 'var(--text-primary)' }}>
                        {option.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 5px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {option.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.35, wordBreak: 'keep-all' }}>
                      {option.description}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }}>
                    <Check size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
