export function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
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

export function estimateDurationMinutes(meters: number): number {
  const travelMinutes = (meters / 22000) * 60;
  return Math.max(5, Math.round(travelMinutes + 5));
}

export function calculateGeometricCenter(participants: any[]): { lat: number; lng: number } {
  if (participants.length === 0) return { lat: 37.5665, lng: 126.978 };
  if (participants.length === 1) return { lat: participants[0].lat, lng: participants[0].lng };
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

export function enrichParticipantsWithDistances(
  participants: any[],
  centerLat: number,
  centerLng: number
): any[] {
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

export async function searchKakaoCategoryServer(
  categoryCode: string,
  lat: number,
  lng: number,
  radiusMeters = 3000,
  apiKey = 'dfaa3019f689dd580f6c8c5b561d61bb'
): Promise<any[]> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${categoryCode}&x=${lng}&y=${lat}&radius=${radiusMeters}&sort=distance&size=10`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    if (!res.ok) return [];
    const data: any = await res.json();
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
  } catch (err) {
    console.error('Category search error on server:', err);
    return [];
  }
}

export async function computeMidpointResultServer(participants: any[], apiKey: string): Promise<any | null> {
  if (participants.length < 2) return null;

  const { lat, lng } = calculateGeometricCenter(participants);

  const [subways, landmarks, cafes, restaurants] = await Promise.all([
    searchKakaoCategoryServer('SW8', lat, lng, 3000, apiKey),
    searchKakaoCategoryServer('AT4', lat, lng, 3000, apiKey),
    searchKakaoCategoryServer('CE7', lat, lng, 1500, apiKey),
    searchKakaoCategoryServer('FD6', lat, lng, 1500, apiKey),
  ]);

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
