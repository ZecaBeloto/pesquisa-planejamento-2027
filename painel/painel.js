(function () {
  var STORAGE_KEY = 'painelSenha';
  var REFRESH_MS = 60000;
  var TIMEOUT_MS = 60000;
  var TEAM = '__consolidado__';
  var GOLD = '#C8A84B';
  var MUTED = 'rgba(200, 168, 75, .35)';
  var BLUE = '#7f9cc4';
  var PALETTE = ['#C8A84B', '#7f9cc4', '#3d5a80', '#E2C97E', '#9fb7d6'];

  var state = { assessors: null, view: TEAM, loading: false, fetchedAt: null, failed: false };
  var charts = [];
  var timer = null;
  var $ = function (id) { return document.getElementById(id); };

  Chart.defaults.color = 'rgba(255, 255, 255, .75)';
  Chart.defaults.borderColor = 'rgba(255, 255, 255, .1)';
  Chart.defaults.font.family = "'Poppins', system-ui, sans-serif";

  function storedPassword() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function storePassword(value) {
    try { value === null ? localStorage.removeItem(STORAGE_KEY) : localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* sem armazenamento: pede a senha de novo */ }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'text') node.textContent = attrs[key];
      else if (key === 'class') node.className = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  // Formatação
  function money(value) {
    if (value === null || value === undefined) return '–';
    if (Math.abs(value) >= 1e9) return 'R$ ' + (value / 1e9).toFixed(1).replace('.', ',') + ' bi';
    if (Math.abs(value) >= 1e6) return 'R$ ' + (value / 1e6).toFixed(1).replace('.', ',') + ' mi';
    return 'R$ ' + formatMoneyBR(value);
  }
  function number(value, digits) {
    if (value === null || value === undefined) return '–';
    return value.toFixed(digits === undefined ? 0 : digits).replace('.', ',');
  }
  function percent(value) {
    return value === null || value === undefined ? '–' : number(value, 2) + '%';
  }
  function dateTime(iso) {
    if (!iso) return '–';
    var d = new Date(iso);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function refusal(result) {
    if (result.error === 'senha') return 'Senha incorreta.';
    if (result.error === 'bloqueado') return 'Muitas tentativas erradas. Aguarde 10 minutos e tente de novo.';
    return 'Não foi possível carregar os dados.';
  }

  // Comunicação
  function request(senha) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    return fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'painel', senha: senha }),
      signal: controller.signal,
    }).then(function (r) { return r.json(); }).finally(function () { clearTimeout(timeout); });
  }

  function load() {
    var senha = storedPassword();
    if (!senha || state.loading) return;
    state.loading = true;
    $('refresh').disabled = true;
    request(senha)
      .then(function (result) {
        if (!storedPassword()) return;
        if (result.ok) {
          state.assessors = result.assessors;
          state.fetchedAt = new Date().toISOString();
          state.failed = false;
          render();
        } else if (result.error === 'senha') {
          logout('Senha incorreta ou alterada. Entre novamente.');
        } else if (result.error === 'bloqueado') {
          logout(refusal(result));
        } else {
          state.failed = true;
          renderStatus();
        }
      })
      .catch(function () {
        state.failed = true;
        renderStatus();
      })
      .finally(function () {
        state.loading = false;
        $('refresh').disabled = false;
      });
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(function () { if (!document.hidden) load(); }, REFRESH_MS);
  }
  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  // Telas
  function showLogin(message) {
    $('login').hidden = false;
    $('dashboard').hidden = true;
    $('controls').hidden = true;
    $('status').hidden = true;
    $('login-error').textContent = message || '';
    $('senha').value = '';
    $('senha').focus();
  }

  function logout(message) {
    storePassword(null);
    stopTimer();
    state.assessors = null;
    destroyCharts();
    $('dashboard').innerHTML = '';
    $('view').innerHTML = '';
    $('status').textContent = '';
    showLogin(message);
  }

  function login(event) {
    event.preventDefault();
    var senha = $('senha').value;
    var button = $('enter');
    button.disabled = true;
    $('login-error').textContent = '';
    request(senha)
      .then(function (result) {
        if (!result.ok) {
          $('login-error').textContent = refusal(result);
          return;
        }
        storePassword(senha);
        state.assessors = result.assessors;
        state.fetchedAt = new Date().toISOString();
        state.failed = false;
        state.view = TEAM;
        enterDashboard();
      })
      .catch(function () { $('login-error').textContent = 'Não foi possível conectar. Tente novamente.'; })
      .finally(function () { button.disabled = false; });
  }

  function enterDashboard() {
    $('login').hidden = true;
    $('dashboard').hidden = false;
    $('controls').hidden = false;
    $('status').hidden = false;
    render();
    startTimer();
  }

  function renderStatus() {
    var status = $('status');
    var parts = [];
    if (state.assessors) {
      var s = summarize(state.assessors);
      parts.push(s.count + (s.count === 1 ? ' resposta' : ' respostas'));
      parts.push('última resposta ' + dateTime(s.lastSubmittedAt));
    }
    parts.push('painel atualizado ' + dateTime(state.fetchedAt));
    if (state.failed) parts.push('falha ao atualizar: mostrando os últimos dados');
    status.textContent = parts.join(' · ');
    status.className = 'status' + (state.failed ? ' warn' : '');
  }

  function renderSelect() {
    var select = $('view');
    var names = state.assessors.map(function (a) { return a.name; });
    if (state.view !== TEAM && names.indexOf(state.view) === -1) state.view = TEAM;
    select.innerHTML = '';
    select.appendChild(new Option('Consolidado', TEAM));
    names.forEach(function (name) { select.appendChild(new Option(name, name)); });
    select.value = state.view;
  }

  function destroyCharts() {
    charts.forEach(function (c) { c.destroy(); });
    charts = [];
  }

  function render() {
    renderSelect();
    renderStatus();
    destroyCharts();
    var root = $('dashboard');
    root.innerHTML = '';
    if (!state.assessors.length) {
      root.appendChild(el('div', { class: 'notice', text: 'Ainda não há respostas. O painel se atualiza sozinho quando elas chegarem.' }));
      return;
    }
    if (state.view === TEAM) renderTeam(root, summarize(state.assessors));
    else renderAssessor(root, assessorView(state.assessors, state.view));
  }

  // Componentes
  function kpi(label, value, note) {
    return el('div', { class: 'kpi' }, [
      el('div', { class: 'kpi-label', text: label }),
      el('div', { class: 'kpi-value', text: value }),
      note ? el('div', { class: 'kpi-note', text: note }) : null,
    ]);
  }

  function card(title, body) {
    return el('div', { class: 'card' }, [el('h3', { text: title }), body]);
  }

  function chartBox(height, config) {
    var canvas = el('canvas');
    var box = el('div', { class: 'chart-box' }, [canvas]);
    box.style.height = height + 'px';
    config.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: false }, config.options || {});
    // O gráfico só pode ser criado depois que o canvas estiver na página.
    setTimeout(function () { if (canvas.isConnected) charts.push(new Chart(canvas, config)); }, 0);
    return box;
  }

  // Quebra rótulos longos em linhas, para não serem cortados no eixo.
  function wrap(text) {
    var words = String(text).split(' ');
    var lines = [''];
    words.forEach(function (word) {
      var last = lines.length - 1;
      if (lines[last] && (lines[last] + ' ' + word).length > 20) lines.push(word);
      else lines[last] = lines[last] ? lines[last] + ' ' + word : word;
    });
    return lines;
  }

  // Eixo de categorias com largura fixa e rótulos alinhados à esquerda: Chart.js corta rótulos longos.
  function categoryAxis(extra) {
    return Object.assign({
      afterFit: function (scale) { scale.width = Math.min(170, scale.chart.width * 0.42); },
      ticks: { autoSkip: false, crossAlign: 'far', font: { size: 11 } },
    }, extra || {});
  }

  function shortLabel(text) {
    return String(text).replace(/\s*\([^)]*\)\s*$/, '');
  }

  // Altura suficiente para cada rótulo quebrado em linhas, sem sobrepor o vizinho.
  function barHeight(labels, factor) {
    var row = labels.length > 12 ? 24 : 34;
    // Chart.js dá a mesma altura a todas as categorias, então o rótulo mais alto define todas.
    var tallest = Math.max.apply(null, labels.map(function (lines) { return lines.length; }));
    return Math.max(160, labels.length * Math.max(row * (factor || 1), tallest * 14 + 12) + 50);
  }

  function horizontalBars(items, format, highlight) {
    if (!items.length) return el('p', { class: 'empty', text: 'Sem valores numéricos.' });
    var labels = items.map(function (x) { return wrap(x.name || x.label); });
    var isCount = items[0].count !== undefined;
    return chartBox(barHeight(labels), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: items.map(function (x) { return x.value === undefined ? (x.count === undefined ? x.avg : x.count) : x.value; }),
          backgroundColor: items.map(function (x) { return highlight && x.name !== highlight ? MUTED : GOLD; }),
          borderRadius: 3,
        }],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return format(c.parsed.x); } } } },
        scales: { x: { beginAtZero: true, ticks: { precision: isCount ? 0 : undefined, callback: function (v) { return format(v); } } }, y: categoryAxis() },
      },
    });
  }

  function stackedBars(rows) {
    // rows: [{label, parts: [{label, avg}]}]
    var parts = rows[0].parts;
    return chartBox(rows.length * 46 + 60 + parts.length * 22, {
      type: 'bar',
      data: {
        labels: rows.map(function (r) { return r.label; }),
        datasets: parts.map(function (part, i) {
          return {
            label: shortLabel(part.label),
            fullLabel: part.label,
            data: rows.map(function (r) { return r.parts[i].avg; }),
            backgroundColor: PALETTE[i % PALETTE.length],
          };
        }),
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { callbacks: { label: function (c) { return c.dataset.fullLabel + ': ' + percent(c.parsed.x); } } } },
        scales: { x: { stacked: true, min: 0, suggestedMax: 100, ticks: { callback: function (v) { return v + '%'; } } }, y: categoryAxis({ stacked: true }) },
      },
    });
  }

  function rankChart(rows, own) {
    var datasets = [{ label: own ? 'Equipe (posição média)' : 'Posição média', data: rows.map(function (r) { return r.avg; }), backgroundColor: own ? BLUE : GOLD, borderRadius: 3 }];
    if (own) {
      var mine = {};
      own.forEach(function (r) { mine[r.label] = r.avg; });
      datasets.unshift({ label: 'Assessor', data: rows.map(function (r) { return mine[r.label]; }), backgroundColor: GOLD, borderRadius: 3 });
    }
    var labels = rows.map(function (r) { return wrap(r.label); });
    return chartBox(barHeight(labels, own ? 1.6 : 1) + (own ? 30 : 0), {
      type: 'bar',
      data: { labels: labels, datasets: datasets },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: !!own, position: 'bottom' }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + number(c.parsed.x, 1); } } } },
        scales: { x: { min: 0, max: rows.length, title: { display: true, text: '1 = maior prioridade' } }, y: categoryAxis() },
      },
    });
  }

  function outrosTable(rows, mode) {
    var head = mode === 'team'
      ? [el('th', { text: 'Pergunta' }), el('th', { class: 'num', text: 'Total' }), el('th', { class: 'num', text: 'Média' })]
      : [el('th', { text: 'Pergunta' }), el('th', { class: 'num', text: 'Assessor' }), el('th', { class: 'num', text: 'Média da equipe' })];
    var body = rows.map(function (r) {
      var fmt = r.label.indexOf('(R$)') !== -1 ? money : function (v) { return number(v, 1); };
      var cells = mode === 'team'
        ? [r.total === null ? '–' : fmt(r.total), fmt(r.avg)]
        : [r.values.length ? fmt(r.values[0].value) : '–', fmt(r.teamAvg)];
      return el('tr', {}, [el('td', { text: r.label })].concat(cells.map(function (c) { return el('td', { class: 'num', text: c }); })));
    });
    return el('div', { class: 'table-wrap' }, [el('table', {}, [el('thead', {}, [el('tr', {}, head)]), el('tbody', {}, body)])]);
  }

  function openAnswers(groups, showNames) {
    return el('div', { class: 'open' }, groups.map(function (group) {
      var items = group.answers.length
        ? group.answers.map(function (a) {
          return el('div', { class: 'open-item' }, [showNames ? el('div', { class: 'open-name', text: a.name }) : null, el('div', { class: 'open-text', text: a.text })]);
        })
        : [el('p', { class: 'empty', text: 'Sem respostas.' })];
      return card(group.title, el('div', {}, items));
    }));
  }

  // Visões
  function renderTeam(root, s) {
    root.appendChild(el('div', { class: 'kpis' }, [
      kpi('Captação total', money(s.kpis.captacao)),
      kpi('Novas contas', number(s.kpis.contas)),
      kpi('ROA médio', percent(s.kpis.roa)),
      kpi('Objetivo de AuC somado', money(s.kpis.auc)),
    ]));
    root.appendChild(el('div', { class: 'grid' }, [
      card('Captação por assessor', horizontalBars(s.byAssessor.captacao, money)),
      card('Objetivo de AuC por assessor', horizontalBars(s.byAssessor.auc, money)),
      card('Origem da captação e modelo de receita (médias)', el('div', {}, [
        stackedBars([{ label: 'Origem da captação', parts: s.stacked.origem }]),
        stackedBars([{ label: 'Receita', parts: s.stacked.receita }]),
      ])),
      card('Prioridade de alocação', rankChart(s.rank)),
      card('Cross-sell PJ', horizontalBars(s.counts.crossSell, number)),
      card('Régua de relacionamento definida', horizontalBars(s.counts.regua, number)),
      card('Materiais de apoio da mesa', horizontalBars(s.counts.apoio, number)),
      card('Certificações planejadas', horizontalBars(s.counts.certificacoes, number)),
      card('Nota da rotina de relacionamento (0 a 10)', horizontalBars(s.byAssessor.nota, function (v) { return number(v, 1); })),
      card('Teto de churn (% a.a.)', horizontalBars(s.byAssessor.churn, percent)),
    ]));
    root.appendChild(el('h2', { text: 'Outros números' }));
    root.appendChild(card('Valores da equipe', outrosTable(s.outros, 'team')));
    root.appendChild(el('h2', { text: 'Respostas abertas' }));
    root.appendChild(openAnswers(s.open, true));
  }

  function teamAverage(items) {
    return items.length ? items.reduce(function (sum, x) { return sum + x.value; }, 0) / items.length : null;
  }

  function chips(items) {
    var selected = items.filter(function (x) { return x.count > 0; });
    if (!selected.length) return el('p', { class: 'empty', text: 'Nenhuma opção marcada.' });
    return el('div', { class: 'chips' }, selected.map(function (x) { return el('span', { class: 'chip', text: x.label }); }));
  }

  function renderAssessor(root, view) {
    var own = view.own;
    var team = view.team;
    var name = state.view;
    var mine = function (list) { return list.length ? list[0].value : null; };
    root.appendChild(el('div', { class: 'kpis' }, [
      kpi('Captação', money(own.kpis.captacao), 'Média da equipe: ' + money(teamAverage(team.byAssessor.captacao))),
      kpi('Novas contas', number(own.kpis.contas), 'Média da equipe: ' + number(teamAverage(team.byAssessor.contas), 1)),
      kpi('ROA', percent(own.kpis.roa), 'Média da equipe: ' + percent(team.kpis.roa)),
      kpi('Objetivo de AuC', money(own.kpis.auc), 'Média da equipe: ' + money(teamAverage(team.byAssessor.auc))),
      kpi('Nota da rotina', number(mine(own.byAssessor.nota), 0), 'Média da equipe: ' + number(teamAverage(team.byAssessor.nota), 1)),
      kpi('Teto de churn', percent(mine(own.byAssessor.churn)), 'Média da equipe: ' + percent(teamAverage(team.byAssessor.churn))),
    ]));
    root.appendChild(el('div', { class: 'grid' }, [
      card('Captação comparada à equipe', horizontalBars(team.byAssessor.captacao, money, name)),
      card('Objetivo de AuC comparado à equipe', horizontalBars(team.byAssessor.auc, money, name)),
      card('Origem da captação e modelo de receita', el('div', {}, [
        stackedBars([{ label: 'Origem: assessor', parts: own.stacked.origem }, { label: 'Origem: equipe', parts: team.stacked.origem }]),
        stackedBars([{ label: 'Receita: assessor', parts: own.stacked.receita }, { label: 'Receita: equipe', parts: team.stacked.receita }]),
      ])),
      card('Prioridade de alocação', rankChart(team.rank, own.rank)),
      card('Cross-sell PJ', chips(own.counts.crossSell)),
      card('Régua de relacionamento definida', chips(own.counts.regua)),
      card('Materiais de apoio da mesa', chips(own.counts.apoio)),
      card('Certificações planejadas', chips(own.counts.certificacoes)),
    ]));
    var outros = own.outros.map(function (r, i) { return Object.assign({ teamAvg: team.outros[i].avg }, r); });
    root.appendChild(el('h2', { text: 'Outros números' }));
    root.appendChild(card('Valores do assessor', outrosTable(outros, 'assessor')));
    root.appendChild(el('h2', { text: 'Respostas abertas' }));
    root.appendChild(openAnswers(own.open, false));
  }

  // Eventos
  $('login-form').addEventListener('submit', login);
  $('logout').addEventListener('click', function () { logout(''); });
  $('refresh').addEventListener('click', load);
  $('view').addEventListener('change', function () { state.view = $('view').value; render(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && storedPassword() && state.assessors) load(); });

  if (storedPassword()) {
    // Mostra o painel vazio enquanto confere a senha salva.
    $('dashboard').hidden = false;
    $('dashboard').appendChild(el('div', { class: 'notice', text: 'Carregando respostas...' }));
    request(storedPassword())
      .then(function (result) {
        if (result.error === 'senha') return logout('Senha incorreta ou alterada. Entre novamente.');
        if (!result.ok) return showLogin(refusal(result));
        state.assessors = result.assessors;
        state.fetchedAt = new Date().toISOString();
        enterDashboard();
      })
      // Falha de rede não apaga a senha salva: basta entrar de novo.
      .catch(function () { showLogin('Não foi possível conectar. Tente novamente.'); });
  } else {
    showLogin('');
  }
})();
