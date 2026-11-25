window.CinemaCRM = (() => {
  const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const weekdays = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه'];
  const dayMs = 86_400_000;
  const persianDate = new Intl.DateTimeFormat('en-u-ca-persian', {
    timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric'
  });
  const tehranDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const digits = value => String(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const toDate = day => new Date(day * dayMs);
  const iso = day => toDate(day).toISOString().slice(0, 10);
  const fromIso = date => Date.parse(date + 'T00:00:00Z') / dayMs;
  const parts = (formatter, date) => Object.fromEntries(formatter.formatToParts(date)
    .filter(p => ['year','month','day'].includes(p.type)).map(p => [p.type, Number(p.value)]));
  const today = () => {
    const { year, month, day } = parts(tehranDate, new Date());
    return Date.UTC(year, month - 1, day) / dayMs;
  };
  const dateParts = day => parts(persianDate, toDate(day));
  const monthStart = day => day - dateParts(day).day + 1;
  const longDate = day => {
    const p = dateParts(day);
    return digits(p.day) + ' ' + months[p.month - 1] + ' ' + digits(p.year);
  };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[c]);
  const cleanName = value => value.trim().replace(/\s+/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  const nameFields = [
    { key: 'caller', label: 'تماس‌گیرنده', help: 'مشترک بین همهٔ سینماها' },
    { key: 'contact', label: 'طرف تماس', help: 'مختص این سینما' }
  ];

  function openCalendar(dialog, current, onPick) {
    let start = monthStart(current);
    const currentDay = today();
    function render() {
      const p = dateParts(start);
      const count = dateParts(start + 30).day === 31 ? 31 : dateParts(start + 29).day === 30 ? 30 : 29;
      const offset = (toDate(start).getUTCDay() + 1) % 7;
      dialog.innerHTML = `
        <div class="crm-heading"><h3 id="crm-calendar-title">انتخاب تاریخ شمسی</h3><button type="button" data-crm-close class="crm-button" aria-label="بستن تقویم">×</button></div>
        <div class="crm-calendar-nav">
          <button type="button" data-shift="-1" class="crm-button" aria-label="ماه قبل">‹</button>
          <strong aria-live="polite">${months[p.month-1]} ${digits(p.year)}</strong>
          <button type="button" data-shift="1" class="crm-button" aria-label="ماه بعد">›</button>
        </div>
        <div class="crm-days">
          ${weekdays.map(label => `<abbr title="${label}">${label[0]}</abbr>`).join('')}
          ${'<span aria-hidden="true"></span>'.repeat(offset)}
          ${Array.from({length: count}, (_, index) => {
            const day = start + index;
            return `<button type="button" data-day="${day}" aria-label="${longDate(day)}" aria-pressed="${day === current}" ${day === currentDay ? 'aria-current="date"' : ''}>${digits(index+1)}</button>`;
          }).join('')}
        </div>
        <div class="crm-footer"><button type="button" data-today class="crm-button">امروز</button></div>`;
    }
    function pick(day) {
      onPick(day);
      dialog.close();
    }
    dialog.onclick = event => {
      const button = event.target.closest('button');
      if (!button) return;
      if ('crmClose' in button.dataset) dialog.close();
      if ('today' in button.dataset) pick(currentDay);
      if ('day' in button.dataset) pick(Number(button.dataset.day));
      if ('shift' in button.dataset) {
        const direction = Number(button.dataset.shift);
        start = monthStart(start + (direction < 0 ? -1 : 31));
        render();
        dialog.querySelector(`[data-shift="${direction}"]`).focus();
      }
    };
    render();
    dialog.showModal();
    dialog.querySelector('[aria-pressed="true"]').focus();
  }

  function mount(root, { cinemaId, storage, signOut }) {
    root.innerHTML = `
      <div class="crm-heading">
        <h2>CRM و سوابق تماس</h2>
        <div class="crm-actions">
          <button type="button" class="crm-button" data-crm-signout>خروج از CRM</button>
          <button type="button" class="crm-button crm-primary" data-open disabled>ثبت تماس</button>
        </div>
      </div>
      <p class="crm-status" role="status"></p>
      <div class="crm-history"></div>
      <dialog class="crm-dialog" aria-labelledby="crm-form-title"></dialog>
      <dialog class="crm-dialog crm-calendar" aria-labelledby="crm-calendar-title"></dialog>`;
    const status = root.querySelector('.crm-status');
    const history = root.querySelector('.crm-history');
    const formDialog = root.querySelector('.crm-dialog');
    const calendar = root.querySelector('.crm-calendar');
    const open = root.querySelector('[data-open]');
    root.querySelector('[data-crm-signout]').onclick = signOut;
    let entries;
    const formatRows = rows => rows.map(entry => `
      <article class="crm-entry">
        <div class="crm-entry-meta"><time datetime="${escape(entry.call_date)}">${longDate(fromIso(entry.call_date))}</time>
          <span>تماس‌گیرنده <strong>${escape(entry.caller)}</strong></span>
          <span>طرف تماس <strong>${escape(entry.contact)}</strong></span>
        </div>
        <p dir="auto">${escape(entry.report)}</p>
      </article>`).join('');
    function showHistory() {
      history.innerHTML = entries.length ? formatRows(entries) : '<p class="crm-empty">هنوز تماسی برای این سینما ثبت نشده است.</p>';
    }
    async function loadHistory(message = '') {
      open.disabled = true;
      status.textContent = 'در حال دریافت سوابق تماس…';
      try {
        entries = await storage.history(cinemaId);
        showHistory();
        status.textContent = message;
        open.disabled = false;
      } catch (error) {
        console.error('CRM history:', error);
        status.textContent = 'دریافت سوابق تماس انجام نشد.';
        const retry = document.createElement('button');
        retry.className = 'crm-button';
        retry.textContent = 'تلاش دوباره';
        retry.onclick = () => loadHistory(message);
        status.append(' ', retry);
      }
    }

    open.onclick = async () => {
      let date = today();
      open.disabled = true;
      let names;
      try {
        names = await storage.names(cinemaId);
      } catch (error) {
        console.error('CRM tags:', error);
        status.textContent = 'دریافت نام‌ها انجام نشد. دوباره روی ثبت تماس بزنید.';
        return;
      } finally {
        open.disabled = false;
      }
      if (!root.isConnected) return;
      status.textContent = '';
      formDialog.innerHTML = `
        <div class="crm-heading"><h3 id="crm-form-title">ثبت تماس جدید</h3><button type="button" class="crm-button" data-cancel aria-label="بستن فرم">×</button></div>
        <form class="crm-form">
          <div class="crm-name-grid">
            ${nameFields.map(field => `<div class="crm-field"><label for="crm-${field.key}">${field.label}</label><small>${field.help}</small>
              <select class="crm-tag" id="crm-${field.key}" name="${field.key}" required></select>
              <div class="crm-add-name"><input type="text" maxlength="100" placeholder="نام جدید" aria-label="نام جدید ${field.label}"><button class="crm-button" type="button" data-crm-add="${field.key}">افزودن تگ</button></div>
            </div>`).join('')}
          </div>
          <div class="crm-field"><span id="crm-date-label">تاریخ تماس</span><button class="crm-button crm-date" type="button" aria-labelledby="crm-date-label crm-date-value" data-date><span id="crm-date-value">${longDate(date)}</span><span aria-hidden="true">▦</span></button></div>
          <div class="crm-field"><label for="crm-report">گزارش تماس</label><textarea id="crm-report" name="report" rows="5" maxlength="20000" placeholder="خلاصه صحبت‌ها را بنویسید" required></textarea></div>
          <p class="crm-status" role="status"></p>
          <div class="crm-footer"><button type="button" class="crm-button" data-cancel>انصراف</button><button type="submit" class="crm-button crm-primary">ذخیره تماس</button></div>
        </form>`;
      const form = formDialog.querySelector('form');
      const formStatus = form.querySelector('[role="status"]');
      const save = form.querySelector('[type="submit"]');
      let pending = false;
      let lastSubmission;
      function setPending(value) {
        pending = value;
        form.querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = value);
        formDialog.querySelectorAll('[data-cancel]').forEach(el => el.disabled = value);
      }
      for (const { key } of nameFields) {
        const select = form.elements[key];
        function showNames(selected = '') {
          select.replaceChildren(new Option('انتخاب تگ', ''));
          names[key].sort((a, b) => a.localeCompare(b, 'fa')).forEach(name => select.add(new Option(name, name)));
          select.value = selected;
        }
        showNames();
        const add = form.querySelector(`[data-crm-add="${key}"]`);
        const input = add.previousElementSibling;
        input.onkeydown = event => {
          if (event.key === 'Enter' && !event.isComposing) {
            event.preventDefault();
            add.click();
          }
        };
        add.onclick = async () => {
          const name = cleanName(input.value);
          if (!name) {
            input.focus();
            return;
          }
          formStatus.textContent = '';
          setPending(true);
          try {
            if (!names[key].includes(name)) {
              await storage.addName(cinemaId, key, name);
              names[key].push(name);
            }
            input.value = '';
            showNames(name);
          } catch (error) {
            console.error('CRM add tag:', error);
            formStatus.textContent = 'افزودن تگ انجام نشد. دوباره تلاش کنید.';
          } finally {
            setPending(false);
          }
          if (select.value === name) select.focus();
        };
      }
      formDialog.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => formDialog.close());
      formDialog.oncancel = event => { if (pending) event.preventDefault(); };
      form.querySelector('[data-date]').onclick = () => openCalendar(calendar, date, picked => {
        date = picked;
        form.querySelector('#crm-date-value').textContent = longDate(date);
      });
      form.onsubmit = async event => {
        event.preventDefault();
        if (pending) return;
        const report = form.elements.report.value.trim();
        if (!report) {
          form.elements.report.focus();
          formStatus.textContent = 'گزارش تماس را بنویسید.';
          return;
        }
        const payload = {
          caller: form.elements.caller.value, contact: form.elements.contact.value,
          call_date: iso(date), report
        };
        const fingerprint = JSON.stringify(payload);
        if (lastSubmission?.fingerprint !== fingerprint) {
          lastSubmission = { fingerprint, id: crypto.randomUUID() };
        }
        formStatus.textContent = '';
        setPending(true);
        try {
          await storage.save(cinemaId, { id: lastSubmission.id, ...payload });
          formDialog.close();
          await loadHistory('تماس ثبت شد.');
        } catch (error) {
          console.error('CRM save:', error);
          formStatus.textContent = 'ذخیرهٔ گزارش انجام نشد. دوباره تلاش کنید.';
        } finally {
          setPending(false);
          if (formDialog.open) save.focus();
        }
      };
      formDialog.showModal();
    };
    loadHistory();
  }

  let db;
  let activeCinema = null;
  let viewRequest = 0;

  async function rows(query) {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  const storage = {
    async names(cinemaId) {
      const tags = await rows(db.from('eight_cinemas_crm_tags').select('scope,name').in('scope', [-1, cinemaId]));
      return {
        caller: tags.filter(t => t.scope === -1).map(t => t.name),
        contact: tags.filter(t => t.scope === cinemaId).map(t => t.name)
      };
    },
    addName(cinemaId, field, name) {
      return rows(db.from('eight_cinemas_crm_tags').upsert(
        { scope: field === 'caller' ? -1 : cinemaId, name },
        { onConflict: 'scope,name', ignoreDuplicates: true }
      ));
    },
    async history(cinemaId) {
      const calls = [];
      const pageSize = 250;
      for (let offset = 0; ; offset += pageSize) {
        const page = await rows(db.from('eight_cinemas_crm_calls')
          .select('call_date,caller,contact,report').eq('cinema_id', cinemaId)
          .order('call_date', { ascending: false }).order('created_at', { ascending: false })
          .order('id', { ascending: false }).range(offset, offset + pageSize - 1));
        calls.push(...page);
        if (page.length < pageSize) return calls;
      }
    },
    save(cinemaId, payload) {
      return rows(db.from('eight_cinemas_crm_calls').upsert(
        { cinema_id: cinemaId, ...payload }, { onConflict: 'id', ignoreDuplicates: true }
      ));
    }
  };

  function login(root, signIn) {
    root.innerHTML = `
      <div class="crm-heading"><h2>CRM و سوابق تماس</h2></div>
      <p>برای ثبت و مشاهدهٔ تماس‌ها با حساب داشبورد وارد شوید.</p>
      <form class="crm-form crm-login">
        <div class="crm-field"><label for="crm-email">ایمیل حساب</label><input type="email" id="crm-email" name="email" dir="ltr" autocomplete="username" required></div>
        <div class="crm-field"><label for="crm-password">رمز عبور</label><input type="password" id="crm-password" name="password" dir="ltr" autocomplete="current-password" required></div>
        <p class="crm-status" role="status"></p>
        <div><button class="crm-button crm-primary" type="submit">ورود به CRM</button></div>
      </form>`;
    const form = root.querySelector('form');
    const submit = form.querySelector('[type="submit"]');
    const status = form.querySelector('[role="status"]');
    form.onsubmit = async event => {
      event.preventDefault();
      if (submit.disabled) return;
      status.textContent = '';
      submit.disabled = true;
      try {
        const { data, error } = await db.auth.signInWithPassword({
          email: form.elements.email.value.trim(), password: form.elements.password.value
        });
        if (error) throw error;
        form.elements.password.value = '';
        await signIn(data.user);
      } catch (error) {
        status.textContent = error.code === 'invalid_credentials'
          ? 'ایمیل یا رمز عبور درست نیست.'
          : 'ورود به CRM انجام نشد. دوباره تلاش کنید.';
      } finally {
        submit.disabled = false;
      }
    };
  }

  function show(root, cinemaId) {
    if (cinemaId === activeCinema) return;
    activeCinema = cinemaId;
    root.hidden = cinemaId === null;
    root.replaceChildren();
    const request = ++viewRequest;
    if (cinemaId === null) return;
    const current = () => request === viewRequest;

    function showFailure(message) {
      root.innerHTML = `<h2>CRM و سوابق تماس</h2><p class="crm-status" role="status">${message}</p>
        <button class="crm-button" type="button">تلاش دوباره</button>`;
      root.querySelector('button').onclick = () => {
        activeCinema = null;
        show(root, cinemaId);
      };
    }

    if (!window.supabase?.createClient) {
      showFailure('اتصال CRM بارگذاری نشد. صفحه را دوباره باز کنید.');
      root.querySelector('button').onclick = () => location.reload();
      return;
    }
    if (!db) {
      const { url, key } = window.CINEMA_SUPABASE;
      db = window.supabase.createClient(url, key);
      db.auth.onAuthStateChange(event => {
        if (event !== 'SIGNED_OUT' || activeCinema === null) return;
        const selected = activeCinema;
        activeCinema = null;
        show(root, selected);
      });
    }
    const signOut = async event => {
      const button = event.currentTarget;
      button.disabled = true;
      const { error } = await db.auth.signOut({ scope: 'local' });
      if (error && current()) {
        root.querySelector('.crm-status').textContent = 'خروج انجام نشد. دوباره تلاش کنید.';
        button.disabled = false;
      }
    };
    const signIn = async user => {
      if (!current()) return;
      if (!user) {
        login(root, signIn);
        return;
      }
      const membership = await rows(db.from('eight_cinemas_members').select('user_id').eq('user_id', user.id).maybeSingle());
      if (!current()) return;
      if (membership) {
        mount(root, { cinemaId, storage, signOut });
        return;
      }
      root.innerHTML = `<h2>CRM و سوابق تماس</h2><p role="status" class="crm-status">این حساب به CRM هشت سینما دسترسی ندارد.</p>
        <button class="crm-button" type="button">ورود با حساب دیگر</button>`;
      root.querySelector('button').onclick = signOut;
    };
    root.innerHTML = '<h2>CRM و سوابق تماس</h2><p class="crm-status" role="status">در حال بررسی ورود…</p>';
    db.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      return signIn(data.session?.user);
    }).catch(error => {
      console.error('CRM membership:', error);
      if (current()) showFailure('بررسی دسترسی CRM انجام نشد.');
    });
  }

  return { show };

})();
