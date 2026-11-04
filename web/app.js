(function () {
  var screens = [IDENTIFICATION].concat(QUESTIONS);
  var answers = { nome: '' };
  var current = 0;
  var SEND_TIMEOUT_MS = 90000;
  var submissionId = newSubmissionId();
  var lastSent = null;
  var root = document.getElementById('screen');

  function newSubmissionId() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + '-' + Math.random();
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'text') node.textContent = attrs[key];
      else if (key === 'class') node.className = attrs[key];
      else if (key.indexOf('on') === 0) node.addEventListener(key.slice(2), attrs[key]);
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function errorNode(id) {
    return el('div', { class: 'error', id: 'error-' + id, role: 'alert' });
  }

  function textField(field) {
    var input = el('input', {
      type: 'text',
      id: field.id,
      value: answers[field.id] || '',
      inputmode: { money: 'decimal', percent: 'decimal', int: 'numeric', score: 'decimal' }[field.type] || 'text',
      autocomplete: field.type === 'name' ? 'name' : 'off',
      oninput: function () { answers[field.id] = input.value; },
    });
    if (field.type === 'money') {
      input.addEventListener('blur', function () {
        var n = parseMoneyBR(input.value);
        if (n !== null) { input.value = formatMoneyBR(n); answers[field.id] = input.value; }
      });
    }
    if (field.type === 'score') {
      input.addEventListener('blur', function () {
        var n = parseScoreBR(input.value);
        if (n !== null) { input.value = formatScoreBR(n); answers[field.id] = input.value; }
      });
    }
    return input;
  }

  function percentGroup(field) {
    var group = answers[field.id] = answers[field.id] || {};
    var total = el('div', { class: 'total', id: 'total-' + field.id });
    var refresh = function () {
      var sum = sumOfPercents(field.options.map(function (o) { return group[o.id]; }));
      var ok = sum === 100;
      var shown = String(sum).replace('.', ',');
      var rest = String(Math.abs(Math.round((100 - sum) * 100) / 100)).replace('.', ',');
      total.className = 'total' + (ok ? ' ok' : '');
      total.innerHTML = '';
      total.appendChild(el('span', { text: 'Total' }));
      total.appendChild(el('span', { text: ok ? '100% ✓' : shown + '% (' + (sum < 100 ? 'faltam ' : 'sobram ') + rest + '%)' }));
    };
    var rows = field.options.map(function (option) {
      var id = field.id + '-' + option.id;
      var input = el('input', {
        type: 'text', id: id, inputmode: 'decimal', autocomplete: 'off', value: group[option.id] || '',
        oninput: function () { group[option.id] = input.value; refresh(); },
      });
      return el('div', { class: 'row' }, [
        el('label', { for: id, text: option.label }),
        el('div', { class: 'suffix-field' }, [input, el('span', { text: '%' })]),
      ]);
    });
    refresh();
    return el('div', {}, rows.concat([total]));
  }

  function rankField(field) {
    var group = answers[field.id] = answers[field.id] || {};
    var selects = {};
    var rows = field.options.map(function (option) {
      var id = field.id + '-' + option.id;
      var choices = [el('option', { value: '', text: '–' })].concat(field.options.map(function (_, i) {
        return el('option', { value: String(i + 1), text: String(i + 1) });
      }));
      var select = el('select', {
        id: id,
        onchange: function () {
          // Posição já usada: a outra opção recebe a posição antiga desta, como uma troca.
          var previous = group[option.id] || '';
          field.options.forEach(function (other) {
            if (other.id !== option.id && group[other.id] === select.value && select.value) {
              group[other.id] = previous;
              selects[other.id].value = previous;
            }
          });
          group[option.id] = select.value;
        },
      }, choices);
      select.value = group[option.id] || '';
      selects[option.id] = select;
      return el('div', { class: 'row' }, [el('label', { for: id, text: option.label }), select]);
    });
    return el('div', {}, rows);
  }

  function multiField(field) {
    var selected = answers[field.id] = answers[field.id] || [];
    var boxes = {};
    var nodes = field.options.map(function (option) {
      var box = el('input', {
        type: 'checkbox',
        onchange: function () {
          var at = selected.indexOf(option);
          if (box.checked && at === -1) selected.push(option);
          if (!box.checked && at !== -1) selected.splice(at, 1);
          if (box.checked && field.exclusive) {
            selected.slice().forEach(function (other) {
              var conflict = option === field.exclusive ? other !== option : other === field.exclusive;
              if (conflict) {
                selected.splice(selected.indexOf(other), 1);
                boxes[other].checked = false;
              }
            });
          }
        },
      });
      box.checked = selected.indexOf(option) !== -1;
      boxes[option] = box;
      return el('label', { class: 'check' }, [box, el('span', { text: option })]);
    });
    if (field.other) {
      var key = field.id + '_outro';
      var other = el('input', {
        type: 'text', id: key, value: answers[key] || '', placeholder: 'Descreva',
        oninput: function () { answers[key] = other.value; },
      });
      nodes.push(el('div', { class: 'input-box' }, [el('label', { class: 'input-label', for: key, text: 'Outro:' }), other]));
    }
    return el('div', {}, nodes);
  }

  function selectField(field) {
    var select = el('select', {
      id: field.id,
      onchange: function () { answers[field.id] = select.value; },
    }, [el('option', { value: '', text: 'Selecione' })].concat(field.options.map(function (o) {
      return el('option', { value: o, text: o });
    })));
    select.value = answers[field.id] || '';
    return select;
  }

  function longText(field) {
    var area = el('textarea', { id: field.id, oninput: function () { answers[field.id] = area.value; } });
    area.value = answers[field.id] || '';
    return area;
  }

  function fieldControl(field) {
    switch (field.type) {
      case 'percentGroup': return percentGroup(field);
      case 'rank': return rankField(field);
      case 'multi': return multiField(field);
      case 'select': return selectField(field);
      case 'longtext': return longText(field);
      default: return textField(field);
    }
  }

  function renderField(field) {
    var children = [];
    if (field.label) children.push(el('label', { class: 'input-label', for: field.id, text: field.label }));
    children.push(fieldControl(field));
    if (field.hint) children.push(el('div', { class: 'hint', text: field.hint }));
    children.push(errorNode(field.id));
    return el('div', { class: 'input-box' }, children);
  }

  function showErrors(errors) {
    document.querySelectorAll('.error').forEach(function (n) { n.textContent = ''; });
    document.querySelectorAll('.invalid').forEach(function (n) { n.classList.remove('invalid'); });
    var first = null;
    Object.keys(errors).forEach(function (id) {
      var slot = document.getElementById('error-' + id);
      if (slot) slot.textContent = errors[id];
      var input = document.getElementById(id);
      if (input) input.classList.add('invalid');
      if (!first && slot) first = slot;
    });
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return first;
  }

  function setChrome(label, fraction) {
    document.getElementById('step').textContent = label;
    document.getElementById('progress-bar').style.width = (fraction * 100) + '%';
  }

  function render() {
    var block = screens[current];
    var isFirst = current === 0;
    var isLast = current === screens.length - 1;
    root.innerHTML = '';
    window.scrollTo(0, 0);
    setChrome(isFirst ? 'Início' : 'Bloco ' + current + ' de ' + QUESTIONS.length, current / QUESTIONS.length);

    if (isFirst) {
      root.appendChild(el('div', { class: 'kicker', text: 'GR Capital' }));
      var heading = el('h1', {}, [document.createTextNode('Planejamento '), el('span', { text: '2027' })]);
      root.appendChild(heading);
      root.appendChild(el('p', { class: 'intro', text: 'Questionário de objetivos e planejamento individual dos assessores, em 4 blocos. Preencha tudo de uma vez: o rascunho não é salvo e cada assessor responde uma única vez.' }));
    } else {
      root.appendChild(el('div', { class: 'kicker', text: block.kicker }));
      root.appendChild(el('h1', { text: block.title.replace(/^Bloco \d+: /, '') }));
    }

    block.questions.forEach(function (question) {
      root.appendChild(el('section', { class: 'question' }, [
        el('h2', { class: 'question-title', text: (question.n ? question.n + '. ' : '') + question.text }),
        el('div', { class: 'inputs' }, question.fields.map(renderField)),
      ]));
    });

    var buttons = [];
    if (!isFirst) buttons.push(el('button', { class: 'ghost', type: 'button', id: 'back', text: 'Voltar', onclick: function () { current--; render(); } }));
    buttons.push(el('button', { class: 'primary', type: 'button', id: 'next', text: isLast ? 'Enviar' : 'Avançar', onclick: isLast ? submit : next }));
    buttons.push(el('div', { class: 'send-error', id: 'send-error', role: 'alert' }));
    root.appendChild(el('div', { class: 'actions' }, buttons));
  }

  function next() {
    if (showErrors(validateBlock(screens[current], answers))) return;
    current++;
    render();
  }

  function screenWithError() {
    for (var i = 0; i < screens.length; i++) {
      if (Object.keys(validateBlock(screens[i], answers)).length) return i;
    }
    return current;
  }

  function submit() {
    var nextButton = document.getElementById('next');
    var backButton = document.getElementById('back');
    var message = document.getElementById('send-error');
    if (showErrors(validateBlock(screens[current], answers))) return;

    var localErrors = validateSubmission(answers);
    if (Object.keys(localErrors).length) {
      current = screenWithError();
      render();
      showErrors(localErrors);
      return;
    }

    nextButton.disabled = true;
    backButton.disabled = true;
    nextButton.textContent = 'Enviando...';
    message.textContent = '';

    // Respostas alteradas depois de uma falha viram um novo envio; iguais reaproveitam o id.
    var body = JSON.stringify(answers);
    if (lastSent !== null && lastSent !== body) submissionId = newSubmissionId();
    lastSent = body;

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, SEND_TIMEOUT_MS);

    fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ submissionId: submissionId, answers: answers }),
      signal: controller.signal,
    })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (result.ok) return finish();
        var errors = result.errors || {};
        showErrors(errors);
        fail(errors._ || 'Confira os campos indicados e tente novamente.');
      })
      .catch(function () {
        fail('Não foi possível enviar. Verifique sua conexão e tente novamente: suas respostas foram mantidas.');
      });

    function fail(text) {
      clearTimeout(timeout);
      nextButton.disabled = false;
      backButton.disabled = false;
      nextButton.textContent = 'Enviar';
      message.textContent = text;
    }
  }

  function finish() {
    root.innerHTML = '';
    window.scrollTo(0, 0);
    setChrome('Concluído', 1);
    root.appendChild(el('div', { class: 'kicker', text: 'Resposta registrada' }));
    root.appendChild(el('h1', { text: 'Obrigado, ' + answers.nome.trim() + '!' }));
    root.appendChild(el('p', { class: 'intro', text: 'Suas respostas foram enviadas com sucesso. Você já pode fechar esta página.' }));
  }

  render();
})();
