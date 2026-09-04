import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import type { Participant, MidpointResult, PlaceItem, MidpointMode } from '../types';

interface ModeMotionStyle {
  strokeColor: (isHost: boolean) => string;
  strokeWeight: number;
  strokeOpacity: number;
  strokeStyle: 'solid' | 'shortdash' | 'shortdot' | 'longdash' | 'dash';
  duration: number; // ms
  easing: (t: number) => number;
  badgeIcon: string;
  badgeTitle: string;
  badgeGradient: string;
  pinGlowColor: string;
}

const MODE_MOTION_CONFIGS: Record<MidpointMode, ModeMotionStyle> = {
  // 🚇 대중교통: 지하철 노선 블루, 정교한 실선, 부드러운 감속 수렴 (1100ms)
  transit: {
    strokeColor: (isHost) => (isHost ? '#f59e0b' : '#0284c7'),
    strokeWeight: 4,
    strokeOpacity: 0.88,
    strokeStyle: 'solid',
    duration: 1100,
    easing: (t) => 1 - Math.pow(1 - t, 3), // cubic ease-out
    badgeIcon: '🚇',
    badgeTitle: '대중교통 중간',
    badgeGradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
    pinGlowColor: 'rgba(2, 132, 199, 0.45)',
  },
  // 📍 거리/지도 중앙: 기하학적 바이올렛/네온 숏대시 점선, 샤프한 레이더 스캔 (850ms)
  centroid: {
    strokeColor: (isHost) => (isHost ? '#f59e0b' : '#8b5cf6'),
    strokeWeight: 3.5,
    strokeOpacity: 0.92,
    strokeStyle: 'shortdash',
    duration: 850,
    easing: (t) => Math.sin((t * Math.PI) / 2), // sine ease-out
    badgeIcon: '📍',
    badgeTitle: '거리(좌표) 중심',
    badgeGradient: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)',
    pinGlowColor: 'rgba(124, 58, 237, 0.45)',
  },
  // 🚶 걸어서 중간: 산책로/보행 친화 에메랄드 그린, 촘촘한 도보 점선, 발걸음 리듬감 (1500ms)
  walking: {
    strokeColor: (isHost) => (isHost ? '#f59e0b' : '#10b981'),
    strokeWeight: 4,
    strokeOpacity: 0.92,
    strokeStyle: 'shortdot',
    duration: 1500,
    easing: (t) => {
      const steps = 8;
      const stepped = Math.floor(t * steps) / steps;
      const smooth = 1 - Math.pow(1 - t, 2);
      return stepped * 0.35 + smooth * 0.65;
    },
    badgeIcon: '🚶',
    badgeTitle: '도보 중간',
    badgeGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    pinGlowColor: 'rgba(16, 185, 129, 0.45)',
  },
  // 🚗 자동차 운전: 고속 주행 오렌지/앰버, 굵고 시원한 도로 주행선 5.5px, 다이내믹 고속 가속 (700ms)
  driving: {
    strokeColor: (isHost) => (isHost ? '#fbbf24' : '#f97316'),
    strokeWeight: 5.5,
    strokeOpacity: 0.95,
    strokeStyle: 'solid',
    duration: 700,
    easing: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), // quad ease-in-out
    badgeIcon: '🚗',
    badgeTitle: '운전 중간',
    badgeGradient: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
    pinGlowColor: 'rgba(234, 88, 12, 0.45)',
  },
};

interface KakaoMapProps {
  participants: Participant[];
  midpointResult: MidpointResult | null;
  mode?: MidpointMode;
  selectedPlace?: PlaceItem | null;
  onSelectPlace?: (place: PlaceItem) => void;
}

