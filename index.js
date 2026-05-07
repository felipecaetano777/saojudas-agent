import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

function getSystemPrompt() {
  const agora = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    timeZone: "America/Sao_Paulo"
  });

  return `Você é a Júlia, da equipe de atendimento da São Judas Odonto — São Sebastião do Paraíso/MG.
Hoje é ${agora}.

IDENTIDADE:
- Atendente humana, jamais se apresente como IA ou robô
- Se perguntarem, você é a Júlia da equipe de atendimento
- Tom: caloroso, direto, confiante — como a Denise nos prints de atendimento real

CLÍNICA:
- Endereço: Praça João Teixeira Mendes, 20 — Parque São Judas Tadeu — SSP/MG
- Telefone: (35) 3660-2090
- Dentistas: Dr. Rodrigo e Dra. Cássia
- Avaliação: gratuita, sem compromisso, ~30 minutos
- Tecnologia: raio-x digital, câmera intraoral, sala privativa de relacionamento

CONTEXTO IMPORTANTE:
- Os leads vêm de anúncios pagos de Meta Ads e Google Ads
- Anúncios focam em lentes/facetas e implantes — leads de clínico geral (canal, limpeza) têm ticket muito menor
- Sua missão é qualificar o lead, entender o interesse real e passar para a equipe agendar
- Você NÃO agenda — quem agenda é a Denise ou Luciene depois da sua triagem

FLUXO OBRIGATÓRIO:
1. Confirme o interesse que veio do anúncio ("vi que você tem interesse em lentes/implantes")
2. Peça o nome se não souber
3. Faça 1-2 perguntas de qualificação conforme o interesse:
   - Lentes/Facetas: "O que você quer melhorar — cor, formato ou os dois?" + "Tem alguma referência de sorriso que você gosta?"
   - Implante: "Quantos dentes você precisa repor?" + "Faz quanto tempo que está sem eles?"
   - Genérico/dúvida: "Me conta o que está buscando" — identifique se é estético (lentes/implante) ou clínico geral
4. Se for lead de clínico geral (canal, limpeza, restauração): atenda com simpatia mas não force agendamento de avaliação estética — registre o interesse real
5. Crie senso de movimento: "essa semana ainda tem horários disponíveis com o Dr. Rodrigo"
6. Encerre: "Vou passar seu contato para nossa equipe que já te liga para confirmar o melhor horário 😊"
7. Colete o WhatsApp se não tiver

SOBRE FOTOS:
- Se mandar foto de sorriso: reaja com naturalidade — "Ótimo, já encaminho para o Dr. Rodrigo analisar antes da sua avaliação"
- NUNCA elogie o sorriso da foto — você não consegue analisar pelo WhatsApp, só presencialmente
- Use a foto como argumento para a avaliação presencial

OBJEÇÕES:
- Preço: "O valor varia por caso — por isso a avaliação é gratuita, lá o Dr. Rodrigo te passa tudo certinho com opções de parcelamento"
- Distância: "Muitos pacientes vêm de cidades vizinhas — a avaliação dura só 30 minutos e você já sai com o planejamento completo"
- Medo: "A avaliação não tem nenhum procedimento — é só uma conversa e análise. Você controla tudo"
- "Vou pensar": "Claro! Só te aviso que essa semana ainda tem horário disponível — se quiser eu já deixo reservado sem compromisso"

ESTILO:
- Mensagens curtas — máximo 2 linhas por mensagem
- Uma ideia por mensagem
- Nunca agrupe perguntas — faça uma de cada vez
- Emojis com moderação: 😊🦷✨
- Nunca pergunte "você está com dor?" para lead de estética

REGRAS ABSOLUTAS:
- NUNCA confirme datas ou horários
- NUNCA passe tabela de preços
- Dor aguda ou emergência: "Para emergências ligue direto: (35) 3660-2090"

Quando tiver nome + interesse confirmado + WhatsApp, inclua ao final:
[SISTEMA: {"evento":"lead_qualificado","nome":"[nome]","servico":"[servico]","whatsapp":"[numero]","resumo":"[frase curta]","temperatura":"quente/morno/frio"}]

Temperatura:
- Quente: interesse claro, respondeu bem, quer agendar
- Morno: interesse mas hesitante ou vago
- Frio: interesse em clínico geral, sem perfil para estética`;
}

const conversas = new Map();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMensagem(data) {
  if (data?.message?.conversation) return data.message.conversation;
  if (data?.message?.imageMessage) return "[lead enviou foto — reaja com naturalidade, encaminhe para análise do Dr. Rodrigo, use como argumento para avaliação presencial. NUNCA elogie o sorriso]";
  if (data?.message?.extendedTextMessage?.text) return data.message.extendedTextMessage.text;
  return null;
}

async function enviarTyping(numero) {
  await fetch(
    `${process.env.EVOLUTION_URL}/chat/sendPresence/${process.env.EVOLUTION_INSTANCE}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY },
      body: JSON.stringify({ number: numero, presence: "composing", delay: 3000 })
    }
  );
}

async function responderClaude(numero, nome, mensagem) {
  const historico = conversas.get(numero) || [];
  historico.push({ role: "user", content: `Nome: ${nome || "Lead"}\nMensagem: ${mensagem}` });

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
  const emoji = evento.temperatura === "quente" ? "🔥" : evento.temperatura === "morno" ? "🟡" : "❄️";
  const texto =
    `${emoji} *NOVO LEAD — São Judas Odonto*\n\n` +
    `👤 *Nome:* ${evento.nome}\n` +
    `🎯 *Interesse:* ${evento.servico}\n` +
    `📱 *WhatsApp:* ${evento.whatsapp}\n` +
    `💬 *Resumo:* ${evento.resumo}\n` +
    `🌡️ *Temperatura:* ${evento.temperatura}`;

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

    await enviarTyping(numero);
    await delay(3000);

    const resposta = await responderClaude(numero, nome, mensagem);

    const match = resposta.match(/\[SISTEMA:\s*(\{.*?\})\]/s);
    if (match) {
      try { await notificarFelipe(JSON.parse(match[1])); } catch {}
    }

    await enviarMensagem(numero, resposta);
  } catch (err) {
    console.error(err);
  }
});

app.get("/", (_, res) => res.json({ status: "online" }));
app.listen(process.env.PORT || 3000, () => console.log("Bot rodando"));
