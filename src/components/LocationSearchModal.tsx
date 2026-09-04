import React, { useState, useEffect } from 'react';
import { Search, MapPin, Navigation, X, Check } from 'lucide-react';
import { searchKakaoKeyword } from '../utils/midpoint';
import type { PlaceItem } from '../types';

interface LocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (loc: { lat: number; lng: number; addressName: string }) => void;
}

export const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const items = await searchKakaoKeyword(query);
      setResults(items);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // GPS로 현재 내 위치 가져오기
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('현재 브라우저에서 GPS 위치 정보를 지원하지 않습니다.');
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // 카카오 Geocoder로 주소명 변환 시도
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(lng, lat, (addrResults: any, status: any) => {
            setIsGpsLoading(false);
            let addressName = '내 현재 위치';
            if (status === window.kakao.maps.services.Status.OK && addrResults[0]) {
              addressName = addrResults[0].road_address
                ? addrResults[0].road_address.address_name
                : addrResults[0].address.address_name;
            }
            onSelectLocation({ lat, lng, addressName });
            onClose();
          });
        } else {
          setIsGpsLoading(false);
          onSelectLocation({ lat, lng, addressName: '내 현재 위치' });
          onClose();
        }
      },
      (err) => {
        setIsGpsLoading(false);
        console.warn('Geolocation error:', err);
        alert('위치 권한을 허용해 주시거나 주소 검색을 이용해 주세요.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectPlace = (place: PlaceItem) => {
    onSelectLocation({
      lat: Number(place.y),
      lng: Number(place.x),
      addressName: place.place_name || place.address_name,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={20} color="var(--primary)" />
              출발 위치 찾기
            </h3>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="역 이름, 도로명 주소, 건물명 검색 (예: 판교역, 신사동)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 42 }}
              autoFocus
            />
          </div>

          <button
            onClick={handleUseCurrentLocation}
            disabled={isGpsLoading}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 12, justifyContent: 'center', fontSize: 14 }}
          >
            <Navigation size={16} color="var(--accent-cyan)" />
            {isGpsLoading ? '현재 GPS 위치 확인 중...' : '현재 내 위치로 설정하기'}
          </button>
        </div>

        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '12px 16px' }}>
          {isLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              장소 검색 중...
            </div>
          ) : results.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map((place) => (
                <div
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className="glass-panel"
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#ffffff', marginBottom: 3 }}>
                      {place.place_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {place.road_address_name || place.address_name}
                    </div>
                  </div>
                  <Check size={16} color="var(--primary)" style={{ opacity: 0.6, marginTop: 4 }} />
                </div>
              ))}
            </div>
          ) : query ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              검색 결과가 없습니다. 다른 단어로 검색해 보세요.
            </div>
          ) : (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              출발하는 장소나 역 이름을 검색해 주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
