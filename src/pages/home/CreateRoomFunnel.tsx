import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronRight } from 'lucide-react';
import { createRoom } from '../../api/client';
import { LocationSearchModal } from '../../components/LocationSearchModal';

const HOST_PIN_LENGTH = 4;
const HOST_PIN_PATTERN = new RegExp(`^\\d{${HOST_PIN_LENGTH}}$`);
const DEFAULT_ROOM_TITLE = '얼중간 모임';

// 첫 입력칸 id: 랜딩 하단 CTA에서 이 칸으로 포커스를 옮길 때 사용합니다.
export const HOST_NICKNAME_INPUT_ID = 'host-nickname';

// 방장 입력 단계: 필수 항목을 먼저 받고, 선택 항목인 모임 이름은 마지막에 받습니다.
const HOST_STEPS = ['nickname', 'location', 'pin', 'title'] as const;
type HostStep = (typeof HOST_STEPS)[number];

const STEP_QUESTION: Record<HostStep, string> = {
  nickname: '친구들이 알아볼\n닉네임을 알려주세요',
  location: '어디서\n출발하시나요?',
  pin: '방장 비밀번호\n4자리를 정해주세요',
  title: '마지막으로\n모임 이름을 지어주세요',
};

type HostLocation = { lat: number; lng: number; addressName: string };

interface CreateRoomFunnelProps {
  onCreated: (roomId: string) => void;
}

