import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import useDialogFocus from './useDialogFocus';
import {NAV_GROUPS,searchNavigation} from './adminNavigationModel';

export default function AdminMenuFinder({items,pinned,onPin,onClose}) {
  const [query,setQuery]=useState('');
  const dialog=useDialogFocus(true,onClose),matches=searchNavigation(items,query);
  return <div className="admin-finder-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="admin-finder-title" className="admin-finder">
      <header><div><p>접시 운영 공간</p><h2 id="admin-finder-title">어떤 일을 할까요?</h2></div><button type="button" onClick={onClose} aria-label="메뉴 찾기 닫기">닫기 <kbd>Esc</kbd></button></header>
      <label className="admin-finder__search"><span>메뉴 검색</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="회원, 홍보, 오류… 하고 싶은 일을 검색" /></label>
      <p className="admin-finder__hint" role="status">{query?`${matches.length}개 메뉴를 찾았어요.`:'자주 쓰는 메뉴는 별을 눌러 왼쪽에 고정해요. 최대 5개.'}</p>
      <div className="admin-finder__results">{NAV_GROUPS.map(group=>{
        const grouped=matches.filter(item=>item.group===group);
        return grouped.length?<section key={group}><h3>{group}</h3><div className="admin-finder__grid">{grouped.map(item=><div className="admin-finder__item" key={item.path}>
          <Link to={item.path} onClick={onClose}><strong>{item.label}<span aria-hidden="true">↗</span></strong><small>{item.description}</small></Link>
          <button type="button" className="admin-pin" aria-label={item.label+' '+(pinned.includes(item.path)?'고정 해제':'고정')} aria-pressed={pinned.includes(item.path)} disabled={!pinned.includes(item.path)&&pinned.length>=5} onClick={()=>onPin(item.path)}><span aria-hidden="true">{pinned.includes(item.path)?'★':'☆'}</span></button>
        </div>)}</div></section>:null;
      })}{matches.length===0&&<p className="admin-finder__empty">일치하는 메뉴가 없어요. ‘회원’, ‘제작물’, ‘오류’로 찾아보세요.</p>}</div>
    </section>
  </div>;
}
