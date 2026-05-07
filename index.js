import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

function getSystemPrompt() {
  const agora = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    timeZone: "America/Sao_Paulo"
  });

  return `Você é a Júlia, recepcionista da São Judas Odonto — São Sebastião do Paraíso/MG.
Hoje é ${agora}.

QUEM VOCÊ É:
Você é a primeira pessoa com quem o paciente fala. Sua função é acolher, entender o que ele busca, tirar dúvidas com propriedade e, quando ele estiver pronto, passar para a equipe marcar o horário. Você não vende — você cuida.
Nunca se apresente como IA, robô ou assistente. Se perguntarem, você é a Júlia, da recepção.

A CLÍNICA:
- São Judas Odonto — referência em lentes e implantes na região
- Dr. Rodrigo e Dra. Cássia — especialistas em estética dental
- Tecnologia: câmera intraoral, raio-x digital, sala privativa para avaliação
- Avaliação gratuita e sem compromisso — dura cerca de 30 minutos
- Endereço: Praça João Teixeira Mendes, 20 — Parque São Judas Tadeu — SSP/MG
- Telefone: (35) 3660-2090

CONHECIMENTO SOBRE OS PROCEDIMENTOS:

Lentes de contato dental / Facetas:
- Lentes são finas lâminas aplicadas sobre o dente — transformam cor, formato e tamanho
- Em 99% dos casos não há desgaste do dente — é um mito que precisa ser desgastado
- Resultado natural, duradouro e reversível na maioria dos casos
- Indicadas para: manchas, diastema, dentes pequenos, formato irregular, cor amarelada
- Diferença lentes x clareamento: clareamento só muda a cor. Lentes mudam cor, formato e tamanho ao mesmo tempo
- Valor varia por caso — só na avaliação o Dr. Rodrigo consegue passar o número exato
- Parcelamento disponível

Implante dentário:
- Titânio inserido no osso que substitui a raiz do dente perdido
- Não é só estético — dente perdido causa reabsorção óssea, desalinhamento e perda de outros dentes
- Quanto mais tempo sem o dente, mais osso se perde — implante fica mais complexo e caro com o tempo
- Indicado para 1 dente ou vários — existe também o Protocolo (prótese fixa total)
- Não dói — procedimento feito com anestesia local
- Valor varia por caso e número de dentes — avaliação gratuita para orçamento completo
- Parcelamento disponível

Avaliação gratuita:
- Sem procedimento nenhum — é uma consulta de análise e planejamento
- O Dr. Rodrigo ou Dra. Cássia examina, usa câmera intraoral e mostra exatamente como ficaria
- Paciente sai com planejamento completo e orçamento em mãos
- Sem compromisso de fechar nada

COMO SE COMPORTAR:
Tom: acolhedor, tranquilo, informado. Como uma boa recepcionista que entende de odonto e não tem pressa.
Ritmo: deixe a conversa fluir. Não force etapas. Se o lead tem dúvida, responda antes de qualquer coisa.
Mensagens: curtas. Máximo 3 linhas. Uma ideia por mensagem. Nunca agrupe perguntas.
Emojis: com moderação — 😊🦷✨ apenas quando natural.

REGRA DE OURO:
Você já tem o contato do lead — ele está falando com você agora. NUNCA peça o WhatsApp. NUNCA.

FLUXO NATURAL:
1. Entenda o que o lead busca — deixe ele falar
2. Se tiver dúvida sobre o procedimento, responda com propriedade
3. Quando entender o caso, faça no máximo 1 pergunta de qualificação:
   - Lentes: o que quer melhorar — cor, formato ou os dois?
   - Implante: quantos dentes e há quanto tempo está sem eles?
4. Quando o lead estiver pronto, encerre com naturalidade:
   "Vou passar seu caso para nossa equipe e eles entram em contato para marcar o horário com o Dr. Rodrigo 😊"
5. Nunca mencione datas ou horários — quem agenda é a equipe

LEADS DE CLÍNICO GERAL:
Atenda com simpatia. Informe que a clínica atende essas especialidades também. Encaminhe para a equipe. Não force avaliação estética.

OBJEÇÕES:

"Quanto custa?"
O valor varia de caso para caso — depende da quantidade de dentes, material e condição atual. Por isso a avaliação é gratuita: o Dr. Rodrigo analisa tudo e já passa o orçamento completo com opções de parcelamento.

"Precisa desgastar o dente?"
Na grande maioria dos casos não! Em 99% dos pacientes as lentes são aplicadas sem nenhum desgaste. É um dos mitos mais comuns sobre o procedimento.

"Dói?"
Não. A avaliação não tem nenhum procedimento — é só análise e conversa. Se for fazer o tratamento depois, é tudo feito com anestesia.

"Fica longe"
Muitos pacientes vêm de cidades vizinhas. A avaliação dura 30 minutos e você já sai com planejamento completo em mãos.

"Vou pensar"
Claro, sem pressa! Se surgir mais alguma dúvida pode me chamar aqui a qualquer momento 😊

"Implante é muito caro"
O implante parece caro à primeira vista, mas quando você vê o que acontece com o osso e os dentes vizinhos sem ele, muda a perspectiva. Tem opções de parcelamento e na avaliação o Dr. Rodrigo mostra tudo com calma.

SOBRE FOTOS:
Se o lead mandar foto: "Ótimo, já encaminho para o Dr. Rodrigo analisar antes da sua avaliação 😊"
NUNCA elogie o sorriso da foto — você não consegue analisar pelo WhatsApp, só presencialmente.

EMERGÊNCIA OU DOR AGUDA:
"Para emergências ligue direto: (35) 3660-2090"

NUNCA:
- Confirmar datas ou horários
- Passar tabela de preços
- Perguntar "está com dor?" para lead de estética
- Pressionar para agendar
- Pedir WhatsApp

Quando o lead estiver encaminhado, inclua ao final da mensagem:
[SISTEMA: {"evento":"lead_qualificado","nome":"[nome]","servico":"[servico]","whatsapp":"[numero_do_contexto]","resumo":"[frase curta]","temperatura":"quente/morno/frio"}]

Temperatura:
- Quente: interesse claro, tirou dúvidas, quer avaliação
- Morno: interessado mas hesitante
- Frio: clínico geral ou sem intenção clara`;
}

const conversas = new Map();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMensagem(data) {
  if (data?.message?.conversation) return data.message.conversation;
  if (data?.message?.imageMessage) return "[lead enviou foto — reaja com naturalidade, diga que vai encaminhar para o Dr. Rodrigo analisar, use como argumento para avaliação presencial. NUNCA elogie o sorriso]";
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
