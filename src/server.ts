import express from "express";

const app = express();

const PORT = Number(process.env.PORT) || 8080;

app.get("/", (_, res) => {
  res.send("WhatsApp Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Health server listening on ${PORT}`);
});