export type UserRole = 'admin' | 'trusted' | 'member' | 'restricted' | 'banned';

export interface UserReference {
  username: string;
}

export namespace UserRole {
  export function toString(role: UserRole) {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'trusted':
        return '信任用户';
      case 'member':
        return '普通用户';
      case 'restricted':
        return '受限用户';
      case 'banned':
        return '封禁用户';
      default:
        return '未知用户';
    }
  }
}
