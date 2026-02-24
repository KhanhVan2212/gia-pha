/**
 * Mock data for demo mode — used when Supabase is not configured
 * Dòng họ mẫu: Nguyễn Văn — 4 thế hệ, 15 thành viên
 */
import type { TreeNode, TreeFamily } from './tree-layout';

export const MOCK_PEOPLE: TreeNode[] = [
  ];

export const MOCK_FAMILIES: TreeFamily[] = [
];

export function getMockTreeData() {
    return { people: MOCK_PEOPLE, families: MOCK_FAMILIES };
}
