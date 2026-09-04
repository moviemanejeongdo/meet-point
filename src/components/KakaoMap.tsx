import React, { useEffect, useRef } from 'react';
import type { Participant, MidpointResult, PlaceItem } from '../types';

interface KakaoMapProps {
  participants: Participant[];
  midpointResult: MidpointResult | null;
  selectedPlace?: PlaceItem | null;
  onSelectPlace?: (place: PlaceItem) => void;
}

export const KakaoMap: React.FC<KakaoMapProps> = ({
  participants,
  midpointResult,
  selectedPlace,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // 지도 인스턴스 초기화
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initMap = () => {
      if (!window.kakao || !window.kakao.maps) {
        console.warn('Kakao maps SDK not yet available');
        return;
      }

      window.kakao.maps.load(() => {
        if (!mapContainerRef.current) return;

        // 기본 위치 (서울 시청)
        const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.978);
        const options = {
          center: defaultCenter,
          level: 7,
        };

        const map = new window.kakao.maps.Map(mapContainerRef.current, options);

        // 줌 컨트롤러 추가
        const zoomControl = new window.kakao.maps.ZoomControl();
        map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

        mapInstanceRef.current = map;
        renderMapMarkers();
      });
    };

    if (window.kakao && window.kakao.maps) {
      initMap();
    } else {
      const timer = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(timer);
          initMap();
        }
      }, 200);
      return () => clearInterval(timer);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 마커 및 오버레이 & 선 모션 렌더링
  const renderMapMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !window.kakao.maps) return;

    // 1. 기존 오버레이 및 폴리라인 정리
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current = [];

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const bounds = new window.kakao.maps.LatLngBounds();
    let hasCoords = false;

    // 2. 참여자 출발지 마커 렌더링
    participants.forEach((p, index) => {
      const position = new window.kakao.maps.LatLng(p.lat, p.lng);
      bounds.extend(position);
      hasCoords = true;

      // 커스텀 HTML 마커 오버레이
      const content = document.createElement('div');
      content.className = 'custom-marker participant-marker';
      content.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        pointer-events: auto;
        cursor: pointer;
      `;
      content.innerHTML = `
        <div style="
          background: #1e293b;
          color: #f8fafc;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          border: 2px solid ${p.is_host ? '#f59e0b' : '#3b82f6'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          ${p.is_host ? '👑 ' : ''}${p.name}
          ${p.distance_meters ? `<span style="color:#94a3b8;font-size:11px;">(${Math.round(p.distance_meters / 100) / 10}km)</span>` : ''}
        </div>
        <div style="
          width: 14px;
          height: 14px;
          background: ${p.is_host ? '#f59e0b' : '#3b82f6'};
          border-radius: 50%;
          margin-top: 3px;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        "></div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 1,
        zIndex: 10 + index,
      });

      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    // 3. 중간지점 마커 렌더링 (참여자 2명 이상 & 결과 존재 시)
    if (midpointResult) {
      const midPosition = new window.kakao.maps.LatLng(midpointResult.center_lat, midpointResult.center_lng);
      bounds.extend(midPosition);
      hasCoords = true;

      const midContent = document.createElement('div');
      midContent.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        z-index: 50;
      `;
      midContent.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
          border: 2px solid #ffffff;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          ✨ 공평한 중간 · ${midpointResult.center_name}
        </div>
        <div style="
          width: 22px;
          height: 22px;
          background: #2563eb;
          border: 3px solid #ffffff;
          border-radius: 50%;
          margin-top: 4px;
          box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.4), 0 4px 10px rgba(0,0,0,0.5);
          animation: pulseGlow 2s infinite;
        "></div>
      `;

      const midOverlay = new window.kakao.maps.CustomOverlay({
        position: midPosition,
        content: midContent,
        yAnchor: 1,
        zIndex: 50,
      });

      midOverlay.setMap(map);
      overlaysRef.current.push(midOverlay);

      // 4. 참가자 위치 핀 -> 중간지점으로 모이는 드로잉 선 모션 (애니메이션)
      if (participants.length >= 2) {
        const lineObjects = participants.map((p) => {
          const startLat = p.lat;
          const startLng = p.lng;
          const endLat = midpointResult.center_lat;
          const endLng = midpointResult.center_lng;

          const polyline = new window.kakao.maps.Polyline({
            map: map,
            path: [new window.kakao.maps.LatLng(startLat, startLng), new window.kakao.maps.LatLng(startLat, startLng)],
            strokeWeight: 4,
            strokeColor: p.is_host ? '#f59e0b' : '#3b82f6',
            strokeOpacity: 0.85,
            strokeStyle: 'solid',
            zIndex: 5,
          });

          polylinesRef.current.push(polyline);

          return {
            polyline,
            startLat,
            startLng,
            endLat,
            endLng,
          };
        });

        // 1초(1000ms) 동안 부드럽게 뻗어나가는 드로잉 애니메이션
        const duration = 1000;
        const startTime = performance.now();

        const animateLines = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const rawProgress = Math.min(elapsed / duration, 1);
          // 큐빅 감속(ease-out) 곡선
          const ease = 1 - Math.pow(1 - rawProgress, 3);

          lineObjects.forEach(({ polyline, startLat, startLng, endLat, endLng }) => {
            const curLat = startLat + (endLat - startLat) * ease;
            const curLng = startLng + (endLng - startLng) * ease;
            polyline.setPath([
              new window.kakao.maps.LatLng(startLat, startLng),
              new window.kakao.maps.LatLng(curLat, curLng),
            ]);
          });

          if (rawProgress < 1) {
            animationFrameRef.current = requestAnimationFrame(animateLines);
          }
        };

        animationFrameRef.current = requestAnimationFrame(animateLines);
      }
    }

    // 5. 선택된 추천 장소 마커 (카페, 맛집 등)
    if (selectedPlace) {
      const placePos = new window.kakao.maps.LatLng(Number(selectedPlace.y), Number(selectedPlace.x));
      bounds.extend(placePos);

      const placeContent = document.createElement('div');
      placeContent.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        cursor: pointer;
        z-index: 60;
      `;
      placeContent.innerHTML = `
        <div style="
          background: #ec4899;
          color: white;
          padding: 5px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(236, 72, 153, 0.5);
          white-space: nowrap;
        ">
          📍 ${selectedPlace.place_name}
        </div>
        <div style="
          width: 14px;
          height: 14px;
          background: #ec4899;
          border: 2px solid white;
          border-radius: 50%;
          margin-top: 2px;
        "></div>
      `;

      const placeOverlay = new window.kakao.maps.CustomOverlay({
        position: placePos,
        content: placeContent,
        yAnchor: 1,
        zIndex: 60,
      });

      placeOverlay.setMap(map);
      overlaysRef.current.push(placeOverlay);
    }

    // 지도 중심 및 줌 바운즈 자동 설정
    if (hasCoords) {
      map.setBounds(bounds, 80, 80, 80, 80);
    }
  };

  useEffect(() => {
    renderMapMarkers();
  }, [participants, midpointResult, selectedPlace]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0f172a',
        }}
      />
    </div>
  );
};
