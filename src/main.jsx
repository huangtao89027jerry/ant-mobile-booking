import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Button, Card, DatePicker, Dialog, List, NavBar, Popup, SearchBar,
  Selector, Space, Stepper, Tabs, Tag, Toast
} from 'antd-mobile'
import {
  BadgeDollarSign, CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck,
  Clock3, Info, Library, ListChecks, MessageSquareText, Plus, ReceiptText, Search,
  Sparkles, Trash2, UserRoundSearch, Users, UsersRound, X
} from 'lucide-react'
import 'antd-mobile/es/global'
import './styles.css'

const teachers = [
  {
    name: '郭老师', subjects: ['数学','物理'], subject: '数学、物理', grades: ['初一','初二','初三'], grade: '初一至初三',
    years: 12, school: '湖南师范大学 · 数学与应用数学',
    intro: '擅长把抽象的数学概念放回生活场景里讲，一道压轴题会拆成学生能复述的思考顺序。带完一轮初中会把函数、几何、代数三大块重新串成体系，学生换题不换思路。',
    honors: ['市级优质课一等奖', '中考命题研究组成员', '5 届毕业班带班经验'],
    campuses: ['长沙校区','岳麓校区'], courses: ['数学一对一','中考数学冲刺'],
  },
  {
    name: '陈老师', subjects: ['英语'], subject: '英语', grades: ['小学','初一','初二'], grade: '小学至初二',
    years: 9, school: '广东外语外贸大学 · 英语教育',
    intro: '主攻小学到初二的阅读与语法衔接，用原版分级读物做输入，把背单词换成读故事。课上要求学生整句输出，逐步过渡到能独立复述段落。',
    honors: ['省级英语教学技能赛二等奖', '原版阅读课程主设计'],
    campuses: ['长沙校区'], courses: ['英语一对一','英语阅读专项'],
  },
  {
    name: '周老师', subjects: ['数学'], subject: '数学', grades: ['初二','初三'], grade: '初二、初三',
    years: 7, school: '中南大学 · 统计学',
    intro: '专攻初二、初三的拔高与压轴题，把几何辅助线讲成一套可迁移的思考顺序。每次课后会留一道同源变式题，用来确认方法真的被掌握。',
    honors: ['希望杯优秀教练员', '压轴题专题课主讲'],
    campuses: ['长沙校区','星沙校区'], courses: ['数学一对一','中考数学冲刺'],
  },
]

const initialOrders = [
  { id: 'o1', status: '收费中', name: '李小雨', time: '周五 16:00-17:00 · 共4次', price: '¥2000' },
  { id: 'o2', status: '可收费', name: '王小明', time: '周三 17:00-18:00 · 共4次', price: '¥2000' },
  { id: 'o3', status: '等待中', name: '张小雨', time: '周三 17:00-18:00 · 共4次', price: '¥2000' },
  { id: 'o4', status: '已生效', name: '陈小宇', time: '周六 10:00-11:00 · 共4次', price: '¥2000' },
  { id: 'o5', status: '已过期', name: '刘晨', time: '周日 14:00-15:00 · 共4次', price: '¥2000' },
  { id: 'o6', status: '已取消', name: '赵一', time: '周二 18:00-19:00 · 共4次', price: '¥2000' },
]

const appEntries = [
  [BadgeDollarSign, '报名收费'], [UsersRound, '班级管理'], [CalendarDays, '我的课表'],
  [CheckCircle2, '上课点名'], [MessageSquareText, '上课点评'], [Sparkles, 'AI点评'],
  [Library, '素材管理'], [Users, '学员管理'], [UserRoundSearch, '意向学员'],
  [CalendarPlus, '名师意向单', true], [ClipboardCheck, '我的审批'], [ReceiptText, '订单管理'],
]

const tagColor = status => ({
  可收费: 'success', 收费中: 'warning', 等待中: 'warning', 已生效: 'primary', 已过期: 'default', 已取消: 'danger'
}[status])

const statusClass = status => ({
  可收费: 'available', 收费中: 'charging', 等待中: 'waiting', 已生效: 'active', 已过期: 'ended', 已取消: 'cancelled'
}[status])

