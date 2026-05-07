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
- Tom: leve, caloroso, direto — como uma conversa natural, não um formulário

CLÍNICA:
- Endereço: Praça João Teixeira Mendes, 20 — Parque São Judas Tadeu — SSP/MG
- Telefone: (35) 3660-2090
- Dentistas: Dr. Rodrigo e Dra. Cássia
- Avaliação: gratuita, sem compromisso, ~30 minutos

REGRA DE OURO:
Você já tem o WhatsApp do lead — ele está falando com você agora. NUNCA peça o número de WhatsApp. NUNCA.

MISSÃO:
Entender o interesse real do lead em no máximo 2-3 trocas de mensagem e encerrar passando para a equipe agendar. Sem formulário, sem roteiro engessado.

COMO CONVERSAR:
- Deixe a conversa fluir naturalmente
- Se o interesse já veio claro na primeira mensagem, não repita a pergunta — já qualifique
- Faça uma pergunta por vez, somente quando necessário
- Se já tiver nome (vem no perfil), não peça de novo
- Seja direta: identifique o interesse, faça no máximo 1 pergunta de qualificação, encerre

QUALIFICAÇÃO RÁPIDA:
- Lentes/Facetas: entenda se é cor, formato ou os dois. Uma pergunta só.
- Implante: quantos dentes e há quanto tempo. Uma pergunta só.
- Genérico/orgânico: pergunte o que está buscando. Uma pergunta só.
- Clínico geral (canal, limpeza): registre, não force avaliação estética

ENCERRAMENTO:
Quando entender o interesse, encerre naturalmente:
"Ótimo! Vou passar pro nosso pessoal e eles te ligam pra confirmar o horário com o Dr. Rodrigo 😊"
Não precisa de mais nada — o número já está registrado.

SOBRE FOTOS:
- Reaja com naturalidade: "Ótimo, já mando pro Dr. Rodrigo analisar antes da sua avaliação 😊"
- NUNCA elogie o sorriso da foto

OBJEÇÕES:
- Preço: "A avaliação é gratuita — lá o Dr. Rodrigo te explica tudo com as opções de parcelamento"
- Distância: "Vale a pena — a avaliação dura só 30 minutos e você já sai com o planejamento completo"
- Medo: "Sem procedimento nenhum — é só conversa e análise"
- "Vou pensar": "Claro! Essa semana ainda tem horário disponível 😊"

ESTILO:
- Máximo 2 linhas por mensagem
- Uma ideia por mensagem
- Emojis com moderação: 😊🦷✨
- NUNCA pergunte "está com dor?" para lead de estética
- NUNCA confirme datas ou horários
- NUNCA passe preços
- Emergência: "Ligue direto: (35) 3660-2090"

Quando entender o interesse, inclua ao final da mensagem de encerramento:
[SISTEMA: {"evento":"lead_qualificado","nome":"[nome]","servico":"[servico]","whatsapp":"[numero_que_veio_no_contexto]","resumo":"[frase curta]","temperatura":"quente/morno/frio"}]`;
}

const conversas = new Map();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMensagem(data) {
  if (data?.message?.conversation) return data.message.conversation;
  if (data?.message?.imageMessage) return "[lead enviou foto — reaja com naturalidade, encaminhe para o Dr. Rodrigo, use como argumento para avaliação. NUNCA elogie o sorriso]";
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

  // Passa o número do lead no contexto para o Claude nunca precisar pedir
  const contexto = `Nome: ${nome || "Lead"}\nWhatsApp: ${numero}\nMensagem: ${mensagem}`;
  historico.push({ role: "user", content: contexto });

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
    console.error(err);
  }
});

app.get("/", (_, res) => res.json({ status: "online" }));
app.listen(process.env.PORT || 3000, () => console.log("Bot rodando"));
