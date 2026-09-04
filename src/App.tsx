import { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';

export function App() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(() => {
    // 1. Pathname 검사: /room/:roomId
    const path = window.location.pathname;
    const match = path.match(/\/room\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // 2. Hash 검사: #/room/:roomId
    const hash = window.location.hash;
    const hashMatch = hash.match(/#\/room\/([a-zA-Z0-9_-]+)/);
    if (hashMatch && hashMatch[1]) {
      return hashMatch[1];
    }
    return null;
  });

  // 브라우저 뒤로가기/앞으로가기 popstate 처리
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/room\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setCurrentRoomId(match[1]);
        return;
      }
      const hash = window.location.hash;
      const hashMatch = hash.match(/#\/room\/([a-zA-Z0-9_-]+)/);
      if (hashMatch && hashMatch[1]) {
        setCurrentRoomId(hashMatch[1]);
        return;
      }
      setCurrentRoomId(null);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

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
