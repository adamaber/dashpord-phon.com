/**
 * نظام التخزين والحسابات الشامل المطور - LocalStorage Core Engine
 */
const DB_KEYS = {
    DEVICES: 'sys_devices_v2',
    SALES: 'sys_sales_v2',
    EXCHANGES: 'sys_exchanges_v2',
    EXPENSES: 'sys_expenses_v2',
    INCOMES: 'sys_incomes_v2',
    LOGS: 'sys_logs_v2',
    SETTINGS: 'sys_settings_v2'
};

const Storage = {
    get(key, defaultVal = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultVal;
        } catch (e) {
            console.error("Storage Read Error:", e);
            return defaultVal;
        }
    },
    set(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error("Storage Write Error:", e);
            alert("حدث خطأ في التخزين، المساحة قد تكون ممتلئة.");
        }
    }
};

// تشغيل النظام وتثبيت البيانات
function initApp() {
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
        Storage.set(DB_KEYS.SETTINGS, { storeName: 'متجر الهواتف', capital: 0 });
    }

    setupNavigation();
    setupEventListeners();

    // ضبط التواريخ التلقائية لتاريخ اليوم
    const today = new Date().toISOString().split('T')[0];
    ['expDate', 'incDate', 'devBuyDate', 'exDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    refreshAllData();
}

function logActivity(actionType, description) {
    const logs = Storage.get(DB_KEYS.LOGS);
    logs.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleString('ar-EG'),
        actionType,
        description
    });
    Storage.set(DB_KEYS.LOGS, logs);
}

function showToast(msg) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.page;
            navButtons.forEach(b => b.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
            refreshAllData();
        });
    });
}

// تحديث وحساب كافة أركان النظام
function refreshAllData() {
    renderDashboardAndFinances();
    renderInventory();
    renderSales();
    renderExchanges();
    renderFinancesUI();
    renderProfits();
    renderLogs();
    renderSettings();
    populateExchangeDropdown();
}

/**
 * 1. محرك الحسابات المالية ولوحة التحكم
 */
function renderDashboardAndFinances() {
    const devices = Storage.get(DB_KEYS.DEVICES);
    const sales = Storage.get(DB_KEYS.SALES);
    const expenses = Storage.get(DB_KEYS.EXPENSES);
    const incomes = Storage.get(DB_KEYS.INCOMES);
    const settings = Storage.get(DB_KEYS.SETTINGS);

    document.getElementById('storeBrandName').innerText = settings.storeName || 'متجر الهواتف';

    const initialCapital = Number(settings.capital) || 0;

    // أجهزة المخزن المتاحة
    const availableDevices = devices.filter(d => d.status === 'AVAILABLE');
    const inventoryVal = availableDevices.reduce((acc, d) => acc + Number(d.actualCost), 0);

    // إجمالي المبيعات، الشراء، والأرباح
    const totalSalesCashIn = sales.reduce((acc, s) => acc + Number(s.sellPrice), 0);
    const totalPhoneProfits = sales.reduce((acc, s) => acc + Number(s.profit), 0);

    // إجمالي المصاريف والدخل الخارجي
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const totalIncomes = incomes.reduce((acc, i) => acc + Number(i.amount), 0);

    // حساب إجمالي الأموال المصروفة لشراء الأجهزة الموجودة بالكامل
    const totalPurchasesCost = devices.reduce((acc, d) => acc + Number(d.actualCost), 0);

    // معادلة السيولة الحالية بالنقدية (Cash in Hand)
    // السيولة = رأس المال المبدئي + المبيعات الكاش + الدخل الإضافي - المشتريات الأجهزة الكلية - المصاريف
    const cashInHand = initialCapital + totalSalesCashIn + totalIncomes - totalPurchasesCost - totalExpenses;

    // صافي رأس المال والإجمالي الفعلي (السيولة + قيمة البضاعة بالمخزن)
    const netWorth = cashInHand + inventoryVal;

    // صافي الأرباح (أرباح الأجهزة + الدخل - المصاريف)
    const netProfitsVal = totalPhoneProfits + totalIncomes - totalExpenses;

    // تحديث واجهة لوحة التحكم
    document.getElementById('statCapital').innerText = `${initialCapital.toLocaleString()} ج.م`;
    document.getElementById('statCashHand').innerText = `${cashInHand.toLocaleString()} ج.م`;
    document.getElementById('statInventoryValue').innerText = `${inventoryVal.toLocaleString()} ج.م`;
    document.getElementById('statTotalNetWorth').innerText = `${netWorth.toLocaleString()} ج.م`;
    document.getElementById('statTotalExpenses').innerText = `${totalExpenses.toLocaleString()} ج.م`;
    document.getElementById('statNetProfits').innerText = `${netProfitsVal.toLocaleString()} ج.م`;

    // تحديث كروت صفحة المالية
    document.getElementById('finInitialCapital').innerText = `${initialCapital.toLocaleString()} ج.م`;
    document.getElementById('finCashInHand').innerText = `${cashInHand.toLocaleString()} ج.م`;
    document.getElementById('finTotalExpenses').innerText = `${totalExpenses.toLocaleString()} ج.م`;
    document.getElementById('finTotalIncome').innerText = `${totalIncomes.toLocaleString()} ج.م`;

    // جداول لوحة التحكم
    const recentAddedBody = document.getElementById('dashRecentAdded');
    recentAddedBody.innerHTML = availableDevices.slice(-5).reverse().map(d => `
        <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.color}</td>
            <td>${Number(d.actualCost).toLocaleString()} ج.م</td>
            <td>${d.buyDate}</td>
        </tr>
    `).join('') || '<tr><td colspan="4">لا توجد أجهزة متوفرة بالمخزن</td></tr>';

    const recentSalesBody = document.getElementById('dashRecentSales');
    recentSalesBody.innerHTML = sales.slice(-5).reverse().map(s => `
        <tr>
            <td><strong>${s.deviceName}</strong> (${s.color})</td>
            <td>${Number(s.sellPrice).toLocaleString()} ج.م</td>
            <td style="color:var(--accent); font-weight:bold;">${Number(s.profit).toLocaleString()} ج.م</td>
            <td>${s.sellDate}</td>
        </tr>
    `).join('') || '<tr><td colspan="4">لا توجد مبيعات مسجلة</td></tr>';
}

