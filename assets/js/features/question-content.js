// Nội dung câu hỏi được lưu riêng trong answers._content; không đổi đáp án chấm.
import {renderMathText} from './question-math.js';

// #0 là phần được chọn, \\placeholder{} là ô vuông điền tùy ý.
export const MATH_GROUPS = [
  {title:'Cơ bản',items:[['+','+'],['−','-'],['×',String.raw`\times`],['÷',String.raw`\div`],['±',String.raw`\pm`],['∓',String.raw`\mp`],['Phân số',String.raw`\frac{#0}{\placeholder{}}`],['Mũ tùy ý',String.raw`#0^{\placeholder{}}`],['Bình phương',String.raw`#0^{2}`],['Chỉ số dưới',String.raw`#0_{\placeholder{}}`],['Căn bậc hai',String.raw`\sqrt{#0}`],['Căn bậc n',String.raw`\sqrt[\placeholder{}]{#0}`],['Giá trị tuyệt đối',String.raw`\left|#0\right|`],['Ngoặc',String.raw`\left(#0\right)`],['π',String.raw`\pi`],['∞',String.raw`\infty`]]},
  {title:'Lượng giác · log',items:['sin','cos','tan','cot','sec','csc','arcsin','arccos','arctan','sinh','cosh','tanh'].map(x=>[x,`\\${x}\\left(#0\\right)`]).concat([['ln',String.raw`\ln\left(#0\right)`],['log cơ số',String.raw`\log_{\placeholder{}}\left(#0\right)`],['e mũ',String.raw`e^{\placeholder{}}`],['Hàm f(x)',String.raw`f\left(#0\right)`]])},
  {title:'Giải tích',items:[['Đạo hàm',String.raw`\frac{d}{dx}\left(#0\right)`],['Đạo hàm bậc n',String.raw`\frac{d^{\placeholder{}}}{dx^{\placeholder{}}}\left(#0\right)`],['f′',String.raw`f^{\prime}`],['f″',String.raw`f^{\prime\prime}`],['Đạo hàm riêng',String.raw`\frac{\partial}{\partial x}\left(#0\right)`],['Tích phân',String.raw`\int #0\,dx`],['Có cận',String.raw`\int_{\placeholder{}}^{\placeholder{}} #0\,dx`],['Tích phân kép',String.raw`\iint #0\,dx\,dy`],['Tích phân ba',String.raw`\iiint #0\,dx\,dy\,dz`],['Giới hạn',String.raw`\lim_{x\to\placeholder{}} #0`],['Tổng Σ',String.raw`\sum_{\placeholder{}}^{\placeholder{}} #0`],['Tích Π',String.raw`\prod_{\placeholder{}}^{\placeholder{}} #0`]]},
  {title:'So sánh · logic',items:[['=','='],['≠',String.raw`\ne`],['<','<'],['>','>'],['≤',String.raw`\le`],['≥',String.raw`\ge`],['≈',String.raw`\approx`],['≡',String.raw`\equiv`],['⇒',String.raw`\Rightarrow`],['⇔',String.raw`\Leftrightarrow`],['→',String.raw`\to`],['∀',String.raw`\forall`],['∃',String.raw`\exists`],['∄',String.raw`\nexists`],['∧',String.raw`\land`],['∨',String.raw`\lor`],['¬',String.raw`\neg`]]},
  {title:'Tập hợp · hình học',items:[['∈',String.raw`\in`],['∉',String.raw`\notin`],['⊂',String.raw`\subset`],['⊆',String.raw`\subseteq`],['⊃',String.raw`\supset`],['⊇',String.raw`\supseteq`],['∪',String.raw`\cup`],['∩',String.raw`\cap`],['∅',String.raw`\emptyset`],['ℝ',String.raw`\mathbb{R}`],['ℕ',String.raw`\mathbb{N}`],['ℤ',String.raw`\mathbb{Z}`],['ℚ',String.raw`\mathbb{Q}`],['ℂ',String.raw`\mathbb{C}`],['∠',String.raw`\angle`],['⊥',String.raw`\perp`],['∥',String.raw`\parallel`],['Độ °',String.raw`#0^{\circ}`],['Vectơ',String.raw`\overrightarrow{#0}`],['Đoạn thẳng',String.raw`\overline{#0}`]]},
  {title:'Hy Lạp',items:['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega','Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Phi','Psi','Omega'].map(x=>[x,`\\${x}`])},
  {title:'Ma trận · tổ hợp',items:[['Ma trận 2×2',String.raw`\begin{pmatrix}\placeholder{} & \placeholder{} \\ \placeholder{} & \placeholder{}\end{pmatrix}`],['Định thức',String.raw`\begin{vmatrix}\placeholder{} & \placeholder{} \\ \placeholder{} & \placeholder{}\end{vmatrix}`],['Hệ phương trình',String.raw`\left\{\begin{array}{l}\placeholder{} \\ \placeholder{}\end{array}\right.`],['Nhị thức',String.raw`\binom{#0}{\placeholder{}}`],['Tổ hợp',String.raw`C_{\placeholder{}}^{\placeholder{}}`],['Chỉnh hợp',String.raw`A_{\placeholder{}}^{\placeholder{}}`],['n!',String.raw`#0!`],['…',String.raw`\ldots`],['⋮',String.raw`\vdots`],['⋱',String.raw`\ddots`]]},
];

