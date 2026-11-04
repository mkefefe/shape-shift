// Prefer the SDK owned by this document. A portal's parent is cross-origin;
// only legacy same-origin game shells may supply the initialized promise.
export function findPlaygamaHost(host = globalThis.window) {
  const ownsBridge = candidate => typeof candidate?.ShapeShiftBridgeReady?.then === 'function';
  if (ownsBridge(host)) return host;
  try {
    if (host.parent !== host && ownsBridge(host.parent)) return host.parent;
  } catch {} // An unrelated portal parent must never be required or reloaded.
  throw new Error('Open the game from index.html');
}
