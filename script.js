
/* Chapman Shop — frontend logic
   - PRODUCTS list (10 items)
   - Renders cards (3 per row via CSS)
   - CART in memory
   - +/− controls, cart view showing "Название x{qty} — {subtotal}€" and "Итого: {total}€"
   - Checkout form with required fields and behavior depending on Delivery/Pickup
   - sendOrderToBackend posts to Vercel: `${VERCEL_API_BASE}/api/sendOrder`
   - Supports Telegram.WebApp.sendData if available (SEND_MODE control)
   - "Что происходит в корзине" — см. README; основные правила отражены в коде
*/

const DELIVERY_FEE = 5.00;

// PRODUCTS
const PRODUCTS = [
  // CHERRY
  { id: "cherry-compact-single",  name: "Chapman Compact Cherry",        price: 13.5, img: "img/compact_cherry.png",        inStock: true, isNew: false },
  { id: "cherry-slims-single",    name: "Chapman Slims Cherry",          price: 13,   img: "img/slims_cherry.png",          inStock: true, isNew: true },
  { id: "cherry-compact-x10",     name: "Chapman Compact Cherry (x10)",  price: 115,  img: "img/compact_cherry_x10.png",    inStock: true, isNew: false },
  { id: "cherry-slims-x10",       name: "Chapman Slims Cherry (x10)",    price: 110,  img: "img/slims_cherry_x10.png",      inStock: true, isNew: true },

  // BROWN
  { id: "brown-compact-single",   name: "Chapman Compact Brown",         price: 11,   img: "img/compact_brown.png",         inStock: true, isNew: false },
  { id: "brown-compact-x10",      name: "Chapman Compact Brown (x10)",   price: 100,  img: "img/compact_brown_x10.png",     inStock: true, isNew: false },

  // GRAPE
  { id: "grape-compact-single",   name: "Chapman Compact Grape",         price: 12.5, img: "img/compact_grape.png",         inStock: true, isNew: true },
  { id: "grape-compact-x10",      name: "Chapman Compact Grape (x10)",   price: 110,  img: "img/compact_grape_x10.png",     inStock: true, isNew: true },

  // VANILLA
  { id: "vanilla-slims-single",   name: "Chapman Slims Vanilla",         price: 13,   img: "img/slims_vanilla.png",         inStock: true, isNew: true },
  { id: "vanilla-slims-x10",      name: "Chapman Slims Vanilla (x10)",   price: 110,  img: "img/slims_vanilla_x10.png",     inStock: true, isNew: true },

  // ICEBERRY
  { id: "iceberry-slims-single",  name: "Chapman Slims IceBerry",        price: 13,   img: "img/slims_iceberry.png",        inStock: true, isNew: true },
  { id: "iceberry-slims-x10",     name: "Chapman Slims IceBerry (x10)",  price: 110,  img: "img/slims_iceberry_x10.png",    inStock: true, isNew: true },

  // GREEN
  { id: "green-slims-single",     name: "Chapman Slims Green",           price: 13,   img: "img/slims_green.png",           inStock: true, isNew: true },
  { id: "green-slims-x10",        name: "Chapman Slims Green (x10)",     price: 110,  img: "img/slims_green_x10.png",       inStock: true, isNew: true }
];



const VERCEL_API_BASE = "https://chapman-shop.vercel.app"; 

// SEND_MODE: 'auto' uses WebApp.sendData when available, otherwise backend
// 'webapp' forces sendData, 'backend' forces fetch to Vercel
let SEND_MODE = 'auto'; // 'auto' | 'backend' | 'webapp'

/* CART structure:
   items: { [productId]: { product, qty } }
   totalItems, totalEUR
*/
const CART = { items: {}, totalItems: 0, totalEUR: 0 };
let appliedPromo = null;


function $(sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }

function formatEUR(v){ return v.toFixed(2) + "€"; }

function applyPromoDiscount(sum) {
  if (!appliedPromo) return sum;

  let discounted = sum;

  if (appliedPromo.type === 'percent') {
    discounted -= discounted * (appliedPromo.value / 100);
  }

  if (appliedPromo.type === 'fixed') {
    discounted -= appliedPromo.value;
  }

  return Math.max(0, +discounted.toFixed(2));
}
function calcDiscount(subtotal, promo) {
  if (!promo) return 0;

  if (promo.type === 'percent') {
    return subtotal * promo.value / 100;
  }

  if (promo.type === 'fixed') {
    return Math.min(promo.value, subtotal);
  }

  return 0;
}


