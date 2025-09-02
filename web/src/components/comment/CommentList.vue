<script lang="ts" setup>
import { CommentOutlined } from '@vicons/material';

import SectionHeader from '@/components/SectionHeader.vue';
import { invalidateCommentList, useCommentList } from '@/hooks';
import { useDraftStore } from '@/stores';

const props = defineProps<{
  site: string;
  locked: boolean;
}>();

const page = ref(1);
const commentSectionRef = ref<InstanceType<typeof SectionHeader>>();

const { data: commentPage, error } = useCommentList(page, () => props.site);

const draftStore = useDraftStore();
const draftId = `comment-${props.site}`;

watch(commentPage, (value, oldValue) => {
  if (oldValue && value) {
    const node = commentSectionRef.value?.$el as HTMLDivElement | null;
    if (!node) return;
    const prevTop = node.getBoundingClientRect().top;
    nextTick(() => {
      const currentTop = node.getBoundingClientRect().top;
      window.scrollBy(0, currentTop - prevTop);
    });
  }
});

function onReplied() {
  showInput.value = false;
  invalidateCommentList(props.site);
  draftStore.cancelAddDraft();
  draftStore.removeDraft(draftId);
}

const showInput = ref(false);
</script>

<template>
  <section-header
    title="评论"
    ref="commentSectionRef"
    style="margin-bottom: 32px"
  >
    <c-button
      v-if="!locked"
      label="发表评论"
      :icon="CommentOutlined"
      require-login
      @action="showInput = !showInput"
    />
  </section-header>

  <n-p v-if="locked">评论区已锁定，不能再回复。</n-p>

  <template v-if="showInput">
    <CommentEditor
      :site="site"
      :draft-id="draftId"
      :placeholder="`发表回复`"
      @replied="onReplied()"
      @cancel="showInput = false"
    />
    <n-divider />
  </template>

  <CPageX
    v-model:page="page"
    :page-number="commentPage?.pageNumber"
    disable-top
  >
    <template v-if="commentPage">
      <template v-for="comment in commentPage.items" :key="comment.id">
        <CommentThread
          :site="site"
          :comment="comment"
          :locked="locked"
          @deleted="invalidateCommentList(site)"
        />
        <n-divider />
      </template>
      <n-empty
        v-if="commentPage.items.length === 0 && !locked"
        description="暂无评论"
      />
    </template>

    <CResultX v-else :error="error" title="加载错误" />
  </CPageX>
</template>