export const KakaoMap: React.FC<KakaoMapProps> = ({
  participants,
  midpointResult,
  mode = 'transit',
  selectedPlace,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // 사용자의 지도 확대/축소 및 위치를 영구 보존하기 위한 추적 ref
  const lastRenderKeyRef = useRef<string>('');
  const hasInitialFittedRef = useRef<boolean>(false);
  const prevParticipantCountRef = useRef<number>(0);
  const prevModeRef = useRef<MidpointMode>(mode);
  const prevSelectedPlaceIdRef = useRef<string | null>(null);
  const userInteractedRef = useRef<boolean>(false);

  // 지도 인스턴스 초기화
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let timer: any = null;
    let timeoutTimer: any = null;

    const initMap = () => {
      if (!window.kakao || !window.kakao.maps) {
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

        // 사용자가 직접 지도를 드래그하거나 휠 줌을 조작하면 플래그 활성화
        window.kakao.maps.event.addListener(map, 'dragstart', () => {
          userInteractedRef.current = true;
        });
        window.kakao.maps.event.addListener(map, 'zoom_start', () => {
          userInteractedRef.current = true;
        });

        mapInstanceRef.current = map;
        setLoadStatus('ready');
        renderMapMarkers();

        // 컨테이너 크기 변경 감지 (화면 회전, 탭 전환 등)
        const resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.relayout();
          }
        });
        if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current);
        }

        (window as any)._kakaoMapResizeObserver = resizeObserver;
      });
    };

    if (window.kakao && window.kakao.maps) {
      initMap();
    } else {
      timer = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(timer);
          clearTimeout(timeoutTimer);
          initMap();
        }
      }, 200);

      // 3.5초 내에 SDK가 응답하지 않으면 (도메인 미등록 401 오류 등)
      timeoutTimer = setTimeout(() => {
        if (!window.kakao || !window.kakao.maps) {
          setLoadStatus('error');
        }
      }, 3500);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if ((window as any)._kakaoMapResizeObserver) {
        (window as any)._kakaoMapResizeObserver.disconnect();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 마커 및 오버레이 & 선 모션 렌더링
  const renderMapMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !window.kakao.maps) return;

    // 0. 렌더링 데이터 변경 여부 검사 (불필요한 마커 재생성 및 3초 폴링 주기 리로드 원천 차단)
    const currentRenderKey = JSON.stringify({
      p: participants.map((p) => [p.id, p.lat, p.lng, p.name, p.distance_meters, p.duration_minutes, p.is_host]),
      m: midpointResult ? [midpointResult.center_lat, midpointResult.center_lng, midpointResult.center_name] : null,
      mode,
      sp: selectedPlace ? selectedPlace.id : null,
    });

    if (currentRenderKey === lastRenderKeyRef.current) {
      return;
    }
    lastRenderKeyRef.current = currentRenderKey;

    // 1. 기존 오버레이 및 폴리라인 정리
    overlaysRef.current.forEach((overlay) => {
      try {
        overlay.setMap(null);
      } catch (e) {
        // ignore
      }
    });
    overlaysRef.current = [];

    polylinesRef.current.forEach((polyline) => {
      try {
        polyline.setMap(null);
      } catch (e) {
        // ignore
      }
    });
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

      const isHost = p.is_host === 1;
      const dotSize = isHost ? 18 : 15;
      const dotRadius = dotSize / 2;

      // 기준점 (0,0) 제로 컨테이너: 원형 점의 중심을 정확히 위경도 좌표(0,0)에 배치하여
      // 줌인/줌아웃, 지도 드래그 시에도 밀리지 않고 선 모션의 시작점과 1픽셀 오차 없이 일체화
      const content = document.createElement('div');
      content.className = 'custom-marker participant-marker';
      content.style.cssText = `
        position: relative;
        width: 0;
        height: 0;
        overflow: visible;
        pointer-events: auto;
        cursor: pointer;
      `;
      content.innerHTML = `
        <div style="
          position: absolute;
          left: 0;
          bottom: ${dotRadius + 5}px;
          transform: translateX(-50%);
          white-space: nowrap;
          background: #1e293b;
          color: #f8fafc;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          border: 2px solid ${isHost ? '#f59e0b' : '#3b82f6'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 3;
        ">
          ${isHost ? '👑 ' : ''}${p.name}
          ${p.distance_meters ? `<span style="color:#94a3b8;font-size:11px;">(${Math.round(p.distance_meters / 100) / 10}km${p.duration_minutes ? `, 약 ${p.duration_minutes}분` : ''})</span>` : ''}
        </div>
        <div style="
          position: absolute;
          left: -${dotRadius}px;
          top: -${dotRadius}px;
          width: ${dotSize}px;
          height: ${dotSize}px;
          background: ${isHost ? '#f59e0b' : '#3b82f6'};
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-sizing: border-box;
          box-shadow: ${isHost ? '0 0 0 4px rgba(245, 158, 11, 0.4), 0 2px 6px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.5)'};
          ${isHost ? 'animation: pulseGlowGold 2s infinite;' : ''}
          z-index: 2;
        "></div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        xAnchor: 0,
        yAnchor: 0,
        zIndex: 20 + index,
      });

      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    // 3. 중간지점 마커 렌더링 (참여자 2명 이상 & 결과 존재 시)
    if (midpointResult && midpointResult.center_lat && midpointResult.center_lng) {
      const centerLatLng = new window.kakao.maps.LatLng(midpointResult.center_lat, midpointResult.center_lng);
      bounds.extend(centerLatLng);
      hasCoords = true;

      const motionConfig = MODE_MOTION_CONFIGS[mode] || MODE_MOTION_CONFIGS.transit;

      // 기준점 (0,0) 제로 컨테이너: 도착 동그라미 중심을 정확히 중심점 위경도(0,0)에 배치하여
      // 줌인/줌아웃 시에도 목표역에 고정되고 모든 선 모션이 동그라미 중심 속으로 완벽히 수렴
      const midContent = document.createElement('div');
      midContent.className = 'custom-marker midpoint-marker';
      midContent.style.cssText = `
        position: relative;
        width: 0;
        height: 0;
        overflow: visible;
        pointer-events: auto;
        z-index: 50;
      `;
      midContent.innerHTML = `
        <div style="
          position: absolute;
          left: 0;
          bottom: 18px;
          transform: translateX(-50%);
          white-space: nowrap;
          background: ${motionConfig.badgeGradient};
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 3;
        ">
          ${motionConfig.badgeIcon} ${motionConfig.badgeTitle} · ${midpointResult.center_name}
        </div>
        <div style="
          position: absolute;
          left: -12px;
          top: -12px;
          width: 24px;
          height: 24px;
          background: #ffffff;
          border: 3.5px solid ${motionConfig.strokeColor(false)};
          border-radius: 50%;
          box-sizing: border-box;
          box-shadow: 0 0 0 6px ${motionConfig.pinGlowColor}, 0 4px 12px rgba(0,0,0,0.5);
          animation: pulseGlow 2s infinite;
          z-index: 2;
        "></div>
      `;

      const midOverlay = new window.kakao.maps.CustomOverlay({
        position: centerLatLng,
        content: midContent,
        xAnchor: 0,
        yAnchor: 0,
        zIndex: 50,
      });

      midOverlay.setMap(map);
      overlaysRef.current.push(midOverlay);

      // 4. 참가자 위치 핀 -> 중간지점으로 모이는 드로잉 선 모션 (애니메이션)
      if (participants.length >= 2) {
        const lineObjects = participants.map((p) => {
          const startPos = new window.kakao.maps.LatLng(p.lat, p.lng);

          const polyline = new window.kakao.maps.Polyline({
            map: map,
            path: [startPos, startPos],
            strokeWeight: motionConfig.strokeWeight,
            strokeColor: motionConfig.strokeColor(p.is_host === 1),
            strokeOpacity: motionConfig.strokeOpacity,
            strokeStyle: motionConfig.strokeStyle,
            zIndex: 5,
          });

          polylinesRef.current.push(polyline);

          return {
            polyline,
            startPos,
            startLat: p.lat,
            startLng: p.lng,
            endLat: midpointResult.center_lat,
            endLng: midpointResult.center_lng,
            endPos: centerLatLng,
          };
        });

        // 모드별 고유 지속 시간 및 이징(속도 곡선) 적용
        const duration = motionConfig.duration;
        const startTime = performance.now();

        const animateLines = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const rawProgress = Math.min(elapsed / duration, 1);
          // 모드별 가속/감속/스텝핑 이징 함수 적용
          const ease = motionConfig.easing(rawProgress);

          lineObjects.forEach(({ polyline, startPos, startLat, startLng, endLat, endLng, endPos }) => {
            if (rawProgress >= 1) {
              polyline.setPath([startPos, endPos]);
            } else {
              const curLat = startLat + (endLat - startLat) * ease;
              const curLng = startLng + (endLng - startLng) * ease;
              polyline.setPath([
                startPos,
                new window.kakao.maps.LatLng(curLat, curLng),
              ]);
            }
          });

          if (rawProgress < 1) {
            animationFrameRef.current = requestAnimationFrame(animateLines);
          } else {
            animationFrameRef.current = null;
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
      placeContent.className = 'custom-marker place-marker';
      placeContent.style.cssText = `
        position: relative;
        width: 0;
        height: 0;
        overflow: visible;
        pointer-events: auto;
        cursor: pointer;
        z-index: 60;
      `;
      placeContent.innerHTML = `
        <div style="
          position: absolute;
          left: 0;
          bottom: 14px;
          transform: translateX(-50%);
          white-space: nowrap;
          background: #ec4899;
          color: white;
          padding: 5px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(236, 72, 153, 0.5);
          z-index: 3;
        ">
          📍 ${selectedPlace.place_name}
        </div>
        <div style="
          position: absolute;
          left: -8px;
          top: -8px;
          width: 16px;
          height: 16px;
          background: #ec4899;
          border: 2px solid white;
          border-radius: 50%;
          box-sizing: border-box;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.4), 0 2px 8px rgba(0,0,0,0.5);
          z-index: 2;
        "></div>
      `;

      const placeOverlay = new window.kakao.maps.CustomOverlay({
        position: placePos,
        content: placeContent,
        xAnchor: 0,
        yAnchor: 0,
        zIndex: 60,
      });

      placeOverlay.setMap(map);
      overlaysRef.current.push(placeOverlay);
    }

    // 지도 크기 재계산 (탭 전환 및 컨테이너 렌더링 동기화)
    map.relayout();

    // 지도 중심 및 줌 바운즈 자동 설정
    // 초기 1회 로딩, 참가자 수 변동, 모드 변경, 장소 선택 시에만 카메라 뷰포트 자동 이동!
    // 사용자가 지도를 직접 확대(줌인)/축소(줌아웃)/패닝한 경우에는 줌 아웃(풀백)되지 않도록 철저히 보호
    const isFirstFit = !hasInitialFittedRef.current;
    const participantCountChanged = prevParticipantCountRef.current !== participants.length;
    const modeChanged = prevModeRef.current !== mode;
    const placeChanged = selectedPlace && prevSelectedPlaceIdRef.current !== selectedPlace.id;

    const shouldFitBounds = isFirstFit || participantCountChanged || modeChanged || placeChanged;

    if (hasCoords && shouldFitBounds) {
      hasInitialFittedRef.current = true;
      prevParticipantCountRef.current = participants.length;
      prevModeRef.current = mode;
      prevSelectedPlaceIdRef.current = selectedPlace?.id || null;

      if (placeChanged && selectedPlace) {
        // 특정 추천 장소 클릭 시 해당 위치로 부드럽게 중심 이동
        const placePos = new window.kakao.maps.LatLng(Number(selectedPlace.y), Number(selectedPlace.x));
        map.panTo(placePos);
      } else if (participants.length === 1 && !midpointResult && !selectedPlace) {
        // 방장 1명만 있는 초기 상태: 적정 줌 레벨(4)로 중심 포커스
        const centerPos = new window.kakao.maps.LatLng(participants[0].lat, participants[0].lng);
        map.setCenter(centerPos);
        map.setLevel(4);
      } else {
        // 2명 이상이거나 중간지점이 있을 때: 모든 핀이 다 보이도록 영역 확장
        map.setBounds(bounds, 80, 80, 80, 80);
      }
    }
  };

  useEffect(() => {
    renderMapMarkers();
  }, [participants, midpointResult, mode, selectedPlace]);

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

      {/* 로딩 스피너 */}
      {loadStatus === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'rgba(15, 23, 42, 0.8)',
            zIndex: 10,
          }}
        >
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>카카오 지도를 불러오는 중...</span>
        </div>
      )}

      {/* 카카오 지도 도메인 미등록 친절 안내 카드 */}
      {loadStatus === 'error' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(15, 23, 42, 0.95)',
            zIndex: 10,
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 420,
              width: '100%',
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              border: '1px solid rgba(245, 158, 11, 0.4)',
              boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              카카오 지도 사이트 도메인 등록 필요
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'keep-all' }}>
              카카오 지도 보안 정책상 아래 도메인을 카카오 개발자 콘솔의 <b>[플랫폼 &gt; Web 사이트 도메인]</b>에 등록해야 지도가 정상 표시됩니다.
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'left',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontFamily: 'monospace',
                color: '#38bdf8',
              }}
            >
              <div>• https://meet-point-aql.pages.dev</div>
              <div>• http://localhost:5173</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <a
                href="https://developers.kakao.com/console/app/1567499/config/platform"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
                style={{ flex: 1, gap: 5, textDecoration: 'none' }}
              >
                <ExternalLink size={14} /> 콘솔 바로가기
              </a>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, gap: 5 }}
              >
                <RefreshCw size={14} /> 등록 후 새로고침
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
