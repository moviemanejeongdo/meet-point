import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Users, MapPin, User, LogOut, Trash2, Map, List, Edit3, MessageCircle } from 'lucide-react';
import type { Room, PlaceItem } from '../types';
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
import { enrichParticipantsWithDistances } from '../utils/midpoint';
import { ParticipantOnboarding } from '../components/ParticipantOnboarding';
import { EditProfileModal } from '../components/EditProfileModal';

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
      if (data.midpoint_result && data.participants) {
        processedData = {
          ...data,
          participants: enrichParticipantsWithDistances(
            data.participants,
            data.midpoint_result.center_lat,
            data.midpoint_result.center_lng
          ),
        };
      }

      setRoom(processedData);
    } catch (err: any) {
      if (err?.message?.includes('만료') || err?.message?.includes('종료')) {
        alert(err.message);
        onNavigateHome();
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId, myParticipantId, onNavigateHome]);

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

      {/* 2. 중간지점 요약 및 4대 추천 탭 */}
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

                {/* 우측 거리 및 액션 버튼 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {p.distance_meters ? (
                    <span style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 600, marginRight: 2 }}>
                      {Math.round(p.distance_meters / 100) / 10}km
                    </span>
                  ) : null}

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

        <button
          onClick={() => setIsEditProfileModalOpen(true)}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 12, gap: 4, flexShrink: 0, padding: '6px 10px' }}
        >
          <User size={13} color="var(--primary)" />
          내 정보
        </button>
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
          <main style={{ flex: 1, position: 'relative', height: '100%', width: '100%' }}>
            <KakaoMap
              participants={room.participants}
              midpointResult={room.midpoint_result || null}
              selectedPlace={selectedPlace}
              onSelectPlace={(place) => setSelectedPlace(place)}
            />

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
        />
      )}
    </div>
  );
};
