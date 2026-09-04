import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, MessageCircle } from 'lucide-react';
import type { Room } from '../types';

interface ShareBarProps {
  room: Room;
}

export const ShareBar: React.FC<ShareBarProps> = ({ room }) => {
  const [isCopied, setIsCopied] = useState(false);

  // 카카오 SDK 초기화
  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init('7c8a87e9d7ca95898413f370d2e52614');
      } catch (e) {
        console.warn('Kakao init error:', e);
      }
    }
  }, []);

  const shareUrl = window.location.href;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      alert('링크 복사에 실패했습니다. 주소창의 링크를 직접 복사해 주세요.');
    }
  };

  const handleKakaoShare = () => {
    if (!window.Kakao) {
      alert('카카오 SDK를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    try {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init('7c8a87e9d7ca95898413f370d2e52614');
      }

      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `[모임 초대] ${room.title}`,
          description: `친구들이 중간 장소를 찾고 있어요! 내 출발 위치를 등록하고 공평한 중간지점을 확인해 보세요.`,
          imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '중간장소 참여하기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } catch (err) {
      console.error('Kakao share error:', err);
      handleCopyLink();
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Share2 size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          친구들을 초대해 위치를 모아보세요
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleKakaoShare}
          className="btn btn-kakao btn-sm"
          style={{ gap: 4 }}
          title="카카오톡으로 공유하기"
        >
          <MessageCircle size={14} />
          카톡 공유
        </button>

        <button
          onClick={handleCopyLink}
          className="btn btn-secondary btn-sm"
          style={{ gap: 4 }}
          title="초대 링크 복사"
        >
          {isCopied ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
          {isCopied ? '복사 완료!' : '링크 복사'}
        </button>
      </div>
    </div>
  );
};
