import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ─────────────────────────────────────────────
// CALCULADORA DE PREÇOS — Santa Mão
// ─────────────────────────────────────────────

const CONFIG = {
  geral: { b0: 100 },
  cidades: {
    uberlândia: 1.000,
    uberaba: 1.045
  },
  imovel: {
    apartamento: {
      b0: 84, mult: 1.17,
      quartos: 9, banheiros: 9, cozinhas: 0, salas: 6,
      areaExterna: 15, andares: 0, duplex: 40
    },
    casa: {
      b0: 68, mult: 1.07,
      quartos: 13, banheiros: 10, cozinhas: 7, salas: 7,
      areaExterna: 26, andares: 45, duplex: 0
    }
  },
  vazio: 1.15,
  multComodos: {
    apartamento: [{ min: 9, max: Infinity, mult: 1.07 }],
    casa:        [{ min: 11, max: Infinity, mult: 1.03 }]
  },
  duracoes: [
    { min: 0,   max: 132, texto: "3 a 4 horas", prof: 1 },
    { min: 132, max: 155, texto: "4 horas",     prof: 1 },
    { min: 159, max: 169, texto: "5 horas",     prof: 1 },
    { min: 170, max: 199, texto: "6 horas",     prof: 1 },
    { min: 200, max: 219, texto: "6 a 7 horas", prof: 1 },
    { min: 220, max: 249, texto: "7 horas",     prof: 1 },
    { min: 250, max: 289, texto: "8 horas",     prof: 1 },
    { min: 289, max: 339, texto: "6 horas",     prof: 2 },
    { min: 340, max: 999, texto: "8 horas",     prof: 2 }
  ],
  extras: {
    casa: [
      { nome: "Limpar por dentro da geladeira, fogão e microondas", valor: 29, tipo: "fixo" },
      { nome: "Guarda-roupas por dentro", valor: 29, tipo: "por_unidade" },
      { nome: "Lavar chão da casa toda", valor: 24, tipo: "fixo" }
    ],
    apartamento: [
      { nome: "Limpar por dentro da geladeira, fogão e microondas", valor: 29, tipo: "fixo" },
      { nome: "Guarda-roupas por dentro", valor: 29, tipo: "por_unidade" }
    ]
  }
};

function roundCommercial(v) {
  let x = Math.ceil(v);
  const last = x % 10;
  if (last === 4 || last === 9) return x;
  const to4 = x + ((14 - last) % 10);
  const to9 = x + ((19 - last) % 10);
  return Math.min(to4, to9);
}

function calcularOrcamento({ cidade, tipo, quartos, banheiros, cozinhas, salas, andares, duplex, areaExterna, vazio, extras }) {
  const cidadeKey = cidade?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const multCidade = CONFIG.cidades[cidadeKey] ?? null;
  if (!multCidade) return null;

  const imv = CONFIG.imovel[tipo];
  if (!imv) return null;

  const isApto = tipo === "apartamento";

  let B = imv.b0
    + (quartos || 0) * imv.quartos
    + (banheiros || 0) * imv.banheiros
    + (cozinhas || 0) * imv.cozinhas
    + (salas || 0) * imv.salas
    + (areaExterna ? imv.areaExterna : 0)
    + (isApto ? 0 : (andares || 0) * imv.andares)
    + (isApto && duplex ? imv.duplex : 0);

  let P = B * multCidade * imv.mult;
  if (vazio) P *= CONFIG.vazio;

  const totalComodos = (quartos || 0) + (banheiros || 0) + (salas || 0) + (cozinhas || 0);
  const faixa = CONFIG.multComodos[tipo]?.find(f => totalComodos >= f.min && totalComodos <= f.max);
  if (faixa) P *= faixa.mult;

  let totalExtras = 0;
  for (const ex of (extras || [])) {
    totalExtras += ex.tipo === "por_unidade" ? ex.valor * (ex.qty || 1) : ex.valor;
  }

  const final = roundCommercial(P + totalExtras);
  const pac2 = final <= 189 ? roundCommercial(final * 0.95) : roundCommercial(final - 10);
  const pac4 = final <= 189 ? roundCommercial(final * 0.90) : roundCommercial(final - 20);
  const duracao = CONFIG.duracoes.find(d => final >= d.min && final <= d.max) || { texto: "—", prof: 1 };

  return { final, pac2, pac4, duracao: duracao.texto, profissionais: duracao.prof };
}

function formatBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────

function getSystemPrompt() {
  const agora = new Date().toLocaleString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  });

  const extrasLista = {
    casa: CONFIG.extras.casa.map(e => `• ${e.nome} — ${formatBRL(e.valor)}${e.tipo === "por_unidade" ? " (por unidade)" : " (fixo)"}`).join("\n"),
    apartamento: CONFIG.extras.apartamento.map(e => `• ${e.nome} — ${formatBRL(e.valor)}${e.tipo === "por_unidade" ? " (por unidade)" : " (fixo)"}`).join("\n")
  };

  return `Você é a Ana, atendente virtual da Santa Mão — empresa de limpeza residencial e comercial de Uberlândia e Uberaba.
Agora são: ${agora}.

QUEM VOCÊ É:
Atendente simpática, objetiva e prestativa. Nunca se apresente como IA.
Se perguntarem, você é a Ana do atendimento da Santa Mão.

A EMPRESA:
- Serviços: limpeza residencial (casa e apartamento), limpeza comercial, limpeza de condomínios, limpeza pós-obra, limpeza pré/pós-mudança, passadoria
- Cidades atendidas: Uberlândia e Uberaba (pós-obra só em Uberlândia)
- Contato recrutamento (para quem quer trabalhar): +55 34 9905-1314

PASSADORIA — VALORES:
• Até 60 peças: R$134,00
• 80 peças: R$179,00
• 100 peças: R$209,00
Quantidade diferente: informar que calcula na hora.

LIMPEZA COMERCIAL — VALORES:
• 4 horas: R$149,00
• 6 horas: R$189,00
• 8 horas: R$229,00
OBS: valor diminui com frequência maior no mês.

LIMPEZA CONDOMÍNIO — VALORES:
• 4 horas: R$149,00
• 6 horas: R$189,00
• 8 horas: R$229,00
OBS: valor diminui com frequência maior no mês.

EXTRAS DISPONÍVEIS:
Casa:
${extrasLista.casa}

Apartamento:
${extrasLista.apartamento}

CALCULADORA DE ORÇAMENTO RESIDENCIAL:
Quando o lead quiser orçamento residencial (casa ou apartamento), colete os dados abaixo e ao final calcule usando a FERRAMENTA DE CÁLCULO. Nunca invente valores — sempre use os dados coletados.

Para CASA, colete:
- Quartos (número)
- Banheiros (número)
- Salas (número)
- Cozinhas (número)
- Andares (número, 0 se não tiver)
- Área externa? (sim/não)
- Imóvel vazio/sem móveis? (sim/não)
- Cidade (Uberlândia ou Uberaba)
- Extras desejados? (liste os disponíveis)

Para APARTAMENTO, colete:
- Quartos, Banheiros, Salas (número)
- Área externa? (sim/não)
- Duplex? (sim/não)
- Imóvel vazio/sem móveis? (sim/não)
- Cidade
- Extras?

Quando tiver TODOS os dados, responda com:
[CALCULAR: {"tipo":"casa|apartamento","cidade":"uberlândia|uberaba","quartos":N,"banheiros":N,"cozinhas":N,"salas":N,"andares":N,"duplex":false,"areaExterna":false,"vazio":false,"extras":[]}]

O sistema retornará o valor calculado e você envia a mensagem padrão:
"Obrigado pelas informações! 💡
Com base no que você nos passou, o valor para a *Limpeza Padrão é de R$ XXX,XX*.
✅ *Duração média: [duração]*
✅ *A profissional só finaliza o serviço após concluir todos os pontos do cronograma (sem sair com o serviço incompleto).*
📄 Abaixo está o PDF com todos os itens que fazem parte da limpeza padrão:"

Se o lead perguntar sobre pacotes mensais, adicione:
"📦 *Pacotes promocionais:*
• 2x por mês: R$ [pac2] por serviço
• 4x por mês: R$ [pac4] por serviço"

ETIQUETAS (use nos eventos do sistema):
- Cidade Uberlândia → UDIA | Uberaba → URA
- Quer trabalhar → LEAD PROF
- Limpeza → LIMPEZA
- Passadoria → PASSAGEM
- Residencial → B2C | Casa → CASA | Apartamento → AP
- Comercial → B2B
- Condomínio → CONDOMINIO
- Pós-obra → POS OBRA
- Pré/Pós-mudança → PRE/POS MUDANÇA

FLUXO PRINCIPAL:
1. Saudação e identificar cidade (Uberlândia ou Uberaba)
2. Quer contratar ou quer trabalhar?
   → Trabalhar: enviar contato recrutamento + encerrar (etiqueta LEAD PROF)
   → Contratar: qual serviço? (limpeza / passadoria)
3. Passadoria: enviar tabela de preços → transferir atendente
4. Limpeza: qual tipo? (residencial / comercial / condomínio / pós-obra / pré-pós-mudança)
5. Pós-obra → transferir atendente
6. Pré/pós-mudança → perguntar: imóvel mobiliado? passou por obras?
   → Ambas não: tratar como limpeza residencial normal
   → Mobiliado e sem obra: tratar como residencial normal
   → Passou por obras: transferir atendente
7. Residencial: casa ou apartamento? → coletar dados → calcular orçamento
8. Comercial: coletar dados formulário → enviar tabela de preços
9. Condomínio: coletar dados → enviar tabela de preços

FORMULÁRIO COMERCIAL:
- Salas (incluindo recepções):
- Banheiros:
- Copas:
- Andares:
- Área externa: Sim/Não
- Bairro:
- Especificidade do imóvel?

FORMULÁRIO CONDOMÍNIO:
- Andares:
- Apartamentos:
- Vagas de garagem:
- Frequência desejada:

TRANSFERIR ATENDENTE = dizer "Vou te passar para um de nossos especialistas agora 😊" e emitir evento transferencia_atendente.

REGRAS:
- Máximo 3 linhas por mensagem
- Nunca invente preços residenciais — sempre calcule
- Nunca atenda Uberaba para pós-obra (só Uberlândia)
- Se cidade não for Uberlândia nem Uberaba, informe que não atende ainda

Evento de transferência:
[SISTEMA: {"evento":"transferencia_atendente","nome":"[nome]","servico":"[servico]","whatsapp":"[numero]","resumo":"[resumo]","etiquetas":["TAG1","TAG2"]}]

Evento de orçamento enviado:
[SISTEMA: {"evento":"orcamento_enviado","nome":"[nome]","servico":"[servico]","whatsapp":"[numero]","valor":[valor],"cidade":"[cidade]","etiquetas":["TAG1","TAG2"]}]`;
}

