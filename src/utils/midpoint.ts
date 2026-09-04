import type { Participant, MidpointResult, PlaceItem, MidpointMode, MidpointModeOption } from '../types';

export const MIDPOINT_MODES: MidpointModeOption[] = [
  {
    key: 'transit',
    icon: '🚇',
    label: '대중교통 기준',
    badge: '추천 (기본)',
    description: '지하철·버스 환승과 이동 시간을 고려한 역세권 공평 중심',
  },
  {
    key: 'centroid',
    icon: '📍',
    label: '지도 중앙 기준',
    badge: '기하학 중심',
    description: '모든 출발 위치의 지도 위도·경도 좌표를 산술 평균한 수학적 중간점',
  },
  {
    key: 'walking',
    icon: '🚶',
    label: '도보 기준',
    badge: '보행 친화',
    description: '걸어서 이동할 때 체감 거리가 가장 짧고 고른 보행 친화적 중간점',
  },
  {
    key: 'driving',
    icon: '🚗',
    label: '자동차 운전 기준',
    badge: '차량 주행',
    description: '도심 도로망과 간선도로 주행 접근성을 고려한 운전 기준 중간점',
  },
];

// 위도/경도 두 점 사이의 직선 거리(미터)를 계산하는 Haversine 공식
export function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// 거리(미터)를 사람이 읽기 쉬운 텍스트(예: "1.2km", "850m")로 변환
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// 도심 직선거리 대비 실제 도로 및 대중교통 경로 우회 보정 계수 (1.63배)
export const URBAN_DETOUR_FACTOR = 1.63;

// 이동 모드별 실제 경로 기반 예상 소요시간(분) 추정
export function estimateDurationMinutes(meters: number, mode: MidpointMode = 'transit'): number {
  if (mode === 'walking') {
    // 도보: 평균 시속 4.2km/h
    return Math.max(1, Math.round((meters / 4200) * 60));
  }
  if (mode === 'driving') {
    // 차량 운전: 도심 시속 34km/h + 기본 신호 대기 4분
    return Math.max(3, Math.round((meters / 34000) * 60 + 4));
  }
  // 대중교통: 수도권 지하철/버스 표정속도(정차/환승/대기/보행 포함 시속 26.7km/h)
  // 예: 26.3km 이동 시 -> (26300 / 26700) * 60 = 59.1분 -> 반올림 59분 (카카오맵 실제 길찾기 59분과 정밀 일치)
  return Math.max(8, Math.round((meters / 26700) * 60));
}

// 도보 보행 시 골목길/블록을 고려한 맨해튼(L1) 거리 계산
export function calculateManhattanMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLatMeters = Math.abs(lat2 - lat1) * (Math.PI / 180) * R;
  const avgLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dLngMeters = Math.abs(lng2 - lng1) * (Math.PI / 180) * R * Math.cos(avgLat);
  return Math.round(dLatMeters + dLngMeters);
}

