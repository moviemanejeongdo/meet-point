import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Users, MapPin, User, UserCheck, LogOut, Trash2, Map, List, Edit3, MessageCircle, ExternalLink } from 'lucide-react';
import type { Room, PlaceItem, Participant } from '../types';
import {
  getRoom,
  addParticipant,
  updateParticipantProfile,
  deleteParticipant,
  deleteRoom,
  getStoredParticipantId,
  setStoredParticipantId,
  removeStoredParticipantId,
} from '../api/client';
import { KakaoMap } from '../components/KakaoMap';
import { ShareBar } from '../components/ShareBar';
import { MidpointSummary } from '../components/MidpointSummary';
import { MidpointModeSelector } from '../components/MidpointModeSelector';
import {
  enrichParticipantsWithDistances,
  computeFullMidpointResult,
  resolveModeMidpoint,
  fetchRealRouteDistances,
} from '../utils/midpoint';
import { ParticipantOnboarding } from '../components/ParticipantOnboarding';
import { EditProfileModal } from '../components/EditProfileModal';
import { GoogleAd } from '../components/GoogleAd';
import type { MidpointMode } from '../types';

interface RoomPageProps {
  roomId: string;
  onNavigateHome: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({ roomId, onNavigateHome }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'map' | 'info'>('map');
  const [midpointMode, setMidpointMode] = useState<MidpointMode>('transit');
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 768);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(() => getStoredParticipantId(roomId));

  // 모바일 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const midpointModeRef = useRef<MidpointMode>(midpointMode);
  useEffect(() => {
    midpointModeRef.current = midpointMode;
  }, [midpointMode]);

  // 카카오 모빌리티 실시간 경로 API 중복 호출 방지 캐시 키
  const lastRouteFetchKeyRef = useRef<string>('');

