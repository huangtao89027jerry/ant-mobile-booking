import React, { useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Button, Card, DatePicker, Dialog, List, NavBar, Popup, SearchBar,
  Selector, Space, Stepper, TabBar, Tabs, Tag, Toast
} from 'antd-mobile'
import {
  BadgeDollarSign, CalendarDays, CalendarPlus, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, ClipboardList,
  Clock3, Info, Library, ListChecks, MessageSquareText, Plus, ReceiptText, Search,
  Sparkles, UserRoundSearch, Users, UsersRound, X
} from 'lucide-react'
import 'antd-mobile/es/global'
import './styles.css'

const teachers = [
  { name: '郭老师', subjects: ['数学','物理'], subject: '数学、物理', grades: ['初一','初二','初三'], grade: '初一至初三' },
  { name: '陈老师', subjects: ['英语'], subject: '英语', grades: ['小学','初一','初二'], grade: '小学至初二' },
  { name: '周老师', subjects: ['数学'], subject: '数学', grades: ['初二','初三'], grade: '初二、初三' },
]

const initialOrders = [
  { status: '收费中', name: '李小雨', time: '周五 16:00-17:00 · 共4次', price: '¥2000' },
  { status: '可收费', name: '王小明', time: '周三 17:00-18:00 · 共4次', price: '¥2000' },
  { status: '等待中', name: '张小雨', time: '周三 17:00-18:00 · 共4次', price: '¥2000' },
  { status: '已生效', name: '陈小宇', time: '周六 10:00-11:00 · 共4次', price: '¥2000' },
  { status: '已过期', name: '刘晨', time: '周日 14:00-15:00 · 共4次', price: '¥2000' },
  { status: '已取消', name: '赵一', time: '周二 18:00-19:00 · 共4次', price: '¥2000' },
]

const appEntries = [
  [BadgeDollarSign, '报名收费'], [UsersRound, '班级管理'], [CalendarDays, '我的课表'],
  [CheckCircle2, '上课点名'], [MessageSquareText, '上课点评'], [Sparkles, 'AI点评'],
  [Library, '素材管理'], [Users, '学员管理'], [UserRoundSearch, '意向学员'],
  [CalendarPlus, '名师约课', true], [ClipboardCheck, '我的审批'], [ReceiptText, '订单管理'],
]

const tagColor = status => ({
  可收费: 'success', 收费中: 'warning', 等待中: 'warning', 已生效: 'primary', 已过期: 'default', 已取消: 'danger'
}[status])

const statusClass = status => ({
  可收费: 'available', 收费中: 'charging', 等待中: 'waiting', 已生效: 'active', 已过期: 'ended', 已取消: 'cancelled'
}[status])

function Header({ title, onBack }) {
  return <NavBar onBack={onBack} backArrow={<ChevronLeft size={22} />}>{title}</NavBar>
}

function BottomTabs({ page, go }) {
  return <div className="tabbar-wrap"><TabBar activeKey={page === 'orders' ? 'orders' : 'teachers'} onChange={go}>
    <TabBar.Item key="teachers" icon={<CalendarPlus size={20} />} title="名师约课" />
    <TabBar.Item key="orders" icon={<ClipboardList size={20} />} title="我的意向单" />
  </TabBar></div>
}

function Home({ go }) {
  return <div className="page">
    <div className="home-head"><h1>刘亦菲 - 黎璐教育集团</h1><p>demo.xiaogj.com</p></div>
    <Card className="section-card"><div className="section-title">待办事项</div><div className="todo-grid">
      {[['1','待跟进'],['0','待点名'],['0','待点评'],['19','待审批']].map(x => <div className="todo" key={x[1]}><b>{x[0]}</b><span>{x[1]}</span></div>)}
    </div></Card>
    <Card className="section-card"><div className="section-title">常用功能</div><div className="app-grid">
      {appEntries.map(([Icon,label,active]) => <button className={`app-entry ${active ? 'highlight' : ''}`} key={label} onClick={() => active && go('teachers')}>
        <span className="app-icon"><Icon size={21} /></span>{label}
      </button>)}
    </div></Card>
  </div>
}

