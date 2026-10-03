import {readQuestionContent,hasQuestionContent,formatQuestionText,escapeQuestionText,answerChoiceHtml} from './question-content.js';

let dispose=()=>{};
export function clearAuthoredExam(){dispose();}

// Điều khiển vẫn nối vào input cũ để giữ nguyên lưu tiến độ và chấm điểm.
export function mountAuthoredExam({answers,parts,review=false,initialAnswers={}}) {
  dispose();
  const workspace=document.getElementById('exam-workspace'),left=workspace?.querySelector('.left-panel');if(!left)return;
  const list=parts.flatMap(part=>Array.from({length:part.questionCount},(_,i)=>({part:part.key,title:part.title,number:i+1})));
  const first=list.findIndex(q=>hasQuestionContent(readQuestionContent(answers,q.part,q.number)));if(first<0)return;
  const lifecycle=new AbortController(),opts={signal:lifecycle.signal};let index=first;
  const mode=document.createElement('div');mode.className='thpt-content-mode-bar';mode.innerHTML='<span>Nội dung đề thi</span><div><button type="button" data-view="text">Từng câu</button><button type="button" data-view="pdf">Đề PDF</button></div>';
  const panel=document.createElement('section');panel.className='thpt-authored-panel';panel.setAttribute('aria-label','Câu hỏi và phương án trả lời');left.prepend(mode);left.appendChild(panel);
  const sheet=document.getElementById('sheets-container');
  const navigation=document.createElement('section');navigation.className='thpt-authored-navigation';navigation.setAttribute('aria-label','Chuyển câu hỏi');sheet?.before(navigation);
  const nativeRadio=(name,value)=>document.querySelector(`#sheets-container input[name="${name}"][value="${value}"]`);
  const nativeValue=name=>review?(initialAnswers[name]||''):(document.querySelector(`#sheets-container input[name="${name}"]:checked`)?.value||'');
  const submitted=()=>review||document.body.classList.contains('has-exam-result');
  const keyFor=q=>{const entry=answers?.[q.part]?.[q.number];return typeof entry==='object'?entry?.ans:entry;};
  const choice=(name,value,letter,text,correct)=>{
    const native=nativeRadio(name,value),selected=nativeValue(name)===value;
    return answerChoiceHtml({letter,text,selected,correct:correct===value,reveal:submitted(),input:`<input class="thpt-choice-control" type="radio" name="thpt_card_${name}" data-native-name="${name}" value="${value}" aria-label="${escapeQuestionText(letter)}" ${selected?'checked':''} ${submitted()||native?.disabled?'disabled':''}>`});
  };
  function drawNavigation(){
    navigation.innerHTML=parts.map(part=>`<div class="thpt-authored-nav-part"><strong>${escapeQuestionText(part.title)}</strong><div>${list.map((q,n)=>q.part===part.key?`<button type="button" data-card-index="${n}" aria-label="${escapeQuestionText(part.title)}, câu ${q.number}" aria-current="${n===index?'true':'false'}" class="${n===index?'active':''} ${q.part==='P3'?document.getElementById(`ans_P3_${q.number}`)?.value||initialAnswers[`ans_P3_${q.number}`]?'answered':'':q.part==='P1'?nativeValue(`ans_P1_${q.number}`)?'answered':'':['a','b','c','d'].every(l=>nativeValue(`ans_P2_${q.number}${l}`))?'answered':''}">${q.number}</button>`:'').join('')}</div></div>`).join('');
  }
  function render(){
    const q=list[index],data=readQuestionContent(answers,q.part,q.number),name=`ans_${q.part}_${q.number}`,reveal=submitted();let controls='';
    if(hasQuestionContent(data)){
      if(q.part==='P1')controls=`<div class="thpt-answer-choices">${['A','B','C','D'].map(l=>choice(name,l,l,data.options?.[l]||'',keyFor(q))).join('')}</div>${reveal&&!nativeValue(name)?'<p class="thpt-answer-empty">Em chưa chọn đáp án.</p>':''}`;
      else if(q.part==='P2')controls=['a','b','c','d'].map(l=>`<p class="thpt-question-stem">${l}) ${formatQuestionText(data.statements?.[l]||'')}</p><div class="thpt-answer-tf">${choice(name+l,'T','Đ','Đúng',answers.P2?.[q.number]?.[l])}${choice(name+l,'F','S','Sai',answers.P2?.[q.number]?.[l])}</div>`).join('');
      else {const native=document.getElementById(name);controls=`<label class="thpt-content-label" for="thpt-card-short">Đáp án của em</label><input type="text" id="thpt-card-short" class="thpt-content-input" inputmode="decimal" maxlength="20" data-native-id="${name}" value="${escapeQuestionText((review?initialAnswers[name]:native?.value)||'')}" ${reveal||native?.disabled?'disabled':''}>${reveal?`<p class="thpt-answer-state">Đáp án đúng: ${escapeQuestionText(keyFor(q)??'Chưa nhập')}</p>`:''}`;}
    }
    panel.innerHTML=`<article class="thpt-inline-question"><div class="thpt-inline-question-head"><span>${escapeQuestionText(q.title)} · Câu ${q.number}</span><span>${index+1} / ${list.length}</span></div>${hasQuestionContent(data)?`<p class="thpt-question-stem">${formatQuestionText(data.text)}</p>${controls}`:'<p class="thpt-question-fallback">Câu này chưa có nội dung gõ. Chọn “Đề PDF” để đọc và trả lời trên phiếu.</p>'}</article><div class="thpt-card-pagination"><button type="button" data-card-step="-1" ${index===0?'disabled':''}>Câu trước</button><button type="button" data-card-step="1" ${index===list.length-1?'disabled':''}>Câu tiếp</button></div>`;
    drawNavigation();
  }
  const setMode=view=>{workspace.classList.toggle('thpt-text-mode',view==='text');panel.hidden=view!=='text';navigation.hidden=view!=='text';mode.querySelectorAll('button').forEach(btn=>{const active=btn.dataset.view===view;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});};
  function sync(){
    // Bảo toàn con trỏ trong ô đáp án ngắn; radio có thể dựng lại ngay.
    const short=panel.querySelector('[data-native-id]');if(short===document.activeElement&&!submitted()){drawNavigation();return;}render();
  }
  mode.addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)setMode(button.dataset.view);},opts);
  panel.addEventListener('click',event=>{const button=event.target.closest('[data-card-step]');if(button&&!button.disabled){index=Math.max(0,Math.min(list.length-1,index+Number(button.dataset.cardStep)));render();panel.scrollTop=0;}},opts);
  navigation.addEventListener('click',event=>{const button=event.target.closest('[data-card-index]');if(button){index=Number(button.dataset.cardIndex);render();panel.scrollTop=0;}},opts);
  panel.addEventListener('input',event=>{
    const input=event.target;if(submitted())return;
    if(input.dataset.nativeName){const native=nativeRadio(input.dataset.nativeName,input.value);if(!native||native.disabled)return;native.checked=true;native.dispatchEvent(new Event('change',{bubbles:true}));}
    else if(input.dataset.nativeId){const native=document.getElementById(input.dataset.nativeId);if(!native||native.disabled)return;native.value=input.value;native.dispatchEvent(new Event('input',{bubbles:true}));}
  },opts);
  sheet?.addEventListener('change',sync,opts);sheet?.addEventListener('input',sync,opts);
  const observer=new MutationObserver(sync);if(sheet)observer.observe(sheet,{subtree:true,attributes:true,attributeFilter:['disabled']});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  render();setMode(review?'pdf':'text');
  dispose=()=>{lifecycle.abort();observer.disconnect();mode.remove();panel.remove();navigation.remove();workspace.classList.remove('thpt-text-mode');dispose=()=>{};};
}
