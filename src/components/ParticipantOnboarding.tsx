import React, { useState } from 'react';
import { Users, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import type { Room } from '../types';
import { LocationSearchModal } from './LocationSearchModal';

interface ParticipantOnboardingProps {
  room: Room;
  onSubmit: (name: string, location: { lat: number; lng: number; addressName: string }) => Promise<void>;
  onSelectParticipant?: (participantId: string) => void;
}

export const ParticipantOnboarding: React.FC<ParticipantOnboardingProps> = ({ room, onSubmit, onSelectParticipant }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; addressName: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('닉네임을 입력해 주세요.');
      return;
    }
    if (!location) {
      alert('출발 위치를 선택해 주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(name.trim(), location);
    } catch (err: any) {
      alert(err.message || '참여 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="apple-card"
        style={{
          width: '100%',
          maxWidth: 480,
          padding: '28px 24px',
          animation: 'modalPop 0.3s ease',
        }}
      >
        {/* 상단 모임 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src="/app-icon.svg"
            alt="얼중간"
            style={{ width: 64, height: 64, borderRadius: 16, margin: '0 auto 12px auto', display: 'block', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
          />
          <div
            className="badge badge-primary"
            style={{ marginBottom: 10, padding: '5px 12px', fontSize: 12 }}
          >
            <Sparkles size={13} />
            얼중간 모임 초대장
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', marginBottom: 6 }}>
            {room.title}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            친구들이 모여 얼추 중간 만남 장소를 정하고 있어요!
          </p>
        </div>

        {/* 1. 현재 참가자 명단 선공개 섹션 */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={16} color="var(--primary)" />
              현재 모인 친구들 ({room.participants.length}명)
            </span>
            <span style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>
              참가자 추가 시 중간지점 자동 계산
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 180,
              overflowY: 'auto',
              padding: 4,
            }}
          >
            {room.participants.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: p.is_host ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: p.is_host ? '#fbbf24' : '#818cf8',
                      flexShrink: 0,
                    }}
                  >
                    {p.is_host ? '👑' : p.name.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name} {p.is_host ? <span style={{ fontSize: 11, color: '#f59e0b' }}>(방장)</span> : null}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      출발: {p.address_name}
                    </div>
                  </div>
                </div>

                {/* 내가 이 사람이라면 바로 입장할 수 있는 빠른 선택 버튼 */}
                {onSelectParticipant && (
                  <button
                    type="button"
                    onClick={() => onSelectParticipant(p.id)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: '5px 9px',
                      fontSize: 11,
                      flexShrink: 0,
                      gap: 4,
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                      color: '#60a5fa',
                    }}
                    title="이미 등록된 내 프로필로 바로 입장"
                  >
                    내 프로필로 입장
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, background: 'var(--border-color)', margin: '20px 0' }} />

        {/* 2. 내 닉네임과 출발 장소 입력 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              내 닉네임
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="친구들이 알아볼 수 있는 이름 (예: 민수)"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                color: location ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                border: location ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                fontSize: 14,
                fontWeight: location ? 600 : 400,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <MapPin size={18} color={location ? 'var(--primary)' : 'var(--text-muted)'} />
                {location ? location.addressName : '출발하는 장소나 역 검색하기'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>
                {location ? '변경' : '선택'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !location}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 16,
              opacity: !name.trim() || !location ? 0.6 : 1,
            }}
          >
            {isSubmitting ? '참여 등록 중...' : '참여 완료하고 지도 보기'}
            <ArrowRight size={18} />
          </button>
        </form>

        <LocationSearchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectLocation={(loc) => setLocation(loc)}
        />
      </div>
    </div>
  );
};
