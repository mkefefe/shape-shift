// Startup has already prepared assets and painted the DOM before calling this.
// Give a visible host two frames to present it. A host withholding native RAF
// must not keep the ready handshake waiting forever. These are browser timers,
// not the paused gameplay scheduler; this helper never resumes gameplay.
export async function waitForPortalStartupPaint(paint,host=window){
  await paint?.();
  return new Promise(resolve=>{
    let settled=false,frame=null,timer=null;
    const finish=()=>{
      if(settled)return;
      settled=true;
      if(timer!==null)host.clearTimeout(timer);
      if(frame!==null)host.cancelAnimationFrame(frame);
      resolve();
    };
    timer=host.setTimeout(finish,250);
    frame=host.requestAnimationFrame(()=>{
      if(settled)return;
      frame=host.requestAnimationFrame(finish);
    });
  });
}
