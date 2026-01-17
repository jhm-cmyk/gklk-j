// ==========================================
// اتصال Firebase (السحابي)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC6-ls0OT4aYCetC8v1dYR1VzBqXwQXEig",
    authDomain: "yjhgfds-e7260.firebaseapp.com",
    databaseURL: "https://ghjkl-bc739-default-rtdb.firebaseio.com",
    projectId: "yjhgfds-e7260",
    storageBucket: "yjhgfds-e7260.firebasestorage.app",
    messagingSenderId: "699051664281",
    appId: "1:699051664281:web:e7d531e67f8b63f5332908"
};

// تهيئة الاتصال
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database, 'noorHusseinDB');

// ==========================================
// إعدادات النظام والثوابت
// ==========================================
const ADMIN_PIN = "1972";
const DELETE_PIN = "121";
let db = JSON.parse(localStorage.getItem('noorHusseinDB')) || { customers: [] };
let activeCustomer = null;
let currentCart = [];
let targetCustomerId = null;

// ==========================================
// نقطة البداية (Boot Sequence)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupFirebaseSync();
});

function initApp() {
    hideAllScreens();
    const urlParams = new URLSearchParams(window.location.search);
    const linkedId = urlParams.get('id');

    if (linkedId) {
        targetCustomerId = parseInt(linkedId);
        // التحقق المحلي السريع
        const customer = db.customers.find(c => c.id === targetCustomerId);
        if (customer) {
            document.getElementById('client-welcome-name').innerText = customer.name;
            showScreen('screen-client-login');
            hideSplash();
        } else {
            // ننتظر التحميل من السيرفر
            const splash = document.getElementById('splash-screen');
            if(splash) splash.style.display = 'flex';
        }
    } else {
        // مسار الأدمن
        showScreen('screen-admin-login');
        hideSplash();
    }
}

function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if(splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.style.display = 'none', 500);
    }
}

// --- مزامنة البيانات ---
function setupFirebaseSync() {
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            db = data;
            localStorage.setItem('noorHusseinDB', JSON.stringify(db));
            
            if (targetCustomerId) {
                const customer = db.customers.find(c => c.id === targetCustomerId);
                if (customer) {
                    document.getElementById('client-welcome-name').innerText = customer.name;
                    showScreen('screen-client-login');
                    hideSplash();
                } else {
                    // إذا لم يتم العثور عليه حتى بعد التحديث
                    const splash = document.getElementById('splash-screen');
                    // لا نخفي الشاشة فوراً، ننتظر قليلاً للتأكد
                    if (splash && splash.style.display !== 'none') {
                         setTimeout(() => {
                             alert('الرابط غير صالح أو تم حذف الحساب.');
                             window.location.href = window.location.pathname; // إعادة توجيه للرئيسية
                         }, 2000);
                    }
                }
            }

            if (activeCustomer) {
                const updatedCustomer = db.customers.find(c => c.id === activeCustomer.id);
                if (updatedCustomer) {
                    activeCustomer = updatedCustomer;
                    refreshAdminViews();
                }
            }
            renderCustomerList();
            calculateGlobalDebt();
        }
    });
}

function showScreen(screenId) {
    hideAllScreens();
    const screen = document.getElementById(screenId);
    if(screen) screen.classList.add('active-screen');
}

function hideAllScreens() {
    document.querySelectorAll('.app-section').forEach(el => {
        el.classList.remove('active-screen');
    });
}

// ==========================================
// منطق الزبون
// ==========================================
function checkClientLogin() {
    const pass = document.getElementById('clientPassInput').value;
    const customer = db.customers.find(c => c.id === targetCustomerId);
    
    if (customer && customer.password === pass) {
        showScreen('screen-client-view');
        fillClientViewData(customer);
    } else {
        alert("كلمة المرور غير صحيحة!");
        document.getElementById('clientPassInput').value = '';
    }
}

function fillClientViewData(c) {
    document.getElementById('cvName').innerText = c.name;
    const debt = c.totalSales - c.totalPaid;
    document.getElementById('cvSales').innerText = c.totalSales.toLocaleString();
    document.getElementById('cvPaid').innerText = c.totalPaid.toLocaleString();
    document.getElementById('cvDebt').innerText = debt.toLocaleString();

    const list = document.getElementById('cvTransList');
    list.innerHTML = '';
    const transactions = c.transactions || [];
    
    [...transactions].reverse().forEach(t => {
        let details = '';
        if (t.type === 'sale') {
            details = `<div style="font-size:11px; color:#666; margin-top:4px;">${t.items.map(i => i.name).join(' + ')}</div>`;
        }
        list.innerHTML += `
            <div style="background:white; padding:12px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:bold; color:${t.type === 'sale' ? '#c0392b' : '#27ae60'}">
                        ${t.type === 'sale' ? '<i class="fas fa-file-invoice"></i> فاتورة' : '<i class="fas fa-money-bill-wave"></i> تسديد'}
                    </div>
                    <div style="font-weight:bold; font-size:1.1rem;">${t.amount.toLocaleString()}</div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                     <div style="font-size:11px; color:#999;">${t.date}</div>
                </div>
                ${details}
            </div>
        `;
    });
}

