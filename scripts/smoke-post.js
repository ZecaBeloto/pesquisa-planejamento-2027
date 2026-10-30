// Envia respostas de teste ao Web App. Uso: node scripts/smoke-post.js <URL do Web App>
const url = process.argv[2];
const answers = (nome, patch) => Object.assign({
  nome,
  q1: '25.000.000,00',
  q2_contas: '24',
  q2_ticket: 'R$ 350.000,00',
  q3: { indicacoes: '40', prospeccao: '30', parcerias: '20', leads: '10' },
  q4_atual: '100000000',
  q4_meta: '150.000.000,00',
  q5: '0,75',
  q6: { rf: '1', rv: '2', fundos: '3', prev: '4', recorrente: '5' },
  q7: { fee: '60', transacional: '40' },
  q8: ['Câmbio'],
  q8_volume: '1.000.000,00',
  q9_nps: '80',
  q9_freq: 'Mensal',
  q10: '3,5',
  q11: '=teste de fórmula',
  q12: ['Ferramentas de CRM / automação de follow-up'],
  q12_outro: 'Treinamento',
  q13: ['CEA'],
  q14: '12',
  q15: 'Burocracia',
}, patch);

const post = async (submissionId, a) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ submissionId, answers: a }) });
  return r.json();
};

(async () => {
  const run = Date.now();
  console.log('Ana', await post(`${run}-1`, answers('Ana')));
  console.log('Ana repetida', await post(`${run}-2`, answers('Ana', { q1: '10' })));
  console.log('O\'Brien', await post(`${run}-3`, answers("O'Brien", { q3: { indicacoes: '33,33', prospeccao: '33,33', parcerias: '33,34', leads: '0' } })));
  console.log('Soma 90', await post(`${run}-4`, answers('Soma', { q3: { indicacoes: '40', prospeccao: '30', parcerias: '10', leads: '10' } })));
  console.log('Reenvio do mesmo id', await post(`${run}-1`, answers('Ana')));
  console.log('Simultâneos', await Promise.all([post(`${run}-5`, answers('Carla')), post(`${run}-6`, answers('Davi'))]));
})();