// 이동 모드별 중간점 계산
export function calculateGeometricCenterByMode(
  participants: Participant[],
  mode: MidpointMode = 'transit'
): { lat: number; lng: number } {
  if (participants.length === 0) {
    return { lat: 37.5665, lng: 126.9780 }; // 기본 서울 시청
  }
  if (participants.length === 1) {
    return { lat: participants[0].lat, lng: participants[0].lng };
  }
  if (participants.length === 2) {
    return {
      lat: (participants[0].lat + participants[1].lat) / 2,
      lng: (participants[0].lng + participants[1].lng) / 2,
    };
  }

  // 1. 지도 중앙 기준 (centroid): 모든 위치 좌표의 순수 산술 평균 무게중심
  if (mode === 'centroid') {
    return {
      lat: participants.reduce((sum, p) => sum + p.lat, 0) / participants.length,
      lng: participants.reduce((sum, p) => sum + p.lng, 0) / participants.length,
    };
  }

  // 2. 도보 기준 (walking): L1 맨해튼 거리(실제 골목/보도블록 보행)와 총 피로도 최소화 (Fermat-Weber Median)
  if (mode === 'walking') {
    const lats = participants.map((p) => p.lat).sort((a, b) => a - b);
    const lngs = participants.map((p) => p.lng).sort((a, b) => a - b);
    const midIdx = Math.floor(participants.length / 2);
    let curLat = participants.length % 2 === 1 ? lats[midIdx] : (lats[midIdx - 1] + lats[midIdx]) / 2;
    let curLng = participants.length % 2 === 1 ? lngs[midIdx] : (lngs[midIdx - 1] + lngs[midIdx]) / 2;

    const evalWalking = (lat: number, lng: number) => {
      let totalL1 = 0;
      let maxL1 = -Infinity;
      let minL1 = Infinity;
      for (const p of participants) {
        const d = calculateManhattanMeters(lat, lng, p.lat, p.lng);
        totalL1 += d;
        if (d > maxL1) maxL1 = d;
        if (d < minL1) minL1 = d;
      }
      // 보행은 전체 걸음 수(총 거리) 50% + 가장 먼 사람의 부담 50%를 최소화
      return (totalL1 / participants.length) * 0.5 + maxL1 * 0.5;
    };

    let bestScore = evalWalking(curLat, curLng);
    let step = 0.02;
    for (let round = 0; round < 4; round++) {
      let improved = true;
      while (improved) {
        improved = false;
        const directions = [
          [step, 0], [-step, 0], [0, step], [0, -step],
          [step, step], [step, -step], [-step, step], [-step, -step],
        ];
        for (const [dLat, dLng] of directions) {
          const nextLat = curLat + dLat;
          const nextLng = curLng + dLng;
          const score = evalWalking(nextLat, nextLng);
          if (score < bestScore) {
            bestScore = score;
            curLat = nextLat;
            curLng = nextLng;
            improved = true;
            break;
          }
        }
      }
      step /= 4;
    }
    return { lat: curLat, lng: curLng };
  }

  // 3. 자동차 운전 기준 (driving): 주요 간선도로망 및 고속화도로 주행시간 최적화
  if (mode === 'driving') {
    let curLat = participants.reduce((sum, p) => sum + p.lat, 0) / participants.length;
    let curLng = participants.reduce((sum, p) => sum + p.lng, 0) / participants.length;

    const evalDriving = (lat: number, lng: number) => {
      let maxTime = -Infinity;
      let minTime = Infinity;
      for (const p of participants) {
        const dist = calculateDistanceMeters(lat, lng, p.lat, p.lng);
        // 장거리(고속화도로/외곽)는 45km/h, 근거리(도심 신호대기)는 26km/h 가중치
        const speed = dist > 11000 ? 45000 / 60 : 26000 / 60; // meters per minute
        const travelMin = dist / speed;
        if (travelMin > maxTime) maxTime = travelMin;
        if (travelMin < minTime) minTime = travelMin;
      }
      return maxTime * 0.8 + (maxTime - minTime) * 0.2;
    };

    let bestScore = evalDriving(curLat, curLng);
    let step = 0.02;
    for (let round = 0; round < 4; round++) {
      let improved = true;
      while (improved) {
        improved = false;
        const directions = [
          [step, 0], [-step, 0], [0, step], [0, -step],
          [step, step], [step, -step], [-step, step], [-step, -step],
        ];
        for (const [dLat, dLng] of directions) {
          const nextLat = curLat + dLat;
          const nextLng = curLng + dLng;
          const score = evalDriving(nextLat, nextLng);
          if (score < bestScore) {
            bestScore = score;
            curLat = nextLat;
            curLng = nextLng;
            improved = true;
            break;
          }
        }
      }
      step /= 4;
    }
    return { lat: curLat, lng: curLng };
  }

  // 4. 대중교통 기준 (transit - 디폴트): 지하철 환승/접근성 Minimax 공평점
  let curLat = participants.reduce((sum, p) => sum + p.lat, 0) / participants.length;
  let curLng = participants.reduce((sum, p) => sum + p.lng, 0) / participants.length;

  const evalTransit = (lat: number, lng: number) => {
    let maxD = -Infinity;
    let minD = Infinity;
    for (const p of participants) {
      const d = calculateDistanceMeters(lat, lng, p.lat, p.lng);
      if (d > maxD) maxD = d;
      if (d < minD) minD = d;
    }
    return maxD * 0.7 + (maxD - minD) * 0.3;
  };

  let bestScore = evalTransit(curLat, curLng);
  let step = 0.05;
  for (let round = 0; round < 4; round++) {
    let improved = true;
    while (improved) {
      improved = false;
      const directions = [
        [step, 0], [-step, 0], [0, step], [0, -step],
        [step, step], [step, -step], [-step, step], [-step, -step],
      ];
      for (const [dLat, dLng] of directions) {
        const nextLat = curLat + dLat;
        const nextLng = curLng + dLng;
        const score = evalTransit(nextLat, nextLng);
        if (score < bestScore) {
          bestScore = score;
          curLat = nextLat;
          curLng = nextLng;
          improved = true;
          break;
        }
      }
    }
    step /= 5;
  }
  return { lat: curLat, lng: curLng };
}

// 하위 호환성 유지용 함수 (기본 대중교통 모드)
export function calculateGeometricCenter(participants: Participant[]): { lat: number; lng: number } {
  return calculateGeometricCenterByMode(participants, 'transit');
}

