(() => {
'use strict';
const form=document.querySelector('#orderForm'),steps=[...document.querySelectorAll('.step')],items=[...document.querySelectorAll('#stepList li')],packages=document.querySelector('#packages');
let current=0,serial=0;
const message=document.querySelector('#formMessage');
function show(index,focus=true){current=index;steps.forEach((s,i)=>s.hidden=i!==index);items.forEach((li,i)=>{li.className=i<index?'done':i===index?'active':'';li.querySelector('.step-number').textContent=i<index?'✓':String(i+1);if(i===index)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});document.querySelector('#stepCount').textContent=`Step ${index+1} of 6`;document.querySelector('#progressFill').style.width=`${(index+1)/6*100}%`;document.querySelector('.progress-track').setAttribute('aria-valuenow',index+1);document.querySelector('#back').disabled=index===0;document.querySelector('#next').textContent=index===5?'Submit Order':'Continue';message.textContent='';if(index===5)review();if(focus)steps[index].querySelector('h2').focus();}
function validate(section){let first=null;section.querySelectorAll('input,select,textarea').forEach(el=>{if(el.disabled)return;if(el.type==='text'&&el.required)el.value=el.value.trim();const valid=el.checkValidity();el.setAttribute('aria-invalid',String(!valid));const error=el.closest('.field')?.querySelector('.error');if(error)error.textContent=valid?'':el.validationMessage;if(!valid&&!first)first=el;});if(first){first.focus();message.textContent='Please check the highlighted fields before continuing.';}return !first;}
form.addEventListener('submit',e=>{e.preventDefault();if(!validate(steps[current]))return;if(current<5)show(current+1);else{for(let i=0;i<5;i++){if(!validate(steps[i])){show(i);validate(steps[i]);return;}}message.textContent='Online submission is not available yet. Your order has not been sent or saved. Please contact our team to arrange your shipment.';}});
document.querySelector('#back').addEventListener('click',()=>show(Math.max(0,current-1)));
form.addEventListener('input',e=>{const el=e.target;if(el.hasAttribute('aria-invalid')){el.removeAttribute('aria-invalid');const error=el.closest('.field')?.querySelector('.error');if(error)error.textContent='';}});
function addPackage(){serial++;const id=serial,box=document.createElement('section');box.className='package';const fields=[['description','Package contents','text','',''],['quantity','Number of pieces','number','min="1" step="1"','1'],['weight','Weight per piece (kg)','number','min="0.01" step="0.01"',''],['value','Declared value per piece','number','min="0" step="0.01"',''],['length','Length per piece (cm)','number','min="0.1" step="0.1"',''],['width','Width per piece (cm)','number','min="0.1" step="0.1"',''],['height','Height per piece (cm)','number','min="0.1" step="0.1"','']];box.innerHTML='<div class="package-head"><h3></h3><button class="remove" type="button">Remove</button></div><div class="grid">'+fields.map(([key,label,type,attrs,value])=>`<label class="field"><span>${label} <b>*</b></span><input name="package_${id}_${key}" type="${type}" ${attrs} value="${value}" required><small class="error"></small></label>`).join('')+'</div>';box.querySelector('.remove').addEventListener('click',()=>{box.remove();numberPackages();});packages.append(box);numberPackages();if(serial>1)box.querySelector('input').focus();}
function numberPackages(){[...packages.children].forEach((box,i)=>{box.querySelector('h3').textContent=`Package ${i+1}`;box.querySelector('.remove').hidden=packages.children.length===1;box.querySelector('.remove').setAttribute('aria-label',`Remove package ${i+1}`);});}
document.querySelector('#addPackage').addEventListener('click',addPackage);
const date=form.elements.pickupDate;const now=new Date();date.min=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
function collection(){const pickup=form.elements.collection.value==='Pickup';document.querySelector('#pickupFields').hidden=!pickup;document.querySelectorAll('#pickupFields input').forEach(el=>el.disabled=!pickup);document.querySelector('#collectionNote').textContent=form.elements.collection.value==='Drop-off'?'Our team will confirm the drop-off location and opening hours with you.':'Your preferred pickup date is subject to confirmation by our team.';}
form.elements.collection.addEventListener('change',collection);
function review(){const target=document.querySelector('#review');target.replaceChildren();steps.slice(0,5).forEach((step,i)=>{const section=document.createElement('section');section.className='review-section';const head=document.createElement('div');head.className='review-heading';const title=document.createElement('h3');title.textContent=step.dataset.title;const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.setAttribute('aria-label',`Edit ${step.dataset.title}`);edit.onclick=()=>show(i);head.append(title,edit);section.append(head);const dl=document.createElement('dl');step.querySelectorAll('input,select,textarea').forEach(el=>{if(el.disabled||!el.value)return;const row=document.createElement('div');row.className='review-row';const dt=document.createElement('dt'),dd=document.createElement('dd');const pkg=el.closest('.package');dt.textContent=(pkg?pkg.querySelector('h3').textContent+' · ':'')+(el.closest('label')?.querySelector('span')?.textContent||el.name).replace(' *','');dd.textContent=el.value;row.append(dt,dd);dl.append(row);});section.append(dl);target.append(section);});}
const header=document.querySelector('#siteHeader');const onScroll=()=>header.classList.toggle('is-scrolled',window.scrollY>24);onScroll();window.addEventListener('scroll',onScroll,{passive:true});
const toggle=document.querySelector('#navToggle'),menu=document.querySelector('#mobileMenu');const setMenu=(open)=>{toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');menu.hidden=!open;if(open)header.classList.add('is-scrolled');else onScroll();};
toggle.addEventListener('click',()=>setMenu(menu.hidden));
document.querySelectorAll('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
window.addEventListener('resize',()=>{if(window.innerWidth>1024)setMenu(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false);});
addPackage();collection();show(0,false);
})();

// Shared footer behaviour, scoped to this page.
document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector("#newsletterForm").addEventListener("submit", function(event) {
  event.preventDefault();
  const input = document.querySelector("#newsletterEmail");
  input.required = true;
  if (!input.reportValidity()) return;
  document.querySelector("#newsletterMsg").textContent = "Newsletter signup is not connected yet. Please contact our team for updates.";
});
