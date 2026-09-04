import React, { useEffect, useRef, useState } from 'react';
import { X, Mail } from 'lucide-react';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

interface GoogleAdProps {
  slot?: string;
  client?: string;
  format?: string;
  responsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
  variant?: 'compact' | 'card' | 'plain';
  allowClose?: boolean;
}

const DEFAULT_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-5259987610871467';
const DEFAULT_SLOT = import.meta.env.VITE_ADSENSE_SLOT || '9292546942';

export const GoogleAd: React.FC<GoogleAdProps> = ({
  slot = DEFAULT_SLOT,
  client = DEFAULT_CLIENT,
  format = 'auto',
  responsive = true,
  style,
  className = '',
  variant = 'card',
  allowClose = false,
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const isPushedRef = useRef(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isAdFilled, setIsAdFilled] = useState(false);

  useEffect(() => {
    if (isClosed) return;
    if (isPushedRef.current) return;

    try {
      const insElement = adRef.current;
      if (insElement && (!insElement.innerHTML || insElement.innerHTML.trim() === '')) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        isPushedRef.current = true;
      }
    } catch (err) {
      console.warn('Google AdSense push error:', err);
    }

    // 광고 로드 완료(filled) 감지 옵저버: 구글이 실제 광고를 송출했을 때만 filled 상태가 됨
    const target = adRef.current;
    if (!target) return;

    const checkStatus = () => {
      const status = target.getAttribute('data-ad-status');
      if (status === 'filled') {
        setIsAdFilled(true);
      }
    };

    checkStatus();

    const observer = new MutationObserver(() => {
      checkStatus();
    });

    observer.observe(target, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => observer.disconnect();
  }, [isClosed]);

  if (isClosed) {
    return null;
  }

  // 1. 지도 하단 전용 컴팩트 배너 (높이 60px 이하 엄격 제한)
  if (variant === 'compact') {
    return (
      <div
        className={`google-ad-compact ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          height: '56px',
          maxHeight: '56px',
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        {/* 우측 상단 라벨 & 닫기 버튼 */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 15,
          }}
        >
          <span
            style={{
              fontSize: '9px',
              color: 'rgba(148, 163, 184, 0.6)',
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}
          >
            AD
          </span>
          {allowClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsClosed(true);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#e2e8f0',
                padding: 0,
              }}
              title="광고 닫기"
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* 광고 미송출(Unfilled/심사중) 시 은은한 광고 문의 안내 */}
        {!isAdFilled && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: '11px',
              color: 'var(--text-secondary)',
              zIndex: 10,
              pointerEvents: 'auto',
              padding: '0 24px 0 10px',
            }}
          >
            <Mail size={12} color="var(--primary)" />
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>광고 문의:</span>
            <a
              href="mailto:moviemanejeongdo@gmail.com"
              style={{
                color: 'var(--accent-cyan)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              moviemanejeongdo@gmail.com
            </a>
          </div>
        )}

        {/* 실제 구글 애드센스 ins 태그 */}
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{
              display: 'inline-block',
              width: '100%',
              height: '50px',
              maxHeight: '50px',
            }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive ? 'true' : 'false'}
          />
        </div>
      </div>
    );
  }

  // 2. 일반 카드형 배너 (랜딩페이지 하단, 사이드바 목록 사이)
  return (
    <div
      className={`google-ad-card glass-panel ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* 우측 상단 광고 라벨 & 닫기 버튼 */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(148, 163, 184, 0.6)',
            letterSpacing: '0.05em',
            fontWeight: 600,
          }}
        >
          광고
        </span>

        {allowClose && (
          <button
            onClick={() => setIsClosed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            title="광고 닫기"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* 광고 미송출(심사 대기/Unfilled) 시 노출되는 '광고 문의' 배너 */}
      {!isAdFilled && (
        <div
          style={{
            width: '100%',
            padding: '12px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <Mail size={14} color="var(--primary)" />
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>광고 문의</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <a
            href="mailto:moviemanejeongdo@gmail.com"
            style={{
              color: 'var(--accent-cyan)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            moviemanejeongdo@gmail.com
          </a>
        </div>
      )}

      {/* 실제 구글 애드센스 ins 태그 */}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: isAdFilled ? 'block' : 'none',
          width: '100%',
          minHeight: '50px',
        }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};
