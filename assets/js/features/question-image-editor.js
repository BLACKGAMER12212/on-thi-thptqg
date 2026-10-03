// Khu vực ảnh độc lập: ảnh xem trước và nguồn cắt không dùng chung kích thước.
export function imageWorkspaceHtml(qId) {
  return `<section class="thpt-image-workspace" data-image-workspace="${qId}">
    <div class="drop-zone thpt-image-drop" id="drop_zone_${qId}" tabindex="0" role="button" data-qid="${qId}" onclick="if(window.innerWidth <= 1024) window.triggerImageSelect('${qId}')" ondblclick="window.triggerImageSelect('${qId}')"><strong>Ảnh câu hỏi</strong><span>Nhấp đúp để tải ảnh · chọn khung rồi Ctrl+V để dán ảnh</span></div>
    <div class="image-wrapper thpt-image-preview" id="img_wrap_${qId}">
      <div class="thpt-image-preview-viewport"><div class="resizable-box thpt-image-resize" id="resize_box_${qId}"><img id="img_preview_${qId}" crossorigin="anonymous" alt="Ảnh câu hỏi"></div></div>
      <p class="resize-hint">Kéo góc dưới bên phải để chỉnh kích thước hiển thị. Ảnh gốc luôn được giữ để cắt lại.</p>
      <div class="img-action-bar"><button type="button" class="btn-action-tool" id="btn_crop_${qId}" onclick="window.toggleInlineCrop(event,'${qId}')">Cắt ảnh</button><button type="button" class="btn-action-tool" onclick="window.showStudentPreview(event,'${qId}')">Xem trước</button><button type="button" class="btn-action-tool danger" onclick="window.removeImage(event,'${qId}')">Xóa ảnh</button></div>
    </div>
    <div class="thpt-image-crop" id="crop_panel_${qId}" hidden>
      <div class="thpt-image-crop-head"><strong>Cắt ảnh</strong><span>Kéo vùng chọn hoặc các góc để điều chỉnh.</span></div>
      <div class="thpt-image-crop-stage" id="crop_stage_${qId}"><img id="crop_source_${qId}" crossorigin="anonymous" alt="Nguồn ảnh để cắt"></div>
      <div class="thpt-image-crop-actions"><button type="button" class="btn-action-tool" onclick="window.cancelInlineCrop(event,'${qId}')">Hủy</button><button type="button" class="btn-action-tool success" id="btn_apply_crop_${qId}" onclick="window.applyInlineCrop(event,'${qId}')">Hoàn tất cắt</button></div>
      <p class="thpt-image-message" id="image_message_${qId}" role="status"></p>
    </div>
  </section>`;
}