// ==========================================
// منطق الأدمن
// ==========================================
function checkAdminLogin() {
    const pin = document.getElementById('adminPinInput').value;
    if (pin === ADMIN_PIN) {
        showScreen('screen-admin-app');
        hideSplash();
        renderCustomerList();
    } else {
        alert("الرمز السري غير صحيح");
        document.getElementById('adminPinInput').value = '';
    }
}

function switchTab(tabId) {
    if ((tabId === 'tab-invoice' || tabId === 'tab-payment' || tabId === 'tab-reports') && !activeCustomer) {
        alert('الرجاء اختيار زبون من القائمة أولاً');
        switchTab('tab-customers');
        return;
    }
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    // محاولة تفعيل الزر في النافبار
    const navBtn = document.querySelector(`a[onclick="switchTab('${tabId}')"]`);
    if(navBtn) navBtn.classList.add('active');
}

function printCustomerReport() {
    if (!activeCustomer) return alert('لا يوجد زبون محدد للطباعة');
    window.print();
}

// --- إدارة الزبائن ---
function openAddCustomerModal() { document.getElementById('addCustomerModal').style.display = 'block'; }
function closeAddCustomerModal() { document.getElementById('addCustomerModal').style.display = 'none'; }

function confirmAddCustomer() {
    const name = document.getElementById('newCName').value;
    const phone = document.getElementById('newCPhone').value;
    const pass = document.getElementById('newCPass').value;
    if (!name || !pass) return alert("الاسم وكلمة المرور مطلوبان");

    const newC = {
        id: Date.now(),
        name: name,
        phone: phone,
        password: pass,
        totalSales: 0,
        totalPaid: 0,
        transactions: []
    };
    db.customers.push(newC);
    saveData();
    renderCustomerList();
    document.getElementById('newCName').value = '';
    document.getElementById('newCPhone').value = '';
    document.getElementById('newCPass').value = '';
    closeAddCustomerModal();
    selectCustomer(newC.id);
}

function renderCustomerList(filterText = '') {
    calculateGlobalDebt();
    const list = document.getElementById('customerListContainer');
    list.innerHTML = '';
    const filtered = db.customers.filter(c => c.name.includes(filterText));
    filtered.forEach(c => {
        const debt = c.totalSales - c.totalPaid;
        const div = document.createElement('div');
        div.className = 'customer-item';
        div.onclick = () => selectCustomer(c.id);
        div.innerHTML = `<div><strong>${c.name}</strong><br><small style="color:${debt > 0 ? 'red' : 'green'}">الدين: ${debt.toLocaleString()}</small></div><i class="fas fa-chevron-left" style="color:#ccc"></i>`;
        list.appendChild(div);
    });
}

function filterCustomers() { renderCustomerList(document.getElementById('customerSearchInput').value); }

function selectCustomer(id) {
    activeCustomer = db.customers.find(c => c.id === id);
    document.getElementById('headerCustomerName').innerText = activeCustomer.name;
    const baseUrl = window.location.href.split('?')[0];
    document.getElementById('customerShareLink').value = `${baseUrl}?id=${activeCustomer.id}`;
    refreshAdminViews();
    switchTab('tab-invoice');
}

function clearSelection() {
    activeCustomer = null;
    document.getElementById('headerCustomerName').innerText = 'لم يتم التحديد';
    switchTab('tab-customers');
}

function copyLink() {
    const linkInput = document.getElementById('customerShareLink');
    linkInput.select();
    document.execCommand("copy");
    alert("تم نسخ الرابط!");
}

function deleteCustomer() {
    if (!activeCustomer) return;
    const pin = prompt("للحذف النهائي (121):");
    if (pin === DELETE_PIN) {
        db.customers = db.customers.filter(c => c.id !== activeCustomer.id);
        saveData();
        clearSelection();
        calculateGlobalDebt();
        alert("تم حذف الزبون.");
    } else {
        alert("رمز الحذف خاطئ!");
    }
}

// --- عمليات البيع ---
function addItemToCart() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const qty = parseFloat(document.getElementById('itemQty').value) || 1;
    
    if (!name || !price) return alert("الرجاء إدخال المادة والسعر");
    
    currentCart.push({ name, price, qty, total: price * qty });
    document.getElementById('itemName').value = '';
    document.getElementById('itemName').focus();
    renderCart();
}

