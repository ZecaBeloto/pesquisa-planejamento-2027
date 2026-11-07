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

  // Linha tracejada da média em gráficos de barras horizontais: options.plugins.averageLine = { value, label }.
  Chart.register({
    id: 'averageLine',
    afterDatasetsDraw: function (chart, args, options) {
      if (options.value === null || options.value === undefined) return;
      var x = chart.scales.x.getPixelForValue(options.value);
      var area = chart.chartArea;
      if (x < area.left || x > area.right) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = options.color || '#E2C97E';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x, area.top - 4);
      ctx.lineTo(x, area.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = options.color || '#E2C97E';
      ctx.font = '600 11px ' + Chart.defaults.font.family;
      var text = options.label || '';
      var width = ctx.measureText(text).width;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = x + width / 2 > area.right ? 'right' : (x - width / 2 < area.left ? 'left' : 'center');
      ctx.fillText(text, x, area.top - 6);
      ctx.restore();
    },
  });

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
    var parts = value.toFixed(digits === undefined ? 0 : digits).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
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
    else renderAssessor(root, assessorView(state.assessors, state.view), state.view);
    mountCharts(root, charts);
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
    // O gráfico só pode ser criado depois que o canvas estiver na página: ver mountCharts.
    canvas.chartConfig = config;
    return box;
  }

  function mountCharts(root, registry) {
    root.querySelectorAll('canvas').forEach(function (canvas) {
      if (!canvas.chartConfig) return;
      registry.push(new Chart(canvas, canvas.chartConfig));
      canvas.chartConfig = null;
    });
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

  function horizontalBars(items, format, highlight, average) {
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
        layout: { padding: { top: hasAverage(average) ? 20 : 0 } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return format(c.parsed.x); } } },
          averageLine: { value: hasAverage(average) ? average : null, label: 'Média ' + (hasAverage(average) ? format(average) : '') },
        },
        scales: { x: { beginAtZero: true, ticks: { precision: isCount ? 0 : undefined, callback: function (v) { return format(v); } } }, y: categoryAxis() },
      },
    });
  }

  function hasAverage(value) {
    return typeof value === 'number' && isFinite(value);
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
      card('Captação por assessor', horizontalBars(s.byAssessor.captacao, money, null, teamAverage(s.byAssessor.captacao))),
      card('Objetivo de AuC por assessor', horizontalBars(s.byAssessor.auc, money, null, teamAverage(s.byAssessor.auc))),
      card('Origem da captação e modelo de receita (médias)', el('div', {}, [
        stackedBars([{ label: 'Origem da captação', parts: s.stacked.origem }]),
        stackedBars([{ label: 'Receita', parts: s.stacked.receita }]),
      ])),
      card('Prioridade de alocação', rankChart(s.rank)),
      card('Cross-sell PJ', horizontalBars(s.counts.crossSell, number)),
      card('Régua de relacionamento definida', horizontalBars(s.counts.regua, number)),
      card('Materiais de apoio da mesa', horizontalBars(s.counts.apoio, number)),
      card('Certificações planejadas', horizontalBars(s.counts.certificacoes, number)),
      card('Nota da rotina de relacionamento (0 a 10)', horizontalBars(s.byAssessor.nota, function (v) { return number(v, 1); }, null, teamAverage(s.byAssessor.nota))),
      card('Teto de churn (% a.a.)', horizontalBars(s.byAssessor.churn, percent, null, teamAverage(s.byAssessor.churn))),
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

  // reserved: PDF individual, que pode ser entregue ao assessor. Os gráficos por assessor
  // mostram só ele e a média da equipe, sem os valores dos colegas.
  function renderAssessor(root, view, name, reserved) {
    var own = view.own;
    var team = view.team;
    var compareSeries = function (list) {
      if (!reserved) return list;
      var mineOnly = list.filter(function (x) { return x.name === name; });
      var avg = teamAverage(list);
      return mineOnly.concat(avg === null ? [] : [{ name: 'Média da equipe', value: avg }]);
    };
    var mine = function (list) { return list.length ? list[0].value : null; };
    root.appendChild(el('div', { class: 'kpis' }, [
      kpi('Captação', money(own.kpis.captacao), 'Média da equipe: ' + money(teamAverage(team.byAssessor.captacao))),
      kpi('Novas contas', number(own.kpis.contas), 'Média da equipe: ' + number(teamAverage(team.byAssessor.contas), 1)),
      kpi('ROA', percent(own.kpis.roa), 'Média da equipe: ' + percent(team.kpis.roa)),
      kpi('Objetivo de AuC', money(own.kpis.auc), 'Média da equipe: ' + money(teamAverage(team.byAssessor.auc))),
      kpi('Nota da rotina', number(mine(own.byAssessor.nota), 1), 'Média da equipe: ' + number(teamAverage(team.byAssessor.nota), 1)),
      kpi('Teto de churn', percent(mine(own.byAssessor.churn)), 'Média da equipe: ' + percent(teamAverage(team.byAssessor.churn))),
    ]));
    root.appendChild(el('div', { class: 'grid' }, [
      card('Captação comparada à equipe', horizontalBars(compareSeries(team.byAssessor.captacao), money, name, reserved ? null : teamAverage(team.byAssessor.captacao))),
      card('Objetivo de AuC comparado à equipe', horizontalBars(compareSeries(team.byAssessor.auc), money, name, reserved ? null : teamAverage(team.byAssessor.auc))),
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

  // Relatórios em PDF: cada bloco da tela vira uma imagem, distribuída em páginas A4.
  var PAGE = { width: 210, height: 297, margin: 12, top: 24, bottom: 284 };
  var logoData = null;

  function loadLogo() {
    if (logoData) return Promise.resolve(logoData);
    return fetch('../web/logo.png')
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () { logoData = reader.result; resolve(logoData); };
          reader.readAsDataURL(blob);
        });
      });
  }

  function reportHeading(title, subtitle) {
    return el('div', { class: 'report-heading' }, [
      el('div', { class: 'kicker', text: 'Planejamento 2027' }),
      el('h1', { text: title }),
      subtitle ? el('p', { class: 'muted', text: subtitle }) : null,
    ]);
  }

  function answersSection(assessor) {
    return el('div', { class: 'report-answers' }, [el('h2', { text: 'Todas as respostas' })].concat(answerRows(assessor).map(function (row) {
      return el('div', { class: 'card' }, [el('h3', { text: row.title })].concat(row.items.map(function (item) {
        return el('div', { class: 'answer-item' }, [
          item.label ? el('div', { class: 'answer-label', text: item.label }) : null,
          el('div', { class: 'open-text', text: item.value }),
        ]);
      })));
    })));
  }

  // Divide o conteúdo em blocos que não devem ser cortados: grades viram linhas de dois cartões.
  function reportBlocks(container) {
    var blocks = [];
    Array.prototype.slice.call(container.children).forEach(function (child) {
      if (child.classList.contains('grid')) {
        var cards = Array.prototype.slice.call(child.children);
        for (var i = 0; i < cards.length; i += 2) {
          var row = el('div', { class: 'grid' });
          container.insertBefore(row, child);
          row.appendChild(cards[i]);
          if (cards[i + 1]) row.appendChild(cards[i + 1]);
          blocks.push(row);
        }
        child.remove();
      } else if (child.classList.contains('open') || child.classList.contains('report-answers')) {
        Array.prototype.slice.call(child.children).forEach(function (part) { blocks.push(part); });
      } else {
        blocks.push(child);
      }
    });
    return blocks;
  }

  // Monta uma seção (Consolidado ou um assessor) fora da tela, com tema claro, e devolve as imagens dos blocos.
  function captureSection(build) {
    var container = el('div', { class: 'report' });
    document.body.appendChild(container);
    var reportCharts = [];
    var color = Chart.defaults.color;
    var border = Chart.defaults.borderColor;
    var blocks;
    Chart.defaults.color = '#33415c';
    Chart.defaults.borderColor = 'rgba(6, 21, 44, .12)';
    try {
      build(container);
      blocks = reportBlocks(container);
      mountCharts(container, reportCharts);
    } finally {
      Chart.defaults.color = color;
      Chart.defaults.borderColor = border;
    }
    return blocks.reduce(function (chain, block) {
      return chain.then(function (images) {
        return html2canvas(block, { scale: 1.5, backgroundColor: '#ffffff', logging: false }).then(function (canvas) {
          images.push(canvas);
          return images;
        });
      });
    }, Promise.resolve([])).finally(function () {
      reportCharts.forEach(function (c) { c.destroy(); });
      container.remove();
    });
  }

  function addSection(doc, title, images, first) {
    var titles = doc.sectionTitles || (doc.sectionTitles = []);
    var newPage = function () { doc.addPage(); titles[doc.getNumberOfPages()] = title; };
    if (first) titles[1] = title;
    else newPage();
    var width = PAGE.width - PAGE.margin * 2;
    var room = PAGE.bottom - PAGE.top;
    var y = PAGE.top;
    images.forEach(function (canvas) {
      var height = canvas.height * width / canvas.width;
      if (height <= room) {
        if (y + height > PAGE.bottom) { newPage(); y = PAGE.top; }
        doc.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', PAGE.margin, y, width, height);
        y += height + 4;
        return;
      }
      // Bloco maior que uma página: corta a imagem em fatias.
      var pxPerMm = canvas.width / width;
      for (var offset = 0; offset < canvas.height;) {
        if (y > PAGE.top) { newPage(); y = PAGE.top; }
        var slicePx = Math.min(canvas.height - offset, Math.floor(room * pxPerMm));
        var slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = slicePx;
        slice.getContext('2d').drawImage(canvas, 0, offset, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
        doc.addImage(slice.toDataURL('image/jpeg', 0.8), 'JPEG', PAGE.margin, y, width, slicePx / pxPerMm);
        y += slicePx / pxPerMm + 4;
        offset += slicePx;
      }
    });
  }

  function decorate(doc, logo) {
    var total = doc.getNumberOfPages();
    var titles = doc.sectionTitles || [];
    var title = '';
    var now = dateTime(new Date().toISOString());
    for (var page = 1; page <= total; page++) {
      doc.setPage(page);
      title = titles[page] || title;
      doc.setFillColor(6, 21, 44);
      doc.rect(0, 0, PAGE.width, 16, 'F');
      doc.addImage(logo, 'PNG', PAGE.margin, 3.5, 30, 9);
      doc.setTextColor(200, 168, 75);
      doc.setFontSize(10);
      doc.text(title, PAGE.width - PAGE.margin, 10, { align: 'right' });
      doc.setTextColor(110, 120, 140);
      doc.setFontSize(8);
      doc.text('Planejamento 2027 · GR Capital · gerado em ' + now, PAGE.margin, 291);
      doc.text('página ' + page + ' de ' + total, PAGE.width - PAGE.margin, 291, { align: 'right' });
    }
  }

  function newDoc() {
    return new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  }

  function assessorSection(doc, assessors, assessor, first, reserved) {
    return captureSection(function (root) {
      root.appendChild(reportHeading(assessor.name, 'Resposta enviada em ' + dateTime(assessor.submittedAt)));
      renderAssessor(root, assessorView(assessors, assessor.name), assessor.name, reserved);
      root.appendChild(answersSection(assessor));
    }).then(function (images) { addSection(doc, assessor.name, images, first); });
  }

  function download(blob, fileName) {
    var link = el('a', { href: URL.createObjectURL(blob), download: fileName });
    document.body.appendChild(link);
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  }

  function runExport(button, task) {
    var buttons = [$('pdf-zip'), $('pdf-full')];
    var label = button.textContent;
    var assessors = state.assessors;
    if (!assessors || !assessors.length) { $('status').textContent = 'Ainda não há respostas para exportar.'; return; }
    buttons.forEach(function (b) { b.disabled = true; });
    loadLogo()
      .then(function (logo) { return task(assessors, logo, function (text) { button.textContent = text; }); })
      .catch(function () { renderStatus(); $('status').textContent += ' · não foi possível gerar o PDF'; })
      .finally(function () {
        button.textContent = label;
        buttons.forEach(function (b) { b.disabled = false; });
      });
  }

  function exportZip(assessors, logo, progress) {
    var zip = new JSZip();
    var names = pdfFileNames(assessors.map(function (a) { return a.name; }));
    return assessors.reduce(function (chain, assessor, i) {
      return chain.then(function () {
        progress('Gerando ' + (i + 1) + ' de ' + assessors.length + '...');
        var doc = newDoc();
        return assessorSection(doc, assessors, assessor, true, true).then(function () {
          decorate(doc, logo);
          zip.file(names[i], doc.output('blob'));
        });
      });
    }, Promise.resolve())
      .then(function () { progress('Compactando...'); return zip.generateAsync({ type: 'blob' }); })
      .then(function (blob) { download(blob, 'Planejamento2027_Assessores.zip'); });
  }

  // Relatório gerencial (botão "Relatório completo"): texto escrito no PDF com a Poppins embutida,
  // gráficos em alta resolução e quebras de página entre linhas e entre barras, nunca no meio delas.
  var FONT_BASE = 'https://cdn.jsdelivr.net/gh/google/fonts@7dc16b7de42db624b902f2292b68ed9e489e5053/ofl/poppins/';
  var FONTS = [
    { file: 'Poppins-Regular.ttf', style: 'normal', sha256: 'fmUgHpt5FZ4jACZ8yIXhbI3O8kJM36CaKb+wmAqUp7o=' },
    { file: 'Poppins-SemiBold.ttf', style: 'semibold', sha256: '078b2vBVDoPamsCx0dn+bbCGg1qDqihXjmCaOUuaAoY=' },
    { file: 'Poppins-Bold.ttf', style: 'bold', sha256: 'mDZ2UWFndIt03m9Hcfs4TGZP2ROsuLRxEi7Kz12l6mw=' },
  ];
  var fontData = null;
  var MM = 3.7795; // pixels CSS por milímetro
  var CHART_SCALE = 3;
  var G = { width: 210, height: 297, margin: 16, top: 24, bottom: 282 };
  var C = {
    navy: [6, 21, 44], gold: [200, 168, 75], goldLight: [226, 201, 126], goldDark: [138, 109, 31],
    text: [6, 21, 44], muted: [90, 100, 120], line: [221, 225, 232], white: [255, 255, 255], soft: [205, 212, 224],
  };

  function toBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  // As fontes vêm de um endereço fixo e são conferidas pelo hash antes de entrar no PDF.
  function loadFonts() {
    if (fontData) return Promise.resolve(fontData);
    return Promise.all(FONTS.map(function (font) {
      return fetch(FONT_BASE + font.file)
        .then(function (r) { if (!r.ok) throw new Error('fonte'); return r.arrayBuffer(); })
        .then(function (buffer) {
          return crypto.subtle.digest('SHA-256', buffer).then(function (hash) {
            if (toBase64(hash) !== font.sha256) throw new Error('fonte alterada');
            return { file: font.file, style: font.style, data: toBase64(buffer) };
          });
        });
    })).then(function (list) { fontData = list; return list; });
  }

  function fullDate(date) {
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear();
  }

  function Writer(doc) {
    this.doc = doc;
    this.y = G.top;
    this.title = '';
    this.pageTitles = {};
  }

  Writer.prototype.width = function () { return G.width - G.margin * 2; };

  Writer.prototype.font = function (style, size, color) {
    this.doc.setFont('Poppins', style);
    this.doc.setFontSize(size);
    this.doc.setTextColor.apply(this.doc, color || C.text);
  };

  Writer.prototype.newPage = function (title) {
    if (title !== undefined) this.title = title;
    this.doc.addPage();
    this.pageTitles[this.doc.getNumberOfPages()] = this.title;
    this.y = G.top;
  };

  // Garante espaço para um bloco; se não couber, ele começa na página seguinte.
  Writer.prototype.ensure = function (height) {
    if (this.y + height > G.bottom) this.newPage();
  };

  Writer.prototype.lines = function (text, size, width) {
    this.doc.setFontSize(size);
    return this.doc.splitTextToSize(String(text), width || this.width());
  };

  // Escreve um texto linha a linha; a quebra de página acontece entre linhas.
  Writer.prototype.paragraph = function (text, opts) {
    opts = opts || {};
    var size = opts.size || 10;
    var lineHeight = size * 0.47;
    this.font(opts.style || 'normal', size, opts.color);
    var x = opts.x || G.margin;
    var lines = this.lines(text, size, opts.width);
    for (var i = 0; i < lines.length; i++) {
      this.ensure(lineHeight);
      this.font(opts.style || 'normal', size, opts.color);
      this.doc.text(lines[i], x, this.y + lineHeight * 0.78);
      this.y += lineHeight;
    }
    this.y += opts.after === undefined ? 1.5 : opts.after;
  };

  // Título de seção: vai para a página seguinte se não houver espaço também para o que vem depois dele.
  Writer.prototype.heading = function (text, keepWith) {
    this.ensure(12 + (keepWith || 20));
    this.y += 3;
    this.font('semibold', 13, C.text);
    this.doc.text(text, G.margin, this.y + 5);
    this.doc.setDrawColor.apply(this.doc, C.gold);
    this.doc.setLineWidth(0.6);
    this.doc.line(G.margin, this.y + 7.5, G.margin + 14, this.y + 7.5);
    this.y += 11;
  };

  Writer.prototype.subheading = function (text, keepWith) {
    var lines = this.lines(text, 10.5, this.width());
    this.ensure(lines.length * 5 + (keepWith || 12));
    this.paragraph(text, { style: 'semibold', size: 10.5, after: 1.5 });
  };

  Writer.prototype.image = function (data, x, y, w, h) {
    this.doc.addImage(data, 'PNG', x, y, w, h, undefined, 'FAST');
  };

  // Desenha um gráfico do Chart.js fora da tela, em alta resolução, e devolve a imagem.
  function chartImage(config, widthMm, heightMm) {
    var holder = el('div', { class: 'report-chart' });
    var canvas = el('canvas');
    holder.style.width = Math.round(widthMm * MM) + 'px';
    holder.style.height = Math.round(heightMm * MM) + 'px';
    holder.appendChild(canvas);
    document.body.appendChild(holder);
    var color = Chart.defaults.color;
    var border = Chart.defaults.borderColor;
    Chart.defaults.color = '#33415c';
    Chart.defaults.borderColor = 'rgba(6, 21, 44, .12)';
    config.options = Object.assign({}, config.options, { responsive: true, maintainAspectRatio: false, animation: false, devicePixelRatio: CHART_SCALE });
    if (config.options.plugins && config.options.plugins.averageLine) config.options.plugins.averageLine.color = '#8a6d1f';
    var chart = new Chart(canvas, config);
    var data = canvas.toDataURL('image/png');
    chart.destroy();
    holder.remove();
    Chart.defaults.color = color;
    Chart.defaults.borderColor = border;
    return data;
  }

  function configOf(box) {
    var canvas = box.querySelector && box.querySelector('canvas');
    return canvas ? canvas.chartConfig : null;
  }

  function rowHeightMm(items, count) {
    var tallest = Math.max.apply(null, items.map(function (x) { return wrap(x.name || x.label).length; }));
    return Math.max(count > 12 ? 6.2 : 8, tallest * 3.6 + 2.6);
  }

  // Gráfico de barras por assessor dividido entre páginas por linhas inteiras, todas as partes na mesma escala.
  Writer.prototype.barsByAssessor = function (title, items, format, average) {
    if (!items.length) { this.subheading(title); this.paragraph('Sem valores numéricos.', { color: C.muted }); return; }
    var row = rowHeightMm(items, items.length);
    var axis = 16;
    var titleH = 8;
    var firstRoom = Math.floor((G.bottom - this.y - titleH - axis - 4) / row);
    if (firstRoom < Math.min(4, items.length)) { this.newPage(); firstRoom = Math.floor((G.bottom - this.y - titleH - axis - 4) / row); }
    var fullRoom = Math.floor((G.bottom - G.top - titleH - axis - 4) / row);
    var max = niceMax(Math.max.apply(null, items.map(function (x) { return x.value; }).concat(average || 0)) * 1.04);
    var sizes = chunkSizes(items.length, firstRoom, fullRoom);
    var start = 0;
    for (var i = 0; i < sizes.length; i++) {
      if (i > 0) this.newPage();
      var part = items.slice(start, start + sizes[i]);
      start += sizes[i];
      this.font('semibold', 10.5, C.text);
      this.doc.text(title + (i > 0 ? ' (continuação)' : ''), G.margin, this.y + 4);
      this.y += titleH;
      var config = configOf(horizontalBars(part, format, null, average));
      config.options.scales.x.max = max;
      config.options.scales.x.ticks.stepSize = max / 5;
      config.options.scales.x.ticks.maxRotation = 0;
      var height = part.length * row + axis;
      this.image(chartImage(config, this.width(), height), G.margin, this.y, this.width(), height);
      this.y += height + 5;
    }
  };

  Writer.prototype.chart = function (title, box, heightMm, width, x) {
    var config = configOf(box);
    var w = width || this.width();
    if (!config) { this.subheading(title); this.paragraph('Sem respostas.', { color: C.muted }); return; }
    this.image(chartImage(config, w, heightMm), x || G.margin, this.y, w, heightMm);
  };

  // Dois gráficos lado a lado, com títulos; o par inteiro muda de página se não couber.
  Writer.prototype.chartPair = function (left, right) {
    var gap = 6;
    var w = (this.width() - gap) / 2;
    var height = Math.max(left.height, right.height);
    this.ensure(height + 10);
    var self = this;
    [left, right].forEach(function (item, i) {
      var x = G.margin + i * (w + gap);
      self.font('semibold', 10, C.text);
      self.doc.splitTextToSize(item.title, w).slice(0, 1).forEach(function (line) { self.doc.text(line, x, self.y + 4); });
      var config = configOf(item.box);
      if (config) self.image(chartImage(config, w, item.height), x, self.y + 7, w, item.height);
      else { self.font('normal', 9.5, C.muted); self.doc.text('Sem respostas.', x, self.y + 12); }
    });
    this.y += height + 12;
  };

  Writer.prototype.table = function (head, rows, widths) {
    var self = this;
    var x0 = G.margin;
    var drawRow = function (cells, style, color) {
      var cellLines = cells.map(function (c, i) { return self.lines(c, 9.5, widths[i] - 3); });
      var h = Math.max.apply(null, cellLines.map(function (l) { return l.length; })) * 4.6 + 3;
      self.ensure(h);
      var x = x0;
      cellLines.forEach(function (lines, i) {
        self.font(style, 9.5, color);
        lines.forEach(function (line, j) {
          var align = i > 0 ? 'right' : 'left';
          self.doc.text(line, align === 'right' ? x + widths[i] - 1 : x, self.y + 4.4 + j * 4.6, { align: align });
        });
        x += widths[i];
      });
      self.y += h;
      self.doc.setDrawColor.apply(self.doc, C.line);
      self.doc.setLineWidth(0.25);
      self.doc.line(x0, self.y, x0 + self.width(), self.y);
    };
    this.ensure(18);
    drawRow(head, 'semibold', C.muted);
    rows.forEach(function (r) { drawRow(r, 'normal', C.text); });
    this.y += 4;
  };

  // Respostas abertas: o nome do assessor sempre acompanha ao menos duas linhas da resposta.
  Writer.prototype.openAnswers = function (group) {
    this.subheading(group.title, 16);
    if (!group.answers.length) { this.paragraph('Sem respostas.', { color: C.muted }); return; }
    var self = this;
    group.answers.forEach(function (answer) {
      var lines = self.lines(answer.text, 9.5);
      self.ensure(5 + Math.min(lines.length, 2) * 4.5);
      self.paragraph(answer.name, { style: 'semibold', size: 9, color: C.goldDark, after: 0.3 });
      self.paragraph(answer.text, { size: 9.5, after: 3 });
    });
    this.y += 2;
  };

  function pdfRank(rows) {
    return rows.map(function (r) { return { label: shortLabel2(r.label), avg: r.avg }; });
  }

  // Máximo "redondo" para o eixo, para os valores dos ticks não saírem quebrados.
  function niceMax(value) {
    if (!(value > 0)) return 1;
    var magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * magnitude >= value) return steps[i] * magnitude;
    return 10 * magnitude;
  }

  function shortLabel2(text) {
    return String(text).replace(/\s*\([^)]*\)\s*$/, '');
  }

  function coverPage(w, summary, assessors) {
    var doc = w.doc;
    var W = G.width;
    w.pageTitles[1] = null;
    doc.setFillColor.apply(doc, C.navy);
    doc.rect(0, 0, W, 122, 'F');
    doc.addImage(logoData, 'PNG', G.margin, 13, 34, 10.2);
    w.font('semibold', 10.5, C.gold);
    doc.text('Relatório gerencial', G.margin, 40);
    w.font('bold', 28, C.white);
    doc.text('Planejamento 2027', G.margin, 53);
    w.font('normal', 10, C.soft);
    doc.text('Consolidado da equipe, ' + summary.count + (summary.count === 1 ? ' resposta' : ' respostas') + ', gerado em ' + fullDate(new Date()), G.margin, 61);

    w.font('bold', 34, C.goldLight);
    doc.text(money(summary.kpis.captacao), G.margin, 84);
    w.font('normal', 10, C.soft);
    doc.text('objetivo de captação líquida da equipe para 2027', G.margin, 91);

    // Barra de origem da captação, proporcional às médias da equipe.
    var colors = [[200, 168, 75], [127, 156, 196], [61, 90, 128]];
    var x = G.margin;
    var barW = W - G.margin * 2;
    var total = summary.stacked.origem.reduce(function (s, p) { return s + (p.avg || 0); }, 0) || 1;
    summary.stacked.origem.forEach(function (part, i) {
      var pw = barW * (part.avg || 0) / total;
      doc.setFillColor.apply(doc, colors[i % colors.length]);
      doc.rect(x, 98, pw, 4.5, 'F');
      x += pw;
    });
    var lx = G.margin;
    summary.stacked.origem.forEach(function (part, i) {
      var label = shortLabel2(part.label) + ' ' + (part.avg === null ? '–' : String(Number(part.avg.toFixed(1))).replace('.', ',') + '%');
      doc.setFillColor.apply(doc, colors[i % colors.length]);
      doc.rect(lx, 107.2, 2.6, 2.6, 'F');
      w.font('normal', 8.5, C.soft);
      doc.text(label, lx + 4, 109.4);
      lx += doc.getTextWidth(label) + 10;
    });

    // Seis números em grade, separados por linhas finas.
    var avgOf = function (list) { return teamAverage(list); };
    var ticket = summary.outros[0];
    var figures = [
      ['Objetivo de AuC somado', money(summary.kpis.auc)],
      ['Novas contas', number(summary.kpis.contas)],
      ['Ticket médio por conta', money(ticket.avg)],
      ['ROA médio', percent(summary.kpis.roa)],
      ['Nota média de relacionamento', number(avgOf(summary.byAssessor.nota), 1)],
      ['Teto de churn médio', percent(avgOf(summary.byAssessor.churn))],
    ];
    var colW = barW / 3;
    var top = 132;
    doc.setDrawColor.apply(doc, C.line);
    doc.setLineWidth(0.25);
    figures.forEach(function (f, i) {
      var col = i % 3;
      var rowY = top + Math.floor(i / 3) * 21;
      var fx = G.margin + col * colW + (col ? 5 : 0);
      w.font('normal', 8.5, C.muted);
      doc.text(doc.splitTextToSize(f[0], colW - 8)[0], fx, rowY + 4);
      w.font('semibold', 15, C.text);
      doc.text(f[1], fx, rowY + 12);
      if (col) doc.line(G.margin + col * colW, rowY, G.margin + col * colW, rowY + 16);
    });
    doc.line(G.margin, top + 18.5, G.margin + barW, top + 18.5);

    w.y = top + 46;
    w.font('semibold', 12, C.text);
    doc.text('Destaques', G.margin, w.y);
    w.y += 4;
    highlights(summary).forEach(function (line) {
      doc.setFillColor.apply(doc, C.gold);
      doc.rect(G.margin, w.y + 2.1, 1.6, 1.6, 'F');
      w.paragraph(line, { size: 9.5, x: G.margin + 5, width: barW - 5, after: 1 });
    });
    return w.y + 6;
  }

  function contentsPage(w, startY, entries) {
    var doc = w.doc;
    doc.setPage(1);
    var barW = G.width - G.margin * 2;
    w.font('semibold', 12, C.text);
    doc.text('Sumário', G.margin, startY);
    var y = startY + 6;
    var head = entries.slice(0, 2);
    var people = entries.slice(2);
    head.forEach(function (e) {
      w.font('normal', 9.5, C.text);
      doc.text(e.label, G.margin, y);
      doc.text(String(e.page), G.margin + barW, y, { align: 'right' });
      y += 5;
    });
    y += 2;
    var cols = people.length > 39 ? 4 : 3;
    var colW = barW / cols;
    var rowH = 4.1;
    var rows = Math.max(1, Math.floor((G.bottom + 4 - y) / rowH));
    var shown = people.slice(0, rows * cols);
    shown.forEach(function (e, i) {
      var cx = G.margin + Math.floor(i / rows) * colW;
      var cy = y + (i % rows) * rowH;
      w.font('normal', 8.3, C.text);
      var name = doc.splitTextToSize(e.label, colW - 12)[0];
      doc.text(name, cx, cy);
      w.font('normal', 8.3, C.muted);
      doc.text(String(e.page), cx + colW - 5, cy, { align: 'right' });
    });
    if (people.length > shown.length) {
      w.font('normal', 8.3, C.muted);
      doc.text('E mais ' + (people.length - shown.length) + ' assessores, a partir da página ' + people[shown.length].page + '.', G.margin, y + rows * rowH);
    }
  }

  function teamPages(w, s) {
    w.newPage('Consolidado da equipe');
    w.heading('Objetivos por assessor', 40);
    w.barsByAssessor('Captação líquida por assessor', s.byAssessor.captacao, money, teamAverage(s.byAssessor.captacao));
    w.barsByAssessor('Objetivo de AuC por assessor', s.byAssessor.auc, money, teamAverage(s.byAssessor.auc));

    w.heading('Mix de captação e receita', 50);
    w.ensure(40);
    w.subheading('Origem da captação (médias da equipe)', 26);
    w.chart('', stackedBars([{ label: 'Equipe', parts: s.stacked.origem }]), 26);
    w.y += 28;
    w.ensure(36);
    w.subheading('Modelo de receita (médias da equipe)', 26);
    w.chart('', stackedBars([{ label: 'Equipe', parts: s.stacked.receita }]), 24);
    w.y += 26;
    var teamRank = pdfRank(s.rank);
    var teamRankHeight = rowHeightMm(teamRank, teamRank.length) * teamRank.length + 16;
    w.ensure(teamRankHeight + 14);
    w.subheading('Prioridade de alocação (posição média, 1 = maior prioridade)', teamRankHeight);
    w.chart('', rankChart(teamRank), teamRankHeight);
    w.y += teamRankHeight + 4;

    w.heading('Produtos, relacionamento e capacitação', 60);
    var countHeight = function (list) { return Math.max(26, list.length * 8 + 14); };
    w.chartPair(
      { title: 'Cross-sell PJ', box: horizontalBars(s.counts.crossSell, number), height: countHeight(s.counts.crossSell) },
      { title: 'Régua de relacionamento definida', box: horizontalBars(s.counts.regua, number), height: countHeight(s.counts.regua) }
    );
    w.chartPair(
      { title: 'Materiais de apoio da mesa', box: horizontalBars(s.counts.apoio, number), height: countHeight(s.counts.apoio) + 6 },
      { title: 'Certificações planejadas', box: horizontalBars(s.counts.certificacoes, number), height: countHeight(s.counts.certificacoes) }
    );
    w.barsByAssessor('Nota da rotina de relacionamento (0 a 10)', s.byAssessor.nota, function (v) { return number(v, 1); }, teamAverage(s.byAssessor.nota));
    w.barsByAssessor('Teto de churn (% a.a.)', s.byAssessor.churn, percent, teamAverage(s.byAssessor.churn));

    w.heading('Outros números', 30);
    w.table(['Pergunta', 'Total', 'Média'], s.outros.map(function (r) {
      var fmt = r.label.indexOf('(R$)') !== -1 ? money : function (v) { return number(v, 1); };
      return [r.label, r.total === null ? '–' : fmt(r.total), fmt(r.avg)];
    }), [118, 30, 30]);
  }

  function openPages(w, s) {
    w.newPage('Respostas abertas');
    w.heading('Respostas abertas', 30);
    s.open.forEach(function (group) { w.openAnswers(group); });
  }

  function assessorPages(w, assessors, assessor) {
    var view = assessorView(assessors, assessor.name);
    var own = view.own;
    var team = view.team;
    var mine = function (list) { return list.length ? list[0].value : null; };
    w.newPage(assessor.name);
    w.font('bold', 20, C.text);
    w.doc.text(w.doc.splitTextToSize(assessor.name, w.width())[0], G.margin, w.y + 8);
    w.y += 12;
    w.paragraph('Resposta enviada em ' + dateTime(assessor.submittedAt), { size: 9.5, color: C.muted, after: 4 });

    var ticket = own.outros[0];
    var reunioes = own.outros[2];
    w.table(['Indicador', 'Assessor', 'Média da equipe'], [
      ['Captação líquida', money(own.kpis.captacao), money(teamAverage(team.byAssessor.captacao))],
      ['Objetivo de AuC', money(own.kpis.auc), money(teamAverage(team.byAssessor.auc))],
      ['Novas contas', number(own.kpis.contas), number(teamAverage(team.byAssessor.contas), 1)],
      ['Ticket médio por conta', money(ticket.values.length ? ticket.values[0].value : null), money(team.outros[0].avg)],
      ['ROA', percent(own.kpis.roa), percent(team.kpis.roa)],
      ['Nota da rotina de relacionamento', number(mine(own.byAssessor.nota), 1), number(teamAverage(team.byAssessor.nota), 1)],
      ['Teto de churn', percent(mine(own.byAssessor.churn)), percent(teamAverage(team.byAssessor.churn))],
      ['Reuniões por semana', number(reunioes.values.length ? reunioes.values[0].value : null), number(team.outros[2].avg, 1)],
    ], [88, 45, 45]);

    w.ensure(60);
    w.subheading('Origem da captação: assessor e equipe', 30);
    w.chart('', stackedBars([{ label: 'Assessor', parts: own.stacked.origem }, { label: 'Equipe', parts: team.stacked.origem }]), 34);
    w.y += 36;
    w.ensure(50);
    w.subheading('Modelo de receita: assessor e equipe', 30);
    w.chart('', stackedBars([{ label: 'Assessor', parts: own.stacked.receita }, { label: 'Equipe', parts: team.stacked.receita }]), 32);
    w.y += 34;
    var teamRank = pdfRank(team.rank);
    var rankHeight = Math.max(rowHeightMm(teamRank, teamRank.length), 11) * teamRank.length + 24;
    w.ensure(rankHeight + 12);
    w.subheading('Prioridade de alocação: assessor e média da equipe', rankHeight);
    w.chart('', rankChart(teamRank, pdfRank(own.rank)), rankHeight);
    w.y += rankHeight + 4;

    w.heading('Respostas', 24);
    answerRows(assessor).forEach(function (row) {
      w.subheading(row.title, 10);
      row.items.forEach(function (item) {
        var text = (item.label ? item.label + ': ' : '') + item.value;
        w.paragraph(text, { size: 9.5, after: 1 });
      });
      w.y += 2;
    });
  }

  function decorateManagerial(w) {
    var doc = w.doc;
    var total = doc.getNumberOfPages();
    var now = fullDate(new Date());
    for (var page = 1; page <= total; page++) {
      doc.setPage(page);
      if (page > 1) {
        doc.setFillColor.apply(doc, C.navy);
        doc.rect(0, 0, G.width, 14, 'F');
        doc.addImage(logoData, 'PNG', G.margin, 3, 26, 7.8);
        w.font('semibold', 9.5, C.gold);
        doc.text(String(w.pageTitles[page] || ''), G.width - G.margin, 9, { align: 'right' });
      }
      w.font('normal', 7.5, C.muted);
      doc.text('Relatório gerencial, Planejamento 2027, GR Capital, gerado em ' + now, G.margin, 291);
      doc.text('Página ' + page + ' de ' + total, G.width - G.margin, 291, { align: 'right' });
    }
  }

  function exportManagerial(assessors, logo, progress) {
    progress('Carregando fontes...');
    return loadFonts().then(function (fonts) {
      var doc = newDoc();
      fonts.forEach(function (font) {
        doc.addFileToVFS(font.file, font.data);
        doc.addFont(font.file, 'Poppins', font.style);
      });
      var w = new Writer(doc);
      var s = summarize(assessors);
      progress('Gerando consolidado...');
      var contentsY = coverPage(w, s, assessors);
      var entries = [];
      teamPages(w, s);
      entries.push({ label: 'Consolidado da equipe', page: firstPageOf(w, 'Consolidado da equipe') });
      openPages(w, s);
      entries.push({ label: 'Respostas abertas', page: firstPageOf(w, 'Respostas abertas') });
      // Um assessor por vez, liberando a tela entre eles para mostrar o progresso.
      return assessors.reduce(function (chain, assessor, i) {
        return chain.then(function () {
          progress('Gerando ' + (i + 1) + ' de ' + assessors.length + '...');
          return new Promise(function (resolve) { setTimeout(resolve, 0); }).then(function () {
            assessorPages(w, assessors, assessor);
            entries.push({ label: assessor.name, page: lastSectionStart(w) });
          });
        });
      }, Promise.resolve()).then(function () {
        contentsPage(w, contentsY, entries);
        decorateManagerial(w);
        download(doc.output('blob'), 'Planejamento2027_Relatorio_gerencial.pdf');
      });
    });
  }

  function firstPageOf(w, title) {
    for (var p = 1; p <= w.doc.getNumberOfPages(); p++) if (w.pageTitles[p] === title) return p;
    return 1;
  }

  function lastSectionStart(w) {
    var p = w.doc.getNumberOfPages();
    var title = w.pageTitles[p];
    while (p > 1 && w.pageTitles[p - 1] === title) p--;
    return p;
  }

  // Eventos
  $('pdf-zip').addEventListener('click', function () { runExport($('pdf-zip'), exportZip); });
  $('pdf-full').addEventListener('click', function () { runExport($('pdf-full'), exportManagerial); });
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