/* RENDER PRODUCTS */
function renderProducts(){
  const container = $('#products');
  container.innerHTML = '';
  PRODUCTS.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'card';
    const disabled = !p.inStock ? 'disabled' : '';
const outBadge = !p.inStock
  ? '<div class="badge out">OUT OF STOCK</div>'
  : '';

const newBadge = p.isNew
  ? '<div class="badge new">NEW</div>'
  : '';


card.innerHTML = `
  <div class="image-wrap">
    ${outBadge}
    ${newBadge}
    <img src="${p.img}" alt="${escapeHtml(p.name)}">
  </div>

  <div class="meta">
    <div class="title">${escapeHtml(p.name)}</div>
    <div class="price">${formatEUR(p.price)}</div>
  </div>

  <div class="controls">
    <div class="qty-controls">
      <button class="btn dec" data-id="${p.id}" ${disabled}>−</button>
      <div class="qty" id="qty-${p.id}">0</div>
      <button class="btn inc" data-id="${p.id}" ${disabled}>+</button>
    </div>
    <button class="btn primary add" data-id="${p.id}" ${disabled}>
      ${p.inStock ? 'Добавить' : 'Нет в наличии'}
    </button>
  </div>
`;

    container.appendChild(card);
  });

  // attach listeners
  $all('.inc').forEach(b=>b.addEventListener('click', e=>{ addToCart(e.currentTarget.dataset.id,1) }));
  $all('.dec').forEach(b=>b.addEventListener('click', e=>{ addToCart(e.currentTarget.dataset.id,-1) }));
  $all('.add').forEach(b=>b.addEventListener('click', e=>{ addToCart(e.currentTarget.dataset.id,1) }));
}

/* Utilities */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]) }

/* CART OPERATIONS */
function addToCart(productId, delta){
  const product = PRODUCTS.find(p=>p.id===productId);
  if(!product || !product.inStock) return;
  const entry = CART.items[productId] || { product, qty:0 };
  entry.qty = Math.max(0, entry.qty + delta);
  if(entry.qty === 0) delete CART.items[productId];
  else CART.items[productId] = entry;
  recalcCart();
  updateUIForProduct(productId);
  renderCartItems();
  updateFormTotalsIfVisible();
}

function recalcCart(){
  let totalItems = 0, totalEUR = 0;
  Object.values(CART.items).forEach(e=>{
    totalItems += e.qty;
    totalEUR += e.qty * e.product.price;
  });
  CART.totalItems = totalItems;
  CART.totalEUR = totalEUR;
  const delivery = effectiveDeliveryFee();

  let discountedItems = applyPromoDiscount(totalEUR);
let sumWithDelivery = discountedItems + delivery;


  const displayedTotal = +sumWithDelivery.toFixed(2);

  $('#cart-count').textContent = totalItems;
  if($('#cart-total-eur')) $('#cart-total-eur').textContent = formatEUR(displayedTotal);
  if($('#form-total-items')) $('#form-total-items').textContent = totalItems;
  if($('#form-total-eur')) $('#form-total-eur').textContent = formatEUR(displayedTotal);
  if($('#form-delivery-fee')) $('#form-delivery-fee').textContent = formatEUR(delivery);
}

function effectiveDeliveryFee(){
  const select = $('#field-fulfill');
  if(select) return select.value === 'delivery' ? DELIVERY_FEE : 0;
  const checked = document.querySelector('input[name="fulfill"]:checked');
  return checked && checked.value === 'delivery' ? DELIVERY_FEE : 0;
}

function updateUIForProduct(productId){
  const qtyElem = document.getElementById(`qty-${productId}`);
  const entry = CART.items[productId];
  if(qtyElem) qtyElem.textContent = entry ? entry.qty : 0;
}

