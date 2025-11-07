import Express from 'express';
import { program } from 'commander';

import router from '@/app/routes';

type Options = {
  port: number;
  host: string;
};

program
  .option('--port <number>', 'Port to run the server on', '3000')
  .option('--host <string>', 'Port to run the server on', '127.0.0.1');

program.parse();

const opts: Options = program.opts();

console.log(opts);

const app = Express();

app.get('/ping', async (req, res) => {
  res.send('pong');
});

app.use('/:providerId/:novelId', router);

app.listen(opts.port, opts.host, () => {
  console.log(`Server is running on http://${opts.host}:${opts.port}`);
});