function Teachers({ go }) {
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const emptyFilters = { subject: '全部', grade: '全部', teacher: '全部' }
  const [filters, setFilters] = useState(emptyFilters)
  const [draftFilters, setDraftFilters] = useState(emptyFilters)
  const visible = teachers.filter(t =>
    (!query || t.name.includes(query)) &&
    (filters.subject === '全部' || t.subjects.includes(filters.subject)) &&
    (filters.grade === '全部' || t.grades.includes(filters.grade)) &&
    (filters.teacher === '全部' || t.name === filters.teacher)
  )
  const openFilters = () => { setDraftFilters(filters); setFilterOpen(true) }
  return <div className="page">
    <Header title="名师约课" onBack={() => go('home')} />
    <div className="intro"><Info size={16} />先选择老师，再查看当天可预约时间。</div>
    <div className="search-panel"><SearchBar className="toolbar-search" placeholder="搜索任课老师" value={query} onChange={setQuery} /><Button className="filter-button" onClick={openFilters}>筛选 <ChevronDown size={14} /></Button></div>
    {!!visible.length && <section className="teacher-results"><div className="teacher-results-head"><b>选择老师</b><span>共 {visible.length} 位</span></div><List className="teacher-list">
      {visible.map(t => <List.Item
        key={t.name}
        prefix={<div className="avatar">{t.name[0]}</div>}
        extra={<Button className="teacher-view-button" fill="none" size="small" onClick={e => { e.stopPropagation(); go('board', t) }}>查看可约时间 <ChevronRight size={14} /></Button>}
        description={<div className="teacher-description"><span>{t.subject}</span><span>{t.grade}</span></div>}
      ><span className="teacher-title">{t.name}</span></List.Item>)}
    </List></section>}
    {!visible.length && <div className="empty">暂无符合条件的老师</div>}
    <Popup className="teacher-filter-popup" visible={filterOpen} onMaskClick={() => setFilterOpen(false)} bodyStyle={{ borderRadius: '12px 12px 0 0', padding: 16 }}>
      <h3>筛选老师</h3>
      <div className="filter-group"><b>科目</b><Selector columns={4} options={['全部','数学','英语','物理'].map(v => ({ label:v,value:v }))} value={[draftFilters.subject]} onChange={v => setDraftFilters(f => ({...f,subject:v[0]||'全部'}))} /></div>
      <div className="filter-group"><b>年级</b><Selector columns={4} options={['全部','小学','初一','初二','初三'].map(v => ({ label:v,value:v }))} value={[draftFilters.grade]} onChange={v => setDraftFilters(f => ({...f,grade:v[0]||'全部'}))} /></div>
      <div className="filter-group"><b>任课老师</b><Selector columns={4} options={['全部',...teachers.map(t=>t.name)].map(v => ({ label:v,value:v }))} value={[draftFilters.teacher]} onChange={v => setDraftFilters(f => ({...f,teacher:v[0]||'全部'}))} /></div>
      <div className="filter-actions"><Button fill="none" onClick={() => setDraftFilters(emptyFilters)}>重置</Button><Button color="primary" onClick={() => { setFilters(draftFilters); setFilterOpen(false) }}>完成</Button></div>
    </Popup>
    <BottomTabs page="teachers" go={go} />
  </div>
}

