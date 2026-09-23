import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Button, Card, Checkbox, Dialog, List, NavBar, Popup, SearchBar,
  Selector, Space, Stepper, TabBar, Tabs, Tag, Toast
} from 'antd-mobile'
import {
  BadgeDollarSign, CalendarDays, CalendarPlus, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, ClipboardList,
  Info, Library, ListChecks, MessageSquareText, ReceiptText, Search,
  Sparkles, UserRoundSearch, Users, UsersRound
} from 'lucide-react'
import 'antd-mobile/es/global'
import './styles.css'

const teachers = [
  { name: '郭老师', subject: '数学、物理', grade: '初一至初三', nextDay: '今天', nextTime: '17:00', slots: 3, status: '可约' },
  { name: '陈老师', subject: '英语', grade: '小学至初二', nextDay: '明天', nextTime: '16:30', slots: 2, status: '可约' },
  { name: '周老师', subject: '数学', grade: '初二、初三', nextDay: '周六', nextTime: '10:00', slots: 1, status: '紧张' },
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
  const [subject, setSubject] = useState([])
  const visible = teachers.filter(t => (!query || t.name.includes(query)) && (!subject.length || t.subject.includes(subject[0])))
  return <div className="page">
    <Header title="名师约课" onBack={() => go('home')} />
    <div className="intro"><Info size={16} />提前预约老师时段；遇到占用可进入等待，收费时才锁定老师时段。</div>
    <div className="search-panel"><SearchBar className="toolbar-search" placeholder="搜索任课老师" value={query} onChange={setQuery} /><Button className="filter-button" onClick={() => setFilterOpen(true)}>筛选 <ChevronDown size={14} /></Button></div>
    {!!visible.length && <section className="teacher-results"><div className="teacher-results-head"><b>可约老师</b><span>共 {visible.length} 位</span></div><List className="teacher-list">
      {visible.map(t => <List.Item
        key={t.name}
        clickable
        prefix={<div className="avatar">{t.name[0]}</div>}
        extra={<div className="teacher-available"><span><CalendarDays size={12} />{t.nextDay}</span><b>{t.nextTime}</b><i>{t.slots} 个时段</i></div>}
        description={<div className="teacher-description"><span>{t.subject}</span><span>{t.grade}</span></div>}
        onClick={() => t.name === '郭老师' ? go('board') : Toast.show(`演示：进入${t.name}可约时间`)}
      ><span className="teacher-title">{t.name}<Tag color={t.status==='可约'?'success':'warning'}>{t.status}</Tag></span></List.Item>)}
    </List></section>}
    {!visible.length && <div className="empty">暂无符合条件的老师</div>}
    <Popup visible={filterOpen} onMaskClick={() => setFilterOpen(false)} bodyStyle={{ borderRadius: '12px 12px 0 0', padding: 16 }}>
      <h3>授课科目</h3><Selector columns={3} options={['数学','英语','物理'].map(v => ({ label:v,value:v }))} value={subject} onChange={setSubject} />
      <Button block color="primary" style={{ marginTop: 18 }} onClick={() => setFilterOpen(false)}>完成</Button>
    </Popup>
    <BottomTabs page="teachers" go={go} />
  </div>
}

function Board({ go }) {
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState(null)
  const dates = useMemo(() => Array.from({length:3},(_,i) => { const d = new Date(2026,8,14+offset+i); return d }), [offset])
  const dayName = ['周日','周一','周二','周三','周四','周五','周六']
  const dateRange = `${dates[0].getFullYear()}.${String(dates[0].getMonth()+1).padStart(2,'0')}.${String(dates[0].getDate()).padStart(2,'0')} - ${String(dates[2].getMonth()+1).padStart(2,'0')}.${String(dates[2].getDate()).padStart(2,'0')}`
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const events = { '2026-09-14-9':['agenda','日程','磨课'], '2026-09-16-10':['course','已排课','数学一对一'], '2026-09-15-12':['paying','收费中','14:24 · 2人等待'], '2026-09-14-14':['waiting','3人等待',''] }
  const choose = (row, day) => {
    const date = dateKey(dates[day])
    const event = events[`${date}-${8+row}`]
    if (event?.[0] === 'paying') return Toast.show('该时段正在收费锁定中，暂不可预约')
    if (event?.[0] === 'course' || event?.[0] === 'agenda') return Dialog.confirm({ content: `当前时段已有${event[1]}，预约后将进入等待。是否继续？`, confirmText:'继续预约' }).then(ok => ok && setSelected({row,day,date}))
    setSelected({row,day,date})
  }
  return <div className="page">
    <Header title="老师可约时间" onBack={() => go('teachers')} />
    <Card className="profile-card"><div className="teacher-row"><div className="avatar">郭</div><div className="profile-main"><div className="teacher-name">郭老师</div><div className="teacher-meta">数学、物理 · 初一至初三 · 10年教学经验</div></div></div></Card>
    <div className="schedule">
      <div className="date-nav"><Button aria-label="前3天" fill="none" onClick={() => { setOffset(v=>v-3); setSelected(null) }}><ChevronLeft /></Button><div className="date-label"><span>可约日期</span><b>{dateRange}</b></div><Button aria-label="后3天" fill="none" onClick={() => { setOffset(v=>v+3); setSelected(null) }}><ChevronRight /></Button></div>
      <div className="schedule-head"><span />{dates.map(d=><span className={selected?.date===dateKey(d)?'day-focus':''} key={dateKey(d)}>{dayName[d.getDay()]}<b>{String(d.getMonth()+1).padStart(2,'0')}.{String(d.getDate()).padStart(2,'0')}</b></span>)}</div>
      <div className="legend"><span><i className="dot" style={{background:'#69a7ff'}} />已排课</span><span><i className="dot" style={{background:'#a77bea'}} />日程</span><span><i className="dot" style={{background:'#ff9c6e'}} />收费中</span><span><i className="dot" style={{background:'#ffc53d'}} />有人等待</span></div>
      <div className="schedule-grid">{Array.from({length:10},(_,row)=><React.Fragment key={row}><div className="time-label">{8+row}:00</div>{[0,1,2].map(day=>{const date=dateKey(dates[day]);const ev=events[`${date}-${8+row}`];const isSelected=selected?.date===date&&selected?.row===row;return <div className={`slot ${isSelected?'selected':''}`} key={date} onClick={() => choose(row,day)}>{ev&&<div className={`event ${ev[0]}`}><b>{ev[1]}</b><br />{ev[2]}</div>}{isSelected&&!ev&&<div className="slot-selected">已选择<br />{8+row}:00-{9+row}:00</div>}</div>})}</React.Fragment>)}</div>
    </div>
    <div className="bottom-action"><Button block color="primary" disabled={!selected} onClick={()=>go('booking')}>{selected?'预约所选时段（1）':'选择可约时段'}</Button></div>
  </div>
}