function renderCart() {
    const tbody = document.querySelector('#cartTable tbody');
    tbody.innerHTML = '';
    let total = 0;
    currentCart.forEach((item, idx) => {
        total += item.total;
        tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.price}</td><td>${item.qty}</td><td onclick="removeFromCart(${idx})" style="color:red; cursor:pointer; font-weight:bold;">X</td></tr>`;
    });
    document.getElementById('cartTotal').innerText = total.toLocaleString();
}
function removeFromCart(idx) { currentCart.splice(idx, 1); renderCart(); }

function saveInvoice() {
    // إصلاح مشكلة عدم الاستجابة: التحقق من وجود الزبون
    if (!activeCustomer) return alert("خطأ: لم يتم تحديد زبون، يرجى العودة للقائمة واختيار الزبون.");
    
    if (!currentCart || currentCart.length === 0) return alert('السلة فارغة!');

    // ضمان وجود المصفوفة والقيم
    if (!activeCustomer.transactions) activeCustomer.transactions = [];
    if (typeof activeCustomer.totalSales !== 'number') activeCustomer.totalSales = 0;

    const totalAmount = currentCart.reduce((sum, i) => sum + i.total, 0);
    activeCustomer.totalSales += totalAmount;
    
    activeCustomer.transactions.push({
        type: 'sale',
        date: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}),
        items: [...currentCart],
        amount: totalAmount
    });
    
    saveData();
    currentCart = [];
    renderCart();
    
    alert('تم الحفظ بنجاح');
    switchTab('tab-reports');
    refreshAdminViews();
    calculateGlobalDebt();
}

// --- عمليات التسديد ---
function processPayment() {
    if (!activeCustomer) return alert("خطأ: لم يتم تحديد زبون");
    const amount = parseFloat(document.getElementById('paymentInput').value);
    if (!amount) return alert('أدخل المبلغ الواصل');

    if (!activeCustomer.transactions) activeCustomer.transactions = [];
    if (typeof activeCustomer.totalPaid !== 'number') activeCustomer.totalPaid = 0;

    activeCustomer.totalPaid += amount;
    activeCustomer.transactions.push({
        type: 'pay',
        date: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}),
        amount: amount
    });
    
    saveData();
    document.getElementById('paymentInput').value = '';
    alert('تم التسديد');
    refreshAdminViews();
    calculateGlobalDebt();
}

function refreshAdminViews() {
    if (!activeCustomer) return;
    const currentDebt = activeCustomer.totalSales - activeCustomer.totalPaid;
    document.getElementById('currentDebtDisplay').innerText = currentDebt.toLocaleString();
    document.getElementById('repSales').innerText = activeCustomer.totalSales.toLocaleString();
    document.getElementById('repPaid').innerText = activeCustomer.totalPaid.toLocaleString();
    document.getElementById('repDebt').innerText = currentDebt.toLocaleString();
    
    const list = document.getElementById('transList');
    list.innerHTML = '';
    
    const transactions = activeCustomer.transactions || [];

    [...transactions].reverse().forEach(t => {
        let details = '';
        if (t.type === 'sale') {
            details = `<div style="font-size:11px; color:#666;">${t.items.map(i => i.name).join(' + ')}</div>`;
        }
        list.innerHTML += `
            <div style="background:white; padding:10px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; color:${t.type === 'sale' ? 'red' : 'green'}">
                    <strong>${t.type === 'sale' ? 'فاتورة' : 'تسديد'}</strong>
                    <span>${t.amount.toLocaleString()}</span>
                </div>
                <small style="color:#aaa;">${t.date}</small>
                ${details}
            </div>
        `;
    });
}

// --- دالة الحفظ المركزية ---
function saveData() { 
    localStorage.setItem('noorHusseinDB', JSON.stringify(db)); 
    set(dbRef, db)
        .then(() => console.log("تمت المزامنة"))
        .catch((e) => console.log("خطأ في المزامنة، تم الحفظ محلياً", e));
}

function calculateGlobalDebt() {
    const total = db.customers.reduce((acc, c) => acc + (c.totalSales - c.totalPaid), 0);
    const el = document.getElementById('sysTotalDebt');
    if (el) el.innerText = total.toLocaleString();
}

// ==========================================
// ربط الدوال بالنافذة (مهم جداً)
// ==========================================
window.checkAdminLogin = checkAdminLogin;
window.checkClientLogin = checkClientLogin;
window.switchTab = switchTab;
window.printCustomerReport = printCustomerReport;
window.openAddCustomerModal = openAddCustomerModal;
window.closeAddCustomerModal = closeAddCustomerModal;
window.confirmAddCustomer = confirmAddCustomer;
window.filterCustomers = filterCustomers;
window.clearSelection = clearSelection;
window.copyLink = copyLink;
window.deleteCustomer = deleteCustomer;
window.addItemToCart = addItemToCart;
window.removeFromCart = removeFromCart;
window.saveInvoice = saveInvoice;
window.processPayment = processPayment;