function Board({ go, teacher }) {
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })
  const [selected, setSelected] = useState(null)
  const [monthPickerVisible, setMonthPickerVisible] = useState(false)
  const touchStart = useRef(null)
  const suppressClick = useRef(false)
  const currentTeacher = teacher || teachers[0]
  const baseDate = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const dates = useMemo(() => Array.from({length:3},(_,i) => { const d = new Date(viewDate); d.setDate(viewDate.getDate() + i); return d }), [viewDate])
  const dayName = ['周日','周一','周二','周三','周四','周五','周六']
  const monthLabel = `${dates[0].getFullYear()}年${dates[0].getMonth() + 1}月`
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const demoDates = useMemo(() => Array.from({length:3},(_,i) => { const d = new Date(baseDate); d.setDate(baseDate.getDate() + i); return dateKey(d) }), [baseDate])
  const events = { [`${demoDates[0]}-9`]:['agenda','日程','磨课'], [`${demoDates[2]}-10`]:['course','已排课','数学一对一'], [`${demoDates[1]}-12`]:['paying','收费中','14:24 · 2人等待'], [`${demoDates[0]}-14`]:['waiting','3人等待',''] }
  const choose = (row, day) => {
    if (suppressClick.current) return
    const date = dateKey(dates[day])
    const event = events[`${date}-${8+row}`]
    if (event?.[0] === 'paying') return Toast.show('该时段正在收费锁定中，暂不可预约')
    if (event?.[0] === 'course' || event?.[0] === 'agenda') return Dialog.confirm({ content: `当前时段已有${event[1]}，预约后将进入等待。是否继续？`, confirmText:'继续预约' }).then(ok => ok && setSelected({row,day,date}))
    setSelected({row,day,date})
  }
  const shiftDays = amount => {
    setViewDate(current => { const next = new Date(current); next.setDate(current.getDate() + amount); return next })
    setSelected(null)
  }
  const onTouchStart = event => { const point = event.touches[0]; touchStart.current = { x: point.clientX, y: point.clientY } }
  const onTouchEnd = event => {
    if (!touchStart.current) return
    const point = event.changedTouches[0]
    const dx = point.clientX - touchStart.current.x
    const dy = point.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return
    suppressClick.current = true
    window.setTimeout(() => { suppressClick.current = false }, 400)
    shiftDays(dx < 0 ? 1 : -1)
  }
  return <div className="page">
    <Header title="老师可约时间" onBack={() => go('teachers')} />
    <Card className="profile-card"><div className="teacher-row"><div className="avatar">{currentTeacher.name[0]}</div><div className="profile-main"><div className="teacher-name">{currentTeacher.name}</div><div className="teacher-meta">{currentTeacher.subject} · {currentTeacher.grade}</div></div></div></Card>
    <div className="schedule" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="date-nav"><Button className="month-picker-button" fill="none" onClick={() => setMonthPickerVisible(true)}>{monthLabel}<ChevronDown size={17} /></Button></div>
      <DatePicker
        title="选择月份"
        precision="month"
        value={viewDate}
        visible={monthPickerVisible}
        onClose={() => setMonthPickerVisible(false)}
        onConfirm={value => {
          const next = new Date(value.getFullYear(), value.getMonth(), 1)
          setViewDate(next)
          setSelected(null)
          setMonthPickerVisible(false)
        }}
      />
      <div className="schedule-head"><span />{dates.map(d=><span className={selected?.date===dateKey(d)?'day-focus':''} key={dateKey(d)}>{dayName[d.getDay()]}<b>{d.getDate()}</b></span>)}</div>
      <div className="legend"><span><i className="dot" style={{background:'#69a7ff'}} />已排课</span><span><i className="dot" style={{background:'#a77bea'}} />日程</span><span><i className="dot" style={{background:'#ff9c6e'}} />收费中</span><span><i className="dot" style={{background:'#ffc53d'}} />有人等待</span></div>
      <div className="schedule-grid">{Array.from({length:10},(_,row)=><React.Fragment key={row}><div className="time-label">{8+row}:00</div>{[0,1,2].map(day=>{const date=dateKey(dates[day]);const ev=events[`${date}-${8+row}`];const isSelected=selected?.date===date&&selected?.row===row;return <div className={`slot ${isSelected?'selected':''}`} key={date} onClick={() => choose(row,day)}>{ev&&<div className={`event ${ev[0]}`}><b>{ev[1]}</b><br />{ev[2]}</div>}{isSelected&&!ev&&<div className="slot-selected">已选时段<br />{8+row}:00-{9+row}:00</div>}</div>})}</React.Fragment>)}</div>
    </div>
    <div className="bottom-action"><Button block color="primary" disabled={!selected} onClick={()=>go('booking')}>{selected?'预约所选时段（1）':'选择可约时段'}</Button></div>
  </div>
}

