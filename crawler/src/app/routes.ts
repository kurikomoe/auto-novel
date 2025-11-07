import Express from 'express';
import { Providers } from '@/index';

const router = Express.Router({ mergeParams: true });

router.get('/metadata', async (req, res) => {
  const { providerId, novelId } = req.params as any;
  const providerInitFn = Providers[providerId];
  if (!providerInitFn) {
    res.status(400).send({ error: 'Unknown providerId' });
    return;
  }
  const provider = providerInitFn(fetch as any);
  const ret = await provider.getMetadata(novelId);
  res.json(ret);
});

router.get('/rank', async (req, res) => {
  res.send({
    ...req.params,
    ...req.body,
  });
});

router.get('/:chapterId/chapter', async (req, res) => {
  const { providerId, novelId, chapterId } = req.params as any;
  const providerInitFn = Providers[providerId];
  if (!providerInitFn) {
    res.status(400).send({ error: 'Unknown providerId' });
    return;
  }
  const provider = providerInitFn(fetch as any);
  const ret = await provider.getChapter(novelId, chapterId);
  res.json(ret);
});

export default router;
