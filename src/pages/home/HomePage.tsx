import React from 'react';
import { Users, Clock, Coffee, ArrowUp } from 'lucide-react';
import { GoogleAd } from '../../components/GoogleAd';
import { CreateRoomFunnel, HOST_NICKNAME_INPUT_ID } from './CreateRoomFunnel';
import { HowItWorks } from './HowItWorks';
import './home.css';

const CREATE_ROOM_SECTION_ID = 'create-room';

const HIGHLIGHTS = [
  { icon: Users, label: '로그인 없이 링크 초대' },
  { icon: Clock, label: '이동 시간 실시간 비교' },
  { icon: Coffee, label: '근처 맛집·카페 추천' },
] as const;

interface HomePageProps {
  onNavigateToRoom: (roomId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRoom }) => {
  const scrollToCreateRoom = () => {
    document.getElementById(CREATE_ROOM_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById(HOST_NICKNAME_INPUT_ID)?.focus({ preventScroll: true });
  };

  return (
    <div className="home">
      <header className="home-header">
        <img src="/app-icon.svg" alt="" className="home-logo" />
        <span className="home-brand">얼중간</span>
      </header>

      <main>
        <section className="home-hero">
          <p className="section-eyebrow">친구 모임 중간장소 찾기</p>
          <h1 className="home-title">
            어디서 볼까?
            <br />
            얼추 중간에서 보자
          </h1>
          <p className="home-subtitle">
            친구들 출발 위치만 모으면 모두에게 공평한 중간 장소와 근처 맛집·카페를 바로 찾아드려요.
          </p>
          <ul className="home-highlights">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={14} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </section>

        <section id={CREATE_ROOM_SECTION_ID} className="home-create" aria-label="모임 방 만들기">
          <CreateRoomFunnel onCreated={onNavigateToRoom} />
        </section>

        <HowItWorks />

        <section className="home-closing">
          <h2 className="section-title">이번 약속, 얼중간에서 정해요</h2>
          <button type="button" className="btn btn-primary home-closing-cta" onClick={scrollToCreateRoom}>
            <ArrowUp size={18} aria-hidden="true" />
            지금 모임 방 만들기
          </button>
        </section>

        {/* 랜딩 페이지 하단 구글 애드센스 광고 */}
        <div className="home-ad">
          <GoogleAd variant="card" slot={import.meta.env.VITE_ADSENSE_SLOT_HOME} />
        </div>
      </main>
    </div>
  );
};
