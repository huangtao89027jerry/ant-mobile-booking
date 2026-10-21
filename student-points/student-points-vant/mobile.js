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
      const reasons = reactive({});
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
      function open(dir, ids = selected.value, isSingle = false) {
        if (!ids.length || !allowed(dir)) return;
        bridge.cancel();
        direction.value = dir;
        targets.value = [...ids];
        single.value = isSingle;
        ruleIds.value = [];
        showRulePicker.value = false;
        available.value.forEach(rule => { scores[rule.id] = rule.value; reasons[rule.id] = rule.reason || ''; });
        error.value = '';
        showEditor.value = true;
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
        try {
          await bridge.submit({ ids: [...targets.value], single: single.value, direction: direction.value,
            items: chosenRules.value.map(rule => ({ id: rule.id, score: String(scores[rule.id]), reason: reasons[rule.id] || '' }))
          }, () => { verifying.value = true; });
          showEditor.value = false;
          selectedOnly.value = false;
          refresh();
          vant.showSuccessToast({ message: `${count} 名学员登记成功\n每人 ${delta(total)} 分`, teleport: host.value });
        } catch (cause) { error.value = cause.message; }
        finally { busy.value = false; verifying.value = false; }
      }
      onMounted(() => {
        mounted.value = true;
        document.body.classList.add('vant-mobile-ready');
        window.addEventListener('points:refresh', refresh);
      });
      onBeforeUnmount(() => window.removeEventListener('points:refresh', refresh));
      return { data, selected, query, classId, selectedOnly, showEditor, showRecords, direction, targets,
        ruleIds, showRulePicker, draftRuleIds, ruleQuery, creatingRule, newRuleName, newRuleType, newRuleValue, newRuleReason, newRuleError, scores, reasons, busy, verifying, error, host, mounted,
        directionText, libraryRules, chosenRules, chosenStudents, visible, allVisible, someVisible, incomplete,
        perPerson, canSubmit, format, delta, groupName, allowed, invalid, select, toggleStudent, toggleAll,
        open, openRulePicker, openRuleForm, saveRule, toggleDraftRule, applyRuleSelection, removeRule, closeEditor, submit };
    },
    template: `
      <div ref="host" class="vp-app" :class="{ 'vp-editing': showEditor }">
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
              <template #value><span class="vp-balance">{{format(student.balance)}}<small>分</small></span></template>
            </van-cell>
          </van-cell-group>
          <van-empty v-if="!visible.length" image="search" :description="selectedOnly ? '当前条件下没有已选学员' : '没有匹配的学员'"><van-button size="small" @click="query='';classId='all';selectedOnly=false">重置筛选</van-button></van-empty>
          <p class="vp-demo-note">演示数据 · 刷新后恢复初始积分</p>
        </main>
        <div class="vp-batch-bar van-safe-area-bottom">
          <div class="vp-batch-count"><span>已选 <b>{{selected.length}}</b> 人</span><van-button v-if="selected.length" size="small" plain @click="select([]);selectedOnly=false">清空</van-button></div>
          <div class="vp-batch-actions"><van-button :disabled="!selected.length || !allowed(-1)" @click="open(-1)">减分</van-button><van-button type="primary" :disabled="!selected.length || !allowed(1)" @click="open(1)">加分</van-button></div>
        </div>
        <van-popup v-if="mounted" :show="showEditor" :teleport="host" position="right" class="vp-editor" :overlay="false" :lock-scroll="false" :close-on-popstate="false" role="dialog" aria-modal="true" :aria-label="directionText" :aria-busy="busy">
          <van-nav-bar :title="targets.length>1 ? '批量'+directionText : (chosenStudents[0]?.name||'')+directionText" :left-text="busy?'处理中':'返回'" left-arrow safe-area-inset-top @click-left="closeEditor"><template #right><van-tag :type="direction<0?'danger':'primary'">{{directionText}}</van-tag></template></van-nav-bar>
          <div class="vp-editor-scroll">
            <div v-if="targets.length>1" class="vp-scope"><div class="vp-scope-title">已选 {{targets.length}} 名学员</div><div class="vp-names"><van-tag v-for="student in chosenStudents" :key="student.id" plain>{{student.name}}</van-tag></div><p>以下积分项统一应用到所选学员</p></div>
            <div class="vp-section-title"><span>积分项<small>已选 {{chosenRules.length}} 项</small></span></div>
            <van-cell-group inset class="vp-rules">
              <div v-for="rule in chosenRules" :key="rule.id" class="vp-rule is-active">
                <div class="vp-rule-top">
                  <van-cell :title="rule.name" :border="false" />
                  <van-field v-model="scores[rule.id]" class="vp-rule-score" type="number" inputmode="decimal" input-align="right" :border="false" :disabled="busy" placeholder="分值" :error="invalid(rule)" :aria-label="rule.name+directionText+'分值'" :aria-invalid="invalid(rule)">
                    <template #left-icon><span class="vp-sign" :class="{'vp-negative':direction<0}">{{direction>0?'+':'−'}}</span></template><template #extra>分</template>
                  </van-field>
                  <van-button class="vp-rule-remove" size="small" plain :disabled="busy" :aria-label="'移除'+rule.name" @click="removeRule(rule)">移除</van-button>
                </div>
                <p v-if="invalid(rule)" class="vp-rule-error" role="alert">请填写有效的非负分值</p>
                <van-field v-model="reasons[rule.id]" class="vp-rule-reason" :border="false" placeholder="添加原因（选填）" :disabled="busy" maxlength="100" :aria-label="rule.name+'原因（选填）'" />
              </div>
              <div class="vp-add-rule"><van-button type="primary" plain block icon="plus" :disabled="busy" @click="openRulePicker">{{chosenRules.length?'添加积分项':'选择积分项'}}</van-button></div>
            </van-cell-group>
            <div class="vp-calculation"><div><span>{{targets.length>1?'每位学员':'本次'}}{{directionText}}</span><strong :class="{'vp-negative':direction<0}">{{incomplete?'待完善':delta(perPerson)+' 分'}}</strong></div><div v-if="targets.length>1"><span>整批合计</span><b>{{incomplete?'待完善':delta(perPerson*targets.length)+' 分'}}</b></div><p>{{targets.length}} 人 · {{chosenRules.length}} 个积分项</p></div>
            <van-notice-bar v-if="error" wrapable :scrollable="false" color="var(--van-danger-color)" background="var(--van-red-light)" :text="error" role="alert" />
          </div>
          <footer class="vp-confirm van-safe-area-bottom"><div class="vp-confirm-summary">{{verifying?'正在核实，请勿重复操作':incomplete?'请完善分值':chosenRules.length?(targets.length>1?'每人 ':'本次 ')+delta(perPerson)+' 分':'请选择积分项'}}</div><van-button type="primary" block :color="direction<0?'var(--van-danger-color)':undefined" :disabled="!canSubmit" :loading="busy" :loading-text="verifying?'正在核实…':'正在提交…'" @click="submit">确认给 {{targets.length}} 人{{directionText}}</van-button></footer>
        </van-popup>
        <van-popup v-if="mounted" v-model:show="showRulePicker" :teleport="host" position="bottom" round class="vp-rule-picker" :lock-scroll="false" :close-on-popstate="false" role="dialog" aria-modal="true" :aria-label="'选择'+directionText+'项'">
          <van-nav-bar :title="creatingRule?'新增'+directionText+'规则':'选择'+directionText+'项'" :left-text="creatingRule?'返回':'取消'" @click-left="creatingRule ? creatingRule=false : showRulePicker=false" />
          <template v-if="creatingRule">
            <div class="vp-library-scroll vp-rule-form">
              <van-cell-group :border="false">
                <van-field v-model="newRuleName" label="规则名称" placeholder="请输入规则名称" required />
                <van-field :label="directionText+'分值类型'"><template #input><van-radio-group v-model="newRuleType" direction="horizontal"><van-radio name="fixed" icon-size="18px">固定分值</van-radio><van-radio name="unlimited" icon-size="18px">不限分值</van-radio></van-radio-group></template></van-field>
                <van-field v-if="newRuleType==='fixed'" v-model="newRuleValue" :label="'默认'+directionText+'分值'" required type="number" inputmode="decimal" placeholder="请输入默认分值"><template #left-icon><span class="vp-sign" :class="{'vp-negative':direction<0}">{{direction>0?'+':'−'}}</span></template><template #extra>分</template></van-field>
                <van-field v-model="newRuleReason" label="原因" type="textarea" :autosize="{ minHeight: 82 }" placeholder="请输入原因" />
              </van-cell-group>
              <p class="vp-rule-hint">保存后返回规则列表并自动勾选，再应用到本次操作。积分在主弹窗点击确定后生效。</p>
              <p v-if="newRuleError" class="vp-new-rule-error" role="alert">{{newRuleError}}</p>
            </div>
            <footer class="vp-picker-footer van-safe-area-bottom"><van-button @click="creatingRule=false">返回规则列表</van-button><van-button type="primary" @click="saveRule">保存并选中</van-button></footer>
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
