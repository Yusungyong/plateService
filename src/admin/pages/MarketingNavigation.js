import React, {useEffect, useState} from 'react';
import {PRIMARY_TABS, MORE_TABS} from './marketingModel';

function TabList({items, tab, onChange, name}) {
  const active = items.some(([key]) => key === tab);
  return <div className="mk-tabs" role="tablist" aria-label={name}>
    {items.map(([key, title], index) => <button type="button" key={key}
      id={'mk-tab-' + key} role="tab" aria-selected={tab === key}
      aria-controls={'mk-panel-' + key} tabIndex={tab === key || (!active && index === 0) ? 0 : -1}
      onClick={() => onChange(key)} onKeyDown={event => {
        const next = {ArrowRight:(index + 1) % items.length, ArrowLeft:(index + items.length - 1) % items.length, Home:0, End:items.length - 1}[event.key];
        if (next !== undefined) {
          event.preventDefault();
          if (onChange(items[next][0]) !== false) document.getElementById('mk-tab-' + items[next][0])?.focus();
        }
      }}>{title}</button>)}
  </div>;
}

export default function MarketingNavigation({tab, onChange}) {
  const advanced = MORE_TABS.some(([key]) => key === tab);
  const [expanded, setExpanded] = useState(advanced);
  useEffect(() => {if (advanced) setExpanded(true);}, [advanced, tab]);
  return <nav className="mk-navigation" aria-label="마케팅 메뉴">
    <div className="mk-navigation-main">
      <TabList items={PRIMARY_TABS} tab={tab} onChange={onChange} name="마케팅 관리 영역"/>
      <button type="button" className="mk-more-button" aria-expanded={expanded} aria-controls="mk-more-menu"
        onClick={() => setExpanded(value => !value)}>추가 관리 <span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    </div>
    {expanded && <div className="mk-more-menu" id="mk-more-menu">
      <span>필요할 때만 펼쳐 보세요</span>
      <TabList items={MORE_TABS} tab={tab} onChange={onChange} name="마케팅 추가 관리"/>
    </div>}
  </nav>;
}