/**
 * 2. إضافة وتعديل المخزون الأجهزة
 */
function setupEventListeners() {
    // إضافة وتعديل جهاز
    document.getElementById('deviceForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const devices = Storage.get(DB_KEYS.DEVICES);
        const editId = document.getElementById('editDeviceId').value;

        const buyPrice = Number(document.getElementById('devBuyPrice').value) || 0;
        const extraExpenses = Number(document.getElementById('devExtraExpenses').value) || 0;
        const actualCost = buyPrice + extraExpenses;

        const deviceData = {
            id: editId ? Number(editId) : Date.now(),
            name: document.getElementById('devName').value,
            brand: document.getElementById('devBrand').value,
            color: document.getElementById('devColor').value,
            type: document.getElementById('devType').value,
            storage: document.getElementById('devStorage').value,
            ram: document.getElementById('devRam').value,
            imei: document.getElementById('devImei').value || '-',
            condition: document.getElementById('devCondition').value,
            battery: document.getElementById('devBattery').value || null,
            buyPrice,
            extraExpenses,
            actualCost,
            expectedPrice: Number(document.getElementById('devExpectedPrice').value) || 0,
            obtainMethod: document.getElementById('devObtainMethod').value,
            buyDate: document.getElementById('devBuyDate').value,
            accessories: document.getElementById('devAccessories').value || '-',
            notes: document.getElementById('devNotes').value || '-',
            status: 'AVAILABLE'
        };

        if (editId) {
            const idx = devices.findIndex(d => d.id == editId);
            devices[idx] = { ...devices[idx], ...deviceData };
            logActivity('تعديل جهاز', `تم تعديل بيانات: ${deviceData.name} - لون ${deviceData.color}`);
            showToast('تم تعديل الجهاز بنجاح');
        } else {
            devices.push(deviceData);
            logActivity('إضافة جهاز', `تمت إضافة: ${deviceData.name} (${deviceData.color}) لتكلفة ${actualCost} ج.م`);
            showToast('تمت إضافة الجهاز للمخزن بنجاح');
        }

        Storage.set(DB_KEYS.DEVICES, devices);
        document.getElementById('deviceForm').reset();
        document.getElementById('editDeviceId').value = '';
        document.getElementById('addFormTitle').innerText = 'إضافة جهاز جديد للمخزن';
        document.getElementById('cancelEditBtn').style.display = 'none';
        refreshAllData();
    });

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        document.getElementById('deviceForm').reset();
        document.getElementById('editDeviceId').value = '';
        document.getElementById('addFormTitle').innerText = 'إضافة جهاز جديد للمخزن';
        document.getElementById('cancelEditBtn').style.display = 'none';
    });

    // تسجيل البيع
    document.getElementById('sellForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const deviceId = document.getElementById('sellDeviceId').value;
        const sellPrice = Number(document.getElementById('sellPrice').value);
        const sellDate = document.getElementById('sellDate').value;
        const paymentMethod = document.getElementById('sellPaymentMethod').value;
        const customerName = document.getElementById('sellCustomerName').value || 'عميل نقدي';

        const devices = Storage.get(DB_KEYS.DEVICES);
        const sales = Storage.get(DB_KEYS.SALES);

        const devIdx = devices.findIndex(d => d.id == deviceId);
        if (devIdx === -1) return;

        const device = devices[devIdx];
        const profit = sellPrice - Number(device.actualCost);

        device.status = 'SOLD';

        sales.push({
            id: Date.now(),
            deviceId: device.id,
            deviceName: device.name,
            color: device.color,
            buyPrice: device.buyPrice,
            extraExpenses: device.extraExpenses,
            actualCost: device.actualCost,
            sellPrice,
            profit,
            buyDate: device.buyDate,
            sellDate,
            obtainMethod: device.obtainMethod,
            paymentMethod,
            customerName
        });

        Storage.set(DB_KEYS.DEVICES, devices);
        Storage.set(DB_KEYS.SALES, sales);

        logActivity('بيع جهاز', `تم بيع ${device.name} (${device.color}) بسعر ${sellPrice} ج.م - الربح: ${profit} ج.م`);
        showToast('تم تسجيل عملية البيع وخصم الجهاز من المخزن');

        closeModal();
        refreshAllData();
    });

    document.getElementById('closeSellModal').addEventListener('click', closeModal);
    document.getElementById('exchangeForm').addEventListener('submit', handleExchangeSubmit);

    // تسجيل المصاريف
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const expenses = Storage.get(DB_KEYS.EXPENSES);
        const title = document.getElementById('expTitle').value;
        const amount = Number(document.getElementById('expAmount').value);
        const date = document.getElementById('expDate').value;

        expenses.push({ id: Date.now(), title, amount, date });
        Storage.set(DB_KEYS.EXPENSES, expenses);

        logActivity('مصروف عام', `تم خصم مصروف: (${title}) بمبلغ ${amount} ج.م`);
        showToast('تم تسجيل المصروف وخصمه من الخزينة');
        document.getElementById('expenseForm').reset();
        refreshAllData();
    });

    // تسجيل الدخل
    document.getElementById('incomeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const incomes = Storage.get(DB_KEYS.INCOMES);
        const title = document.getElementById('incTitle').value;
        const amount = Number(document.getElementById('incAmount').value);
        const date = document.getElementById('incDate').value;

        incomes.push({ id: Date.now(), title, amount, date });
        Storage.set(DB_KEYS.INCOMES, incomes);

        logActivity('دخل إضافي', `تم إضافة دخل: (${title}) بمبلغ ${amount} ج.م`);
        showToast('تمت إضافة المبلغ للخزينة');
        document.getElementById('incomeForm').reset();
        refreshAllData();
    });

    // حفظ رأس المال والإعدادات
    document.getElementById('saveStoreSettings').addEventListener('click', () => {
        const settings = {
            storeName: document.getElementById('setStoreName').value,
            capital: Number(document.getElementById('setCapital').value) || 0
        };
        Storage.set(DB_KEYS.SETTINGS, settings);
        showToast('تم تحديث رأس المال بنجاح');
        refreshAllData();
    });

    // تصدير واستيراد JSON
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        const fullData = {
            devices: Storage.get(DB_KEYS.DEVICES),
            sales: Storage.get(DB_KEYS.SALES),
            exchanges: Storage.get(DB_KEYS.EXCHANGES),
            expenses: Storage.get(DB_KEYS.EXPENSES),
            incomes: Storage.get(DB_KEYS.INCOMES),
            logs: Storage.get(DB_KEYS.LOGS),
            settings: Storage.get(DB_KEYS.SETTINGS)
        };
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mobile_store_full_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.devices) Storage.set(DB_KEYS.DEVICES, data.devices);
                if (data.sales) Storage.set(DB_KEYS.SALES, data.sales);
                if (data.exchanges) Storage.set(DB_KEYS.EXCHANGES, data.exchanges);
                if (data.expenses) Storage.set(DB_KEYS.EXPENSES, data.expenses);
                if (data.incomes) Storage.set(DB_KEYS.INCOMES, data.incomes);
                if (data.logs) Storage.set(DB_KEYS.LOGS, data.logs);
                if (data.settings) Storage.set(DB_KEYS.SETTINGS, data.settings);
                showToast('تم استعادة القاعدة بالكامل بنجاح');
                refreshAllData();
            } catch (err) {
                alert('الملف غير صالح للاستعادة.');
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('wipeDataBtn').addEventListener('click', () => {
        if (confirm('تنبيه هام: هل أنت متأكد من مسح جميع البيانات وتصفير النظام؟')) {
            localStorage.clear();
            initApp();
            showToast('تم مسح النظام بالكامل');
        }
    });

    document.getElementById('inventorySearch').addEventListener('input', renderInventory);
    document.getElementById('inventoryFilterOS').addEventListener('change', renderInventory);
    document.getElementById('salesSearch').addEventListener('input', renderSales);
    document.getElementById('profitsPeriodFilter').addEventListener('change', renderProfits);
}

