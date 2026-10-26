import { createApp } from './app.js';
const port = Number(process.env.PORT || 3001);
const { app, store } = await createApp({ databasePath: process.env.DATABASE_PATH });
const server = app.listen(port, '0.0.0.0', () => console.log(`Wordland API: http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => { store.close(); process.exit(0); }));
