import { PiniaColada } from '@pinia/colada';

import App from './App.vue';
import router from './router';

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(PiniaColada, {
  queryOptions: {
    staleTime: 3600_000,
    gcTime: 3600_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
});

app.use(router);
app.mount('#app');