function Booking({ go, createOrder }) {
  const [student,setStudent]=useState('')
  const [room,setRoom]=useState('')
  const [qty,setQty]=useState(20)
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [startDate,setStartDate]=useState(today)
  const [endDate,setEndDate]=useState(() => { const d = new Date(today); d.setDate(today.getDate() + 21); return d })
  const [rules,setRules]=useState([{ id: 1, days: [3], start: '17:00', end: '18:00' }])
  const [lessonsExpanded,setLessonsExpanded]=useState(false)
  const [popup,setPopup]=useState('')
  const [datePicker,setDatePicker]=useState('')
  const [weekdayRuleId,setWeekdayRuleId]=useState(null)
  const options = popup==='student'?['王小明','李佳怡']:['301教室','302教室','VIP一对一教室']
  const weekdayNames = ['周日','周一','周二','周三','周四','周五','周六']
  const weekdayOptions = weekdayNames.map((label, value) => ({ label, value: String(value) }))
  const formatDate = value => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`
  const formatDateShort = value => `${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`
  const lessons = useMemo(() => {
    const list = []
    for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      rules.filter(rule => rule.days.includes(cursor.getDay())).forEach(rule => list.push({
        key: `${formatDate(cursor)}-${rule.id}`,
        duration: (Number(rule.end.slice(0, 2)) * 60 + Number(rule.end.slice(3))) - (Number(rule.start.slice(0, 2)) * 60 + Number(rule.start.slice(3))),
        label: `${formatDateShort(cursor)} ${weekdayNames[cursor.getDay()]} ${rule.start}-${rule.end}`
      }))
    }
    return list
  }, [startDate, endDate, rules])
  const selectedHours = Math.round(lessons.reduce((sum, lesson) => sum + lesson.duration / 60, 0) * 100) / 100
  const updateRules = next => setRules(next)
  const updateRule = (id, patch) => updateRules(rules.map(rule => rule.id === id ? { ...rule, ...patch } : rule))
  const addRule = () => updateRules([...rules, { id: Date.now(), days: [5], start: '17:00', end: '18:00' }])
  const submit = type => {
    if(!student) return Toast.show('请先选择学员')
    if(!room) return Toast.show('请先选择上课教室')
    if(rules.some(rule => !rule.days.length || rule.start >= rule.end)) return Toast.show('请检查上课星期和时间范围')
    if(!lessons.length) return Toast.show('所选日期范围内没有预约课次')
    if(selectedHours > qty) return Toast.show('预约数量不能超过购买数量，请调整购买数量或预约课次')
    createOrder(type, { time: `${lessons[0].label} · 共${lessons.length}次`, price: `¥${qty*500}` }); Toast.show(type==='收费中'?'已锁定时段，进入收费中':'意向单创建成功'); go('orders')
  }
  return <div className="page">
    <Header title="选课下单" onBack={()=>go('board')} />
    <section className="booking-section"><div className="form-title">预约信息</div><List>
      <List.Item extra={<span className={!student?'placeholder':''}>{student||'请选择'}</span>} clickable onClick={()=>setPopup('student')}>学员</List.Item>
      <List.Item extra={<span className="field-value">郭老师</span>}>任课老师</List.Item><List.Item extra={<span className="field-value">长沙校区</span>}>上课校区</List.Item>
      <List.Item extra={<span className={!room?'placeholder':''}>{room||'请选择'}</span>} clickable onClick={()=>setPopup('room')}>上课教室</List.Item>
      <List.Item extra={<span className="field-value course-value">数学一对一 · ¥500/小时</span>}>课程</List.Item>
      <List.Item extra={<Stepper min={1} value={qty} onChange={setQty} />}>购买数量</List.Item>
      <List.Item extra={<div className="date-range"><button className="date-value" onClick={()=>setDatePicker('start')}>{formatDate(startDate)}</button><span>至</span><button className="date-value" onClick={()=>setDatePicker('end')}>{formatDate(endDate)}</button></div>}>上课日期</List.Item>
    </List></section>
    <section className="booking-section time-section"><div className="section-heading"><div><div className="form-title">上课时间</div><p>按星期和时间生成预约课次</p></div><Button className="add-rule" fill="none" onClick={addRule}><Plus size={16} /><span>添加</span></Button></div>
      <div className="rule-list">{rules.map(rule=><div className="schedule-rule" key={rule.id}>
        <Button className="weekday-value" fill="none" onClick={()=>setWeekdayRuleId(rule.id)}><span className="weekday-label">{rule.days.length ? rule.days.map(day=>weekdayNames[day]).join('、') : '请选择星期'}</span><ChevronDown size={14} /></Button>
        <label className="time-field"><input aria-label="开始时间" type="time" value={rule.start} onChange={event=>updateRule(rule.id,{start:event.target.value})} /><Clock3 size={15} aria-hidden="true" /></label>
        <span className="time-separator">至</span>
        <label className="time-field"><input aria-label="结束时间" type="time" value={rule.end} onChange={event=>updateRule(rule.id,{end:event.target.value})} /><Clock3 size={15} aria-hidden="true" /></label>
        {rules.length > 1 && <Button className="remove-rule" fill="none" aria-label="删除上课时间" onClick={()=>updateRules(rules.filter(item=>item.id!==rule.id))}><X size={16} /></Button>}
      </div>)}</div>
    </section>
    <section className="booking-section lessons-section"><button className="lessons-toggle" onClick={()=>setLessonsExpanded(value=>!value)}><span className="form-title">预约课次 <span className="section-count">{lessons.length}次 · {selectedHours}小时</span></span><ChevronDown className={lessonsExpanded?'expanded':''} size={18} /></button>
      {lessonsExpanded && <div className="generated-lessons">{lessons.map((lesson,i)=><div className="lesson-row" key={lesson.key}><span>{lesson.label}</span><Tag color={i===2?'warning':'success'}>{i===2?'有人等待':'可预约'}</Tag></div>)}</div>}
      <div className="summary"><span>购买数量 {qty}小时 · 预约 {selectedHours}小时</span><strong>¥{qty*500}</strong></div></section>
    <div className="bottom-action"><Button onClick={()=>submit('等待中')}>排队等待</Button><Button color="primary" onClick={()=>submit('收费中')}>去收费</Button></div>
    <Popup visible={!!popup} onMaskClick={()=>setPopup('')} bodyStyle={{borderRadius:'12px 12px 0 0'}}><div style={{padding:16}}><h3>{popup==='student'?'选择学员':'选择上课教室'}</h3><List>{options.map(x=><List.Item key={x} clickable onClick={()=>{popup==='student'?setStudent(x):setRoom(x);setPopup('')}}>{x}</List.Item>)}</List></div></Popup>
    <DatePicker title={datePicker==='start'?'选择开始日期':'选择结束日期'} precision="day" value={datePicker==='start'?startDate:endDate} min={datePicker==='end'?startDate:undefined} visible={!!datePicker} onClose={()=>setDatePicker('')} onConfirm={value=>{if(datePicker==='start'){setStartDate(value);if(value>endDate)setEndDate(value)}else setEndDate(value);setDatePicker('')}} />
    <Popup visible={weekdayRuleId!==null} onMaskClick={()=>setWeekdayRuleId(null)} bodyStyle={{borderRadius:'12px 12px 0 0',padding:16}}><h3>选择上课星期</h3><Selector multiple columns={4} options={weekdayOptions} value={weekdayRuleId===null?[]:rules.find(rule=>rule.id===weekdayRuleId)?.days.map(String)} onChange={value=>weekdayRuleId!==null&&updateRule(weekdayRuleId,{days:value.map(Number)})} /><Button block color="primary" onClick={()=>setWeekdayRuleId(null)} style={{marginTop:16}}>完成</Button></Popup>
  </div>
}

function Orders({ go, orders }) {
  const [tab,setTab]=useState('全部'); const [query,setQuery]=useState(''); const [teacherOpen,setTeacherOpen]=useState(false)
  const groups = {'全部':orders,'进行中':orders.filter(o=>['收费中','可收费','等待中'].includes(o.status)),'已生效':orders.filter(o=>o.status==='已生效'),'已结束':orders.filter(o=>['已过期','已取消'].includes(o.status))}
  const list=groups[tab].filter(o=>!query||o.name.includes(query))
  return <div className="page"><Header title="我的意向单" onBack={()=>go('teachers')} />
    <Tabs className="orders-tabs" activeKey={tab} onChange={setTab}>{Object.entries(groups).map(([k,v])=><Tabs.Tab title={`${k} ${v.length}`} key={k} />)}</Tabs>
    <div className="orders-tools"><SearchBar className="toolbar-search" placeholder="搜索学员姓名" value={query} onChange={setQuery} /><Button className="orders-filter-button" onClick={()=>setTeacherOpen(true)}>任课老师 <ChevronDown size={14} /></Button></div>
    <div className="orders-list">{list.map((o,i)=><Card className="order-card" key={`${o.name}-${i}`} onClick={()=>go('detail',o)}><div className="order-head"><b>{o.name}</b><span className={`order-status order-status-${statusClass(o.status)}`}><Tag color={tagColor(o.status)}>{o.status}</Tag></span></div><div className="order-course">数学一对一 · 郭老师 · 长沙校区</div><div className="order-time">{o.time} · 购买20小时</div>{o.status==='收费中'&&<div className="order-alert"><span>请在倒计时内完成收费</span><b>14:24</b></div>}<div className="order-footer"><div className="order-price">{o.price}</div><div className="order-actions">{['收费中','可收费','等待中'].includes(o.status)&&<Button className="order-cancel" fill="none" size="small" onClick={e=>{e.stopPropagation();Dialog.confirm({content:'取消后将释放预约时段，是否继续？'})}}>取消</Button>}{o.status==='可收费'&&<Button className="order-primary" color="primary" size="small">去收费</Button>}{o.status==='收费中'&&<Button className="order-primary" color="primary" size="small">继续收费</Button>}{['已生效','已过期','已取消'].includes(o.status)&&<Button className="order-detail" fill="none" size="small">查看详情</Button>}</div></div></Card>)}{!list.length&&<div className="empty">暂无符合条件的意向单</div>}</div>
    <Popup visible={teacherOpen} onMaskClick={()=>setTeacherOpen(false)} bodyStyle={{borderRadius:'12px 12px 0 0',padding:16}}><h3>任课老师</h3><List>{['全部老师','郭老师','陈老师','周老师'].map(x=><List.Item key={x} clickable onClick={()=>setTeacherOpen(false)}>{x}</List.Item>)}</List></Popup>
    <BottomTabs page="orders" go={go} />
  </div>
}

function Detail({ go, order }) {
  const o=order||initialOrders[0]
  return <div className="page"><Header title="意向单详情" onBack={()=>go('orders')} /><div className="detail-stack">
    <Card className="detail-card"><div className="order-head"><b>基本信息</b><Tag color={tagColor(o.status)}>{o.status}</Tag></div><div className="detail-grid"><div><span>意向单号</span><b>YXD260920000001</b></div><div><span>学员</span><b>{o.name}</b></div><div><span>手机号</span><b>138****8821</b></div><div><span>创建时间</span><b>2026-09-20 09:15</b></div></div></Card>
    <Card className="detail-card"><b>购买信息</b><div className="detail-grid"><div><span>课程</span><b>数学一对一</b></div><div><span>课程单价</span><b>¥500/小时</b></div><div><span>购买数量</span><b>20小时</b></div><div><span>应收金额</span><b style={{color:'#ff3141'}}>¥10,000</b></div></div></Card>
    <Card className="detail-card"><b>预约信息</b><div className="detail-grid"><div><span>任课老师</span><b>郭老师</b></div><div><span>校区</span><b>长沙校区</b></div><div><span>教室</span><b>301教室</b></div><div><span>预约课次</span><b>4次</b></div></div></Card>
  </div></div>
}

function App(){
  const [page,setPage]=useState('home'); const [orders,setOrders]=useState(initialOrders); const [current,setCurrent]=useState(null)
  const go=(next,data)=>{setCurrent(data||current);setPage(next);window.scrollTo(0,0)}
  const createOrder=(status,booking={})=>setOrders(v=>[{status,name:'王小明',time:booking.time||'周三 17:00-18:00 · 共4次',price:booking.price||'¥10000'},...v])
  return <main className="app">{page==='home'&&<Home go={go}/>} {page==='teachers'&&<Teachers go={go}/>} {page==='board'&&<Board go={go} teacher={current}/>} {page==='booking'&&<Booking go={go} createOrder={createOrder}/>} {page==='orders'&&<Orders go={go} orders={orders}/>} {page==='detail'&&<Detail go={go} order={current}/>}</main>
}

createRoot(document.getElementById('root')).render(<App />)
