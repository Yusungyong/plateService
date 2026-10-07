const protections = new Set();
export function registerLeaveProtection(check) {
  protections.add(check);
  return () => protections.delete(check);
}
export function confirmFormLeave() {
  const states = [...protections].map(check => check());
  if (states.some(state => state.pending)) {
    window.alert("요청을 처리하고 있습니다. 결과를 확인한 뒤 이동해 주세요.");
    return false;
  }
  return !states.some(state => state.dirty) || window.confirm("저장하지 않은 내용이 있습니다. 내용을 버리고 이동할까요?");
}
