// Portal rewards come exclusively from Playgama's completion callback.
export async function requestReward(host, timeout=120000, placement='default') {
  if (!host.ShapeShiftPlatform?.playgama || !host.ShapeShiftAds?.showRewarded) return 'unsupported';
  try { return await host.ShapeShiftAds.showRewarded(placement); }
  catch { return 'unavailable'; }
}
