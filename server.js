
import express from "express";
import crypto from "node:crypto";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "RedeLives Backup",
    status: "online"
  });
});

app.post("/backup", async (req, res) => {
  try {
    const token = process.env.BACKUP_TOKEN;
    const webhook = process.env.DISCORD_WEBHOOK_URL;

    if (!token || !webhook) {
      return res.status(500).json({
        error: "Configuração do servidor incompleta."
      });
    }

    const receivedToken = req.get("x-backup-token") || "";

    const expected = Buffer.from(token);
    const received = Buffer.from(receivedToken);

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      return res.status(401).json({
        error: "Não autorizado."
      });
    }

    if (req.body?.backup === undefined) {
      return res.status(400).json({
        error: "Nenhum backup foi enviado."
      });
    }

    const content = JSON.stringify(req.body.backup, null, 2);
    const filename =
      `redelives-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    const form = new FormData();

    form.append(
      "payload_json",
      JSON.stringify({
        content: "📦 Backup da RedeLives recebido.",
        username: "RedeLives Backup"
      })
    );

    form.append(
      "files[0]",
      new Blob([content], { type: "application/json" }),
      filename
    );

    const discordResponse = await fetch(
      webhook + "?wait=true",
      {
        method: "POST",
        body: form
      }
    );

    if (!discordResponse.ok) {
      console.error(
        "Discord respondeu com status:",
        discordResponse.status
      );

      return res.status(502).json({
        error: "O Discord recusou o envio do backup."
      });
    }

    return res.json({
      success: true,
      message: "Backup enviado ao Discord."
    });
  } catch (error) {
    console.error("Erro no backup:", error);

    return res.status(500).json({
      error: "Falha ao processar o backup."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RedeLives Backup iniciado na porta ${PORT}`);
});