/* RENDER CART ITEMS: lines "Название x{qty} — {subtotal}€" */
function renderCartItems(){
  const container = $('#cart-items');
  container.innerHTML = '';
  if(Object.keys(CART.items).length === 0){
    container.innerHTML = '<div style="color:var(--muted)">Корзина пуста</div>';
    return;
  }
  Object.values(CART.items).forEach(e=>{
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${e.product.img}" alt="${escapeHtml(e.product.name)}" />
      <div style="flex:1">
        <div style="font-weight:700">${escapeHtml(e.product.name)}</div>
         <div class="muted">x${e.qty} — ${formatEUR(e.product.price * e.qty)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <div class="qty-controls">
          <button class="btn dec-small" data-id="${e.product.id}">−</button>
          <div style="min-width:28px;text-align:center">${e.qty}</div>
          <button class="btn inc-small" data-id="${e.product.id}">+</button>
        </div>
        <div style="font-weight:700">${formatEUR(e.product.price * e.qty)}</div>
      </div>
    `;
    container.appendChild(row);
  });

  $all('.inc-small').forEach(b=>b.addEventListener('click', e=>addToCart(e.currentTarget.dataset.id,1)));
  $all('.dec-small').forEach(b=>b.addEventListener('click', e=>addToCart(e.currentTarget.dataset.id,-1)));
}

/* CHECKOUT / FORM handling */

/* gather order including customer data and address/pickup */
function gatherOrderWithCustomer(){
  const items = Object.values(CART.items).map(e=>({
    id: e.product.id,
    name: e.product.name,
    qty: e.qty,
    unit: e.product.price,
    subtotal: +(e.qty * e.product.price).toFixed(2)
  }));

  const name = $('#field-name') ? $('#field-name').value.trim() : '';
  const nick = $('#field-nick') ? $('#field-nick').value.trim() : '';
  const payment = $('#field-payment') ? $('#field-payment').value : '';
  const fulfill = $('#field-fulfill') ? $('#field-fulfill').value : 'pickup';
  const note = $('#field-note') ? $('#field-note').value.trim() : '';
  const deliveryCost = (fulfill === 'delivery') ? DELIVERY_FEE : 0.00;
  let total = applyPromoDiscount(CART.totalEUR) + deliveryCost;



  const address = {};
  if(fulfill === 'delivery'){
    address.rec_first = $('#field-rec-first') ? $('#field-rec-first').value.trim() : '';
    address.rec_last  = $('#field-rec-last') ? $('#field-rec-last').value.trim() : '';
    address.street    = $('#field-street') ? $('#field-street').value.trim() : '';
    address.house     = $('#field-house') ? $('#field-house').value.trim() : '';
    address.postcode  = $('#field-postcode') ? $('#field-postcode').value.trim() : '';
    address.city      = $('#field-city') ? $('#field-city').value.trim() : '';
    address.email     = $('#field-email') ? $('#field-email').value.trim() : '';
  } else {
    address.pickup_city = $('#field-pickup-city') ? $('#field-pickup-city').value : '';
  }

  return {
    items,
    customer: { name, nick, payment },
    fulfill,
    address,
    deliveryCost,
    total,
    note,
    createdAt: (new Date()).toISOString(),
    promo: appliedPromo
  ? { code: appliedPromo.code, type: appliedPromo.type, value: appliedPromo.value }
  : null,

  };
}

/* Create readable orderText for admin (HTML) */
function makeOrderText(order){
  const c = order.customer || {};
  const a = order.address || {};
  const lines = [];
  lines.push(`<b>Новый заказ — Chapman Shop</b>`);
  lines.push(`⏱ ${order.createdAt}`);
  lines.push('');
  lines.push(`<b>Клиент:</b> ${escapeHtml(c.name || '—')}`);
  lines.push(`<b>Ник:</b> ${escapeHtml(c.nick || '—')}`);
  lines.push(`<b>Оплата:</b> ${escapeHtml(c.payment || '—')}`);
  lines.push(`<b>Получение:</b> ${escapeHtml(order.fulfill)}`);
  if(order.fulfill === 'delivery'){
    lines.push(`<b>Адрес доставки:</b> ${escapeHtml(a.rec_first || '')} ${escapeHtml(a.rec_last || '')}, ${escapeHtml(a.street || '')} ${escapeHtml(a.house || '')}, ${escapeHtml(a.postcode || '')} ${escapeHtml(a.city || '')}`);
    lines.push(`<b>Email:</b> ${escapeHtml(a.email || '')}`);
  } else {
    lines.push(`<b>Самовывоз в городе:</b> ${escapeHtml(a.pickup_city || '')}`);
  }
  lines.push('');
  lines.push('<b>Состав заказа:</b>');
  order.items.forEach(it=>{
    lines.push(`${escapeHtml(it.name)} — x${it.qty} — ${formatEUR(it.subtotal)}`);
  });
  if(order.deliveryCost) lines.push(`Доставка: ${formatEUR(order.deliveryCost)}`);
  if (order.promo) {
  lines.push(
    `Промокод: ${escapeHtml(order.promo.code)} (${order.promo.type === 'percent'
      ? `-${order.promo.value}%`
      : `-${formatEUR(order.promo.value)}`
    })`
  );
}

  lines.push(`<b>Итого: ${formatEUR(order.total)}</b>`);
  if(order.note) lines.push(`\nКомментарий: ${escapeHtml(order.note)}`);
  lines.push('\n---\n');
  return lines.join('\n');
}
//promo function
async function applyPromo() {
  const input = document.getElementById('promo-input');
  const msg = document.getElementById('promo-message');

  const code = input.value.trim().toUpperCase();
  if (!code) return;

  msg.textContent = 'Проверяем промокод…';
  msg.className = 'promo-message';

  try {
    const res = await fetch(`${VERCEL_API_BASE}/api/apply-promo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.error || 'Неверный промокод';
      msg.classList.add('error');
      return;
    }

    appliedPromo = data;

    const cartSubtotal = CART.totalEUR;
    const discount = calcDiscount(cartSubtotal, appliedPromo);

    msg.textContent =
      `Промокод ${code} — −${appliedPromo.value}% (экономия ${discount.toFixed(2)}€)`;

    msg.classList.add('success');

    input.disabled = true;
    document.getElementById('apply-promo-btn').disabled = true;

    recalcCart();
    renderCartItems();
    updateFormTotalsIfVisible();

  } catch (e) {
    msg.textContent = 'Ошибка сервера';
    msg.classList.add('error');
  }
}


/* Send via Vercel backend */
async function sendOrderToBackend(payload){
  try{
    const resp = await fetch(`${VERCEL_API_BASE}/api/sendOrder`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
  order: payload.order,
  promo: payload.promo,
  source: 'web'
})

    });
    return await resp.json();
  }catch(err){
    return { error: String(err) };
  }
}

