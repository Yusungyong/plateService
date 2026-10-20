import React, {useEffect, useMemo, useState} from 'react';
import {creativeDate, creativeCampaign, filterCreatives, label, time} from './marketingModel';

export default function MarketingLibrary({creatives, campaigns, selectedId, onSelect, children, initialFilter='all', filterValue,onFilterChange,locked=false}) {
  const [query, setQuery] = useState('');
  const [localFilter, setFilter] = useState(initialFilter);
  const filter=filterValue??localFilter;
  const visible = useMemo(() => filterCreatives(creatives,campaigns,query,filter), [creatives,campaigns,query,filter]);
  const selectedVisible = visible.some(item => item.id === selectedId);
  useEffect(() => {
    if (!locked && !selectedVisible && visible.length) onSelect(visible[0].id);
  }, [locked, selectedVisible, visible, onSelect]);
  return <div className="mk-library">
    <aside className="mk-library-index" aria-label="제작물 보관함">
      <div className="mk-library-heading"><h3>제작물 보관함</h3><span>{creatives.length}개</span></div>
      <label className="mk-library-search"><span>제작물 검색</span><input type="search" value={query} disabled={locked}
        placeholder="날짜, 캠페인, 상태 검색" onChange={e => setQuery(e.target.value)}/></label>
      <label className="mk-library-filter"><span>제작 상태</span><select value={filter} disabled={locked} onChange={e => {setFilter(e.target.value);onFilterChange?.(e.target.value);}}>
        <option value="all">전체 제작물</option><option value="review">검토할 제작물</option><option value="ready">검토 완료</option><option value="waiting">카드 제작 대기</option>
      </select></label>
      <p className="mk-library-count" role="status">{visible.length}개 표시 · 최근 목록 기준</p>
      <ul className="mk-library-list">{visible.map(c => <li key={c.id}>
        <button type="button" aria-current={selectedId===c.id?'true':undefined} disabled={locked} onClick={() => onSelect(c.id)}>
          <span className="mk-library-date">{creativeDate(c)?time(creativeDate(c)):'날짜 기록 없음'}</span>
          <strong>{creativeCampaign(c,campaigns)}</strong>
          <span className={'mk-library-state '+(c.state==='READY_FOR_PUBLISHING'?'is-ready':'')}>{label(c.state)}</span>
          <span className="mk-library-id">기록 {c.id.slice(0,8)}</span>
          <span className="mk-library-arrow" aria-hidden="true">↗</span>
        </button>
      </li>)}</ul>
      {!visible.length && <p className="mk-empty">검색 조건에 맞는 제작물이 없어요.</p>}
    </aside>
    <div className="mk-library-detail">{selectedVisible?children:<div className="mk-empty">다른 검색어나 상태를 선택해 보세요.</div>}</div>
  </div>;
}
