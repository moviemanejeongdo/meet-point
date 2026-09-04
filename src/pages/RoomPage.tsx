import React, { useState, useEffect, useCallback } from 'react';
import { Users, ChevronLeft, MapPin, RefreshCw } from 'lucide-react';
import type { Room, PlaceItem } from '../types';
import { getRoom, addParticipant, getStoredParticipantId, updateParticipantLocation } from '../api/client';
import { KakaoMap } from '../components/KakaoMap';
import { ShareBar } from '../components/ShareBar';
import { MidpointSummary } from '../components/MidpointSummary';
import { ParticipantOnboarding } from '../components/ParticipantOnboarding';
import { LocationSearchModal } from '../components/LocationSearchModal';

interface RoomPageProps {
  roomId: string;
  onNavigateHome: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({ roomId, onNavigateHome }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [isEditLocationModalOpen, setIsEditLocationModalOpen] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(() => getStoredParticipantId(roomId));

  // 방 정보 로드 함수
  const fetchRoomData = useCallback(async () => {
    try {
      const data = await getRoom(roomId);
      if (data) {
        setRoom(data);
      }
    } catch (err) {
      console.error('Failed to fetch room:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // 초기 로드 및 3초 주기 자동 폴링 (새 참가자 실시간 자동 반영)
  useEffect(() => {
    fetchRoomData();
    const interval = setInterval(fetchRoomData, 3000);
    return () => clearInterval(interval);
  }, [fetchRoomData]);

  // 신규 접속자 첫 참여 등록 처리
  const handleOnboardingSubmit = async (
    name: string,
    location: { lat: number; lng: number; addressName: string }
  ) => {
    const res = await addParticipant(roomId, name, location.lat, location.lng, location.addressName);
    setMyParticipantId(res.participant_id);
    setRoom(res.room);
  };

  // 내 출발 위치 변경 처리
  const handleUpdateLocation = async (location: { lat: number; lng: number; addressName: string }) => {
    if (!myParticipantId) return;
    try {
      const updated = await updateParticipantLocation(
        roomId,
        myParticipantId,
        location.lat,
        location.lng,
        location.addressName
      );
      setRoom(updated);
    } catch (err: any) {
      alert(err.message || '위치 수정에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="pulse-marker" style={{ marginBottom: 12 }} />
          <div>모임 방을 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="glass-panel" style={{ maxWidth: 400, padding: 28, textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, color: '#f8fafc', marginBottom: 10 }}>존재하지 않는 방입니다</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            방 링크가 올바른지 확인해 주시거나 새 방을 만들어 보세요.
          </p>
          <button onClick={onNavigateHome} className="btn btn-primary" style={{ width: '100%' }}>
            새 모임 방 만들기
          </button>
        </div>
      </div>
    );
  }

  // 사용자의 핵심 피드백: 아직 참여 등록을 안 한 신규 접속자라면 먼저 명단을 보여주고 등록 폼을 띄움
  const isUserJoined = myParticipantId && room.participants.some((p) => p.id === myParticipantId);
  if (!isUserJoined) {
    return <ParticipantOnboarding room={room} onSubmit={handleOnboardingSubmit} />;
  }

  // 본인이 이미 참여한 상태라면 전체 인터랙티브 지도 뷰 렌더링
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 1. 상단 글로벌 네비게이션 헤더 */}
      <header
        style={{
          padding: '12px 16px',
          background: 'rgba(10, 14, 23, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onNavigateHome}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', gap: 4 }}
            title="홈으로 가기"
          >
            <ChevronLeft size={16} /> 홈
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              {room.title}
              <span className="badge badge-primary" style={{ fontSize: 11, padding: '2px 8px' }}>
                <Users size={12} /> {room.participants.length}명
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditLocationModalOpen(true)}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 12, gap: 4 }}
        >
          <MapPin size={13} color="var(--primary)" />
          내 위치 변경
        </button>
      </header>

      {/* 2. 메인 컨텐츠 영역 (지도 + 사이드바) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 좌측 패널 (사이드바) */}
        <aside
          style={{
            width: 'clamp(320px, 32vw, 420px)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: '16px',
            overflowY: 'auto',
            zIndex: 10,
          }}
        >
          {/* 공유 바 */}
          <ShareBar room={room} />

          {/* 중간지점 요약 및 추천 스팟 탭 (참여자 추가 시 실시간 자동 갱신) */}
          <MidpointSummary
            midpointResult={room.midpoint_result || null}
            participants={room.participants}
            selectedPlace={selectedPlace}
            onSelectPlace={(place) => setSelectedPlace(place)}
          />

          {/* 현재 참여자 상세 목록 */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={15} color="var(--primary)" />
              참여자 목록 ({room.participants.length}명)
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
                      padding: '8px 12px',
                      background: isMe ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                      borderRadius: 'var(--radius-sm)',
                      border: isMe ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                        {p.name} {p.is_host ? '👑' : ''} {isMe ? <span style={{ color: 'var(--primary)', fontSize: 11 }}>(나)</span> : null}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {p.address_name}
                      </div>
                    </div>
                    {p.distance_meters ? (
                      <span style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {Math.round(p.distance_meters / 100) / 10}km
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* 우측 메인 인터랙티브 지도 영역 */}
        <main style={{ flex: 1, position: 'relative', height: '100%' }}>
          <KakaoMap
            participants={room.participants}
            midpointResult={room.midpoint_result || null}
            selectedPlace={selectedPlace}
            onSelectPlace={(place) => setSelectedPlace(place)}
          />
        </main>
      </div>

      {/* 내 위치 변경 모달 */}
      <LocationSearchModal
        isOpen={isEditLocationModalOpen}
        onClose={() => setIsEditLocationModalOpen(false)}
        onSelectLocation={handleUpdateLocation}
      />
    </div>
  );
};
