import React, { useState } from 'react';
import { Sparkles, Train, MapPin, Coffee, Utensils, ExternalLink, Clock } from 'lucide-react';
import type { MidpointResult, Participant, PlaceItem } from '../types';
import { formatDistance } from '../utils/midpoint';

interface MidpointSummaryProps {
  midpointResult: MidpointResult | null;
  participants: Participant[];
  selectedPlace?: PlaceItem | null;
  onSelectPlace?: (place: PlaceItem) => void;
}

type TabType = 'subway' | 'landmark' | 'cafe' | 'restaurant';

export const MidpointSummary: React.FC<MidpointSummaryProps> = ({
  midpointResult,
  participants,
  selectedPlace,
  onSelectPlace,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('subway');

  if (!midpointResult || participants.length < 2) {
    return (
      <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          💡 친구들이 더 모이면 중간지점이 계산됩니다
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          최소 2명 이상의 친구가 출발 위치를 등록하면 자동으로 가장 공평한 중간 지점을 찾아드려요!
        </p>
      </div>
    );
  }

  const getPlacesForTab = (): PlaceItem[] => {
    switch (activeTab) {
      case 'subway':
        return midpointResult.subways || [];
      case 'landmark':
        return midpointResult.landmarks || [];
      case 'cafe':
        return midpointResult.cafes || [];
      case 'restaurant':
        return midpointResult.restaurants || [];
    }
  };

  const places = getPlacesForTab();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. 중간지점 요약 헤더 카드 */}
      <div
        className="glass-panel-glow"
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(49, 46, 129, 0.5) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="badge badge-cyan" style={{ fontSize: 11 }}>
            <Sparkles size={12} />
            실시간 자동 갱신
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            참가자 {participants.length}명 기준
          </span>
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 12 }}>
          {midpointResult.center_name}
        </h3>

        {/* 참가자별 거리 & 예상 이동 시간 태그 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {participants.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{p.name}:</span>
              <span>{p.distance_meters ? formatDistance(p.distance_meters) : '-'}</span>
              {p.duration_minutes ? (
                <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Clock size={11} /> 약 {p.duration_minutes}분
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* 2. 추천 장소 카테고리 탭 (모바일 4분할 균등 그리드, 줄바꿈 완전 방지) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          padding: '4px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <button
          onClick={() => setActiveTab('subway')}
          className={`btn btn-sm ${activeTab === 'subway' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '100%', padding: '8px 2px', fontSize: 12, gap: 4, whiteSpace: 'nowrap' }}
        >
          <Train size={13} style={{ flexShrink: 0 }} /> 지하철역
        </button>
        <button
          onClick={() => setActiveTab('landmark')}
          className={`btn btn-sm ${activeTab === 'landmark' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '100%', padding: '8px 2px', fontSize: 12, gap: 4, whiteSpace: 'nowrap' }}
        >
          <MapPin size={13} style={{ flexShrink: 0 }} /> 랜드마크
        </button>
        <button
          onClick={() => setActiveTab('cafe')}
          className={`btn btn-sm ${activeTab === 'cafe' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '100%', padding: '8px 2px', fontSize: 12, gap: 4, whiteSpace: 'nowrap' }}
        >
          <Coffee size={13} style={{ flexShrink: 0 }} /> 카페
        </button>
        <button
          onClick={() => setActiveTab('restaurant')}
          className={`btn btn-sm ${activeTab === 'restaurant' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '100%', padding: '8px 2px', fontSize: 12, gap: 4, whiteSpace: 'nowrap' }}
        >
          <Utensils size={13} style={{ flexShrink: 0 }} /> 맛집
        </button>
      </div>

      {/* 3. 추천 스팟 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
        {places.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            주변에 등록된 장소가 없습니다.
          </div>
        ) : (
          places.map((place) => {
            const isSelected = selectedPlace?.id === place.id;
            const kakaoNaviUrl = `https://map.kakao.com/link/to/${encodeURIComponent(place.place_name)},${place.y},${place.x}`;

            return (
              <div
                key={place.id}
                onClick={() => onSelectPlace && onSelectPlace(place)}
                className="glass-panel"
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--accent-rose)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(244, 63, 94, 0.1)' : 'var(--bg-card)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {place.place_name}
                    </span>
                    {place.distance ? (
                      <span style={{ fontSize: 11, color: 'var(--accent-cyan)', flexShrink: 0 }}>
                        {formatDistance(Number(place.distance))}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {place.road_address_name || place.address_name}
                  </div>
                </div>

                <a
                  href={kakaoNaviUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, fontSize: 12, padding: '6px 10px', gap: 4 }}
                  title="카카오맵 길찾기로 이동"
                >
                  길찾기
                  <ExternalLink size={12} />
                </a>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
