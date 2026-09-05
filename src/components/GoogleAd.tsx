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

// 알리익스프레스 제휴 광고 (구글 애드센스 승인 대기 기간 스마트 폴백)
const ALI_AD_URL = 'https://s.click.aliexpress.com/e/_c4UhqpfJ?bz=725*90';
const ALI_IMAGE_URL = 'https://ae-pic-a1.aliexpress-media.com/kf/Sf75131fc3b09413e8f73ffab578cfd10g.png';

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

  // 1. 지도 하단 전용 컴팩트 배너 (높이 56px 엄격 제한)
  if (variant === 'compact') {
    return (
      <div
        className={`google-ad-compact ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
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
          padding: '0 8px',
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
              color: 'rgba(148, 163, 184, 0.7)',
              letterSpacing: '0.04em',
              lineHeight: 1,
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '2px 4px',
              borderRadius: '4px',
              fontWeight: 600,
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
                background: 'rgba(0, 0, 0, 0.4)',
                border: 'none',
                borderRadius: '50%',
                width: 18,
                height: 18,
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

        {/* 구글 광고 미송출(Unfilled/심사중) 시 알리익스프레스 제휴 배너 노출 */}
        {!isAdFilled && (
          <a
            href={ALI_AD_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              textDecoration: 'none',
              paddingRight: '28px',
              boxSizing: 'border-box',
            }}
            title="알리익스프레스 특가 확인하기"
          >
            <img
              src={ALI_IMAGE_URL}
              alt="알리익스프레스 특가 배너"
              style={{
                maxWidth: '100%',
                height: '42px',
                objectFit: 'contain',
                borderRadius: '6px',
                display: 'block',
              }}
            />
          </a>
        )}

        {/* 실제 구글 애드센스 ins 태그 (승인 후 송출 시 활성화) */}
        <div
          style={{
            width: '100%',
            height: '50px',
            maxHeight: '50px',
            overflow: 'hidden',
            display: isAdFilled ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{
              display: isAdFilled ? 'block' : 'none',
              width: '100%',
              height: '50px',
              maxHeight: '50px',
              overflow: 'hidden',
            }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="horizontal"
            data-full-width-responsive="false"
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
          스폰서 광고
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

      {/* 구글 광고 미송출(심사 대기/Unfilled) 시 알리익스프레스 제휴 배너 노출 */}
      {!isAdFilled && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <a
            href={ALI_AD_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textDecoration: 'none',
              borderRadius: '8px',
              overflow: 'hidden',
              background: 'rgba(30, 41, 59, 0.4)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            title="알리익스프레스 특가 상품 보러가기"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <img
              src={ALI_IMAGE_URL}
              alt="알리익스프레스 제휴 특가 배너"
              style={{
                width: '100%',
                maxWidth: '725px',
                height: 'auto',
                aspectRatio: '725 / 90',
                objectFit: 'contain',
                display: 'block',
                borderRadius: '8px',
              }}
            />
          </a>

          {/* 은은한 광고 문의 안내 링크 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '2px',
            }}
          >
            <Mail size={12} color="var(--primary)" />
            <span>광고 문의:</span>
            <a
              href="mailto:moviemanejeongdo@gmail.com"
              style={{
                color: 'var(--accent-cyan)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              moviemanejeongdo@gmail.com
            </a>
          </div>
        </div>
      )}

      {/* 실제 구글 애드센스 ins 태그 (승인 후 송출 시 활성화) */}
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
