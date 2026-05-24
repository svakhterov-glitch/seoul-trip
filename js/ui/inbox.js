/* ============================================================
   ОКНО ССЫЛОК (инбокс «не разобрано»)
   Поле вставки URL + список ссылок. Карточку ссылки можно
   перетащить на день (см. ui/dnd.js) или «разобрать» — открыть
   форму места с предзаполнением.

   handlers: { onAdd(url), onConvert(linkId), onDelete(linkId) }
   ============================================================ */

function linkCard(link) {
  const hasCoords = !!link.parsedCoords;
  return `
    <div class="link-card" data-link-id="${link.id}" data-kind="link" draggable="true"
         role="group" aria-label="Ссылка: ${link.parsedName || link.url}">
      <div class="link-photo" aria-hidden="true">${link.parsedPhoto || "🔗"}</div>
      <div class="link-body">
        <div class="link-name">${link.parsedName || "Без названия"}</div>
        <div class="link-url">${shortUrl(link.url)}</div>
        <div class="link-tags">
          ${hasCoords ? '<span class="link-tag ok">📍 координаты есть</span>'
                      : '<span class="link-tag">точку задать вручную</span>'}
        </div>
      </div>
      <div class="link-actions">
        <button type="button" class="tl-act" data-act="convert" aria-label="Разобрать в место">➕</button>
        <button type="button" class="tl-act" data-act="del" aria-label="Удалить ссылку">🗑</button>
      </div>
    </div>`;
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "") + u.pathname).slice(0, 46);
  } catch {
    return url.slice(0, 46);
  }
}

export function renderInbox(container, trip, handlers) {
  const links = trip.inbox.filter((l) => l.status !== "placed");
  container.innerHTML = `
    <div class="inbox-head">
      <h3>🔗 Ссылки на места${links.length ? ` · не разобрано: ${links.length}` : ""}</h3>
    </div>
    <form class="inbox-add" id="inboxAdd">
      <input type="url" id="inboxUrl" placeholder="Вставьте ссылку (Google/Kakao Maps, Instagram, блог…)"
             autocomplete="off" inputmode="url">
      <input type="text" id="inboxName" placeholder="Название места (необязательно — найдём на карте)"
             autocomplete="off">
      <button type="submit" class="btn-primary btn-sm">Добавить</button>
    </form>
    ${links.length
      ? `<div class="link-list">${links.map(linkCard).join("")}</div>
         <p class="inbox-hint">Перетащите ссылку на вкладку дня или нажмите ➕, чтобы разобрать в место.</p>`
      : `<p class="inbox-empty">Пока пусто. Кидайте сюда ссылки на места из любых источников — разберёте их по дням позже.</p>`}`;

  const form = container.querySelector("#inboxAdd");
  const urlInput = container.querySelector("#inboxUrl");
  const nameInput = container.querySelector("#inboxName");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    const name = nameInput.value.trim();
    if (!url && !name) return;
    handlers.onAdd(url, name);
    urlInput.value = "";
    nameInput.value = "";
  });

  container.querySelectorAll(".link-card").forEach((el) => {
    el.querySelector('[data-act="convert"]').addEventListener("click", () => handlers.onConvert(el.dataset.linkId));
    el.querySelector('[data-act="del"]').addEventListener("click", () => handlers.onDelete(el.dataset.linkId));
  });
}
