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
        title.trim() || '친구 모임 중간장소 찾기',
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      {/* 히어로 헤더 */}
      <div style={{ textAlign: 'center', maxWidth: 540, marginBottom: 32 }}>
        <div
          className="badge badge-primary"
          style={{ marginBottom: 14, padding: '6px 14px', fontSize: 13 }}
        >
          <Sparkles size={14} />
          친구 모임 약속 플랫폼
        </div>
        <h1
          style={{
            fontSize: 'clamp(28px, 6vw, 38px)',
            fontWeight: 900,
            lineHeight: 1.25,
            marginBottom: 12,
            background: 'linear-gradient(135deg, #ffffff 30%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          모두에게 공평한<br />중간 만남 장소를 찾아요
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          링크 하나로 친구들의 출발 위치를 모으고, 이동 시간과 거리가 가장 균등한 최적의 만남 장소와 맛집을 추천해 드립니다.
        </p>
      </div>

      {/* 방 만들기 카드 */}
      <div
        className="glass-panel-glow"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: '28px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Compass size={20} color="var(--primary)" />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
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
              placeholder="예: 이번 주말 동창회, 프로젝트 회의"
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
              fontSize: 16,
              opacity: !hostName.trim() || !hostLocation ? 0.6 : 1,
            }}
          >
            {isLoading ? '방 개설 중...' : '모임 방 개설하기'}
            <ArrowRight size={18} />
          </button>
        </form>

        <LocationSearchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectLocation={(loc) => setHostLocation(loc)}
        />
      </div>

      {/* 특징 소개 아이콘 뱃지 */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 28,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={14} color="var(--primary)" /> 비로그인 링크 공유
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={14} color="var(--accent-cyan)" /> 실시간 중간지점 자동 계산
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Compass size={14} color="var(--accent-gold)" /> 주변 카페·맛집 추천
        </span>
      </div>
    </div>
  );
};
