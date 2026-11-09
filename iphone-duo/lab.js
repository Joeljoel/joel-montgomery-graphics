(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  let actualSide = null;
  let last = null;

  const rounded = value => Number.isFinite(value) ? String(Math.round(value * 10) / 10) : "Unavailable";
  const dimension = (w, h) => rounded(w) + " × " + rounded(h);
  const readNumber = value => typeof value === "number" && Number.isFinite(value) ? value : null;

  // Viewport classification is intentionally conservative: Safari 27.1
  // gives outer portrait ~382px and half-inner Split View ~385px of width.
  // Width by itself cannot distinguish them.
  function classify(m) {
    const w = m.width, h = m.height;
    const portrait = h >= w;
    const windowShape = portrait ? "Portrait window" : "Landscape window";
    if (!m.iphone) {
      return {label:"Other browser", detail:"Outside the iPhone Duo size estimates.", confidence:"Not identified", shape:windowShape, half:false};
    }
    if (!portrait && w >= 800) {
      return {label:"Inner · full screen", detail:"Unfolded, landscape", confidence:"Likely", shape:windowShape, half:false};
    }
    if (portrait && w >= 580) {
      return {label:"Inner · full screen", detail:"Unfolded, portrait", confidence:"Likely", shape:windowShape, half:false};
    }
    if (!portrait && w >= 480 && w < 800) {
      return {label:"Outer screen", detail:"Folded, landscape", confidence:"Likely", shape:windowShape, half:false};
    }
    if (portrait && w < 460) {
      if (m.legacyAngle !== null && Math.abs(m.legacyAngle) === 90) {
        return {label:"Inner · one half", detail:"Possible Split View: narrow portrait window, reported device angle is landscape.", confidence:"Estimated", shape:windowShape, half:true};
      }
      return {label:"Outer / inner half", detail:"Could be folded portrait or half of the inner screen in Split View.", confidence:"Uncertain", shape:windowShape, half:true};
    }
    if (portrait && w >= 460 && w < 580) {
      return {label:"Narrow portrait display", detail:"Possibly the outer PWA or an inner window; dimensions alone cannot confirm.", confidence:"Uncertain", shape:windowShape, half:false};
    }
    return {label:"Unclassified window", detail:"Measurements do not match a known Duo layout closely enough.", confidence:"Uncertain", shape:windowShape, half:false};
  }

  function inferSide(m,format) {
    if (!format.half) {
      return {label:"Not applicable", reason:"A left/right Split View position is only relevant for a half-width inner window.", side:null};
    }
    // screenX alone is not evidence of being on the LEFT: on iOS both
    // windows may report zero. Only trust it as a hint when screen.width
    // actually spans at least two window-widths.
    const coversBoth = m.screenWidth >= (2 * m.width - 45);
    if (m.screenX !== null && m.screenX >= m.width * .65) {
      return {label:"Possibly right", reason:"The browser reports a substantial positive screenX offset, consistent with a right-hand window. Verify on the device.", side:"right"};
    }
    if (coversBoth && m.screenX !== null && m.screenX >= 0 && m.screenX < m.width * .15) {
      return {label:"Possibly left", reason:"screenX is near the left edge of a screen wide enough for two windows. Verify on the device.", side:"left"};
    }
    const difference = m.safeLeft - m.safeRight;
    if (Math.abs(difference) >= 12) {
      const side = difference > 0 ? "left" : "right";
      return {label:"Possibly " + side, reason:"The " + side + " safe-area inset is larger. This is an experimental hint, not confirmed Split View position.", side};
    }
    return {label:"Unknown", reason:"Safari has not exposed a reliable left/right placement signal. Compare the measurements in both halves.", side:null};
  }

  function collect() {
    const vv = window.visualViewport;
    const probe = getComputedStyle($("safeProbe"));
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
      $("feedback").textContent = "Mark the actual side to compare it with automatic detection.";
    } else if (!side.side) {
      $("feedback").textContent = "Marked " + actualSide.toUpperCase() + " · Automatic placement is still unknown.";
    } else {
      $("feedback").textContent = "Marked " + actualSide.toUpperCase() + " · Automatic hint " + (side.side===actualSide?"agrees.":"disagrees. Please compare the raw signals.");
    }
  }

  function update() {
    const m = collect();
    const format = classify(m);
    const side = inferSide(m,format);
    last = {time:new Date().toISOString(),format:format.label,confidence:format.confidence,sideHint:side.label,actualSide,measurements:m};
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
  update();
})();