export function escapeQuestionText(value) {
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function formatQuestionText(value) {
  return renderMathText(value);
}

function boundedText(value) {return String(value??'').slice(0,12000);}

export function readQuestionContent(answers,part,number) {
  const raw=answers?._content?.[part]?.[String(number)];
  if(!raw || typeof raw!=='object')return null;
  const data={text:boundedText(raw.text)};
  const letters=part==='P1'?['A','B','C','D']:part==='P2'?['a','b','c','d']:[];
  if(letters.length)data[part==='P1'?'options':'statements']=Object.fromEntries(letters.map(l=>[l,boundedText(raw[part==='P1'?'options':'statements']?.[l])]));
  return data;
}

export function hasQuestionContent(data) {
  return !!(data?.text?.trim() || Object.values(data?.options||data?.statements||{}).some(value=>String(value).trim()));
}

export function validateQuestionContent(content,parts) {
  for(const part of parts){
    for(let n=1;n<=part.questionCount;n++){
      const data=content?.[part.key]?.[n];
      if(!hasQuestionContent(data))continue;
      if(!data.text?.trim())throw new Error(`${part.title}, câu ${n}: em chưa nhập nội dung câu hỏi.`);
      const letters=part.key==='P1'?['A','B','C','D']:part.key==='P2'?['a','b','c','d']:[];
      for(const letter of letters){if(!String((data.options||data.statements||{})[letter]||'').trim())throw new Error(`${part.title}, câu ${n}: em chưa nhập nội dung ${part.key==='P1'?'phương án':'ý'} ${letter}.`);}
    }
  }
  return content;
}

export function contentToQuestions(answers,parts) {
  const questions={};let hasAny=false;
  for(const part of parts){
    questions[part.key]=Array.from({length:part.questionCount},(_,i)=>{
      const data=readQuestionContent(answers,part.key,i+1);
      const entry=answers?.[part.key]?.[i+1];
      if(hasQuestionContent(data))hasAny=true;
      return {text:data?.text||'',...(part.key==='P1'?{options:['A','B','C','D'].map(l=>data?.options?.[l]||'')}:part.key==='P2'?{statements:['a','b','c','d'].map(l=>data?.statements?.[l]||'')}:{}),solution:typeof entry==='object'?entry?.exp||'':''};
    });
  }
  return hasAny?questions:null;
}

export function questionContentHtml(data,part,number,{choices=true}={}) {
  if(!hasQuestionContent(data))return '';
  const list=data.options||data.statements||{};
  return `<div class="thpt-authored-content"><p class="thpt-question-stem">${formatQuestionText(data.text)}</p>${choices?Object.entries(list).map(([letter,text])=>`<div class="thpt-authored-option"><b>${letter}.</b><span>${formatQuestionText(text)}</span></div>`).join(''):''}</div>`;
}

// Chèn tại đúng vị trí con trỏ, hỗ trợ thay phần đang bôi đen.
export function mathInsertion(value,start,end,token) {
  const before=String(value??'');const from=Math.max(0,Math.min(before.length,start??before.length));const to=Math.max(from,Math.min(before.length,end??from));
  const selected=before.slice(from,to);let inserted=token;
  if(token==='√()'&&selected)inserted=`√(${selected})`;
  if(token==='(tử)/(mẫu)'&&selected)inserted=`(${selected})/(mẫu)`;
  const text=before.slice(0,from)+inserted+before.slice(to);
  let selectionStart=from+inserted.length,selectionEnd=selectionStart;
  if(inserted==='√()')selectionStart=selectionEnd=from+2;
  if(inserted.includes('tử')){selectionStart=from+inserted.indexOf('tử');selectionEnd=selectionStart+2;}
  else if(inserted.includes('mẫu')){selectionStart=from+inserted.indexOf('mẫu');selectionEnd=selectionStart+3;}
  return {text,selectionStart,selectionEnd};
}

// Một hàng đáp án: vòng tròn chứa chữ cái, nội dung bên cạnh, nhãn kết quả rõ ràng.
export function answerChoiceHtml({letter,text='',selected=false,correct=false,reveal=false,input=''}) {
  const status=reveal&&correct?'correct':reveal&&selected?'wrong':selected?'selected':'';
  const label=reveal?(correct?(selected?'Em chọn · Đúng':'Đáp án đúng'):(selected?'Em chọn · Sai':'')):(selected?'Em chọn':'');
  const tag=input?'label':'div';
  return `<${tag} class="thpt-answer-choice ${status}" ${reveal?'data-revealed="true"':''}>${input}<span class="thpt-answer-circle" aria-hidden="true">${escapeQuestionText(letter)}</span><span class="thpt-answer-body">${formatQuestionText(text)}${label?`<span class="thpt-answer-state">${label}</span>`:''}</span></${tag}>`;
}
export function reviewedQuestionHtml(data,part,number,{correct,selected}={}) {
  if(!hasQuestionContent(data))return '';
  if(part==='P1')return `<div class="thpt-authored-content"><p class="thpt-question-stem">${formatQuestionText(data.text)}</p><div class="thpt-answer-choices">${['A','B','C','D'].map(letter=>answerChoiceHtml({letter,text:data.options?.[letter]||'',selected:letter===selected,correct:letter===correct,reveal:true})).join('')}</div>${!selected?'<p class="thpt-answer-empty">Em chưa chọn đáp án.</p>':''}</div>`;
  if(part==='P2')return `<div class="thpt-authored-content"><p class="thpt-question-stem">${formatQuestionText(data.text)}</p>${['a','b','c','d'].map(letter=>`<p class="thpt-question-stem">${letter}) ${formatQuestionText(data.statements?.[letter]||'')}</p><div class="thpt-answer-tf">${['T','F'].map(value=>answerChoiceHtml({letter:value==='T'?'Đ':'S',text:value==='T'?'Đúng':'Sai',selected:selected?.[letter]===value,correct:correct?.[letter]===value,reveal:true})).join('')}</div>${!selected?.[letter]?'<p class="thpt-answer-empty">Em chưa chọn ý này.</p>':''}`).join('')}</div>`;
  return questionContentHtml(data,part,number);
}