const weekdayBase = ['周一','周二','周三','周四','周五','周六','周日']
const buildLessons = time => {
  const match = /(周[一二三四五六日])\s*(\d{2}:\d{2})-(\d{2}:\d{2})/.exec(time || '')
  if (!match) return []
  const count = Number((/共(\d+)次/.exec(time) || [])[1] || 4)
  const first = new Date(2026, 8, 21 + weekdayBase.indexOf(match[1]))
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(first)
    day.setDate(first.getDate() + i * 7)
    return `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')} ${match[1]} ${match[2]}-${match[3]}`
  })
}
const slotState = (status, index) => {
  if (status === '收费中') return { text: '已锁定', cls: 'locked' }
  if (status === '可收费') return { text: '空闲', cls: 'free' }
  const [text, cls] = [['空闲','free'],['排课占用','busy'],['日程占用','agenda'],['收费中','charging']][index % 4]
  return { text, cls }
}
const orderLessons = order => buildLessons(order.time).map((label, i) => ({ key: label, label, slot: slotState(order.status, i) }))
const visibleLessons = order => orderLessons(order).filter(lesson => !(order.removed || []).includes(lesson.key))
const orderStatus = order => {
  if (order.status !== '等待中') return order.status
  const lessons = visibleLessons(order)
  return lessons.length && lessons.every(lesson => lesson.slot.cls === 'free') ? '可收费' : order.status
}
const orderTimeText = order => {
  if (!(order.removed || []).length) return order.time
  const base = (/(周[一二三四五六日]\s*\d{2}:\d{2}-\d{2}:\d{2})/.exec(order.time) || [''])[0]
  return `${base} · 共${visibleLessons(order).length}次`
}
function Header({ title, onBack, right }) {
  return <NavBar onBack={onBack} right={right} backArrow={<ChevronLeft size={22} />}>{title}</NavBar>
}

function TeacherSheet({ teacher, onClose, onView }) {
  return <Popup className="teacher-sheet" visible={!!teacher} onMaskClick={onClose} bodyStyle={{ background:'transparent' }}>
    {teacher&&<div className="sheet-shell">
      <div className="sheet-head">
        <div className="sheet-avatar">{teacher.name[0]}</div>
        <div className="sheet-id">
          <div className="sheet-name">{teacher.name}</div>
          <div className="sheet-meta">{teacher.subject} · {teacher.grade} · {teacher.years} 年教龄</div>
          <div className="sheet-school">{teacher.school}</div>
        </div>
      </div>
      <div className="sheet-body">
        <p className="sheet-intro">{teacher.intro}</p>
        <p className="sheet-note">荣誉 · {teacher.honors.join(' · ')}</p>
        <p className="sheet-note">可约 · {teacher.campuses.join('、')} · {teacher.courses.join('、')}</p>
      </div>
      <div className="sheet-foot"><Button block color="primary" onClick={onView}>查看可约时间</Button></div>
    </div>}
  </Popup>
}