/**
 * 3. عرض ومسح المخزون
 */
function renderInventory() {
    const devices = Storage.get(DB_KEYS.DEVICES).filter(d => d.status === 'AVAILABLE');
    const search = document.getElementById('inventorySearch').value.toLowerCase();
    const osFilter = document.getElementById('inventoryFilterOS').value;

    const filtered = devices.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(search) ||
            d.brand.toLowerCase().includes(search) ||
            d.color.toLowerCase().includes(search) ||
            d.imei.toLowerCase().includes(search);
        const matchesOS = osFilter === 'ALL' || d.type === osFilter;
        return matchesSearch && matchesOS;
    });

    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = filtered.map(d => `
        <tr>
            <td><strong>${d.name}</strong><br><small>${d.brand}</small></td>
            <td><span class="badge" style="background:#27354f;">🎨 ${d.color}</span></td>
            <td>${d.storage} | ${d.ram || '-'}</td>
            <td><code>${d.imei}</code></td>
            <td>${d.condition} ${d.battery ? '| 🔋' + d.battery + '%' : ''}</td>
            <td>${Number(d.actualCost).toLocaleString()} ج.م</td>
            <td>${Number(d.expectedPrice).toLocaleString()} ج.م</td>
            <td>${d.buyDate}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="openSellModal(${d.id})">بيع</button>
                <button class="btn btn-secondary btn-sm" onclick="editDevice(${d.id})">تعديل</button>
                <button class="btn btn-danger btn-sm" onclick="deleteDevice(${d.id})">حذف</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="9">لا توجد أجهزة مطابقة للبحث بالمخزن</td></tr>';
}

function deleteDevice(id) {
    if (confirm('هل تريد حذف الجهاز نهائياً من المخزن؟')) {
        let devices = Storage.get(DB_KEYS.DEVICES);
        const dev = devices.find(d => d.id == id);
        devices = devices.filter(d => d.id != id);
        Storage.set(DB_KEYS.DEVICES, devices);
        logActivity('حذف جهاز', `تم حذف الجهاز: ${dev ? dev.name : id}`);
        showToast('تم حذف الجهاز');
        refreshAllData();
    }
}

function editDevice(id) {
    const devices = Storage.get(DB_KEYS.DEVICES);
    const dev = devices.find(d => d.id == id);
    if (!dev) return;

    document.getElementById('editDeviceId').value = dev.id;
    document.getElementById('devName').value = dev.name;
    document.getElementById('devBrand').value = dev.brand;
    document.getElementById('devColor').value = dev.color || '';
    document.getElementById('devType').value = dev.type;
    document.getElementById('devStorage').value = dev.storage;
    document.getElementById('devRam').value = dev.ram || '';
    document.getElementById('devImei').value = dev.imei !== '-' ? dev.imei : '';
    document.getElementById('devCondition').value = dev.condition;
    document.getElementById('devBattery').value = dev.battery || '';
    document.getElementById('devBuyPrice').value = dev.buyPrice;
    document.getElementById('devExtraExpenses').value = dev.extraExpenses;
    document.getElementById('devExpectedPrice').value = dev.expectedPrice;
    document.getElementById('devObtainMethod').value = dev.obtainMethod;
    document.getElementById('devBuyDate').value = dev.buyDate;
    document.getElementById('devAccessories').value = dev.accessories !== '-' ? dev.accessories : '';
    document.getElementById('devNotes').value = dev.notes !== '-' ? dev.notes : '';

    document.getElementById('addFormTitle').innerText = 'تعديل بيانات الجهاز بالمخزن';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';

    document.querySelector('[data-page="add-device"]').click();
}

function openSellModal(id) {
    const devices = Storage.get(DB_KEYS.DEVICES);
    const dev = devices.find(d => d.id == id);
    if (!dev) return;

    document.getElementById('sellDeviceId').value = dev.id;
    document.getElementById('sellDeviceSummary').innerHTML = `
        <p><strong>الجهاز:</strong> ${dev.name} - <strong>اللون:</strong> ${dev.color}</p>
        <p><strong>التكلفة الفعلية عليك:</strong> ${Number(dev.actualCost).toLocaleString()} ج.م</p>
        <p><strong>السعر المتوقع:</strong> ${Number(dev.expectedPrice).toLocaleString()} ج.م</p>
    `;
    document.getElementById('sellDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('sellModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('sellModal').style.display = 'none';
}

/**
 * 4. الأجهزة المباعة
 */
function renderSales() {
    const sales = Storage.get(DB_KEYS.SALES);
    const search = document.getElementById('salesSearch').value.toLowerCase();

    const filtered = sales.filter(s => s.deviceName.toLowerCase().includes(search) || (s.color && s.color.toLowerCase().includes(search)));

    const totalSalesVal = filtered.reduce((acc, s) => acc + Number(s.sellPrice), 0);
    const totalProfitsVal = filtered.reduce((acc, s) => acc + Number(s.profit), 0);

    document.getElementById('salesPageCount').innerText = filtered.length;
    document.getElementById('salesPageTotal').innerText = `${totalSalesVal.toLocaleString()} ج.م`;
    document.getElementById('salesPageProfits').innerText = `${totalProfitsVal.toLocaleString()} ج.م`;

    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = filtered.slice().reverse().map(s => `
        <tr>
            <td><strong>${s.deviceName}</strong></td>
            <td>${s.color || '-'}</td>
            <td>${Number(s.actualCost).toLocaleString()} ج.م</td>
            <td>${Number(s.sellPrice).toLocaleString()} ج.م</td>
            <td style="color:var(--accent); font-weight:bold;">${Number(s.profit).toLocaleString()} ج.م</td>
            <td>${s.sellDate}</td>
            <td>${s.customerName || 'عميل نقدي'}</td>
            <td>${s.paymentMethod}</td>
        </tr>
    `).join('') || '<tr><td colspan="8">لا توجد أجهزة مباعة</td></tr>';
}

/**
 * 5. الاستبدالات
 */
function populateExchangeDropdown() {
    const devices = Storage.get(DB_KEYS.DEVICES).filter(d => d.status === 'AVAILABLE');
    const select = document.getElementById('exOldDeviceId');
    select.innerHTML = devices.map(d => `<option value="${d.id}">${d.name} (${d.color}) - تكلفته: ${d.actualCost} ج.م</option>`).join('');
}

function handleExchangeSubmit(e) {
    e.preventDefault();
    const oldDeviceId = document.getElementById('exOldDeviceId').value;
    const oldTradeValue = Number(document.getElementById('exOldTradeValue').value);

    const newName = document.getElementById('exNewName').value;
    const newBrand = document.getElementById('exNewBrand').value;
    const newColor = document.getElementById('exNewColor').value;
    const newSpecs = document.getElementById('exNewSpecs').value;
    const newTradeValue = Number(document.getElementById('exNewTradeValue').value);

    const diffDirection = document.getElementById('exDiffDirection').value;
    const diffAmount = Number(document.getElementById('exDiffAmount').value);
    const exDate = document.getElementById('exDate').value;

    const devices = Storage.get(DB_KEYS.DEVICES);
    const sales = Storage.get(DB_KEYS.SALES);
    const exchanges = Storage.get(DB_KEYS.EXCHANGES);

    const oldDevIdx = devices.findIndex(d => d.id == oldDeviceId);
    if (oldDevIdx === -1) return;

    const oldDev = devices[oldDevIdx];

    let oldDevSellPrice = oldTradeValue;
    if (diffDirection === 'CUSTOMER_PAID') {
        oldDevSellPrice = newTradeValue + diffAmount;
    } else {
        oldDevSellPrice = newTradeValue - diffAmount;
    }

    const profitFromOldDev = oldDevSellPrice - oldDev.actualCost;

    oldDev.status = 'SOLD';
    sales.push({
        id: Date.now(),
        deviceId: oldDev.id,
        deviceName: oldDev.name + ' (بدل)',
        color: oldDev.color,
        buyPrice: oldDev.buyPrice,
        extraExpenses: oldDev.extraExpenses,
        actualCost: oldDev.actualCost,
        sellPrice: oldDevSellPrice,
        profit: profitFromOldDev,
        buyDate: oldDev.buyDate,
        sellDate: exDate,
        obtainMethod: oldDev.obtainMethod,
        paymentMethod: 'استبدال',
        customerName: 'عميل استبدال'
    });

    devices.push({
        id: Date.now() + 1,
        name: newName,
        brand: newBrand,
        color: newColor,
        type: newName.toLowerCase().includes('iphone') ? 'iPhone' : 'Android',
        storage: newSpecs,
        ram: '',
        imei: '-',
        condition: 'مستعمل (بدل)',
        battery: null,
        buyPrice: newTradeValue,
        extraExpenses: 0,
        actualCost: newTradeValue,
        expectedPrice: newTradeValue * 1.15,
        obtainMethod: 'استبدال',
        buyDate: exDate,
        accessories: '-',
        notes: `مستلم مقابل استبدال ${oldDev.name}`,
        status: 'AVAILABLE'
    });

    exchanges.push({
        id: Date.now(),
        date: exDate,
        oldDeviceName: oldDev.name,
        newDeviceName: `${newName} (${newColor})`,
        diffDirection,
        diffAmount,
        calculatedProfit: profitFromOldDev
    });

    Storage.set(DB_KEYS.DEVICES, devices);
    Storage.set(DB_KEYS.SALES, sales);
    Storage.set(DB_KEYS.EXCHANGES, exchanges);

    logActivity('عملية استبدال', `تم استبدال ${oldDev.name} بالجهاز المستلم ${newName} (${newColor})`);
    showToast('تمت عملية الاستبدال وتسجيل الجهاز الجديد بالمخزن');

    document.getElementById('exchangeForm').reset();
    refreshAllData();
}

function renderExchanges() {
    const exchanges = Storage.get(DB_KEYS.EXCHANGES);
    const tbody = document.getElementById('exchangesHistoryTable');
    tbody.innerHTML = exchanges.slice().reverse().map(x => `
        <tr>
            <td>${x.date}</td>
            <td>${x.oldDeviceName}</td>
            <td>${x.newDeviceName}</td>
            <td>${x.diffDirection === 'CUSTOMER_PAID' ? 'دفع العميل فارق ' + x.diffAmount + ' ج.م' : 'تم دفع فارق للعميل ' + x.diffAmount + ' ج.م'}</td>
            <td style="color:var(--accent); font-weight:bold;">${Number(x.calculatedProfit).toLocaleString()} ج.م</td>
        </tr>
    `).join('') || '<tr><td colspan="5">لا توجد عمليات استبدال مسجلة</td></tr>';
}

/**
 * 6. المصاريف والدخل
 */
function renderFinancesUI() {
    const expenses = Storage.get(DB_KEYS.EXPENSES);
    const incomes = Storage.get(DB_KEYS.INCOMES);

    const expTbody = document.getElementById('expensesTableBody');
    expTbody.innerHTML = expenses.slice().reverse().map(e => `
        <tr>
            <td><strong>${e.title}</strong></td>
            <td style="color:var(--danger); font-weight:bold;">${Number(e.amount).toLocaleString()} ج.م</td>
            <td>${e.date}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">حذف</button></td>
        </tr>
    `).join('') || '<tr><td colspan="4">لا توجد مصاريف مسجلة</td></tr>';

    const incTbody = document.getElementById('incomeTableBody');
    incTbody.innerHTML = incomes.slice().reverse().map(i => `
        <tr>
            <td><strong>${i.title}</strong></td>
            <td style="color:var(--accent); font-weight:bold;">${Number(i.amount).toLocaleString()} ج.م</td>
            <td>${i.date}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteIncome(${i.id})">حذف</button></td>
        </tr>
    `).join('') || '<tr><td colspan="4">لا يوجد دخل إضافي مسجل</td></tr>';
}

function deleteExpense(id) {
    if (confirm('هل تريد حذف هذا المصروف وإعادته للخزينة؟')) {
        let expenses = Storage.get(DB_KEYS.EXPENSES);
        expenses = expenses.filter(e => e.id != id);
        Storage.set(DB_KEYS.EXPENSES, expenses);
        showToast('تم حذف المصروف');
        refreshAllData();
    }
}

function deleteIncome(id) {
    if (confirm('هل تريد حذف هذا الدخل وخصمه من الخزينة؟')) {
        let incomes = Storage.get(DB_KEYS.INCOMES);
        incomes = incomes.filter(i => i.id != id);
        Storage.set(DB_KEYS.INCOMES, incomes);
        showToast('تم حذف الدخل');
        refreshAllData();
    }
}

/**
 * 7. التقارير والسجلات الإدارية
 */
function renderProfits() {
    const sales = Storage.get(DB_KEYS.SALES);
    const expenses = Storage.get(DB_KEYS.EXPENSES);
    const incomes = Storage.get(DB_KEYS.INCOMES);
    const period = document.getElementById('profitsPeriodFilter').value;

    const now = new Date();
    const isFiltered = (dateStr) => {
        const d = new Date(dateStr);
        if (period === 'TODAY') return d.toDateString() === now.toDateString();
        if (period === 'WEEK') return Math.ceil(Math.abs(now - d) / (1000 * 60 * 60 * 24)) <= 7;
        if (period === 'MONTH') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
    };

    const filteredSales = sales.filter(s => isFiltered(s.sellDate));
    const filteredExpenses = expenses.filter(e => isFiltered(e.date));
    const filteredIncomes = incomes.filter(i => isFiltered(i.date));

    const phoneProfits = filteredSales.reduce((acc, s) => acc + Number(s.profit), 0);
    const totalExp = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const totalInc = filteredIncomes.reduce((acc, i) => acc + Number(i.amount), 0);

    const netProfit = phoneProfits + totalInc - totalExp;
    const avgProfit = filteredSales.length > 0 ? (phoneProfits / filteredSales.length) : 0;

    let maxProfitDev = '-';
    let minProfitDev = '-';

    if (filteredSales.length > 0) {
        const sorted = [...filteredSales].sort((a, b) => b.profit - a.profit);
        maxProfitDev = `${sorted[0].deviceName} (${Number(sorted[0].profit).toLocaleString()} ج.م)`;
        minProfitDev = `${sorted[sorted.length - 1].deviceName} (${Number(sorted[sorted.length - 1].profit).toLocaleString()} ج.م)`;
    }

    document.getElementById('repPeriodProfits').innerText = `${netProfit.toLocaleString()} ج.م`;
    document.getElementById('repAvgProfit').innerText = `${avgProfit.toFixed(2)} ج.م`;
    document.getElementById('repMaxProfitDev').innerText = maxProfitDev;
    document.getElementById('repMinProfitDev').innerText = minProfitDev;
}

function renderLogs() {
    const logs = Storage.get(DB_KEYS.LOGS);
    const tbody = document.getElementById('activityLogTable');
    tbody.innerHTML = logs.map(l => `
        <tr>
            <td>${l.timestamp}</td>
            <td><span class="badge" style="background:var(--border-color);">${l.actionType}</span></td>
            <td>${l.description}</td>
        </tr>
    `).join('') || '<tr><td colspan="3">لا توجد عمليات مسجلة</td></tr>';
}

function renderSettings() {
    const settings = Storage.get(DB_KEYS.SETTINGS);
    document.getElementById('setStoreName').value = settings.storeName || '';
    document.getElementById('setCapital').value = settings.capital || 0;
}

document.addEventListener('DOMContentLoaded', initApp);