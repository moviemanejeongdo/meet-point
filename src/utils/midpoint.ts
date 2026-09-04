import type { Participant, MidpointResult, PlaceItem } from '../types';

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

// 도심 대중교통/차량 기준 대략적인 예상 소요시간(분) 추정
export function estimateDurationMinutes(meters: number): number {
  // 평균 도심 이동 속도 22km/h 기준 + 기본 대기/도보 5분
  const travelMinutes = (meters / 22000) * 60;
  return Math.max(5, Math.round(travelMinutes + 5));
}

// 참가자 좌표들의 공평한 최적 중간점 계산 (최대 이동거리 최소화 + 이동거리 편차 최소화)
export function calculateGeometricCenter(participants: Participant[]): { lat: number; lng: number } {
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

  // 1. 산술 평균을 시작점으로 설정
  let curLat = participants.reduce((sum, p) => sum + p.lat, 0) / participants.length;
  let curLng = participants.reduce((sum, p) => sum + p.lng, 0) / participants.length;

  // 목적 함수: 최대 이동거리 최소화(70%) + 이동거리 편차 최소화(30%)
  const evaluate = (lat: number, lng: number) => {
    let maxD = -Infinity;
    let minD = Infinity;
    for (const p of participants) {
      const d = calculateDistanceMeters(lat, lng, p.lat, p.lng);
      if (d > maxD) maxD = d;
      if (d < minD) minD = d;
    }
    return maxD * 0.7 + (maxD - minD) * 0.3;
  };

  let bestScore = evaluate(curLat, curLng);

  // 다단계 적응형 방향 탐색으로 공평 중심점 수렴
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
        const score = evaluate(nextLat, nextLng);
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
  apiKey = 'dfaa3019f689dd580f6c8c5b561d61bb'
): Promise<MidpointResult | null> {
  if (participants.length < 2) {
    return null;
  }

  const { lat, lng } = calculateGeometricCenter(participants);

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
export function enrichParticipantsWithDistances(
  participants: Participant[],
  centerLat: number,
  centerLng: number
): Participant[] {
  return participants.map((p) => {
    const dist = calculateDistanceMeters(p.lat, p.lng, centerLat, centerLng);
    const duration = estimateDurationMinutes(dist);
    return {
      ...p,
      distance_meters: dist,
      duration_minutes: duration,
    };
  });
}
