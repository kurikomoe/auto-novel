<script lang="ts" setup>
import { CommentApi } from '@/data';
import { invalidateCommentList, useCommentList } from '@/hooks';
import { Comment1 } from '@/model/Comment';
import { copyToClipBoard, doAction } from '@/pages/util';
import { useBlacklistStore, useDraftStore } from '@/stores';

const props = defineProps<{
  site: string;
  comment: Comment1;
  locked: boolean;
}>();

const message = useMessage();

const draftStore = useDraftStore();
const draftId = `comment-${props.site}`;

const blacklistStore = useBlacklistStore();

const emit = defineEmits<{
  deleted: [];
}>();

const page = ref(1);
const { data: commentPage, error } = useCommentList(
  page,
  () => props.site,
  () => props.comment.id,
  {
    items: props.comment.replies,
    pageNumber: Math.floor((props.comment.numReplies + 9) / 10),
  },
);

function onReplied() {
  showInput.value = false;
  invalidateCommentList(props.site, props.comment.id);
  draftStore.cancelAddDraft();
  draftStore.removeDraft(draftId);
}

const copyComment = (comment: Comment1) =>
  copyToClipBoard(comment.content).then((isSuccess) => {
    if (isSuccess) message.success('复制成功');
    else message.error('复制失败');
  });

const deleteComment = (commentToDelete: Comment1) =>
  doAction(
    CommentApi.deleteComment(commentToDelete.id).then(() => {
      if (commentToDelete.id === props.comment.id) {
        emit('deleted');
      }
    }),
    '删除',
    message,
  );

const hideComment = (comment: Comment1) =>
  doAction(
    CommentApi.hideComment(comment.id).then(() => (comment.hidden = true)),
    '隐藏',
    message,
  );

const unhideComment = (comment: Comment1) =>
  doAction(
    CommentApi.unhideComment(comment.id).then(() => (comment.hidden = false)),
    '解除隐藏',
    message,
  );

const blockUserComment = async (comment: Comment1) =>
  doAction(
    (async () => {
      blacklistStore.add(comment.user.username);
    })(),
    '屏蔽用户',
    message,
  );

const unblockUserComment = async (comment: Comment1) =>
  doAction(
    (async () => {
      blacklistStore.remove(comment.user.username);
    })(),
    '解除屏蔽用户',
    message,
  );

const showInput = ref(false);
</script>

<template>
  <div ref="topElement" />
  <CommentItem
    :comment="comment"
    top-level
    @copy="copyComment"
    @delete="deleteComment"
    @hide="hideComment"
    @unhide="unhideComment"
    @block="blockUserComment"
    @unblock="unblockUserComment"
    @reply="showInput = !showInput"
  />

  <CommentEditor
    v-if="showInput"
    :site="site"
    :draft-id="draftId"
    :parent="comment.id"
    :placeholder="`回复${comment.user.username}`"
    style="padding-top: 8px"
    @replied="onReplied()"
    @cancel="showInput = false"
  />

  <div style="margin-left: 30px; margin-top: 20px">
    <CPageX
      v-model:page="page"
      :page-number="commentPage?.pageNumber"
      disable-top
    >
      <template v-if="commentPage">
        <div
          v-for="replyComment in commentPage?.items"
          :key="replyComment.id"
          style="margin-top: 20px"
        >
          <CommentItem
            :comment="replyComment"
            @copy="copyComment"
            @delete="deleteComment"
            @hide="hideComment"
            @unhide="unhideComment"
            @block="blockUserComment"
            @unblock="unblockUserComment"
          />
        </div>
      </template>
      <CResultX v-else :error="error" title="加载错误" />
    </CPageX>
  </div>
</template>
