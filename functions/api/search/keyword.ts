import { Env } from '../_types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    if (!query) {
      return new Response(JSON.stringify({ documents: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const kakaoKey = env.KAKAO_REST_API_KEY || 'dfaa3019f689dd580f6c8c5b561d61bb';
    const kakaoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`;

    const res = await fetch(kakaoUrl, {
      headers: {
        Authorization: `KakaoAK ${kakaoKey}`,
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: '카카오 장소 검색에 실패했습니다.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || '장소 검색 프록시 오류' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
