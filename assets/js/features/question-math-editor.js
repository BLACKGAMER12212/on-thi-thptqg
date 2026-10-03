// Ô soạn văn bản chứa công thức trực quan; textarea cũ vẫn là nguồn dữ liệu lưu.
import {renderMathText,mathMarkup} from './question-math.js';

export function serializeMathEditor(node) {
  if(node.nodeType===3)return node.nodeValue||'';
  if(node.nodeType!==1)return '';
  if(node.dataset?.latex!==undefined)return `\\(${node.dataset.latex}\\)`;
  if(node.tagName==='BR')return '\n';
  const text=Array.from(node.childNodes).map(serializeMathEditor).join('');
  return ['DIV','P'].includes(node.tagName)&&node.parentElement?.isContentEditable?text+'\n':text;
}
export function syncRichMathEditors(root) {
  root.querySelectorAll('[data-rich-math-editor]').forEach(editor=>{
    const source=document.getElementById(editor.dataset.sourceId);
    if(source&&serializeMathEditor(editor)!==source.value){editor.innerHTML=renderMathText(source.value,{editable:true});source.dispatchEvent(new Event('input',{bubbles:true}));}
  });
}

export function bindRichMathEditors(root,{onChange=()=>{},mathLibraryLoader=()=>import('../../vendor/mathlive/mathlive.min.mjs')}) {
  const lifecycle=new AbortController(),opts={signal:lifecycle.signal};
  let editor=null,range=null,activeMathfield=null;
  const histories=new WeakMap();let libraryPromise;
  const remember=()=>{
    const selection=window.getSelection();if(!selection?.rangeCount)return;
    const current=selection.getRangeAt(0),host=(current.commonAncestorContainer.nodeType===1?current.commonAncestorContainer:current.commonAncestorContainer.parentElement)?.closest('[data-rich-math-editor]');
    if(host&&root.contains(host)){editor=host;range=current.cloneRange();}
  };
  const sourceFor=host=>document.getElementById(host.dataset.sourceId);
  const publish=(host,{record=true}={})=>{
    const source=sourceFor(host),next=serializeMathEditor(host);if(!source)return;
    if(next.length>12000){host.innerHTML=renderMathText(source.value,{editable:true});return;}
    if(record&&next!==source.value){const history=histories.get(host)||{undo:[],redo:[]};history.undo.push(source.value);history.undo=history.undo.slice(-50);history.redo=[];histories.set(host,history);}
    source.value=next;source.dispatchEvent(new Event('input',{bubbles:true}));onChange();
  };
  function upgrade(){
    root.querySelectorAll('textarea[data-content-field],textarea.exp-textarea-large').forEach(source=>{
      if(source.dataset.richUpgraded)return;source.dataset.richUpgraded='true';
      const wrapper=document.createElement('div');wrapper.className='thpt-rich-input-wrap';
      const host=document.createElement('div');host.className='thpt-rich-input';host.contentEditable='true';host.setAttribute('role','textbox');host.setAttribute('aria-multiline','true');host.setAttribute('aria-label',root.querySelector(`label[for="${source.id}"]`)?.textContent||source.placeholder||'Nội dung toán');host.dataset.richMathEditor='';host.dataset.sourceId=source.id;host.dataset.placeholder=source.placeholder||'Nhập nội dung, rồi chọn ký hiệu toán.';
      host.innerHTML=renderMathText(source.value,{editable:true});source.before(wrapper);wrapper.append(host,source);source.hidden=true;source.classList.add('thpt-rich-source');
    });
  }
  function insertNode(node){
    if(!editor?.isConnected)return;
    editor.focus({preventScroll:true});const selection=window.getSelection();
    if(!range||!editor.contains(range.commonAncestorContainer)){range=document.createRange();range.selectNodeContents(editor);range.collapse(false);}
    range.deleteContents();range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);publish(editor);remember();
  }
  async function ensureMathLive(){
    libraryPromise ||= mathLibraryLoader().then(library=>{
      library.MathfieldElement.fontsDirectory=new URL('../../vendor/mathlive/fonts',import.meta.url).href;
      library.MathfieldElement.soundsDirectory=null;library.MathfieldElement.computeEngine=null;
      return library;
    });
    return libraryPromise;
  }
  async function editFormula(token='',existing=null){
    if(!editor?.isConnected){root.querySelector('[data-math-feedback]')?.replaceChildren('Chọn ô đề bài, phương án hoặc lời giải trước.');return;}
    if(!existing&&activeMathfield?.isConnected&&document.activeElement===activeMathfield){
      activeMathfield.insert(token,{selectionMode:'placeholder'});
      const parent=activeMathfield.closest('[data-latex]');parent.dataset.latex=activeMathfield.value;publish(editor);activeMathfield.focus();return;
    }
    remember();const destination=editor;let node=existing;
    if(node?.querySelector('math-field'))return;
    const selected=range?.toString()||'';
    if(!node){
      const seed=selected?selected.replace(/([{}\\])/g,'\\$1'):String.raw`\placeholder{}`;
      const latex=token.replaceAll('#0',seed);
      node=document.createElement('span');node.className='thpt-formula';node.contentEditable='false';node.dataset.latex=latex;node.setAttribute('aria-label','Sửa công thức');node.setAttribute('role','button');node.tabIndex=0;node.innerHTML=mathMarkup(latex);
      insertNode(node);
    }
    // Ký hiệu đơn được chèn ngay; mẫu có ô vuông mở ô toán tại chỗ.
    if(!existing&&!/#0|\\placeholder|[{}]/.test(token))return;
    try{
      const library=await ensureMathLive();if(!node.isConnected||!destination.isConnected)return;
      const field=new library.MathfieldElement();field.mathVirtualKeyboardPolicy='manual';field.smartMode=false;field.defaultMode='math';field.setAttribute('aria-label','Điền công thức trực tiếp');
      node.replaceChildren(field);node.classList.add('thpt-formula-editing');node.removeAttribute('role');node.removeAttribute('tabindex');
      const initial=node.dataset.latex;
      field.insert(initial,{selectionMode:'placeholder'});
      const update=()=>{node.dataset.latex=field.value;publish(destination);};
      field.addEventListener('input',update,opts);
      field.addEventListener('change',update,opts);
      field.addEventListener('focusin',()=>{editor=destination;activeMathfield=field;},opts);
      field.addEventListener('blur',()=>{
        if(activeMathfield===field)activeMathfield=null;update();
        // Trở về hình công thức gọn sau khi rời ô; bấm lại để sửa.
        if(node.isConnected){node.classList.remove('thpt-formula-editing');node.innerHTML=mathMarkup(node.dataset.latex);node.setAttribute('role','button');node.tabIndex=0;node.setAttribute('aria-label','Sửa công thức');}
      },opts);
      field.focus();
    }catch(_error){root.querySelector('[data-math-feedback]')?.replaceChildren('Chưa tải được ô toán. Tải lại trang rồi thử lại.');}
  }
  document.addEventListener('selectionchange',remember,opts);
  root.addEventListener('focusin',event=>{const host=event.target.closest?.('[data-rich-math-editor]');if(host){editor=host;remember();}},opts);
  root.addEventListener('input',event=>{const host=event.target.closest?.('[data-rich-math-editor]');if(host&&event.target.tagName!=='MATH-FIELD')publish(host);},opts);
  root.addEventListener('pointerdown',event=>{if(event.target.closest('[data-math-symbol],[data-rich-action]')){remember();event.preventDefault();}},opts);
  root.addEventListener('click',event=>{
    const label=event.target.closest('label[for]');if(label){const host=root.querySelector(`[data-source-id="${label.htmlFor}"]`);host?.focus();}
    const tab=event.target.closest('[data-math-tab]');if(tab){changeTab(root,tab);return;}
    const formula=event.target.closest('[data-latex]');
    if(formula&&!event.target.closest('math-field')){editor=formula.closest('[data-rich-math-editor]');editFormula('',formula);return;}
    const button=event.target.closest('[data-math-symbol]');if(button)editFormula(button.dataset.mathSymbol);

  },opts);
  root.addEventListener('keydown',event=>{
    const host=event.target.closest?.('[data-rich-math-editor]');if(!host||event.target.tagName==='MATH-FIELD')return;
    if(event.target.matches('[data-latex]')&&['Enter',' '].includes(event.key)){event.preventDefault();editor=host;editFormula('',event.target);return;}
    if(event.key==='Enter'){event.preventDefault();editor=host;remember();insertNode(document.createTextNode('\n'));}
    if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){
      event.preventDefault();const h=histories.get(host);if(!h)return;const undo=event.key.toLowerCase()==='z'&&!event.shiftKey;const from=undo?h.undo:h.redo,to=undo?h.redo:h.undo;if(!from.length)return;
      to.push(sourceFor(host).value);host.innerHTML=renderMathText(from.pop(),{editable:true});publish(host,{record:false});range=null;
    }
  },opts);
  root.addEventListener('paste',event=>{const host=event.target.closest?.('[data-rich-math-editor]');if(!host||event.target.tagName==='MATH-FIELD')return;event.preventDefault();editor=host;remember();insertNode(document.createTextNode(event.clipboardData?.getData('text/plain')||''));},opts);
  const header=root.querySelector('.editor-top-sticky');
  const resize=header&&typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>root.style.setProperty('--thpt-editor-header-height',`${header.getBoundingClientRect().height}px`)):null;
  if(header)resize?.observe(header);
  const tabsKeydown=event=>{
    const button=event.target.closest?.('[data-math-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const tabs=Array.from(button.closest('.thpt-math-palette').querySelectorAll('[data-math-tab]'));const n=tabs.indexOf(button);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(n+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;changeTab(root,tabs[next]);tabs[next].focus();
  };
  root.addEventListener('keydown',tabsKeydown,opts);
  const observer=new MutationObserver(()=>upgrade());observer.observe(root,{childList:true,subtree:true});upgrade();
  return ()=>{lifecycle.abort();observer.disconnect();resize?.disconnect();};
}
export function changeTab(root,button){
  const palette=button.closest('.thpt-math-palette');if(!palette)return;
  palette.querySelectorAll('[data-math-tab]').forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  palette.querySelectorAll('[data-math-group]').forEach(group=>{group.hidden=group.dataset.mathGroup!==button.dataset.mathTab;});
}
