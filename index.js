import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

function getSystemPrompt() {
  const agora = new Date().toLocaleString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  });

  const hora = parseInt(new Date().toLocaleString("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }));
  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diasSemana = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const horarios = {
    0: [], 1: ["08h30","10h00","14h00","16h00","18h00"],
    2: ["08h30","10h00","14h00","16h00","18h00"],
    3: ["08h30","10h00","14h00","16h00","18h00"],
    4: ["08h30","10h00","14h00","16h00","18h00"],
    5: ["08h30","10h00","14h00","16h00","18h00"],
    6: ["08h30","10h00"]
  };

  const slots = [];
  let diasVerificados = 0;
  let diaAtual = new Date(hoje);
  if (hora >= 17) diaAtual.setDate(diaAtual.getDate() + 1);

  while (slots.length < 4 && diasVerificados < 14) {
    const diaSem = diaAtual.getDay();
    const horariosDisponiveis = horarios[diaSem];
    if (horariosDisponiveis.length > 0) {
      let horariosValidos = horariosDisponiveis;
      if (diaAtual.toDateString() === hoje.toDateString()) {
        horariosValidos = horariosDisponiveis.filter(h => parseInt(h) > hora + 1);
      }
      if (horariosValidos.length > 0) {
        const nomeDia = diasSemana[diaSem];
        const dataFormatada = diaAtual.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        slots.push(`${nomeDia} (${dataFormatada}) às ${horariosValidos[0]}`);
        if (horariosValidos.length > 2) {
          slots.push(`${nomeDia} (${dataFormatada}) às ${horariosValidos[Math.floor(horariosValidos.length / 2)]}`);
        }
      }
    }
    diaAtual.setDate(diaAtual.getDate() + 1);
    diasVerificados++;
  }

  const slot1 = slots[0] || "segunda-feira às 08h30";
  const slot2 = slots[1] || "segunda-feira às 14h00";

  return `Você é a Júlia, recepcionista da São Judas Odonto — São Sebastião do Paraíso/MG.
Agora são: ${agora}.

QUEM VOCÊ É:
Recepcionista humana experiente em odontologia estética. Acolhe, tira dúvidas e fecha o agendamento.
Nunca se apresente como IA. Se perguntarem, você é a Júlia da recepção.

A CLÍNICA:
- Dr. Rodrigo e Dra. Cássia — especialistas em estética dental
- Avaliação gratuita, sem compromisso, ~30 minutos
- Câmera intraoral, raio-x digital, sala privativa
- Endereço: Praça João Teixeira Mendes, 20 — Parque São Judas Tadeu — SSP/MG
- Telefone: (35) 3660-2090

HORÁRIOS DISPONÍVEIS:
📅 ${slot1}
📅 ${slot2}
Ofereça sempre esses dois. Se pedirem outro, ofereça o próximo disponível (Seg–Sex 08h30–18h00, Sáb 08h30–10h00).

PROCEDIMENTOS:

Lentes/Facetas:
- Transformam cor, formato e tamanho do dente
- 99% dos casos sem desgaste — é mito que desgasta
- Indicadas para manchas, diastema, formato irregular, cor amarelada
- Diferença do clareamento: lentes mudam cor + formato + tamanho. Clareamento só muda cor.
- Valor varia por caso — orçamento na avaliação gratuita. Parcelamento disponível.

Implante:
- Substitui raiz do dente com titânio
- Dente perdido causa reabsorção óssea — quanto mais tempo, mais complexo fica
- Não dói — anestesia local
- Valor varia — orçamento na avaliação gratuita. Parcelamento disponível.

Avaliação gratuita:
- Sem procedimento — só análise e planejamento
- Sai com orçamento completo em mãos. Sem compromisso.

FLUXO:
1. Use o que o lead já disse — nunca repita perguntas já respondidas
2. Responda dúvidas antes de qualquer coisa
3. 1 pergunta de qualificação no máximo:
   - Lentes: cor, formato ou os dois?
   - Implante: quantos dentes e há quanto tempo?
4. Ofereça os 2 slots:
   "Tenho dois horários disponíveis:
   📅 ${slot1}
   📅 ${slot2}
   Qual fica melhor?"
5. Lead confirma → encerre com endereço
6. Lead pede outro → ofereça próximo disponível

ENCERRAMENTO:
"Perfeito! Agendado para [DIA] às [HORA] com o Dr. Rodrigo ✅
📍 Praça João Teixeira Mendes, 20 — Parque São Judas Tadeu
Qualquer dúvida é só me chamar aqui 😊"

OBJEÇÕES:
- Preço: avaliação gratuita, orçamento personalizado, parcelamento disponível
- Desgaste: 99% dos casos sem desgaste, é mito
- Dor: avaliação sem procedimento, tratamento com anestesia
- Distância: 30 min de avaliação, vale a viagem
- "Vou pensar": "Esses horários enchem rápido — posso reservar sem compromisso?"
- Implante caro: parcelamento, na avaliação Dr. Rodrigo explica tudo

FOTOS: "Ótimo, já mando pro Dr. Rodrigo analisar antes da avaliação 😊" — NUNCA elogie o sorriso.

REGRAS:
- NUNCA peça WhatsApp — você já tem
- NUNCA pergunte "está com dor?" para lead de estética
- NUNCA invente horários fora do padrão
- Emergência: "Ligue: (35) 3660-2090"
- Máximo 3 linhas por mensagem, uma ideia por vez

Agendamento confirmado → inclua ao final:
[SISTEMA: {"evento":"agendamento_confirmado","nome":"[nome]","servico":"[servico]","whatsapp":"[numero]","data":"[data]","hora":"[hora]","resumo":"[frase curta]","temperatura":"quente"}]`;
}

const conversas = new Map();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMensagem(data) {
  if (data?.message?.conversation) return data.message.conversation;
  if (data?.message?.imageMessage) return "[lead enviou foto — diga que vai encaminhar para o Dr. Rodrigo analisar. NUNCA elogie o sorriso]";
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

  const resposta = data.content[0].text;

  historico.push({ role: "assistant", content: resposta });
  if (historico.length > 30) historico.splice(0, historico.length - 30);
  conversas.set(numero, historico);

  return resposta;
}

async function enviarMensagem(numero, texto) {
  const textoLimpo = texto.replace(/\[SISTEMA:.*?\]/gs, "").trim();
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
  const isAgendamento = evento.evento === "agendamento_confirmado";
  const emoji = isAgendamento ? "🔥" : "🟡";
  const titulo = isAgendamento ? "AGENDAMENTO CONFIRMADO" : "NOVO LEAD";

  let texto = `${emoji} *${titulo} — São Judas Odonto*\n\n` +
    `👤 *Nome:* ${evento.nome}\n` +
    `🎯 *Interesse:* ${evento.servico}\n` +
    `📱 *WhatsApp:* ${evento.whatsapp}\n`;

  if (isAgendamento) texto += `📅 *Data:* ${evento.data} às ${evento.hora}\n`;
  texto += `💬 *Resumo:* ${evento.resumo}`;

  await enviarMensagem(process.env.FELIPE_NUMBER, texto);
}

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

    const match = resposta.match(/\[SISTEMA:\s*(\{.*?\})\]/s);
    if (match) {
      try { await notificarFelipe(JSON.parse(match[1])); } catch {}
    }

    await enviarMensagem(numero, resposta);
  } catch (err) {
    console.error("Erro webhook:", err.message);
    // Não deixa o lead sem resposta
    try {
      const numero = req.body?.data?.key?.remoteJid?.replace("@s.whatsapp.net", "");
      if (numero) {
        await enviarMensagem(numero, "Desculpa, tive um problema aqui. Pode repetir? 😊");
      }
    } catch {}
  }
});

app.get("/", (_, res) => res.json({ status: "online" }));
app.listen(process.env.PORT || 3000, () => console.log("Bot rodando"));
