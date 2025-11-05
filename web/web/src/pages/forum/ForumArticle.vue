<script lang="ts" setup>
import { ArticleRepo } from '@/repos';
import { doAction } from '@/pages//util';
import { useBlacklistStore, useWhoamiStore } from '@/stores';

const { articleId } = defineProps<{ articleId: string }>();

const whoamiStore = useWhoamiStore();
const { whoami } = storeToRefs(whoamiStore);

const blacklistStore = useBlacklistStore();

const message = useMessage();

const { data: article, error } = ArticleRepo.useArticle(articleId);

watch(
  article,
  (article) => {
    if (article) {
      document.title = article.title;
    }
  },
  { immediate: true },
);

const blockUserComment = async (username: string) =>
  doAction(
    (async () => {
      blacklistStore.add(username);
    })(),
    '屏蔽用户',
    message,
  );

const unblockUserComment = async (username: string) =>
  doAction(
    (async () => {
      blacklistStore.remove(username);
    })(),
    '解除屏蔽用户',
    message,
  );
</script>

<template>
  <div class="layout-content">
    <template v-if="article">
      <n-h1 prefix="bar">{{ article.title }}</n-h1>
      <n-text v-if="article.hidden" depth="3">[隐藏]</n-text>
      <n-p>
        {{ article.updateAt === article.createAt ? '发布' : '更新' }}于
        <n-time :time="article.updateAt * 1000" type="relative" />
        by {{ article.user.username }}
        <template v-if="whoami.isMe(article.user.username) || whoami.asAdmin">
          /
          <c-a :to="`/forum-edit/${article.id}?category=${article.category}`">
            编辑
          </c-a>
        </template>
        <n-button
          v-if="blacklistStore.isBlocked(article.user.username)"
          text
          type="primary"
          @click="unblockUserComment(article.user.username)"
        >
          解除屏蔽
        </n-button>
        <n-button
          v-else
          text
          type="primary"
          @click="blockUserComment(article.user.username)"
        >
          屏蔽
        </n-button>
      </n-p>
      <n-divider />

      <MarkdownView mode="article" :source="article.content" />

      <comment-list :site="`article-${articleId}`" :locked="article.locked" />
    </template>

    <n-result
      v-else-if="error"
      status="error"
      title="加载错误"
      :description="error.message"
    />
  </div>
</template>
