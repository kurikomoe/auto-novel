import Express from 'express';
import router from '@/app/routes';

import 'dotenv-defaults/config.js';

type Opts = {
  HOST: string;
  PORT: number;
};

const opts = process.env as unknown as Opts;

const app = Express();

app.get('/ping', async (req, res) => {
  res.send('pong');
});

app.use('/:providerId/:novelId', router);

app.listen(opts.PORT, opts.HOST, () => {
  console.log(`Server is running on http://${opts.HOST}:${opts.PORT}`);
});
