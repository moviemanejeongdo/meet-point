import React, { useState } from 'react';
import { Sparkles, MapPin, ArrowRight, Compass, Users } from 'lucide-react';
import { createRoom } from '../api/client';
import { LocationSearchModal } from '../components/LocationSearchModal';

interface HomePageProps {
  onNavigateToRoom: (roomId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRoom }) => {
  const [title, setTitle] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostLocation, setHostLocation] = useState<{ lat: number; lng: number; addressName: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) {
      alert('방장 닉네임을 입력해 주세요.');
      return;
    }
    if (!hostLocation) {
      alert('방장의 출발 위치를 설정해 주세요.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await createRoom(
        title.trim() || '얼중간 모임',
        hostName.trim(),
        hostLocation.lat,
        hostLocation.lng,
        hostLocation.addressName
      );
      onNavigateToRoom(res.room_id);
    } catch (err: any) {
      alert(err.message || '방 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '48px 16px 64px 16px',
      }}
    >
      {/* 상단 헤더 섹션: 완벽한 중앙 정렬 */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: 28,
        }}
      >
        {/* 심플한 애플 스타일 ㅇㅈㄱ 앱 아이콘 */}
        <img
          src="/app-icon.svg"
          alt="얼중간 ㅇㅈㄱ 공식 아이콘"
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            marginBottom: 16,
            display: 'block',
          }}
        />

        {/* 미니멀 배지 */}
        <div
          className="badge badge-primary"
          style={{ marginBottom: 12, padding: '5px 14px', fontSize: 12 }}
        >
          <Sparkles size={13} />
          친구 모임 중간장소 찾기 · 얼중간
        </div>

        {/* 타이틀 */}
        <h1
          style={{
            fontSize: 'clamp(24px, 5.5vw, 32px)',
            fontWeight: 800,
            lineHeight: 1.3,
            letterSpacing: '-0.03em',
            marginBottom: 10,
            color: '#ffffff',
            wordBreak: 'keep-all',
          }}
        >
          어디서 볼까?<br />
          얼추 중간에서 보자, 얼중간
        </h1>

        {/* 부제 설명 */}
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            wordBreak: 'keep-all',
            maxWidth: 380,
            margin: '0 auto',
          }}
        >
          친구들 출발 위치만 모으면 가장 공평한 최적의 중간 장소와 주변 추천 핫플레이스를 바로 찾아드립니다.
        </p>
      </div>

      {/* 방 만들기 카드: 애플 스타일 카드 */}
      <div
        className="apple-card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '28px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Compass size={18} color="var(--primary)" />
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc' }}>
            새로운 모임 방 만들기
          </h2>
        </div>

        <form onSubmit={handleCreateRoom}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              모임 이름 (선택)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 이번 주말 동창회, 번개 모임"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={24}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              내 닉네임 (방장)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="친구들이 알아볼 수 있는 이름 (예: 민수)"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              maxLength={12}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              내 출발 위치
            </label>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="glass-panel"
              style={{
                width: '100%',
                padding: '13px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: hostLocation ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                border: hostLocation ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                fontSize: 14,
                fontWeight: hostLocation ? 600 : 400,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <MapPin size={18} color={hostLocation ? 'var(--primary)' : 'var(--text-muted)'} />
                {hostLocation ? hostLocation.addressName : '출발하는 장소나 역 검색하기'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>
                {hostLocation ? '변경' : '선택'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !hostName.trim() || !hostLocation}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 15,
              opacity: !hostName.trim() || !hostLocation ? 0.6 : 1,
            }}
          >
            {isLoading ? '얼중간 방 만드는 중...' : '얼중간 모임 방 만들기'}
            <ArrowRight size={18} />
          </button>
        </form>

        <LocationSearchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectLocation={(loc) => setHostLocation(loc)}
        />
      </div>

      {/* 하단 특징 안내 뱃지 */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          gap: 16,
          marginTop: 24,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={14} color="var(--primary)" /> 비로그인 링크 초대
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={14} color="var(--accent-cyan)" /> 실시간 중간지점 자동 계산
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Compass size={14} color="var(--accent-gold)" /> 주변 핫플·카페 추천
        </span>
      </div>
    </div>
  );
};
