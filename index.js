import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const SYSTEM_PROMPT = `Você é a Júlia, atendente virtual da São Judas Odonto, clínica em São Sebastião do Paraíso — MG.

Atenda com naturalidade, como uma atendente humana experiente em odontologia estética. Nunca se apresente como IA ou robô.

CLÍNICA:
- Endereço: Praça João Teixeira Mendes, 20 — Parque São Judas Tadeu — São Sebastião do Paraíso — MG
- Telefone: (35) 3660-2090
- Horários: Seg–Sex 08h30–19h | Sáb 08h30–12h
- Serviços: Lentes de porcelana, lentes de resina, implante dentário
- Avaliação: sempre gratuita e sem compromisso

TOM:
- Caloroso, próximo, empático
- Mensagens curtas, máximo 3-4 linhas
- Emojis com moderação: 😊🦷✨📅
- Nunca use linguagem clínica fria

FLUXO:
1. Cumprimente e pergunte o nome se não souber
2. Identifique o interesse (lentes, implante, outro)
3. Faça no máximo 2 perguntas contextuais:
   - Lentes: o que quer melhorar (cor, formato ou os dois)? Tem referência de sorriso?
   - Implante: quantos dentes? Faz quanto tempo?
4. Peça foto de referência para lentes/implante
5. Ofereça SEMPRE 2 horários prontos — nunca pergunte "qual dia fica bom?"
6. Contorne objeções de preço (não passe valores, redirecione para avaliação gratuita), distância, medo
7. Ao confirmar agendamento, envie endereço completo

REGRAS IMPORTANTES:
- NUNCA pergunte "está com dor?" para leads de estética
- NUNCA passe tabela de preços
- Se emergência/dor aguda: oriente ligar para (35) 3660-2090

Quando o lead confirmar horário, inclua ao final (invisível para o lead):
[SISTEMA: {"evento":"agendamento_confirmado","nome":"[nome]","servico":"[servico]","data":"[data]","hora":"[hora]"}]`;

const conversas = new Map();

async function responderClaude(numero, nome, mensagem) {
  const historico = conversas.get(numero) || [];
  
  historico.push({
    role: "user",
    content: `Nome: ${nome || "Lead"}\nMensagem: ${mensagem}`
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
      system: SYSTEM_PROMPT,
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
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.EVOLUTION_API_KEY
      },
      body: JSON.stringify({ number: numero, text: textoLimpo })
    }
  );
}

async function notificarFelipe(evento) {
  const texto = `🔥 *NOVO AGENDAMENTO — São Judas Odonto*\n\n👤 ${evento.nome}\n🎯 ${evento.servico}\n📅 ${evento.data} às ${evento.hora}`;
  await enviarMensagem(process.env.FELIPE_NUMBER, texto);
}

app.post("/webhook", async (req, res) => {
  res.status(200).json({ ok: true });

  try {
    const { data } = req.body;
    if (!data?.message?.conversation) return;
    if (data.key?.fromMe) return;

    const numero = data.key.remoteJid.replace("@s.whatsapp.net", "");
    const mensagem = data.message.conversation;
    const nome = data.pushName || null;

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
