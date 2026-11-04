// The portal may intercept window messages while checking startup. This owned,
// same-origin frame can prepare directly without depending on that transport.
// No readiness is inferred from load alone: await the child's real asset barrier.
export async function prepareOwnedBattleFrame(frame, settings, origin) {
  const child = frame.contentWindow;
  if (!child || child.location.origin !== origin)
    throw Error('Battle frame origin changed');
  const preparation = child.ShapeShiftBattlePreparation;
  if (typeof preparation?.prepare !== 'function')
    throw Error('Battle preparation runtime unavailable');
  const ready = await preparation.prepare(settings);
  if (frame.contentWindow !== child || child.location.origin !== origin)
    throw Error('Battle frame navigated during preparation');
  if (ready !== true) throw Error('Battle assets unavailable');
  return true;
}