export function createImageEditor({getState,getFiles,getCroppers,getCropper=()=>globalThis.Cropper}) {
  const generations=new Map();
  const element=(prefix,id)=>document.getElementById(`${prefix}_${id}`);
  const message=(id,text)=>{const box=element('image_message',id);if(box)box.textContent=text;};
  function destroy(id){const crops=getCroppers();crops[id]?.destroy();delete crops[id];generations.set(id,(generations.get(id)||0)+1);}
  function hideCrop(id){const panel=element('crop_panel',id);if(panel){panel.hidden=true;panel.closest('.thpt-image-workspace')?.classList.remove('is-cropping');}const button=element('btn_crop',id);if(button){button.textContent=getState()[id]?.cropData?'Sửa lại cắt':'Cắt ảnh';button.classList.remove('success');}const apply=element('btn_apply_crop',id);if(apply)apply.disabled=false;}
  function load(id,src,blob=null){
    destroy(id);hideCrop(id);const states=getState(),files=getFiles(),image=element('img_preview',id);if(!image)return;
    if(blob||!states[id]?.originalSrc)states[id]={originalSrc:src,originalBlob:blob,cropData:null,isNewFile:!!blob,hasChanged:!!blob};
    if(blob)files[id]=blob;
    const drop=element('drop_zone',id),wrap=element('img_wrap',id),box=element('resize_box',id);
    if(drop)drop.style.display='none';if(wrap)wrap.style.display='block';
    if(box){box.style.width='auto';box.style.height='auto';box.style.resize='horizontal';box.classList.remove('is-cropping');}
    image.onload=null;image.src=src;image.onerror=()=>message(id,'Chưa tải được ảnh. Kiểm tra lại ảnh hoặc chọn file khác.');
  }
  function cancel(event,id){event?.stopPropagation();destroy(id);hideCrop(id);}
  function remove(event,id){cancel(event,id);const image=element('img_preview',id);if(image)image.removeAttribute('src');const wrap=element('img_wrap',id);if(wrap)wrap.style.display='none';const drop=element('drop_zone',id);if(drop)drop.style.display='flex';delete getFiles()[id];delete getState()[id];}
  function start(event,id){
    event?.stopPropagation();if(getCroppers()[id])return apply(event,id);
    const state=getState()[id],source=element('crop_source',id),panel=element('crop_panel',id);if(!state?.originalSrc||!source||!panel)return;
    const Cropper=getCropper();panel.hidden=false;panel.closest('.thpt-image-workspace')?.classList.add('is-cropping');message(id,'');
    if(typeof Cropper!=='function'){message(id,'Chưa tải được công cụ cắt ảnh. Tải lại trang để thử lại.');return;}
    const generation=(generations.get(id)||0)+1;generations.set(id,generation);
    const create=()=>{
      if(generations.get(id)!==generation||getCroppers()[id]||panel.hidden)return;
      source.onload=null;
      try{
        getCroppers()[id]=new Cropper(source,{viewMode:1,dragMode:'crop',autoCropArea:1,background:false,guides:true,center:true,highlight:true,cropBoxMovable:true,cropBoxResizable:true,toggleDragModeOnDblclick:false,responsive:true,minContainerWidth:0,minContainerHeight:0,ready(){if(state.cropData)this.cropper.setData(state.cropData);}});
        element('btn_crop',id).textContent='Hoàn tất cắt';element('btn_crop',id).classList.add('success');
      }catch(_error){message(id,'Chưa mở được vùng cắt. Thử tải lại ảnh.');}
    };
    source.onload=create;source.onerror=()=>message(id,'Chưa tải được ảnh gốc để cắt.');source.src=state.originalSrc;if(source.complete&&source.naturalWidth>0)create();
  }
  function apply(event,id){
    event?.stopPropagation();const cropper=getCroppers()[id],state=getState()[id];if(!cropper||!state)return;
    const button=element('btn_apply_crop',id);if(button?.disabled)return;if(button)button.disabled=true;
    const generation=generations.get(id);
    try{
      const cropData=cropper.getData(),canvas=cropper.getCroppedCanvas({imageSmoothingEnabled:true,imageSmoothingQuality:'high',maxWidth:8192,maxHeight:8192});
      if(!canvas||!canvas.width||!canvas.height)throw new Error('Vùng cắt trống.');
      canvas.toBlob(blob=>{
        if(generations.get(id)!==generation||getState()[id]!==state)return;
        if(!blob){message(id,'Chưa xuất được ảnh cắt. Thử vùng nhỏ hơn.');if(button)button.disabled=false;return;}
        let display;try{display=canvas.toDataURL('image/png');}catch(_error){message(id,'Chưa xuất được ảnh cắt. Thử tải ảnh từ thiết bị.');if(button)button.disabled=false;return;}state.cropData=cropData;state.isNewFile=true;state.hasChanged=true;getFiles()[id]=blob;
        destroy(id);hideCrop(id);element('img_preview',id).src=display;
        const box=element('resize_box',id);box.style.width='auto';box.style.height='auto';
      },'image/png');
    }catch(_error){message(id,'Không cắt được ảnh này. Kiểm tra quyền tải ảnh hoặc thử file khác.');if(button)button.disabled=false;}
  }
  function destroyAll(){for(const id of [...new Set([...generations.keys(),...Object.keys(getCroppers())])]){destroy(id);hideCrop(id);}}
  return {load,start,apply,cancel,remove,destroyAll};
}
