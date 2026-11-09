// Kids Lab: меню, шапка, конструктор визита (сообщение администратору в Telegram), статус «открыто сейчас».
// Без этого файла сайт работает: контент, ссылки и звонок доступны, конструктор заменяется кнопкой «Написать».
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Меню на телефоне ---------- */
  const burger = $("[data-menu]");
  const nav = $("#nav");
  if (burger && nav) {
    const label = burger.querySelector(".sr");
    const openText = label.textContent;
    const closeText = burger.dataset.close;
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      label.textContent = open ? closeText : openText;
    };
    burger.addEventListener("click", () => setOpen(burger.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        burger.focus();
      }
    });
  }

  /* ---------- Появление разделов при прокрутке ---------- */
  // В каждом разделе: заголовок (0 мс) → подводка (70 мс) → содержимое. Списки идут короткой волной
  // с сокращающимися шагами; дальние пункты приходят вместе с последним из волны.
  // Задержка действует, только если пункт показался вместе со своим разделом (в пределах 450 мс):
  // до чего долистали позже, появляется сразу, без ожидания.
  // Виды: title, "" (подъём), soft, pop (плитка с поворотом), bubble (облачко), arch (фото), peek (талисман).
  if ("IntersectionObserver" in window) {
    const wave = (steps) => (i) => steps[Math.min(i, steps.length - 1)];
    const plan = [
      [".visit .h2", "title", 0], [".visit .lead", "", 70], [".picker", "", 130], [".visit__panel", "", 190],
      // Талисман и его облачко — «ведомые»: появляются вместе с тем, за что держатся (панель, фото входа).
      [".peek__clip .mascot", "peek", 480, ".visit__panel"], [".bubble--peek", "bubble", 700, ".visit__panel"],
      [".services .h2", "title", 0], [".services .lead", "", 70], [".tile", "pop", wave([120, 170, 215, 255, 290, 320, 345, 365])],
      [".doctors .h2", "title", 0], [".doctors .lead", "", 70], [".doc", "", wave([130, 210])], [".doc__photo", "arch", wave([240, 320])],
      [".steps .h2", "title", 0], [".step", "pop", wave([110, 170, 220, 260])],
      [".reviews .h2", "title", 0], [".reviews .lead", "", 70], [".review", "bubble", wave([140, 260])], [".reviews .link", "soft", 340],
      [".faq .h2", "title", 0], [".faq__ask", "pop", 120], [".qa", "", wave([80, 125, 165, 200, 230, 255])],
      [".contacts .h2", "title", 0], [".contacts__address", "", 60], [".contacts__photo .arch", "arch", 80],
      [".contacts__info > :not(.h2):not(.contacts__address)", "", 130],
      [".contacts__mascot", "pop", 520, ".contacts__photo .arch"], [".bubble--point", "bubble", 760, ".contacts__photo .arch"],
    ];
    const items = [];
    const followers = new Map(); // ведущий элемент → ведомые
    for (const [sel, kind, delay, leadSel] of plan) {
      $$(sel).forEach((el, i) => {
        el.dataset.reveal = kind;
        el.dataset.rd = typeof delay === "function" ? delay(i) : delay;
        if (kind === "pop") el.style.setProperty("--tilt", `${i % 2 ? 2.5 : -2.5}deg`);
        const lead = leadSel && $(leadSel);
        if (lead) {
          if (!followers.has(lead)) followers.set(lead, []);
          followers.get(lead).push(el);
        } else items.push(el);
      });
    }
    const show = (el, d) => {
      el.style.setProperty("--rd", `${d}ms`);
      el.classList.add("is-in");
    };
    const groupStart = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        for (const e of entries) {
          // уже прокрученное вверх (переход по якорю) тоже показываем, иначе оно останется невидимым
          if (!e.isIntersecting && e.boundingClientRect.top > 0) continue;
          const el = e.target;
          const group = el.closest("section") || el;
          if (!groupStart.has(group)) groupStart.set(group, now);
          const late = now - groupStart.get(group) >= 450;
          const d = late ? 0 : Number(el.dataset.rd || 0);
          show(el, d);
          // ведомые приземляются после ведущего: их задержка отсчитывается от его старта
          (followers.get(el) || []).forEach((f) => show(f, d + Number(f.dataset.rd || 0) - Number(el.dataset.rd || 0)));
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    items.forEach((el) => io.observe(el));

    // Раздел целиком: .is-seen — декор дорисовывается один раз; .is-off — петли декора на паузе вне экрана.
    const secIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const sec = e.target;
          if (e.isIntersecting) sec.classList.add("is-seen");
          sec.classList.toggle("is-off", !e.isIntersecting);
        }
      },
      { rootMargin: "0px 0px -15% 0px" }
    );
    $$(".sec:not(.hero)").forEach((sec) => secIo.observe(sec));
    document.documentElement.classList.add("reveal");
  }

  /* ---------- Граница шапки после прокрутки ---------- */
  const header = $(".header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Сцена: прыжок по наведению или касанию, смещение за курсором ---------- */
  const art = $("[data-art]");
  if (art && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const hop = (el) => {
      if (!el || el.classList.contains("is-hop")) return;
      el.classList.add("is-hop");
      const done = (e) => {
        if (e.target !== el) return;
        el.classList.remove("is-hop");
        el.removeEventListener("animationend", done);
      };
      el.addEventListener("animationend", done);
    };
    art.addEventListener("pointerover", (e) => e.pointerType === "mouse" && hop(e.target.closest(".toy__hop")));
    art.addEventListener("pointerdown", (e) => hop(e.target.closest(".toy__hop")));
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      // Смещение пишется прямо в transform каждого персонажа: CSS-переменная на родителе
      // пересчитывала бы стили всей сцены на каждом движении мыши.
      const toys = $$(".toy", art).map((el) => [el, Number(el.style.getPropertyValue("--z")) || 1]);
      let frame = 0;
      window.addEventListener(
        "pointermove",
        (e) => {
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            const mx = (e.clientX / innerWidth) * 2 - 1;
            const my = (e.clientY / innerHeight) * 2 - 1;
            for (const [el, z] of toys) el.style.transform = `translate(${(mx * z * 14).toFixed(1)}px, ${(my * z * 10).toFixed(1)}px)`;
          });
        },
        { passive: true }
      );
    }
  }

  /* Сцена за пределами экрана не тратит батарею: бесконечные петли на паузе. */
  if (art && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => art.classList.toggle("is-paused", !e.isIntersecting)).observe(art);
  }

  /* ---------- Нижняя панель звонка: после кнопок первого экрана ---------- */
  const callbar = $("[data-callbar]");
  const heroCta = $(".hero__cta");
  if (callbar) {
    if (heroCta && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        const hide = e.isIntersecting || e.boundingClientRect.top > 0;
        callbar.classList.toggle("is-hidden", hide);
        callbar.toggleAttribute("inert", hide);
      }).observe(heroCta);
    } else {
      callbar.classList.remove("is-hidden");
    }
  }

  /* ---------- Конструктор визита ---------- */
  const out = $("#msg");
  const dataEl = $("#msg-data");
  if (out && dataEl) {
    const m = JSON.parse(dataEl.textContent);
    const picks = $$(".pick");
    const send = $("#send");
    const sendLabel = send.querySelector("span");
    const copy = $("#copy");
    const copyLabel = copy.querySelector("span");
    const copyText = copyLabel.textContent;
    const narrow = window.matchMedia("(max-width: 959px)");
    let text = "";

    const render = () => {
      const chosen = picks.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.pick);
      const age = ($('input[name="age"]:checked') || {}).value || "";
      if (!chosen.length) {
        text = "";
        out.textContent = narrow.matches ? out.dataset.emptyMobile : out.dataset.empty;
        out.classList.add("is-empty");
        send.href = `https://t.me/${m.admin}`;
        sendLabel.textContent = send.dataset.labelPlain;
        copy.hidden = true;
        return;
      }
      const lines = [m.hello, `${m.need} ${chosen.join(", ")}.`];
      if (age) lines.push(`${m.age} ${age}.`);
      lines.push(`${m.when} `);
      text = lines.join("\n").replace(/ /g, " ");
      out.textContent = text.trim();
      out.classList.remove("is-empty");
      send.href = `https://t.me/${m.admin}?text=${encodeURIComponent(text.trim())}`;
      sendLabel.textContent = send.dataset.labelSend;
      copy.hidden = false;
      copyLabel.textContent = copyText;
    };

    picks.forEach((b) =>
      b.addEventListener("click", () => {
        b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
        render();
      })
    );
    $$('input[name="age"]').forEach((r) => r.addEventListener("change", render));
    narrow.addEventListener?.("change", render);

    let copyTimer = 0;
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text.trim());
        copyLabel.textContent = copy.dataset.copied;
      } catch {
        copyLabel.textContent = copy.dataset.fail;
      }
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copyLabel.textContent = copyText), 2000);
    });
    render();
  }

  /* ---------- Открыто сейчас (время Ташкента) ---------- */
  // Закрытие 17:00 и выходной в воскресенье подтверждены двумя источниками.
  // Время открытия расходится (08:00 или 09:00), поэтому до 09:00 статус не показываем.
  // Проверка в любое время: ?now=16:30&day=6 (день: 0 — воскресенье).
  const status = $("[data-status]");
  if (status) {
    const q = new URLSearchParams(location.search);
    let day;
    let mins;
    if (q.has("now")) {
      const [h, mm] = q.get("now").split(":").map(Number);
      mins = h * 60 + (mm || 0);
      day = q.has("day") ? Number(q.get("day")) : 1;
    } else {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Tashkent",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t).value;
      day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
      mins = Number(get("hour")) * 60 + Number(get("minute"));
    }
    const workday = day >= 1 && day <= 6;
    let state = "";
    if (workday && mins >= 9 * 60 && mins < 17 * 60) state = "open";
    else if (!workday || mins >= 17 * 60 || mins < 8 * 60) state = "closed";
    if (state) {
      status.textContent = status.dataset[state];
      status.classList.toggle("is-open", state === "open");
      status.hidden = false;
    }
  }
})();
