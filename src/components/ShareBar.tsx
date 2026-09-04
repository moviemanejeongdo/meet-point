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

  // 카카오 디벨로퍼스에 등록된 공식 프로덕션 도메인
  const CANONICAL_ORIGIN = 'https://meet-point-aql.pages.dev';

  // 카카오톡 인앱 브라우저의 서브 경로 유실을 100% 원천 차단하는 표준 초대 링크 (?room=...)
  // 접속 시 App.tsx에서 방을 즉시 로드하고 주소창을 깔끔한 /room/:roomId로 자동 정규화합니다.
  const shareRoomUrl = `${CANONICAL_ORIGIN}/?room=${room.id}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareRoomUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareRoomUrl;
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

  const handleKakaoShare = async () => {
    // 카카오 서버의 도메인 검증 및 웹뷰 경로 유실을 완벽 방지하는 표준 공유 URL
    const kakaoShareUrl = shareRoomUrl;

    if (!window.Kakao) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `[얼중간 초대] ${room.title}`,
            text: `어디서 볼까? 얼추 중간에서 보자!\n모임 링크: ${kakaoShareUrl}\n출발 위치를 등록하고 공평한 중간지점을 확인해 보세요.`,
            url: kakaoShareUrl,
          });
          return;
        } catch (e) {
          // ignore
        }
      }
      handleCopyLink();
      return;
    }

    try {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init('7c8a87e9d7ca95898413f370d2e52614');
      }

      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `[얼중간 초대] ${room.title}`,
          description: `어디서 볼까? 얼추 중간에서 보자!\n모임 링크: ${kakaoShareUrl}\n내 출발 위치를 등록하고 공평한 중간지점을 확인해 보세요.`,
          imageUrl: `${CANONICAL_ORIGIN}/og-image.png`,
          imageWidth: 800,
          imageHeight: 420,
          link: {
            mobileWebUrl: kakaoShareUrl,
            webUrl: kakaoShareUrl,
          },
        },
        buttons: [
          {
            title: '얼중간 모임 참여하기',
            link: {
              mobileWebUrl: kakaoShareUrl,
              webUrl: kakaoShareUrl,
            },
          },
        ],
      });
    } catch (err) {
      console.error('Kakao share error:', err);
      if (navigator.share) {
        try {
          await navigator.share({
            title: `[얼중간 초대] ${room.title}`,
            text: `어디서 볼까? 얼추 중간에서 보자!\n모임 링크: ${shareRoomUrl}`,
            url: shareRoomUrl,
          });
          return;
        } catch (e) {
          // ignore
        }
      }
      handleCopyLink();
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Share2 size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          친구 초대 링크 공유
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          onClick={handleKakaoShare}
          className="btn btn-kakao btn-sm"
          style={{ width: '100%', gap: 5, padding: '9px 0', fontSize: 13, whiteSpace: 'nowrap' }}
          title="카카오톡으로 공유하기"
        >
          <MessageCircle size={15} />
          카톡 공유
        </button>

        <button
          onClick={handleCopyLink}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', gap: 5, padding: '9px 0', fontSize: 13, whiteSpace: 'nowrap' }}
          title="초대 링크 복사"
        >
          {isCopied ? <Check size={15} color="var(--accent-green)" /> : <Copy size={15} />}
          {isCopied ? '복사 완료!' : '링크 복사'}
        </button>
      </div>
    </div>
  );
};