/* Dispatch: WebApp.sendData or backend (fetch) */
async function dispatchOrder(orderObj){
  const orderText = makeOrderText(orderObj);
  // If forced to webapp or auto-detect
  if(SEND_MODE === 'webapp' || (SEND_MODE === 'auto' && window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.sendData === 'function')){
    try{
      // For WebApp path, send structured payload to bot via sendData
      window.Telegram.WebApp.sendData(JSON.stringify({ type:'order', payload: orderObj }));
      return { ok:true, via:'webapp' };
    }catch(err){
      console.warn('WebApp.sendData failed, falling back to backend', err);
    }
  }
  // Default: backend
  const res = await sendOrderToBackend({
  order: orderText,
  promo: orderObj.promo
});

  return res;
}

/* Validation */
function showError(msg){ alert(msg) }

function validateCheckoutForm(){
  const nameEl = $('#field-name');
  const nickEl = $('#field-nick');
  const paymentEl = $('#field-payment');
  const fulfillEl = $('#field-fulfill');
  if(!nameEl || !nickEl || !paymentEl || !fulfillEl){
    showError('Форма оформления не загружена корректно.');
    return false;
  }
  const name = nameEl.value.trim();
  const nick = nickEl.value.trim();
  const payment = paymentEl.value;
  const fulfill = fulfillEl.value;
  if(!name){ showError('Пожалуйста, укажите ваше имя.'); nameEl.focus(); return false; }
  if(!nick){ showError('Пожалуйста, укажите ваш ник в Telegram.'); nickEl.focus(); return false; }
  if(!payment){ showError('Выберите способ оплаты.'); paymentEl.focus(); return false; }
  if(!fulfill){ showError('Выберите способ получения.'); fulfillEl.focus(); return false; }

  if(fulfill === 'delivery'){
    const recFirst = $('#field-rec-first').value.trim();
    const recLast  = $('#field-rec-last').value.trim();
    const street   = $('#field-street').value.trim();
    const house    = $('#field-house').value.trim();
    const postcode = $('#field-postcode').value.trim();
    const city     = $('#field-city').value.trim();
    const email    = $('#field-email').value.trim();
    if(!recFirst){ showError('Введите имя получателя.'); $('#field-rec-first').focus(); return false; }
    if(!recLast){ showError('Введите фамилию получателя.'); $('#field-rec-last').focus(); return false; }
    if(!street){ showError('Введите улицу.'); $('#field-street').focus(); return false; }
    if(!house){ showError('Введите номер дома.'); $('#field-house').focus(); return false; }
    if(!postcode){ showError('Введите Postcode.'); $('#field-postcode').focus(); return false; }
    if(!city){ showError('Введите город.'); $('#field-city').focus(); return false; }
    if(!email){ showError('Введите email.'); $('#field-email').focus(); return false; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRe.test(email)){ showError('Введите корректный email.'); $('#field-email').focus(); return false; }
  } else {
    const val = $('#field-pickup-city') ? $('#field-pickup-city').value : '';
    if(!val){ showError('Пожалуйста, выберите город самовывоза.'); if($('#field-pickup-city')) $('#field-pickup-city').focus(); return false; }
  }

  if(CART.totalItems === 0){ showError('Корзина пуста. Добавьте товар.'); return false; }

  return true;
}

