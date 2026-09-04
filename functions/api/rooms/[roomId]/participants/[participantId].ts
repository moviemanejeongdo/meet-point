import { Env } from '../../../../_types';
import { computeMidpointResultServer } from '../../../../_calc';

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const { params, request, env } = context;
    const roomId = params.roomId as string;
    const participantId = params.participantId as string;
    const body: any = await request.json();
    const { name, lat, lng, address_name } = body;

    // 위치 갱신
    await env.DB.prepare(
      `UPDATE participants
       SET name = COALESCE(?, name),
           lat = COALESCE(?, lat),
           lng = COALESCE(?, lng),
           address_name = COALESCE(?, address_name)
       WHERE id = ? AND room_id = ?`
    ).bind(name || null, lat ?? null, lng ?? null, address_name || null, participantId, roomId).run();

    // 전체 참여자 재조회 후 중간지점 재계산
    const { results: allParticipants } = await env.DB.prepare(
      `SELECT * FROM participants WHERE room_id = ? ORDER BY is_host DESC, joined_at ASC`
    ).bind(roomId).all();

    const kakaoKey = env.KAKAO_REST_API_KEY || 'dfaa3019f689dd580f6c8c5b561d61bb';
    let midpointResult = null;

    if (allParticipants && allParticipants.length >= 2) {
      midpointResult = await computeMidpointResultServer(allParticipants, kakaoKey);
      await env.DB.prepare(
        `UPDATE rooms SET status = 'calculated', midpoint_result = ? WHERE id = ?`
      ).bind(JSON.stringify(midpointResult), roomId).run();
    } else {
      await env.DB.prepare(
        `UPDATE rooms SET status = 'gathering', midpoint_result = NULL WHERE id = ?`
      ).bind(roomId).run();
    }

    const room: any = await env.DB.prepare(`SELECT * FROM rooms WHERE id = ?`).bind(roomId).first();

    return new Response(
      JSON.stringify({
        id: room.id,
        title: room.title,
        status: room.status,
        created_at: room.created_at,
        expires_at: room.expires_at,
        midpoint_result: midpointResult,
        participants: allParticipants,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || '참여자 정보 수정 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context;
    const roomId = params.roomId as string;
    const participantId = params.participantId as string;

    await env.DB.prepare(`DELETE FROM participants WHERE id = ? AND room_id = ?`).bind(participantId, roomId).run();

    // 남은 참여자 재조회
    const { results: allParticipants } = await env.DB.prepare(
      `SELECT * FROM participants WHERE room_id = ? ORDER BY is_host DESC, joined_at ASC`
    ).bind(roomId).all();

    const kakaoKey = env.KAKAO_REST_API_KEY || 'dfaa3019f689dd580f6c8c5b561d61bb';
    let midpointResult = null;

    if (allParticipants && allParticipants.length >= 2) {
      midpointResult = await computeMidpointResultServer(allParticipants, kakaoKey);
      await env.DB.prepare(
        `UPDATE rooms SET status = 'calculated', midpoint_result = ? WHERE id = ?`
      ).bind(JSON.stringify(midpointResult), roomId).run();
    } else {
      await env.DB.prepare(
        `UPDATE rooms SET status = 'gathering', midpoint_result = NULL WHERE id = ?`
      ).bind(roomId).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || '참여자 삭제 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
