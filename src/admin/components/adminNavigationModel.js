// Presentation metadata only. Route permissions remain defined in config/routes.
const META = {
  '/admin/operations': ['한눈에 보기', '오늘 할 일과 서비스 상태', '홈 상태 오늘 알림'],
  '/admin/dashboard': ['한눈에 보기', '방문·회원·콘텐츠 흐름', '통계 현황 차트'],
  '/admin/member-monitoring': ['사람과 콘텐츠', '회원 조회와 계정 관리', '사용자 유저 차단'],
  '/admin/feeds': ['사람과 콘텐츠', '게시물 확인·숨김·복원', '콘텐츠 사진 영상 신고'],
  '/admin/seasonal-foods': ['사람과 콘텐츠', '제철 음식과 큐레이션 편집', '계절 식재료 추천'],
  '/admin/store-approvals': ['매장과 고객지원', '입점 신청 검토와 승인', '심사 승인 사업자'],
  '/admin/stores': ['매장과 고객지원', '매장 정보 확인과 수정', '식당 가게 음식점'],
  '/admin/qna': ['매장과 고객지원', '접수된 문의 확인과 답변', '문의 질문 답변 상담'],
  '/admin/faq': ['매장과 고객지원', '자주 묻는 질문 편집', '도움말 고객지원'],
  '/admin/operations/incidents': ['개발과 점검', '오류와 푸시 알림 진단', '오류 장애 푸시 에러'],
  '/admin/api-registry': ['개발과 점검', 'API 관계도와 오류 확인', 'api 구조 관계도 에러'],
  '/admin/operations/releases': ['개발과 점검', '배포 결과와 품질 확인', '배포 깃허브 테스트 빌드'],
};
export const NAV_GROUPS = ['한눈에 보기', '사람과 콘텐츠', '매장과 고객지원', '개발과 점검'];
export function navigationItem(item) {
  const [group, description, keywords] = META[item.path] || [item.group || '메뉴', item.label, ''];
  return {...item, group, description, keywords};
}
export function searchNavigation(items, query) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(item => words.every(word => `${item.label} ${item.group} ${item.description} ${item.keywords}`.toLocaleLowerCase().includes(word)));
}
export function activeNavigation(items, pathname) {
  return [...items].sort((a,b)=>b.path.length-a.path.length).find(item=>pathname===item.path || pathname.startsWith(item.path+'/'));
}
export function readPinnedMenus(account) {
  if (!account) return [];
  try {const value=JSON.parse(localStorage.getItem('plate-admin.pinned.'+encodeURIComponent(account)) || '[]');return Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string'&&Object.hasOwn(META,x)))].slice(0,5):[];}catch{return [];}
}
export function writePinnedMenus(account, paths) {
  if (!account) return;
  try {localStorage.setItem('plate-admin.pinned.'+encodeURIComponent(account),JSON.stringify(paths.slice(0,5)));}catch {/* Navigation remains usable without browser storage. */}
}