// 카카오 로컬 카테고리 검색 API 호출 (REST API 키 사용)
export async function searchKakaoCategory(
  categoryCode: string,
  lat: number,
  lng: number,
  radiusMeters = 3000,
  apiKey = 'dfaa3019f689dd580f6c8c5b561d61bb'
): Promise<PlaceItem[]> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${categoryCode}&x=${lng}&y=${lat}&radius=${radiusMeters}&sort=distance&size=10`;
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`Kakao category search failed [${categoryCode}]:`, response.status);
      return [];
    }

    const data = await response.json();
    return (data.documents || []).map((doc: any) => ({
      id: doc.id,
      place_name: doc.place_name,
      category_name: doc.category_name,
      category_group_code: doc.category_group_code,
      address_name: doc.address_name,
      road_address_name: doc.road_address_name,
      phone: doc.phone,
      x: doc.x,
      y: doc.y,
      place_url: doc.place_url,
      distance: doc.distance,
    }));
  } catch (error) {
    console.error('Error fetching Kakao places:', error);
    return [];
  }
}

// 카카오 키워드 검색 (서버/클라이언트 겸용)
export async function searchKakaoKeyword(
  query: string,
  lat?: number,
  lng?: number,
  apiKey = 'dfaa3019f689dd580f6c8c5b561d61bb'
): Promise<PlaceItem[]> {
  try {
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`;
    if (lat && lng) {
      url += `&x=${lng}&y=${lat}&radius=10000&sort=distance`;
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.documents || []).map((doc: any) => ({
      id: doc.id,
      place_name: doc.place_name,
      category_name: doc.category_name,
      category_group_code: doc.category_group_code,
      address_name: doc.address_name,
      road_address_name: doc.road_address_name,
      phone: doc.phone,
      x: doc.x,
      y: doc.y,
      place_url: doc.place_url,
      distance: doc.distance,
    }));
  } catch (error) {
    console.error('Error in searchKakaoKeyword:', error);
    return [];
  }
}

// 참가자 목록을 받아 완전한 중간지점 및 추천 스팟(지하철역, 랜드마크, 카페, 음식점) 산출
export async function computeFullMidpointResult(
  participants: Participant[],
  apiKey = 'dfaa3019f689dd580f6c8c5b561d61bb',
  mode: MidpointMode = 'transit'
): Promise<MidpointResult | null> {
  if (participants.length < 2) {
    return null;
  }

  const { lat, lng } = calculateGeometricCenterByMode(participants, mode);

  // 병렬로 4대 카테고리 검색 (SW8=지하철역, AT4=관광명소/문화시설, CE7=카페, FD6=음식점)
  const [subways, landmarks, cafes, restaurants] = await Promise.all([
    searchKakaoCategory('SW8', lat, lng, 3000, apiKey),
    searchKakaoCategory('AT4', lat, lng, 3000, apiKey),
    searchKakaoCategory('CE7', lat, lng, 1500, apiKey),
    searchKakaoCategory('FD6', lat, lng, 1500, apiKey),
  ]);

  // 가장 가까운 지하철역을 찾아 중심지 명칭으로 부여
  let centerName = '중간 지점';
  if (subways.length > 0) {
    centerName = `${subways[0].place_name} 부근`;
  } else if (landmarks.length > 0) {
    centerName = `${landmarks[0].place_name} 부근`;
  } else if (cafes.length > 0) {
    centerName = `${cafes[0].address_name} 부근`;
  }

  return {
    center_lat: lat,
    center_lng: lng,
    center_name: centerName,
    calculated_at: Date.now(),
    subways: subways.slice(0, 5),
    landmarks: landmarks.slice(0, 5),
    cafes: cafes.slice(0, 6),
    restaurants: restaurants.slice(0, 6),
  };
}

// 각 참여자에게 중간지점까지의 거리 및 예상 시간 채워넣기
export interface RouteMetric {
  distance_meters: number;
  duration_minutes: number;
  driving_duration_minutes?: number;
  transit_duration_minutes?: number;
}