/* Form UI show/hide */
function openCheckoutForm(){
  const form = $('#checkout-form');
  if(!form) return;

  $('#cart-actions').classList.add('hidden');
  form.classList.remove('hidden');

  // 🔥 КРИТИЧНО
  const panel = $('#cart-panel');
  panel.scrollTop = 0;

  // убираем автофокус
  if (document.activeElement) {
    document.activeElement.blur();
  }

  syncFormFieldsVisibility();
  updateFormTotalsIfVisible();
}


function closeCheckoutForm(){
  const form = $('#checkout-form');
  if(!form) return;
  form.classList.add('hidden');
  $('#cart-actions').classList.remove('hidden');
}

function syncFormFieldsVisibility(){
  const fulfillEl = $('#field-fulfill');
  if(!fulfillEl) return;
  const val = fulfillEl.value;
  const deliveryBlock = $('#delivery-fields');
  const pickupBlock = $('#pickup-fields');
  if(val === 'delivery'){
    if(deliveryBlock) deliveryBlock.classList.remove('hidden');
    if(pickupBlock) pickupBlock.classList.add('hidden');
    setRequired('#delivery-fields input', true);
    setRequired('#pickup-fields select', false);
  } else {
    if(deliveryBlock) deliveryBlock.classList.add('hidden');
    if(pickupBlock) pickupBlock.classList.remove('hidden');
    setRequired('#delivery-fields input', false);
    setRequired('#pickup-fields select', true);
  }
  recalcCart();
  updateFormTotalsIfVisible();
}

function setRequired(selector, required){
  const nodeList = document.querySelectorAll(selector);
  nodeList.forEach(n=>{ if(required) n.setAttribute('required','required'); else n.removeAttribute('required'); });
}

function updateFormTotalsIfVisible(){
  const form = $('#checkout-form');
  if(!form || form.classList.contains('hidden')) return;
  const delivery = effectiveDeliveryFee();
  if($('#form-total-items')) $('#form-total-items').textContent = CART.totalItems;
  if($('#form-delivery-fee')) $('#form-delivery-fee').textContent = formatEUR(delivery);
  let discountedItems = applyPromoDiscount(CART.totalEUR);
let total = discountedItems + delivery;


if($('#form-total-eur'))
  $('#form-total-eur').textContent = formatEUR(total);

}

/* Submit order */
async function handleSubmitOrder(){
  if(!validateCheckoutForm()) return;
  const orderObj = gatherOrderWithCustomer();
  const preview = buildPreviewText(orderObj);
  if(!confirm(preview + "\n\nОтправить заказ?")) return;

  const submitBtn = $('#submit-order');
  submitBtn.disabled = true;
  try{
    const res = await dispatchOrder(orderObj);
    if(res && res.ok){
      alert('Заказ успешно отправлен. Спасибо!');
      clearCart();
      closeCheckoutForm();
      showCart(false);
    } else {
      const msg = res && res.error ? res.error : 'Ошибка отправки';
      showError('Не удалось отправить заказ: ' + msg);
    }
  }catch(err){
    showError('Ошибка при отправке заказа: ' + String(err));
  }finally{
    submitBtn.disabled = false;
  }
}

