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

  let curLat = participants.reduce((sum, p) => sum + p.lat, 0) / participants.length;
  let curLng = participants.reduce((sum, p) => sum + p.lng, 0) / participants.length;

  for (let iter = 0; iter < 10; iter++) {
    let weightSum = 0;
    let newLat = 0;
    let newLng = 0;

    for (const p of participants) {
      const dist = calculateDistanceMeters(curLat, curLng, p.lat, p.lng);
      const weight = 1 / Math.max(10, dist);
      weightSum += weight;
      newLat += p.lat * weight;
      newLng += p.lng * weight;
    }

    if (weightSum > 0) {
      curLat = newLat / weightSum;
      curLng = newLng / weightSum;
    }
  }

  return { lat: curLat, lng: curLng };
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