  // 실시간 경로 거리/소요시간 비동기 백그라운드 갱신
  const updateRealRoutes = useCallback(
    async (
      participants: Participant[],
      destination: { lat: number; lng: number },
      mode: MidpointMode
    ) => {
      if (participants.length < 2) return;
      const fetchKey = `${destination.lat.toFixed(4)}_${destination.lng.toFixed(4)}_${mode}_${participants
        .map((p) => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)
        .join('|')}`;

      if (lastRouteFetchKeyRef.current === fetchKey) return;
      lastRouteFetchKeyRef.current = fetchKey;

      try {
        const routeMap = await fetchRealRouteDistances(participants, destination, mode);
        if (Object.keys(routeMap).length > 0) {
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: enrichParticipantsWithDistances(
                prev.participants,
                destination.lat,
                destination.lng,
                mode,
                routeMap
              ),
            };
          });
        }
      } catch (e) {
        console.warn('Real route background fetch error:', e);
      }
    },
    []
  );

  // 카카오맵 공식 길찾기 웹 페이지 열기
  const handleOpenKakaoNavi = (participant: Participant, customDestName?: string) => {
    const origin = participant.address_name || participant.name;
    const dest = customDestName || room?.midpoint_result?.center_name || '중간 장소';
    const url = `https://map.kakao.com/?sName=${encodeURIComponent(origin)}&eName=${encodeURIComponent(dest)}`;
    window.open(url, '_blank');
  };

  // 중간지점 계산 모드 변경 핸들러 (대중교통, 지도 중앙, 도보, 자동차)
  const handleSelectMode = async (newMode: MidpointMode) => {
    setMidpointMode(newMode);
    midpointModeRef.current = newMode;
    if (!room || room.participants.length < 2) return;

    // 1. 기존 subways 풀을 활용하여 새 모드의 최적 도착점(역 명칭 및 좌표)을 즉각 확정!
    const resolved = resolveModeMidpoint(
      room.participants,
      newMode,
      room.midpoint_result?.subways
    );

    setRoom((prev) => {
      if (!prev) return prev;
      const currentMid = prev.midpoint_result;
      return {
        ...prev,
        midpoint_result: currentMid
          ? {
              ...currentMid,
              center_lat: resolved.center_lat,
              center_lng: resolved.center_lng,
              center_name: resolved.center_name,
              subways: resolved.sortedSubways.length > 0 ? resolved.sortedSubways : currentMid.subways,
            }
          : {
              center_lat: resolved.center_lat,
              center_lng: resolved.center_lng,
              center_name: resolved.center_name,
              calculated_at: Date.now(),
              subways: resolved.sortedSubways,
              landmarks: [],
              cafes: [],
              restaurants: [],
            },
        participants: enrichParticipantsWithDistances(
          prev.participants,
          resolved.center_lat,
          resolved.center_lng,
          newMode
        ),
      };
    });

    // 실시간 경로 비동기 조회
    updateRealRoutes(
      room.participants,
      { lat: resolved.center_lat, lng: resolved.center_lng },
      newMode
    );

    // 2. 비동기로 4대 추천 장소(지하철역, 랜드마크, 카페, 음식점) 검색 및 장소 보강
    try {
      const modeResult = await computeFullMidpointResult(room.participants, undefined, newMode);
      if (modeResult) {
        setRoom((prev) => {
          if (!prev) return prev;
          if (midpointModeRef.current !== newMode) return prev;
          const reResolved = resolveModeMidpoint(
            prev.participants,
            newMode,
            modeResult.subways
          );
          return {
            ...prev,
            midpoint_result: {
              ...modeResult,
              center_lat: reResolved.center_lat,
              center_lng: reResolved.center_lng,
              center_name: reResolved.center_name,
              subways: reResolved.sortedSubways,
            },
            participants: enrichParticipantsWithDistances(
              prev.participants,
              reResolved.center_lat,
              reResolved.center_lng,
              newMode
            ),
          };
        });

        updateRealRoutes(
          room.participants,
          { lat: modeResult.center_lat, lng: modeResult.center_lng },
          newMode
        );
      }
    } catch (e) {
      console.error('중간지점 모드 재계산 오류:', e);
    }
  };

  // 방 정보 조회 및 주기적 폴링
  const fetchRoomData = useCallback(async () => {
    try {
      const data = await getRoom(roomId);
      if (!data) {
        alert('모임 방을 찾을 수 없거나 종료되었습니다.');
        onNavigateHome();
        return;
      }

      // 내보내진 참가자 감지 (내 ID가 등록되어 있었으나 참여자 목록에서 사라진 경우)
      if (myParticipantId) {
        const stillInRoom = data.participants.some((p) => p.id === myParticipantId);
        if (!stillInRoom) {
          removeStoredParticipantId(roomId);
          onNavigateHome();
          return;
        }
      }

      let processedData = data;
      const currentMode = midpointModeRef.current;

      if (data.participants && data.participants.length >= 2) {
        const resolved = resolveModeMidpoint(
          data.participants,
          currentMode,
          data.midpoint_result?.subways
        );

        processedData = {
          ...data,
          midpoint_result: data.midpoint_result
            ? {
                ...data.midpoint_result,
                center_lat: resolved.center_lat,
                center_lng: resolved.center_lng,
                center_name: resolved.center_name,
                subways: resolved.sortedSubways.length > 0 ? resolved.sortedSubways : data.midpoint_result.subways,
              }
            : null,
          participants: enrichParticipantsWithDistances(
            data.participants,
            resolved.center_lat,
            resolved.center_lng,
            currentMode
          ),
        };

        if (processedData.midpoint_result) {
          updateRealRoutes(
            processedData.participants,
            {
              lat: processedData.midpoint_result.center_lat,
              lng: processedData.midpoint_result.center_lng,
            },
            currentMode
          );
        }
      }

      setRoom((prev) => {
        if (!prev) return processedData;
        // 데이터 동일성 비교: 참가자 수, ID, 이름, 좌표 및 거리/시간, 중간지점 중심 좌표가 같으면 이전 객체 참조 유지
        const isSameParticipants =
          prev.participants.length === processedData.participants.length &&
          prev.participants.every((p, idx) => {
            const np = processedData.participants[idx];
            return (
              p.id === np.id &&
              p.lat === np.lat &&
              p.lng === np.lng &&
              p.name === np.name &&
              p.is_host === np.is_host &&
              p.distance_meters === np.distance_meters &&
              p.duration_minutes === np.duration_minutes
            );
          });

        const isSameMidpoint =
          prev.midpoint_result?.center_lat === processedData.midpoint_result?.center_lat &&
          prev.midpoint_result?.center_lng === processedData.midpoint_result?.center_lng &&
          prev.midpoint_result?.center_name === processedData.midpoint_result?.center_name &&
          (prev.midpoint_result?.subways?.length || 0) === (processedData.midpoint_result?.subways?.length || 0);

        if (isSameParticipants && isSameMidpoint) {
          return prev; // 이전 상태 참조 반환 -> 지도 및 UI 리렌더링 차단
        }
        return processedData;
      });
    } catch (err: any) {
      if (err?.message?.includes('만료') || err?.message?.includes('종료')) {
        alert(err.message);
        onNavigateHome();
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId, myParticipantId, onNavigateHome, updateRealRoutes]);

  useEffect(() => {
    fetchRoomData();
    const interval = setInterval(fetchRoomData, 3000);
    return () => clearInterval(interval);
  }, [fetchRoomData]);

  // 온보딩 제출 핸들러
  const handleOnboardingSubmit = async (
    name: string,
    location: { lat: number; lng: number; addressName: string }
  ) => {
    try {
      const res = await addParticipant(roomId, name, location.lat, location.lng, location.addressName);
      setStoredParticipantId(roomId, res.participant_id);
      setMyParticipantId(res.participant_id);
      setRoom(res.room);
    } catch (err: any) {
      alert(err.message || '참가자 등록에 실패했습니다.');
    }
  };

  // 온보딩 목록에서 본인 프로필 바로 선택(퀵 로그인) 핸들러
  const handleSelectParticipant = (pid: string) => {
    setStoredParticipantId(roomId, pid);
    setMyParticipantId(pid);
  };

  // 내 정보(이름 + 출발지) 수정 핸들러
  const handleUpdateProfile = async (
    name: string,
    location: { lat: number; lng: number; addressName: string }
  ) => {
    if (!myParticipantId) return;
    try {
      const updated = await updateParticipantProfile(
        roomId,
        myParticipantId,
        name,
        location.lat,
        location.lng,
        location.addressName
      );
      setRoom(updated);
    } catch (err: any) {
      alert(err.message || '정보 수정에 실패했습니다.');
    }
  };

  // 방장의 참가자 내보내기 핸들러
  const handleKickParticipant = async (targetParticipantId: string, targetName: string) => {
    if (!confirm(`'${targetName}' 참가자를 모임에서 제외하시겠습니까?`)) {
      return;
    }
    try {
      const success = await deleteParticipant(roomId, targetParticipantId);
      if (success) {
        await fetchRoomData();
      } else {
        alert('참가자 제외에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '참가자 제외 중 오류가 발생했습니다.');
    }
  };

  // 내 참가자 프로필 해제(초기화) 후 온보딩(새로 등록/다른 참가자 선택)으로 복귀 핸들러
  const handleSwitchProfile = () => {
    if (confirm('현재 연결된 프로필을 해제하고 다른 참가자로 변경하거나 새로 등록하시겠습니까?')) {
      removeStoredParticipantId(roomId);
      setMyParticipantId(null);
      setIsEditProfileModalOpen(false);
    }
  };

  // 모임 나가기 / 방장의 모임 삭제 핸들러
  const handleLeaveRoom = async () => {
    const currentParticipant = room?.participants.find((p) => p.id === myParticipantId);
    const isHost = currentParticipant?.is_host === 1;

    if (isHost) {
      if (confirm('방장이 모임에서 나가면 모임 방 전체가 삭제됩니다. 정말 모임을 종료하시겠습니까?')) {
        try {
          await deleteRoom(roomId);
          onNavigateHome();
        } catch (err: any) {
          alert(err.message || '모임 삭제에 실패했습니다.');
        }
      }
    } else {
      if (confirm('정말 이 모임에서 나가시겠습니까?')) {
        try {
          if (myParticipantId) {
            await deleteParticipant(roomId, myParticipantId);
          }
          onNavigateHome();
        } catch (err: any) {
          alert(err.message || '모임 나가기에 실패했습니다.');
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>얼중간 모임 불러오는 중...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 18, color: '#f8fafc' }}>모임 방을 찾을 수 없습니다.</div>
        <button onClick={onNavigateHome} className="btn btn-primary">홈으로 가기</button>
      </div>
    );
  }

  // 아직 참가자로 등록하지 않은 신규 방문자라면 온보딩 뷰 노출
  const isUserJoined = myParticipantId && room.participants.some((p) => p.id === myParticipantId);
  if (!isUserJoined) {
    return (
      <ParticipantOnboarding
        room={room}
        onSubmit={handleOnboardingSubmit}
        onSelectParticipant={handleSelectParticipant}
      />
    );
  }

  const myParticipant = room.participants.find((p) => p.id === myParticipantId);
  const isHost = myParticipant?.is_host === 1;

  // 사이드바 / 정보 패널 내용 (데스크톱 및 모바일 정보 탭 공유)
  const renderInfoPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. 공유 바 */}
      <ShareBar room={room} />

      {/* 2. 중간지점 계산 모드 선택기 (콜랩스 아코디언) */}
      {room.participants.length >= 2 && (
        <MidpointModeSelector
          currentMode={midpointMode}
          onSelectMode={handleSelectMode}
        />
      )}

      {/* 3. 중간지점 요약 및 4대 추천 탭 */}
      <MidpointSummary
        midpointResult={room.midpoint_result || null}
        participants={room.participants}
        selectedPlace={selectedPlace}
        onSelectPlace={(place) => {
          setSelectedPlace(place);
          if (isMobile) {
            setMobileTab('map'); // 모바일에서 장소 클릭 시 지도로 자동 이동
          }
        }}
      />

      {/* 모임정보 추천장소와 참여자 목록 사이 구글 애드센스 광고 */}
      <GoogleAd variant="card" slot={import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR} />

      {/* 3. 참여자 관리 상세 목록 */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={15} color="var(--primary)" />
            참여자 목록 ({room.participants.length}명)
          </span>
          {isHost && (
            <span style={{ fontSize: 11, color: '#38bdf8' }}>
              방장 권한 활성화
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {room.participants.map((p) => {
            const isMe = p.id === myParticipantId;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: isMe ? 'rgba(37, 99, 235, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                  borderRadius: 'var(--radius-sm)',
                  border: isMe ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    {p.is_host ? <span title="방장" style={{ fontSize: 12 }}>👑</span> : null}
                    {isMe ? <span style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 600 }}>(나)</span> : null}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {p.address_name}
                  </div>
                </div>

                {/* 우측 거리, 소요시간 및 액션 버튼 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {p.distance_meters ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 2 }}>
                      <span style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 700 }}>
                        {Math.round(p.distance_meters / 100) / 10}km
                      </span>
                      {p.duration_minutes ? (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          약 {p.duration_minutes}분
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* 카카오맵 공식 길찾기 바로가기 버튼 */}
                  <button
                    onClick={() => handleOpenKakaoNavi(p)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: '5px 8px',
                      fontSize: 11,
                      gap: 3,
                      background: 'rgba(250, 204, 21, 0.12)',
                      borderColor: 'rgba(250, 204, 21, 0.35)',
                      color: '#fde047',
                    }}
                    title={`${p.name}의 카카오맵 길찾기 열기`}
                  >
                    <ExternalLink size={12} /> 길찾기
                  </button>

                  {/* 본인인 경우: 수정 및 나가기 버튼 */}
                  {isMe ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => setIsEditProfileModalOpen(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px', fontSize: 11, gap: 3 }}
                        title="내 이름/위치 수정"
                      >
                        <Edit3 size={12} /> 수정
                      </button>
                      <button
                        onClick={handleLeaveRoom}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '5px 8px',
                          fontSize: 11,
                          color: '#f87171',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          gap: 3,
                        }}
                        title={isHost ? '모임 삭제' : '모임 나가기'}
                      >
                        {isHost ? <Trash2 size={12} /> : <LogOut size={12} />}
                        {isHost ? '삭제' : '나가기'}
                      </button>
                    </div>
                  ) : null}

                  {/* 방장인 경우: 다른 일반 참가자 내보내기 버튼 */}
                  {isHost && !isMe ? (
                    <button
                      onClick={() => handleKickParticipant(p.id, p.name)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '5px 8px',
                        fontSize: 11,
                        color: '#f87171',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        gap: 3,
                      }}
                      title="참가자 내보내기"
                    >
                      <LogOut size={12} /> 내보내기
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 1. 상단 네비게이션 헤더 */}
      <header
        style={{
          padding: '10px 14px',
          background: 'rgba(10, 14, 23, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={onNavigateHome}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', gap: 4, flexShrink: 0 }}
            title="홈으로 가기"
          >
            <ChevronLeft size={16} /> 홈
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <img src="/app-icon.svg" alt="얼중간" style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {room.title}
            </div>
            <span className="badge badge-primary" style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }}>
              <Users size={11} /> {room.participants.length}명
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleSwitchProfile}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 12, gap: 4, flexShrink: 0, padding: '6px 9px', color: '#94a3b8' }}
            title="현재 연결된 프로필을 해제하고 다른 참가자로 변경하거나 새로 등록"
          >
            <UserCheck size={13} />
            프로필 변경
          </button>

          <button
            onClick={() => setIsEditProfileModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 12, gap: 4, flexShrink: 0, padding: '6px 10px' }}
          >
            <User size={13} color="var(--primary)" />
            내 정보
          </button>
        </div>
      </header>

      {/* 2. 모바일 전용 탭 바 (스마트폰 화면에서만 노출) */}
      <div className="mobile-tab-bar">
        <button
          onClick={() => setMobileTab('map')}
          className={`mobile-tab-btn ${mobileTab === 'map' ? 'active' : ''}`}
        >
          <Map size={14} /> 지도 보기
        </button>
        <button
          onClick={() => setMobileTab('info')}
          className={`mobile-tab-btn ${mobileTab === 'info' ? 'active' : ''}`}
        >
          <List size={14} /> 모임 정보 & 추천장소
        </button>
      </div>

      {/* 3. 메인 인터랙티브 영역 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 0,
          height: 'calc(100vh - 53px)',
        }}
      >
        {/* 데스크톱 사이드바 또는 모바일 정보 탭 */}
        {(!isMobile || mobileTab === 'info') && (
          <aside
            style={{
              width: isMobile ? '100%' : 'clamp(340px, 32vw, 420px)',
              height: '100%',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              borderRight: isMobile ? 'none' : '1px solid var(--border-color)',
              overflowY: 'auto',
              padding: isMobile ? '14px 12px 24px 12px' : '16px',
              zIndex: 10,
            }}
          >
            {renderInfoPanel()}
          </aside>
        )}

        {/* 지도 영역 (데스크톱에서는 상시 표시, 모바일에서는 map 탭일 때 표시) */}
        {(!isMobile || mobileTab === 'map') && (
          <main style={{ flex: 1, position: 'relative', height: '100%', width: '100%', minHeight: 0 }}>
            {/* 모바일 지도 화면 상단 플로팅 기준 변경 선택기 */}
            {isMobile && room.participants.length >= 2 && (
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  right: 10,
                  zIndex: 30,
                }}
              >
                <MidpointModeSelector
                  currentMode={midpointMode}
                  onSelectMode={handleSelectMode}
                />
              </div>
            )}

            <KakaoMap
              participants={room.participants}
              midpointResult={room.midpoint_result || null}
              mode={midpointMode}
              selectedPlace={selectedPlace}
              onSelectPlace={(place) => setSelectedPlace(place)}
            />

            {/* 2. 지도 하단 컴팩트 구글 애드센스 광고 (사용자 방해 최소화 슬림 플로팅) */}
            <div
              style={{
                position: 'absolute',
                bottom: isMobile ? (room.midpoint_result ? '86px' : '150px') : '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: isMobile ? 'calc(100% - 24px)' : 'min(440px, 90%)',
                maxWidth: 440,
                height: 56,
                maxHeight: 56,
                overflow: 'hidden',
                zIndex: 25,
                pointerEvents: 'auto',
              }}
            >
              <GoogleAd variant="compact" allowClose={true} slot={import.meta.env.VITE_ADSENSE_SLOT_MAP} />
            </div>

            {/* 모바일 지도 하단 플로팅 미니 요약 카드 */}
            {isMobile && room.midpoint_result && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 12,
                  right: 12,
                  padding: '12px 14px',
                  background: 'rgba(15, 23, 42, 0.92)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 20,
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} /> 최적 중간 장소
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {room.midpoint_result.center_name}
                  </div>
                </div>

                <button
                  onClick={() => setMobileTab('info')}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0, padding: '7px 12px', fontSize: 12 }}
                >
                  상세 보기
                </button>
              </div>
            )}

            {/* 모바일 지도 하단 1인 상태 대기 플로팅 카드 */}
            {isMobile && !room.midpoint_result && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 12,
                  right: 12,
                  padding: '14px 16px',
                  background: 'rgba(15, 23, 42, 0.94)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👑</span> 방장 출발 위치 등록 완료
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>현재 1명 참여 중</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, wordBreak: 'keep-all' }}>
                  친구가 1명 이상 링크로 참여하면 실시간으로 가장 공평한 중간 장소와 주변 추천 핫플이 자동 계산됩니다!
                </div>
                <button
                  onClick={() => setMobileTab('info')}
                  className="btn btn-kakao btn-sm"
                  style={{ width: '100%', padding: '9px 0', fontSize: 13, gap: 5 }}
                >
                  <MessageCircle size={15} /> 친구 초대하기 (카톡 공유)
                </button>
              </div>
            )}
          </main>
        )}
      </div>

      {/* 내 정보(이름 + 출발 장소) 수정 모달 */}
      {myParticipant && (
        <EditProfileModal
          isOpen={isEditProfileModalOpen}
          onClose={() => setIsEditProfileModalOpen(false)}
          currentName={myParticipant.name}
          currentLocation={{
            lat: myParticipant.lat,
            lng: myParticipant.lng,
            addressName: myParticipant.address_name,
          }}
          isHost={isHost}
          onSave={handleUpdateProfile}
          onLeaveRoom={handleLeaveRoom}
          onSwitchProfile={handleSwitchProfile}
        />
      )}
    </div>
  );
};
