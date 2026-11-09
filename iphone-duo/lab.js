(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  let actualSide = null;
  let last = null;
  let probeTick = false;

  const rounded = value => Number.isFinite(value) ? String(Math.round(value * 10) / 10) : "Unavailable";
  const dimension = (w, h) => rounded(w) + " × " + rounded(h);
  const readNumber = value => typeof value === "number" && Number.isFinite(value) ? value : null;

  // Viewport classification is intentionally conservative: Safari 27.1
  // gives outer portrait ~382px and half-inner Split View ~385px of width.
  // Width by itself cannot distinguish them.
  function classify(m) {
    const w=m.width,h=m.height,portrait=h>=w,shape=portrait?"Portrait window":"Landscape window";
    const landscapeReported=/^landscape/i.test(m.screenOrientation||"")
      || (m.legacyAngle!==null && Math.abs(m.legacyAngle)===90);
    const portraitReported=/^portrait/i.test(m.screenOrientation||"")
      || (m.legacyAngle!==null && Math.abs(m.legacyAngle)===0);
    if(!m.iphone)return {label:"Other browser",detail:"Not identified as an iPhone Duo window.",confidence:"Not identified",shape,half:false};
    if(!portrait && w>=800)return {label:"Inner · full screen",detail:"Unfolded, landscape",confidence:"Likely",shape,half:false};
    if(portrait && w>=580)return {label:"Inner · full screen",detail:"Unfolded, portrait",confidence:"Likely",shape,half:false};
    // In the recorded Duo, each ~469 x 669 Split View half is
    // portrait-shaped but the physical DEVICE remains landscape.
    if(portrait && w>=350 && w<=540 && landscapeReported)
      return {label:"Inner · Split View",detail:"One half of the unfolded inner screen; device orientation is landscape.",confidence:"Likely",shape,half:true};
    if(!portrait && w>=480 && w<800)
      return {label:"Outer screen",detail:"Folded, landscape",confidence:"Likely",shape,half:false};
    if(portrait && w>=350 && w<=540 && portraitReported)
      return {label:"Outer screen",detail:"Likely folded portrait; device orientation is portrait.",confidence:"Estimated",shape,half:false};
    if(portrait && w<=540)
      return {label:"Outer / inner half",detail:"Device orientation cannot distinguish folded from Split View.",confidence:"Uncertain",shape,half:false};
    return {label:"Unclassified window",detail:"Measurements do not match a known Duo layout closely enough.",confidence:"Uncertain",shape,half:false};
  }

  function inferSide(m,format) {
    if(!format.half)return {label:"Not applicable",reason:"Left/right detection applies only to unfolded inner Split View.",side:null};
    // Observed: left 0/0, right 0/84. screenX is 0 on BOTH sides.
    if(m.safeLeft<=10 && m.safeRight>=35)
      return {label:"Right side",reason:"Right safe area: "+rounded(m.safeRight)+"px. Matches the observed right-half pattern.",side:"right"};
    if(m.safeLeft<=10 && m.safeRight<=10)
      return {label:"Left side",reason:"Both horizontal safe areas are nearly zero. Matches the observed left-half pattern.",side:"left"};
    return {label:"Unknown",reason:"Safe areas differ from the observed Split View patterns.",side:null};
  }

  function collect() {
    const vv = window.visualViewport;
    // iOS can change Split View sides without emitting resize events.
    // Toggle equivalent env() declarations to request fresh style evaluation.
    const probeNode=$("safeProbe");
    probeTick=!probeTick;
    const insetStyle=edge=>probeTick
      ? "env(safe-area-inset-"+edge+",0px)"
      : "calc(env(safe-area-inset-"+edge+",0px) + 0px)";
    probeNode.style.paddingLeft=insetStyle("left");
    probeNode.style.paddingRight=insetStyle("right");
    const probe=getComputedStyle(probeNode);
    const inset = edge => parseFloat(probe.getPropertyValue("padding-" + edge)) || 0;
    const segments = window.viewport && window.viewport.segments;
    const posture = navigator.devicePosture;
    return {
      width:window.innerWidth, height:window.innerHeight,
      documentWidth:document.documentElement.clientWidth,
      documentHeight:document.documentElement.clientHeight,
      screenWidth:screen.width, screenHeight:screen.height,
      availableWidth:screen.availWidth, availableHeight:screen.availHeight,
      screenX:readNumber(window.screenX),
      screenLeft:readNumber(window.screenLeft),
      screenY:readNumber(window.screenY),
      visualWidth:vv ? vv.width : null,
      visualHeight:vv ? vv.height : null,
      offsetLeft:vv ? vv.offsetLeft : null,
      offsetTop:vv ? vv.offsetTop : null,
      scale:vv ? vv.scale : null,
      safeLeft:inset("left"),safeRight:inset("right"),
      safeTop:inset("top"),safeBottom:inset("bottom"),
      screenOrientation:screen.orientation ? screen.orientation.type : "Unavailable",
      legacyAngle:readNumber(window.orientation),
      posture:posture ? posture.type : "Unavailable",
      segments:segments ? Array.from(segments).map(s=>dimension(s.width,s.height)+" @ "+rounded(s.left)+","+rounded(s.top)) : null,
      iphone:/iPhone/i.test(navigator.userAgent),
      standalone:window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true
    };
  }

  const signalRows = [
    ["Viewport (inner)", m=>dimension(m.width,m.height)],
    ["Document viewport",m=>dimension(m.documentWidth,m.documentHeight)],
    ["Screen",m=>dimension(m.screenWidth,m.screenHeight)],
    ["Available screen",m=>dimension(m.availableWidth,m.availableHeight)],
    ["Window screenX",m=>rounded(m.screenX)],
    ["Window screenLeft",m=>rounded(m.screenLeft)],
    ["Window screenY",m=>rounded(m.screenY)],
    ["Visual viewport",m=>dimension(m.visualWidth,m.visualHeight)],
    ["Visual offset L / T",m=>rounded(m.offsetLeft)+" / "+rounded(m.offsetTop)],
    ["Visual scale",m=>rounded(m.scale)],
    ["Safe area L / R",m=>rounded(m.safeLeft)+" / "+rounded(m.safeRight)],
    ["Safe area T / B",m=>rounded(m.safeTop)+" / "+rounded(m.safeBottom)],
    ["Screen orientation API",m=>m.screenOrientation],
    ["Legacy window angle",m=>m.legacyAngle === null ? "Unavailable" : rounded(m.legacyAngle)+"°"],
    ["Device posture API",m=>m.posture],
    ["Viewport segments",m=>m.segments ? m.segments.join("; ") || "None" : "Unavailable"],
    ["Installed web app",m=>m.standalone ? "Yes" : "No"]
  ];

  function updateFeedback(side) {
    ["Left","Right"].forEach(name => $("mark"+name).setAttribute("aria-pressed", actualSide === name.toLowerCase() ? "true" : "false"));
    if (!actualSide) {
      $("feedback").textContent = "Move this window between halves. The example buttons should switch to the outside edge.";
    } else if (!side.side) {
      $("feedback").textContent = "Marked " + actualSide.toUpperCase() + " · Detection uncertain; buttons show a manual preview.";
    } else {
      $("feedback").textContent = "Marked " + actualSide.toUpperCase() + " · Automatic hint " + (side.side===actualSide?"agrees.":"disagrees. Please compare the raw signals.");
    }
  }

  function update() {
    const m = collect();
    const format = classify(m);
    const side = inferSide(m,format);
    last = {time:new Date().toISOString(),format:format.label,confidence:format.confidence,sideHint:side.label,actualSide,measurements:m};
    const rail=$("demoRail");
    // Manual selection previews a side only if auto-detection is unknown.
    const railSide=side.side||(format.half?actualSide:null);
    rail.hidden=!railSide;
    if(railSide){
      rail.dataset.side=railSide;
      $("railTag").textContent=(side.side?"Auto":"Manual preview")+" · "+railSide.toUpperCase();
    }
    $("sensorUpdate").textContent="Live scan · every 400 ms · "+rounded(m.safeLeft)+" / "+rounded(m.safeRight)+"px";
    $("display").textContent = format.label;
    $("displayDetail").textContent = format.detail;
    $("orientation").textContent = format.shape;
    $("confidence").textContent = format.confidence;
    $("side").textContent = side.label;
    $("sideReason").textContent = side.reason;
    $("quickSize").textContent = dimension(m.width,m.height);
    $("quickX").textContent = rounded(m.screenX);
    $("quickSafe").textContent = rounded(m.safeLeft)+" / "+rounded(m.safeRight);
    $("measurements").replaceChildren(...signalRows.map(([label,read])=>{
      const row=document.createElement("div");
      const dt=document.createElement("dt");
      const dd=document.createElement("dd");
      dt.textContent=label;
      dd.textContent=read(m);
      row.append(dt,dd);
      return row;
    }));
    updateFeedback(side);
  }

  $("markLeft").addEventListener("click",()=>{actualSide="left";update();});
  $("markRight").addEventListener("click",()=>{actualSide="right";update();});
  $("markNone").addEventListener("click",()=>{actualSide=null;update();});
  $("copy").addEventListener("click",async()=>{
    update();
    const report="iPhone Duo window test\n"+JSON.stringify(last,null,2);
    try{
      await navigator.clipboard.writeText(report);
      $("copyStatus").textContent="Copied. Compare reports from the left and right windows.";
    }catch{
      $("copyStatus").textContent="Clipboard unavailable. Expand All measurements and take screenshots of both windows.";
    }
  });
  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;update();});
  };
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",()=>{schedule();setTimeout(schedule,350);},{passive:true});
  window.addEventListener("pageshow",schedule,{passive:true});
  window.visualViewport?.addEventListener("resize",schedule,{passive:true});
  screen.orientation?.addEventListener?.("change",schedule);
  navigator.devicePosture?.addEventListener?.("change",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.addEventListener("focus",schedule,{passive:true});
  document.addEventListener("pointerdown",schedule,{capture:true,passive:true});
  if(typeof ResizeObserver!=="undefined")new ResizeObserver(schedule).observe($("safeProbe"));
  // Split View can keep the same viewport dimensions when moving sides.
  setInterval(()=>{if(!document.hidden)schedule();},400);
  $("demoRail").addEventListener("click",event=>{
    const btn=event.target.closest("[data-demo]");
    if(btn)$("copyStatus").textContent=btn.dataset.demo+" is a visual preview only.";
  });
  update();
})();
