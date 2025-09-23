<script lang="ts" setup>
import type { OperationWenkuUpload } from '@/model/Operation';

defineProps<{ op: OperationWenkuUpload }>();
</script>

<template>
  <c-a :to="`/wenku/${op.novelId}`">
    {{ op.volumeId }}
  </c-a>
</template>
