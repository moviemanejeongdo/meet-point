import React from 'react';

// 실제 앱 구동 화면 캡처 (public/screenshots). 390x844 모바일 뷰포트 기준입니다.
const SCREENSHOT_ASPECT_RATIO = '390 / 844';

const SHOWCASE_STEPS = [
  {
    title: '링크 하나로 친구 초대',
    description: '방을 만들고 카톡으로 링크만 보내면 끝. 친구들은 로그인 없이 바로 들어와요.',
    image: '/screenshots/step1-invite.webp',
    alt: '친구가 초대 링크로 들어와 닉네임과 출발 위치를 입력하는 화면',
  },
  {
    title: '각자 출발 위치만 등록',
    description: '모두의 출발 위치가 지도에 실시간으로 모이고, 중간 지점이 바로 계산돼요.',
    image: '/screenshots/step2-map.webp',
    alt: '참가자들의 출발 위치와 중간 지점이 표시된 지도 화면',
  },
  {
    title: '공평한 장소와 맛집 추천',
    description: '모두의 이동 시간을 비교해 가장 공평한 역과 근처 맛집·카페를 골라드려요.',
    image: '/screenshots/step3-places.webp',
    alt: '참가자별 이동 시간과 중간 지점 주변 추천 장소 목록 화면',
  },
] as const;

export const HowItWorks: React.FC = () => (
  <section className="how" aria-labelledby="how-title">
    <div className="how-inner">
      <p className="section-eyebrow">이렇게 써요</p>
      <h2 id="how-title" className="section-title">
        세 단계면
        <br />
        약속 장소가 정해져요
      </h2>

      <ol className="how-list">
        {SHOWCASE_STEPS.map((step, index) => (
          <li key={step.title} className="how-item">
            <PhoneFrame src={step.image} alt={step.alt} />
            <div className="how-copy">
              <span className="how-step">{index + 1}</span>
              <h3 className="how-item-title">{step.title}</h3>
              <p className="how-item-description">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const PhoneFrame: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <div className="phone">
    <div className="phone-screen" style={{ aspectRatio: SCREENSHOT_ASPECT_RATIO }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        // 이미지를 못 불러오면 깨진 아이콘 대신 빈 화면을 보여줍니다.
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
      />
    </div>
  </div>
);
