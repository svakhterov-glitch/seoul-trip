/* ============================================================
   СТРАНИЦА ВХОДА (Supabase Auth, адрес #/login)
   Email + пароль, переключение Вход/Регистрация. После успеха
   вызывает onDone() — приложение перезагружается уже в облачном
   режиме (данные из БД пользователя).

   renderLoginPage(container, { supabase, onDone, onCancel })
   ============================================================ */

import { signIn, signUp } from "../services/auth.js";

export function renderLoginPage(container, { supabase, onDone, onCancel }) {
  let mode = "in"; // 'in' | 'up'

  function draw() {
    const isIn = mode === "in";
    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div class="page-head-inner">
            <button type="button" class="page-back" id="lg_back">← Назад</button>
            <span class="page-eyebrow">${isIn ? "Вход" : "Регистрация"}</span>
          </div>
        </header>
        <div class="page-body page-body-narrow">
          <h1 class="tf-title">${isIn ? "Вход в аккаунт" : "Создать аккаунт"}</h1>
          <p class="tf-intro">Войдите, чтобы поездки сохранялись в облаке и
            синхронизировались между устройствами.</p>
          <section class="tf-card">
            <form class="pf-form" id="lg_form" novalidate>
              <label class="ff"><span class="ff-label">Email</span>
                <input id="lg_email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
              <label class="ff"><span class="ff-label">Пароль</span>
                <input id="lg_pass" type="password" autocomplete="${isIn ? "current-password" : "new-password"}"
                  required minlength="6" placeholder="минимум 6 символов"></label>
              <p class="tf-error" id="lg_error" role="alert" hidden></p>
              <p class="pf-find-status" id="lg_status" role="status"></p>
              <div class="tf-foot">
                <button type="button" class="link-btn" id="lg_toggle">
                  ${isIn ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}</button>
                <div class="pf-foot-right">
                  <button type="submit" class="btn-primary">${isIn ? "Войти" : "Зарегистрироваться"}</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>`;

    const $ = (id) => container.querySelector("#" + id);
    const err = $("lg_error");
    const status = $("lg_status");
    const showErr = (m) => { err.textContent = m; err.hidden = false; };

    $("lg_back").addEventListener("click", onCancel);
    $("lg_toggle").addEventListener("click", () => { mode = isIn ? "up" : "in"; draw(); });

    $("lg_form").addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      const email = $("lg_email").value.trim();
      const pass = $("lg_pass").value;
      if (!email || pass.length < 6) return showErr("Введите email и пароль (от 6 символов).");
      status.textContent = "…";
      try {
        if (isIn) {
          await signIn(supabase, email, pass);
          onDone();
        } else {
          const d = await signUp(supabase, email, pass);
          if (d.access_token) onDone();
          else { status.textContent = ""; showErr("Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите."); mode = "in"; }
        }
      } catch (ex) {
        status.textContent = "";
        showErr(ex.message || "Ошибка авторизации");
      }
    });

    $("lg_email").focus();
  }

  draw();
}
