import { Env } from '../../_types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { params, request, env } = context;
    const roomId = params.roomId as string;
    const body: any = await request.json();
    const inputPin = body?.pin ? String(body.pin).trim() : '';

    if (!roomId) {
      return new Response(JSON.stringify({ error: '방 ID가 지정되지 않았습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!inputPin) {
      return new Response(JSON.stringify({ error: '비밀번호를 입력해 주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 방의 host_token 조회
    const room: any = await env.DB.prepare(
      `SELECT host_token FROM rooms WHERE id = ?`
    ).bind(roomId).first();

    if (!room) {
      return new Response(JSON.stringify({ error: '존재하지 않는 모임 방입니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hostToken: string = room.host_token || '';

    // 구버전 방 (비밀번호 미설정 방) 처리
    if (!hostToken.startsWith('pin:')) {
      return new Response(
        JSON.stringify({
          error: '비밀번호가 설정되지 않은 이전 모임입니다. 신규 참가자로 등록해 주세요.',
          isLegacy: true,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // pin:1234:uuid 파싱
    const parts = hostToken.split(':');
    const savedPin = parts[1];

    if (savedPin === inputPin) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '방장 인증에 성공했습니다.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: '비밀번호가 일치하지 않습니다.',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || '인증 중 오류가 발생했습니다.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
