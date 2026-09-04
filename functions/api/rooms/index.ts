import { Env } from '../_types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { title, host_name, host_lat, host_lng, host_address } = body;

    if (!host_name || host_lat === undefined || host_lng === undefined) {
      return new Response(JSON.stringify({ error: '필수 입력 정보가 누락되었습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const roomId = 'meet-' + Math.random().toString(36).substring(2, 8);
    const hostToken = 'token-' + crypto.randomUUID();
    const hostParticipantId = 'pid-' + crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 3 * 24 * 60 * 60 * 1000; // 3일(72시간) 뒤 만료

    // D1 트랜잭션 또는 배치 실행
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO rooms (id, title, host_token, status, midpoint_result, created_at, expires_at)
         VALUES (?, ?, ?, 'gathering', NULL, ?, ?)`
      ).bind(roomId, title || '모임 장소 정하기', hostToken, now, expiresAt),

      env.DB.prepare(
        `INSERT INTO participants (id, room_id, name, lat, lng, address_name, is_host, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
      ).bind(hostParticipantId, roomId, host_name, host_lat, host_lng, host_address || '위치 미지정', now),
    ]);

    return new Response(
      JSON.stringify({
        room_id: roomId,
        host_token: hostToken,
        participant_id: hostParticipantId,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error creating room:', error);
    return new Response(JSON.stringify({ error: error.message || '방 생성 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
