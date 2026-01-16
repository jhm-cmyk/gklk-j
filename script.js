{
type: uploaded file
fileName: --main.zip/--main/script.js
fullContent:
// ==========================================
// اتصال Firebase (السحابي)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC6-ls0OT4aYCetC8v1dYR1VzBqXwQXEig",
    authDomain: "yjhgfds-e7260.firebaseapp.com",
    // تم تحديث الرابط هنا للرابط الجديد الذي أرسلته
    databaseURL: "https://ghjkl-bc739-default-rtdb.firebaseio.com",
    projectId: "yjhgfds-e7260",
    storageBucket: "yjhgfds-e7260.firebasestorage.app",
    messagingSenderId: "699051664281",
    appId: "1:699051664281:web:e7d531e67f8b63f5332908"
};

// تهيئة الاتصال
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database, 'noorHusseinDB'); // مرجع قاعدة البيانات السحابية

// ==========================================
// إعدادات النظام والثوابت
// ==========================================
const ADMIN_PIN = "1972";  // رمز الأدمن
const DELETE_PIN = "121";  // رمز الحذف
let db = JSON.parse(localStorage.getItem('noorHusseinDB')) || { customers: [] };
let activeCustomer = null; // الزبون المحدد حالياً
let currentCart = [];      // سلة المشتريات
let targetCustomerId = null; // معرف الزبون للرابط

// ==========================================
// نقطة البداية (Boot Sequence)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupFirebaseSync(); // تشغيل المزامنة
});

function initApp() {
    hideAllScreens();
    const urlParams = new URLSearchParams(window.location.search);
    const linkedId = urlParams.get('id');

    if (linkedId) {
        // --- مسار الزبون ---
        targetCustomerId = parseInt(linkedId);
        
        // محاولة البحث محلياً أولاً
        const customer = db.customers.find(c => c.id === targetCustomerId);
        
        if (customer) {
            document.getElementById('client-welcome-name').innerText = customer.name;
            showScreen('screen-client-login');
            // إخفاء شاشة التحميل إذا وجدت
            const splash = document.getElementById('splash-screen');
            if(splash) splash.style.display = 'none';
        } else {
            // تصحيح الخطأ: لا نحول للأدمن فوراً، بل ننتظر تحميل البيانات من Firebase
            // نظهر شاشة التحميل فقط
            const splash = document.getElementById('splash-screen');
            if(splash) splash.style.display = 'flex';
        }
    } else {
        // --- مسار الأدمن ---
        showScreen('screen-admin-login');
        const splash = document.getElementById('splash-screen');
        if(splash) splash.style.display = 'none';
    }
}

// --- مزامنة البيانات (استقبال من السيرفر) ---
function setupFirebaseSync() {
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            db = data;
            // حفظ نسخة محلية محدثة
            localStorage.setItem('noorHusseinDB', JSON.stringify(db));
            
            // تصحيح الخطأ: التحقق من الرابط مرة أخرى بعد وصول البيانات
            if (targetCustomerId) {
                const customer = db.customers.find(c => c.id === targetCustomerId);
                if (customer) {
                    document.getElementById('client-welcome-name').innerText = customer.name;
                    showScreen('screen-client-login');
                    const splash = document.getElementById('splash-screen');
                    if(splash) splash.style.display = 'none';
                } else {
                    // الآن فقط نتأكد أن الحساب غير موجود فعلاً
                    alert('عذراً، الرابط غير صالح أو تم حذف الحساب.');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    showScreen('screen-admin-login');
                    const splash = document.getElementById('splash-screen');
                    if(splash) splash.style.display = 'none';
                }
            }

            // تحديث الواجهة إذا كنا نعمل حالياً كأدمن
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
    if(screen) {
        screen.classList.add('active-screen');
    }
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
    
    // تأكد أن المعاملات موجودة
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
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if(splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.style.display = 'none', 1000);
            }
        }, 1200);
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
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
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
    const qty = parseFloat(document.getElementById('itemQty').value);
    if (!name || !price) return;
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
    if (currentCart.length === 0) return alert('السلة فارغة!');
    
    // تصحيح الخطأ: التحقق من وجود المصفوفة والقيم قبل الحفظ لتجنب التعليق
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
    alert('تم الحفظ');
    switchTab('tab-reports');
    refreshAdminViews();
    calculateGlobalDebt();
}

// --- عمليات التسديد ---
function processPayment() {
    const amount = parseFloat(document.getElementById('paymentInput').value);
    if (!amount) return alert('أدخل المبلغ الواصل');
    
    // حماية إضافية
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

// --- دالة الحفظ المركزية (LocalStorage + Firebase) ---
function saveData() { 
    // 1. حفظ في الهاتف (أوفلاين)
    localStorage.setItem('noorHusseinDB', JSON.stringify(db)); 
    
    // 2. إرسال إلى قاعدة البيانات السحابية (أونلاين)
    set(dbRef, db)
        .then(() => console.log("تمت المزامنة مع السيرفر"))
        .catch((e) => console.log("لا يوجد إنترنت، تم الحفظ محلياً فقط", e));
}

function calculateGlobalDebt() {
    const total = db.customers.reduce((acc, c) => acc + (c.totalSales - c.totalPaid), 0);
    const el = document.getElementById('sysTotalDebt');
    if (el) el.innerText = total.toLocaleString();
}

// ==========================================
// ربط الدوال بالواجهة (مهم جداً للعمل مع module)
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

}