// ─────────────────────────────────────────────
// ESTADO DAS CONVERSAS
// ─────────────────────────────────────────────

const conversas = new Map();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMensagem(data) {
  if (data?.message?.conversation) return data.message.conversation;
  if (data?.message?.imageMessage) return "[lead enviou imagem]";
  if (data?.message?.extendedTextMessage?.text) return data.message.extendedTextMessage.text;
  return null;
}

async function enviarTyping(numero) {
  try {
    await fetch(
      `${process.env.EVOLUTION_URL}/chat/sendPresence/${process.env.EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY },
        body: JSON.stringify({ number: numero, presence: "composing", delay: 3000 })
      }
    );
  } catch (e) {
    console.error("Erro typing:", e.message);
  }
}

async function responderClaude(numero, nome, mensagem) {
  const historico = conversas.get(numero) || [];

  historico.push({
    role: "user",
    content: `Nome: ${nome || "Lead"}\nWhatsApp: ${numero}\nMensagem: ${mensagem}`
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: getSystemPrompt(),
      messages: historico
    })
  });

  const data = await response.json();

  if (!data.content || !data.content[0]) {
    console.error("Resposta inesperada Claude:", JSON.stringify(data));
    throw new Error(data.error?.message || "Resposta inválida da API");
  }

  let resposta = data.content[0].text;

  // Processar [CALCULAR: {...}] inline
  const calcMatch = resposta.match(/\[CALCULAR:\s*(\{.*?\})\]/s);
  if (calcMatch) {
    try {
      const inputs = JSON.parse(calcMatch[1]);
      const resultado = calcularOrcamento(inputs);
      if (resultado) {
        const msgOrcamento =
          `Obrigado pelas informações! 💡\n` +
          `Com base no que você nos passou, o valor para a *Limpeza Padrão é de ${formatBRL(resultado.final)}*.\n` +
          `✅ *Duração média: ${resultado.duracao}*\n` +
          `✅ *A profissional só finaliza o serviço após concluir todos os pontos do cronograma (sem sair com o serviço incompleto).*\n` +
          `📄 Abaixo está o PDF com todos os itens que fazem parte da limpeza padrão:`;

        // Substituir tag pelo texto final
        resposta = resposta.replace(calcMatch[0], msgOrcamento);

        // Injetar no histórico o resultado para o modelo saber o valor
        historico[historico.length - 1].content +=
          `\n[Sistema: cálculo realizado → final=${resultado.final}, pac2=${resultado.pac2}, pac4=${resultado.pac4}, duração=${resultado.duracao}, profissionais=${resultado.profissionais}]`;
      }
    } catch (e) {
      console.error("Erro ao calcular orçamento:", e.message);
    }
  }

  historico.push({ role: "assistant", content: resposta });
  if (historico.length > 30) historico.splice(0, historico.length - 30);
  conversas.set(numero, historico);

  return resposta;
}

async function enviarMensagem(numero, texto) {
  const textoLimpo = texto.replace(/\[SISTEMA:.*?\]/gs, "").replace(/\[CALCULAR:.*?\]/gs, "").trim();
  if (!textoLimpo) return;

  await fetch(
    `${process.env.EVOLUTION_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY },
      body: JSON.stringify({ number: numero, text: textoLimpo })
    }
  );
}

