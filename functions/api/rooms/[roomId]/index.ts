import { Env } from '../../_types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context;
    const roomId = params.roomId as string;

    if (!roomId) {
      return new Response(JSON.stringify({ error: '방 ID가 지정되지 않았습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 방 조회
    const room: any = await env.DB.prepare(
      `SELECT * FROM rooms WHERE id = ?`
    ).bind(roomId).first();

    if (!room) {
      return new Response(JSON.stringify({ error: '존재하지 않는 방입니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 만료 확인 (3일)
    if (Date.now() > room.expires_at) {
      return new Response(JSON.stringify({ error: '만료된 모임 방입니다. (생성 후 3일 경과)' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 참여자 목록 조회
    const { results: participants } = await env.DB.prepare(
      `SELECT * FROM participants WHERE room_id = ? ORDER BY is_host DESC, joined_at ASC`
    ).bind(roomId).all();

    let midpointResult = null;
    if (room.midpoint_result) {
      try {
        midpointResult = JSON.parse(room.midpoint_result);
      } catch (e) {
        // ignore
      }
    }

    return new Response(
      JSON.stringify({
        id: room.id,
        title: room.title,
        status: room.status,
        created_at: room.created_at,
        expires_at: room.expires_at,
        midpoint_result: midpointResult,
        participants: participants || [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error fetching room:', error);
    return new Response(JSON.stringify({ error: error.message || '방 조회 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// 방 삭제 (방장 전용 모임 삭제)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context;
    const roomId = params.roomId as string;

    await env.DB.batch([
      env.DB.prepare(`DELETE FROM participants WHERE room_id = ?`).bind(roomId),
      env.DB.prepare(`DELETE FROM rooms WHERE id = ?`).bind(roomId),
    ]);

    return new Response(JSON.stringify({ success: true, message: '모임 방이 삭제되었습니다.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || '방 삭제 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
