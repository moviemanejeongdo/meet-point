import React, { useState } from 'react';
import { X, MapPin, User, Check, Search, LogOut, Trash2 } from 'lucide-react';
import { LocationSearchModal } from './LocationSearchModal';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentLocation: { lat: number; lng: number; addressName: string };
  isHost?: boolean;
  onSave: (name: string, location: { lat: number; lng: number; addressName: string }) => Promise<void>;
  onLeaveRoom?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentLocation,
  isHost = false,
  onSave,
  onLeaveRoom,
}) => {
  const [name, setName] = useState(currentName);
  const [location, setLocation] = useState(currentLocation);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 모달이 열릴 때 최신 값 동기화
  React.useEffect(() => {
    setName(currentName);
    setLocation(currentLocation);
  }, [currentName, currentLocation, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
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
      setIsSaving(true);
      await onSave(name.trim(), location);
      onClose();
    } catch (err: any) {
      alert(err.message || '정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeave = () => {
    onClose();
    onLeaveRoom?.();
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={18} color="var(--primary)" /> 내 정보 관리
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave}>
            {/* 닉네임 입력 */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                내 닉네임 {isHost && <span style={{ color: '#f59e0b', fontSize: 12 }}>👑 (방장)</span>}
              </label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                required
              />
            </div>

            {/* 출발 위치 변경 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                출발 위치
              </label>
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {location.addressName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, padding: '6px 10px', fontSize: 12, gap: 4 }}
                >
                  <Search size={12} /> 장소 변경
                </button>
              </div>
            </div>

            {/* 하단 1단: 취소 및 수정 완료 (50:50 분할) */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px 0' }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="btn btn-primary"
                style={{ flex: 1, gap: 6, padding: '12px 0' }}
              >
                <Check size={16} />
                {isSaving ? '저장 중...' : '수정 완료'}
              </button>
            </div>
          </form>

          {/* 하단 2단: 모임 나가기 / 모임 방 삭제 (단독 가로 100% 정렬) */}
          {onLeaveRoom && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <button
                type="button"
                onClick={handleLeave}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '11px 0',
                  color: '#f87171',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.06)',
                  gap: 6,
                  fontSize: 14,
                }}
              >
                {isHost ? <Trash2 size={16} /> : <LogOut size={16} />}
                {isHost ? '모임 방 완전히 삭제하기' : '이 모임에서 나가기'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 카카오 장소 검색 모달 */}
      <LocationSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectLocation={(loc) => {
          setLocation(loc);
          setIsSearchOpen(false);
        }}
      />
    </>
  );
};
