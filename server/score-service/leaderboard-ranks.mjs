// Both responses use the same verified records and deterministic tie order.
// A personal lookup never accepts a client-provided player ID or score.
const rankedSql=`WITH candidates AS (
 SELECT id,name,avatar,frame,score,runs,updated_at AS updatedAt,0 AS source FROM main_scores WHERE runs>0
 UNION ALL
 SELECT player AS id,CASE WHEN json_valid(record) THEN COALESCE(json_extract(record,'$.body.name'),'Player') ELSE 'Player' END AS name,
 '0' AS avatar,'none' AS frame,score,1 AS runs,0 AS updatedAt,1 AS source FROM scores
), deduplicated AS (
 SELECT *,ROW_NUMBER() OVER (PARTITION BY id ORDER BY score DESC,source ASC) AS identityRow FROM candidates
), ranked AS (
 SELECT d.id,COALESCE(m.name,d.name) AS name,COALESCE(m.avatar,d.avatar) AS avatar,COALESCE(m.frame,d.frame) AS frame,
 d.score,CASE WHEN m.runs>0 THEN m.runs ELSE d.runs END AS runs,COALESCE(m.updated_at,d.updatedAt) AS updatedAt,
 ROW_NUMBER() OVER (ORDER BY d.score DESC,d.id ASC) AS rank,COUNT(*) OVER () AS players
 FROM deduplicated d LEFT JOIN main_scores m ON m.id=d.id WHERE d.identityRow=1
) `;
const columns='id,name,avatar,frame,score,runs,updatedAt,rank';
const entry=row=>row?.id==null?null:Object.fromEntries(columns.split(',').map(key=>[key,row[key]]));

export async function publicRankings(db){
 const {results}=await db.prepare(rankedSql+'SELECT '+columns+',players FROM ranked ORDER BY rank LIMIT 100').all();
 return {entries:results.map(entry),players:results[0]?.players||0};
}

export async function personalRank(db,id){
 const row=await db.prepare(rankedSql+'SELECT r.*,totals.totalPlayers FROM (SELECT COUNT(*) AS totalPlayers FROM ranked) totals LEFT JOIN ranked r ON r.id=?').bind(id).first();
 const own=entry(row);
 return {entry:own,players:row?.totalPlayers||0,ranked:own!==null};
}

