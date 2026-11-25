/* ============================================================
   仙书阁 · 共享交互脚本
   星尘粒子 / 御风进度 / 目录拖拽折叠 / 滚动浮现
   划线标注 / 札记汇总（localStorage 持久化）
   两个页面（书库首页 / 书籍页）共用，按元素存在与否自动启用
   ============================================================ */
(function () {
  "use strict";
  const qs  = (s, r) => (r || document).querySelector(s);
  const qsa = (s, r) => Array.from((r || document).querySelectorAll(s));
  const BOOK_ID = document.body.dataset.book || "default";
  const LS_HL   = "xhkg_hl_" + BOOK_ID;      // 划线与笔记
  const LS_TOC  = "xhkg_toc_" + BOOK_ID;     // 目录状态

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = qs("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------------- 星尘粒子 ---------------- */
  function initParticles() {
    if (qs("#particles")) return;
    const box = document.createElement("div");
    box.id = "particles";
    for (let i = 0; i < 42; i++) {
      const s = document.createElement("span");
      s.className = "pt" + (Math.random() < 0.35 ? " c" : "");
      const size = 2 + Math.random() * 5;
      s.style.width = s.style.height = size + "px";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = 20 + Math.random() * 90 + "%";
      s.style.animationDuration = 8 + Math.random() * 16 + "s";
      s.style.animationDelay = -Math.random() * 20 + "s";
      box.appendChild(s);
    }
    document.body.appendChild(box);
  }

  /* ---------------- 御风进度条 ---------------- */
  function initProgress() {
    const bar = document.createElement("div");
    bar.id = "sprogress";
    document.body.appendChild(bar);
    const upd = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      bar.style.width = (p * 100).toFixed(2) + "%";
    };
    window.addEventListener("scroll", upd, { passive: true });
    upd();
  }

  /* ---------------- 滚动浮现 ---------------- */
  function initReveal() {
    const els = qsa("section, .book-card, .mingduan, .tz-item");
    if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("vis")); return; }
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } });
    }, { threshold: 0.06 });
    els.forEach(e => io.observe(e));
  }

  /* ---------------- 目录：折叠 / 拖拽调宽 / 记忆 ---------------- */
  function initToc() {
    const toc = qs("#toc");
    if (!toc) return;
    const wrap = qs(".wrap");
    const saved = JSON.parse(localStorage.getItem(LS_TOC) || "{}");
    const rz = qs(".toc-resizer");

    if (saved.w) {
      document.documentElement.style.setProperty("--toc-w", Math.max(180, Math.min(420, saved.w)) + "px");
    }

    /* 折叠后的重新展开按钮（桌面） */
    const openBtn = document.createElement("button");
    openBtn.id = "tocOpenBtn";
    openBtn.textContent = "☰ 目录";
    openBtn.title = "展开目录";
    document.body.appendChild(openBtn);

    function isClosed() { return toc.classList.contains("closed"); }
    function persist() {
      saved.w = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--toc-w")) || 250;
      saved.closed = isClosed();
      localStorage.setItem(LS_TOC, JSON.stringify(saved));
    }
    function syncOpen() {
      openBtn.style.display = (isClosed() && window.innerWidth > 900) ? "block" : "none";
      if (rz) rz.style.display = (isClosed() || window.innerWidth <= 900) ? "none" : "block";
    }
    function setClosed(c) {
      toc.classList.toggle("closed", c);
      if (wrap) wrap.classList.toggle("no-toc", c);
      syncOpen(); persist();
    }
    if (saved.closed) setClosed(true); else syncOpen();

    /* 拖拽调宽：拖拽条 fixed 定位，由 JS 跟随目录右缘 */
    let placeRz = () => {};
    window.addEventListener("resize", () => { syncOpen(); placeRz(); });

    openBtn.addEventListener("click", () => setClosed(false));
    const fold = qs(".toc-fold");
    if (fold) fold.addEventListener("click", () => setClosed(!isClosed()));

    if (rz) {
      rz.style.position = "fixed"; rz.style.top = "0px"; rz.style.height = "100vh";
      placeRz = function () {
        if (rz.style.display === "none") return;
        const r = toc.getBoundingClientRect();
        rz.style.left = (r.right - 6) + "px";
      };
      window.addEventListener("scroll", placeRz, { passive: true });
      placeRz();

      let sx = 0, sw = 0, drag = false;
      rz.addEventListener("mousedown", e => {
        drag = true; sx = e.clientX; sw = toc.getBoundingClientRect().width;
        document.body.classList.add("dragging"); e.preventDefault();
      });
      window.addEventListener("mousemove", e => {
        if (!drag) return;
        document.documentElement.style.setProperty("--toc-w", Math.max(180, Math.min(420, sw + (e.clientX - sx))) + "px");
      });
      window.addEventListener("mouseup", () => {
        if (!drag) return;
        drag = false; document.body.classList.remove("dragging");
        persist(); placeRz();
        toast("目录宽度已记住");
      });
    }
    syncOpen();

    /* 高亮当前章节 */
    const links = qsa("#toc a[href^='#']");
    if (links.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => {
        es.forEach(e => {
          if (!e.isIntersecting) return;
          links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
        });
      }, { rootMargin: "-10% 0px -70% 0px" });
      qsa("main section[id]").forEach(s => io.observe(s));
    }
  }

  /* ---------------- 平滑跳转（御风而行） ---------------- */
  function initNav() {
    const toc = qs("#toc");
    qsa('a[href^="#"]').forEach(a => {
      a.addEventListener("click", e => {
        const id = a.getAttribute("href");
        if (id === "#") return;
        const t = qs(id);
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", id);
        if (toc && window.innerWidth <= 900) toc.classList.remove("open");
      });
    });
    /* 移动端目录开合 */
    if (toc && window.innerWidth <= 900) {
      const btn = document.createElement("button");
      btn.className = "toc-toggle-m";
      btn.textContent = "☰";
      btn.setAttribute("aria-label", "目录");
      document.body.appendChild(btn);
      btn.addEventListener("click", () => {
        toc.classList.remove("closed");
        toc.classList.toggle("open");
      });
      document.addEventListener("click", e => {
        if (toc.classList.contains("open") && !toc.contains(e.target) && e.target !== btn) {
          toc.classList.remove("open");
        }
      });
    }
  }

  /* ================= 阅读功能：划线 / 笔记 / 汇总 ================= */
  let HL = [];
  try { HL = JSON.parse(localStorage.getItem(LS_HL) || "[]"); } catch (e) { HL = []; }
  const saveHL = () => localStorage.setItem(LS_HL, JSON.stringify(HL));

  function timeStr(ts) {
    const d = new Date(ts), p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /* 把已存的划线渲染回正文（TreeWalker 逐节点查找） */
  function renderHL() {
    if (!HL.length) return;
    const main = qs("main");
    if (!main) return;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || n.nodeValue.trim().length < 4) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || p.closest("script,style,#toc,#nbDrawer,#selbar,.zhu-panel")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const done = new Set();
    for (const hl of HL.sort((a, b) => b.text.length - a.text.length)) {
      for (const node of nodes) {
        if (done.has(node)) continue;
        const idx = node.nodeValue.indexOf(hl.text);
        if (idx > -1) {
          const r = document.createRange();
          r.setStart(node, idx);
          r.setEnd(node, idx + hl.text.length);
          const span = document.createElement("span");
          span.className = "hl hl-" + (hl.color || "gold");
          span.dataset.id = hl.id;
          try { r.surroundContents(span); done.add(node); span.__hl = hl; } catch (e) { /* 跨节点放弃 */ }
          break;
        }
      }
    }
  }

  function wrapSelection(range, color, id) {
    const span = document.createElement("span");
    span.className = "hl hl-" + color;
    span.dataset.id = id;
    try { range.surroundContents(span); } catch (e) { toast("跨段落选区，仅保存不渲染"); }
  }

  /* 划选工具条 */
  function initSelbar() {
    const main = qs("main");
    if (!main) return;
    const bar = document.createElement("div");
    bar.id = "selbar";
    bar.innerHTML =
      '<button data-act="gold">✦ 金句</button>' +
      '<button data-act="cyan">◎ 重点</button>' +
      '<button data-act="note">✎ 笔记</button>' +
      '<button data-act="copy">⧉ 复制</button>' +
      '<input type="text" placeholder="写点什么…回车保存">';
    document.body.appendChild(bar);
    const input = qs("input", bar);
    let curRange = null, curText = "", pendingColor = "gold";

    function hide() { bar.style.display = "none"; input.style.display = "none"; }

    function handleSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { hide(); return; }
      const text = sel.toString().trim();
      if (text.length < 2) { hide(); return; }
      const r = sel.getRangeAt(0);
      const anc = r.commonAncestorContainer;
      const host = anc.nodeType === 3 ? anc.parentElement : anc;
      if (!host || !main.contains(host)) { hide(); return; }
      curRange = r.cloneRange(); curText = text;
      const rect = r.getBoundingClientRect();
      bar.style.display = "flex";
      /* fixed 定位相对视口：直接用 getBoundingClientRect，不加 scrollY */
      const top = Math.max(10, rect.top - 50);
      const left = Math.max(10, Math.min(window.innerWidth - 280, rect.left + rect.width / 2 - 130));
      bar.style.top = top + "px";
      bar.style.left = left + "px";
    }

    document.addEventListener("mouseup", e => {
      if (bar.contains(e.target) || qs("#nbDrawer")?.contains(e.target)) return;
      setTimeout(handleSelection, 10);
    });
    /* 移动端：长按选择文字后抬起触发 */
    document.addEventListener("touchend", e => {
      if (bar.contains(e.target) || qs("#nbDrawer")?.contains(e.target)) return;
      setTimeout(handleSelection, 220);
    }, { passive: true });

    function commit(color, note) {
      if (!curRange || !curText) return;
      const hl = {
        id: Date.now(), text: curText.slice(0, 500), color: color,
        note: note || "", ts: Date.now(),
        loc: (qs("section h2", main) && "《" + (document.title.split("·")[0].trim() || "") + "》") || ""
      };
      const h2 = curRange.startContainer.parentElement?.closest("section h2, section h3");
      if (h2) hl.loc = h2.textContent.trim().slice(0, 30);
      HL.unshift(hl); saveHL();
      wrapSelection(curRange, color, hl.id);
      window.getSelection().removeAllRanges();
      updateNb();
      hide();
      toast(note ? "笔记已入札记" : (color === "gold" ? "金句已划线" : "重点已划线"));
    }

    bar.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "gold") commit("gold");
      else if (act === "cyan") commit("cyan");
      else if (act === "copy") {
        navigator.clipboard?.writeText(curText).then(() => toast("已复制")).catch(() => toast("复制失败"));
        hide();
      } else if (act === "note") {
        input.style.display = "inline-block";
        input.focus();
        input.onkeydown = ev => {
          if (ev.key === "Enter" && input.value.trim()) { commit(pendingColor, input.value.trim()); input.value = ""; }
          if (ev.key === "Escape") { hide(); input.value = ""; }
        };
      }
    });
    document.addEventListener("scroll", hide, { passive: true });
  }

  /* ---------------- 札记抽屉 ---------------- */
  function updateNb() {
    const btn = qs("#nbBtn .cnt");
    if (btn) btn.textContent = HL.length;
    const list = qs("#nbList");
    if (!list) return;
    if (!HL.length) {
      list.innerHTML = '<div class="nb-empty">案头清净<br><br>选一段文字，划一条线<br>念头来了，落成笔记</div>';
      return;
    }
    list.innerHTML = HL.map(hl => `
      <div class="nb-item" data-id="${hl.id}">
        <div><span class="nb-chip" style="background:${hl.color === "gold" ? "#e3c47f" : "#7fd8c8"}"></span>${hl.color === "gold" ? "金句" : "重点"}${hl.note ? " · 有笔记" : ""}</div>
        <div class="nb-text" data-goto="${hl.id}">「${hl.text.replace(/</g, "&lt;").slice(0, 120)}${hl.text.length > 120 ? "…" : ""}」</div>
        ${hl.note ? `<div class="nb-note">✎ ${hl.note.replace(/</g, "&lt;")}</div>` : ""}
        <div class="nb-meta"><span>${hl.loc || ""}</span><span>${timeStr(hl.ts)}</span></div>
        <div class="nb-act">
          <button data-op="del">删除</button>
        </div>
      </div>`).join("");
  }

  function initDrawer() {
    if (!qs("main")) return;
    const btn = document.createElement("button");
    btn.id = "nbBtn";
    btn.innerHTML = '札记<span class="cnt">0</span>';
    document.body.appendChild(btn);
    const drawer = document.createElement("aside");
    drawer.id = "nbDrawer";
    drawer.innerHTML =
      '<div class="nb-head"><h4>✦ 我的札记</h4>' +
      '<div class="ops"><button data-op="export">导出</button><button data-op="clear">清空</button>' +
      '<button data-op="close">✕</button></div></div><div id="nbList"></div>';
    const mask = document.createElement("div");
    mask.id = "nbMask";
    document.body.appendChild(drawer); document.body.appendChild(mask);

    /* 竖排版式：滚轮纵向增量转横向列滚动（vertical-rl 列向左生长） */
    const nbList = qs("#nbList");
    nbList.addEventListener("wheel", e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); nbList.scrollLeft -= e.deltaY; }
    }, { passive: false });

    function open() { drawer.classList.add("open"); mask.classList.add("open"); updateNb(); }
    function close() { drawer.classList.remove("open"); mask.classList.remove("open"); }
    btn.addEventListener("click", open);
    drawer.addEventListener("click", e => {
      const op = e.target.closest("[data-op]")?.dataset.op;
      if (op === "close" || e.target === mask) close();
      else if (op === "clear") {
        if (!HL.length) return;
        if (confirm("确定清空全部划线与笔记？此操作不可恢复。")) {
          HL = []; saveHL(); updateNb(); toast("已清空");
          qsa(".hl").forEach(el => { el.replaceWith(document.createTextNode(el.textContent)); });
          document.body.normalize();
        }
      } else if (op === "export") {
        if (!HL.length) { toast("札记还是空的"); return; }
        const md = "# 札记 · " + document.title.split("|")[0].trim() + "\n\n" +
          HL.map(hl => `- **${hl.color === "gold" ? "金句" : "重点"}**（${timeStr(hl.ts)}）「${hl.text}」` +
            (hl.note ? `\n  - 笔记：${hl.note}` : "")).join("\n\n");
        const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "札记-" + BOOK_ID + ".md";
        a.click();
        toast("已导出 Markdown");
      }
      const goto = e.target.closest("[data-goto]")?.dataset.goto;
      if (goto) {
        close();
        const el = qs('.hl[data-id="' + goto + '"]');
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.remove("zap"); void el.offsetWidth; el.classList.add("zap");
        } else toast("未在正文定位到该划线");
      }
      if (e.target.closest('[data-op="del"]')) {
        const id = Number(e.target.closest(".nb-item").dataset.id);
        HL = HL.filter(h => h.id !== id);
        saveHL(); updateNb();
        const el = qs('.hl[data-id="' + id + '"]');
        if (el) el.replaceWith(document.createTextNode(el.textContent));
        toast("已删除");
      }
    });
    mask.addEventListener("click", close);
  }

  /* ---------------- 核心语句注释 ---------------- */
  function initZhusi() {
    const Z = window.ZHUSHI || {};
    qsa(".jt").forEach(sp => {
      sp.addEventListener("click", e => {
        e.stopPropagation();
        const key = sp.dataset.n, data = Z[key];
        if (!data) return;
        const host = sp.closest("p, li, blockquote, h4, h5") || sp.parentElement;
        const existed = qs('.zhu-panel[data-for="' + key + '"]');
        if (existed) { existed.remove(); return; }
        qsa(".zhu-panel").forEach(p => p.remove());
        const panel = document.createElement("div");
        panel.className = "zhu-panel";
        panel.dataset.for = key;
        panel.innerHTML =
          '<button class="panel-close">✕</button>' +
          '<h6>' + data.t + '</h6>' +
          '<p>' + data.b + '</p>' +
          '<div class="links">' + (data.links || []).map(l =>
            '<a href="' + l.u + '" target="_blank" rel="noopener noreferrer">' + l.n + '</a>').join("") + '</div>';
        host.insertAdjacentElement("afterend", panel);
        panel.querySelector(".panel-close").addEventListener("click", () => panel.remove());
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
    document.addEventListener("click", e => {
      if (!e.target.closest(".zhu-panel, .jt")) qsa(".zhu-panel").forEach(p => p.remove());
    });
  }

  /* ---------------- 深度研读入口（数据驱动，按文件名匹配） ---------------- */
  const STUDY_PAGES = {
    "02-zhongchan": "study-02.html",
    "03-shigang":   "study-03.html",
    "04-jiqi70":    "study-04.html",
    "05-zhaiwu":    "study-05.html",
    "06-pingyong":  "study-06.html",
    "07-dongwu":    "study-07.html",
    "08-heian":     "study-08.html",
    "09-jiqi":      "study-09.html",
    "10-dublin":    "study-10.html",
    "11-aolando":   "study-11.html",
    "12-tuohuang":  "study-12.html",
    "13-xiangcun":  "study-13.html",
    "14-miyue":     "study-14.html",
    "15-haizi":     "study-15.html",
    "16-juwai":     "study-16.html",
    "17-gaici":     "study-17.html",
    "18-jianai":    "study-18.html",
    "19-daluo":     "study-19.html",
    "20-hongzi":    "study-20.html",
    "21-quandao":   "study-21.html",
    "22-mimi":      "study-22.html",
    "23-chahua":    "study-23.html",
    "24-weite":     "study-24.html",
    "25-pingguo":   "study-25.html",
    "26-xianglian": "study-26.html",
    "72-zhulin":    "study-72.html",
    "73-laoshu":    "study-73.html",
    "74-aidao":     "study-74.html",
    "75-yinxiang":  "study-75.html",
    "76-mijia":     "study-76.html",
    "77-diliang":   "study-77.html",
    "78-laixin":    "study-78.html",
    "79-dongwu":    "study-79.html",
    "80-tuohuang":  "study-80.html",
    "81-kafuka":    "study-81.html",
    "82-dublin2":   "study-82.html",
    "83-mansfield": "study-83.html",
    "84-hemingway": "study-84.html",
    "27-yanghuo":   "study-27.html",
    "28-chuangshou":"study-28.html",
    "29-caiwu":     "study-29.html",
    "30-jiqiao":    "study-30.html",
    "31-gaoxiao":   "study-31.html",
    "32-caiba":     "study-32.html",
    "33-zhongshen": "study-33.html",
    "51-zhuangzi":  "study-51.html",
    "52-xinling":   "study-52.html",
    "55-yuanben":   "study-55.html",
    "56-lishi":     "study-56.html",
    "57-zoushang":  "study-57.html",
    "34-heishi":    "study-34.html",
    "35-jiqiren":   "study-35.html",
    "36-rensheng":  "study-36.html",
    "37-dipingxian":"study-37.html",
    "39-zhuanxing": "study-39.html",
    "40-zhexue":    "study-40.html",
    "44-touzi":     "study-44.html",
    "47-haohao":    "study-47.html",
    "49-yilang":    "study-49.html",
    "48-houjiqi":   "study-48.html",
"45-bengkui":   "study-45.html",
"42-renlei":   "study-42.html",
"43-weilai":   "study-43.html",
"46-jingshen":   "study-46.html",
"50-duoyang":   "study-50.html",
    "53-daodejing": "study-53.html",
    "54-shuxue":    "study-54.html",
    "41-yijing":    "study-41.html",
    "38-huashan":    "study-38.html",
    "62-dufu":    "study-62.html",
    "63-shijing":  "study-63.html",
    "65-zhexue":   "study-65.html",
    "66-guwen":    "study-66.html",
    "67-maoshi":   "study-67.html",
    "64-xingfu":   "study-64.html",
    "69-likaiifu-ai": "study-69.html",
    "58-yuzhou8": "study-58.html",
    "60-taikong6": "study-60.html",
    "61-yingguoshi": "study-61.html",
    "59-cijijing": "study-59.html",
    "68-sudongpo": "study-68.html",
    "70-computational-intelligence": "study-70.html",
    "71-ai-tech": "study-71.html"
  };
  function initStudyBadge() {
    const m = location.pathname.match(/(\d{2}-[a-z0-9]+)\.html/);
    if (!m || !STUDY_PAGES[m[1]]) return;
    if (qs(".study-badge-float")) return;
    const style = document.createElement("style");
    style.textContent = ".study-badge-float{position:fixed;right:18px;bottom:22px;z-index:999;"
      + "display:inline-flex;align-items:center;gap:6px;background:#b53d2e;color:#fff;"
      + "font-size:13px;letter-spacing:1px;padding:10px 16px;border-radius:999px;"
      + "text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.35);transition:background .2s;}"
      + ".study-badge-float:hover{background:#8f2e22;color:#fff;}";
    document.head.appendChild(style);
    const a = document.createElement("a");
    a.className = "study-badge-float";
    a.href = "../" + STUDY_PAGES[m[1]];
    a.textContent = "📖 深度研读 · 万字精讲 →";
    document.body.appendChild(a);
  }

  /* ---------------- 书页右上角：已读/未读 + 收藏 ---------------- */
  /* 已读写入 xsj-star-lit（与 starfield 点亮共用键，星星带书名点亮）；
     收藏写入 xsj-fav（书架「收藏」分类读取） */
  function initPageMarks() {
    const m = location.pathname.match(/books\/(\d{2})-[a-z0-9-]+\.html/);
    if (!m) return;
    const no = parseInt(m[1], 10);
    const getArr = k => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } };
    const setArr = (k, a) => { try { localStorage.setItem(k, JSON.stringify(a)); } catch (e) {} };

    const css = document.createElement("style");
    css.textContent =
      "#pageMarks{position:fixed;top:16px;right:18px;z-index:999;display:flex;gap:10px;}" +
      "#pageMarks button{font:inherit;font-size:13px;letter-spacing:2px;padding:9px 16px;border-radius:999px;" +
      "border:1px solid rgba(216,178,90,.45);background:rgba(11,14,19,.55);color:#c8cdd6;cursor:pointer;transition:.2s;}" +
      "#pageMarks button:hover{color:#e9dfc7;border-color:#d8b25a;}" +
      "#pageMarks button.on{color:#d8b25a;border-color:#d8b25a;background:rgba(216,178,90,.12);}" +
      "#pageMarks button.fav-on{color:#e07a6d;border-color:#b53d2e;background:rgba(181,61,46,.12);}";
    document.head.appendChild(css);

    const box = document.createElement("div");
    box.id = "pageMarks";
    box.innerHTML = '<button id="markRead">☆ 未读</button><button id="markFav">♡ 收藏</button>';
    document.body.appendChild(box);

    /* 书页本无 #toast 元素，补一个以便提示 */
    if (!qs("#toast")) {
      const t = document.createElement("div");
      t.id = "toast";
      document.body.appendChild(t);
    }

    const rb = qs("#markRead"), fb = qs("#markFav");
    function sync() {
      const read = getArr("xsj-star-lit").includes(no);
      const fav = getArr("xsj-fav").includes(no);
      rb.textContent = read ? "★ 已读" : "☆ 未读";
      rb.classList.toggle("on", read);
      fb.textContent = fav ? "♥ 已收藏" : "♡ 收藏";
      fb.classList.toggle("fav-on", fav);
    }
    rb.addEventListener("click", () => {
      let a = getArr("xsj-star-lit");
      if (a.includes(no)) {
        a = a.filter(n => n !== no);
        toast("已标记为未读，星空里这颗星熄灭了");
      } else {
        a.push(no);
        toast("已读！星空里这颗星已带着书名点亮 ✦");
      }
      setArr("xsj-star-lit", a);
      sync();
    });
    fb.addEventListener("click", () => {
      let a = getArr("xsj-fav");
      if (a.includes(no)) {
        a = a.filter(n => n !== no);
        toast("已移出收藏");
      } else {
        a.push(no);
        toast("已收藏 · 回书架「收藏」分类即可看到");
      }
      setArr("xsj-fav", a);
      sync();
    });
    sync();
  }

  /* ---------------- 启动（单功能故障隔离，互不拖垮） ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    const safe = (name, fn) => { try { fn(); } catch (e) { if (window.console) console.warn("[仙书阁] " + name + " 初始化失败:", e); } };
    safe("particles", initParticles);
    safe("progress", initProgress);
    safe("reveal", initReveal);
    safe("toc", initToc);
    safe("nav", initNav);
    safe("zhusi", initZhusi);
    safe("renderHL", renderHL);
    safe("selbar", initSelbar);
    safe("drawer", initDrawer);
    safe("nbCount", updateNb);
    safe("studyBadge", initStudyBadge);
    safe("pageMarks", initPageMarks);
  });
})();
