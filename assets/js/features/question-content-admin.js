import {mathMarkup} from './question-math.js';
import {bindRichMathEditors,syncRichMathEditors} from './question-math-editor.js';
import {MATH_GROUPS,escapeQuestionText,readQuestionContent,hasQuestionContent,questionContentHtml,validateQuestionContent} from './question-content.js';

export function editorContentHtml(part,number) {
  const prefix=`ed_content_${part}_${number}`;
  const letters=part==='P1'?['A','B','C','D']:part==='P2'?['a','b','c','d']:[];
  return `<section class="thpt-question-editor" data-content-part="${part}" data-content-number="${number}"><div class="thpt-content-editor-head"><strong>Nội dung câu hỏi trên web</strong><span>Có thể để trống nếu dùng đề PDF.</span></div><label class="thpt-content-label" for="${prefix}_text">Đề bài</label><textarea id="${prefix}_text" data-math-input data-content-field="text" class="thpt-content-input" rows="3" maxlength="12000" placeholder="Ví dụ: Đạo hàm của y = x³ − 3x là…"></textarea>${letters.length?`<div class="thpt-content-option-grid">${letters.map(letter=>`<label class="thpt-content-option-label"><b>${part==='P1'?'Phương án':'Ý'} ${letter}</b><textarea id="${prefix}_${letter}" data-math-input data-content-field="${letter}" class="thpt-content-input" rows="2" maxlength="12000" placeholder="Nhập nội dung ${letter}"></textarea></label>`).join('')}</div>`:''}<details class="thpt-content-preview" open><summary>Xem trước nội dung câu hỏi</summary><div data-content-preview><p class="thpt-content-empty">Nhập đề bài và các phương án để xem trước.</p></div></details></section>`;
}

export function paletteHtml() {
  const preview=value=>mathMarkup(value.replaceAll('#0',String.raw`\square`).replace(/\\placeholder\{\}/g,String.raw`\square`));
  return `<section class="thpt-math-palette" aria-label="Bảng ký hiệu toán"><div class="thpt-math-palette-head"><strong>Ký hiệu toán</strong><span>Chọn ô nhập rồi chọn công thức.</span></div><div class="thpt-math-tabs" role="tablist" aria-label="Nhóm ký hiệu">${MATH_GROUPS.map((group,index)=>`<button type="button" role="tab" data-math-tab="${index}" aria-selected="${index===0}" tabindex="${index===0?0:-1}">${group.title}</button>`).join('')}</div>${MATH_GROUPS.map((group,index)=>`<div class="thpt-math-group" data-math-group="${index}" ${index?'hidden':''}><div>${group.items.map(([label,value])=>`<button type="button" data-math-symbol="${escapeQuestionText(value)}" title="${escapeQuestionText(label)}" aria-label="Chèn ${escapeQuestionText(label)}"><span class="thpt-key-symbol">${preview(value)}</span></button>`).join('')}</div></div>`).join('')}<p class="thpt-math-feedback" data-math-feedback role="status">Bấm để chèn ngay. Điền ô vuông tại chỗ, Tab chuyển ô.</p></section>`;
}

function dataFromSection(section) {
  const part=section.dataset.contentPart;
  const data={text:section.querySelector('[data-content-field="text"]')?.value||''};
  const letters=part==='P1'?['A','B','C','D']:part==='P2'?['a','b','c','d']:[];
  if(letters.length)data[part==='P1'?'options':'statements']=Object.fromEntries(letters.map(l=>[l,section.querySelector(`[data-content-field="${l}"]`)?.value||'']));
  return data;
}

export function refreshContentPreview(section) {
  const preview=section?.querySelector('[data-content-preview]');if(!preview)return;
  const data=dataFromSection(section);
  preview.innerHTML=questionContentHtml(data,section.dataset.contentPart,Number(section.dataset.contentNumber))||'<p class="thpt-content-empty">Nhập đề bài và các phương án để xem trước.</p>';
}

export function fillEditorContent(root,answers) {
  for(const section of root.querySelectorAll('[data-content-part]')){
    const data=readQuestionContent(answers,section.dataset.contentPart,section.dataset.contentNumber);
    if(data)for(const input of section.querySelectorAll('[data-content-field]')){
      const key=input.dataset.contentField;input.value=key==='text'?data.text:(data.options||data.statements||{})[key]||'';
    }
    refreshContentPreview(section);
  }
  syncRichMathEditors(root);
}

export function collectEditorContent(root,parts,{validate=true}={}) {
  const content={version:1,P1:{},P2:{},P3:{}};
  for(const section of root.querySelectorAll('[data-content-part]')){
    const data=dataFromSection(section);
    if(hasQuestionContent(data))content[section.dataset.contentPart][section.dataset.contentNumber]=data;
  }
  if(validate)for(const field of root.querySelectorAll('textarea.thpt-rich-source')){
    if(/\\placeholder\b/.test(field.value))throw new Error('Em điền đủ các ô vuông trong công thức trước khi lưu nhé.');
  }
  return validate?validateQuestionContent(content,parts):content;
}

export function bindMathEditor(root,{onInput=()=>{},mathLibraryLoader}={}) {
  const lifecycle=new AbortController();
  const cleanup=bindRichMathEditors(root,{mathLibraryLoader});
  root.addEventListener('input',event=>{
    if(event.target.matches?.('textarea')){
      const section=event.target.closest('[data-content-part]');if(section)refreshContentPreview(section);
      onInput();
    }
  },{signal:lifecycle.signal});
  return ()=>{lifecycle.abort();cleanup();};
}
export {syncRichMathEditors};
