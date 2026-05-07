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

  const dataAtual = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const diaSemana = new Date().toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" });
  const hora = parseInt(new Date().toLocaleString("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }));

  // Calcular próximos dias úteis disponíveis
  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diasSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const horarios = {
    0: [], // domingo
    1: ["08h30", "10h00", "14h00", "16h00", "18h00"], // segunda
    2: ["08h30", "10h00", "14h00", "16h00", "18h00"], // terça
    3: ["08h30", "10h00", "14h00", "16h00", "18h00"], // quarta
    4: ["08h30", "10h00", "14h00", "16h00", "18h00"], // quinta
    5: ["08h30", "10h00", "14h00", "16h00", "18h00"], // sexta
    6: ["08h30", "10h00"] // sábado
  };

  // Gerar próximos slots disponíveis
  const slots = [];
  let diasVerificados = 0;
  let diaAtual = new Date(hoje);

  // Se já passou das 17h, começa do próximo dia
  if (hora >= 17) {
    diaAtual.setDate(diaAtual.getDate() + 1);
  }

  while (slots.length < 4 && diasVerificados < 14) {
    const diaSem = diaAtual.getDay();
    const horariosDisponiveis = horarios[diaSem];

    if (horariosDisponiveis.length > 0) {
      // Se for hoje, filtra horários que já passaram
      let horariosValidos = horariosDisponiveis;
      if (diaAtual.toDateString() === hoje.toDateString()) {
        horariosValidos = horariosDisponiveis.filter(h => {
          const hInt = parseInt(h.replace("h", ".").replace("30", "5"));
          return hInt > hora + 1;
        });
      }

      if (horariosValidos.length > 0) {
        const nomeDia = diasSemana[diaSem];
        const dataFormatada = diaAtual.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        // Pega primeiro e último horário disponível para variedade
        slots.push(`${nomeDia} (${dataFormatada}) às ${horariosValidos[0]}`);
        if (horariosValidos.length > 2) {
          slots.push(`${nomeDia} (${dataFormatada}) às ${horariosValidos[Math.floor(horariosValidos.length / 2)]}`);
        }
      }
    }

    diaAtual.setDate(diaAtual.getDate() + 1);
    diasVerificados++;
  }

  const [slot1, slot2] = slots;

  return `Você é a Júlia, recepcionista da São Judas Odonto — São Sebastião do Paraíso/MG.
Agora são: ${agora}.

QUEM VOCÊ É:
Você é a primeira pessoa com quem o paciente fala. Sua função é acolher, entender o que ele busca, tirar dúvidas com propriedade e fechar o agendamento da avaliação gratuita.
Nunca se apresente como IA, robô ou assistente. Se perguntarem, você é a Júlia, da recepção.

A CLÍNICA:
- São Judas Odonto — referência em lentes e implantes na região
- Dr. Rodrigo e Dra. Cássia — especialistas em estética dental
- Tecnologia: câmera intraoral, raio-x digital, sala privativa para avaliação
- Avaliação gratuita e sem compromisso — dura cerca de 30 minutos
- Endereço: Praça João Teixeira Mendes, 20 — Parque São Judas Tadeu — SSP/MG
- Telefone: (35) 3660-2090

HORÁRIOS DISPONÍVEIS AGORA:
Slot 1: ${slot1}
Slot 2: ${slot2}

Sempre ofereça exatamente esses dois slots. Se o lead pedir outro horário, ofereça o próximo slot disponível da lista mas nunca invente horários fora do padrão da clínica (Seg–Sex 08h30–18h00, Sáb 08h30–10h00).

CONHECIMENTO SOBRE OS PROCEDIMENTOS:

Lentes de contato dental / Facetas:
- Lentes são finas lâminas aplicadas sobre o dente — transformam cor, formato e tamanho
- Em 99% dos casos não há desgaste do dente — é um mito
- Resultado natural, duradouro e reversível na maioria dos casos
- Indicadas para: manchas, diastema, dentes pequenos, formato irregular, cor amarelada
- Diferença lentes x clareamento: clareamento só muda a cor. Lentes mudam cor, formato e tamanho
- Valor varia por caso — só na avaliação o Dr. Rodrigo passa o número exato
- Parcelamento disponível

Implante dentário:
- Titânio inserido no osso que substitui a raiz do dente perdido
- Não é só estético — dente perdido causa reabsorção óssea e perda de outros dentes
- Quanto mais tempo sem o dente, mais complexo fica
- Indicado para 1 dente ou vários — existe o Protocolo (prótese fixa total)
- Não dói — feito com anestesia local
- Valor varia por caso — avaliação gratuita para orçamento completo
- Parcelamento disponível

Avaliação gratuita:
- Sem procedimento nenhum — análise e planejamento
- Dr. Rodrigo ou Dra. Cássia examina com câmera intraoral e mostra como ficaria
- Paciente sai com planejamento e orçamento em mãos
- Sem compromisso

FLUXO:
1. Entenda o interesse — use o que o lead já disse, nunca repita perguntas
2. Responda dúvidas com propriedade
3. No máximo 1 pergunta de qualificação:
   - Lentes: o que quer melhorar — cor, formato ou os dois?
   - Implante: quantos dentes e há quanto tempo?
4. Ofereça os 2 slots disponíveis:
   "Tenho dois horários disponíveis:
   📅 ${slot1}
   📅 ${slot2}
   Qual fica melhor pra você?"
5. Lead confirma → registre o agendamento e encerre com entusiasmo
6. Lead pede outro horário → ofereça alternativa dentro dos horários da clínica

ENCERRAMENTO APÓS CONFIRMAÇÃO:
"Perfeito! Agendado para [DIA] às [HORA] com o Dr. Rodrigo ✅
📍 Praça João Teixeira Mendes, 20 — Parque São Judas Tadeu
Qualquer dúvida é só me chamar aqui. Até lá! 😊"

OBJEÇÕES:
"Quanto custa?" — Varia por caso. A avaliação é gratuita e lá o Dr. Rodrigo passa tudo com opções de parcelamento.
"Precisa desgastar?" — Em 99% dos casos não! É o mito mais comum sobre lentes.
"Dói?" — Não. A avaliação não tem procedimento nenhum — só análise e conversa.
"Fica longe" — Muitos vêm de cidades vizinhas. São só 30 minutos de avaliação.
"Vou pensar" — Claro! Só te aviso que esses horários enchem rápido. Posso reservar um pra você sem compromisso?
"Implante é caro" — Tem parcelamento e na avaliação o Dr. Rodrigo mostra tudo com calma.

SOBRE FOTOS:
"Ótimo, já encaminho para o Dr. Rodrigo analisar antes da sua avaliação 😊"
NUNCA elogie o sorriso.

REGRAS:
- NUNCA peça WhatsApp — você já tem
- NUNCA invente horários fora do padrão
- NUNCA pergunte "está com dor?" para lead de estética
- Emergência: "Ligue direto: (35) 3660-2090"
- Mensagens curtas — máximo 3 linhas, uma ideia por vez

Quando agendamento confirmado, inclua ao final:
[SISTEMA: {"evento":"agendamento_confirmado","nome":"[nome]","servico":"[servico]","whatsapp":"[numero]","data":"[data]","hora":"[hora]","resumo":"[frase curta]","temperatura":"quente"}]`;
}

const conversas = new Map();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMensagem(data) {
  if (data?.message?.conversation) return data.message.conversation;
  if (data?.message?.imageMessage) return "[lead enviou foto — diga que vai encaminhar para o Dr. Rodrigo analisar antes da avaliação. NUNCA elogie o sorriso]";
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
      model: "claude-sonnet-4-20250514",
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
  const isAgendamento = evento.evento === "agendamento_confirmado";
  const emoji = isAgendamento ? "🔥" : evento.temperatura === "morno" ? "🟡" : "❄️";
  const titulo = isAgendamento ? "AGENDAMENTO CONFIRMADO" : "NOVO LEAD";

  let texto = `${emoji} *${titulo} — São Judas Odonto*\n\n` +
    `👤 *Nome:* ${evento.nome}\n` +
    `🎯 *Interesse:* ${evento.servico}\n` +
    `📱 *WhatsApp:* ${evento.whatsapp}\n`;

  if (isAgendamento) {
    texto += `📅 *Data:* ${evento.data} às ${evento.hora}\n`;
  }

  texto += `💬 *Resumo:* ${evento.resumo}\n` +
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
