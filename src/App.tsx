import { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';

function parseRoomIdFromLocation(): string | null {
  try {
    // 1. Pathname 검사: /room/:roomId
    const path = decodeURIComponent(window.location.pathname);
    const match = path.match(/\/room\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }

    // 2. Query Parameter 검사: ?room=:roomId 또는 ?roomId=:roomId
    const searchParams = new URLSearchParams(window.location.search);
    const queryRoom = searchParams.get('room') || searchParams.get('roomId');
    if (queryRoom) {
      return queryRoom.trim();
    }

    // 3. Hash 검사: #/room/:roomId 또는 #room=:roomId
    const hash = decodeURIComponent(window.location.hash);
    const hashMatch = hash.match(/#\/?room\/([a-zA-Z0-9_-]+)/);
    if (hashMatch && hashMatch[1]) {
      return hashMatch[1];
    }
  } catch (e) {
    console.warn('parseRoomId error:', e);
  }
  return null;
}

export function App() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(parseRoomIdFromLocation);

  // 브라우저 뒤로가기/앞으로가기 popstate 처리
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoomId(parseRoomIdFromLocation());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // 쿼리 파라미터(?room=...)나 해시로 인앱 브라우저 접속 시 깔끔한 /room/:roomId 경로로 주소창 정규화
  useEffect(() => {
    if (currentRoomId) {
      if (!window.location.pathname.includes(`/room/${currentRoomId}`)) {
        window.history.replaceState(null, '', `/room/${currentRoomId}`);
      }
    }
  }, [currentRoomId]);

  const navigateToRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    window.history.pushState(null, '', `/room/${roomId}`);
  };

  const navigateHome = () => {
    setCurrentRoomId(null);
    window.history.pushState(null, '', '/');
  };

  if (currentRoomId) {
    return <RoomPage roomId={currentRoomId} onNavigateHome={navigateHome} />;
  }

  return <HomePage onNavigateToRoom={navigateToRoom} />;
}

export default App;