function Home({ go }) {
  return <div className="page">
    <div className="home-head"><h1>刘亦菲 - 黎璐教育集团</h1><p>demo.xiaogj.com</p></div>
    <Card className="section-card"><div className="section-title">待办事项</div><div className="todo-grid">
      {[['1','待跟进'],['0','待点名'],['0','待点评'],['19','待审批']].map(x => <div className="todo" key={x[1]}><b>{x[0]}</b><span>{x[1]}</span></div>)}
    </div></Card>
    <Card className="section-card"><div className="section-title">常用功能</div><div className="app-grid">
      {appEntries.map(([Icon,label,active]) => <button className={`app-entry ${active ? 'highlight' : ''}`} key={label} onClick={() => active && go('orders')}>
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
    <Header title="选择老师" onBack={() => go('board')} />
    <div className="intro"><Info size={16} />提前预约老师时段并生成意向单，时段被占用时可排队等待；点击「去收费」锁定预约时段，收费完成后按预约时间自动生成排课。</div>
    <div className="search-panel"><SearchBar className="toolbar-search" placeholder="搜索任课老师" value={query} onChange={setQuery} /><Button className="filter-button" onClick={openFilters}>筛选 <ChevronDown size={14} /></Button></div>
    {!!visible.length && <section className="teacher-results"><div className="teacher-results-head"><b>选择老师</b><span>共 {visible.length} 位</span></div><List className="teacher-list">
      {visible.map(t => <List.Item
        key={t.name}
        clickable
        arrow={false}
        onClick={() => go('board', t)}
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
  </div>
}

function Board({ go, teacher }) {
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })
  const [selected, setSelected] = useState(null)
  const [monthPickerVisible, setMonthPickerVisible] = useState(false)
  const [sheet, setSheet] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const touchStart = useRef(null)
  const suppressClick = useRef(false)
  const currentTeacher = teacher && teacher.name ? teacher : null
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
    <Header title="老师可约时间" onBack={() => go('orders')} />
    <Card className="profile-card"><div className="teacher-row"><button type="button" className="profile-switch" onClick={() => setPickerOpen(true)}>{currentTeacher?<><div className="avatar">{currentTeacher.name[0]}</div><div className="profile-main"><div className="teacher-name">{currentTeacher.name}<ChevronDown size={14} /></div><div className="teacher-meta">{currentTeacher.subject} · {currentTeacher.grade}</div></div></>:<><div className="avatar avatar-empty"><UserRoundSearch size={19} /></div><div className="profile-main"><div className="teacher-name">请选择老师<ChevronDown size={14} /></div><div className="teacher-meta">选择后可查看该老师的可约时间</div></div></>}</button>{currentTeacher?.intro&&<Button className="profile-intro-button" fill="none" size="small" onClick={() => setSheet(currentTeacher)}>名师介绍 <ChevronRight size={13} /></Button>}</div></Card>
    <TeacherSheet teacher={sheet} onClose={() => setSheet(null)} onView={() => setSheet(null)} />
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
      {currentTeacher?<><div className="legend"><span><i className="dot" style={{background:'#69a7ff'}} />已排课</span><span><i className="dot" style={{background:'#a77bea'}} />日程</span><span><i className="dot" style={{background:'#ff9c6e'}} />收费中</span><span><i className="dot" style={{background:'#ffc53d'}} />有人等待</span></div>
      <div className="schedule-grid">{Array.from({length:10},(_,row)=><React.Fragment key={row}><div className="time-label">{8+row}:00</div>{[0,1,2].map(day=>{const date=dateKey(dates[day]);const ev=events[`${date}-${8+row}`];const isSelected=selected?.date===date&&selected?.row===row;return <div className={`slot ${isSelected?'selected':''}`} key={date} onClick={() => choose(row,day)}>{isSelected?<button type="button" className="slot-add" onClick={event=>{event.stopPropagation();go('booking')}}>新增意向</button>:ev&&<div className={`event ${ev[0]}`}><b>{ev[1]}</b><br />{ev[2]}</div>}</div>})}</React.Fragment>)}</div></>
      :<div className="schedule-empty"><UserRoundSearch size={26} /><p>先选择老师，再挑选可约时段</p><Button size="small" color="primary" onClick={()=>setPickerOpen(true)}>选择老师</Button></div>}
    </div>
    <Popup className="teacher-picker" visible={pickerOpen} onMaskClick={() => setPickerOpen(false)} bodyStyle={{ borderRadius:'12px 12px 0 0', padding:16 }}>
      <h3>选择老师</h3>
      <SearchBar placeholder="搜索任课老师" value={pickerQuery} onChange={setPickerQuery} />
      <div className="picker-list">{teachers.filter(t => !pickerQuery || t.name.includes(pickerQuery)).map(t => <button type="button" className={`picker-item ${t.name===currentTeacher?.name?'active':''}`} key={t.name} onClick={() => { setPickerOpen(false); setSelected(null); go('board', t) }}><span className="avatar">{t.name[0]}</span><span className="picker-main"><b>{t.name}</b><em>{t.subject} · {t.grade}</em></span>{t.name===currentTeacher?.name&&<Check size={16} />}</button>)}</div>
      <Button block fill="none" onClick={() => { setPickerOpen(false); go('teachers') }}>查看全部老师</Button>
    </Popup>
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
  const [excludedLessonKeys,setExcludedLessonKeys]=useState(() => new Set())
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
  const selectedLessons = lessons.filter(lesson => !excludedLessonKeys.has(lesson.key))
  const selectedHours = Math.round(selectedLessons.reduce((sum, lesson) => sum + lesson.duration / 60, 0) * 100) / 100
  const updateRules = next => setRules(next)
  const updateRule = (id, patch) => updateRules(rules.map(rule => rule.id === id ? { ...rule, ...patch } : rule))
  const addRule = () => updateRules([...rules, { id: Date.now(), days: [5], start: '17:00', end: '18:00' }])
  const submit = type => {
    if(!student) return Toast.show('请先选择学员')
    if(!room) return Toast.show('请先选择上课教室')
    if(rules.some(rule => !rule.days.length || rule.start >= rule.end)) return Toast.show('请检查上课星期和时间范围')
    if(!selectedLessons.length) return Toast.show('至少选择一个预约课次')
    if(selectedHours > qty) return Toast.show('预约数量不能超过购买数量，请调整购买数量或预约课次')
    createOrder(type, { time: `${selectedLessons[0].label} · 共${selectedLessons.length}次`, price: `¥${qty*500}` }); Toast.show(type==='收费中'?'已锁定时段，进入收费中':'意向单创建成功'); go('orders')
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
    <section className="booking-section time-section"><div className="section-heading"><div><div className="form-title">上课时间</div><p>按星期和时间生成预约课次</p></div><button type="button" className="add-rule" onClick={addRule}><Plus size={16} /><span>添加</span></button></div>
      <div className="rule-list">{rules.map(rule=><div className="schedule-rule" key={rule.id}>
        <button type="button" className="weekday-value" onClick={()=>setWeekdayRuleId(rule.id)}><span className="weekday-label">{rule.days.length ? rule.days.map(day=>weekdayNames[day]).join('、') : '请选择星期'}</span><ChevronDown size={14} /></button>
        <label className="time-field"><span className="time-value">{rule.start}</span><input aria-label="开始时间" type="time" value={rule.start} onChange={event=>updateRule(rule.id,{start:event.target.value})} /><Clock3 size={15} aria-hidden="true" /></label>
        <span className="time-separator">至</span>
        <label className="time-field"><span className="time-value">{rule.end}</span><input aria-label="结束时间" type="time" value={rule.end} onChange={event=>updateRule(rule.id,{end:event.target.value})} /><Clock3 size={15} aria-hidden="true" /></label>
        {rules.length > 1 && <Button className="remove-rule" fill="none" aria-label="删除上课时间" onClick={()=>updateRules(rules.filter(item=>item.id!==rule.id))}><X size={16} /></Button>}
      </div>)}</div>
    </section>
    <section className="booking-section lessons-section"><button className="lessons-toggle" onClick={()=>setLessonsExpanded(value=>!value)}><span className="lesson-title-wrap"><span className="form-title">预约课次</span><span className="lesson-selection-meta">已选 {selectedLessons.length}/{lessons.length}次 · {selectedHours}小时</span></span><span className="lessons-action"><span>{lessonsExpanded?'收起':'选择课次'}</span><ChevronDown className={lessonsExpanded?'expanded':''} size={17} /></span></button>
      {lessonsExpanded && <div className="generated-lessons">{lessons.map((lesson,i)=><label className="lesson-row" key={lesson.key}><input className="lesson-check" type="checkbox" checked={!excludedLessonKeys.has(lesson.key)} onChange={event=>setExcludedLessonKeys(current=>{const next=new Set(current);if(event.target.checked)next.delete(lesson.key);else next.add(lesson.key);return next})} /><span className="lesson-checkmark"><Check size={14} /></span><span className="lesson-label">{lesson.label}</span><Tag color={i===2?'warning':'success'}>{i===2?'有人等待':'可预约'}</Tag></label>)}</div>}
      <div className="summary"><span>购买数量 {qty}小时 · 已预约 {selectedHours}小时</span><strong>¥{qty*500}</strong></div></section>
    <div className="bottom-action"><Button onClick={()=>submit('等待中')}>排队等待</Button><Button color="primary" onClick={()=>submit('收费中')}>去收费</Button></div>
    <Popup visible={!!popup} onMaskClick={()=>setPopup('')} bodyStyle={{borderRadius:'12px 12px 0 0'}}><div style={{padding:16}}><h3>{popup==='student'?'选择学员':'选择上课教室'}</h3><List>{options.map(x=><List.Item key={x} clickable onClick={()=>{popup==='student'?setStudent(x):setRoom(x);setPopup('')}}>{x}</List.Item>)}</List></div></Popup>
    <DatePicker title={datePicker==='start'?'选择开始日期':'选择结束日期'} precision="day" value={datePicker==='start'?startDate:endDate} min={datePicker==='end'?startDate:undefined} visible={!!datePicker} onClose={()=>setDatePicker('')} onConfirm={value=>{if(datePicker==='start'){setStartDate(value);if(value>endDate)setEndDate(value)}else setEndDate(value);setDatePicker('')}} />
    <Popup visible={weekdayRuleId!==null} onMaskClick={()=>setWeekdayRuleId(null)} bodyStyle={{borderRadius:'12px 12px 0 0',padding:16}}><h3>选择上课星期</h3><Selector multiple columns={4} options={weekdayOptions} value={weekdayRuleId===null?[]:rules.find(rule=>rule.id===weekdayRuleId)?.days.map(String)} onChange={value=>weekdayRuleId!==null&&updateRule(weekdayRuleId,{days:value.map(Number)})} /><Button block color="primary" onClick={()=>setWeekdayRuleId(null)} style={{marginTop:16}}>完成</Button></Popup>
  </div>
}

function Orders({ go, orders, onAdd }) {
  const [tab,setTab]=useState('全部'); const [query,setQuery]=useState(''); const [teacherOpen,setTeacherOpen]=useState(false)
  const groups = {'全部':orders,'进行中':orders.filter(o=>['收费中','可收费','等待中'].includes(orderStatus(o))),'已生效':orders.filter(o=>orderStatus(o)==='已生效'),'已结束':orders.filter(o=>['已过期','已取消'].includes(orderStatus(o)))}
  const list=groups[tab].filter(o=>!query||o.name.includes(query))
  return <div className="page orders-page"><Header title="名师意向单" onBack={()=>go('home')} right={<button type="button" className="nav-add" onClick={onAdd}>新增预约意向 <Plus size={15} /></button>} />
    <Tabs className="orders-tabs" activeKey={tab} onChange={setTab}>{Object.entries(groups).map(([k,v])=><Tabs.Tab title={`${k} ${v.length}`} key={k} />)}</Tabs>
    <div className="orders-tools"><SearchBar className="toolbar-search" placeholder="搜索学员姓名" value={query} onChange={setQuery} /><Button className="orders-filter-button" onClick={()=>setTeacherOpen(true)}>任课老师 <ChevronDown size={14} /></Button></div>
    <div className="orders-list">{list.map((o,i)=>{const st=orderStatus(o); return <Card className="order-card" key={`${o.name}-${i}`} onClick={()=>go('detail',o.id)}><div className="order-head"><b>{o.name}</b><span className={`order-status order-status-${statusClass(st)}`}><Tag color={tagColor(st)}>{st}</Tag></span></div><div className="order-course">数学一对一 · 郭老师 · 长沙校区</div><div className="order-time">{orderTimeText(o)} · 购买20小时</div>{st==='收费中'&&<div className="order-alert"><span>请在倒计时内完成收费</span><b>14:24</b></div>}<div className="order-footer"><div className="order-price">{o.price}</div><div className="order-actions">{['收费中','可收费','等待中'].includes(st)&&<Button className="order-cancel" fill="none" size="small" onClick={e=>{e.stopPropagation();Dialog.confirm({content:'取消后将释放预约时段，是否继续？'})}}>取消</Button>}{st==='可收费'&&<Button className="order-primary" color="primary" size="small">去收费</Button>}{st==='收费中'&&<Button className="order-primary" color="primary" size="small">继续收费</Button>}{['已生效','已过期','已取消'].includes(st)&&<Button className="order-detail" fill="none" size="small">查看详情</Button>}</div></div></Card>})}{!list.length&&<div className="empty">暂无符合条件的意向单</div>}</div>
    <Popup visible={teacherOpen} onMaskClick={()=>setTeacherOpen(false)} bodyStyle={{borderRadius:'12px 12px 0 0',padding:16}}><h3>任课老师</h3><List>{['全部老师','郭老师','陈老师','周老师'].map(x=><List.Item key={x} clickable onClick={()=>setTeacherOpen(false)}>{x}</List.Item>)}</List></Popup>
  </div>
}

function Detail({ go, order, onRemoveLesson }) {
  const o=order||initialOrders[0]
  const [left,setLeft]=useState(14*60+24)
  const status = orderStatus(o)
  useEffect(()=>{ if(status!=='收费中')return; const timer=setInterval(()=>setLeft(v=>v>0?v-1:0),1000); return()=>clearInterval(timer) },[status])
  const lessons = visibleLessons(o)
  const live = ['可收费','等待中','收费中'].includes(status)
  const countdown = `${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`
  const cancel = () => Dialog.confirm({ content:'取消后将释放该意向单占用的老师时段，是否继续？' })
  const charge = () => status==='可收费'&&Toast.show('二次校验通过，已进入收费中')
  const remove = key => Dialog.confirm({ content:'删除后该预约课次将从本意向单移除，是否继续？' }).then(ok => ok && onRemoveLesson(o.id, key))
  return <div className="page"><Header title="意向单详情" onBack={()=>go('orders')} />
    {status==='收费中'&&<div className="detail-alert">请及时操作收费！请前往 <b>校管家系统 → 收费管理</b> 完成收费流程，倒计时结束后时段将自动释放。</div>}
    {status==='收费中'&&<div className="detail-countdown"><span>收费剩余时间</span><b>{countdown}</b></div>}
    {status==='已生效'&&<div className="detail-alert effective">收费成功，自动排课处理已完成</div>}
    {status==='已过期'&&<div className="detail-alert expired">因最早预约课次的上课开始时间已到，该意向单已自动过期。</div>}
    <div className="detail-stack">
    <Card className="detail-card"><div className="order-head"><b>基本信息</b><span className={`order-status order-status-${statusClass(status)}`}><Tag color={tagColor(status)}>{status}</Tag></span></div><div className="detail-grid"><div><span>意向单号</span><b>YXD260920000001</b></div><div><span>学员</span><b>{o.name}</b></div><div><span>手机号</span><b>138****8821</b></div><div><span>创建时间</span><b>2026-09-20 09:15</b></div></div></Card>
    <Card className="detail-card"><b>购买信息</b><div className="detail-grid"><div><span>课程</span><b>数学一对一</b></div><div><span>课程单价</span><b>¥500/小时</b></div><div><span>购买数量</span><b>20小时</b></div><div><span>应收金额</span><b style={{color:'#ff3141'}}>¥10,000</b></div></div></Card>
    <Card className="detail-card"><b>预约信息</b><div className="detail-grid"><div><span>任课老师</span><b>郭老师</b></div><div><span>上课校区</span><b>长沙校区</b></div><div><span>上课教室</span><b>301教室</b></div><div><span>预约课次</span><b>{lessons.length}次</b></div><div><span>预约数量</span><b>{lessons.length}小时</b></div></div>
      <div className="detail-lessons">{lessons.map(lesson=><div className="detail-lesson-row" key={lesson.key}><span>{lesson.label}</span><span className="detail-lesson-right">{live&&<em className={`detail-lesson-slot slot-${lesson.slot.cls}`}>{lesson.slot.text}</em>}{status==='等待中'&&lessons.length>1&&<button type="button" className="lesson-remove" aria-label="删除该课次" onClick={()=>remove(lesson.key)}><Trash2 size={15} /></button>}</span></div>)}</div>
      {status==='等待中'&&<p className="detail-tip">删除被占用的课次后，全部课次空闲即可去收费。</p>}</Card>
    {status==='已生效'&&<Card className="detail-card"><b>自动排课结果</b><div className="detail-summary"><span className="slot-ok">自动排课成功 {lessons.length-1}节</span><span className="slot-fail">失败 1节</span></div>
      <div className="detail-lessons">{lessons.map((lesson,i)=><div className="detail-lesson-row" key={lesson.key}><span>{lesson.label}</span><em className={`detail-lesson-slot slot-${i===1?'fail':'ok'}`}>{i===1?'自动排课失败 · 老师排课冲突':'自动排课成功'}</em></div>)}</div></Card>}
    </div>
    {live&&<div className="bottom-action"><Button onClick={cancel}>取消意向单</Button>{status==='可收费'&&<Button color="primary" onClick={charge}>去收费</Button>}</div>}
  </div>
}

function App(){
  const [page,setPage]=useState('home'); const [orders,setOrders]=useState(initialOrders); const [current,setCurrent]=useState(null)
  const go=(next,data)=>{setCurrent(data||current);setPage(next);window.scrollTo(0,0)}
  const createOrder=(status,booking={})=>setOrders(v=>[{id:`o${Date.now()}`,status,name:'王小明',time:booking.time||'周三 17:00-18:00 · 共4次',price:booking.price||'¥10000'},...v])
  const removeLesson=(id,key)=>setOrders(v=>v.map(o=>o.id===id?{...o,removed:[...(o.removed||[]),key]}:o))
  const startBooking=()=>{setCurrent(null);setPage('board');window.scrollTo(0,0)}
  return <main className="app">{page==='home'&&<Home go={go}/>} {page==='teachers'&&<Teachers go={go}/>} {page==='board'&&<Board go={go} teacher={current}/>} {page==='booking'&&<Booking go={go} createOrder={createOrder}/>} {page==='orders'&&<Orders go={go} orders={orders} onAdd={startBooking}/>} {page==='detail'&&<Detail go={go} order={orders.find(o=>o.id===current)} onRemoveLesson={removeLesson}/>}</main>
}

createRoot(document.getElementById('root')).render(<App />)
