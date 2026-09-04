import type { Room, Participant, CreateRoomResponse, AddParticipantResponse } from '../types';
import { computeFullMidpointResult, enrichParticipantsWithDistances } from '../utils/midpoint';

const LOCAL_STORAGE_KEY_PREFIX = 'meetpoint_room_';
const MY_PARTICIPANT_ID_PREFIX = 'meetpoint_my_pid_';

// 내 로컬 participantId 저장/조회
export function getStoredParticipantId(roomId: string): string | null {
  return localStorage.getItem(`${MY_PARTICIPANT_ID_PREFIX}${roomId}`);
}

export function setStoredParticipantId(roomId: string, participantId: string): void {
  localStorage.setItem(`${MY_PARTICIPANT_ID_PREFIX}${roomId}`, participantId);
}

// 1. 방 생성 API
export async function createRoom(title: string, hostName: string, hostLat: number, hostLng: number, hostAddress: string): Promise<CreateRoomResponse> {
  const payload = {
    title,
    host_name: hostName,
    host_lat: hostLat,
    host_lng: hostLng,
    host_address: hostAddress,
  };

  try {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setStoredParticipantId(data.room_id, data.participant_id);
      return data;
    }
  } catch (err) {
    console.log('Server API not reachable, using local storage fallback for dev...');
  }

  // Fallback: 로컬 스토리지 시뮬레이션
  const roomId = 'meet-' + Math.random().toString(36).substring(2, 8);
  const hostToken = 'token-' + Math.random().toString(36).substring(2, 10);
  const hostPid = 'pid-' + Math.random().toString(36).substring(2, 10);

  const initialHost: Participant = {
    id: hostPid,
    room_id: roomId,
    name: hostName,
    lat: hostLat,
    lng: hostLng,
    address_name: hostAddress,
    is_host: 1,
    joined_at: Date.now(),
  };

  const newRoom: Room = {
    id: roomId,
    title: title || '즐거운 모임',
    status: 'gathering',
    created_at: Date.now(),
    expires_at: Date.now() + 24 * 60 * 60 * 1000,
    participants: [initialHost],
    midpoint_result: null,
  };

  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomId}`, JSON.stringify(newRoom));
  setStoredParticipantId(roomId, hostPid);

  return {
    room_id: roomId,
    host_token: hostToken,
    participant_id: hostPid,
  };
}

// 2. 방 정보 및 참가자 목록 조회 API
export async function getRoom(roomId: string): Promise<Room | null> {
  try {
    const res = await fetch(`/api/rooms/${roomId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // ignore
  }

  // Fallback: 로컬 스토리지 조회
  const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomId}`);
  if (!raw) return null;

  try {
    const room: Room = JSON.parse(raw);
    return room;
  } catch {
    return null;
  }
}

// 3. 참가자 추가 API (참가자 수가 2명 이상이면 자동으로 중간지점 즉시 계산 및 갱신)
export async function addParticipant(
  roomId: string,
  name: string,
  lat: number,
  lng: number,
  addressName: string
): Promise<AddParticipantResponse> {
  const payload = {
    name,
    lat,
    lng,
    address_name: addressName,
  };

  try {
    const res = await fetch(`/api/rooms/${roomId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setStoredParticipantId(roomId, data.participant_id);
      return data;
    }
  } catch (err) {
    // ignore
  }

  // Fallback: 로컬 스토리지 처리 및 실시간 중간지점 자동 계산
  const room = await getRoom(roomId);
  if (!room) {
    throw new Error('방을 찾을 수 없습니다.');
  }

  const newPid = 'pid-' + Math.random().toString(36).substring(2, 10);
  const newParticipant: Participant = {
    id: newPid,
    room_id: roomId,
    name,
    lat,
    lng,
    address_name: addressName,
    is_host: 0,
    joined_at: Date.now(),
  };

  const updatedParticipants = [...room.participants, newParticipant];
  let midpointResult = room.midpoint_result || null;

  // 2명 이상이면 자동으로 중간지점 및 추천 스팟 즉각 산출
  if (updatedParticipants.length >= 2) {
    midpointResult = await computeFullMidpointResult(updatedParticipants);
    if (midpointResult) {
      room.status = 'calculated';
    }
  }

  const finalParticipants = midpointResult
    ? enrichParticipantsWithDistances(updatedParticipants, midpointResult.center_lat, midpointResult.center_lng)
    : updatedParticipants;

  const updatedRoom: Room = {
    ...room,
    participants: finalParticipants,
    midpoint_result: midpointResult,
  };

  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomId}`, JSON.stringify(updatedRoom));
  setStoredParticipantId(roomId, newPid);

  return {
    participant_id: newPid,
    room: updatedRoom,
  };
}

// 4. 참가자 위치 수정 API
export async function updateParticipantLocation(
  roomId: string,
  participantId: string,
  lat: number,
  lng: number,
  addressName: string
): Promise<Room> {
  try {
    const res = await fetch(`/api/rooms/${roomId}/participants/${participantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, address_name: addressName }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // ignore
  }

  // Fallback
  const room = await getRoom(roomId);
  if (!room) throw new Error('방을 찾을 수 없습니다.');

  const updatedParticipants = room.participants.map((p) =>
    p.id === participantId ? { ...p, lat, lng, address_name: addressName } : p
  );

  let midpointResult = room.midpoint_result || null;
  if (updatedParticipants.length >= 2) {
    midpointResult = await computeFullMidpointResult(updatedParticipants);
  }

  const finalParticipants = midpointResult
    ? enrichParticipantsWithDistances(updatedParticipants, midpointResult.center_lat, midpointResult.center_lng)
    : updatedParticipants;

  const updatedRoom: Room = {
    ...room,
    participants: finalParticipants,
    midpoint_result: midpointResult,
  };

  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomId}`, JSON.stringify(updatedRoom));
  return updatedRoom;
}
