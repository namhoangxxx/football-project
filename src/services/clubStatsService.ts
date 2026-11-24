import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { Match } from '../types/football';
import { TeamLineup } from '../types/matchDetail';
import { normalizePositionCode, PlayerPositionCode } from '../utils/playerPosition';
import { getClubSearchVariants, isSameClubName, isSamePlayerName } from '../utils/textNormalize';

export interface ClubSeasonSummary {
  played: number;
  won: number;
  draw: number;
  lost: number;
  gf: number;
  ga: number;
  cleanSheets: number;
  homeRecord: string;
  awayRecord: string;
}

export interface ClubPlayerItem {
  id: number;
  name: string;
  number: number;
  pos: PlayerPositionCode;
  appearances: number;
  nationality?: string;
  age?: number;
  photoUrl?: string;
}

export const computeClubSeasonSummary = (
  matches: Match[],
  teamId: number,
  teamName: string
): ClubSeasonSummary => {
  const finished = matches.filter((m) => m.status === 'FINISHED');
  let won = 0, draw = 0, lost = 0, gf = 0, ga = 0, cleanSheets = 0;
  let hW = 0, hD = 0, hL = 0, aW = 0, aD = 0, aL = 0;

  finished.forEach((m) => {
    const isHome =
      (teamId > 0 && m.home_team_id === teamId) ||
      isSameClubName(m.home_team, teamName);
    const scored = Number(isHome ? m.home_score : m.away_score) || 0;
    const conceded = Number(isHome ? m.away_score : m.home_score) || 0;

    gf += scored;
    ga += conceded;
    if (conceded === 0) cleanSheets++;

    if (scored > conceded) {
      won++;
      isHome ? hW++ : aW++;
    } else if (scored < conceded) {
      lost++;
      isHome ? hL++ : aL++;
    } else {
      draw++;
      isHome ? hD++ : aD++;
    }
  });

  return {
    played: finished.length,
    won,
    draw,
    lost,
    gf,
    ga,
    cleanSheets,
    homeRecord: `${hW}T - ${hD}H - ${hL}B`,
    awayRecord: `${aW}T - ${aD}H - ${aL}B`,
  };
};

export const fetchClubSquadFromLineups = async (
  matches: Match[],
  teamName: string
): Promise<ClubPlayerItem[]> => {
  const variants = getClubSearchVariants(teamName);
  const orFilter = variants
    .map((v) => `team_name.ilike.*${encodeURIComponent(v)}*`)
    .join(',');

  const squadList: ClubPlayerItem[] = [];

  // 1. Đọc từ player_season_summary_view (hoặc fallback bảng players) để không bị cắt 1000 dòng
  try {
    let pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/player_season_summary_view?or=(${orFilter})&select=*`,
      { headers: SUPABASE_HEADERS }
    );
    let usedView = pRes.ok;

    if (!pRes.ok) {
      usedView = false;
      pRes = await fetch(
        `${SUPABASE_URL}/rest/v1/players?or=(${orFilter})&select=*`,
        { headers: SUPABASE_HEADERS }
      );
    }

    if (pRes.ok) {
      const rawRows = await pRes.json();
      const pRows = Array.isArray(rawRows)
        ? rawRows.filter((p: any) => isSameClubName(p.team_name, teamName))
        : [];

      const appCount = new Map<number, number>();
      if (!usedView && pRows.length > 0) {
        const ids = pRows.map((p: any) => p.player_id).join(',');
        const sRes = await fetch(
          `${SUPABASE_URL}/rest/v1/player_match_stats?player_id=in.(${ids})&select=player_id&limit=5000`,
          { headers: SUPABASE_HEADERS }
        );
        if (sRes.ok) {
          const sRows = await sRes.json();
          sRows.forEach((r: { player_id: number }) => {
            appCount.set(r.player_id, (appCount.get(r.player_id) || 0) + 1);
          });
        }
      }

      pRows.forEach((p: any) => {
        const pid = Number(p.player_id);
        const apps = usedView
          ? Number(p.appearances) || (Number(p.starts) || 0) + (Number(p.sub_appearances) || 0)
          : appCount.get(pid) || 0;

        squadList.push({
          id: pid,
          name: p.name,
          number: p.jersey_number || 0,
          pos: normalizePositionCode(p.position_code),
          appearances: apps,
          nationality: p.nationality || undefined,
          age: p.age || undefined,
          photoUrl: p.photo_url || undefined,
        });
      });
    }
  } catch {
    // Tiếp tục quét match_lineups bên dưới
  }

  // 2. Quét bổ sung tới 38 trận từ match_lineups để cập nhật số trận & cầu thủ mới
  try {
    const eventIds = matches
      .filter((m) => m.status === 'FINISHED')
      .slice(0, 38)
      .map((m) => String(m.event_id).trim())
      .filter(Boolean);

    if (eventIds.length > 0) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/match_lineups?event_id=in.(${eventIds.join(',')})&select=lineups`,
        { headers: SUPABASE_HEADERS }
      );
      if (res.ok) {
        const rows = await res.json();
        const lineupAgg = new Map<string, ClubPlayerItem>();

        rows.forEach((row: { lineups?: TeamLineup[] }) => {
          const teamLineup = row.lineups?.find((l) =>
            isSameClubName(l.team?.name, teamName)
          );
          if (!teamLineup) return;

          [...(teamLineup.startXI || []), ...(teamLineup.substitutes || [])].forEach(
            ({ player }) => {
              if (!player?.name) return;
              const key = player.name.toLowerCase();
              const existing = lineupAgg.get(key);
              if (existing) {
                existing.appearances += 1;
              } else {
                lineupAgg.set(key, {
                  id: player.id || lineupAgg.size + 100000,
                  name: player.name,
                  number: player.number || 0,
                  pos: normalizePositionCode(player.pos),
                  appearances: 1,
                });
              }
            }
          );
        });

        for (const lPlayer of lineupAgg.values()) {
          const matchInSquad = squadList.find((s) => isSamePlayerName(s.name, lPlayer.name));
          if (matchInSquad) {
            if (matchInSquad.appearances === 0) {
              matchInSquad.appearances = lPlayer.appearances;
            }
            if (!matchInSquad.number && lPlayer.number) {
              matchInSquad.number = lPlayer.number;
            }
          } else {
            squadList.push(lPlayer);
          }
        }
      }
    }
  } catch {
    // Giữ danh sách đã lấy được
  }

  return squadList;
};