export const CreateRoomFunnel: React.FC<CreateRoomFunnelProps> = ({ onCreated }) => {
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState<HostLocation | null>(null);
  const [pin, setPin] = useState('');
  const [title, setTitle] = useState('');
  const [currentStep, setCurrentStep] = useState<HostStep>('nickname');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const currentStepIndex = HOST_STEPS.indexOf(currentStep);
  const isRevealed = (step: HostStep) => HOST_STEPS.indexOf(step) <= currentStepIndex;

  const isNicknameValid = nickname.trim().length > 0;
  const isPinValid = HOST_PIN_PATTERN.test(pin);
  const canCreateRoom = isNicknameValid && location !== null && isPinValid;

  // 아직 지나지 않은 단계를 완료했을 때만 다음 칸을 펼칩니다. (이미 펼쳐진 칸을 수정할 때는 그대로 유지)
  const revealStepAfter = (completedStep: HostStep) => {
    setCurrentStep((prev) => {
      if (prev !== completedStep) return prev;
      return HOST_STEPS[HOST_STEPS.indexOf(completedStep) + 1] ?? prev;
    });
  };

  // 새 칸이 펼쳐지면 그 칸으로 포커스와 스크롤을 옮깁니다. 첫 진입 시에는 키보드가 뜨지 않도록 건너뜁니다.
  useEffect(() => {
    const fieldByStep: Record<HostStep, HTMLElement | null> = {
      nickname: null,
      location: locationButtonRef.current,
      pin: pinInputRef.current,
      title: titleInputRef.current,
    };
    const field = fieldByStep[currentStep];
    if (!field) return;
    field.focus({ preventScroll: true });
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStep]);

  const handleSelectLocation = (selected: HostLocation) => {
    setLocation(selected);
    revealStepAfter('location');
  };

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, HOST_PIN_LENGTH);
    setPin(digits);
    if (HOST_PIN_PATTERN.test(digits)) {
      revealStepAfter('pin');
    }
  };

  const submitRoom = async () => {
    if (!canCreateRoom || location === null) return;
    try {
      setIsSubmitting(true);
      const res = await createRoom(
        title.trim() || DEFAULT_ROOM_TITLE,
        nickname.trim(),
        location.lat,
        location.lng,
        location.addressName,
        pin
      );
      onCreated(res.room_id);
    } catch (err: any) {
      alert(err.message || '방 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 하단 버튼과 키보드 Enter 모두 이 핸들러로 들어옵니다.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    switch (currentStep) {
      case 'nickname':
        if (isNicknameValid) revealStepAfter('nickname');
        return;
      case 'location':
        setIsLocationModalOpen(true);
        return;
      case 'pin':
        if (isPinValid) revealStepAfter('pin');
        return;
      case 'title':
        void submitRoom();
        return;
    }
  };

  const primaryAction: Record<HostStep, { label: string; disabled: boolean }> = {
    nickname: { label: '다음', disabled: !isNicknameValid },
    location: { label: '출발 위치 검색하기', disabled: false },
    pin: { label: '다음', disabled: !isPinValid },
    title: {
      label: isSubmitting ? '모임 방 만드는 중...' : '모임 방 만들기',
      disabled: !canCreateRoom || isSubmitting,
    },
  };

  return (
    <>
      <form className="funnel" onSubmit={handleSubmit} noValidate>
        <div className="funnel-progress" aria-hidden="true">
          {HOST_STEPS.map((step) => (
            <span key={step} className={`funnel-progress-bar ${isRevealed(step) ? 'is-done' : ''}`} />
          ))}
        </div>

        <h2 className="funnel-question" aria-live="polite">
          {STEP_QUESTION[currentStep]}
        </h2>

        <div className="funnel-fields">
          <FunnelField label="내 닉네임" htmlFor={HOST_NICKNAME_INPUT_ID}>
            <input
              id={HOST_NICKNAME_INPUT_ID}
              type="text"
              className="input-field funnel-input"
              placeholder="예: 민수"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              autoComplete="nickname"
              enterKeyHint="next"
            />
          </FunnelField>

          <Reveal when={isRevealed('location')}>
            <FunnelField label="출발 위치" htmlFor="host-location">
              <button
                id="host-location"
                ref={locationButtonRef}
                type="button"
                className={`funnel-location ${location ? 'is-selected' : ''}`}
                onClick={() => setIsLocationModalOpen(true)}
              >
                <MapPin size={18} aria-hidden="true" />
                <span className="funnel-location-text">
                  {location ? location.addressName : '역, 건물, 주소로 검색'}
                </span>
                <span className="funnel-location-action">
                  {location ? '변경' : '검색'}
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
              </button>
            </FunnelField>
          </Reveal>

          <Reveal when={isRevealed('pin')}>
            <FunnelField
              label={`방장 비밀번호 (숫자 ${HOST_PIN_LENGTH}자리)`}
              htmlFor="host-pin"
              hint="다른 기기에서 방장으로 다시 들어올 때 필요해요."
            >
              <input
                id="host-pin"
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                className="input-field funnel-input funnel-pin"
                placeholder={'•'.repeat(HOST_PIN_LENGTH)}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                maxLength={HOST_PIN_LENGTH}
                autoComplete="off"
                enterKeyHint="next"
              />
            </FunnelField>
          </Reveal>

          <Reveal when={isRevealed('title')}>
            <FunnelField
              label="모임 이름 (선택)"
              htmlFor="host-title"
              hint={`비워두면 '${DEFAULT_ROOM_TITLE}'으로 만들어요.`}
            >
              <input
                id="host-title"
                ref={titleInputRef}
                type="text"
                className="input-field funnel-input"
                placeholder="예: 이번 주말 동창회"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={24}
                enterKeyHint="done"
              />
            </FunnelField>
          </Reveal>
        </div>

        <button
          type="submit"
          className="btn btn-primary funnel-cta"
          disabled={primaryAction[currentStep].disabled}
        >
          {primaryAction[currentStep].label}
        </button>
      </form>

      {/* 모달 안의 버튼/Enter가 바깥 폼을 제출하지 않도록 폼 밖에 둡니다. */}
      <LocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleSelectLocation}
      />
    </>
  );
};

interface FunnelFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}

const FunnelField: React.FC<FunnelFieldProps> = ({ label, htmlFor, hint, children }) => (
  <div className="funnel-field">
    <label className="funnel-label" htmlFor={htmlFor}>
      {label}
    </label>
    {children}
    {hint && <p className="funnel-hint">{hint}</p>}
  </div>
);

// 조건이 충족되면 높이와 투명도를 함께 풀어 아래로 스르륵 펼칩니다.
const Reveal: React.FC<{ when: boolean; children: React.ReactNode }> = ({ when, children }) => {
  if (!when) return null;
  return (
    <div className="reveal">
      <div className="reveal-inner">{children}</div>
    </div>
  );
};
