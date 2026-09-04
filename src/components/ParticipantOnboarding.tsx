import React, { useState } from 'react';
import { Users, MapPin, ArrowRight, Sparkles, Lock, KeyRound, X } from 'lucide-react';
import type { Room, Participant } from '../types';
import { LocationSearchModal } from './LocationSearchModal';
import { verifyHostPin } from '../api/client';

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

  // 방장 PIN 검증 모달 상태
  const [pinTargetHost, setPinTargetHost] = useState<Participant | null>(null);
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

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

  const handleHostLoginClick = (participant: Participant) => {
    if (room.has_host_pin === false) {
      alert('비밀번호가 설정되지 않은 이전 모임입니다. 아래 폼에서 새로운 참가자로 등록해 주세요.');
      return;
    }
    setPinTargetHost(participant);
    setInputPin('');
    setPinError('');
  };

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTargetHost || !onSelectParticipant) return;
    if (inputPin.length !== 4) {
      setPinError('비밀번호 4자리를 모두 입력해 주세요.');
      return;
    }

    try {
      setIsVerifyingPin(true);
      setPinError('');
      const res = await verifyHostPin(room.id, inputPin);
      if (res.success) {
        onSelectParticipant(pinTargetHost.id);
        setPinTargetHost(null);
      } else {
        setPinError(res.error || '비밀번호가 일치하지 않습니다.');
      }
    } catch (err: any) {
      setPinError(err.message || '인증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifyingPin(false);
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
                  p.is_host === 1 ? (
                    <button
                      type="button"
                      onClick={() => handleHostLoginClick(p)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '5px 9px',
                        fontSize: 11,
                        flexShrink: 0,
                        gap: 4,
                        borderColor: 'rgba(245, 158, 11, 0.4)',
                        color: '#fbbf24',
                        background: 'rgba(245, 158, 11, 0.08)',
                      }}
                      title="방장 비밀번호 4자리 입력 후 입장"
                    >
                      <Lock size={12} />
                      방장 입장
                    </button>
                  ) : (
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
                  )
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

        {/* 방장 비밀번호 4자리 입력 모달 */}
        {pinTargetHost && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              className="apple-card"
              style={{
                width: '100%',
                maxWidth: 360,
                padding: '24px',
                animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <KeyRound size={18} color="#fbbf24" />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                    방장 비밀번호 확인
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPinTargetHost(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                '{pinTargetHost.name}' 방장 프로필로 입장하려면 방 생성 시 설정한 4자리 비밀번호를 입력해 주세요.
              </p>

              <form onSubmit={handleVerifyPinSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="input-field"
                    placeholder="숫자 4자리"
                    value={inputPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      setInputPin(val);
                      setPinError('');
                    }}
                    maxLength={4}
                    autoFocus
                    style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: 18, fontWeight: 700 }}
                  />
                  {pinError && (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                      {pinError}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPinTargetHost(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', padding: '10px 0' }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingPin || inputPin.length !== 4}
                    className="btn btn-primary btn-sm"
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      opacity: inputPin.length !== 4 ? 0.6 : 1,
                    }}
                  >
                    {isVerifyingPin ? '확인 중...' : '확인'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
