// 비즈니스 모델 데이터 인터페이스

export interface Participant {
  id: string;
  room_id: string;
  name: string;
  lat: number;
  lng: number;
  address_name: string;
  is_host: number; // 1 = 방장, 0 = 일반 참여자
  joined_at: number;
  distance_meters?: number; // 중간지점까지의 직선 거리
  duration_minutes?: number; // 예상 이동 시간(분)
}

export interface PlaceItem {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code?: string;
  address_name: string;
  road_address_name?: string;
  phone?: string;
  x: string; // 경도 (lng)
  y: string; // 위도 (lat)
  place_url: string;
  distance?: string;
}

export interface MidpointResult {
  center_lat: number;
  center_lng: number;
  center_name: string; // 대표 지역명 (예: "강남역 11번 출구 부근")
  calculated_at: number;
  subways: PlaceItem[];
  landmarks: PlaceItem[];
  cafes: PlaceItem[];
  restaurants: PlaceItem[];
}

export interface Room {
  id: string;
  title: string;
  status: 'gathering' | 'calculated';
  midpoint_result?: MidpointResult | null;
  created_at: number;
  expires_at: number;
  participants: Participant[];
}

export interface CreateRoomResponse {
  room_id: string;
  host_token: string;
  participant_id: string;
}

export interface AddParticipantResponse {
  participant_id: string;
  room: Room;
}