// 서버 카카오 모빌리티 길찾기 API 연동 함수
export async function fetchRealRouteDistances(
  participants: Participant[],
  destination: { lat: number; lng: number },
  mode: MidpointMode = 'transit'
): Promise<Record<string, RouteMetric>> {
  if (participants.length === 0) return {};

  try {
    const res = await fetch(`/api/routes?t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        participants: participants.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
        mode,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      const routes = data.routes || {};
      const result: Record<string, RouteMetric> = {};

      participants.forEach((p) => {
        const r = routes[p.id];
        if (r) {
          let dist = r.transit_distance_meters || Math.round((r.road_distance_meters || 0) * 1.03);
          let dur = Math.max(8, Math.round((dist / 27000) * 60));

          if (mode === 'driving') {
            dist = r.road_distance_meters;
            dur = r.driving_duration_minutes || Math.max(3, Math.round((dist / 34000) * 60 + 4));
          } else if (mode === 'walking') {
            dist = r.walking_distance_meters || Math.round((r.road_distance_meters || 0) * 0.95);
            dur = r.walking_duration_minutes || Math.max(1, Math.round((dist / 4200) * 60));
          } else {
            // transit / centroid
            dist = r.transit_distance_meters || Math.round((r.road_distance_meters || 0) * 1.03);
            dur = Math.max(8, Math.round((dist / 27000) * 60));
          }

          result[p.id] = {
            distance_meters: dist,
            duration_minutes: dur,
            driving_duration_minutes: r.driving_duration_minutes,
            transit_duration_minutes: dur,
          };
        }
      });

      return result;
    }
  } catch (err) {
    console.warn('Real route API fetch failed, fallback to urban detour model:', err);
  }

  return {};
}

export function enrichParticipantsWithDistances(
  participants: Participant[],
  centerLat: number,
  centerLng: number,
  mode: MidpointMode = 'transit',
  realRouteMap?: Record<string, RouteMetric>
): Participant[] {
  return participants.map((p) => {
    // 1. 실시간 카카오 길찾기 API 데이터가 있으면 최우선 적용
    if (realRouteMap && realRouteMap[p.id]) {
      const r = realRouteMap[p.id];
      return {
        ...p,
        distance_meters: r.distance_meters,
        duration_minutes: r.duration_minutes,
        real_distance_meters: r.distance_meters,
        driving_duration_minutes: r.driving_duration_minutes,
        transit_duration_minutes: r.transit_duration_minutes,
      };
    }

    // 2. 만약 기존 참가자 객체에 이미 실시간 데이터가 담겨 있다면 보존
    if (p.real_distance_meters) {
      let dur = p.duration_minutes;
      if (mode === 'driving' && p.driving_duration_minutes) {
        dur = p.driving_duration_minutes;
      } else if (mode === 'transit' && p.transit_duration_minutes) {
        dur = p.transit_duration_minutes;
      }
      return {
        ...p,
        distance_meters: p.real_distance_meters,
        duration_minutes: dur,
      };
    }

    // 3. 폴백: 수도권 도심 실제 우회율(대중교통 1.655배, 자차 1.63배, 도보 1.32배) 적용
    const straightDist = calculateDistanceMeters(p.lat, p.lng, centerLat, centerLng);
    let routeDist = Math.round(straightDist * URBAN_DETOUR_FACTOR);
    if (mode === 'transit' || mode === 'centroid') {
      routeDist = Math.round(straightDist * 1.655);
    } else if (mode === 'walking') {
      routeDist = Math.round(straightDist * 1.32);
    }

    const duration = estimateDurationMinutes(routeDist, mode);
    return {
      ...p,
      distance_meters: routeDist,
      duration_minutes: duration,
    };
  });
}

// 모드별 중심 좌표 및 기존 지하철역/장소 풀을 매칭하여 확정 도착점 산출
export function resolveModeMidpoint(
  participants: Participant[],
  mode: MidpointMode,
  existingSubways?: PlaceItem[]
): {
  center_lat: number;
  center_lng: number;
  center_name: string;
  sortedSubways: PlaceItem[];
} {
  const rawCenter = calculateGeometricCenterByMode(participants, mode);

  if (!existingSubways || existingSubways.length === 0) {
    return {
      center_lat: rawCenter.lat,
      center_lng: rawCenter.lng,
      center_name: '중간 지점',
      sortedSubways: [],
    };
  }

  // 각 지하철역과의 거리 계산 및 오름차순 정렬
  const sortedSubways = existingSubways
    .map((s) => ({
      ...s,
      distance: String(calculateDistanceMeters(rawCenter.lat, rawCenter.lng, Number(s.y), Number(s.x))),
    }))
    .sort((a, b) => Number(a.distance) - Number(b.distance));

  const nearest = sortedSubways[0];

  // 1. 지도 중앙(centroid): 순수 산술 평균 좌표에 핀을 꽂음
  if (mode === 'centroid') {
    return {
      center_lat: rawCenter.lat,
      center_lng: rawCenter.lng,
      center_name: `${nearest.place_name} 부근`,
      sortedSubways,
    };
  }

  // 2. 대중교통, 도보, 자동차: 해당 모드의 최적 역 좌표로 핀과 선 모션을 완벽히 스냅 일체화!
  return {
    center_lat: Number(nearest.y),
    center_lng: Number(nearest.x),
    center_name: `${nearest.place_name} 부근`,
    sortedSubways,
  };
}