function buildPreviewText(order){
  const lines = [];
  lines.push('Проверьте заказ:');
  lines.push(`Клиент: ${order.customer.name} (${order.customer.nick})`);
  lines.push(`Оплата: ${order.customer.payment}`);
  lines.push(`Получение: ${order.fulfill}`);
  if(order.fulfill === 'delivery'){
    const a = order.address;
    lines.push(`Адрес: ${a.rec_first} ${a.rec_last}, ${a.street} ${a.house}, ${a.postcode} ${a.city}`);
    lines.push(`Email: ${a.email}`);
  } else {
    lines.push(`Самовывоз: ${order.address.pickup_city || '—'}`);
  }
  lines.push('Состав:');
  order.items.forEach(it=> lines.push(` - ${it.name} x${it.qty} = ${formatEUR(it.subtotal)}`));
  if(order.deliveryCost) lines.push(`Доставка: ${formatEUR(order.deliveryCost)}`);
  lines.push(`Итого: ${formatEUR(order.total)}`);
  if(order.note) lines.push(`Комментарий: ${order.note}`);
  return lines.join('\n');
}

/* UI hooks and initialization */
function setupUI(){
  renderProducts();
  renderCartItems();
  recalcCart();

  $('#open-cart').addEventListener('click', ()=>{ showCart(true) });
  $('#close-cart').addEventListener('click', ()=>{ showCart(false) });
  const promoBtn = document.getElementById('apply-promo-btn');
  if (promoBtn) {
    promoBtn.addEventListener('click', applyPromo);
  }

  const toCheckout = $('#to-checkout') || $('#checkout');
  if(toCheckout) toCheckout.addEventListener('click', ()=>{
    if(CART.totalItems === 0){ alert('Добавьте товар в корзину'); return; }
    openCheckoutForm();
  });
  
  const fulfillSelect = $('#field-fulfill');
  if(fulfillSelect) fulfillSelect.addEventListener('change', syncFormFieldsVisibility);

  const submitBtn = $('#submit-order');
  if(submitBtn) submitBtn.addEventListener('click', handleSubmitOrder);

  const cancelBtn = $('#cancel-order');
  if(cancelBtn) cancelBtn.addEventListener('click', ()=>{ closeCheckoutForm(); });

  $all('input[name="fulfill"]').forEach(i=>i.addEventListener('change', recalcCart));

  $('#close-cart').addEventListener('click', ()=>{
    closeCheckoutForm();
    showCart(false);
  });

  syncFormFieldsVisibility();
  updateFormTotalsIfVisible();
}

function showCart(show){
  const panel = $('#cart-panel');

  if(show){
    document.body.classList.add('locked');

    panel.classList.remove('hidden');
    panel.setAttribute('aria-hidden','false');

    panel.scrollTop = 0;
    if (document.activeElement) document.activeElement.blur();
  }else{
    document.body.classList.remove('locked');

    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden','true');
  }
}


function clearCart(){
  CART.items = {};
  CART.totalItems = 0;
  CART.totalEUR = 0;
  if($('#field-note')) $('#field-note').value = '';
  if($('#customer-note')) $('#customer-note').value = '';
  if($('#checkout-form')) {
    const form = $('#checkout-form');
    form.querySelectorAll('input, textarea, select').forEach(el=>{
      if(el.type === 'select-one') {
        if(el.id === 'field-payment') el.value = el.querySelector('option') ? el.querySelector('option').value : '';
        if(el.id === 'field-fulfill') el.value = 'pickup';
        else el.value = '';
      } else {
        el.value = '';
      }
    });
  }
  recalcCart();
  renderCartItems();
  PRODUCTS.forEach(p=>updateUIForProduct(p.id));
  appliedPromo = null;

const promoInput = document.getElementById('promo-input');
const promoBtn = document.getElementById('apply-promo-btn');
const promoMsg = document.getElementById('promo-message');

if (promoInput) promoInput.disabled = false;
if (promoBtn) promoBtn.disabled = false;
if (promoMsg) promoMsg.textContent = '';

}

/* Init */
document.addEventListener('DOMContentLoaded', ()=>{
  setupUI();
});

/* Expose for debugging/testing */
window.CHAPMAN = { PRODUCTS, CART, addToCart, gatherOrderWithCustomer, dispatchOrder, setSendMode: (m)=>{ SEND_MODE = m } };

/* End of script.js */
