import { Env } from '../../../_types';
import { computeMidpointResultServer } from '../../../_calc';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { params, request, env } = context;
    const roomId = params.roomId as string;
    const body: any = await request.json();
    const { name, lat, lng, address_name } = body;

    if (!name || lat === undefined || lng === undefined) {
      return new Response(JSON.stringify({ error: '참여자 이름과 위치는 필수입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const participantId = 'pid-' + crypto.randomUUID();
    const now = Date.now();

    // 참여자 추가
    await env.DB.prepare(
      `INSERT INTO participants (id, room_id, name, lat, lng, address_name, is_host, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(participantId, roomId, name, lat, lng, address_name || '위치 미지정', now).run();

    // 현재 방의 모든 참여자 목록 조회
    const { results: allParticipants } = await env.DB.prepare(
      `SELECT * FROM participants WHERE room_id = ? ORDER BY is_host DESC, joined_at ASC`
    ).bind(roomId).all();

    // 2명 이상이면 자동으로 중간지점 산출 및 방 정보 갱신
    let midpointResult = null;
    const kakaoKey = env.KAKAO_REST_API_KEY || 'dfaa3019f689dd580f6c8c5b561d61bb';

    if (allParticipants && allParticipants.length >= 2) {
      midpointResult = await computeMidpointResultServer(allParticipants, kakaoKey);
      if (midpointResult) {
        await env.DB.prepare(
          `UPDATE rooms SET status = 'calculated', midpoint_result = ? WHERE id = ?`
        ).bind(JSON.stringify(midpointResult), roomId).run();
      }
    }

    const room: any = await env.DB.prepare(`SELECT * FROM rooms WHERE id = ?`).bind(roomId).first();

    return new Response(
      JSON.stringify({
        participant_id: participantId,
        room: {
          id: room.id,
          title: room.title,
          status: room.status,
          created_at: room.created_at,
          expires_at: room.expires_at,
          midpoint_result: midpointResult,
          participants: allParticipants,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error adding participant:', error);
    return new Response(JSON.stringify({ error: error.message || '참여자 등록 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
