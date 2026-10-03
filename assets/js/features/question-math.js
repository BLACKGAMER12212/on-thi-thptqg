// Hiển thị công thức bằng MathML; văn bản thường luôn được escape.
import {convertLatexToMathMl} from '../../vendor/mathlive/mathlive-ssr.min.mjs';

export function escapeMathText(value) {
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function splitMathText(value) {
  const text=String(value??'');const chunks=[];const pattern=/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;let end=0,match;
  while((match=pattern.exec(text))){if(match.index>end)chunks.push({text:text.slice(end,match.index)});chunks.push({latex:match[1]??match[2]});end=pattern.lastIndex;}
  if(end<text.length)chunks.push({text:text.slice(end)});return chunks;
}
export function mathMarkup(latex) {
  const source=String(latex??'').slice(0,12000);
  // Không cho lệnh tạo HTML, đường dẫn, macro hoặc tài nguyên bên ngoài.
  if(/\\(?:href|url|html\w*|class|style|includegraphics|def|newcommand|renewcommand|cssId|unicode)\b/i.test(source))return escapeMathText(source);
  try{
    const compatible=source.replace(/\\placeholder\{\}/g,String.raw`\square`).replace(/\\overline\b/g,String.raw`\bar`).replace(/\\overrightarrow\b/g,String.raw`\vec`);
    const markup=convertLatexToMathMl(compatible).replace(/<mo>(&#x00af;|&#x20d7;)<\/mo>/g,'<mo stretchy="true">$1</mo>');
    if(!markup)return escapeMathText(source);
    const allowed=new Set(['mrow','mi','mn','mo','mtext','mspace','mfrac','msqrt','mroot','msup','msub','msubsup','munder','mover','munderover','mtable','mtr','mtd','menclose','mpadded','mphantom','mfenced','mstyle','none','mmultiscripts','mprescripts']);
    const safe=markup.replace(/<\/?([\w:-]+)([^>]*)>/g,(tag,name,attrs)=>{
      if(!allowed.has(name))return '';
      if(tag.startsWith('</'))return `</${name}>`;
      const keep=[...attrs.matchAll(/\b(width|height|depth|lspace|rspace|stretchy|fence|separator|mathvariant|columnalign|rowalign|columnspacing|rowspacing|notation|accent|accentunder|displaystyle|scriptlevel|rowspan|columnspan)="([\w .,+()%-]*)"/g)].map(m=>`${m[1]}="${m[2]}"`).join(' ');
      return `<${name}${keep?' '+keep:''}${tag.endsWith('/>')?'/':''}>`;
    });
    // Công thức nằm trong dòng, nhưng phân số/cận giữ kích thước rõ như đề in.
    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline" displaystyle="true">${safe}</math>`;
  }catch(_error){return escapeMathText(source);}
}
export function renderMathText(value,{editable=false}={}) {
  return splitMathText(value).map(chunk=>chunk.latex!==undefined?`<span class="thpt-formula"${editable?` contenteditable="false" data-latex="${escapeMathText(chunk.latex)}" role="button" tabindex="0" aria-label="Sửa công thức"`:''}>${mathMarkup(chunk.latex)}</span>`:escapeMathText(chunk.text).replace(/\r?\n/g,'<br>')).join('');
}