function Booking({ go, createOrder }) {
  const [student,setStudent]=useState('')
  const [room,setRoom]=useState('')
  const [qty,setQty]=useState(20)
  const [checked,setChecked]=useState(['1','2','3','4'])
  const [popup,setPopup]=useState('')
  const options = popup==='student'?['王小明','李佳怡']:['301教室','302教室','VIP一对一教室']
  const submit = type => {
    if(!student) return Toast.show('请先选择学员')
    if(!room) return Toast.show('请先选择上课教室')
    if(!checked.length) return Toast.show('至少选择一个预约课次')
    createOrder(type); Toast.show(type==='收费中'?'已锁定时段，进入收费中':'意向单创建成功'); go('orders')
  }
  return <div className="page">
    <Header title="选课下单" onBack={()=>go('board')} />
    <Card className="form-card"><div className="form-title">预约信息</div><List>
      <List.Item extra={<span className={!student?'placeholder':''}>{student||'请选择'}</span>} clickable onClick={()=>setPopup('student')}>学员</List.Item>
      <List.Item extra={<span className="field-value">郭老师</span>}>任课老师</List.Item><List.Item extra={<span className="field-value">长沙校区</span>}>上课校区</List.Item>
      <List.Item extra={<span className={!room?'placeholder':''}>{room||'请选择'}</span>} clickable onClick={()=>setPopup('room')}>上课教室</List.Item>
      <List.Item extra={<span className="field-value course-value">数学一对一 · ¥500/小时</span>}>课程</List.Item>
      <List.Item extra={<Stepper min={1} value={qty} onChange={setQty} />}>购买数量</List.Item>
    </List></Card>
    <Card className="form-card"><div className="form-title">预约课次</div><Checkbox.Group value={checked} onChange={setChecked}>
      {['07-15 周三 17:00-18:00','07-22 周三 17:00-18:00','07-29 周三 17:00-18:00','07-31 周五 17:00-18:00'].map((x,i)=><div className="lesson-row" key={x}><Checkbox value={String(i+1)} /><span>{x}</span><Tag color={i===2?'warning':'success'}>{i===2?'有人等待':'可收费'}</Tag></div>)}
    </Checkbox.Group><div className="summary"><span>预约 {checked.length}次 · 购买 {qty}小时</span><strong>¥{qty*500}</strong></div></Card>
    <div className="bottom-action"><Button onClick={()=>submit('等待中')}>排队等待</Button><Button color="primary" onClick={()=>submit('收费中')}>去收费</Button></div>
    <Popup visible={!!popup} onMaskClick={()=>setPopup('')} bodyStyle={{borderRadius:'12px 12px 0 0'}}><div style={{padding:16}}><h3>{popup==='student'?'选择学员':'选择上课教室'}</h3><List>{options.map(x=><List.Item key={x} clickable onClick={()=>{popup==='student'?setStudent(x):setRoom(x);setPopup('')}}>{x}</List.Item>)}</List></div></Popup>
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
  const createOrder=status=>setOrders(v=>[{status,name:'王小明',time:'周三 17:00-18:00 · 共4次',price:'¥10000'},...v])
  return <main className="app">{page==='home'&&<Home go={go}/>} {page==='teachers'&&<Teachers go={go}/>} {page==='board'&&<Board go={go}/>} {page==='booking'&&<Booking go={go} createOrder={createOrder}/>} {page==='orders'&&<Orders go={go} orders={orders}/>} {page==='detail'&&<Detail go={go} order={current}/>}</main>
}

createRoot(document.getElementById('root')).render(<App />)
