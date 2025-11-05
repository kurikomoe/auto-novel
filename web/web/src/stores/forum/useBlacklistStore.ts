import { useLocalStorage } from '@/util';
import { LSKey } from '../key';

interface BlockUserComment {
  usernames: string[];
}

export const useBlacklistStore = defineStore(LSKey.Blacklist, () => {
  const blacklist = useLocalStorage<BlockUserComment>(LSKey.Blacklist, {
    usernames: [],
  });

  function add(username: string) {
    if (!blacklist.value.usernames.includes(username)) {
      blacklist.value.usernames.push(username);
    }
  }

  function remove(username: string) {
    blacklist.value.usernames = blacklist.value.usernames.filter(
      (name) => name !== username,
    );
  }

  function isBlocked(userName: string) {
    return blacklist.value.usernames.includes(userName);
  }

  return {
    blacklist,
    add,
    remove,
    isBlocked,
  };
});
