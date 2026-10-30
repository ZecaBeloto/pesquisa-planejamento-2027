// Envia respostas de teste ao Web App. Uso: node scripts/smoke-post.js <URL do Web App>
const url = process.argv[2];
const answers = (nome, patch) => Object.assign({
  nome,
  q1: '25.000.000,00',
  q2_contas: '24',
  q2_ticket: 'R$ 350.000,00',
  q3: { indicacoes: '40', prospeccao: '30', eventos: '30' },
  q4_meta: '150.000.000,00',
  q_perfil: 'Médico',
  q5: '0,75',
  q6: { rf: '1', rv: '2', consorcios: '3', prev: '4', recorrente: '5', internacional: '6', pj: '7', credito: '8' },
  q7: { fee: '60', transacional: '40' },
  q8: ['Câmbio'],
  q8_volume: '1.000.000,00',
  q_regua: 'Sim',
  q_segmentacao: 'Por patrimônio',
  q_regua_nota: '8',
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
  console.log('O\'Brien', await post(`${run}-3`, answers("O'Brien", { q3: { indicacoes: '33,33', prospeccao: '33,33', eventos: '33,34' } })));
  console.log('Soma 90', await post(`${run}-4`, answers('Soma', { q3: { indicacoes: '40', prospeccao: '30', eventos: '20' } })));
  console.log('Reenvio do mesmo id', await post(`${run}-1`, answers('Ana')));
  console.log('Simultâneos', await Promise.all([post(`${run}-5`, answers('Carla')), post(`${run}-6`, answers('Davi'))]));
})();
