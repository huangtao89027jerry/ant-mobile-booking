/* Vant 4.9.21 + Vue 3.5.13. Mobile view shares the prototype's points data and submission flow. */
(() => {
  if (!window.Vue || !window.vant) {
    const note = document.createElement('p');
    note.className = 'vp-load-error';
    note.textContent = 'Vant 组件加载失败，请联网刷新。下方暂时显示原移动端预览。';
    document.getElementById('pointsVantRoot').append(note);
    return;
  }
  const { ref, reactive, computed, onMounted, onBeforeUnmount } = Vue;
  const bridge = window.pointsMobileBridge;
  const app = Vue.createApp({
    setup() {
      const data = ref(bridge.snapshot());
      const studentView = new URLSearchParams(window.location.search).get('view') !== 'batch';
      const studentId = new URLSearchParams(window.location.search).get('student');
      const currentStudent = computed(() => data.value.students.find(student => student.id === studentId) || data.value.students[0]);
      const recordPeriod = ref('all');
      const recordDirection = ref(0);
      const periodOptions = [{ text: '全部时间', value: 'all' }, { text: '今天', value: 'today' }, { text: '近 7 天', value: 'week' }];
      const directionOptions = [{ text: '全部类型', value: 0 }, { text: '加分记录', value: 1 }, { text: '减分记录', value: -1 }];
      const historyRecords = [
        { ruleName: '学员交费加分', dir: 1, value: 10, reason: '单次交费10元，加10分。', time: '2026-10-20 16:55:05' },
        { ruleName: '学员交费加分', dir: 1, value: 10, reason: '单次交费10元，加10分。', time: '2026-10-20 16:13:39' },
        { ruleName: '学员课消数量加分', dir: 1, value: 3, reason: '完成课程学习，加3分。', time: '2026-10-19 18:08:02' }
      ];
      const studentRecords = computed(() => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (recordPeriod.value === 'week' ? 6 : 0));
        return [...data.value.records.filter(record => record.studentId === currentStudent.value.id).reverse(), ...historyRecords].filter(record => {
          const parts = record.time.match(/\d+/g).map(Number);
          const date = parts.length >= 5 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(today.getFullYear(), parts[0] - 1, parts[1]);
          return (!recordDirection.value || record.dir === recordDirection.value) && (recordPeriod.value === 'all' || date >= start);
        });
      });
      const selected = ref([...data.value.selected]);
      const query = ref('');
      const classId = ref('all');
      const selectedOnly = ref(false);
      const showEditor = ref(false);
      const showRecords = ref(false);
      const direction = ref(1);
      const targets = ref([]);
      const single = ref(false);
      const ruleIds = ref([]);
      const showRulePicker = ref(false);
      const draftRuleIds = ref([]);
      const ruleQuery = ref('');
      const creatingRule = ref(false);
      const newRuleName = ref('');
      const newRuleType = ref('fixed');
      const newRuleValue = ref('');
      const newRuleReason = ref('');
      const newRuleError = ref('');
      const scores = reactive({});
      const touchedScores = reactive({});
      const reasons = reactive({});
      const balanceAnimations = reactive({});
      let balanceFrame = 0;
      let balanceHighlightTimer = 0;
      let pendingBalanceAnimation = false;
      const busy = ref(false);
      const verifying = ref(false);
      const error = ref('');
      const host = ref(null);
      const mounted = ref(false);
      const directionText = computed(() => direction.value > 0 ? '加分' : '减分');
      const available = computed(() => data.value.rules.filter(rule => rule.dir === direction.value));
      const libraryRules = computed(() => available.value.filter(rule => rule.name.includes(ruleQuery.value.trim())));
      const chosenRules = computed(() => available.value.filter(rule => ruleIds.value.includes(rule.id)));
      const chosenStudents = computed(() => data.value.students.filter(student => targets.value.includes(student.id)));
      const visible = computed(() => data.value.students.filter(student => {
        const group = data.value.classes.find(item => item.id === student.classId);
        return (classId.value === 'all' || student.classId === classId.value)
          && `${student.name} ${group?.name || ''}`.includes(query.value.trim())
          && (!selectedOnly.value || selected.value.includes(student.id));
      }));
      const allVisible = computed(() => visible.value.length > 0 && visible.value.every(s => selected.value.includes(s.id)));
      const someVisible = computed(() => !allVisible.value && visible.value.some(s => selected.value.includes(s.id)));
      const invalid = rule => scores[rule.id] === '' || scores[rule.id] === undefined || !Number.isFinite(Number(scores[rule.id])) || Number(scores[rule.id]) < 0;
      const scoreError = rule => Boolean(touchedScores[rule.id] && invalid(rule));
      const incomplete = computed(() => chosenRules.value.some(invalid));
      const perPerson = computed(() => chosenRules.value.reduce((sum, rule) => sum + (invalid(rule) ? 0 : direction.value * Number(scores[rule.id])), 0));
      const canSubmit = computed(() => targets.value.length > 0 && chosenRules.value.length > 0 && !incomplete.value && !showRulePicker.value);
      const format = value => String(Number(Number(value).toFixed(8)));
      const delta = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${format(Math.abs(value))}`;
      const groupName = id => data.value.classes.find(group => group.id === id)?.name || '';
      const allowed = dir => data.value.permission === 'both' || (dir > 0 ? data.value.permission === 'plus' : data.value.permission === 'minus');
      function refresh() {
        data.value = bridge.snapshot();
        selected.value = [...data.value.selected];
        if (showEditor.value && !busy.value && !allowed(direction.value)) { showEditor.value = false; showRulePicker.value = false; }
      }
      function select(ids) { selected.value = [...ids]; bridge.select(ids); }
      function toggleStudent(id) { select(selected.value.includes(id) ? selected.value.filter(item => item !== id) : [...selected.value, id]); }
      function toggleAll() {
        const ids = new Set(selected.value);
        visible.value.forEach(student => allVisible.value ? ids.delete(student.id) : ids.add(student.id));
        select([...ids]);
      }
      function clearBalanceAnimation() {
        cancelAnimationFrame(balanceFrame);
        clearTimeout(balanceHighlightTimer);
        pendingBalanceAnimation = false;
        Object.keys(balanceAnimations).forEach(id => delete balanceAnimations[id]);
      }
      function prepareBalanceAnimation(previous) {
        clearBalanceAnimation();
        data.value.students.forEach(student => {
          const from = previous.get(student.id);
          const to = student.balance;
          if (from === undefined || from === to) return;
          const precision = Math.max(...[from, to].map(value => value.toFixed(8).replace(/0+$/, '').split('.')[1]?.length || 0));
          balanceAnimations[student.id] = { from, to, value: from, precision, direction: Math.sign(to - from) };
        });
        pendingBalanceAnimation = Object.keys(balanceAnimations).length > 0;
      }
      function animateBalances() {
        if (!pendingBalanceAnimation) return;
        pendingBalanceAnimation = false;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          clearBalanceAnimation();
          return;
        }
        const started = performance.now();
        const entries = Object.values(balanceAnimations);
        function tick(now) {
          const progress = Math.min(1, (now - started) / 700);
          const eased = 1 - (1 - progress) ** 3;
          entries.forEach(entry => {
            entry.value = progress === 1 ? entry.to : Number((entry.from + (entry.to - entry.from) * eased).toFixed(entry.precision));
          });
          if (progress < 1) balanceFrame = requestAnimationFrame(tick);
          else balanceHighlightTimer = setTimeout(clearBalanceAnimation, 1000);
        }
        balanceFrame = requestAnimationFrame(tick);
      }
      function open(dir, ids = selected.value, isSingle = false) {
        if (!ids.length || !allowed(dir)) return;
        clearBalanceAnimation();
        bridge.cancel();
        direction.value = dir;
        targets.value = [...ids];
        single.value = isSingle;
        ruleIds.value = [];
        Object.keys(touchedScores).forEach(id => delete touchedScores[id]);
        showRulePicker.value = false;
        available.value.forEach(rule => { scores[rule.id] = rule.value; reasons[rule.id] = rule.reason || ''; });
        error.value = '';
        showEditor.value = true;
      }
      function openStudent() {
        open(allowed(1) ? 1 : -1, [currentStudent.value.id], true);
      }
      async function switchStudentDirection(dir) {
        if (busy.value || dir === direction.value || !allowed(dir)) return;
        if (chosenRules.value.length) {
          try {
            await vant.showConfirmDialog({ title: `切换为${dir > 0 ? '加分' : '减分'}？`, message: '当前已选择和填写的积分项将清空。', teleport: host.value, confirmButtonColor: '#2878e8' });
          } catch { return; }
        }
        open(dir, [currentStudent.value.id], true);
      }
      function openRulePicker() {
        if (busy.value) return;
        draftRuleIds.value = [...ruleIds.value];
        ruleQuery.value = '';
        creatingRule.value = false;
        showRulePicker.value = true;
      }
      function openRuleForm() {
        newRuleName.value = '';
        newRuleType.value = 'fixed';
        newRuleValue.value = '';
        newRuleReason.value = '';
        newRuleError.value = '';
        creatingRule.value = true;
      }
      function saveRule() {
        try {
          const rule = bridge.createRule(newRuleName.value, direction.value, newRuleType.value, newRuleValue.value, newRuleReason.value);
          refresh();
          scores[rule.id] = rule.value;
          reasons[rule.id] = rule.reason;
          draftRuleIds.value.push(rule.id);
          ruleQuery.value = '';
          creatingRule.value = false;
        } catch (cause) { newRuleError.value = cause.message; }
      }
      function toggleDraftRule(rule) {
        draftRuleIds.value = draftRuleIds.value.includes(rule.id) ? draftRuleIds.value.filter(id => id !== rule.id) : [...draftRuleIds.value, rule.id];
      }
      function applyRuleSelection() {
        ruleIds.value = draftRuleIds.value.filter(id => available.value.some(rule => rule.id === id));
        showRulePicker.value = false;
      }
      function removeRule(rule) {
        if (busy.value) return;
        ruleIds.value = ruleIds.value.filter(id => id !== rule.id);
        delete touchedScores[rule.id];
      }
      function closeEditor() {
        if (busy.value) return;
        showEditor.value = false;
        showRulePicker.value = false;
        bridge.cancel();
      }
      async function submit() {
        if (busy.value || !canSubmit.value) return;
        busy.value = true;
        verifying.value = false;
        error.value = '';
        const count = targets.value.length;
        const total = perPerson.value;
        const previousBalances = new Map(chosenStudents.value.map(student => [student.id, student.balance]));
        try {
          await bridge.submit({ ids: [...targets.value], single: single.value, direction: direction.value,
            items: chosenRules.value.map(rule => ({ id: rule.id, score: String(scores[rule.id]), reason: reasons[rule.id] || '' }))
          }, () => { verifying.value = true; });
          showEditor.value = false;
          selectedOnly.value = false;
          refresh();
          if (studentView) {
            recordPeriod.value = 'all';
            recordDirection.value = 0;
            const profilePage = host.value?.querySelector('.vp-profile-page');
            if (profilePage) profilePage.scrollTop = 0;
          }
          prepareBalanceAnimation(previousBalances);
          vant.showSuccessToast({ message: studentView ? `${directionText.value}成功\n本次 ${delta(total)} 分` : `${count} 名学员登记成功\n每人 ${delta(total)} 分`, teleport: host.value });
        } catch (cause) { error.value = cause.message; }
        finally { busy.value = false; verifying.value = false; }
      }
      onMounted(() => {
        mounted.value = true;
        document.body.classList.add('vant-mobile-ready');
        window.addEventListener('points:refresh', refresh);
      });
      onBeforeUnmount(() => {
        window.removeEventListener('points:refresh', refresh);
        clearBalanceAnimation();
      });
      return { data, selected, query, classId, selectedOnly, showEditor, showRecords, direction, targets,
        studentView, currentStudent, studentRecords, recordPeriod, recordDirection, periodOptions, directionOptions, openStudent, switchStudentDirection,
        ruleIds, showRulePicker, draftRuleIds, ruleQuery, creatingRule, newRuleName, newRuleType, newRuleValue, newRuleReason, newRuleError, scores, touchedScores, reasons, busy, verifying, error, host, mounted,
        directionText, libraryRules, chosenRules, chosenStudents, visible, allVisible, someVisible, incomplete,
        perPerson, canSubmit, format, delta, groupName, allowed, invalid, scoreError, balanceAnimations, animateBalances, select, toggleStudent, toggleAll,
        open, openRulePicker, openRuleForm, saveRule, toggleDraftRule, applyRuleSelection, removeRule, closeEditor, submit };
    },
    template: `
      <div ref="host" class="vp-app" :class="{ 'vp-editing': showEditor, 'vp-student-view': studentView }">
        <template v-if="studentView">
          <van-nav-bar title="学员信息" safe-area-inset-top />
          <main class="vp-profile-page">
            <section class="vp-profile-card">
              <div class="vp-profile-avatar" aria-hidden="true">{{currentStudent.name.slice(0,1)}}</div>
              <div class="vp-profile-info"><h1>{{currentStudent.name}}<span>（S39755）</span></h1><van-tag plain type="primary">在读学员</van-tag><p>{{groupName(currentStudent.classId)}}</p></div>
            </section>
            <div class="vp-profile-quick" aria-label="学员服务"><div><van-icon name="balance-o" /><span>报名收费</span></div><div><van-icon name="clock-o" /><span>请假申请</span></div><div><van-icon name="description-o" /><span>上传附件</span></div><div><van-icon name="coupon-o" /><span>发优惠券</span></div></div>
            <div class="vp-profile-tabs"><span>在读班级</span><strong aria-current="page">积分</strong><span>优惠券</span><span>请假记录</span></div>
            <section class="vp-profile-balance" aria-label="当前积分"><span>当前积分</span><strong class="vp-balance" :class="{'vp-balance-changing':balanceAnimations[currentStudent.id], 'vp-balance-down':balanceAnimations[currentStudent.id]?.direction<0}">{{format(balanceAnimations[currentStudent.id]?.value ?? currentStudent.balance)}}<small>分</small></strong></section>
            <van-dropdown-menu class="vp-record-filters"><van-dropdown-item v-model="recordPeriod" :options="periodOptions" :teleport="host" /><van-dropdown-item v-model="recordDirection" :options="directionOptions" :teleport="host" /></van-dropdown-menu>
            <div class="vp-profile-records" aria-label="积分明细">
              <article v-for="(record,index) in studentRecords" :key="index" class="vp-profile-record"><header><h2>{{record.ruleName}}</h2><strong :class="{'vp-negative':record.dir<0}">{{delta(record.dir*record.value)}}</strong></header><dl><dt>操作时间</dt><dd>{{record.time}}</dd><dt>原因</dt><dd>{{record.reason}}</dd></dl></article>
              <van-empty v-if="!studentRecords.length" description="当前条件下暂无积分记录" />
            </div>
            <p class="vp-demo-note">演示学员与积分记录 · 刷新后恢复初始数据</p>
          </main>
          <div class="vp-profile-action"><van-button type="primary" round :disabled="!allowed(1)&&!allowed(-1)" @click="openStudent">加减积分</van-button></div>
        </template>
        <template v-else>
        <van-nav-bar title="学员积分" fixed placeholder safe-area-inset-top>
          <template #right><van-button size="small" type="primary" plain @click="showRecords=true">积分记录</van-button></template>
        </van-nav-bar>
        <main class="vp-list-page">
          <div class="vp-overview"><span>在读学员 <b>{{data.students.length}}</b> 名</span><span>本次登记 <b>{{data.records.length}}</b> 条</span></div>
          <van-search v-model="query" placeholder="搜索姓名或班级" aria-label="搜索学员" clearable />
          <van-tabs v-model:active="classId" shrink :ellipsis="false" color="var(--van-primary-color)" class="vp-class-tabs">
            <van-tab title="全部学员" name="all" />
            <van-tab v-for="group in data.classes" :key="group.id" :title="group.name" :name="group.id" />
          </van-tabs>
          <div class="vp-selection-tools">
            <van-checkbox :model-value="allVisible" :indeterminate="someVisible" shape="square" icon-size="20px" @click="toggleAll">全选当前列表</van-checkbox>
            <van-button v-if="selected.length" size="small" type="primary" plain @click="selectedOnly=!selectedOnly">{{selectedOnly ? '返回列表' : '查看已选'}}</van-button>
          </div>
          <van-notice-bar v-if="selectedOnly" :scrollable="false" wrapable text="当前只显示已选学员，可取消勾选移除。" />
          <van-cell-group :border="false" class="vp-students">
            <van-cell v-for="student in visible" :key="student.id" class="vp-student" :class="{'is-selected':selected.includes(student.id)}" :border="true" clickable @click="toggleStudent(student.id)">
              <template #icon><van-checkbox :model-value="selected.includes(student.id)" shape="square" icon-size="20px" :aria-label="'选择'+student.name" @click.stop="toggleStudent(student.id)" /></template>
              <template #title><span class="vp-name">{{student.name}}</span></template>
              <template #label><span>{{groupName(student.classId)}}</span></template>
              <template #value><span class="vp-balance" :class="{'vp-balance-changing':balanceAnimations[student.id], 'vp-balance-down':balanceAnimations[student.id]?.direction<0}" :aria-label="format(student.balance)+' 分'">{{format(balanceAnimations[student.id]?.value ?? student.balance)}}<small>分</small></span></template>
            </van-cell>
          </van-cell-group>
          <van-empty v-if="!visible.length" image="search" :description="selectedOnly ? '当前条件下没有已选学员' : '没有匹配的学员'"><van-button size="small" @click="query='';classId='all';selectedOnly=false">重置筛选</van-button></van-empty>
          <p class="vp-demo-note">演示数据 · 刷新后恢复初始积分</p>
        </main>
        <div class="vp-batch-bar van-safe-area-bottom">
          <div class="vp-batch-count"><span>已选 <b>{{selected.length}}</b> 人</span><van-button v-if="selected.length" size="small" plain @click="select([]);selectedOnly=false">清空</van-button></div>
          <div class="vp-batch-actions"><van-button :disabled="!selected.length || !allowed(-1)" @click="open(-1)">减分</van-button><van-button type="primary" :disabled="!selected.length || !allowed(1)" @click="open(1)">加分</van-button></div>
        </div>
        </template>
        <van-popup v-if="mounted" :show="showEditor" :teleport="host" :position="studentView?'bottom':'right'" class="vp-editor" :class="{'vp-student-sheet':studentView}" :overlay="studentView" :close-on-click-overlay="!busy" @click-overlay="closeEditor" :lock-scroll="false" :close-on-popstate="false" role="dialog" aria-modal="true" :aria-label="studentView?'加减积分':directionText" :aria-busy="busy" @closed="animateBalances">
          <van-nav-bar :title="studentView?'加减积分':targets.length>1 ? '批量'+directionText : (chosenStudents[0]?.name||'')+directionText" :left-text="busy?'处理中':studentView?'取消':'返回'" :left-arrow="!studentView" safe-area-inset-top @click-left="closeEditor"><template v-if="!studentView" #right><van-tag :type="direction<0?'danger':'primary'">{{directionText}}</van-tag></template></van-nav-bar>
          <div class="vp-editor-scroll">
            <div v-if="studentView" class="vp-sheet-context"><span>操作学员</span><strong>{{currentStudent.name}}</strong><span>当前 {{format(currentStudent.balance)}} 分</span></div>
            <div v-if="studentView" class="vp-direction-switch" aria-label="积分操作类型"><van-button :class="{'is-active':direction===1}" :aria-pressed="direction===1" :disabled="busy||!allowed(1)" @click="switchStudentDirection(1)">加积分</van-button><van-button :class="{'is-active is-minus':direction===-1}" :aria-pressed="direction===-1" :disabled="busy||!allowed(-1)" @click="switchStudentDirection(-1)">减积分</van-button></div>
            <div v-if="targets.length>1" class="vp-scope"><div class="vp-scope-title">已选 {{targets.length}} 名学员</div><div class="vp-names"><van-tag v-for="student in chosenStudents" :key="student.id" plain>{{student.name}}</van-tag></div><p>以下积分项统一应用到所选学员</p></div>
            <div class="vp-section-title"><span>积分项<small>已选 {{chosenRules.length}} 项</small></span></div>
            <van-cell-group inset class="vp-rules">
              <div v-for="rule in chosenRules" :key="rule.id" class="vp-rule is-active">
                <div class="vp-rule-top">
                  <van-cell :title="rule.name" :border="false" />
                  <van-button class="vp-rule-remove" size="small" plain :disabled="busy" :aria-label="'移除'+rule.name" @click="removeRule(rule)">移除</van-button>
                </div>
                <div class="vp-rule-fields">
                  <van-field v-model="scores[rule.id]" class="vp-rule-score" :class="{'is-invalid':scoreError(rule)}" :label="directionText+'分值'" label-align="top" type="number" inputmode="decimal" :border="false" :disabled="busy" placeholder="请输入" :error="scoreError(rule)" :error-message="scoreError(rule)?(scores[rule.id]===''?'请填写分值':'请输入 0 或正数'):''" :aria-label="rule.name+directionText+'分值'" :aria-invalid="scoreError(rule)" @blur="touchedScores[rule.id]=true">
                    <template #extra>分</template>
                  </van-field>
                  <van-field v-model="reasons[rule.id]" class="vp-rule-reason" label="原因（选填）" label-align="top" :border="false" placeholder="请输入原因" :disabled="busy" maxlength="100" :aria-label="rule.name+'原因（选填）'" />
                </div>
              </div>
              <div class="vp-add-rule"><van-button type="primary" plain block icon="plus" :disabled="busy" @click="openRulePicker">{{chosenRules.length?'添加积分项':'选择积分项'}}</van-button></div>
            </van-cell-group>
            <div v-if="chosenRules.length" class="vp-calculation"><div><span>{{targets.length>1?'每位学员':'本次'}}{{directionText}}</span><strong :class="{'vp-negative':direction<0&&!incomplete, 'vp-summary-pending':incomplete}">{{incomplete?'待完善':delta(perPerson)+' 分'}}</strong></div><div v-if="targets.length>1"><span>整批合计</span><strong :class="{'vp-negative':direction<0&&!incomplete, 'vp-summary-pending':incomplete}">{{incomplete?'待完善':delta(perPerson*targets.length)+' 分'}}</strong></div><p>{{targets.length}} 人 · {{chosenRules.length}} 个积分项</p></div>
            <van-notice-bar v-if="error" wrapable :scrollable="false" color="var(--van-danger-color)" background="var(--van-red-light)" :text="error" role="alert" />
          </div>
          <footer class="vp-confirm van-safe-area-bottom"><div class="vp-confirm-summary">{{verifying?'正在核实，请勿重复操作':incomplete?'请完善分值':chosenRules.length?(targets.length>1?'每人 ':'本次 ')+delta(perPerson)+' 分':'请选择积分项'}}</div><van-button type="primary" block :color="direction<0?'var(--van-danger-color)':undefined" :disabled="!canSubmit" :loading="busy" :loading-text="verifying?'正在核实…':'正在提交…'" @click="submit">{{studentView?'确认'+directionText:'确认给 '+targets.length+' 人'+directionText}}</van-button></footer>
        </van-popup>
        <van-popup v-if="mounted" v-model:show="showRulePicker" :teleport="host" position="bottom" round class="vp-rule-picker" :lock-scroll="false" :close-on-popstate="false" role="dialog" aria-modal="true" :aria-label="'选择'+directionText+'项'">
          <van-nav-bar :title="creatingRule?'新增'+directionText+'规则':'选择'+directionText+'项'" :left-text="creatingRule?'返回':'取消'" :left-arrow="creatingRule" @click-left="creatingRule ? creatingRule=false : showRulePicker=false" />
          <template v-if="creatingRule">
            <div class="vp-library-scroll vp-rule-form">
              <van-cell-group :border="false">
                <van-field v-model="newRuleName" label="规则名称" label-align="top" placeholder="请输入规则名称" required :border="false" />
                <van-field class="vp-rule-type" :label="directionText+'分值类型'" label-align="top" :border="false"><template #input><van-radio-group v-model="newRuleType" direction="horizontal"><van-radio name="fixed" :class="{'is-selected':newRuleType==='fixed'}" icon-size="18px">固定分值</van-radio><van-radio name="unlimited" :class="{'is-selected':newRuleType==='unlimited'}" icon-size="18px">不限分值</van-radio></van-radio-group></template></van-field>
                <van-field v-if="newRuleType==='fixed'" v-model="newRuleValue" :label="'默认'+directionText+'分值'" label-align="top" required :border="false" type="number" inputmode="decimal" placeholder="请输入默认分值"><template #extra>分</template></van-field>
                <van-field v-model="newRuleReason" label="原因（选填）" label-align="top" :border="false" type="textarea" :autosize="{ minHeight: 72, maxHeight: 120 }" placeholder="请输入原因" />
              </van-cell-group>
              <p class="vp-rule-hint">保存后返回规则库并自动勾选，确认选择后应用到本次操作。积分在主页面提交后生效。</p>
              <p v-if="newRuleError" class="vp-new-rule-error" role="alert">{{newRuleError}}</p>
            </div>
            <footer class="vp-picker-footer vp-new-rule-footer van-safe-area-bottom"><van-button type="primary" block @click="saveRule">保存并选中</van-button></footer>
          </template>
          <template v-else>
          <van-search v-model="ruleQuery" placeholder="搜索积分项" aria-label="搜索积分库" clearable show-action><template #action><van-button type="primary" plain size="small" icon="plus" @click="openRuleForm">新增</van-button></template></van-search>
          <div class="vp-library-scroll">
            <van-cell-group :border="false">
              <van-cell v-for="rule in libraryRules" :key="rule.id" :title="rule.name" :value="rule.value === '' ? '不限分值' : (direction>0?'+':'−')+format(rule.value)+' 分'" clickable @click="toggleDraftRule(rule)">
                <template #icon><van-checkbox :model-value="draftRuleIds.includes(rule.id)" shape="square" icon-size="20px" :aria-label="rule.name" @click.stop="toggleDraftRule(rule)" /></template>
              </van-cell>
            </van-cell-group>
            <van-empty v-if="!libraryRules.length" image="search" :description="ruleQuery.trim()?'没有匹配的积分项':'积分库暂无'+directionText+'项'"><van-button type="primary" plain size="small" @click="openRuleForm">新增积分项</van-button></van-empty>
          </div>
          <footer class="vp-picker-footer van-safe-area-bottom"><span>已选 {{draftRuleIds.length}} 项</span><van-button type="primary" @click="applyRuleSelection">确认选择</van-button></footer>
          </template>
        </van-popup>
        <van-popup v-if="mounted" v-model:show="showRecords" :teleport="host" position="right" class="vp-records" :overlay="false" :lock-scroll="false" role="dialog" aria-modal="true" aria-label="本次积分记录">
          <van-nav-bar title="本次积分记录" left-text="返回" left-arrow safe-area-inset-top @click-left="showRecords=false" />
          <div class="vp-record-scroll"><van-empty v-if="!data.records.length" description="本次还没有积分记录" /><van-cell-group v-else><van-cell v-for="(record,index) in [...data.records].reverse()" :key="index" :title="record.studentName+' · '+record.ruleName" :label="record.reason==='—'?record.time:record.reason+' · '+record.time"><template #value><span :class="{'vp-negative':record.dir<0}">{{delta(record.dir*record.value)}} 分</span></template></van-cell></van-cell-group></div>
        </van-popup>
      </div>`
  });
  app.use(vant);
  app.mount('#pointsVantRoot');
})();
