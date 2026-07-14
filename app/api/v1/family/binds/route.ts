// ============================================================
// GET /api/v1/family/binds
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · get_binds
// 查询当前用户相关的 active 绑定：同时按 elder_id 与 family_id 查询，
// 按 id 去重后返回。
// 返回：FamilyBindResponse[]
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import {
  toBindResponse,
  type FamilyBindRow,
  type FamilyPeerRow,
} from '../_lib';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('oc_elder_family_binds')
      .select('*')
      .or(`elder_id.eq.${user_id},family_id.eq.${user_id}`)
      .eq('status', 'active');

    if (error) {
      console.error('[GET /family/binds] 查询失败:', error);
      throw new ApiError(500, '获取绑定列表失败');
    }

    const rows = (data ?? []) as FamilyBindRow[];
    const peerIds = rows
      .map((row) => row.elder_id === user_id ? row.family_id : row.elder_id)
      .filter((id): id is string => Boolean(id));
    const peersById = new Map<string, FamilyPeerRow>();

    if (peerIds.length > 0) {
      const { data: peers, error: peersError } = await supabase
        .from('oc_users')
        .select('id, name, phone, avatar_url, last_active_at, role')
        .in('id', [...new Set(peerIds)]);
      if (peersError) {
        console.error('[GET /family/binds] 联系人查询失败:', peersError);
        throw new ApiError(500, '获取联系人资料失败');
      }
      for (const peer of peers ?? []) peersById.set(peer.id, peer);
    }

    return withPrivateNoStore(
      NextResponse.json(rows.map((row) => {
        const peerId = row.elder_id === user_id ? row.family_id : row.elder_id;
        return toBindResponse(row, peerId ? peersById.get(peerId) ?? null : null);
      })),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