async function notificarFelipe(evento) {
  const isTransferencia = evento.evento === "transferencia_atendente";
  const isOrcamento = evento.evento === "orcamento_enviado";

  const emoji = isTransferencia ? "🔁" : isOrcamento ? "💰" : "🟡";
  const titulo = isTransferencia ? "TRANSFERÊNCIA PARA ATENDENTE"
    : isOrcamento ? "ORÇAMENTO ENVIADO"
    : "EVENTO SANTA MÃO";

  let texto = `${emoji} *${titulo} — Santa Mão*\n\n` +
    `👤 *Nome:* ${evento.nome}\n` +
    `🎯 *Serviço:* ${evento.servico}\n` +
    `📱 *WhatsApp:* ${evento.whatsapp}\n`;

  if (isOrcamento) texto += `💵 *Valor:* R$ ${evento.valor}\n🏙️ *Cidade:* ${evento.cidade}\n`;
  if (evento.etiquetas?.length) texto += `🏷️ *Etiquetas:* ${evento.etiquetas.join(", ")}\n`;
  texto += `💬 *Resumo:* ${evento.resumo}`;

  await enviarMensagem(process.env.FELIPE_NUMBER, texto);
}

// ─────────────────────────────────────────────
// WEBHOOK
// ─────────────────────────────────────────────

app.post("/webhook", async (req, res) => {
  res.status(200).json({ ok: true });

  try {
    const { data } = req.body;
    if (data?.key?.fromMe) return;

    const mensagem = getMensagem(data);
    if (!mensagem) return;

    const numero = data.key.remoteJid.replace("@s.whatsapp.net", "");
    const nome = data.pushName || null;

    if (mensagem.trim() === "/reset") {
      conversas.delete(numero);
      await enviarMensagem(numero, "✅ Conversa reiniciada.");
      return;
    }

    await enviarTyping(numero);
    await delay(3000);

    const resposta = await responderClaude(numero, nome, mensagem);

    // Capturar eventos do sistema
    const matchSistema = resposta.match(/\[SISTEMA:\s*(\{.*?\})\]/s);
    if (matchSistema) {
      try { await notificarFelipe(JSON.parse(matchSistema[1])); } catch {}
    }

    await enviarMensagem(numero, resposta);
  } catch (err) {
    console.error("Erro webhook:", err.message);
    try {
      const numero = req.body?.data?.key?.remoteJid?.replace("@s.whatsapp.net", "");
      if (numero) {
        await enviarMensagem(numero, "Desculpa, tive um probleminha aqui. Pode repetir? 😊");
      }
    } catch {}
  }
});

app.get("/", (_, res) => res.json({ status: "online", bot: "Santa Mão" }));
app.listen(process.env.PORT || 3000, () => console.log("Bot Santa Mão rodando"));
