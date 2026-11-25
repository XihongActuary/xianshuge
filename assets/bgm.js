/* ============================================================
   仙书阁 · 全站背景音乐（Dreamer · Jan Jensen）
   整个知识库共用一个节奏：播放状态 / 进度 / 音量存 localStorage，
   跳页后从同一进度续播，不重新开始。
   适配任意层级页面（根目录 / books/ / bilingual/ 均自动定位 mp3）
   ============================================================ */
(function () {
  "use strict";
  var KEY = "xsj-bgm";
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { st = {}; }

  /* 根路径：books/ 与 bilingual/ 深一层 */
  var root = /\/(books|bilingual)\//.test(location.pathname) ? "../" : "";

  var audio = document.createElement("audio");
  audio.id = "bgm";
  audio.src = root + "dreamer.mp3";
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = (typeof st.vol === "number") ? st.vol : 0.3;
  document.body.appendChild(audio);

  var css = document.createElement("style");
  css.textContent =
    ".bgm-wrap{position:fixed;left:18px;bottom:22px;z-index:999;display:flex;align-items:center;gap:10px;}" +
    ".bgm-btn{width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.25);" +
    "background:rgba(181,61,46,.85);color:#fff;font-size:20px;line-height:1;cursor:pointer;" +
    "display:flex;align-items:center;justify-content:center;transition:all .25s;box-shadow:0 2px 12px rgba(0,0,0,.45);}" +
    ".bgm-btn:hover{background:#8f2e22;transform:scale(1.08);}" +
    ".bgm-btn.playing{animation:bgmPulse 2.2s ease-in-out infinite;}" +
    "@keyframes bgmPulse{0%,100%{box-shadow:0 2px 12px rgba(181,61,46,.55);}50%{box-shadow:0 2px 22px rgba(181,61,46,.95);}}" +
    ".bgm-vol{-webkit-appearance:none;appearance:none;width:76px;height:4px;border-radius:2px;" +
    "background:rgba(255,255,255,.28);cursor:pointer;display:none;}" +
    ".bgm-wrap:hover .bgm-vol{display:block;}" +
    ".bgm-vol::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;" +
    "border-radius:50%;background:#f5f1e6;cursor:pointer;}" +
    ".bgm-tip{position:fixed;left:74px;bottom:36px;z-index:999;color:#f5f1e6;font-size:13px;letter-spacing:1px;" +
    "background:rgba(20,20,30,.72);border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:5px 12px;" +
    "opacity:0;transition:opacity .4s;pointer-events:none;white-space:nowrap;}";
  document.head.appendChild(css);

  var wrap = document.createElement("div");
  wrap.className = "bgm-wrap";
  wrap.innerHTML =
    '<button id="bgmBtn" class="bgm-btn" title="背景音乐：Dreamer · Jan Jensen">&#9834;</button>' +
    '<input id="bgmVol" class="bgm-vol" type="range" min="0" max="1" step="0.01">';
  var tip = document.createElement("div");
  tip.className = "bgm-tip";
  tip.textContent = "♪ Dreamer · Jan Jensen";
  document.body.appendChild(wrap);
  document.body.appendChild(tip);

  var btn = wrap.querySelector("#bgmBtn");
  var vol = wrap.querySelector("#bgmVol");
  vol.value = audio.volume;

  var tipTimer = null;
  function showTip(text) {
    tip.textContent = text;
    tip.style.opacity = "1";
    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tip.style.opacity = "0"; }, 1600);
  }
  function syncOn() { btn.textContent = "⏸"; btn.classList.add("playing"); }
  function syncOff() { btn.textContent = "♪"; btn.classList.remove("playing"); }

  function persist() {
    var t = audio.currentTime || 0;
    /* 自愈：异步 seek 未生效或媒体刚重置时 currentTime 可能读到 0，
       不允许把已存的有效进度覆盖成 0 */
    if (t > 1 || !st.time) st.time = t;
    st.vol = audio.volume;
    save();
  }
  /* 只存播放标志，不动进度 —— play 事件可能在异步 seek 生效前触发，
     若此时读 currentTime 会把进度清零 */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
  }

  /* 进度恢复：等元数据就绪再定位，避免 currentTime 被忽略；
     被自动播放策略拦截时，等首次交互（手势）再续播 */
  var wantResume = !!st.playing;
  var seekDone = false;
  function kickResume() {
    document.removeEventListener("pointerdown", kickResume);
    document.removeEventListener("keydown", kickResume);
    /* 手势续播兜底：若定位未生效（仍在 0 附近），先补一次 seek */
    if (audio.currentTime < 1 && st.time > 1 && st.time < audio.duration - 1) {
      try { audio.currentTime = st.time; } catch (e) {}
    }
    audio.play().then(syncOn).catch(function () {});
  }
  audio.addEventListener("loadedmetadata", function () {
    if (!seekDone && st.time > 0 && st.time < audio.duration - 1) {
      try { audio.currentTime = st.time; } catch (e) {}
    }
    seekDone = true;
    if (wantResume) {
      audio.play().then(syncOn).catch(function () {
        document.addEventListener("pointerdown", kickResume);
        document.addEventListener("keydown", kickResume);
      });
    }
  });

  function tryPlay() {
    if (!seekDone) return; /* loadedmetadata 回调里统一续播 */
    if (st.time > 0 && st.time < audio.duration - 1) {
      try { audio.currentTime = st.time; } catch (e) {}
    }
    audio.play().then(syncOn).catch(function () {
      document.addEventListener("pointerdown", kickResume);
      document.addEventListener("keydown", kickResume);
    });
  }

  btn.addEventListener("click", function () {
    if (audio.paused) {
      audio.play().then(function () { syncOn(); showTip("♪ Dreamer · Jan Jensen"); })
        .catch(function () { showTip("播放失败"); });
    } else {
      audio.pause(); syncOff(); showTip("音乐已暂停");
    }
    persist();
  });
  vol.addEventListener("input", function () {
    audio.volume = parseFloat(vol.value);
    persist();
  });

  /* 定期存进度 + 离页前必存：下一页从同一秒继续。
     关键：跳页时浏览器会自动 pause 媒体，该 pause 不能写成「用户暂停」，
     否则下一页会误判为暂停而不再续播 —— 用 unloading 标记隔离。 */
  var unloading = false;
  var lastSave = 0;
  audio.addEventListener("timeupdate", function () {
    var now = Date.now();
    if (now - lastSave > 2000) { lastSave = now; persist(); }
  });
  audio.addEventListener("play", function () { st.playing = true; save(); });
  audio.addEventListener("pause", function () { if (!unloading) { st.playing = false; save(); } });
  function markUnload() {
    if (unloading) return;
    unloading = true;
    persist();
  }
  window.addEventListener("pagehide", markUnload);
  window.addEventListener("beforeunload", markUnload);
  document.addEventListener("visibilitychange", function () { if (document.hidden) persist(); });

  /* 启动：上次在播 → 续播（被拦截则等首次交互）；上次暂停 → 保持安静 */
  if (wantResume) { tryPlay(); } else { syncOff(); }
})();
