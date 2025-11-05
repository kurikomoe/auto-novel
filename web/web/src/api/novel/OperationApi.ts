import type {
  MergeHistoryDto,
  OperationHistory,
  OperationType,
} from '@/model/Operation';
import type { Page } from '@/model/Page';
import { client } from './client';

const listOperationHistory = (params: {
  page: number;
  pageSize: number;
  type: OperationType;
}) =>
  client
    .get('operation-history', { searchParams: params })
    .json<Page<OperationHistory>>();

const deleteOperationHistory = (id: string) =>
  client.delete(`operation-history/${id}`);

const listMergeHistory = (page: number) =>
  client
    .get('operation-history/toc-merge/', { searchParams: { page } })
    .json<Page<MergeHistoryDto>>();

const deleteMergeHistory = (id: string) =>
  client.delete(`operation-history/toc-merge/${id}`);

export const OperationApi = {
  listOperationHistory,
  deleteOperationHistory,

  listMergeHistory,
  deleteMergeHistory,
};
